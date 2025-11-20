#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$(pwd)}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

# Make sure Foundry bin is in PATH (for this user)
FOUND_BIN="$HOME/.foundry/bin"
case ":$PATH:" in
  *":$FOUND_BIN:"*) ;;
  *) PATH="$FOUND_BIN:$PATH" ;;
esac

echo "[smoke] repo=$REPO"
echo "[smoke] rpc_url=$RPC_URL"
echo "[smoke] prom_url=$PROM_URL"
echo "[smoke] PATH=$PATH"
echo

# 1) Run healer as root but **preserve PATH** so root can see 'cast'
echo "[smoke] running devnet coverage healer (sudo, PATH passthrough)..."
sudo env REPO="$REPO" RPC_URL="$RPC_URL" PATH="$PATH" \
  "$REPO/ops/void-devnet-coverage-heal.sh"

echo
echo "[smoke] textfile snapshot:"
sed -n '1,40p' /var/lib/node_exporter/textfile_collector/void_devnet_coverage.prom || {
  echo "[smoke] ERROR: cannot read void_devnet_coverage.prom" >&2
  exit 1
}

echo
echo "[smoke] Prometheus metrics snapshot:"

q_coverage='void_devnet_coverage'
q_cov_health='void_devnet_coverage_health'
q_cov_v2='void_devnet_receipts_coverage_v2'
q_cov_v2_health='void_devnet_receipts_health_v2'

cov="$(curl -fsS "$PROM_URL/api/v1/query" --data-urlencode "query=$q_coverage"          | jq -r '.data.result[0].value[1] // "NaN"')"
cov_h="$(curl -fsS "$PROM_URL/api/v1/query" --data-urlencode "query=$q_cov_health"      | jq -r '.data.result[0].value[1] // "NaN"')"
cov2="$(curl -fsS "$PROM_URL/api/v1/query" --data-urlencode "query=$q_cov_v2"           | jq -r '.data.result[0].value[1] // "NaN"')"
cov2_h="$(curl -fsS "$PROM_URL/api/v1/query" --data-urlencode "query=$q_cov_v2_health"  | jq -r '.data.result[0].value[1] // "NaN"')"

echo "  void_devnet_coverage              = $cov"
echo "  void_devnet_coverage_health       = $cov_h"
echo "  void_devnet_receipts_coverage_v2  = $cov2"
echo "  void_devnet_receipts_health_v2    = $cov2_h"

echo
echo "[smoke] EXPECTED (current chain state):"
echo "  - coverage             ~= 1.000000"
echo "  - coverage_health      = 1"
echo "  - receipts_coverage_v2 ~= 1.25"
echo "  - receipts_health_v2   = 1"
