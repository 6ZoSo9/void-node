#!/usr/bin/env bash
set -euo pipefail

LOCAL_BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/public-node-first-external-tester-wc-operator-decision-draft-proof-$(date -u +%Y%m%d-%H%M%S)}"

mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_DRAFT_PROOF_V1"
echo "checked_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "head=$(git rev-parse --short HEAD)"
echo "tag=$(git tag --points-at HEAD | head -1)"
echo "local_base=$LOCAL_BASE"
echo "out=$OUT"

DOC="docs/public/public-node-first-external-tester-wc-operator-decision-draft.md"
SCRIPT="ops/mainnet0/public-node-first-external-tester-wc-operator-decision-draft.sh"

test -f "$DOC"
test -x "$SCRIPT"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_DRAFT_V1" "$DOC"
grep -Fq "operator_decision_draft_green=true" "$DOC"
grep -Fq "wc_ledger_write=false" "$DOC"
grep -Fq "wc_credit_award=false" "$DOC"
grep -Fq "wc_to_void_swap=false" "$DOC"
grep -Fq "write_runtime_default=false" "$DOC"

bash -n "$SCRIPT"

LOCAL_BASE="$LOCAL_BASE" \
OUT="$OUT/dryrun" \
DECISION_STATE="deferred" \
DECISION_REASON="proof dryrun only; no award or ledger write" \
OPERATOR_ID="proof-operator-local" \
WRITE_RUNTIME=false \
"$SCRIPT" | tee "$OUT/draft-run.log"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_DRAFT_V1_GREEN" "$OUT/draft-run.log"
grep -Fq "operator_decision_draft_green=true" "$OUT/draft-run.log"
grep -Fq "operator_decision_draft_only=true" "$OUT/draft-run.log"
grep -Fq "runtime_draft_written=false" "$OUT/draft-run.log"
grep -Fq "operator_decision_created_now=false" "$OUT/draft-run.log"
grep -Fq "review_record_created_now=false" "$OUT/draft-run.log"
grep -Fq "decision_record_created_now=false" "$OUT/draft-run.log"
grep -Fq "award_created_now=false" "$OUT/draft-run.log"
grep -Fq "wc_ledger_mutated_now=false" "$OUT/draft-run.log"
grep -Fq "wc_credit_delta_now=0" "$OUT/draft-run.log"
grep -Fq "wc_ledger_write=false" "$OUT/draft-run.log"
grep -Fq "wc_credit_award=false" "$OUT/draft-run.log"
grep -Fq "wc_to_void_swap=false" "$OUT/draft-run.log"
grep -Fq "automatic_ledger_write_allowed=false" "$OUT/draft-run.log"
grep -Fq "public_upload=false" "$OUT/draft-run.log"
grep -Fq "trusted_as_network_truth=false" "$OUT/draft-run.log"
grep -Fq "write_runtime_default=false" "$OUT/draft-run.log"

python3 - "$OUT/dryrun/operator-decision-draft.json" <<'PY'
import json
import sys
from pathlib import Path

draft = json.loads(Path(sys.argv[1]).read_text())

assert draft.get("marker") == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_DRAFT_V1"
assert draft.get("draft_only") is True
assert draft.get("operator_local_only") is True
assert draft.get("decision_state") == "deferred"
assert draft.get("write_runtime_requested") is False
assert draft.get("write_runtime_default") is False
assert draft.get("source_packet_marker") == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_PACKET_V1"

safety = draft.get("safety_boundary", {})
for key in [
    "operator_decision_created_now",
    "review_record_created_now",
    "decision_record_created_now",
    "award_created_now",
    "wc_ledger_mutated_now",
    "wc_ledger_write",
    "wc_credit_award",
    "wc_to_void_swap",
    "automatic_ledger_write_allowed",
    "public_upload",
    "trusted_as_network_truth",
    "money_movement",
    "wallet_send",
    "buy_void_fulfillment",
    "validator_mutation",
]:
    assert safety.get(key) is False, (key, safety.get(key))

assert safety.get("wc_credit_delta_now") == 0
print("operator_decision_draft_json_proof_green=true")
PY

echo "operator_decision_draft_proof_green=true"
echo "operator_decision_draft_safety_boundary_green=true"
echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_DRAFT_PROOF_V1_GREEN"
