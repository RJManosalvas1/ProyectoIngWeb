import { eq } from "drizzle-orm";
import { products, type Product, type InsertProduct } from "@/core/schema";
import type { DB } from "./types";

export type ProductUpdate = Partial<Omit<InsertProduct, "id">>;

/** Abstracción de la que depende la capa de servicios (DIP). */
export interface IProductRepository {
  findAll(): Promise<Product[]>;
  findById(id: number): Promise<Product | null>;
  findByCategory(categoryId: number): Promise<Product[]>;
  findByCode(code: string): Promise<Product | null>;
  findLowStock(): Promise<Product[]>;
  create(data: InsertProduct): Promise<Product>;
  update(id: number, data: ProductUpdate): Promise<void>;
  delete(id: number): Promise<void>;
  updateStock(id: number, newStock: number): Promise<void>;
}

/** Implementación con Drizzle — único archivo que conoce el SQL de la tabla `products`. */
export class DrizzleProductRepository implements IProductRepository {
  constructor(private readonly db: DB) {}

  async findAll(): Promise<Product[]> {
    return this.db.select().from(products).orderBy(products.name);
  }

  async findById(id: number): Promise<Product | null> {
    const [row] = await this.db.select().from(products).where(eq(products.id, id)).limit(1);
    return row ?? null;
  }

  async findByCategory(categoryId: number): Promise<Product[]> {
    return this.db
      .select()
      .from(products)
      .where(eq(products.categoryId, categoryId))
      .orderBy(products.name);
  }

  async findByCode(code: string): Promise<Product | null> {
    const [row] = await this.db
      .select()
      .from(products)
      .where(eq(products.code, code))
      .limit(1);
    return row ?? null;
  }

  async findLowStock(): Promise<Product[]> {
    // Filtrado en memoria: para la escala de este proyecto (decenas/cientos de
    // productos) es más simple y legible que un predicado SQL columna-vs-columna
    // (`sql`${products.currentStock} <= ${products.minimumStock}``), que sería
    // la alternativa recomendada en un escenario de mayor volumen de datos.
    const all = await this.db.select().from(products).orderBy(products.name);
    return all.filter((p) => p.currentStock <= p.minimumStock);
  }

  async create(data: InsertProduct): Promise<Product> {
    const [created] = await this.db.insert(products).values(data).returning();
    return created;
  }

  async update(id: number, data: ProductUpdate): Promise<void> {
    await this.db.update(products).set(data).where(eq(products.id, id));
  }

  async delete(id: number): Promise<void> {
    await this.db.delete(products).where(eq(products.id, id));
  }

  async updateStock(id: number, newStock: number): Promise<void> {
    await this.db
      .update(products)
      .set({ currentStock: Math.max(0, newStock) })
      .where(eq(products.id, id));
  }
}
