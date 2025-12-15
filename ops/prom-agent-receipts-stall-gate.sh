#!/usr/bin/env bash
set -euo pipefail

PROM="${PROM:-http://127.0.0.1:9090}"
EXPECTED="${EXPECTED:-0}"
RULE_FILE="${RULE_FILE:-/etc/prometheus/void-agent-receipts-alerts.yml}"
TEXTFILE="${TEXTFILE:-/var/lib/node_exporter/textfile_collector/void_agent_receipts_expected.prom}"
TS="$(date -u +%Y%m%d-%H%M%S)"
BK="/root/prometheus-config-OK.${TS}.agent-receipts-gate.tgz"

echo "=== [0] vars ==="
echo "PROM=$PROM"
echo "RULE_FILE=$RULE_FILE"
echo "EXPECTED=$EXPECTED"
echo "TEXTFILE=$TEXTFILE"

echo
echo "=== [1] verify rule file exists ==="
sudo ls -l "$RULE_FILE"

echo
echo "=== [2] write gate metric (EXPECTED=$EXPECTED) ==="
sudo mkdir -p "$(dirname "$TEXTFILE")"
sudo sh -c "printf '%s\n' \
'# HELP void_agent_receipts_expected Set to 1 when agent receipts are expected to advance; 0 disables the stall alert.' \
'# TYPE void_agent_receipts_expected gauge' \
'void_agent_receipts_expected ${EXPECTED}' \
> '$TEXTFILE'"
sudo chown root:root "$TEXTFILE"
sudo chmod 0644 "$TEXTFILE"
sudo sed -n '1,10p' "$TEXTFILE"

echo
echo "=== [3] backup /etc/prometheus ==="
sudo tar -C / -czf "$BK" "etc/prometheus"
echo "BK=$BK"

echo
echo "=== [4] patch: add gate line (idempotent) ==="
sudo perl -i -pe '
  BEGIN { $in=0; $done=0; }
  if (/^\s*-\s*alert:\s*VoidAgentReceiptsStall\b/) { $in=1; }
  if ($in && !$done && /void_agent_receipts_expected/) { $done=1; }
  if ($in && !$done && /^\s*and\s*\(max\(void_agent_receipts_total\)\s*>\s*0\)\s*$/) {
    $_ .= "      and (max(void_agent_receipts_expected) == 1)  # gated\n";
    $done=1;
  }
  if ($in && /^\s*-\s*alert:\s*/ && !/VoidAgentReceiptsStall\b/) { $in=0; }
' "$RULE_FILE"

echo
echo "=== [5] promtool check this file ==="
sudo promtool check rules "$RULE_FILE"

echo
echo "=== [6] reload Prometheus ==="
curl -fsS -X POST "$PROM/-/reload" >/dev/null || echo "[WARN] reload failed (missing --web.enable-lifecycle?)"

echo
echo "=== [7] verify: gated expr is empty when EXPECTED=0 ==="
curl -fsS "$PROM/api/v1/query" --data-urlencode 'query=(max(void_agent_receipts_expected) == 1)' | jq -c '.data.result'
curl -fsS "$PROM/api/v1/query" --data-urlencode \
'query=((rate(void_agent_receipts_total[10m]) == 0) and (max(void_agent_receipts_total) > 0) and (max(void_agent_receipts_expected) == 1))' \
| jq -c '.data.result'
curl -fsS "$PROM/api/v1/query" --data-urlencode 'query=ALERTS{alertname="VoidAgentReceiptsStall"}' | jq -c '.data.result'

echo
echo "=== [done] ==="
