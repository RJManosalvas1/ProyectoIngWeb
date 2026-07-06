import type { IProductRepository } from "@/repositories/ProductRepository";
import type { ISupplierRepository } from "@/repositories/SupplierRepository";
import type { IStockMovementRepository } from "@/repositories/StockMovementRepository";
import type { StockAlertService } from "./StockAlertService";
import type { PurchaseOrderService } from "./PurchaseOrderService";
import type { Product } from "@/core/schema";
import {
  calculateReorderPoint,
  calculateEconomicOrderQuantity,
  calculateDaysUntilStockout,
  type CoreAnalysisResult,
} from "@/core/inventoryCore";

/**
 * Orquesta el Core de Reabastecimiento: combina las funciones de cálculo puras
 * de `src/core/inventoryCore.ts` con acceso a datos (a través de repositorios)
 * y con la creación de alertas/órdenes de compra (a través de otros servicios).
 *
 * Esta separación es el ejemplo de SRP más directo del proyecto: el cálculo
 * matemático (ROP/EOQ) vive en `core/inventoryCore.ts` sin ningún I/O, mientras
 * que la orquestación (leer productos/proveedores/movimientos, decidir si se
 * genera alerta/orden) vive aquí.
 */
export class InventoryCoreService {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly supplierRepository: ISupplierRepository,
    private readonly stockMovementRepository: IStockMovementRepository,
    private readonly stockAlertService: StockAlertService,
    private readonly purchaseOrderService: PurchaseOrderService
  ) {}

  private async calculateAverageDailyDemand(productId: number): Promise<number> {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const movements = await this.stockMovementRepository.findOutboundSince(productId, ninetyDaysAgo);
    if (movements.length === 0) return 0;

    const totalQuantity = movements.reduce((sum, m) => sum + m.quantity, 0);
    return totalQuantity / 90;
  }

  private async analyzeProduct(product: Product, leadTimeDays: number): Promise<CoreAnalysisResult> {
    const averageDailyDemand = await this.calculateAverageDailyDemand(product.id);
    const reorderPoint = calculateReorderPoint(product, averageDailyDemand, leadTimeDays);
    const eoq = calculateEconomicOrderQuantity(product, averageDailyDemand);
    const daysUntilStockout = calculateDaysUntilStockout(product.currentStock, averageDailyDemand);
    const shouldReorder = product.currentStock <= reorderPoint;

    return {
      productId: product.id,
      productName: product.name,
      currentStock: product.currentStock,
      reorderPoint,
      economicOrderQuantity: eoq,
      averageDailyDemand: Math.round(averageDailyDemand * 100) / 100,
      shouldReorder,
      daysUntilStockout,
      suggestedOrderQuantity: shouldReorder ? eoq : 0,
    };
  }

  /** Análisis completo, sin efectos secundarios — usado por el dashboard. */
  async getCurrentAnalysis(): Promise<CoreAnalysisResult[]> {
    const allProducts = await this.productRepository.findAll();
    const results: CoreAnalysisResult[] = [];

    for (const product of allProducts) {
      const supplier = await this.supplierRepository.findById(product.supplierId);
      results.push(await this.analyzeProduct(product, supplier?.leadTimeDays ?? 7));
    }
    return results;
  }

  /** Ejecuta el análisis y, si corresponde, genera alertas y órdenes de compra sugeridas. */
  async runAnalysis(): Promise<CoreAnalysisResult[]> {
    const allProducts = await this.productRepository.findAll();
    const results: CoreAnalysisResult[] = [];

    for (const product of allProducts) {
      const supplier = await this.supplierRepository.findById(product.supplierId);
      const analysis = await this.analyzeProduct(product, supplier?.leadTimeDays ?? 7);
      results.push(analysis);

      if (analysis.shouldReorder) {
        await this.stockAlertService.createLowStockIfNotActive(
          product.id,
          analysis.suggestedOrderQuantity
        );
      }

      if (analysis.shouldReorder && analysis.suggestedOrderQuantity > 0) {
        await this.purchaseOrderService.createSuggestedIfNotPending({
          productId: product.id,
          quantity: analysis.suggestedOrderQuantity,
          unitPrice: product.price,
        });
      }
    }

    return results;
  }
}
