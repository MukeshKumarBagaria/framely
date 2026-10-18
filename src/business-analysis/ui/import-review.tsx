"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Download, RotateCcw, Trash2 } from "lucide-react";
import { formatDateTimeIN } from "../domain/dates";
import type { ImportRecord, ImportRow } from "../server/services/import-service";
import { api, errorMessage } from "./api";
import { ExportMenu } from "./export-menu";
import { ReasonModal } from "./forms";
import { STATUS_LABEL, STATUS_TONE, type AdapterInfo } from "./import-center";
import { Badge, Button, Card, Checkbox, EmptyState, Notice, Select, Stat } from "./kit";
import { Modal, useToast } from "./overlay";
import { useUrlState } from "./use-url-state";

export type FullAdapterInfo = AdapterInfo & {
  fields: { key: string; label: string; required?: boolean; description?: string }[];
  optionDefs?: { key: string; label: string; choices: { value: string; label: string }[]; default: string }[];
};

const ROW_TONE: Record<string, "positive" | "negative" | "warning" | "neutral" | "info"> = { valid: "info", invalid: "negative", duplicate_in_file: "warning", duplicate_existing: "neutral", inserted: "positive", updated: "positive", unchanged: "neutral", rejected: "negative", reverted: "neutral", revert_skipped: "warning" };
const ROW_LABEL: Record<string, string> = { valid: "OK", invalid: "Invalid", duplicate_in_file: "Duplicate in file", duplicate_existing: "Already imported", inserted: "Added", updated: "Updated", unchanged: "No change", rejected: "Rejected", reverted: "Reversed", revert_skipped: "Left as is" };

