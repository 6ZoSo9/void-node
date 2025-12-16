#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$HOME/dev/void-node}"
cd "$ROOT"

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"
STATE="${STATE:-docs/VOID-DEVNET-PROTOCOL-STATE.json}"

need(){ command -v "$1" >/dev/null 2>&1 || { echo "[ERR] missing dep: $1"; exit 10; }; }
need curl
need jq
need python3

is_addr(){ [[ "${1:-}" =~ ^0x[0-9a-fA-F]{40}$ ]]; }

prom_q(){
  local q="$1"
  curl -fsS --get "$PROM_URL/api/v1/query" --data-urlencode "query=$q" \
    | jq -r '.data.result[0].value[1] // empty' 2>/dev/null || true
}

get_addr(){
  local key="$1"
  [ -f "$STATE" ] || { echo ""; return 0; }
  python3 - "$key" "$STATE" <<'PY' || true
import json, re, sys
from pathlib import Path
key = sys.argv[1]
p = Path(sys.argv[2])
addr_re = re.compile(r"^0x[0-9a-fA-F]{40}$")

def pick(v):
  if isinstance(v,str) and addr_re.match(v): return v
  if isinstance(v,dict):
    vv=v.get("address")
    if isinstance(vv,str) and addr_re.match(vv): return vv
  return None

try:
  s=json.loads(p.read_text(encoding="utf-8"))
except Exception:
  print(""); raise SystemExit(0)

cand = pick(s.get(key)) if isinstance(s,dict) else None
if not cand and isinstance(s,dict) and isinstance(s.get("contracts"),dict):
  cand = pick(s["contracts"].get(key))
print(cand or "")
PY
}

echo "[agent-ci] repo=$(pwd)"
echo "[agent-ci] prom_url=$PROM_URL"
echo "[agent-ci] state=$STATE"

m="$(prom_q 'void_models_devnet_health')"
d="$(prom_q 'void_datasets_devnet_health')"
a="$(prom_q 'void_agentreg_devnet_health')"

echo "[agent-ci] prom: models=$m datasets=$d agentreg=$a"

# if Prom says healthy, we treat devnet CI as OK even if state JSON lacks addresses.
if [ "${m:-0}" = "1" ] && [ "${d:-0}" = "1" ] && [ "${a:-0}" = "1" ]; then
  addr="$(get_addr AgentRegistry)"
  if is_addr "$addr" && command -v cast >/dev/null 2>&1; then
    code="$(cast code --rpc-url "${RPC_URL:-http://127.0.0.1:8545}" "$addr" 2>/dev/null || true)"
    if [ -n "$code" ] && [ "$code" != "0x" ]; then
      echo "[agent-ci] optional: AgentRegistry bytecode present at $addr"
    else
      echo "[agent-ci] optional: could not confirm bytecode (ok for CI gate)"
    fi
  else
    echo "[agent-ci] NOTE: AgentRegistry.address missing/invalid in state; Prom health is source of truth for devnet gate."
  fi
  echo "[agent-ci] RESULT: OK"
  exit 0
fi

echo "[agent-ci] RESULT: FAIL (Prom health not all 1)"
exit 2
