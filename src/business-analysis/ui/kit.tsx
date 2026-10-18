"use client";

// Primitive UI components for the business-analysis module, in Framely's
// dark zinc style. Semantic colour: emerald = favourable/profit, rose =
// adverse/loss, zinc = neutral information.
import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { forwardRef, useId } from "react";
import { Info, LoaderCircle } from "lucide-react";

import { cx } from "./cx";
export { cx };

type Variant = "primary" | "secondary" | "ghost" | "danger";
const VARIANTS: Record<Variant, string> = {
  primary: "bg-zinc-100 text-zinc-950 shadow-sm hover:bg-zinc-200",
  secondary: "border border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-zinc-50",
  ghost: "text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100",
  danger: "border border-rose-800 bg-rose-950 text-rose-300 hover:bg-rose-900",
};

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md"; loading?: boolean }>(
  function Button({ variant = "secondary", size = "md", loading, className, children, disabled, type = "button", ...rest }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cx(
          "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 disabled:cursor-not-allowed disabled:opacity-50",
          size === "sm" ? "h-8 px-3 text-[13px]" : "h-9 px-4 text-sm",
          VARIANTS[variant],
          className,
        )}
        {...rest}
      >
        {loading && <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden />}
        {children}
      </button>
    );
  },
);

export function LinkButton({ href, children, variant = "secondary", className }: { href: string; children: ReactNode; variant?: Variant; className?: string }) {
  return (
    <Link
      href={href}
      className={cx("inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-sky-400", VARIANTS[variant], className)}
    >
      {children}
    </Link>
  );
}

export function Card({ title, subtitle, actions, children, className, id }: { title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cx("ba-surface rounded-2xl border border-zinc-800 bg-zinc-900", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-2 px-5 pt-4">
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-semibold text-zinc-50">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-[13px] text-zinc-500">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className="px-5 pb-5 pt-4">{children}</div>
    </section>
  );
}

const TONES = {
  neutral: "border-zinc-800 bg-zinc-800 text-zinc-300",
  positive: "border-emerald-900 bg-emerald-950 text-emerald-300",
  negative: "border-rose-900 bg-rose-950 text-rose-300",
  warning: "border-amber-900 bg-amber-950 text-amber-300",
  info: "border-sky-900 bg-sky-950 text-sky-200",
} as const;
export type BadgeTone = keyof typeof TONES;

export function Badge({ tone = "neutral", children, title }: { tone?: BadgeTone; children: ReactNode; title?: string }) {
  return (
    <span title={title} className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium", TONES[tone])}>
      {children}
    </span>
  );
}

export function Field({ label, error, hint, children, htmlFor, required }: { label: string; error?: string; hint?: ReactNode; children: ReactNode; htmlFor: string; required?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-zinc-300">
        {label}
        {required && <span className="text-rose-400" aria-hidden> *</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-zinc-500">{hint}</p>}
      {error && (
        <p className="text-xs text-rose-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

const control =
  "w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition-[border-color,box-shadow] focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:opacity-60 aria-[invalid=true]:border-rose-600";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cx(control, "h-9 py-0", className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...rest }, ref) {
  return (
    <select ref={ref} className={cx(control, "h-9 py-0 pr-8", className)} {...rest}>
      {children}
    </select>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cx(control, "min-h-20", className)} {...rest} />;
});

export function Checkbox({ label, checked, onChange, id, hint }: { label: ReactNode; checked: boolean; onChange: (v: boolean) => void; id?: string; hint?: ReactNode }) {
  const auto = useId();
  const cid = id ?? auto;
  return (
    <div className="flex items-start gap-2">
      <input id={cid} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 accent-sky-500" />
      <label htmlFor={cid} className="text-sm text-zinc-200">
        {label}
        {hint && <span className="block text-xs text-zinc-500">{hint}</span>}
      </label>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-md bg-zinc-800", className)} aria-hidden />;
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      {icon && <div className="text-zinc-600" aria-hidden>{icon}</div>}
      <p className="text-[15px] font-medium text-zinc-100">{title}</p>
      {children && <div className="max-w-lg text-[13px] leading-relaxed text-zinc-500">{children}</div>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/** Keyboard- and screen-reader-accessible explanation tooltip. */
export function InfoTip({ text, label = "How is this calculated?" }: { text: string; label?: string }) {
  const id = useId();
  return (
    <span className="group relative inline-flex">
      <button type="button" aria-label={label} aria-describedby={id} className="rounded text-zinc-500 hover:text-zinc-300 focus-visible:text-zinc-200 focus-visible:outline-1 focus-visible:outline-sky-400">
        <Info className="h-3.5 w-3.5" aria-hidden />
      </button>
      <span
        id={id}
        role="tooltip"
        className="pointer-events-none invisible absolute left-1/2 top-full z-30 mt-1.5 w-64 -translate-x-1/2 rounded-lg border border-zinc-700 bg-zinc-900 p-2.5 text-xs font-normal leading-relaxed text-zinc-300 opacity-0 shadow-xl transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-zinc-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Notice({ tone = "info", title, children }: { tone?: "info" | "warning" | "negative" | "positive"; title?: string; children: ReactNode }) {
  const styles = {
    info: "border-sky-900 bg-sky-950 text-sky-100",
    warning: "border-amber-900 bg-amber-950 text-amber-100",
    negative: "border-rose-900 bg-rose-950 text-rose-100",
    positive: "border-emerald-900 bg-emerald-950 text-emerald-100",
  }[tone];
  return (
    <div className={cx("rounded-xl border px-4 py-3 text-sm", styles)} role={tone === "negative" ? "alert" : "status"}>
      {title && <p className="font-medium">{title}</p>}
      <div className={cx(title && "mt-0.5", "text-[13px] leading-relaxed opacity-85")}>{children}</div>
    </div>
  );
}

export function Stat({ label, value, tone = "neutral", hint }: { label: string; value: ReactNode; tone?: "neutral" | "positive" | "negative"; hint?: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className={cx("mt-1 truncate text-xl font-semibold tabular-nums tracking-tight", tone === "positive" ? "text-emerald-400" : tone === "negative" ? "text-rose-400" : "text-zinc-100")}>{value}</p>
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}
