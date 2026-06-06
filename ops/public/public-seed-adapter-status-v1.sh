#!/usr/bin/env bash
set -euo pipefail

JSON_MODE=0
if [ "${1:-}" = "--json" ]; then
  JSON_MODE=1
fi

HOST="${VOID_ADAPTER_HOST:-100.122.79.39}"
PORT="${VOID_ADAPTER_PORT:-4111}"
BASE="http://${HOST}:${PORT}"

OUT="${OUT:-/tmp/void-public-seed-adapter-status-v1}"
mkdir -p "$OUT"

ADAPTER_JSON="$OUT/adapter.json"
BOOTSTRAP_JSON="$OUT/public-bootstrap.json"
RPC_OUT="$OUT/rpc.out"

adapter_manifest_reachable=false
private_rpc_blocked=false
public_bootstrap_reachable=false
overall_ok=false

adapter_error=""
rpc_status=""
bootstrap_error=""

if curl -fsS --max-time 5 "$BASE/__void/adapter.json" -o "$ADAPTER_JSON" 2>"$OUT/adapter.err"; then
  if python3 - "$ADAPTER_JSON" <<'PY'
import json, sys
j = json.load(open(sys.argv[1]))
assert j.get("adapter") == "void_public_seed_adapter"
assert j.get("private_rpc_public") is False
PY
  then
    adapter_manifest_reachable=true
  else
    adapter_error="adapter_manifest_invalid"
  fi
else
  adapter_error="$(tr '\n' ' ' < "$OUT/adapter.err" | head -c 200)"
fi

rpc_status="$(curl -sS -o "$RPC_OUT" -w "%{http_code}" --max-time 5 "$BASE/rpc" 2>/dev/null || true)"
if [ "$rpc_status" = "404" ] && grep -Fq "not_public" "$RPC_OUT" 2>/dev/null; then
  private_rpc_blocked=true
fi

if curl -fsS --max-time 5 "$BASE/__void/public-bootstrap.json" -o "$BOOTSTRAP_JSON" 2>"$OUT/bootstrap.err"; then
  if python3 - "$BOOTSTRAP_JSON" <<'PY'
import json, sys
j = json.load(open(sys.argv[1]))
assert j.get("schema") == "void_public_bootstrap_v1"
assert j.get("private_rpc_public") is False
PY
  then
    public_bootstrap_reachable=true
  else
    bootstrap_error="public_bootstrap_invalid"
  fi
else
  bootstrap_error="$(tr '\n' ' ' < "$OUT/bootstrap.err" | head -c 200)"
fi

if [ "$adapter_manifest_reachable" = true ] && [ "$private_rpc_blocked" = true ] && [ "$public_bootstrap_reachable" = true ]; then
  overall_ok=true
fi

if [ "$JSON_MODE" = 1 ]; then
  ADAPTER_OK="$adapter_manifest_reachable" \
  RPC_OK="$private_rpc_blocked" \
  BOOTSTRAP_OK="$public_bootstrap_reachable" \
  OVERALL_OK="$overall_ok" \
  BASE="$BASE" \
  RPC_STATUS="$rpc_status" \
  ADAPTER_ERROR="$adapter_error" \
  BOOTSTRAP_ERROR="$bootstrap_error" \
  python3 - <<'PY'
import json, os
print(json.dumps({
  "schema": "void_public_seed_adapter_status_v1",
  "ok": os.environ["OVERALL_OK"] == "true",
  "base": os.environ["BASE"],
  "checks": {
    "adapter_manifest_reachable": os.environ["ADAPTER_OK"] == "true",
    "private_rpc_blocked": os.environ["RPC_OK"] == "true",
    "public_bootstrap_reachable": os.environ["BOOTSTRAP_OK"] == "true",
  },
  "rpc_status": os.environ["RPC_STATUS"],
  "errors": {
    "adapter": os.environ["ADAPTER_ERROR"],
    "public_bootstrap": os.environ["BOOTSTRAP_ERROR"],
  }
}, indent=2, sort_keys=True))
PY
else
  echo "=== VOID public seed adapter status v1 ==="
  echo "base=$BASE"

  if [ "$adapter_manifest_reachable" = true ]; then
    echo "[ok] adapter manifest reachable"
  else
    echo "[fail] adapter manifest not reachable"
  fi

  if [ "$private_rpc_blocked" = true ]; then
    echo "[ok] private rpc blocked"
  else
    echo "[fail] private rpc block check failed code=$rpc_status"
  fi

  if [ "$public_bootstrap_reachable" = true ]; then
    echo "[ok] public bootstrap reachable"
  else
    echo "[fail] public bootstrap not reachable"
  fi
fi

if [ "$overall_ok" != true ]; then
  exit 1
fi
