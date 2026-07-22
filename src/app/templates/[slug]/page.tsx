import Link from "next/link";
import { notFound } from "next/navigation";
import { getTemplateBySlug, getTemplates } from "@/lib/template/registry";
import TemplateWorkspace from "@/components/template-workspace";

export function generateStaticParams() {
  return getTemplates().map((t) => ({ slug: t.manifest.slug }));
}

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const template = getTemplateBySlug(slug);
  if (!template) notFound();

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12">
      <Link href="/templates" className="text-sm text-zinc-500 hover:text-zinc-300">
        ← Template Library
      </Link>
      <div className="mt-6">
        <TemplateWorkspace doc={template.doc} productId={template.manifest.productId} />
      </div>
    </div>
  );
}
