import {
	describe, it, expect, vi, beforeEach,
} from 'vitest';
import dayjs from 'dayjs';
import {ProductHandlerService} from './product-handler.service.js';
import {type ProductService} from './product.service.js';
import {type Product} from '@/db/schema.js';
import {type Database} from '@/db/type.js';

describe('ProductHandlerService', () => {
	let productHandlerService: ProductHandlerService;
	let mockDatabase: Database;
	let mockProductService: ProductService;
	let mockProduct: Product;

	beforeEach(() => {
		mockDatabase = {
			update: vi.fn().mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue(undefined),
				}),
			}),
		} as unknown as Database;

		mockProductService = {
			notifyDelay: vi.fn().mockResolvedValue(undefined),
			handleSeasonalProduct: vi.fn().mockResolvedValue(undefined),
			handleExpiredProduct: vi.fn().mockResolvedValue(undefined),
		} as unknown as ProductService;

		mockProduct = {
			id: 1,
			name: 'Test Product',
			available: 10,
			leadTime: 5,
			type: 'NORMAL',
		} as unknown as Product;

		productHandlerService = new ProductHandlerService();
	});

	describe('handleNormalProduct', () => {
		it('should decrement stock when product is available', async () => {
			mockProduct.available = 10;

			await productHandlerService.handleNormalProduct(mockProduct, mockDatabase, mockProductService);

			expect(mockProduct.available).toBe(9);
			expect(mockDatabase.update).toHaveBeenCalled();
			expect(mockProductService.notifyDelay).not.toHaveBeenCalled();
		});

		it('should notify delay when product is not available but has lead time', async () => {
			mockProduct.available = 0;
			mockProduct.leadTime = 5;

			await productHandlerService.handleNormalProduct(mockProduct, mockDatabase, mockProductService);

			expect(mockProduct.available).toBe(0);
			expect(mockDatabase.update).not.toHaveBeenCalled();
			expect(mockProductService.notifyDelay).toHaveBeenCalledWith(5, mockProduct);
		});

		it('should do nothing when product is not available and has no lead time', async () => {
			mockProduct.available = 0;
			mockProduct.leadTime = 0;

			await productHandlerService.handleNormalProduct(mockProduct, mockDatabase, mockProductService);

			expect(mockProduct.available).toBe(0);
			expect(mockDatabase.update).not.toHaveBeenCalled();
			expect(mockProductService.notifyDelay).not.toHaveBeenCalled();
		});
	});

	describe('handleSeasonalProduct', () => {
		it('should decrement stock when product is in season and available', async () => {
			mockProduct.available = 10;
			mockProduct.type = 'SEASONAL';
			mockProduct.seasonStartDate = dayjs().subtract(1, 'day').toDate(); // Yesterday
			mockProduct.seasonEndDate = dayjs().add(1, 'day').toDate(); // Tomorrow

			await productHandlerService.handleSeasonalProduct(mockProduct, mockDatabase, mockProductService);

			expect(mockProduct.available).toBe(9);
			expect(mockDatabase.update).toHaveBeenCalled();
			expect(mockProductService.handleSeasonalProduct).not.toHaveBeenCalled();
		});

		it('should handle seasonal product when not in season', async () => {
			mockProduct.available = 10;
			mockProduct.type = 'SEASONAL';
			mockProduct.seasonStartDate = dayjs().add(1, 'day').toDate(); // Tomorrow
			mockProduct.seasonEndDate = dayjs().add(2, 'days').toDate(); // Day after tomorrow

			await productHandlerService.handleSeasonalProduct(mockProduct, mockDatabase, mockProductService);

			expect(mockProduct.available).toBe(10);
			expect(mockDatabase.update).not.toHaveBeenCalled();
			expect(mockProductService.handleSeasonalProduct).toHaveBeenCalledWith(mockProduct);
		});

		it('should handle seasonal product when in season but not available', async () => {
			mockProduct.available = 0;
			mockProduct.type = 'SEASONAL';
			mockProduct.seasonStartDate = dayjs().subtract(1, 'day').toDate(); // Yesterday
			mockProduct.seasonEndDate = dayjs().add(1, 'day').toDate(); // Tomorrow

			await productHandlerService.handleSeasonalProduct(mockProduct, mockDatabase, mockProductService);

			expect(mockProduct.available).toBe(0);
			expect(mockDatabase.update).not.toHaveBeenCalled();
			expect(mockProductService.handleSeasonalProduct).toHaveBeenCalledWith(mockProduct);
		});
	});

	describe('handleExpirableProduct', () => {
		it('should decrement stock when product is not expired and available', async () => {
			mockProduct.available = 10;
			mockProduct.type = 'EXPIRABLE';
			mockProduct.expiryDate = dayjs().add(1, 'day').toDate(); // Tomorrow

			await productHandlerService.handleExpirableProduct(mockProduct, mockDatabase, mockProductService);

			expect(mockProduct.available).toBe(9);
			expect(mockDatabase.update).toHaveBeenCalled();
			expect(mockProductService.handleExpiredProduct).not.toHaveBeenCalled();
		});

		it('should handle expired product when expired', async () => {
			mockProduct.available = 10;
			mockProduct.type = 'EXPIRABLE';
			mockProduct.expiryDate = dayjs().subtract(1, 'day').toDate(); // Yesterday

			await productHandlerService.handleExpirableProduct(mockProduct, mockDatabase, mockProductService);

			expect(mockProduct.available).toBe(10);
			expect(mockDatabase.update).not.toHaveBeenCalled();
			expect(mockProductService.handleExpiredProduct).toHaveBeenCalledWith(mockProduct);
		});

		it('should handle expired product when not available', async () => {
			mockProduct.available = 0;
			mockProduct.type = 'EXPIRABLE';
			mockProduct.expiryDate = dayjs().add(1, 'day').toDate(); // Tomorrow

			await productHandlerService.handleExpirableProduct(mockProduct, mockDatabase, mockProductService);

			expect(mockProduct.available).toBe(0);
			expect(mockDatabase.update).not.toHaveBeenCalled();
			expect(mockProductService.handleExpiredProduct).toHaveBeenCalledWith(mockProduct);
		});
	});

	describe('isInSeason', () => {
		it('should return true when current date is within season', () => {
			const currentDate = new Date();
			mockProduct.seasonStartDate = dayjs(currentDate).subtract(1, 'day').toDate(); // Yesterday
			mockProduct.seasonEndDate = dayjs(currentDate).add(1, 'day').toDate(); // Tomorrow

			const result = productHandlerService.isInSeason(mockProduct, currentDate);

			expect(result).toBe(true);
		});

		it('should return false when current date is before season', () => {
			const currentDate = new Date();
			mockProduct.seasonStartDate = dayjs(currentDate).add(1, 'day').toDate(); // Tomorrow
			mockProduct.seasonEndDate = dayjs(currentDate).add(2, 'days').toDate(); // Day after tomorrow

			const result = productHandlerService.isInSeason(mockProduct, currentDate);

			expect(result).toBe(false);
		});

		it('should return false when current date is after season', () => {
			const currentDate = new Date();
			mockProduct.seasonStartDate = dayjs(currentDate).subtract(2, 'days').toDate(); // 2 days ago
			mockProduct.seasonEndDate = dayjs(currentDate).subtract(1, 'day').toDate(); // Yesterday

			const result = productHandlerService.isInSeason(mockProduct, currentDate);

			expect(result).toBe(false);
		});

		it('should return false when season dates are not defined', () => {
			const currentDate = new Date();
			// @ts-expect-error we want to test this
			mockProduct.seasonStartDate = undefined;
			// @ts-expect-error we want to test this
			mockProduct.seasonEndDate = undefined;

			const result = productHandlerService.isInSeason(mockProduct, currentDate);

			expect(result).toBe(false);
		});
	});

	describe('decrementStock', () => {
		it('should decrement product available count and update database', async () => {
			mockProduct.available = 10;

			await productHandlerService.decrementStock(mockProduct, mockDatabase);

			expect(mockProduct.available).toBe(9);
			expect(mockDatabase.update).toHaveBeenCalled();
		});
	});
});
