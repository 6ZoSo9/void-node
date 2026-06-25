#!/usr/bin/env python3
import json
import os
import re
import sys
from decimal import Decimal, getcontext
from pathlib import Path

getcontext().prec = 50

MARKER = "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_CANDIDATE_BUILDER_V1"

ALLOWED = {
    1: {
        "name": "ethereum",
        "usdc_contract": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        "min_confirmations": 12,
    },
    8453: {
        "name": "base",
        "usdc_contract": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        "min_confirmations": 30,
    },
}

def fail(msg: str) -> None:
    print(json.dumps({
        "marker": MARKER,
        "ok": False,
        "error": msg,
        "authority": {
            "candidate_built": False,
            "ledger_write": False,
            "inventory_reserved": False,
            "fulfillment_executed": False,
            "wallet_signing": False,
            "void_transfer": False,
            "public_mutation": False
        }
    }, indent=2))
    raise SystemExit(1)

def require_hex(value: str, nibbles: int, name: str) -> None:
    if not isinstance(value, str) or not re.fullmatch(r"0x[a-fA-F0-9]{%d}" % nibbles, value):
        fail(f"{name}_invalid")

def main() -> None:
    input_path = os.environ.get("CANARY_CANDIDATE_INPUT_JSON")
    if not input_path:
        fail("CANARY_CANDIDATE_INPUT_JSON_required")

    raw = json.loads(Path(input_path).read_text())

    chain_id = int(raw.get("chain_id"))
    if chain_id not in ALLOWED:
        fail("chain_not_allowed")

    policy = ALLOWED[chain_id]

    tx_hash = raw.get("transaction_hash")
    require_hex(tx_hash, 64, "transaction_hash")

    transfer_log_index = int(raw.get("transfer_log_index"))
    if transfer_log_index < 0:
        fail("transfer_log_index_invalid")

    usdc_contract = str(raw.get("usdc_contract"))
    if usdc_contract.lower() != policy["usdc_contract"].lower():
        fail("usdc_contract_not_allowed")

    require_hex(str(raw.get("from")), 40, "from")
    require_hex(str(raw.get("to")), 40, "to")

    amount_raw = int(str(raw.get("amount_raw")))
    if amount_raw <= 0:
        fail("amount_raw_nonpositive")

    confirmations = int(raw.get("confirmations"))
    if confirmations < policy["min_confirmations"]:
        fail("insufficient_confirmations")

    buyer_key = str(raw.get("buyer_key", "")).strip()
    if not buyer_key or len(buyer_key) > 128:
        fail("buyer_key_invalid")

    void_receive_address = str(raw.get("void_receive_address", "")).strip()
    if not void_receive_address or len(void_receive_address) > 160:
        fail("void_receive_address_invalid")

    rate = Decimal(str(raw.get("rate_usdc_per_void", "0.50")))
    if rate != Decimal("0.50"):
        fail("rate_invalid")

    usdc = Decimal(amount_raw) / Decimal(1_000_000)
    if usdc > Decimal("100.00"):
        fail("canary_amount_exceeds_100_usdc")

    void_amount = usdc / rate
    canonical_payment_identity = f"{chain_id}:{tx_hash.lower()}:{transfer_log_index}"

    candidate = {
        "marker": MARKER,
        "ok": True,
        "candidate": {
            "candidate_kind": "automatic_payment_canary_candidate",
            "candidate_status": "built_pending_operator_review",
            "canonical_payment_identity": canonical_payment_identity,
            "chain_id": chain_id,
            "chain_name": policy["name"],
            "transaction_hash": tx_hash.lower(),
            "transfer_log_index": transfer_log_index,
            "usdc_contract": policy["usdc_contract"],
            "amount_raw": str(amount_raw),
            "amount_usdc": format(usdc, "f"),
            "rate_usdc_per_void": "0.50",
            "void_amount": format(void_amount, "f"),
            "buyer_key": buyer_key,
            "void_receive_address": void_receive_address,
            "confirmations": confirmations
        },
        "canary": {
            "candidate_limit": 1,
            "candidate_built": True,
            "process_one_candidate_then_stop": True,
            "operator_review_required_after_candidate": True
        },
        "authority": {
            "candidate_built": True,
            "ledger_write": False,
            "inventory_reserved": False,
            "fulfillment_executed": False,
            "wallet_signing": False,
            "void_transfer": False,
            "public_mutation": False
        }
    }

    print(json.dumps(candidate, indent=2))

if __name__ == "__main__":
    main()
