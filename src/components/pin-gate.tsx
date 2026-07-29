"use client";

import { useEffect, useState, type FormEvent } from "react";
import Header from "@/components/header";

const ACCESS_PIN = "677778";
export const PIN_STORAGE_KEY = "framely-pin-unlocked";
const STORAGE_KEY = PIN_STORAGE_KEY;

export default function PinGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [checkedStorage, setCheckedStorage] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (window.localStorage.getItem(STORAGE_KEY) === "true") {
      setUnlocked(true);
    }
    setCheckedStorage(true);
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pin === ACCESS_PIN) {
      window.localStorage.setItem(STORAGE_KEY, "true");
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
      setPin("");
    }
  }

  if (!checkedStorage) {
    return null;
  }

  if (!unlocked) {
    return (
      <div className="flex flex-1 items-center justify-center px-6">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-xs rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center"
        >
          <h1 className="text-lg font-semibold text-zinc-50">Enter PIN</h1>
          <p className="mt-1 text-sm text-zinc-400">This app is locked. Enter the access PIN to continue.</p>
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            value={pin}
            onChange={(event) => {
              setPin(event.target.value);
              setError(false);
            }}
            className="mt-6 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2 text-center text-lg tracking-[0.3em] text-zinc-100 outline-none focus:border-zinc-500"
            placeholder="••••••"
          />
          {error && <p className="mt-2 text-sm text-red-400">Incorrect PIN. Try again.</p>}
          <button
            type="submit"
            className="mt-6 w-full rounded-full bg-zinc-100 px-6 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-white"
          >
            Unlock
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Header />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
