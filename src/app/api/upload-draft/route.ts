import { NextResponse } from "next/server";
import { DraftStoreError, newDraftId, putDraftFile, type DraftMeta } from "@/lib/draft-store";
import { safeFileName } from "@/lib/order-files";
import { MAX_FILE_BYTES } from "@/lib/pricing";

// Stages the customer's document on the server before checkout. See
// lib/draft-store.ts. Multipart, not JSON/base64: a 10 MB upload is ~13 MB as
// base64 and would be held in memory twice.

const MAX_TEXT_CHARS = 500_000;
const MODES = ["simple", "custom", "upload"] as const;

function isPdf(buf: Buffer): boolean {
  return buf.length > 8 && buf.subarray(0, 5).toString("latin1") === "%PDF-";
}

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Could not read the upload." }, { status: 400 });
  }

  let meta: Partial<DraftMeta> & { pdfSize?: number; originalSize?: number };
  try {
    meta = JSON.parse(String(form.get("meta") ?? ""));
  } catch {
    return NextResponse.json({ error: "Missing letter details." }, { status: 400 });
  }
  const mode = meta.mode;
  if (!mode || !MODES.includes(mode)) {
    return NextResponse.json({ error: "Unknown letter mode." }, { status: 400 });
  }

  const pdfPart = form.get("pdf");
  const originalPart = form.get("original");
  const pdf = pdfPart instanceof Blob && pdfPart.size > 0 ? Buffer.from(await pdfPart.arrayBuffer()) : null;
  const original = originalPart instanceof Blob && originalPart.size > 0 ? Buffer.from(await originalPart.arrayBuffer()) : null;

  // A body cut short in transit must not pass for the whole document: the client
  // states the sizes it sent, and they have to match what arrived.
  if (pdf && meta.pdfSize !== undefined && meta.pdfSize !== pdf.length) {
    return NextResponse.json({ error: "The upload was cut short. Please try again." }, { status: 400 });
  }
  if (original && meta.originalSize !== undefined && meta.originalSize !== original.length) {
    return NextResponse.json({ error: "The upload was cut short. Please try again." }, { status: 400 });
  }
  if ((pdf && pdf.length > MAX_FILE_BYTES) || (original && original.length > MAX_FILE_BYTES)) {
    return NextResponse.json({ error: `That file is too large (${MAX_FILE_BYTES / 1024 / 1024} MB maximum).` }, { status: 413 });
  }
  if (pdf && !isPdf(pdf)) {
    return NextResponse.json({ error: "That doesn't look like a valid PDF." }, { status: 400 });
  }

  const text = typeof meta.htmlContent === "string" ? meta.htmlContent : undefined;
  const letterData = meta.letterData && typeof meta.letterData === "object" ? meta.letterData : undefined;
  if (text && text.length > MAX_TEXT_CHARS) {
    return NextResponse.json({ error: "That letter is too large." }, { status: 413 });
  }

  // The document must exist: an upload needs its file; simple/custom need the
  // generated PDF or, failing that, the text we can rebuild one from.
  const hasText =
    mode === "simple" ? !!String(letterData?.body ?? "").trim() : mode === "custom" ? !!text?.trim() : false;
  if (mode === "upload" ? !(pdf || original) : !(pdf || hasText)) {
    return NextResponse.json({ error: "No document received. Please try again." }, { status: 400 });
  }

  const stored: DraftMeta = {
    mode,
    letterSize: typeof meta.letterSize === "string" ? meta.letterSize.slice(0, 20) : "standard",
    ...(mode === "simple" && letterData ? { letterData } : {}),
    ...(mode === "custom" && text ? { htmlContent: text } : {}),
  };

  const draftId = newDraftId();
  try {
    if (pdf) await putDraftFile(draftId, "letter.pdf", pdf, "application/pdf");
    if (original) {
      const name = `original-${safeFileName(form.get("originalName"), "letter")}`;
      await putDraftFile(draftId, name, original, "application/octet-stream");
      stored.originalName = name;
    }
    await putDraftFile(draftId, "letter.json", Buffer.from(JSON.stringify(stored)), "application/json");
  } catch (e) {
    console.error("upload-draft: could not stage document:", e instanceof DraftStoreError ? e.message : e);
    return NextResponse.json({ error: "We couldn't save your document. Please try again." }, { status: 503 });
  }

  return NextResponse.json({ draftId });
}
