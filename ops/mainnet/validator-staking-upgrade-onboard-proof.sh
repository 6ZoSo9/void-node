#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

RPC="${RPC:-http://127.0.0.1:8545}"
CONF="${CONF:-$HOME/dev/void-node/ops/mainnet/void-mainnet.deployed.json}"
SECRETS="${SECRETS:-/mnt/key2/mainnet-keygen/20260418-023715/private/wallet-secrets.json}"
DEPLOYER_JSON="${DEPLOYER_JSON:-/mnt/key2/meta/void-mainnet-deployer-wallet.json}"
UPGRADE_ARTIFACT="${UPGRADE_ARTIFACT:-$HOME/dev/void-node/ops/mainnet/validator-truth-upgrade-track.deployed.json}"

CANDIDATE_NAME="${CANDIDATE_NAME:-vault02}"
GAS_WEI="${GAS_WEI:-10000000000000000}"   # 0.01 native
TARGET_EPOCH="${TARGET_EPOCH:-3}"
EXPECTED_VALIDATOR_COUNT="${EXPECTED_VALIDATOR_COUNT:-3}"
START_SLOT="${START_SLOT:-0}"
END_SLOT_EXCLUSIVE="${END_SLOT_EXCLUSIVE:-8}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="${OUT_DIR:-$HOME/dev/void-node/.runtime/validator_epoch_manifests/upgrade-track-${CANDIDATE_NAME}-${STAMP}}"
EXPORT_DIR="$OUT_DIR/export"
IMPORT_DIR="$OUT_DIR/import"

mkdir -p "$EXPORT_DIR" "$IMPORT_DIR"

readarray -t INFO < <(
python3 - <<'PY' "$CONF" "$SECRETS" "$DEPLOYER_JSON" "$UPGRADE_ARTIFACT" "$CANDIDATE_NAME"
import json, sys

conf = json.load(open(sys.argv[1], "r", encoding="utf-8"))
secrets = json.load(open(sys.argv[2], "r", encoding="utf-8"))
deployer = json.load(open(sys.argv[3], "r", encoding="utf-8"))
upgrade = json.load(open(sys.argv[4], "r", encoding="utf-8"))
candidate_name = sys.argv[5]

rows = secrets.get("keys") if isinstance(secrets, dict) else secrets
if not isinstance(rows, list):
    raise SystemExit("[ERR] wallet-secrets shape not recognized")

by_name = {}
for row in rows:
    if not isinstance(row, dict):
        continue
    name = str(row.get("name") or row.get("id") or row.get("label") or "").strip()
    if name:
        by_name[name] = row

def addr_of(name):
    row = by_name.get(name)
    if not row:
        raise SystemExit(f"[ERR] missing wallet {name}")
    addr = str(row.get("address") or "").strip()
    if not addr:
        raise SystemExit(f"[ERR] wallet {name} missing address")
    return addr if addr.startswith("0x") else "0x" + addr

def pk_of(name):
    row = by_name.get(name)
    if not row:
        raise SystemExit(f"[ERR] missing wallet {name}")
    pk = str(row.get("private_key") or row.get("privateKey") or row.get("pk") or "").strip()
    if not pk:
        raise SystemExit(f"[ERR] wallet {name} missing private key")
    return pk if pk.startswith("0x") else "0x" + pk

if not isinstance(deployer, list) or len(deployer) != 1 or not isinstance(deployer[0], dict):
    raise SystemExit("[ERR] expected one-item deployer wallet list")
dep = deployer[0]
dep_addr = str(dep.get("address") or "").strip()
dep_pk = str(dep.get("private_key") or "").strip()
if not dep_addr or not dep_pk:
    raise SystemExit("[ERR] deployer wallet json missing address/private_key")
if not dep_addr.startswith("0x"):
    dep_addr = "0x" + dep_addr
if not dep_pk.startswith("0x"):
    dep_pk = "0x" + dep_pk

print(conf["contracts"]["VoidToken"])
print(conf["contracts"]["VoidTreasury"])
print(conf["contracts"]["OpsTreasury"])
print(conf["handoff"]["validator0"]["stakeVOID"])

print(addr_of("hot_wallet"))
print(pk_of("hot_wallet"))

print(addr_of("treasury_admin"))
print(pk_of("treasury_admin"))

print(addr_of("ops_admin"))
print(pk_of("ops_admin"))

print(dep_addr)
print(dep_pk)

print(addr_of(candidate_name))
print(pk_of(candidate_name))

print(upgrade["contracts"]["staking"])
print(upgrade["contracts"]["snapshot"])
print(upgrade["contracts"]["commitmentRegistry"])
print(upgrade["contracts"]["manifestView"])
print(upgrade["contracts"]["scheduleView"])
print(upgrade["rpcUrl"])
PY
)

