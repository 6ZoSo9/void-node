#!/usr/bin/env bash
set -euo pipefail

LOCAL_BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"
DATA_DIR="${DATA_DIR:-.runtime/mainnet0}"
OUT="${OUT:-/tmp/public-node-first-external-tester-wc-operator-ledger-entry-preview-runbook-$(date -u +%Y%m%d-%H%M%S)}"
LEDGER_PREVIEW_STATE="${LEDGER_PREVIEW_STATE:-deferred}"
LEDGER_PREVIEW_REASON="${LEDGER_PREVIEW_REASON:-operator local ledger entry preview only; no WC ledger write}"
OPERATOR_ID="${OPERATOR_ID:-operator-local}"
CONFIRM_LEDGER_PREVIEW_WRITE="${CONFIRM_LEDGER_PREVIEW_WRITE:-}"

REQUIRED_CONFIRMATION="I_UNDERSTAND_LEDGER_PREVIEW_ONLY"

mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_LEDGER_ENTRY_PREVIEW_RUNBOOK_V1"
echo "checked_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "head=$(git rev-parse --short HEAD)"
echo "tag=$(git tag --points-at HEAD | head -1)"
echo "local_base=$LOCAL_BASE"
echo "data_dir=$DATA_DIR"
echo "out=$OUT"
echo "ledger_preview_state=$LEDGER_PREVIEW_STATE"

if [ "$CONFIRM_LEDGER_PREVIEW_WRITE" != "$REQUIRED_CONFIRMATION" ]; then
  echo "explicit_confirmation_required=true"
  echo "confirmation_string_green=false"
  echo "ledger_entry_preview_written=false"
  echo "ERROR: refusing ledger entry preview write without CONFIRM_LEDGER_PREVIEW_WRITE=$REQUIRED_CONFIRMATION"
  exit 2
fi

echo "explicit_confirmation_required=true"
echo "confirmation_string_green=true"

case "$LEDGER_PREVIEW_STATE" in
  deferred|ready_for_operator_ledger_review|rejected) ;;
  *)
    echo "ERROR: unsupported LEDGER_PREVIEW_STATE=$LEDGER_PREVIEW_STATE"
    exit 1
    ;;
esac

AWARD_LATEST="$DATA_DIR/public-node/first-external-tester-wc-award-records/latest-award-record.json"
PREVIEW_DIR="$DATA_DIR/public-node/first-external-tester-wc-ledger-entry-previews"
PREVIEW_LATEST="$PREVIEW_DIR/latest-ledger-entry-preview.json"
PREVIEW_ARCHIVE_DIR="$PREVIEW_DIR/archive"

test -f "$AWARD_LATEST"

mkdir -p "$PREVIEW_ARCHIVE_DIR"

python3 - "$AWARD_LATEST" "$PREVIEW_LATEST" "$PREVIEW_ARCHIVE_DIR" "$LEDGER_PREVIEW_STATE" "$LEDGER_PREVIEW_REASON" "$OPERATOR_ID" <<'PY2'
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

award_path = Path(sys.argv[1])
preview_latest_path = Path(sys.argv[2])
preview_archive_dir = Path(sys.argv[3])
ledger_preview_state = sys.argv[4]
ledger_preview_reason = sys.argv[5]
operator_id = sys.argv[6]

award_bytes = award_path.read_bytes()
award = json.loads(award_bytes.decode())

assert award.get("marker") == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_AWARD_RECORD_V1"
assert award.get("award_record_only") is True
assert award.get("operator_local_only") is True
assert award.get("candidate_id") == "first-external-tester-n153b-demo003-standalone-smoke-v1"
assert award.get("proposed_wc_delta_only") is True
assert award.get("ledger_write_required_before_credit") is True
assert award.get("ledger_record_created_now") is False
assert award.get("credited_wc_delta") == 0

award_safety = award.get("safety_boundary", {})
assert award_safety.get("award_record_created_now") is True
assert award_safety.get("award_created_now") is False
assert award_safety.get("award_write_allowed_now") is False
assert award_safety.get("wc_credit_delta_now") == 0

for key in [
    "wc_ledger_mutated_now",
    "wc_ledger_write",
    "wc_credit_award",
    "wc_to_void_swap",
    "automatic_ledger_write_allowed",
    "public_upload",
    "trusted_as_network_truth",
]:
    assert award_safety.get(key) is False, (key, award_safety.get(key))

now = datetime.now(timezone.utc).replace(microsecond=0)
stamp = now.strftime("%Y%m%dT%H%M%SZ")
award_sha256 = hashlib.sha256(award_bytes).hexdigest()
preview_wc_delta = int(award.get("credited_wc_delta", 0))

