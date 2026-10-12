#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

CONF="${CONF:-$HOME/dev/void-node/ops/mainnet/void-mainnet.deployed.json}"
RPC="${RPC:-}"
CHAIN_ID_EXPECTED="${CHAIN_ID_EXPECTED:-}"
VOID_TOKEN="${VOID_TOKEN:-}"
REWARD_ADDRESS="${REWARD_ADDRESS:-}"
CONSENSUS_KEY="${CONSENSUS_KEY:-}"
STAKE_VOID="${STAKE_VOID:-}"
EXISTING_STAKING="${EXISTING_STAKING:-}"
CAPTURE_EPOCH="${CAPTURE_EPOCH:-1}"
START_SLOT="${START_SLOT:-0}"
END_SLOT_EXCLUSIVE="${END_SLOT_EXCLUSIVE:-8}"
CAPTURE_CHUNK_SIZE="${CAPTURE_CHUNK_SIZE:-1}"
PRIVATE_KEY="${PRIVATE_KEY:-}"

if [ -z "$PRIVATE_KEY" ]; then
  echo "[ERR] PRIVATE_KEY must be set to a funded operator/controller key"
  exit 1
fi

eval "$(python3 - <<'PY' "$CONF"
import json, shlex, sys
j = json.load(open(sys.argv[1], "r", encoding="utf-8"))
contracts = j["contracts"]
handoff = j["handoff"]
print(f'CONF_RPC={shlex.quote(j["source_of_truth_rpc"])}')
print(f'CONF_CHAIN_ID={int(j["chainId"])}')
print(f'CONF_VOID_TOKEN={shlex.quote(contracts["VoidToken"])}')
print(f'CONF_REWARD={shlex.quote(handoff["validator0"]["reward"])}')
print(f'CONF_CONSENSUS={shlex.quote(handoff["validator0"]["consensusKey"])}')
print(f'CONF_STAKE={shlex.quote(str(handoff["validator0"]["stakeVOID"]))}')
PY
)"

RPC="${RPC:-$CONF_RPC}"
CHAIN_ID_EXPECTED="${CHAIN_ID_EXPECTED:-$CONF_CHAIN_ID}"
VOID_TOKEN="${VOID_TOKEN:-$CONF_VOID_TOKEN}"
REWARD_ADDRESS="${REWARD_ADDRESS:-$CONF_REWARD}"
CONSENSUS_KEY="${CONSENSUS_KEY:-$CONF_CONSENSUS}"
STAKE_VOID="${STAKE_VOID:-$CONF_STAKE}"

STAMP="$(date +%Y%m%d-%H%M%S)"
BASE_DIR="${BASE_DIR:-$HOME/dev/void-node/.runtime/validator_epoch_manifests/upgrade-track-$STAMP}"
EXPORT_DIR="$BASE_DIR/export"
IMPORT_DIR="$BASE_DIR/imported"
DEPLOY_LOG="/tmp/validator-truth-upgrade-track-deploy.$STAMP.log"
DEPLOYED_ARTIFACT="${DEPLOYED_ARTIFACT:-$HOME/dev/void-node/ops/mainnet/validator-truth-upgrade-track.deployed.json}"

mkdir -p "$EXPORT_DIR" "$IMPORT_DIR"

echo "=== [1] chain + sender preflight ==="
CHAIN_ACTUAL="$(cast chain-id --rpc-url "$RPC")"
echo "rpc=$RPC"
echo "chain_id_expected=$CHAIN_ID_EXPECTED"
echo "chain_id_actual=$CHAIN_ACTUAL"
test "$CHAIN_ACTUAL" = "$CHAIN_ID_EXPECTED"

SENDER="$(cast wallet address --private-key "$PRIVATE_KEY")"
echo "sender=$SENDER"

if [ -z "${EXISTING_STAKING:-}" ] || [ "${EXISTING_STAKING:-}" = "0x0000000000000000000000000000000000000000" ]; then
  BAL_RAW="$(cast call --rpc-url "$RPC" "$VOID_TOKEN" 'balanceOf(address)(uint256)' "$SENDER")"
  python3 - <<'PY' "$BAL_RAW" "$STAKE_VOID"
