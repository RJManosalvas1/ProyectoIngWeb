"use client";

import { trpc } from "@/lib/trpc";
import { Check, X, Bot } from "lucide-react";
import { formatPrice, formatDate } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-700",
  aprobada: "bg-green-100 text-green-700",
  rechazada: "bg-red-100 text-red-700",
  recibida: "bg-blue-100 text-blue-700",
};

export default function OrdersPage() {
  const utils = trpc.useUtils();
  const { data: orders = [], isLoading } = trpc.inventory.purchaseOrders.list.useQuery();
  const { data: products = [] } = trpc.inventory.products.list.useQuery();

  const approve = trpc.inventory.purchaseOrders.approve.useMutation({
    onSuccess: () => utils.inventory.purchaseOrders.list.invalidate(),
  });

  const reject = trpc.inventory.purchaseOrders.reject.useMutation({
    onSuccess: () => utils.inventory.purchaseOrders.list.invalidate(),
  });

  const productMap = Object.fromEntries(products.map((p) => [p.id, p.name]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Órdenes de Compra</h1>
        <p className="text-slate-500 text-sm mt-1">Gestión de órdenes manuales y sugeridas por el Core</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Cargando...</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No hay órdenes de compra. Ejecuta el Core desde el Dashboard para generar sugerencias.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Número</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Producto</th>
                  <th className="text-right px-6 py-3 font-medium text-slate-600">Cantidad</th>
                  <th className="text-right px-6 py-3 font-medium text-slate-600">Precio unit.</th>
                  <th className="text-right px-6 py-3 font-medium text-slate-600">Total</th>
                  <th className="text-center px-6 py-3 font-medium text-slate-600">Origen</th>
                  <th className="text-center px-6 py-3 font-medium text-slate-600">Estado</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Fecha</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-6 py-4 font-mono text-xs text-slate-600">{o.orderNumber}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{productMap[o.productId] ?? `#${o.productId}`}</td>
                    <td className="px-6 py-4 text-right text-slate-700">{o.quantity}</td>
                    <td className="px-6 py-4 text-right text-slate-700">{formatPrice(o.unitPrice)}</td>
                    <td className="px-6 py-4 text-right font-medium text-slate-900">{formatPrice(o.totalPrice)}</td>
                    <td className="px-6 py-4 text-center">
                      {o.suggestedByCore ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-100 text-violet-700 text-xs rounded-full">
                          <Bot size={10} /> Core
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Manual</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${STATUS_STYLES[o.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{formatDate(o.createdAt)}</td>
                    <td className="px-6 py-4">
                      {o.status === "pendiente" && (
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => approve.mutate(o.id)}
                            disabled={approve.isPending}
                            className="p-1.5 text-slate-400 hover:text-green-600 transition-colors"
                            title="Aprobar"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => reject.mutate(o.id)}
                            disabled={reject.isPending}
                            className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                            title="Rechazar"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
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
