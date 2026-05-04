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
OUT="${OUT:-/tmp/void-validator-offline-demotion-refill-policy-proof.$STAMP}"

mkdir -p "$OUT"
chmod 700 "$OUT"
umask 077

DEPLOYER_PK="${DEPLOYER_PK:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}"
DEPLOYER="$(cast wallet address "$DEPLOYER_PK")"

MIN_STAKE_WEI="${MIN_STAKE_WEI:-10000000000000000000000}"
MAX_ACTIVE="${MAX_ACTIVE:-3}"
CHURN="${CHURN:-1}"
OFFLINE_THRESHOLD_SECONDS="${OFFLINE_THRESHOLD_SECONDS:-172800}" # 48 hours

PK1="$OUT/active-offline-over.pk"
PK2="$OUT/active-online-a.pk"
PK3="$OUT/active-online-b.pk"
PK4="$OUT/waiting-healthy-replacement.pk"
PK5="$OUT/plain-candidate.pk"

cleanup() {
  set +e
  rm -f "$PK1" "$PK2" "$PK3" "$PK4" "$PK5" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "=== validator offline demotion refill policy proof ==="
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
if ! cast chain-id --rpc-url "$RPC" >/tmp/void-offline-refill-chainid.txt 2>/tmp/void-offline-refill-chainid.err; then
  echo "[ERR] local RPC is not responding"
  cat /tmp/void-offline-refill-chainid.err || true
  exit 1
fi

CHAIN_ID="$(cat /tmp/void-offline-refill-chainid.txt)"
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
A2="$(cast wallet address "$(cat "$PK2")")" # active online
A3="$(cast wallet address "$(cat "$PK3")")" # active online
A4="$(cast wallet address "$(cat "$PK4")")" # waiting healthy replacement
A5="$(cast wallet address "$(cat "$PK5")")" # plain candidate, not waiting

echo "active_offline_over=$A1"
echo "active_online_a=$A2"
echo "active_online_b=$A3"
echo "waiting_healthy_replacement=$A4"
echo "plain_candidate=$A5"
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
register_one "$(cat "$PK2")" "$A2" "active-online-a"
register_one "$(cat "$PK3")" "$A3" "active-online-b"
register_one "$(cat "$PK4")" "$A4" "waiting-healthy-replacement"
register_one "$(cat "$PK5")" "$A5" "plain-candidate"

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
echo "[ok] setup complete: 3 active, 1 waiting replacement, 1 plain candidate"

echo
echo "=== [g] evaluate offline demotion policy ==="
NOW="$(date +%s)"
OFFLINE_FOR="$((OFFLINE_THRESHOLD_SECONDS + 3600))"

cat > "$OUT/offline-refill-observations.json" <<JSON
{
  "now": $NOW,
  "offlineThresholdSeconds": $OFFLINE_THRESHOLD_SECONDS,
  "validators": [
    {"address":"$A1","label":"active_offline_over","state":"Active","stateNum":3,"online":false,"lastSeen":$((NOW - OFFLINE_FOR))},
    {"address":"$A2","label":"active_online_a","state":"Active","stateNum":3,"online":true,"lastSeen":$NOW},
    {"address":"$A3","label":"active_online_b","state":"Active","stateNum":3,"online":true,"lastSeen":$NOW},
    {"address":"$A4","label":"waiting_healthy_replacement","state":"Waiting","stateNum":2,"online":true,"lastSeen":$NOW},
    {"address":"$A5","label":"plain_candidate","state":"Candidate","stateNum":1,"online":true,"lastSeen":$NOW}
  ]
}
JSON

cat "$OUT/offline-refill-observations.json"

python3 - "$OUT/offline-refill-observations.json" "$OUT/offline-refill-policy-decision.json" <<'PY'
import json, sys
src, dst = sys.argv[1], sys.argv[2]
j=json.load(open(src))
now=int(j["now"])
threshold=int(j["offlineThresholdSeconds"])

eligible_demotions=[]
eligible_replacements=[]

for v in j["validators"]:
    offline_for = 0 if v["online"] else now - int(v["lastSeen"])
    row = dict(v)
    row["offlineForSeconds"] = offline_for
    if v["state"] == "Active" and not v["online"] and offline_for >= threshold:
        row["decision"] = "eligible_for_owner_demote"
        eligible_demotions.append(row)
    elif v["state"] == "Waiting" and v["online"]:
        row["decision"] = "eligible_waiting_replacement"
        eligible_replacements.append(row)

out = {
    "ok": True,
    "kind": "validator_offline_demotion_refill_policy_decision",
    "thresholdSeconds": threshold,
    "eligibleDemotions": eligible_demotions,
    "eligibleReplacements": eligible_replacements,
    "eligibleDemotionCount": len(eligible_demotions),
    "eligibleReplacementCount": len(eligible_replacements)
}
assert threshold == 172800, out
assert len(eligible_demotions) == 1, out
assert eligible_demotions[0]["label"] == "active_offline_over", out
assert len(eligible_replacements) == 1, out
assert eligible_replacements[0]["label"] == "waiting_healthy_replacement", out
json.dump(out, open(dst, "w"), indent=2)
print(json.dumps(out, indent=2))
print("[ok] policy selected one demotion and one healthy waiting replacement")
PY

DEMOTE_ADDR="$(python3 - "$OUT/offline-refill-policy-decision.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
print(j["eligibleDemotions"][0]["address"])
PY
)"