import re, sys
bal_raw, need_raw = sys.argv[1:3]
bal = int(re.sub(r"\s+\[[^\]]*\]$", "", bal_raw.strip()))
need = int(need_raw)
print(f"void_balance={bal}")
print(f"stake_needed={need}")
if bal < need:
    raise SystemExit(f"[ERR] insufficient VOID balance for upgrade-track seeding: balance={bal} need={need}")
PY
else
  echo "recovery_mode_existing_staking=$EXISTING_STAKING"
  echo "skip_void_balance_preflight=true"
fi

echo
echo "=== [2] deploy + seed/recover upgrade-track stack ==="
PRIVATE_KEY="$PRIVATE_KEY" \
VOID_TOKEN="$VOID_TOKEN" \
REWARD_ADDRESS="$REWARD_ADDRESS" \
CONSENSUS_KEY="$CONSENSUS_KEY" \
STAKE_VOID="$STAKE_VOID" \
EXISTING_STAKING="$EXISTING_STAKING" \
CAPTURE_EPOCH="$CAPTURE_EPOCH" \
START_SLOT="$START_SLOT" \
END_SLOT_EXCLUSIVE="$END_SLOT_EXCLUSIVE" \
CAPTURE_CHUNK_SIZE="$CAPTURE_CHUNK_SIZE" \
forge script script/mainnet_upgrade/ValidatorTruthUpgradeTrackDeploy.s.sol:ValidatorTruthUpgradeTrackDeploy \
  --rpc-url "$RPC" \
  --slow \
  --with-gas-price 2000000000 \
  --broadcast 2>&1 | tee "$DEPLOY_LOG"

echo
echo "=== [3] parse deployed addresses ==="
python3 - <<'PY' "$DEPLOY_LOG" "$DEPLOYED_ARTIFACT" "$RPC" "$CHAIN_ID_EXPECTED" "$SENDER" "$VOID_TOKEN" "$REWARD_ADDRESS" "$CONSENSUS_KEY" "$STAKE_VOID" "$CAPTURE_EPOCH" "$START_SLOT" "$END_SLOT_EXCLUSIVE" "$EXISTING_STAKING" "$CAPTURE_CHUNK_SIZE"
import json, re, sys
from pathlib import Path

log_path = Path(sys.argv[1])
out_path = Path(sys.argv[2])
rpc = sys.argv[3]
chain_id = int(sys.argv[4])
sender = sys.argv[5]
void_token = sys.argv[6]
reward = sys.argv[7]
consensus = sys.argv[8]
stake = sys.argv[9]
epoch = int(sys.argv[10])
start_slot = int(sys.argv[11])
end_slot_exclusive = int(sys.argv[12])
existing_staking = sys.argv[13]
chunk_size = int(sys.argv[14])

text = log_path.read_text(encoding="utf-8", errors="ignore")
keys = [
    "staking",
    "adapter",
    "ordered",
    "snapshot",
    "selector",
    "scheduleView",
    "commitmentView",
    "commitmentRegistry",
    "manifestView",
]
found = {}
for key in keys:
    m = re.search(rf"UPGRADE_TRACK {re.escape(key)} (0x[a-fA-F0-9]{{40}})", text)
    if not m:
        raise SystemExit(f"[ERR] could not parse deployed address for {key} from {log_path}")
    found[key] = m.group(1)

