import { and, desc, eq, gte } from "drizzle-orm";
import { stockMovements, type StockMovement, type InsertStockMovement } from "@/core/schema";
import type { DB } from "./types";

export interface IStockMovementRepository {
  findAll(limit?: number): Promise<StockMovement[]>;
  findByProduct(productId: number): Promise<StockMovement[]>;
  findOutboundSince(productId: number, since: Date): Promise<StockMovement[]>;
  create(data: InsertStockMovement): Promise<StockMovement>;
}

export class DrizzleStockMovementRepository implements IStockMovementRepository {
  constructor(private readonly db: DB) {}

  async findAll(limit = 100): Promise<StockMovement[]> {
    return this.db
      .select()
      .from(stockMovements)
      .orderBy(desc(stockMovements.createdAt))
      .limit(limit);
  }

  async findByProduct(productId: number): Promise<StockMovement[]> {
    return this.db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.productId, productId))
      .orderBy(desc(stockMovements.createdAt));
  }

  async findOutboundSince(productId: number, since: Date): Promise<StockMovement[]> {
    return this.db
      .select()
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.productId, productId),
          eq(stockMovements.type, "salida"),
          gte(stockMovements.createdAt, since)
        )
      );
  }

  async create(data: InsertStockMovement): Promise<StockMovement> {
    const [created] = await this.db.insert(stockMovements).values(data).returning();
    return created;
  }
}
