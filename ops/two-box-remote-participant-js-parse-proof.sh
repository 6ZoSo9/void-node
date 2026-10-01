#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ALIEN="${ALIEN:-}"
REMOTE_NODE_BASE="${REMOTE_NODE_BASE:-}"

MARKER="VOID_TWO_BOX_LEGACY_PROOF_EXPLICIT_TARGET_V1"

require_explicit() {
  local name="$1"
  local value="${2:-}"
  if [ -z "$value" ]; then
    echo "$MARKER HOLD: missing explicit $name" >&2
    exit 2
  fi
}

guard_targets() {
  local guard
  guard="$(printf '%s\n' "$@" | tr '[:upper:]' '[:lower:]')"
  case "$guard" in
    *100.122.79.39*|*zoso-alienware-aurora-r7.taila47fd.ts.net*|*alienware*)
      echo "$MARKER HOLD: retired Alienware target is forbidden" >&2
      exit 2
      ;;
  esac
}

require_explicit "ALIEN" "${ALIEN:-}"
require_explicit "REMOTE_NODE_BASE" "${REMOTE_NODE_BASE:-}"
guard_targets "$ALIEN" "$REMOTE_NODE_BASE"
export ALIEN REMOTE_NODE_BASE

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
{
  grep -nF 'window.__void_participant_account_qs' "$OUT/participant.main.js" || true
  grep -nF 'switchTab(' "$OUT/participant.main.js" || true
  grep -nF 'setInterval(refresh, 3000)' "$OUT/participant.main.js" || true
  grep -nF '/datanet/consume-view/' "$OUT/participant.main.js" || true
} | sed -n '1,120p'

echo
echo "[ok] two-box remote participant js parse proof green"
echo "[ok] proof bundle: $OUT"
