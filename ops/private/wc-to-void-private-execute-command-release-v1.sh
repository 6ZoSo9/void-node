#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

recipient="${VOID_WC_TO_VOID_RECIPIENT_ADDRESS:-}"
recipient_label="${VOID_WC_TO_VOID_RECIPIENT_LABEL:-first-wc-to-void-recipient}"
release_confirm="${VOID_WC_TO_VOID_RELEASE_EXACT_APPROVAL:-}"
out="${VOID_WC_TO_VOID_PRIVATE_EXECUTE_COMMAND_RELEASE_OUT:-/tmp/void-wc-to-void-private-execute-command-release-v1.json}"

expected_recipient_address_sha="b76db82f5a3a86e4fb2d3e5800327d1618108c24c721aed1222737f7ff99d9c9"
expected_recipient_resolution_sha="003df09356eed9b5045dafdd492f9fafe140012f6aee1a8976a3b959c6ed4671"
expected_recipient_apply_sha="e51bcc6713e24fd9eec7d577329bf10662f3b2fca60f044db61f7ea15072eea3"
expected_settlement_key="4f31fe4b41846562af9a4ae0a5f27be6e6add9b93762750b3eeae33faf7eaf9e"
expected_preview_sha="f167b48114902fc39c90b8abc5447b376b71fbd719dc6bd23e5f335f465c77e8"
expected_approval_sha="2bed1bf6314fb6ef6c6908e356bf2b0d929cd9510e23c52a70fedbbdeeeda721"
expected_wc="100"
expected_void="1.000000"
required_release_phrase="YES_RELEASE_EXACT_WC_TO_VOID_MANUAL_EXECUTE_PACKET_E51BCC67"

if ! printf '%s\n' "$recipient" | grep -Eq '^0x[a-fA-F0-9]{40}$'; then
  echo "VOID_WC_TO_VOID_PRIVATE_EXECUTE_COMMAND_RELEASE_V1_RECIPIENT_REQUIRED"
  exit 3
fi

apply_json="/tmp/void-wc-to-void-private-execute-command-release-apply-v1.json"

VOID_WC_TO_VOID_RECIPIENT_ADDRESS="$recipient" \
VOID_WC_TO_VOID_RECIPIENT_LABEL="$recipient_label" \
VOID_WC_TO_VOID_RECIPIENT_RESOLUTION_APPLY_OUT="$apply_json" \
  ops/private/wc-to-void-recipient-resolution-apply-v1.sh >/tmp/void-wc-to-void-private-execute-command-release-apply-run.log

grep -F 'VOID_WC_TO_VOID_RECIPIENT_RESOLUTION_APPLY_V1_GREEN' /tmp/void-wc-to-void-private-execute-command-release-apply-run.log >/dev/null

python3 - "$apply_json" "$out" "$recipient" "$release_confirm" "$required_release_phrase" "$expected_recipient_address_sha" "$expected_recipient_resolution_sha" "$expected_recipient_apply_sha" "$expected_settlement_key" "$expected_preview_sha" "$expected_approval_sha" "$expected_wc" "$expected_void" <<'PY'
import json
import hashlib
import sys
from pathlib import Path

(
    apply_path,
    out_path,
    recipient_plain,
    release_confirm,
    required_release_phrase,
    expected_recipient_address_sha,
    expected_recipient_resolution_sha,
    expected_recipient_apply_sha,
    expected_settlement_key,
    expected_preview_sha,
    expected_approval_sha,
    expected_wc,
    expected_void,
) = sys.argv[1:]

apply_record = json.loads(Path(apply_path).read_text())
recipient_resolution = apply_record.get("recipient_resolution") or {}
approved = apply_record.get("approved_settlement") or {}
release_state = apply_record.get("release_state") or {}
closed = apply_record.get("closed_boundaries") or {}

recipient_sha = hashlib.sha256(recipient_plain.encode()).hexdigest()
release_phrase_sha = hashlib.sha256(required_release_phrase.encode()).hexdigest()
release_confirm_sha = hashlib.sha256(release_confirm.encode()).hexdigest() if release_confirm else ""

approved_to_release = release_confirm == required_release_phrase

preconditions = {
    "apply_marker_ok": apply_record.get("marker") == "VOID_WC_TO_VOID_RECIPIENT_RESOLUTION_APPLY_V1",
    "recipient_resolution_applied_ok": apply_record.get("recipient_resolution_applied") is True,
    "recipient_address_sha_expected_ok": recipient_resolution.get("recipient_address_sha256") == expected_recipient_address_sha,
    "recipient_plain_matches_hash_ok": recipient_sha == expected_recipient_address_sha,
    "recipient_resolution_sha_expected_ok": recipient_resolution.get("recipient_resolution_sha256") == expected_recipient_resolution_sha,
    "recipient_apply_sha_expected_ok": apply_record.get("recipient_resolution_apply_sha256") == expected_recipient_apply_sha,
    "settlement_key_expected_ok": approved.get("settlement_key") == expected_settlement_key,
    "preview_sha_expected_ok": approved.get("preview_sha256") == expected_preview_sha,
    "approval_record_sha_expected_ok": approved.get("approval_record_sha256") == expected_approval_sha,
    "wc_expected_ok": approved.get("wc") == expected_wc,
    "void_expected_ok": approved.get("void") == expected_void,
    "prior_release_allowed_false_ok": release_state.get("private_execute_command_release_allowed") is False,
    "prior_money_movement_false_ok": release_state.get("money_movement_still_not_performed") is True,
    "prior_does_not_send_void_ok": closed.get("does_not_send_void") is True,
    "prior_does_not_call_rpc_ok": closed.get("does_not_call_rpc") is True,
    "prior_does_not_read_private_key_ok": closed.get("does_not_read_private_key") is True,
}

