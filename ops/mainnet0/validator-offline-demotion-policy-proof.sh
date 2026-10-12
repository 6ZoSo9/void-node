#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"
export PATH="$HOME/.foundry/bin:$PATH"

BASE="${BASE:-http://127.0.0.1:4100}"
RPC="${RPC:-http://127.0.0.1:8545}"
EXPECTED_CHAIN_ID="${EXPECTED_CHAIN_ID:-2050}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/void-validator-offline-demotion-policy-proof.$STAMP}"

mkdir -p "$OUT"
chmod 700 "$OUT"
umask 077

DEPLOYER_PK="${DEPLOYER_PK:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}"
DEPLOYER="$(cast wallet address "$DEPLOYER_PK")"

MIN_STAKE_WEI="${MIN_STAKE_WEI:-10000000000000000000000}"
MAX_ACTIVE="${MAX_ACTIVE:-4}"
CHURN="${CHURN:-1}"
OFFLINE_THRESHOLD_SECONDS="${OFFLINE_THRESHOLD_SECONDS:-172800}" # 48 hours

PK1="$OUT/active-offline-over.pk"
PK2="$OUT/active-offline-under.pk"
PK3="$OUT/active-online.pk"
PK4="$OUT/waiting-offline-over.pk"
PK5="$OUT/candidate-offline-over.pk"

cleanup() {
  set +e
  rm -f "$PK1" "$PK2" "$PK3" "$PK4" "$PK5" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "=== validator offline demotion policy proof ==="
echo "base=$BASE"
echo "rpc=$RPC"
echo "out=$OUT"
echo "deployer=$DEPLOYER"
echo "offline_threshold_seconds=$OFFLINE_THRESHOLD_SECONDS"

echo
echo "=== [a] baseline readiness/monitoring ==="
curl -fsS "$BASE/__void/ready.json" > "$OUT/ready.baseline.json"
cat "$OUT/ready.baseline.json"
echo
python3 - "$OUT/ready.baseline.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] VOID ready")
PY

curl -fsS http://127.0.0.1:9090/-/ready >/tmp/void-prom-ready.txt
cat /tmp/void-prom-ready.txt
echo

curl -fsS --get http://127.0.0.1:9090/api/v1/query \
  --data-urlencode 'query=ready:last_30s' > "$OUT/prom-ready-last30s.json"
cat "$OUT/prom-ready-last30s.json"
echo

python3 - "$OUT/prom-ready-last30s.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
r=(j.get("data") or {}).get("result") or []
assert r, j
assert any(str((x.get("value") or ["",""])[1]) in ("1","1.0") for x in r), j
print("[ok] Prom ready:last_30s is green")
PY

echo
echo "=== [b] localhost-only RPC sanity ==="
if ! cast chain-id --rpc-url "$RPC" >/tmp/void-offline-policy-chainid.txt 2>/tmp/void-offline-policy-chainid.err; then
  echo "[ERR] local RPC is not responding"
  cat /tmp/void-offline-policy-chainid.err || true
  exit 1
fi

CHAIN_ID="$(cat /tmp/void-offline-policy-chainid.txt)"
echo "chainId=$CHAIN_ID"
test "$CHAIN_ID" = "$EXPECTED_CHAIN_ID"

SS8545="$(ss -H -ltnp | grep -E ':8545\b' || true)"
printf '%s\n' "$SS8545"
if printf '%s\n' "$SS8545" | grep -Eq '0\.0\.0\.0:8545|\[::\]:8545|:::8545'; then
  echo "[ERR] RPC appears exposed beyond localhost"
  exit 1
fi
echo "[ok] RPC chain and bind safe"

echo
echo "=== [c] deploy fresh candidate registry ==="
BAL_HEX="$(MIN_STAKE_WEI="${MIN_STAKE_WEI:-10000000000000000000000}" python3 - <<'PY'
import os
stake = int(os.environ["MIN_STAKE_WEI"])
gas_headroom = 100 * 10**18
print(hex(stake + gas_headroom))
PY
)"

python3 - "$PK1" "$PK2" "$PK3" "$PK4" "$PK5" <<'PY'
import secrets, sys
for p in sys.argv[1:]:
    open(p, "w").write("0x" + secrets.token_hex(32))
PY
chmod 600 "$PK1" "$PK2" "$PK3" "$PK4" "$PK5"

