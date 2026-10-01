// Keeps a copy of what a customer uploaded, on disk, BEFORE it is emailed.
//
// The upload used to exist in exactly one place: an email attachment. The
// attachment is skipped when it is over the size cap (and the order row only
// records `has_pdf_attachment`), so a large upload could be lost with no error
// and nothing to recover it from (order fcaf13e2, 2026-09-29).
//
// Files go under CANNER_DATA_DIR (Canner's persistent per-project directory:
// outside the deploy bundle, so deploys don't touch it, counted in the storage
// pool, included in Canner's nightly backups):
//   $CANNER_DATA_DIR/orders/<stripe session id | order id>/<file>
// Never throws: a full disk or a missing directory must not stop the order
// email going out. Callers get back what was saved, and the failure is logged.

import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export type OrderFileInput = { name: string; base64: string };
export type SavedOrderFiles = { key: string; dir: string | null; files: string[] };

const SAFE_KEY = /^[A-Za-z0-9_-]{8,200}$/;

/** A file name that can't leave its directory: no separators, no leading dots, plain characters. */
export function safeFileName(name: unknown, fallback: string): string {
  const last = typeof name === "string" ? (name.split(/[\\/]/).pop() ?? "") : "";
  const cleaned = last
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/^[._]+/, "")
    .slice(0, 100);
  return cleaned || fallback;
}

export async function saveOrderFiles(key: string, inputs: OrderFileInput[]): Promise<SavedOrderFiles> {
  const result: SavedOrderFiles = { key, dir: null, files: [] };
  const root = process.env.CANNER_DATA_DIR;
  if (!root || !path.isAbsolute(root)) {
    console.warn("order-files: CANNER_DATA_DIR is not set; uploads are not being saved");
    return result;
  }
  if (!SAFE_KEY.test(key)) {
    console.error("order-files: refusing unsafe key", JSON.stringify(key).slice(0, 80));
    return result;
  }
  const dir = path.join(root, "orders", key);
  try {
    await mkdir(dir, { recursive: true, mode: 0o700 });
  } catch (e) {
    console.error("order-files: could not create", dir, e);
    return result;
  }
  result.dir = dir;
  const used = new Set<string>();
  for (const input of inputs) {
    try {
      const data = Buffer.from(input.base64, "base64");
      if (data.length === 0) continue;
      let name = safeFileName(input.name, "file");
      for (let n = 2; used.has(name); n++) name = `${n}-${safeFileName(input.name, "file")}`;
      used.add(name);
      // Write beside, then rename: a crash can't leave a half-written file under the real name.
      const tmp = path.join(dir, `.${name}.tmp`);
      await writeFile(tmp, data, { mode: 0o600 });
      await rename(tmp, path.join(dir, name));
      result.files.push(name);
    } catch (e) {
      console.error("order-files: could not save", input.name, e);
    }
  }
  return result;
}
