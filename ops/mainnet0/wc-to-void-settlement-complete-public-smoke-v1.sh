#!/usr/bin/env bash
set -euo pipefail

base="${VOID_PUBLIC_BASE:-https://zoso-alienware-aurora-r7.taila47fd.ts.net}"
tmp="$(mktemp -d)"

tx="0xaccef593ae1cab3f99ff786a26913b0d873ee789dfb96056007dd9dab9f3e717"
final_marker="VOID_WC_TO_VOID_SETTLEMENT_EVIDENCE_FINAL_PUBLIC_INDEX_RUNTIME_V1"
dashboard_marker="VOID_WC_TO_VOID_SETTLEMENT_COMPLETE_DASHBOARD_CARD_RUNTIME_V1"
verify_pack_marker="VOID_WC_TO_VOID_PUBLIC_REVIEWER_ONE_COMMAND_VERIFY_PACK_V1"
receipt_marker="VOID_WC_TO_VOID_REDACTED_SETTLEMENT_RECEIPT_RUNTIME_V1"

echo "VOID_WC_TO_VOID_SETTLEMENT_COMPLETE_PUBLIC_SMOKE_V1_BEGIN"
echo "base=$base"

curl -fsS "$base/public-node" > "$tmp/public-node.html"
curl -fsS "$base/public-node/route-index.json" > "$tmp/route-index.json"
curl -fsS "$base/public-node/wc-to-void/settlement-evidence-final-public-index-v1.json" > "$tmp/final-index.json"
curl -fsS "$base/public-node/wc-to-void/settlement-evidence-final-public-index-v1" > "$tmp/final-index.html"
curl -fsS "$base/public-node/wc-to-void/public-reviewer-one-command-verify-pack-v1.json" > "$tmp/verify-pack.json"
curl -fsS "$base/public-node/wc-to-void/redacted-settlement-receipt-v1.json" > "$tmp/receipt.json"

grep -F "$dashboard_marker" "$tmp/public-node.html" >/dev/null
grep -F "sealed_live_index_ready" "$tmp/public-node.html" >/dev/null
grep -F "$tx" "$tmp/public-node.html" >/dev/null
grep -F "/public-node/wc-to-void/settlement-evidence-final-public-index-v1" "$tmp/public-node.html" >/dev/null
grep -F "/public-node/wc-to-void/public-reviewer-one-command-verify-pack-v1" "$tmp/public-node.html" >/dev/null

grep -F "/public-node/wc-to-void/settlement-evidence-final-public-index-v1.json" "$tmp/route-index.json" >/dev/null
grep -F "/public-node/wc-to-void/settlement-evidence-final-public-index-v1" "$tmp/route-index.json" >/dev/null

grep -F "$final_marker" "$tmp/final-index.json" >/dev/null
grep -F "sealed_live_index_ready" "$tmp/final-index.json" >/dev/null
grep -F "$tx" "$tmp/final-index.json" >/dev/null

grep -F "$final_marker" "$tmp/final-index.html" >/dev/null
grep -F "$tx" "$tmp/final-index.html" >/dev/null

grep -F "$verify_pack_marker" "$tmp/verify-pack.json" >/dev/null
grep -F "$tx" "$tmp/verify-pack.json" >/dev/null

grep -F "$receipt_marker" "$tmp/receipt.json" >/dev/null
grep -F "$tx" "$tmp/receipt.json" >/dev/null

python3 - "$tmp/final-index.json" "$tmp/verify-pack.json" "$tmp/receipt.json" <<'PY'
import json
import sys

final_index = json.load(open(sys.argv[1]))
verify_pack = json.load(open(sys.argv[2]))
receipt = json.load(open(sys.argv[3]))

tx = "0xaccef593ae1cab3f99ff786a26913b0d873ee789dfb96056007dd9dab9f3e717"

def contains_tx(obj):
    return tx in json.dumps(obj, sort_keys=True)

assert contains_tx(final_index), "final index missing settlement tx"
assert contains_tx(verify_pack), "verify pack missing settlement tx"
assert contains_tx(receipt), "receipt missing settlement tx"

assert "VOID_WC_TO_VOID_SETTLEMENT_EVIDENCE_FINAL_PUBLIC_INDEX_RUNTIME_V1" in json.dumps(final_index)
assert "VOID_WC_TO_VOID_PUBLIC_REVIEWER_ONE_COMMAND_VERIFY_PACK_V1" in json.dumps(verify_pack)
assert "VOID_WC_TO_VOID_REDACTED_SETTLEMENT_RECEIPT_RUNTIME_V1" in json.dumps(receipt)
PY

echo "VOID_WC_TO_VOID_SETTLEMENT_COMPLETE_PUBLIC_SMOKE_V1_GREEN"
echo "base=$base"
echo "tx=$tx"
