/**
 * Seed script: crea únicamente el usuario administrador inicial.
 * Los demás datos (categorías, proveedores, productos) se ingresan manualmente desde la app.
 * Ejecutar con: npx tsx scripts/seed.ts
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import bcrypt from "bcryptjs";

async function seed() {
  // Import dinámico: los `import` estáticos se evalúan antes que
  // `dotenv.config()` (hoisting de ES modules), así que `src/core/db.ts`
  // leería `DATABASE_URL` como `undefined` si se importara arriba.
  const { db } = await import("../src/core/db");
  const { adminUsers } = await import("../src/core/schema");

  console.log("🌱 Iniciando seed...");

  const passwordHash = await bcrypt.hash("admin123", 10);

  await db
    .insert(adminUsers)
    .values({ email: "admin@inventario.com", passwordHash, name: "Administrador" })
    .onConflictDoNothing();

  console.log("✅ Admin creado: admin@inventario.com / admin123");
  console.log("\n🎉 Seed completado!");
  process.exit(0);
}

seed().catch((e) => {
  console.error("❌ Error en seed:", e);
  process.exit(1);
});
