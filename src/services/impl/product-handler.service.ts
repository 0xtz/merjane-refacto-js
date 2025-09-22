import {eq} from 'drizzle-orm';
import {type ProductService} from './product.service.js';
import {products, type Product} from '@/db/schema.js';
import {type Database} from '@/db/type.js';

export class ProductHandlerService {
	/**
	 * Handles normal products processing
	 */
	public async handleNormalProduct(product: Product, database: Database, productService: ProductService): Promise<void> {
		if (product.available > 0) {
			await this.decrementStock(product, database);
			return;
		}

		if (product.leadTime > 0) {
			await productService.notifyDelay(product.leadTime, product);
		}
	}

	/**
	 * Handles seasonal products processing
	 */
	public async handleSeasonalProduct(product: Product, database: Database, productService: ProductService): Promise<void> {
		const currentDate = new Date();

		if (!this.isInSeason(product, currentDate)) {
			await productService.handleSeasonalProduct(product);
			return;
		}

		if (product.available > 0) {
			await this.decrementStock(product, database);
			return;
		}

		await productService.handleSeasonalProduct(product);
	}

	/**
	 * Handles expirable products processing
	 */
	public async handleExpirableProduct(product: Product, database: Database, productService: ProductService): Promise<void> {
		const currentDate = new Date();

		if (product.available <= 0) {
			await productService.handleExpiredProduct(product);
			return;
		}

		if (!product.expiryDate || product.expiryDate <= currentDate) {
			await productService.handleExpiredProduct(product);
			return;
		}

		await this.decrementStock(product, database);
	}

	/**
	 * Decrements product stock and updates database
	 */
	public async decrementStock(product: Product, database: Database): Promise<void> {
		const newAvailable = product.available - 1;
		await database.update(products)
			.set({available: newAvailable})
			.where(eq(products.id, product.id));
	}

	/**
	 * Checks if seasonal product is currently in season
	 */
	public isInSeason(product: Product, currentDate: Date): boolean {
		if (!product.seasonStartDate || !product.seasonEndDate) {
			return false;
		}

		return currentDate > product.seasonStartDate && currentDate < product.seasonEndDate;
	}
}
