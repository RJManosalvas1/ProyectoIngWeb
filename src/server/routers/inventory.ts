import { z } from "zod";
import { protectedProcedure, router } from "../trpc";
import {
  productService,
  categoryService,
  supplierService,
  stockMovementService,
  purchaseOrderService,
  stockAlertService,
  inventoryCoreService,
} from "@/services";

// Este router es intencionalmente delgado: valida la forma del input (zod) y
// delega toda regla de negocio y acceso a datos a la capa de servicios
// (`@/services`). No importa `db` ni `@/core/schema` — ese es el punto de la
// refactorización (SRP): el router solo conoce el límite HTTP/tRPC.
export const inventoryRouter = router({
  // ============ PRODUCTOS ============
  products: router({
    list: protectedProcedure.query(() => productService.list()),

    getById: protectedProcedure.input(z.number()).query(({ input }) => productService.getById(input)),

    // ✅ Dropdown en cascada: filtrar productos por categoría
    listByCategory: protectedProcedure
      .input(z.object({ categoryId: z.number() }))
      .query(({ input }) => productService.listByCategory(input.categoryId)),

    create: protectedProcedure
      .input(
        z.object({
          code: z.string().min(1, "El código es requerido").max(100),
          name: z.string().min(1, "El nombre es requerido"),
          description: z.string().optional(),
          currentStock: z.number().int().min(0).default(0),
          minimumStock: z.number().int().min(0).default(10),
          price: z.number().int().positive("El precio debe ser mayor a 0"), // en centavos
          categoryId: z.number().int().positive(),
          supplierId: z.number().int().positive(),
        })
      )
      .mutation(({ input }) => productService.create(input)),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          code: z.string().min(1).max(100).optional(),
          name: z.string().min(1).optional(),
          description: z.string().optional(),
          minimumStock: z.number().int().min(0).optional(),
          price: z.number().int().positive().optional(),
          categoryId: z.number().int().positive().optional(),
          supplierId: z.number().int().positive().optional(),
        })
      )
      .mutation(({ input }) => {
        const { id, ...rest } = input;
        return productService.update(id, rest);
      }),

    delete: protectedProcedure.input(z.number()).mutation(({ input }) => productService.delete(input)),
  }),

  // ============ CATEGORÍAS ============
  categories: router({
    list: protectedProcedure.query(() => categoryService.list()),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1, "El nombre es requerido"),
          description: z.string().optional(),
        })
      )
      .mutation(({ input }) => categoryService.create(input)),

    update: protectedProcedure
      .input(z.object({ id: z.number(), name: z.string().min(1), description: z.string().optional() }))
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return categoryService.update(id, data);
      }),

    delete: protectedProcedure.input(z.number()).mutation(({ input }) => categoryService.delete(input)),
  }),

  // ============ PROVEEDORES ============
  suppliers: router({
    list: protectedProcedure.query(() => supplierService.list()),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1, "El nombre es requerido"),
          email: z.string().email("Formato de email inválido").optional().or(z.literal("")),
          phone: z.string().optional(),
          address: z.string().optional(),
          leadTimeDays: z.number().int().min(1).default(7),
        })
      )
      .mutation(({ input }) => supplierService.create(input)),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).optional(),
          email: z.string().email().optional().or(z.literal("")),
          phone: z.string().optional(),
          address: z.string().optional(),
          leadTimeDays: z.number().int().min(1).optional(),
        })
      )
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return supplierService.update(id, data);
      }),

    delete: protectedProcedure.input(z.number()).mutation(({ input }) => supplierService.delete(input)),
  }),

  // ============ MOVIMIENTOS DE STOCK ============
  stockMovements: router({
    list: protectedProcedure
      .input(z.object({ productId: z.number().optional() }).optional())
      .query(({ input }) => stockMovementService.list(input?.productId)),

    create: protectedProcedure
      .input(
        z.object({
          productId: z.number().int().positive(),
          quantity: z.number().int().positive("La cantidad debe ser mayor a 0"),
          type: z.enum(["entrada", "salida", "ajuste"]),
          reason: z.string().optional(),
        })
      )
      .mutation(({ input, ctx }) => {
        const userId = ctx.session.user?.id ? parseInt(ctx.session.user.id) : null;
        return stockMovementService.recordMovement({ ...input, userId });
      }),
  }),

  // ============ ÓRDENES DE COMPRA ============
  purchaseOrders: router({
    list: protectedProcedure
      .input(z.object({ status: z.string().optional() }).optional())
      .query(({ input }) => purchaseOrderService.list(input?.status)),

    approve: protectedProcedure.input(z.number()).mutation(({ input, ctx }) => {
      const userId = ctx.session.user?.id ? parseInt(ctx.session.user.id) : null;
      return purchaseOrderService.approve(input, userId);
    }),

    reject: protectedProcedure.input(z.number()).mutation(({ input }) => purchaseOrderService.reject(input)),
  }),

  // ============ ALERTAS DE STOCK ============
  alerts: router({
    list: protectedProcedure
      .input(z.object({ isRead: z.boolean().optional() }).optional())
      .query(({ input }) => stockAlertService.list(input?.isRead)),

    markAsRead: protectedProcedure
      .input(z.number())
      .mutation(({ input }) => stockAlertService.markAsRead(input)),
  }),

  // ============ CORE DE REABASTECIMIENTO ============
  core: router({
    runAnalysis: protectedProcedure.mutation(async () => {
      const results = await inventoryCoreService.runAnalysis();
      return { success: true, results };
    }),

    getAnalysis: protectedProcedure.query(() => inventoryCoreService.getCurrentAnalysis()),
  }),
});
