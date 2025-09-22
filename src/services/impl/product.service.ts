import {type Cradle} from '@fastify/awilix';
import {eq} from 'drizzle-orm';
import {type INotificationService} from '../notifications.port.js';
import {products, type Product} from '@/db/schema.js';
import {type Database} from '@/db/type.js';

export class ProductService {
	/**
	 * Number of milliseconds in a day
	 */
	private static readonly MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;

	private readonly ns: INotificationService;
	private readonly db: Database;

	public constructor({ns, db}: Pick<Cradle, 'ns' | 'db'>) {
		this.ns = ns;
		this.db = db;
	}

	public async notifyDelay(leadTime: number, p: Product): Promise<void> {
		p.leadTime = leadTime;
		await this.db.update(products).set(p).where(eq(products.id, p.id));
		this.ns.sendDelayNotification(leadTime, p.name);
	}

	public async handleSeasonalProduct(p: Product): Promise<void> {
		const currentDate = new Date();
		if (new Date(currentDate.getTime() + (p.leadTime * ProductService.MILLISECONDS_PER_DAY)) > p.seasonEndDate!) {
			this.ns.sendOutOfStockNotification(p.name);
			p.available = 0;
			await this.db.update(products).set(p).where(eq(products.id, p.id));
		} else if (p.seasonStartDate! > currentDate) {
			this.ns.sendOutOfStockNotification(p.name);
			await this.db.update(products).set(p).where(eq(products.id, p.id));
		} else {
			await this.notifyDelay(p.leadTime, p);
		}
	}

	public async handleExpiredProduct(p: Product): Promise<void> {
		const currentDate = new Date();
		if (p.available > 0 && p.expiryDate! > currentDate) {
			p.available -= 1;
			await this.db.update(products).set(p).where(eq(products.id, p.id));
		} else {
			this.ns.sendExpirationNotification(p.name, p.expiryDate!);
			p.available = 0;
			await this.db.update(products).set(p).where(eq(products.id, p.id));
		}
	}
}
