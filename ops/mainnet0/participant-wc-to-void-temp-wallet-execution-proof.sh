#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand 2>/dev/null || true

cd "${VOID_REPO:-$HOME/dev/void-node}"

RPC="${RPC:-http://127.0.0.1:8545}"
BASE="${BASE:-http://127.0.0.1:4100}"
AMOUNT="${AMOUNT:-1}"
MINT_WC="${MINT_WC:-5}"
DEPLOYER_PK="${WC_DEVNET_DEPLOYER_PK:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

ACCOUNT="wc-proof-$(date +%Y%m%d-%H%M%S)"
PASS="temp-proof-passphrase-$(date +%s)-$RANDOM"
STATE=".runtime/mainnet0/wc-devnet-local/current/docs/VOID-DEVNET-PROTOCOL-STATE.json"

echo "=== participant temp wallet WC -> VOID execution proof ==="
echo "mutation_scope=local_8545_devnet_only"
echo "real_wallet_used=false"
echo "account=$ACCOUNT"
echo "amount_wc=$AMOUNT"

test -s "$STATE" || { echo "[ERR] missing WC devnet protocol state: $STATE" >&2; exit 1; }

WC_TOKEN="$(python3 -c 'import json; print(json.load(open("'"$STATE"'"))["workCreditsToken"])')"
VOID_TOKEN="$(python3 -c 'import json; print(json.load(open("'"$STATE"'"))["voidToken"])')"

echo "wc_token=$WC_TOKEN"
echo "void_token=$VOID_TOKEN"

echo
echo "=== [1] local 2050 chain + node ready ==="
CHAIN_ID="$(cast chain-id --rpc-url "$RPC" 2>/dev/null || true)"
echo "chain_id=$CHAIN_ID"
test "$CHAIN_ID" = "2050"

curl -fsS --max-time 8 "$BASE/__void/ready.json" > "$TMP/ready.json"
cat "$TMP/ready.json"
python3 - "$TMP/ready.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap",-1)) == 0, j
assert int(j.get("txroot_live",0)) == 1, j
print("[ok] ready/gap/txroot")
PY

echo
echo "=== [2] create temp proof wallet without printing private key ==="
cast wallet new > "$TMP/wallet.txt"
WALLET="$(grep -E '^Address:' "$TMP/wallet.txt" | awk '{print $2}')"
PK="$(grep -E '^Private key:' "$TMP/wallet.txt" | awk '{print $3}')"
test -n "$WALLET"
test -n "$PK"
echo "temp_wallet=$WALLET"

echo
echo "=== [3] import/unlock temp wallet through participant native route ==="
python3 - "$ACCOUNT" "$PASS" "$PK" > "$TMP/import.body.json" <<'PY'
import json, sys
print(json.dumps({"account":sys.argv[1],"passphrase":sys.argv[2],"private_key":sys.argv[3]}))
PY

curl -fsS --max-time 8 -X POST "$BASE/__void/participant/wallet/import" \
  -H 'content-type: application/json' \
  --data-binary @"$TMP/import.body.json" > "$TMP/import.json"

python3 - "$TMP/import.json" "$ACCOUNT" "$WALLET" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
acct=sys.argv[2]
wallet=sys.argv[3].lower()
assert j.get("ok") is True, j
assert j.get("imported") is True, j
assert j.get("unlocked") is True, j
assert j.get("account") == acct, j
assert str(j.get("address","")).lower() == wallet, j
print("[ok] temp wallet imported/unlocked")
PY

rm -f "$TMP/import.body.json"

echo
echo "=== [4] fund local devnet gas + mint local devnet WC ==="
cast rpc --rpc-url "$RPC" anvil_setBalance "$WALLET" "0xde0b6b3a7640000" >/dev/null

MINT_RAW="$(cast to-wei "$MINT_WC" ether)"
cast send "$WC_TOKEN" "mint(address,uint256)" "$WALLET" "$MINT_RAW" \
  --rpc-url "$RPC" \
  --private-key "$DEPLOYER_PK" >/tmp/wc-temp-mint-tx.json 2>&1

