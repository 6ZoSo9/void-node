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
OUT="${OUT:-/tmp/void-validator-candidate-demotion-proof.$STAMP}"

mkdir -p "$OUT"
chmod 700 "$OUT"
umask 077

DEPLOYER_PK="${DEPLOYER_PK:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}"
DEPLOYER="$(cast wallet address "$DEPLOYER_PK")"

MIN_STAKE_WEI="${MIN_STAKE_WEI:-1000000000000000000000}"
MAX_ACTIVE="${MAX_ACTIVE:-3}"
CHURN="${CHURN:-1}"

PK1="$OUT/candidate1.pk"
PK2="$OUT/candidate2.pk"
PK3="$OUT/candidate3.pk"
PK4="$OUT/candidate4.pk"

cleanup() {
  set +e
  rm -f "$PK1" "$PK2" "$PK3" "$PK4" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "=== validator candidate demotion proof ==="
echo "base=$BASE"
echo "rpc=$RPC"
echo "out=$OUT"
echo "deployer=$DEPLOYER"
echo "max_active=$MAX_ACTIVE"
echo "churn=$CHURN"

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
if ! cast chain-id --rpc-url "$RPC" >/tmp/void-demotion-chainid.txt 2>/tmp/void-demotion-chainid.err; then
  echo "[ERR] local RPC is not responding"
  cat /tmp/void-demotion-chainid.err || true
  exit 1
fi

CHAIN_ID="$(cat /tmp/void-demotion-chainid.txt)"
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
echo "=== [c] fund deployer and temp candidates ==="
BAL_HEX="$(python3 - <<'PY'
print(hex(10000 * 10**18))
PY
)"

python3 - "$PK1" "$PK2" "$PK3" "$PK4" <<'PY'
import secrets, sys
for p in sys.argv[1:]:
    open(p, "w").write("0x" + secrets.token_hex(32))
PY
chmod 600 "$PK1" "$PK2" "$PK3" "$PK4"

A1="$(cast wallet address "$(cat "$PK1")")"
A2="$(cast wallet address "$(cat "$PK2")")"
A3="$(cast wallet address "$(cat "$PK3")")"
A4="$(cast wallet address "$(cat "$PK4")")"

echo "candidate1=$A1"
echo "candidate2=$A2"
echo "candidate3=$A3"
echo "candidate4=$A4"
echo "[ok] temp candidate keys generated; private keys not printed"

for addr in "$DEPLOYER" "$A1" "$A2" "$A3" "$A4"; do
  cast rpc --rpc-url "$RPC" anvil_setBalance "$addr" "$BAL_HEX" >/dev/null
done

echo
echo "=== [d] deploy fresh candidate registry ==="
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
  # tuple field order ends with uint8 state; print full tuple for audit.
  cast call --rpc-url "$RPC" "$REGISTRY" 'getCandidate(address)((address,address,bytes32,bytes32,uint256,uint256,uint256,uint8))' "$1"
}

state_num() {
  state_of "$1" | sed -E 's/.*,[[:space:]]*([0-9]+)\)$/\1/'
}

echo
echo "=== [e] verify constructor policy ==="
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
echo "=== [f] register four public candidates ==="
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

register_one "$(cat "$PK1")" "$A1" "candidate1"
register_one "$(cat "$PK2")" "$A2" "candidate2"
register_one "$(cat "$PK3")" "$A3" "candidate3"
register_one "$(cat "$PK4")" "$A4" "candidate4"

CANDIDATES_AFTER_REG="$(count_candidates)"
WAITING_AFTER_REG="$(count_waiting)"
ACTIVE_AFTER_REG="$(count_active)"

echo "candidate_after_registration=$CANDIDATES_AFTER_REG"
echo "waiting_after_registration=$WAITING_AFTER_REG"
echo "active_after_registration=$ACTIVE_AFTER_REG"

test "$CANDIDATES_AFTER_REG" = "4"
test "$WAITING_AFTER_REG" = "0"
test "$ACTIVE_AFTER_REG" = "0"
echo "[ok] public registration does not activate"

echo
echo "=== [g] move three candidates to waiting, activate two ==="
for addr in "$A1" "$A2" "$A3"; do
  cast send \
    --rpc-url "$RPC" \
    --private-key "$DEPLOYER_PK" \
    "$REGISTRY" \
    'moveToWaiting(address)' \
    "$addr" \
    > "$OUT/move-waiting-$addr.log" 2>&1
