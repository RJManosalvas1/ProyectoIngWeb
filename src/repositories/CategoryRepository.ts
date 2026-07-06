import { eq } from "drizzle-orm";
import { categories, type Category, type InsertCategory } from "@/core/schema";
import type { DB } from "./types";

export type CategoryUpdate = Partial<Omit<InsertCategory, "id">>;

export interface ICategoryRepository {
  findAll(): Promise<Category[]>;
  findById(id: number): Promise<Category | null>;
  findByName(name: string): Promise<Category | null>;
  create(data: InsertCategory): Promise<Category>;
  update(id: number, data: CategoryUpdate): Promise<void>;
  delete(id: number): Promise<void>;
}

export class DrizzleCategoryRepository implements ICategoryRepository {
  constructor(private readonly db: DB) {}

  async findAll(): Promise<Category[]> {
    return this.db.select().from(categories).orderBy(categories.name);
  }

  async findById(id: number): Promise<Category | null> {
    const [row] = await this.db.select().from(categories).where(eq(categories.id, id)).limit(1);
    return row ?? null;
  }

  async findByName(name: string): Promise<Category | null> {
    const [row] = await this.db.select().from(categories).where(eq(categories.name, name)).limit(1);
    return row ?? null;
  }

  async create(data: InsertCategory): Promise<Category> {
    const [created] = await this.db.insert(categories).values(data).returning();
    return created;
  }

  async update(id: number, data: CategoryUpdate): Promise<void> {
    await this.db.update(categories).set(data).where(eq(categories.id, id));
  }

  async delete(id: number): Promise<void> {
    await this.db.delete(categories).where(eq(categories.id, id));
  }
}
