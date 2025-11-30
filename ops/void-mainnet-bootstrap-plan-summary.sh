#!/usr/bin/env bash
set -euo pipefail

# Simple human-readable dump of the LIVE mainnet bootstrap plan JSON.
# Does NOT broadcast transactions or touch any chain; it only parses and formats.

if git rev-parse --show-toplevel >/dev/null 2>&1; then
  cd "$(git rev-parse --show-toplevel)"
fi

CONFIG_PATH="${CONFIG_PATH:-config/void-mainnet-bootstrap-mainnet.live.json}"

echo "=== [plan-summary] VOID mainnet bootstrap PLAN summary ==="
echo "[cfg] REPO_ROOT   = $(pwd)"
echo "[cfg] CONFIG_PATH = $CONFIG_PATH"
echo

if [[ ! -f "$CONFIG_PATH" ]]; then
  echo "[plan-summary] ERROR: config file not found: $CONFIG_PATH" >&2
  exit 1
fi

echo "=== [0] chainId ==="
CHAIN_ID=$(jq -r '.chainId // "MISSING"' "$CONFIG_PATH")
echo "chainId=$CHAIN_ID"
echo

echo "=== [1] roles (raw) ==="
jq -r '
  .roles
  | to_entries
  | sort_by(.key)
  | map("\(.key)\t\(.value)")[]
' "$CONFIG_PATH"
echo

echo "=== [2] contracts (raw) ==="
jq -r '
  .contracts
  | to_entries
  | sort_by(.key)
  | map("\(.key)\t\(.value)")[]
' "$CONFIG_PATH"
echo

echo "=== [3] validator0 (raw) ==="
jq -r '
  .validators[0] as $v
  | [
      "reward=" + ($v.reward // "MISSING"),
      "consensusKey=" + ($v.consensusKey // "MISSING"),
      "stakeVOID=" + ( ($v.stakeVOID | tostring) // "MISSING" )
    ]
  | .[]
' "$CONFIG_PATH"
echo

echo "=== [4] quick interpretation ==="
jq -r '
  . as $cfg
  | {
      missing_roles: [
        (if ($cfg.roles.deployer        // "0x0") == "0x0000000000000000000000000000000000000000" then "deployer"        else empty end),
        (if ($cfg.roles.treasuryAdmin   // "0x0") == "0x0000000000000000000000000000000000000000" then "treasuryAdmin"   else empty end),
        (if ($cfg.roles.opsTreasuryAdmin// "0x0") == "0x0000000000000000000000000000000000000000" then "opsTreasuryAdmin" else empty end),
        (if ($cfg.roles.validatorAdmin  // "0x0") == "0x0000000000000000000000000000000000000000" then "validatorAdmin"  else empty end)
      ],
      missing_contracts: [
        (if ($cfg.contracts.voidToken    // "0x0") == "0x0000000000000000000000000000000000000000" then "voidToken"    else empty end),
        (if ($cfg.contracts.premineVault // "0x0") == "0x0000000000000000000000000000000000000000" then "premineVault" else empty end),
        (if ($cfg.contracts.treasury     // "0x0") == "0x0000000000000000000000000000000000000000" then "treasury"     else empty end),
        (if ($cfg.contracts.opsTreasury  // "0x0") == "0x0000000000000000000000000000000000000000" then "opsTreasury"  else empty end),
        (if ($cfg.contracts.rewardEngine // "0x0") == "0x0000000000000000000000000000000000000000" then "rewardEngine" else empty end)
      ],
      missing_validator0: [
        (if ($cfg.validators[0].reward        // "0x0") == "0x0000000000000000000000000000000000000000" then "validator0.reward" else empty end),
        (if ($cfg.validators[0].consensusKey  // "0x0") == "0x0000000000000000000000000000000000000000000000000000000000000000"
            then "validator0.consensusKey" else empty end)
      ]
    }
' "$CONFIG_PATH"
echo

echo "=== [plan-summary] done ==="
