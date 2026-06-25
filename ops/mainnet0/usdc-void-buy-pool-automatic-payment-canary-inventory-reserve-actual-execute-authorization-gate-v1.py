#!/usr/bin/env python3
import json
import os
from pathlib import Path

MARKER = "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_INVENTORY_RESERVE_ACTUAL_EXECUTE_AUTHORIZATION_GATE_V1"

ALLOWED = {
    "authorize_separate_actual_inventory_reserve_execute",
    "hold_for_operator_review",
    "reject_actual_inventory_reserve_execute",
}

def emit(ok, state, decision, reason, dry_run_result=None):
    authorized = (
        ok is True
        and state == "authorized_for_separate_actual_inventory_reserve_execute"
        and decision == "authorize_separate_actual_inventory_reserve_execute"
        and dry_run_result is not None
    )
    print(json.dumps({
        "marker": MARKER,
        "ok": ok,
        "authorization": {
            "state": state,
            "decision": decision,
            "reason": reason,
            "authorized_for_separate_actual_inventory_reserve_execute": authorized
        },
        "dry_run_result": dry_run_result,
        "authority": {
            "actual_inventory_reserve_execute_authorized": authorized,
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
    dry_run_path = os.environ.get("CANARY_INVENTORY_RESERVE_DRY_RUN_OUTPUT_JSON")
    decision_path = os.environ.get("CANARY_INVENTORY_RESERVE_ACTUAL_EXECUTE_DECISION_JSON")

    if not dry_run_path:
        emit(False, "blocked_missing_dry_run_output", None, "CANARY_INVENTORY_RESERVE_DRY_RUN_OUTPUT_JSON_required")
        raise SystemExit(1)
    if not decision_path:
        emit(False, "blocked_missing_actual_execute_decision", None, "CANARY_INVENTORY_RESERVE_ACTUAL_EXECUTE_DECISION_JSON_required")
        raise SystemExit(1)

    dry_run = json.loads(Path(dry_run_path).read_text())
    decision_doc = json.loads(Path(decision_path).read_text())

    decision = str(decision_doc.get("operator_actual_execute_decision", "")).strip()
    if decision not in ALLOWED:
        emit(False, "blocked_invalid_actual_execute_decision", decision, "invalid_operator_actual_execute_decision")
        raise SystemExit(1)

    if not dry_run.get("ok"):
        emit(False, "blocked_dry_run_not_ok", decision, "dry_run_not_ok")
        raise SystemExit(1)

    dr = dry_run.get("dry_run", {})
    if dr.get("state") != "inventory_reserve_execution_dry_run_ready":
        emit(True, "blocked_dry_run_not_ready", decision, "dry_run_state:" + str(dr.get("state")))
        return

    if dr.get("ready_for_separate_actual_execute_review") is not True:
        emit(True, "blocked_dry_run_ready_flag_false", decision, "ready_for_separate_actual_execute_review_false")
        return

    result = dry_run.get("proposed_result")
    if not result:
        emit(False, "blocked_missing_dry_run_result", decision, "proposed_result_missing")
        raise SystemExit(1)

    if result.get("dry_run_result_kind") != "automatic_payment_canary_inventory_reserve_execution_dry_run_result":
        emit(False, "blocked_wrong_dry_run_result_kind", decision, "dry_run_result_kind_invalid")
        raise SystemExit(1)

    if result.get("dry_run_result_status") != "ready_for_separate_actual_execute_review":
        emit(False, "blocked_wrong_dry_run_result_status", decision, "dry_run_result_status_invalid")
        raise SystemExit(1)

    if result.get("actual_inventory_mutation_performed") is not False:
        emit(False, "blocked_dry_run_already_mutated_inventory", decision, "actual_inventory_mutation_performed_not_false")
        raise SystemExit(1)

    if result.get("operator_actual_execute_required_after_dry_run") is not True:
        emit(False, "blocked_missing_operator_actual_execute_requirement", decision, "operator_actual_execute_required_after_dry_run_not_true")
        raise SystemExit(1)

    if decision == "authorize_separate_actual_inventory_reserve_execute":
        emit(True, "authorized_for_separate_actual_inventory_reserve_execute", decision, "operator_authorized_after_dry_run", result)
        return

    if decision == "hold_for_operator_review":
        emit(True, "held_for_operator_review", decision, "operator_held_after_dry_run", result)
        return

    if decision == "reject_actual_inventory_reserve_execute":
        emit(True, "rejected_by_operator", decision, "operator_rejected_after_dry_run", result)
        return

if __name__ == "__main__":
    main()
