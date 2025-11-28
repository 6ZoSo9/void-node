#!/usr/bin/env bash
set -euo pipefail

# VOID mainnet bootstrap RUN script (DEV-ONLY v1)
#
# WARNING:
#   - This implementation is ONLY for dev/anvil rehearsal.
#   - It refuses to run unless:
#       * VOID_MAINNET_BOOTSTRAP_DEV=1
#       * RPC is local (127.0.0.1/localhost:8545)
#       * chainId == 2050
#
#   - It calls the existing dev bootstrap pipeline:
#       ops/void-mainnet-dev-bootstrap-full.sh
#
#   - It is NOT allowed to be used for real mainnet. When we get there,
#     we will add a separate, heavily gated mainnet path.
#
# Usage (dev only):
#   VOID_MAINNET_BOOTSTRAP_DEV=1 \
#   ./ops/void-mainnet-bootstrap-run.sh \
#     --config config/void-mainnet-bootstrap-dev.json \
#     --rpc    http://127.0.0.1:8545
#
# DO NOT point this at a real mainnet RPC.

CONFIG=""
RPC_URL=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --config)
      CONFIG="$2"
      shift 2
      ;;
    --rpc)
      RPC_URL="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: VOID_MAINNET_BOOTSTRAP_DEV=1 $0 --config <config.json> --rpc <rpc-url>"
      echo
      echo "DEV-ONLY implementation. It:"
      echo "  - Checks env + RPC safety"
      echo "  - Runs ops/void-mainnet-dev-bootstrap-full.sh"
      echo "  - Re-runs PLAN + SAFETY check afterwards"
      exit 0
      ;;
    *)
      echo "[ERROR] Unknown arg: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$CONFIG" ]]; then
  echo "[ERROR] --config is required" >&2
  exit 1
fi

if [[ -z "$RPC_URL" ]]; then
  echo "[ERROR] --rpc is required" >&2
  exit 1
fi

if [[ "${VOID_MAINNET_BOOTSTRAP_DEV:-0}" != "1" ]]; then
  echo "[FATAL] VOID_MAINNET_BOOTSTRAP_DEV=1 is required for this DEV-ONLY RUN script." >&2
  echo "[FATAL] This is a deliberate safety gate. Refusing to run." >&2
  exit 2
fi

# Very conservative RPC whitelist for dev.
case "$RPC_URL" in
  http://127.0.0.1:8545|http://localhost:8545)
    ;;
  *)
    echo "[FATAL] RPC_URL=$RPC_URL is not an allowed DEV RPC (must be 127.0.0.1:8545 or localhost:8545)." >&2
    echo "[FATAL] Refusing to run." >&2
    exit 2
    ;;
esac

if ! command -v cast >/dev/null 2>&1; then
  echo "[ERROR] cast (Foundry) not found on PATH." >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "[ERROR] jq not found on PATH." >&2
  exit 1
fi

if [[ ! -f "$CONFIG" ]]; then
  echo "[ERROR] config file not found: $CONFIG" >&2
  exit 1
fi

echo "=== VOID mainnet bootstrap RUN (DEV-ONLY v1) ==="
echo "[info] CONFIG = $CONFIG"
echo "[info] RPC    = $RPC_URL"
echo

echo "=== [SAFETY 1] Check RPC chainId ==="
set +e
CHAIN_ID_RPC=$(cast chain-id --rpc-url "$RPC_URL" 2>/tmp/void-mainnet-run-cast.err)
CAST_RC=$?
set -e

if [[ $CAST_RC -ne 0 ]]; then
  echo "[FATAL] cast chain-id failed against $RPC_URL" >&2
  echo "-------- cast stderr --------" >&2
  cat /tmp/void-mainnet-run-cast.err >&2 || true
  echo "-----------------------------" >&2
  exit 1
fi

echo "[info] rpc.chainId = $CHAIN_ID_RPC"
if [[ "$CHAIN_ID_RPC" != "2050" ]]; then
  echo "[FATAL] rpc.chainId != 2050. This DEV RUN is only allowed on chainId 2050 (anvil devnet)." >&2
  exit 2
fi
echo "[OK] rpc.chainId is 2050 (expected for dev rehearsal)."
echo

echo "=== [SAFETY 2] Pre-flight PLAN (read-only) ==="
set +e
./ops/void-mainnet-bootstrap-plan.sh \
  --config "$CONFIG" \
  --rpc    "$RPC_URL"
PLAN_RC=$?
set -e

if [[ $PLAN_RC -ne 0 ]]; then
  echo "[FATAL] PLAN script failed (exit code $PLAN_RC). Not running dev bootstrap." >&2
  exit 2
fi
echo "[OK] PLAN pre-flight succeeded."
echo

echo "=== [RUN] Executing dev bootstrap pipeline ==="
echo "[info] delegating to ops/void-mainnet-dev-bootstrap-full.sh"
echo "[info] NOTE: this script is already wired to use the dev config + anvil."
echo

./ops/void-mainnet-dev-bootstrap-full.sh

echo
echo "=== [POST] Re-run PLAN after dev bootstrap ==="
./ops/void-mainnet-bootstrap-plan.sh \
  --config "$CONFIG" \
  --rpc    "$RPC_URL"

echo
echo "=== [POST] Run SAFETY CHECK (PLAN + Prometheus) ==="
./ops/void-mainnet-bootstrap-safety-check.sh \
  --config "$CONFIG" \
  --rpc    "$RPC_URL"

echo
echo "=== DONE: DEV-ONLY bootstrap RUN completed successfully ==="
