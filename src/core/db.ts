import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var _pgClient: ReturnType<typeof postgres> | undefined;
}

/**
 * Conexión a la base de datos PostgreSQL (Supabase).
 *
 * En desarrollo se reutiliza la misma conexión entre hot-reloads para evitar
 * agotar el límite de conexiones del pool. En producción se crea una nueva
 * instancia por cada arranque del servidor.
 *
 * `prepare: false` es requerido por Supabase cuando usa pgbouncer como proxy.
 */
const client =
  global._pgClient ??
  postgres(process.env.DATABASE_URL!, {
    max: 10,
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") {
  global._pgClient = client;
}

export const db = drizzle(client, { schema });
