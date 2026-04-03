#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ALIEN="${ALIEN:-zoso@100.122.79.39}"
OUT="${OUT:-/tmp/two-box-product-ui-smoke-$(date +%Y%m%d-%H%M%S)}"
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

step "[2] participant js parse proof"
bash ops/two-box-remote-participant-js-parse-proof.sh | tee "$OUT/participant-js-parse-proof.log"

step "[3] participant consume-view proof"
bash ops/two-box-remote-participant-consume-view-proof.sh | tee "$OUT/participant-consume-view-proof.log"

step "[4] cross-machine participant open workflow proof"
bash ops/two-box-cross-machine-participant-open-workflow-proof.sh | tee "$OUT/cross-machine-participant-open-workflow-proof.log"

step "[5] participant open-by-id workflow proof"
bash ops/two-box-remote-participant-open-by-id-proof.sh | tee "$OUT/participant-open-by-id-proof.log"

step "[6] participant copy actions proof"
bash ops/two-box-remote-participant-copy-actions-proof.sh | tee "$OUT/participant-copy-actions-proof.log"

step "[7] participant share/open flow proof"
bash ops/two-box-remote-participant-share-open-flow-proof.sh | tee "$OUT/participant-share-open-flow-proof.log"

step "[8] summarize"
python3 - "$OUT/participant-js-parse-proof.log" "$OUT/participant-consume-view-proof.log" "$OUT/cross-machine-participant-open-workflow-proof.log" "$OUT/participant-open-by-id-proof.log" "$OUT/participant-copy-actions-proof.log" "$OUT/participant-share-open-flow-proof.log" <<'PY'
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

def parse_participant_js(txt: str):
    ok = "[ok] two-box remote participant js parse proof green" in txt
    parse_ok = "=== [4] parse-check emitted browser js ===" in txt and "SyntaxError" not in txt
    return {"ok": ok, "parse_ok": parse_ok}

def parse_participant_consume_view(txt: str):
    shell = extract_json_after_marker(
        txt, "=== [5] verify participant shell exposes consume-view logic ==="
    ) or {}
    end2end = extract_json_after_marker(
        txt, "=== [6] fetch consume-view page from Alienware for the published dataset ==="
    ) or {}
    return {
        "ok": "[ok] two-box remote participant consume-view proof green" in txt,
        "shell_ok": bool(shell.get("ok")),
        "end_to_end_ok": bool(end2end.get("ok")),
    }

def parse_cross_machine_participant_open(txt: str):
    obj = extract_json_after_marker(
        txt, "=== [7] verify HTML render + local materialization on Alienware ==="
    ) or {}
    return {
        "ok": "[ok] two-box cross-machine participant open workflow proof green" in txt,
        "has_html": bool(obj.get("has_html")),
        "has_title": bool(obj.get("has_title")),
        "has_dataset_id": bool(obj.get("has_dataset_id")),
        "has_plaintext": bool(obj.get("has_plaintext")),
        "has_sha256": bool(obj.get("has_sha256")),
        "local_copy_hit": bool(obj.get("local_copy_hit")),
        "local_job_id_ok": bool(obj.get("local_job_id_ok")),
        "local_job_plaintext_ok": bool(obj.get("local_job_plaintext_ok")),
    }

def parse_open_by_id(txt: str):
    ui = extract_json_after_marker(
        txt, "=== [5] verify open-by-id UI + handler exists on participant page ==="
    ) or {}
    end2end = extract_json_after_marker(
        txt, "=== [6] simulate the open-by-id target end-to-end ==="
    ) or {}
    return {
        "ok": "[ok] two-box remote participant open-by-id proof green" in txt,
        "ui_ok": bool(ui.get("ok")),
        "has_input": bool(ui.get("has_input")),
        "has_button": bool(ui.get("has_button")),
        "has_status": bool(ui.get("has_status")),
        "has_consume_view_route": bool(ui.get("has_consume_view_route")),
        "has_handler_redirect": bool(ui.get("has_handler_redirect")),
        "has_empty_guard": bool(ui.get("has_empty_guard")),
        "has_bad_id_guard": bool(ui.get("has_bad_id_guard")),
        "has_error_guard": bool(ui.get("has_error_guard")),
        "end_to_end_ok": bool(end2end.get("ok")),
        "has_html": bool(end2end.get("has_html")),
        "has_title": bool(end2end.get("has_title")),
        "has_dataset_id": bool(end2end.get("has_dataset_id")),
        "has_plaintext": bool(end2end.get("has_plaintext")),
        "has_sha256": bool(end2end.get("has_sha256")),
        "local_copy_hit": bool(end2end.get("local_copy_hit")),
        "local_job_id_ok": bool(end2end.get("local_job_id_ok")),
        "local_job_plaintext_ok": bool(end2end.get("local_job_plaintext_ok")),
    }

