#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: ops/void-mainnet-bootstrap-mainnet-broadcast.sh [--config PATH] [--rpc URL] [--prom-url URL]

This script is the FINAL STEP harness for VOID mainnet bootstrap.
It is designed to be run ONLY on the real VOID mainnet RPC, with
proper hardware wallets / keys connected and after all rehearsals
have passed.

Current behavior:
  - Re-runs SAFETY-MAINNET (MAINNET-LINT + MAINNET-DRYRUN + Prom gauges).
  - Prompts for an explicit confirmation string.
  - DOES NOT YET BROADCAST ANY TXs.
    The actual forge script broadcast call is a TODO you will wire
    once the mainnet environment and key wiring are fully ready.

Flags:
  --config PATH    Path to mainnet live config JSON
                   [default: config/void-mainnet-bootstrap-mainnet.live.json]
  --rpc URL        RPC URL to use for PLAN/DRYRUN/Safety
                   [default: http://127.0.0.1:8545]
  --prom-url URL   Prometheus base URL
                   [default: http://127.0.0.1:9090]
  -h, --help       Show this help and exit
EOF
}

CONFIG_DEFAULT="config/void-mainnet-bootstrap-mainnet.live.json"
RPC_DEFAULT="http://127.0.0.1:8545"
PROM_DEFAULT="http://127.0.0.1:9090"

CONFIG="$CONFIG_DEFAULT"
RPC="$RPC_DEFAULT"
PROM_URL="$PROM_DEFAULT"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --config)
      CONFIG="$2"
      shift 2
      ;;
    --rpc)
      RPC="$2"
      shift 2
      ;;
    --prom-url)
      PROM_URL="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "[ERROR] Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

echo "=== VOID mainnet bootstrap BROADCAST HARNESS (SKELETON) ==="
echo "[info] REPO      = $(pwd)"
echo "[info] BRANCH    = $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')"
echo "[info] CONFIG    = $CONFIG"
echo "[info] RPC       = $RPC"
echo "[info] PROM_URL  = $PROM_URL"
echo

if [[ ! -f "$CONFIG" ]]; then
  echo "[FATAL] Config file not found: $CONFIG" >&2
  exit 1
fi

echo "=== [STEP 1] Re-run SAFETY-MAINNET (LINT + DRYRUN + gauges) ==="
if [[ ! -x ops/void-mainnet-bootstrap-safety-mainnet.sh ]]; then
  echo "[FATAL] ops/void-mainnet-bootstrap-safety-mainnet.sh not found or not executable" >&2
  exit 1
fi

ops/void-mainnet-bootstrap-safety-mainnet.sh \
  --config "$CONFIG" \
  --rpc "$RPC" \
  --prom-url "$PROM_URL"

echo
echo "=== [STEP 2] SAFETY-MAINNET PASSED, interactive confirmation required ==="
cat <<'EOF'

You are about to run the REAL VOID mainnet bootstrap broadcast harness.

IMPORTANT:
  - This MUST only be run against the REAL VOID mainnet RPC.
  - The live config must contain REAL, non-dev, non-anvil addresses.
  - Hardware wallets / key guardians must be connected and verified.
  - You should have taken:
      * A Prometheus + Grafana snapshot
      * A full ops runbook checkpoint
      * Any required LUKS/hardware key backups

At this stage, this script DOES NOT YET CALL forge broadcast.
It is a skeleton harness that will be wired to the actual
Foundry script when we are ready for live mainnet.

To continue, type the exact phrase:
  I UNDERSTAND THIS WILL EVENTUALLY BROADCAST VOID MAINNET BOOTSTRAP

Anything else will abort.

EOF

read -r CONFIRM
if [[ "$CONFIRM" != "I UNDERSTAND THIS WILL EVENTUALLY BROADCAST VOID MAINNET BOOTSTRAP" ]]; then
  echo "[ABORT] Confirmation phrase mismatch; exiting without broadcasting." >&2
  exit 1
fi

echo
echo "=== [STEP 3] (TODO) forge script broadcast call ==="
cat <<'EOF'

TODO (to be wired when mainnet is truly ready):

  - Implement the Foundry script that performs the real mainnet bootstrap:
      script/VoidMainnetBootstrapMainnet.s.sol (example name)

  - The script should:
      * Read the same JSON config used above.
      * Deploy and wire:
          - UpdateGate, AdminGate, ConfigGate
          - ValidatorSet
          - VoidToken (VOID)
          - VoidTreasury
          - OpsTreasury
          - RewardEngine
      * Enforce tokenomics invariants at the end (PREMINE layout).

  - Then replace this TODO block with a guarded forge call, e.g.:

      forge script script/VoidMainnetBootstrapMainnet.s.sol:VoidMainnetBootstrapMainnet \
        --rpc-url "$RPC" \
        --broadcast \
        --sig "run(string)" "$CONFIG" \
        --slow

  - Additionally, we will likely:
      * Export tx hashes / receipt bundle to an audit file.
      * Emit Prometheus textfile gauges for bootstrap completion.
      * Tag the git repo with a ckpt-mainnet-bootstrap-LIVE-<timestamp> tag.

For now, this harness stops here on purpose so it is SAFE to run
during rehearsals without touching any chain state.

EOF

echo
echo "=== [DONE] Broadcast harness skeleton completed (no txs sent). ==="
