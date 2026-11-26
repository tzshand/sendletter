# Topical map and publishing waves

sendletter's content follows a measured topical map (from the Canner playbook, based on the
2024 Google Content Warehouse leak's `siteEmbeddings` / `siteFocusScore` / `siteRadius`; a
working model, not proven ranking fact).

**Centre:** mail a letter in Canada: price, stamps, and sending it for you. The homepage is
the money page; guides feed it and every guide links to it.

**Hubs** (`src/lib/hubs.ts`): postage, send-online, from-abroad, everyday (axial); legal, api (satellite).
A hub page exists once it has two live posts. Guides are JSON in `src/content/guides/`, one per
search intent, English only. The registry (`hubs.ts` + `blog.ts`) generates hub pages,
breadcrumbs, "keep reading" (about six siblings), sitemap entries and the homepage footer link.

## Releasing a wave

`RELEASED_WAVE` in `src/lib/blog.ts` gates what is live. Content for waves 1 to 4 is written and
measured; only wave 1 is released.

1. Two weeks after the last release, Search Console -> URL Inspection on the wave's URLs. If more
   than 30% are "Crawled - currently not indexed", wait.
2. Set each guide's `published` date in that wave to the release date.
3. Raise `RELEASED_WAVE`, run `pnpm test`, `pnpm build`, push (push = deploy to Canner).
4. Track impressions, clicks and position per hub; retitle guides with impressions but few clicks.

## Adding a guide

Add `src/content/guides/<id>.json` (see `src/lib/hubs.ts` `GuideData`), add its import in
`src/content/guides/index.ts` (keep waves in order), then:

    pnpm test                                   # title <= 50, description 70-155, 40-60 word answer,
                                                # sources, links resolve, no filler
    python scripts/topical/measure.py wave N    # embeddings (below)

Facts must come from `src/lib/pricing.ts` or Canada Post's published pages, cited in `sources`;
get one independent fact-check before release. Never state the proposed 2027 $2.00 stamp as fact
until Canada Post publishes it.

## Measuring

    python -m venv venv && venv/Scripts/pip install sentence-transformers numpy
    python scripts/topical/measure.py baseline
    python scripts/topical/measure.py wave 2          # drafts vs waves < 2
    python scripts/topical/measure.py wave 2 --accept 1

Model `intfloat/e5-large`, `passage:` prefix, generic words (Canada, provinces, cities) stripped.
Guardrails: reject z < -3; reject nearest-page similarity > 0.95; after a wave the centre should
barely move (cosine ~0.999) and the spread should not grow. Reports land in `reports/`.

Notes learned on the first run:
- With fewer than 20 pages the baseline spread is meaningless, so z uses the pooled spread of
  baseline plus wave. Centre drift is also only meaningful once the baseline has ~20 pages
  (wave 1 reads 0.984 for that reason; waves 2 and 3 read 0.998 and 0.9997).
- Page pairs in this narrow subject sit high (median 0.885, 99th percentile 0.955), so the 0.95
  line catches real overlap: shared rate tables, shared cost framing. Fix by cutting the duplicated
  section, not by raising the threshold. One reviewed exception is recorded in `REVIEWED`
  (`canada-post-stamp-price` vs the older `cost-to-mail`): watch Search Console for both
  ranking on one query.
- The 4 original posts plus ~27 `/mail-to-canada/*` origin pages are not in the centre: origin
  pages would pull it toward "addresses from X".

## Deliberately not written: tenancy notices

The second keyword batch showed demand for landlord/tenant letters (lease termination letter,
rental increase notice, "how much notice to give landlord ontario": 500 buckets). Not built, on
purpose: the only Ontario sources readable were Tribunals Ontario brochures dated 2018 and 2022,
the Board says its rules and forms change on September 21, 2026 (after changes on July 1, 2026),
and ontario.ca could not be fetched to confirm the rent-increase rules. A wrong notice period can
cost a tenant or landlord their case. Revisit once someone has read the current Residential
Tenancies Act pages and the Board's updated brochures; then add a guide under the `legal` hub.
Other clusters left out: condolence and thank-you notes (cards, not letters; 0 to 50), care home /
inmate / "loved one" letters (0).
