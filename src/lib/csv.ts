// CSV for the order and invoice exports. Cells that start with = + - or @ are
// prefixed so a spreadsheet does not run them as formulas (CSV injection): a
// recipient name is attacker-controlled text that ends up in this file.

export function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  // Postgres returns timestamps as Date objects: write them as plain ISO text, not as a JSON string.
  let s = v instanceof Date ? v.toISOString() : typeof v === "string" ? v : typeof v === "object" ? JSON.stringify(v) : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export function csvResponse(filename: string, body: string): Response {
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename.replace(/[^\w.-]/g, "_")}"`,
      "cache-control": "no-store",
    },
  });
}

export const dollars = (cents: number | null | undefined) => (cents == null ? "" : (cents / 100).toFixed(2));
