#!/usr/bin/env bash
set -euo pipefail

# VOID mainnet PLAN invariants check (JSON-only).
# This does NOT broadcast anything or touch real mainnet.
# It only inspects config/void-mainnet-bootstrap-mainnet.live.json and
# enforces the same structural expectations as the checklist / plan_health.

if git rev-parse --show-toplevel >/dev/null 2>&1; then
  cd "$(git rev-parse --show-toplevel)"
fi

CONFIG_PATH="${CONFIG_PATH:-config/void-mainnet-bootstrap-mainnet.live.json}"

echo "=== [plan-sim] VOID mainnet PLAN invariants ==="
echo "[plan-sim] REPO_ROOT   = $(pwd)"
echo "[plan-sim] CONFIG_PATH = $(readlink -f "$CONFIG_PATH" || echo "$CONFIG_PATH")"
echo

if [[ ! -f "$CONFIG_PATH" ]]; then
  echo "[plan-sim] ERROR: config file not found: $CONFIG_PATH" >&2
  echo "[plan-sim] RESULT: NOT READY (missing_config)"
  exit 1
fi

CHAIN_JSON=$(jq -r '.chainId // "MISSING"' "$CONFIG_PATH")

if [[ "$CHAIN_JSON" != "2050" ]]; then
  echo "[plan-sim] ERROR: chainId != 2050 in LIVE config (got $CHAIN_JSON)"
  echo "[plan-sim] RESULT: NOT READY (bad_chainid)"
  exit 1
fi

echo "[plan-sim] OK: chainId == 2050"
echo

# Compute missing fields in one jq pass, keeping it aligned with:
#  - checklist
#  - plan-summary quick interpretation
MJSON=$(jq -r '
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
    } | @json
' "$CONFIG_PATH")

echo "[plan-sim] invariant inspection:"
echo "$MJSON"
echo

MISSING_ROLES_COUNT=$(printf '%s\n' "$MJSON" | jq -r '.missing_roles | length')
MISSING_CONTRACTS_COUNT=$(printf '%s\n' "$MJSON" | jq -r '.missing_contracts | length')
MISSING_VALIDATOR_COUNT=$(printf '%s\n' "$MJSON" | jq -r '.missing_validator0 | length')

EXIT_REASON="ok"

if [[ "$MISSING_ROLES_COUNT" -gt 0 ]]; then
  EXIT_REASON="bad_roles"
  echo "[plan-sim] ERROR: one or more CRITICAL roles are missing/zero:"
  printf '%s\n' "$MJSON" | jq -r '.missing_roles[]' | sed 's/^/  - /'
  echo
fi

if [[ "$MISSING_CONTRACTS_COUNT" -gt 0 ]]; then
  [[ "$EXIT_REASON" == "ok" ]] && EXIT_REASON="bad_contracts"
  echo "[plan-sim] ERROR: one or more CRITICAL contracts are missing/zero:"
  printf '%s\n' "$MJSON" | jq -r '.missing_contracts[]' | sed 's/^/  - /'
  echo
fi

if [[ "$MISSING_VALIDATOR_COUNT" -gt 0 ]]; then
  [[ "$EXIT_REASON" == "ok" ]] && EXIT_REASON="bad_validator0"
  echo "[plan-sim] ERROR: validator0 has missing/zero CRITICAL fields:"
  printf '%s\n' "$MJSON" | jq -r '.missing_validator0[]' | sed 's/^/  - /'
  echo
fi

if [[ "$EXIT_REASON" != "ok" ]]; then
  echo "[plan-sim] RESULT: NOT READY ($EXIT_REASON)"
  exit 1
fi

echo "[plan-sim] RESULT: READY (all CRITICAL invariants satisfied)"
exit 0
