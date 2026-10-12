#!/usr/bin/env bash
set -euo pipefail

LOCAL_BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"
DATA_DIR="${DATA_DIR:-.runtime/mainnet0}"
OUT="${OUT:-/tmp/public-node-first-external-tester-wc-operator-decision-record-runbook-$(date -u +%Y%m%d-%H%M%S)}"
DECISION_OUTCOME="${DECISION_OUTCOME:-deferred}"
DECISION_REASON="${DECISION_REASON:-operator local decision record only; no award or ledger write}"
DECIDER_ID="${DECIDER_ID:-operator-local}"
CONFIRM_DECISION_RECORD_WRITE="${CONFIRM_DECISION_RECORD_WRITE:-}"

REQUIRED_CONFIRMATION="I_UNDERSTAND_DECISION_RECORD_ONLY"

mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_RECORD_RUNBOOK_V1"
echo "checked_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "head=$(git rev-parse --short HEAD)"
echo "tag=$(git tag --points-at HEAD | head -1)"
echo "local_base=$LOCAL_BASE"
echo "data_dir=$DATA_DIR"
echo "out=$OUT"
echo "decision_outcome=$DECISION_OUTCOME"

if [ "$CONFIRM_DECISION_RECORD_WRITE" != "$REQUIRED_CONFIRMATION" ]; then
  echo "explicit_confirmation_required=true"
  echo "confirmation_string_green=false"
  echo "decision_record_written=false"
  echo "ERROR: refusing decision record write without CONFIRM_DECISION_RECORD_WRITE=$REQUIRED_CONFIRMATION"
  exit 2
fi

echo "explicit_confirmation_required=true"
echo "confirmation_string_green=true"

case "$DECISION_OUTCOME" in
  accepted|rejected|deferred) ;;
  *)
    echo "ERROR: unsupported DECISION_OUTCOME=$DECISION_OUTCOME"
    exit 1
    ;;
esac

REVIEW_LATEST="$DATA_DIR/public-node/first-external-tester-wc-review-records/latest-review-record.json"
DECISION_DIR="$DATA_DIR/public-node/first-external-tester-wc-decision-records"
DECISION_LATEST="$DECISION_DIR/latest-decision-record.json"
DECISION_ARCHIVE_DIR="$DECISION_DIR/archive"

test -f "$REVIEW_LATEST"

mkdir -p "$DECISION_ARCHIVE_DIR"

python3 - "$REVIEW_LATEST" "$DECISION_LATEST" "$DECISION_ARCHIVE_DIR" "$DECISION_OUTCOME" "$DECISION_REASON" "$DECIDER_ID" <<'PY2'
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

review_path = Path(sys.argv[1])
decision_latest_path = Path(sys.argv[2])
decision_archive_dir = Path(sys.argv[3])
decision_outcome = sys.argv[4]
decision_reason = sys.argv[5]
decider_id = sys.argv[6]

review_bytes = review_path.read_bytes()
review = json.loads(review_bytes.decode())

assert review.get("marker") == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_REVIEW_RECORD_V1"
assert review.get("review_record_only") is True
assert review.get("operator_local_only") is True
assert review.get("candidate_id") == "first-external-tester-n153b-demo003-standalone-smoke-v1"

review_safety = review.get("safety_boundary", {})
assert review_safety.get("review_record_created_now") is True
assert review_safety.get("wc_credit_delta_now") == 0
for key in [
    "operator_decision_created_now",
    "decision_record_created_now",
    "award_created_now",
    "wc_ledger_mutated_now",
    "wc_ledger_write",
    "wc_credit_award",
    "wc_to_void_swap",
    "automatic_ledger_write_allowed",
    "public_upload",
    "trusted_as_network_truth",
]:
    assert review_safety.get(key) is False, (key, review_safety.get(key))

now = datetime.now(timezone.utc).replace(microsecond=0)
stamp = now.strftime("%Y%m%dT%H%M%SZ")
review_sha256 = hashlib.sha256(review_bytes).hexdigest()

