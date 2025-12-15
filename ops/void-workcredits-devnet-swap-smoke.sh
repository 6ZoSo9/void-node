#!/usr/bin/env bash
set -euo pipefail

RPC="${RPC:-http://127.0.0.1:8545}"
STATE="${STATE:-$HOME/dev/void-node/docs/VOID-DEVNET-PROTOCOL-STATE.json}"
MM="${MM:-}" # required

if [ -z "${MM}" ]; then
  echo "[FATAL] set MM=0x... (recipient address)"
  exit 1
fi

jaddr () { jq -r "(.${1} | if type==\"object\" then .address else . end) // empty" "$STATE"; }

POOL="$(jaddr workCreditsPoolV1)"
VOID="$(jaddr voidToken)"
WCT="$(jaddr workCreditsToken)"

echo "=== [wc-swap-smoke] rpc/state ==="
echo "RPC =$RPC"
echo "STATE=$STATE"
echo "POOL=$POOL"
echo "VOID=$VOID"
echo "WCT =$WCT"
echo "MM  =$MM"
echo

# normalize DEVNET_DEPLOYER_KEY into 0x + 64-hex for cast
: "${DEVNET_DEPLOYER_KEY:?DEVNET_DEPLOYER_KEY must be set (decimal or 0x-hex)}"
DEVNET_DEPLOYER_PK_HEX="$(
python3 - <<'PY'
import os, re
k=os.environ["DEVNET_DEPLOYER_KEY"].strip()
if k.startswith("0x"):
    h=k[2:]
    if not re.fullmatch(r"[0-9a-fA-F]{64}", h):
        raise SystemExit("DEVNET_DEPLOYER_KEY is 0x but not 32-byte hex")
    print("0x"+h.lower())
elif re.fullmatch(r"\d+", k):
    n=int(k,10)
    if n<=0: raise SystemExit("DEVNET_DEPLOYER_KEY decimal is <=0")
    print("0x"+format(n, "064x"))
else:
    raise SystemExit("DEVNET_DEPLOYER_KEY is neither 0x-hex nor decimal uint")
PY
)"
DEPLOYER="$(cast wallet address --private-key "$DEVNET_DEPLOYER_PK_HEX")"
echo "DEPLOYER=$DEPLOYER"
echo

# helpers
bal_raw () { cast call "$1" 'balanceOf(address)(uint256)' "$2" --rpc-url "$RPC" | awk '{print $1}'; }
pool_get () { cast call "$POOL" "$1" --rpc-url "$RPC" 2>/dev/null || true; }

echo "=== [pool getters sanity] ==="
echo "pool.voidToken = $(pool_get 'voidToken()(address)')"
echo "pool.wcToken   = $(pool_get 'wcToken()(address)')"
own="$(pool_get 'owner()(address)')"
adm="$(pool_get 'admin()(address)')"
if [[ "$own" =~ ^0x[0-9a-fA-F]{40}$ ]]; then
  echo "pool.owner     = $own"
elif [[ "$adm" =~ ^0x[0-9a-fA-F]{40}$ ]]; then
  echo "pool.admin     = $adm"
else
  echo "pool.owner/admin = <n/a> (getter not present; OK)"
fi
echo

IN_VOID="${IN_VOID:-1000000000000000000}"  # 1 VOID (1e18)
MIN_WC="${MIN_WC:-1}"                      # accept basically any output on devnet

echo "=== [before balances] ==="
D_VOID_BEFORE="$(bal_raw "$VOID" "$DEPLOYER")"
D_WC_BEFORE="$(bal_raw "$WCT"  "$DEPLOYER")"
MM_VOID_BEFORE="$(bal_raw "$VOID" "$MM")"
MM_WC_BEFORE="$(bal_raw "$WCT"  "$MM")"
P_VOID_BEFORE="$(bal_raw "$VOID" "$POOL")"
P_WC_BEFORE="$(bal_raw "$WCT"  "$POOL")"

echo "DEPLOYER VOID=$D_VOID_BEFORE"
echo "DEPLOYER WC  =$D_WC_BEFORE"
echo "MM      VOID=$MM_VOID_BEFORE"
echo "MM      WC  =$MM_WC_BEFORE"
echo "POOL    VOID=$P_VOID_BEFORE"
echo "POOL    WC  =$P_WC_BEFORE"
echo

echo "=== [approve VOID -> pool] ==="
cast send "$VOID" 'approve(address,uint256)(bool)' "$POOL" "$IN_VOID" \
  --rpc-url "$RPC" --private-key "$DEVNET_DEPLOYER_PK_HEX" >/dev/null
echo "[ok] approved"
echo

echo "=== [swap] swapVoidForWC(IN_VOID, MIN_WC, MM) ==="
cast send "$POOL" 'swapVoidForWC(uint256,uint256,address)' "$IN_VOID" "$MIN_WC" "$MM" \
  --rpc-url "$RPC" --private-key "$DEVNET_DEPLOYER_PK_HEX" >/dev/null
echo "[ok] swap sent"
echo

echo "=== [after balances] ==="
D_VOID_AFTER="$(bal_raw "$VOID" "$DEPLOYER")"
D_WC_AFTER="$(bal_raw "$WCT"  "$DEPLOYER")"
MM_VOID_AFTER="$(bal_raw "$VOID" "$MM")"
MM_WC_AFTER="$(bal_raw "$WCT"  "$MM")"
P_VOID_AFTER="$(bal_raw "$VOID" "$POOL")"
P_WC_AFTER="$(bal_raw "$WCT"  "$POOL")"

echo "DEPLOYER VOID=$D_VOID_AFTER"
echo "DEPLOYER WC  =$D_WC_AFTER"
echo "MM      VOID=$MM_VOID_AFTER"
echo "MM      WC  =$MM_WC_AFTER"
echo "POOL    VOID=$P_VOID_AFTER"
echo "POOL    WC  =$P_WC_AFTER"
echo

python3 - <<PY
DVB=int("$D_VOID_BEFORE"); DVA=int("$D_VOID_AFTER")
MWB=int("$MM_WC_BEFORE");  MWA=int("$MM_WC_AFTER")
PVB=int("$P_VOID_BEFORE"); PVA=int("$P_VOID_AFTER")
PWB=int("$P_WC_BEFORE");   PWA=int("$P_WC_AFTER")
print("=== [deltas] ===")
print("DEPLOYER VOID delta:", DVA - DVB)
print("MM WC delta        :", MWA - MWB)
print("POOL VOID delta    :", PVA - PVB)
print("POOL WC delta      :", PWA - PWB)
PY

echo
echo "[OK] swap smoke complete"