done

WAITING_AFTER_MOVE="$(count_waiting)"
ACTIVE_AFTER_MOVE="$(count_active)"
echo "waiting_after_move=$WAITING_AFTER_MOVE"
echo "active_after_move=$ACTIVE_AFTER_MOVE"
test "$WAITING_AFTER_MOVE" = "3"
test "$ACTIVE_AFTER_MOVE" = "0"

for addr in "$A1" "$A2"; do
  cast send \
    --rpc-url "$RPC" \
    --private-key "$DEPLOYER_PK" \
    "$REGISTRY" \
    'markActiveBatch(address[])' \
    "[$addr]" \
    > "$OUT/activate-$addr.log" 2>&1
done

WAITING_AFTER_ACTIVATE="$(count_waiting)"
ACTIVE_AFTER_ACTIVATE="$(count_active)"
echo "waiting_after_activate=$WAITING_AFTER_ACTIVATE"
echo "active_after_activate=$ACTIVE_AFTER_ACTIVATE"
test "$WAITING_AFTER_ACTIVATE" = "1"
test "$ACTIVE_AFTER_ACTIVATE" = "2"
echo "[ok] baseline active/waiting state prepared"

echo
echo "=== [h] non-owner cannot jail active/waiting/candidate ==="
for target in "$A1" "$A3" "$A4"; do
  set +e
  cast send \
    --rpc-url "$RPC" \
    --private-key "$(cat "$PK2")" \
    "$REGISTRY" \
    'jail(address)' \
    "$target" \
    > "$OUT/non-owner-jail-$target.log" 2>&1
  RC=$?
  set -e

  if [ "$RC" = "0" ]; then
    echo "[ERR] non-owner jail unexpectedly succeeded for $target"
    cat "$OUT/non-owner-jail-$target.log"
    exit 1
  fi
done

test "$(count_waiting)" = "1"
test "$(count_active)" = "2"
echo "[ok] non-owner jail rejected without count mutation"

echo
echo "=== [i] owner jails active candidate; active decrements ==="
cast send \
  --rpc-url "$RPC" \
  --private-key "$DEPLOYER_PK" \
  "$REGISTRY" \
  'jail(address)' \
  "$A1" \
  > "$OUT/jail-active.log" 2>&1

WAITING_AFTER_JAIL_ACTIVE="$(count_waiting)"
ACTIVE_AFTER_JAIL_ACTIVE="$(count_active)"
STATE_A1_AFTER_JAIL="$(state_num "$A1")"

echo "waiting_after_jail_active=$WAITING_AFTER_JAIL_ACTIVE"
echo "active_after_jail_active=$ACTIVE_AFTER_JAIL_ACTIVE"
echo "state_a1_after_jail=$STATE_A1_AFTER_JAIL"

test "$WAITING_AFTER_JAIL_ACTIVE" = "1"
test "$ACTIVE_AFTER_JAIL_ACTIVE" = "1"
test "$STATE_A1_AFTER_JAIL" = "5"
echo "[ok] active -> jailed decrements activeCount"

echo
echo "=== [j] owner jails waiting candidate; waiting decrements ==="
cast send \
  --rpc-url "$RPC" \
  --private-key "$DEPLOYER_PK" \
  "$REGISTRY" \
  'jail(address)' \
  "$A3" \
  > "$OUT/jail-waiting.log" 2>&1

WAITING_AFTER_JAIL_WAITING="$(count_waiting)"
ACTIVE_AFTER_JAIL_WAITING="$(count_active)"
STATE_A3_AFTER_JAIL="$(state_num "$A3")"

echo "waiting_after_jail_waiting=$WAITING_AFTER_JAIL_WAITING"
echo "active_after_jail_waiting=$ACTIVE_AFTER_JAIL_WAITING"
echo "state_a3_after_jail=$STATE_A3_AFTER_JAIL"

test "$WAITING_AFTER_JAIL_WAITING" = "0"
test "$ACTIVE_AFTER_JAIL_WAITING" = "1"
test "$STATE_A3_AFTER_JAIL" = "5"
echo "[ok] waiting -> jailed decrements waitingCount"

echo
echo "=== [k] owner jails plain candidate; active/waiting unchanged ==="
cast send \
  --rpc-url "$RPC" \
  --private-key "$DEPLOYER_PK" \
  "$REGISTRY" \
  'jail(address)' \
  "$A4" \
  > "$OUT/jail-candidate.log" 2>&1

