#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

hold="${VOID_WC_TO_VOID_COMMAND_HOLD_JSON:-/tmp/void-wc-to-void-private-execute-command-hold-v1-current.json}"
recipient="${VOID_WC_TO_VOID_RECIPIENT_ADDRESS:-}"
recipient_label="${VOID_WC_TO_VOID_RECIPIENT_LABEL:-}"
out="${VOID_WC_TO_VOID_RECIPIENT_RESOLUTION_OUT:-/tmp/void-wc-to-void-recipient-resolution-v1.json}"

if [ ! -f "$hold" ]; then
  VOID_WC_TO_VOID_PRIVATE_EXECUTE_COMMAND_HOLD_OUT="$hold" \
    ops/private/wc-to-void-private-execute-command-hold-v1.sh >/tmp/void-wc-to-void-recipient-resolution-hold-bootstrap.log
fi

python3 - "$hold" "$recipient" "$recipient_label" "$out" <<'PY'
import json
import hashlib
import re
import sys
from pathlib import Path

hold_path = Path(sys.argv[1])
recipient = sys.argv[2].strip()
recipient_label = sys.argv[3].strip()
out_path = Path(sys.argv[4])

hold = json.loads(hold_path.read_text())
approved = hold.get("approved_settlement") or {}

evm_address_ok = bool(re.fullmatch(r"0x[a-fA-F0-9]{40}", recipient))
recipient_present = bool(recipient)
recipient_resolved = recipient_present and evm_address_ok

settlement_key = str(approved.get("settlement_key") or "")
preview_sha = str(approved.get("preview_sha256") or "")
approval_sha = str(approved.get("approval_record_sha256") or "")
account = str(approved.get("account") or "")
wc = str(approved.get("wc") or "")
void = str(approved.get("void") or "")

preconditions = {
    "hold_marker_ok": hold.get("marker") == "VOID_WC_TO_VOID_PRIVATE_EXECUTE_COMMAND_HOLD_V1",
    "hold_active_ok": hold.get("hold_active") is True,
    "execute_command_released_false_ok": hold.get("execute_command_released") is False,
    "execute_command_included_false_ok": hold.get("execute_command_included") is False,
    "money_movement_performed_false_ok": hold.get("money_movement_performed") is False,
    "ready_for_real_execute_false_ok": hold.get("ready_for_real_execute") is False,
    "settlement_key_expected_ok": settlement_key == "4f31fe4b41846562af9a4ae0a5f27be6e6add9b93762750b3eeae33faf7eaf9e",
    "preview_sha_expected_ok": preview_sha == "f167b48114902fc39c90b8abc5447b376b71fbd719dc6bd23e5f335f465c77e8",
    "approval_record_sha_expected_ok": approval_sha == "2bed1bf6314fb6ef6c6908e356bf2b0d929cd9510e23c52a70fedbbdeeeda721",
    "account_expected_ok": account == "unknown",
    "wc_expected_ok": wc == "100",
    "void_expected_ok": void == "1.000000",
    "does_not_release_command_ok": ((hold.get("closed_boundaries") or {}).get("does_not_release_command") is True),
    "does_not_send_void_ok": ((hold.get("closed_boundaries") or {}).get("does_not_send_void") is True),
    "does_not_call_rpc_ok": ((hold.get("closed_boundaries") or {}).get("does_not_call_rpc") is True),
    "does_not_read_private_key_ok": ((hold.get("closed_boundaries") or {}).get("does_not_read_private_key") is True),
}

preconditions_green = all(preconditions.values())

resolution_material = {
    "settlement_key": settlement_key,
    "preview_sha256": preview_sha,
    "approval_record_sha256": approval_sha,
    "account": account,
    "wc": wc,
    "void": void,
    "recipient_address": recipient if recipient_resolved else "",
    "recipient_label": recipient_label if recipient_resolved else "",
    "recipient_resolved": recipient_resolved,
}
resolution_sha256 = hashlib.sha256(
    json.dumps(resolution_material, sort_keys=True, separators=(",", ":")).encode()
).hexdigest()

record = {
    "marker": "VOID_WC_TO_VOID_RECIPIENT_RESOLUTION_V1",
    "ok": True,
    "recipient_resolved": recipient_resolved,
    "recipient_required": not recipient_resolved,
    "recipient_address_present": recipient_present,
    "recipient_address_format_ok": evm_address_ok,
    "recipient_resolution_sha256": resolution_sha256,
    "approved_settlement": {
        "hold_path": str(hold_path),
        "settlement_key": settlement_key,
        "preview_sha256": preview_sha,
        "approval_record_sha256": approval_sha,
        "account": account,
        "wc": wc,
        "void": void,
    },
    "recipient": {
        "address": recipient if recipient_resolved else "",
        "label": recipient_label if recipient_resolved else "",
        "address_sha256": hashlib.sha256(recipient.encode()).hexdigest() if recipient_resolved else "",
    },
    "preconditions": {
        **preconditions,
        "preconditions_green": preconditions_green,
    },
    "release_state": {
        "private_execute_command_release_allowed": False,
        "release_blocked_until_separate_command_release_lane": True,
        "money_movement_still_not_performed": True,
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
        "recipient_resolution_required": not recipient_resolved,
        "recipient_resolution_record_required": recipient_resolved,
        "private_execute_command_release_required": recipient_resolved,
        "operator_terminal_execute_request_required": True,
        "money_movement_still_not_performed": True,
    },
}

out_path.parent.mkdir(parents=True, exist_ok=True)
out_path.write_text(json.dumps(record, indent=2, sort_keys=True) + "\n")
print(json.dumps(record, indent=2, sort_keys=True))

if not preconditions_green:
    print("VOID_WC_TO_VOID_RECIPIENT_RESOLUTION_V1_PRECONDITIONS_RED")
    sys.exit(2)

if not recipient_resolved:
    print("VOID_WC_TO_VOID_RECIPIENT_RESOLUTION_V1_RECIPIENT_REQUIRED")
    sys.exit(3)

print("VOID_WC_TO_VOID_RECIPIENT_RESOLUTION_V1_GREEN")
PY
