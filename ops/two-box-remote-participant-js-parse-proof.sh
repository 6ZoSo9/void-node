#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ALIEN="${ALIEN:-zoso@100.122.79.39}"
REMOTE_NODE_BASE="${REMOTE_NODE_BASE:-http://100.122.79.39:4100}"
ACCOUNT="${ACCOUNT:-participant-consume-view-proof-user-20260402-220336}"
OUT="${OUT:-/tmp/two-box-remote-participant-js-parse-proof-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

echo "=== [1] local + remote truth ==="
git branch --show-current | tee "$OUT/local.branch.txt"
git rev-parse --short HEAD | tee "$OUT/local.head.txt"
git describe --tags --abbrev=0 2>/dev/null | tee "$OUT/local.tag.txt" || true
ssh "$ALIEN" '
set -euo pipefail
cd "$HOME/dev/void-node"
echo "--- remote branch ---"
git branch --show-current
echo "--- remote head ---"
git rev-parse --short HEAD
echo "--- remote latest tag ---"
git describe --tags --abbrev=0 2>/dev/null || true
' | tee "$OUT/remote.truth.txt"

echo
echo "=== [2] fetch remote participant html ==="
URL="$REMOTE_NODE_BASE/participant?account=$ACCOUNT"
echo "$URL" | tee "$OUT/url.txt"
curl -fsS --max-time 20 "$URL" > "$OUT/participant.html"
wc -c "$OUT/participant.html" | tee "$OUT/html.bytes.txt"

echo
echo "=== [3] extract main inline script ==="
python3 - "$OUT/participant.html" "$OUT/participant.main.js" <<'PY'
from pathlib import Path
import re, sys
html = Path(sys.argv[1]).read_text(encoding="utf-8", errors="replace")
scripts = re.findall(r'<script>(.*?)</script>', html, flags=re.S)
if not scripts:
    raise SystemExit("FAIL: no inline script blocks found")
main = max(scripts, key=len)
Path(sys.argv[2]).write_text(main, encoding="utf-8")
print({"script_blocks": len(scripts), "main_js_bytes": len(main)})
PY

echo
echo "=== [4] parse-check emitted browser js ==="
node --check "$OUT/participant.main.js"

echo
echo "=== [5] sanity grep ==="
grep -nE 'window.__void_participant_account_qs|switchTab\\(|setInterval\\(refresh, 3000\\)|/datanet/consume-view/' "$OUT/participant.main.js" | sed -n '1,120p' || true

echo
echo "[ok] two-box remote participant js parse proof green"
echo "[ok] proof bundle: $OUT"
