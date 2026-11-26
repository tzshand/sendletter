// Search Console data for sendletter.app, read-only, with no dependencies.
//
//   node scripts/gsc.mjs sites                      which properties the service account can see
//   node scripts/gsc.mjs pull [days] [outDir]       pages, queries, page+query, daily; written as JSON
//
// Credentials: a Google service-account key file with Search Console read access to the
// property. By default ~/.canner/gsc-reader.json (the Canner marketing reader, which has
// been added as a user on sendletter.app); override with GSC_KEY_FILE. The key is never
// copied into this repo, and only the read-only scope is requested.

import { createSign } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const KEY_FILE = process.env.GSC_KEY_FILE || join(homedir(), ".canner", "gsc-reader.json");
const SITE = process.env.GSC_SITE || ""; // e.g. sc-domain:sendletter.app or https://sendletter.app/
const b64u = (b) => Buffer.from(b).toString("base64url");

async function token() {
  const k = JSON.parse(readFileSync(KEY_FILE, "utf8"));
  const now = Math.floor(Date.now() / 1000);
  const head = b64u(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64u(JSON.stringify({ iss: k.client_email, scope: "https://www.googleapis.com/auth/webmasters.readonly", aud: k.token_uri, iat: now, exp: now + 3000 }));
  const sig = createSign("RSA-SHA256").update(`${head}.${claim}`).sign(k.private_key, "base64url");
  const r = await fetch(k.token_uri, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${head}.${claim}.${sig}` }) });
  const j = await r.json();
  if (!j.access_token) throw new Error("token request failed: " + (j.error_description || j.error || r.status));
  return j.access_token;
}

async function api(tok, path, body) {
  const r = await fetch(`https://www.googleapis.com/webmasters/v3/${path}`, { method: body ? "POST" : "GET", headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json();
  if (!r.ok) throw new Error(`${path}: ${j.error?.message || r.status}`);
  return j;
}

async function query(tok, site, days, dimensions, rowLimit = 25000) {
  const end = new Date(Date.now() - 2 * 86400e3); // GSC lags about two days
  const start = new Date(end.getTime() - (days - 1) * 86400e3);
  const iso = (d) => d.toISOString().slice(0, 10);
  const rows = [];
  for (let startRow = 0; ; startRow += rowLimit) {
    const j = await api(tok, `sites/${encodeURIComponent(site)}/searchAnalytics/query`, { startDate: iso(start), endDate: iso(end), dimensions, rowLimit, startRow, dataState: "all" });
    rows.push(...(j.rows || []));
    if ((j.rows || []).length < rowLimit) break;
  }
  return { start: iso(start), end: iso(end), rows: rows.map((r) => ({ keys: r.keys, clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })) };
}

const [cmd = "sites", a1, a2] = process.argv.slice(2);
const tok = await token();
const sites = (await api(tok, "sites")).siteEntry || [];
if (cmd === "sites") {
  for (const s of sites) console.log(s.permissionLevel.padEnd(20), s.siteUrl);
} else if (cmd === "pull") {
  const days = Number(a1) || 90;
  const out = a2 || join(import.meta.dirname, "topical", "reports");
  const site = SITE || sites.map((s) => s.siteUrl).find((u) => /sendletter\.app/.test(u));
  if (!site) throw new Error("no sendletter.app property visible to this account; run `sites`, or set GSC_SITE");
  mkdirSync(out, { recursive: true });
  const sets = { pages: ["page"], queries: ["query"], pageQueries: ["page", "query"], daily: ["date"], countries: ["country"], devices: ["device"], countryPages: ["country", "page"] };
  const result = { site, days, pulledAt: new Date().toISOString() };
  for (const [name, dims] of Object.entries(sets)) {
    result[name] = await query(tok, site, days, dims);
    console.log(name.padEnd(12), result[name].rows.length, "rows", result[name].start, "→", result[name].end);
  }
  writeFileSync(join(out, "gsc.json"), JSON.stringify(result));
  console.log("wrote", join(out, "gsc.json"));
}
