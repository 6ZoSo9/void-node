#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

guard="${VOID_WC_TO_VOID_DUPLICATE_GUARD_JSON:-/tmp/void-wc-to-void-duplicate-settlement-guard-v1-current.json}"
out="${VOID_WC_TO_VOID_PRIVATE_EXECUTE_COMMAND_HOLD_OUT:-/tmp/void-wc-to-void-private-execute-command-hold-v1.json}"

if [ ! -f "$guard" ]; then
  VOID_WC_TO_VOID_DUPLICATE_GUARD_OUT="$guard" \
    ops/private/wc-to-void-duplicate-settlement-guard-v1.sh >/tmp/void-wc-to-void-private-execute-command-hold-guard-bootstrap.log
fi

python3 - "$guard" "$out" <<'PY'
import json
import hashlib
import sys
from pathlib import Path

guard_path = Path(sys.argv[1])
out_path = Path(sys.argv[2])

guard = json.loads(guard_path.read_text())

approved = guard.get("approved_record") or {}
account = str(approved.get("account") or "")
wc = str(approved.get("wc") or "")
void = str(approved.get("void") or "")
preview_sha = str(approved.get("preview_sha256") or "")
approval_sha = str(approved.get("approval_record_sha256") or "")
settlement_key = str(guard.get("settlement_key") or "")

recipient_known = account not in ("", "unknown", "UNKNOWN", "null", "None")
amount_positive = void not in ("", "0", "0.000000")

preconditions = {
    "guard_marker_ok": guard.get("marker") == "VOID_WC_TO_VOID_DUPLICATE_SETTLEMENT_GUARD_V1",
    "guard_passed_ok": guard.get("guard_passed") is True,
    "duplicate_found_false_ok": guard.get("duplicate_found") is False,
    "settlement_key_expected_ok": settlement_key == "4f31fe4b41846562af9a4ae0a5f27be6e6add9b93762750b3eeae33faf7eaf9e",
    "preview_sha_expected_ok": preview_sha == "f167b48114902fc39c90b8abc5447b376b71fbd719dc6bd23e5f335f465c77e8",
    "approval_record_sha_expected_ok": approval_sha == "2bed1bf6314fb6ef6c6908e356bf2b0d929cd9510e23c52a70fedbbdeeeda721",
    "wc_expected_ok": wc == "100",
    "void_expected_ok": void == "1.000000",
    "amount_positive_ok": amount_positive,
    "does_not_send_void_ok": ((guard.get("closed_boundaries") or {}).get("does_not_send_void") is True),
    "does_not_call_rpc_ok": ((guard.get("closed_boundaries") or {}).get("does_not_call_rpc") is True),
    "does_not_read_private_key_ok": ((guard.get("closed_boundaries") or {}).get("does_not_read_private_key") is True),
    "does_not_include_execution_command_ok": ((guard.get("closed_boundaries") or {}).get("does_not_include_execution_command") is True),
}

preconditions_green = all(preconditions.values())

hold_reasons = []
if not recipient_known:
    hold_reasons.append("recipient_identity_unresolved")
hold_reasons.extend([
    "private_key_not_loaded",
    "rpc_not_called",
    "operator_terminal_confirmation_not_supplied",
    "execute_command_release_not_allowed_in_hold_lane",
])

command_material = {
    "settlement_key": settlement_key,
    "preview_sha256": preview_sha,
    "approval_record_sha256": approval_sha,
    "account": account,
    "wc": wc,
    "void": void,
    "recipient_known": recipient_known,
    "command_release_state": "held",
}
hold_packet_sha256 = hashlib.sha256(
    json.dumps(command_material, sort_keys=True, separators=(",", ":")).encode()
).hexdigest()

record = {
    "marker": "VOID_WC_TO_VOID_PRIVATE_EXECUTE_COMMAND_HOLD_V1",
    "ok": True,
    "hold_active": True,
    "execute_command_released": False,
    "execute_command_included": False,
    "money_movement_performed": False,
    "ready_for_real_execute": False,
    "recipient_identity_unresolved": not recipient_known,
    "hold_reasons": hold_reasons,
    "hold_packet_sha256": hold_packet_sha256,
    "approved_settlement": {
        "guard_path": str(guard_path),
        "settlement_key": settlement_key,
        "preview_sha256": preview_sha,
        "approval_record_sha256": approval_sha,
        "account": account,
        "recipient_known": recipient_known,
        "wc": wc,
        "void": void,
    },
    "preconditions": {
        **preconditions,
        "preconditions_green": preconditions_green,
    },
    "release_requirements": {
        "recipient_address_required": True,
        "recipient_address_present": False,
        "chain_id_required": True,
        "operator_terminal_confirmation_required": True,
        "private_key_required_only_in_execute_lane": True,
        "rpc_required_only_in_execute_lane": True,
        "settlement_ledger_append_required_after_successful_execution": True,
    },
    "closed_boundaries": {
        "does_not_release_command": True,
        "does_not_include_cast_send": True,
        "does_not_include_raw_transaction": True,
        "does_not_send_void": True,
        "does_not_call_rpc": True,
        "does_not_read_private_key": True,
        "does_not_broadcast_tx": True,
        "does_not_modify_ledger": True,
        "does_not_write_settlement_ledger": True,
        "does_not_open_public_route": True,
        "does_not_open_public_mutation": True,
        "does_not_open_public_intake": True,
    },
    "next_required_gates": {
        "recipient_resolution_required": not recipient_known,
        "operator_terminal_execute_request_required": True,
        "private_execute_command_release_required": True,
        "money_movement_still_not_performed": True,
    },
}

out_path.parent.mkdir(parents=True, exist_ok=True)
out_path.write_text(json.dumps(record, indent=2, sort_keys=True) + "\n")
print(json.dumps(record, indent=2, sort_keys=True))

if not preconditions_green:
    print("VOID_WC_TO_VOID_PRIVATE_EXECUTE_COMMAND_HOLD_V1_PRECONDITIONS_RED")
    sys.exit(2)

print("VOID_WC_TO_VOID_PRIVATE_EXECUTE_COMMAND_HOLD_V1_GREEN")
PY
