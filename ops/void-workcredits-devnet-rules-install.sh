#!/usr/bin/env bash
set -euo pipefail

RULES_PATH="/etc/prometheus/void-workcredits-devnet-rules.yml"

echo "[wc-rules] writing $RULES_PATH"
cat > "$RULES_PATH" <<'EOF'
groups:
- name: void-workcredits-devnet-rules
  rules:
  # 5m smoothed WC per VOID price (devnet)
  - record: void:workcredits_devnet:wc_per_void:last_5m
    expr: avg_over_time(void_workcredits_devnet_wc_per_void{chain="devnet"}[5m])

  # 5m smoothed VOID reserve (raw 18-dec units)
  - record: void:workcredits_devnet:void_reserve_raw:last_5m
    expr: avg_over_time(void_workcredits_devnet_void_reserve_raw{chain="devnet"}[5m])

  # 5m smoothed WC reserve (raw 18-dec units)
  - record: void:workcredits_devnet:wc_reserve_raw:last_5m
    expr: avg_over_time(void_workcredits_devnet_wc_reserve_raw{chain="devnet"}[5m])

  # Simple 2-asset liquidity proxy (sum of raw reserves)
  - record: void:workcredits_devnet:pool_liquidity_2asset_raw:last_5m
    expr: avg_over_time(void_workcredits_devnet_void_reserve_raw{chain="devnet"}[5m])
        + avg_over_time(void_workcredits_devnet_wc_reserve_raw{chain="devnet"}[5m])
EOF

echo "[wc-rules] checking rules with promtool"
if ! command -v promtool >/dev/null 2>&1; then
  echo "[FATAL] promtool not found in PATH; cannot validate rules" >&2
  exit 1
fi

promtool check rules "$RULES_PATH"

echo "[wc-rules] promtool OK, reloading prometheus"
if command -v systemctl >/dev/null 2>&1; then
  systemctl reload prometheus
else
  echo "[WARN] systemctl not found; please reload Prometheus manually" >&2
fi

echo "[wc-rules] done."
