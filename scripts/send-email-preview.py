"""Send the invoice and welcome emails to yourself, to see them in a real inbox.

  PREVIEW_TO=you@example.com RESEND_API_KEY=re_... python scripts/send-email-preview.py <dir>

The recipient and key come from the environment, never from this file.
"""
import base64
import json
import os
import sys
import urllib.request

d = sys.argv[1]
to, key = os.environ["PREVIEW_TO"], os.environ["RESEND_API_KEY"]


def send(subject, html, attachments=None):
    body = {"from": "sendletter <noreply@sendletter.app>", "to": to, "reply_to": "support@sendletter.app", "subject": subject, "html": html}
    if attachments:
        body["attachments"] = attachments
    req = urllib.request.Request("https://api.resend.com/emails", json.dumps(body).encode(), {"Authorization": "Bearer " + key, "Content-Type": "application/json", "User-Agent": "email-preview/1"})
    print(urllib.request.urlopen(req).read().decode()[:80])


pdf = base64.b64encode(open(d + "/invoice.pdf", "rb").read()).decode()
send("[PREVIEW] Invoice SL-2026-000007: $7.58 paid", open(d + "/invoice.html", encoding="utf-8").read(), [{"filename": "SL-2026-000007.pdf", "content": pdf}])
send("[PREVIEW] Welcome to sendletter: your first letter is on its way", open(d + "/welcome.html", encoding="utf-8").read())
