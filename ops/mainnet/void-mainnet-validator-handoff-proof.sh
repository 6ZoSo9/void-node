#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

CONF="${1:-ops/mainnet/void-mainnet.deployed.json}"
RPC="${RPC:-http://127.0.0.1:8545}"

python3 - <<'PY' "$CONF" "$RPC"
import json, sys, subprocess
from pathlib import Path

conf_path = Path(sys.argv[1])
rpc = sys.argv[2]
j = json.load(open(conf_path, "r", encoding="utf-8"))

contracts = j["contracts"]
handoff = j["handoff"]
val_addr = contracts["ValidatorSet"]
admin_addr = contracts["AdminGate"]

expect_reward = handoff["validator0"]["reward"].lower()
expect_consensus = handoff["validator0"]["consensusKey"].lower()
expect_stake = str(handoff["validator0"]["stakeVOID"])
expect_validator_admin = handoff["final"]["validatorAdmin"].lower()
expect_master = handoff["final"]["adminGateMasterKey"].lower()

def run(cmd):
    return subprocess.run(cmd, text=True, capture_output=True)

def canon_type(spec):
    t = spec["type"]
    if t.startswith("tuple"):
        suffix = t[len("tuple"):]
        inner = ",".join(canon_type(c) for c in spec.get("components", []))
        return f"({inner}){suffix}"
    return t

def sig(fn, with_outputs=True):
    ins = ",".join(canon_type(x) for x in fn.get("inputs", []))
    s = f'{fn["name"]}({ins})'
    outs = fn.get("outputs", [])
    if with_outputs and outs:
        s += "(" + ",".join(canon_type(x) for x in outs) + ")"
    return s

def is_view(fn):
    return fn.get("type") == "function" and fn.get("stateMutability") in ("view", "pure")

def artifact_candidates(name_pat: str):
    hits = []
    for p in Path("out").rglob(f"*{name_pat}*.json"):
        s = str(p)
        if "/build-info/" in s:
            continue
        if ".t.sol/" in s or "Test" in p.name:
            continue
        hits.append(p)
    return sorted(dict.fromkeys(hits))

def prefer_real_validator_artifact(paths):
    ranked = []
    for p in paths:
        s = str(p)
        score = 0
        if "/mainnet/ValidatorSet.sol/" in s:
            score += 200
        if "/ValidatorSet.sol/" in s:
            score += 100
        if p.name == "ValidatorSet.json":
            score += 50
        if "/IValidatorSet" in s or p.name.startswith("IValidatorSet"):
            score -= 300
        ranked.append((score, s, p))
    ranked.sort(reverse=True)
    return [p for _, _, p in ranked]

def cast_call(addr, fn_sig, *args):
    cmd = ["cast", "call", "--rpc-url", rpc, addr, fn_sig, *args]
    p = run(cmd)
    return p.returncode, p.stdout.strip(), p.stderr.strip()

val_hits = prefer_real_validator_artifact(artifact_candidates("ValidatorSet"))
admin_hits = artifact_candidates("AdminGate")

if not val_hits:
    print("[ERR] no ValidatorSet artifact found")
    sys.exit(1)
if not admin_hits:
    print("[ERR] no AdminGate artifact found")
    sys.exit(1)

val_art = val_hits[0]
admin_art = admin_hits[0]

print("=== chosen artifacts ===")
print(f"ValidatorSet: {val_art}")
print(f"AdminGate:   {admin_art}")
print()

val_abi = json.load(open(val_art, "r", encoding="utf-8"))["abi"]
admin_abi = json.load(open(admin_art, "r", encoding="utf-8"))["abi"]

val_views = [fn for fn in val_abi if is_view(fn)]
admin_views = [fn for fn in admin_abi if is_view(fn)]

print("=== ValidatorSet readable ABI ===")
for fn in val_views:
    print(sig(fn, with_outputs=True))
print()

consensus_exposed = False
for fn in val_views:
    blob = (fn.get("name","") + " " + " ".join(o.get("name","") for o in fn.get("outputs", []))).lower()
    if "consensus" in blob:
        consensus_exposed = True

print("=== chain-queryable validator proof ===")
rc, active_out, active_err = cast_call(val_addr, "getActiveValidators()(address[])")
print("--- getActiveValidators()(address[])")
if active_out:
    print(active_out)
if active_err:
    print(active_err)
print()

rc, vals_out, vals_err = cast_call(val_addr, "getValidators()(address[],uint256[])")
print("--- getValidators()(address[],uint256[])")
if vals_out:
    print(vals_out)
if vals_err:
    print(vals_err)
print()

rc, admin_out, admin_err = cast_call(val_addr, "admin()(address)")
print("--- admin()(address)")
if admin_out:
    print(admin_out)
if admin_err:
    print(admin_err)
print()

rc, master_out, master_err = cast_call(admin_addr, "masterKey()(address)")
print("--- masterKey()(address)")
if master_out:
    print(master_out)
if master_err:
    print(master_err)
print()

blob_active = ((active_out or "") + "\n" + (active_err or "")).lower()
blob_vals = ((vals_out or "") + "\n" + (vals_err or "")).lower()
blob_admin = ((admin_out or "") + "\n" + (admin_err or "")).lower()
blob_master = ((master_out or "") + "\n" + (master_err or "")).lower()

reward_ok = expect_reward in blob_active or expect_reward in blob_vals
stake_ok = expect_stake in blob_vals
validator_admin_ok = expect_validator_admin in blob_admin
master_ok = expect_master in blob_master

print("=== summary ===")
print(f"reward_ok={1 if reward_ok else 0}")
print(f"stake_ok={1 if stake_ok else 0}")
print(f"validator_admin_ok={1 if validator_admin_ok else 0}")
print(f"admin_gate_master_ok={1 if master_ok else 0}")
print(f"consensus_key_expected={expect_consensus}")
print(f"consensus_key_queryable_from_current_abi={1 if consensus_exposed else 0}")

if not consensus_exposed:
    print("[note] consensusKey is not exposed by the current ValidatorSet readable ABI; it remains a frozen handoff artifact value, not an on-chain readable proof field.")

if not reward_ok:
    print("[ERR] validator0 reward address not matched from chain-readable ValidatorSet calls")
    sys.exit(2)
if not stake_ok:
    print("[ERR] validator0 stake not matched from chain-readable ValidatorSet calls")
    sys.exit(3)
if not validator_admin_ok:
    print("[ERR] validator admin not matched from ValidatorSet.admin()")
    sys.exit(4)
if not master_ok:
    print("[ERR] AdminGate master key not matched")
    sys.exit(5)
PY

echo
echo "=== node health truth ==="
curl -fsS --max-time 5 http://127.0.0.1:4100/health ; echo
curl -fsS --max-time 5 http://127.0.0.1:4100/__void/ready.json ; echo
