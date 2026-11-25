// Run: node --experimental-strip-types --test tests/*.test.mts
import test from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { quote } from "../src/lib/pricing.ts";
import { buildPrintFiles, countPdfPages } from "../src/lib/print-pdf.ts";
import { parseTo, parseFrom, fromLines, toLines, addressMetadata, fromLinesFromMetadata, AddressError } from "../src/lib/address.ts";

async function letterPdf(pages: number): Promise<Uint8Array> {
  const d = await PDFDocument.create();
  const f = await d.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pages; i++) d.addPage([612, 792]).drawText(`Page ${i}`, { x: 72, y: 700, size: 18, font: f });
  return d.save();
}

const to = ["Dmytro Afanasiev", "91 Montclair Ave", "Toronto ON  M5P 0B1"];
const from = ["Ana García", "12 Rue Saint-Denis", "Montréal QC  H2X 3K8"];

test("counts a PDF's pages", async () => {
  assert.equal(await countPdfPages(await letterPdf(9)), 9);
});

test("#10: one address page, then the letter, per mailing", async () => {
  const bytes = await letterPdf(5);
  const q = quote({ pages: 5, size: "standard", colour: true, duplex: true, channel: "web" });
  const files = await buildPrintFiles({ letterPdf: bytes, size: "standard", mailings: q.mailings, from, to });
  assert.equal(files.length, 1);
  assert.equal(await countPdfPages(files[0].bytes), 6); // address page + 5
  assert.equal(files[0].name, "print.pdf");
});

test("a split letter: every page lands in exactly one mailing, each with its address page", async () => {
  const bytes = await letterPdf(14);
  const q = quote({ pages: 14, size: "standard", colour: false, duplex: true, channel: "web" });
  assert.equal(q.mailings.length, 2);
  const files = await buildPrintFiles({ letterPdf: bytes, size: "standard", mailings: q.mailings, from, to });
  assert.deepEqual(files.map((f) => f.name), ["print-1-of-2.pdf", "print-2-of-2.pdf"]);
  let letterPages = 0;
  for (const f of files) letterPages += (await countPdfPages(f.bytes)) - 1;
  assert.equal(letterPages, 14);
});

test("flat mailers are hand-addressed: no address page", async () => {
  const bytes = await letterPdf(7);
  const q = quote({ pages: 7, size: "large", colour: true, duplex: true, channel: "web" });
  const files = await buildPrintFiles({ letterPdf: bytes, size: "large", mailings: q.mailings, from, to });
  assert.equal(await countPdfPages(files[0].bytes), 7);
});

test("names in other scripts don't fail the order", async () => {
  const bytes = await letterPdf(1);
  const q = quote({ pages: 1, size: "standard", colour: true, duplex: true, channel: "web" });
  const files = await buildPrintFiles({ letterPdf: bytes, size: "standard", mailings: q.mailings, from: ["山田 太郎"], to: ["Ana"] });
  assert.equal(files.length, 1);
});

const goodTo = { name: "A B", line1: "1 Main St", city: "Toronto", province: "on", postalCode: "m5v1a1" };

test("the recipient must be in Canada", () => {
  assert.deepEqual(toLines(parseTo(goodTo)), ["A B", "1 Main St", "Toronto ON  M5V1A1"]);
  assert.throws(() => parseTo({ ...goodTo, country: "US" }), AddressError);
  assert.throws(() => parseTo({ ...goodTo, postalCode: "12345" }), AddressError);
  assert.throws(() => parseTo({ ...goodTo, city: "" }), AddressError);
});

test("free-form return address: kept as typed, blank lines dropped, capped at 6 lines", () => {
  const f = parseFrom({ freeform: true, lines: ["Ana García", "", "Calle 17 #4-77", "Bogotá", "Colombia", "a", "b", "c"] });
  assert.equal(f.kind, "freeform");
  assert.deepEqual(fromLines(f), ["Ana García", "Calle 17 #4-77", "Bogotá", "Colombia", "a", "b"]);
  assert.throws(() => parseFrom({ freeform: true, lines: ["", "  "] }), AddressError);
});

test("addresses survive the trip through Stripe metadata", () => {
  const free = parseFrom({ freeform: true, lines: ["Ana García", "Calle 17 #4-77", "Colombia"] });
  const m = addressMetadata(free, parseTo(goodTo));
  assert.deepEqual(fromLinesFromMetadata(m), ["Ana García", "Calle 17 #4-77", "Colombia"]);
  for (const v of Object.values(m)) assert.ok(v.length <= 500, "Stripe metadata values are limited to 500 characters");
  const structured = parseFrom({ name: "J D", line1: "2 B St", city: "Ottawa", province: "ON", postalCode: "K1A 0B1" });
  assert.deepEqual(fromLinesFromMetadata(addressMetadata(structured, parseTo(goodTo))), ["J D", "2 B St", "Ottawa ON  K1A 0B1"]);
});
