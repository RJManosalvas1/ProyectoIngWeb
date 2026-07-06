"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

type LowStockProduct = {
  id: number;
  nombre: string;
  categoria: string;
  stockActual: number;
  stockMinimo: number;
  distribuidor: string;
  estado: "sin_stock" | "stock_bajo";
};

/**
 * Esta página NO usa tRPC: consume la API REST propia del proyecto
 * (`GET /api/products/low-stock`) con `fetch`, demostrando el requisito de
 * "aplicativo basado en un framework JavaScript que consume el API expuesta
 * en formato JSON". La cookie de sesión de NextAuth viaja automáticamente en
 * el `fetch` same-origin, así que no hace falta manejar tokens manualmente.
 */
export default function LowStockPage() {
  const [data, setData] = useState<LowStockProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/products/low-stock")
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Error al cargar datos");
        }
        return res.json();
      })
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Stock Bajo</h1>
        <p className="text-slate-500 text-sm mt-1">
          Reporte vía API REST (GET /api/products/low-stock) — consumido con fetch, sin tRPC
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Cargando...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 text-sm">{error}</div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No hay productos con stock bajo.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Producto</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Categoría</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Distribuidor</th>
                  <th className="text-right px-6 py-3 font-medium text-slate-600">Stock actual</th>
                  <th className="text-right px-6 py-3 font-medium text-slate-600">Stock mínimo</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.map((p) => (
                  <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{p.nombre}</td>
                    <td className="px-6 py-4 text-slate-500">{p.categoria}</td>
                    <td className="px-6 py-4 text-slate-500">{p.distribuidor}</td>
                    <td className="px-6 py-4 text-right text-red-600 font-medium">{p.stockActual}</td>
                    <td className="px-6 py-4 text-right text-slate-700">{p.stockMinimo}</td>
                    <td className="px-6 py-4">
                      <span
                        className={
                          "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium " +
                          (p.estado === "sin_stock"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700")
                        }
                      >
                        <AlertTriangle size={12} />
                        {p.estado === "sin_stock" ? "Sin stock" : "Stock bajo"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
