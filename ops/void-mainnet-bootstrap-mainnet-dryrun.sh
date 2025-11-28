#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

CFG="${1:-config/void-mainnet-bootstrap-mainnet.live.json}"

echo "=== VOID mainnet bootstrap dry-run (JSON planner) ==="
echo "[dryrun] config path: $CFG"
echo

if [ ! -f "$CFG" ]; then
  echo "[dryrun] FATAL: config file not found: $CFG" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "[dryrun] FATAL: jq not found on PATH" >&2
  exit 1
fi

# Reuse the live JSON validator as a guardrail
./ops/void-mainnet-bootstrap-mainnet-live-validate.sh "$CFG"

echo
jq -r '
  def roles: .roles;
  def vals: (.validators // []);

  "=== VOID mainnet bootstrap dry-run ===",
  "config file : " + input_filename,
  "chainId     : " + ((.chainId // "<missing>") | tostring),
  "networkName : " + (.networkName // "<missing>"),
  "",
  "[STEP 01] Repo / env sanity",
  "  - Branch / tag, pillars, RPC, hardware wallets are handled outside this script.",
  "",
  "[STEP 02] Config roles (owners/controllers)",
  "  adminGateOwner    = "    + (roles.adminGateOwner    // "<nil>"),
  "  updateGateOwner   = "    + (roles.updateGateOwner   // "<nil>"),
  "  configGateOwner   = "    + (roles.configGateOwner   // "<nil>"),
  "  treasuryOwner     = "    + (roles.treasuryOwner     // "<nil>"),
  "  opsTreasuryOwner  = "    + (roles.opsTreasuryOwner  // "<nil>"),
  "  rewardEngineOwner = "    + (roles.rewardEngineOwner // "<nil>"),
  "  validatorSetOwner = "    + (roles.validatorSetOwner // "<nil>"),
  "",
  "[STEP 03] Core wiring overview (high-level)",
  "  - Will deploy/wire:",
  "      UpdateGate, AdminGate, ConfigGate, ValidatorSet(mainnet),",
  "      VoidToken, VoidTreasury, OpsTreasury, RewardEngine.",
  "  - Control addresses pulled from the roles above.",
  "",
  "[STEP 04] Premine -> VoidTreasury plan",
  "  - Mint premine to staging/deployer as per script.",
  "  - Transfer 100% premine to VoidTreasury.",
  "",
  "[STEP 05] Validator set & stake plan",
  "  validators = " + ((vals | length) | tostring),
  (
    vals
    | to_entries[]
    | [
        "  [" + (.key | tostring) + "] id         = " + (.value.id           // "<empty>"),
        "      rewardAddr = " + (.value.rewardAddress // "<nil>"),
        "      stakeVOID  = " + ((.value.stakeVOID // "<nil>") | tostring)
      ]
    | .[]
  ),
  (
    "  total stakeVOID = " +
    (
      vals
      | map(.stakeVOID | tonumber)
      | add // 0
      | tostring
    )
  ),
  "",
  "[STEP 06] RewardEngine & claim() (conceptual)",
  "  - RewardEngine will be wired to VoidToken, VoidTreasury, ValidatorSet.",
  "  - Validators can claim rewards from their rewardAddress EOAs.",
  "",
  "[STEP 07] Tokenomics invariants (separate script)",
  "  - ops/void-mainnet-tokenomics-*-invariants.sh will verify:",
  "      * totalSupply",
  "      * Treasury / OpsTreasury / validator balances",
  "      * premine + emissions vs MAX_SUPPLY.",
  "",
  "[STEP 08] Genesis manifest (manual / scripted)",
  "  - After real bootstrap, capture:",
  "      * all deployed addresses",
  "      * all tx hashes / receipts",
  "      * hash of this config file",
  "      * git commit/tag used for contracts.",
  "",
  "=== END bootstrap dry-run ==="
' "$CFG"
