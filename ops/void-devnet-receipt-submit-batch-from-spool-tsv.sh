#!/usr/bin/env bash
set -euo pipefail

SPOOL="${SPOOL:-docs/VOID-DEVNET-JOB-SPOOL.tsv}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
FUND_ETH="${FUND_ETH:-10ether}"  # only used if ADMIN_PRIVKEY is provided and sender has 0 balance

die(){ echo "[ERR] $*" >&2; exit 1; }
need(){ command -v "$1" >/dev/null 2>&1 || die "missing: $1"; }
key_ok(){ [[ "$1" =~ ^0x[0-9a-fA-F]{64}$ ]]; }

need cast
need jq

[[ -f "$SPOOL" ]] || die "missing SPOOL: $SPOOL"
[[ -n "${PRIVKEY:-}" ]] || die "PRIVKEY missing (export PRIVKEY=0x...)"
key_ok "$PRIVKEY" || die "PRIVKEY must be 0x + 64 hex chars (NO ellipsis). got: ${PRIVKEY:0:14}... len=${#PRIVKEY}"

[[ -x "./ops/void-devnet-receipt-submit-v2.sh" ]] || die "missing ./ops/void-devnet-receipt-submit-v2.sh"

FROM="$(cast wallet address --private-key "$PRIVKEY")"
BAL="$(cast balance "$FROM" --rpc-url "$RPC_URL")"

echo "[cfg] rpc=$RPC_URL"
echo "[cfg] spool=$SPOOL"
echo "[cfg] from=$FROM"
echo "[cfg] balance_wei=$BAL"

if [[ "$BAL" == "0" ]]; then
  if [[ -n "${ADMIN_PRIVKEY:-}" ]] && key_ok "${ADMIN_PRIVKEY:-}"; then
    echo "[do] sender has 0 balance; funding $FROM with $FUND_ETH (ADMIN_PRIVKEY provided)"
    cast send "$FROM" --value "$FUND_ETH" --private-key "$ADMIN_PRIVKEY" --rpc-url "$RPC_URL" >/dev/null
    BAL2="$(cast balance "$FROM" --rpc-url "$RPC_URL")"
    echo "[ok] balance_wei=$BAL2"
  else
    die "sender has 0 balance; fund it or provide ADMIN_PRIVKEY (0x + 64 hex) to auto-fund"
  fi
fi

ok=0; fail=0;

while IFS=$'\t' read -r job model inhash outhash; do
  [[ -n "${job:-}" ]] || continue
  [[ "$job" =~ ^0x[0-9a-fA-F]{64}$ ]] || { echo "[skip] bad jobId: $job"; continue; }

  echo "[tx] submit jobId=$job model=$model"
  if ./ops/void-devnet-receipt-submit-v2.sh "$job" "$model" "$inhash" "$outhash"; then
    ok=$((ok+1))
  else
    fail=$((fail+1))
  fi
done < "$SPOOL"

echo
echo "[done] ok=$ok fail=$fail"
