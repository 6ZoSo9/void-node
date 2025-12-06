#!/usr/bin/env bash
set -euo pipefail

# VOID WorkCredits devnet pool seed stub
#
# This script DOES NOT broadcast any transactions yet.
# It reads the devnet WorkCredits state JSON and prints a human-readable plan.
#
# Later, we will wire this into:
#   - WorkCreditsDevnetDeploy.s.sol
#   - Or direct pool contract calls via cast/forge
#
# For now, it is a stub with a clear fatal exit, similar to the mainnet broadcast skeleton.

ROOT="${ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
STATE_JSON="${STATE_JSON:-"$ROOT/docs/VOID-WORKCREDITS-DEVNET-STATE.json"}"

echo "=== [workcredits-devnet-seed] VOID WorkCredits devnet pool seed stub ==="
echo "[cfg] ROOT       = $ROOT"
echo "[cfg] STATE_JSON = $STATE_JSON"

if [[ ! -f "$STATE_JSON" ]]; then
  echo "[fatal] state JSON not found at $STATE_JSON" >&2
  echo "        Create it via docs/VOID-WORKCREDITS-DEVNET-STATE.json first." >&2
  exit 1
fi

# jq is already in use elsewhere in this repo; assume it's available.
chain=$(jq -r '.chain' "$STATE_JSON")
rpc_url=$(jq -r '.rpc_url' "$STATE_JSON")
void_reserve_raw=$(jq -r '.void_reserve_raw' "$STATE_JSON")
wc_reserve_raw=$(jq -r '.wc_reserve_raw' "$STATE_JSON")
pool_address=$(jq -r '.pool_address // empty' "$STATE_JSON")

echo
echo "=== [1] parsed state JSON ==="
echo "[state] chain            = ${chain:-<unset>}"
echo "[state] rpc_url          = ${rpc_url:-<unset>}"
echo "[state] pool_address     = ${pool_address:-<unset>}"
echo "[state] void_reserve_raw = ${void_reserve_raw:-<unset>}"
echo "[state] wc_reserve_raw   = ${wc_reserve_raw:-<unset>}"

if [[ -z "$pool_address" || "$pool_address" == "0x0000000000000000000000000000000000000000" ]]; then
  echo
  echo "[warn] pool_address is empty or zero in $STATE_JSON"
  echo "       - For now, this script is a stub. When the WC/VOID pool is deployed on devnet,"
  echo "         add its address under .pool_address in the JSON."
fi

echo
echo "=== [2] planned seed action (conceptual) ==="
echo "  - Network   : $chain"
echo "  - RPC URL   : $rpc_url"
echo "  - Pool      : ${pool_address:-<unknown>}"
echo "  - Seed VOID : $void_reserve_raw (raw 18-dec)"
echo "  - Seed WC   : $wc_reserve_raw (raw 18-dec)"
echo
echo "In the future, this script will:"
echo "  1) Ensure devnet is running at \$rpc_url (chainId 2050)."
echo "  2) Ensure the WC/VOID pool contract is deployed at pool_address."
echo "  3) Use a funded devnet key to:"
echo "       - Approve the pool to move the seed VOID/WC."
echo "       - Call the pool's add-liquidity/seed function."
echo "  4) Update docs/VOID-WORKCREDITS-DEVNET-STATE.json and metrics accordingly."
echo
echo "For now, this is a NO-OP stub. No transactions will be sent."

echo
echo "[fatal] NOT_IMPLEMENTED_DEVNET_STUB: seeding logic is not wired yet." >&2
exit 1
