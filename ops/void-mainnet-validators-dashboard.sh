#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$HOME/dev/void-node}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "=== [VOID mainnet — Validators dashboard helper] ==="
echo "[cfg] ROOT     = $ROOT"
echo "[cfg] PROM_URL = $PROM_URL"
echo

q() {
  local label="$1"
  local query="$2"
  echo "  $label"
  curl -fsS "$PROM_URL/api/v1/query" \
    --data-urlencode "query=$query" \
    | jq .
  echo
}

echo "=== [raw gauges] ==="
q "void_mainnet_validator_join_run_ok"      "void_mainnet_validator_join_run_ok"
q "void_mainnet_validators_run_health"      "void_mainnet_validators_run_health"

echo "=== [5m views] ==="
q "void:mainnet_validators:run:last_5m"     "void:mainnet_validators:run:last_5m"
q "void:mainnet_pillars_with_validators:health:last_5m" \
  "void:mainnet_pillars_with_validators:health:last_5m"

echo "=== [interpretation] ==="
cat <<'EOF'
- void_mainnet_validator_join_run_ok:
    1 => join/run rehearsal script is happy (roles + config sane)
    0 => something is wrong in the validator join/run pipeline.

- void_mainnet_validators_run_health:
    1 => Validators RUN pillar is green.
    0 => Validators RUN pillar is red (check ops/void-mainnet-validator-join-run.sh).

- void:mainnet_validators:run:last_5m:
    1 => 5m-smoothed view of validators_run_health is healthy.
    0 => has been unhealthy at some point in the last 5m.

- void:mainnet_pillars_with_validators:health:last_5m:
    This is the composite pillars+validators health gate:
      scalar(void_mainnet_pillars_health)
      * scalar(void_mainnet_validators_health)
      * scalar(void:mainnet_validators:run:last_5m)
    1 => core pillars + validators RUN pillar all green over last 5m.
    0 => at least one of them is unhealthy.
EOF

echo
echo "=== [Grafana / PromQL cheat-sheet] ==="
cat <<'EOF'
Single-stat / gauge panels:
  void_mainnet_validator_join_run_ok
  void_mainnet_validators_run_health
  void:mainnet_validators:run:last_5m
  void:mainnet_pillars_with_validators:health:last_5m

Examples:
  - Validators RUN pillar (5m view):
      query: void:mainnet_validators:run:last_5m

  - Pillars + Validators composite (5m view):
      query: void:mainnet_pillars_with_validators:health:last_5m
EOF

echo
echo "[validators-dashboard] DONE."
