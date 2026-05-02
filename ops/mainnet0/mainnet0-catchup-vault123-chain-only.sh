#!/usr/bin/env bash
set -euo pipefail

cd "${VOID_REPO:-$HOME/dev/void-node}"

RPC="${RPC:-http://127.0.0.1:8545}"
STAKE_WEI="${STAKE_WEI:-1000000000000000000000}"
ZERO="0x0000000000000000000000000000000000000000"
GAS_HEX="${GAS_HEX:-0x3635C9ADC5DEA00000}"
CONSENSUS_KEY="${CONSENSUS_KEY:-0xadb4940fd9fda29ac43a748175999115f66247b2ed59145b2684e5624bc2ce63}"
export RPC STAKE_WEI GAS_HEX CONSENSUS_KEY

echo "=== Mainnet-0 vault123 chain-only catchup ==="
echo "rpc=$RPC"
echo "consensus_key=$CONSENSUS_KEY"

python3 - <<'PY'
import json, os, re, subprocess, time, urllib.request
from pathlib import Path

RPC = os.environ.get("RPC", "http://127.0.0.1:8545")
STAKE = int(os.environ.get("STAKE_WEI", "1000000000000000000000"))
ZERO = "0x0000000000000000000000000000000000000000"
GAS_HEX = os.environ.get("GAS_HEX", "0x3635C9ADC5DEA00000")
CONSENSUS_KEY = os.environ["CONSENSUS_KEY"]

CONF = Path("ops/mainnet/void-mainnet.deployed.json")
ART = Path("ops/mainnet/validator-truth-upgrade-track.deployed.json")
SECRETS = Path("/mnt/key2/mainnet-keygen/20260418-023715/private/wallet-secrets.json")

def sh(args, label):
    p = subprocess.run(args, text=True, capture_output=True)
    if p.returncode != 0:
        print(f"[ERR] {label} rc={p.returncode}")
        if p.stdout.strip():
            print(p.stdout[-3000:])
        if p.stderr.strip():
            print(p.stderr[-3000:])
        raise SystemExit(p.returncode)
    return p.stdout.strip()

def call(addr, sig, *args):
    return sh(["cast", "call", "--rpc-url", RPC, addr, sig, *map(str, args)], f"call {sig}")

def send(pk, addr, sig, *args):
    return sh(["cast", "send", "--rpc-url", RPC, "--private-key", pk, addr, sig, *map(str, args)], f"send {sig}")

def intval(s):
    m = re.search(r"\d+", s or "")
    return int(m.group(0)) if m else 0

def addrval(s):
    m = re.search(r"0x[a-fA-F0-9]{40}", s or "")
    return m.group(0) if m else ZERO

def setbal(addr):
    payload = json.dumps({
        "jsonrpc": "2.0",
        "method": "anvil_setBalance",
        "params": [addr, GAS_HEX],
        "id": 1,
    }).encode()
    req = urllib.request.Request(RPC, data=payload, headers={"content-type": "application/json"})
    body = urllib.request.urlopen(req).read().decode()
    if '"error"' in body:
        raise SystemExit(f"[ERR] setBalance failed for {addr}: {body}")

def keccak(s):
    return sh(["cast", "keccak", s], f"keccak {s}")

def load_wallets():
    rows = json.loads(SECRETS.read_text()).get("keys", [])
    by = {}
    for r in rows:
        if isinstance(r, dict) and r.get("name"):
            by[r["name"]] = r
    def get(name):
        r = by.get(name)
        if not r:
            raise SystemExit(f"[ERR] missing wallet {name}")
        addr = r.get("address") or ""
        pk = r.get("private_key") or r.get("privateKey") or r.get("pk") or ""
        if not addr or not pk:
            raise SystemExit(f"[ERR] wallet {name} missing addr/pk")
        if not addr.startswith("0x"):
            addr = "0x" + addr
        if not pk.startswith("0x"):
            pk = "0x" + pk
        return addr, pk
    return get

conf = json.loads(CONF.read_text())
art = json.loads(ART.read_text())
get = load_wallets()

VOID = conf["contracts"]["VoidToken"]
VT = conf["contracts"]["VoidTreasury"]
OPS = conf["contracts"]["OpsTreasury"]
STAKING = art["contracts"]["staking"]

treasury_addr, treasury_pk = get("treasury_admin")
ops_addr, ops_pk = get("ops_admin")
vault_addr, vault_pk = get("vault123")

print(f"staking={STAKING}")
print(f"vault123={vault_addr}")

vc0 = intval(call(STAKING, "getValidatorCount()(uint256)"))
ac0 = intval(call(STAKING, "getActiveValidatorCount()(uint256)"))
print(f"before_validator_count={vc0}")
print(f"before_active_count={ac0}")

reward = addrval(call(STAKING, "controllerToReward(address)(address)", vault_addr))
stake = intval(call(STAKING, "stakeOf(address)(uint256)", vault_addr))
active = "true" in call(STAKING, "isActiveValidator(address)(bool)", vault_addr).lower()

print(f"vault123_registered={reward.lower() != ZERO.lower()}")
print(f"vault123_stake={stake}")
print(f"vault123_active={active}")

if vc0 == 124 and ac0 == 124 and active and stake >= STAKE:
    print("[ok] vault123 already active; catchup is idempotent")
    raise SystemExit(0)

if vc0 != 123 or ac0 != 123:
    raise SystemExit(f"[ERR] expected pre-catchup 123/123 or completed 124/124, got {vc0}/{ac0}")

setbal(treasury_addr)
setbal(ops_addr)
setbal(vault_addr)

if stake < STAKE:
    bal = intval(call(VOID, "balanceOf(address)(uint256)", vault_addr))
    need = max(0, STAKE - bal)
    print(f"vault123_void_balance={bal}")
    print(f"vault123_void_need={need}")

    if need > 0:
        ops_bal = intval(call(VOID, "balanceOf(address)(uint256)", OPS))
        if ops_bal < need:
            salt = keccak(f"catchup-vault123-send-to-ops-{int(time.time())}")
            send(treasury_pk, VT, "sendToOps(uint256,bytes32)", need - ops_bal, salt)
        salt = keccak(f"catchup-vault123-spend-{int(time.time())}")
        send(ops_pk, OPS, "spend(address,uint256,bytes32)", vault_addr, need, salt)

if reward.lower() == ZERO.lower():
    send(vault_pk, VOID, "approve(address,uint256)", STAKING, STAKE)
    send(vault_pk, STAKING, "registerAndStake(address,bytes32,uint256)", vault_addr, CONSENSUS_KEY, STAKE)
elif stake < STAKE:
    delta = STAKE - stake
    send(vault_pk, VOID, "approve(address,uint256)", STAKING, delta)
    send(vault_pk, STAKING, "stake(uint256)", delta)

active = "true" in call(STAKING, "isActiveValidator(address)(bool)", vault_addr).lower()
if not active:
    send(vault_pk, STAKING, "activate()")

vc1 = intval(call(STAKING, "getValidatorCount()(uint256)"))
ac1 = intval(call(STAKING, "getActiveValidatorCount()(uint256)"))
print(f"after_validator_count={vc1}")
print(f"after_active_count={ac1}")

if vc1 != 124 or ac1 != 124:
    raise SystemExit(f"[ERR] expected post-catchup 124/124, got {vc1}/{ac1}")

print("[ok] vault123 chain catch-up complete")
PY
