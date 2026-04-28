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
OUT="${OUT:-/tmp/void-validator-candidate-activation-proof.$STAMP}"

mkdir -p "$OUT"
chmod 700 "$OUT"
umask 077

DEPLOYER_PK="${DEPLOYER_PK:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}"
DEPLOYER="$(cast wallet address "$DEPLOYER_PK")"

MIN_STAKE_WEI="${MIN_STAKE_WEI:-1000000000000000000000}"
MAX_ACTIVE="${MAX_ACTIVE:-2}"
CHURN="${CHURN:-1}"

PK1="$OUT/candidate1.pk"
PK2="$OUT/candidate2.pk"
PK3="$OUT/candidate3.pk"

cleanup() {
  set +e
  rm -f "$PK1" "$PK2" "$PK3" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "=== validator candidate activation proof ==="
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
if ! cast chain-id --rpc-url "$RPC" >/tmp/void-activation-chainid.txt 2>/tmp/void-activation-chainid.err; then
  echo "[ERR] local RPC is not responding"
  cat /tmp/void-activation-chainid.err || true
  exit 1
fi

CHAIN_ID="$(cat /tmp/void-activation-chainid.txt)"
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
echo "=== [c] fund deployer and temp candidates on disposable local RPC ==="
BAL_HEX="$(python3 - <<'PY'
print(hex(10000 * 10**18))
PY
)"

python3 - "$PK1" "$PK2" "$PK3" <<'PY'
import secrets, sys
for p in sys.argv[1:]:
    open(p, "w").write("0x" + secrets.token_hex(32))
PY
chmod 600 "$PK1" "$PK2" "$PK3"

A1="$(cast wallet address "$(cat "$PK1")")"
A2="$(cast wallet address "$(cat "$PK2")")"
A3="$(cast wallet address "$(cat "$PK3")")"

echo "candidate1=$A1"
echo "candidate2=$A2"
echo "candidate3=$A3"
echo "[ok] temp candidate keys generated; private keys not printed"

for addr in "$DEPLOYER" "$A1" "$A2" "$A3"; do
  cast rpc --rpc-url "$RPC" anvil_setBalance "$addr" "$BAL_HEX" >/dev/null
done

echo
echo "=== [d] deploy fresh candidate registry with small cap/churn ==="
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

echo
echo "=== [e] verify constructor policy ==="
cast_uint() {
  cast call --rpc-url "$RPC" "$REGISTRY" "$1" | awk '{print $1}'
}

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

count() {
  cast call --rpc-url "$RPC" "$REGISTRY" "$1"
}

state_of() {
  cast call --rpc-url "$RPC" "$REGISTRY" 'getCandidate(address)((address,address,bytes32,bytes32,uint256,uint256,uint256,uint8))' "$1"
}

echo
echo "=== [f] register three public candidates; active must stay zero ==="
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

CANDIDATES_AFTER_REG="$(count 'candidateCount()(uint256)')"
WAITING_AFTER_REG="$(count 'waitingCount()(uint256)')"
ACTIVE_AFTER_REG="$(count 'activeCount()(uint256)')"

echo "candidate_after_registration=$CANDIDATES_AFTER_REG"
echo "waiting_after_registration=$WAITING_AFTER_REG"
echo "active_after_registration=$ACTIVE_AFTER_REG"

test "$CANDIDATES_AFTER_REG" = "3"
test "$WAITING_AFTER_REG" = "0"
test "$ACTIVE_AFTER_REG" = "0"
echo "[ok] public registration does not activate"

echo
echo "=== [g] non-owner cannot move candidate to waiting ==="
set +e
cast send \
  --rpc-url "$RPC" \
  --private-key "$(cat "$PK2")" \
  "$REGISTRY" \
  'moveToWaiting(address)' \
  "$A1" \
  > "$OUT/non-owner-moveToWaiting.log" 2>&1
NON_OWNER_WAITING_RC=$?
set -e

if [ "$NON_OWNER_WAITING_RC" = "0" ]; then
  echo "[ERR] non-owner moveToWaiting unexpectedly succeeded"
  cat "$OUT/non-owner-moveToWaiting.log"
  exit 1
