#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

recipient="${VOID_WC_TO_VOID_RECIPIENT_ADDRESS:-}"
recipient_label="${VOID_WC_TO_VOID_RECIPIENT_LABEL:-first-wc-to-void-recipient}"
out="${VOID_WC_TO_VOID_RECIPIENT_RESOLUTION_APPLY_OUT:-/tmp/void-wc-to-void-recipient-resolution-apply-v1.json}"

expected_recipient_address_sha="b76db82f5a3a86e4fb2d3e5800327d1618108c24c721aed1222737f7ff99d9c9"
expected_recipient_resolution_sha="003df09356eed9b5045dafdd492f9fafe140012f6aee1a8976a3b959c6ed4671"
expected_settlement_key="4f31fe4b41846562af9a4ae0a5f27be6e6add9b93762750b3eeae33faf7eaf9e"
expected_preview_sha="f167b48114902fc39c90b8abc5447b376b71fbd719dc6bd23e5f335f465c77e8"
expected_approval_sha="2bed1bf6314fb6ef6c6908e356bf2b0d929cd9510e23c52a70fedbbdeeeda721"
expected_wc="100"
expected_void="1.000000"

if ! printf '%s\n' "$recipient" | grep -Eq '^0x[a-fA-F0-9]{40}$'; then
  echo "VOID_WC_TO_VOID_RECIPIENT_RESOLUTION_APPLY_V1_RECIPIENT_REQUIRED"
  exit 3
fi

resolution="/tmp/void-wc-to-void-recipient-resolution-apply-v1-resolved.json"

VOID_WC_TO_VOID_RECIPIENT_ADDRESS="$recipient" \
VOID_WC_TO_VOID_RECIPIENT_LABEL="$recipient_label" \
VOID_WC_TO_VOID_RECIPIENT_RESOLUTION_OUT="$resolution" \
  ops/private/wc-to-void-recipient-resolution-v1.sh >/tmp/void-wc-to-void-recipient-resolution-apply-resolution.log

grep -F 'VOID_WC_TO_VOID_RECIPIENT_RESOLUTION_V1_GREEN' /tmp/void-wc-to-void-recipient-resolution-apply-resolution.log >/dev/null

python3 - "$resolution" "$out" "$expected_recipient_address_sha" "$expected_recipient_resolution_sha" "$expected_settlement_key" "$expected_preview_sha" "$expected_approval_sha" "$expected_wc" "$expected_void" <<'PY'
import json
import hashlib
import sys
from pathlib import Path

(
    resolution_path,
    out_path,
    expected_recipient_address_sha,
    expected_recipient_resolution_sha,
    expected_settlement_key,
    expected_preview_sha,
    expected_approval_sha,
    expected_wc,
    expected_void,
) = sys.argv[1:]

resolution = json.loads(Path(resolution_path).read_text())
approved = resolution.get("approved_settlement") or {}
recipient = resolution.get("recipient") or {}
release_state = resolution.get("release_state") or {}
closed = resolution.get("closed_boundaries") or {}

preconditions = {
    "resolution_marker_ok": resolution.get("marker") == "VOID_WC_TO_VOID_RECIPIENT_RESOLUTION_V1",
    "recipient_resolved_ok": resolution.get("recipient_resolved") is True,
    "recipient_required_false_ok": resolution.get("recipient_required") is False,
    "recipient_address_format_ok": resolution.get("recipient_address_format_ok") is True,
    "recipient_address_sha_expected_ok": recipient.get("address_sha256") == expected_recipient_address_sha,
    "recipient_resolution_sha_expected_ok": resolution.get("recipient_resolution_sha256") == expected_recipient_resolution_sha,
    "settlement_key_expected_ok": approved.get("settlement_key") == expected_settlement_key,
    "preview_sha_expected_ok": approved.get("preview_sha256") == expected_preview_sha,
    "approval_record_sha_expected_ok": approved.get("approval_record_sha256") == expected_approval_sha,
    "wc_expected_ok": approved.get("wc") == expected_wc,
    "void_expected_ok": approved.get("void") == expected_void,
    "release_allowed_false_ok": release_state.get("private_execute_command_release_allowed") is False,
    "money_movement_still_not_performed_ok": release_state.get("money_movement_still_not_performed") is True,
    "does_not_release_command_ok": closed.get("does_not_release_command") is True,
    "does_not_send_void_ok": closed.get("does_not_send_void") is True,
    "does_not_call_rpc_ok": closed.get("does_not_call_rpc") is True,
    "does_not_read_private_key_ok": closed.get("does_not_read_private_key") is True,
}

preconditions_green = all(preconditions.values())

apply_material = {
    "recipient_resolution_sha256": resolution.get("recipient_resolution_sha256"),
    "recipient_address_sha256": recipient.get("address_sha256"),
    "settlement_key": approved.get("settlement_key"),
    "preview_sha256": approved.get("preview_sha256"),
    "approval_record_sha256": approved.get("approval_record_sha256"),
    "wc": approved.get("wc"),
    "void": approved.get("void"),
    "recipient_label": recipient.get("label"),
}
apply_sha = hashlib.sha256(
    json.dumps(apply_material, sort_keys=True, separators=(",", ":")).encode()
).hexdigest()

record = {
    "marker": "VOID_WC_TO_VOID_RECIPIENT_RESOLUTION_APPLY_V1",
    "ok": True,
    "recipient_resolution_applied": preconditions_green,
    "recipient_resolution_apply_sha256": apply_sha,
    "recipient_resolution": {
        "path": str(resolution_path),
        "recipient_resolution_sha256": resolution.get("recipient_resolution_sha256"),
        "recipient_address_sha256": recipient.get("address_sha256"),
        "recipient_label": recipient.get("label"),
        "recipient_resolved": resolution.get("recipient_resolved"),
    },
    "approved_settlement": {
        "settlement_key": approved.get("settlement_key"),
        "preview_sha256": approved.get("preview_sha256"),
        "approval_record_sha256": approved.get("approval_record_sha256"),
        "account": approved.get("account"),
        "wc": approved.get("wc"),
        "void": approved.get("void"),
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
        "does_not_store_plaintext_recipient_in_repo_code": True,
    },
    "next_required_gates": {
        "private_execute_command_release_required": True,
        "operator_terminal_execute_request_required": True,
        "money_movement_still_not_performed": True,
    },
}

Path(out_path).parent.mkdir(parents=True, exist_ok=True)
Path(out_path).write_text(json.dumps(record, indent=2, sort_keys=True) + "\n")
print(json.dumps(record, indent=2, sort_keys=True))

if not preconditions_green:
    print("VOID_WC_TO_VOID_RECIPIENT_RESOLUTION_APPLY_V1_PRECONDITIONS_RED")
    sys.exit(2)

print("VOID_WC_TO_VOID_RECIPIENT_RESOLUTION_APPLY_V1_GREEN")
PY