WAITING_AFTER_JAIL_CANDIDATE="$(count_waiting)"
ACTIVE_AFTER_JAIL_CANDIDATE="$(count_active)"
STATE_A4_AFTER_JAIL="$(state_num "$A4")"

echo "waiting_after_jail_candidate=$WAITING_AFTER_JAIL_CANDIDATE"
echo "active_after_jail_candidate=$ACTIVE_AFTER_JAIL_CANDIDATE"
echo "state_a4_after_jail=$STATE_A4_AFTER_JAIL"

test "$WAITING_AFTER_JAIL_CANDIDATE" = "0"
test "$ACTIVE_AFTER_JAIL_CANDIDATE" = "1"
test "$STATE_A4_AFTER_JAIL" = "5"
echo "[ok] candidate -> jailed does not mutate active/waiting counts"

echo
echo "=== [l] non-owner cannot markUnbonded ==="
set +e
cast send \
  --rpc-url "$RPC" \
  --private-key "$(cat "$PK3")" \
  "$REGISTRY" \
  'markUnbonded(address)' \
  "$A2" \
  > "$OUT/non-owner-markUnbonded.log" 2>&1
NON_OWNER_UNBOND_RC=$?
set -e

if [ "$NON_OWNER_UNBOND_RC" = "0" ]; then
  echo "[ERR] non-owner markUnbonded unexpectedly succeeded"
  cat "$OUT/non-owner-markUnbonded.log"
  exit 1
fi

test "$(count_waiting)" = "0"
test "$(count_active)" = "1"
echo "[ok] non-owner markUnbonded rejected without count mutation"

echo
echo "=== [m] owner marks active candidate unbonded; active decrements ==="
cast send \
  --rpc-url "$RPC" \
  --private-key "$DEPLOYER_PK" \
  "$REGISTRY" \
  'markUnbonded(address)' \
  "$A2" \
  > "$OUT/unbond-active.log" 2>&1

WAITING_AFTER_UNBOND_ACTIVE="$(count_waiting)"
ACTIVE_AFTER_UNBOND_ACTIVE="$(count_active)"
STATE_A2_AFTER_UNBOND="$(state_num "$A2")"

echo "waiting_after_unbond_active=$WAITING_AFTER_UNBOND_ACTIVE"
echo "active_after_unbond_active=$ACTIVE_AFTER_UNBOND_ACTIVE"
echo "state_a2_after_unbond=$STATE_A2_AFTER_UNBOND"

test "$WAITING_AFTER_UNBOND_ACTIVE" = "0"
test "$ACTIVE_AFTER_UNBOND_ACTIVE" = "0"
test "$STATE_A2_AFTER_UNBOND" = "6"
echo "[ok] active -> unbonded decrements activeCount"

echo
echo "=== [n] owner marks jailed candidates unbonded; counts unchanged ==="
for addr in "$A1" "$A3" "$A4"; do
  cast send \
    --rpc-url "$RPC" \
    --private-key "$DEPLOYER_PK" \
    "$REGISTRY" \
    'markUnbonded(address)' \
    "$addr" \
    > "$OUT/unbond-jailed-$addr.log" 2>&1
done

WAITING_FINAL="$(count_waiting)"
ACTIVE_FINAL="$(count_active)"
CANDIDATE_FINAL="$(count_candidates)"

STATE_A1_FINAL="$(state_num "$A1")"
STATE_A2_FINAL="$(state_num "$A2")"
STATE_A3_FINAL="$(state_num "$A3")"
STATE_A4_FINAL="$(state_num "$A4")"

echo "candidate_final=$CANDIDATE_FINAL"
echo "waiting_final=$WAITING_FINAL"
echo "active_final=$ACTIVE_FINAL"
echo "state_a1_final=$STATE_A1_FINAL"
echo "state_a2_final=$STATE_A2_FINAL"
echo "state_a3_final=$STATE_A3_FINAL"
echo "state_a4_final=$STATE_A4_FINAL"

test "$CANDIDATE_FINAL" = "4"
test "$WAITING_FINAL" = "0"
test "$ACTIVE_FINAL" = "0"
test "$STATE_A1_FINAL" = "6"
test "$STATE_A2_FINAL" = "6"
test "$STATE_A3_FINAL" = "6"
test "$STATE_A4_FINAL" = "6"
echo "[ok] jailed -> unbonded leaves counts unchanged"