fi
echo "[ok] non-owner moveToWaiting rejected"

echo
echo "=== [h] owner moves candidates to waiting; active still zero ==="
for addr in "$A1" "$A2" "$A3"; do
  cast send \
    --rpc-url "$RPC" \
    --private-key "$DEPLOYER_PK" \
    "$REGISTRY" \
    'moveToWaiting(address)' \
    "$addr" \
    > "$OUT/move-waiting-$addr.log" 2>&1
done

WAITING_AFTER_MOVE="$(count 'waitingCount()(uint256)')"
ACTIVE_AFTER_MOVE="$(count 'activeCount()(uint256)')"

echo "waiting_after_move=$WAITING_AFTER_MOVE"
echo "active_after_move=$ACTIVE_AFTER_MOVE"

test "$WAITING_AFTER_MOVE" = "3"
test "$ACTIVE_AFTER_MOVE" = "0"
echo "[ok] waiting admission does not activate"

echo
echo "=== [i] non-owner cannot mark active ==="
set +e
cast send \
  --rpc-url "$RPC" \
  --private-key "$(cat "$PK2")" \
  "$REGISTRY" \
  'markActiveBatch(address[])' \
  "[$A1]" \
  > "$OUT/non-owner-markActiveBatch.log" 2>&1
NON_OWNER_ACTIVE_RC=$?
set -e

if [ "$NON_OWNER_ACTIVE_RC" = "0" ]; then
  echo "[ERR] non-owner markActiveBatch unexpectedly succeeded"
  cat "$OUT/non-owner-markActiveBatch.log"
  exit 1
fi
echo "[ok] non-owner markActiveBatch rejected"

echo
echo "=== [j] churn limit rejects batch larger than 1 ==="
set +e
cast send \
  --rpc-url "$RPC" \
  --private-key "$DEPLOYER_PK" \
  "$REGISTRY" \
  'markActiveBatch(address[])' \
  "[$A1,$A2]" \
  > "$OUT/churn-violation.log" 2>&1
CHURN_RC=$?
set -e

if [ "$CHURN_RC" = "0" ]; then
  echo "[ERR] churn violation unexpectedly succeeded"
  cat "$OUT/churn-violation.log"
  exit 1
fi

WAITING_AFTER_CHURN_REJECT="$(count 'waitingCount()(uint256)')"
ACTIVE_AFTER_CHURN_REJECT="$(count 'activeCount()(uint256)')"

test "$WAITING_AFTER_CHURN_REJECT" = "3"
test "$ACTIVE_AFTER_CHURN_REJECT" = "0"
echo "[ok] churn violation rejected without mutation"

echo
echo "=== [k] owner activates one candidate per churn window ==="
cast send \
  --rpc-url "$RPC" \
  --private-key "$DEPLOYER_PK" \
  "$REGISTRY" \
  'markActiveBatch(address[])' \
  "[$A1]" \
  > "$OUT/activate-1.log" 2>&1

WAITING_AFTER_ACT1="$(count 'waitingCount()(uint256)')"
ACTIVE_AFTER_ACT1="$(count 'activeCount()(uint256)')"

echo "waiting_after_activate1=$WAITING_AFTER_ACT1"
echo "active_after_activate1=$ACTIVE_AFTER_ACT1"

test "$WAITING_AFTER_ACT1" = "2"
test "$ACTIVE_AFTER_ACT1" = "1"

cast send \
  --rpc-url "$RPC" \
  --private-key "$DEPLOYER_PK" \
  "$REGISTRY" \
  'markActiveBatch(address[])' \
  "[$A2]" \
  > "$OUT/activate-2.log" 2>&1

WAITING_AFTER_ACT2="$(count 'waitingCount()(uint256)')"
ACTIVE_AFTER_ACT2="$(count 'activeCount()(uint256)')"

echo "waiting_after_activate2=$WAITING_AFTER_ACT2"
echo "active_after_activate2=$ACTIVE_AFTER_ACT2"

test "$WAITING_AFTER_ACT2" = "1"
test "$ACTIVE_AFTER_ACT2" = "2"
echo "[ok] two active validators admitted under cap"

