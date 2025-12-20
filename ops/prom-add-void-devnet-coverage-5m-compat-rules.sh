#!/usr/bin/env bash
set -euo pipefail

TS="$(date +%Y%m%d-%H%M%S)"
OUT="/tmp/prom-add-void-devnet-coverage-5m-compat-rules.$TS.out.txt"
exec > >(tee -a "$OUT") 2>&1
echo "[saved] $OUT"
echo

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "[ERR] run as root: sudo bash $0"
  exit 2
fi

RULE="/etc/prometheus/rules/void-devnet-coverage-5m-compat.yml"

echo "=== [0] backup /etc/prometheus ==="
tar -C /etc -czf "/root/prometheus-config-OK.$TS.tgz" prometheus
echo "[bak] /root/prometheus-config-OK.$TS.tgz"

echo
echo "=== [1] write compat recording rules (fix NaN / missing 5m smoothers) ==="
cat > "$RULE" <<'YML'
groups:
- name: void-devnet-coverage-5m-compat
  interval: 15s
  rules:
  - record: void:devnet_coverage_v2:last_5m
    expr: max without(instance, job) (avg_over_time(void_devnet_coverage{chain="devnet"}[5m]))
    labels:
      env: dev

  - record: void:devnet_receipts_health_v2:last_5m
    expr: min without(instance, job) (min_over_time(void_devnet_receipts_health_v2{chain="devnet"}[5m]))
    labels:
      env: dev
YML
echo "[ok] wrote $RULE"

echo
echo "=== [2] validate + guarded reload ==="
promtool check rules "$RULE"
if command -v /usr/local/bin/prom-guard-no-duplicate-rule-names.sh >/dev/null 2>&1; then
  /usr/local/bin/prom-guard-no-duplicate-rule-names.sh >/dev/null
  echo "[ok] guard pass"
fi
curl -fsS --max-time 3 -X POST http://127.0.0.1:9090/-/reload >/dev/null
echo "[ok] reloaded"

echo
echo "=== [3] verify (should be 1 series each) ==="
curl -fsS --max-time 4 -G 'http://127.0.0.1:9090/api/v1/query' \
  --data-urlencode 'query=count(void:devnet_coverage_v2:last_5m{env="dev"})' | jq .
curl -fsS --max-time 4 -G 'http://127.0.0.1:9090/api/v1/query' \
  --data-urlencode 'query=void:devnet_coverage_v2:last_5m{env="dev"}' \
| jq -r '.data.result[] | "\(.metric|tostring) v=\(.value[1])"'

curl -fsS --max-time 4 -G 'http://127.0.0.1:9090/api/v1/query' \
  --data-urlencode 'query=count(void:devnet_receipts_health_v2:last_5m{env="dev"})' | jq .
curl -fsS --max-time 4 -G 'http://127.0.0.1:9090/api/v1/query' \
  --data-urlencode 'query=void:devnet_receipts_health_v2:last_5m{env="dev"}' \
| jq -r '.data.result[] | "\(.metric|tostring) v=\(.value[1])"'
