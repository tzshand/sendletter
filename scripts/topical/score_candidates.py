"""Score candidate articles against the live site's embedding shape BEFORE writing them.

  python scripts/topical/fetch_site.py             # once: the live pages
  python scripts/topical/score_candidates.py candidates.json

candidates.json is a list of { "id", "group", "title", "abstract" } where `abstract` is a
realistic 100-200 word summary written the way the article would open (answer first,
then what it covers). For each candidate it reports:
  - similarity to the site centre and z-score against the English pages
  - the nearest existing page and its similarity (near-duplicates are > 0.95)
  - which hub it is closest to
  - how far adding it alone would move the centre
It also reports how the whole set, if all were published, would change the centre and spread.
"""
import json
import re
import sys
from pathlib import Path

import numpy as np
from sentence_transformers import SentenceTransformer

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from shape import PAGES, group, prep, unit  # noqa: E402

GENERIC = re.compile(r"\b(canada|canadian|canadians|ontario|quebec|toronto|montreal|vancouver|alberta|sendletter)\b", re.I)


def main():
    cands = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    en = [p for p in PAGES if p["lang"].lower().startswith("en")]
    model = SentenceTransformer("intfloat/e5-large")
    enc = lambda texts: unit(model.encode(texts, normalize_embeddings=True, show_progress_bar=False))
    E = enc([prep(p, True) for p in en])
    centre = unit(E.mean(0))
    sims = E @ centre
    mu, sd = sims.mean(), sims.std(ddof=1)
    groups = [group(p) for p in en]
    hubs = {g: unit(E[[i for i, x in enumerate(groups) if x == g]].mean(0)) for g in set(groups) if groups.count(g) >= 2 and g not in ("index",)}

    C = enc(["passage: " + re.sub(r"\s+", " ", GENERIC.sub(" ", c["title"] + ". " + c["abstract"])) for c in cands])
    cs = C @ centre
    print(f"site: {len(en)} English pages, centre-sim mean {mu:.4f} sd {sd:.4f}\n")
    print(f"{'id':44} {'grp':9} {'sim':>6} {'z':>6}  {'nearest page (sim)':52} {'closest hub'}")
    for i, c in enumerate(cands):
        near = np.argmax(E @ C[i])
        nsim = float(E[near] @ C[i])
        hub = max(hubs, key=lambda h: float(hubs[h] @ C[i]))
        flag = " DUP?" if nsim > 0.95 else ""
        print(f"{c['id'][:44]:44} {c['group'][:9]:9} {cs[i]:6.3f} {(cs[i]-mu)/sd:6.2f}  {en[near]['path'][-40:]:40} ({nsim:.3f}){flag}  {hub}")
    E2 = np.vstack([E, C])
    c2 = unit(E2.mean(0))
    s2 = E2 @ c2
    print(f"\nif ALL candidates were published: centre cosine to today's {float(centre @ c2):.4f}; spread {sd:.4f} -> {s2.std(ddof=1):.4f}")
    by = {}
    for i, c in enumerate(cands): by.setdefault(c["group"], []).append(i)
    for g, idx in by.items():
        keep = [k for k in range(len(cands)) if k not in idx]
        c3 = unit(np.vstack([E, C[keep]]).mean(0)) if keep else centre
        print(f"  without group '{g}': centre cosine {float(c2 @ c3):.4f}")


if __name__ == "__main__":
    main()
