/**
 * Seed script: crea únicamente el usuario administrador inicial.
 * Los demás datos (categorías, proveedores, productos) se ingresan manualmente desde la app.
 * Ejecutar con: npx tsx scripts/seed.ts
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "../src/core/db";
import { adminUsers } from "../src/core/schema";
import bcrypt from "bcryptjs";

async function seed() {
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
