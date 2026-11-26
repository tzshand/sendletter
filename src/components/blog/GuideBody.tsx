// Renders a guide from its JSON data: the direct answer first, then sections,
// then cited sources. Inline markup is deliberately tiny: **bold** and
// [text](url), nothing else.

import type { ReactNode } from "react";
import type { Block, GuideData } from "@/lib/hubs";
import { A, H2, Lead, Note, OL, P, Table, UL } from "@/components/blog/Prose";
import { getPostBySlug, postPath, type Locale } from "@/lib/blog";

const INLINE = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;

export function inline(text: string, locale: Locale = "en"): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) return <strong key={i}>{bold[1]}</strong>;
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      // A guide may point at a later wave. Until that wave is released the
      // target does not exist, so render the words rather than a dead link.
      let href = link[2];
      if (href.startsWith("/blog/")) {
        const target = getPostBySlug("en", href.slice("/blog/".length));
        if (!target) return link[1];
        // French pages link to the French version of a guide when there is one, else to the English page.
        if (locale === "fr") href = postPath(target, "fr");
      }
      return <A key={i} href={href}>{link[1]}</A>;
    }
    return part;
  });
}

function BlockView({ block, locale }: { block: Block; locale: Locale }) {
  if ("p" in block) return <P>{inline(block.p, locale)}</P>;
  if ("note" in block) return <Note>{inline(block.note, locale)}</Note>;
  if ("ul" in block) return <UL>{block.ul.map((li, i) => <li key={i}>{inline(li, locale)}</li>)}</UL>;
  if ("ol" in block) return <OL>{block.ol.map((li, i) => <li key={i}>{inline(li, locale)}</li>)}</OL>;
  return (
    <Table
      headers={block.table.headers}
      rows={block.table.rows.map((r) => r.map((c) => inline(c, locale)))}
    />
  );
}

export function GuideBody({ guide, locale = "en" }: { guide: Pick<GuideData, "answer" | "sections" | "sources">; locale?: Locale }) {
  return (
    <>
      <Lead>{inline(guide.answer, locale)}</Lead>
      {guide.sections.map((s) => (
        <section key={s.h2}>
          <H2>{s.h2}</H2>
          {s.blocks.map((b, i) => (
            <BlockView key={i} block={b} locale={locale} />
          ))}
        </section>
      ))}
      <H2>Sources</H2>
      <UL>
        {guide.sources.map((s) => (
          <li key={s.url}>
            <A href={s.url}>{s.label}</A>
          </li>
        ))}
      </UL>
    </>
  );
}
