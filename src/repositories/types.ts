import type { db } from "@/core/db";

/** Tipo del cliente Drizzle compartido por todos los repositorios. */
export type DB = typeof db;
