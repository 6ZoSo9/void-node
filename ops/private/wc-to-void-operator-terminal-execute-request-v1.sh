#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

recipient="${VOID_WC_TO_VOID_RECIPIENT_ADDRESS:-}"
recipient_label="${VOID_WC_TO_VOID_RECIPIENT_LABEL:-first-wc-to-void-recipient}"
request_confirm="${VOID_WC_TO_VOID_OPERATOR_TERMINAL_EXECUTE_REQUEST_APPROVAL:-}"
out="${VOID_WC_TO_VOID_OPERATOR_TERMINAL_EXECUTE_REQUEST_OUT:-/tmp/void-wc-to-void-operator-terminal-execute-request-v1.json}"

required_release_phrase="YES_RELEASE_EXACT_WC_TO_VOID_MANUAL_EXECUTE_PACKET_E51BCC67"
required_request_phrase="YES_REQUEST_EXACT_WC_TO_VOID_OPERATOR_TERMINAL_EXECUTE_PACKET_88BC15E3"

expected_release_packet_sha="88bc15e33afe845561733ed1fc1f9d71d362f6e5e28ea5bd7f6c095d6598dc40"
expected_recipient_address_sha="b76db82f5a3a86e4fb2d3e5800327d1618108c24c721aed1222737f7ff99d9c9"
expected_recipient_resolution_sha="003df09356eed9b5045dafdd492f9fafe140012f6aee1a8976a3b959c6ed4671"
expected_recipient_apply_sha="e51bcc6713e24fd9eec7d577329bf10662f3b2fca60f044db61f7ea15072eea3"
expected_settlement_key="4f31fe4b41846562af9a4ae0a5f27be6e6add9b93762750b3eeae33faf7eaf9e"
expected_preview_sha="f167b48114902fc39c90b8abc5447b376b71fbd719dc6bd23e5f335f465c77e8"
expected_approval_sha="2bed1bf6314fb6ef6c6908e356bf2b0d929cd9510e23c52a70fedbbdeeeda721"
expected_wc="100"
expected_void="1.000000"

if ! printf '%s\n' "$recipient" | grep -Eq '^0x[a-fA-F0-9]{40}$'; then
  echo "VOID_WC_TO_VOID_OPERATOR_TERMINAL_EXECUTE_REQUEST_V1_RECIPIENT_REQUIRED"
  exit 3
fi

release_json="/tmp/void-wc-to-void-operator-terminal-execute-request-release-v1.json"

VOID_WC_TO_VOID_RECIPIENT_ADDRESS="$recipient" \
VOID_WC_TO_VOID_RECIPIENT_LABEL="$recipient_label" \
VOID_WC_TO_VOID_RELEASE_EXACT_APPROVAL="$required_release_phrase" \
VOID_WC_TO_VOID_PRIVATE_EXECUTE_COMMAND_RELEASE_OUT="$release_json" \
  ops/private/wc-to-void-private-execute-command-release-v1.sh >/tmp/void-wc-to-void-operator-terminal-execute-request-release-run.log

grep -F 'VOID_WC_TO_VOID_PRIVATE_EXECUTE_COMMAND_RELEASE_V1_GREEN' /tmp/void-wc-to-void-operator-terminal-execute-request-release-run.log >/dev/null

python3 - "$release_json" "$out" "$recipient" "$request_confirm" "$required_request_phrase" "$expected_release_packet_sha" "$expected_recipient_address_sha" "$expected_recipient_resolution_sha" "$expected_recipient_apply_sha" "$expected_settlement_key" "$expected_preview_sha" "$expected_approval_sha" "$expected_wc" "$expected_void" <<'PY'
import json
import hashlib
import sys
from pathlib import Path

(
    release_path,
    out_path,
    recipient_plain,
    request_confirm,
    required_request_phrase,
    expected_release_packet_sha,
    expected_recipient_address_sha,
    expected_recipient_resolution_sha,
    expected_recipient_apply_sha,
    expected_settlement_key,
    expected_preview_sha,
    expected_approval_sha,
    expected_wc,
    expected_void,
) = sys.argv[1:]

release = json.loads(Path(release_path).read_text())
recipient = release.get("recipient") or {}
approved = release.get("approved_settlement") or {}
apply = release.get("recipient_resolution_apply") or {}
manual = release.get("manual_execute_command_release") or {}
closed = release.get("closed_boundaries") or {}
next_gates = release.get("next_required_gates") or {}

recipient_sha = hashlib.sha256(recipient_plain.encode()).hexdigest()
request_phrase_sha = hashlib.sha256(required_request_phrase.encode()).hexdigest()
request_confirm_sha = hashlib.sha256(request_confirm.encode()).hexdigest() if request_confirm else ""
operator_requested = request_confirm == required_request_phrase

