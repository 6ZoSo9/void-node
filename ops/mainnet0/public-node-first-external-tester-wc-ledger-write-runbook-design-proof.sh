#!/usr/bin/env bash
set -euo pipefail

LOCAL_BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/public-node-first-external-tester-wc-ledger-write-runbook-design-proof-$(date -u +%Y%m%d-%H%M%S)}"

mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LEDGER_WRITE_RUNBOOK_DESIGN_PROOF_V1"
echo "checked_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "head=$(git rev-parse --short HEAD)"
echo "tag=$(git tag --points-at HEAD | head -1)"
echo "local_base=$LOCAL_BASE"
echo "out=$OUT"

DOC="docs/public/public-node-first-external-tester-wc-ledger-write-runbook-design.md"
FUTURE_RUNBOOK="ops/mainnet0/public-node-first-external-tester-wc-ledger-write-runbook.sh"

test -f "$DOC"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LEDGER_WRITE_RUNBOOK_DESIGN_DOC_V1" "$DOC"
grep -Fq "Status: design only." "$DOC"
grep -Fq "It does not create a ledger write runbook." "$DOC"
grep -Fq "It does not create a ledger record." "$DOC"
grep -Fq "It does not mutate the Work Credit ledger." "$DOC"
grep -Fq "CONFIRM_WC_LEDGER_WRITE=I_UNDERSTAND_THIS_CREATES_A_REAL_WC_LEDGER_RECORD" "$DOC"
grep -Fq "duplicate ledger entry detected" "$DOC"
grep -Fq "ledger_write_runbook_created_now=false" "$DOC"
grep -Fq "ledger_record_created_now=false" "$DOC"
grep -Fq "wc_ledger_write=false" "$DOC"
grep -Fq "wc_credit_award=false" "$DOC"
grep -Fq "wc_to_void_swap=false" "$DOC"

if [ -e "$FUTURE_RUNBOOK" ]; then
  echo "ledger_write_runbook_absent=false"
  echo "ERROR: future real ledger write runbook already exists: $FUTURE_RUNBOOK"
  exit 1
fi

echo "ledger_write_runbook_absent=true"
echo "design_doc_marker_green=true"

curl -fsS "$LOCAL_BASE/public-node/first-external-tester-wc-ledger-write-boundary.json" > "$OUT/ledger-write-boundary.json"

python3 - "$OUT/ledger-write-boundary.json" <<'PY'
import json
import sys
from pathlib import Path

boundary = json.loads(Path(sys.argv[1]).read_text())
protected = boundary["protected_boundary"]

assert boundary["marker"] == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LEDGER_WRITE_BOUNDARY_V1"
assert boundary["boundary_state"] == "pre_ledger_write_boundary_no_ledger_record_created"
assert boundary["current_ledger_write_state"] == "not_allowed"
assert boundary["current_ledger_preview_state"] == "deferred"
assert "explicit_operator_ledger_write_confirmation" in boundary["required_before_ledger_write"]
assert "ledger_write_runbook_not_created" in boundary["current_blockers"]

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

print("ledger_write_boundary_still_locked_green=true")
PY

echo "operator_ledger_write_runbook_design_green=true"
echo "ledger_write_runbook_design_only=true"
echo "ledger_write_runbook_created_now=false"
echo "ledger_write_runbook_absent=true"
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
echo "money_movement=false"
echo "wallet_send=false"
echo "buy_void_fulfillment=false"
echo "validator_mutation=false"
echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LEDGER_WRITE_RUNBOOK_DESIGN_PROOF_V1_GREEN"
