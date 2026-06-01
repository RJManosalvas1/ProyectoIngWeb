"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Plus, ArrowUpCircle, ArrowDownCircle, RefreshCw } from "lucide-react";
import { formatDate } from "@/lib/utils";

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const TYPE_ICONS = {
  entrada: { icon: ArrowUpCircle, color: "text-green-600", bg: "bg-green-50", label: "Entrada" },
  salida: { icon: ArrowDownCircle, color: "text-red-600", bg: "bg-red-50", label: "Salida" },
  ajuste: { icon: RefreshCw, color: "text-blue-600", bg: "bg-blue-50", label: "Ajuste" },
};

export default function MovementsPage() {
  const utils = trpc.useUtils();
  const { data: movements = [], isLoading } = trpc.inventory.stockMovements.list.useQuery();
  const { data: categories = [] } = trpc.inventory.categories.list.useQuery();

  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState("");

  // DROPDOWN EN CASCADA: estado para la categoría seleccionada
  const [selectedCategoryId, setSelectedCategoryId] = useState<number>(0);

  // Solo carga los productos de la categoría seleccionada
  const { data: filteredProducts = [] } = trpc.inventory.products.listByCategory.useQuery(
    { categoryId: selectedCategoryId },
    { enabled: selectedCategoryId > 0 }
  );

  const [form, setForm] = useState({
    productId: 0,
    quantity: 1,
    type: "entrada" as "entrada" | "salida" | "ajuste",
    reason: "",
  });

  const create = trpc.inventory.stockMovements.create.useMutation({
    onSuccess: () => {
      utils.inventory.stockMovements.list.invalidate();
      utils.inventory.products.list.invalidate();
      setShowCreate(false);
      setForm({ productId: 0, quantity: 1, type: "entrada", reason: "" });
      setSelectedCategoryId(0);
      setError("");
    },
    onError: (e) => setError(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Movimientos de Stock</h1>
          <p className="text-slate-500 text-sm mt-1">Registro de entradas, salidas y ajustes</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setError(""); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={14} /> Nuevo movimiento
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Cargando...</div>
        ) : movements.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No hay movimientos registrados.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-6 py-3 font-medium text-slate-600">Tipo</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Producto ID</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">Cantidad</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Razón</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => {
                const t = TYPE_ICONS[m.type];
                const Icon = t.icon;
                return (
                  <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${t.bg} ${t.color}`}>
                        <Icon size={12} /> {t.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">#{m.productId}</td>
                    <td className="px-6 py-4 text-right font-medium text-slate-900">{m.quantity}</td>
                    <td className="px-6 py-4 text-slate-500">{m.reason ?? "—"}</td>
                    <td className="px-6 py-4 text-slate-500">{formatDate(m.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <Modal
          title="Nuevo movimiento de stock"
          onClose={() => { setShowCreate(false); setSelectedCategoryId(0); setError(""); }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError("");
              if (!form.productId) { setError("Selecciona un producto"); return; }
              create.mutate(form);
            }}
            className="space-y-4"
          >
            {/* ✅ DROPDOWN EN CASCADA — Paso 1: Seleccionar categoría */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                1. Selecciona la categoría
              </label>
              <select
                value={selectedCategoryId}
                onChange={(e) => {
                  setSelectedCategoryId(parseInt(e.target.value));
                  setForm({ ...form, productId: 0 }); // reiniciar producto al cambiar categoría
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value={0}>— Selecciona una categoría —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* ✅ DROPDOWN EN CASCADA — Paso 2: Productos filtrados por categoría */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                2. Selecciona el producto
                {selectedCategoryId === 0 && (
                  <span className="ml-2 text-xs text-slate-400 font-normal">(elige categoría primero)</span>
                )}
              </label>
              <select
                value={form.productId}
                onChange={(e) => setForm({ ...form, productId: parseInt(e.target.value) })}
                disabled={selectedCategoryId === 0}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value={0}>
                  {selectedCategoryId === 0
                    ? "— Primero selecciona una categoría —"
                    : filteredProducts.length === 0
                    ? "— Sin productos en esta categoría —"
                    : "— Selecciona un producto —"}
                </option>
                {filteredProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Stock: {p.currentStock})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de movimiento *</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="entrada">Entrada (aumenta stock)</option>
                <option value="salida">Salida (reduce stock)</option>
                <option value="ajuste">Ajuste (establece stock exacto)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cantidad *</label>
              <input
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Razón / Observación</label>
              <input
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="ej: Compra #123, Devolución, Conteo físico..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg border border-red-200">{error}</p>}

            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => { setShowCreate(false); setSelectedCategoryId(0); }} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={create.isPending} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50">
                {create.isPending ? "Guardando..." : "Registrar movimiento"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
