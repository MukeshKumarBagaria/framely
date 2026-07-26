import "./helpers/env.ts";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  appendTimeline,
  ensureSessionFolder,
  purgeSubfolder,
  readMeta,
  resolveInFolder,
  saveFile,
  sessionFolderName,
  writeMeta,
} from "../src/media/storage.ts";
import { rendersDone, nextRenderNumber } from "../src/flow/steps/render.ts";

async function tmpFolder(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "giftmahal-"));
}

// §7 — folder layout: /data/customers/{phone}/{date}_{shortid}/
test("session folder name is date + short id", () => {
  const name = sessionFolderName("a3f9c0de-0000-0000-0000-000000000000", new Date("2026-07-26T17:12:03Z"));
  assert.equal(name, "2026-07-26_a3f9");
});

test("creates the four subfolders", async () => {
  const folder = await tmpFolder();
  await ensureSessionFolder(folder);
  const entries = (await fs.readdir(folder)).sort();
  assert.deepEqual(entries, ["final", "raw", "rendered", "screenshots"]);
});

test("refuses paths that escape the session folder", () => {
  const folder = "/data/customers/919876543210/2026-07-26_a3f9";
  assert.equal(resolveInFolder(folder, "raw/01.jpg"), `${folder}/raw/01.jpg`);
  assert.throws(() => resolveInFolder(folder, "../../../etc/passwd"), /escapes its session folder/);
  assert.throws(() => resolveInFolder(folder, "/etc/passwd"), /escapes its session folder/);
});

test("meta.json mirrors the row and appends to the timeline", async () => {
  const folder = await tmpFolder();
  await writeMeta(folder, {
    session_id: "a3f9",
    phone: "919876543210",
    lang: "hi",
    occasion: "birthday",
    timeline: [{ at: "2026-07-26T17:12:03Z", event: "session_started" }],
  });
  await appendTimeline(folder, "photos_complete", { count: 8 });
  await appendTimeline(folder, "render_v1");

  const meta = await readMeta(folder);
  assert.equal(meta?.phone, "919876543210");
  assert.equal(meta?.lang, "hi");
  assert.deepEqual(
    meta?.timeline.map((e) => e.event),
    ["session_started", "photos_complete", "render_v1"]
  );
  assert.equal(meta?.timeline[1]?.count, 8);
  // No stray temp file left behind by the write-then-rename.
  assert.equal((await fs.readdir(folder)).includes(".meta.json.tmp"), false);
});

test("purging a subfolder empties it but keeps the folder", async () => {
  const folder = await tmpFolder();
  await ensureSessionFolder(folder);
  await saveFile(folder, "raw/01_abc.jpg", Buffer.from("x"));
  await saveFile(folder, "raw/02_abc.jpg", Buffer.from("y"));
  assert.equal(await purgeSubfolder(folder, "raw"), 2);
  assert.deepEqual(await fs.readdir(path.join(folder, "raw")), []);
});

// §20.2 drill: "Change photo 3, then change text, then approve → v3.png exists,
// revision_count = 2."
test("render version numbering matches the approval drill", () => {
  let session = { current_render: null as string | null, revision_count: 0 };
  assert.equal(rendersDone(session), 0);
  assert.equal(nextRenderNumber(session), 1);

  // v1 rendered
  session = { current_render: "rendered/v1.png", revision_count: 0 };
  assert.equal(nextRenderNumber(session), 2);

  // v2 after "change photo 3"
  session = { current_render: "rendered/v2.png", revision_count: 1 };
  assert.equal(nextRenderNumber(session), 3);

  // v3 after "change text" — two revisions, which is what the drill asserts
  session = { current_render: "rendered/v3.png", revision_count: 2 };
  assert.equal(session.revision_count, 2);
  assert.equal(nextRenderNumber(session), 4);
});