echo
echo "=== [l] active cap rejects third activation ==="
set +e
cast send \
  --rpc-url "$RPC" \
  --private-key "$DEPLOYER_PK" \
  "$REGISTRY" \
  'markActiveBatch(address[])' \
  "[$A3]" \
  > "$OUT/cap-violation.log" 2>&1
CAP_RC=$?
set -e

if [ "$CAP_RC" = "0" ]; then
  echo "[ERR] cap violation unexpectedly succeeded"
  cat "$OUT/cap-violation.log"
  exit 1
fi

WAITING_FINAL="$(count 'waitingCount()(uint256)')"
ACTIVE_FINAL="$(count 'activeCount()(uint256)')"
CANDIDATE_FINAL="$(count 'candidateCount()(uint256)')"

echo "candidate_final=$CANDIDATE_FINAL"
echo "waiting_final=$WAITING_FINAL"
echo "active_final=$ACTIVE_FINAL"

test "$CANDIDATE_FINAL" = "3"
test "$WAITING_FINAL" = "1"
test "$ACTIVE_FINAL" = "2"
echo "[ok] active cap violation rejected without mutation"

echo
echo "=== [m] prove candidate states ==="
echo "--- candidate1 tuple ---"
state_of "$A1"
echo
echo "--- candidate2 tuple ---"
state_of "$A2"
echo
echo "--- candidate3 tuple ---"
state_of "$A3"
echo

echo
echo "=== [n] run isolated Solidity activation test harness ==="
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

cat > "$ISO/test/VoidValidatorCandidateRegistryActivationHarness.t.sol" <<'SOL'
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

    function moveToWaiting(VoidValidatorCandidateRegistry reg, address who) external {
        reg.moveToWaiting(who);
    }

    function markActiveBatch(VoidValidatorCandidateRegistry reg, address[] calldata owners) external {
        reg.markActiveBatch(owners);
    }

    receive() external payable {}
}

contract VoidValidatorCandidateRegistryActivationHarness {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    VoidValidatorCandidateRegistry reg;
    Actor alice;
    Actor bob;
    Actor carol;

    uint256 constant MIN_STAKE = 1000 ether;

    function setUp() public {
        reg = new VoidValidatorCandidateRegistry({
            _minValidatorStake: MIN_STAKE,
            _maxActiveValidators: 2,
            _activationChurnLimit: 1
        });

        alice = new Actor();
        bob = new Actor();
        carol = new Actor();

        vm.deal(address(alice), 10_000 ether);
        vm.deal(address(bob), 10_000 ether);
        vm.deal(address(carol), 10_000 ether);
    }

    function test_public_registration_waiting_and_active_policy() public {
        alice.register{value: MIN_STAKE}(
            reg,
            address(alice),
            keccak256("alice-consensus"),
            keccak256("alice-metadata")
        );

        require(reg.candidateCount() == 1, "candidate count");
        require(reg.waitingCount() == 0, "waiting after public register");
        require(reg.activeCount() == 0, "active after public register");

        reg.moveToWaiting(address(alice));
        require(reg.waitingCount() == 1, "waiting after owner move");
        require(reg.activeCount() == 0, "active after waiting move");

        address[] memory one = new address[](1);
        one[0] = address(alice);
        reg.markActiveBatch(one);

        require(reg.waitingCount() == 0, "waiting after activation");
        require(reg.activeCount() == 1, "active after activation");

        VoidValidatorCandidateRegistry.Candidate memory c = reg.getCandidate(address(alice));
        require(uint256(c.state) == uint256(VoidValidatorCandidateRegistry.ValidatorState.Active), "alice active state");
    }

    function test_owner_churn_and_active_cap_are_enforced() public {
        alice.register{value: MIN_STAKE}(reg, address(alice), keccak256("a-c"), keccak256("a-m"));
        bob.register{value: MIN_STAKE}(reg, address(bob), keccak256("b-c"), keccak256("b-m"));
        carol.register{value: MIN_STAKE}(reg, address(carol), keccak256("c-c"), keccak256("c-m"));

        reg.moveToWaiting(address(alice));
        reg.moveToWaiting(address(bob));
        reg.moveToWaiting(address(carol));

        require(reg.candidateCount() == 3, "candidate count");
        require(reg.waitingCount() == 3, "waiting before activation");
        require(reg.activeCount() == 0, "active before activation");

        address[] memory two = new address[](2);
        two[0] = address(alice);
        two[1] = address(bob);

        try reg.markActiveBatch(two) {
            revert("churn violation unexpectedly succeeded");
        } catch {}

        require(reg.waitingCount() == 3, "waiting unchanged after churn reject");
        require(reg.activeCount() == 0, "active unchanged after churn reject");

        address[] memory one = new address[](1);
        one[0] = address(alice);
        reg.markActiveBatch(one);

        one[0] = address(bob);
        reg.markActiveBatch(one);

        require(reg.waitingCount() == 1, "waiting after two activations");
        require(reg.activeCount() == 2, "active cap filled");

        one[0] = address(carol);
        try reg.markActiveBatch(one) {
            revert("active cap violation unexpectedly succeeded");
        } catch {}

        require(reg.waitingCount() == 1, "waiting unchanged after cap reject");
        require(reg.activeCount() == 2, "active unchanged after cap reject");
    }

    function test_non_owner_cannot_wait_or_activate() public {
        alice.register{value: MIN_STAKE}(
            reg,
            address(alice),
            keccak256("alice-consensus"),
            keccak256("alice-metadata")
        );

        try bob.moveToWaiting(reg, address(alice)) {
            revert("non-owner moveToWaiting unexpectedly succeeded");
        } catch {}

        reg.moveToWaiting(address(alice));

        address[] memory one = new address[](1);
        one[0] = address(alice);

        try bob.markActiveBatch(reg, one) {
            revert("non-owner markActiveBatch unexpectedly succeeded");
        } catch {}

        require(reg.waitingCount() == 1, "waiting unchanged after non-owner active reject");
        require(reg.activeCount() == 0, "active unchanged after non-owner active reject");
    }
}
SOL

