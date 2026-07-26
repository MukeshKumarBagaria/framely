// Guide §16. One JSON file per language, `t()` with {{var}} interpolation and
// an English fallback for any key a translation hasn't caught up with.
//
// §16.1 is the shipping rule: launch Hindi + English, add the rest as a data
// change. All seven files exist, but ENABLED_LANGS decides what the language
// menu actually offers — flip it to all seven once a native speaker has read
// them (mr/gu/te/ta/kn were machine-drafted and are marked as such in README).
import en from "./strings/en.json" with { type: "json" };
import hi from "./strings/hi.json" with { type: "json" };
import mr from "./strings/mr.json" with { type: "json" };
import gu from "./strings/gu.json" with { type: "json" };
import te from "./strings/te.json" with { type: "json" };
import ta from "./strings/ta.json" with { type: "json" };
import kn from "./strings/kn.json" with { type: "json" };
import { LANGUAGES, type Lang } from "../whatsapp/types.ts";

export type StringKey = keyof typeof en;

const dictionaries: Record<Lang, Partial<Record<StringKey, string>>> = { en, hi, mr, gu, te, ta, kn };

/** Native names for the §8 step-1 language list — never translated. */
export const LANGUAGE_NAMES: Record<Lang, { native: string; english: string }> = {
  hi: { native: "हिन्दी", english: "Hindi" },
  en: { native: "English", english: "English" },
  mr: { native: "मराठी", english: "Marathi" },
  gu: { native: "ગુજરાતી", english: "Gujarati" },
  te: { native: "తెలుగు", english: "Telugu" },
  ta: { native: "தமிழ்", english: "Tamil" },
  kn: { native: "ಕನ್ನಡ", english: "Kannada" },
};

function parseEnabled(): Lang[] {
  const raw = process.env.ENABLED_LANGS?.trim();
  if (!raw) return ["hi", "en"]; // §16.1
  if (raw === "all") return [...LANGUAGES];
  const picked = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is Lang => (LANGUAGES as readonly string[]).includes(s));
  return picked.length ? picked : ["hi", "en"];
}

export const ENABLED_LANGS: Lang[] = parseEnabled();

export function isLang(value: unknown): value is Lang {
  return typeof value === "string" && (LANGUAGES as readonly string[]).includes(value);
}

export function interpolate(template: string, vars: Record<string, string | number> = {}): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match
  );
}

/** §16.2 — `t(session, key, vars)`, with the session narrowed to just its lang. */
export function t(
  langOrSession: Lang | { lang?: string | null },
  key: StringKey,
  vars: Record<string, string | number> = {}
): string {
  const lang =
    typeof langOrSession === "string"
      ? langOrSession
      : isLang(langOrSession?.lang)
        ? langOrSession.lang
        : "en";
  const dict = dictionaries[lang] ?? en;
  const template = dict[key] ?? en[key] ?? key;
  return interpolate(template, vars);
}

/**
 * The very first message is sent before we know the customer's language, so it
 * is bilingual by design (§8 step 1) and carries the consent line (§7.1).
 */
export const WELCOME_BILINGUAL =
  "Welcome to Gift Mahal! We make personalised photo frames. 🖼️\n\n" +
  "Gift Mahal में आपका स्वागत है! अपनी भाषा चुनें।\n\n" +
  "By continuing you agree that your photos will be used only to make your product.";

export const WELCOME_HEADER = "Gift Mahal 🎁";

/** Every dictionary, for the "all languages fit the row limits" test (§20.1). */
export function allDictionaries(): Record<Lang, Partial<Record<StringKey, string>>> {
  return dictionaries;
}
