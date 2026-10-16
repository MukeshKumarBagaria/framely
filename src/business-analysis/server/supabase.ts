import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getServerEnv } from "./env";

export const SCHEMA = "business_analysis";
export const AUTH_COOKIE = "sb-framely-ba";

// The client is typed loosely (no generated Database types are available for
// a project Claude cannot introspect); every query result is mapped through an
// explicit row type in the services.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DbClient = SupabaseClient<any, "business_analysis", "business_analysis">;

export function cookieOptions() {
  return {
    name: AUTH_COOKIE,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  };
}

/**
 * A Supabase client acting as the signed-in user (anon key + the user's
 * session cookie). Postgres sees the `authenticated` role and the user's JWT,
 * so Row Level Security applies to every query.
 */
export async function createUserClient(): Promise<DbClient> {
  const env = getServerEnv();
  const store = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    db: { schema: SCHEMA },
    cookieOptions: cookieOptions(),
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(toSet) {
        try {
          for (const { name, value, options } of toSet) store.set(name, value, { ...options, httpOnly: true });
        } catch {
          // Server Components cannot set cookies; proxy.ts refreshes the
          // session on the next navigation instead.
        }
      },
    },
  }) as unknown as DbClient;
}
