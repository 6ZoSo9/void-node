#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${1:-$REPO/ops/mainnet/validator-status.current.yaml}"
IDENTITY_FILE="${IDENTITY_FILE:-$REPO/ops/mainnet/validator-identity.env}"

if [[ -f "$IDENTITY_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$IDENTITY_FILE"
  set +a
fi

VALIDATOR_ID="${VALIDATOR_ID:-candidate-validator-01}"
OPERATOR_LABEL="${OPERATOR_LABEL:-zoso}"
OPERATOR_CONTACT_PATH="${OPERATOR_CONTACT_PATH:-TBD}"
REWARD_ADDRESS="${REWARD_ADDRESS:-0xTBD}"
CONSENSUS_KEY="${CONSENSUS_KEY:-0xTBD}"
EXPECTED_BRANCH="${EXPECTED_BRANCH:-main}"
EXPECTED_VERSION="${EXPECTED_VERSION:-1}"
EXPECTED_CONFIG_IDENTITY="${EXPECTED_CONFIG_IDENTITY:-two-box-mainnet0-baseline}"
CURRENT_REPORTED_VERSION="${CURRENT_REPORTED_VERSION:-1}"
CURRENT_REPORTED_CONFIG_IDENTITY="${CURRENT_REPORTED_CONFIG_IDENTITY:-two-box-mainnet0-baseline}"
MAIN_BASE="${MAIN_BASE:-http://100.122.79.39:4100}"
LOCAL_BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"

mkdir -p "$(dirname "$OUT")"

TMP_READY="$(mktemp)"
TMP_PEER="$(mktemp)"
cleanup(){ rm -f "$TMP_READY" "$TMP_PEER"; }
trap cleanup EXIT

curl -fsS "$LOCAL_BASE/__void/ready.json" > "$TMP_READY"
curl -fsS "$LOCAL_BASE/__void/peer-main-status.json" > "$TMP_PEER"

python3 - "$TMP_READY" "$TMP_PEER" "$OUT" \
  "$VALIDATOR_ID" "$OPERATOR_LABEL" "$OPERATOR_CONTACT_PATH" \
  "$REWARD_ADDRESS" "$CONSENSUS_KEY" \
  "$EXPECTED_BRANCH" "$EXPECTED_VERSION" "$EXPECTED_CONFIG_IDENTITY" \
  "$CURRENT_REPORTED_VERSION" "$CURRENT_REPORTED_CONFIG_IDENTITY" <<'PY'
import json, sys
from pathlib import Path
from datetime import datetime, timezone

ready = json.load(open(sys.argv[1]))
peer = json.load(open(sys.argv[2]))
out = Path(sys.argv[3])

validator_id = sys.argv[4]
operator_label = sys.argv[5]
operator_contact_path = sys.argv[6]
reward_address = sys.argv[7]
consensus_key = sys.argv[8]
expected_branch = sys.argv[9]
expected_version = sys.argv[10]
expected_config_identity = sys.argv[11]
current_reported_version = sys.argv[12]
current_reported_config_identity = sys.argv[13]

same_node = peer.get("same_node")
main_ok = peer.get("main_ok")
local_ok = peer.get("local_ok")
local_head = peer.get("local_head")
head_gap = peer.get("head_gap")
node_id = (peer.get("local") or {}).get("nodeId", "")
ready_ok = bool(ready.get("ready"))
reasons = ready.get("reasons") or []
txroot_live = ready.get("txroot_live")

if ready_ok and same_node is False and local_ok and main_ok:
    status = "candidate"
    status_reason = "two-box mainnet0 readiness proof green"
    checkpoint_awareness_status = "baseline-observe"
    incident_response_readiness = "policy-stack-sanity-green"
else:
    status = "blocked"
    status_reason = "validator admission preconditions not met"
    checkpoint_awareness_status = "needs-review"
    incident_response_readiness = "needs-review"

ts = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

notes = [
    f"node_id={node_id}",
    f"same_node={same_node}",
    f"peer_head_gap={head_gap}",
    f"txroot_live={txroot_live}",
]
for r in reasons:
    notes.append(f"ready_reason={r}")

text = f"""validator_id: {validator_id}
operator_label: {operator_label}
operator_contact_path: {operator_contact_path}
reward_address: "{reward_address}"
consensus_key: "{consensus_key}"

expected_branch: {expected_branch}
expected_version: {expected_version}
expected_config_identity: {expected_config_identity}
current_reported_version: {current_reported_version}
current_reported_config_identity: {current_reported_config_identity}

status: {status}
status_reason: {status_reason}
status_last_changed_at: {ts}

last_known_head: {local_head}
last_known_health: ready={str(ready_ok).lower()}
last_known_drift: {head_gap}
checkpoint_awareness_status: {checkpoint_awareness_status}
incident_response_readiness: {incident_response_readiness}

warning_count: 0
pause_count: 0
last_warning_at: null
last_pause_at: null
last_incident_involved: null

notes:
"""
for n in notes:
    text += f'  - "{n}"\n'
text += """operator_comments:
  - "Stamped from live validator admission status script."
"""
out.write_text(text)
print(out.read_text())
PY

echo
echo "[ok] stamped $OUT"
