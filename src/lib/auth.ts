import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/core/db";
import { adminUsers } from "@/core/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

/**
 * Configuración de autenticación con NextAuth v5.
 *
 * Flujo de login:
 * 1. El usuario envía email y contraseña desde /login
 * 2. La función `authorize` busca al usuario en la tabla admin_users
 * 3. Compara la contraseña con el hash almacenado usando bcrypt
 * 4. Si es válido, NextAuth genera un JWT y crea la sesión
 * 5. El JWT se almacena en una cookie httpOnly (no accesible desde JS)
 *
 * La página de login personalizada está en /login (en lugar del default de NextAuth).
 * La sesión usa estrategia JWT (sin base de datos de sesiones).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Buscar usuario por email en la base de datos
        const [user] = await db
          .select()
          .from(adminUsers)
          .where(eq(adminUsers.email, credentials.email as string))
          .limit(1);

        if (!user) return null;

        // Verificar contraseña comparando con el hash bcrypt almacenado
        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) return null;

        // Retornar datos del usuario que se incluirán en el JWT
        return {
          id: String(user.id),
          email: user.email,
          name: user.name ?? user.email,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login", // Redirigir a nuestra página de login personalizada
  },
  session: { strategy: "jwt" },
  callbacks: {
    // Agregar el id del usuario al token JWT
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    // Exponer el id del usuario en el objeto de sesión del cliente
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      return session;
    },
  },
});
