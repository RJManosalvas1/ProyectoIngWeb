import {
  productRepository,
  categoryRepository,
  supplierRepository,
  stockMovementRepository,
  purchaseOrderRepository,
  stockAlertRepository,
} from "@/repositories";
import { ProductService } from "./ProductService";
import { CategoryService } from "./CategoryService";
import { SupplierService } from "./SupplierService";
import { StockMovementService } from "./StockMovementService";
import { PurchaseOrderService } from "./PurchaseOrderService";
import { StockAlertService } from "./StockAlertService";
import { InventoryCoreService } from "./InventoryCoreService";

export const productService = new ProductService(productRepository, categoryRepository, supplierRepository);
export const categoryService = new CategoryService(categoryRepository);
export const supplierService = new SupplierService(supplierRepository);
export const stockMovementService = new StockMovementService(stockMovementRepository, productRepository);
export const purchaseOrderService = new PurchaseOrderService(purchaseOrderRepository);
export const stockAlertService = new StockAlertService(stockAlertRepository);
export const inventoryCoreService = new InventoryCoreService(
  productRepository,
  supplierRepository,
  stockMovementRepository,
  stockAlertService,
  purchaseOrderService
);
