"use client";

import dynamic from "next/dynamic";
import type { TemplateDoc } from "@/lib/template/schema";

const TemplateCanvas = dynamic(() => import("@/components/template-canvas"), {
  ssr: false,
  loading: () => <div className="aspect-[2/3] w-full animate-pulse rounded-md bg-zinc-800" />,
});

export default function TemplateThumbnail({ doc, width = 220 }: { doc: TemplateDoc; width?: number }) {
  const fieldValues = Object.fromEntries(doc.inputs.fields.map((f) => [f.key, f.default]));
  return <TemplateCanvas doc={doc} fieldValues={fieldValues} displayWidth={width} />;
}