VOID_TOKEN="${INFO[0]}"
VOID_TREASURY="${INFO[1]}"
OPS_TREASURY="${INFO[2]}"
STAKE_WEI="${STAKE_WEI:-${INFO[3]}}"

HOT_ADDR="${INFO[4]}"
HOT_PK="${INFO[5]}"

TREASURY_ADMIN_ADDR="${INFO[6]}"
TREASURY_ADMIN_PK="${INFO[7]}"

OPS_ADMIN_ADDR="${INFO[8]}"
OPS_ADMIN_PK="${INFO[9]}"

DEPLOYER_ADDR="${INFO[10]}"
DEPLOYER_PK="${INFO[11]}"

CANDIDATE_ADDR="${INFO[12]}"
CANDIDATE_PK="${INFO[13]}"

STAKING="${INFO[14]}"
SNAPSHOT="${INFO[15]}"
COMMITMENT_REGISTRY="${INFO[16]}"
MANIFEST_VIEW="${INFO[17]}"
SCHEDULE_VIEW="${INFO[18]}"
UPGRADE_RPC="${INFO[19]}"

EXPECTED_PREVIOUS_COUNT="$((EXPECTED_VALIDATOR_COUNT - 1))"
EXPECTED_TOTAL_POWER="$(python3 - <<'PY' "$STAKE_WEI" "$EXPECTED_VALIDATOR_COUNT"
import sys
print(int(sys.argv[1]) * int(sys.argv[2]))
PY
)"
CONSENSUS_KEY="${CONSENSUS_KEY:-$(cast keccak "${CANDIDATE_NAME}:${TARGET_EPOCH}:${STAMP}")}"

echo "=== [1] preflight ==="
echo "candidate_name=$CANDIDATE_NAME"
echo "candidate_addr=$CANDIDATE_ADDR"
echo "consensus_key=$CONSENSUS_KEY"
echo "stake_wei=$STAKE_WEI"
echo "target_epoch=$TARGET_EPOCH"
echo "expected_validator_count=$EXPECTED_VALIDATOR_COUNT"
echo "expected_previous_count=$EXPECTED_PREVIOUS_COUNT"
echo "expected_total_power=$EXPECTED_TOTAL_POWER"
echo "window=[$START_SLOT,$END_SLOT_EXCLUSIVE)"
echo "staking=$STAKING"

echo
echo "--- current active validators"
ACTIVE_RAW="$(cast call --rpc-url "$UPGRADE_RPC" "$STAKING" 'getActiveValidators()(address[])')"
echo "$ACTIVE_RAW"

python3 - <<'PY' "$ACTIVE_RAW" "$CANDIDATE_ADDR" "$EXPECTED_PREVIOUS_COUNT"
import re, sys
active_raw, candidate, expected_previous_count = sys.argv[1:4]
addrs = [a.lower() for a in re.findall(r'0x[a-fA-F0-9]{40}', active_raw)]
print(f"active_count={len(addrs)}")
print(f"candidate_already_active={candidate.lower() in addrs}")
if candidate.lower() in addrs:
    raise SystemExit("[ERR] candidate already active; refusing duplicate onboarding proof run")
