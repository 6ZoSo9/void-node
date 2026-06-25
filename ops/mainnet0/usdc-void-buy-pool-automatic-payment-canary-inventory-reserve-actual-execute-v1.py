#!/usr/bin/env python3
import json
import os
from decimal import Decimal, getcontext
from pathlib import Path

getcontext().prec = 50

MARKER = "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_INVENTORY_RESERVE_ACTUAL_EXECUTE_V1"

def norm(v):
    return str(Decimal(str(v)).normalize())

def emit(ok, state, reason, result=None):
    executed = ok is True and state == "inventory_reserved_and_decremented" and result is not None
    payload = {
        "marker": MARKER,
        "ok": ok,
        "execute": {
            "state": state,
            "reason": reason,
            "actual_inventory_reserve_execute_performed": executed
        },
        "actual_execute_result": result,
        "authority": {
            "inventory_reserved": executed,
            "inventory_decremented": executed,
            "allocation_record_created": False,
            "private_allocation_ledger_write": False,
            "fulfillment_executed": False,
            "wallet_signing": False,
            "void_transfer": False,
            "public_mutation": False,
            "public_buyer_execution": False
        }
    }

    out_path = os.environ.get("CANARY_INVENTORY_RESERVE_ACTUAL_EXECUTE_OUTPUT_JSON")
    if out_path:
        p = Path(out_path)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(json.dumps(payload, indent=2) + "\n")

    print(json.dumps(payload, indent=2))

