#!/usr/bin/env python3
"""Static server for local development.

Sends no-store so an edit is always what the browser gets. The stock
http.server relies on Last-Modified revalidation, and Chrome will happily
serve a heuristically cached copy of index.html or styles.css, which makes
a change look like it did not apply.
"""
import functools, http.server, socketserver, sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
ROOT = sys.argv[2] if len(sys.argv) > 2 else "public"   # or "peregrino"

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()
    def log_message(self, *a):
        pass

socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("", PORT), functools.partial(Handler, directory=ROOT)) as httpd:
    print(f"serving {ROOT}/ on http://localhost:{PORT}")
    httpd.serve_forever()
