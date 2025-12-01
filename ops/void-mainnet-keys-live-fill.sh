#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

LIVE_CFG="config/void-mainnet-bootstrap-mainnet.live.json"

if [[ ! -f "${LIVE_CFG}" ]]; then
  echo "[FATAL] ${LIVE_CFG} not found."
  exit 1
fi

TS="$(date +%Y%m%d-%H%M%S)"
BACKUP="${LIVE_CFG}.pre-final-keys.${TS}.bak"

echo "=== [keys-live-fill] VOID mainnet LIVE config address fill ==="
echo "[cfg] LIVE_CFG = ${LIVE_CFG}"
echo "[cfg] BACKUP   = ${BACKUP}"

cp "${LIVE_CFG}" "${BACKUP}"
echo "[backup] saved current LIVE config to ${BACKUP}"

update_field() {
  local jq_path="$1"
  local label="$2"

  echo
  echo "=== [field] ${label} (${jq_path}) ==="
  local current
  current="$(jq -r "${jq_path}" "${LIVE_CFG}")"
  echo "  current: ${current}"
  read -r -p "  new (leave blank to keep current): " value

  if [[ -n "${value}" ]]; then
    local tmp="${LIVE_CFG}.tmp.$$"
    jq "${jq_path} = \"${value}\"" "${LIVE_CFG}" > "${tmp}"
    mv "${tmp}" "${LIVE_CFG}"
    echo "  -> updated to: ${value}"
  else
    echo "  -> unchanged"
  fi
}

# --- Core roles (EOAs / hardware wallets etc.) ---

update_field '.roles.deployer'           'deployer (mainnet bootstrap/broadcast EOA)'
update_field '.roles.treasuryAdmin'      'treasuryAdmin (governs Treasury / premine policy)'
update_field '.roles.opsTreasuryAdmin'   'opsTreasuryAdmin (Ops Treasury controls)'
update_field '.roles.validatorAdmin'     'validatorAdmin (ValidatorSet admin)'
update_field '.roles.adminGateOwner'     'adminGateOwner (AdminGate masterKey owner)'
update_field '.roles.updateGateOwner'    'updateGateOwner (UpdateGate owner/multisig)'
update_field '.roles.configGateOwner'    'configGateOwner (ConfigGate owner)'
update_field '.roles.treasuryOwner'      'treasuryOwner (VoidTreasury owner role)'
update_field '.roles.opsTreasuryOwner'   'opsTreasuryOwner (OpsTreasury owner)'
update_field '.roles.rewardEngineOwner'  'rewardEngineOwner'
update_field '.roles.validatorSetOwner'  'validatorSetOwner'

# --- Secondary admin roles (can share with above if design says so) ---

update_field '.roles.opsTreasury'        'opsTreasury (Ops hot wallet / routing addr)'
update_field '.roles.updateGateAdmin'    'updateGateAdmin (UpdateGate admin signer or EOA)'
update_field '.roles.configGateAdmin'    'configGateAdmin (ConfigGate admin signer or EOA)'
update_field '.roles.rewardAdmin'        'rewardAdmin (RewardEngine admin)'

# --- Validator0 (public info only; consensusKey should match your node key) ---

update_field '.validator0.reward'        'validator0.reward (payout address for first validator)'

echo
echo "=== [summary] diff vs backup ==="
git --no-pager diff -- "${BACKUP}" "${LIVE_CFG}" || true

echo
echo "=== [optional] re-run PLAN() against updated LIVE CFG (no broadcasts) ==="
if command -v forge >/dev/null 2>&1; then
  ./ops/void-mainnet-bootstrap-mainnet-plan-from-live.sh || {
    echo "[WARN] PLAN script failed after live-fill; check JSON and try again."
    exit 1
  }
else
  echo "[INFO] forge not found; skipping PLAN re-run."
fi

echo
echo "=== [keys-live-fill] DONE ==="
echo "LIVE config updated. Backup is at: ${BACKUP}"
