#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ALIEN="${ALIEN:-}"
REMOTE_NODE_BASE="${REMOTE_NODE_BASE:-}"

MARKER="VOID_TWO_BOX_LEGACY_PROOF_EXPLICIT_TARGET_V1"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
source "$SCRIPT_DIR/lib/void-two-box-legacy-proof-admission-v1.sh"
void_two_box_validate_ssh_destination "${ALIEN:-}"
void_two_box_validate_http_origin "REMOTE_NODE_BASE" "${REMOTE_NODE_BASE:-}"
void_two_box_guard_retired "${ALIEN:-}" "${REMOTE_NODE_BASE:-}"
void_two_box_require_source_parity_and_bind_remote "$ALIEN" "$REMOTE_NODE_BASE"

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

ACCOUNT="${ACCOUNT:-participant-copy-actions-proof-user}"
OUT="${OUT:-/tmp/two-box-remote-participant-copy-actions-proof-$(date +%Y%m%d-%H%M%S)}"
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
echo "=== [3] verify copy/share affordances in emitted html ==="
python3 - "$OUT/participant.html" <<'PY' | tee "$OUT/summary.json"
import json, sys
html = open(sys.argv[1], "r", encoding="utf-8").read()
summary = {
    "ok": (
        'id="latestDatasetCopyIdHero"' in html and
        'id="latestDatasetCopyLinkHero"' in html and
        'window.__void_copyText = copyText;' in html and
        'Copied dataset id.' in html and
        'Copied open link.' in html and
        'Copy ID' in html and
        'Copy Link' in html
    ),
    "has_latest_copy_id": 'id="latestDatasetCopyIdHero"' in html,
    "has_latest_copy_link": 'id="latestDatasetCopyLinkHero"' in html,
    "has_copy_helper": 'window.__void_copyText = copyText;' in html,
    "has_copy_id_text": 'Copied dataset id.' in html,
    "has_copy_link_text": 'Copied open link.' in html,
    "has_copy_id_button_text": 'Copy ID' in html,
    "has_copy_link_button_text": 'Copy Link' in html,
}
print(json.dumps(summary, indent=2))
if not summary["ok"]:
    raise SystemExit("FAIL: participant copy/share affordances not present")
PY

echo
echo "[ok] two-box remote participant copy actions proof green"
echo "[ok] proof bundle: $OUT"
