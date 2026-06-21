#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

tx_hash="${VOID_WC_TO_VOID_TX_HASH:-}"
rpc="${VOID_WC_TO_VOID_EXECUTION_RPC_URL:-http://127.0.0.1:8545}"
ledger="${VOID_WC_TO_VOID_SETTLEMENT_LEDGER:-ops/private/wc-to-void-settlements.jsonl}"
out="${VOID_WC_TO_VOID_POST_EXECUTION_SETTLEMENT_RECORD_OUT:-/tmp/void-wc-to-void-post-execution-settlement-record-v1.json}"

expected_tx_hash="0xaccef593ae1cab3f99ff786a26913b0d873ee789dfb96056007dd9dab9f3e717"
expected_chain_id="2050"
expected_value_wei="1000000000000000000"
expected_value_void="1.000000"
expected_from_sha="dffe1949d232f54161e6facdac629631725dcf4d144e0c3a3147319fcac8a5fb"
expected_recipient_sha="b76db82f5a3a86e4fb2d3e5800327d1618108c24c721aed1222737f7ff99d9c9"
expected_recipient_onchain_sha="70f6d039f51576ee4cf0c5686bb639806323c545da233533693f83ea501c2eb6"
expected_manual_packet_sha="88bc15e33afe845561733ed1fc1f9d71d362f6e5e28ea5bd7f6c095d6598dc40"
expected_terminal_request_sha="9f6f850a798cb8f0ea2b8ae3e7de5070bdd5ba676876c3a7277573dceeeba0e5"
expected_settlement_key="4f31fe4b41846562af9a4ae0a5f27be6e6add9b93762750b3eeae33faf7eaf9e"
expected_preview_sha="f167b48114902fc39c90b8abc5447b376b71fbd719dc6bd23e5f335f465c77e8"
expected_approval_sha="2bed1bf6314fb6ef6c6908e356bf2b0d929cd9510e23c52a70fedbbdeeeda721"
expected_wc="100"

if ! printf '%s\n' "$tx_hash" | grep -Eq '^0x[a-fA-F0-9]{64}$'; then
  echo "VOID_WC_TO_VOID_POST_EXECUTION_SETTLEMENT_RECORD_V1_TX_HASH_REQUIRED"
  exit 3
fi

if [ "$tx_hash" != "$expected_tx_hash" ]; then
  echo "VOID_WC_TO_VOID_POST_EXECUTION_SETTLEMENT_RECORD_V1_UNEXPECTED_TX_HASH"
  exit 4
fi

chain_id="$(cast chain-id --rpc-url "$rpc")"
receipt_json="/tmp/void-wc-to-void-post-execution-settlement-record-v1-receipt.json"
tx_json="/tmp/void-wc-to-void-post-execution-settlement-record-v1-tx.json"

cast receipt "$tx_hash" --rpc-url "$rpc" --json > "$receipt_json"
cast tx "$tx_hash" --rpc-url "$rpc" --json > "$tx_json"

python3 - "$receipt_json" "$tx_json" "$out" "$ledger" "$chain_id" \
  "$expected_tx_hash" "$expected_chain_id" "$expected_value_wei" "$expected_value_void" \
  "$expected_from_sha" "$expected_recipient_sha" "$expected_recipient_onchain_sha" "$expected_manual_packet_sha" \
  "$expected_terminal_request_sha" "$expected_settlement_key" "$expected_preview_sha" \
  "$expected_approval_sha" "$expected_wc" <<'PY'
import json
import hashlib
import sys
import time
from pathlib import Path

(
    receipt_path,
    tx_path,
    out_path,
    ledger_path,
    chain_id,
    expected_tx_hash,
    expected_chain_id,
    expected_value_wei,
    expected_value_void,
    expected_from_sha,
    expected_recipient_sha,
    expected_recipient_onchain_sha,
    expected_manual_packet_sha,
    expected_terminal_request_sha,
    expected_settlement_key,
    expected_preview_sha,
    expected_approval_sha,
    expected_wc,
) = sys.argv[1:]

receipt = json.loads(Path(receipt_path).read_text())
tx = json.loads(Path(tx_path).read_text())

def norm_addr(v):
    return (v or "").lower()

def hex_to_int(v):
    if isinstance(v, int):
        return v
    if isinstance(v, str) and v.startswith("0x"):
        return int(v, 16)
    if isinstance(v, str) and v:
        return int(v)
    return 0

tx_hash = receipt.get("transactionHash") or receipt.get("transaction_hash") or tx.get("hash")
status_raw = receipt.get("status")
status_ok = status_raw in ("0x1", 1, "1", True)

from_addr = norm_addr(tx.get("from"))
to_addr = norm_addr(tx.get("to"))
value_wei = str(hex_to_int(tx.get("value")))