preconditions_green = all(preconditions.values())

manual_packet_material = {
    "recipient_address_sha256": expected_recipient_address_sha,
    "recipient_resolution_sha256": expected_recipient_resolution_sha,
    "recipient_resolution_apply_sha256": expected_recipient_apply_sha,
    "settlement_key": expected_settlement_key,
    "preview_sha256": expected_preview_sha,
    "approval_record_sha256": expected_approval_sha,
    "wc": expected_wc,
    "void": expected_void,
    "release_phrase_sha256": release_phrase_sha,
    "operator_release_approved": approved_to_release,
}
manual_packet_sha = hashlib.sha256(
    json.dumps(manual_packet_material, sort_keys=True, separators=(",", ":")).encode()
).hexdigest()

record = {
    "marker": "VOID_WC_TO_VOID_PRIVATE_EXECUTE_COMMAND_RELEASE_V1",
    "ok": True,
    "private_execute_command_release_allowed": bool(preconditions_green and approved_to_release),
    "operator_release_approved": bool(approved_to_release),
    "release_phrase_sha256": release_phrase_sha,
    "release_confirmation_sha256": release_confirm_sha,
    "manual_execute_packet_sha256": manual_packet_sha,
    "recipient": {
        "address_sha256": expected_recipient_address_sha,
        "label": recipient_resolution.get("recipient_label"),
        "plaintext_address_not_written_to_repo_code": True,
        "plaintext_address_present_only_in_private_runtime_packet": bool(preconditions_green and approved_to_release),
        "address": recipient_plain if preconditions_green and approved_to_release else "",
    },
    "approved_settlement": {
        "settlement_key": approved.get("settlement_key"),
        "preview_sha256": approved.get("preview_sha256"),
        "approval_record_sha256": approved.get("approval_record_sha256"),
        "account": approved.get("account"),
        "wc": approved.get("wc"),
        "void": approved.get("void"),
    },
    "recipient_resolution_apply": {
        "recipient_resolution_apply_sha256": apply_record.get("recipient_resolution_apply_sha256"),
        "recipient_resolution_sha256": recipient_resolution.get("recipient_resolution_sha256"),
        "recipient_address_sha256": recipient_resolution.get("recipient_address_sha256"),
    },
    "preconditions": {
        **preconditions,
        "preconditions_green": preconditions_green,
    },
    "manual_execute_command_release": {
        "command_released_as_text_only": bool(preconditions_green and approved_to_release),
        "command_not_executed_by_this_script": True,
        "operator_must_copy_paste_in_separate_terminal_step": True,
        "manual_command_template": "WITHHELD_UNTIL_EXACT_RELEASE_APPROVAL" if not (preconditions_green and approved_to_release) else "PRIVATE_OPERATOR_MANUAL_EXECUTE_COMMAND_PACKET_READY",
    },
    "closed_boundaries": {
        "does_not_execute_command": True,
        "does_not_broadcast_tx": True,
        "does_not_call_rpc": True,
        "does_not_read_private_key": True,
        "does_not_send_void": True,
        "does_not_modify_ledger": True,
        "does_not_write_settlement_ledger": True,
        "does_not_open_public_route": True,
        "does_not_open_public_mutation": True,
        "does_not_open_public_intake": True,
        "does_not_store_plaintext_recipient_in_repo_code": True,
    },
    "next_required_gates": {
        "operator_terminal_execute_request_required": bool(preconditions_green and approved_to_release),
        "manual_execution_still_required": True,
        "money_movement_still_not_performed": True,
        "post_execution_tx_reference_required": True,
        "post_execution_settlement_record_required": True,
    },
}

Path(out_path).parent.mkdir(parents=True, exist_ok=True)
Path(out_path).write_text(json.dumps(record, indent=2, sort_keys=True) + "\n")
print(json.dumps(record, indent=2, sort_keys=True))

if not preconditions_green:
    print("VOID_WC_TO_VOID_PRIVATE_EXECUTE_COMMAND_RELEASE_V1_PRECONDITIONS_RED")
    sys.exit(2)

if not approved_to_release:
    print("VOID_WC_TO_VOID_PRIVATE_EXECUTE_COMMAND_RELEASE_V1_APPROVAL_REQUIRED")
    sys.exit(4)

print("VOID_WC_TO_VOID_PRIVATE_EXECUTE_COMMAND_RELEASE_V1_GREEN")
PY
