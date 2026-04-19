#!/usr/bin/env python3
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

def run(cmd: list[str]) -> str:
    return subprocess.check_output(cmd, text=True).strip()

def split_top_level_csv(s: str) -> list[str]:
    parts: list[str] = []
    buf: list[str] = []
    depth = 0
    for ch in s:
        if ch == "(":
            depth += 1
            buf.append(ch)
        elif ch == ")":
            depth -= 1
            buf.append(ch)
        elif ch == "," and depth == 0:
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

def cast_values(rpc_url: str, addr: str, sig: str, *args: object) -> list[str]:
    cmd = ["cast", "call", addr, sig, *[str(x) for x in args], "--rpc-url", rpc_url]
    raw = run(cmd)
    return parse_cast_output(raw)

def parse_bool(s: str) -> bool:
    low = s.strip().lower()
    if low == "true":
        return True
    if low == "false":
        return False
    raise ValueError(f"expected bool, got: {s!r}")

def norm_hex(s: str) -> str:
    return str(s).strip().lower()

def norm_dec_str(v: object) -> str:
    if isinstance(v, str):
        if not re.fullmatch(r"[0-9]+", v):
            raise SystemExit(f"[ERR] expected decimal string, got={v!r}")
        return v
    raise SystemExit(f"[ERR] expected decimal string, got type={type(v).__name__} value={v!r}")

def fail(msg: str) -> None:
    raise SystemExit(f"[ERR] {msg}")

json_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(os.environ["JSON_PATH"])
import_dir = Path(os.environ.get("IMPORT_DIR", str(json_path.parent / "verified")))
verify_rpc_url = os.environ.get("VERIFY_RPC_URL")

data = json.loads(json_path.read_text(encoding="utf-8"))
meta = data.get("meta") or {}
rpc_url = verify_rpc_url or meta.get("rpcUrl")
manifest_view = meta.get("manifestView")
schedule_view = meta.get("scheduleView")

if not rpc_url or not manifest_view or not schedule_view:
    fail("json meta is missing rpcUrl, manifestView, or scheduleView")

epoch = int(data["epoch"])
start_slot = int(data["requestedStartSlot"])
end_slot_exclusive = int(data["requestedEndSlotExclusive"])

manifest_sig = "manifestForEpoch(uint256,uint256,uint256)((uint256,uint256,uint256,uint256,uint256,bytes32,bytes32,bytes32,bool,bool,uint256,uint256,bytes32,bytes32,bytes32))"
manifest_vals = cast_values(rpc_url, manifest_view, manifest_sig, epoch, start_slot, end_slot_exclusive)
if len(manifest_vals) != 15:
    fail(f"unexpected manifest field count: got={len(manifest_vals)} values={manifest_vals}")

expected = {
    "epoch": int(manifest_vals[0]),
    "requestedStartSlot": int(manifest_vals[1]),
    "requestedEndSlotExclusive": int(manifest_vals[2]),
    "validatorCount": int(manifest_vals[3]),
    "totalPower": str(int(manifest_vals[4])),
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
}

for k in [
    "epoch",
    "requestedStartSlot",
    "requestedEndSlotExclusive",
    "validatorCount",
    "published",
    "publishedMatch",
    "publishedStartSlot",
    "publishedEndSlotExclusive",
]:
    if data.get(k) != expected[k]:
        fail(f"field mismatch for {k}: file={data.get(k)!r} expected={expected[k]!r}")

if norm_dec_str(data.get("totalPower")) != expected["totalPower"]:
    fail(f"field mismatch for totalPower: file={data.get('totalPower')!r} expected={expected['totalPower']!r}")

for k in [
    "validatorSetCommitment",
    "scheduleWindowCommitment",
    "epochWindowCommitment",
    "publishedValidatorSetCommitment",
    "publishedScheduleWindowCommitment",
    "publishedEpochWindowCommitment",
]:
    if norm_hex(data.get(k)) != norm_hex(expected[k]):
        fail(f"field mismatch for {k}: file={data.get(k)!r} expected={expected[k]!r}")

schedule_sig = "slotProposer(uint256,uint256)((uint256,address,uint256))"
file_schedule = data.get("scheduleWindow") or []
expected_len = end_slot_exclusive - start_slot
if len(file_schedule) != expected_len:
    fail(f"schedule window length mismatch: file={len(file_schedule)} expected={expected_len}")

for idx, slot in enumerate(range(start_slot, end_slot_exclusive)):
    vals = cast_values(rpc_url, schedule_view, schedule_sig, epoch, slot)
    if len(vals) != 3:
        fail(f"unexpected slotProposer field count for slot={slot}: got={len(vals)} values={vals}")

    expected_slot = {
        "slot": int(vals[0]),
        "reward": vals[1],
        "effectivePower": str(int(vals[2])),
    }
    got = file_schedule[idx]

    if int(got.get("slot")) != expected_slot["slot"]:
        fail(f"slot mismatch at idx={idx}: file={got.get('slot')} expected={expected_slot['slot']}")
    if norm_hex(got.get("reward")) != norm_hex(expected_slot["reward"]):
        fail(f"reward mismatch at idx={idx}: file={got.get('reward')} expected={expected_slot['reward']}")
    if norm_dec_str(got.get("effectivePower")) != expected_slot["effectivePower"]:
        fail(f"effectivePower mismatch at idx={idx}: file={got.get('effectivePower')} expected={expected_slot['effectivePower']}")

chain_id = int(run(["cast", "chain-id", "--rpc-url", rpc_url]))
verified_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

verified = dict(data)
verified["verification"] = {
    "ok": True,
    "verifiedAtUtc": verified_at,
    "verifiedRpcUrl": rpc_url,
    "verifiedChainId": chain_id,
    "sourceJson": str(json_path),
}

import_dir.mkdir(parents=True, exist_ok=True)
imported_path = import_dir / f"epoch-{epoch:06d}.manifest.verified.json"
report_path = import_dir / f"epoch-{epoch:06d}.verify.json"

imported_path.write_text(json.dumps(verified, indent=2) + "\n", encoding="utf-8")
report = {
    "ok": True,
    "epoch": epoch,
    "importedPath": str(imported_path),
    "sourceJson": str(json_path),
    "verifiedAtUtc": verified_at,
    "verifiedRpcUrl": rpc_url,
    "verifiedChainId": chain_id,
    "manifestView": manifest_view,
    "scheduleView": schedule_view,
}
report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

print(f"[ok] verified {json_path}")
print(f"[ok] imported {imported_path}")
print(f"[ok] report {report_path}")