A1="$(cast wallet address "$(cat "$PK1")")" # active offline >48h
A2="$(cast wallet address "$(cat "$PK2")")" # active offline <48h
A3="$(cast wallet address "$(cat "$PK3")")" # active online
A4="$(cast wallet address "$(cat "$PK4")")" # waiting offline >48h, must not be selected by active-only policy
A5="$(cast wallet address "$(cat "$PK5")")" # candidate offline >48h, must not be selected

echo "active_offline_over=$A1"
echo "active_offline_under=$A2"
echo "active_online=$A3"
echo "waiting_offline_over=$A4"
echo "candidate_offline_over=$A5"
echo "[ok] temp candidate keys generated; private keys not printed"

for addr in "$DEPLOYER" "$A1" "$A2" "$A3" "$A4" "$A5"; do
  cast rpc --rpc-url "$RPC" anvil_setBalance "$addr" "$BAL_HEX" >/dev/null
done

DEPLOY_LOG="$OUT/forge-create-registry.log"
forge create \
  --rpc-url "$RPC" \
  --private-key "$DEPLOYER_PK" \
  --broadcast \
  contracts/mainnet0/VoidValidatorCandidateRegistry.sol:VoidValidatorCandidateRegistry \
  --constructor-args "$MIN_STAKE_WEI" "$MAX_ACTIVE" "$CHURN" \
  > "$DEPLOY_LOG" 2>&1 || {
    echo "[ERR] forge create failed"
    cat "$DEPLOY_LOG"
    exit 1
  }

cat "$DEPLOY_LOG"
REGISTRY="$(awk '/Deployed to:/ {print $3}' "$DEPLOY_LOG" | tail -1)"
if ! [[ "$REGISTRY" =~ ^0x[0-9a-fA-F]{40}$ ]]; then
  echo "[ERR] could not parse registry address"
  exit 1
fi
echo "registry=$REGISTRY"

cast_uint() {
  cast call --rpc-url "$RPC" "$REGISTRY" "$1" | awk '{print $1}'
}

count_candidates() { cast_uint 'candidateCount()(uint256)'; }
count_waiting() { cast_uint 'waitingCount()(uint256)'; }
count_active() { cast_uint 'activeCount()(uint256)'; }

state_of() {
  cast call --rpc-url "$RPC" "$REGISTRY" 'getCandidate(address)((address,address,bytes32,bytes32,uint256,uint256,uint256,uint8))' "$1"
}

state_num() {
  state_of "$1" | sed -E 's/.*,[[:space:]]*([0-9]+)\)$/\1/'
}

echo
echo "=== [d] verify constructor policy ==="
MIN_ONCHAIN="$(cast_uint 'minValidatorStake()(uint256)')"
MAX_ONCHAIN="$(cast_uint 'maxActiveValidators()(uint256)')"
CHURN_ONCHAIN="$(cast_uint 'activationChurnLimit()(uint256)')"
OWNER_ONCHAIN="$(cast call --rpc-url "$RPC" "$REGISTRY" 'owner()(address)' | awk '{print $1}')"

echo "min=$MIN_ONCHAIN"
echo "max=$MAX_ONCHAIN"
echo "churn=$CHURN_ONCHAIN"
echo "owner=$OWNER_ONCHAIN"

test "$MIN_ONCHAIN" = "$MIN_STAKE_WEI"
test "$MAX_ONCHAIN" = "$MAX_ACTIVE"
test "$CHURN_ONCHAIN" = "$CHURN"
test "${OWNER_ONCHAIN,,}" = "${DEPLOYER,,}"
echo "[ok] constructor policy verified"

echo
echo "=== [e] register five candidates ==="
register_one() {
  local pk="$1"
  local addr="$2"
  local label="$3"
  local consensus
  local metadata
  consensus="$(cast keccak "$label-consensus")"
  metadata="$(cast keccak "$label-metadata")"

  cast send \
    --rpc-url "$RPC" \
    --private-key "$pk" \
    --value "$MIN_STAKE_WEI" \
    "$REGISTRY" \
    'registerCandidate(address,bytes32,bytes32)' \
    "$addr" "$consensus" "$metadata" \
    > "$OUT/register-$label.log" 2>&1

  grep -E 'status|transactionHash|from|to' "$OUT/register-$label.log" || true
}

