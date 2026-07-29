import Link from "next/link";
import LockButton from "@/components/lock-button";

export default function Header() {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-800 px-4">
      <Link href="/" className="text-sm font-semibold tracking-tight text-zinc-100">
        Framely
      </Link>
      <LockButton />
    </header>
  );
}
