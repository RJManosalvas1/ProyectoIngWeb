"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Plus, Trash2, Pencil } from "lucide-react";

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
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

type SupplierForm = {
  name: string;
  email: string;
  phone: string;
  address: string;
  leadTimeDays: number;
};

const EMPTY: SupplierForm = { name: "", email: "", phone: "", address: "", leadTimeDays: 7 };

export default function SuppliersPage() {
  const utils = trpc.useUtils();
  const { data: suppliers = [], isLoading } = trpc.inventory.suppliers.list.useQuery();

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<(SupplierForm & { id: number }) | null>(null);
  const [form, setForm] = useState<SupplierForm>(EMPTY);
  const [error, setError] = useState("");

  const create = trpc.inventory.suppliers.create.useMutation({
    onSuccess: () => { utils.inventory.suppliers.list.invalidate(); setShowCreate(false); setForm(EMPTY); setError(""); },
    onError: (e) => setError(e.message),
  });

  const update = trpc.inventory.suppliers.update.useMutation({
    onSuccess: () => { utils.inventory.suppliers.list.invalidate(); setEditing(null); setError(""); },
    onError: (e) => setError(e.message),
  });

  const del = trpc.inventory.suppliers.delete.useMutation({
    onSuccess: () => utils.inventory.suppliers.list.invalidate(),
  });

  function openEdit(s: typeof suppliers[number]) {
    setEditing({ id: s.id, name: s.name, email: s.email ?? "", phone: s.phone ?? "", address: s.address ?? "", leadTimeDays: s.leadTimeDays });
    setForm({ name: s.name, email: s.email ?? "", phone: s.phone ?? "", address: s.address ?? "", leadTimeDays: s.leadTimeDays });
    setError("");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Proveedores</h1>
          <p className="text-slate-500 text-sm mt-1">Gestión de proveedores del inventario</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setForm(EMPTY); setError(""); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={14} /> Nuevo proveedor
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Cargando...</div>
        ) : suppliers.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No hay proveedores registrados.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-6 py-3 font-medium text-slate-600">Nombre</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Email</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Teléfono</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">Tiempo entrega</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{s.name}</td>
                  <td className="px-6 py-4 text-slate-500">{s.email ?? "—"}</td>
                  <td className="px-6 py-4 text-slate-500">{s.phone ?? "—"}</td>
                  <td className="px-6 py-4 text-right text-slate-700">{s.leadTimeDays} días</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openEdit(s)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => { if (confirm(`¿Eliminar proveedor "${s.name}"?`)) del.mutate(s.id); }}
                        className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {(showCreate || editing) && (
        <Modal
          title={editing ? "Editar proveedor" : "Nuevo proveedor"}
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
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email
                <span className="ml-1 text-xs text-amber-600 font-normal">(validado en servidor)</span>
              </label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="proveedor@empresa.com" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Dirección</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tiempo de entrega (días) *</label>
              <input type="number" min={1} value={form.leadTimeDays} onChange={(e) => setForm({ ...form, leadTimeDays: parseInt(e.target.value) || 7 })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg border border-red-200">{error}</p>}
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => { setShowCreate(false); setEditing(null); }} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={create.isPending || update.isPending} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50">
                {editing ? "Guardar cambios" : "Crear"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
