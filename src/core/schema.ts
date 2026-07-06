import {
  pgEnum,
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  varchar,
  unique,
} from "drizzle-orm/pg-core";

// Enums
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const stockTypeEnum = pgEnum("stock_type", ["entrada", "salida", "ajuste"]);
export const orderStatusEnum = pgEnum("order_status", [
  "pendiente",
  "aprobada",
  "rechazada",
  "recibida",
]);
export const alertTypeEnum = pgEnum("alert_type", [
  "stock_bajo",
  "sin_stock",
  "exceso_stock",
]);

// Tabla de administradores (para NextAuth credentials)
export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = typeof adminUsers.$inferInsert;

// Categorías de productos
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

// Proveedores
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).unique(),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  leadTimeDays: integer("lead_time_days").default(7).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = typeof suppliers.$inferInsert;

// Productos
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  currentStock: integer("current_stock").default(0).notNull(),
  minimumStock: integer("minimum_stock").default(10).notNull(),
  price: integer("price").notNull(), // En centavos
  categoryId: integer("category_id").notNull(),
  supplierId: integer("supplier_id").notNull(),
  reorderPoint: integer("reorder_point").default(0),
  economicOrderQuantity: integer("economic_order_quantity").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

// Movimientos de stock
export const stockMovements = pgTable("stock_movements", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  type: stockTypeEnum("type").notNull(),
  reason: varchar("reason", { length: 255 }),
  userId: integer("user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type StockMovement = typeof stockMovements.$inferSelect;
export type InsertStockMovement = typeof stockMovements.$inferInsert;

// Órdenes de compra
export const purchaseOrders = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  orderNumber: varchar("order_number", { length: 100 }).notNull().unique(),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: integer("unit_price").notNull(), // En centavos
  totalPrice: integer("total_price").notNull(), // En centavos
  status: orderStatusEnum("status").default("pendiente").notNull(),
  suggestedByCore: boolean("suggested_by_core").default(false).notNull(),
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = typeof purchaseOrders.$inferInsert;

// Alertas de stock
export const stockAlerts = pgTable("stock_alerts", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  alertType: alertTypeEnum("alert_type").notNull(),
  suggestedQuantity: integer("suggested_quantity").default(0),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
});

export type StockAlert = typeof stockAlerts.$inferSelect;
export type InsertStockAlert = typeof stockAlerts.$inferInsert;
