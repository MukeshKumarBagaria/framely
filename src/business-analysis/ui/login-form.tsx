"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, api, fieldErrors } from "./api";
import { Button, Field, Input, Notice } from "./kit";

export function LoginForm({ next, reason }: { next: string; reason?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    try {
      await api("/auth/login", { method: "POST", body: { email, password } });
      router.replace(next);
      router.refresh();
    } catch (err) {
      setFields(fieldErrors(err));
      setError(err instanceof ApiError ? err.message : "Could not sign in.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {reason === "expired" && <Notice tone="warning">Your session has expired. Sign in again to continue.</Notice>}
      {reason === "signout" && <Notice tone="info">You have been signed out.</Notice>}
      {error && <Notice tone="negative">{error}</Notice>}
      <Field label="Email" htmlFor="ba-email" error={fields.email} required>
        <Input id="ba-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={Boolean(fields.email)} required autoFocus />
      </Field>
      <Field label="Password" htmlFor="ba-password" error={fields.password} required>
        <Input id="ba-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={Boolean(fields.password)} required />
      </Field>
      <Button type="submit" variant="primary" loading={busy} className="w-full">
        Sign in
      </Button>
    </form>
  );
}