preview = {
    "marker": "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_LEDGER_ENTRY_PREVIEW_V1",
    "created_at_utc": now.isoformat().replace("+00:00", "Z"),
    "candidate_id": award.get("candidate_id"),
    "source_award_record_marker": award.get("marker"),
    "source_award_record_sha256": award_sha256,
    "source_award_record_state": award.get("award_record_state"),
    "source_proposed_wc_delta": int(award.get("source_proposed_wc_delta", 0)),
    "source_credited_wc_delta": int(award.get("credited_wc_delta", 0)),
    "ledger_preview_state": ledger_preview_state,
    "ledger_preview_reason": ledger_preview_reason,
    "operator_id": operator_id,
    "ledger_preview_only": True,
    "operator_local_only": True,
    "ledger_record_created_now": False,
    "ledger_write_required_before_credit": True,
    "preview_wc_delta": preview_wc_delta,
    "credited_wc_delta": 0,
    "safety_boundary": {
        "operator_decision_created_now": False,
        "review_record_created_now": False,
        "decision_record_created_now": False,
        "award_intent_packet_created_now": False,
        "award_record_created_now": False,
        "ledger_entry_preview_created_now": True,
        "ledger_record_created_now": False,
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

preview_latest_path.parent.mkdir(parents=True, exist_ok=True)
preview_archive_dir.mkdir(parents=True, exist_ok=True)

payload = json.dumps(preview, indent=2, sort_keys=True) + "\n"
preview_latest_path.write_text(payload)

archive_path = preview_archive_dir / f"ledger-entry-preview-{stamp}.json"
archive_path.write_text(payload)

print("ledger_entry_preview_json_green=true")
print("ledger_entry_preview_archive_json_green=true")
print(f"ledger_entry_preview_latest={preview_latest_path}")
print(f"ledger_entry_preview_archive={archive_path}")
print(f"candidate_id={preview['candidate_id']}")
print(f"ledger_preview_state={preview['ledger_preview_state']}")
print(f"preview_wc_delta={preview['preview_wc_delta']}")
print(f"credited_wc_delta={preview['credited_wc_delta']}")
print(f"source_award_record_sha256={preview['source_award_record_sha256']}")
PY2

test -f "$PREVIEW_LATEST"
test "$(find "$PREVIEW_ARCHIVE_DIR" -maxdepth 1 -type f -name 'ledger-entry-preview-*.json' | wc -l)" -ge 1

python3 - "$PREVIEW_LATEST" "$LEDGER_PREVIEW_STATE" "$OPERATOR_ID" <<'PY2'
import json
import sys
from pathlib import Path

preview = json.loads(Path(sys.argv[1]).read_text())
ledger_preview_state = sys.argv[2]
operator_id = sys.argv[3]

assert preview.get("marker") == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_LEDGER_ENTRY_PREVIEW_V1"
assert preview.get("candidate_id") == "first-external-tester-n153b-demo003-standalone-smoke-v1"
assert preview.get("ledger_preview_only") is True
assert preview.get("operator_local_only") is True
assert preview.get("ledger_preview_state") == ledger_preview_state
assert preview.get("operator_id") == operator_id
assert preview.get("ledger_record_created_now") is False
assert preview.get("ledger_write_required_before_credit") is True
assert preview.get("preview_wc_delta") == 0
assert preview.get("credited_wc_delta") == 0
assert preview.get("source_award_record_marker") == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_AWARD_RECORD_V1"

safety = preview.get("safety_boundary", {})
assert safety.get("ledger_entry_preview_created_now") is True
assert safety.get("ledger_record_created_now") is False
assert safety.get("wc_credit_delta_now") == 0

for key in [
    "operator_decision_created_now",
    "review_record_created_now",
    "decision_record_created_now",
    "award_intent_packet_created_now",
    "award_record_created_now",
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

print("ledger_entry_preview_latest_json_green=true")
PY2

echo "operator_ledger_entry_preview_runbook_green=true"
echo "ledger_entry_preview_written=true"
echo "ledger_entry_preview_created_now=true"
echo "ledger_preview_only=true"
echo "operator_local_only=true"
echo "award_record_created_now=false"
echo "award_created_now=false"
echo "award_write_allowed_now=false"
echo "ledger_record_created_now=false"
echo "wc_ledger_mutated_now=false"
echo "wc_credit_delta_now=0"
echo "preview_wc_delta=0"
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
echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_LEDGER_ENTRY_PREVIEW_RUNBOOK_V1_GREEN"