GAS_WEI="$(cast balance --rpc-url "$RPC" "$WALLET")"
WC_BEFORE="$(cast call "$WC_TOKEN" "balanceOf(address)(uint256)" "$WALLET" --rpc-url "$RPC" | awk '{print $1}')"
VOID_BEFORE="$(cast call "$VOID_TOKEN" "balanceOf(address)(uint256)" "$WALLET" --rpc-url "$RPC" | awk '{print $1}')"

echo "gas_wei=$GAS_WEI"
echo "wc_before_raw=$WC_BEFORE"
echo "void_before_raw=$VOID_BEFORE"
test "$GAS_WEI" != "0"
test "$WC_BEFORE" != "0"

echo
echo "=== [5] execute native wallet WC -> VOID trade ==="
python3 - "$ACCOUNT" "$AMOUNT" "$WALLET" > "$TMP/trade.body.json" <<'PY'
import json, sys
print(json.dumps({"account":sys.argv[1],"amount":float(sys.argv[2]),"wallet":sys.argv[3]}))
PY

HTTP="$(curl -sS -o "$TMP/trade.json" -w '%{http_code}' \
  -X POST "$BASE/__void/participant/wallet/trade/wc-to-void" \
  -H 'content-type: application/json' \
  --data-binary @"$TMP/trade.body.json" || true)"

echo "trade_http=$HTTP"
cat "$TMP/trade.json"
echo

python3 - "$TMP/trade.json" "$ACCOUNT" "$WALLET" <<'PY'
import json, re, sys
j=json.load(open(sys.argv[1]))
acct=sys.argv[2]
wallet=sys.argv[3].lower()
assert j.get("ok") is True, j
assert j.get("sent") is True, j
assert j.get("mode") == "participant_wallet_native_wc_to_void", j
assert j.get("account") == acct, j
assert str(j.get("wallet","")).lower() == wallet, j
assert re.fullmatch(r"0x[a-fA-F0-9]{64}", str(j.get("approve_tx_hash",""))), j
assert re.fullmatch(r"0x[a-fA-F0-9]{64}", str(j.get("swap_tx_hash",""))), j
assert float(j.get("quote",{}).get("quoted_void") or 0) > 0, j
print("[ok] native wallet trade returned approve/swap tx hashes")
print("quoted_void=" + str(j.get("quote",{}).get("quoted_void")))
print("approve_tx_hash=" + str(j.get("approve_tx_hash")))
print("swap_tx_hash=" + str(j.get("swap_tx_hash")))
PY

echo
echo "=== [6] verify balances changed ==="
WC_AFTER="$(cast call "$WC_TOKEN" "balanceOf(address)(uint256)" "$WALLET" --rpc-url "$RPC" | awk '{print $1}')"
VOID_AFTER="$(cast call "$VOID_TOKEN" "balanceOf(address)(uint256)" "$WALLET" --rpc-url "$RPC" | awk '{print $1}')"

echo "wc_after_raw=$WC_AFTER"
echo "void_after_raw=$VOID_AFTER"

python3 - "$WC_BEFORE" "$WC_AFTER" "$VOID_BEFORE" "$VOID_AFTER" <<'PY'
import sys
wc_before, wc_after, void_before, void_after = map(int, sys.argv[1:])
assert wc_after < wc_before, (wc_before, wc_after)
assert void_after > void_before, (void_before, void_after)
print("[ok] WC decreased and VOID increased")
PY

echo
echo "=== [7] lock temp wallet ==="
python3 - "$ACCOUNT" > "$TMP/lock.body.json" <<'PY'
import json, sys
print(json.dumps({"account":sys.argv[1]}))
PY

curl -fsS --max-time 8 -X POST "$BASE/__void/participant/wallet/lock" \
  -H 'content-type: application/json' \
  --data-binary @"$TMP/lock.body.json" > "$TMP/lock.json"

cat "$TMP/lock.json"
echo

python3 - "$TMP/lock.json" "$ACCOUNT" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ok") is True, j
assert j.get("locked") is True, j
assert j.get("account") == sys.argv[2], j
print("[ok] temp wallet locked")
PY

echo
echo "=== [8] status smoke ==="
make mainnet0-status-smoke

echo
echo "[ok] participant temp wallet WC -> VOID execution proof passed"
