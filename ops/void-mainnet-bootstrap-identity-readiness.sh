#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PIN="${1:-$REPO/ops/mainnet/void-mainnet.live.json}"

echo "=== [bootstrap-identity-readiness] input ==="
echo "PIN=$PIN"
[[ -f "$PIN" ]] || { echo "[ERR] missing live json: $PIN"; exit 2; }

python3 - "$PIN" <<'PY'
import json, sys
from pathlib import Path

path = Path(sys.argv[1])
j = json.loads(path.read_text())

def is_tbd(v):
    if v is None:
        return True
    if isinstance(v, str):
        return v.strip().upper() == "TBD" or v.strip() == ""
    return False

admins = j.get("admins") or {}
selected = j.get("selected_premine_vault") or {}
hot = j.get("active_hot_wallet") or {}

required_admin_keys = [
    "admin",
    "config_admin",
    "update_admin",
    "validator_admin",
    "treasury_admin",
    "ops_admin",
    "reward_admin",
]
selected_required = ["id", "address", "purpose", "status"]
hot_required = ["address", "max_balance_policy"]

missing_admin_keys = [k for k in required_admin_keys if k not in admins]
admin_tbd = sorted([k for k in required_admin_keys if is_tbd(admins.get(k))])
selected_tbd = sorted([k for k in selected_required if is_tbd(selected.get(k))])
hot_tbd = sorted([k for k in hot_required if is_tbd(hot.get(k))])

identity_ready = (
    len(missing_admin_keys) == 0 and
    len(admin_tbd) == 0 and
    len(selected_tbd) == 0 and
    len(hot_tbd) == 0
)

summary = {
    "chainId": j.get("chainId"),
    "mode": j.get("mode"),
    "status": j.get("status"),
    "missing_admin_keys": missing_admin_keys,
    "admin_tbd": admin_tbd,
    "selected_premine_vault_tbd": selected_tbd,
    "active_hot_wallet_tbd": hot_tbd,
    "identity_ready": int(identity_ready),
}

print("=== [bootstrap-identity-readiness] summary ===")
print(json.dumps(summary, indent=2, sort_keys=True))

if identity_ready:
    print("[ok] bootstrap identity truth is ready")
    raise SystemExit(0)

print("[warn] bootstrap identity truth is NOT ready")
raise SystemExit(3)
PY