(
  cd "$ISO"
  forge test -vvv
)

echo
echo "=== [o] write proof artifact ==="
ART=".runtime/mainnet0/validator-candidate-activation.local.current.json"
mkdir -p "$(dirname "$ART")"

cat > "$OUT/summary.json" <<JSON
{
  "ok": true,
  "kind": "validator_candidate_activation_proof",
  "rpc": "$RPC",
  "chainId": "$EXPECTED_CHAIN_ID",
  "registry": "$REGISTRY",
  "owner": "$DEPLOYER",
  "minValidatorStakeWei": "$MIN_STAKE_WEI",
  "maxActiveValidators": "$MAX_ACTIVE",
  "activationChurnLimit": "$CHURN",
  "candidateCountAfterRegistration": "$CANDIDATES_AFTER_REG",
  "waitingCountAfterRegistration": "$WAITING_AFTER_REG",
  "activeCountAfterRegistration": "$ACTIVE_AFTER_REG",
  "waitingCountAfterMoveToWaiting": "$WAITING_AFTER_MOVE",
  "activeCountAfterMoveToWaiting": "$ACTIVE_AFTER_MOVE",
  "nonOwnerMoveToWaitingRejected": true,
  "nonOwnerMarkActiveRejected": true,
  "churnViolationRejected": true,
  "activeCapViolationRejected": true,
  "candidateFinal": "$CANDIDATE_FINAL",
  "waitingFinal": "$WAITING_FINAL",
  "activeFinal": "$ACTIVE_FINAL",
  "publicRegistrationDoesNotActivate": true,
  "waitingAdmissionDoesNotActivate": true,
  "ownerActiveAdmissionOnly": true,
  "churnLimitEnforced": true,
  "activeCapEnforced": true
}
JSON

cp "$OUT/summary.json" "$ART"
cat "$ART"

echo
echo "=== [p] final readiness/monitoring ==="
curl -fsS "$BASE/__void/ready.json"
echo
curl -fsS --get http://127.0.0.1:9090/api/v1/query --data-urlencode 'query=ready:last_30s'
echo

echo
echo "[ok] validator candidate activation proof green"
