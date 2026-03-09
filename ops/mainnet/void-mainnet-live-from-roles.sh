#!/usr/bin/env bash
set -euo pipefail

MAP="${1:-ops/mainnet/void-mainnet-roles-mapping.template.txt}"
OUT="${2:-config/void-mainnet-bootstrap-mainnet.live.json}"

[ -f "$MAP" ] || { echo "[FAIL] missing mapping file: $MAP"; exit 1; }

python3 - "$MAP" "$OUT" <<'PY'
import json, sys, pathlib

map_path = pathlib.Path(sys.argv[1])
out_path = pathlib.Path(sys.argv[2])

vals = {}
for raw in map_path.read_text(encoding="utf-8").splitlines():
    line = raw.strip()
    if not line or line.startswith("#"):
        continue
    if "=" not in line:
        continue
    k, v = line.split("=", 1)
    vals[k.strip()] = v.strip()

def need(k: str) -> str:
    v = vals.get(k, "")
    if not v:
        raise SystemExit(f"[FAIL] missing key: {k}")
    return v

doc = {
    "chainId": 2050,
    "roles": {
        "deployer": need("deployer"),
        "treasuryAdmin": need("treasuryAdmin"),
        "opsTreasuryAdmin": need("opsTreasuryAdmin"),
        "validatorAdmin": need("validatorAdmin"),
        "adminGateOwner": need("adminGateOwner"),
        "updateGateOwner": need("updateGateOwner"),
        "configGateOwner": need("configGateOwner"),
        "treasuryOwner": need("treasuryOwner"),
        "opsTreasuryOwner": need("opsTreasuryOwner"),
        "rewardEngineOwner": need("rewardEngineOwner"),
        "validatorSetOwner": need("validatorSetOwner"),
    },
    "contracts": {
        "updateGate": "0x0000000000000000000000000000000000000000",
        "adminGate": "0x0000000000000000000000000000000000000000",
        "configGate": "0x0000000000000000000000000000000000000000",
        "validatorSet": "0x0000000000000000000000000000000000000000",
        "voidToken": "0x0000000000000000000000000000000000000000",
        "premineVault": "0x0000000000000000000000000000000000000000",
        "treasury": "0x0000000000000000000000000000000000000000",
        "voidTreasury": "0x0000000000000000000000000000000000000000",
        "opsTreasury": "0x0000000000000000000000000000000000000000",
        "rewardEngine": "0x0000000000000000000000000000000000000000"
    },
    "validator0": {
        "reward": need("validator0.reward"),
        "consensusKey": need("validator0.consensusKey"),
        "stakeVOID": need("validator0.stakeVOID")
    },
    "note": "Generated from ops/mainnet/void-mainnet-roles-mapping.template.txt. Fill only with fresh mainnet ceremony values. Never reuse dev keys."
}

out_path.parent.mkdir(parents=True, exist_ok=True)
out_path.write_text(json.dumps(doc, indent=2) + "\n", encoding="utf-8")
print(f"[ok] wrote {out_path}")
PY

jq . "$OUT" >/dev/null
echo "[ok] jq valid: $OUT"
