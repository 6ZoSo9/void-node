#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PIN="${1:-$REPO/ops/mainnet/void-mainnet.live.json}"

echo "=== [bootstrap-readiness] input ==="
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

summary = {}
summary["chainId"] = j.get("chainId")
summary["mode"] = j.get("mode")
summary["status"] = j.get("status")

roles = j.get("roles") or {}
admins = j.get("admins") or {}
treasury = j.get("treasury") or {}
validators = j.get("validators")
selected = j.get("selected_premine_vault") or {}
hot = j.get("active_hot_wallet") or {}
funding = j.get("funding_allocations") or {}

required_role_keys = [
    "admin_gate",
    "config_gate",
    "update_gate",
    "validator_set",
    "void_token",
    "void_treasury",
    "ops_treasury",
    "reward_engine",
]
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
funding_required = ["pool_seeding_allocation", "treasury_allocation", "hot_wallet_refill"]

missing_role_keys = [k for k in required_role_keys if k not in roles]
missing_admin_keys = [k for k in required_admin_keys if k not in admins]

role_tbd = sorted([k for k in required_role_keys if is_tbd(roles.get(k))])
admin_tbd = sorted([k for k in required_admin_keys if is_tbd(admins.get(k))])
treasury_tbd = sorted([k for k, v in treasury.items() if is_tbd(v)]) if isinstance(treasury, dict) else ["<missing>"]
selected_tbd = sorted([k for k in selected_required if is_tbd(selected.get(k))])
hot_tbd = sorted([k for k in hot_required if is_tbd(hot.get(k))])
funding_tbd = sorted([k for k in funding_required if is_tbd(funding.get(k))])

validator_count = len(validators) if isinstance(validators, list) else -1

shape_ready = (
    j.get("chainId") == 2050 and
    j.get("mode") == "mainnet_plan_stub" and
    isinstance(roles, dict) and
    isinstance(admins, dict) and
    isinstance(treasury, dict) and len(treasury) > 0 and
    isinstance(funding, dict) and
    isinstance(selected, dict) and
    isinstance(hot, dict) and
    isinstance(validators, list) and
    len(missing_role_keys) == 0 and
    len(missing_admin_keys) == 0 and
    len(funding_tbd) == 0
)

identity_ready = (
    shape_ready and
    len(admin_tbd) == 0 and
    len(selected_tbd) == 0 and
    len(hot_tbd) == 0
)

deployment_ready = (
    shape_ready and
    len(role_tbd) == 0 and
    isinstance(validators, list) and
    len(validators) > 0
)

nonstub_ready = identity_ready and deployment_ready

summary["missing_role_keys"] = missing_role_keys
summary["missing_admin_keys"] = missing_admin_keys
summary["role_tbd"] = role_tbd
summary["admin_tbd"] = admin_tbd
summary["treasury_tbd"] = treasury_tbd
summary["validator_count"] = validator_count
summary["selected_premine_vault_tbd"] = selected_tbd
summary["active_hot_wallet_tbd"] = hot_tbd
summary["funding_tbd"] = funding_tbd
summary["shape_ready"] = int(shape_ready)
summary["identity_ready"] = int(identity_ready)
summary["deployment_ready"] = int(deployment_ready)
summary["nonstub_ready"] = int(nonstub_ready)

print("=== [bootstrap-readiness] summary ===")
print(json.dumps(summary, indent=2, sort_keys=True))

if nonstub_ready:
    print("[ok] non-stub bootstrap truth is ready")
    raise SystemExit(0)

print("[warn] non-stub bootstrap truth is NOT ready")
raise SystemExit(3)
PY
