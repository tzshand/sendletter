"""Topical-map measurement for sendletter.

Embeds every live page and every draft guide with one model (intfloat/e5-large),
works out the site centre (the mean embedding) and each page's cosine similarity
to it, then scores drafts against that baseline.

  python scripts/topical/measure.py baseline        # wave-0 pages only
  python scripts/topical/measure.py wave 1          # score wave-1 drafts against waves < 1
  python scripts/topical/measure.py wave 2 --accept 1   # ...treating wave 1 as accepted

Guardrails (see README.md):
  * reject a draft with z < -3 (too far off-topic)
  * reject a draft whose nearest existing page has similarity > 0.95 (near-duplicate)
  * after a wave, the centre should barely move (cosine to the old centre ~0.999)
    and the spread should not grow.

Needs: sentence-transformers, numpy. Run it from a throwaway venv; the project
itself carries no Python dependency. English only: the French mirror pages are
translations of the four original posts and add no topical information.
"""
import argparse
import json
import re
import sys
from pathlib import Path

import numpy as np
from sentence_transformers import SentenceTransformer

ROOT = Path(__file__).resolve().parents[2]
GUIDES = ROOT / "src" / "content" / "guides"
POSTS = ROOT / "src" / "content" / "posts"
REPORTS = Path(__file__).resolve().parent / "reports"

Z_REJECT = -3.0
# Satellite hubs (see lib/hubs.ts) are meant to sit further from the centre than
# the axial hubs, and are kept small, so their floor is looser. A satellite
# draft is still rejected below this, and every wave reports how far the spread
# grew so the cost of the satellite is visible.
SATELLITE_HUBS = {"api", "legal"}
Z_SATELLITE = -6.0
DUP_REJECT = 0.95
SMALL_N = 20  # below this, mean/sd are too unstable to trust: report, but flag

# Words that appear on every page and make pages look alike. Place names are the
# canonical example; "Canada" is on all of them.
GENERIC = re.compile(
    r"\b(canada|canadian|canadians|ontario|quebec|toronto|montreal|vancouver|alberta|"
    r"british columbia|manitoba|saskatchewan|nova scotia|new brunswick|sendletter)\b",
    re.I,
)

# Near-duplicate flags a human has reviewed and accepted, with the reason. The
# threshold itself stays at 0.95; this list is the audit trail for exceptions.
REVIEWED = {
    frozenset({"canada-post-stamp-price", "cost-to-mail"}): (
        "2026-11-26: rate reference (target 'canada post stamp price', the largest cluster) vs total cost "
        "of mailing a letter yourself or via a service. cost-to-mail now links to the reference page and "
        "no longer lists the stamp-price keywords. Watch Search Console for both ranking on one query."
    ),
}

LEGACY = {
    "send-a-letter-online": ("how-to-send-a-letter-online-in-canada", "How to Send a Letter Online in Canada (2026)"),
    "cost-to-mail": ("what-it-costs-to-mail-a-letter-in-canada", "What It Actually Costs to Mail a Letter in Canada in 2026"),
    "legal-notice": ("can-you-mail-a-legal-notice-online", "Can You Mail a Legal Notice or Demand Letter Online?"),
    "api-guide": ("send-physical-mail-from-your-app", "Sending Physical Mail From Your App: A Practical API Guide"),
}

# The money page. Its copy is mostly UI, so use the title and description that
# the page ships with (src/app/layout.tsx) plus the product facts it states.
HOME = (
    "Send a Letter Online in Canada. Send a real letter in the mail from your computer. "
    "Write or upload, add addresses, and we print and mail it anywhere in Canada: printing, "
    "postage and tax included. No account, no subscription, no minimum. Standard letter in a "
    "#10 window envelope, folded, with Canada Post stamps."
)


def clean_inline(s: str) -> str:
    s = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", s)
    return s.replace("**", "")


def guide_text(g: dict) -> str:
    parts = [g["title"], g["answer"]]
    for sec in g["sections"]:
        parts.append(sec["h2"])
        for b in sec["blocks"]:
            if "p" in b or "note" in b:
                parts.append(b.get("p") or b["note"])
            elif "ul" in b or "ol" in b:
                parts.extend(b.get("ul") or b["ol"])
            elif "table" in b:
                parts.append(" ".join(b["table"]["headers"]))
                parts.extend(" ".join(r) for r in b["table"]["rows"])
    return clean_inline("\n".join(parts))


def legacy_text(pid: str) -> str:
    slug, title = LEGACY[pid]
    src = (POSTS / f"{slug}.tsx").read_text(encoding="utf-8")
    src = re.sub(r"^import .*$", "", src, flags=re.M)
    src = re.sub(r"<[^>]+>", " ", src)  # JSX tags
    src = re.sub(r"\{\s*\"\s*\"\s*\}", " ", src)  # {" "}
    src = re.sub(r"[{}\[\]();=>]|&apos;|&amp;", " ", src)
    src = re.sub(r"\b(export default function Post|return|headers|rows|key|href)\b", " ", src)
    return title + "\n" + re.sub(r"\s+", " ", src)


def load_guides() -> list:
    return [json.loads(p.read_text(encoding="utf-8")) for p in sorted(GUIDES.glob("*.json"))]


def prep(text: str) -> str:
    return "passage: " + re.sub(r"\s+", " ", GENERIC.sub(" ", text)).strip()


