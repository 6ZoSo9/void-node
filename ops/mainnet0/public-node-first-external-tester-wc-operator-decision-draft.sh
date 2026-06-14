#!/usr/bin/env bash
set -euo pipefail

LOCAL_BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/public-node-first-external-tester-wc-operator-decision-draft-$(date -u +%Y%m%d-%H%M%S)}"
DECISION_STATE="${DECISION_STATE:-deferred}"
DECISION_REASON="${DECISION_REASON:-operator draft generated; no award or ledger write}"
OPERATOR_ID="${OPERATOR_ID:-operator-local}"
WC_DELTA_IF_ACCEPTED="${WC_DELTA_IF_ACCEPTED:-0}"
WRITE_RUNTIME="${WRITE_RUNTIME:-false}"
DATA_DIR="${DATA_DIR:-.runtime/mainnet0}"

mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_DRAFT_V1"
echo "checked_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "head=$(git rev-parse --short HEAD)"
echo "tag=$(git tag --points-at HEAD | head -1)"
echo "local_base=$LOCAL_BASE"
echo "out=$OUT"
echo "decision_state=$DECISION_STATE"
echo "write_runtime=$WRITE_RUNTIME"

case "$DECISION_STATE" in
  accepted|rejected|deferred) ;;
  *)
    echo "ERROR: unsupported DECISION_STATE=$DECISION_STATE"
    exit 1
    ;;
esac

case "$WRITE_RUNTIME" in
  true|false) ;;
  *)
    echo "ERROR: WRITE_RUNTIME must be true or false"
    exit 1
    ;;
esac

curl -fsS "$LOCAL_BASE/public-node/first-external-tester-wc-operator-decision-packet.json" \
  > "$OUT/operator-decision-packet.json"

python3 - "$OUT" "$DECISION_STATE" "$DECISION_REASON" "$OPERATOR_ID" "$WC_DELTA_IF_ACCEPTED" "$WRITE_RUNTIME" <<'PY'
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

out = Path(sys.argv[1])
decision_state = sys.argv[2]
decision_reason = sys.argv[3]
operator_id = sys.argv[4]
wc_delta_if_accepted = int(sys.argv[5])
write_runtime = sys.argv[6] == "true"

packet = json.loads((out / "operator-decision-packet.json").read_text())

assert packet.get("marker") == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_PACKET_V1"
assert packet.get("packet_state") == "template_only_no_operator_decision_created"
assert packet.get("current_decision_state") == "not_decided"

safety = packet.get("safety_boundary", {})
for key in [
    "operator_decision_created_now",
    "review_record_created_now",
    "award_created_now",
    "wc_ledger_mutated_now",
    "wc_decision_record_write",
    "wc_review_record_write",
    "wc_ledger_write",
    "wc_credit_award",
    "wc_to_void_swap",
    "automatic_ledger_write_allowed",
    "public_upload",
    "trusted_as_network_truth",
]:
    assert safety.get(key) is False, (key, safety.get(key))

if decision_state != "accepted":
    wc_delta_if_accepted = 0

draft = {
    "marker": "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_DRAFT_V1",
    "created_at_utc": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
    "draft_only": True,
    "operator_local_only": True,
    "source_packet_marker": packet.get("marker"),
    "source_packet_route": "/public-node/first-external-tester-wc-operator-decision-packet.json",
    "candidate_id": packet.get("candidate_id"),
    "candidate_status": packet.get("candidate_status"),
    "allowed_decision_states": packet.get("allowed_decision_states", []),
    "decision_state": decision_state,
    "decision_reason": decision_reason,
    "operator_id": operator_id,
    "wc_delta_if_accepted": wc_delta_if_accepted,
    "safety_boundary": {
        "operator_decision_created_now": False,
        "review_record_created_now": False,
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
        "validator_mutation": False,
    },
    "write_runtime_requested": write_runtime,
    "write_runtime_default": False,
    "next_required_step": "separate explicit operator review record lane; no automatic award",
}

(out / "operator-decision-draft.json").write_text(json.dumps(draft, indent=2) + "\n")

assert draft["draft_only"] is True
assert draft["operator_local_only"] is True
assert draft["decision_state"] in ["accepted", "rejected", "deferred"]
assert draft["safety_boundary"]["operator_decision_created_now"] is False
assert draft["safety_boundary"]["review_record_created_now"] is False
assert draft["safety_boundary"]["decision_record_created_now"] is False
assert draft["safety_boundary"]["award_created_now"] is False
assert draft["safety_boundary"]["wc_ledger_mutated_now"] is False
assert draft["safety_boundary"]["wc_credit_delta_now"] == 0
assert draft["safety_boundary"]["wc_ledger_write"] is False
assert draft["safety_boundary"]["wc_credit_award"] is False
assert draft["safety_boundary"]["wc_to_void_swap"] is False
assert draft["safety_boundary"]["automatic_ledger_write_allowed"] is False
assert draft["safety_boundary"]["public_upload"] is False
assert draft["safety_boundary"]["trusted_as_network_truth"] is False

print("operator_decision_draft_json_green=true")
print(f"draft_path={out / 'operator-decision-draft.json'}")
print(f"candidate_id={draft.get('candidate_id')}")
print(f"decision_state={draft.get('decision_state')}")
PY

if [ "$WRITE_RUNTIME" = "true" ]; then
  RUNTIME_DIR="$DATA_DIR/public-node/first-external-tester-wc-operator-decision-drafts"
  ARCHIVE_DIR="$RUNTIME_DIR/archive"
  mkdir -p "$ARCHIVE_DIR"

  cp "$OUT/operator-decision-draft.json" "$RUNTIME_DIR/latest-draft.json"
  cp "$OUT/operator-decision-draft.json" "$ARCHIVE_DIR/operator-decision-draft-$(date -u +%Y%m%d-%H%M%S).json"

  echo "runtime_draft_written=true"
  echo "runtime_latest=$RUNTIME_DIR/latest-draft.json"
else
  echo "runtime_draft_written=false"
fi

echo "operator_decision_draft_green=true"
echo "operator_decision_draft_only=true"
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
echo "write_runtime_default=false"
echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_DRAFT_V1_GREEN"
