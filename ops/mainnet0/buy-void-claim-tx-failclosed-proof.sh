#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
TMP="${TMP:-/tmp/void-buy-claim-failclosed}"
mkdir -p "$TMP"

echo "=== Buy VOID claim-tx fail-closed proof ==="
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
cat "$TMP/ready-before.json"; echo

echo
echo "=== [4] watcher status before ==="
curl -fsS "$BASE/__void/operator/buy-void/base-watcher/status" > "$TMP/status-before.json"
python3 -m json.tool "$TMP/status-before.json" | sed -n '1,120p'

WATCH_ID="$(python3 - "$TMP/status-before.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
w=j.get("latest_watch") or {}
print(w.get("watch_id",""))
PY
)"

if [ -z "$WATCH_ID" ]; then
  WATCH_ID="buywatch_failclosed_missing_00000000"
  WATCH_MODE="missing_watch"
else
  WATCH_MODE="latest_watch"
fi

echo "watch_id=$WATCH_ID"
echo "watch_mode=$WATCH_MODE"

echo
echo "=== [5] missing body must fail before mutation ==="
set +e
curl -sS -i \
  -H 'content-type: application/json' \
  -d '{}' \
  "$BASE/__void/operator/buy-void/base-watcher/claim-tx" > "$TMP/missing-body.http"
RC1=$?
set -e
sed -n '1,80p' "$TMP/missing-body.http"

grep -q "400 Bad Request" "$TMP/missing-body.http"
grep -q "missing_watch_id" "$TMP/missing-body.http"

echo
echo "=== [6] fake tx hash with real watch_id must fail closed ==="
FAKE_TX="0x0000000000000000000000000000000000000000000000000000000000000000"

set +e
curl -sS -i \
  -H 'content-type: application/json' \
  -d "{\"watch_id\":\"${WATCH_ID}\",\"tx_hash\":\"${FAKE_TX}\",\"operator_note\":\"failclosed fake tx proof\"}" \
  "$BASE/__void/operator/buy-void/base-watcher/claim-tx" > "$TMP/fake-hash.http"
RC2=$?
set -e
sed -n '1,120p' "$TMP/fake-hash.http"

grep -Eq "HTTP/1.1 (400|404|500)" "$TMP/fake-hash.http"

if [ "${WATCH_MODE:-}" = "latest_watch" ]; then
  grep -q "tx_receipt_not_found" "$TMP/fake-hash.http"
  echo "[ok] latest watch fake tx reached receipt lookup and failed closed"
else
  grep -q "watch_not_found" "$TMP/fake-hash.http"
  echo "[ok] missing watch fake tx failed closed before receipt lookup"
fi

echo
echo "=== [7] watcher status after ==="
curl -fsS "$BASE/__void/operator/buy-void/base-watcher/status" > "$TMP/status-after.json"
python3 -m json.tool "$TMP/status-after.json" | sed -n '1,120p'

echo
echo "=== [8] assert no successful claim was recorded ==="
python3 - "$TMP/status-before.json" "$TMP/status-after.json" "$WATCH_ID" <<'PY'
import json, sys

before=json.load(open(sys.argv[1]))
after=json.load(open(sys.argv[2]))
watch_id=sys.argv[3]

assert before.get("ok") is True, before
assert after.get("ok") is True, after

bw=before.get("latest_watch") or {}
aw=after.get("latest_watch") or {}

if bw or aw:
    assert aw.get("watch_id") == bw.get("watch_id"), (bw, aw)
    assert aw.get("watch_status") == bw.get("watch_status"), (bw, aw)
    assert aw.get("payment_ref") == bw.get("payment_ref"), (bw, aw)
    assert aw.get("void_tx_ref") == bw.get("void_tx_ref"), (bw, aw)

assert int(after.get("observations_count", 0)) == int(before.get("observations_count", 0)), (before, after)

print("[ok] fake claim did not record observation or mutate latest watch state")
PY

echo
echo "=== [9] readiness after ==="
curl -fsS "$BASE/__void/ready.json" > "$TMP/ready-after.json"
cat "$TMP/ready-after.json"; echo

python3 - "$TMP/ready-after.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", 999999)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] ready/gap/txroot still green")
PY

echo
echo "[ok] Buy VOID claim-tx fail-closed proof passed"
