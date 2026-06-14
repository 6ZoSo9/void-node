#!/usr/bin/env bash
set -euo pipefail

LOCAL_BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"
DATA_DIR="${DATA_DIR:-.runtime/mainnet0}"
OUT="${OUT:-/tmp/public-node-first-external-tester-wc-operator-decision-draft-live-runbook-$(date -u +%Y%m%d-%H%M%S)}"
DECISION_STATE="${DECISION_STATE:-deferred}"
DECISION_REASON="${DECISION_REASON:-operator local draft only; no award or ledger write}"
OPERATOR_ID="${OPERATOR_ID:-operator-local}"
CONFIRM_LIVE_DRAFT_WRITE="${CONFIRM_LIVE_DRAFT_WRITE:-}"

REQUIRED_CONFIRMATION="I_UNDERSTAND_DRAFT_ONLY"
GENERATOR="ops/mainnet0/public-node-first-external-tester-wc-operator-decision-draft.sh"

mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_DRAFT_LIVE_RUNBOOK_V1"
echo "checked_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "head=$(git rev-parse --short HEAD)"
echo "tag=$(git tag --points-at HEAD | head -1)"
echo "local_base=$LOCAL_BASE"
echo "data_dir=$DATA_DIR"
echo "out=$OUT"
echo "decision_state=$DECISION_STATE"

if [ "$CONFIRM_LIVE_DRAFT_WRITE" != "$REQUIRED_CONFIRMATION" ]; then
  echo "explicit_confirmation_required=true"
  echo "confirmation_string_green=false"
  echo "live_runtime_draft_written=false"
  echo "ERROR: refusing live draft write without CONFIRM_LIVE_DRAFT_WRITE=$REQUIRED_CONFIRMATION"
  exit 2
fi

echo "explicit_confirmation_required=true"
echo "confirmation_string_green=true"

case "$DECISION_STATE" in
  accepted|rejected|deferred) ;;
  *)
    echo "ERROR: unsupported DECISION_STATE=$DECISION_STATE"
    exit 1
    ;;
esac

test -x "$GENERATOR"
bash -n "$GENERATOR"

LOCAL_BASE="$LOCAL_BASE" \
DATA_DIR="$DATA_DIR" \
OUT="$OUT/generator" \
DECISION_STATE="$DECISION_STATE" \
DECISION_REASON="$DECISION_REASON" \
OPERATOR_ID="$OPERATOR_ID" \
WRITE_RUNTIME=true \
"$GENERATOR" | tee "$OUT/generator.log"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_DRAFT_V1_GREEN" "$OUT/generator.log"
grep -Fq "runtime_draft_written=true" "$OUT/generator.log"
grep -Fq "operator_decision_draft_green=true" "$OUT/generator.log"
grep -Fq "operator_decision_draft_only=true" "$OUT/generator.log"
grep -Fq "operator_decision_created_now=false" "$OUT/generator.log"
grep -Fq "review_record_created_now=false" "$OUT/generator.log"
grep -Fq "decision_record_created_now=false" "$OUT/generator.log"
grep -Fq "award_created_now=false" "$OUT/generator.log"
grep -Fq "wc_ledger_mutated_now=false" "$OUT/generator.log"
grep -Fq "wc_credit_delta_now=0" "$OUT/generator.log"
grep -Fq "wc_ledger_write=false" "$OUT/generator.log"
grep -Fq "wc_credit_award=false" "$OUT/generator.log"
grep -Fq "wc_to_void_swap=false" "$OUT/generator.log"
grep -Fq "automatic_ledger_write_allowed=false" "$OUT/generator.log"
grep -Fq "public_upload=false" "$OUT/generator.log"
grep -Fq "trusted_as_network_truth=false" "$OUT/generator.log"

LATEST="$DATA_DIR/public-node/first-external-tester-wc-operator-decision-drafts/latest-draft.json"
ARCHIVE_DIR="$DATA_DIR/public-node/first-external-tester-wc-operator-decision-drafts/archive"

test -f "$LATEST"
test -d "$ARCHIVE_DIR"
test "$(find "$ARCHIVE_DIR" -maxdepth 1 -type f -name 'operator-decision-draft-*.json' | wc -l)" -ge 1

python3 - "$LATEST" "$ARCHIVE_DIR" "$DATA_DIR" "$DECISION_STATE" "$OPERATOR_ID" <<'PY2'
import json
import sys
from pathlib import Path

latest_path = Path(sys.argv[1])
archive_dir = Path(sys.argv[2])
data_dir = Path(sys.argv[3])
decision_state = sys.argv[4]
operator_id = sys.argv[5]

latest = json.loads(latest_path.read_text())

assert str(latest_path).startswith(str(data_dir))
assert latest.get("marker") == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_DRAFT_V1"
assert latest.get("draft_only") is True
assert latest.get("operator_local_only") is True
assert latest.get("decision_state") == decision_state
assert latest.get("operator_id") == operator_id
assert latest.get("write_runtime_requested") is True
assert latest.get("write_runtime_default") is False
assert latest.get("source_packet_marker") == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_PACKET_V1"

archive_files = sorted(archive_dir.glob("operator-decision-draft-*.json"))
assert archive_files, "missing archive file"

safety = latest.get("safety_boundary", {})
assert safety.get("wc_credit_delta_now") == 0

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

print("live_runtime_latest_draft_json_green=true")
print("live_runtime_archive_present_green=true")
print(f"candidate_id={latest.get('candidate_id')}")
print(f"decision_state={latest.get('decision_state')}")
PY2

echo "operator_decision_draft_live_runbook_green=true"
echo "live_runtime_draft_written=true"
echo "draft_only=true"
echo "operator_local_only=true"
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
echo "money_movement=false"
echo "wallet_send=false"
echo "buy_void_fulfillment=false"
echo "validator_mutation=false"
echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_DRAFT_LIVE_RUNBOOK_V1_GREEN"
