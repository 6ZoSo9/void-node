#!/usr/bin/env bash
set -euo pipefail

LOCAL_BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/public-node-first-external-tester-wc-ledger-write-boundary-proof-$(date -u +%Y%m%d-%H%M%S)}"

mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LEDGER_WRITE_BOUNDARY_PROOF_V1"
echo "checked_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "head=$(git rev-parse --short HEAD)"
echo "tag=$(git tag --points-at HEAD | head -1)"
echo "local_base=$LOCAL_BASE"
echo "out=$OUT"

SRC="src/index.ts"
DOC="docs/public/public-node-first-external-tester-wc-ledger-write-boundary.md"

test -f "$SRC"
test -f "$DOC"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LEDGER_WRITE_BOUNDARY_V1" "$SRC"
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LEDGER_WRITE_BOUNDARY_ROUTE_V1" "$SRC"
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LEDGER_WRITE_BOUNDARY_UI_V1" "$SRC"
grep -Fq "publicNodeFirstExternalTesterWcLedgerWriteBoundaryCard" "$SRC"
grep -Fq "/public-node/first-external-tester-wc-ledger-write-boundary.json" "$SRC"
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LEDGER_WRITE_BOUNDARY_DOC_V1" "$DOC"

echo "source_markers_green=true"

curl -fsS "$LOCAL_BASE/public-node/first-external-tester-wc-ledger-write-boundary.json" > "$OUT/ledger-write-boundary.json"
curl -fsS "$LOCAL_BASE/public-node" > "$OUT/public-node.html"
curl -fsS "$LOCAL_BASE/public-node/route-index.json" > "$OUT/route-index.json"
curl -fsS "$LOCAL_BASE/public-node/self-check-snapshot.json" > "$OUT/self-check-snapshot.json"
curl -fsS "$LOCAL_BASE/public-node/route-manifest.json" > "$OUT/route-manifest.json"

python3 - "$OUT/ledger-write-boundary.json" "$OUT/route-index.json" "$OUT/self-check-snapshot.json" "$OUT/route-manifest.json" <<'PY'
import json
import sys
from pathlib import Path

boundary = json.loads(Path(sys.argv[1]).read_text())
route_index = json.loads(Path(sys.argv[2]).read_text())
self_check = json.loads(Path(sys.argv[3]).read_text())
route_manifest = json.loads(Path(sys.argv[4]).read_text())

route = "/public-node/first-external-tester-wc-ledger-write-boundary.json"

assert boundary["marker"] == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LEDGER_WRITE_BOUNDARY_V1"
assert boundary["route_marker"] == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LEDGER_WRITE_BOUNDARY_ROUTE_V1"
assert boundary["route"] == route
assert boundary["candidate_id"] == "first-external-tester-n153b-demo003-standalone-smoke-v1"
assert boundary["boundary_state"] == "pre_ledger_write_boundary_no_ledger_record_created"
assert boundary["current_ledger_write_state"] == "not_allowed"
assert boundary["current_ledger_preview_state"] == "deferred"
assert "explicit_operator_ledger_write_confirmation" in boundary["required_before_ledger_write"]
assert "ledger_write_runbook_not_created" in boundary["current_blockers"]

protected = boundary["protected_boundary"]
assert protected["ledger_write_allowed_now"] is False
assert protected["ledger_record_created_now"] is False
assert protected["ledger_entry_preview_created_now"] is False
assert protected["award_record_created_now"] is False
assert protected["award_created_now"] is False
assert protected["award_write_allowed_now"] is False
assert protected["wc_ledger_mutated_now"] is False
assert protected["wc_credit_delta_now"] == 0
assert protected["wc_ledger_write"] is False
assert protected["wc_credit_award"] is False
assert protected["wc_to_void_swap"] is False
assert protected["automatic_ledger_write_allowed"] is False
assert protected["public_upload"] is False
assert protected["trusted_as_network_truth"] is False
assert protected["money_movement"] is False
assert protected["wallet_send"] is False
assert protected["buy_void_fulfillment"] is False
assert protected["validator_mutation"] is False

route_blob = json.dumps(route_index, sort_keys=True)
self_blob = json.dumps(self_check, sort_keys=True)
manifest_blob = json.dumps(route_manifest, sort_keys=True)

assert route in route_blob
assert route in self_blob
assert route in manifest_blob

print("ledger_write_boundary_json_green=true")
print("ledger_write_boundary_discovery_green=true")
PY

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LEDGER_WRITE_BOUNDARY_UI_V1" "$OUT/public-node.html"
grep -Fq "publicNodeFirstExternalTesterWcLedgerWriteBoundaryCard" "$OUT/public-node.html"
grep -Fq "publicNodeFirstExternalTesterWcLedgerWriteBoundaryLink" "$OUT/public-node.html"
grep -Fq "Ledger Write Boundary" "$OUT/public-node.html"
grep -Fq "pre_ledger_write_boundary_no_ledger_record_created" "$OUT/public-node.html"
grep -Fq "not_allowed" "$OUT/public-node.html"
grep -Fq "Ledger write allowed now:" "$OUT/public-node.html"
grep -Fq "Ledger record created now:" "$OUT/public-node.html"
grep -Fq "WC ledger write:" "$OUT/public-node.html"
grep -Fq "WC credit award:" "$OUT/public-node.html"
grep -Fq "WC→VOID swap:" "$OUT/public-node.html"

echo "route=/public-node/first-external-tester-wc-ledger-write-boundary.json"
echo "ui_marker=VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LEDGER_WRITE_BOUNDARY_UI_V1"
echo "card_id=publicNodeFirstExternalTesterWcLedgerWriteBoundaryCard"
echo "boundary_state=pre_ledger_write_boundary_no_ledger_record_created"
echo "current_ledger_write_state=not_allowed"
echo "ledger_write_allowed_now=false"
echo "ledger_record_created_now=false"
echo "ledger_entry_preview_created_now=false"
echo "award_record_created_now=false"
echo "award_created_now=false"
echo "award_write_allowed_now=false"
echo "wc_ledger_mutated_now=false"
echo "wc_credit_delta_now=0"
echo "wc_ledger_write=false"
echo "wc_credit_award=false"
echo "wc_to_void_swap=false"
echo "automatic_ledger_write_allowed=false"
echo "public_upload=false"
echo "trusted_as_network_truth=false"
echo "money_movement=false"
echo "wallet_send=false"
echo "buy_void_fulfillment=false"
echo "validator_mutation=false"
echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LEDGER_WRITE_BOUNDARY_PROOF_V1_GREEN"
