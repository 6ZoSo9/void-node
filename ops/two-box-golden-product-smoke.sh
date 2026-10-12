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
curl -fsS --max-time 8 "http://100.122.79.39:4100/health"
echo
' | tee "$OUT/remote.truth.txt"

step "[2] jobs submit product proof"
bash ops/two-box-remote-jobs-submit-product-proof.sh | tee "$OUT/jobs-submit-product-proof.log"

step "[3] datanet view proof"
bash ops/two-box-remote-datanet-view-proof.sh | tee "$OUT/datanet-view-proof.log"

step "[4] verify redundancy product proof"
bash ops/two-box-remote-verify-redundancy-product-proof.sh | tee "$OUT/verify-redundancy-product-proof.log"

step "[5] cross-machine lifecycle proof"
bash ops/two-box-cross-machine-datanet-lifecycle-proof.sh | tee "$OUT/cross-machine-lifecycle-proof.log"

step "[6] consumer fetch product proof"
bash ops/two-box-remote-consumer-fetch-product-proof.sh | tee "$OUT/consumer-fetch-product-proof.log"

step "[7] consume-view product proof"
bash ops/two-box-remote-consume-view-product-proof.sh | tee "$OUT/consume-view-product-proof.log"

step "[8] participant js parse proof"
bash ops/two-box-remote-participant-js-parse-proof.sh | tee "$OUT/participant-js-parse-proof.log"

step "[9] weighted pick2 mixed proof"
TOKEN="${TOKEN:-${VOID_AGENT_TOKEN:-${AGENT_TOKEN:-dev-agent-local-20260409}}}" bash ops/pick2-weighted-mixed-proof.sh | tee "$OUT/weighted-pick2-mixed-proof.log"

step "[10] datanet operator cycle apply"
APPLY=1 LIMIT="${LIMIT:-3}" WHO="${WHO:-zoso}" \
bash ops/two-box-datanet-operator-cycle.sh | tee "$OUT/datanet-operator-cycle.log"

step "[11] summarize"
python3 - "$OUT/jobs-submit-product-proof.log" "$OUT/datanet-view-proof.log" "$OUT/verify-redundancy-product-proof.log" "$OUT/cross-machine-lifecycle-proof.log" "$OUT/consumer-fetch-product-proof.log" "$OUT/consume-view-product-proof.log" "$OUT/participant-js-parse-proof.log" "$OUT/weighted-pick2-mixed-proof.log" "$OUT/datanet-operator-cycle.log" <<'PY'
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
    obj = extract_json_after_marker(txt, "=== [3] verify remote product surfaces from Precision ===") or {}
    ok = "[ok] two-box remote jobs submit product proof green" in txt
    return {
        "ok": ok,
        "dataset_seen_in_recent_runner_activity": bool(obj.get("dataset_seen_in_recent_runner_activity")),
    }

def parse_view(txt: str):
    obj = extract_json_after_marker(txt, "=== [6] summarize ===") or {}
    ok = "[ok] two-box remote datanet view proof green" in txt
    view_page_ok = "{'has_html': True, 'has_dataset_id': True, 'has_account': True, 'looks_like_view_page': True}" in txt
    return {
        "ok": ok,
        "view_page_ok": view_page_ok,
        "dataset_id": str(obj.get("dataset_id", "")),
    }

def parse_vr(txt: str):
    obj = extract_json_after_marker(txt, "=== [3] verify remote product surfaces ===") or {}
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

def parse_cross_machine(txt: str):
    obj = extract_json_after_marker(txt, "=== [6] summary ===") or {}
    ok = "[ok] two-box cross-machine datanet lifecycle proof green" in txt
    return {
        "ok": ok,
        "verify_hit": bool(obj.get("verify_hit")),
        "redundancy_hit": bool(obj.get("redundancy_hit")),
        "local_copy_hit": bool(obj.get("local_copy_hit")),
    }

def parse_consumer_fetch(txt: str):
    obj = extract_json_after_marker(txt, "=== [5] verify returned plaintext + local materialization on Alienware ===") or {}
    ok = "[ok] two-box remote consumer fetch product proof green" in txt
    return {
        "ok": ok,
        "fetch_plaintext_ok": bool(obj.get("fetch_plaintext_ok")),
        "local_copy_hit": bool(obj.get("local_copy_hit")),
    }

def parse_consume_view(txt: str):
    obj = extract_json_after_marker(txt, "=== [5] verify remote consume-view page + local materialization ===") or {}
    ok = "[ok] two-box remote consume-view product proof green" in txt
    return {
        "ok": ok,
        "has_html": bool(obj.get("has_html")),
        "has_title": bool(obj.get("has_title")),
        "has_dataset_id": bool(obj.get("has_dataset_id")),
        "has_plaintext": bool(obj.get("has_plaintext")),
        "local_copy_hit": bool(obj.get("local_copy_hit")),
        "local_job_id_ok": bool(obj.get("local_job_id_ok")),
        "local_job_plaintext_ok": bool(obj.get("local_job_plaintext_ok")),
    }

