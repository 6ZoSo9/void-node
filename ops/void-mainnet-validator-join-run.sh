#!/usr/bin/env bash
set -euo pipefail

# Dry-run / sanity script for validator0 join RUN pillar.
# - NO BROADCAST HAPPENS HERE.
# - Uses Prometheus validators PLAN health instead of a textfile metric.
# - ChainId check is best-effort: warns if 'cast' not available but does not fail.

REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
cd "$REPO_ROOT"

VALIDATOR_NAME="${VALIDATOR_NAME:-validator0}"

# Auto-discover the validator0 bootstrap doc unless VALIDATOR_DOC is explicitly set.
if [[ -z "${VALIDATOR_DOC:-}" ]]; then
  CANDIDATE="$(find "$REPO_ROOT/docs" -maxdepth 4 -type f -iname 'VOID-MAINNET-VALIDATOR0-BOOTSTRAP.md' | head -n1 || true)"
  if [[ -n "$CANDIDATE" ]]; then
    VALIDATOR_DOC="$CANDIDATE"
  else
    VALIDATOR_DOC="$REPO_ROOT/docs/VOID-MAINNET-VALIDATOR0-BOOTSTRAP.md"
  fi
fi

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
CHAIN_ID_EXPECTED="${CHAIN_ID_EXPECTED:-2050}"

err() {
  echo "[validator-join-run] $*" >&2
}

echo "=== [validator-join-run] sanity checks ==="
echo "[info] using REPO_ROOT=$REPO_ROOT"
echo "[info] using VALIDATOR_DOC=$VALIDATOR_DOC"
echo "[info] using PROM_URL=$PROM_URL"
echo "[info] using RPC_URL=$RPC_URL"

# 1) Doc sanity
if [[ ! -s "$VALIDATOR_DOC" ]]; then
  err "bootstrap doc not found or empty: $VALIDATOR_DOC"
  exit 1
fi
echo "[ok] bootstrap doc exists: $VALIDATOR_DOC"

# 2) Validators PLAN health via Prometheus
if ! command -v curl >/dev/null 2>&1; then
  err "'curl' not found; cannot query Prometheus"
  exit 1
fi
if ! command -v jq >/dev/null 2>&1; then
  err "'jq' not found; cannot parse Prometheus response"
  exit 1
fi

PLAN_QUERY='void:mainnet_validators:plan:last_5m or void_mainnet_validators_plan_health'

echo "[info] querying Prometheus for validators PLAN health:"
echo "       $PLAN_QUERY"

PROM_RESP="$(curl -fsS "$PROM_URL/api/v1/query" \
  --data-urlencode "query=$PLAN_QUERY" || true)"

if [[ -z "$PROM_RESP" ]]; then
  err "empty response from Prometheus at $PROM_URL"
  exit 1
fi

PLAN_VAL="$(echo "$PROM_RESP" | jq -r '.data.result[0].value[1] // empty' 2>/dev/null || true)"

if [[ -z "$PLAN_VAL" ]]; then
  err "no result for validators PLAN metric from Prometheus"
  echo "[debug] raw response:"
  echo "$PROM_RESP"
  exit 1
fi

echo "[info] validators PLAN value from Prometheus = $PLAN_VAL"

if [[ "$PLAN_VAL" != "1" ]]; then
  err "validators PLAN health is not 1 (got $PLAN_VAL); RUN stub refuses to proceed"
  exit 1
fi

echo "[ok] validators PLAN health is 1 via Prometheus"

# 3) RPC chainId sanity (best-effort)
CAST_BIN="${CAST_BIN:-$(command -v cast 2>/dev/null || true)}"

if [[ -n "$CAST_BIN" ]]; then
  CHAIN_ID="$("$CAST_BIN" chain-id --rpc-url "$RPC_URL")"
  echo "[info] chainId($RPC_URL) = $CHAIN_ID"
  if [[ "$CHAIN_ID" != "$CHAIN_ID_EXPECTED" ]]; then
    err "chainId mismatch: expected $CHAIN_ID_EXPECTED, got $CHAIN_ID"
    exit 1
  fi
  echo "[ok] chainId sanity check passed"
else
  echo "[warn] 'cast' not found in PATH; skipping chainId check (best-effort)."
  echo "[warn] For full validation, run this script as your normal user with Foundry installed."
fi

echo
echo "=== [validator-join-run] STUB simulate-only path ==="
echo "RPC_URL        = $RPC_URL"
echo "VALIDATOR_NAME = $VALIDATOR_NAME"
echo "VALIDATOR_DOC  = $VALIDATOR_DOC"
echo "PLAN_METRIC    = validators PLAN health via Prometheus (== 1)"
echo
echo "No on-chain join is performed here."
echo "When the real validator-join Foundry script exists, call it here in NON-broadcast mode."
echo
echo "[validator-join-run] DONE (stub, all sanity checks passed)."

exit 0
