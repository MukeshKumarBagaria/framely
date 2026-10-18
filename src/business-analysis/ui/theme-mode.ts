// Shared by the server layout (reads the cookie) and the client toggle (writes it).
export type ThemeMode = "light" | "dark" | "system";
export const THEME_COOKIE = "ba-theme";

export function readThemeCookie(value: string | undefined): ThemeMode {
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}
