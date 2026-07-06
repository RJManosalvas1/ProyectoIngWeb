import { TRPCError } from "@trpc/server";
import type { IProductRepository, ProductUpdate } from "@/repositories/ProductRepository";
import type { ICategoryRepository } from "@/repositories/CategoryRepository";
import type { ISupplierRepository } from "@/repositories/SupplierRepository";
import type { InsertProduct, Product } from "@/core/schema";

export interface LowStockProductDTO {
  id: number;
  nombre: string;
  categoria: string;
  stockActual: number;
  stockMinimo: number;
  distribuidor: string;
  estado: "sin_stock" | "stock_bajo";
}

/**
 * Reglas de negocio de Producto. Depende únicamente de las abstracciones de
 * repositorio (DIP) — no conoce Drizzle, SQL ni tRPC.
 */
export class ProductService {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly categoryRepository: ICategoryRepository,
    private readonly supplierRepository: ISupplierRepository
  ) {}

  list(): Promise<Product[]> {
    return this.productRepository.findAll();
  }

  getById(id: number): Promise<Product | null> {
    return this.productRepository.findById(id);
  }

  listByCategory(categoryId: number): Promise<Product[]> {
    return this.productRepository.findByCategory(categoryId);
  }

  async create(input: Omit<InsertProduct, "id">): Promise<{ id: number }> {
    const normalizedCode = input.code.toUpperCase();
    await this.assertCodeIsUnique(normalizedCode);

    const created = await this.productRepository.create({
      ...input,
      code: normalizedCode,
    });
    return { id: created.id };
  }

  async update(id: number, input: ProductUpdate): Promise<void> {
    if (input.code) {
      const normalizedCode = input.code.toUpperCase();
      await this.assertCodeIsUnique(normalizedCode, id);
      input = { ...input, code: normalizedCode };
    }
    await this.productRepository.update(id, input);
  }

  async delete(id: number): Promise<void> {
    await this.productRepository.delete(id);
  }

  /** Regla de negocio: el código de producto es identificador único de inventario. */
  private async assertCodeIsUnique(code: string, excludingId?: number): Promise<void> {
    const existing = await this.productRepository.findByCode(code);
    if (existing && existing.id !== excludingId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: excludingId
          ? `El código "${code}" ya está en uso por otro producto.`
          : `El código de producto "${code}" ya existe en el sistema. Los códigos de producto son identificadores únicos de inventario.`,
      });
    }
  }

  /** Usado tanto por el flujo de tRPC como por el endpoint REST /api/products/low-stock. */
  async getLowStockReport(): Promise<LowStockProductDTO[]> {
    const lowStockProducts = await this.productRepository.findLowStock();

    return Promise.all(
      lowStockProducts.map(async (p) => {
        const [category, supplier] = await Promise.all([
          this.categoryRepository.findById(p.categoryId),
          this.supplierRepository.findById(p.supplierId),
        ]);

        return {
          id: p.id,
          nombre: p.name,
          categoria: category?.name ?? "—",
          stockActual: p.currentStock,
          stockMinimo: p.minimumStock,
          distribuidor: supplier?.name ?? "—",
          estado: p.currentStock <= 0 ? "sin_stock" : "stock_bajo",
        } satisfies LowStockProductDTO;
      })
    );
  }
}