export function ImportReview({ imp, rows, total, counts, page, pageSize, statusFilter, adapters, canAdmin }: {
  imp: ImportRecord; rows: ImportRow[]; total: number; counts: Record<string, number>; page: number; pageSize: number; statusFilter: string; adapters: FullAdapterInfo[]; canAdmin: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const { set, refresh } = useUrlState();
  const adapter = adapters.find((a) => a.reportType === imp.report_type)!;
  const editable = ["staging", "parsed", "needs_review", "failed"].includes(imp.status);
  const canCommit = editable || imp.status === "committing";
  const summary = imp.parse_summary;
  const [ack, setAck] = useState(false);
  const [mapOpen, setMapOpen] = useState(imp.parse_summary.unmappedRequired?.length > 0);
  const [fields, setFields] = useState<Record<string, string | null>>(imp.mapping.fields);
  const [options, setOptions] = useState<Record<string, string | number | boolean | null>>(imp.mapping.options ?? {});
  const [saveDefault, setSaveDefault] = useState(false);
  const [remapping, setRemapping] = useState(false);
  const [progress, setProgress] = useState<{ done: number; of: number; label: string } | null>(null);
  const [discarding, setDiscarding] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const remap = async (body: Record<string, unknown>, ok = "Mapping applied. Rows re-checked.") => {
    setRemapping(true);
    try {
      await api(`/imports/${imp.id}`, { method: "PATCH", body });
      toast.notify("success", ok);
      router.refresh();
    } catch (e) {
      toast.notify("error", errorMessage(e));
    } finally {
      setRemapping(false);
    }
  };

  // Commits in batches, each its own database transaction, so a failure leaves a
  // resumable import instead of a half-applied one.
  const commit = async () => {
    const totals = { inserted: 0, updated: 0, unchanged: 0, rejected: 0 };
    setProgress({ done: 0, of: imp.valid_rows, label: "Importing…" });
    let done = 0;
    try {
      for (let i = 0; i < 500; i++) {
        const r = await api<{ processed: number; remaining: number; inserted: number; updated: number; unchanged: number; rejected: number }>(`/imports/${imp.id}/confirm`, { method: "POST", body: { acknowledgeWarnings: ack, batchSize: 500 } });
        done += r.processed;
        for (const k of Object.keys(totals) as (keyof typeof totals)[]) totals[k] += r[k] ?? 0;
        setProgress({ done, of: Math.max(imp.valid_rows, done), label: "Importing…" });
        if (r.remaining === 0 || r.processed === 0) break;
      }
      setLastResult(`${totals.inserted} added, ${totals.updated} updated, ${totals.unchanged} unchanged, ${totals.rejected} rejected.`);
      toast.notify("success", "Import complete.");
    } catch (e) {
      toast.notify("error", `${errorMessage(e)} Rows already imported are kept; you can resume.`);
    } finally {
      setProgress(null);
      router.refresh();
    }
  };

  const rollback = async (reason: string) => {
    setProgress({ done: 0, of: imp.inserted_count + imp.updated_count, label: "Reversing…" });
    let done = 0;
    try {
      for (let i = 0; i < 500; i++) {
        const r = await api<{ processed: number; remaining: number }>(`/imports/${imp.id}/rollback`, { method: "POST", body: { reason } });
        done += r.processed;
        setProgress({ done, of: Math.max(imp.inserted_count + imp.updated_count, done), label: "Reversing…" });
        if (r.remaining === 0 || r.processed === 0) break;
      }
      toast.notify("success", "Import reversed. Unrelated records were not touched.");
      setRolling(false);
    } finally {
      setProgress(null);
      router.refresh();
    }
  };

  const filters: [string, string][] = [["", "All rows"], ["problems", "Problems & warnings"], ["valid", "OK"], ["invalid", "Invalid"], ["duplicate_in_file", "Duplicates in file"], ["duplicate_existing", "Already imported"], ["inserted", "Added"], ["updated", "Updated"], ["rejected", "Rejected"]];
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const mappingChanged = JSON.stringify(fields) !== JSON.stringify(imp.mapping.fields) || JSON.stringify(options) !== JSON.stringify(imp.mapping.options ?? {});

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={STATUS_TONE[imp.status] ?? "neutral"}>{STATUS_LABEL[imp.status] ?? imp.status}</Badge>
          <span className="text-xs text-zinc-500">{imp.file_format.toUpperCase()} · {(imp.file_size_bytes / 1024).toFixed(0)} KB · uploaded {formatDateTimeIN(imp.created_at, "Asia/Kolkata")}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportMenu report="import_errors" importId={imp.id} formats={["csv", "xlsx", "pdf"]} label="Error report" />
          {canAdmin && imp.storage_path && <a href={`/api/business-analysis/imports/${imp.id}/document`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3.5 text-sm font-medium text-zinc-100 hover:border-zinc-500"><Download className="h-4 w-4" aria-hidden /> Original file</a>}
        </div>
      </div>

      {summary.duplicateOf && <Notice tone="warning" title="This exact file was imported before">“{summary.duplicateOf.fileName}” was imported already. Its rows will be recognised as duplicates, so nothing is counted twice.</Notice>}
      {summary.storageWarning && <Notice tone="warning">{summary.storageWarning}</Notice>}
      {(summary.readerWarnings ?? []).map((w) => <Notice key={w} tone="warning">{w}</Notice>)}
      {imp.error_summary && <Notice tone="negative">{imp.error_summary}</Notice>}
      {summary.unmappedRequired?.length > 0 && <Notice tone="negative" title="Required columns are not mapped">Map {summary.unmappedRequired.map((k) => adapter.fields.find((f) => f.key === k)?.label ?? k).join(", ")} below, then apply.</Notice>}
      {imp.file_format === "pdf" && <Notice tone="warning" title="PDF extraction is approximate">Tables are rebuilt from text positions. Check the preview carefully; rows are only imported when you confirm.</Notice>}
      {imp.status === "rolled_back" && <Notice tone="info">Reversed {imp.rolled_back_at ? formatDateTimeIN(imp.rolled_back_at, "Asia/Kolkata") : ""}: {imp.rollback_reason}</Notice>}
      {lastResult && <Notice tone="positive" title="Import summary">{lastResult}</Notice>}

      <section className="grid grid-cols-2 gap-4 ba-surface rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:grid-cols-4 lg:grid-cols-8" aria-label="Import summary">
        <Stat label="Rows in file" value={imp.total_rows.toLocaleString("en-IN")} />
        <Stat label="Ready" value={imp.valid_rows.toLocaleString("en-IN")} tone="positive" />
        <Stat label="Invalid" value={imp.invalid_rows} tone={imp.invalid_rows ? "negative" : "neutral"} />
        <Stat label="Duplicates" value={imp.duplicate_rows} />
        <Stat label="Added" value={imp.inserted_count} />
        <Stat label="Updated" value={imp.updated_count} />
        <Stat label="Unchanged" value={imp.unchanged_count} />
        <Stat label="Rejected" value={imp.rejected_count} tone={imp.rejected_count ? "negative" : "neutral"} />
      </section>

      {canCommit && (
        <Card title="Confirm import" subtitle={`${imp.valid_rows.toLocaleString("en-IN")} rows will be written. Invalid rows and duplicates are skipped and listed in the error report.`}>
          <div className="flex flex-col gap-3">
            {(imp.status === "needs_review" || summary.warnings?.length > 0) && (
              <Checkbox checked={ack} onChange={setAck} label="I have reviewed the preview and the warnings and want to import the valid rows" hint={summary.warnings?.slice(0, 3).map((w) => w.message).join(" · ")} />
            )}
            {progress && (
              <div>
                <div role="progressbar" aria-valuemin={0} aria-valuemax={progress.of} aria-valuenow={progress.done} aria-label={progress.label} className="h-2 overflow-hidden rounded bg-zinc-800"><div className="h-full bg-emerald-400 transition-all" style={{ width: `${progress.of ? Math.min(100, (progress.done / progress.of) * 100) : 0}%` }} /></div>
                <p className="mt-1 text-xs text-zinc-500">{progress.label} {progress.done.toLocaleString("en-IN")} of {progress.of.toLocaleString("en-IN")}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={commit} loading={progress !== null} disabled={imp.valid_rows === 0 || (imp.status === "needs_review" && !ack) || (summary.unmappedRequired?.length ?? 0) > 0 || mappingChanged}>{imp.status === "committing" ? "Resume import" : `Import ${imp.valid_rows.toLocaleString("en-IN")} rows`}</Button>
              {editable && <Button variant="danger" onClick={() => setDiscarding(true)}><Trash2 className="h-4 w-4" aria-hidden /> Discard</Button>}
            </div>
            {mappingChanged && <p className="text-xs text-amber-400">Apply the changed mapping before importing.</p>}
          </div>
        </Card>
      )}

      {imp.status === "committed" && canAdmin && (
        <Card title="Reverse this import" subtitle="Undoes only what this file added or changed. Records from other imports and manual entries are left alone.">
          {progress && <div className="mb-2 text-xs text-zinc-500">{progress.label} {progress.done} of {progress.of}</div>}
          <Button variant="danger" onClick={() => setRolling(true)} loading={progress !== null}><RotateCcw className="h-4 w-4" aria-hidden /> Roll back import</Button>
        </Card>
      )}

      {editable && (
        <Card title="Column mapping" subtitle={`${adapter.label}: ${adapter.description}`} actions={<Button size="sm" onClick={() => setMapOpen((v) => !v)} aria-expanded={mapOpen}>{mapOpen ? "Hide" : "Review mapping"}</Button>}>
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs text-zinc-500">Report type
              <Select aria-label="Report type" value={imp.report_type} disabled={remapping} onChange={(e) => remap({ reportType: e.target.value }, "Report type changed. Rows re-checked.")} className="w-64">{adapters.map((a) => <option key={a.reportType} value={a.reportType}>{a.label}</option>)}</Select></label>
          </div>
          {mapOpen && (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {adapter.fields.map((f) => (
                  <label key={f.key} className="flex flex-col gap-1 text-xs text-zinc-400" title={f.description}>
                    <span>{f.label}{f.required && <span className="text-rose-400"> *</span>}</span>
                    <Select aria-label={f.label} value={fields[f.key] ?? ""} onChange={(e) => setFields((p) => ({ ...p, [f.key]: e.target.value || null }))}>
                      <option value="">— not in this file —</option>
                      {imp.mapping.headers.filter(Boolean).map((hd) => <option key={hd} value={hd}>{hd}</option>)}
                    </Select>
                  </label>
                ))}
              </div>
              {adapter.optionDefs?.map((o) => (
                <label key={o.key} className="flex max-w-md flex-col gap-1 text-xs text-zinc-400">{o.label}
                  <Select value={String(options[o.key] ?? o.default)} onChange={(e) => setOptions((p) => ({ ...p, [o.key]: e.target.value }))}>{o.choices.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</Select></label>
              ))}
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" loading={remapping} disabled={!mappingChanged} onClick={() => remap({ fields, options, saveAsDefault: saveDefault })}>Apply mapping</Button>
                {canAdmin && <Checkbox checked={saveDefault} onChange={setSaveDefault} label="Remember these column names for future files" />}
              </div>
            </div>
          )}
        </Card>
      )}

      <Card title="Preview" subtitle="Every row is shown with the result of validation. Raw values are kept exactly as in the file.">
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-zinc-500">Show
            <Select aria-label="Row filter" value={statusFilter} onChange={(e) => set({ status: e.target.value || null })} className="w-52">{filters.map(([v, l]) => <option key={v} value={v}>{l}{v && counts[v] ? ` (${counts[v]})` : ""}</option>)}</Select></label>
          <span className="pb-2 text-xs text-zinc-500">{total.toLocaleString("en-IN")} rows</span>
        </div>
        {rows.length === 0 ? <EmptyState title="No rows to show" /> : (
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full min-w-max text-left text-[12px]">
              <thead className="bg-zinc-900/80 text-xs font-medium text-zinc-500"><tr><th className="px-3 py-2">Row</th><th className="px-3 py-2">Result</th><th className="px-3 py-2">Understood as</th><th className="px-3 py-2">Issues</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-zinc-800/70 align-top">
                    <td className="px-3 py-2 tabular-nums text-zinc-500">{r.source_row_number}</td>
                    <td className="px-3 py-2"><Badge tone={ROW_TONE[r.status] ?? "neutral"}>{ROW_LABEL[r.status] ?? r.status}</Badge></td>
                    <td className="max-w-xl px-3 py-2 font-mono text-xs text-zinc-300">{summarise(r)}</td>
                    <td className="px-3 py-2">
                      {[...r.errors.map((e) => ({ ...e, bad: true })), ...r.warnings.map((e) => ({ ...e, bad: false }))].map((i, k) => <p key={k} className={i.bad ? "text-rose-300" : "text-amber-300"}>{i.field ? `${i.field}: ` : ""}{i.message}</p>)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {total > pageSize && (
          <div className="mt-2 flex items-center justify-between text-xs text-zinc-400">
            <span>Page {page} of {pages}</span>
            <span className="flex gap-1"><Button size="sm" disabled={page <= 1} onClick={() => set({ page: String(page - 1) }, { resetPage: false })}>Previous</Button><Button size="sm" disabled={page >= pages} onClick={() => set({ page: String(page + 1) }, { resetPage: false })}>Next</Button></span>
          </div>
        )}
      </Card>

      <Modal open={discarding} onClose={() => setDiscarding(false)} title="Discard this import?" description="The staged rows are deleted. Nothing was written to your books." footer={<><Button onClick={() => setDiscarding(false)}>Keep</Button><Button variant="danger" onClick={async () => { try { await api(`/imports/${imp.id}`, { method: "DELETE" }); toast.notify("success", "Import discarded."); router.push("/business-analysis/imports"); } catch (e) { toast.notify("error", errorMessage(e)); } }}>Discard</Button></>}>{null}</Modal>
      <ReasonModal open={rolling} onClose={() => setRolling(false)} title="Roll back this import?" description="Everything this file added or changed is reversed. Later edits to those records are left in place and listed as skipped." confirmLabel="Roll back" onConfirm={async (reason) => { await rollback(reason); }} />
      <p className="text-xs text-zinc-600"><Link href="/business-analysis/imports" className="hover:text-zinc-300">← All imports</Link> · refresh <button type="button" onClick={refresh} className="underline">status</button></p>
    </div>
  );
}

function summarise(r: ImportRow): string {
  const n = r.normalized;
  if (n && typeof n === "object") {
    const entries = Object.entries(n as Record<string, unknown>).filter(([, v]) => v !== null && v !== "" && typeof v !== "object").slice(0, 8);
    if (entries.length) return entries.map(([k, v]) => `${k}=${String(v)}`).join("  ");
  }
  return Object.entries(r.raw).filter(([, v]) => v !== null && v !== "").slice(0, 6).map(([k, v]) => `${k}=${String(v)}`).join("  ");
}
