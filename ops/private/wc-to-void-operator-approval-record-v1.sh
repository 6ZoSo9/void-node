#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

preview="${VOID_WC_TO_VOID_PREVIEW_JSON:-/tmp/void-wc-to-void-settlement-preview-v1-current.json}"
out="${VOID_WC_TO_VOID_OPERATOR_APPROVAL_RECORD_OUT:-/tmp/void-wc-to-void-operator-approval-record-v1.json}"
operator_id="${VOID_OPERATOR_ID:-zoso}"
approval_phrase="${VOID_WC_TO_VOID_OPERATOR_APPROVAL_PHRASE:-}"

if [ ! -f "$preview" ]; then
  VOID_WC_TO_VOID_SETTLEMENT_PREVIEW_OUT="$preview" \
    ops/private/wc-to-void-settlement-preview-v1.sh >/tmp/void-wc-to-void-operator-approval-preview-bootstrap.log
fi

python3 - "$preview" "$out" "$operator_id" "$approval_phrase" <<'PY'
import hashlib
import json
import sys
from pathlib import Path

preview_path = Path(sys.argv[1])
out_path = Path(sys.argv[2])
operator_id = sys.argv[3].strip() or "zoso"
approval_phrase = sys.argv[4]

preview = json.loads(preview_path.read_text())

canonical_preview = json.dumps(preview, sort_keys=True, separators=(",", ":")).encode()
preview_sha256 = hashlib.sha256(canonical_preview).hexdigest()

marker_ok = preview.get("marker") == "VOID_WC_TO_VOID_SETTLEMENT_PREVIEW_V1"
preview_only_ok = preview.get("preview_only") is True
no_tx_ok = preview.get("tx_broadcast") is False
no_key_ok = preview.get("private_key_required") is False
no_ledger_write_ok = preview.get("ledger_write") is False
no_route_ok = preview.get("public_route_added") is False

settlement = preview.get("proposed_settlement") or {}
eligible = settlement.get("eligible") is True
selected_account = str(preview.get("selected_account") or "")
selected_balance_wc = str(preview.get("selected_balance_wc") or "0")
proposed_void_delta = str(settlement.get("proposed_void_delta") or "0")

expected_phrase = (
    "APPROVE WC_TO_VOID_SETTLEMENT_PREVIEW_V1 "
    f"preview_sha256={preview_sha256} "
    f"account={selected_account} "
    f"wc={selected_balance_wc} "
    f"void={proposed_void_delta}"
)

preconditions_green = all([
    marker_ok,
    preview_only_ok,
    no_tx_ok,
    no_key_ok,
    no_ledger_write_ok,
    no_route_ok,
    eligible,
    selected_account != "",
    proposed_void_delta not in ("", "0", "0.000000"),
])

operator_approved = preconditions_green and approval_phrase == expected_phrase

approval_material = json.dumps({
    "preview_sha256": preview_sha256,
    "operator_id": operator_id,
    "selected_account": selected_account,
    "selected_balance_wc": selected_balance_wc,
    "proposed_void_delta": proposed_void_delta,
    "operator_approved": operator_approved,
}, sort_keys=True, separators=(",", ":")).encode()

record = {
    "marker": "VOID_WC_TO_VOID_OPERATOR_APPROVAL_RECORD_V1",
    "ok": True,
    "operator_approved": operator_approved,
    "approval_required": not operator_approved,
    "approval_phrase_required": expected_phrase,
    "approval_phrase_provided_sha256": hashlib.sha256(approval_phrase.encode()).hexdigest() if approval_phrase else "",
    "operator_id": operator_id,
    "approval_record_sha256": hashlib.sha256(approval_material).hexdigest(),
    "preview": {
        "path": str(preview_path),
        "marker": preview.get("marker"),
        "sha256": preview_sha256,
        "selected_account": selected_account,
        "selected_balance_wc": selected_balance_wc,
        "proposed_void_delta": proposed_void_delta,
        "eligible": eligible,
    },
    "preconditions": {
        "preview_marker_ok": marker_ok,
        "preview_only_ok": preview_only_ok,
        "no_tx_broadcast_ok": no_tx_ok,
        "no_private_key_ok": no_key_ok,
        "no_ledger_write_ok": no_ledger_write_ok,
        "no_public_route_ok": no_route_ok,
        "eligible_preview_ok": eligible,
        "preconditions_green": preconditions_green,
    },
    "next_required_gates": {
        "duplicate_guard_required": True,
        "private_execute_command_required": True,
        "operator_terminal_confirmation_required": True,
        "money_movement_still_not_performed": True,
    },
    "closed_boundaries": {
        "does_not_send_void": True,
        "does_not_call_rpc": True,
        "does_not_read_private_key": True,
        "does_not_modify_ledger": True,
        "does_not_broadcast_tx": True,
        "does_not_include_execution_command": True,
        "does_not_open_public_route": True,
        "does_not_open_public_mutation": True,
        "does_not_open_public_intake": True,
    },
}

out_path.parent.mkdir(parents=True, exist_ok=True)
out_path.write_text(json.dumps(record, indent=2, sort_keys=True) + "\n")
print(json.dumps(record, indent=2, sort_keys=True))

if not preconditions_green:
    print("VOID_WC_TO_VOID_OPERATOR_APPROVAL_RECORD_V1_PRECONDITIONS_RED")
    sys.exit(2)

if not operator_approved:
    print("VOID_WC_TO_VOID_OPERATOR_APPROVAL_RECORD_V1_APPROVAL_REQUIRED")
    sys.exit(3)

print("VOID_WC_TO_VOID_OPERATOR_APPROVAL_RECORD_V1_GREEN")
PY
