#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
SECRETS="${SECRETS:-/mnt/key2/mainnet-keygen/20260418-023715/private/wallet-secrets.json}"
DRY_RUN="${DRY_RUN:-1}"
SKIP_PREFLIGHT="${SKIP_PREFLIGHT:-0}"
CANDIDATE_NAME="${CANDIDATE_NAME:-}"
TARGET_EPOCH="${TARGET_EPOCH:-}"
EXPECTED_VALIDATOR_COUNT="${EXPECTED_VALIDATOR_COUNT:-}"

if [ "$SKIP_PREFLIGHT" != "1" ]; then
  echo "=== [1] preflight canonical health stack ==="
  env -u OUT_JSON "$HOME/dev/void-node/ops/mainnet/validator-mainnet-health-stack-proof.sh"
else
  echo "=== [1] preflight canonical health stack ==="
  echo "[skip] SKIP_PREFLIGHT=1"
fi

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
loaded_epochs = [int(x) for x in (status.get("loadedEpochs") or [])]
epoch_summary = get_json(f"/__void/runtime/validator-truth/epoch/{latest_epoch}")["summary"]
window_len = int(epoch_summary.get("scheduleWindowLength") or 0)
if window_len <= 0:
    raise SystemExit(f"[ERR] invalid scheduleWindowLength for epoch {latest_epoch}: {window_len}")

current_window = get_json(f"/__void/runtime/validator-truth/window/{latest_epoch}/0/{window_len}")["window"]

historical_used_rewards = set()
for epoch in loaded_epochs:
    epoch_summary_i = get_json(f"/__void/runtime/validator-truth/epoch/{epoch}")["summary"]
    epoch_window_len = int(epoch_summary_i.get("scheduleWindowLength") or 0)
    if epoch_window_len <= 0:
        raise SystemExit(f"[ERR] invalid scheduleWindowLength for epoch {epoch}: {epoch_window_len}")
    epoch_window = get_json(f"/__void/runtime/validator-truth/window/{epoch}/0/{epoch_window_len}")["window"]
    for row in epoch_window:
        if isinstance(row, dict) and row.get("reward"):
            historical_used_rewards.add(str(row.get("reward", "")).lower())

used_rewards = sorted(historical_used_rewards)

secrets = json.loads(Path(secrets_path).read_text(encoding="utf-8"))
rows = secrets.get("keys") if isinstance(secrets, dict) else secrets
if not isinstance(rows, list):
    raise SystemExit("[ERR] wallet-secrets shape not recognized")

validator_count = int(epoch_summary["validatorCount"])

vaults = []
for row in rows:
    if not isinstance(row, dict):
        continue
    name = str(row.get("name") or row.get("id") or row.get("label") or "").strip()
    addr = str(row.get("address") or "").strip()
    m = re.fullmatch(r"vault(\d+)", name)
    if not name or not m:
        continue
    if addr and not addr.startswith("0x"):
        addr = "0x" + addr
    vault_num = int(m.group(1))
    vaults.append((name, addr.lower(), addr, vault_num))

vaults.sort(key=lambda x: (x[3], x[0]))

chosen = None
if candidate_override:
    for name, addr_l, addr, vault_num in vaults:
        if name == candidate_override:
            chosen = (name, addr_l, addr, vault_num)
            break
    if chosen is None:
        raise SystemExit(f"[ERR] requested candidate not found in wallet-secrets: {candidate_override}")
else:
    min_vault_num = validator_count
    for item in vaults:
        name, addr_l, addr, vault_num = item
        if vault_num < min_vault_num:
            continue
        if addr_l in used_rewards:
            continue
        chosen = item
        break

if chosen is None:
    candidate_name = ""
    candidate_addr = ""
else:
    candidate_name, candidate_addr_l, candidate_addr, candidate_vault_num = chosen

print(candidate_name)
print(candidate_addr)
print(str(latest_epoch))
print(str(latest_epoch + 1))
print(str(validator_count))
print(str(validator_count + 1))
print(str(window_len))
print(json.dumps(used_rewards))
PY
)

if [ "${#INFO[@]}" -lt 8 ]; then
  echo "[ERR] next-onboard selector produced no candidate payload" >&2
  exit 1
fi

SELECTED_CANDIDATE_NAME="${INFO[0]}"
SELECTED_CANDIDATE_ADDR="${INFO[1]}"
CURRENT_EPOCH="${INFO[2]}"
AUTO_TARGET_EPOCH="${INFO[3]}"
CURRENT_VALIDATOR_COUNT="${INFO[4]}"
AUTO_EXPECTED_VALIDATOR_COUNT="${INFO[5]}"
WINDOW_LENGTH="${INFO[6]}"
USED_REWARDS_JSON="${INFO[7]}"

if [ -z "${TARGET_EPOCH:-}" ]; then
  TARGET_EPOCH="$AUTO_TARGET_EPOCH"
fi
if [ -z "${EXPECTED_VALIDATOR_COUNT:-}" ]; then
  EXPECTED_VALIDATOR_COUNT="$AUTO_EXPECTED_VALIDATOR_COUNT"
fi

EXHAUSTED="0"
if [ -z "$SELECTED_CANDIDATE_NAME" ] || [ -z "$SELECTED_CANDIDATE_ADDR" ]; then
  EXHAUSTED="1"
fi

echo "selected_candidate_name=$SELECTED_CANDIDATE_NAME"
echo "selected_candidate_addr=$SELECTED_CANDIDATE_ADDR"
echo "current_epoch=$CURRENT_EPOCH"
echo "target_epoch=$TARGET_EPOCH"
echo "current_validator_count=$CURRENT_VALIDATOR_COUNT"
echo "expected_validator_count=$EXPECTED_VALIDATOR_COUNT"
echo "window_length=$WINDOW_LENGTH"
echo "used_rewards_json=$USED_REWARDS_JSON"
echo "selection_state=$([ "$EXHAUSTED" = "1" ] && echo exhausted || echo ready)"

echo
echo "=== [3] execute or print exact onboarding command ==="

if [ "$EXHAUSTED" = "1" ]; then
  echo "[info] no unused vaultNN candidate remains"
  if [ "$DRY_RUN" = "1" ]; then
    echo "[ok] dry-run only; no chain mutation performed"
    exit 0
  fi
  echo "[ERR] no unused vaultNN candidate remains" >&2
  exit 1
fi

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
