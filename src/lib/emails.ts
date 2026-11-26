// Customer emails, in sendletter's look: coral (#F0513C) accent, the envelope
// logo at the top. Inline styles and tables only: that is what mail clients render.

import { escapeHtml as esc } from "@/lib/sanitize";
import { VOLUME, volumeBaseCents } from "@/lib/volume-curve";

const SITE = "https://sendletter.app";
const BRAND = "#F0513C";
export const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

function layout(preheader: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f4f4f5;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1f2937;">
<tr><td style="padding:24px 32px 14px 32px;"><a href="${SITE}" style="text-decoration:none;"><img src="${SITE}/logo-240.png" width="44" height="44" alt="" style="vertical-align:middle;border-radius:10px;border:0;"> <span style="font-size:22px;font-weight:700;color:#111827;vertical-align:middle;margin-left:8px;">sendletter</span></a></td></tr>
<tr><td style="height:3px;background:${BRAND};font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:24px 32px 28px 32px;font-size:15px;line-height:1.55;">${body}</td></tr>
<tr><td style="padding:16px 32px 24px 32px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;line-height:1.5;">sendletter &middot; print and mail a letter anywhere in Canada<br><a href="${SITE}" style="color:#6b7280;">sendletter.app</a> &middot; <a href="mailto:support@sendletter.app" style="color:#6b7280;">support@sendletter.app</a></td></tr>
</table></td></tr></table></body></html>`;
}

const button = (href: string, label: string) =>
  `<p style="margin:22px 0;"><a href="${esc(href)}" style="background:${BRAND};color:#ffffff;text-decoration:none;font-weight:600;padding:11px 20px;border-radius:8px;display:inline-block;">${esc(label)}</a></p>`;

export type InvoiceEmailData = {
  id: string;
  number: string;
  date: string;
  kind: "first_order" | "monthly";
  letters: number;
  totalCents: number;
  lines: { description: string; amount_cents: number }[];
};

export function invoiceEmail(inv: InvoiceEmailData): { subject: string; html: string } {
  const url = `${SITE}/account/invoices/${inv.id}`;
  const rows = inv.lines
    .slice(0, 25)
    .map((l) => `<tr><td style="padding:7px 12px 7px 0;border-bottom:1px solid #f3f4f6;font-size:14px;">${esc(l.description)}</td><td style="padding:7px 0;border-bottom:1px solid #f3f4f6;font-size:14px;text-align:right;white-space:nowrap;">${money(l.amount_cents)}</td></tr>`)
    .join("");
  const more = inv.lines.length > 25 ? `<p style="font-size:13px;color:#6b7280;">...and ${inv.lines.length - 25} more letters. The full list is on the invoice page and in the attached PDF.</p>` : "";
  const what = inv.kind === "first_order" ? "your first letter" : `${inv.letters} letter${inv.letters === 1 ? "" : "s"} you sent through the API`;
  const body = `<h1 style="font-size:20px;margin:0 0 6px 0;">Invoice ${esc(inv.number)}</h1>
<p style="margin:0 0 16px 0;color:#6b7280;">${esc(inv.date)} &middot; <strong style="color:#166534;">Paid</strong></p>
<p>We charged your card on file ${money(inv.totalCents)} CAD for ${what}. This is your receipt; nothing more is owed.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0;">${rows}<tr><td style="padding:12px 12px 0 0;font-weight:700;text-align:right;">Total</td><td style="padding:12px 0 0 0;font-weight:700;text-align:right;white-space:nowrap;">${money(inv.totalCents)}</td></tr></table>
${more}
${button(url, "View invoice")}
<p style="font-size:13px;color:#6b7280;">The PDF is attached. Postage is included at cost and no GST/HST is charged. All your invoices and orders can be exported as CSV from your <a href="${SITE}/account/invoices" style="color:${BRAND};">account</a>.</p>`;
  return { subject: `Invoice ${inv.number}: ${money(inv.totalCents)} paid`, html: layout(`Invoice ${inv.number}, ${money(inv.totalCents)} paid`, body) };
}

export function welcomeEmail(): { subject: string; html: string } {
  const points = [1, 10, 25, 50, 100];
  const th = "padding:8px 12px;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#6b7280;";
  const rows = points
    .map((n, i) => {
      const fee = volumeBaseCents(n);
      const off = Math.round((1 - fee / VOLUME.listCents) * 100);
      const label = n === 1 ? "Your 1st letter" : n === 100 ? "Your 100th letter and after" : `Your ${n}th letter`;
      return `<tr style="background:${i % 2 ? "#ffffff" : "#fafafa"};"><td style="padding:8px 12px;font-size:14px;">${label}</td><td style="padding:8px 12px;font-size:14px;text-align:right;">${money(fee)}</td><td style="padding:8px 12px;font-size:14px;text-align:right;color:#166534;">${off ? `${off}% off` : "list price"}</td></tr>`;
    })
    .join("");
  const body = `<h1 style="font-size:22px;margin:0 0 12px 0;">Welcome, and thank you for using sendletter</h1>
<p>Your first letter is accepted and on its way to being printed and posted. Thanks for trusting us with it.</p>
<h2 style="font-size:17px;margin:22px 0 6px 0;">How the volume discount works</h2>
<p style="margin:0 0 10px 0;">There is no subscription and nothing to sign up for. The more you send, the less each letter costs: our mailing fee falls automatically from ${money(VOLUME.listCents)} on your first letter to ${money(VOLUME.floorCents)} by your ${VOLUME.fullDiscountAt}th, counted over a rolling ${VOLUME.windowDays} days. Postage, printing and envelope are passed through at cost.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;margin:12px 0;"><tr style="background:#f3f4f6;"><th align="left" style="${th}">Letter in a 30-day window</th><th align="right" style="${th}">Mailing fee</th><th align="right" style="${th}">Discount</th></tr>${rows}</table>
<p>At the floor, a one-page black-and-white letter costs as little as <strong>$1.69</strong> all in, stamp included.</p>
<h2 style="font-size:17px;margin:22px 0 6px 0;">How you are billed</h2>
<p>This first letter was charged up front. From here your letters are added up and billed once a month, so you pay card fees once, not per letter. You will get an invoice by email each time, with a PDF attached, and every invoice and order is in your account.</p>
${button(`${SITE}/account/developers`, "Open your developer account")}
<p style="font-size:13px;color:#6b7280;">Want to try things without spending anything? Test keys (<code>sl_test_</code>) simulate letters and webhooks for free. Questions? Reply to this email or write to <a href="mailto:support@sendletter.app" style="color:${BRAND};">support@sendletter.app</a>.</p>`;
  return { subject: "Welcome to sendletter: your first letter is on its way", html: layout("Thanks for sending your first letter. Here is how the volume discount works.", body) };
}
