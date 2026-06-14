#!/usr/bin/env bash
set -euo pipefail

LOCAL_BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"
DATA_DIR="${DATA_DIR:-.runtime/mainnet0}"
OUT="${OUT:-/tmp/public-node-first-external-tester-wc-operator-award-record-runbook-$(date -u +%Y%m%d-%H%M%S)}"
AWARD_RECORD_STATE="${AWARD_RECORD_STATE:-deferred}"
AWARD_REASON="${AWARD_REASON:-operator local award record only; no WC ledger write}"
OPERATOR_ID="${OPERATOR_ID:-operator-local}"
CONFIRM_AWARD_RECORD_WRITE="${CONFIRM_AWARD_RECORD_WRITE:-}"

REQUIRED_CONFIRMATION="I_UNDERSTAND_AWARD_RECORD_ONLY"

mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_AWARD_RECORD_RUNBOOK_V1"
echo "checked_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "head=$(git rev-parse --short HEAD)"
echo "tag=$(git tag --points-at HEAD | head -1)"
echo "local_base=$LOCAL_BASE"
echo "data_dir=$DATA_DIR"
echo "out=$OUT"
echo "award_record_state=$AWARD_RECORD_STATE"

if [ "$CONFIRM_AWARD_RECORD_WRITE" != "$REQUIRED_CONFIRMATION" ]; then
  echo "explicit_confirmation_required=true"
  echo "confirmation_string_green=false"
  echo "award_record_written=false"
  echo "ERROR: refusing award record write without CONFIRM_AWARD_RECORD_WRITE=$REQUIRED_CONFIRMATION"
  exit 2
fi

echo "explicit_confirmation_required=true"
echo "confirmation_string_green=true"

case "$AWARD_RECORD_STATE" in
  deferred|approved|rejected) ;;
  *)
    echo "ERROR: unsupported AWARD_RECORD_STATE=$AWARD_RECORD_STATE"
    exit 1
    ;;
esac

INTENT_LATEST="$DATA_DIR/public-node/first-external-tester-wc-award-intent-packets/latest-award-intent-packet.json"
AWARD_DIR="$DATA_DIR/public-node/first-external-tester-wc-award-records"
AWARD_LATEST="$AWARD_DIR/latest-award-record.json"
AWARD_ARCHIVE_DIR="$AWARD_DIR/archive"

test -f "$INTENT_LATEST"

mkdir -p "$AWARD_ARCHIVE_DIR"

python3 - "$INTENT_LATEST" "$AWARD_LATEST" "$AWARD_ARCHIVE_DIR" "$AWARD_RECORD_STATE" "$AWARD_REASON" "$OPERATOR_ID" <<'PY2'
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

intent_path = Path(sys.argv[1])
award_latest_path = Path(sys.argv[2])
award_archive_dir = Path(sys.argv[3])
award_record_state = sys.argv[4]
award_reason = sys.argv[5]
operator_id = sys.argv[6]

intent_bytes = intent_path.read_bytes()
intent = json.loads(intent_bytes.decode())

assert intent.get("marker") == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_AWARD_INTENT_PACKET_V1"
assert intent.get("award_intent_only") is True
assert intent.get("operator_local_only") is True
assert intent.get("candidate_id") == "first-external-tester-n153b-demo003-standalone-smoke-v1"
assert intent.get("proposed_wc_delta_only") is True
assert intent.get("award_record_created_now") is False
assert intent.get("ledger_record_created_now") is False

intent_safety = intent.get("safety_boundary", {})
assert intent_safety.get("award_intent_packet_created_now") is True
assert intent_safety.get("award_created_now") is False
assert intent_safety.get("award_write_allowed_now") is False
assert intent_safety.get("wc_credit_delta_now") == 0

for key in [
    "wc_ledger_mutated_now",
    "wc_ledger_write",
    "wc_credit_award",
    "wc_to_void_swap",
    "automatic_ledger_write_allowed",
    "public_upload",
    "trusted_as_network_truth",
]:
    assert intent_safety.get(key) is False, (key, intent_safety.get(key))

