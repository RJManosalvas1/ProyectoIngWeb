import { db } from "@/core/db";
import { DrizzleProductRepository } from "./ProductRepository";
import { DrizzleCategoryRepository } from "./CategoryRepository";
import { DrizzleSupplierRepository } from "./SupplierRepository";
import { DrizzleStockMovementRepository } from "./StockMovementRepository";
import { DrizzlePurchaseOrderRepository } from "./PurchaseOrderRepository";
import { DrizzleStockAlertRepository } from "./StockAlertRepository";

// Instancias por defecto (respaldadas por Drizzle), inyectadas en los servicios.
// Cambiar de motor de persistencia o usar un doble de prueba solo requiere
// reemplazar estas instancias, sin tocar la capa de servicios (DIP).
export const productRepository = new DrizzleProductRepository(db);
export const categoryRepository = new DrizzleCategoryRepository(db);
export const supplierRepository = new DrizzleSupplierRepository(db);
export const stockMovementRepository = new DrizzleStockMovementRepository(db);
export const purchaseOrderRepository = new DrizzlePurchaseOrderRepository(db);
export const stockAlertRepository = new DrizzleStockAlertRepository(db);