REPLACEMENT_ADDR="$(python3 - "$OUT/offline-refill-policy-decision.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
print(j["eligibleReplacements"][0]["address"])
PY
)"

echo "demote_addr=$DEMOTE_ADDR"
echo "replacement_addr=$REPLACEMENT_ADDR"

test "${DEMOTE_ADDR,,}" = "${A1,,}"
test "${REPLACEMENT_ADDR,,}" = "${A4,,}"

echo
echo "=== [h] non-owner cannot apply demotion or refill ==="
set +e
cast send \
  --rpc-url "$RPC" \
  --private-key "$(cat "$PK2")" \
  "$REGISTRY" \
  'jail(address)' \
  "$DEMOTE_ADDR" \
  > "$OUT/non-owner-demote.log" 2>&1
NON_OWNER_DEMOTE_RC=$?

cast send \
  --rpc-url "$RPC" \
  --private-key "$(cat "$PK2")" \
  "$REGISTRY" \
  'markActiveBatch(address[])' \
  "[$REPLACEMENT_ADDR]" \
  > "$OUT/non-owner-refill.log" 2>&1
NON_OWNER_REFILL_RC=$?
set -e

if [ "$NON_OWNER_DEMOTE_RC" = "0" ]; then
  echo "[ERR] non-owner demotion unexpectedly succeeded"
  cat "$OUT/non-owner-demote.log"
  exit 1
fi

if [ "$NON_OWNER_REFILL_RC" = "0" ]; then
  echo "[ERR] non-owner refill unexpectedly succeeded"
  cat "$OUT/non-owner-refill.log"
  exit 1
fi

test "$(count_active)" = "3"
test "$(count_waiting)" = "1"
echo "[ok] non-owner cannot demote or refill"

echo
echo "=== [i] owner demotes/quarantines offline active validator ==="
cast send \
  --rpc-url "$RPC" \
  --private-key "$DEPLOYER_PK" \
  "$REGISTRY" \
  'jail(address)' \
  "$DEMOTE_ADDR" \
  > "$OUT/owner-demote.log" 2>&1

grep -E 'status|transactionHash|from|to' "$OUT/owner-demote.log" || true

ACTIVE_AFTER_DEMOTE="$(count_active)"
WAITING_AFTER_DEMOTE="$(count_waiting)"
STATE_A1_AFTER_DEMOTE="$(state_num "$A1")"
STATE_A4_AFTER_DEMOTE="$(state_num "$A4")"

echo "active_after_demote=$ACTIVE_AFTER_DEMOTE"
echo "waiting_after_demote=$WAITING_AFTER_DEMOTE"
echo "state_a1_after_demote=$STATE_A1_AFTER_DEMOTE"
echo "state_a4_after_demote=$STATE_A4_AFTER_DEMOTE"

test "$ACTIVE_AFTER_DEMOTE" = "2"
test "$WAITING_AFTER_DEMOTE" = "1"
test "$STATE_A1_AFTER_DEMOTE" = "5"
test "$STATE_A4_AFTER_DEMOTE" = "2"
echo "[ok] demotion opened one active slot and did not auto-promote waiting replacement"

echo
echo "=== [j] owner refills vacant active slot from healthy waiting validator ==="
cast send \
  --rpc-url "$RPC" \
  --private-key "$DEPLOYER_PK" \
  "$REGISTRY" \
  'markActiveBatch(address[])' \
  "[$REPLACEMENT_ADDR]" \
  > "$OUT/owner-refill.log" 2>&1

grep -E 'status|transactionHash|from|to' "$OUT/owner-refill.log" || true

ACTIVE_AFTER_REFILL="$(count_active)"
WAITING_AFTER_REFILL="$(count_waiting)"
CANDIDATE_AFTER_REFILL="$(count_candidates)"

STATE_A1_FINAL="$(state_num "$A1")"
STATE_A2_FINAL="$(state_num "$A2")"
STATE_A3_FINAL="$(state_num "$A3")"
STATE_A4_FINAL="$(state_num "$A4")"
STATE_A5_FINAL="$(state_num "$A5")"

echo "candidate_after_refill=$CANDIDATE_AFTER_REFILL"
echo "waiting_after_refill=$WAITING_AFTER_REFILL"
echo "active_after_refill=$ACTIVE_AFTER_REFILL"
echo "state_a1_final=$STATE_A1_FINAL"
echo "state_a2_final=$STATE_A2_FINAL"
echo "state_a3_final=$STATE_A3_FINAL"
echo "state_a4_final=$STATE_A4_FINAL"
echo "state_a5_final=$STATE_A5_FINAL"

