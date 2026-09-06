#!/usr/bin/env python3
"""Bundle src/ into a single self-contained index.html.

    python3 build.py            # writes ./index.html
    python3 build.py --check    # build to memory only and report size

Template placeholders in src/index.template.html:
    <!--__CSS__-->   -> <style> src/styles.css </style>
    <!--__JS__-->    -> <script> engine.js + widgets.js + levels/*.js (sorted) + main.js </script>
"""
import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
OUT = ROOT / "index.html"


def read(p):
    return p.read_text(encoding="utf-8")


def js_bundle():
    parts = [SRC / "engine.js"]
    if (SRC / "widgets.js").is_file():
        parts.append(SRC / "widgets.js")
    parts += sorted((SRC / "levels").glob("*.js"))
    parts.append(SRC / "main.js")
    chunks = []
    for p in parts:
        if not p.is_file():
            sys.exit("missing %s" % p.relative_to(ROOT))
        code = read(p).replace("</script>", "<\\/script>")
        chunks.append("// ---- %s ----\n%s" % (p.relative_to(ROOT), code))
    return "\n\n".join(chunks)


def build():
    template = read(SRC / "index.template.html")
    css = read(SRC / "styles.css").replace("</style>", "<\\/style>")
    html = template.replace("<!--__CSS__-->", "<style>\n%s\n</style>" % css)
    html = html.replace("<!--__JS__-->", "<script>\n%s\n</script>" % js_bundle())
    for ph in ("<!--__CSS__-->", "<!--__JS__-->"):
        if ph in html:
            sys.exit("placeholder %s not replaced" % ph)
    return html


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()
    html = build()
    if not args.check:
        OUT.write_text(html, encoding="utf-8")
    print("%s: %.1f KB%s" % (OUT.name, len(html.encode("utf-8")) / 1024, " (not written)" if args.check else ""))


if __name__ == "__main__":
    main()
