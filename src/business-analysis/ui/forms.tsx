"use client";

import { useState, type ReactNode } from "react";
import { fieldErrors, errorMessage, ApiError } from "./api";
import { Button, Checkbox, Field, Input, Notice, Select, Textarea } from "./kit";
import { Modal } from "./overlay";

export type FieldDef = {
  name: string;
  label: string;
  type?: "text" | "number" | "money" | "date" | "select" | "checkbox" | "textarea" | "email";
  options?: { value: string; label: string }[];
  required?: boolean;
  hint?: ReactNode;
  placeholder?: string;
  /** Spans both columns. */
  wide?: boolean;
  step?: string;
  min?: number;
  max?: number;
  /** Hide the field unless this returns true. */
  when?: (v: Values) => boolean;
  disabled?: boolean;
};
export type Values = Record<string, string | boolean>;

/**
 * A modal form driven by a field list. The server owns validation: field
 * errors from a 400 response are shown beside the matching input.
 */
export function FormModal(props: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  fields: FieldDef[];
  initial: Values;
  submitLabel?: string;
  onSubmit: (values: Values) => Promise<void>;
  wide?: boolean;
  footerExtra?: ReactNode;
  children?: (values: Values, set: (name: string, v: string | boolean) => void) => ReactNode;
}) {
  // The body is mounted only while the dialog is open, so every opening
  // starts from `initial` without any reset logic.
  return (
    <Modal open={props.open} onClose={props.onClose} title={props.title} description={props.description} wide={props.wide}>
      <FormBody {...props} />
    </Modal>
  );
}

function FormBody({ onClose, fields, initial, submitLabel = "Save", onSubmit, footerExtra, children }: {
  onClose: () => void;
  fields: FieldDef[];
  initial: Values;
  submitLabel?: string;
  onSubmit: (values: Values) => Promise<void>;
  footerExtra?: ReactNode;
  children?: (values: Values, set: (name: string, v: string | boolean) => void) => ReactNode;
}) {
  const [values, setValues] = useState<Values>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (name: string, v: string | boolean) => setValues((p) => ({ ...p, [name]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setFormError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      const f = fieldErrors(err);
      setErrors(f);
      setFormError(err instanceof ApiError && err.code === "bad_request" && Object.keys(f).length ? "Please fix the highlighted fields." : errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {formError && <Notice tone="negative">{formError}</Notice>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fields.filter((f) => !f.when || f.when(values)).map((f) => {
          const id = `ba-f-${f.name}`;
          const err = errors[f.name];
          const wideCls = f.wide || f.type === "textarea" || f.type === "checkbox" ? "sm:col-span-2" : "";
          if (f.type === "checkbox") {
            return (
              <div key={f.name} className={wideCls}>
                <Checkbox id={id} label={f.label} hint={f.hint} checked={Boolean(values[f.name])} onChange={(v) => set(f.name, v)} />
                {err && <p className="text-[11px] text-rose-400" role="alert">{err}</p>}
              </div>
            );
          }
          const common = { id, value: String(values[f.name] ?? ""), disabled: f.disabled, "aria-invalid": Boolean(err) || undefined };
          return (
            <div key={f.name} className={wideCls}>
              <Field label={f.label} htmlFor={id} error={err} hint={f.hint} required={f.required}>
                {f.type === "select" ? (
                  <Select {...common} onChange={(e) => set(f.name, e.target.value)}>
                    {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </Select>
                ) : f.type === "textarea" ? (
                  <Textarea {...common} onChange={(e) => set(f.name, e.target.value)} placeholder={f.placeholder} />
                ) : (
                  <Input
                    {...common}
                    type={f.type === "money" ? "text" : f.type ?? "text"}
                    inputMode={f.type === "money" || f.type === "number" ? "decimal" : undefined}
                    step={f.step}
                    min={f.min}
                    max={f.max}
                    placeholder={f.placeholder}
                    onChange={(e) => set(f.name, e.target.value)}
                  />
                )}
              </Field>
            </div>
          );
        })}
      </div>
      {children?.(values, set)}
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-zinc-800 pt-3">
        {footerExtra}
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary" loading={busy}>{submitLabel}</Button>
      </div>
    </form>
  );
}

/** Today in the browser's local calendar as YYYY-MM-DD (used only to prefill date inputs). */
export function todayInput(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Drops empty strings so optional server fields are omitted rather than sent blank. */
export function clean(values: Values, numeric: string[] = []): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(values)) {
    if (typeof v === "string") {
      if (v.trim() === "") continue;
      out[k] = numeric.includes(k) ? Number(v) : v;
    } else out[k] = v;
  }
  return out;
}

/** Confirmation with a reason, for voids and reversals. */
export function ReasonModal(props: {
  open: boolean; onClose: () => void; title: string; description: ReactNode; confirmLabel: string; onConfirm: (reason: string, extra: string) => Promise<void>; extra?: { label: string; options: { value: string; label: string }[] };
}) {
  return (
    <Modal open={props.open} onClose={props.onClose} title={props.title} description={props.description}>
      <ReasonBody {...props} />
    </Modal>
  );
}

function ReasonBody({ onClose, confirmLabel, onConfirm, extra }: { onClose: () => void; confirmLabel: string; onConfirm: (reason: string, extra: string) => Promise<void>; extra?: { label: string; options: { value: string; label: string }[] } }) {
  const [reason, setReason] = useState("");
  const [pick, setPick] = useState(extra?.options[0]?.value ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try { await onConfirm(reason, pick); } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
      }}
    >
      {error && <Notice tone="negative">{error}</Notice>}
      {extra && (
        <Field label={extra.label} htmlFor="ba-reason-extra">
          <Select id="ba-reason-extra" value={pick} onChange={(e) => setPick(e.target.value)}>{extra.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>
        </Field>
      )}
      <Field label="Reason" htmlFor="ba-reason" required hint="Kept in the audit log.">
        <Textarea id="ba-reason" value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
      </Field>
      <div className="flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="danger" loading={busy} disabled={reason.trim().length < 3}>{confirmLabel}</Button>
      </div>
    </form>
  );
}