register_one "$(cat "$PK1")" "$A1" "active-offline-over"
register_one "$(cat "$PK2")" "$A2" "active-offline-under"
register_one "$(cat "$PK3")" "$A3" "active-online"
register_one "$(cat "$PK4")" "$A4" "waiting-offline-over"
register_one "$(cat "$PK5")" "$A5" "candidate-offline-over"

test "$(count_candidates)" = "5"
test "$(count_waiting)" = "0"
test "$(count_active)" = "0"
echo "[ok] five public candidates registered without activation"

echo
echo "=== [f] move four to waiting, activate three ==="
for addr in "$A1" "$A2" "$A3" "$A4"; do
  cast send \
    --rpc-url "$RPC" \
    --private-key "$DEPLOYER_PK" \
    "$REGISTRY" \
    'moveToWaiting(address)' \
    "$addr" \
    > "$OUT/move-waiting-$addr.log" 2>&1
done

test "$(count_waiting)" = "4"
test "$(count_active)" = "0"

for addr in "$A1" "$A2" "$A3"; do
  cast send \
    --rpc-url "$RPC" \
    --private-key "$DEPLOYER_PK" \
    "$REGISTRY" \
    'markActiveBatch(address[])' \
    "[$addr]" \
    > "$OUT/activate-$addr.log" 2>&1
done

WAITING_AFTER_SETUP="$(count_waiting)"
ACTIVE_AFTER_SETUP="$(count_active)"

echo "waiting_after_setup=$WAITING_AFTER_SETUP"
echo "active_after_setup=$ACTIVE_AFTER_SETUP"

test "$WAITING_AFTER_SETUP" = "1"
test "$ACTIVE_AFTER_SETUP" = "3"

test "$(state_num "$A1")" = "3"
test "$(state_num "$A2")" = "3"
test "$(state_num "$A3")" = "3"
test "$(state_num "$A4")" = "2"
test "$(state_num "$A5")" = "1"
echo "[ok] setup complete: 3 active, 1 waiting, 1 plain candidate"

echo
echo "=== [g] build offline observation snapshot ==="
NOW="$(date +%s)"
OVER_48="$((OFFLINE_THRESHOLD_SECONDS + 3600))"
UNDER_48="$((OFFLINE_THRESHOLD_SECONDS - 60))"

cat > "$OUT/offline-observations.json" <<JSON
{
  "now": $NOW,
  "offlineThresholdSeconds": $OFFLINE_THRESHOLD_SECONDS,
  "policy": "active validators offline for >=48h are eligible for owner demotion; waiting/candidate are ignored by active-only policy",
  "validators": [
    {
      "address": "$A1",
      "label": "active_offline_over",
      "state": "Active",
      "stateNum": 3,
      "online": false,
      "lastSeen": $((NOW - OVER_48))
    },
    {
      "address": "$A2",
      "label": "active_offline_under",
      "state": "Active",
      "stateNum": 3,
      "online": false,
      "lastSeen": $((NOW - UNDER_48))
    },
    {
      "address": "$A3",
      "label": "active_online",
      "state": "Active",
      "stateNum": 3,
      "online": true,
      "lastSeen": $NOW
    },
    {
      "address": "$A4",
      "label": "waiting_offline_over",
      "state": "Waiting",
      "stateNum": 2,
      "online": false,
      "lastSeen": $((NOW - OVER_48))
    },
    {
      "address": "$A5",
      "label": "candidate_offline_over",
      "state": "Candidate",
      "stateNum": 1,
      "online": false,
      "lastSeen": $((NOW - OVER_48))
    }
  ]
}
JSON

cat "$OUT/offline-observations.json"

echo
echo "=== [h] evaluate 48-hour active-only demotion policy ==="
python3 - "$OUT/offline-observations.json" "$OUT/offline-policy-decision.json" <<'PY'
import json, sys

src, dst = sys.argv[1], sys.argv[2]
j = json.load(open(src))
now = int(j["now"])
threshold = int(j["offlineThresholdSeconds"])

eligible = []
ignored = []