def parse_participant_js(txt: str):
    ok = "[ok] two-box remote participant js parse proof green" in txt
    parse_ok = "=== [4] parse-check emitted browser js ===" in txt and "SyntaxError" not in txt
    return {
        "ok": ok,
        "parse_ok": parse_ok,
    }

def parse_weighted_pick2(txt: str):
    ok = '"all_policies_weighted": true' in txt and '"good_tasks_should_win": true' in txt and '"bad_rejects_should_appear": true' in txt
    has_summary = "=== summary ===" in txt
    return {
        "ok": ok,
        "has_summary": has_summary,
    }

def parse_datanet_operator_cycle(txt: str):
    ok = '[ok] proof bundle:' in txt and '"expected_after_remote_only_jobs_count"' in txt and '"fetched_or_materialized_count"' in txt
    applied = '=== [3] bounded materialize ===' in txt or '=== [3] bounded materialize apply ===' in txt
    return {
        "ok": ok,
        "applied": applied,
    }

jobs_txt = Path(sys.argv[1]).read_text()
view_txt = Path(sys.argv[2]).read_text()
vr_txt = Path(sys.argv[3]).read_text()
cm_txt = Path(sys.argv[4]).read_text()
cf_txt = Path(sys.argv[5]).read_text()
cv_txt = Path(sys.argv[6]).read_text()
pj_txt = Path(sys.argv[7]).read_text()
wp_txt = Path(sys.argv[8]).read_text()
op_txt = Path(sys.argv[9]).read_text()

summary = {
    "jobs_submit_product_proof": parse_jobs_submit(jobs_txt),
    "datanet_view_proof": parse_view(view_txt),
    "verify_redundancy_product_proof": parse_vr(vr_txt),
    "cross_machine_lifecycle_proof": parse_cross_machine(cm_txt),
    "consumer_fetch_product_proof": parse_consumer_fetch(cf_txt),
    "consume_view_product_proof": parse_consume_view(cv_txt),
    "participant_js_parse_proof": parse_participant_js(pj_txt),
    "weighted_pick2_mixed_proof": parse_weighted_pick2(wp_txt),
    "datanet_operator_cycle_apply": parse_datanet_operator_cycle(op_txt),
}
summary["golden_ok"] = (
    summary["jobs_submit_product_proof"]["ok"] and
    summary["jobs_submit_product_proof"]["dataset_seen_in_recent_runner_activity"] and
    summary["datanet_view_proof"]["ok"] and
    summary["datanet_view_proof"]["view_page_ok"] and
    summary["verify_redundancy_product_proof"]["ok"] and
    summary["verify_redundancy_product_proof"]["latest_verified_dataset_ok"] and
    summary["verify_redundancy_product_proof"]["latest_redundancy_checked_dataset_ok"] and
    summary["cross_machine_lifecycle_proof"]["ok"] and
    summary["cross_machine_lifecycle_proof"]["verify_hit"] and
    summary["cross_machine_lifecycle_proof"]["redundancy_hit"] and
    summary["cross_machine_lifecycle_proof"]["local_copy_hit"] and
    summary["consumer_fetch_product_proof"]["ok"] and
    summary["consumer_fetch_product_proof"]["fetch_plaintext_ok"] and
    summary["consumer_fetch_product_proof"]["local_copy_hit"] and
    summary["consume_view_product_proof"]["ok"] and
    summary["consume_view_product_proof"]["has_html"] and
    summary["consume_view_product_proof"]["has_title"] and
    summary["consume_view_product_proof"]["has_dataset_id"] and
    summary["consume_view_product_proof"]["has_plaintext"] and
    summary["consume_view_product_proof"]["local_copy_hit"] and
    summary["consume_view_product_proof"]["local_job_id_ok"] and
    summary["consume_view_product_proof"]["local_job_plaintext_ok"] and
    summary["participant_js_parse_proof"]["ok"] and
    summary["participant_js_parse_proof"]["parse_ok"] and
    summary["weighted_pick2_mixed_proof"]["ok"] and
    summary["weighted_pick2_mixed_proof"]["has_summary"] and
    summary["datanet_operator_cycle_apply"]["ok"] and
    summary["datanet_operator_cycle_apply"]["applied"]
)
print(json.dumps(summary, indent=2))
if not summary["golden_ok"]:
    raise SystemExit("FAIL: golden product smoke did not pass cleanly")
PY

echo
echo "[ok] two-box golden product smoke green"
echo "[ok] proof bundle: $OUT"
