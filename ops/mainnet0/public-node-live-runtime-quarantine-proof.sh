#!/usr/bin/env bash
set -euo pipefail

OBJECT_ID="${1:-live-import-demo-002.txt}"
SHA256_EXPECTED="${2:-264e0d3832fbad60f3a5bd574794148a0db313583717c4b6bedb94e7db75e871}"
BASE="${BASE:-http://127.0.0.1:4100}"
SERVICE="${SERVICE:-void-node-live.service}"

echo "=== VOID Public Node Live Runtime Quarantine Proof v1 ==="
echo "marker=VOID_PUBLIC_NODE_LIVE_RUNTIME_QUARANTINE_PROOF_V1"
echo "head=$(git rev-parse --short=8 HEAD)"
echo "service=${SERVICE}"
echo "object_id=${OBJECT_ID}"
echo "sha256=${SHA256_EXPECTED}"

legacy_active="$(systemctl --user is-active void-node.service 2>/dev/null || true)"
legacy_enabled="$(systemctl --user is-enabled void-node.service 2>/dev/null || true)"
live_active="$(systemctl --user is-active "$SERVICE" 2>/dev/null || true)"
pid="$(systemctl --user show -p MainPID --value "$SERVICE" 2>/dev/null || true)"

echo "legacy_active=${legacy_active}"
echo "legacy_enabled=${legacy_enabled}"
echo "live_active=${live_active}"
echo "live_mainpid=${pid}"

test "$legacy_active" != "active"
test "$legacy_enabled" != "enabled"
test "$live_active" = "active"
test -n "$pid"
test "$pid" != "0"

env_dump="$(tr '\0' '\n' < "/proc/${pid}/environ")"
for key in \
  VOID_QUARANTINE_HOT_RUNTIME=1 \
  VOID_DISABLE_WRAPPER_STORM=1 \
  VOID_DISABLE_TERMINAL_SAVEBLOCK=1 \
  VOID_DISABLE_TERMINAL_SAVEBLOCK_V2=1 \
  VOID_DISABLE_TXROOT_CORE_BUCKET=1 \
  VOID_DISABLE_TXROOT_HEADER_NOOP=1 \
  VOID_DISABLE_EARLY_WRAPPER_FAMILY=1 \
  VOID_DISABLE_DEDUPE_TRUTHFIX_FORENSICS=1 \
  VOID_DISABLE_SAVEBLOCK_TAIL=1 \
  VOID_DISABLE_FINALIZE_WAL_COMMIT=1 \
  VOID_TXROOT_OBSERVER_DISABLE=1 \
  VOID_TXROOT_FORENSICS_STICKY_DISABLE=1 \
  VOID_DISABLE_DRIFT=1 \
  VOID_DRIFT_DISABLE=1
do
  printf '%s\n' "$env_dump" | grep -qx "$key"
done
echo "quarantine_env_verified=true"

curl -fsS --max-time 5 "$BASE/version" >/tmp/void-live-runtime-quarantine-version.json
echo "version_http_ok=true"

timeout 30s bash ops/mainnet0/public-node-local-data-drop-object-endpoints-proof.sh "$OBJECT_ID" "$SHA256_EXPECTED"

curl -fsS --max-time 5 "$BASE/public-node/local-data-drop/proof/${SHA256_EXPECTED}.json" >/tmp/void-live-runtime-quarantine-proof.json

echo "VOID_PUBLIC_NODE_LIVE_RUNTIME_QUARANTINE_PROOF_V1_GREEN"
