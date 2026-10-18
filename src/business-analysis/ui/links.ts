// Domain code produces relative hrefs ("orders?status=rto", "reports"); this
// turns them into real routes.
const ALIASES: Record<string, string> = { reports: "imports", cashflow: "cash-flow" };

export function baHref(href: string | undefined | null): string {
  if (!href) return "/business-analysis";
  if (href.startsWith("/")) return href;
  const [path, query] = href.split("?");
  const target = ALIASES[path] ?? path;
  return `/business-analysis/${target}${query ? `?${query}` : ""}`;
}
