import "./helpers/env.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { assertButtonsValid, assertListValid, clamp, fitRow, len, LIMITS } from "../src/whatsapp/limits.ts";
import { allDictionaries, LANGUAGE_NAMES, t } from "../src/i18n/index.ts";
import { LANGUAGES } from "../src/whatsapp/types.ts";

// §20.1: "Every list has ≤ 10 rows, every button set ≤ 3, every title ≤ 24/20
// chars **in all 7 languages**." This is the test that enforces it.

test("counts code points, not UTF-16 units", () => {
  assert.equal(len("✅ Perfect"), 9);
  assert.equal(len("🔄 Change photo"), 14);
  assert.equal("🔄 Change photo".length, 15); // UTF-16 would over-count and reject a legal title
  // A single emoji is one character to WhatsApp but two to String.length.
  assert.equal("✅".length, 1);
  assert.equal(len("👨‍👩‍👧"), 5); // ZWJ sequence — still well inside limits
});

test("clamp cuts on a code-point boundary", () => {
  assert.equal(clamp("hello", 10), "hello");
  assert.equal(len(clamp("a".repeat(30), 24)), 24);
  assert.ok(clamp("a".repeat(30), 24).endsWith("…"));
});

test("list rejects an 11th row across all sections", () => {
  const rows = Array.from({ length: 6 }, (_, i) => ({ id: `r${i}`, title: `Row ${i}` }));
  assert.throws(
    () =>
      assertListValid({
        button: "Choose",
        body: "pick one",
        sections: [
          { title: "A", rows },
          { title: "B", rows: rows.map((r) => ({ ...r, id: r.id + "b" })) },
        ],
      }),
    /exceeds the hard total of 10/
  );
});

test("list rejects an over-long row title and duplicate ids", () => {
  assert.throws(
    () =>
      assertListValid({
        button: "Choose",
        body: "pick",
        sections: [{ rows: [{ id: "a", title: "x".repeat(25) }] }],
      }),
    /row.title/
  );
  assert.throws(
    () =>
      assertListValid({
        button: "Choose",
        body: "pick",
        sections: [{ rows: [{ id: "a", title: "A" }, { id: "a", title: "B" }] }],
      }),
    /duplicate row id/
  );
});

test("buttons: max 3, titles ≤ 20", () => {
  assert.throws(
    () =>
      assertButtonsValid("body", [
        { id: "1", title: "a" },
        { id: "2", title: "b" },
        { id: "3", title: "c" },
        { id: "4", title: "d" },
      ]),
    /exceeds the max of 3/
  );
  assert.throws(() => assertButtonsValid("body", [{ id: "1", title: "x".repeat(21) }]), /button.title/);
});

test("the language list fits in one WhatsApp list, in every script", () => {
  const rows = LANGUAGES.map((lang) => ({
    id: `lang_${lang}`,
    title: LANGUAGE_NAMES[lang].native,
    description: LANGUAGE_NAMES[lang].english,
  }));
  assert.equal(rows.length, 7); // §8.2: 7 of the 10 rows, room to spare
  assertListValid({
    header: "Gift Mahal 🎁",
    body: "Welcome",
    button: "Select Language",
    sections: [{ title: "Languages", rows }],
  });
});

const OCCASION_KEYS = [
  "occ_birthday",
  "occ_anniversary",
  "occ_wedding",
  "occ_friendship",
  "occ_baby",
  "occ_retirement",
  "occ_kids",
  "occ_other",
] as const;

test("occasion row titles fit 24 chars in all 7 languages", () => {
  for (const lang of LANGUAGES) {
    const rows = OCCASION_KEYS.map((key) => ({ id: key, title: t(lang, key) }));
    // 8 occasions + slack, still inside the 10-row cap.
    assertListValid({
      body: t(lang, "choose_occasion"),
      button: t(lang, "occasion_button"),
      sections: [{ title: t(lang, "occasion_section"), rows: rows.slice(0, 10) }],
    });
  }
});

test("approval buttons fit 20 chars in all 7 languages", () => {
  for (const lang of LANGUAGES) {
    assertButtonsValid(t(lang, "preview_question"), [
      { id: "approve", title: t(lang, "btn_approve") },
      { id: "change_photo", title: t(lang, "btn_change_photo") },
      { id: "change_text", title: t(lang, "btn_change_text") },
    ]);
    assertButtonsValid(t(lang, "confirm_order_id", { id: "311778447421" }), [
      { id: "oid_ok:311778447421", title: t(lang, "btn_oid_ok") },
      { id: "oid_retype", title: t(lang, "btn_oid_retype") },
    ]);
    assertButtonsValid(t(lang, "low_dpi_warning", { slot: 3 }), [
      { id: "replace_3", title: t(lang, "btn_replace_photo", { slot: 3 }) },
      { id: "dpi_ok", title: t(lang, "btn_photo_fine") },
    ]);
  }
});

test("list action buttons fit 20 chars in all 7 languages", () => {
  for (const lang of LANGUAGES) {
    for (const key of ["occasion_button", "design_button", "which_photo_button"] as const) {
      assert.ok(
        len(t(lang, key)) <= LIMITS.listButton,
        `${lang}.${key} is ${len(t(lang, key))} chars: "${t(lang, key)}"`
      );
    }
  }
});

test("photo-slot rows fit an 8-photo collage exactly at the cap", () => {
  for (const lang of LANGUAGES) {
    const rows = Array.from({ length: 8 }, (_, i) => ({
      id: `slot_${i + 1}`,
      title: t(lang, "photo_row", { num: i + 1 }),
    }));
    assertListValid({
      body: t(lang, "which_photo"),
      button: t(lang, "which_photo_button"),
      sections: [{ rows }],
    });
  }
});

test("every dictionary has every key the English one has", () => {
  const dicts = allDictionaries();
  const keys = Object.keys(dicts.en);
  for (const lang of LANGUAGES) {
    const missing = keys.filter((k) => !(k in dicts[lang]));
    assert.deepEqual(missing, [], `${lang} is missing: ${missing.join(", ")}`);
  }
});

test("fitRow truncates catalog data rather than throwing", () => {
  const row = fitRow({ id: "design_x", title: "A very long design name that will not fit", description: "d" });
  assert.ok(len(row.title) <= LIMITS.rowTitle);
});
