#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
WHO="${WHO:-demo-user}"

echo "=== [0] health ==="
curl -fsS --max-time 2 "$BASE/health" >/dev/null
echo "[ok] health"
echo

echo "=== [1] wc before ==="
BAL_BEFORE="$(curl -fsS "$BASE/wc/balance?account=$WHO")"
echo "$BAL_BEFORE"
BEFORE="$(python3 - <<'PY' "$BAL_BEFORE"
import json,sys
print(int(json.loads(sys.argv[1]).get("balance",0)))
PY
)"
echo "balance_before=$BEFORE"
echo

echo "=== [2] autoprop smoke ==="
make autoprop-smoke
echo

echo "=== [3] datanet loopproof ==="
WHO="$WHO" ./ops/datanet-loop-proof-v1.sh
echo

echo "=== [4] wc after ==="
BAL_AFTER="$(curl -fsS "$BASE/wc/balance?account=$WHO")"
echo "$BAL_AFTER"
AFTER="$(python3 - <<'PY' "$BAL_AFTER"
import json,sys
print(int(json.loads(sys.argv[1]).get("balance",0)))
PY
)"
echo "balance_after=$AFTER"
echo

DELTA="$((AFTER - BEFORE))"
echo "wc_delta=$DELTA"

if [ "$DELTA" -lt 1 ]; then
  echo "[FAIL] expected WC delta >= 1 from loopproof receipt"
  exit 1
fi

echo
echo "=== [5] recent ledger ==="
curl -fsS "$BASE/wc/ledger?account=$WHO&limit=5" ; echo

echo
echo "[ok] full demo smoke passed"
