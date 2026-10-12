#!/usr/bin/env python3
import json
import os
from pathlib import Path

MARKER = "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_INVENTORY_RESERVE_PRE_EXECUTE_BACKUP_SNAPSHOT_V1"

def emit(ok, state, reason, snapshot=None):
    created = ok is True and state == "pre_execute_backup_snapshot_created" and snapshot is not None
    print(json.dumps({
        "marker": MARKER,
        "ok": ok,
        "backup": {
            "state": state,
            "reason": reason,
            "pre_execute_backup_snapshot_created": created
        },
        "snapshot": snapshot,
        "authority": {
            "pre_execute_backup_snapshot_created": created,
            "inventory_reserved": False,
            "inventory_decremented": False,
            "allocation_record_created": False,
            "private_allocation_ledger_write": False,
            "fulfillment_executed": False,
            "wallet_signing": False,
            "void_transfer": False,
            "public_mutation": False,
            "public_buyer_execution": False
        }
    }, indent=2))

def main():
    authorization_path = os.environ.get("CANARY_INVENTORY_RESERVE_ACTUAL_EXECUTE_AUTHORIZATION_OUTPUT_JSON")
    if not authorization_path:
        emit(False, "blocked_missing_authorization_output", "CANARY_INVENTORY_RESERVE_ACTUAL_EXECUTE_AUTHORIZATION_OUTPUT_JSON_required")
        raise SystemExit(1)

    authorization = json.loads(Path(authorization_path).read_text())

    if not authorization.get("ok"):
        emit(False, "blocked_authorization_not_ok", "authorization_not_ok")
        raise SystemExit(1)

    auth = authorization.get("authorization", {})
    if auth.get("state") != "authorized_for_separate_actual_inventory_reserve_execute":
        emit(True, "blocked_authorization_not_authorized", "authorization_state:" + str(auth.get("state")))
        return

    if auth.get("authorized_for_separate_actual_inventory_reserve_execute") is not True:
        emit(True, "blocked_authorization_flag_false", "authorization_flag_false")
        return

    dry_run_result = authorization.get("dry_run_result")
    if not dry_run_result:
        emit(False, "blocked_missing_dry_run_result", "dry_run_result_missing")
        raise SystemExit(1)

    if dry_run_result.get("dry_run_result_kind") != "automatic_payment_canary_inventory_reserve_execution_dry_run_result":
        emit(False, "blocked_wrong_dry_run_result_kind", "dry_run_result_kind_invalid")
        raise SystemExit(1)

    if dry_run_result.get("dry_run_result_status") != "ready_for_separate_actual_execute_review":
        emit(False, "blocked_wrong_dry_run_result_status", "dry_run_result_status_invalid")
        raise SystemExit(1)

    if dry_run_result.get("actual_inventory_mutation_performed") is not False:
        emit(False, "blocked_dry_run_result_already_mutated_inventory", "actual_inventory_mutation_performed_not_false")
        raise SystemExit(1)

    snapshot = {
        "backup_snapshot_kind": "automatic_payment_canary_inventory_reserve_pre_execute_backup_snapshot",
        "backup_snapshot_status": "created_pending_separate_actual_inventory_reserve_execute",
        "source_dry_run_result_kind": dry_run_result.get("dry_run_result_kind"),
        "canonical_payment_identity": dry_run_result.get("canonical_payment_identity"),
        "buyer_key": dry_run_result.get("buyer_key"),
        "void_receive_address": dry_run_result.get("void_receive_address"),
        "requested_void_amount": dry_run_result.get("requested_void_amount"),
        "inventory_remaining_before": dry_run_result.get("inventory_remaining_before"),
        "inventory_remaining_after_if_executed": dry_run_result.get("inventory_remaining_after_if_executed"),
        "restore_target_if_execute_fails": {
            "inventory_remaining": dry_run_result.get("inventory_remaining_before"),
            "inventory_reserved": False,
            "inventory_decremented": False,
            "allocation_record_created": False,
            "private_allocation_ledger_written": False
        },
        "execute_boundary": {
            "separate_actual_execute_required": True,
            "this_snapshot_executes_now": False,
            "inventory_reserved_now": False,
            "inventory_decremented_now": False,
            "ledger_written_now": False,
            "fulfillment_executed_now": False,
            "wallet_signing_now": False,
            "void_transfer_now": False
        }
    }

    emit(True, "pre_execute_backup_snapshot_created", "authorized_dry_run_snapshot_created_without_mutation", snapshot)

if __name__ == "__main__":
    main()
