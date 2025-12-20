#!/usr/bin/env bash
set -euo pipefail

TS="$(date +%Y%m%d-%H%M%S)"
OUT="/tmp/prom-add-void-head-age-rule.$TS.out.txt"
exec > >(tee -a "$OUT") 2>&1
echo "[saved] $OUT"
echo

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "[ERR] run as root: sudo bash $0"
  exit 2
fi

RULE="/etc/prometheus/rules/void-head-age.yml"

echo "=== [0] backup /etc/prometheus ==="
tar -C /etc -czf "/root/prometheus-config-OK.$TS.tgz" prometheus
echo "[bak] /root/prometheus-config-OK.$TS.tgz"

echo
echo "=== [1] write rule (head age seconds) ==="
cat > "$RULE" <<'YML'
groups:
- name: void-head-age
  interval: 5s
  rules:
  - record: void:head_age_seconds:primary
    expr: clamp_min(time() - timestamp(void:head_number:primary{env="dev"}), 0)
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
echo "=== [3] verify ==="
curl -fsS --max-time 4 -G 'http://127.0.0.1:9090/api/v1/query' \
  --data-urlencode 'query=void:head_age_seconds:primary{env="dev"}' \
| jq -r '.data.result[] | "\(.metric|tostring) age_s=\(.value[1])"'
