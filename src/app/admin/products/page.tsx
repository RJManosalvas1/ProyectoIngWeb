"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Plus, Trash2, Pencil } from "lucide-react";
import { formatPrice } from "@/lib/utils";

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

type ProductForm = {
  code: string;
  name: string;
  description: string;
  currentStock: number;
  minimumStock: number;
  price: number;
  categoryId: number;
  supplierId: number;
};

const EMPTY: ProductForm = {
  code: "", name: "", description: "", currentStock: 0,
  minimumStock: 10, price: 0, categoryId: 0, supplierId: 0,
};

export default function ProductsPage() {
  const utils = trpc.useUtils();
  const { data: products = [], isLoading } = trpc.inventory.products.list.useQuery();
  const { data: categories = [] } = trpc.inventory.categories.list.useQuery();
  const { data: suppliers = [] } = trpc.inventory.suppliers.list.useQuery();

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<(ProductForm & { id: number }) | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY);
  const [error, setError] = useState("");

  const create = trpc.inventory.products.create.useMutation({
    onSuccess: () => { utils.inventory.products.list.invalidate(); setShowCreate(false); setForm(EMPTY); setError(""); },
    onError: (e) => setError(e.message),
  });

  const update = trpc.inventory.products.update.useMutation({
    onSuccess: () => { utils.inventory.products.list.invalidate(); setEditing(null); setError(""); },
    onError: (e) => setError(e.message),
  });

  const del = trpc.inventory.products.delete.useMutation({
    onSuccess: () => utils.inventory.products.list.invalidate(),
  });

  function openEdit(p: typeof products[number]) {
    setEditing({ id: p.id, code: p.code, name: p.name, description: p.description ?? "", currentStock: p.currentStock, minimumStock: p.minimumStock, price: p.price, categoryId: p.categoryId, supplierId: p.supplierId });
    setForm({ code: p.code, name: p.name, description: p.description ?? "", currentStock: p.currentStock, minimumStock: p.minimumStock, price: p.price, categoryId: p.categoryId, supplierId: p.supplierId });
    setError("");
  }

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));
  const supplierMap = Object.fromEntries(suppliers.map((s) => [s.id, s.name]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Productos</h1>
          <p className="text-slate-500 text-sm mt-1">Gestión del catálogo de productos</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setForm(EMPTY); setError(""); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={14} /> Nuevo producto
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Cargando...</div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No hay productos registrados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Código</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Nombre</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Categoría</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Proveedor</th>
                  <th className="text-right px-6 py-3 font-medium text-slate-600">Stock</th>
                  <th className="text-right px-6 py-3 font-medium text-slate-600">Precio</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-6 py-4 font-mono text-xs text-slate-600">{p.code}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{p.name}</td>
                    <td className="px-6 py-4 text-slate-500">{categoryMap[p.categoryId] ?? "—"}</td>
                    <td className="px-6 py-4 text-slate-500">{supplierMap[p.supplierId] ?? "—"}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={p.currentStock <= p.minimumStock ? "text-red-600 font-medium" : "text-slate-700"}>
                        {p.currentStock}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-700">{formatPrice(p.price)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => openEdit(p)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => { if (confirm(`¿Eliminar "${p.name}"?`)) del.mutate(p.id); }} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(showCreate || editing) && (
        <Modal
          title={editing ? "Editar producto" : "Nuevo producto"}
          onClose={() => { setShowCreate(false); setEditing(null); setError(""); }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError("");
              if (editing) {
                update.mutate({ id: editing.id, ...form });
              } else {
                create.mutate(form);
              }
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Código SKU *
                  <span className="ml-1 text-xs text-amber-600 font-normal">(único, validado en BE)</span>
                </label>
                <input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  required
                  placeholder="EJ: PROD-001"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Stock inicial</label>
                <input type="number" min={0} value={form.currentStock} onChange={(e) => setForm({ ...form, currentStock: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Stock mínimo</label>
                <input type="number" min={0} value={form.minimumStock} onChange={(e) => setForm({ ...form, minimumStock: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Precio (en centavos) *</label>
              <input type="number" min={1} value={form.price} onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) || 0 })} required placeholder="ej: 1500 = $15.00" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {form.price > 0 && <p className="text-xs text-slate-400 mt-1">{formatPrice(form.price)}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Categoría *</label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: parseInt(e.target.value) })}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value={0}>— Selecciona una categoría —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Proveedor *</label>
              <select
                value={form.supplierId}
                onChange={(e) => setForm({ ...form, supplierId: parseInt(e.target.value) })}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value={0}>— Selecciona un proveedor —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg border border-red-200">{error}</p>}

            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => { setShowCreate(false); setEditing(null); }} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={create.isPending || update.isPending} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50">
                {editing ? "Guardar cambios" : "Crear producto"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
