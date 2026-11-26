// Check one French guide against its English original and the OQLF / Postes Canada rules.
//
//   node --experimental-transform-types --import ./tests/register.mjs tests/check-fr-file.mts src/content/guides-fr/<id>.json [more files]
//
// Prints every problem and exits 1 if there are any. This is the same check tests/guides-fr.test.mts runs.

import fs from "node:fs";
import path from "node:path";
import { GUIDES } from "../src/content/guides/index.ts";
import type { FrGuide } from "../src/lib/hubs.ts";
import { bodyText, checkFrench, checkHeadings, frHeadingsOf, frTextOf, linksOf, numbersOf } from "./fr-rules.mts";

let bad = 0;
for (const file of process.argv.slice(2)) {
  const fr = JSON.parse(fs.readFileSync(file, "utf8")) as FrGuide;
  const id = path.basename(file, ".json");
  const en = GUIDES.find((g) => g.id === id);
  const problems: string[] = [];
  if (!en) problems.push(`no English guide with id ${id}`);
  else {
    if (fr.id !== id) problems.push(`id must be ${id}`);
    if (fr.sections.length !== en.sections.length) problems.push(`sections: ${fr.sections.length} vs ${en.sections.length}`);
    fr.sections.forEach((s, i) => {
      const es = en.sections[i];
      if (!es) return;
      const kinds = (bs: typeof s.blocks) => bs.map((b) => Object.keys(b)[0]).join(",");
      if (kinds(s.blocks) !== kinds(es.blocks)) problems.push(`section ${i + 1} block types differ: ${kinds(s.blocks)} vs ${kinds(es.blocks)}`);
    });
    const nf = numbersOf(bodyText(fr), "fr").join(" "), ne = numbersOf(bodyText(en), "en").join(" ");
    if (nf !== ne) problems.push(`figures differ. French: ${nf} | English: ${ne}`);
    if (linksOf(bodyText(fr)).join(" ") !== linksOf(bodyText(en)).join(" ")) problems.push("links differ from the English guide (keep every [text](/blog/...) link, with the ENGLISH slug in the path)");
    if (fr.sources.length !== en.sources.length) problems.push("sources count differs");
    if (fr.title.length > 65) problems.push(`title is ${fr.title.length} characters (max 65)`);
    if (fr.description.length < 70 || fr.description.length > 165) problems.push(`description is ${fr.description.length} characters (70 to 165)`);
  }
  problems.push(...checkFrench(frTextOf(fr)), ...checkHeadings(frHeadingsOf(fr)));
  console.log(`${problems.length ? "FAIL" : "ok  "} ${id}`);
  for (const p of problems) console.log("   - " + p);
  bad += problems.length;
}
process.exit(bad ? 1 : 0);
