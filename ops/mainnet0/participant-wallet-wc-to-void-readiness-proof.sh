#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand 2>/dev/null || true

cd "${VOID_REPO:-$HOME/dev/void-node}"

ACCOUNT="${ACCOUNT:-zoso}"
WALLET="${WALLET:-0x1101A058E98eDCD775c93E26900d1DdBbdfa5d31}"
AMOUNT="${AMOUNT:-1}"
NODE="${NODE:-http://127.0.0.1:4100}"
RELAYER="${RELAYER:-http://127.0.0.1:4313/api/wc-relayer/v1}"
RPC="${RPC:-http://127.0.0.1:8545}"

TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

echo "=== participant wallet WC -> VOID readiness proof ==="
echo "account=$ACCOUNT"
echo "wallet=$WALLET"
echo "amount_wc=$AMOUNT"
echo "mutation=false"

echo
echo "=== [1] local chain / ready ==="
CHAIN_ID="$(cast chain-id --rpc-url "$RPC" 2>/dev/null || true)"
test "$CHAIN_ID" = "2050"

READY="$TMPDIR/ready.json"
curl -fsS --max-time 8 "$NODE/__void/ready.json" > "$READY"
python3 - "$READY" <<'PY'
import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    o = json.load(f)
assert o.get("ready") is True, o
assert int(o.get("gap", -1)) == 0, o
assert int(o.get("txroot_live", 0)) == 1, o
print("[ok] ready/gap/txroot")
PY

echo
echo "=== [2] wallet status gas truth ==="
STATUS="$TMPDIR/wallet-status.json"
curl -fsS --max-time 8 "$NODE/__void/participant/wallet/status?account=$ACCOUNT" > "$STATUS"
python3 - "$STATUS" "$WALLET" <<'PY'
import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    o = json.load(f)
wallet = sys.argv[2].lower()
assert o.get("ok") is True, o
assert str(o.get("address","")).lower() == wallet, o
assert "native_gas_wei" in o, o
assert "native_gas" in o, o
assert "native_gas_error" in o, o
gas = int(str(o.get("native_gas_wei") or "0"))
assert gas > 0, o
print("[ok] wallet native gas available:", o.get("native_gas"))
PY

echo
echo "=== [3] relayer health ==="
HEALTH="$TMPDIR/relayer-health.json"
curl -fsS --max-time 8 "$RELAYER/health" > "$HEALTH"
python3 - "$HEALTH" <<'PY'
import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    o = json.load(f)
assert o.get("ok") is True, o
assert o.get("can_quote") is True, o
assert o.get("can_execute") is True, o
assert o.get("can_redeem_bridge") is True, o
assert str(o.get("pool","")).startswith("0x"), o
print("[ok] relayer health")
PY

echo
echo "=== [4] build wallet-signed trade plan ==="
PLAN="$TMPDIR/wallet-trade-plan.json"
curl -fsS --max-time 8 -X POST "$RELAYER/build-wallet-trade" \
  -H 'content-type: application/json' \
  --data "{\"side\":\"wc_to_void\",\"amount\":\"$AMOUNT\",\"wallet\":\"$WALLET\"}" > "$PLAN"

python3 - "$PLAN" "$WALLET" <<'PY'
import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    o = json.load(f)
wallet = sys.argv[2].lower()
assert o.get("ok") is True, o
assert o.get("accepted") is True, o
assert o.get("execute") is False, o
assert o.get("mode") == "wallet_signed_wc_to_void", o
assert str(o.get("wallet","")).lower() == wallet, o
assert float(o.get("quoted_void") or 0) > 0, o
assert o.get("approve_tx_request",{}).get("to"), o
assert o.get("swap_tx_request",{}).get("to"), o
assert o.get("approve_tx_request",{}).get("data","").startswith("0x"), o
assert o.get("swap_tx_request",{}).get("data","").startswith("0x"), o
print("[ok] build-wallet-trade plan")
print("quoted_void=" + str(o.get("quoted_void")))
PY

echo
echo "=== [5] participant served copy ==="
HTML="$TMPDIR/participant.html"
curl -fsS --max-time 8 "$NODE/participant" > "$HTML"
grep -q 'automatic background earning is disabled' "$HTML"
grep -q 'Manual earning mode' "$HTML"
grep -q 'Runner: Manual' "$HTML"
grep -q 'Needs Devnet Gas' "$HTML"
grep -q '0 native devnet gas' "$HTML"
echo "[ok] served Earn/Trade truth copy"

echo
echo "=== [6] status smoke ==="
SMOKE="$TMPDIR/status-smoke.log"
make mainnet0-status-smoke > "$SMOKE" 2>&1
grep -q 'Mainnet-0 status smoke passed' "$SMOKE"
echo "[ok] status smoke"

echo
echo "[ok] participant wallet WC -> VOID readiness proof passed"
