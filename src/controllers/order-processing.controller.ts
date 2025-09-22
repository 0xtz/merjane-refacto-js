/* eslint-disable no-await-in-loop */
import {eq} from 'drizzle-orm';
import fastifyPlugin from 'fastify-plugin';
import {serializerCompiler, validatorCompiler, type ZodTypeProvider} from 'fastify-type-provider-zod';
import {z} from 'zod';
import {orders, type Product} from '@/db/schema.js';

export const orderProcessingController = fastifyPlugin(async server => {
	// Add schema validator and serializer
	server.setValidatorCompiler(validatorCompiler);
	server.setSerializerCompiler(serializerCompiler);

	server.withTypeProvider<ZodTypeProvider>().post('/orders/:orderId/processOrder', {
		schema: {
			params: z.object({
				orderId: z.coerce.number(),
			}),
		},
	}, async (request, reply) => {
		const database = server.diContainer.resolve('db');
		const ps = server.diContainer.resolve('ps');
		const productHandler = server.diContainer.resolve('productHandler');
		const {orderId} = request.params;

		// Query
		const order = await database.query.orders
			.findFirst({
				where: eq(orders.id, orderId),
				with: {
					products: {
						columns: {},
						with: {
							product: true,
						},
					},
				},
			});

		// Error handling
		if (!order) {
			return reply.status(404).send({
				statusCode: 404,
				error: 'Not Found',
				message: `Order with ID ${orderId} could not be found in the system`,
			});
		}

		const {products: productList} = order;

		// Error handling
		if (!productList || productList.length === 0) {
			await reply.send({orderId: order.id});

			return;
		}

		// Object lookup
		const productTypeHandlers = {
			SEASONAL: async (product: Product) => productHandler.handleSeasonalProduct(product, database, ps),
			EXPIRABLE: async (product: Product) => productHandler.handleExpirableProduct(product, database, ps),
			NORMAL: async (product: Product) => productHandler.handleNormalProduct(product, database, ps),
		};

		for (const {product} of productList) {
			const handler = productTypeHandlers[product.type as keyof typeof productTypeHandlers] || productTypeHandlers.NORMAL;
			await handler(product);
		}

		await reply.send({orderId: order.id});
	});
});
