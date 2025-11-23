#!/usr/bin/env bash
set -euo pipefail

echo "=== [4100 → /metrics/void/proposer.v3b.prom (first 80 lines)] ==="
if curl -fsS 'http://127.0.0.1:4100/metrics/void/proposer.v3b.prom' | sed -n '1,80p'; then
  echo
else
  echo "[warn] failed to fetch proposer.v3b.prom from 4100" >&2
fi

echo
echo "=== [grep for void_proposer_auto_* in proposer.v3b.prom] ==="
if curl -fsS 'http://127.0.0.1:4100/metrics/void/proposer.v3b.prom' 2>/dev/null \
  | grep 'void_proposer_auto' || true; then
  echo
else
  echo "[info] no void_proposer_auto_* lines in proposer.v3b.prom" >&2
fi

echo
echo "=== [Prometheus raw: void_proposer_auto_enabled] ==="
curl -fsS 'http://127.0.0.1:9090/api/v1/query?query=void_proposer_auto_enabled' \
  | jq '.data.result'

echo
echo "=== [Prometheus raw: void_proposer_auto_ms] ==="
curl -fsS 'http://127.0.0.1:9090/api/v1/query?query=void_proposer_auto_ms' \
  | jq '.data.result'

echo
echo "=== [Prometheus activeTargets with 'proposer' in job label] ==="
curl -fsS 'http://127.0.0.1:9090/api/v1/targets' \
  | jq '.data.activeTargets[] 
        | select(.labels.job|tostring|test("proposer")) 
        | {job: .labels.job, instance: .labels.instance, health: .health, scrapeUrl: .scrapeUrl}'