artifact = {
    "chainId": chain_id,
    "rpcUrl": rpc,
    "status": "upgrade_track_epoch_captured",
    "deployer": sender,
    "seed": {
        "reward": reward,
        "consensusKey": consensus,
        "stakeVOID": stake,
        "capturedEpoch": epoch,
        "windowStartSlot": start_slot,
        "windowEndSlotExclusive": end_slot_exclusive,
        "captureChunkSize": chunk_size,
    },
    "contracts": found,
    "recovery": {
        "existingStaking": existing_staking or None,
        "mode": "recovery" if existing_staking and existing_staking != "0x0000000000000000000000000000000000000000" else "seed"
    },
    "notes": [
        "This is a separate upgrade-track validator truth stack.",
        "It is not a mutation of frozen Mainnet-0 bootstrap contracts.",
        "The deployer is the upgrade-track admin for snapshot and commitment registry in this lane.",
    ],
}
out_path.write_text(json.dumps(artifact, indent=2) + "\n", encoding="utf-8")
print(f"[ok] wrote {out_path}")
print(json.dumps(artifact, indent=2))
PY

echo
echo "=== [4] prove code presence on deployed stack ==="
python3 - <<'PY' "$DEPLOYED_ARTIFACT"
import json, sys
j = json.load(open(sys.argv[1], "r", encoding="utf-8"))
for k, v in j["contracts"].items():
    print(k, v)
PY
while read -r name addr; do
  [ -n "${name:-}" ] || continue
  code="$(cast code --rpc-url "$RPC" "$addr" 2>/dev/null || true)"
  if [ -z "$code" ] || [ "$code" = "0x" ]; then
    echo "[ERR] code missing for $name $addr"
    exit 1
  fi
  echo "[ok] $name $addr code present"
done < <(python3 - <<'PY' "$DEPLOYED_ARTIFACT"
import json, sys
j = json.load(open(sys.argv[1], "r", encoding="utf-8"))
for k, v in j["contracts"].items():
    print(k, v)
PY
)

echo
echo "=== [5] export + verify/import manifests from upgrade-track stack ==="
MANIFEST_VIEW_ADDR="$(python3 - <<'PY' "$DEPLOYED_ARTIFACT"
import json, sys
j = json.load(open(sys.argv[1], "r", encoding="utf-8"))
print(j["contracts"]["manifestView"])
PY
)"
SCHEDULE_VIEW_ADDR="$(python3 - <<'PY' "$DEPLOYED_ARTIFACT"
import json, sys
j = json.load(open(sys.argv[1], "r", encoding="utf-8"))
print(j["contracts"]["scheduleView"])
PY
)"

RAW_JSON="$EXPORT_DIR/epoch-$(printf '%06d' "$CAPTURE_EPOCH").manifest.json"

RPC_URL="$RPC" \
MANIFEST_VIEW_ADDR="$MANIFEST_VIEW_ADDR" \
SCHEDULE_VIEW_ADDR="$SCHEDULE_VIEW_ADDR" \
EPOCH="$CAPTURE_EPOCH" \
START_SLOT="$START_SLOT" \
END_SLOT_EXCLUSIVE="$END_SLOT_EXCLUSIVE" \
OUT_JSON="$RAW_JSON" \
python3 "$HOME/dev/void-node/ops/mainnet/export_validator_epoch_manifest_json.py"

VERIFY_RPC_URL="$RPC" \
IMPORT_DIR="$IMPORT_DIR" \
python3 "$HOME/dev/void-node/ops/mainnet/verify_import_validator_epoch_manifest_json.py" "$RAW_JSON"

echo
echo "=== [6] publish + restart + live proof + shadow runner ==="
"$HOME/dev/void-node/ops/mainnet/validator-runtime-truth-publish-dir.sh" "$IMPORT_DIR"
"$HOME/dev/void-node/ops/mainnet/validator-runtime-truth-live-proof.sh" \
  "$HOME/dev/void-node/.runtime/validator_epoch_manifests/verified-current"
"$HOME/dev/void-node/ops/mainnet/validator-runtime-truth-shadow-run.sh" \
  "$HOME/dev/void-node/.runtime/validator_epoch_manifests/verified-current"

echo
echo "=== [7] done ==="
echo "base_dir=$BASE_DIR"
echo "export_dir=$EXPORT_DIR"
echo "import_dir=$IMPORT_DIR"
echo "deployed_artifact=$DEPLOYED_ARTIFACT"