if len(addrs) != int(expected_previous_count):
    raise SystemExit(f"[ERR] expected active validator count {expected_previous_count} before onboarding, got {len(addrs)}")
PY

echo
echo "--- balances before funding"
echo "hot_wallet native:"
cast balance --rpc-url "$RPC" "$HOT_ADDR"
echo "candidate native:"
cast balance --rpc-url "$RPC" "$CANDIDATE_ADDR"
echo "candidate VOID:"
cast call --rpc-url "$RPC" "$VOID_TOKEN" 'balanceOf(address)(uint256)' "$CANDIDATE_ADDR"
echo "deployer native:"
cast balance --rpc-url "$RPC" "$DEPLOYER_ADDR"

echo
echo "=== [2] fund gas to candidate + admins + deployer ==="
cast send --rpc-url "$RPC" --private-key "$HOT_PK" --value "$GAS_WEI" "$TREASURY_ADMIN_ADDR"
cast send --rpc-url "$RPC" --private-key "$HOT_PK" --value "$GAS_WEI" "$OPS_ADMIN_ADDR"
cast send --rpc-url "$RPC" --private-key "$HOT_PK" --value "$GAS_WEI" "$DEPLOYER_ADDR"
cast send --rpc-url "$RPC" --private-key "$HOT_PK" --value "$GAS_WEI" "$CANDIDATE_ADDR"
sleep 2

echo
echo "=== [3] fund candidate with stake via treasury path ==="
SALT1="$(cast keccak "onboard-fund-to-ops-${CANDIDATE_NAME}-${STAMP}")"
SALT2="$(cast keccak "onboard-fund-candidate-${CANDIDATE_NAME}-${STAMP}")"
echo "salt1=$SALT1"
echo "salt2=$SALT2"

cast send --rpc-url "$RPC" --private-key "$TREASURY_ADMIN_PK" \
  "$VOID_TREASURY" 'sendToOps(uint256,bytes32)' "$STAKE_WEI" "$SALT1"

sleep 2

cast send --rpc-url "$RPC" --private-key "$OPS_ADMIN_PK" \
  "$OPS_TREASURY" 'spend(address,uint256,bytes32)' "$CANDIDATE_ADDR" "$STAKE_WEI" "$SALT2"

sleep 2

echo
echo "--- candidate balances after funding"
echo "candidate native:"
cast balance --rpc-url "$RPC" "$CANDIDATE_ADDR"
echo "candidate VOID:"
cast call --rpc-url "$RPC" "$VOID_TOKEN" 'balanceOf(address)(uint256)' "$CANDIDATE_ADDR"

echo
echo "=== [4] candidate approve + registerAndStake + activate ==="
cast send --rpc-url "$RPC" --private-key "$CANDIDATE_PK" \
  "$VOID_TOKEN" 'approve(address,uint256)' "$STAKING" "$STAKE_WEI"

sleep 2

cast send --rpc-url "$RPC" --private-key "$CANDIDATE_PK" \
  "$STAKING" 'registerAndStake(address,bytes32,uint256)' "$CANDIDATE_ADDR" "$CONSENSUS_KEY" "$STAKE_WEI"

sleep 2

cast send --rpc-url "$RPC" --private-key "$CANDIDATE_PK" \
  "$STAKING" 'activate()'

sleep 2

echo
echo "--- active validators after onboarding"
ACTIVE_AFTER="$(cast call --rpc-url "$UPGRADE_RPC" "$STAKING" 'getActiveValidators()(address[])')"
echo "$ACTIVE_AFTER"

