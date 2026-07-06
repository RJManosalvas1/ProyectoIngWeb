import type { IStockAlertRepository } from "@/repositories/StockAlertRepository";
import type { StockAlert } from "@/core/schema";

export class StockAlertService {
  constructor(private readonly stockAlertRepository: IStockAlertRepository) {}

  list(isRead?: boolean): Promise<StockAlert[]> {
    if (isRead !== undefined) return this.stockAlertRepository.findByRead(isRead);
    return this.stockAlertRepository.findAll();
  }

  async markAsRead(id: number): Promise<void> {
    await this.stockAlertRepository.markAsRead(id);
  }

  /**
   * Regla de negocio (usada por el Core de Reabastecimiento): crea una alerta
   * de stock bajo solo si no existe ya una activa (sin leer) del mismo tipo
   * para ese producto, evitando alertas duplicadas.
   */
  async createLowStockIfNotActive(productId: number, suggestedQuantity: number): Promise<void> {
    const existing = await this.stockAlertRepository.findActiveByProductAndType(
      productId,
      "stock_bajo"
    );
    if (existing) return;

    await this.stockAlertRepository.create({
      productId,
      alertType: "stock_bajo",
      suggestedQuantity,
      isRead: false,
    });
  }
}
