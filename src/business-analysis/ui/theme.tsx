"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cx } from "./cx";

import { THEME_COOKIE, type ThemeMode } from "./theme-mode";

const ThemeContext = createContext<{ mode: ThemeMode; resolved: "light" | "dark"; setMode: (m: ThemeMode) => void }>({
  mode: "system",
  resolved: "dark",
  setMode: () => {},
});

export const useTheme = () => useContext(ThemeContext);

function systemPrefersLight() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: light)").matches;
}

/**
 * Root of the module. The mode comes from a cookie read on the server, so
 * the first paint is already in the right theme (no flash).
 */
export function ThemeRoot({ initial, children }: { initial: ThemeMode; children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(initial);
  const [systemLight, setSystemLight] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const sync = () => setSystemLight(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    document.cookie = `${THEME_COOKIE}=${m}; path=/; max-age=31536000; samesite=lax`;
  }, []);

  const resolved = mode === "system" ? (systemLight || systemPrefersLight() ? "light" : "dark") : mode;

  return (
    <ThemeContext.Provider value={{ mode, resolved, setMode }}>
      <div data-theme={mode} className="ba-root flex min-h-screen flex-1 flex-col bg-zinc-950 text-[14px] leading-relaxed text-zinc-200">
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

const OPTIONS: { mode: ThemeMode; label: string; Icon: typeof Sun }[] = [
  { mode: "light", label: "Light", Icon: Sun },
  { mode: "dark", label: "Dark", Icon: Moon },
  { mode: "system", label: "System", Icon: Monitor },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { mode, setMode } = useTheme();
  return (
    <div role="radiogroup" aria-label="Colour theme" className={cx("flex rounded-lg border border-zinc-800 bg-zinc-950 p-0.5", className)}>
      {OPTIONS.map(({ mode: m, label, Icon }) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={mode === m}
          title={label}
          onClick={() => setMode(m)}
          className={cx(
            "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors",
            mode === m ? "bg-zinc-800 text-zinc-50" : "text-zinc-500 hover:text-zinc-200",
          )}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