for v in j["validators"]:
    offline_for = 0 if v["online"] else now - int(v["lastSeen"])
    row = dict(v)
    row["offlineForSeconds"] = offline_for
    row["offlineForHours"] = round(offline_for / 3600, 4)

    if v["state"] == "Active" and not v["online"] and offline_for >= threshold:
        row["decision"] = "eligible_for_owner_demote"
        eligible.append(row)
    else:
        row["decision"] = "ignore"
        ignored.append(row)

out = {
    "ok": True,
    "kind": "validator_offline_demotion_policy_decision",
    "thresholdSeconds": threshold,
    "thresholdHours": threshold / 3600,
    "eligible": eligible,
    "ignored": ignored,
    "eligibleCount": len(eligible),
    "ignoredCount": len(ignored),
}

assert threshold == 172800, out
assert len(eligible) == 1, out
assert eligible[0]["label"] == "active_offline_over", out

ignored_labels = {x["label"] for x in ignored}
assert "active_offline_under" in ignored_labels, out
assert "active_online" in ignored_labels, out
assert "waiting_offline_over" in ignored_labels, out
assert "candidate_offline_over" in ignored_labels, out

json.dump(out, open(dst, "w"), indent=2)
print(json.dumps(out, indent=2))
print("[ok] policy selected exactly one active validator offline >=48h")
PY

ELIGIBLE_ADDR="$(python3 - <<'PY'
import json
j=json.load(open("/tmp/void-offline-policy-decision-path-missing"))
PY
)" 2>/dev/null || true

ELIGIBLE_ADDR="$(python3 - "$OUT/offline-policy-decision.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
print(j["eligible"][0]["address"])
PY
)"

echo "eligible_addr=$ELIGIBLE_ADDR"
test "${ELIGIBLE_ADDR,,}" = "${A1,,}"

echo
echo "=== [i] prove non-owner cannot apply offline demotion ==="
set +e
cast send \
  --rpc-url "$RPC" \
  --private-key "$(cat "$PK2")" \
  "$REGISTRY" \
  'jail(address)' \
  "$ELIGIBLE_ADDR" \
  > "$OUT/non-owner-offline-demote.log" 2>&1
NON_OWNER_RC=$?
set -e

if [ "$NON_OWNER_RC" = "0" ]; then
  echo "[ERR] non-owner offline demotion unexpectedly succeeded"
  cat "$OUT/non-owner-offline-demote.log"
  exit 1
fi

test "$(count_active)" = "3"
test "$(count_waiting)" = "1"
echo "[ok] non-owner cannot apply offline demotion"

echo
echo "=== [j] owner applies offline demotion/quarantine to eligible active validator ==="
cast send \
  --rpc-url "$RPC" \
  --private-key "$DEPLOYER_PK" \
  "$REGISTRY" \
  'jail(address)' \
  "$ELIGIBLE_ADDR" \
  > "$OUT/owner-offline-demote.log" 2>&1

grep -E 'status|transactionHash|from|to' "$OUT/owner-offline-demote.log" || true

ACTIVE_AFTER_DEMOTE="$(count_active)"
WAITING_AFTER_DEMOTE="$(count_waiting)"
CANDIDATE_AFTER_DEMOTE="$(count_candidates)"

STATE_A1_AFTER="$(state_num "$A1")"
STATE_A2_AFTER="$(state_num "$A2")"
STATE_A3_AFTER="$(state_num "$A3")"
STATE_A4_AFTER="$(state_num "$A4")"
STATE_A5_AFTER="$(state_num "$A5")"

echo "candidate_after_demote=$CANDIDATE_AFTER_DEMOTE"
echo "waiting_after_demote=$WAITING_AFTER_DEMOTE"
echo "active_after_demote=$ACTIVE_AFTER_DEMOTE"
echo "state_a1_after=$STATE_A1_AFTER"
echo "state_a2_after=$STATE_A2_AFTER"
echo "state_a3_after=$STATE_A3_AFTER"
echo "state_a4_after=$STATE_A4_AFTER"
echo "state_a5_after=$STATE_A5_AFTER"

test "$CANDIDATE_AFTER_DEMOTE" = "5"
test "$WAITING_AFTER_DEMOTE" = "1"
test "$ACTIVE_AFTER_DEMOTE" = "2"
test "$STATE_A1_AFTER" = "5"
test "$STATE_A2_AFTER" = "3"
test "$STATE_A3_AFTER" = "3"
test "$STATE_A4_AFTER" = "2"
test "$STATE_A5_AFTER" = "1"
echo "[ok] eligible active validator demoted/quarantined; non-eligible validators untouched"

