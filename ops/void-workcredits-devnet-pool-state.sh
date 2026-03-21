#!/usr/bin/env bash
set -euo pipefail

# Resolve repo root relative to this script, not $HOME
REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
cd "$REPO_ROOT"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
STATE_FILE="docs/VOID-DEVNET-PROTOCOL-STATE.json"

# Resolve VOID token from state first; only fall back if missing.
DEVNET_VOID_TOKEN="$(jq -r '.voidToken // .voidTokenWorkCredits // empty' "$STATE_FILE" 2>/dev/null || true)"
if [[ -z "$DEVNET_VOID_TOKEN" || "$DEVNET_VOID_TOKEN" == "null" ]]; then
  DEVNET_VOID_TOKEN="0x5FbDB2315678afecb367f032d93F642f64180aa3"
fi

# Locate cast for both zoso and root
CAST_BIN="${CAST_BIN:-$(command -v cast 2>/dev/null || true)}"
if [[ -z "$CAST_BIN" ]]; then
  # Fallback to your usual Foundry path
  CAST_BIN="/home/zoso/.foundry/bin/cast"
fi

if [[ ! -x "$CAST_BIN" ]]; then
  echo "[FATAL] cast binary not found or not executable. Tried: $CAST_BIN" >&2
  exit 1
fi

echo "=== [wc-devnet-pool-state] repo ==="
pwd
echo

echo "=== [wc-devnet-pool-state] RPC_URL ==="
echo "RPC_URL=$RPC_URL"
echo

echo "=== [wc-devnet-pool-state] CAST_BIN ==="
echo "CAST_BIN=$CAST_BIN"
echo

if [[ ! -f "$STATE_FILE" ]]; then
  echo "[FATAL] missing $STATE_FILE; cannot read WorkCredits devnet state" >&2
  exit 1
fi

echo "=== [wc-devnet-pool-state] reading WC + pool addresses from $STATE_FILE ==="

WC_TOKEN_ADDR="$(jq -r '.workCreditsToken // empty' "$STATE_FILE")"
POOL_ADDR="$(jq -r '.workCreditsPoolV1 // empty' "$STATE_FILE")"

if [[ -z "$WC_TOKEN_ADDR" || "$WC_TOKEN_ADDR" == "null" ]]; then
  echo "[FATAL] workCreditsToken missing/null in $STATE_FILE" >&2
  exit 1
fi

if [[ -z "$POOL_ADDR" || "$POOL_ADDR" == "null" ]]; then
  echo "[FATAL] workCreditsPoolV1 missing/null in $STATE_FILE" >&2
  exit 1
fi

echo "VoidToken          = $DEVNET_VOID_TOKEN"
echo "WorkCreditsToken   = $WC_TOKEN_ADDR"
echo "WorkCreditsPoolV1  = $POOL_ADDR"
echo

echo "=== [wc-devnet-pool-state] querying ERC20 balances for pool ==="

VOID_RES_RAW="$("$CAST_BIN" call "$DEVNET_VOID_TOKEN" 'balanceOf(address)(uint256)' "$POOL_ADDR" --rpc-url "$RPC_URL" | awk '{print $1}')"
WC_RES_RAW="$("$CAST_BIN" call "$WC_TOKEN_ADDR" 'balanceOf(address)(uint256)' "$POOL_ADDR" --rpc-url "$RPC_URL" | awk '{print $1}')"

echo "voidReserveRaw (VOID, 18-dec) = $VOID_RES_RAW"
echo "wcReserveRaw   (WC,   18-dec) = $WC_RES_RAW"
echo

# Compute rough integer ratios using node BigInt
command -v node >/dev/null 2>&1 || {
  echo "=== [wc-devnet-pool-state] node not found; ratios default to 0 ==="
  echo "VOID_per_WC = 0"
  echo "WC_per_VOID = 0"
  echo
  echo "=== [wc-devnet-pool-state] summary ==="
  echo "Use WC_per_VOID for the Trading View price:"
  echo "  - Interpret WC_per_VOID as: how many WC for 1 VOID."
  echo "  - Interpret VOID_per_WC as: how many VOID for 1 WC."
  exit 0
}

echo "=== [wc-devnet-pool-state] computing rough price ratios (using node BigInt) ==="

RATIOS="$(node - "$VOID_RES_RAW" "$WC_RES_RAW" <<'EOF'
const [,, voidRes, wcRes] = process.argv;

const v = BigInt(voidRes);
const w = BigInt(wcRes);

let voidPerWc = "0";
let wcPerVoid = "0";

if (w !== 0n) {
  voidPerWc = (v / w).toString();
}
if (v !== 0n) {
  wcPerVoid = (w / v).toString();
}

console.log("VOID_per_WC = " + voidPerWc);
console.log("WC_per_VOID = " + wcPerVoid);
EOF
)"

printf '%s\n' "$RATIOS"
echo

echo "=== [wc-devnet-pool-state] summary ==="
echo "Use WC_per_VOID for the Trading View price:"
echo "  - Interpret WC_per_VOID as: how many WC for 1 VOID."
echo "  - Interpret VOID_per_WC as: how many VOID for 1 WC."