echo
echo "=== [o] print final candidate tuples ==="
for addr in "$A1" "$A2" "$A3" "$A4"; do
  echo "--- $addr ---"
  state_of "$addr"
  echo
done

echo
echo "=== [p] run isolated Solidity demotion test harness ==="
ISO="$OUT/isolated-foundry"
rm -rf "$ISO"
mkdir -p "$ISO/src" "$ISO/test"

cp contracts/mainnet0/VoidValidatorCandidateRegistry.sol "$ISO/src/VoidValidatorCandidateRegistry.sol"

cat > "$ISO/foundry.toml" <<'TOML'
[profile.default]
src = "src"
test = "test"
out = "out"
cache_path = "cache"
solc_version = "0.8.20"
optimizer = true
optimizer_runs = 200
TOML

cat > "$ISO/test/VoidValidatorCandidateRegistryDemotionHarness.t.sol" <<'SOL'
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../src/VoidValidatorCandidateRegistry.sol";

interface Vm {
    function deal(address who, uint256 newBalance) external;
}

contract Actor {
    function register(
        VoidValidatorCandidateRegistry reg,
        address reward,
        bytes32 consensusKeyHash,
        bytes32 metadataHash
    ) external payable {
        reg.registerCandidate{value: msg.value}(reward, consensusKeyHash, metadataHash);
    }

    function jail(VoidValidatorCandidateRegistry reg, address who) external {
        reg.jail(who);
    }

    function markUnbonded(VoidValidatorCandidateRegistry reg, address who) external {
        reg.markUnbonded(who);
    }

    receive() external payable {}
}

contract VoidValidatorCandidateRegistryDemotionHarness {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    VoidValidatorCandidateRegistry reg;
    Actor alice;
    Actor bob;
    Actor carol;
    Actor dave;

    uint256 constant MIN_STAKE = 1000 ether;

    function setUp() public {
        reg = new VoidValidatorCandidateRegistry({
            _minValidatorStake: MIN_STAKE,
            _maxActiveValidators: 3,
            _activationChurnLimit: 1
        });

        alice = new Actor();
        bob = new Actor();
        carol = new Actor();
        dave = new Actor();

        vm.deal(address(alice), 10_000 ether);
        vm.deal(address(bob), 10_000 ether);
        vm.deal(address(carol), 10_000 ether);
        vm.deal(address(dave), 10_000 ether);

        alice.register{value: MIN_STAKE}(reg, address(alice), keccak256("a-c"), keccak256("a-m"));
        bob.register{value: MIN_STAKE}(reg, address(bob), keccak256("b-c"), keccak256("b-m"));
        carol.register{value: MIN_STAKE}(reg, address(carol), keccak256("c-c"), keccak256("c-m"));
        dave.register{value: MIN_STAKE}(reg, address(dave), keccak256("d-c"), keccak256("d-m"));

        reg.moveToWaiting(address(alice));
        reg.moveToWaiting(address(bob));
        reg.moveToWaiting(address(carol));

        address[] memory one = new address[](1);
        one[0] = address(alice);
        reg.markActiveBatch(one);

        one[0] = address(bob);
        reg.markActiveBatch(one);

        require(reg.candidateCount() == 4, "candidate setup");
        require(reg.waitingCount() == 1, "waiting setup");
        require(reg.activeCount() == 2, "active setup");
    }

    function test_owner_jail_updates_counts_by_state() public {
        reg.jail(address(alice));
        require(reg.waitingCount() == 1, "waiting unchanged after active jail");
        require(reg.activeCount() == 1, "active decremented after active jail");

        reg.jail(address(carol));
        require(reg.waitingCount() == 0, "waiting decremented after waiting jail");
        require(reg.activeCount() == 1, "active unchanged after waiting jail");

        reg.jail(address(dave));
        require(reg.waitingCount() == 0, "waiting unchanged after candidate jail");
        require(reg.activeCount() == 1, "active unchanged after candidate jail");

        VoidValidatorCandidateRegistry.Candidate memory a = reg.getCandidate(address(alice));
        VoidValidatorCandidateRegistry.Candidate memory c = reg.getCandidate(address(carol));
        VoidValidatorCandidateRegistry.Candidate memory d = reg.getCandidate(address(dave));

        require(uint256(a.state) == uint256(VoidValidatorCandidateRegistry.ValidatorState.Jailed), "alice jailed");
        require(uint256(c.state) == uint256(VoidValidatorCandidateRegistry.ValidatorState.Jailed), "carol jailed");
        require(uint256(d.state) == uint256(VoidValidatorCandidateRegistry.ValidatorState.Jailed), "dave jailed");
    }

    function test_owner_unbond_updates_counts_by_state() public {
        reg.markUnbonded(address(alice));
        require(reg.waitingCount() == 1, "waiting unchanged after active unbond");
        require(reg.activeCount() == 1, "active decremented after active unbond");

        reg.markUnbonded(address(carol));
        require(reg.waitingCount() == 0, "waiting decremented after waiting unbond");
        require(reg.activeCount() == 1, "active unchanged after waiting unbond");

        reg.markUnbonded(address(dave));
        require(reg.waitingCount() == 0, "waiting unchanged after candidate unbond");
        require(reg.activeCount() == 1, "active unchanged after candidate unbond");

        VoidValidatorCandidateRegistry.Candidate memory a = reg.getCandidate(address(alice));
        VoidValidatorCandidateRegistry.Candidate memory c = reg.getCandidate(address(carol));
        VoidValidatorCandidateRegistry.Candidate memory d = reg.getCandidate(address(dave));

        require(uint256(a.state) == uint256(VoidValidatorCandidateRegistry.ValidatorState.Unbonded), "alice unbonded");
        require(uint256(c.state) == uint256(VoidValidatorCandidateRegistry.ValidatorState.Unbonded), "carol unbonded");
        require(uint256(d.state) == uint256(VoidValidatorCandidateRegistry.ValidatorState.Unbonded), "dave unbonded");
    }

    function test_non_owner_cannot_jail_or_unbond() public {
        try dave.jail(reg, address(alice)) {
            revert("non-owner jail unexpectedly succeeded");
        } catch {}

        try dave.markUnbonded(reg, address(alice)) {
            revert("non-owner unbond unexpectedly succeeded");
        } catch {}

        require(reg.waitingCount() == 1, "waiting unchanged");
        require(reg.activeCount() == 2, "active unchanged");
    }
}
SOL

