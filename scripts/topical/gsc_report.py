"""Summarise scripts/topical/reports/gsc.json (written by scripts/gsc.mjs pull).

  node scripts/gsc.mjs pull 90        # once, or to refresh
  python scripts/topical/gsc_report.py

Shows traffic by week, by section of the site, the pages and queries that matter, and
queries sitting on page 2 (positions 8-20) with real impressions: the cheapest wins.
"""
import json
import sys as _s
_s.stdout.reconfigure(encoding="utf-8")
import re
import sys
from collections import defaultdict
from pathlib import Path

D = json.loads((Path(__file__).resolve().parent / "reports" / "gsc.json").read_text(encoding="utf-8"))
SITE = "https://sendletter.app"


def path(u): return u.replace(SITE, "") or "/"


def section(p):
    if p == "/": return "home"
    if p.startswith("/mail-to-canada"): return "origin (en)"
    if re.match(r"^/[a-z]{2}(-[A-Za-z]+)?/mail-to-canada", p) or "/mail-to-canada" in p: return "origin (other langs)"
    if p.startswith("/blog/") or p == "/blog": return "blog/guides"
    if p.startswith("/fr/"): return "french"
    if p.startswith("/docs"): return "docs"
    return "other"


def tot(rows):
    c = sum(r["clicks"] for r in rows); i = sum(r["impressions"] for r in rows)
    pos = sum(r["position"] * r["impressions"] for r in rows) / i if i else 0
    return c, i, (c / i if i else 0), pos


c, i, ctr, pos = tot(D["daily"]["rows"])
print(f"{D['site']}  {D['daily']['start']} -> {D['daily']['end']}  ({len(D['daily']['rows'])} days with data)")
print(f"TOTAL clicks {c:.0f}  impressions {i:.0f}  ctr {ctr:.2%}  avg position {pos:.1f}\n")

print("by week (clicks / impressions):")
wk = defaultdict(lambda: [0, 0])
for r in sorted(D["daily"]["rows"], key=lambda r: r["keys"][0]):
    d = r["keys"][0]
    # week bucket = ISO week start (Monday)
    import datetime
    dt = datetime.date.fromisoformat(d); k = (dt - datetime.timedelta(days=dt.weekday())).isoformat()
    wk[k][0] += r["clicks"]; wk[k][1] += r["impressions"]
for k, (a, b) in sorted(wk.items()): print(f"  {k}  {a:5.0f} / {b:6.0f}  {'#' * min(60, int(b / max(1, max(v[1] for v in wk.values())) * 60))}")

print("\nby section:")
sec = defaultdict(list)
for r in D["pages"]["rows"]: sec[section(path(r["keys"][0]))].append(r)
for s, rows in sorted(sec.items(), key=lambda x: -sum(r["impressions"] for r in x[1])):
    c, i, ctr, pos = tot(rows); print(f"  {s:22s} pages {len(rows):3d}  clicks {c:5.0f}  impr {i:6.0f}  ctr {ctr:5.1%}  pos {pos:5.1f}")

print("\ntop pages by impressions:")
for r in sorted(D["pages"]["rows"], key=lambda r: -r["impressions"])[:25]:
    print(f"  {r['impressions']:6.0f} impr {r['clicks']:4.0f} clk  ctr {r['ctr']:5.1%}  pos {r['position']:5.1f}  {path(r['keys'][0])}")

print("\ntop queries by impressions:")
for r in sorted(D["queries"]["rows"], key=lambda r: -r["impressions"])[:40]:
    print(f"  {r['impressions']:6.0f} impr {r['clicks']:4.0f} clk  pos {r['position']:5.1f}  {r['keys'][0]}")

print("\nquery on page 2 (pos 8-20) with >= 5 impressions (page, query):")
opp = [r for r in D["pageQueries"]["rows"] if 8 <= r["position"] <= 20 and r["impressions"] >= 5]
for r in sorted(opp, key=lambda r: -r["impressions"])[:30]:
    print(f"  {r['impressions']:5.0f} impr pos {r['position']:5.1f}  {r['keys'][1][:50]:50s}  {path(r['keys'][0])}")

print("\ncountries (top 12):")
for r in sorted(D["countries"]["rows"], key=lambda r: -r["impressions"])[:12]:
    print(f"  {r['keys'][0]:5s} impr {r['impressions']:6.0f} clk {r['clicks']:4.0f} pos {r['position']:5.1f}")
print("\ndevices:", [(r["keys"][0], round(r["impressions"]), round(r["clicks"])) for r in D["devices"]["rows"]])

# Queries that hint at intent we have not written for: any query with impressions and no page above position 20.
print("\nqueries with impressions where our best position is worse than 20:")
best = defaultdict(lambda: 99)
imp = defaultdict(float)
for r in D["queries"]["rows"]:
    best[r["keys"][0]] = r["position"]; imp[r["keys"][0]] = r["impressions"]
for q, p in sorted(best.items(), key=lambda x: -imp[x[0]]):
    if p > 20 and imp[q] >= 3: print(f"  {imp[q]:5.0f} impr pos {p:5.1f}  {q}")
sys.stdout.flush()
