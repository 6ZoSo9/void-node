#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ALIEN="${ALIEN:-zoso@100.122.79.39}"
OUT="${OUT:-/tmp/two-box-golden-product-smoke-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

step() {
  echo
  echo "=== $1 ==="
}

step "[1] local + remote truth"
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
echo "--- remote health ---"
curl -fsS --max-time 8 http://127.0.0.1:4100/health
echo
' | tee "$OUT/remote.truth.txt"

step "[2] jobs submit product proof"
bash ops/two-box-remote-jobs-submit-product-proof.sh | tee "$OUT/jobs-submit-product-proof.log"

step "[3] datanet view proof"
bash ops/two-box-remote-datanet-view-proof.sh | tee "$OUT/datanet-view-proof.log"

step "[4] verify redundancy product proof"
bash ops/two-box-remote-verify-redundancy-product-proof.sh | tee "$OUT/verify-redundancy-product-proof.log"

step "[5] summarize"
python3 - "$OUT/jobs-submit-product-proof.log" "$OUT/datanet-view-proof.log" "$OUT/verify-redundancy-product-proof.log" <<'PY'
from pathlib import Path
import json
import sys

def extract_json_after_marker(text: str, marker: str):
    pos = text.find(marker)
    if pos < 0:
        return None
    sub = text[pos + len(marker):]
    start = sub.find("{")
    if start < 0:
        return None
    depth = 0
    in_str = False
    esc = False
    for idx, ch in enumerate(sub[start:], start=start):
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
        else:
            if ch == '"':
                in_str = True
            elif ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    return json.loads(sub[start:idx+1])
    return None

def parse_jobs_submit(txt: str):
    obj = extract_json_after_marker(
        txt,
        "=== [3] verify remote product surfaces from Precision ==="
    ) or {}
    ok = "[ok] two-box remote jobs submit product proof green" in txt
    return {
        "ok": ok,
        "account": str(obj.get("account", "")),
        "dataset_seen_in_recent_runner_activity": bool(obj.get("dataset_seen_in_recent_runner_activity")),
    }

def parse_view(txt: str):
    obj = extract_json_after_marker(txt, "=== [6] summarize ===") or {}
    ok = "[ok] two-box remote datanet view proof green" in txt
    view_page_ok = "{'has_html': True, 'has_dataset_id': True, 'has_account': True, 'looks_like_view_page': True}" in txt
    return {
        "ok": ok,
        "dataset_id": str(obj.get("dataset_id", "")),
        "view_page_ok": view_page_ok,
    }

def parse_vr(txt: str):
    obj = extract_json_after_marker(
        txt,
        "=== [3] verify remote product surfaces ==="
    ) or {}
    ok = "[ok] two-box remote verify redundancy product proof green" in txt
    return {
        "ok": ok,
        "latest_verified_dataset_ok": bool(obj.get("latest_verified_dataset_ok")),
        "latest_redundancy_checked_dataset_ok": bool(obj.get("latest_redundancy_checked_dataset_ok")),
        "participant_has_open_verify": bool(obj.get("participant_has_open_verify")),
        "participant_has_open_check": bool(obj.get("participant_has_open_check")),
        "verify_seen_in_recent_runner_activity": bool(obj.get("verify_seen_in_recent_runner_activity")),
        "redundancy_seen_in_recent_runner_activity": bool(obj.get("redundancy_seen_in_recent_runner_activity")),
    }

jobs_txt = Path(sys.argv[1]).read_text()
view_txt = Path(sys.argv[2]).read_text()
vr_txt = Path(sys.argv[3]).read_text()

summary = {
    "jobs_submit_product_proof": parse_jobs_submit(jobs_txt),
    "datanet_view_proof": parse_view(view_txt),
    "verify_redundancy_product_proof": parse_vr(vr_txt),
}
summary["golden_ok"] = (
    summary["jobs_submit_product_proof"]["ok"] and
    summary["jobs_submit_product_proof"]["dataset_seen_in_recent_runner_activity"] and
    summary["datanet_view_proof"]["ok"] and
    summary["datanet_view_proof"]["view_page_ok"] and
    summary["verify_redundancy_product_proof"]["ok"] and
    summary["verify_redundancy_product_proof"]["latest_verified_dataset_ok"] and
    summary["verify_redundancy_product_proof"]["latest_redundancy_checked_dataset_ok"] and
    summary["verify_redundancy_product_proof"]["participant_has_open_verify"] and
    summary["verify_redundancy_product_proof"]["participant_has_open_check"] and
    summary["verify_redundancy_product_proof"]["verify_seen_in_recent_runner_activity"] and
    summary["verify_redundancy_product_proof"]["redundancy_seen_in_recent_runner_activity"]
)
print(json.dumps(summary, indent=2))
if not summary["golden_ok"]:
    raise SystemExit("FAIL: golden product smoke did not pass cleanly")
PY

echo
echo "[ok] two-box golden product smoke green"
echo "[ok] proof bundle: $OUT"
