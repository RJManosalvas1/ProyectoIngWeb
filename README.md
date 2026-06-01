# InvAdmin — Sistema de Gestión de Inventarios Inteligente

Panel de administración MVC para el **Core de Reabastecimiento Automático** de inventarios, desarrollado con Next.js 15, tRPC, Supabase y NextAuth.

---

## Descripción del sistema

El sistema implementa un **Core de Reabastecimiento Inteligente** basado en dos fórmulas de gestión de inventarios:

### ROP — Punto de Pedido (Reorder Point)
Determina **cuándo** hacer un pedido al proveedor:

```
ROP = (Demanda Promedio Diaria × Tiempo de Entrega) + Stock de Seguridad
Stock de Seguridad = Demanda Promedio Diaria × √(Tiempo de Entrega)
```

### EOQ — Cantidad Económica de Pedido (Economic Order Quantity)
Determina **cuánto** pedir minimizando costos:

```
EOQ = √(2 × D × S / H)
D = Demanda anual
S = Costo de ordenamiento ($10 por pedido)
H = Costo de mantenimiento (20% del precio del producto)
```

---

## Tech Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router) |
| Lenguaje | TypeScript 5 |
| Base de datos | PostgreSQL via Supabase |
| ORM | Drizzle ORM |
| API | tRPC v11 |
| Autenticación | NextAuth v5 (JWT + Credentials) |
| UI | Tailwind CSS + Lucide Icons |
| Deploy | Vercel + Supabase free tier |

---

## Estructura del proyecto

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/  # NextAuth endpoints
│   │   └── trpc/[trpc]/         # tRPC endpoint
│   ├── admin/                   # Páginas protegidas del admin
│   │   ├── page.tsx             # Dashboard con métricas + Core
│   │   ├── products/            # CRUD productos (validación BE código)
│   │   ├── categories/          # CRUD categorías
│   │   ├── suppliers/           # CRUD proveedores (validación BE email)
│   │   ├── movements/           # Movimientos (dropdown en cascada)
│   │   ├── orders/              # Órdenes de compra
│   │   └── alerts/              # Alertas de stock
│   └── login/                   # Página de inicio de sesión
├── core/                        # Core del sistema (reutilizado)
│   ├── schema.ts                # Esquema Drizzle (PostgreSQL)
│   ├── db.ts                    # Conexión Supabase
│   └── inventoryCore.ts         # Algoritmo ROP/EOQ
├── server/
│   ├── trpc.ts                  # Inicialización tRPC
│   └── routers/
│       ├── index.ts             # Router principal
│       └── inventory.ts         # Procedures con validaciones BE
├── lib/
│   ├── auth.ts                  # Config NextAuth
│   ├── trpc.ts                  # Cliente tRPC
│   └── utils.ts                 # Utilidades
├── components/
│   ├── TRPCProvider.tsx         # Provider React Query + tRPC
│   └── admin/
│       └── Sidebar.tsx          # Navegación lateral
└── middleware.ts                # Protección de rutas /admin
```

---

## Características clave

### ✅ Validación Back-End — Dato sensible: Código de Producto
El campo `code` (SKU) es el identificador único de cada producto en el inventario. La validación de **unicidad** se realiza **exclusivamente en el servidor** (procedure tRPC), antes de insertar en la base de datos. Esto evita duplicados aunque el usuario desactive JavaScript o envíe peticiones directamente a la API.

```typescript
// src/server/routers/inventory.ts — procedure products.create
const existing = await db
  .select({ id: products.id })
  .from(products)
  .where(eq(products.code, input.code.toUpperCase()))
  .limit(1);

if (existing.length > 0) {
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: `El código "${input.code}" ya existe en el sistema.`,
  });
}
```

### ✅ Validación Back-End — Email de Proveedor
El email del proveedor también se valida en servidor: formato y unicidad.

### ✅ Dropdown en Cascada — Categoría → Producto
En la pantalla de Movimientos de Stock, el formulario implementa dropdowns en cascada:
1. Se selecciona la **Categoría**
2. El dropdown de **Producto** se carga automáticamente con los productos de esa categoría (via tRPC `products.listByCategory`)

```typescript
// Procedure en servidor
listByCategory: protectedProcedure
  .input(z.object({ categoryId: z.number() }))
  .query(({ input }) =>
    db.select().from(products).where(eq(products.categoryId, input.categoryId))
  ),
```

---

## Setup local

### 1. Clonar el repositorio

```bash
git clone https://github.com/[usuario]/inventory-admin.git
cd inventory-admin
npm install
```

### 2. Configurar Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. En **Settings > Database**, copia la "Transaction pooler" connection string
3. Crea el archivo `.env.local`:

```env
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
NEXTAUTH_SECRET=genera-con-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3000
```

### 3. Crear tablas en la base de datos

```bash
npx drizzle-kit push
```

### 4. Crear usuario admin y datos de prueba

```bash
npx tsx scripts/seed.ts
```

Esto crea:
- **Email:** `admin@inventario.com`
- **Contraseña:** `admin123`

### 5. Iniciar el servidor de desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) → redirige automáticamente a `/login`.

---

## Variables de entorno requeridas

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Connection string PostgreSQL de Supabase (Transaction pooler) |
| `NEXTAUTH_SECRET` | Clave secreta para JWT (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | URL base de la aplicación |

---

## Diagrama entidad-relación

```
admin_users
    id, email, passwordHash, name

categories ─────────────────────────┐
    id, name, description           │
                                    │
suppliers ──────────────────────────┤
    id, name, email, phone,         │
    address, leadTimeDays           │
                                    │
products ◄──────────────────────────┘
    id, code (único), name,
    currentStock, minimumStock,
    price, categoryId, supplierId,
    reorderPoint, economicOrderQuantity
         │                │
         │                │
stock_movements    purchase_orders
    productId,         productId,
    quantity, type,    quantity, status,
    reason, userId     suggestedByCore
         │
stock_alerts
    productId, alertType,
    suggestedQuantity, isRead
```

---

## Ejecutar el Core de Reabastecimiento

Desde el **Dashboard** del admin, haz clic en **"Ejecutar Core"**. El sistema:

1. Analiza los últimos 90 días de movimientos de salida
2. Calcula el ROP y EOQ por producto
3. Genera alertas para productos que necesitan reabastecimiento
4. Crea órdenes de compra sugeridas automáticamente

---

## Deploy en Vercel

1. Push al repositorio en GitHub
2. Conecta el repo en [vercel.com](https://vercel.com)
3. Agrega las variables de entorno en Vercel:
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` (URL de producción de Vercel)
4. Deploy automático en cada push a `main`

---

Roberto Manosalvas

