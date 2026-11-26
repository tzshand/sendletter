// Webhooks: a signed POST to the customer's URL when a letter changes state.
//
//  - Events: letter.created, letter.printed, letter.mailed, letter.cancelled
//    (and webhook.test, sent on demand).
//  - Signing: header  Sendletter-Signature: t=<unix seconds>,v1=<hex>  where v1 is
//    HMAC-SHA256(secret, `${t}.${body}`). Reject a timestamp older than a few
//    minutes to defeat replay.
//  - Delivery: 2xx is success. Anything else, or a timeout, is retried with
//    backoff (1 min, 5 min, 30 min, 2 h, 6 h, 24 h), seven attempts in all.
//  - Safety: endpoints must be https and must not resolve to a private,
//    loopback or link-local address (checked when created and again on every
//    attempt, so a DNS change cannot point an endpoint inward). Redirects are
//    not followed.

import { createHmac, randomBytes, randomUUID } from "crypto";
import { lookup } from "dns/promises";
import { isIP } from "net";
import { getDb } from "./db";
import { serializeLetter, type OrderRow } from "./letters";

export const WEBHOOK_EVENTS = ["letter.created", "letter.printed", "letter.mailed", "letter.cancelled"] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export const RETRY_DELAYS_MS = [60_000, 300_000, 1_800_000, 7_200_000, 21_600_000, 86_400_000];
export const MAX_ATTEMPTS = RETRY_DELAYS_MS.length + 1;
export const MAX_ENDPOINTS = 10;
const TIMEOUT_MS = 10_000;

export class WebhookUrlError extends Error {}

export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(24).toString("hex")}`;
}

export function signPayload(secret: string, body: string, t = Math.floor(Date.now() / 1000)): string {
  return `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${body}`).digest("hex")}`;
}

// ── URL safety ──

export function isPrivateAddress(ip: string): boolean {
  const v = ip.toLowerCase();
  const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateAddress(mapped[1]);
  if (isIP(v) === 4) {
    const [a, b] = v.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
    );
  }
  if (isIP(v) === 6) return v === "::1" || v === "::" || /^f[cd]/.test(v) || /^fe[89ab]/.test(v);
  return true; // not an address we understand: treat as unsafe
}

type Lookup = (host: string) => Promise<{ address: string }[]>;
let resolveHost: Lookup = (host) => lookup(host, { all: true });
/** Tests replace DNS so they need no network. */
export function __setLookup(fn: Lookup) { resolveHost = fn; }

export async function assertPublicHttpsUrl(raw: string): Promise<URL> {
  let u: URL;
  try { u = new URL(raw); } catch { throw new WebhookUrlError("url must be a valid URL"); }
  if (u.protocol !== "https:") throw new WebhookUrlError("url must start with https://");
  if (u.username || u.password) throw new WebhookUrlError("url must not contain credentials");
  const host = u.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "localhost" || /\.(local|localhost|internal|lan|home|corp)$/.test(host)) throw new WebhookUrlError("url must be a public host");
  if (isIP(host)) {
    if (isPrivateAddress(host)) throw new WebhookUrlError("url must not point at a private address");
    return u;
  }
  let addrs: { address: string }[];
  try { addrs = await resolveHost(host); } catch { throw new WebhookUrlError("url host could not be resolved"); }
  if (!addrs.length || addrs.some((a) => isPrivateAddress(a.address))) throw new WebhookUrlError("url must not point at a private address");
  return u;
}

// ── Endpoints ──

export function parseEvents(input: unknown): string | null {
  if (input === undefined || input === null) return null;
  if (!Array.isArray(input) || input.some((e) => typeof e !== "string")) throw new WebhookUrlError("events must be an array of event names");
  const bad = input.find((e) => !(WEBHOOK_EVENTS as readonly string[]).includes(e));
  if (bad) throw new WebhookUrlError(`unknown event "${bad}". Valid events: ${WEBHOOK_EVENTS.join(", ")}`);
  return input.length ? [...new Set(input)].join(",") : null;
}

export async function createEndpoint(accountId: string, livemode: boolean, input: { url: string; events?: unknown; description?: string }) {
  const u = await assertPublicHttpsUrl(input.url);
  const events = parseEvents(input.events);
  const db = getDb();
  const { data: existing } = await db.from("sendletter_webhook_endpoints").select("id").eq("account_id", accountId);
  if ((existing ?? []).length >= MAX_ENDPOINTS) throw new WebhookUrlError(`you can have at most ${MAX_ENDPOINTS} webhook endpoints`);
  const secret = generateWebhookSecret();
  const { data, error } = await db
    .from("sendletter_webhook_endpoints")
    .insert({ account_id: accountId, url: u.toString(), secret, events, livemode, description: (input.description ?? "").slice(0, 200) || null })
    .select("id, url, events, livemode, description, created_at")
    .single();
  if (!data) throw new Error(`could not create webhook endpoint: ${error?.message ?? "unknown"}`);
  return { endpoint: publicEndpoint(data), secret };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function publicEndpoint(e: Record<string, any>) {
  return {
    id: e.id as string,
    object: "webhook_endpoint" as const,
    url: e.url as string,
    events: e.events ? String(e.events).split(",") : ["*"],
    livemode: e.livemode !== false,
    description: e.description ?? null,
    created_at: e.created_at as string,
  };
}

export async function listEndpoints(accountId: string) {
  const { data } = await getDb()
    .from("sendletter_webhook_endpoints")
    .select("id, url, events, livemode, description, created_at")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });
  return (data ?? []).map(publicEndpoint);
}

