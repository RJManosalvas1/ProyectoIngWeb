import { and, desc, eq } from "drizzle-orm";
import { stockAlerts, type StockAlert, type InsertStockAlert } from "@/core/schema";
import type { DB } from "./types";

export interface IStockAlertRepository {
  findAll(): Promise<StockAlert[]>;
  findByRead(isRead: boolean): Promise<StockAlert[]>;
  findActiveByProductAndType(
    productId: number,
    alertType: StockAlert["alertType"]
  ): Promise<StockAlert | null>;
  create(data: InsertStockAlert): Promise<StockAlert>;
  markAsRead(id: number): Promise<void>;
}

export class DrizzleStockAlertRepository implements IStockAlertRepository {
  constructor(private readonly db: DB) {}

  async findAll(): Promise<StockAlert[]> {
    return this.db.select().from(stockAlerts).orderBy(desc(stockAlerts.createdAt));
  }

  async findByRead(isRead: boolean): Promise<StockAlert[]> {
    return this.db
      .select()
      .from(stockAlerts)
      .where(eq(stockAlerts.isRead, isRead))
      .orderBy(desc(stockAlerts.createdAt));
  }

  async findActiveByProductAndType(
    productId: number,
    alertType: StockAlert["alertType"]
  ): Promise<StockAlert | null> {
    const [row] = await this.db
      .select()
      .from(stockAlerts)
      .where(
        and(
          eq(stockAlerts.productId, productId),
          eq(stockAlerts.isRead, false),
          eq(stockAlerts.alertType, alertType)
        )
      )
      .limit(1);
    return row ?? null;
  }

  async create(data: InsertStockAlert): Promise<StockAlert> {
    const [created] = await this.db.insert(stockAlerts).values(data).returning();
    return created;
  }

  async markAsRead(id: number): Promise<void> {
    await this.db
      .update(stockAlerts)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(stockAlerts.id, id));
  }
}
