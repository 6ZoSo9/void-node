#!/usr/bin/env python3
import json
import os
from pathlib import Path

MARKER = "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_ALLOCATION_CANDIDATE_GATE_V1"

def emit(ok, state, reason, allocation_candidate=None):
    created = ok is True and state == "allocation_candidate_created" and allocation_candidate is not None
    print(json.dumps({
        "marker": MARKER,
        "ok": ok,
        "gate": {
            "state": state,
            "reason": reason,
            "allocation_candidate_created": created
        },
        "allocation_candidate": allocation_candidate,
        "authority": {
            "allocation_candidate_created": created,
            "allocation_record_created": False,
            "private_allocation_ledger_write": False,
            "inventory_reserved": False,
            "fulfillment_executed": False,
            "wallet_signing": False,
            "void_transfer": False,
            "public_mutation": False,
            "public_buyer_execution": False
        }
    }, indent=2))

def main():
    review_output_path = os.environ.get("CANARY_CANDIDATE_REVIEW_OUTPUT_JSON")
    if not review_output_path:
        emit(False, "blocked_missing_review_output", "CANARY_CANDIDATE_REVIEW_OUTPUT_JSON_required")
        raise SystemExit(1)

    review = json.loads(Path(review_output_path).read_text())

    if not review.get("ok"):
        emit(False, "blocked_review_not_ok", "review_not_ok")
        raise SystemExit(1)

    r = review.get("review", {})
    if r.get("state") != "approved_for_allocation_candidate":
        emit(True, "blocked_review_not_approved", "review_state:" + str(r.get("state")))
        return

    if r.get("approved_for_allocation_candidate") is not True:
        emit(True, "blocked_not_approved_for_allocation_candidate", "approval_flag_false")
        return

    candidate = review.get("candidate")
    if not candidate:
        emit(False, "blocked_missing_candidate", "candidate_missing")
        raise SystemExit(1)

    if candidate.get("candidate_kind") != "automatic_payment_canary_candidate":
        emit(False, "blocked_wrong_candidate_kind", "candidate_kind_invalid")
        raise SystemExit(1)

    allocation_candidate = {
        "allocation_candidate_kind": "automatic_payment_canary_allocation_candidate",
        "allocation_candidate_status": "created_pending_inventory_reserve_gate",
        "source_candidate_kind": candidate.get("candidate_kind"),
        "source_candidate_status": candidate.get("candidate_status"),
        "canonical_payment_identity": candidate.get("canonical_payment_identity"),
        "chain_id": candidate.get("chain_id"),
        "chain_name": candidate.get("chain_name"),
        "transaction_hash": candidate.get("transaction_hash"),
        "transfer_log_index": candidate.get("transfer_log_index"),
        "amount_raw": candidate.get("amount_raw"),
        "amount_usdc": candidate.get("amount_usdc"),
        "rate_usdc_per_void": candidate.get("rate_usdc_per_void"),
        "void_amount": candidate.get("void_amount"),
        "buyer_key": candidate.get("buyer_key"),
        "void_receive_address": candidate.get("void_receive_address"),
        "canary": {
            "candidate_limit": 1,
            "allocation_candidate_created": True,
            "process_one_candidate_then_stop": True,
            "operator_review_required_before_inventory_reserve": True
        }
    }

    emit(True, "allocation_candidate_created", "review_approved_candidate", allocation_candidate)

if __name__ == "__main__":
    main()
