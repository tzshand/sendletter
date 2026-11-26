"""Fetch the rendered text of every URL in the live sitemap, so the site's embedding
shape is measured on what a crawler actually sees (not on source files).

  python scripts/topical/fetch_site.py [out.json]      # default: scripts/topical/reports/site-pages.json

Uses only the standard library. Main content is the <main>/<article> element when
present, else the body minus scripts, styles, nav, header and footer.
"""
import html
import json
import re
import sys
import urllib.request
from pathlib import Path

SITE = "https://sendletter.app"
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent / "reports" / "site-pages.json"
UA = {"User-Agent": "sendletter-shape-audit/1 (+https://sendletter.app)"}


def get(url: str) -> str:
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
        return r.read().decode("utf-8", "replace")


def text_of(page: str) -> dict:
    lang = (re.search(r'<html[^>]*\blang="([^"]+)"', page) or [None, ""])[1]
    # a sub-tree can carry its own lang (the French and origin pages scope lang on a wrapper div)
    inner_lang = (re.search(r'<div[^>]*\blang="([^"]+)"', page) or [None, ""])[1]
    title = html.unescape((re.search(r"<title>(.*?)</title>", page, re.S) or [None, ""])[1]).strip()
    desc = html.unescape((re.search(r'<meta name="description" content="(.*?)"', page, re.S) or [None, ""])[1]).strip()
    body = re.sub(r"(?is)<(script|style|noscript|svg|nav|header|footer)\b.*?</\1>", " ", page)
    m = re.search(r"(?is)<(main|article)\b.*?</\1>", body)
    chunk = m.group(0) if m else body
    chunk = re.sub(r"(?s)<[^>]+>", " ", chunk)
    chunk = re.sub(r"\s+", " ", html.unescape(chunk)).strip()
    return {"lang": inner_lang or lang, "title": title, "description": desc, "text": chunk}


def main() -> None:
    urls = re.findall(r"<loc>(.*?)</loc>", get(f"{SITE}/sitemap.xml"))
    pages = []
    for u in urls:
        try:
            d = text_of(get(u))
        except Exception as e:  # keep going: one bad page should not stop an audit
            print("skip", u, e)
            continue
        d["url"] = u
        d["path"] = u.replace(SITE, "") or "/"
        pages.append(d)
        print(f"{len(d['text']):6d} chars  {d['lang'] or '?':8s} {d['path']}")
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(pages, ensure_ascii=False, indent=1), encoding="utf-8")
    print("wrote", OUT, len(pages), "pages")


if __name__ == "__main__":
    main()
