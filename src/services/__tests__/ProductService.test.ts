import { describe, it, expect, vi } from "vitest";
import { ProductService } from "@/services/ProductService";
import type { IProductRepository } from "@/repositories/ProductRepository";
import type { ICategoryRepository } from "@/repositories/CategoryRepository";
import type { ISupplierRepository } from "@/repositories/SupplierRepository";
import type { Product } from "@/core/schema";

function makeProductRepoMock(overrides: Partial<IProductRepository> = {}): IProductRepository {
  return {
    findAll: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    findByCategory: vi.fn().mockResolvedValue([]),
    findByCode: vi.fn().mockResolvedValue(null),
    findLowStock: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    updateStock: vi.fn(),
    ...overrides,
  };
}

const categoryRepoStub = {
  findById: vi.fn().mockResolvedValue({ name: "Bebidas" }),
} as unknown as ICategoryRepository;

const supplierRepoStub = {
  findById: vi.fn().mockResolvedValue({ name: "Distribuidora XYZ" }),
} as unknown as ISupplierRepository;

describe("ProductService.create", () => {
  it("rechaza un código de producto duplicado", async () => {
    const existing = { id: 1, code: "ABC-1" } as Product;
    const repo = makeProductRepoMock({ findByCode: vi.fn().mockResolvedValue(existing) });
    const service = new ProductService(repo, categoryRepoStub, supplierRepoStub);

    await expect(
      service.create({
        code: "abc-1",
        name: "Test",
        price: 100,
        currentStock: 0,
        minimumStock: 5,
        categoryId: 1,
        supplierId: 1,
      })
    ).rejects.toThrow(/ya existe/);

    expect(repo.create).not.toHaveBeenCalled();
  });

  it("normaliza el código a mayúsculas y crea cuando es único", async () => {
    const repo = makeProductRepoMock({
      findByCode: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 42, code: "ABC-1" } as Product),
    });
    const service = new ProductService(repo, categoryRepoStub, supplierRepoStub);

    const result = await service.create({
      code: "abc-1",
      name: "Test",
      price: 100,
      currentStock: 0,
      minimumStock: 5,
      categoryId: 1,
      supplierId: 1,
    });

    expect(result).toEqual({ id: 42 });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ code: "ABC-1" }));
  });
});

describe("ProductService.getLowStockReport", () => {
  it("mapea productos con stock bajo al DTO en español con el estado calculado", async () => {
    const lowStockProduct = {
      id: 7,
      name: "Producto A",
      currentStock: 0,
      minimumStock: 5,
      categoryId: 1,
      supplierId: 1,
    } as Product;
    const repo = makeProductRepoMock({ findLowStock: vi.fn().mockResolvedValue([lowStockProduct]) });
    const service = new ProductService(repo, categoryRepoStub, supplierRepoStub);

    const report = await service.getLowStockReport();

    expect(report).toEqual([
      {
        id: 7,
        nombre: "Producto A",
        categoria: "Bebidas",
        stockActual: 0,
        stockMinimo: 5,
        distribuidor: "Distribuidora XYZ",
        estado: "sin_stock",
      },
    ]);
  });
});
