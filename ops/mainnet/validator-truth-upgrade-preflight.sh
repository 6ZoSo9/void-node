#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

CONF="${CONF:-ops/mainnet/void-mainnet.deployed.json}"
RPC="${RPC:-http://127.0.0.1:8545}"
VSET_ABI="${VSET_ABI:-out/mainnet/ValidatorSet.sol/ValidatorSet.json}"
V2_ABI="${V2_ABI:-out/ValidatorStakingV2.sol/ValidatorStakingV2.json}"
OUT_JSON="${OUT_JSON:-/tmp/validator-truth-upgrade-preflight.$(date +%Y%m%d-%H%M%S).json}"

python3 - "$CONF" "$RPC" "$VSET_ABI" "$V2_ABI" "$OUT_JSON" <<'PY'
import json
import re
import subprocess
import sys
from pathlib import Path

conf_path = Path(sys.argv[1])
rpc = sys.argv[2]
vset_abi_path = Path(sys.argv[3])
v2_abi_path = Path(sys.argv[4])
out_json = Path(sys.argv[5])

def run(cmd):
    return subprocess.check_output(cmd, text=True).strip()

def parse_addr_array(raw):
    return re.findall(r'0x[a-fA-F0-9]{40}', raw)

def norm_int(raw):
    raw = re.sub(r"\s+\[[^\]]*\]$", "", raw.strip())
    return int(raw)

def abi_names(path):
    j = json.loads(path.read_text(encoding="utf-8"))
    abi = j.get("abi") or []
    out = []
    for item in abi:
        if not isinstance(item, dict): continue
        if item.get("type") != "function": continue
        out.append(item.get("name"))
    return sorted(set(out))

conf = json.loads(conf_path.read_text(encoding="utf-8"))
contracts = conf["contracts"]
handoff = conf["handoff"]

chain_id = int(run(["cast", "chain-id", "--rpc-url", rpc]))
reward_engine_vset = run(["cast", "call", "--rpc-url", rpc, contracts["RewardEngine"], "validatorSet()(address)"]).strip().lower()
active_raw = run(["cast", "call", "--rpc-url", rpc, contracts["ValidatorSet"], "getActiveValidators()(address[])"])
active = [a.lower() for a in parse_addr_array(active_raw)]
all_vals_raw = run(["cast", "call", "--rpc-url", rpc, contracts["ValidatorSet"], "getValidators()(address[],uint256[])"])
all_addrs = [a.lower() for a in parse_addr_array(all_vals_raw)]
total_power = norm_int(run(["cast", "call", "--rpc-url", rpc, contracts["ValidatorSet"], "totalPower()(uint256)"]))
validator_admin = run(["cast", "call", "--rpc-url", rpc, contracts["ValidatorSet"], "admin()(address)"]).strip().lower()

expect_reward = handoff["validator0"]["reward"].lower()
expect_consensus = handoff["validator0"]["consensusKey"].lower()
expect_stake = str(handoff["validator0"]["stakeVOID"])
expect_validator_admin = handoff["final"]["validatorAdmin"].lower()

live_power = None
if expect_reward in active:
    live_power = str(norm_int(run([
        "cast", "call", "--rpc-url", rpc, contracts["ValidatorSet"],
        "getVotingPower(address)(uint256)", expect_reward
    ])))

vset_names = abi_names(vset_abi_path)
v2_names = abi_names(v2_abi_path)

required_v2_read = [
    "minStake",
    "getActiveValidatorCount",
    "getActiveValidatorAt",
    "getActiveValidators",
    "getValidatorTruth",
    "isSelectableValidator",
    "effectivePowerOf",
]

required_v2_write = [
    "registerValidator",
    "registerAndStake",
    "stake",
    "increaseStake",
    "beginUnbond",
    "finalizeUnbond",
    "beginExit",
    "finalizeExit",
    "setRewardAddress",
    "setConsensusKey",
]