def parse_copy_actions(txt: str):
    obj = extract_json_after_marker(
        txt, "=== [3] verify copy/share affordances in emitted html ==="
    ) or {}
    return {
        "ok": "[ok] two-box remote participant copy actions proof green" in txt,
        "html_ok": bool(obj.get("ok")),
        "has_latest_copy_id": bool(obj.get("has_latest_copy_id")),
        "has_latest_copy_link": bool(obj.get("has_latest_copy_link")),
        "has_copy_helper": bool(obj.get("has_copy_helper")),
        "has_copy_id_text": bool(obj.get("has_copy_id_text")),
        "has_copy_link_text": bool(obj.get("has_copy_link_text")),
        "has_copy_id_button_text": bool(obj.get("has_copy_id_button_text")),
        "has_copy_link_button_text": bool(obj.get("has_copy_link_button_text")),
    }

def parse_share_open_flow(txt: str):
    overview = extract_json_after_marker(
        txt, "=== [4] verify overview share/open anchors in emitted html/js ==="
    ) or {}
    boot = extract_json_after_marker(
        txt, "=== [5] verify query-account boot script is before main script ==="
    ) or {}
    prefill = extract_json_after_marker(
        txt, "=== [7] verify prefill logic present for open_dataset ==="
    ) or {}
    return {
        "ok": "[ok] two-box remote participant share/open flow proof green" in txt,
        "overview_ok": bool(overview.get("ok")),
        "has_open_shared_page_btn_html": bool(overview.get("has_open_shared_page_btn_html")),
        "has_copy_share_page_btn_html": bool(overview.get("has_copy_share_page_btn_html")),
        "has_open_shared_page_js": bool(overview.get("has_open_shared_page_js")),
        "has_copy_share_page_js": bool(overview.get("has_copy_share_page_js")),
        "has_open_dataset_qs": bool(overview.get("has_open_dataset_qs")),
        "has_datanet_hash": bool(overview.get("has_datanet_hash")),
        "has_copy_message": bool(overview.get("has_copy_message")),
        "boot_order_ok": bool(boot.get("ok")),
        "prefill_ok": bool(prefill.get("ok")),
        "has_open_input": bool(prefill.get("has_open_input")),
        "has_open_status": bool(prefill.get("has_open_status")),
        "has_open_dataset_qs_logic": bool(prefill.get("has_open_dataset_qs_logic")),
        "has_prefill_status_text": bool(prefill.get("has_prefill_status_text")),
    }

pj_txt = Path(sys.argv[1]).read_text()
pcv_txt = Path(sys.argv[2]).read_text()
cm_txt = Path(sys.argv[3]).read_text()
obi_txt = Path(sys.argv[4]).read_text()
copy_txt = Path(sys.argv[5]).read_text()
share_txt = Path(sys.argv[6]).read_text()

