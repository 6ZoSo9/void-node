#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$HOME/dev/void-node}"
API_URL="${API_URL:-http://127.0.0.1:4100/workcredits/devnet/pool}"

SIDE="${1:-}"
AMOUNT="${2:-}"

if [[ -z "${SIDE}" || -z "${AMOUNT}" ]]; then
  echo "Usage: $(basename "$0") <void_to_wc|wc_to_void> <amount>" >&2
  echo "  example: $(basename "$0") void_to_wc 10   # pay 10 VOID, get WC" >&2
  echo "           $(basename "$0") wc_to_void 5    # pay 5 WC, get VOID" >&2
  exit 1
fi

if [[ "${SIDE}" != "void_to_wc" && "${SIDE}" != "wc_to_void" ]]; then
  echo "[ERR] side must be one of: void_to_wc, wc_to_void" >&2
  exit 1
fi

echo "=== WorkCredits devnet quote ==="
echo "[cfg] API_URL = ${API_URL}"
echo "[cfg] side    = ${SIDE}"
echo "[cfg] amount  = ${AMOUNT}"

POOL_JSON="$(curl -fsS "${API_URL}")" || { echo "[ERR] failed to fetch pool JSON" >&2; exit 1; }

OK="$(printf '%s' "${POOL_JSON}" | jq -r '.ok // empty')"
CHAIN="$(printf '%s' "${POOL_JSON}" | jq -r '.chain // empty')"

if [[ "${OK}" != "true" ]]; then
  echo "[ERR] pool JSON .ok != true (got: ${OK})" >&2
  printf '%s\n' "${POOL_JSON}" >&2
  exit 1
fi

if [[ "${CHAIN}" != "devnet" ]]; then
  echo "[ERR] expected chain=devnet, got: ${CHAIN}" >&2
  exit 1
fi

echo
echo "[raw] pool JSON:"
printf '%s\n' "${POOL_JSON}" | jq

echo
echo "[calc] quote (constant-product, no fee for now):"
printf '%s\n' "${POOL_JSON}" | jq -r --arg side "${SIDE}" --arg amount "${AMOUNT}" '
  . as $p
  | ($p.voidReserveRaw | tonumber / 1e18) as $Rv        # VOID reserve (human)
  | ($p.wcReserveRaw   | tonumber / 1e18) as $Rw        # WC reserve (human)
  | ($amount | tonumber) as $dx                         # amount in (human)
  | ($Rv * $Rw) as $k                                   # constant product
  | if $side == "void_to_wc" then
      # pay $dx VOID, receive WC
      ($Rv + $dx) as $Rv2
      | ($k / $Rv2) as $Rw2
      | ($Rw - $Rw2) as $dy
      | {
          side: "void_to_wc",
          in_void: $dx,
          out_wc: $dy,
          price_before_wc_per_void: ($Rw / $Rv),
          price_after_wc_per_void: ($Rw2 / $Rv2),
          price_impact_pct: ((($Rw / $Rv) - ($Rw2 / $Rv2)) / ($Rw / $Rv) * 100.0)
        }
    elif $side == "wc_to_void" then
      # pay $dx WC, receive VOID
      ($Rw + $dx) as $Rw2
      | ($k / $Rw2) as $Rv2
      | ($Rv - $Rv2) as $dy
      | {
          side: "wc_to_void",
          in_wc: $dx,
          out_void: $dy,
          price_before_void_per_wc: ($Rv / $Rw),
          price_after_void_per_wc: ($Rv2 / $Rw2),
          price_impact_pct: ((($Rv / $Rw) - ($Rv2 / $Rw2)) / ($Rv / $Rw) * 100.0)
        }
    else
      {
        error: "unsupported side",
        side: $side
      }
    end
'