missing_v2_read = [x for x in required_v2_read if x not in v2_names]
missing_v2_write = [x for x in required_v2_write if x not in v2_names]

report = {
    "ok": True,
    "currentTruthMode": "frozen_mainnet0_hybrid",
    "targetTruthMode": "upgraded_validator_staking_v2",
    "chainIdExpected": int(conf["chainId"]),
    "chainIdActual": chain_id,
    "contracts": contracts,
    "handoff": {
        "validator0_reward": expect_reward,
        "validator0_consensusKey": expect_consensus,
        "validator0_stakeVOID": expect_stake,
        "validatorAdmin": expect_validator_admin,
    },
    "currentLiveTruth": {
        "rewardEngineValidatorSet": reward_engine_vset,
        "validatorSetActiveValidators": active,
        "validatorSetAllValidators": all_addrs,
        "validatorSetTotalPower": str(total_power),
        "validatorSetAdmin": validator_admin,
        "handoffRewardSeenInActiveSet": expect_reward in active,
        "handoffRewardSeenInValidatorSet": expect_reward in all_addrs,
        "handoffStakeMatchesLivePower": (live_power == expect_stake),
        "handoffValidatorAdminMatchesLiveAdmin": (validator_admin == expect_validator_admin),
        "currentLivePowerForHandoffReward": live_power,
    },
    "frozenMainnet0Limits": [
        "current ValidatorSet does not expose consensusKey as chain-readable truth",
        "current ValidatorSet is bootstrap truth, not final upgraded staking truth",
        "participant staking cannot be honestly wired to frozen Mainnet-0 contracts",
    ],
    "validatorStakingV2Readiness": {
        "abiPath": str(v2_abi_path),
        "readMethodsPresent": [x for x in required_v2_read if x in v2_names],
        "writeMethodsPresent": [x for x in required_v2_write if x in v2_names],
        "missingReadMethods": missing_v2_read,
        "missingWriteMethods": missing_v2_write,
    },
    "nextLane": "deploy upgrade-track ValidatorStakingV2 truth stack and prove runtime shadow lane against it",
}

errors = []
if chain_id != int(conf["chainId"]):
    errors.append(f"chain id mismatch: got={chain_id} expected={conf['chainId']}")
if reward_engine_vset != contracts["ValidatorSet"].lower():
    errors.append("RewardEngine.validatorSet() does not match deployed ValidatorSet")
if expect_reward not in active:
    errors.append("handoff reward not present in live active validator set")
if expect_reward not in all_addrs:
    errors.append("handoff reward not present in live validator set")
if live_power != expect_stake:
    errors.append(f"handoff stake mismatch: live={live_power} expected={expect_stake}")
if validator_admin != expect_validator_admin:
    errors.append(f"validator admin mismatch: live={validator_admin} expected={expect_validator_admin}")
if missing_v2_read:
    errors.append(f"ValidatorStakingV2 missing read methods: {missing_v2_read}")
if missing_v2_write:
    errors.append(f"ValidatorStakingV2 missing write methods: {missing_v2_write}")

if errors:
    report["ok"] = False
    report["errors"] = errors

out_json.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

print("=== [preflight summary] ===")
print(f"out_json={out_json}")
print(f"ok={report['ok']}")
print(f"chain_id={chain_id}")
print(f"active_count={len(active)}")
print(f"handoff_reward_seen={report['currentLiveTruth']['handoffRewardSeenInActiveSet']}")
print(f"handoff_stake_matches_live_power={report['currentLiveTruth']['handoffStakeMatchesLivePower']}")
print(f"handoff_validator_admin_matches_live_admin={report['currentLiveTruth']['handoffValidatorAdminMatchesLiveAdmin']}")
print(f"missing_v2_read={missing_v2_read}")
print(f"missing_v2_write={missing_v2_write}")
if errors:
    print("--- errors ---")
    for e in errors:
        print(e)
PY
