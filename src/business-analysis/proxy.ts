import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Runs before /business-analysis pages (see src/proxy.ts). It keeps the
// Supabase session cookie fresh and redirects signed-out visitors to the
// login page early. It is an optimisation, not the security boundary: every
// page and API route re-checks the session, the allowlist and membership on
// the server, and Postgres enforces Row Level Security regardless.

const PUBLIC_PATHS = ["/business-analysis/login"];

function securityHeaders(res: NextResponse) {
  res.headers.set("Cache-Control", "no-store, max-age=0");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Content-Security-Policy", "frame-ancestors 'none'");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "same-origin");
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

function env(name: string, ...fallbacks: string[]) {
  for (const k of [name, ...fallbacks]) {
    const v = process.env[k];
    if (v && !v.startsWith("YOUR_")) return v;
  }
  return undefined;
}

export async function businessAnalysisProxy(request: NextRequest): Promise<NextResponse> {
  const url = env("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
  const key = env("SUPABASE_ANON_KEY", "SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  let response = NextResponse.next({ request });
  // Not configured: let the page render its setup instructions.
  if (!url || !key) return securityHeaders(response);

  const supabase = createServerClient(url, key, {
    cookieOptions: {
      name: "sb-framely-ba",
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
    },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(toSet) {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) response.cookies.set(name, value, { ...options, httpOnly: true });
      },
    },
  });

  // Refreshes the access token when needed (writes cookies via setAll).
  const { data } = await supabase.auth.getClaims();
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

  if (!data?.claims && !isPublic) {
    const login = request.nextUrl.clone();
    login.pathname = "/business-analysis/login";
    login.search = "";
    const hadSession = request.cookies.getAll().some((c) => c.name.startsWith("sb-framely-ba"));
    if (hadSession) login.searchParams.set("reason", "expired");
    if (path !== "/business-analysis") login.searchParams.set("next", path + request.nextUrl.search);
    const redirect = NextResponse.redirect(login);
    for (const c of response.cookies.getAll()) redirect.cookies.set(c);
    return securityHeaders(redirect);
  }
  return securityHeaders(response);
}
