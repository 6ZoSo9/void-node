#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
TMP="${TMP:-/tmp/void-buy-fulfillment-failclosed}"
NOTE="ops/mainnet0/buy-void-base-claim-rehearsal.current.md"

mkdir -p "$TMP"

echo "=== Buy VOID fulfillment fail-closed proof ==="
echo "base=$BASE"

echo
echo "=== [1] git truth ==="
git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty

echo
echo "=== [2] build ==="
npm run build

echo
echo "=== [3] readiness before ==="
curl -fsS "$BASE/__void/ready.json" > "$TMP/ready-before.json"
cat "$TMP/ready-before.json"
echo

echo
echo "=== [4] resolve rehearsal watch from note if available ==="
WATCH_ID=""
QUEUE_ID=""

if [ -f "$NOTE" ]; then
  WATCH_ID="$(grep -E '^WATCH_ID=' "$NOTE" | head -n 1 | cut -d= -f2- || true)"
  QUEUE_ID="$(grep -E '^QUEUE_ID=' "$NOTE" | head -n 1 | cut -d= -f2- || true)"
fi

if [ -z "$WATCH_ID" ]; then
  WATCH_ID="buywatch_fulfill_failclosed_missing_00000000"
  WATCH_MODE="missing_watch"
else
  set +e
  curl -fsS "$BASE/__void/operator/buy-void/watch-targets/status?watch_id=$WATCH_ID" > "$TMP/watch-before.json" 2>/dev/null
  WATCH_STATUS_RC=$?
  set -e

  if [ "$WATCH_STATUS_RC" -eq 0 ]; then
    WATCH_MODE="rehearsal_watch"
  else
    WATCH_ID="buywatch_fulfill_failclosed_missing_00000000"
    WATCH_MODE="missing_watch"
    QUEUE_ID=""
  fi
fi

echo "watch_id=$WATCH_ID"
echo "queue_id=$QUEUE_ID"
echo "watch_mode=$WATCH_MODE"

if [ "$WATCH_MODE" = "rehearsal_watch" ]; then
  echo
  echo "=== [5] watch/queue before ==="
  python3 -m json.tool "$TMP/watch-before.json"
  curl -fsS "$BASE/__void/operator/buy-void/queue/status?queue_id=$QUEUE_ID" > "$TMP/queue-before.json"
  python3 -m json.tool "$TMP/queue-before.json"
fi

echo
echo "=== [6] empty body must fail ==="
curl -sS -i   -H 'content-type: application/json'   -d '{}'   "$BASE/__void/operator/buy-void/watch-targets/fulfill" > "$TMP/empty-body.http"

sed -n '1,80p' "$TMP/empty-body.http"
grep -q "400 Bad Request" "$TMP/empty-body.http"
grep -q "missing_watch_id" "$TMP/empty-body.http"

echo
echo "=== [7] missing void_tx_ref must fail before mutation ==="
curl -sS -i   -H 'content-type: application/json'   -d "{\"watch_id\":\"${WATCH_ID}\",\"fulfill_status\":\"void_sent\"}"   "$BASE/__void/operator/buy-void/watch-targets/fulfill" > "$TMP/missing-void-tx.http"

sed -n '1,100p' "$TMP/missing-void-tx.http"
grep -q "400 Bad Request" "$TMP/missing-void-tx.http"
grep -q "missing_void_tx_ref" "$TMP/missing-void-tx.http"

echo
echo "=== [8] fake fulfill must fail closed ==="
FAKE_VOID_TX="void_tx_failclosed_fake_00000000"

curl -sS -i   -H 'content-type: application/json'   -d "{\"watch_id\":\"${WATCH_ID}\",\"fulfill_status\":\"void_sent\",\"void_tx_ref\":\"${FAKE_VOID_TX}\",\"operator_note\":\"fulfillment failclosed proof\"}"   "$BASE/__void/operator/buy-void/watch-targets/fulfill" > "$TMP/fake-fulfill.http"

sed -n '1,140p' "$TMP/fake-fulfill.http"

if [ "$WATCH_MODE" = "rehearsal_watch" ]; then
  grep -q "400 Bad Request" "$TMP/fake-fulfill.http"
  grep -q "queue_not_ready_for_fulfill" "$TMP/fake-fulfill.http"
  echo "[ok] queued rehearsal watch cannot be fulfilled before payment confirmation"
else
  grep -q "404 Not Found" "$TMP/fake-fulfill.http"
  grep -q "watch_not_found" "$TMP/fake-fulfill.http"
  echo "[ok] missing watch fake fulfill failed closed"
fi

echo
echo "=== [9] assert no fulfillment mutation ==="
if [ "$WATCH_MODE" = "rehearsal_watch" ]; then
  curl -fsS "$BASE/__void/operator/buy-void/watch-targets/status?watch_id=$WATCH_ID" > "$TMP/watch-after.json"
  curl -fsS "$BASE/__void/operator/buy-void/queue/status?queue_id=$QUEUE_ID" > "$TMP/queue-after.json"

  python3 - "$TMP/watch-before.json" "$TMP/watch-after.json" "$TMP/queue-before.json" "$TMP/queue-after.json" <<'PY2'
import json, sys

wb=json.load(open(sys.argv[1])).get("watch") or {}
wa=json.load(open(sys.argv[2])).get("watch") or {}
qb=json.load(open(sys.argv[3])).get("queued") or {}
qa=json.load(open(sys.argv[4])).get("queued") or {}

assert wb.get("watch_id") == wa.get("watch_id"), (wb, wa)
assert wb.get("watch_status") == wa.get("watch_status"), (wb, wa)
assert wb.get("void_tx_ref") == wa.get("void_tx_ref"), (wb, wa)
assert wb.get("payment_ref") == wa.get("payment_ref"), (wb, wa)

assert qb.get("queue_id") == qa.get("queue_id"), (qb, qa)
assert qb.get("operator_status") == qa.get("operator_status"), (qb, qa)
assert qb.get("void_tx_ref") == qa.get("void_tx_ref"), (qb, qa)
assert qb.get("payment_ref") == qa.get("payment_ref"), (qb, qa)

assert qa.get("operator_status") == "queued", qa
assert not qa.get("void_tx_ref"), qa

print("[ok] no watch or queue fulfillment mutation occurred")
PY2
else
  echo "[ok] no runtime watch existed to mutate"
fi

echo
echo "=== [10] readiness after ==="
curl -fsS "$BASE/__void/ready.json" > "$TMP/ready-after.json"
cat "$TMP/ready-after.json"
echo

python3 - "$TMP/ready-after.json" <<'PY3'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", 999999)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] ready/gap/txroot still green")
PY3

echo
echo "[ok] Buy VOID fulfillment fail-closed proof passed"
