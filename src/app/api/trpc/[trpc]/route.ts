import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/routers";
import { auth } from "@/lib/auth";
import type { TRPCContext } from "@/server/trpc";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async (): Promise<TRPCContext> => {
      const session = await auth();
      return { session };
    },
    onError({ error }) {
      if (error.code === "INTERNAL_SERVER_ERROR") {
        console.error("tRPC error:", error);
      }
    },
  });

export { handler as GET, handler as POST };
