#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"

echo "=== [0] HEAD BEFORE] ==="
HEAD_BEFORE_JSON="$(curl -fsS "$BASE/blocks/latest/number2.json" || echo '{}')"
echo "$HEAD_BEFORE_JSON"
HEAD_BEFORE="$(echo "$HEAD_BEFORE_JSON" | jq -r '.number // -1' 2>/dev/null || echo -1)"
echo "HEAD_BEFORE=$HEAD_BEFORE"

echo
echo "=== [1] submit 5 dummy txs via /tx/submit ==="
for i in 1 2 3 4 5; do
  echo "--- tx $i ---"
  curl -fsS -X POST "$BASE/tx/submit" \
    -H 'Content-Type: application/json' \
    -d "{\"data\":\"0xdeadbeef_lastmile_smoke_$i\"}" \
    || echo "[submit failed $i]"
done

echo
echo "=== [2] wait 10s for seals ==="
sleep 10

echo
echo "=== [3] HEAD AFTER] ==="
HEAD_AFTER_JSON="$(curl -fsS "$BASE/blocks/latest/number2.json" || echo '{}')"
echo "$HEAD_AFTER_JSON"
HEAD_AFTER="$(echo "$HEAD_AFTER_JSON" | jq -r '.number // -1' 2>/dev/null || echo -1)"
echo "HEAD_AFTER=$HEAD_AFTER"

echo
echo "=== [4] run lastmile nonempty exporter once (root) ==="
sudo REPO_ROOT="$HOME/dev/void-node" OUT_DIR="/var/lib/node_exporter/textfile_collector" \
  "$HOME/dev/void-node/ops/void-lastmile-nonempty-exporter.sh"

echo
echo "=== [5] tail of void_lastmile_nonempty.prom ==="
sudo tail -n 20 /var/lib/node_exporter/textfile_collector/void_lastmile_nonempty.prom || echo "[no prom file]"

if [ "$HEAD_AFTER" -lt 0 ]; then
  echo
  echo "[HEAD_AFTER invalid, stopping block inspection]"
  exit 0
fi

START=$((HEAD_AFTER - 5))
if [ "$START" -lt 0 ]; then START=0; fi

for n in $(seq "$START" "$HEAD_AFTER"); do
  echo
  echo "=== [block $n] persisted txs ==="
  curl -fsS "$BASE/dev/blocks/$n/txs/persisted" \
    | jq '{n:'"$n"', len: (.txs | length)}' || echo "[persisted endpoint failed]"

  echo "--- header3 ---"
  curl -fsS "$BASE/blocks/$n/header3" \
    | jq '{number, txCount, txRoot}' || echo "[header3 failed]"
done
