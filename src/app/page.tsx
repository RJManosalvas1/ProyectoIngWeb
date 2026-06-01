import { redirect } from "next/navigation";

/**
 * Página raíz: redirige a /login para que el usuario se autentique primero.
 * El middleware en /admin/* se encarga de redirigir al dashboard tras el login.
 */
export default function Home() {
  redirect("/login");
}
