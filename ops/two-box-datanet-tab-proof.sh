#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ALIEN="${ALIEN:-zoso@100.122.79.39}"
REMOTE_HOST="${ALIEN##*@}"
REMOTE_NODE_BASE="${REMOTE_NODE_BASE:-http://$REMOTE_HOST:4100}"
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
    "Open raw JSON": "missing raw json button",
    "Plaintext": "missing plaintext section",
}
for needle, msg in needles.items():
    assert needle in html, msg
print("[ok] remote datanet viewer html looks right")
print(json.dumps({"ok": True, "checked": list(needles.keys())}, indent=2))
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
