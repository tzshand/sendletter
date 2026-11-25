// Server-side staging of the customer's document, in the Canner project files
// store, BEFORE any payment is taken.
//
// Why this exists: the document used to travel from the customer's browser
// (IndexedDB) through the Stripe redirect and back to /success, which posted it
// to the server. If that browser draft was empty or failed to save, the order
// completed anyway with no document at all (Dmytro Afanasiev, 2026-11-24).
// Now the document is uploaded and verified first; checkout is refused without
// it, and confirmation reads it back from here instead of trusting the browser.
//
//   <project>/drafts/<draftId>/letter.pdf        what we print
//   <project>/drafts/<draftId>/original-<name>   docx etc. as uploaded (optional)
//   <project>/drafts/<draftId>/letter.json       letter text + metadata
//
// Auth is CANNER_FILES_TOKEN (a Canner API token); the key is always built
// under the project prefix here, so callers can't name other paths.

import { randomBytes } from "node:crypto";

const API = "https://api.canner.ca";
const SLUG = "sendletter";

export class DraftStoreError extends Error {}

const DRAFT_ID = /^[A-Za-z0-9_-]{20,64}$/;
const FILE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;

export const newDraftId = () => randomBytes(18).toString("base64url");
export const isDraftId = (s: unknown): s is string => typeof s === "string" && DRAFT_ID.test(s);

function token(): string {
  const t = process.env.CANNER_FILES_TOKEN;
  if (!t) throw new DraftStoreError("CANNER_FILES_TOKEN is not set");
  return t;
}

function keyOf(draftId: string, name?: string): string {
  if (!isDraftId(draftId)) throw new DraftStoreError("invalid draft id");
  if (name !== undefined && !FILE_NAME.test(name)) throw new DraftStoreError("invalid file name");
  return `${SLUG}/drafts/${draftId}/${name ?? ""}`;
}

async function call(path: string, init: RequestInit = {}): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token()}`, Accept: "application/json", ...(init.headers ?? {}) },
      signal: AbortSignal.timeout(30_000),
    });
  } catch (e) {
    if (e instanceof DraftStoreError) throw e;
    throw new DraftStoreError(`files store unreachable: ${e instanceof Error ? e.message : String(e)}`);
  }
  return res;
}

export async function putDraftFile(draftId: string, name: string, data: Buffer, type: string): Promise<void> {
  if (data.length === 0) throw new DraftStoreError(`${name} is empty`);
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(data)], { type }), name);
  const res = await call(`/storage/objects?key=${encodeURIComponent(keyOf(draftId, name))}`, { method: "POST", body: form });
  if (!res.ok) throw new DraftStoreError(`could not store ${name}: ${res.status} ${(await res.text().catch(() => "")).slice(0, 200)}`);
}

/** Files staged for a draft, with sizes. Empty when none (or the draft doesn't exist). */
export async function listDraftFiles(draftId: string): Promise<{ name: string; size: number }[]> {
  const prefix = keyOf(draftId);
  const res = await call(`/storage/objects?prefix=${encodeURIComponent(prefix)}`);
  if (!res.ok) throw new DraftStoreError(`could not list draft: ${res.status}`);
  const body = (await res.json()) as { objects?: { key: string; size: number }[] };
  return (body.objects ?? [])
    .filter((o) => o.key.startsWith(prefix))
    .map((o) => ({ name: o.key.slice(prefix.length), size: o.size }));
}

/** One staged file, or null if it isn't there. */
export async function getDraftFile(draftId: string, name: string): Promise<Buffer | null> {
  const res = await call(`/storage/objects/download?key=${encodeURIComponent(keyOf(draftId, name))}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new DraftStoreError(`could not read ${name}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export type DraftMeta = {
  mode: "simple" | "custom" | "upload";
  letterSize: string;
  letterData?: Record<string, unknown>;
  htmlContent?: string; // custom-mode HTML only
  originalName?: string; // name of the original-<name> file, when present
};

export type StagedDraft = {
  pdf: Buffer | null;
  original: { name: string; data: Buffer } | null;
  meta: DraftMeta | null;
};

/** Everything staged for a draft. Throws DraftStoreError if the store can't be read. */
export async function loadDraft(draftId: string): Promise<StagedDraft> {
  const files = await listDraftFiles(draftId);
  const has = (n: string) => files.some((f) => f.name === n && f.size > 0);
  const pdf = has("letter.pdf") ? await getDraftFile(draftId, "letter.pdf") : null;
  const origName = files.find((f) => f.name.startsWith("original-") && f.size > 0)?.name;
  const original = origName ? await getDraftFile(draftId, origName) : null;
  let meta: DraftMeta | null = null;
  if (has("letter.json")) {
    const raw = await getDraftFile(draftId, "letter.json");
    if (raw) {
      try { meta = JSON.parse(raw.toString("utf8")) as DraftMeta; } catch { meta = null; }
    }
  }
  return {
    pdf: pdf && pdf.length > 0 ? pdf : null,
    original: origName && original ? { name: origName, data: original } : null,
    meta,
  };
}

/** Whether a staged draft is a complete document for its mode. */
export function isCompleteDraft(d: StagedDraft): boolean {
  const mode = d.meta?.mode;
  if (mode === "upload") return !!(d.pdf || d.original);
  if (mode === "simple") return !!(d.pdf || (d.meta?.letterData && String(d.meta.letterData.body ?? "").trim()));
  if (mode === "custom") return !!(d.pdf || (d.meta?.htmlContent && d.meta.htmlContent.trim()));
  return false;
}