echo
echo "=== [k] prove policy does not auto-fill active slot ==="
# Active count dropped from 3 to 2. Waiting stayed 1.
# The policy intentionally does not automatically promote A4; rotation/admission is a separate owner/epoch action.
test "$(count_active)" = "2"
test "$(count_waiting)" = "1"
test "$(state_num "$A4")" = "2"
echo "[ok] offline demotion does not auto-fill active slot"

echo
echo "=== [l] write isolated policy unit test ==="
cat > "$OUT/offline-policy-unit-test.py" <<'PY'
import json

THRESHOLD = 48 * 60 * 60
NOW = 1_777_392_000

validators = [
    {"label":"active_offline_over","state":"Active","online":False,"lastSeen":NOW - THRESHOLD - 1},
    {"label":"active_offline_equal","state":"Active","online":False,"lastSeen":NOW - THRESHOLD},
    {"label":"active_offline_under","state":"Active","online":False,"lastSeen":NOW - THRESHOLD + 1},
    {"label":"active_online","state":"Active","online":True,"lastSeen":NOW - THRESHOLD - 999},
    {"label":"waiting_offline_over","state":"Waiting","online":False,"lastSeen":NOW - THRESHOLD - 999},
    {"label":"candidate_offline_over","state":"Candidate","online":False,"lastSeen":NOW - THRESHOLD - 999},
]

eligible = []
for v in validators:
    offline_for = 0 if v["online"] else NOW - v["lastSeen"]
    if v["state"] == "Active" and (not v["online"]) and offline_for >= THRESHOLD:
        eligible.append(v["label"])

assert eligible == ["active_offline_over", "active_offline_equal"], eligible
print(json.dumps({"ok": True, "eligible": eligible, "thresholdSeconds": THRESHOLD}, indent=2))
PY

python3 "$OUT/offline-policy-unit-test.py"

echo
echo "=== [m] print final candidate tuples ==="
for addr in "$A1" "$A2" "$A3" "$A4" "$A5"; do
  echo "--- $addr ---"
  state_of "$addr"
  echo
done

echo
echo "=== [n] write proof artifact ==="
ART=".runtime/mainnet0/validator-offline-demotion-policy.local.current.json"
mkdir -p "$(dirname "$ART")"

cat > "$OUT/summary.json" <<JSON
{
  "ok": true,
  "kind": "validator_offline_demotion_policy_proof",
  "rpc": "$RPC",
  "chainId": "$EXPECTED_CHAIN_ID",
  "registry": "$REGISTRY",
  "owner": "$DEPLOYER",
  "offlineThresholdSeconds": "$OFFLINE_THRESHOLD_SECONDS",
  "offlineThresholdHours": "48",
  "currentPrimitive": "owner-gated jail(address) quarantine",
  "automaticContractDemotion": false,
  "schedulerPolicy": "active-only, offline >= 48h",
  "eligibleAddress": "$ELIGIBLE_ADDR",
  "eligibleLabel": "active_offline_over",
  "nonOwnerOfflineDemotionRejected": true,
  "ownerOfflineDemotionApplied": true,
  "candidateCountFinal": "$CANDIDATE_AFTER_DEMOTE",
  "waitingCountFinal": "$WAITING_AFTER_DEMOTE",
  "activeCountFinal": "$ACTIVE_AFTER_DEMOTE",
  "activeCountDroppedByOne": true,
  "waitingNotAutoPromoted": true,
  "stateActiveOfflineOverFinal": "$STATE_A1_AFTER",
  "stateActiveOfflineUnderFinal": "$STATE_A2_AFTER",
  "stateActiveOnlineFinal": "$STATE_A3_AFTER",
  "stateWaitingOfflineOverFinal": "$STATE_A4_AFTER",
  "stateCandidateOfflineOverFinal": "$STATE_A5_AFTER"
}
JSON

cp "$OUT/summary.json" "$ART"
cat "$ART"

echo
echo "=== [o] final readiness/monitoring ==="
curl -fsS "$BASE/__void/ready.json"
echo
curl -fsS --get http://127.0.0.1:9090/api/v1/query --data-urlencode 'query=ready:last_30s'
echo

echo
echo "[ok] validator offline demotion policy proof green"
