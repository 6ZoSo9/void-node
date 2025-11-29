#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
CONFIG_PATH="${1:-config/void-mainnet-bootstrap-mainnet.live.json}"

echo "=== [mainnet-bootstrap-plan-run] VOID mainnet PLAN dry-run (NO BROADCAST) ==="
echo "[cfg] REPO_ROOT   = $REPO_ROOT"
echo "[cfg] CONFIG_PATH = $CONFIG_PATH"
echo

cd "$REPO_ROOT"

if [ ! -f "$CONFIG_PATH" ]; then
  echo "[FATAL] config file not found: $CONFIG_PATH" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "[FATAL] jq is required for plan-run but not found in PATH" >&2
  exit 1
fi

echo "=== [0] basic config view ==="
CHAIN_ID="$(jq -r '.chainId' "$CONFIG_PATH" 2>/dev/null || echo "")"
echo "  chainId : ${CHAIN_ID:-<missing>}"
echo

echo "=== [1] roles (from .roles) ==="
jq -r '
  .roles // {}
  | {
      deployer,
      treasuryAdmin,
      opsTreasuryAdmin,
      validatorAdmin,
      adminGateOwner,
      updateGateOwner,
      configGateOwner,
      treasuryOwner,
      opsTreasuryOwner,
      rewardEngineOwner,
      validatorSetOwner
    }
  | to_entries[]
  | "  " + (.key | tostring) + " : " +
    (if .value == null then "<missing>" else (.value | tostring) end)
' "$CONFIG_PATH"
echo

echo "=== [2] contracts (from .contracts) ==="
jq -r '
  .contracts // {}
  | {
      updateGate,
      adminGate,
      configGate,
      validatorSet,
      voidToken,
      premineVault,
      treasury,
      voidTreasury,
      opsTreasury,
      rewardEngine
    }
  | to_entries[]
  | "  " + (.key | tostring) + " : " +
    (if .value == null then "<missing>" else (.value | tostring) end)
' "$CONFIG_PATH"
echo

echo "=== [3] validator0 (from .validator0) ==="
jq -r '
  .validator0 // {}
  | {
      reward,
      consensusKey,
      stakeVOID
    }
  | to_entries[]
  | "  " + (.key | tostring) + " : " +
    (if .value == null then "<missing>" else (.value | tostring) end)
' "$CONFIG_PATH"
echo

echo "=== [4] PLAN health snapshot (PromQL hints) ==="
cat <<'EOF'
  The following metrics are expected to gate readiness:

    - void:mainnet_bootstrap_plan:health:last_5m
    - void:mainnet_pillars:health:last_5m
    - void:mainnet_lastmile:health:last_5m
    - void_safeboot_overall_health
    - void:mainnet_overall:health:last_5m_v2 (informational)

  For a quick check, you can run:

    ./ops/void-mainnet-health-all.sh
    ./ops/void-mainnet-bootstrap-plan-all.sh

EOF

echo "=== [5] Conceptual bootstrap sequence (PLAN ONLY, no tx) ==="
cat <<'EOF'
  This script is a PLAN dry-run only. It does NOT broadcast any transactions.
  It is meant to be used with a fully-populated *.live.json sitting on an
  encrypted medium (LUKS + hardware wallets).

  A real mainnet bootstrap (once implemented) will roughly follow:

    [A] Pre-flight checks
      1) Confirm chainId in config matches runtime (2050).
      2) Confirm:
           - void:mainnet_pillars:health:last_5m == 1
           - void:mainnet_lastmile:health:last_5m == 1
           - void:mainnet_bootstrap_plan:health:last_5m == 1
           - void_safeboot_overall_health == 1
      3) Confirm all .roles.* are non-zero and mapped to correct key tiers.
      4) Confirm .contracts.* addresses and validator0 fields are all set.

    [B] Governance / Gates wiring (one-time)
      5) Ensure UpdateGate, AdminGate, ConfigGate are deployed and owned by:
           - adminGateOwner
           - updateGateOwner
           - configGateOwner
      6) Ensure UpdateGate signer set (M-of-N) matches the intended governance group.
      7) Ensure ConfigGate / AdminGate policies match v99 freeze + Vector 7 guardrails.

    [C] Treasury / Token wiring
      8) Ensure VoidToken total supply and tokenomics match the locked spec:
           - MAX_SUPPLY  = 666,666,666 VOID
           - PREMINE     = 333,333,333 VOID
           - EMISSIONS   = 333,333,333 VOID over 4 eras
      9) Move premine into VoidTreasury (once) via the premine one-shot key.
     10) Wire Treasury and OpsTreasury roles:
           - treasuryAdmin / treasuryOwner
           - opsTreasuryAdmin / opsTreasuryOwner
     11) Ensure RewardEngine is pointed at VoidTreasury/OpsTreasury as designed.

    [D] Validator set initial wiring
     12) Register validator0 with:
           - reward address
           - consensusKey (BLS/ed25519/etc, depending on final design)
           - stakeVOID (numeric)
     13) Ensure validator set params (min stake, slashing rules, etc.) match spec.

    [E] Post-bootstrap invariants
     14) Re-run tokenomics + rewards invariants (forge tests or on-chain checks).
     15) Re-run devnet/mainnet pillars and mainnet-health-all (PromQL).
     16) Tag the bootstrap as completed and retire the premine key.

  The actual "do the thing on mainnet" script (with --broadcast) will be a separate,
  highly-audited tool. This PLAN runner never touches RPC state and is safe to run
  on development machines and CI to verify that the config + roles + contracts view
  is coherent before any real broadcast happens.

EOF

echo "=== [mainnet-bootstrap-plan-run] DONE (PLAN-only, no broadcast) ==="
