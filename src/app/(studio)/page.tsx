import Link from "next/link";
import { getPublishedTemplates } from "@/lib/template/registry";
import TemplateThumbnail from "@/components/template-thumbnail";

export default function Home() {
  const first = getPublishedTemplates()[0];

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-950 px-6 py-20 text-center">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Photo Personalization SaaS</p>
      <h1 className="mt-3 max-w-xl text-4xl font-semibold tracking-tight text-zinc-50">
        Upload photos. See them on every design. Instantly.
      </h1>
      <p className="mt-4 max-w-lg text-zinc-400">
        Framely&apos;s first template is live — a portrait frame, ready for its 8 photos.
      </p>
      <Link
        href="/templates"
        className="mt-8 inline-flex items-center justify-center rounded-full bg-zinc-100 px-6 py-3 text-sm font-medium text-zinc-900 transition-colors hover:bg-white"
      >
        Open the Template Library
      </Link>

      {first && (
        <Link href={`/templates/${first.manifest.slug}`} className="mt-14 w-full max-w-xs">
          <TemplateThumbnail doc={first.doc} width={320} />
          <p className="mt-3 text-sm text-zinc-400">{first.doc.meta.name} — try it →</p>
        </Link>
      )}
    </div>
  );
}
