#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
cd "$REPO_ROOT"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
STATE_FILE="docs/VOID-DEVNET-PROTOCOL-STATE.json"

# This is the devnet VoidToken address we already use elsewhere (anvil-2050).
DEVNET_VOID_TOKEN="0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6"

echo "=== [wc-devnet-pool-state] repo ==="
pwd
echo
echo "=== [wc-devnet-pool-state] RPC_URL ==="
echo "RPC_URL=${RPC_URL}"
echo

if [ ! -f "${STATE_FILE}" ]; then
  echo "[FATAL] ${STATE_FILE} not found; run devnet bootstrap + WC deploy first."
  exit 1
fi

echo "=== [wc-devnet-pool-state] reading WC + pool addresses from ${STATE_FILE} ==="
WC_TOKEN_ADDR="$(jq -r '.workCreditsToken // empty' "${STATE_FILE}")"
POOL_ADDR="$(jq -r '.workCreditsPoolV1 // empty' "${STATE_FILE}")"

if [ -z "${WC_TOKEN_ADDR}" ] || [ "${WC_TOKEN_ADDR}" = "null" ]; then
  echo "[FATAL] workCreditsToken missing in ${STATE_FILE}"
  exit 1
fi
if [ -z "${POOL_ADDR}" ] || [ "${POOL_ADDR}" = "null" ]; then
  echo "[FATAL] workCreditsPoolV1 missing in ${STATE_FILE}"
  exit 1
fi

echo "VoidToken          = ${DEVNET_VOID_TOKEN}"
echo "WorkCreditsToken   = ${WC_TOKEN_ADDR}"
echo "WorkCreditsPoolV1  = ${POOL_ADDR}"
echo

echo "=== [wc-devnet-pool-state] querying ERC20 balances for pool ==="
VOID_RES_RAW="$(cast call "${DEVNET_VOID_TOKEN}" \
  "balanceOf(address)(uint256)" \
  "${POOL_ADDR}" \
  --rpc-url "${RPC_URL}" | awk '{print $1}')"

WC_RES_RAW="$(cast call "${WC_TOKEN_ADDR}" \
  "balanceOf(address)(uint256)" \
  "${POOL_ADDR}" \
  --rpc-url "${RPC_URL}" | awk '{print $1}')"

echo "voidReserveRaw (VOID, 18-dec) = ${VOID_RES_RAW}"
echo "wcReserveRaw   (WC,   18-dec) = ${WC_RES_RAW}"
echo

if ! command -v node >/dev/null 2>&1; then
  echo "[WARN] node not found; skipping price ratio computation."
  echo "       Use the raw reserves above (both 18 decimals) for manual math."
  exit 0
fi

echo "=== [wc-devnet-pool-state] computing rough price ratios (using node BigInt) ==="
RATIOS="$(node - "${VOID_RES_RAW}" "${WC_RES_RAW}" <<'NODE'
const [voidRaw, wcRaw] = process.argv.slice(2);
const voidRes = BigInt(voidRaw);
const wcRes   = BigInt(wcRaw);

if (voidRes === 0n || wcRes === 0n) {
  console.log("VOID_per_WC = NaN (one or both reserves are zero)");
  console.log("WC_per_VOID = NaN (one or both reserves are zero)");
  process.exit(0);
}

const SCALE = 1_000_000n; // 6 decimal places for display

const voidPerWcScaled = voidRes * SCALE / wcRes; // VOID per 1 WC
const wcPerVoidScaled = wcRes * SCALE / voidRes; // WC per 1 VOID

const VOID_per_WC  = Number(voidPerWcScaled) / 1_000_000;
const WC_per_VOID  = Number(wcPerVoidScaled) / 1_000_000;

console.log("VOID_per_WC = " + VOID_per_WC.toString());
console.log("WC_per_VOID = " + WC_per_VOID.toString());
NODE
)"

printf '%s\n' "${RATIOS}"

echo
echo "=== [wc-devnet-pool-state] summary ==="
echo "Use WC_per_VOID for the Trading View price:"
echo "  - Interpret WC_per_VOID as: how many WC for 1 VOID."
echo "  - Interpret VOID_per_WC as: how many VOID for 1 WC."
