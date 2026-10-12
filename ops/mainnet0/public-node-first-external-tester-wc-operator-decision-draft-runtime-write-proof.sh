#!/usr/bin/env bash
set -euo pipefail

LOCAL_BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/public-node-first-external-tester-wc-operator-decision-draft-runtime-write-proof-$(date -u +%Y%m%d-%H%M%S)}"

mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_DRAFT_RUNTIME_WRITE_PROOF_V1"
echo "checked_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "head=$(git rev-parse --short HEAD)"
echo "tag=$(git tag --points-at HEAD | head -1)"
echo "local_base=$LOCAL_BASE"
echo "out=$OUT"

DOC="docs/public/public-node-first-external-tester-wc-operator-decision-draft-runtime-write.md"
SCRIPT="ops/mainnet0/public-node-first-external-tester-wc-operator-decision-draft.sh"

test -f "$DOC"
test -x "$SCRIPT"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_DRAFT_RUNTIME_WRITE_V1" "$DOC"
grep -Fq "WRITE_RUNTIME=true" "$DOC"
grep -Fq "default WRITE_RUNTIME=false" "$DOC"
grep -Fq "wc_ledger_write=false" "$DOC"
grep -Fq "wc_credit_award=false" "$DOC"
grep -Fq "wc_to_void_swap=false" "$DOC"

bash -n "$SCRIPT"

DEFAULT_OUT="$OUT/default-dryrun"
SCRATCH_DATA_DIR="$OUT/scratch-runtime"
WRITE_OUT="$OUT/write-runtime"

LOCAL_BASE="$LOCAL_BASE" \
OUT="$DEFAULT_OUT" \
DECISION_STATE="deferred" \
DECISION_REASON="default dryrun proof; no runtime write" \
OPERATOR_ID="proof-default-local" \
WRITE_RUNTIME=false \
"$SCRIPT" | tee "$OUT/default-dryrun.log"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_DRAFT_V1_GREEN" "$OUT/default-dryrun.log"
grep -Fq "runtime_draft_written=false" "$OUT/default-dryrun.log"
grep -Fq "write_runtime_default=false" "$OUT/default-dryrun.log"
echo "default_write_runtime_false_green=true"

LOCAL_BASE="$LOCAL_BASE" \
OUT="$WRITE_OUT" \
DATA_DIR="$SCRATCH_DATA_DIR" \
DECISION_STATE="deferred" \
DECISION_REASON="scratch runtime write proof; no award or ledger write" \
OPERATOR_ID="proof-runtime-write-local" \
WRITE_RUNTIME=true \
"$SCRIPT" | tee "$OUT/write-runtime.log"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_DRAFT_V1_GREEN" "$OUT/write-runtime.log"
grep -Fq "runtime_draft_written=true" "$OUT/write-runtime.log"
grep -Fq "operator_decision_draft_green=true" "$OUT/write-runtime.log"
grep -Fq "operator_decision_draft_only=true" "$OUT/write-runtime.log"
grep -Fq "operator_decision_created_now=false" "$OUT/write-runtime.log"
grep -Fq "review_record_created_now=false" "$OUT/write-runtime.log"
grep -Fq "decision_record_created_now=false" "$OUT/write-runtime.log"
grep -Fq "award_created_now=false" "$OUT/write-runtime.log"
grep -Fq "wc_ledger_mutated_now=false" "$OUT/write-runtime.log"
grep -Fq "wc_credit_delta_now=0" "$OUT/write-runtime.log"
grep -Fq "wc_ledger_write=false" "$OUT/write-runtime.log"
grep -Fq "wc_credit_award=false" "$OUT/write-runtime.log"
grep -Fq "wc_to_void_swap=false" "$OUT/write-runtime.log"
grep -Fq "automatic_ledger_write_allowed=false" "$OUT/write-runtime.log"
grep -Fq "public_upload=false" "$OUT/write-runtime.log"
grep -Fq "trusted_as_network_truth=false" "$OUT/write-runtime.log"
grep -Fq "write_runtime_default=false" "$OUT/write-runtime.log"

LATEST="$SCRATCH_DATA_DIR/public-node/first-external-tester-wc-operator-decision-drafts/latest-draft.json"
ARCHIVE_DIR="$SCRATCH_DATA_DIR/public-node/first-external-tester-wc-operator-decision-drafts/archive"

test -f "$LATEST"
test -d "$ARCHIVE_DIR"
test "$(find "$ARCHIVE_DIR" -maxdepth 1 -type f -name 'operator-decision-draft-*.json' | wc -l)" -ge 1

python3 - "$WRITE_OUT/operator-decision-draft.json" "$LATEST" "$ARCHIVE_DIR" "$SCRATCH_DATA_DIR" <<'PY'
import json
import sys
from pathlib import Path

draft_path = Path(sys.argv[1])
latest_path = Path(sys.argv[2])
archive_dir = Path(sys.argv[3])
scratch_data_dir = Path(sys.argv[4])

draft = json.loads(draft_path.read_text())
latest = json.loads(latest_path.read_text())

assert draft == latest
assert str(latest_path).startswith(str(scratch_data_dir))

archive_files = sorted(archive_dir.glob("operator-decision-draft-*.json"))
assert archive_files, "missing archive draft"
archive = json.loads(archive_files[-1].read_text())
assert archive == latest

assert latest.get("marker") == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_DRAFT_V1"
assert latest.get("draft_only") is True
assert latest.get("operator_local_only") is True
assert latest.get("decision_state") == "deferred"
assert latest.get("write_runtime_requested") is True
assert latest.get("write_runtime_default") is False

safety = latest.get("safety_boundary", {})
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

print("runtime_latest_draft_json_green=true")
print("runtime_archive_draft_json_green=true")
PY

echo "operator_decision_draft_runtime_write_green=true"
echo "write_runtime_opt_in_required=true"
echo "scratch_runtime_write_green=true"
echo "runtime_latest_draft_green=true"
echo "runtime_archive_draft_green=true"
echo "operator_decision_created_now=false"
echo "review_record_created_now=false"
echo "decision_record_created_now=false"
echo "award_created_now=false"
echo "wc_ledger_mutated_now=false"
echo "wc_credit_delta_now=0"
echo "wc_ledger_write=false"
echo "wc_credit_award=false"
echo "wc_to_void_swap=false"
echo "automatic_ledger_write_allowed=false"
echo "public_upload=false"
echo "trusted_as_network_truth=false"
echo "live_runtime_write=false"
echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_DRAFT_RUNTIME_WRITE_PROOF_V1_GREEN"
