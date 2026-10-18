import { cookies } from "next/headers";
import { THEME_COOKIE, readThemeCookie } from "@/business-analysis/ui/theme-mode";
import { ThemeRoot } from "@/business-analysis/ui/theme";
import "@/business-analysis/ui/theme.css";

// Wraps every /business-analysis page (including login) in the module's theme.
export default async function BusinessAnalysisRootLayout({ children }: { children: React.ReactNode }) {
  const mode = readThemeCookie((await cookies()).get(THEME_COOKIE)?.value);
  return <ThemeRoot initial={mode}>{children}</ThemeRoot>;
}
