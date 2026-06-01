/**
 * Proxy de protección de rutas (equivalente al middleware de NextAuth).
 *
 * Intercepta todas las peticiones a /admin/* y verifica que el usuario
 * tenga una sesión JWT válida. Si no está autenticado, redirige automáticamente
 * a /login. El `auth` de NextAuth realiza esta verificación internamente.
 */
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const session = await auth();

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Aplica el proxy solo a rutas del panel de administración
  matcher: ["/admin/:path*"],
};
