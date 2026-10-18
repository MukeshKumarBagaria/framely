import type { ReactNode } from "react";
import { BarChart3 } from "lucide-react";

export function CenteredCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl">
        <div className="flex items-center gap-2 text-zinc-50">
          <BarChart3 className="h-5 w-5 text-sky-400" aria-hidden />
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>
        {children}
      </div>
    </div>
  );
}
