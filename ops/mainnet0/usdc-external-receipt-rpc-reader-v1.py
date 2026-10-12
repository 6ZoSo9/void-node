#!/usr/bin/env python3
import json
import os
import sys
import urllib.request

MARKER = "VOID_USDC_EXTERNAL_RECEIPT_RPC_READER_V1"
TRANSFER_TOPIC0 = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"

def norm_addr(value):
 if value is None:
  return None
 v = str(value).lower()
 return v if v.startswith("0x") else "0x" + v

def topic_addr(topic):
 if not topic or not isinstance(topic, str):
  return None
 return "0x" + topic.lower().replace("0x", "")[-40:]

def hex_int(value):
 if value in (None, "", "0x"):
  return 0
 if isinstance(value, int):
  return value
 return int(str(value), 16)

def authority_false_payload(mode):
 return {
  "marker": MARKER,
  "status": "rpc_reader_" + mode + "_authority_false",
  "reader_mode": mode,
  "live_chain_data": mode == "live_read_only",
  "external_chain_rpc_fetch_enabled": mode == "live_read_only",
  "receipt_fetch_attempted": False,
  "receipt_found": False,
  "transfer_log_count": 0,
  "matching_transfer_log_count": 0,
  "finality_verified_now": False,
  "external_state_root_trust_enabled": False,
  "real_payment_verified_now": False,
  "automatic_fulfillment_enabled": False,
  "private_allocation_ledger_write_enabled": False,
  "inventory_reserved_now": False,
  "void_transfer_now": False,
  "public_mutation_enabled": False,
 }

def main():
 rpc_url = os.environ.get("USDC_EXTERNAL_RPC_URL", "").strip()
 tx_hash = os.environ.get("USDC_EXTERNAL_TX_HASH", "").strip()
 token_filter = norm_addr(os.environ.get("USDC_EXTERNAL_USDC_TOKEN")) if os.environ.get("USDC_EXTERNAL_USDC_TOKEN") else None
 receiver_filter = norm_addr(os.environ.get("USDC_EXTERNAL_OFFICIAL_RECEIVER")) if os.environ.get("USDC_EXTERNAL_OFFICIAL_RECEIVER") else None
 amount_filter = os.environ.get("USDC_EXTERNAL_AMOUNT_RAW")
 chain_id = os.environ.get("USDC_EXTERNAL_CHAIN_ID", "")
 if not rpc_url or not tx_hash:
  payload = authority_false_payload("disabled_missing_env")
  payload["required_env_present"] = False
  print(json.dumps(payload, indent=2, sort_keys=True))
  print("VOID_USDC_EXTERNAL_RECEIPT_RPC_READER_V1_DISABLED_GREEN", file=sys.stderr)
  return 0
 req_body = json.dumps({"jsonrpc":"2.0","id":1,"method":"eth_getTransactionReceipt","params":[tx_hash]}).encode()
 req = urllib.request.Request(rpc_url, data=req_body, headers={"content-type":"application/json","user-agent":"void-node-live-readonly/1.0"}, method="POST")
 with urllib.request.urlopen(req, timeout=15) as resp:
  rpc = json.loads(resp.read().decode())
 if rpc.get("error"):
  raise SystemExit("rpc_error=" + json.dumps(rpc["error"], sort_keys=True))
 receipt = rpc.get("result")
 transfer_logs = []
 matching_logs = []
 if receipt:
  for log in receipt.get("logs", []):
   topics = log.get("topics") or []
   if not topics or str(topics[0]).lower() != TRANSFER_TOPIC0:
    continue
   item = {"log_index": hex_int(log.get("logIndex")), "token_contract": norm_addr(log.get("address")), "from_address": topic_addr(topics[1]) if len(topics) > 1 else None, "to_address": topic_addr(topics[2]) if len(topics) > 2 else None, "amount_raw": str(hex_int(log.get("data"))), "topic0": str(topics[0]).lower()}
   item["token_matches_filter"] = token_filter is None or item["token_contract"] == token_filter
   item["receiver_matches_filter"] = receiver_filter is None or item["to_address"] == receiver_filter
   item["amount_matches_filter"] = amount_filter is None or item["amount_raw"] == str(amount_filter)
   item["canonical_payment_identity"] = ":".join([str(chain_id or "chain_id_unset"), tx_hash.lower(), str(item["log_index"]), str(item["token_contract"]), str(item["to_address"]), str(item["amount_raw"])])
   transfer_logs.append(item)
   if item["token_matches_filter"] and item["receiver_matches_filter"] and item["amount_matches_filter"]:
    matching_logs.append(item)
 payload = authority_false_payload("live_read_only")
 payload.update({"required_env_present": True, "receipt_fetch_attempted": True, "tx_hash": tx_hash, "chain_id_hint": chain_id or None, "receipt_found": receipt is not None, "receipt_status": receipt.get("status") if receipt else None, "block_number": hex_int(receipt.get("blockNumber")) if receipt else None, "transfer_log_count": len(transfer_logs), "matching_transfer_log_count": len(matching_logs), "transfer_logs": transfer_logs, "matching_transfer_logs": matching_logs, "real_payment_verified_now": False, "finality_verified_now": False, "non_activation_statement": "live receipt observation only; no finality verification, state-root trust, inventory reserve, ledger write, automatic fulfillment, or VOID transfer"})
 print(json.dumps(payload, indent=2, sort_keys=True))
 print("VOID_USDC_EXTERNAL_RECEIPT_RPC_READER_V1_LIVE_READ_ONLY_GREEN", file=sys.stderr)
 return 0

if __name__ == "__main__":
 raise SystemExit(main())
