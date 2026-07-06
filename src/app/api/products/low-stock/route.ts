import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { productService } from "@/services";

/**
 * API REST (JSON) — GET /api/products/low-stock
 *
 * Endpoint propuesto en el documento del proyecto: devuelve los productos
 * cuyo stock actual es menor o igual al stock mínimo configurado, para que
 * un aplicativo externo basado en un framework JS (en este proyecto, el
 * propio panel admin en Next.js, vía `fetch`) pueda consumirlos sin pasar
 * por tRPC.
 *
 * Se protege con la misma sesión de NextAuth que usa el resto del panel
 * admin (no se expone de forma pública) — la información de inventario es
 * sensible y el proyecto no define un mecanismo de acceso público aparte.
 */
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const data = await productService.getLowStockReport();
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/products/low-stock error:", error);
    return NextResponse.json(
      { error: "Error interno al obtener el reporte de stock bajo" },
      { status: 500 }
    );
  }
}
