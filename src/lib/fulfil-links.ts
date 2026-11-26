// One-click-ish links in the fulfilment email so the owner can mark a letter
// printed or mailed, which is what moves its status (and fires its webhook).
//
// A GET never changes anything: mail scanners and link previews fetch links. The
// link opens a confirmation page, and the button on that page POSTs. Links are
// HMAC-signed and expire, so a forwarded email cannot be used to tamper with an
// order later.

import { createHmac, timingSafeEqual } from "crypto";

export type FulfilAction = "printed" | "mailed";
export const FULFIL_LINK_TTL_DAYS = 60;

function secret(): string {
  const s = process.env.FULFIL_SECRET || process.env.CRON_SECRET || process.env.JWT_SECRET;
  if (!s) throw new Error("FULFIL_SECRET (or CRON_SECRET / JWT_SECRET) is not set");
  return s;
}

function sign(orderId: string, action: FulfilAction, exp: number): string {
  return createHmac("sha256", secret()).update(`${orderId}.${action}.${exp}`).digest("hex");
}

export function fulfilParams(orderId: string, action: FulfilAction, now = Date.now()) {
  const exp = Math.floor(now / 1000) + FULFIL_LINK_TTL_DAYS * 86400;
  return { o: orderId, a: action, e: String(exp), s: sign(orderId, action, exp) };
}

export function fulfilUrl(origin: string, orderId: string, action: FulfilAction, now = Date.now()): string {
  const p = fulfilParams(orderId, action, now);
  return `${origin}/api/fulfil?${new URLSearchParams(p).toString()}`;
}

export function verifyFulfil(p: { o?: string | null; a?: string | null; e?: string | null; s?: string | null }, now = Date.now()):
  | { ok: true; orderId: string; action: FulfilAction }
  | { ok: false; reason: string } {
  if (!p.o || !p.a || !p.e || !p.s) return { ok: false, reason: "Incomplete link." };
  if (p.a !== "printed" && p.a !== "mailed") return { ok: false, reason: "Unknown action." };
  const exp = Number(p.e);
  if (!Number.isFinite(exp) || exp * 1000 < now) return { ok: false, reason: "This link has expired." };
  const want = Buffer.from(sign(p.o, p.a, exp), "hex");
  let got: Buffer;
  try { got = Buffer.from(p.s, "hex"); } catch { return { ok: false, reason: "Bad signature." }; }
  if (want.length !== got.length || !timingSafeEqual(want, got)) return { ok: false, reason: "Bad signature." };
  return { ok: true, orderId: p.o, action: p.a };
}