test "$CANDIDATE_AFTER_REFILL" = "5"
test "$WAITING_AFTER_REFILL" = "0"
test "$ACTIVE_AFTER_REFILL" = "3"
test "$STATE_A1_FINAL" = "5"
test "$STATE_A2_FINAL" = "3"
test "$STATE_A3_FINAL" = "3"
test "$STATE_A4_FINAL" = "3"
test "$STATE_A5_FINAL" = "1"
echo "[ok] active slot refilled through controlled owner admission"

echo
echo "=== [k] cap/churn/state safety after refill ==="
set +e
cast send \
  --rpc-url "$RPC" \
  --private-key "$DEPLOYER_PK" \
  "$REGISTRY" \
  'markActiveBatch(address[])' \
  "[$A5]" \
  > "$OUT/refill-invalid-or-cap.log" 2>&1
REFILL_OVER_RC=$?
set -e

if [ "$REFILL_OVER_RC" = "0" ]; then
  echo "[ERR] activating non-waiting/plain candidate after cap refill unexpectedly succeeded"
  cat "$OUT/refill-invalid-or-cap.log"
  exit 1
fi

test "$(count_active)" = "3"
test "$(count_waiting)" = "0"
test "$(state_num "$A5")" = "1"
echo "[ok] no extra activation after cap/refill"

echo
echo "=== [l] write isolated policy unit test ==="
cat > "$OUT/offline-refill-policy-unit-test.py" <<'PY'
import json

THRESHOLD = 48 * 60 * 60
NOW = 1_777_392_000

validators = [
    {"label":"active_offline_over","state":"Active","online":False,"lastSeen":NOW - THRESHOLD - 1},
    {"label":"active_online","state":"Active","online":True,"lastSeen":NOW},
    {"label":"waiting_online","state":"Waiting","online":True,"lastSeen":NOW},
    {"label":"waiting_offline","state":"Waiting","online":False,"lastSeen":NOW - THRESHOLD - 1},
    {"label":"candidate_online","state":"Candidate","online":True,"lastSeen":NOW},
]

demote = []
replace = []
for v in validators:
    offline_for = 0 if v["online"] else NOW - v["lastSeen"]
    if v["state"] == "Active" and not v["online"] and offline_for >= THRESHOLD:
        demote.append(v["label"])
    if v["state"] == "Waiting" and v["online"]:
        replace.append(v["label"])

assert demote == ["active_offline_over"], demote
assert replace == ["waiting_online"], replace
print(json.dumps({"ok": True, "eligibleDemotions": demote, "eligibleReplacements": replace}, indent=2))
PY

python3 "$OUT/offline-refill-policy-unit-test.py"

echo
echo "=== [m] print final candidate tuples ==="
for addr in "$A1" "$A2" "$A3" "$A4" "$A5"; do
  echo "--- $addr ---"
  state_of "$addr"
  echo
done

echo
echo "=== [n] write proof artifact ==="
ART=".runtime/mainnet0/validator-offline-demotion-refill-policy.local.current.json"
mkdir -p "$(dirname "$ART")"

cat > "$OUT/summary.json" <<JSON
{
  "ok": true,
  "kind": "validator_offline_demotion_refill_policy_proof",
  "rpc": "$RPC",
  "chainId": "$EXPECTED_CHAIN_ID",
  "registry": "$REGISTRY",
  "owner": "$DEPLOYER",
  "offlineThresholdSeconds": "$OFFLINE_THRESHOLD_SECONDS",
  "offlineThresholdHours": "48",
  "currentDemotionPrimitive": "owner-gated jail(address) quarantine",
  "currentRefillPrimitive": "owner-gated markActiveBatch(address[])",
  "automaticContractDemotion": false,
  "automaticReplacementPromotion": false,
  "schedulerPolicy": "active-only offline >=48h demotion, then separate healthy waiting replacement admission",
  "demotedAddress": "$DEMOTE_ADDR",
  "replacementAddress": "$REPLACEMENT_ADDR",
  "nonOwnerDemotionRejected": true,
  "nonOwnerRefillRejected": true,
  "demotionOpenedActiveSlot": true,
  "waitingNotAutoPromotedAfterDemotion": true,
  "ownerRefillRestoredActiveCount": true,
  "noExtraActivationAfterRefill": true,
  "candidateCountFinal": "$CANDIDATE_AFTER_REFILL",
  "waitingCountFinal": "$WAITING_AFTER_REFILL",
  "activeCountFinal": "$ACTIVE_AFTER_REFILL",
  "stateDemotedFinal": "$STATE_A1_FINAL",
  "stateActiveOnlineAFinal": "$STATE_A2_FINAL",
  "stateActiveOnlineBFinal": "$STATE_A3_FINAL",
  "stateReplacementFinal": "$STATE_A4_FINAL",
  "statePlainCandidateFinal": "$STATE_A5_FINAL"
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
echo "[ok] validator offline demotion refill policy proof green"
