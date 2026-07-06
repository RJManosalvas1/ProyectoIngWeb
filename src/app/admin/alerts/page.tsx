"use client";

import { trpc } from "@/lib/trpc";
import { BellOff, AlertTriangle, PackageX, TrendingUp } from "lucide-react";
import { formatDate } from "@/lib/utils";

const ALERT_CONFIG = {
  stock_bajo: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50 border-amber-200", label: "Stock bajo" },
  sin_stock: { icon: PackageX, color: "text-red-600", bg: "bg-red-50 border-red-200", label: "Sin stock" },
  exceso_stock: { icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50 border-blue-200", label: "Exceso de stock" },
};

export default function AlertsPage() {
  const utils = trpc.useUtils();
  const { data: alerts = [], isLoading } = trpc.inventory.alerts.list.useQuery();
  const { data: products = [] } = trpc.inventory.products.list.useQuery();

  const markAsRead = trpc.inventory.alerts.markAsRead.useMutation({
    onSuccess: () => utils.inventory.alerts.list.invalidate(),
  });

  const productMap = Object.fromEntries(products.map((p) => [p.id, p.name]));
  const unreadCount = alerts.filter((a) => !a.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Alertas de Stock</h1>
          <p className="text-slate-500 text-sm mt-1">
            {unreadCount > 0
              ? `${unreadCount} alerta${unreadCount !== 1 ? "s" : ""} sin leer`
              : "Todas las alertas están al día"}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center text-slate-400 text-sm py-8">Cargando...</div>
      ) : alerts.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 p-12 text-center">
          <BellOff size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No hay alertas. Ejecuta el Core desde el Dashboard.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const config = ALERT_CONFIG[alert.alertType] ?? ALERT_CONFIG.stock_bajo;
            const Icon = config.icon;

            return (
              <div
                key={alert.id}
                className={`flex items-start gap-4 p-4 rounded-xl border ${config.bg} ${alert.isRead ? "opacity-50" : ""}`}
              >
                <div className={`mt-0.5 ${config.color}`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-slate-900 text-sm">
                      {productMap[alert.productId] ?? `Producto #${alert.productId}`}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.bg} ${config.color} border ${config.bg.split(" ")[1]}`}>
                      {config.label}
                    </span>
                    {!alert.isRead && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full" />
                    )}
                  </div>
                  {(alert.suggestedQuantity ?? 0) > 0 && (
                    <p className="text-sm text-slate-600">
                      Cantidad sugerida de reabastecimiento:{" "}
                      <strong>{alert.suggestedQuantity} unidades</strong>
                    </p>
                  )}
                  <p className="text-xs text-slate-400 mt-1">{formatDate(alert.createdAt)}</p>
                </div>
                {!alert.isRead && (
                  <button
                    onClick={() => markAsRead.mutate(alert.id)}
                    disabled={markAsRead.isPending}
                    className="text-xs text-slate-500 hover:text-slate-700 underline whitespace-nowrap"
                  >
                    Marcar leída
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