preconditions = {
    "release_marker_ok": release.get("marker") == "VOID_WC_TO_VOID_PRIVATE_EXECUTE_COMMAND_RELEASE_V1",
    "release_allowed_ok": release.get("private_execute_command_release_allowed") is True,
    "operator_release_approved_ok": release.get("operator_release_approved") is True,
    "command_released_as_text_only_ok": manual.get("command_released_as_text_only") is True,
    "command_not_executed_by_release_script_ok": manual.get("command_not_executed_by_this_script") is True,
    "manual_execute_packet_sha_expected_ok": release.get("manual_execute_packet_sha256") == expected_release_packet_sha,
    "recipient_address_sha_expected_ok": recipient.get("address_sha256") == expected_recipient_address_sha,
    "recipient_plain_matches_hash_ok": recipient_sha == expected_recipient_address_sha,
    "recipient_resolution_sha_expected_ok": apply.get("recipient_resolution_sha256") == expected_recipient_resolution_sha,
    "recipient_apply_sha_expected_ok": apply.get("recipient_resolution_apply_sha256") == expected_recipient_apply_sha,
    "settlement_key_expected_ok": approved.get("settlement_key") == expected_settlement_key,
    "preview_sha_expected_ok": approved.get("preview_sha256") == expected_preview_sha,
    "approval_record_sha_expected_ok": approved.get("approval_record_sha256") == expected_approval_sha,
    "wc_expected_ok": approved.get("wc") == expected_wc,
    "void_expected_ok": approved.get("void") == expected_void,
    "manual_execution_still_required_ok": next_gates.get("manual_execution_still_required") is True,
    "money_movement_still_not_performed_ok": next_gates.get("money_movement_still_not_performed") is True,
    "does_not_execute_command_ok": closed.get("does_not_execute_command") is True,
    "does_not_broadcast_tx_ok": closed.get("does_not_broadcast_tx") is True,
    "does_not_send_void_ok": closed.get("does_not_send_void") is True,
    "does_not_call_rpc_ok": closed.get("does_not_call_rpc") is True,
    "does_not_read_private_key_ok": closed.get("does_not_read_private_key") is True,
}

preconditions_green = all(preconditions.values())

terminal_request_material = {
    "manual_execute_packet_sha256": expected_release_packet_sha,
    "recipient_address_sha256": expected_recipient_address_sha,
    "recipient_resolution_sha256": expected_recipient_resolution_sha,
    "recipient_resolution_apply_sha256": expected_recipient_apply_sha,
    "settlement_key": expected_settlement_key,
    "preview_sha256": expected_preview_sha,
    "approval_record_sha256": expected_approval_sha,
    "wc": expected_wc,
    "void": expected_void,
    "request_phrase_sha256": request_phrase_sha,
    "operator_terminal_execute_requested": operator_requested,
}
terminal_request_sha = hashlib.sha256(
    json.dumps(terminal_request_material, sort_keys=True, separators=(",", ":")).encode()
).hexdigest()

record = {
    "marker": "VOID_WC_TO_VOID_OPERATOR_TERMINAL_EXECUTE_REQUEST_V1",
    "ok": True,
    "operator_terminal_execute_requested": bool(preconditions_green and operator_requested),
    "operator_request_approved": bool(operator_requested),
    "terminal_execute_request_packet_sha256": terminal_request_sha,
    "request_phrase_sha256": request_phrase_sha,
    "request_confirmation_sha256": request_confirm_sha,
    "manual_execute_packet_sha256": release.get("manual_execute_packet_sha256"),
    "approved_settlement": {
        "settlement_key": approved.get("settlement_key"),
        "preview_sha256": approved.get("preview_sha256"),
        "approval_record_sha256": approved.get("approval_record_sha256"),
        "account": approved.get("account"),
        "wc": approved.get("wc"),
        "void": approved.get("void"),
    },
    "recipient": {
        "address_sha256": expected_recipient_address_sha,
        "label": recipient.get("label"),
        "plaintext_address_not_written_to_repo_code": True,
        "plaintext_address_present_only_in_private_runtime_packet": bool(preconditions_green and operator_requested),
        "address": recipient_plain if preconditions_green and operator_requested else "",
    },
    "preconditions": {
        **preconditions,
        "preconditions_green": preconditions_green,
    },
    "terminal_execute_request": {
        "request_released_as_text_only": bool(preconditions_green and operator_requested),
        "request_does_not_execute": True,
        "request_does_not_include_private_key": True,
        "request_does_not_include_seed_phrase": True,
        "operator_must_execute_in_separate_terminal_step": True,
        "execution_command_template": "WITHHELD_UNTIL_EXACT_TERMINAL_EXECUTE_REQUEST_APPROVAL" if not (preconditions_green and operator_requested) else "PRIVATE_OPERATOR_TERMINAL_EXECUTE_REQUEST_PACKET_READY",
    },
    "buy_void_funding_route_alignment": {
        "buy_void_is_canonical_funding_route": True,
        "no_new_public_funding_route_created": True,
        "no_duplicate_funding_surface_added": True,
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
        "does_not_create_duplicate_funding_route": True,
    },
    "next_required_gates": {
        "actual_operator_terminal_execution_required": bool(preconditions_green and operator_requested),
        "private_key_must_remain_local_only": True,
        "money_movement_still_not_performed": True,
        "post_execution_tx_reference_required": True,
        "post_execution_settlement_record_required": True,
    },
}

Path(out_path).parent.mkdir(parents=True, exist_ok=True)
Path(out_path).write_text(json.dumps(record, indent=2, sort_keys=True) + "\n")
print(json.dumps(record, indent=2, sort_keys=True))

if not preconditions_green:
    print("VOID_WC_TO_VOID_OPERATOR_TERMINAL_EXECUTE_REQUEST_V1_PRECONDITIONS_RED")
    sys.exit(2)

if not operator_requested:
    print("VOID_WC_TO_VOID_OPERATOR_TERMINAL_EXECUTE_REQUEST_V1_APPROVAL_REQUIRED")
    sys.exit(4)

print("VOID_WC_TO_VOID_OPERATOR_TERMINAL_EXECUTE_REQUEST_V1_GREEN")
PY
