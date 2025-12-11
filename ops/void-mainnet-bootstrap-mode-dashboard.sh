#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$HOME/dev/void-node}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "=== [VOID mainnet — bootstrap mode dashboard helper] ==="
echo "[cfg] ROOT     = $ROOT"
echo "[cfg] PROM_URL = $PROM_URL"
echo

echo "=== [raw gauge] ==="
curl -fsS "$PROM_URL/api/v1/query" \
  --data-urlencode 'query=void_mainnet_bootstrap_mode_info' \
  | jq .

echo
echo "=== [interpretation] ==="
echo "  - void_mainnet_bootstrap_mode_info{mode=\"stub\"} 1   => mainnet bootstrap is in STUB mode (no real broadcast)."
echo "  - Later, we can use modes like \"dryrun\" or \"live\" when we flip the config."

echo
echo "=== [Grafana / PromQL cheat-sheet] ==="
cat <<'EOF'
Single-stat / gauge:
  void_mainnet_bootstrap_mode_info

Examples:
  - Show current bootstrap mode:
      query: void_mainnet_bootstrap_mode_info

    Then use the 'mode' label in the panel (e.g., value: 1, label: mode="stub").

EOF

echo
echo "[bootstrap-mode-dashboard] DONE."