export async function deleteEndpoint(accountId: string, id: string): Promise<boolean> {
  const { data } = await getDb().from("sendletter_webhook_endpoints").delete().eq("account_id", accountId).eq("id", id).select("id");
  return (data?.length ?? 0) > 0;
}

// ── Delivery ──

type EndpointRow = { id: string; url: string; secret: string };

async function postSigned(endpoint: EndpointRow, type: string, deliveryId: string, body: string) {
  let url: URL;
  try { url = await assertPublicHttpsUrl(endpoint.url); } catch (e) { return { ok: false, status: null as number | null, error: (e as Error).message }; }
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await globalThis.fetch(url, {
      method: "POST",
      redirect: "manual",
      signal: ctl.signal,
      headers: {
        "content-type": "application/json",
        "user-agent": "sendletter-webhooks/1",
        "sendletter-signature": signPayload(endpoint.secret, body),
        "sendletter-event": type,
        "sendletter-delivery": deliveryId,
      },
      body,
    });
    return res.status >= 200 && res.status < 300
      ? { ok: true, status: res.status, error: null as string | null }
      : { ok: false, status: res.status, error: `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, status: null as number | null, error: e instanceof Error ? e.message : "request failed" };
  } finally {
    clearTimeout(timer);
  }
}

/** Try one delivery now and record the outcome, scheduling a retry if it failed. */
export async function attemptDelivery(deliveryId: string, now = new Date()): Promise<void> {
  const db = getDb();
  const { data: d } = await db.from("sendletter_webhook_deliveries").select("id, endpoint_id, event_id, attempts, status").eq("id", deliveryId).single();
  if (!d || d.status !== "pending") return;
  const { data: ep } = await db.from("sendletter_webhook_endpoints").select("id, url, secret, active").eq("id", d.endpoint_id).single();
  const { data: ev } = await db.from("sendletter_webhook_events").select("id, type, payload").eq("id", d.event_id).single();
  if (!ep || !ev || ep.active === false) {
    await db.from("sendletter_webhook_deliveries").update({ status: "failed", last_error: "endpoint removed or disabled" }).eq("id", deliveryId);
    return;
  }
  const attempts = d.attempts + 1;
  const r = await postSigned(ep, ev.type, d.id, JSON.stringify(ev.payload));
  if (r.ok) {
    await db.from("sendletter_webhook_deliveries").update({ status: "succeeded", attempts, last_status_code: r.status, last_error: null, delivered_at: now.toISOString() }).eq("id", deliveryId);
  } else if (attempts >= MAX_ATTEMPTS) {
    await db.from("sendletter_webhook_deliveries").update({ status: "failed", attempts, last_status_code: r.status, last_error: r.error }).eq("id", deliveryId);
  } else {
    const next = new Date(now.getTime() + RETRY_DELAYS_MS[attempts - 1]).toISOString();
    await db.from("sendletter_webhook_deliveries").update({ attempts, last_status_code: r.status, last_error: r.error, next_attempt_at: next }).eq("id", deliveryId);
  }
}

/** Record an event and deliver it to every matching endpoint. Never throws: a webhook must not fail an order. */
export async function emitEvent(accountId: string, livemode: boolean, type: WebhookEvent, order: OrderRow, now = new Date()): Promise<void> {
  try {
    const db = getDb();
    const id = randomUUID();
    const payload = {
      id, object: "event", type, livemode,
      created: Math.floor(now.getTime() / 1000),
      data: { object: serializeLetter(order, { now }) },
    };
    const { error } = await db.from("sendletter_webhook_events").insert({ id, account_id: accountId, type, livemode, order_id: order.id, payload });
    if (error) throw new Error(error.message);
    const { data: endpoints } = await db
      .from("sendletter_webhook_endpoints")
      .select("id, events, livemode, active")
      .eq("account_id", accountId)
      .eq("livemode", livemode);
    const wanted = (endpoints ?? []).filter((e: { active: boolean; events: string | null }) => e.active !== false && (!e.events || e.events.split(",").includes(type)));
    for (const e of wanted) {
      const { data: del } = await db.from("sendletter_webhook_deliveries").insert({ endpoint_id: e.id, event_id: id }).select("id").single();
      if (del) await attemptDelivery(del.id, now);
    }
  } catch (e) {
    console.error(`webhook: could not emit ${type}:`, e instanceof Error ? e.message : e);
  }
}

/** Retry every pending delivery that is due. Run by the scheduled job. */
export async function retryDueDeliveries(now = new Date(), limit = 100): Promise<{ attempted: number }> {
  const { data } = await getDb()
    .from("sendletter_webhook_deliveries")
    .select("id")
    .eq("status", "pending")
    .lte("next_attempt_at", now.toISOString())
    .order("next_attempt_at")
    .limit(limit);
  const due = data ?? [];
  for (const d of due) await attemptDelivery(d.id, now);
  return { attempted: due.length };
}

/** Send a one-off webhook.test event to an endpoint and report what came back. */
export async function sendTestEvent(accountId: string, endpointId: string) {
  const { data: ep } = await getDb().from("sendletter_webhook_endpoints").select("id, url, secret, livemode").eq("account_id", accountId).eq("id", endpointId).single();
  if (!ep) return null;
  const body = JSON.stringify({ id: randomUUID(), object: "event", type: "webhook.test", livemode: ep.livemode !== false, created: Math.floor(Date.now() / 1000), data: { object: { message: "This is a test event from sendletter." } } });
  const r = await postSigned(ep, "webhook.test", randomUUID(), body);
  return { delivered: r.ok, status_code: r.status, error: r.error };
}
