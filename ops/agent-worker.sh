#!/usr/bin/env bash
set -euo pipefail
BASE=${BASE:-http://127.0.0.1:4100}
LEASE_MS=${LEASE_MS:-30000}
TOKEN=${VOID_AGENT_TOKEN:-}
HDR_COMMON=(-H 'content-type: application/json')
[[ -n "$TOKEN" ]] && HDR_COMMON+=(-H "x-agent-token: ${TOKEN}")

heartbeat(){ curl -fsS -X POST "$BASE/agent/v0/extend/$1?ms=$LEASE_MS" >/dev/null || true; }

while true; do
  ids=$(curl -fsS -X POST "$BASE/agent/v0/lease?max=1" "${HDR_COMMON[@]}" | jq -r '.jobs[].id')
  [[ -z "$ids" ]] && sleep 1 && continue
  for id in $ids; do
    ( for i in {1..10}; do heartbeat "$id"; sleep 5; done ) & hb=$!
    # pretend work
    sleep 1
    body='{"ok":true,"output":{"echo":true}}'
    if curl -fsS -X POST "$BASE/agent/v0/done/$id" "${HDR_COMMON[@]}" -d "$body" >/dev/null; then
      # ALSO write the receipt so results.jsonl includes output
      curl -fsS -X POST "$BASE/agent/v0/receipt/$id" "${HDR_COMMON[@]}" -d "$body" >/dev/null || true
    else
      curl -fsS -X POST "$BASE/agent/v0/fail/$id" "${HDR_COMMON[@]}" -d '{"retry":true,"error":"worker-fail"}' >/dev/null || true
    fi
    kill $hb >/dev/null 2>&1 || true
  done
done
