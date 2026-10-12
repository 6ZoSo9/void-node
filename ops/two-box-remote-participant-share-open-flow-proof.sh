#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

REMOTE_BASE="${REMOTE_BASE:-http://100.122.79.39:4100}"
ACCOUNT="${ACCOUNT:-zoso}"
OUT="${OUT:-/tmp/two-box-remote-participant-share-open-flow-proof-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

HTML="$OUT/participant.html"
JS="$OUT/participant.main.js"
HTML2="$OUT/participant.prefill.html"
JS2="$OUT/participant.prefill.main.js"

echo "=== [1] local truth ==="
git branch --show-current | tee "$OUT/local.branch.txt"
git rev-parse --short HEAD | tee "$OUT/local.head.txt"
git describe --tags --abbrev=0 2>/dev/null | tee "$OUT/local.tag.txt" || true
echo

echo "=== [2] fetch remote participant html ==="
URL="${REMOTE_BASE}/participant?account=${ACCOUNT}"
echo "$URL" | tee "$OUT/url.txt"
curl -fsS --max-time 20 "$URL" > "$HTML"
wc -c "$HTML" | tee "$OUT/html.size.txt"
echo

echo "=== [3] extract largest inline script ==="
HTML_PATH="$HTML" JS_PATH="$JS" python3 - <<'PY' | tee "$OUT/extract.json"
from pathlib import Path
import os, re, json
html = Path(os.environ["HTML_PATH"]).read_text(encoding="utf-8", errors="replace")
scripts = re.findall(r'<script>(.*?)</script>', html, flags=re.S)
if not scripts:
    raise SystemExit("no inline script blocks found")
main = max(scripts, key=len)
Path(os.environ["JS_PATH"]).write_text(main, encoding="utf-8")
print(json.dumps({"script_blocks": len(scripts), "main_js_bytes": len(main)}, indent=2))
PY
node --check "$JS"
echo

echo "=== [4] verify overview share/open anchors in emitted html/js ==="
HTML_PATH="$HTML" JS_PATH="$JS" python3 - <<'PY' | tee "$OUT/overview-share-open-summary.json"
import json, os
html = open(os.environ["HTML_PATH"], "r", encoding="utf-8").read()
js = open(os.environ["JS_PATH"], "r", encoding="utf-8").read()
summary = {
    "ok": (
        'id="latestDatasetOpenShareBtn"' in html and
        'id="latestDatasetShareBtn"' in html and
        'latestDatasetOpenShareBtn' in js and
        'latestDatasetShareBtn' in js and
        'buildLatestUsefulLinks' in js and
        'share_href' in js and
        ('Copied latest shared page link.' in js or 'Copied latest shared dataset page link.' in js)
    ),
    "has_open_shared_page_btn_html": 'id="latestDatasetOpenShareBtn"' in html,
    "has_copy_share_page_btn_html": 'id="latestDatasetShareBtn"' in html,
    "has_open_shared_page_js": 'latestDatasetOpenShareBtn' in js,
    "has_copy_share_page_js": 'latestDatasetShareBtn' in js,
    "has_build_latest_useful_links": 'buildLatestUsefulLinks' in js,
    "has_share_href": 'share_href' in js,
    "has_copy_message": ('Copied latest shared page link.' in js or 'Copied latest shared dataset page link.' in js),
}
print(json.dumps(summary, indent=2))
if not summary["ok"]:
    raise SystemExit("FAIL: overview share/open anchors missing")
PY
echo

echo "=== [5] verify query-account boot script is before main script ==="
HTML_PATH="$HTML" python3 - <<'PY' | tee "$OUT/qacct-boot-order-summary.json"
import json, os
html = open(os.environ["HTML_PATH"], "r", encoding="utf-8").read()
boot = 'window.__void_participant_account_qs='
main_anchor = '(async () => {'
boot_pos = html.find(boot)
main_pos = html.find(main_anchor)
summary = {
    "ok": boot_pos >= 0 and main_pos >= 0 and boot_pos < main_pos,
    "boot_pos": boot_pos,
    "main_script_pos": main_pos,
}
print(json.dumps(summary, indent=2))
if not summary["ok"]:
    raise SystemExit("FAIL: qAcct boot script does not precede main participant script")
PY
echo

echo "=== [6] fetch prefill variant page ==="
URL2="${REMOTE_BASE}/participant?account=${ACCOUNT}&open_dataset=ds_demo_prefill_123"
echo "$URL2" | tee "$OUT/url.prefill.txt"
curl -fsS --max-time 20 "$URL2" > "$HTML2"
HTML_PATH="$HTML2" JS_PATH="$JS2" python3 - <<'PY'
from pathlib import Path
import os, re
html = Path(os.environ["HTML_PATH"]).read_text(encoding="utf-8", errors="replace")
scripts = re.findall(r'<script>(.*?)</script>', html, flags=re.S)
if not scripts:
    raise SystemExit("no inline script blocks found in prefill variant")
main = max(scripts, key=len)
Path(os.environ["JS_PATH"]).write_text(main, encoding="utf-8")
PY
node --check "$JS2"
echo

echo "=== [7] verify prefill logic present for open_dataset ==="
HTML_PATH="$HTML2" JS_PATH="$JS2" python3 - <<'PY' | tee "$OUT/prefill-summary.json"
import json, os
html = open(os.environ["HTML_PATH"], "r", encoding="utf-8").read()
js = open(os.environ["JS_PATH"], "r", encoding="utf-8").read()
summary = {
    "ok": (
        'id="datanetOpenByIdInput"' in html and
        'id="datanetOpenByIdStatus"' in html and
        'params.get("open_dataset")' in js and
        'Preloaded dataset id from page link:' in js and
        'participant_share_link' in js
    ),
    "has_open_input": 'id="datanetOpenByIdInput"' in html,
    "has_open_status": 'id="datanetOpenByIdStatus"' in html,
    "has_open_dataset_qs_logic": 'params.get("open_dataset")' in js,
    "has_prefill_status_text": 'Preloaded dataset id from page link:' in js,
    "has_participant_share_link_logic": 'participant_share_link' in js,
}
print(json.dumps(summary, indent=2))
if not summary["ok"]:
    raise SystemExit("FAIL: prefill logic missing")
PY
echo

echo "[ok] two-box remote participant share/open flow proof green"
echo "[ok] proof bundle: $OUT"
