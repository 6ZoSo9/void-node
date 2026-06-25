#!/usr/bin/env python3
import json
import os
from decimal import Decimal, getcontext
from pathlib import Path

getcontext().prec = 50

MARKER = "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_INVENTORY_RESERVE_EXECUTION_DRY_RUN_V1"

def norm(v):
    return str(Decimal(str(v)).normalize())

def emit(ok, state, reason, dry_run=None):
    ready = ok is True and state == "inventory_reserve_execution_dry_run_ready" and dry_run is not None
    print(json.dumps({
        "marker": MARKER,
        "ok": ok,
        "dry_run": {
            "state": state,
            "reason": reason,
            "ready_for_separate_actual_execute_review": ready
        },
        "proposed_result": dry_run,
        "authority": {
            "dry_run_only": True,
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
    packet_path = os.environ.get("CANARY_INVENTORY_RESERVE_EXECUTION_PACKET_JSON")
    policy_path = os.environ.get("CANARY_INVENTORY_RESERVE_DRY_RUN_POLICY_JSON")

    if not packet_path:
        emit(False, "blocked_missing_execution_packet", "CANARY_INVENTORY_RESERVE_EXECUTION_PACKET_JSON_required")
        raise SystemExit(1)
    if not policy_path:
        emit(False, "blocked_missing_dry_run_policy", "CANARY_INVENTORY_RESERVE_DRY_RUN_POLICY_JSON_required")
        raise SystemExit(1)

    packet_output = json.loads(Path(packet_path).read_text())
    policy = json.loads(Path(policy_path).read_text())

    if not packet_output.get("ok"):
        emit(False, "blocked_packet_output_not_ok", "packet_output_not_ok")
        raise SystemExit(1)

    hold = packet_output.get("hold", {})
    if hold.get("reserve_execution_packet_shape_created") is not True:
        emit(True, "blocked_packet_shape_not_created", "reserve_execution_packet_shape_created_false")
        return

    packet = packet_output.get("reserve_execution_packet")
    if not packet:
        emit(False, "blocked_missing_execution_packet_shape", "reserve_execution_packet_missing")
        raise SystemExit(1)

    if packet.get("reserve_execution_packet_kind") != "automatic_payment_canary_inventory_reserve_execution_packet":
        emit(False, "blocked_wrong_execution_packet_kind", "reserve_execution_packet_kind_invalid")
        raise SystemExit(1)

    if packet.get("reserve_execution_packet_status") != "held_shape_only_pending_separate_execute":
        emit(False, "blocked_wrong_execution_packet_status", "reserve_execution_packet_status_invalid")
        raise SystemExit(1)

    boundary = packet.get("execute_boundary", {})
    forbidden_true = [
        "this_packet_executes_now",
        "inventory_reserved_now",
        "inventory_decremented_now",
        "ledger_written_now",
        "fulfillment_executed_now",
        "wallet_signing_now",
        "void_transfer_now",
    ]
    for key in forbidden_true:
        if boundary.get(key) is not False:
            emit(False, "blocked_packet_boundary_allows_mutation", key + "_not_false")
            raise SystemExit(1)

    if boundary.get("separate_operator_execute_required") is not True:
        emit(False, "blocked_missing_separate_operator_execute_requirement", "separate_operator_execute_required_not_true")
        raise SystemExit(1)

    for key in [
        "allow_actual_inventory_mutation",
        "allow_private_ledger_write",
        "allow_fulfillment_execution",
        "allow_wallet_signing",
        "allow_void_transfer",
    ]:
        if policy.get(key) is not False:
            emit(False, "blocked_dry_run_policy_allows_mutation", key + "_not_false")
            raise SystemExit(1)

    requested = Decimal(str(packet.get("requested_void_amount")))
    expected_before = Decimal(str(policy.get("expected_inventory_remaining_before")))
    packet_before = Decimal(str(packet.get("canary_inventory_remaining_void_before")))

    if expected_before != packet_before:
        emit(False, "blocked_inventory_before_mismatch", "expected_before_does_not_match_packet")
        raise SystemExit(1)

    if requested <= 0:
        emit(False, "blocked_nonpositive_requested_void", "requested_void_amount_nonpositive")
        raise SystemExit(1)

    if requested > expected_before:
        emit(True, "blocked_insufficient_inventory_for_dry_run", "requested_void_exceeds_inventory")
        return

    after = expected_before - requested

    dry_run = {
        "dry_run_result_kind": "automatic_payment_canary_inventory_reserve_execution_dry_run_result",
        "dry_run_result_status": "ready_for_separate_actual_execute_review",
        "source_packet_kind": packet.get("reserve_execution_packet_kind"),
        "canonical_payment_identity": packet.get("canonical_payment_identity"),
        "buyer_key": packet.get("buyer_key"),
        "void_receive_address": packet.get("void_receive_address"),
        "requested_void_amount": norm(requested),
        "inventory_remaining_before": norm(expected_before),
        "inventory_remaining_after_if_executed": norm(after),
        "actual_inventory_mutation_performed": False,
        "operator_actual_execute_required_after_dry_run": bool(policy.get("operator_actual_execute_required_after_dry_run", True))
    }

    emit(True, "inventory_reserve_execution_dry_run_ready", "dry_run_computed_without_mutation", dry_run)

if __name__ == "__main__":
    main()
