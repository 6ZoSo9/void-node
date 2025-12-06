#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
API_URL="${API_URL:-http://127.0.0.1:4100/workcredits/devnet/pool}"

cd "$ROOT"

echo "=== [wc-devnet-health] WorkCredits devnet pool health ==="
echo "[cfg] ROOT    = $ROOT"
echo "[cfg] API_URL = $API_URL"
echo

# Fetch JSON from the node HTTP endpoint
if ! json="$(curl --max-time 5 -fsS "$API_URL")"; then
  echo "[err] failed to GET $API_URL" >&2
  exit 1
fi

echo "=== [raw] pool JSON ==="
echo "$json" | jq '.'

# Parse fields
ok="$(echo "$json" | jq -r '.ok')"
chain="$(echo "$json" | jq -r '.chain')"
wc_per_void="$(echo "$json" | jq -r '.wcPerVoid')"
void_res="$(echo "$json" | jq -r '.voidReserveRaw')"
wc_res="$(echo "$json" | jq -r '.wcReserveRaw')"
liq2="$(echo "$json" | jq -r '.liquidity2AssetRaw')"
updated_at="$(echo "$json" | jq -r '.updatedAt')"

echo
echo "=== [parsed] summary ==="
printf 'ok            = %s\n' "$ok"
printf 'chain         = %s\n' "$chain"
printf 'wcPerVoid     = %s\n' "$wc_per_void"
printf 'voidReserve   = %s\n' "$void_res"
printf 'wcReserve     = %s\n' "$wc_res"
printf 'liquidity2Raw = %s\n' "$liq2"
printf 'updatedAt     = %s\n' "$updated_at"

now="$(date +%s)"
# updated_at is a float; round to integer seconds best-effort
updated_sec="$(printf '%.0f\n' "$updated_at" 2>/dev/null || printf '0\n')"

if [ "$updated_sec" -gt 0 ] 2>/dev/null; then
  age="$(( now - updated_sec ))"
else
  age="-1"
fi

echo "age_seconds   = $age"

echo
rc=0

if [ "$ok" != "true" ]; then
  echo "[fail] ok flag != true (ok=$ok)"
  rc=1
fi

if [ "$chain" != "devnet" ]; then
  echo "[fail] chain != devnet (chain=$chain)"
  rc=1
fi

if [ -z "$wc_per_void" ] || [ "$wc_per_void" = "null" ] || [ "$wc_per_void" = "0" ]; then
  echo "[fail] wcPerVoid looks invalid: '$wc_per_void'"
  rc=1
fi

# Require exporter/timer to have updated within the last 10 minutes
if [ "$age" -gt 600 ] 2>/dev/null; then
  echo "[fail] updatedAt is older than 600s (10m) – pool exporter/timer may be stale"
  rc=1
fi

if [ "$rc" -eq 0 ]; then
  echo "[RESULT] OK (WorkCredits devnet pool JSON healthy)"
else
  echo "[RESULT] BAD (WorkCredits devnet pool JSON failed checks)"
fi

exit "$rc"
