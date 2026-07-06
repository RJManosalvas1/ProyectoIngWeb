"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Plus, Trash2, Pencil } from "lucide-react";
import { formatDate } from "@/lib/utils";

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  const utils = trpc.useUtils();
  const { data: categories = [], isLoading } = trpc.inventory.categories.list.useQuery();

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<{ id: number; name: string; description?: string | null } | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [error, setError] = useState("");

  const create = trpc.inventory.categories.create.useMutation({
    onSuccess: () => { utils.inventory.categories.list.invalidate(); setShowCreate(false); setForm({ name: "", description: "" }); },
    onError: (e) => setError(e.message),
  });

  const update = trpc.inventory.categories.update.useMutation({
    onSuccess: () => { utils.inventory.categories.list.invalidate(); setEditing(null); },
    onError: (e) => setError(e.message),
  });

  const del = trpc.inventory.categories.delete.useMutation({
    onSuccess: () => utils.inventory.categories.list.invalidate(),
  });

  function openEdit(cat: { id: number; name: string; description?: string | null }) {
    setEditing(cat);
    setForm({ name: cat.name, description: cat.description ?? "" });
    setError("");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Categorías</h1>
          <p className="text-slate-500 text-sm mt-1">Gestión de categorías de productos</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setForm({ name: "", description: "" }); setError(""); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={14} /> Nueva categoría
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Cargando...</div>
        ) : categories.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No hay categorías registradas.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-6 py-3 font-medium text-slate-600">Nombre</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Descripción</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Creada</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{cat.name}</td>
                  <td className="px-6 py-4 text-slate-500">{cat.description ?? "—"}</td>
                  <td className="px-6 py-4 text-slate-500">{formatDate(cat.createdAt)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openEdit(cat)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => { if (confirm("¿Eliminar esta categoría?")) del.mutate(cat.id); }}
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
          title={editing ? "Editar categoría" : "Nueva categoría"}
          onClose={() => { setShowCreate(false); setEditing(null); setError(""); }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError("");
              if (editing) {
                update.mutate({ id: editing.id, name: form.name, description: form.description || undefined });
              } else {
                create.mutate({ name: form.name, description: form.description || undefined });
              }
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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
