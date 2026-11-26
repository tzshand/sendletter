// Renders a guide from its JSON data: the direct answer first, then sections,
// then cited sources. Inline markup is deliberately tiny: **bold** and
// [text](url), nothing else.

import type { ReactNode } from "react";
import type { Block, GuideData } from "@/lib/hubs";
import { A, H2, Lead, Note, OL, P, Table, UL } from "@/components/blog/Prose";
import { getPostBySlug } from "@/lib/blog";

const INLINE = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;

export function inline(text: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) return <strong key={i}>{bold[1]}</strong>;
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      // A guide may point at a later wave. Until that wave is released the
      // target does not exist, so render the words rather than a dead link.
      const href = link[2];
      if (href.startsWith("/blog/") && !getPostBySlug("en", href.slice("/blog/".length))) return link[1];
      return <A key={i} href={href}>{link[1]}</A>;
    }
    return part;
  });
}

function BlockView({ block }: { block: Block }) {
  if ("p" in block) return <P>{inline(block.p)}</P>;
  if ("note" in block) return <Note>{inline(block.note)}</Note>;
  if ("ul" in block) return <UL>{block.ul.map((li, i) => <li key={i}>{inline(li)}</li>)}</UL>;
  if ("ol" in block) return <OL>{block.ol.map((li, i) => <li key={i}>{inline(li)}</li>)}</OL>;
  return (
    <Table
      headers={block.table.headers}
      rows={block.table.rows.map((r) => r.map((c) => inline(c)))}
    />
  );
}

export function GuideBody({ guide }: { guide: GuideData }) {
  return (
    <>
      <Lead>{inline(guide.answer)}</Lead>
      {guide.sections.map((s) => (
        <section key={s.h2}>
          <H2>{s.h2}</H2>
          {s.blocks.map((b, i) => (
            <BlockView key={i} block={b} />
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
