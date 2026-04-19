#!/usr/bin/env python3
import json
import os
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

RPC_URL = os.environ["RPC_URL"]
MANIFEST_VIEW_ADDR = os.environ["MANIFEST_VIEW_ADDR"]
SCHEDULE_VIEW_ADDR = os.environ["SCHEDULE_VIEW_ADDR"]
EPOCH = int(os.environ["EPOCH"])
START_SLOT = int(os.environ["START_SLOT"])
END_SLOT_EXCLUSIVE = int(os.environ["END_SLOT_EXCLUSIVE"])
OUT_JSON = Path(os.environ["OUT_JSON"])

def run(cmd: list[str]) -> str:
    return subprocess.check_output(cmd, text=True).strip()

def split_top_level_csv(s: str) -> list[str]:
    parts: list[str] = []
    buf: list[str] = []
    depth = 0
    for ch in s:
        if ch == '(':
            depth += 1
            buf.append(ch)
        elif ch == ')':
            depth -= 1
            buf.append(ch)
        elif ch == ',' and depth == 0:
            parts.append("".join(buf).strip())
            buf = []
        else:
            buf.append(ch)
    if buf:
        parts.append("".join(buf).strip())
    return parts

def normalize_cast_scalar(token: str) -> str:
    token = token.strip()
    token = re.sub(r"\s+\[[^\]]*\]$", "", token)
    return token.strip()

def parse_cast_output(raw: str) -> list[str]:
    raw = raw.strip()
    if not raw:
        return []

    lines = [line.strip() for line in raw.splitlines() if line.strip()]
    if len(lines) == 1:
        line = normalize_cast_scalar(lines[0])
        if line.startswith("(") and line.endswith(")"):
            inner = line[1:-1].strip()
            if not inner:
                return []
            return [normalize_cast_scalar(x) for x in split_top_level_csv(inner)]
        return [line]

    return [normalize_cast_scalar(line) for line in lines]

def cast_values(addr: str, sig: str, *args: object) -> list[str]:
    cmd = ["cast", "call", addr, sig, *[str(x) for x in args], "--rpc-url", RPC_URL]
    raw = run(cmd)
    return parse_cast_output(raw)

def parse_bool(s: str) -> bool:
    low = s.strip().lower()
    if low == "true":
        return True
    if low == "false":
        return False
    raise ValueError(f"expected bool, got: {s!r}")

manifest_sig = "manifestForEpoch(uint256,uint256,uint256)((uint256,uint256,uint256,uint256,uint256,bytes32,bytes32,bytes32,bool,bool,uint256,uint256,bytes32,bytes32,bytes32))"
manifest_vals = cast_values(MANIFEST_VIEW_ADDR, manifest_sig, EPOCH, START_SLOT, END_SLOT_EXCLUSIVE)

if len(manifest_vals) != 15:
    raise SystemExit(f"[ERR] unexpected manifest field count: got={len(manifest_vals)} values={manifest_vals}")

schedule_sig = "slotProposer(uint256,uint256)((uint256,address,uint256))"
schedule_window: list[dict] = []
for slot in range(START_SLOT, END_SLOT_EXCLUSIVE):
    vals = cast_values(SCHEDULE_VIEW_ADDR, schedule_sig, EPOCH, slot)
    if len(vals) != 3:
        raise SystemExit(f"[ERR] unexpected slotProposer field count for slot={slot}: got={len(vals)} values={vals}")
    schedule_window.append({
        "slot": int(vals[0]),
        "reward": vals[1],
        "effectivePower": int(vals[2]),
    })

chain_id = int(run(["cast", "chain-id", "--rpc-url", RPC_URL]))

data = {
    "epoch": int(manifest_vals[0]),
    "requestedStartSlot": int(manifest_vals[1]),
    "requestedEndSlotExclusive": int(manifest_vals[2]),
    "validatorCount": int(manifest_vals[3]),
    "totalPower": int(manifest_vals[4]),
    "validatorSetCommitment": manifest_vals[5],
    "scheduleWindowCommitment": manifest_vals[6],
    "epochWindowCommitment": manifest_vals[7],
    "published": parse_bool(manifest_vals[8]),
    "publishedMatch": parse_bool(manifest_vals[9]),
    "publishedStartSlot": int(manifest_vals[10]),
    "publishedEndSlotExclusive": int(manifest_vals[11]),
    "publishedValidatorSetCommitment": manifest_vals[12],
    "publishedScheduleWindowCommitment": manifest_vals[13],
    "publishedEpochWindowCommitment": manifest_vals[14],
    "scheduleWindow": schedule_window,
    "meta": {
        "rpcUrl": RPC_URL,
        "chainId": chain_id,
        "manifestView": MANIFEST_VIEW_ADDR,
        "scheduleView": SCHEDULE_VIEW_ADDR,
        "exportedAtUtc": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
    },
}

OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
OUT_JSON.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
print(f"[ok] wrote {OUT_JSON}")
