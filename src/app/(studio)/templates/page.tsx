import Link from "next/link";
import { getPublishedTemplates } from "@/lib/template/registry";
import { products } from "@/lib/template/products";
import TemplateThumbnail from "@/components/template-thumbnail";

export const metadata = {
  title: "Template Library — Framely",
};

export default function TemplateLibraryPage() {
  const templates = getPublishedTemplates();

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Platform library</p>
      <h1 className="mt-1 text-3xl font-semibold text-zinc-50">Template Library</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-400">
        Every published design a customer can auto-preview their photos on (FR-MAT-1). The first one is
        live below — more designs land here as they&apos;re built.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
        {templates.map(({ manifest, doc }) => {
          const product = products[manifest.productId];
          return (
            <Link
              key={manifest.id}
              href={`/templates/${manifest.slug}`}
              className="group overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/60 transition-colors hover:border-zinc-600"
            >
              <TemplateThumbnail doc={doc} />
              <div className="p-4">
                <p className="font-medium text-zinc-100">{doc.meta.name}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {product?.name} · {doc.layers.filter((l) => l.type === "photoSlot").length} photos ·{" "}
                  {doc.meta.occasion.join(", ")}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
