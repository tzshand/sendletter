// Content rules for the topical map (scripts/topical/README.md). These are the
// checks that need no embedding model: structure, length limits, citations,
// internal links, and that every guide file is registered.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { GUIDES } from "../src/content/guides/index.ts";
import { HUBS } from "../src/lib/hubs.ts";

const dir = path.resolve(import.meta.dirname, "../src/content/guides");
const words = (s: string) => s.trim().split(/\s+/).length;
const plain = (s: string) => s.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\*\*/g, "");

test("every guide file is registered", () => {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));
  assert.deepEqual(GUIDES.map((g) => g.id).sort(), files.sort());
});

test("ids and slugs are unique and ids match file names", () => {
  assert.equal(new Set(GUIDES.map((g) => g.id)).size, GUIDES.length);
  assert.equal(new Set(GUIDES.map((g) => g.slug)).size, GUIDES.length);
  for (const g of GUIDES) assert.ok(fs.existsSync(path.join(dir, `${g.id}.json`)), g.id);
});

for (const g of GUIDES) {
  test(`guide ${g.id}: metadata and structure`, () => {
    assert.ok(HUBS.some((h) => h.id === g.hub), `unknown hub ${g.hub}`);
    assert.ok(g.title.length <= 50, `title is ${g.title.length} chars: ${g.title}`);
    assert.ok(g.description.length >= 70 && g.description.length <= 155, `description is ${g.description.length} chars`);
    const n = words(plain(g.answer));
    assert.ok(n >= 40 && n <= 60, `answer is ${n} words`);
    assert.ok(g.sections.length >= 2, "needs at least two sections");
    assert.ok(g.sources.length >= 1, "external facts must be cited");
    for (const s of g.sources) assert.match(s.url, /^https:\/\//);
    assert.match(g.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  test(`guide ${g.id}: links resolve and prose is clean`, () => {
    const slugs = new Set(GUIDES.map((x) => x.slug));
    const legacy = new Set([
      "how-to-send-a-letter-online-in-canada", "what-it-costs-to-mail-a-letter-in-canada",
      "can-you-mail-a-legal-notice-online", "send-physical-mail-from-your-app", "api-volume-pricing", "postage-calculator-canada",
    ]);
    const text = JSON.stringify(g);
    for (const m of text.matchAll(/\]\((\/[^)\s"]*)\)/g)) {
      const href = m[1];
      if (href.startsWith("/blog/")) assert.ok(slugs.has(href.slice(6)) || legacy.has(href.slice(6)), `dead link ${href}`);
      else assert.ok(["/", "/terms", "/docs", "/mail-to-canada"].includes(href), `unexpected link ${href}`);
    }
    for (const id of g.related ?? []) assert.ok(GUIDES.some((x) => x.id === id) || ["send-a-letter-online", "cost-to-mail", "legal-notice", "api-guide", "api-volume-pricing"].includes(id), `related ${id}`);
    // House style: no filler openers or em dashes.
    assert.ok(!/—/.test(text), "no em dashes");
    assert.ok(!/\b(delve|navigate the|in today's|landscape|unlock|seamless|game-changer)\b/i.test(text), "AI-filler phrasing");
  });

}

test("each live hub has at least one guide (no empty hubs registered)", () => {
  const used = new Set(GUIDES.map((g) => g.hub));
  assert.ok(used.has("postage") && used.has("send-online"));
});

test("every 'as low as' price in the guides is the real API floor ($1.69)", () => {
  for (const g of GUIDES) {
    const text = JSON.stringify(g);
    for (const m of text.matchAll(/as low as \$(\d+\.\d\d)/g)) assert.equal(m[1], "1.69", `${g.id}: "as low as $${m[1]}"`);
  }
});
