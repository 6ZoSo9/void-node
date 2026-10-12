#!/usr/bin/env bash
set -euo pipefail
export PATH="/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin"

TS="$(date +%Y%m%d-%H%M%S)"
OUT="/tmp/void-agent-receipts-split-prepush-smoke.$TS.out.txt"
exec > >(tee -a "$OUT") 2>&1
echo "saved=$OUT"
echo

PROM="${PROM:-http://127.0.0.1:9090}"
cd "$HOME/dev/void-node"

prom_scalar () {
  local expr="$1"
  curl -fsS --max-time 3 -G "$PROM/api/v1/query" \
    --data-urlencode "query=$expr" \
  | jq -r '
      if .data.resultType=="scalar" then (.data.result[1] // "")
      elif .data.resultType=="vector" then (.data.result[0].value[1] // "")
      else "" end
    ' 2>/dev/null || true
}

echo "=== [0] agent receipts split exporter UP scalar ==="
v="$(prom_scalar 'scalar(up{job="void-agent-receipts-split"} == 1)')"
echo "agent_receipts_split_up_scalar=${v:-<empty>}"

echo
echo "=== [1] run prepush checker and show exit code ==="
set +e
bash ops/bin/void-proposer-v3b-pillars-check.sh >/tmp/void-prepush-check.last.txt 2>&1
RC=$?
set -e
echo "checker_rc=$RC"
echo "--- last checker output (tail 120) ---"
tail -n 120 /tmp/void-prepush-check.last.txt || true

if [ "$RC" -eq 0 ]; then
  echo "[PASS] prepush checker passed"
else
  echo "[FAIL] prepush checker failed"
fi
