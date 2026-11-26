"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Key = { key_prefix: string; created_at: string; last_used_at: string | null } | null;
type Endpoint = { id: string; url: string; events: string[]; livemode: boolean; description: string | null; created_at: string };
type Delivery = { id: string; type: string; url: string; status: string; attempts: number; code: number | null; error: string | null; at: string };

type Props = {
  hasCard: boolean;
  liveKey: Key;
  testKey: Key;
  limits: { limitCents: number; capCents: number; spentCents: number };
  volume: { mailings: number; currentFeeCents: number; listFeeCents: number; floorFeeCents: number; floorAt: number; asLowAsCents: number };
  endpoints: Endpoint[];
  validEvents: string[];
  deliveries: Delivery[];
};

const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" }) : "never");

function Card({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 mb-5">
      <h2 className="text-sm font-bold text-gray-900">{title}</h2>
      {hint && <p className="text-xs text-gray-500 mt-1 mb-3">{hint}</p>}
      {!hint && <div className="mb-3" />}
      {children}
    </section>
  );
}

export function DevelopersClient(p: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [fresh, setFresh] = useState<{ label: string; secret: string } | null>(null);

  async function call(label: string, url: string, init?: RequestInit): Promise<Record<string, unknown> | null> {
    setBusy(label);
    setMsg(null);
    try {
      const res = await fetch(url, { headers: { "content-type": "application/json" }, ...init });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg({ kind: "err", text: String(j.error ?? "Something went wrong.") }); return null; }
      return j;
    } finally {
      setBusy(null);
    }
  }

  const makeKey = async (mode: "live" | "test") => {
    if (p.liveKey && mode === "live" && !confirm("This replaces your current live key. Anything using the old key stops working immediately. Continue?")) return;
    const j = await call(`key-${mode}`, "/api/api-keys", { method: "POST", body: JSON.stringify({ mode }) });
    if (j) { setFresh({ label: `New ${mode} key. Copy it now, it is shown once:`, secret: String(j.key) }); router.refresh(); }
  };

  const [limitInput, setLimitInput] = useState((p.limits.limitCents / 100).toString());
  const saveLimit = async () => {
    const j = await call("limit", "/api/account/limits", { method: "PATCH", body: JSON.stringify({ daily_limit_dollars: Number(limitInput) }) });
    if (j) { setMsg({ kind: "ok", text: "Daily limit saved." }); router.refresh(); }
  };

  const [req, setReq] = useState({ dollars: "", volume: "", reason: "" });
  const [showReq, setShowReq] = useState(false);
  const sendReq = async () => {
    const j = await call("req", "/api/account/limit-requests", { method: "POST", body: JSON.stringify({ requested_daily_dollars: Number(req.dollars), expected_volume: req.volume, reason: req.reason }) });
    if (j) { setMsg({ kind: "ok", text: "Request sent. We will reply by email, usually within one business day." }); setShowReq(false); setReq({ dollars: "", volume: "", reason: "" }); }
  };

  const [hook, setHook] = useState<{ url: string; mode: "live" | "test"; events: string[] }>({ url: "", mode: "live", events: [] });
  const addHook = async () => {
    const j = await call("hook", "/api/account/webhooks", { method: "POST", body: JSON.stringify({ url: hook.url, mode: hook.mode, events: hook.events.length ? hook.events : undefined }) });
    if (j) { setFresh({ label: "Webhook signing secret. Copy it now, it is shown once:", secret: String(j.secret) }); setHook({ url: "", mode: hook.mode, events: [] }); router.refresh(); }
  };
  const testHook = async (id: string) => {
    const j = await call(`t-${id}`, "/api/account/webhooks", { method: "POST", body: JSON.stringify({ test_id: id }) });
    if (j) setMsg({ kind: j.delivered ? "ok" : "err", text: j.delivered ? `Test event delivered (HTTP ${j.status_code}).` : `Test event failed: ${j.error ?? "no response"}` });
  };
  const rmHook = async (id: string) => {
    if (!confirm("Remove this webhook endpoint?")) return;
    const j = await call(`d-${id}`, `/api/account/webhooks?id=${id}`, { method: "DELETE" });
    if (j) router.refresh();
  };

  const pct = Math.min(100, Math.round((p.limits.spentCents / Math.max(1, p.limits.limitCents)) * 100));
  const toFloor = Math.max(0, p.volume.floorAt - p.volume.mailings);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Developers</h1>
        <p className="text-sm text-gray-500 mt-1">
          API keys, spending limits and webhooks. <Link href="/docs" className="text-brand hover:underline">API reference</Link> · <a href="/openapi.json" className="text-brand hover:underline">OpenAPI</a> · <a href="/postman.json" className="text-brand hover:underline">Postman</a> · <a href="mailto:support@sendletter.app" className="text-brand hover:underline">support@sendletter.app</a>
        </p>
      </div>

      {msg && <div className={`rounded-lg px-4 py-3 text-sm mb-5 border ${msg.kind === "ok" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>{msg.text}</div>}
      {fresh && (
        <div className="rounded-lg px-4 py-3 mb-5 border border-amber-300 bg-amber-50">
          <p className="text-sm font-semibold text-amber-900 mb-2">{fresh.label}</p>
          <code className="block break-all rounded bg-white border border-amber-200 px-3 py-2 text-xs select-all">{fresh.secret}</code>
          <button onClick={() => { navigator.clipboard?.writeText(fresh.secret); }} className="text-xs font-semibold text-amber-900 mt-2 underline">Copy</button>
          <button onClick={() => setFresh(null)} className="text-xs font-semibold text-amber-900 mt-2 ml-4 underline">Done</button>
        </div>
      )}

      <Card title="API keys" hint="A test key validates and prices letters, sends webhooks for test letters, and mails and bills nothing. Start with it.">
        {!p.hasCard && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
            A live key needs a card on file. <Link href="/profile" className="underline font-semibold">Add one on your profile.</Link> Your first live letter is charged when you send it.
          </p>
        )}
        {([["Test key", "test", p.testKey], ["Live key", "live", p.liveKey]] as const).map(([label, mode, k]) => (
          <div key={mode} className="flex flex-wrap items-center justify-between gap-3 py-3 border-t border-gray-100 first:border-0">
            <div>
              <p className="text-sm font-semibold">{label}</p>
              {k ? <p className="text-xs text-gray-500 font-mono mt-0.5">{k.key_prefix} · created {when(k.created_at)} · last used {when(k.last_used_at)}</p> : <p className="text-xs text-gray-400 mt-0.5">None yet</p>}
            </div>
            <button disabled={busy !== null} onClick={() => makeKey(mode)} className="text-sm font-semibold border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50">
              {busy === `key-${mode}` ? "Working…" : k ? "Replace key" : "Create key"}
            </button>
          </div>
        ))}
      </Card>

      <Card title="Volume pricing" hint={`The mailing fee falls automatically as you send more: from ${money(p.volume.listFeeCents)} on your first letter to ${money(p.volume.floorFeeCents)} on your ${p.volume.floorAt}th in any 30 days. Letters as low as ${money(p.volume.asLowAsCents)} all in.`}>
        <div className="grid sm:grid-cols-3 gap-3 text-sm">
          <div className="rounded-lg bg-gray-50 px-3 py-2.5"><p className="text-xs text-gray-500">Letters in the last 30 days</p><p className="text-lg font-bold">{p.volume.mailings}</p></div>
          <div className="rounded-lg bg-gray-50 px-3 py-2.5"><p className="text-xs text-gray-500">Mailing fee on your next letter</p><p className="text-lg font-bold">{money(p.volume.currentFeeCents)}</p></div>
          <div className="rounded-lg bg-gray-50 px-3 py-2.5"><p className="text-xs text-gray-500">{toFloor > 0 ? "Letters to the lowest fee" : "You are at the lowest fee"}</p><p className="text-lg font-bold">{toFloor > 0 ? toFloor : money(p.volume.floorFeeCents)}</p></div>
        </div>
        <p className="text-xs text-gray-500 mt-3"><Link href="/blog/api-volume-pricing" className="text-brand hover:underline">See the rate table and calculator</Link></p>
      </Card>

      <Card title="Daily spending limit" hint="The most your keys can spend in a day (Toronto time). A letter that would go over is refused with a 429, so a bug in your code cannot run up a bill.">
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1"><span>Spent today: {money(p.limits.spentCents)}</span><span>Limit: {money(p.limits.limitCents)}</span></div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden"><div className={`h-full ${pct >= 90 ? "bg-red-500" : "bg-brand"}`} style={{ width: `${pct}%` }} /></div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-600">$</span>
          <input value={limitInput} onChange={(e) => setLimitInput(e.target.value)} inputMode="decimal" className="input input-sm w-32" aria-label="Daily limit in dollars" />
          <button disabled={busy !== null} onClick={saveLimit} className="text-sm font-semibold bg-gray-900 text-white rounded-lg px-4 py-2 disabled:opacity-50">Save limit</button>
          <span className="text-xs text-gray-500">Approved maximum: {money(p.limits.capCents)} a day</span>
          <button onClick={() => setShowReq(!showReq)} className="text-sm font-semibold text-brand hover:underline ml-auto">Request a higher maximum</button>
        </div>
        {showReq && (
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2">
            <div className="flex items-center gap-2"><span className="text-sm text-gray-600">$</span><input value={req.dollars} onChange={(e) => setReq({ ...req, dollars: e.target.value })} placeholder={`More than ${p.limits.capCents / 100}`} className="input input-sm w-40" aria-label="Requested daily maximum in dollars" /><span className="text-xs text-gray-500">per day</span></div>
            <input value={req.volume} onChange={(e) => setReq({ ...req, volume: e.target.value })} placeholder="Expected volume, e.g. 2,000 letters a month" className="input input-sm w-full" />
            <textarea value={req.reason} onChange={(e) => setReq({ ...req, reason: e.target.value })} placeholder="What are you sending, and to whom?" rows={3} className="input input-sm w-full" />
            <button disabled={busy !== null} onClick={sendReq} className="text-sm font-semibold bg-brand text-white rounded-lg px-4 py-2 disabled:opacity-50">Send request</button>
          </div>
        )}
      </Card>

      <Card title="Webhooks" hint="We POST a signed JSON event to your URL when a letter is created, printed, mailed or cancelled. Failed deliveries are retried for about a day.">
        {p.endpoints.length > 0 && (
          <ul className="divide-y divide-gray-100 mb-4">
            {p.endpoints.map((e) => (
              <li key={e.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-mono break-all">{e.url}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{e.livemode ? "Live" : "Test"} · {e.events.join(", ")}</p>
                </div>
                <div className="flex gap-3 text-sm font-semibold">
                  <button disabled={busy !== null} onClick={() => testHook(e.id)} className="text-gray-700 hover:text-gray-900">{busy === `t-${e.id}` ? "Sending…" : "Send test"}</button>
                  <button disabled={busy !== null} onClick={() => rmHook(e.id)} className="text-red-600 hover:text-red-800">Remove</button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="space-y-2">
          <input value={hook.url} onChange={(e) => setHook({ ...hook, url: e.target.value })} placeholder="https://example.com/webhooks/sendletter" className="input input-sm w-full" aria-label="Webhook URL" />
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700">
            {p.validEvents.map((ev) => (
              <label key={ev} className="flex items-center gap-1.5"><input type="checkbox" checked={hook.events.includes(ev)} onChange={(e) => setHook({ ...hook, events: e.target.checked ? [...hook.events, ev] : hook.events.filter((x) => x !== ev) })} />{ev}</label>
            ))}
            <span className="text-xs text-gray-400 self-center">(none ticked = all events)</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select value={hook.mode} onChange={(e) => setHook({ ...hook, mode: e.target.value as "live" | "test" })} className="input input-sm w-auto"><option value="live">Live letters</option><option value="test">Test letters</option></select>
            <button disabled={busy !== null || !hook.url} onClick={addHook} className="text-sm font-semibold bg-gray-900 text-white rounded-lg px-4 py-2 disabled:opacity-50">Add endpoint</button>
          </div>
        </div>

        {p.deliveries.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Recent deliveries</p>
            <div className="overflow-x-auto"><table className="w-full text-xs min-w-[560px]">
              <tbody>
                {p.deliveries.map((d) => (
                  <tr key={d.id} className="border-t border-gray-100">
                    <td className="py-1.5 pr-3 text-gray-500 whitespace-nowrap">{when(d.at)}</td>
                    <td className="py-1.5 pr-3 font-mono">{d.type}</td>
                    <td className="py-1.5 pr-3 text-gray-500 break-all">{d.url}</td>
                    <td className="py-1.5 pr-3"><span className={d.status === "succeeded" ? "text-green-700" : d.status === "failed" ? "text-red-700" : "text-amber-700"}>{d.status}</span>{d.code ? ` · ${d.code}` : ""}{d.error && d.status !== "succeeded" ? ` · ${d.error}` : ""}</td>
                    <td className="py-1.5 text-gray-400">{d.attempts} attempt{d.attempts === 1 ? "" : "s"}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
        )}
      </Card>
    </div>
  );
}
