#!/usr/bin/env bash
set -euo pipefail

PROM="${PROM:-http://127.0.0.1:9090}"
RULE="${RULE:-/etc/prometheus/rules/void-mainnet-lastmile-compat.yml}"

q() {
  local expr="$1"
  curl -fsS -G "$PROM/api/v1/query" --data-urlencode "query=$expr"
}

echo "=== [0] quick prom ready ==="
curl -fsS "$PROM/-/ready" >/dev/null || { echo "[ERR] prom not ready @ $PROM"; exit 2; }

echo "=== [1] choose strongest available input metric (prefer hardlock health) ==="
HAS_STRONG="$(q 'count(void:mainnet_lastmile:health_with_header_txroot_hardlock:last_5m)' | jq -r '.data.result[0].value[1] // "0"')"
HAS_BASE="$(q 'count(void_lastmile_health)' | jq -r '.data.result[0].value[1] // "0"')"

if [ "$HAS_STRONG" != "0" ]; then
  IN_STRONG="void:mainnet_lastmile:health_with_header_txroot_hardlock:last_5m"
else
  IN_STRONG=""
fi

if [ "$HAS_BASE" != "0" ]; then
  IN_BASE="void_lastmile_health"
else
  IN_BASE=""
fi

echo "HAS_STRONG=$HAS_STRONG IN_STRONG=${IN_STRONG:-<none>}"
echo "HAS_BASE=$HAS_BASE IN_BASE=${IN_BASE:-<none>}"

echo
echo "=== [2] write compat recording rule (alias never disappears; fallback -> 0) ==="
sudo install -d -m 0755 /etc/prometheus/rules

# Build expr with best-effort OR chain. All branches safe if metrics missing.
# We wrap in max() so the result is a single 0/1-ish series with no labels.
STRONG_EXPR=""
BASE_EXPR=""

if [ -n "${IN_STRONG:-}" ]; then
  STRONG_EXPR="max_over_time(${IN_STRONG}[5m])"
fi
if [ -n "${IN_BASE:-}" ]; then
  BASE_EXPR="max_over_time(${IN_BASE}[5m])"
fi

# Compose: (strong OR base OR vector(0))
OR_CHAIN="vector(0)"
if [ -n "${BASE_EXPR:-}" ]; then
  OR_CHAIN="${BASE_EXPR} OR ${OR_CHAIN}"
fi
if [ -n "${STRONG_EXPR:-}" ]; then
  OR_CHAIN="${STRONG_EXPR} OR ${OR_CHAIN}"
fi

sudo tee "$RULE" >/dev/null <<YML
groups:
- name: void-mainnet-lastmile-compat
  interval: 15s
  rules:
  - record: void:mainnet_lastmile:health:last_5m
    expr: |
      max(${OR_CHAIN})
YML

echo "wrote: $RULE"

echo
echo "=== [3] promtool + safe reload ==="
sudo promtool check config /etc/prometheus/prometheus.yml

if command -v /usr/local/bin/prom-safe-reload.sh >/dev/null 2>&1; then
  sudo /usr/local/bin/prom-safe-reload.sh
else
  # fallback (requires --web.enable-lifecycle)
  curl -fsS -X POST "$PROM/-/reload" >/dev/null
fi

echo
echo "=== [4] verify alias exists + value ==="
q 'count(void:mainnet_lastmile:health:last_5m)' | jq -r '.data.result[0].value[1] // "0"' | awk '{print "count(alias)="$1}'
q 'void:mainnet_lastmile:health:last_5m' | jq -r '.data.result[0].value[1] // "MISSING"' | awk '{print "alias_value="$1}'

echo
echo "=== [done] ==="