summary = {
    "participant_js_parse_proof": parse_participant_js(pj_txt),
    "participant_consume_view_proof": parse_participant_consume_view(pcv_txt),
    "cross_machine_participant_open_workflow_proof": parse_cross_machine_participant_open(cm_txt),
    "participant_open_by_id_workflow_proof": parse_open_by_id(obi_txt),
    "participant_copy_actions_proof": parse_copy_actions(copy_txt),
    "participant_share_open_flow_proof": parse_share_open_flow(share_txt),
}
summary["product_ui_ok"] = (
    summary["participant_js_parse_proof"]["ok"] and
    summary["participant_js_parse_proof"]["parse_ok"] and
    summary["participant_consume_view_proof"]["ok"] and
    summary["participant_consume_view_proof"]["shell_ok"] and
    summary["participant_consume_view_proof"]["end_to_end_ok"] and
    summary["cross_machine_participant_open_workflow_proof"]["ok"] and
    summary["cross_machine_participant_open_workflow_proof"]["has_html"] and
    summary["cross_machine_participant_open_workflow_proof"]["has_title"] and
    summary["cross_machine_participant_open_workflow_proof"]["has_dataset_id"] and
    summary["cross_machine_participant_open_workflow_proof"]["has_plaintext"] and
    summary["cross_machine_participant_open_workflow_proof"]["has_sha256"] and
    summary["cross_machine_participant_open_workflow_proof"]["local_copy_hit"] and
    summary["cross_machine_participant_open_workflow_proof"]["local_job_id_ok"] and
    summary["cross_machine_participant_open_workflow_proof"]["local_job_plaintext_ok"] and
    summary["participant_open_by_id_workflow_proof"]["ok"] and
    summary["participant_open_by_id_workflow_proof"]["ui_ok"] and
    summary["participant_open_by_id_workflow_proof"]["has_input"] and
    summary["participant_open_by_id_workflow_proof"]["has_button"] and
    summary["participant_open_by_id_workflow_proof"]["has_status"] and
    summary["participant_open_by_id_workflow_proof"]["has_consume_view_route"] and
    summary["participant_open_by_id_workflow_proof"]["has_handler_redirect"] and
    summary["participant_open_by_id_workflow_proof"]["has_empty_guard"] and
    summary["participant_open_by_id_workflow_proof"]["has_bad_id_guard"] and
    summary["participant_open_by_id_workflow_proof"]["has_error_guard"] and
    summary["participant_open_by_id_workflow_proof"]["end_to_end_ok"] and
    summary["participant_open_by_id_workflow_proof"]["has_html"] and
    summary["participant_open_by_id_workflow_proof"]["has_title"] and
    summary["participant_open_by_id_workflow_proof"]["has_dataset_id"] and
    summary["participant_open_by_id_workflow_proof"]["has_plaintext"] and
    summary["participant_open_by_id_workflow_proof"]["has_sha256"] and
    summary["participant_open_by_id_workflow_proof"]["local_copy_hit"] and
    summary["participant_open_by_id_workflow_proof"]["local_job_id_ok"] and
    summary["participant_open_by_id_workflow_proof"]["local_job_plaintext_ok"] and
    summary["participant_copy_actions_proof"]["ok"] and
    summary["participant_copy_actions_proof"]["html_ok"] and
    summary["participant_copy_actions_proof"]["has_latest_copy_id"] and
    summary["participant_copy_actions_proof"]["has_latest_copy_link"] and
    summary["participant_copy_actions_proof"]["has_copy_helper"] and
    summary["participant_copy_actions_proof"]["has_copy_id_text"] and
    summary["participant_copy_actions_proof"]["has_copy_link_text"] and
    summary["participant_copy_actions_proof"]["has_copy_id_button_text"] and
    summary["participant_copy_actions_proof"]["has_copy_link_button_text"] and
    summary["participant_share_open_flow_proof"]["ok"] and
    summary["participant_share_open_flow_proof"]["overview_ok"] and
    summary["participant_share_open_flow_proof"]["has_open_shared_page_btn_html"] and
    summary["participant_share_open_flow_proof"]["has_copy_share_page_btn_html"] and
    summary["participant_share_open_flow_proof"]["has_open_shared_page_js"] and
    summary["participant_share_open_flow_proof"]["has_copy_share_page_js"] and
    summary["participant_share_open_flow_proof"]["has_open_dataset_qs"] and
    summary["participant_share_open_flow_proof"]["has_datanet_hash"] and
    summary["participant_share_open_flow_proof"]["has_copy_message"] and
    summary["participant_share_open_flow_proof"]["boot_order_ok"] and
    summary["participant_share_open_flow_proof"]["prefill_ok"] and
    summary["participant_share_open_flow_proof"]["has_open_input"] and
    summary["participant_share_open_flow_proof"]["has_open_status"] and
    summary["participant_share_open_flow_proof"]["has_open_dataset_qs_logic"] and
    summary["participant_share_open_flow_proof"]["has_prefill_status_text"]
)
print(json.dumps(summary, indent=2))
if not summary["product_ui_ok"]:
    raise SystemExit("FAIL: product ui smoke did not pass cleanly")
PY

echo
echo "[ok] two-box product ui smoke green"
echo "[ok] proof bundle: $OUT"
