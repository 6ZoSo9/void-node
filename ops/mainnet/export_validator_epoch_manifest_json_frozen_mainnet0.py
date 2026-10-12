#!/usr/bin/env python3
import hashlib
import json
import os
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

DEPLOYED_JSON = Path(os.environ.get("DEPLOYED_JSON", "ops/mainnet/void-mainnet.deployed.json"))
EPOCH = int(os.environ["EPOCH"])
START_SLOT = int(os.environ.get("START_SLOT", "0"))
END_SLOT_EXCLUSIVE = int(os.environ.get("END_SLOT_EXCLUSIVE", "8"))
OUT_JSON = Path(os.environ["OUT_JSON"])

def run(cmd: list[str]) -> str:
    return subprocess.check_output(cmd, text=True).strip()

def normalize_cast_scalar(token: str) -> str:
    token = token.strip()
    token = re.sub(r"\s+\[[^\]]*\]$", "", token)
    return token.strip()

def parse_address_array(raw: str) -> list[str]:
    return re.findall(r"0x[a-fA-F0-9]{40}", raw)

def parse_uint(raw: str) -> int:
    return int(normalize_cast_scalar(raw))

def h32(label: str, obj) -> str:
    body = json.dumps({"label": label, "value": obj}, sort_keys=True, separators=(",", ":")).encode()
    return "0x" + hashlib.sha256(body).hexdigest()

j = json.loads(DEPLOYED_JSON.read_text(encoding="utf-8"))
rpc_url = j["source_of_truth_rpc"]
chain_id_expected = int(j["chainId"])
contracts = j["contracts"]
handoff = j["handoff"]

validator_set = contracts["ValidatorSet"]
reward_engine = contracts["RewardEngine"]
handoff_reward = str(handoff["validator0"]["reward"]).lower()
handoff_consensus = str(handoff["validator0"]["consensusKey"]).lower()
handoff_stake = str(handoff["validator0"]["stakeVOID"])

chain_id = int(run(["cast", "chain-id", "--rpc-url", rpc_url]))
if chain_id != chain_id_expected:
    raise SystemExit(f"[ERR] unexpected chain id: got={chain_id} expected={chain_id_expected}")

reward_engine_vset = normalize_cast_scalar(
    run(["cast", "call", "--rpc-url", rpc_url, reward_engine, "validatorSet()(address)"])
).lower()
if reward_engine_vset != validator_set.lower():
    raise SystemExit(
        f"[ERR] RewardEngine.validatorSet mismatch: rewardEngine={reward_engine_vset} deployedJson={validator_set.lower()}"
    )

active_raw = run(["cast", "call", "--rpc-url", rpc_url, validator_set, "getActiveValidators()(address[])"])
active = [a.lower() for a in parse_address_array(active_raw)]
if len(active) != 1:
    raise SystemExit(f"[ERR] frozen-mainnet0 hybrid exporter currently requires exactly 1 active validator; got={len(active)} active={active}")

live_reward = active[0]
if live_reward != handoff_reward:
    raise SystemExit(f"[ERR] live reward mismatch: chain={live_reward} handoff={handoff_reward}")

live_power = parse_uint(
    run(["cast", "call", "--rpc-url", rpc_url, validator_set, f"getVotingPower(address)(uint256)", live_reward])
)
if str(live_power) != handoff_stake:
    raise SystemExit(f"[ERR] live power mismatch: chain={live_power} handoffStake={handoff_stake}")

total_power = parse_uint(run(["cast", "call", "--rpc-url", rpc_url, validator_set, "totalPower()(uint256)"]))
if total_power != live_power:
    raise SystemExit(f"[ERR] totalPower mismatch for frozen one-validator state: total={total_power} validator={live_power}")

schedule_window = []
for slot in range(START_SLOT, END_SLOT_EXCLUSIVE):
    schedule_window.append({
        "slot": slot,
        "reward": live_reward,
        "effectivePower": str(live_power),
    })

validator_count = 1

validator_set_commitment = h32("frozen_mainnet0.validator_set", {
    "epoch": EPOCH,
    "validators": [
        {
            "reward": live_reward,
            "effectivePower": str(live_power),
            "consensusKey": handoff_consensus,
        }
    ],
    "validatorCount": validator_count,
    "totalPower": str(total_power),
})

schedule_window_commitment = h32("frozen_mainnet0.schedule_window", {
    "epoch": EPOCH,
    "startSlot": START_SLOT,
    "endSlotExclusive": END_SLOT_EXCLUSIVE,
    "scheduleWindow": schedule_window,
})

epoch_window_commitment = h32("frozen_mainnet0.epoch_window", {
    "epoch": EPOCH,
    "validatorSetCommitment": validator_set_commitment,
    "scheduleWindowCommitment": schedule_window_commitment,
})

zero32 = "0x" + ("00" * 32)
now_utc = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

data = {
    "epoch": EPOCH,
    "requestedStartSlot": START_SLOT,
    "requestedEndSlotExclusive": END_SLOT_EXCLUSIVE,
    "validatorCount": validator_count,
    "totalPower": str(total_power),
    "validatorSetCommitment": validator_set_commitment,
    "scheduleWindowCommitment": schedule_window_commitment,
    "epochWindowCommitment": epoch_window_commitment,
    "published": False,
    "publishedMatch": False,
    "publishedStartSlot": START_SLOT,
    "publishedEndSlotExclusive": END_SLOT_EXCLUSIVE,
    "publishedValidatorSetCommitment": zero32,
    "publishedScheduleWindowCommitment": zero32,
    "publishedEpochWindowCommitment": zero32,
    "scheduleWindow": schedule_window,
    "meta": {
        "rpcUrl": rpc_url,
        "chainId": chain_id,
        "manifestView": validator_set,
        "scheduleView": validator_set,
        "exportedAtUtc": now_utc,
        "bigintEncoding": "decimal_string",
        "truthMode": "frozen_mainnet0_hybrid",
        "deployedJson": str(DEPLOYED_JSON),
        "rewardEngine": reward_engine,
        "limitations": [
            "derived from frozen Mainnet-0 ValidatorSet plus deployed handoff artifact",
            "consensusKey is not chain-readable from current ValidatorSet ABI",
            "published commitments are unavailable on frozen Mainnet-0 and are recorded as zero hashes",
            "current exporter requires exactly one active validator on chain 2050",
            "epoch labels are export labels, not chain-native epoch history"
        ],
    },
    "verification": {
        "ok": True,
        "verifiedAtUtc": now_utc,
        "verifiedRpcUrl": rpc_url,
        "verifiedChainId": chain_id,
        "sourceJson": str(DEPLOYED_JSON),
        "verificationMode": "hybrid_frozen_mainnet0_validator_set_plus_repo_handoff",
    },
}

OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
OUT_JSON.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
print(f"[ok] wrote {OUT_JSON}")
print(f"[ok] reward={live_reward}")
print(f"[ok] power={live_power}")
print(f"[ok] epoch={EPOCH} window=[{START_SLOT},{END_SLOT_EXCLUSIVE})")
