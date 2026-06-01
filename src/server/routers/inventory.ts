import { z } from "zod";
import { protectedProcedure, router } from "../trpc";
import { db } from "@/core/db";
import { TRPCError } from "@trpc/server";
import {
  products,
  categories,
  suppliers,
  stockMovements,
  purchaseOrders,
  stockAlerts,
} from "@/core/schema";
import { eq, and, desc } from "drizzle-orm";
import { runCoreAnalysis, getCurrentAnalysis } from "@/core/inventoryCore";

export const inventoryRouter = router({
  // ============ PRODUCTOS ============
  products: router({
    list: protectedProcedure.query(async () => {
      return db.select().from(products).orderBy(products.name);
    }),

    getById: protectedProcedure.input(z.number()).query(async ({ input }) => {
      const result = await db
        .select()
        .from(products)
        .where(eq(products.id, input))
        .limit(1);
      return result[0] ?? null;
    }),

    // ✅ Dropdown en cascada: filtrar productos por categoría
    listByCategory: protectedProcedure
      .input(z.object({ categoryId: z.number() }))
      .query(async ({ input }) => {
        return db
          .select()
          .from(products)
          .where(eq(products.categoryId, input.categoryId))
          .orderBy(products.name);
      }),

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
      .mutation(async ({ input }) => {
        // ✅ VALIDACIÓN BACK-END: Unicidad del código de producto (dato sensible)
        // El código identifica únicamente cada SKU en el inventario.
        // Esta validación NO puede hacerse solo en el cliente porque un usuario
        // podría desactivar JS y enviar un duplicado directamente a la API.
        const existing = await db
          .select({ id: products.id })
          .from(products)
          .where(eq(products.code, input.code.toUpperCase()))
          .limit(1);

        if (existing.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `El código de producto "${input.code.toUpperCase()}" ya existe en el sistema. Los códigos de producto son identificadores únicos de inventario.`,
          });
        }

        const [created] = await db
          .insert(products)
          .values({ ...input, code: input.code.toUpperCase() })
          .returning({ id: products.id });

        return { success: true, id: created.id };
      }),

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
      .mutation(async ({ input }) => {
        const { id, code, ...rest } = input;

        // Si actualizan el código, verificar unicidad
        if (code) {
          const existing = await db
            .select({ id: products.id })
            .from(products)
            .where(eq(products.code, code.toUpperCase()))
            .limit(1);

          if (existing.length > 0 && existing[0].id !== id) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `El código "${code.toUpperCase()}" ya está en uso por otro producto.`,
            });
          }
        }

        await db
          .update(products)
          .set(code ? { ...rest, code: code.toUpperCase() } : rest)
          .where(eq(products.id, id));

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        await db.delete(products).where(eq(products.id, input));
        return { success: true };
      }),
  }),

  // ============ CATEGORÍAS ============
  categories: router({
    list: protectedProcedure.query(async () => {
      return db.select().from(categories).orderBy(categories.name);
    }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1, "El nombre es requerido"),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        // Verificar nombre único
        const existing = await db
          .select({ id: categories.id })
          .from(categories)
          .where(eq(categories.name, input.name))
          .limit(1);

        if (existing.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Ya existe una categoría con ese nombre.",
          });
        }

        const [created] = await db
          .insert(categories)
          .values(input)
          .returning({ id: categories.id });

        return { success: true, id: created.id };
      }),

    update: protectedProcedure
      .input(z.object({ id: z.number(), name: z.string().min(1), description: z.string().optional() }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.update(categories).set(data).where(eq(categories.id, id));
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        await db.delete(categories).where(eq(categories.id, input));
        return { success: true };
      }),
  }),

  // ============ PROVEEDORES ============
  suppliers: router({
    list: protectedProcedure.query(async () => {
      return db.select().from(suppliers).orderBy(suppliers.name);
    }),

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
      .mutation(async ({ input }) => {
        // ✅ VALIDACIÓN BACK-END: Email de proveedor (dato sensible de contacto)
        // El email del proveedor se usa para notificaciones automáticas de órdenes.
        // La validación de formato y unicidad debe hacerse en servidor para evitar
        // que datos corruptos lleguen a la base de datos y rompan el flujo de notificaciones.
        if (input.email && input.email !== "") {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(input.email)) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "El formato del email del proveedor no es válido.",
            });
          }

          const existing = await db
            .select({ id: suppliers.id })
            .from(suppliers)
            .where(eq(suppliers.email, input.email))
            .limit(1);

          if (existing.length > 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Ya existe un proveedor registrado con ese email.",
            });
          }
        }

        const [created] = await db
          .insert(suppliers)
          .values({
            ...input,
            email: input.email || null,
          })
          .returning({ id: suppliers.id });

        return { success: true, id: created.id };
      }),

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
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.update(suppliers).set(data).where(eq(suppliers.id, id));
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        await db.delete(suppliers).where(eq(suppliers.id, input));
        return { success: true };
      }),
  }),

  // ============ MOVIMIENTOS DE STOCK ============
  stockMovements: router({
    list: protectedProcedure
      .input(z.object({ productId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        if (input?.productId) {
          return db
            .select()
            .from(stockMovements)
            .where(eq(stockMovements.productId, input.productId))
            .orderBy(desc(stockMovements.createdAt));
        }
        return db
          .select()
          .from(stockMovements)
          .orderBy(desc(stockMovements.createdAt))
          .limit(100);
      }),

    create: protectedProcedure
      .input(
        z.object({
          productId: z.number().int().positive(),
          quantity: z.number().int().positive("La cantidad debe ser mayor a 0"),
          type: z.enum(["entrada", "salida", "ajuste"]),
          reason: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const userId = ctx.session.user?.id ? parseInt(ctx.session.user.id) : null;

        // Registrar el movimiento
        await db.insert(stockMovements).values({ ...input, userId });

        // Obtener y actualizar el stock del producto
        const [product] = await db
          .select()
          .from(products)
          .where(eq(products.id, input.productId))
          .limit(1);

        if (!product) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Producto no encontrado" });
        }

        let newStock = product.currentStock;
        if (input.type === "entrada") newStock += input.quantity;
        else if (input.type === "salida") newStock -= input.quantity;
        else if (input.type === "ajuste") newStock = input.quantity;

        await db
          .update(products)
          .set({ currentStock: Math.max(0, newStock) })
          .where(eq(products.id, input.productId));

        return { success: true };
      }),
  }),

  // ============ ÓRDENES DE COMPRA ============
  purchaseOrders: router({
    list: protectedProcedure
      .input(z.object({ status: z.string().optional() }).optional())
      .query(async ({ input }) => {
        if (input?.status) {
          return db
            .select()
            .from(purchaseOrders)
            .where(eq(purchaseOrders.status, input.status as any))
            .orderBy(desc(purchaseOrders.createdAt));
        }
        return db
          .select()
          .from(purchaseOrders)
          .orderBy(desc(purchaseOrders.createdAt));
      }),

    approve: protectedProcedure
      .input(z.number())
      .mutation(async ({ input, ctx }) => {
        const userId = ctx.session.user?.id ? parseInt(ctx.session.user.id) : null;

        await db
          .update(purchaseOrders)
          .set({ status: "aprobada", approvedBy: userId, approvedAt: new Date() })
          .where(eq(purchaseOrders.id, input));

        return { success: true };
      }),

    reject: protectedProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        await db
          .update(purchaseOrders)
          .set({ status: "rechazada" })
          .where(eq(purchaseOrders.id, input));

        return { success: true };
      }),
  }),

  // ============ ALERTAS DE STOCK ============
  alerts: router({
    list: protectedProcedure
      .input(z.object({ isRead: z.boolean().optional() }).optional())
      .query(async ({ input }) => {
        if (input?.isRead !== undefined) {
          return db
            .select()
            .from(stockAlerts)
            .where(eq(stockAlerts.isRead, input.isRead))
            .orderBy(desc(stockAlerts.createdAt));
        }
        return db
          .select()
          .from(stockAlerts)
          .orderBy(desc(stockAlerts.createdAt));
      }),

    markAsRead: protectedProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        await db
          .update(stockAlerts)
          .set({ isRead: true, readAt: new Date() })
          .where(eq(stockAlerts.id, input));

        return { success: true };
      }),
  }),

  // ============ CORE DE REABASTECIMIENTO ============
  core: router({
    runAnalysis: protectedProcedure.mutation(async () => {
      const results = await runCoreAnalysis();
      return { success: true, results };
    }),

    getAnalysis: protectedProcedure.query(async () => {
      return getCurrentAnalysis();
    }),
  }),
});
