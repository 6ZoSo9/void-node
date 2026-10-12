#!/usr/bin/env bash
set -euo pipefail

echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_SOURCE_HASH_CHAIN_DESIGN_PROOF_V1"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"
OUT="/tmp/public-node-source-hash-chain-design-proof"
mkdir -p "$OUT"

SRC="src/index.ts"
DOC="docs/public/public-node-first-external-tester-wc-source-hash-chain-design.md"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_SOURCE_HASH_CHAIN_DESIGN_V1" "$SRC"
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_SOURCE_HASH_CHAIN_DESIGN_ROUTE_V1" "$SRC"
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_SOURCE_HASH_CHAIN_DESIGN_UI_V1" "$SRC"
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_SOURCE_HASH_CHAIN_DESIGN_DOC_V1" "$DOC"

curl -fsS "$BASE/public-node/first-external-tester-wc-source-hash-chain-design.json" > "$OUT/design.json"
curl -fsS "$BASE/public-node/route-manifest.json" > "$OUT/route-manifest.json"
curl -fsS "$BASE/public-node/self-check-snapshot.json" > "$OUT/self-check.json"
curl -fsS "$BASE/public-node" > "$OUT/public-node.html"

python3 - "$OUT/design.json" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
assert d["marker"] == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_SOURCE_HASH_CHAIN_DESIGN_V1"
assert d["route_marker"] == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_SOURCE_HASH_CHAIN_DESIGN_ROUTE_V1"
assert d["design_only"] is True
assert d["source_hash_chain_green"] is False
assert d["ready_for_ledger_write"] is False
assert d["wc_ledger_write"] is False
assert d["wc_credit_award"] is False
assert d["wc_to_void_swap"] is False
assert d["no_mutation"]["money_movement"] is False
assert d["no_mutation"]["wallet_send"] is False
assert d["no_mutation"]["buy_void_fulfillment"] is False
assert d["no_mutation"]["validator_mutation"] is False
PY

grep -Fq "/public-node/first-external-tester-wc-source-hash-chain-design.json" "$OUT/route-manifest.json"
grep -Fq "/public-node/first-external-tester-wc-source-hash-chain-design.json" "$OUT/self-check.json"
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_SOURCE_HASH_CHAIN_DESIGN_UI_V1" "$OUT/public-node.html"

echo "source_hash_chain_design_green=true"
echo "source_hash_chain_design_only=true"
echo "source_hash_chain_green=false"
echo "ready_for_ledger_write=false"
echo "wc_ledger_write=false"
echo "wc_credit_award=false"
echo "wc_to_void_swap=false"
echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_SOURCE_HASH_CHAIN_DESIGN_PROOF_V1_GREEN"
