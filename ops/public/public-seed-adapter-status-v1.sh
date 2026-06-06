#!/usr/bin/env bash
set -euo pipefail

HOST="${VOID_ADAPTER_HOST:-127.0.0.1}"
PORT="${VOID_ADAPTER_PORT:-4111}"
BASE="http://${HOST}:${PORT}"

echo "=== VOID public seed adapter status v1 ==="
echo "base=$BASE"

if curl -fsS --max-time 5 "$BASE/__void/adapter.json" -o /tmp/void-adapter-status.json; then
  python3 -m json.tool /tmp/void-adapter-status.json >/dev/null
  grep -Fq '"adapter": "void_public_seed_adapter"' /tmp/void-adapter-status.json
  grep -Fq '"private_rpc_public": false' /tmp/void-adapter-status.json
  echo "[ok] adapter manifest reachable"
else
  echo "[down] adapter manifest not reachable"
  exit 1
fi

RPC_CODE="$(curl -sS -o /tmp/void-adapter-status-rpc.out -w "%{http_code}" --max-time 5 "$BASE/rpc" || true)"
if [ "$RPC_CODE" = "404" ] && grep -Fq "not_public" /tmp/void-adapter-status-rpc.out; then
  echo "[ok] private rpc blocked"
else
  echo "[fail] private rpc block check failed code=$RPC_CODE"
  exit 1
fi
