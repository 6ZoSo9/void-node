#!/usr/bin/env bash
set -euo pipefail

RULE_FILE="/etc/prometheus/void-mainnet-pillars-rules.yml"

echo "=== [validators-rules-embed] target: $RULE_FILE ==="

if [ ! -f "$RULE_FILE" ]; then
  echo "[ERR] $RULE_FILE not found; abort."
  exit 1
fi

TS="$(date +%Y%m%d-%H%M%S)"
BACKUP="${RULE_FILE%.yml}.bak.${TS}.yml"

echo "[backup] cp $RULE_FILE -> $BACKUP"
cp "$RULE_FILE" "$BACKUP"

TMP="${RULE_FILE}.tmp.$$"

# Strip any existing validators group
awk '
  BEGIN {skip=0}
  /^- name: void-mainnet-validators-rules/ {skip=1; next}
  skip && /^- name: / {skip=0}
  !skip {print}
' "$RULE_FILE" > "$TMP"

# Append the corrected validators group
cat >> "$TMP" <<'EOF'

- name: void-mainnet-validators-rules
  rules:
  - record: void_mainnet_validators_health
    expr: void_mainnet_validators_spec_present * void_mainnet_validators_spec_nonempty
  - record: void_mainnet_pillars_with_validators_health
    expr: void_mainnet_pillars_health * void_mainnet_validators_health
EOF

mv "$TMP" "$RULE_FILE"

echo
echo "=== [validators-rules-embed] promtool check ==="
promtool check rules "$RULE_FILE"

echo
echo "=== [validators-rules-embed] reload Prometheus ==="
curl -fsS -X POST http://127.0.0.1:9090/-/reload && echo "[reload] OK"
