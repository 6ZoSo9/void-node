#!/usr/bin/env bash
set -euo pipefail

LOCAL_BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"
DATA_DIR="${DATA_DIR:-.runtime/mainnet0}"
OUT="${OUT:-/tmp/public-node-first-external-tester-wc-operator-award-intent-packet-runbook-$(date -u +%Y%m%d-%H%M%S)}"
AWARD_INTENT_STATE="${AWARD_INTENT_STATE:-deferred}"
PROPOSED_WC_DELTA="${PROPOSED_WC_DELTA:-0}"
INTENT_REASON="${INTENT_REASON:-operator local award intent packet only; no award or ledger write}"
OPERATOR_ID="${OPERATOR_ID:-operator-local}"
CONFIRM_AWARD_INTENT_WRITE="${CONFIRM_AWARD_INTENT_WRITE:-}"

REQUIRED_CONFIRMATION="I_UNDERSTAND_AWARD_INTENT_ONLY"

mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_AWARD_INTENT_PACKET_RUNBOOK_V1"
echo "checked_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "head=$(git rev-parse --short HEAD)"
echo "tag=$(git tag --points-at HEAD | head -1)"
echo "local_base=$LOCAL_BASE"
echo "data_dir=$DATA_DIR"
echo "out=$OUT"
echo "award_intent_state=$AWARD_INTENT_STATE"
echo "proposed_wc_delta=$PROPOSED_WC_DELTA"

if [ "$CONFIRM_AWARD_INTENT_WRITE" != "$REQUIRED_CONFIRMATION" ]; then
  echo "explicit_confirmation_required=true"
  echo "confirmation_string_green=false"
  echo "award_intent_packet_written=false"
  echo "ERROR: refusing award intent packet write without CONFIRM_AWARD_INTENT_WRITE=$REQUIRED_CONFIRMATION"
  exit 2
fi

echo "explicit_confirmation_required=true"
echo "confirmation_string_green=true"

case "$AWARD_INTENT_STATE" in
  deferred|intend_award|intend_no_award) ;;
  *)
    echo "ERROR: unsupported AWARD_INTENT_STATE=$AWARD_INTENT_STATE"
    exit 1
    ;;
esac

case "$PROPOSED_WC_DELTA" in
  ''|*[!0-9]*)
    echo "ERROR: PROPOSED_WC_DELTA must be a non-negative integer"
    exit 1
    ;;
esac

DECISION_LATEST="$DATA_DIR/public-node/first-external-tester-wc-decision-records/latest-decision-record.json"
INTENT_DIR="$DATA_DIR/public-node/first-external-tester-wc-award-intent-packets"
INTENT_LATEST="$INTENT_DIR/latest-award-intent-packet.json"
INTENT_ARCHIVE_DIR="$INTENT_DIR/archive"

test -f "$DECISION_LATEST"

mkdir -p "$INTENT_ARCHIVE_DIR"

python3 - "$DECISION_LATEST" "$INTENT_LATEST" "$INTENT_ARCHIVE_DIR" "$AWARD_INTENT_STATE" "$PROPOSED_WC_DELTA" "$INTENT_REASON" "$OPERATOR_ID" <<'PY2'
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

decision_path = Path(sys.argv[1])
intent_latest_path = Path(sys.argv[2])
intent_archive_dir = Path(sys.argv[3])
award_intent_state = sys.argv[4]
proposed_wc_delta = int(sys.argv[5])
intent_reason = sys.argv[6]
operator_id = sys.argv[7]

decision_bytes = decision_path.read_bytes()
decision = json.loads(decision_bytes.decode())

assert decision.get("marker") == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_RECORD_V1"
assert decision.get("decision_record_only") is True
assert decision.get("operator_local_only") is True
assert decision.get("candidate_id") == "first-external-tester-n153b-demo003-standalone-smoke-v1"
assert decision.get("award_write_allowed_now") is False

decision_safety = decision.get("safety_boundary", {})
assert decision_safety.get("decision_record_created_now") is True
assert decision_safety.get("award_created_now") is False
assert decision_safety.get("award_write_allowed_now") is False
assert decision_safety.get("wc_credit_delta_now") == 0

for key in [
    "wc_ledger_mutated_now",
    "wc_ledger_write",
    "wc_credit_award",
    "wc_to_void_swap",
    "automatic_ledger_write_allowed",
    "public_upload",
    "trusted_as_network_truth",
]:
    assert decision_safety.get(key) is False, (key, decision_safety.get(key))

