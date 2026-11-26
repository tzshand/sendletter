#!/usr/bin/env node
//
// Submit URLs to IndexNow (Bing, Yandex, Seznam, Naver — and anything else that
// joins the protocol later). Google does not participate.
//
//   node scripts/indexnow.mjs            # blog index + every post
//   node scripts/indexnow.mjs /blog/foo  # just these paths
//   node scripts/indexnow.mjs --sitemap   # every guide and blog URL in the live sitemap
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
];

const FR_SLUGS = [
  "envoyer-une-lettre-en-ligne-au-canada",
  "combien-coute-une-lettre-au-canada",
  "envoyer-une-mise-en-demeure-par-la-poste",
  "envoyer-du-courrier-depuis-votre-application",
];

// Origin pages under /mail-to-canada. Mirrors src/lib/origins/index.ts.
// English lives at the section root; every other language is prefixed.
const ORIGIN_PATHS = [
  "/mail-to-canada/mail-a-letter-to-canada-from-nigeria",
  "/hi/mail-to-canada/bharat-se-canada-patra-kaise-bhejen",
  "/pa/mail-to-canada/canada-nu-chithi-kive-bhejni",
  "/ur/mail-to-canada/pakistan-se-canada-khat-kaise-bhejen",
  "/bn/mail-to-canada/bangladesh-theke-canada-chithi",
  "/ta/mail-to-canada/canada-kadithatm-anuppuvathu-eppadi",
  "/gu/mail-to-canada/canada-patra-kevi-rite-mokalvo",
  "/zh/mail-to-canada/ru-he-cong-zhongguo-ji-xin-dao-jianada",
  "/zh-hant/mail-to-canada/ru-he-ji-xin-dao-jianada",
  "/ja/mail-to-canada/nihon-kara-canada-e-tegami",
  "/ko/mail-to-canada/hanguk-eseo-canada-pyeonji",
  "/tl/mail-to-canada/paano-magpadala-ng-sulat-sa-canada",
  "/vi/mail-to-canada/gui-thu-di-canada-tu-viet-nam",
  "/ar/mail-to-canada/kayfa-tursil-risala-ila-kanada",
  "/fa/mail-to-canada/ersal-name-be-canada",
  "/tr/mail-to-canada/turkiyeden-kanadaya-mektup-gonderme",
  "/de/mail-to-canada/brief-nach-kanada-senden",
  "/fr/mail-to-canada/envoyer-une-lettre-au-canada",
  "/it/mail-to-canada/spedire-una-lettera-in-canada",
  "/nl/mail-to-canada/brief-naar-canada-sturen",
  "/ru/mail-to-canada/kak-otpravit-pismo-v-kanadu",
  "/uk/mail-to-canada/yak-nadislaty-lyst-do-kanady",
  "/pl/mail-to-canada/jak-wyslac-list-do-kanady",
  "/ro/mail-to-canada/cum-trimiti-o-scrisoare-in-canada",
  "/es/mail-to-canada/como-enviar-una-carta-a-canada",
  "/pt/mail-to-canada/como-enviar-uma-carta-para-o-canada",
  "/am/mail-to-canada/wede-canada-debdabe-melakit",
  "/ti/mail-to-canada/nab-canada-debdabe-milak",
  "/so/mail-to-canada/sida-loo-diro-warqad-canada",
];

const DEFAULT_PATHS = [
  "/blog",
  ...EN_SLUGS.map((s) => `/blog/${s}`),
  "/fr/blog",
  ...FR_SLUGS.map((s) => `/fr/blog/${s}`),
  "/mail-to-canada",
  ...ORIGIN_PATHS,
];

// Guard against a real mistake made once: on Git Bash a bare `/foo` argument
// is rewritten to a Windows path before node ever sees it, and the result was
// submitted to IndexNow as a nonsense URL. Anything that is not a clean
// site-relative path is refused rather than published.
// --sitemap: submit every English guide and blog URL listed in the live sitemap (the guides
// are generated from data, so this list never has to be kept in step by hand).
let fromSitemap = null;
if (process.argv.includes("--sitemap")) {
  const xml = await (await fetch(`https://${HOST}/sitemap.xml`)).text();
  fromSitemap = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname).filter((p) => /^(\/fr)?\/(blog|guides)(\/|$)/.test(p));
}

const args = process.argv.slice(2).filter((a) => a !== "--sitemap").map((a) => {
  if (!a.startsWith("/") || /^\/[A-Za-z]:/.test(a) || a.includes("\\") || a.includes(" ")) {
    console.error(`Refusing suspicious path argument: ${a}`);
    console.error("Pass site-relative paths only, e.g. //blog/foo on Git Bash, or run with no arguments.");
    process.exit(1);
  }
  return a;
});
const paths = fromSitemap ?? (args.length > 0 ? args : DEFAULT_PATHS);

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
