"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Package,
  Tag,
  Truck,
  ArrowLeftRight,
  ShoppingCart,
  Bell,
  AlertTriangle,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Productos", icon: Package },
  { href: "/admin/categories", label: "Categorías", icon: Tag },
  { href: "/admin/suppliers", label: "Proveedores", icon: Truck },
  { href: "/admin/movements", label: "Movimientos", icon: ArrowLeftRight },
  { href: "/admin/orders", label: "Órdenes de Compra", icon: ShoppingCart },
  { href: "/admin/alerts", label: "Alertas", icon: Bell },
  { href: "/admin/low-stock", label: "Stock Bajo (REST)", icon: AlertTriangle },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-slate-900 text-white">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-lg font-bold text-white">InvAdmin</h1>
        <p className="text-xs text-slate-400 mt-1">Gestión de Inventarios</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
