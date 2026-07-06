import { eq } from "drizzle-orm";
import { suppliers, type Supplier, type InsertSupplier } from "@/core/schema";
import type { DB } from "./types";

export type SupplierUpdate = Partial<Omit<InsertSupplier, "id">>;

export interface ISupplierRepository {
  findAll(): Promise<Supplier[]>;
  findById(id: number): Promise<Supplier | null>;
  findByEmail(email: string): Promise<Supplier | null>;
  create(data: InsertSupplier): Promise<Supplier>;
  update(id: number, data: SupplierUpdate): Promise<void>;
  delete(id: number): Promise<void>;
}

export class DrizzleSupplierRepository implements ISupplierRepository {
  constructor(private readonly db: DB) {}

  async findAll(): Promise<Supplier[]> {
    return this.db.select().from(suppliers).orderBy(suppliers.name);
  }

  async findById(id: number): Promise<Supplier | null> {
    const [row] = await this.db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1);
    return row ?? null;
  }

  async findByEmail(email: string): Promise<Supplier | null> {
    const [row] = await this.db.select().from(suppliers).where(eq(suppliers.email, email)).limit(1);
    return row ?? null;
  }

  async create(data: InsertSupplier): Promise<Supplier> {
    const [created] = await this.db.insert(suppliers).values(data).returning();
    return created;
  }

  async update(id: number, data: SupplierUpdate): Promise<void> {
    await this.db.update(suppliers).set(data).where(eq(suppliers.id, id));
  }

  async delete(id: number): Promise<void> {
    await this.db.delete(suppliers).where(eq(suppliers.id, id));
  }
}