now = datetime.now(timezone.utc).replace(microsecond=0)
stamp = now.strftime("%Y%m%dT%H%M%SZ")
intent_sha256 = hashlib.sha256(intent_bytes).hexdigest()
proposed_wc_delta = int(intent.get("proposed_wc_delta", 0))

award = {
    "marker": "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_AWARD_RECORD_V1",
    "created_at_utc": now.isoformat().replace("+00:00", "Z"),
    "candidate_id": intent.get("candidate_id"),
    "source_award_intent_packet_marker": intent.get("marker"),
    "source_award_intent_packet_sha256": intent_sha256,
    "source_award_intent_state": intent.get("award_intent_state"),
    "source_proposed_wc_delta": proposed_wc_delta,
    "award_record_state": award_record_state,
    "award_reason": award_reason,
    "operator_id": operator_id,
    "award_record_only": True,
    "operator_local_only": True,
    "proposed_wc_delta_only": True,
    "ledger_write_required_before_credit": True,
    "ledger_record_created_now": False,
    "credited_wc_delta": 0,
    "safety_boundary": {
        "operator_decision_created_now": False,
        "review_record_created_now": False,
        "decision_record_created_now": False,
        "award_intent_packet_created_now": False,
        "award_record_created_now": True,
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

award_latest_path.parent.mkdir(parents=True, exist_ok=True)
award_archive_dir.mkdir(parents=True, exist_ok=True)

payload = json.dumps(award, indent=2, sort_keys=True) + "\n"
award_latest_path.write_text(payload)

archive_path = award_archive_dir / f"award-record-{stamp}.json"
archive_path.write_text(payload)

print("award_record_json_green=true")
print("award_record_archive_json_green=true")
print(f"award_record_latest={award_latest_path}")
print(f"award_record_archive={archive_path}")
print(f"candidate_id={award['candidate_id']}")
print(f"award_record_state={award['award_record_state']}")
print(f"source_proposed_wc_delta={award['source_proposed_wc_delta']}")
print(f"credited_wc_delta={award['credited_wc_delta']}")
print(f"source_award_intent_packet_sha256={award['source_award_intent_packet_sha256']}")
PY2

test -f "$AWARD_LATEST"
test "$(find "$AWARD_ARCHIVE_DIR" -maxdepth 1 -type f -name 'award-record-*.json' | wc -l)" -ge 1

python3 - "$AWARD_LATEST" "$AWARD_RECORD_STATE" "$OPERATOR_ID" <<'PY2'
import json
import sys
from pathlib import Path

award = json.loads(Path(sys.argv[1]).read_text())
award_record_state = sys.argv[2]
operator_id = sys.argv[3]

assert award.get("marker") == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_AWARD_RECORD_V1"
assert award.get("candidate_id") == "first-external-tester-n153b-demo003-standalone-smoke-v1"
assert award.get("award_record_only") is True
assert award.get("operator_local_only") is True
assert award.get("proposed_wc_delta_only") is True
assert award.get("award_record_state") == award_record_state
assert award.get("operator_id") == operator_id
assert award.get("ledger_write_required_before_credit") is True
assert award.get("ledger_record_created_now") is False
assert award.get("credited_wc_delta") == 0
assert award.get("source_award_intent_packet_marker") == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_AWARD_INTENT_PACKET_V1"

safety = award.get("safety_boundary", {})
assert safety.get("award_record_created_now") is True
assert safety.get("wc_credit_delta_now") == 0

for key in [
    "operator_decision_created_now",
    "review_record_created_now",
    "decision_record_created_now",
    "award_intent_packet_created_now",
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

print("award_record_latest_json_green=true")
PY2

echo "operator_award_record_runbook_green=true"
echo "award_record_written=true"
echo "award_record_created_now=true"
echo "award_record_only=true"
echo "operator_local_only=true"
echo "award_created_now=false"
echo "award_write_allowed_now=false"
echo "wc_ledger_mutated_now=false"
echo "wc_credit_delta_now=0"
echo "proposed_wc_delta_only=true"
echo "ledger_record_created_now=false"
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
echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_AWARD_RECORD_RUNBOOK_V1_GREEN"
