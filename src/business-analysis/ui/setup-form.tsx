"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, errorMessage, fieldErrors } from "./api";
import { Button, Checkbox, Field, Input, Notice } from "./kit";

/** First run: creates the business with the signed-in user as owner. */
export function SetupForm({ email }: { email: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [gst, setGst] = useState(false);
  const [rate, setRate] = useState("12");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/bootstrap", { method: "POST", body: { name, timezone: "Asia/Kolkata", gstRegistered: gst, defaultGstRate: gst ? Number(rate) : null } });
      router.refresh();
    } catch (err) {
      setFields(fieldErrors(err));
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <p className="text-sm text-zinc-400">
        Signed in as <span className="text-zinc-200">{email}</span>. This creates your business workspace and makes you its owner.
      </p>
      {error && <Notice tone="negative">{error}</Notice>}
      <Field label="Business name" htmlFor="ba-biz-name" error={fields.name} required>
        <Input id="ba-biz-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Framely" required autoFocus />
      </Field>
      <Checkbox label="Registered for GST" checked={gst} onChange={setGst} hint="Decides whether sale prices are treated as GST-inclusive. You can change this later in Settings." />
      {gst && (
        <Field label="Default GST rate on photo frames (%)" htmlFor="ba-gst-rate" error={fields.defaultGstRate}>
          <Input id="ba-gst-rate" type="number" min={0} max={28} step="0.5" value={rate} onChange={(e) => setRate(e.target.value)} />
        </Field>
      )}
      <Button type="submit" variant="primary" loading={busy}>
        Create business
      </Button>
    </form>
  );
}
