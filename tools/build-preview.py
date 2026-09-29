#!/usr/bin/env python3
"""Build a single-page preview of the site for sharing as a claude.ai artifact.

The site itself needs no build: `public/` is what Firebase serves. This only
exists because the artifact viewer wraps a page in its own <html>/<head>/<body>
and wants the page's CSS and JS inline, so it:

  · drops the document skeleton (doctype, html, head, body, charset, viewport)
  · names the page "PocaPal"
  · inlines styles.css and app.js in place of their <link> and <script> tags

The images are published next to the page at the same relative paths
(assets/…), so nothing else changes. Nothing in public/ is modified.

    python3 tools/build-preview.py [out_dir]      # default: dist/preview
"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
PUB  = ROOT / 'public'
out  = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'dist' / 'preview'

html = (PUB / 'index.html').read_text(encoding='utf-8')
css  = (PUB / 'styles.css').read_text(encoding='utf-8')
js   = (PUB / 'app.js').read_text(encoding='utf-8')

def swap(pattern, repl, text):
    new, n = re.subn(pattern, lambda _: repl, text, count=1, flags=re.I)
    if n != 1:
        sys.exit(f'build-preview: expected exactly one match for {pattern!r}')
    return new

html = swap(r'<title>.*?</title>', '<title>PocaPal</title>', html)
html = swap(r'<link rel="stylesheet" href="styles\.css">', f'<style>\n{css}\n</style>', html)
html = swap(r'<script src="app\.js"></script>', f'<script>\n{js}\n</script>', html)
for tag in (r'<!DOCTYPE html>', r'<html[^>]*>', r'</html>', r'<head>', r'</head>',
            r'<body>', r'</body>', r'<meta charset="utf-8">', r'<meta name="viewport"[^>]*>'):
    html = swap(tag, '', html)

out.mkdir(parents=True, exist_ok=True)
(out / 'index.html').write_text(html.strip() + '\n', encoding='utf-8')
assets = sorted(p.relative_to(PUB).as_posix() for p in (PUB / 'assets').rglob('*') if p.is_file())
print(f'{out / "index.html"}  ({len(html) // 1024} KB, {len(assets)} assets to publish from public/)')
