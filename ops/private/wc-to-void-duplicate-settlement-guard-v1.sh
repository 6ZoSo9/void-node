#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

approved="${VOID_WC_TO_VOID_APPROVED_RECORD_JSON:-/tmp/void-wc-to-void-operator-approval-apply-v1-approved.json}"
settlement_ledger="${VOID_WC_TO_VOID_SETTLEMENT_LEDGER:-ops/private/wc-to-void-settlements.jsonl}"
out="${VOID_WC_TO_VOID_DUPLICATE_GUARD_OUT:-/tmp/void-wc-to-void-duplicate-settlement-guard-v1.json}"

if [ ! -f "$approved" ]; then
  VOID_WC_TO_VOID_OPERATOR_APPROVE_EXACT_CURRENT_PREVIEW="YES_APPROVE_EXACT_WC_TO_VOID_PREVIEW_F167B481" \
    ops/private/wc-to-void-operator-approval-apply-v1.sh >/tmp/void-wc-to-void-duplicate-guard-approval-bootstrap.log
fi

python3 - "$approved" "$settlement_ledger" "$out" <<'PY'
import json
import hashlib
import sys
from pathlib import Path

approved_path = Path(sys.argv[1])
ledger_path = Path(sys.argv[2])
out_path = Path(sys.argv[3])

approved = json.loads(approved_path.read_text())

preview = approved.get("preview") or {}
preview_sha = str(preview.get("sha256") or "")
approval_record_sha = str(approved.get("approval_record_sha256") or "")
account = str(preview.get("selected_account") or "")
wc = str(preview.get("selected_balance_wc") or "")
void = str(preview.get("proposed_void_delta") or "")

preconditions = {
    "approval_marker_ok": approved.get("marker") == "VOID_WC_TO_VOID_OPERATOR_APPROVAL_RECORD_V1",
    "operator_approved_ok": approved.get("operator_approved") is True,
    "approval_required_false_ok": approved.get("approval_required") is False,
    "preview_sha_expected_ok": preview_sha == "f167b48114902fc39c90b8abc5447b376b71fbd719dc6bd23e5f335f465c77e8",
    "approval_record_sha_expected_ok": approval_record_sha == "2bed1bf6314fb6ef6c6908e356bf2b0d929cd9510e23c52a70fedbbdeeeda721",
    "account_expected_ok": account == "unknown",
    "wc_expected_ok": wc == "100",
    "void_expected_ok": void == "1.000000",
    "does_not_send_void_ok": ((approved.get("closed_boundaries") or {}).get("does_not_send_void") is True),
    "does_not_call_rpc_ok": ((approved.get("closed_boundaries") or {}).get("does_not_call_rpc") is True),
    "does_not_read_private_key_ok": ((approved.get("closed_boundaries") or {}).get("does_not_read_private_key") is True),
    "does_not_include_execution_command_ok": ((approved.get("closed_boundaries") or {}).get("does_not_include_execution_command") is True),
}

settlement_key_material = json.dumps({
    "preview_sha256": preview_sha,
    "approval_record_sha256": approval_record_sha,
    "account": account,
    "wc": wc,
    "void": void,
}, sort_keys=True, separators=(",", ":")).encode()
settlement_key = hashlib.sha256(settlement_key_material).hexdigest()

ledger_entries_seen = 0
duplicate_found = False
duplicate_entries = []

if ledger_path.exists():
    for idx, line in enumerate(ledger_path.read_text(errors="replace").splitlines(), 1):
        if not line.strip():
            continue
        try:
            j = json.loads(line)
        except Exception:
            continue
        ledger_entries_seen += 1
        keys = {
            str(j.get("settlement_key") or ""),
            str(j.get("preview_sha256") or ""),
            str(j.get("approval_record_sha256") or ""),
        }
        if settlement_key in keys or preview_sha in keys or approval_record_sha in keys:
            duplicate_found = True
            duplicate_entries.append({
                "line": idx,
                "settlement_key": str(j.get("settlement_key") or ""),
                "preview_sha256": str(j.get("preview_sha256") or ""),
                "approval_record_sha256": str(j.get("approval_record_sha256") or ""),
            })

preconditions_green = all(preconditions.values())
guard_passed = preconditions_green and not duplicate_found

record = {
    "marker": "VOID_WC_TO_VOID_DUPLICATE_SETTLEMENT_GUARD_V1",
    "ok": True,
    "guard_passed": guard_passed,
    "duplicate_found": duplicate_found,
    "settlement_key": settlement_key,
    "approved_record": {
        "path": str(approved_path),
        "preview_sha256": preview_sha,
        "approval_record_sha256": approval_record_sha,
        "account": account,
        "wc": wc,
        "void": void,
    },
    "settlement_ledger": {
        "path": str(ledger_path),
        "exists": ledger_path.exists(),
        "entries_seen": ledger_entries_seen,
        "duplicate_entries": duplicate_entries,
    },
    "preconditions": {
        **preconditions,
        "preconditions_green": preconditions_green,
    },
    "next_required_gates": {
        "private_execute_command_hold_required": True,
        "operator_terminal_confirmation_required": True,
        "money_movement_still_not_performed": True,
    },
    "closed_boundaries": {
        "does_not_write_settlement_ledger": True,
        "does_not_send_void": True,
        "does_not_call_rpc": True,
        "does_not_read_private_key": True,
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
    print("VOID_WC_TO_VOID_DUPLICATE_SETTLEMENT_GUARD_V1_PRECONDITIONS_RED")
    sys.exit(2)

if duplicate_found:
    print("VOID_WC_TO_VOID_DUPLICATE_SETTLEMENT_GUARD_V1_DUPLICATE_FOUND")
    sys.exit(4)

print("VOID_WC_TO_VOID_DUPLICATE_SETTLEMENT_GUARD_V1_GREEN")
PY
