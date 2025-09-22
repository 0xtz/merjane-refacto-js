import {
	describe, it, expect, beforeEach,
	afterEach,
} from 'vitest';
import {type FastifyInstance} from 'fastify';
import supertest from 'supertest';
import {eq} from 'drizzle-orm';
import {type DeepMockProxy, mockDeep} from 'vitest-mock-extended';
import {asValue} from 'awilix';
import dayjs from 'dayjs';
import {type INotificationService} from '@/services/notifications.port.js';
import {
	type ProductInsert,
	products,
	orders,
	ordersToProducts,
} from '@/db/schema.js';
import {type Database} from '@/db/type.js';
import {buildFastify} from '@/fastify.js';

describe('Order Processing Controller Integration Tests', () => {
	let fastify: FastifyInstance;
	let database: Database;
	let notificationServiceMock: DeepMockProxy<INotificationService>;

	beforeEach(async () => {
		notificationServiceMock = mockDeep<INotificationService>();

		fastify = await buildFastify();
		fastify.diContainer.register({
			ns: asValue(notificationServiceMock as INotificationService),
		});
		await fastify.ready();
		database = fastify.database;
	});
	afterEach(async () => {
		await fastify.close();
	});

	it('should process order successfully', async () => {
		const client = supertest(fastify.server);
		const allProducts = createProducts();
		const orderId = await database.transaction(async tx => {
			const productList = await tx.insert(products).values(allProducts).returning({productId: products.id});
			const [order] = await tx.insert(orders).values([{}]).returning({orderId: orders.id});
			await tx.insert(ordersToProducts).values(productList.map(p => ({orderId: order!.orderId, productId: p.productId})));
			return order!.orderId;
		});

		await client.post(`/orders/${orderId}/processOrder`).expect(200).expect('Content-Type', /application\/json/);

		const resultOrder = await database.query.orders.findFirst({where: eq(orders.id, orderId)});
		expect(resultOrder!.id).toBe(orderId);
	});

	it('should return 404 when order is not found', async () => {
		const client = supertest(fastify.server);
		const nonExistentOrderId = 9999;

		const response = await client.post(`/orders/${nonExistentOrderId}/processOrder`).expect(404);

		expect(response.body).toEqual({
			statusCode: 404,
			error: 'Not Found',
			message: `Order with ID ${nonExistentOrderId} could not be found in the system`,
		});
	});

	it('should handle empty product list', async () => {
		const client = supertest(fastify.server);
		const [order] = await database.insert(orders).values([{}]).returning({orderId: orders.id});
		const {orderId} = (order!);

		const response = await client.post(`/orders/${orderId}/processOrder`).expect(200);

		expect(response.body).toEqual({
			orderId,
		});
	});

	function createProducts(): ProductInsert[] {
		return [
			{
				leadTime: 15, available: 30, type: 'NORMAL', name: 'USB Cable',
			},
			{
				leadTime: 10, available: 0, type: 'NORMAL', name: 'USB Dongle',
			},
			{
				leadTime: 15, available: 30, type: 'EXPIRABLE', name: 'Butter', expiryDate: dayjs().add(26, 'days').toDate(),
			},
			{
				leadTime: 90, available: 6, type: 'EXPIRABLE', name: 'Milk', expiryDate: dayjs().subtract(2, 'days').toDate(),
			},
			{
				leadTime: 15, available: 30, type: 'SEASONAL', name: 'Watermelon',
				seasonStartDate: dayjs().subtract(2, 'days').toDate(),
				seasonEndDate: dayjs().add(58, 'days').toDate(),
			},
			{
				leadTime: 15, available: 30, type: 'SEASONAL', name: 'Grapes',
				seasonStartDate: dayjs().add(180, 'days').toDate(),
				seasonEndDate: dayjs().add(240, 'days').toDate(),
			},
		];
	}
});
