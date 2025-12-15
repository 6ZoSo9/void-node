#!/usr/bin/env bash
set -euo pipefail
RULE_DIR="${RULE_DIR:-/etc/prometheus/rules}"
PROM="${PROM:-http://127.0.0.1:9090}"
TS="$(date -u +%Y%m%d-%H%M%S)"
BK="/root/prometheus-config-OK.${TS}.vector0fix.tgz"

echo "=== [scan] vector(0) exprs (before) ==="
sudo grep -RIn --include='*.yml' -E '^\s*expr:\s*vector\(0\)\s*$' "$RULE_DIR" || true

echo
echo "=== [backup] $RULE_DIR ==="
sudo tar -C / -czf "$BK" "etc/prometheus/rules"
echo "BK=$BK"

echo
echo "=== [patch] expr: vector(0) -> absent(vector(1)) (empty) ==="
sudo find "$RULE_DIR" -maxdepth 1 -type f -name '*.yml' -print0 \
  | sudo xargs -0 -r perl -i -pe '
      if (/^\s*expr:\s*vector\(0\)\s*$/) {
        s/expr:\s*vector\(0\)/expr: absent(vector(1))  # disabled: empty vector/;
      }
    '

echo
echo "=== [scan] vector(0) exprs (after) ==="
sudo grep -RIn --include='*.yml' -E '^\s*expr:\s*vector\(0\)\s*$' "$RULE_DIR" || true

echo
echo "=== [promtool] check rules ==="
sudo find "$RULE_DIR" -maxdepth 1 -type f -name '*.yml' -print0 \
  | sudo xargs -0 -r promtool check rules

echo
echo "=== [reload] Prometheus ==="
curl -fsS -X POST "$PROM/-/reload" >/dev/null || echo "[WARN] reload failed (missing --web.enable-lifecycle?)"

echo
echo "=== [done] ==="
