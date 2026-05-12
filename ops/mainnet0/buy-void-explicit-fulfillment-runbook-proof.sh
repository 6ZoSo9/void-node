#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
RUNBOOK="ops/mainnet0/buy-void-explicit-fulfillment-runbook.current.md"
WATCH_ID="${WATCH_ID:-buywatch_1778589099533_22c953e4}"
QUEUE_ID="${QUEUE_ID:-buyq_1778589099373_e86e1740}"
TX_HASH="${TX_HASH:-0x378fdba93f97afc854b3753011a09b670ab4162759c3cd33c1bc64b236030337}"
TMP="${TMP:-/tmp/void-buy-void-explicit-fulfillment-runbook-proof}"
mkdir -p "$TMP"

echo "=== Buy VOID explicit fulfillment runbook proof ==="

echo
echo "=== [1] runbook markers ==="
test -f "$RUNBOOK"
grep -q "status: plan_only" "$RUNBOOK"
grep -q "launch_state: not_go_for_public_mainnet0" "$RUNBOOK"
grep -q "mutation_allowed_by_this_doc: false" "$RUNBOOK"
grep -q "Payment confirmation must not automatically send VOID" "$RUNBOOK"
grep -q "VOID fulfillment must remain a separate operator step" "$RUNBOOK"
grep -q "missing_void_tx_ref" "$RUNBOOK"
grep -q "$WATCH_ID" "$RUNBOOK"
grep -q "$QUEUE_ID" "$RUNBOOK"
grep -q "$TX_HASH" "$RUNBOOK"
echo "[ok] runbook markers present"

echo
echo "=== [2] ready ==="
curl -fsS "$BASE/__void/ready.json" > "$TMP/ready.json"
cat "$TMP/ready.json"
python3 - "$TMP/ready.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", 999999)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] ready/gap/txroot")
PY

echo
echo "=== [3] Ethereum watch payment confirmed, no VOID tx ==="
curl -fsS "$BASE/__void/operator/buy-void/watch-targets/status?watch_id=$WATCH_ID" > "$TMP/watch.json"
python3 - "$TMP/watch.json" "$WATCH_ID" "$TX_HASH" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
watch_id=sys.argv[2]
tx=sys.argv[3]
w=j.get("watch") or {}
assert j.get("ok") is True, j
assert w.get("watch_id") == watch_id, w
assert w.get("expected_chain") == "ethereum", w
assert w.get("expected_asset") == "ethereum_native_usdc", w
assert w.get("watch_status") == "payment_confirmed_recorded", w
assert w.get("payment_ref") == tx, w
assert float(w.get("observed_amount_usdc")) == 25.0, w
assert w.get("observed_amount_match") is True, w
assert not w.get("void_tx_ref"), w
print("[ok] Ethereum watch confirmed and no VOID tx")
PY

echo
echo "=== [4] queue payment confirmed, no VOID tx ==="
curl -fsS "$BASE/__void/operator/buy-void/queue/status?queue_id=$QUEUE_ID" > "$TMP/queue.json"
python3 - "$TMP/queue.json" "$QUEUE_ID" "$TX_HASH" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
queue_id=sys.argv[2]
tx=sys.argv[3]
q=j.get("queued") or {}
assert j.get("ok") is True, j
assert q.get("queue_id") == queue_id, q
assert q.get("operator_status") == "payment_confirmed", q
assert q.get("payment_ref") == tx, q
assert not q.get("void_tx_ref"), q
print("[ok] queue confirmed and no VOID tx")
PY

echo
echo "=== [5] fulfillment still fails without void_tx_ref ==="
curl -sS -w '\nHTTP_STATUS:%{http_code}\n' \
  -X POST \
  -H 'content-type: application/json' \
  -d "{\"watch_id\":\"$WATCH_ID\",\"fulfill_status\":\"void_sent\",\"operator_note\":\"explicit fulfillment runbook proof missing void tx ref\"}" \
  "$BASE/__void/operator/buy-void/watch-targets/fulfill" \
  > "$TMP/fulfill-missing-voidtx.http"

cat "$TMP/fulfill-missing-voidtx.http"
python3 - "$TMP/fulfill-missing-voidtx.http" <<'PY'
import json, sys
raw=open(sys.argv[1]).read()
body, _, status = raw.partition("\nHTTP_STATUS:")
j=json.loads(body)
code=int(status.strip())
assert code == 400, (code, j)
assert j.get("ok") is False, j
assert j.get("error") == "missing_void_tx_ref", j
print("[ok] fulfillment blocked without explicit VOID tx ref")
PY

echo
echo "=== [6] final unchanged ==="
curl -fsS "$BASE/__void/operator/buy-void/watch-targets/status?watch_id=$WATCH_ID" > "$TMP/watch-after.json"
python3 - "$TMP/watch-after.json" "$TX_HASH" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
tx=sys.argv[2]
w=j.get("watch") or {}
assert w.get("watch_status") == "payment_confirmed_recorded", w
assert w.get("payment_ref") == tx, w
assert not w.get("void_tx_ref"), w
print("[ok] final watch unchanged")
PY

echo
echo "[ok] Buy VOID explicit fulfillment runbook proof passed"
