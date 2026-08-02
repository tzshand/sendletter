#!/usr/bin/env node
//
// Submit URLs to IndexNow (Bing, Yandex, Seznam, Naver — and anything else that
// joins the protocol later). Google does not participate.
//
//   node scripts/indexnow.mjs            # blog index + every post
//   node scripts/indexnow.mjs /blog/foo  # just these paths
//
// Run this MANUALLY after a deploy that actually changed content. It is
// deliberately not wired into the build: IndexNow is a "this URL changed right
// now" signal, and firing it on every unrelated push trains the receiving end
// to discount you.

const KEY = "5afed68102e34ccfa015f6346372cfd5";
const HOST = "sendletter.app";
const ENDPOINT = "https://api.indexnow.org/indexnow";

// Mirrors src/lib/blog.ts. Kept as plain lists so this script stays runnable
// without a TypeScript loader.
const EN_SLUGS = [
  "how-to-send-a-letter-online-in-canada",
  "what-it-costs-to-mail-a-letter-in-canada",
  "can-you-mail-a-legal-notice-online",
  "send-physical-mail-from-your-app",
  "mail-a-letter-to-canada-from-abroad",
];

const FR_SLUGS = [
  "envoyer-une-lettre-en-ligne-au-canada",
  "combien-coute-une-lettre-au-canada",
  "envoyer-une-mise-en-demeure-par-la-poste",
  "envoyer-du-courrier-depuis-votre-application",
  "envoyer-une-lettre-au-canada-depuis-l-etranger",
];

const DEFAULT_PATHS = [
  "/blog",
  ...EN_SLUGS.map((s) => `/blog/${s}`),
  "/fr/blog",
  ...FR_SLUGS.map((s) => `/fr/blog/${s}`),
];

const args = process.argv.slice(2);
const paths = args.length > 0 ? args : DEFAULT_PATHS;

const urlList = paths.map((p) => `https://${HOST}${p.startsWith("/") ? p : `/${p}`}`);

// The key file must be reachable before submitting, or the whole batch is
// rejected. Checking first turns a silent 403 into an obvious error.
const keyLocation = `https://${HOST}/${KEY}.txt`;
const keyCheck = await fetch(keyLocation);
if (!keyCheck.ok) {
  console.error(`Key file not reachable at ${keyLocation} (HTTP ${keyCheck.status}).`);
  console.error("Deploy first — IndexNow verifies the key over HTTP before accepting URLs.");
  process.exit(1);
}
const served = (await keyCheck.text()).trim();
if (served !== KEY) {
  console.error(`Key file contents mismatch. Expected ${KEY}, got "${served}".`);
  process.exit(1);
}

const res = await fetch(ENDPOINT, {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation, urlList }),
});

// 200 = accepted, 202 = accepted but key still being validated. Both are fine.
if (res.ok || res.status === 202) {
  console.log(`Submitted ${urlList.length} URL(s) to IndexNow (HTTP ${res.status}):`);
  for (const u of urlList) console.log(`  ${u}`);
} else {
  console.error(`IndexNow rejected the submission: HTTP ${res.status}`);
  console.error(await res.text().catch(() => ""));
  process.exit(1);
}
