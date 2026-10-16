import type { NextRequest } from "next/server";
import { businessAnalysisProxy } from "@/business-analysis/proxy";

// Only the business-analysis pages go through the proxy. The template studio
// is untouched, and API routes are excluded so large report uploads are not
// buffered here (each route authenticates itself).
export function proxy(request: NextRequest) {
  return businessAnalysisProxy(request);
}

export const config = {
  matcher: ["/business-analysis", "/business-analysis/:path*"],
};