def unit(v: np.ndarray) -> np.ndarray:
    return v / np.linalg.norm(v, axis=-1, keepdims=True)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["baseline", "wave"])
    ap.add_argument("n", nargs="?", type=int, default=0)
    ap.add_argument(
        "--accept",
        type=int,
        default=None,
        help="highest wave already accepted into the baseline (default: n-1)",
    )
    a = ap.parse_args()

    guides = load_guides()
    accepted = (a.n - 1) if a.accept is None else a.accept
    if a.mode == "baseline":
        accepted, drafts = 0, []
    else:
        drafts = [g for g in guides if g["wave"] == a.n]
        if not drafts:
            print(f"no guides in wave {a.n}")
            return 1

    base_docs = [("home", "Home page", HOME)]
    base_docs += [(pid, LEGACY[pid][1], legacy_text(pid)) for pid in LEGACY]
    base_docs += [(g["id"], g["title"], guide_text(g)) for g in guides if 1 <= g["wave"] <= accepted]

    model = SentenceTransformer("intfloat/e5-large")

    def enc(texts):
        return unit(model.encode([prep(t) for t in texts], normalize_embeddings=True, show_progress_bar=False))

    E = enc([d[2] for d in base_docs])
    centre = unit(E.mean(axis=0))
    sims = E @ centre
    mu, sd = float(sims.mean()), float(sims.std(ddof=1))

    out = {
        "mode": a.mode,
        "wave": a.n,
        "accepted_through": accepted,
        "baseline": {
            "n": len(base_docs),
            "mean": round(mu, 4),
            "sd": round(sd, 4),
            "small_sample": len(base_docs) < SMALL_N,
            "pages": [{"id": d[0], "sim": round(float(s), 4)} for d, s in zip(base_docs, sims)],
        },
        "drafts": [],
    }
    note = "   [small sample: z-scores are indicative only]" if len(base_docs) < SMALL_N else ""
    print(f"\nBaseline: n={len(base_docs)}  mean={mu:.4f}  sd={sd:.4f}{note}")
    for d, s in sorted(zip(base_docs, sims), key=lambda x: x[1]):
        print(f"  {s:.4f}  {d[0]}")

    if drafts:
        D = enc([guide_text(g) for g in drafts])
        dsims = D @ centre
        # With a tiny baseline the spread is meaningless (a handful of pages sit
        # almost on top of each other), so z-scores come out absurd. Until the
        # baseline reaches SMALL_N pages, score drafts against the pooled spread
        # of baseline + this wave around the baseline centre instead.
        zmu, zsd, pooled = mu, sd, False
        if len(base_docs) < SMALL_N:
            allsims = np.concatenate([sims, dsims])
            zmu, zsd, pooled = float(allsims.mean()), float(allsims.std(ddof=1)), True
            print(f"\n[z-scores use the pooled spread: mean={zmu:.4f} sd={zsd:.4f}, baseline has {len(base_docs)} pages]")
            out["z_reference"] = {"pooled": True, "mean": round(zmu, 4), "sd": round(zsd, 4)}
        rows = []
        print(f"\nWave {a.n} drafts vs baseline")
        print(f"{'id':44} {'sim':>6} {'z':>6} {'nearest':>8}  nearest page")
        for i, g in enumerate(drafts):
            z = (float(dsims[i]) - zmu) / zsd if zsd else 0.0
            # nearest among the baseline AND the other drafts in this wave
            cands = [(d[0], float(D[i] @ E[k])) for k, d in enumerate(base_docs)]
            cands += [(drafts[j]["id"], float(D[i] @ D[j])) for j in range(len(drafts)) if j != i]
            npid, nsim = max(cands, key=lambda c: c[1])
            verdict = []
            floor = Z_SATELLITE if g["hub"] in SATELLITE_HUBS else Z_REJECT
            if z < floor:
                verdict.append(f"REJECT: z<{floor:g}")
            elif z < Z_REJECT:
                verdict.append(f"satellite: z within {Z_SATELLITE:g} floor")
            if nsim > DUP_REJECT:
                if frozenset({g["id"], npid}) in REVIEWED:
                    verdict.append("near-duplicate, accepted after review")
                else:
                    verdict.append("REJECT: near-duplicate")
            rows.append(
                {
                    "id": g["id"],
                    "hub": g["hub"],
                    "sim": round(float(dsims[i]), 4),
                    "z": round(z, 2),
                    "nearest": npid,
                    "nearest_sim": round(nsim, 4),
                    "verdict": verdict or ["ok"],
                }
            )
            print(f"{g['id']:44} {dsims[i]:6.3f} {z:6.2f} {nsim:8.3f}  {npid}  {'; '.join(verdict)}")
        out["drafts"] = rows

        E2 = np.vstack([E, D])
        centre2 = unit(E2.mean(axis=0))
        sims2 = E2 @ centre2
        out["after_wave"] = {
            "centre_cosine_to_old": round(float(centre @ centre2), 5),
            "sd_before": round(sd, 4),
            "sd_after": round(float(sims2.std(ddof=1)), 4),
            "mean_before": round(mu, 4),
            "mean_after": round(float(sims2.mean()), 4),
        }
        print(
            f"\nCentre drift: cosine(old, new) = {out['after_wave']['centre_cosine_to_old']}  "
            f"(want ~0.999)   spread {sd:.4f} -> {out['after_wave']['sd_after']:.4f}"
        )

    REPORTS.mkdir(exist_ok=True)
    name = "baseline.json" if a.mode == "baseline" else f"wave-{a.n}.json"
    (REPORTS / name).write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(f"\nwrote scripts/topical/reports/{name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
