#!/usr/bin/env python3
import json
import os
from pathlib import Path

MARKER = "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_RPC_OUTCOME_CLASSIFIER_V1"

def emit(state, candidate_may_be_built, retry_allowed, rejection, reason):
    print(json.dumps({
        "marker": MARKER,
        "classification": {
            "state": state,
            "candidate_may_be_built": candidate_may_be_built,
            "retry_allowed": retry_allowed,
            "rejection": rejection,
            "reason": reason
        },
        "authority": {
            "candidate_built": False,
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
    input_path = os.environ.get("RPC_OUTCOME_INPUT_JSON")
    if not input_path:
        emit("held_rpc_error", False, True, False, "RPC_OUTCOME_INPUT_JSON_required")
        raise SystemExit(1)

    d = json.loads(Path(input_path).read_text())
    status = d.get("rpc_status")

    if status == 403:
        emit("held_rpc_access_blocked", False, True, False, "rpc_access_blocked")
        return
    if status == 429:
        emit("held_rpc_rate_limited", False, True, False, "rpc_rate_limited")
        return
    if status == "timeout":
        emit("held_rpc_timeout", False, True, False, "rpc_timeout")
        return
    if status == "rpc_error":
        emit("held_rpc_error", False, True, False, "rpc_error")
        return

    if status == 200 and not bool(d.get("receipt_present")):
        emit("pending_not_mined_or_not_indexed", False, True, False, "receipt_null")
        return

    if not bool(d.get("chain_allowed")):
        emit("rejected_wrong_chain", False, False, True, "chain_not_allowed")
        return
    if not bool(d.get("token_allowed")):
        emit("rejected_wrong_token", False, False, True, "token_not_allowed")
        return
    if not bool(d.get("receiver_allowed")):
        emit("rejected_wrong_receiver", False, False, True, "receiver_not_allowed")
        return
    if bool(d.get("duplicate_payment_identity")):
        emit("rejected_duplicate_payment_identity", False, False, True, "duplicate_payment_identity")
        return

    required = [
        "receipt_present",
        "receipt_status_success",
        "transfer_log_match",
        "finality_confirmations_met"
    ]
    missing = [k for k in required if not bool(d.get(k))]
    if missing:
        emit("held_rpc_error", False, True, False, "missing_or_false_required_fields:" + ",".join(missing))
        return

    emit("eligible_candidate_path", True, False, False, "verified_receipt_transfer_log_ready")

if __name__ == "__main__":
    main()