decision = {
    "marker": "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_RECORD_V1",
    "created_at_utc": now.isoformat().replace("+00:00", "Z"),
    "candidate_id": review.get("candidate_id"),
    "source_review_record_marker": review.get("marker"),
    "source_review_record_sha256": review_sha256,
    "source_review_outcome": review.get("review_outcome"),
    "source_draft_sha256": review.get("source_draft_sha256"),
    "decision_outcome": decision_outcome,
    "decision_reason": decision_reason,
    "decider_id": decider_id,
    "decision_record_only": True,
    "operator_local_only": True,
    "award_decision": "not_created",
    "award_write_allowed_now": False,
    "safety_boundary": {
        "operator_decision_created_now": False,
        "review_record_created_now": False,
        "decision_record_created_now": True,
        "award_created_now": False,
        "wc_ledger_mutated_now": False,
        "wc_credit_delta_now": 0,
        "wc_ledger_write": False,
        "wc_credit_award": False,
        "wc_to_void_swap": False,
        "automatic_ledger_write_allowed": False,
        "award_write_allowed_now": False,
        "public_upload": False,
        "trusted_as_network_truth": False,
        "money_movement": False,
        "wallet_send": False,
        "buy_void_fulfillment": False,
        "validator_mutation": False
    }
}

decision_latest_path.parent.mkdir(parents=True, exist_ok=True)
decision_archive_dir.mkdir(parents=True, exist_ok=True)

payload = json.dumps(decision, indent=2, sort_keys=True) + "\n"
decision_latest_path.write_text(payload)

archive_path = decision_archive_dir / f"operator-decision-record-{stamp}.json"
archive_path.write_text(payload)

print("decision_record_json_green=true")
print("decision_record_archive_json_green=true")
print(f"decision_record_latest={decision_latest_path}")
print(f"decision_record_archive={archive_path}")
print(f"candidate_id={decision['candidate_id']}")
print(f"decision_outcome={decision['decision_outcome']}")
print(f"source_review_record_sha256={decision['source_review_record_sha256']}")
PY2

test -f "$DECISION_LATEST"
test "$(find "$DECISION_ARCHIVE_DIR" -maxdepth 1 -type f -name 'operator-decision-record-*.json' | wc -l)" -ge 1

python3 - "$DECISION_LATEST" "$DECISION_OUTCOME" "$DECIDER_ID" <<'PY2'
import json
import sys
from pathlib import Path

decision = json.loads(Path(sys.argv[1]).read_text())
decision_outcome = sys.argv[2]
decider_id = sys.argv[3]

assert decision.get("marker") == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_RECORD_V1"
assert decision.get("candidate_id") == "first-external-tester-n153b-demo003-standalone-smoke-v1"
assert decision.get("decision_record_only") is True
assert decision.get("operator_local_only") is True
assert decision.get("decision_outcome") == decision_outcome
assert decision.get("decider_id") == decider_id
assert decision.get("award_decision") == "not_created"
assert decision.get("award_write_allowed_now") is False

safety = decision.get("safety_boundary", {})
assert safety.get("decision_record_created_now") is True
assert safety.get("wc_credit_delta_now") == 0

for key in [
    "operator_decision_created_now",
    "review_record_created_now",
    "award_created_now",
    "wc_ledger_mutated_now",
    "wc_ledger_write",
    "wc_credit_award",
    "wc_to_void_swap",
    "automatic_ledger_write_allowed",
    "award_write_allowed_now",
    "public_upload",
    "trusted_as_network_truth",
    "money_movement",
    "wallet_send",
    "buy_void_fulfillment",
    "validator_mutation",
]:
    assert safety.get(key) is False, (key, safety.get(key))

print("decision_record_latest_json_green=true")
PY2

echo "operator_decision_record_runbook_green=true"
echo "decision_record_written=true"
echo "decision_record_created_now=true"
echo "decision_record_only=true"
echo "operator_local_only=true"
echo "operator_decision_created_now=false"
echo "review_record_created_now=false"
echo "award_created_now=false"
echo "wc_ledger_mutated_now=false"
echo "wc_credit_delta_now=0"
echo "wc_ledger_write=false"
echo "wc_credit_award=false"
echo "wc_to_void_swap=false"
echo "automatic_ledger_write_allowed=false"
echo "award_write_allowed_now=false"
echo "public_upload=false"
echo "trusted_as_network_truth=false"
echo "money_movement=false"
echo "wallet_send=false"
echo "buy_void_fulfillment=false"
echo "validator_mutation=false"
echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_RECORD_RUNBOOK_V1_GREEN"
