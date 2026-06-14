#!/usr/bin/env bash
set -euo pipefail

LOCAL_BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"
DATA_DIR="${DATA_DIR:-.runtime/mainnet0}"
OUT="${OUT:-/tmp/public-node-first-external-tester-wc-operator-review-record-runbook-$(date -u +%Y%m%d-%H%M%S)}"
REVIEW_OUTCOME="${REVIEW_OUTCOME:-deferred}"
REVIEW_REASON="${REVIEW_REASON:-operator local review record only; no award or ledger write}"
REVIEWER_ID="${REVIEWER_ID:-operator-local}"
CONFIRM_REVIEW_RECORD_WRITE="${CONFIRM_REVIEW_RECORD_WRITE:-}"

REQUIRED_CONFIRMATION="I_UNDERSTAND_REVIEW_RECORD_ONLY"

mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_REVIEW_RECORD_RUNBOOK_V1"
echo "checked_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "head=$(git rev-parse --short HEAD)"
echo "tag=$(git tag --points-at HEAD | head -1)"
echo "local_base=$LOCAL_BASE"
echo "data_dir=$DATA_DIR"
echo "out=$OUT"
echo "review_outcome=$REVIEW_OUTCOME"

if [ "$CONFIRM_REVIEW_RECORD_WRITE" != "$REQUIRED_CONFIRMATION" ]; then
  echo "explicit_confirmation_required=true"
  echo "confirmation_string_green=false"
  echo "review_record_written=false"
  echo "ERROR: refusing review record write without CONFIRM_REVIEW_RECORD_WRITE=$REQUIRED_CONFIRMATION"
  exit 2
fi

echo "explicit_confirmation_required=true"
echo "confirmation_string_green=true"

case "$REVIEW_OUTCOME" in
  accepted|rejected|deferred) ;;
  *)
    echo "ERROR: unsupported REVIEW_OUTCOME=$REVIEW_OUTCOME"
    exit 1
    ;;
esac

DRAFT_LATEST="$DATA_DIR/public-node/first-external-tester-wc-operator-decision-drafts/latest-draft.json"
REVIEW_DIR="$DATA_DIR/public-node/first-external-tester-wc-review-records"
REVIEW_LATEST="$REVIEW_DIR/latest-review-record.json"
REVIEW_ARCHIVE_DIR="$REVIEW_DIR/archive"

test -f "$DRAFT_LATEST"

mkdir -p "$REVIEW_ARCHIVE_DIR"

python3 - "$DRAFT_LATEST" "$REVIEW_LATEST" "$REVIEW_ARCHIVE_DIR" "$REVIEW_OUTCOME" "$REVIEW_REASON" "$REVIEWER_ID" <<'PY2'
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

draft_path = Path(sys.argv[1])
review_latest_path = Path(sys.argv[2])
review_archive_dir = Path(sys.argv[3])
review_outcome = sys.argv[4]
review_reason = sys.argv[5]
reviewer_id = sys.argv[6]

draft_bytes = draft_path.read_bytes()
draft = json.loads(draft_bytes.decode())

assert draft.get("marker") == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_DRAFT_V1"
assert draft.get("draft_only") is True
assert draft.get("operator_local_only") is True
assert draft.get("candidate_id") == "first-external-tester-n153b-demo003-standalone-smoke-v1"

draft_safety = draft.get("safety_boundary", {})
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
]:
    assert draft_safety.get(key) is False, (key, draft_safety.get(key))
assert draft_safety.get("wc_credit_delta_now") == 0

now = datetime.now(timezone.utc).replace(microsecond=0)
stamp = now.strftime("%Y%m%dT%H%M%SZ")
draft_sha256 = hashlib.sha256(draft_bytes).hexdigest()

review = {
    "marker": "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_REVIEW_RECORD_V1",
    "created_at_utc": now.isoformat().replace("+00:00", "Z"),
    "candidate_id": draft.get("candidate_id"),
    "source_draft_marker": draft.get("marker"),
    "source_draft_sha256": draft_sha256,
    "source_draft_decision_state": draft.get("decision_state"),
    "review_outcome": review_outcome,
    "review_reason": review_reason,
    "reviewer_id": reviewer_id,
    "review_record_only": True,
    "operator_local_only": True,
    "award_decision": "not_decided",
    "safety_boundary": {
        "operator_decision_created_now": False,
        "review_record_created_now": True,
        "decision_record_created_now": False,
        "award_created_now": False,
        "wc_ledger_mutated_now": False,
        "wc_credit_delta_now": 0,
        "wc_ledger_write": False,
        "wc_credit_award": False,
        "wc_to_void_swap": False,
        "automatic_ledger_write_allowed": False,
        "public_upload": False,
        "trusted_as_network_truth": False,
        "money_movement": False,
        "wallet_send": False,
        "buy_void_fulfillment": False,
        "validator_mutation": False
    }
}

review_latest_path.parent.mkdir(parents=True, exist_ok=True)
review_archive_dir.mkdir(parents=True, exist_ok=True)

payload = json.dumps(review, indent=2, sort_keys=True) + "\n"
review_latest_path.write_text(payload)

archive_path = review_archive_dir / f"operator-review-record-{stamp}.json"
archive_path.write_text(payload)

print("review_record_json_green=true")
print("review_record_archive_json_green=true")
print(f"review_record_latest={review_latest_path}")
print(f"review_record_archive={archive_path}")
print(f"candidate_id={review['candidate_id']}")
print(f"review_outcome={review['review_outcome']}")
print(f"source_draft_sha256={review['source_draft_sha256']}")
PY2

test -f "$REVIEW_LATEST"
test "$(find "$REVIEW_ARCHIVE_DIR" -maxdepth 1 -type f -name 'operator-review-record-*.json' | wc -l)" -ge 1

python3 - "$REVIEW_LATEST" "$REVIEW_OUTCOME" "$REVIEWER_ID" <<'PY2'
import json
import sys
from pathlib import Path

review = json.loads(Path(sys.argv[1]).read_text())
review_outcome = sys.argv[2]
reviewer_id = sys.argv[3]

assert review.get("marker") == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_REVIEW_RECORD_V1"
assert review.get("candidate_id") == "first-external-tester-n153b-demo003-standalone-smoke-v1"
assert review.get("review_record_only") is True
assert review.get("operator_local_only") is True
assert review.get("review_outcome") == review_outcome
assert review.get("reviewer_id") == reviewer_id
assert review.get("award_decision") == "not_decided"

safety = review.get("safety_boundary", {})
assert safety.get("review_record_created_now") is True
assert safety.get("wc_credit_delta_now") == 0

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
    "money_movement",
    "wallet_send",
    "buy_void_fulfillment",
    "validator_mutation",
]:
    assert safety.get(key) is False, (key, safety.get(key))

print("review_record_latest_json_green=true")
PY2

echo "operator_review_record_runbook_green=true"
echo "review_record_written=true"
echo "review_record_created_now=true"
echo "review_record_only=true"
echo "operator_local_only=true"
echo "operator_decision_created_now=false"
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
echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_REVIEW_RECORD_RUNBOOK_V1_GREEN"
