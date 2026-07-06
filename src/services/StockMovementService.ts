import { TRPCError } from "@trpc/server";
import type { IStockMovementRepository } from "@/repositories/StockMovementRepository";
import type { IProductRepository } from "@/repositories/ProductRepository";
import type { StockMovement } from "@/core/schema";

export interface RecordMovementInput {
  productId: number;
  quantity: number;
  type: "entrada" | "salida" | "ajuste";
  reason?: string;
  userId: number | null;
}

export class StockMovementService {
  constructor(
    private readonly stockMovementRepository: IStockMovementRepository,
    private readonly productRepository: IProductRepository
  ) {}

  list(productId?: number): Promise<StockMovement[]> {
    if (productId) return this.stockMovementRepository.findByProduct(productId);
    return this.stockMovementRepository.findAll();
  }

  /** Regla de negocio: registrar el movimiento y recalcular el stock del producto. */
  async recordMovement(input: RecordMovementInput): Promise<void> {
    const product = await this.productRepository.findById(input.productId);
    if (!product) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Producto no encontrado" });
    }

    await this.stockMovementRepository.create({
      productId: input.productId,
      quantity: input.quantity,
      type: input.type,
      reason: input.reason,
      userId: input.userId,
    });

    let newStock = product.currentStock;
    if (input.type === "entrada") newStock += input.quantity;
    else if (input.type === "salida") newStock -= input.quantity;
    else if (input.type === "ajuste") newStock = input.quantity;

    await this.productRepository.updateStock(input.productId, newStock);
  }
}