def main():
    snapshot_path = os.environ.get("CANARY_INVENTORY_RESERVE_PRE_EXECUTE_BACKUP_SNAPSHOT_JSON")
    policy_path = os.environ.get("CANARY_INVENTORY_RESERVE_ACTUAL_EXECUTE_POLICY_JSON")

    if not snapshot_path:
        emit(False, "blocked_missing_pre_execute_backup_snapshot", "CANARY_INVENTORY_RESERVE_PRE_EXECUTE_BACKUP_SNAPSHOT_JSON_required")
        raise SystemExit(1)
    if not policy_path:
        emit(False, "blocked_missing_actual_execute_policy", "CANARY_INVENTORY_RESERVE_ACTUAL_EXECUTE_POLICY_JSON_required")
        raise SystemExit(1)

    snapshot_output = json.loads(Path(snapshot_path).read_text())
    policy = json.loads(Path(policy_path).read_text())

    if not snapshot_output.get("ok"):
        emit(False, "blocked_snapshot_output_not_ok", "snapshot_output_not_ok")
        raise SystemExit(1)

    backup = snapshot_output.get("backup", {})
    if backup.get("state") != "pre_execute_backup_snapshot_created":
        emit(True, "blocked_backup_snapshot_not_created", "backup_state:" + str(backup.get("state")))
        return

    if backup.get("pre_execute_backup_snapshot_created") is not True:
        emit(True, "blocked_backup_snapshot_flag_false", "pre_execute_backup_snapshot_created_false")
        return

    snapshot = snapshot_output.get("snapshot")
    if not snapshot:
        emit(False, "blocked_missing_snapshot", "snapshot_missing")
        raise SystemExit(1)

    if snapshot.get("backup_snapshot_kind") != "automatic_payment_canary_inventory_reserve_pre_execute_backup_snapshot":
        emit(False, "blocked_wrong_snapshot_kind", "backup_snapshot_kind_invalid")
        raise SystemExit(1)

    if snapshot.get("backup_snapshot_status") != "created_pending_separate_actual_inventory_reserve_execute":
        emit(False, "blocked_wrong_snapshot_status", "backup_snapshot_status_invalid")
        raise SystemExit(1)

    restore = snapshot.get("restore_target_if_execute_fails", {})
    if not restore:
        emit(False, "blocked_missing_restore_target", "restore_target_missing")
        raise SystemExit(1)

    boundary = snapshot.get("execute_boundary", {})
    if boundary.get("separate_actual_execute_required") is not True:
        emit(False, "blocked_missing_separate_actual_execute_requirement", "separate_actual_execute_required_not_true")
        raise SystemExit(1)

    for key in [
        "this_snapshot_executes_now",
        "inventory_reserved_now",
        "inventory_decremented_now",
        "ledger_written_now",
        "fulfillment_executed_now",
        "wallet_signing_now",
        "void_transfer_now",
    ]:
        if boundary.get(key) is not False:
            emit(False, "blocked_snapshot_boundary_already_mutates", key + "_not_false")
            raise SystemExit(1)

    if policy.get("allow_inventory_reserve_mutation") is not True:
        emit(False, "blocked_policy_does_not_allow_inventory_reserve", "allow_inventory_reserve_mutation_not_true")
        raise SystemExit(1)

    if policy.get("allow_inventory_decrement") is not True:
        emit(False, "blocked_policy_does_not_allow_inventory_decrement", "allow_inventory_decrement_not_true")
        raise SystemExit(1)

    for key in [
        "allow_allocation_record_creation",
        "allow_private_allocation_ledger_write",
        "allow_fulfillment_execution",
        "allow_wallet_signing",
        "allow_void_transfer",
        "allow_public_mutation",
    ]:
        if policy.get(key) is not False:
            emit(False, "blocked_policy_allows_forbidden_action", key + "_not_false")
            raise SystemExit(1)

    if int(policy.get("canary_candidate_limit")) != 1:
        emit(False, "blocked_canary_candidate_limit_invalid", "canary_candidate_limit_not_one")
        raise SystemExit(1)

    if int(policy.get("canary_candidates_already_reserved")) >= 1:
        emit(True, "blocked_canary_candidate_limit_exhausted", "canary_candidate_limit_exhausted")
        return

    requested = Decimal(str(snapshot.get("requested_void_amount")))
    before = Decimal(str(snapshot.get("inventory_remaining_before")))
    after = Decimal(str(snapshot.get("inventory_remaining_after_if_executed")))
    expected_before = Decimal(str(policy.get("expected_inventory_remaining_before")))
    expected_after = Decimal(str(policy.get("expected_inventory_remaining_after")))

    if requested <= 0:
        emit(False, "blocked_nonpositive_requested_void", "requested_void_amount_nonpositive")
        raise SystemExit(1)

    if before != expected_before:
        emit(False, "blocked_inventory_before_mismatch", "policy_before_does_not_match_snapshot")
        raise SystemExit(1)

    if after != expected_after:
        emit(False, "blocked_inventory_after_mismatch", "policy_after_does_not_match_snapshot")
        raise SystemExit(1)

    if before - requested != after:
        emit(False, "blocked_inventory_math_mismatch", "before_minus_requested_does_not_equal_after")
        raise SystemExit(1)

    result = {
        "actual_execute_result_kind": "automatic_payment_canary_inventory_reserve_actual_execute_result",
        "actual_execute_result_status": "inventory_reserved_pending_allocation_record_gate",
        "source_backup_snapshot_kind": snapshot.get("backup_snapshot_kind"),
        "canonical_payment_identity": snapshot.get("canonical_payment_identity"),
        "buyer_key": snapshot.get("buyer_key"),
        "void_receive_address": snapshot.get("void_receive_address"),
        "reserved_void_amount": norm(requested),
        "inventory_remaining_before": norm(before),
        "inventory_remaining_after": norm(after),
        "inventory_reserved": True,
        "inventory_decremented": True,
        "allocation_record_created": False,
        "private_allocation_ledger_written": False,
        "fulfillment_executed": False,
        "wallet_signing": False,
        "void_transfer": False,
        "public_mutation": False,
        "canary": {
            "candidate_limit": 1,
            "candidate_reserved_count_after": 1,
            "process_one_candidate_then_stop": True
        },
        "restore_source": restore
    }

    emit(True, "inventory_reserved_and_decremented", "actual_inventory_reserve_execute_completed_without_downstream_authority", result)

if __name__ == "__main__":
    main()