python3 - <<'PY' "$ACTIVE_AFTER" "$CANDIDATE_ADDR" "$EXPECTED_VALIDATOR_COUNT"
import re, sys
active_raw, candidate, expected_count = sys.argv[1:4]
addrs = [a.lower() for a in re.findall(r'0x[a-fA-F0-9]{40}', active_raw)]
print(f"active_count={len(addrs)}")
print(f"candidate_active={candidate.lower() in addrs}")
if candidate.lower() not in addrs:
    raise SystemExit("[ERR] candidate not present in active validator set after activate()")
if len(addrs) != int(expected_count):
    raise SystemExit(f"[ERR] expected active validator count {expected_count} after onboarding, got {len(addrs)}")
PY

echo
echo "=== [5] capture epoch + publish window on upgrade-track ==="
cast send --rpc-url "$RPC" --private-key "$DEPLOYER_PK" \
  "$SNAPSHOT" 'captureEpoch(uint256)' "$TARGET_EPOCH"

sleep 2

cast send --rpc-url "$RPC" --private-key "$DEPLOYER_PK" \
  "$COMMITMENT_REGISTRY" 'publishEpochWindow(uint256,uint256,uint256)' "$TARGET_EPOCH" "$START_SLOT" "$END_SLOT_EXCLUSIVE"

sleep 2

echo
echo "=== [6] export + verify/import target epoch manifest ==="
RAW_JSON="$EXPORT_DIR/epoch-$(printf '%06d' "$TARGET_EPOCH").manifest.json"

RPC_URL="$UPGRADE_RPC" \
MANIFEST_VIEW_ADDR="$MANIFEST_VIEW" \
SCHEDULE_VIEW_ADDR="$SCHEDULE_VIEW" \
EPOCH="$TARGET_EPOCH" \
START_SLOT="$START_SLOT" \
END_SLOT_EXCLUSIVE="$END_SLOT_EXCLUSIVE" \
OUT_JSON="$RAW_JSON" \
python3 "$HOME/dev/void-node/ops/mainnet/export_validator_epoch_manifest_json.py"

VERIFY_RPC_URL="$UPGRADE_RPC" \
IMPORT_DIR="$IMPORT_DIR" \
python3 "$HOME/dev/void-node/ops/mainnet/verify_import_validator_epoch_manifest_json.py" "$RAW_JSON"

VERIFIED_JSON="$IMPORT_DIR/epoch-$(printf '%06d' "$TARGET_EPOCH").manifest.verified.json"

echo
echo "=== [7] assert target epoch upgraded truth ==="
python3 - <<'PY' "$VERIFIED_JSON" "$CANDIDATE_ADDR" "$EXPECTED_VALIDATOR_COUNT" "$EXPECTED_TOTAL_POWER"
import json, sys

path, candidate, expected_count, expected_total_power = sys.argv[1:5]
j = json.load(open(path, "r", encoding="utf-8"))
window = j.get("scheduleWindow") or []
rewards = sorted({str(x.get("reward","")).lower() for x in window if isinstance(x, dict) and x.get("reward")})

summary = {
    "epoch": j.get("epoch"),
    "requestedStartSlot": j.get("requestedStartSlot"),
    "requestedEndSlotExclusive": j.get("requestedEndSlotExclusive"),
    "validatorCount": j.get("validatorCount"),
    "totalPower": j.get("totalPower"),
    "published": j.get("published"),
    "publishedMatch": j.get("publishedMatch"),
    "uniqueRewardsInWindow": rewards,
    "candidateInWindow": candidate.lower() in rewards,
}
print(json.dumps(summary, indent=2))

assert j.get("validatorCount") == int(expected_count), j
assert str(j.get("totalPower")) == str(expected_total_power), j
assert j.get("published") is True, j
assert j.get("publishedMatch") is True, j
assert candidate.lower() in rewards, j
PY

unset HOT_PK TREASURY_ADMIN_PK OPS_ADMIN_PK DEPLOYER_PK CANDIDATE_PK

echo
echo "=== [8] done ==="
echo "out_dir=$OUT_DIR"
echo "verified_json=$VERIFIED_JSON"
