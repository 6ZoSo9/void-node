#!/usr/bin/env bash
set -euo pipefail

TS="$(date +%Y%m%d-%H%M%S)"
OUT="/tmp/prom-add-void-head-primary-rule.$TS.out.txt"
exec > >(tee -a "$OUT") 2>&1
echo "[saved] $OUT"
echo

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "[ERR] run as root: sudo bash $0"
  exit 2
fi

RULE="/etc/prometheus/rules/void-head-primary.yml"

echo "=== [0] backup /etc/prometheus ==="
tar -C /etc -czf "/root/prometheus-config-OK.$TS.tgz" prometheus
echo "[bak] /root/prometheus-config-OK.$TS.tgz"

echo
echo "=== [1] write rule (canonical head series) ==="
cat > "$RULE" <<'YML'
groups:
- name: void-head-primary
  interval: 5s
  rules:
  - record: void:head_number:primary
    expr: max without(job, env) (void_head_number{job=~"void-head|void-head-v5"})
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
echo "=== [3] verify single canonical series ==="
curl -fsS --max-time 4 -G 'http://127.0.0.1:9090/api/v1/query' \
  --data-urlencode 'query=count(void:head_number:primary)' | jq .
curl -fsS --max-time 4 -G 'http://127.0.0.1:9090/api/v1/query' \
  --data-urlencode 'query=void:head_number:primary{env="dev"}' \
| jq -r '.data.result[] | "\(.metric|tostring) value=\(.value[1])"'