now = datetime.now(timezone.utc).replace(microsecond=0)
stamp = now.strftime("%Y%m%dT%H%M%SZ")
decision_sha256 = hashlib.sha256(decision_bytes).hexdigest()

intent = {
    "marker": "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_AWARD_INTENT_PACKET_V1",
    "created_at_utc": now.isoformat().replace("+00:00", "Z"),
    "candidate_id": decision.get("candidate_id"),
    "source_decision_record_marker": decision.get("marker"),
    "source_decision_record_sha256": decision_sha256,
    "source_decision_outcome": decision.get("decision_outcome"),
    "award_intent_state": award_intent_state,
    "proposed_wc_delta": proposed_wc_delta,
    "proposed_wc_delta_only": True,
    "intent_reason": intent_reason,
    "operator_id": operator_id,
    "award_intent_only": True,
    "operator_local_only": True,
    "award_record_created_now": False,
    "ledger_record_created_now": False,
    "safety_boundary": {
        "operator_decision_created_now": False,
        "review_record_created_now": False,
        "decision_record_created_now": False,
        "award_intent_packet_created_now": True,
        "award_created_now": False,
        "award_write_allowed_now": False,
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

intent_latest_path.parent.mkdir(parents=True, exist_ok=True)
intent_archive_dir.mkdir(parents=True, exist_ok=True)

payload = json.dumps(intent, indent=2, sort_keys=True) + "\n"
intent_latest_path.write_text(payload)

archive_path = intent_archive_dir / f"award-intent-packet-{stamp}.json"
archive_path.write_text(payload)

print("award_intent_packet_json_green=true")
print("award_intent_packet_archive_json_green=true")
print(f"award_intent_packet_latest={intent_latest_path}")
print(f"award_intent_packet_archive={archive_path}")
print(f"candidate_id={intent['candidate_id']}")
print(f"award_intent_state={intent['award_intent_state']}")
print(f"proposed_wc_delta={intent['proposed_wc_delta']}")
print(f"source_decision_record_sha256={intent['source_decision_record_sha256']}")
PY2

test -f "$INTENT_LATEST"
test "$(find "$INTENT_ARCHIVE_DIR" -maxdepth 1 -type f -name 'award-intent-packet-*.json' | wc -l)" -ge 1

python3 - "$INTENT_LATEST" "$AWARD_INTENT_STATE" "$PROPOSED_WC_DELTA" "$OPERATOR_ID" <<'PY2'
import json
import sys
from pathlib import Path

intent = json.loads(Path(sys.argv[1]).read_text())
award_intent_state = sys.argv[2]
proposed_wc_delta = int(sys.argv[3])
operator_id = sys.argv[4]

assert intent.get("marker") == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_AWARD_INTENT_PACKET_V1"
assert intent.get("candidate_id") == "first-external-tester-n153b-demo003-standalone-smoke-v1"
assert intent.get("award_intent_only") is True
assert intent.get("operator_local_only") is True
assert intent.get("award_intent_state") == award_intent_state
assert intent.get("proposed_wc_delta") == proposed_wc_delta
assert intent.get("proposed_wc_delta_only") is True
assert intent.get("operator_id") == operator_id
assert intent.get("award_record_created_now") is False
assert intent.get("ledger_record_created_now") is False

safety = intent.get("safety_boundary", {})
assert safety.get("award_intent_packet_created_now") is True
assert safety.get("wc_credit_delta_now") == 0

for key in [
    "operator_decision_created_now",
    "review_record_created_now",
    "decision_record_created_now",
    "award_created_now",
    "award_write_allowed_now",
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

print("award_intent_packet_latest_json_green=true")
PY2

echo "operator_award_intent_packet_runbook_green=true"
echo "award_intent_packet_written=true"
echo "award_intent_packet_created_now=true"
echo "award_intent_only=true"
echo "operator_local_only=true"
echo "decision_record_created_now=false"
echo "award_created_now=false"
echo "award_write_allowed_now=false"
echo "wc_ledger_mutated_now=false"
echo "wc_credit_delta_now=0"
echo "proposed_wc_delta_only=true"
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
echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_AWARD_INTENT_PACKET_RUNBOOK_V1_GREEN"