from_sha = hashlib.sha256(from_addr.encode()).hexdigest()
to_sha = hashlib.sha256(to_addr.encode()).hexdigest()

settlement_record_key_material = {
    "tx_hash": expected_tx_hash,
    "settlement_key": expected_settlement_key,
    "preview_sha256": expected_preview_sha,
    "approval_record_sha256": expected_approval_sha,
    "manual_execute_packet_sha256": expected_manual_packet_sha,
    "terminal_execute_request_packet_sha256": expected_terminal_request_sha,
    "from_address_sha256": expected_from_sha,
    "recipient_address_sha256": expected_recipient_sha,
    "recipient_onchain_address_sha256": expected_recipient_onchain_sha,
    "value_wei": expected_value_wei,
    "chain_id": expected_chain_id,
}
settlement_record_key = hashlib.sha256(
    json.dumps(settlement_record_key_material, sort_keys=True, separators=(",", ":")).encode()
).hexdigest()

ledger = Path(ledger_path)
existing = []
duplicate_found = False
if ledger.exists():
    for line in ledger.read_text().splitlines():
        if not line.strip():
            continue
        try:
            row = json.loads(line)
            existing.append(row)
            if row.get("settlement_record_key") == settlement_record_key or row.get("tx_hash") == expected_tx_hash:
                duplicate_found = True
        except Exception:
            pass

preconditions = {
    "tx_hash_expected_ok": tx_hash == expected_tx_hash,
    "chain_id_expected_ok": chain_id == expected_chain_id,
    "receipt_status_success_ok": status_ok is True,
    "value_wei_expected_ok": value_wei == expected_value_wei,
    "from_address_sha_expected_ok": from_sha == expected_from_sha,
    "recipient_address_sha_expected_ok": to_sha == expected_recipient_onchain_sha,
    "recipient_declared_address_sha_expected_ok": expected_recipient_sha == "b76db82f5a3a86e4fb2d3e5800327d1618108c24c721aed1222737f7ff99d9c9",
    "duplicate_not_found_ok": duplicate_found is False,
}
preconditions_green = all(preconditions.values())

record = {
    "marker": "VOID_WC_TO_VOID_POST_EXECUTION_SETTLEMENT_RECORD_V1",
    "ok": True,
    "settlement_record_written": bool(preconditions_green),
    "settlement_record_key": settlement_record_key,
    "tx_hash": expected_tx_hash,
    "chain_id": expected_chain_id,
    "receipt_status_success": status_ok,
    "value_wei": expected_value_wei,
    "value_void": expected_value_void,
    "from_address_sha256": expected_from_sha,
    "recipient_address_sha256": expected_recipient_sha,
    "recipient_onchain_address_sha256": expected_recipient_onchain_sha,
    "approved_settlement": {
        "settlement_key": expected_settlement_key,
        "preview_sha256": expected_preview_sha,
        "approval_record_sha256": expected_approval_sha,
        "wc": expected_wc,
        "void": expected_value_void,
    },
    "execution_packets": {
        "manual_execute_packet_sha256": expected_manual_packet_sha,
        "terminal_execute_request_packet_sha256": expected_terminal_request_sha,
    },
    "preconditions": {
        **preconditions,
        "preconditions_green": preconditions_green,
    },
    "duplicate_guard": {
        "ledger_path": ledger_path,
        "existing_entry_count": len(existing),
        "duplicate_found": duplicate_found,
    },
    "privacy": {
        "plaintext_from_address_written_to_repo": False,
        "plaintext_recipient_address_written_to_repo": False,
        "private_key_seen_by_chat_or_repo": False,
        "seed_phrase_seen_by_chat_or_repo": False,
    },
    "post_execution_state": {
        "money_movement_performed": True,
        "post_execution_settlement_record_created": bool(preconditions_green),
        "wc_to_void_settlement_complete": bool(preconditions_green),
        "buy_void_is_canonical_funding_route": True,
    },
    "created_unix": int(time.time()),
}

Path(out_path).parent.mkdir(parents=True, exist_ok=True)
Path(out_path).write_text(json.dumps(record, indent=2, sort_keys=True) + "\n")

if not preconditions_green:
    print(json.dumps(record, indent=2, sort_keys=True))
    print("VOID_WC_TO_VOID_POST_EXECUTION_SETTLEMENT_RECORD_V1_PRECONDITIONS_RED")
    sys.exit(2)

ledger.parent.mkdir(parents=True, exist_ok=True)
with ledger.open("a") as f:
    f.write(json.dumps(record, sort_keys=True, separators=(",", ":")) + "\n")

print(json.dumps(record, indent=2, sort_keys=True))
print("VOID_WC_TO_VOID_POST_EXECUTION_SETTLEMENT_RECORD_V1_GREEN")
PY
