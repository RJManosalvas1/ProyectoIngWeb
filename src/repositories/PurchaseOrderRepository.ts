import { and, desc, eq } from "drizzle-orm";
import {
  purchaseOrders,
  type PurchaseOrder,
  type InsertPurchaseOrder,
} from "@/core/schema";
import type { DB } from "./types";

export interface IPurchaseOrderRepository {
  findAll(): Promise<PurchaseOrder[]>;
  findByStatus(status: PurchaseOrder["status"]): Promise<PurchaseOrder[]>;
  findPendingByProduct(productId: number): Promise<PurchaseOrder | null>;
  create(data: InsertPurchaseOrder): Promise<PurchaseOrder>;
  approve(id: number, approvedBy: number | null): Promise<void>;
  reject(id: number): Promise<void>;
}

export class DrizzlePurchaseOrderRepository implements IPurchaseOrderRepository {
  constructor(private readonly db: DB) {}

  async findAll(): Promise<PurchaseOrder[]> {
    return this.db.select().from(purchaseOrders).orderBy(desc(purchaseOrders.createdAt));
  }

  async findByStatus(status: PurchaseOrder["status"]): Promise<PurchaseOrder[]> {
    return this.db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.status, status))
      .orderBy(desc(purchaseOrders.createdAt));
  }

  async findPendingByProduct(productId: number): Promise<PurchaseOrder | null> {
    const [row] = await this.db
      .select()
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.productId, productId), eq(purchaseOrders.status, "pendiente")))
      .limit(1);
    return row ?? null;
  }

  async create(data: InsertPurchaseOrder): Promise<PurchaseOrder> {
    const [created] = await this.db.insert(purchaseOrders).values(data).returning();
    return created;
  }

  async approve(id: number, approvedBy: number | null): Promise<void> {
    await this.db
      .update(purchaseOrders)
      .set({ status: "aprobada", approvedBy, approvedAt: new Date() })
      .where(eq(purchaseOrders.id, id));
  }

  async reject(id: number): Promise<void> {
    await this.db.update(purchaseOrders).set({ status: "rechazada" }).where(eq(purchaseOrders.id, id));
  }
}
