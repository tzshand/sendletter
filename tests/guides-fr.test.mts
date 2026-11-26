// French guides: faithful to the English ones (same structure, same figures, same links)
// and clean against the terminology and typography rules in fr-rules.mts.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { GUIDES } from "../src/content/guides/index.ts";
import { GUIDES_FR } from "../src/content/guides-fr/index.ts";
import type { Block } from "../src/lib/hubs.ts";
import { HUBS } from "../src/lib/hubs.ts";
import { bodyText, checkFrench, checkHeadings, frHeadingsOf, frTextOf, linksOf, numbersOf } from "./fr-rules.mts";

const en = new Map(GUIDES.map((g) => [g.id, g]));
const frFiles = fs.readdirSync(path.join(import.meta.dirname, "../src/content/guides-fr")).filter((f) => f.endsWith(".json"));

const blockKind = (b: Block) => Object.keys(b)[0];
const allText = bodyText;
const numbers = (t: string) => numbersOf(t, "fr");
const enNumbers = (t: string) => numbersOf(t, "en");
const links = linksOf;

test("every French file belongs to an English guide, and the registry lists exactly the files", () => {
  const ids = frFiles.map((f) => f.replace(/\.json$/, "")).sort();
  assert.deepEqual(Object.keys(GUIDES_FR).sort(), ids, "guides-fr/index.ts is out of date");
  for (const id of ids) assert.ok(en.has(id), `${id} has no English guide`);
});

for (const [id, fr] of Object.entries(GUIDES_FR)) {
  const e = en.get(id)!;
  test(`fr ${id}: structure matches the English guide`, () => {
    assert.equal(fr.id, id);
    assert.match(fr.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/, "slug is ASCII, lower case, hyphenated");
    assert.ok(fr.title.length <= 65, `title is ${fr.title.length} chars`);
    assert.ok(fr.description.length >= 70 && fr.description.length <= 165, `description is ${fr.description.length} chars`);
    const words = fr.answer.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").trim().split(/\s+/).length;
    assert.ok(words >= 35 && words <= 75, `answer is ${words} words`);
    assert.equal(fr.sections.length, e.sections.length, "section count");
    fr.sections.forEach((s, i) => {
      const es = e.sections[i];
      assert.deepEqual(s.blocks.map(blockKind), es.blocks.map(blockKind), `section ${i + 1} block types`);
      s.blocks.forEach((b, j) => {
        const eb = es.blocks[j];
        if ("ul" in b && "ul" in eb) assert.equal(b.ul.length, eb.ul.length, `section ${i + 1} list length`);
        if ("ol" in b && "ol" in eb) assert.equal(b.ol.length, eb.ol.length, `section ${i + 1} list length`);
        if ("table" in b && "table" in eb) {
          assert.equal(b.table.headers.length, eb.table.headers.length, "table columns");
          assert.equal(b.table.rows.length, eb.table.rows.length, "table rows");
        }
      });
    });
    assert.deepEqual(fr.sources.map((s) => s.url.length > 0), e.sources.map(() => true), "same number of sources");
    for (const s of fr.sources) assert.match(s.url, /^https:\/\//);
    for (const s of fr.sources) assert.doesNotMatch(s.url, /canadapost-postescanada\.ca\/cpc\/(?:doc\/)?en\//, "French pages cite Postes Canada’s French pages (/scp/fr/)");
    assert.ok(HUBS.some((h) => h.id === e.hub));
  });

  test(`fr ${id}: the same figures and the same links as the English guide`, () => {
    assert.deepEqual(numbers(allText(fr)), enNumbers(allText(e)), "numbers differ (prices, grams, dates, thresholds)");
    assert.deepEqual(links(allText(fr)), links(allText(e)), "internal or external links differ");
  });

  test(`fr ${id}: terminology and typography rules (OQLF, Postes Canada)`, () => {
    const problems = [...checkFrench(frTextOf(fr)), ...checkHeadings(frHeadingsOf(fr))];
    assert.deepEqual(problems, [], problems.join("\n"));
  });
}
