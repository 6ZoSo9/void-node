#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ALIEN="${ALIEN:-}"
REMOTE_HOST="${ALIEN##*@}"
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

ACCOUNT="${ACCOUNT:-zoso}"
OUT_DIR="${OUT_DIR:-/tmp/two-box-datanet-tab-proof-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT_DIR"

jget() {
  curl -fsS --max-time "${2:-20}" "$1"
}

echo "=== [1] remote participant datanet tab html ==="
jget "$REMOTE_NODE_BASE/participant#datanet" 20 > "$OUT_DIR/participant-datanet.html"
python3 - "$OUT_DIR/participant-datanet.html" <<'PY'
from pathlib import Path
import json, sys
html = Path(sys.argv[1]).read_text()
needles = {
    'data-tab="datanet"': 'missing datanet tab button',
    'id="pane-datanet"': 'missing datanet pane',
    'id="datanetFilterInput"': 'missing datanet filter input',
    'id="datanetSortSelect"': 'missing datanet sort select',
    'Local DataNet Datasets': 'missing datanet heading',
}
for needle, msg in needles.items():
    assert needle in html, msg
print("[ok] remote participant datanet tab html looks right")
print(json.dumps({"ok": True, "checked": list(needles.keys())}, indent=2))
PY

echo
echo "=== [2] remote local-jobs endpoint ==="
jget "$REMOTE_NODE_BASE/datanet/v1/local-jobs/recent?who=$ACCOUNT&limit=8" 20 > "$OUT_DIR/local-jobs-recent.json"
python3 - "$OUT_DIR/local-jobs-recent.json" <<'PY'
from pathlib import Path
import json, sys
o = json.loads(Path(sys.argv[1]).read_text())
assert o.get("ok") is True, "recent endpoint ok != true"
items = o.get("items") or []
assert len(items) > 0, "recent endpoint returned no items"
first = items[0]
assert str(first.get("dataset_id") or "").startswith("ds_"), "first dataset_id missing/bad"
assert str(first.get("viewer_url") or "").startswith("/datanet/view/"), "viewer_url missing/bad"
assert str(first.get("raw_json_url") or "").startswith("/datanet/v1/local-job/"), "raw_json_url missing/bad"
print("[ok] remote local-jobs endpoint returned usable items")
print(json.dumps({
    "ok": True,
    "count": len(items),
    "first_dataset_id": first.get("dataset_id"),
    "first_viewer_url": first.get("viewer_url"),
    "first_raw_json_url": first.get("raw_json_url"),
}, indent=2))
PY

DS="$(python3 - "$OUT_DIR/local-jobs-recent.json" <<'PY'
from pathlib import Path
import json, sys
o = json.loads(Path(sys.argv[1]).read_text())
items = o.get("items") or []
print(str(items[0].get("dataset_id") or "") if items else "")
PY
)"
echo "dataset=$DS"

echo
echo "=== [3] remote viewer + raw dataset endpoints ==="
jget "$REMOTE_NODE_BASE/datanet/view/$DS?who=$ACCOUNT" 20 > "$OUT_DIR/viewer.html"
python3 - "$OUT_DIR/viewer.html" <<'PY'
from pathlib import Path
import json, sys
html = Path(sys.argv[1]).read_text()
needles = {
    "DataNet Viewer": "missing viewer title",
    "Plaintext": "missing plaintext section",
}
for needle, msg in needles.items():
    assert needle in html, msg
assert ("Open raw JSON" in html or "Open Dataset JSON" in html), "missing raw json button"
print("[ok] remote datanet viewer html looks right")
print(json.dumps({"ok": True, "checked": list(needles.keys()) + ["Open raw JSON|Open Dataset JSON"]}, indent=2))
PY

jget "$REMOTE_NODE_BASE/datanet/v1/local-job/$DS?who=$ACCOUNT" 20 > "$OUT_DIR/local-job.json"
python3 - "$OUT_DIR/local-job.json" <<'PY'
from pathlib import Path
import json, sys
o = json.loads(Path(sys.argv[1]).read_text())
assert o.get("ok") is True, "raw local-job ok != true"
assert str(o.get("id") or "").startswith("ds_"), "raw local-job id missing/bad"
assert int(o.get("sizeBytes") or 0) >= 0, "raw local-job sizeBytes missing/bad"
assert isinstance(o.get("plaintext"), str), "raw local-job plaintext missing/bad"
print("[ok] remote raw local-job json looks right")
print(json.dumps({
    "ok": True,
    "id": o.get("id"),
    "sizeBytes": o.get("sizeBytes"),
    "sha256": o.get("sha256"),
}, indent=2))
PY

echo
echo "=== [4] success ==="
echo "[ok] two-box datanet tab proof green"
echo "out=$OUT_DIR"
