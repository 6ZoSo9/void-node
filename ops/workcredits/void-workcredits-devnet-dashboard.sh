#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

MARKET_JSON="$("$ROOT/ops/workcredits/void-workcredits-devnet-market-json.sh")"

chain="$(printf '%s\n' "$MARKET_JSON" | jq -r '.chain')"
up_last_1m="$(printf '%s\n' "$MARKET_JSON" | jq -r '.up_last_1m')"
has_liquidity_last_1m="$(printf '%s\n' "$MARKET_JSON" | jq -r '.has_liquidity_last_1m')"
void_reserve_raw="$(printf '%s\n' "$MARKET_JSON" | jq -r '.void_reserve_raw')"
wc_reserve_raw="$(printf '%s\n' "$MARKET_JSON" | jq -r '.wc_reserve_raw')"
wc_per_void="$(printf '%s\n' "$MARKET_JSON" | jq -r '.wc_per_void')"
void_per_wc="$(printf '%s\n' "$MARKET_JSON" | jq -r '.void_per_wc')"

echo "=== WorkCredits devnet Trading View (CLI) ==="
echo "chain                 : $chain"
echo "exporter up_last_1m   : $up_last_1m"
echo "has_liquidity_last_1m : $has_liquidity_last_1m"
echo
echo "pool reserves (18-dec):"
echo "  VOID reserve raw    : $void_reserve_raw"
echo "  WC reserve raw      : $wc_reserve_raw"
echo
echo "spot prices:"
echo "  WC per 1 VOID       : $wc_per_void"
echo "  VOID per 1 WC       : $void_per_wc"
echo

# Sample quotes for future UI buttons
quote_void_1="$("$ROOT/ops/workcredits/void-workcredits-devnet-trade-preview.sh" void 1)"
quote_void_100="$("$ROOT/ops/workcredits/void-workcredits-devnet-trade-preview.sh" void 100)"
quote_wc_100="$("$ROOT/ops/workcredits/void-workcredits-devnet-trade-preview.sh" wc 100)"
quote_wc_1000="$("$ROOT/ops/workcredits/void-workcredits-devnet-trade-preview.sh" wc 1000)"

echo "sample quotes (for Obelisk UI wiring):"
echo
echo "  [void -> wc] spend 1 VOID:"
printf '    %s\n' "$(printf '%s\n' "$quote_void_1" | jq -c '{side,amount_in_void,est_wc_out,price_wc_per_void_after}')"
echo
echo "  [void -> wc] spend 100 VOID:"
printf '    %s\n' "$(printf '%s\n' "$quote_void_100" | jq -c '{side,amount_in_void,est_wc_out,price_wc_per_void_after}')"
echo
echo "  [wc -> void] spend 100 WC:"
printf '    %s\n' "$(printf '%s\n' "$quote_wc_100" | jq -c '{side,amount_in_wc,est_void_out,price_void_per_wc_after}')"
echo
echo "  [wc -> void] spend 1000 WC:"
printf '    %s\n' "$(printf '%s\n' "$quote_wc_1000" | jq -c '{side,amount_in_wc,est_void_out,price_void_per_wc_after}')"
echo

echo "--- raw market JSON (for Obelisk backend) ---"
printf '%s\n' "$MARKET_JSON"
