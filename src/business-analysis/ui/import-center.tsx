"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { FileSpreadsheet, FileText, Upload } from "lucide-react";
import { formatDateTimeIN } from "../domain/dates";
import { ApiError, errorMessage, uploadWithProgress } from "./api";
import { Badge, Button, Card, EmptyState, Notice, Select, type BadgeTone } from "./kit";
import { useToast } from "./overlay";

export type AdapterInfo = { reportType: string; label: string; description: string };
export type ImportListRow = { id: string; report_type: string; file_name: string; file_format: string; file_size_bytes: number; status: string; total_rows: number; valid_rows: number; invalid_rows: number; duplicate_rows: number; inserted_count: number; updated_count: number; unchanged_count: number; rejected_count: number; reverted_count: number; created_at: string; committed_at: string | null; rolled_back_at: string | null };

export const STATUS_TONE: Record<string, BadgeTone> = { staging: "neutral", parsed: "info", needs_review: "warning", committing: "info", committed: "positive", failed: "negative", rolling_back: "warning", rolled_back: "neutral", discarded: "neutral" };
export const STATUS_LABEL: Record<string, string> = { staging: "Staging", parsed: "Ready to review", needs_review: "Needs review", committing: "Partly imported", committed: "Imported", failed: "Failed", rolling_back: "Rolling back", rolled_back: "Rolled back", discarded: "Discarded" };
const ACCEPT = ".csv,.xlsx,.xls,.pdf,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const EXTENSIONS = ["csv", "xlsx", "xls", "pdf"];

const fmtSize = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

export function UploadPanel({ adapters, maxMb, presetType }: { adapters: AdapterInfo[]; maxMb: number; presetType?: string }) {
  const router = useRouter();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState(presetType ?? "");
  const [drag, setDrag] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [stage, setStage] = useState<"idle" | "uploading" | "parsing">("idle");
  const [error, setError] = useState<string | null>(null);

  const choose = (f: File | undefined | null) => {
    setError(null);
    if (!f) return;
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    if (!EXTENSIONS.includes(ext)) return setError("Only CSV, XLSX and PDF files are supported.");
    if (f.size === 0) return setError("That file is empty.");
    if (f.size > maxMb * 1024 * 1024) return setError(`That file is ${fmtSize(f.size)}; the limit is ${maxMb} MB.`);
    setFile(f);
  };

  const upload = async () => {
    if (!file) return;
    setError(null);
    setStage("uploading");
    setProgress(0);
    const form = new FormData();
    form.set("file", file);
    if (type) form.set("reportType", type);
    try {
      const res = await uploadWithProgress<{ id: string }>("/imports", form, (p) => {
        setProgress(p);
        if (p >= 1) setStage("parsing");
      });
      toast.notify("success", "File read. Review the rows before importing.");
      router.push(`/business-analysis/imports/${res.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : errorMessage(e));
      setStage("idle");
      setProgress(null);
    }
  };

  const busy = stage !== "idle";
  const ext = file?.name.split(".").pop()?.toUpperCase();

  return (
    <Card title="Import a report" subtitle={`CSV, XLSX or PDF, up to ${maxMb} MB. Nothing is saved to your books until you review and confirm.`}>
      <div className="flex flex-col gap-3">
        {error && <Notice tone="negative">{error}</Notice>}
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); choose(e.dataTransfer.files[0]); }}
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${drag ? "border-sky-500 bg-sky-950/20" : "border-zinc-700 bg-zinc-950/40"}`}
        >
          {file ? (
            <>
              {file.name.toLowerCase().endsWith(".pdf") ? <FileText className="h-8 w-8 text-zinc-400" aria-hidden /> : <FileSpreadsheet className="h-8 w-8 text-zinc-400" aria-hidden />}
              <p className="text-sm font-medium text-zinc-100">{file.name}</p>
              <p className="text-xs text-zinc-500">{ext} · {fmtSize(file.size)}</p>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-zinc-500" aria-hidden />
              <p className="text-sm text-zinc-300">Drag a report here, or</p>
            </>
          )}
          <input ref={input} type="file" accept={ACCEPT} className="sr-only" id="ba-file" onChange={(e) => choose(e.target.files?.[0])} disabled={busy} />
          <Button onClick={() => input.current?.click()} disabled={busy}>{file ? "Choose a different file" : "Choose file"}</Button>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-60 flex-col gap-1 text-[11px] text-zinc-500">
            Report type
            <Select value={type} onChange={(e) => setType(e.target.value)} disabled={busy} aria-label="Report type">
              <option value="">Detect automatically</option>
              {adapters.map((a) => <option key={a.reportType} value={a.reportType}>{a.label}</option>)}
            </Select>
          </label>
          <Button variant="primary" onClick={upload} disabled={!file || busy} loading={busy}>{stage === "uploading" ? "Uploading…" : stage === "parsing" ? "Reading file…" : "Upload & preview"}</Button>
        </div>
        {progress !== null && (
          <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label="Upload progress" className="h-1.5 overflow-hidden rounded bg-zinc-800">
            <div className={`h-full bg-sky-400 transition-all ${stage === "parsing" ? "animate-pulse" : ""}`} style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        )}
        {stage === "parsing" && <p className="text-xs text-zinc-500">Reading and checking every row. PDFs can take a little longer.</p>}
      </div>
    </Card>
  );
}

export function ImportHistory({ rows, total }: { rows: ImportListRow[]; total: number }) {
  return (
    <Card title="Import history" subtitle={`${total.toLocaleString("en-IN")} imports. Importing the same file twice never duplicates records.`}>
      {rows.length === 0 ? <EmptyState title="No imports yet">Upload a Meesho orders, payment or returns report to begin.</EmptyState> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-left text-[13px]">
            <thead className="text-[11px] uppercase text-zinc-400"><tr><th className="px-3 py-2">Uploaded</th><th className="px-3 py-2">File</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Rows</th><th className="px-3 py-2 text-right">New</th><th className="px-3 py-2 text-right">Updated</th><th className="px-3 py-2 text-right">Same</th><th className="px-3 py-2 text-right">Skipped</th><th /></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-zinc-800/70">
                  <td className="px-3 py-2 text-zinc-400">{formatDateTimeIN(r.created_at, "Asia/Kolkata")}</td>
                  <td className="max-w-64 truncate px-3 py-2" title={r.file_name}>{r.file_name} <span className="text-[11px] uppercase text-zinc-500">{r.file_format}</span></td>
                  <td className="px-3 py-2 text-zinc-300">{r.report_type.replace(/_/g, " ")}</td>
                  <td className="px-3 py-2"><Badge tone={STATUS_TONE[r.status] ?? "neutral"}>{STATUS_LABEL[r.status] ?? r.status}</Badge></td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.total_rows.toLocaleString("en-IN")}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.inserted_count}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.updated_count}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.unchanged_count}</td>
                  <td className="px-3 py-2 text-right tabular-nums" title="Invalid, duplicate or rejected rows">{r.invalid_rows + r.duplicate_rows + r.rejected_count}</td>
                  <td className="px-3 py-2 text-right"><Link href={`/business-analysis/imports/${r.id}`} className="text-sky-400 hover:underline">{r.status === "committed" || r.status === "rolled_back" || r.status === "discarded" ? "View" : "Review"}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
