#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
SECRETS="${SECRETS:-/mnt/key2/mainnet-keygen/20260418-023715/private/wallet-secrets.json}"
DRY_RUN="${DRY_RUN:-1}"
CANDIDATE_NAME="${CANDIDATE_NAME:-}"
TARGET_EPOCH="${TARGET_EPOCH:-}"
EXPECTED_VALIDATOR_COUNT="${EXPECTED_VALIDATOR_COUNT:-}"

echo "=== [1] preflight canonical health stack ==="
"$HOME/dev/void-node/ops/mainnet/validator-mainnet-health-stack-proof.sh"

echo
echo "=== [2] select next unused vault candidate from live runtime truth ==="
readarray -t INFO < <(
python3 - <<'PY' "$BASE" "$SECRETS" "$CANDIDATE_NAME"
import json, re, sys, urllib.request
from pathlib import Path

base, secrets_path, candidate_override = sys.argv[1:4]
base = base.rstrip("/")

def get_json(path: str):
    with urllib.request.urlopen(base + path) as r:
        return json.loads(r.read().decode("utf-8", "replace"))

status = get_json("/__void/runtime/validator-truth/status")
latest_epoch = int(status["latestEpoch"])
epoch_summary = get_json(f"/__void/runtime/validator-truth/epoch/{latest_epoch}")["summary"]
window = get_json(f"/__void/runtime/validator-truth/window/{latest_epoch}/0/64")["window"]

used_rewards = sorted({
    str(row.get("reward", "")).lower()
    for row in window
    if isinstance(row, dict) and row.get("reward")
})

secrets = json.loads(Path(secrets_path).read_text(encoding="utf-8"))
rows = secrets.get("keys") if isinstance(secrets, dict) else secrets
if not isinstance(rows, list):
    raise SystemExit("[ERR] wallet-secrets shape not recognized")

vaults = []
for row in rows:
    if not isinstance(row, dict):
        continue
    name = str(row.get("name") or row.get("id") or row.get("label") or "").strip()
    addr = str(row.get("address") or "").strip()
    if not name or not re.fullmatch(r"vault\d{2}", name):
        continue
    if addr and not addr.startswith("0x"):
        addr = "0x" + addr
    vaults.append((name, addr.lower(), addr))

vaults.sort()

chosen = None
if candidate_override:
    for name, addr_l, addr in vaults:
        if name == candidate_override:
            chosen = (name, addr_l, addr)
            break
    if chosen is None:
        raise SystemExit(f"[ERR] requested candidate not found in wallet-secrets: {candidate_override}")
else:
    for item in vaults:
        if item[1] not in used_rewards:
            chosen = item
            break

if chosen is None:
    raise SystemExit("[ERR] no unused vaultNN candidate remains")

candidate_name, candidate_addr_l, candidate_addr = chosen
validator_count = int(epoch_summary["validatorCount"])

print(candidate_name)
print(candidate_addr)
print(str(latest_epoch))
print(str(latest_epoch + 1))
print(str(validator_count))
print(str(validator_count + 1))
print(json.dumps(used_rewards))
PY
)

SELECTED_CANDIDATE_NAME="${INFO[0]}"
SELECTED_CANDIDATE_ADDR="${INFO[1]}"
CURRENT_EPOCH="${INFO[2]}"
AUTO_TARGET_EPOCH="${INFO[3]}"
CURRENT_VALIDATOR_COUNT="${INFO[4]}"
AUTO_EXPECTED_VALIDATOR_COUNT="${INFO[5]}"
USED_REWARDS_JSON="${INFO[6]}"

if [ -z "${TARGET_EPOCH:-}" ]; then
  TARGET_EPOCH="$AUTO_TARGET_EPOCH"
fi
if [ -z "${EXPECTED_VALIDATOR_COUNT:-}" ]; then
  EXPECTED_VALIDATOR_COUNT="$AUTO_EXPECTED_VALIDATOR_COUNT"
fi

echo "selected_candidate_name=$SELECTED_CANDIDATE_NAME"
echo "selected_candidate_addr=$SELECTED_CANDIDATE_ADDR"
echo "current_epoch=$CURRENT_EPOCH"
echo "target_epoch=$TARGET_EPOCH"
echo "current_validator_count=$CURRENT_VALIDATOR_COUNT"
echo "expected_validator_count=$EXPECTED_VALIDATOR_COUNT"
echo "used_rewards_json=$USED_REWARDS_JSON"

echo
echo "=== [3] execute or print exact onboarding command ==="
CMD=(env
  "CANDIDATE_NAME=$SELECTED_CANDIDATE_NAME"
  "TARGET_EPOCH=$TARGET_EPOCH"
  "EXPECTED_VALIDATOR_COUNT=$EXPECTED_VALIDATOR_COUNT"
  "$HOME/dev/void-node/ops/mainnet/validator-staking-upgrade-onboard-runbook.sh"
)

printf 'command='
printf '%q ' "${CMD[@]}"
printf '\n'

if [ "$DRY_RUN" = "1" ]; then
  echo "[ok] dry-run only; no chain mutation performed"
  exit 0
fi

"${CMD[@]}"
