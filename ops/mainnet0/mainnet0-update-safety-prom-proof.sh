#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

PROM="${PROM:-http://127.0.0.1:9090}"
OUT="${OUT:-/tmp/void-mainnet0-update-safety-prom-proof.$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

echo "=== mainnet0 update safety prom proof ==="
echo "prom=$PROM"
echo "out=$OUT"

echo
echo "=== [1] prometheus ready ==="
curl -fsS "$PROM/-/ready" | tee "$OUT/prom.ready.txt"
echo

echo
echo "=== [2] run exporter ==="
bash ops/mainnet0/mainnet0-update-safety-exporter.sh | tee "$OUT/exporter.log"

echo
echo "=== [3] node_exporter exposes metrics ==="
curl -fsS http://127.0.0.1:9100/metrics > "$OUT/node-exporter.metrics.txt"

grep 'void_mainnet0_update_safety_' "$OUT/node-exporter.metrics.txt" | tee "$OUT/node-exporter.update-safety.metrics.txt"
grep -q 'void_mainnet0_update_safety_ok 1' "$OUT/node-exporter.update-safety.metrics.txt"
grep -q 'void_mainnet0_update_safety_signature_valid 1' "$OUT/node-exporter.update-safety.metrics.txt"
grep -q 'void_mainnet0_update_safety_update_available 0' "$OUT/node-exporter.update-safety.metrics.txt"
grep -q 'void_mainnet0_update_safety_active_markers 0' "$OUT/node-exporter.update-safety.metrics.txt"

grep '^node_textfile_scrape_error 0' "$OUT/node-exporter.metrics.txt"
echo "[ok] node_exporter exposes update safety metrics"

echo
echo "=== [4] prometheus query once ==="
sleep 20
curl -fsS --get "$PROM/api/v1/query" \
  --data-urlencode 'query=void_mainnet0_update_safety_ok' \
  > "$OUT/prom.update-safety-ok.json"

cat "$OUT/prom.update-safety-ok.json"
echo

python3 - "$OUT/prom.update-safety-ok.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
vals=j.get("data",{}).get("result",[])
assert vals, j
assert any(float(v.get("value",[0,0])[1]) == 1.0 for v in vals), j
print("[ok] Prometheus sees void_mainnet0_update_safety_ok=1")
PY

echo
echo "[ok] mainnet0 update safety prom proof green"
echo "out=$OUT"
