"""The shape of the site's embeddings, measured on the live pages (see fetch_site.py).

  python scripts/topical/fetch_site.py
  python scripts/topical/shape.py

Reports, for English pages (e5-large, as measure.py uses) and for all pages
(multilingual-e5-base, so the 26 non-English origin pages are included):
  - the site centre, spread, and each page's similarity to it
  - clusters (k-means, chosen by silhouette) and how they line up with the hubs
  - hub centroids and how far apart they sit
  - how much each group (API hub, origin pages) moves the centre
"""
import json
import re
import sys
from pathlib import Path

import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

HERE = Path(__file__).resolve().parent
PAGES = json.loads((HERE / "reports" / "site-pages.json").read_text(encoding="utf-8"))
GENERIC = re.compile(r"\b(canada|canadian|canadians|ontario|quebec|toronto|montreal|vancouver|alberta|sendletter)\b", re.I)

API_SLUGS = {
    "send-physical-mail-from-your-app", "api-volume-pricing", "canada-post-address-validation-api", "canada-post-api-send-letters",
    "idempotency-for-physical-mail", "send-a-letter-with-an-api-canada", "sendletter-vs-lob", "sendletter-vs-postgrid", "test-mode-for-a-mail-api",
}
SEND_SLUGS = {"how-to-send-a-letter-online-in-canada", "how-online-letter-mailing-works", "mail-a-letter-without-a-printer", "mail-one-letter-without-a-stamp-book", "what-an-online-letter-costs"}
POSTAGE_SLUGS = {
    "what-it-costs-to-mail-a-letter-in-canada", "canada-post-letter-rates-by-weight", "canada-post-stamp-price", "how-long-does-a-letter-take-in-canada",
    "how-many-stamps-for-a-letter-in-canada", "letter-with-too-little-postage", "lettermail-size-and-weight-limits", "permanent-stamp-value-canada",
    "postage-for-a-large-envelope-canada", "return-address-on-a-canadian-letter",
}
ABROAD_SLUGS = {"canadian-postal-code-format"}
LEGAL_SLUGS = {"can-you-mail-a-legal-notice-online", "registered-vs-regular-mail-canada"}


def group(p: dict) -> str:
    path = p["path"]
    if path == "/": return "home"
    if path.startswith("/docs"): return "docs"
    if path in ("/blog", "/fr/blog", "/terms") or path.startswith("/guides/"): return "index"
    if "/mail-to-canada" in path: return "origin-en" if p["lang"].startswith("en") else "origin-other"
    if path.startswith("/fr/blog/"): return "fr-post"
    slug = path.rsplit("/", 1)[-1]
    for name, s in (("api", API_SLUGS), ("send", SEND_SLUGS), ("postage", POSTAGE_SLUGS), ("abroad", ABROAD_SLUGS), ("legal", LEGAL_SLUGS)):
        if slug in s: return name
    return "other"


def prep(p: dict, strip_generic: bool) -> str:
    t = f"{p['title']}. {p['description']}. {p['text']}"
    if strip_generic: t = GENERIC.sub(" ", t)
    return "passage: " + re.sub(r"\s+", " ", t)[:6000]


def unit(v): return v / np.linalg.norm(v, axis=-1, keepdims=True)


def analyse(label, pages, model_name, strip_generic):
    print(f"\n{'=' * 78}\n{label}: {len(pages)} pages, {model_name}\n{'=' * 78}")
    model = SentenceTransformer(model_name)
    E = unit(model.encode([prep(p, strip_generic) for p in pages], normalize_embeddings=True, show_progress_bar=False))
    centre = unit(E.mean(0))
    sims = E @ centre
    print(f"centre similarity: mean {sims.mean():.4f}  sd {sims.std(ddof=1):.4f}  min {sims.min():.4f}  max {sims.max():.4f}")
    groups = [group(p) for p in pages]
    names = sorted(set(groups))
    print("\nby group (n, mean sim to site centre):")
    for g in names:
        idx = [i for i, x in enumerate(groups) if x == g]
        print(f"  {g:13s} n={len(idx):3d}  mean {sims[idx].mean():.4f}  min {sims[idx].min():.4f}")
    print("\nfurthest from the centre:")
    for i in np.argsort(sims)[:6]: print(f"  {sims[i]:.4f}  {groups[i]:11s} {pages[i]['path']}")
    print("closest to the centre:")
    for i in np.argsort(-sims)[:6]: print(f"  {sims[i]:.4f}  {groups[i]:11s} {pages[i]['path']}")

    # how much does each group move the centre?
    print("\ncentre shift if a group is removed (cosine old vs new; 1.0 = no effect):")
    for g in names:
        keep = [i for i, x in enumerate(groups) if x != g]
        if len(keep) == len(groups) or len(keep) < 3: continue
        print(f"  without {g:13s} {float(centre @ unit(E[keep].mean(0))):.4f}")

    # hub centroids and their separation
    print("\ncosine between group centroids:")
    cent = {g: unit(E[[i for i, x in enumerate(groups) if x == g]].mean(0)) for g in names if groups.count(g) >= 2}
    keys = list(cent)
    print("               " + " ".join(f"{k[:7]:>7s}" for k in keys))
    for a in keys: print(f"  {a:13s}" + " ".join(f"{float(cent[a] @ cent[b]):7.3f}" for b in keys))

    # clusters
    best = None
    for k in range(2, min(9, len(pages) - 1)):
        km = KMeans(n_clusters=k, n_init=10, random_state=0).fit(E)
        sc = silhouette_score(E, km.labels_)
        if best is None or sc > best[0]: best = (sc, k, km.labels_)
    sc, k, lab = best
    print(f"\nbest k-means: k={k} (silhouette {sc:.3f})")
    for c in range(k):
        idx = [i for i, l in enumerate(lab) if l == c]
        mix = {}
        for i in idx: mix[groups[i]] = mix.get(groups[i], 0) + 1
        print(f"  cluster {c}: n={len(idx):3d}  " + ", ".join(f"{g} {n}" for g, n in sorted(mix.items(), key=lambda x: -x[1])))
        if len(idx) <= 14:
            for i in idx: print(f"       {pages[i]['path']}")
    return E, centre, sims, groups


def main():
    en = [p for p in PAGES if p["lang"].lower().startswith("en")]
    analyse("ENGLISH pages (the pages a Canadian searcher lands on)", en, "intfloat/e5-large", True)
    analyse("ALL pages incl. 26 non-English origin pages", PAGES, "intfloat/multilingual-e5-base", False)


if __name__ == "__main__":
    sys.exit(main())
