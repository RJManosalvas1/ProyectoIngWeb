import type { Product } from "./schema";

/**
 * CORE DE REABASTECIMIENTO INTELIGENTE — cálculos puros
 *
 * Este módulo contiene únicamente las funciones matemáticas del core de
 * inventario (SRP): reciben datos ya cargados y devuelven un resultado, sin
 * tocar la base de datos. La orquestación (leer productos/proveedores/
 * movimientos, decidir si generar alertas u órdenes) vive en
 * `src/services/InventoryCoreService.ts`, que importa estas funciones.
 *
 * 1. ROP (Reorder Point / Punto de Pedido):
 *    Determina CUÁNDO se debe hacer un pedido al proveedor.
 *    Fórmula: ROP = (Demanda Promedio Diaria × Tiempo de Entrega) + Stock de Seguridad
 *
 * 2. EOQ (Economic Order Quantity / Cantidad Económica de Pedido):
 *    Determina CUÁNTO se debe pedir para minimizar los costos totales de inventario.
 *    Fórmula: EOQ = √(2 × D × S / H)
 *      D = Demanda anual
 *      S = Costo por orden ($10 fijo)
 *      H = Costo de mantenimiento por unidad (20% del precio del producto)
 */

/** Resultado del análisis del core para un producto individual */
export interface CoreAnalysisResult {
  productId: number;
  productName: string;
  currentStock: number;
  reorderPoint: number;
  economicOrderQuantity: number;
  averageDailyDemand: number;
  shouldReorder: boolean;
  daysUntilStockout: number;
  suggestedOrderQuantity: number;
}

/**
 * Calcula el Punto de Pedido (ROP - Reorder Point).
 *
 * El ROP indica el nivel de stock en el que se debe emitir una orden de compra
 * para que llegue justo cuando el stock esté por agotarse.
 *
 * Fórmula completa:
 *   Stock de Seguridad = Demanda Promedio Diaria × √(Tiempo de Entrega)
 *   ROP = (Demanda Promedio Diaria × Tiempo de Entrega) + Stock de Seguridad
 *
 * El stock de seguridad usa la raíz cuadrada del lead time como factor de
 * variabilidad — una aproximación estándar cuando no se tiene la desviación
 * estándar de la demanda.
 */
export function calculateReorderPoint(
  _product: Product,
  averageDailyDemand: number,
  leadTimeDays: number
): number {
  const safetyStock = averageDailyDemand * Math.sqrt(leadTimeDays);
  const rop = averageDailyDemand * leadTimeDays + safetyStock;
  return Math.ceil(rop); // Redondear hacia arriba para no quedarse sin stock
}

/**
 * Calcula la Cantidad Económica de Pedido (EOQ - Economic Order Quantity).
 *
 * El EOQ minimiza la suma del costo de ordenamiento y el costo de mantenimiento
 * de inventario. Pedir muy poco aumenta la frecuencia de órdenes; pedir demasiado
 * aumenta el costo de almacenamiento.
 *
 * Fórmula: EOQ = √(2 × D × S / H)
 *   D = Demanda anual (demanda diaria × 365)
 *   S = Costo de ordenamiento = $10 por orden (costo administrativo fijo)
 *   H = Costo de mantenimiento = 20% del precio unitario del producto
 *
 * Nota: los precios están almacenados en centavos, se dividen por 100 antes de calcular.
 */
export function calculateEconomicOrderQuantity(
  product: Product,
  averageDailyDemand: number
): number {
  const annualDemand = averageDailyDemand * 365;
  const orderingCost = 10; // Costo fijo por generar una orden de compra
  const priceInDollars = product.price / 100; // Convertir centavos a dólares
  const holdingCostPerUnit = priceInDollars * 0.2; // 20% del valor del producto por año

  // Si el precio o la demanda son cero, no se puede calcular el EOQ
  if (holdingCostPerUnit === 0 || annualDemand === 0) return 0;

  const eoq = Math.sqrt((2 * annualDemand * orderingCost) / holdingCostPerUnit);
  return Math.ceil(eoq);
}

/**
 * Calcula cuántos días de stock quedan antes del agotamiento.
 * Si no hay demanda histórica, se retorna 999 (prácticamente infinito).
 */
export function calculateDaysUntilStockout(
  currentStock: number,
  averageDailyDemand: number
): number {
  if (averageDailyDemand === 0) return 999;
  return Math.floor(currentStock / averageDailyDemand);
}
