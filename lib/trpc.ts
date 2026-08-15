import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";

import { getApiBaseUrl } from "@/constants/oauth";
import type { AppRouter } from "@/server/routers";

export const trpc = createTRPCReact<AppRouter>();

export type ClerkTokenProvider = () => Promise<string | null>;

/** Creates a tRPC client that supplies the active Clerk session as a bearer token. */
export function createTRPCClient(getToken?: ClerkTokenProvider) {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${getApiBaseUrl()}/api/trpc`,
        transformer: superjson,
        async headers() {
          const token = await getToken?.();
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
        fetch(url, options) {
          return fetch(url, { ...options, credentials: "include" });
        },
      }),
    ],
  });
}
