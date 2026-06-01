"use client";

import { trpc } from "@/lib/trpc";
import { Package, Bell, ShoppingCart, AlertTriangle, Play, TrendingDown } from "lucide-react";
import { useState } from "react";
import { formatPrice } from "@/lib/utils";

export default function DashboardPage() {
  const { data: products = [] } = trpc.inventory.products.list.useQuery();
  const { data: alerts = [], refetch: refetchAlerts } = trpc.inventory.alerts.list.useQuery();
  const { data: orders = [] } = trpc.inventory.purchaseOrders.list.useQuery();
  const { data: analysis = [], refetch: refetchAnalysis } = trpc.inventory.core.getAnalysis.useQuery();

  const runAnalysis = trpc.inventory.core.runAnalysis.useMutation({
    onSuccess: () => {
      refetchAlerts();
      refetchAnalysis();
    },
  });

  const unreadAlerts = alerts.filter((a) => !a.isRead).length;
  const pendingOrders = orders.filter((o) => o.status === "pendiente").length;
  const lowStockProducts = analysis.filter((a) => a.shouldReorder).length;

  const stats = [
    {
      label: "Productos",
      value: products.length,
      icon: Package,
      color: "bg-blue-500",
    },
    {
      label: "Alertas activas",
      value: unreadAlerts,
      icon: Bell,
      color: "bg-amber-500",
    },
    {
      label: "Órdenes pendientes",
      value: pendingOrders,
      icon: ShoppingCart,
      color: "bg-violet-500",
    },
    {
      label: "Bajo stock",
      value: lowStockProducts,
      icon: TrendingDown,
      color: "bg-red-500",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">
            Resumen del sistema de inventarios
          </p>
        </div>
        <button
          onClick={() => runAnalysis.mutate()}
          disabled={runAnalysis.isPending}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Play size={14} />
          {runAnalysis.isPending ? "Ejecutando..." : "Ejecutar Core"}
        </button>
      </div>

      {runAnalysis.isSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">
          Análisis completado. Se generaron alertas y órdenes de compra según el algoritmo ROP/EOQ.
        </div>
      )}

      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{label}</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
              </div>
              <div className={`${color} p-3 rounded-lg`}>
                <Icon size={20} className="text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Análisis del Core */}
      {analysis.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Análisis de Inventario (ROP/EOQ)</h2>
            <p className="text-sm text-slate-500 mt-1">
              Productos que requieren reabastecimiento según el Core
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Producto</th>
                  <th className="text-right px-6 py-3 font-medium text-slate-600">Stock actual</th>
                  <th className="text-right px-6 py-3 font-medium text-slate-600">Punto de pedido</th>
                  <th className="text-right px-6 py-3 font-medium text-slate-600">EOQ</th>
                  <th className="text-right px-6 py-3 font-medium text-slate-600">Días restantes</th>
                  <th className="text-center px-6 py-3 font-medium text-slate-600">Estado</th>
                </tr>
              </thead>
              <tbody>
                {analysis.slice(0, 10).map((item) => (
                  <tr key={item.productId} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{item.productName}</td>
                    <td className="px-6 py-4 text-right text-slate-700">{item.currentStock}</td>
                    <td className="px-6 py-4 text-right text-slate-700">{item.reorderPoint}</td>
                    <td className="px-6 py-4 text-right text-slate-700">{item.economicOrderQuantity}</td>
                    <td className="px-6 py-4 text-right text-slate-700">
                      {item.daysUntilStockout === 999 ? "∞" : item.daysUntilStockout}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {item.shouldReorder ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                          <AlertTriangle size={10} /> Reponer
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                          OK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
