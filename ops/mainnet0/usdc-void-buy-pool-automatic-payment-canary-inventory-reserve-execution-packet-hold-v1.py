#!/usr/bin/env python3
import json
import os
from pathlib import Path

MARKER = "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_INVENTORY_RESERVE_EXECUTION_PACKET_HOLD_V1"

def emit(ok, state, reason, packet=None):
    packet_created = ok is True and state == "reserve_execution_packet_shape_ready" and packet is not None
    print(json.dumps({
        "marker": MARKER,
        "ok": ok,
        "hold": {
            "state": state,
            "reason": reason,
            "reserve_execution_packet_shape_created": packet_created
        },
        "reserve_execution_packet": packet,
        "authority": {
            "reserve_execution_packet_shape_created": packet_created,
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
    approval_path = os.environ.get("CANARY_INVENTORY_RESERVE_OPERATOR_APPROVAL_OUTPUT_JSON")
    if not approval_path:
        emit(False, "blocked_missing_operator_approval_output", "CANARY_INVENTORY_RESERVE_OPERATOR_APPROVAL_OUTPUT_JSON_required")
        raise SystemExit(1)

    approval = json.loads(Path(approval_path).read_text())

    if not approval.get("ok"):
        emit(False, "blocked_operator_approval_not_ok", "operator_approval_not_ok")
        raise SystemExit(1)

    op = approval.get("operator_approval", {})
    if op.get("state") != "approved_for_separate_inventory_reserve_execution_packet":
        emit(True, "blocked_operator_approval_not_approved", "operator_approval_state:" + str(op.get("state")))
        return

    if op.get("approved_for_separate_inventory_reserve_execution_packet") is not True:
        emit(True, "blocked_operator_approval_flag_false", "approval_flag_false")
        return

    candidate = approval.get("inventory_reserve_candidate")
    if not candidate:
        emit(False, "blocked_missing_inventory_reserve_candidate", "inventory_reserve_candidate_missing")
        raise SystemExit(1)

    if candidate.get("inventory_reserve_candidate_kind") != "automatic_payment_canary_inventory_reserve_candidate":
        emit(False, "blocked_wrong_inventory_reserve_candidate_kind", "inventory_reserve_candidate_kind_invalid")
        raise SystemExit(1)

    if candidate.get("inventory_reserve_candidate_status") != "eligible_pending_operator_actual_reserve":
        emit(False, "blocked_wrong_inventory_reserve_candidate_status", "inventory_reserve_candidate_status_invalid")
        raise SystemExit(1)

    packet = {
        "reserve_execution_packet_kind": "automatic_payment_canary_inventory_reserve_execution_packet",
        "reserve_execution_packet_status": "held_shape_only_pending_separate_execute",
        "source_inventory_reserve_candidate_kind": candidate.get("inventory_reserve_candidate_kind"),
        "canonical_payment_identity": candidate.get("canonical_payment_identity"),
        "buyer_key": candidate.get("buyer_key"),
        "void_receive_address": candidate.get("void_receive_address"),
        "requested_void_amount": candidate.get("requested_void_amount"),
        "canary_inventory_remaining_void_before": candidate.get("canary_inventory_remaining_void_before"),
        "canary_inventory_remaining_void_after_if_reserved": candidate.get("canary_inventory_remaining_void_after_if_reserved"),
        "execute_boundary": {
            "separate_operator_execute_required": True,
            "this_packet_executes_now": False,
            "inventory_reserved_now": False,
            "inventory_decremented_now": False,
            "ledger_written_now": False,
            "fulfillment_executed_now": False,
            "wallet_signing_now": False,
            "void_transfer_now": False
        }
    }

    emit(True, "reserve_execution_packet_shape_ready", "operator_approved_reserve_candidate_packet_shape_only", packet)

if __name__ == "__main__":
    main()
