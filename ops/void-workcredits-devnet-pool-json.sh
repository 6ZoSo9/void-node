#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
STATE_FILE="${STATE_FILE:-$ROOT/docs/VOID-DEVNET-PROTOCOL-STATE.json}"

need(){ command -v "$1" >/dev/null 2>&1 || { echo "{\"up\":0,\"error\":\"missing $1\"}"; exit 0; }; }
need jq; need cast; need python3

jget(){ jq -r "$1" "$STATE_FILE" 2>/dev/null || true; }

pick_addr(){
  local expr="$1"
  local v
  v="$(jget "$expr")"
  if [ -z "$v" ] || [ "$v" = "null" ]; then
    echo ""
  else
    echo "$v"
  fi
}

POOL_ADDR="${WC_POOL_ADDR:-$(pick_addr '
  .workCreditsPoolV1.address? // .workCreditsPoolV1? //
  .contracts.workCreditsPoolV1.address? // .contracts.workCreditsPoolV1? //
  .contracts.WorkCreditsPoolV1.address? // .contracts.WorkCreditsPoolV1? //
  empty
')}"

if [ -z "$POOL_ADDR" ]; then
  echo "{\"up\":0,\"error\":\"missing pool address in state\",\"state_file\":\"$STATE_FILE\"}"
  exit 0
fi

call1(){
  # best-effort: return first line only, silence errors
  cast call "$1" "$2" ${3:+$3} --rpc-url "$RPC_URL" 2>/dev/null | head -n 1 || true
}

VOID_TOKEN_ADDR="${VOID_TOKEN_ADDR:-$(call1 "$POOL_ADDR" 'voidToken()(address)')}"
WC_TOKEN_ADDR="${WC_TOKEN_ADDR:-$(call1 "$POOL_ADDR" 'wcToken()(address)')}"

# fallbacks if needed
if [ -z "$VOID_TOKEN_ADDR" ] || [ "$VOID_TOKEN_ADDR" = "0x0000000000000000000000000000000000000000" ]; then
  VOID_TOKEN_ADDR="$(pick_addr '.DEVNET_VOID_TOKEN // .voidToken.address? // .voidToken? // .contracts.VoidToken.address? // .contracts.voidToken.address? // empty')"
fi
if [ -z "$WC_TOKEN_ADDR" ] || [ "$WC_TOKEN_ADDR" = "0x0000000000000000000000000000000000000000" ]; then
  WC_TOKEN_ADDR="$(pick_addr '.workCreditsToken.address? // .workCreditsToken? // .contracts.WorkCreditsToken.address? // .contracts.workCreditsToken.address? // empty')"
fi

VOID_DEC="$(call1 "$VOID_TOKEN_ADDR" 'decimals()(uint8)')"
WC_DEC="$(call1 "$WC_TOKEN_ADDR" 'decimals()(uint8)')"
[ -z "$VOID_DEC" ] && VOID_DEC="18"
[ -z "$WC_DEC" ] && WC_DEC="18"

# reserves via ERC20 balanceOf(pool)
VOID_RAW="$(cast call "$VOID_TOKEN_ADDR" 'balanceOf(address)(uint256)' "$POOL_ADDR" --rpc-url "$RPC_URL" 2>/dev/null | head -n 1 || true)"
WC_RAW="$(cast call "$WC_TOKEN_ADDR" 'balanceOf(address)(uint256)' "$POOL_ADDR" --rpc-url "$RPC_URL" 2>/dev/null | head -n 1 || true)"

python3 - "$POOL_ADDR" "$VOID_TOKEN_ADDR" "$WC_TOKEN_ADDR" "$VOID_DEC" "$WC_DEC" "$VOID_RAW" "$WC_RAW" "$RPC_URL" "$STATE_FILE" <<'PY'
import sys, json, decimal, time, re

def parse_int(s: str) -> int:
    s = (s or "").strip()
    if not s or s == "null":
        return 0
    if s.startswith(("0x","0X")):
        return int(s, 16)
    try:
        return int(s, 10)
    except Exception:
        m = re.search(r'0x[0-9a-fA-F]+', s)
        if m: return int(m.group(0), 16)
        m = re.search(r'\d+', s)
        return int(m.group(0)) if m else 0

pool, void_tok, wc_tok, void_dec_s, wc_dec_s, void_raw_s, wc_raw_s, rpc, state = sys.argv[1:]
void_dec = int(parse_int(void_dec_s) or 18)
wc_dec = int(parse_int(wc_dec_s) or 18)
void_raw = parse_int(void_raw_s)
wc_raw = parse_int(wc_raw_s)

decimal.getcontext().prec = 60
D = decimal.Decimal
void = (D(void_raw) / (D(10) ** void_dec)) if void_dec >= 0 else D(void_raw)
wc   = (D(wc_raw)   / (D(10) ** wc_dec))   if wc_dec   >= 0 else D(wc_raw)

wc_per_void = (wc / void) if void != 0 else D(0)
void_per_wc = (void / wc) if wc != 0 else D(0)

def fmt(x: decimal.Decimal, places: int) -> str:
    if x == 0:
        return "0"
    q = x.quantize(D(10) ** -places)
    s = format(q, 'f')
    if '.' in s:
        s = s.rstrip('0').rstrip('.')
    return s or "0"

out = {
  "up": 1,
  "pool": {"address": pool},
  "tokens": {
    "void": {"address": void_tok, "decimals": void_dec},
    "wc":   {"address": wc_tok,   "decimals": wc_dec},
  },
  "reserves": {
    "void_raw": str(void_raw),
    "wc_raw":   str(wc_raw),
    "void": fmt(void, 6),
    "wc":   fmt(wc, 6),
  },
  "price": {
    "wc_per_void": fmt(wc_per_void, 6),
    "void_per_wc": fmt(void_per_wc, 9),
  },
  "meta": {
    "rpc_url": rpc,
    "state_file": state,
    "ts": int(time.time()),
  }
}
print(json.dumps(out, separators=(',',':')))
PY
