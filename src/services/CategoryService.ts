import { TRPCError } from "@trpc/server";
import type { ICategoryRepository, CategoryUpdate } from "@/repositories/CategoryRepository";
import type { Category, InsertCategory } from "@/core/schema";

export class CategoryService {
  constructor(private readonly categoryRepository: ICategoryRepository) {}

  list(): Promise<Category[]> {
    return this.categoryRepository.findAll();
  }

  async create(input: InsertCategory): Promise<{ id: number }> {
    const existing = await this.categoryRepository.findByName(input.name);
    if (existing) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Ya existe una categoría con ese nombre." });
    }
    const created = await this.categoryRepository.create(input);
    return { id: created.id };
  }

  async update(id: number, input: CategoryUpdate): Promise<void> {
    await this.categoryRepository.update(id, input);
  }

  async delete(id: number): Promise<void> {
    await this.categoryRepository.delete(id);
  }
}
