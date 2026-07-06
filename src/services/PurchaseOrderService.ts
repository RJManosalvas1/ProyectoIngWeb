import type { IPurchaseOrderRepository } from "@/repositories/PurchaseOrderRepository";
import type { PurchaseOrder } from "@/core/schema";

export class PurchaseOrderService {
  constructor(private readonly purchaseOrderRepository: IPurchaseOrderRepository) {}

  list(status?: string): Promise<PurchaseOrder[]> {
    if (status) return this.purchaseOrderRepository.findByStatus(status as PurchaseOrder["status"]);
    return this.purchaseOrderRepository.findAll();
  }

  async approve(id: number, approvedBy: number | null): Promise<void> {
    await this.purchaseOrderRepository.approve(id, approvedBy);
  }

  async reject(id: number): Promise<void> {
    await this.purchaseOrderRepository.reject(id);
  }

  /**
   * Regla de negocio (usada por el Core de Reabastecimiento): crea una orden
   * sugerida solo si no existe ya una pendiente para el producto, evitando
   * duplicados cuando el Core se ejecuta varias veces seguidas.
   */
  async createSuggestedIfNotPending(params: {
    productId: number;
    quantity: number;
    unitPrice: number;
  }): Promise<void> {
    const existing = await this.purchaseOrderRepository.findPendingByProduct(params.productId);
    if (existing) return;

    const orderNumber = `ORD-${Date.now()}-${params.productId}`;
    await this.purchaseOrderRepository.create({
      orderNumber,
      productId: params.productId,
      quantity: params.quantity,
      unitPrice: params.unitPrice,
      totalPrice: params.quantity * params.unitPrice,
      status: "pendiente",
      suggestedByCore: true,
    });
  }
}