(
  cd "$ISO"
  forge test -vvv
)

echo
echo "=== [q] write proof artifact ==="
ART=".runtime/mainnet0/validator-candidate-demotion.local.current.json"
mkdir -p "$(dirname "$ART")"

cat > "$OUT/summary.json" <<JSON
{
  "ok": true,
  "kind": "validator_candidate_demotion_proof",
  "rpc": "$RPC",
  "chainId": "$EXPECTED_CHAIN_ID",
  "registry": "$REGISTRY",
  "owner": "$DEPLOYER",
  "minValidatorStakeWei": "$MIN_STAKE_WEI",
  "maxActiveValidators": "$MAX_ACTIVE",
  "activationChurnLimit": "$CHURN",
  "candidateCountAfterRegistration": "$CANDIDATES_AFTER_REG",
  "waitingCountAfterActivationSetup": "$WAITING_AFTER_ACTIVATE",
  "activeCountAfterActivationSetup": "$ACTIVE_AFTER_ACTIVATE",
  "nonOwnerJailRejected": true,
  "activeToJailedDecrementsActive": true,
  "waitingToJailedDecrementsWaiting": true,
  "candidateToJailedDoesNotChangeActiveOrWaiting": true,
  "nonOwnerUnbondRejected": true,
  "activeToUnbondedDecrementsActive": true,
  "jailedToUnbondedDoesNotChangeActiveOrWaiting": true,
  "candidateFinal": "$CANDIDATE_FINAL",
  "waitingFinal": "$WAITING_FINAL",
  "activeFinal": "$ACTIVE_FINAL",
  "stateA1Final": "$STATE_A1_FINAL",
  "stateA2Final": "$STATE_A2_FINAL",
  "stateA3Final": "$STATE_A3_FINAL",
  "stateA4Final": "$STATE_A4_FINAL"
}
JSON

cp "$OUT/summary.json" "$ART"
cat "$ART"

echo
echo "=== [r] final readiness/monitoring ==="
curl -fsS "$BASE/__void/ready.json"
echo
curl -fsS --get http://127.0.0.1:9090/api/v1/query --data-urlencode 'query=ready:last_30s'
echo

echo
echo "[ok] validator candidate demotion proof green"
