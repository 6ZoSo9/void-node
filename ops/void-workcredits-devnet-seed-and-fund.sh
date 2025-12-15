#!/usr/bin/env bash
set -euo pipefail

RPC="${RPC:-http://127.0.0.1:8545}"
STATE="${STATE:-$HOME/dev/void-node/docs/VOID-DEVNET-PROTOCOL-STATE.json}"
MM="${MM:-}"   # optional: set MM=0x... to fund metamask

jaddr () { jq -r "(.${1} | if type==\"object\" then .address else . end) // empty" "$STATE"; }

POOL="$(jaddr workCreditsPoolV1)"
VOID="$(jaddr voidToken)"
WCT="$(jaddr workCreditsToken)"

echo "RPC =$RPC"
echo "POOL=$POOL"
echo "VOID=$VOID"
echo "WCT =$WCT"
echo

# normalize DEVNET_DEPLOYER_KEY into a 0x + 64-hex private key for cast
: "${DEVNET_DEPLOYER_KEY:?DEVNET_DEPLOYER_KEY is not set in env}"
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
echo -n "VOID code-bytes="; c="$(cast code "$VOID" --rpc-url "$RPC")"; echo $(( (${#c}>2)?((${#c}-2)/2):0 ))
echo -n "WCT  code-bytes="; c="$(cast code "$WCT"  --rpc-url "$RPC")"; echo $(( (${#c}>2)?((${#c}-2)/2):0 ))
echo

bal () { cast call "$1" 'balanceOf(address)(uint256)' "$2" --rpc-url "$RPC"; }

echo "=== BEFORE ==="
echo -n "DEPLOYER VOID="; bal "$VOID" "$DEPLOYER"
echo -n "DEPLOYER WC  ="; bal "$WCT"  "$DEPLOYER"
echo -n "POOL    VOID="; bal "$VOID" "$POOL"
echo -n "POOL    WC  ="; bal "$WCT"  "$POOL"
echo

# if pool empty, seed it
POOL_VOID="$(bal "$VOID" "$POOL" | awk '{print $1}')"
POOL_WC="$(bal "$WCT" "$POOL"  | awk '{print $1}')"

if [ "${POOL_VOID}" = "0" ] && [ "${POOL_WC}" = "0" ]; then
  echo "=== SEED POOL ==="
  SEED_VOID="${SEED_VOID:-1000000000000000000000}"        # 1,000 VOID (18d)
  SEED_WC="${SEED_WC:-100000000000000000000000}"          # 100,000 WC (18d)

  cast send "$VOID" 'approve(address,uint256)(bool)' "$POOL" "$SEED_VOID" \
    --rpc-url "$RPC" --private-key "$DEVNET_DEPLOYER_PK_HEX" >/dev/null
  cast send "$WCT"  'approve(address,uint256)(bool)' "$POOL" "$SEED_WC" \
    --rpc-url "$RPC" --private-key "$DEVNET_DEPLOYER_PK_HEX" >/dev/null

  cast send "$POOL" 'seed(uint256,uint256)' "$SEED_VOID" "$SEED_WC" \
    --rpc-url "$RPC" --private-key "$DEVNET_DEPLOYER_PK_HEX" >/dev/null

  echo "[ok] seeded pool"
else
  echo "[skip] pool already non-empty; not seeding"
fi

# optional: fund MM
if [ -n "$MM" ]; then
  echo
  echo "=== FUND MM ($MM) ==="
  cast send "$VOID" 'transfer(address,uint256)(bool)' "$MM" 1000000000000000000000 \
    --rpc-url "$RPC" --private-key "$DEVNET_DEPLOYER_PK_HEX" >/dev/null
  cast send "$WCT"  'transfer(address,uint256)(bool)' "$MM" 100000000000000000000000 \
    --rpc-url "$RPC" --private-key "$DEVNET_DEPLOYER_PK_HEX" >/dev/null
  echo "[ok] funded MM"
fi

echo
echo "=== AFTER ==="
echo -n "DEPLOYER VOID="; bal "$VOID" "$DEPLOYER"
echo -n "DEPLOYER WC  ="; bal "$WCT"  "$DEPLOYER"
echo -n "POOL    VOID="; bal "$VOID" "$POOL"
echo -n "POOL    WC  ="; bal "$WCT"  "$POOL"
if [ -n "$MM" ]; then
  echo -n "MM      VOID="; bal "$VOID" "$MM"
  echo -n "MM      WC  ="; bal "$WCT"  "$MM"
fi
