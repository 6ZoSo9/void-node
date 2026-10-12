#!/usr/bin/env python3
import json
import os
from decimal import Decimal, getcontext
from pathlib import Path

getcontext().prec = 50

MARKER = "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_INVENTORY_RESERVE_CANDIDATE_PREFLIGHT_V1"

def emit(ok, state, reason, reserve_candidate=None):
    eligible = ok is True and state == "inventory_reserve_candidate_eligible" and reserve_candidate is not None
    print(json.dumps({
        "marker": MARKER,
        "ok": ok,
        "preflight": {
            "state": state,
            "reason": reason,
            "inventory_reserve_candidate_eligible": eligible
        },
        "inventory_reserve_candidate": reserve_candidate,
        "authority": {
            "inventory_reserve_candidate_created": eligible,
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

def dec(value):
    return Decimal(str(value))

def main():
    allocation_output_path = os.environ.get("CANARY_ALLOCATION_CANDIDATE_OUTPUT_JSON")
    policy_path = os.environ.get("CANARY_INVENTORY_POLICY_JSON")

    if not allocation_output_path:
        emit(False, "blocked_missing_allocation_candidate_output", "CANARY_ALLOCATION_CANDIDATE_OUTPUT_JSON_required")
        raise SystemExit(1)
    if not policy_path:
        emit(False, "blocked_missing_inventory_policy", "CANARY_INVENTORY_POLICY_JSON_required")
        raise SystemExit(1)

    allocation_output = json.loads(Path(allocation_output_path).read_text())
    policy = json.loads(Path(policy_path).read_text())

    if not allocation_output.get("ok"):
        emit(False, "blocked_allocation_candidate_output_not_ok", "allocation_candidate_output_not_ok")
        raise SystemExit(1)

    gate = allocation_output.get("gate", {})
    if gate.get("allocation_candidate_created") is not True:
        emit(True, "blocked_allocation_candidate_not_created", "allocation_candidate_created_false")
        return

    candidate = allocation_output.get("allocation_candidate")
    if not candidate:
        emit(False, "blocked_missing_allocation_candidate", "allocation_candidate_missing")
        raise SystemExit(1)

    if candidate.get("allocation_candidate_kind") != "automatic_payment_canary_allocation_candidate":
        emit(False, "blocked_wrong_allocation_candidate_kind", "allocation_candidate_kind_invalid")
        raise SystemExit(1)

    if candidate.get("allocation_candidate_status") != "created_pending_inventory_reserve_gate":
        emit(False, "blocked_wrong_allocation_candidate_status", "allocation_candidate_status_invalid")
        raise SystemExit(1)

    if int(policy.get("canary_candidate_limit")) != 1:
        emit(False, "blocked_canary_limit_not_one", "canary_candidate_limit_invalid")
        raise SystemExit(1)

    if int(policy.get("canary_candidates_already_reserved")) >= 1:
        emit(True, "blocked_canary_candidate_limit_exhausted", "canary_candidate_limit_exhausted")
        return

    requested_void = dec(candidate.get("void_amount"))
    remaining_void = dec(policy.get("canary_inventory_remaining_void"))

    if requested_void <= 0:
        emit(False, "blocked_nonpositive_void_amount", "void_amount_nonpositive")
        raise SystemExit(1)

    if requested_void > remaining_void:
        emit(True, "blocked_insufficient_canary_inventory", "requested_void_exceeds_remaining_inventory")
        return

    reserve_candidate = {
        "inventory_reserve_candidate_kind": "automatic_payment_canary_inventory_reserve_candidate",
        "inventory_reserve_candidate_status": "eligible_pending_operator_actual_reserve",
        "source_allocation_candidate_kind": candidate.get("allocation_candidate_kind"),
        "canonical_payment_identity": candidate.get("canonical_payment_identity"),
        "buyer_key": candidate.get("buyer_key"),
        "void_receive_address": candidate.get("void_receive_address"),
        "requested_void_amount": str(requested_void.normalize()),
        "canary_inventory_remaining_void_before": str(remaining_void.normalize()),
        "canary_inventory_remaining_void_after_if_reserved": str((remaining_void - requested_void).normalize()),
        "operator_review_required_before_actual_reserve": bool(policy.get("operator_review_required_before_actual_reserve", True))
    }

    emit(True, "inventory_reserve_candidate_eligible", "allocation_candidate_within_canary_inventory_policy", reserve_candidate)

if __name__ == "__main__":
    main()
