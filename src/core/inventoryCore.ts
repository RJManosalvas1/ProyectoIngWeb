import { db } from "./db";
import {
  products,
  stockMovements,
  purchaseOrders,
  stockAlerts,
  suppliers,
} from "./schema";
import { eq, and, gte } from "drizzle-orm";
import type { Product } from "./schema";

/**
 * CORE DE REABASTECIMIENTO INTELIGENTE
 *
 * Este módulo implementa los dos algoritmos principales de gestión de inventario:
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
 * Calcula el promedio de demanda diaria basado en el historial de movimientos.
 *
 * Se analizan los últimos 90 días de salidas (ventas/consumos) para obtener
 * una muestra estadísticamente representativa. Se usa una ventana de 90 días
 * porque captura variaciones estacionales sin incluir datos demasiado antiguos.
 */
export async function calculateAverageDailyDemand(productId: number): Promise<number> {
  // Ventana de análisis: 90 días hacia atrás desde hoy
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  // Solo se cuentan los movimientos de tipo "salida" (ventas o consumo)
  const movements = await db
    .select()
    .from(stockMovements)
    .where(
      and(
        eq(stockMovements.productId, productId),
        eq(stockMovements.type, "salida"),
        gte(stockMovements.createdAt, ninetyDaysAgo)
      )
    );

  if (movements.length === 0) return 0;

  // Demanda diaria promedio = total de unidades salidas / 90 días
  const totalQuantity = movements.reduce((sum, m) => sum + m.quantity, 0);
  return totalQuantity / 90;
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

/**
 * Realiza el análisis completo del Core para un producto individual.
 * Combina todas las métricas: demanda, ROP, EOQ y días hasta agotamiento.
 */
export async function analyzeProductInventory(
  product: Product,
  leadTimeDays: number
): Promise<CoreAnalysisResult> {
  const averageDailyDemand = await calculateAverageDailyDemand(product.id);
  const reorderPoint = calculateReorderPoint(product, averageDailyDemand, leadTimeDays);
  const eoq = calculateEconomicOrderQuantity(product, averageDailyDemand);
  const daysUntilStockout = calculateDaysUntilStockout(product.currentStock, averageDailyDemand);

  // Se debe reordenar si el stock actual es igual o menor al punto de pedido calculado
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

/**
 * FUNCIÓN PRINCIPAL DEL CORE — Ejecuta el análisis completo para todos los productos.
 *
 * Flujo de ejecución:
 * 1. Obtiene todos los productos de la base de datos
 * 2. Por cada producto, consulta el tiempo de entrega (lead time) de su proveedor
 * 3. Calcula ROP y EOQ para ese producto usando su historial de 90 días
 * 4. Si el stock actual ≤ ROP:
 *    a. Crea una alerta de "stock_bajo" (solo si no existe una activa)
 *    b. Genera una orden de compra sugerida (solo si no hay una pendiente)
 *
 * La verificación de duplicados evita crear múltiples alertas u órdenes
 * para el mismo producto si el core se ejecuta varias veces seguidas.
 */
export async function runCoreAnalysis(): Promise<CoreAnalysisResult[]> {
  const allProducts = await db.select().from(products);
  const results: CoreAnalysisResult[] = [];

  for (const product of allProducts) {
    // Obtener lead time del proveedor; si no hay proveedor asignado, usar 7 días por defecto
    const supplierRow = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.id, product.supplierId))
      .limit(1);

    const leadTimeDays = supplierRow[0]?.leadTimeDays ?? 7;
    const analysis = await analyzeProductInventory(product, leadTimeDays);
    results.push(analysis);

    if (analysis.shouldReorder) {
      // Crear alerta solo si no existe una activa sin leer para este producto
      const existingAlert = await db
        .select()
        .from(stockAlerts)
        .where(
          and(
            eq(stockAlerts.productId, product.id),
            eq(stockAlerts.isRead, false),
            eq(stockAlerts.alertType, "stock_bajo")
          )
        )
        .limit(1);

      if (existingAlert.length === 0) {
        await db.insert(stockAlerts).values({
          productId: product.id,
          alertType: "stock_bajo",
          suggestedQuantity: analysis.suggestedOrderQuantity,
          isRead: false,
        });
      }
    }

    if (analysis.shouldReorder && analysis.suggestedOrderQuantity > 0) {
      // Crear orden de compra solo si no hay una pendiente para este producto
      const existingOrder = await db
        .select()
        .from(purchaseOrders)
        .where(
          and(
            eq(purchaseOrders.productId, product.id),
            eq(purchaseOrders.status, "pendiente")
          )
        )
        .limit(1);

      if (existingOrder.length === 0) {
        // Número único de orden basado en timestamp + id del producto
        const orderNumber = `ORD-${Date.now()}-${product.id}`;
        const totalPrice = analysis.suggestedOrderQuantity * product.price;

        await db.insert(purchaseOrders).values({
          orderNumber,
          productId: product.id,
          quantity: analysis.suggestedOrderQuantity,
          unitPrice: product.price,
          totalPrice,
          status: "pendiente",
          suggestedByCore: true, // Marca que esta orden fue generada automáticamente
        });
      }
    }
  }

  return results;
}

/**
 * Obtiene el análisis actual del inventario sin generar alertas ni órdenes.
 * Útil para mostrar métricas en el dashboard sin efectos secundarios.
 */
export async function getCurrentAnalysis(): Promise<CoreAnalysisResult[]> {
  const allProducts = await db.select().from(products);
  const results: CoreAnalysisResult[] = [];

  for (const product of allProducts) {
    const supplierRow = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.id, product.supplierId))
      .limit(1);

    const leadTimeDays = supplierRow[0]?.leadTimeDays ?? 7;
    const analysis = await analyzeProductInventory(product, leadTimeDays);
    results.push(analysis);
  }

  return results;
}
