#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ROOT="${ROOT:-$HOME/dev/void-node}"
cd "$ROOT"

TS="$(date +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/mainnet0-mainnet-exec-preflight.$TS}"
BUNDLE_OUT="$OUT/go_no_go_bundle"
mkdir -p "$OUT"/{meta,docs,checks}

run_step() {
  local name="$1"
  shift
  local safe
  safe="$(printf '%s' "$name" | tr ' /:' '---')"
  local log="$OUT/meta/${safe}.log"
  echo
  echo "=== $name ==="
  ("$@") 2>&1 | tee "$log"
}

echo "out=$OUT"

echo
echo "=== [0] git truth ==="
git branch --show-current | tee "$OUT/meta/git.branch.txt"
git rev-parse --short HEAD | tee "$OUT/meta/git.head.txt"
git rev-parse HEAD | tee "$OUT/meta/git.head.full.txt"
git log --oneline --decorate -n 20 | tee "$OUT/meta/git.log.txt"
git status --short | tee "$OUT/meta/git.status.txt"

echo
echo "=== [1] capture docs ==="
cp -a docs/MAINNET0_MAINNET_EXECUTION_RUNBOOK.md "$OUT/docs/"
cp -a docs/MAINNET0_MAINNET_EXECUTION_CHECKLIST.md "$OUT/docs/"
cp -a ops/mainnet/validator-status.current.yaml "$OUT/docs/"
cp -a ops/mainnet/void-mainnet.live.json "$OUT/docs/"

echo
echo "=== [2] run go/no-go bundle ==="
OUT="$BUNDLE_OUT" bash ops/mainnet0-go-no-go-bundle.sh | tee "$OUT/meta/go-no-go.stdout.log"

echo
echo "=== [3] live-json guard ==="
run_step "[3] live-json guard" \
  bash ops/void-mainnet-livejson-guard.sh ops/mainnet/void-mainnet.live.json

echo
echo "=== [4] execution-specific summary ==="
python3 - "ops/mainnet/void-mainnet.live.json" "ops/mainnet/validator-status.current.yaml" "$OUT/meta/git.status.txt" "$OUT" <<'PY'
import hashlib, json, sys
from pathlib import Path

pin = Path(sys.argv[1])
validator_path = Path(sys.argv[2])
git_status_path = Path(sys.argv[3])
out = Path(sys.argv[4])

live = json.loads(pin.read_text())
validator_lines = validator_path.read_text().splitlines()
git_status = git_status_path.read_text().strip()

def sha256_file(p: Path) -> str:
    h = hashlib.sha256()
    with p.open("rb") as f:
        while True:
            b = f.read(1024 * 1024)
            if not b:
                break
            h.update(b)
    return h.hexdigest()

def yaml_value(lines, key):
    for line in lines:
        if line.startswith(key + ":"):
            return line.split(":", 1)[1].strip()
    return None

roles = live.get("roles") or {}
admins = live.get("admins") or {}
premine_model = live.get("premine_model") or {}
selected_vault = live.get("selected_premine_vault") or {}
hot_wallet = live.get("active_hot_wallet") or {}

role_tbd = sorted([k for k,v in roles.items() if str(v).strip() in {"", "TBD", "null", "None"}])
admin_tbd = sorted([k for k,v in admins.items() if str(v).strip() in {"", "TBD", "null", "None"}])

validator = {
    "status": yaml_value(validator_lines, "status"),
    "status_reason": yaml_value(validator_lines, "status_reason"),
    "last_known_head": yaml_value(validator_lines, "last_known_head"),
    "last_known_drift": yaml_value(validator_lines, "last_known_drift"),
    "checkpoint_awareness_status": yaml_value(validator_lines, "checkpoint_awareness_status"),
    "incident_response_readiness": yaml_value(validator_lines, "incident_response_readiness"),
}

blockers = []
notes = []

if live.get("chainId") != 2050:
    blockers.append("chainId is not 2050")

if str(live.get("keys_source") or "") != "luks_flash_drives":
    blockers.append("keys_source is not luks_flash_drives")

if str((premine_model.get("type") or "")) != "segmented_offline_vaults":
    blockers.append("premine_model.type is not segmented_offline_vaults")

if int(premine_model.get("vault_count") or 0) != 30:
    blockers.append("premine_model.vault_count is not 30")

if str((premine_model.get("pool_seeding_source") or "")) != "premine_allocations":
    blockers.append("premine_model.pool_seeding_source is not premine_allocations")

if str(hot_wallet.get("max_balance_policy") or "") != "bounded_operational_buffer":
    blockers.append("active_hot_wallet.max_balance_policy is not bounded_operational_buffer")

mode = str(live.get("mode") or "")
status = str(live.get("status") or "")
if mode != "mainnet_live":
    blockers.append(f"live json mode is {mode}; expected mainnet_live for real execution")
if status != "ready_for_live_broadcast":
    blockers.append(f"live json status is {status}; expected ready_for_live_broadcast for real execution")

if str(selected_vault.get("address") or "TBD") == "TBD":
    blockers.append("selected_premine_vault.address is TBD")
if str(selected_vault.get("id") or "TBD") == "TBD":
    blockers.append("selected_premine_vault.id is TBD")
if str(selected_vault.get("purpose") or "TBD") == "TBD":
    blockers.append("selected_premine_vault.purpose is TBD")
if str(selected_vault.get("status") or "") not in {"offline_selected", "selected_offline"}:
    blockers.append("selected_premine_vault.status is not offline_selected")

if str(hot_wallet.get("address") or "TBD") == "TBD":
    blockers.append("active_hot_wallet.address is TBD")

if role_tbd:
    blockers.append(f"role fields still TBD: {', '.join(role_tbd)}")
if admin_tbd:
    blockers.append(f"admin/controller fields still TBD: {', '.join(admin_tbd)}")

if validator["status"] != "candidate":
    blockers.append(f"validator status is {validator['status']}, expected candidate")
if str(validator["last_known_drift"]) != "0":
    blockers.append(f"validator last_known_drift is {validator['last_known_drift']}, expected 0")
if validator["incident_response_readiness"] != "policy-stack-sanity-green":
    blockers.append("incident_response_readiness is not policy-stack-sanity-green")

if git_status:
    notes.append("working tree is not clean while running preflight")

summary = {
    "execution_ready_now": len(blockers) == 0,
    "git_branch": (out / "meta" / "git.branch.txt").read_text().strip(),
    "git_head": (out / "meta" / "git.head.txt").read_text().strip(),
    "live_json_sha256": sha256_file(pin),
    "validator_status_sha256": sha256_file(validator_path),
    "mode": mode,
    "status": status,
    "selected_premine_vault": selected_vault,
    "active_hot_wallet": hot_wallet,
    "validator": validator,
    "blockers": blockers,
    "notes": notes,
    "go_no_go_bundle_dir": str(out / "go_no_go_bundle"),
}
(out / "meta" / "execution-summary.json").write_text(json.dumps(summary, indent=2) + "\n")
print(json.dumps(summary, indent=2))
PY

echo
echo "[ok] mainnet0 execution preflight finished"
echo "artifacts=$OUT"
