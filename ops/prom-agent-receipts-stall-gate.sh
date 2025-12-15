#!/usr/bin/env bash
set -euo pipefail

PROM="${PROM:-http://127.0.0.1:9090}"
EXPECTED="${EXPECTED:-0}"
TEXTFILE="${TEXTFILE:-/var/lib/node_exporter/textfile_collector/void_agent_receipts_expected.prom}"

echo "=== [vars] ==="
echo "PROM=$PROM"
echo "EXPECTED=$EXPECTED"
echo "TEXTFILE=$TEXTFILE"

echo
echo "=== [1] write textfile gate (ONLY control path) ==="
sudo mkdir -p "$(dirname "$TEXTFILE")"
sudo sh -c "printf '%s\n' \
'# HELP void_agent_receipts_expected Set to 1 when agent receipts are expected to advance; 0 disables the stall alert.' \
'# TYPE void_agent_receipts_expected gauge' \
'void_agent_receipts_expected ${EXPECTED}' \
> '$TEXTFILE'"
sudo chown root:root "$TEXTFILE"
sudo chmod 0644 "$TEXTFILE"
sudo sed -n '1,6p' "$TEXTFILE"

echo
echo "=== [2] reload Prometheus ==="
curl -fsS -X POST "$PROM/-/reload" >/dev/null || echo "[WARN] prom reload failed (missing --web.enable-lifecycle?)"

echo
echo "=== [3] verify alert state ==="
curl -fsS "$PROM/api/v1/rules" | jq -r '
  .data.groups[].rules[]?
  | select((.name // .alert // "")=="VoidAgentReceiptsStall")
  | "state=" + (.state // "?") + "  query=" + (.query // "?")
' || true
