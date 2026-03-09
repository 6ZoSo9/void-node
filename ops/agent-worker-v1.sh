#!/usr/bin/env bash
set -euo pipefail
set +H; set +o histexpand || true

ROOT="${ROOT:-$HOME/dev/void-node}"
BASE="${BASE:-http://127.0.0.1:4100}"
TOKF="${TOKF:-$ROOT/.secrets/agent.token}"
WORKER="${WORKER:-local-worker-v1}"
SLEEP_MS="${SLEEP_MS:-1500}"

[ -s "$TOKF" ] || { echo "[FAIL] missing token file: $TOKF" >&2; exit 1; }
H="authorization: Bearer $(cat "$TOKF")"

sleep_ms(){ python3 -c "import time; time.sleep(float(\"$1\")/1000.0)"; }

# POST JSON; return 0 iff HTTP 2xx (swallow stdout/stderr; this worker is quiet)
post_json_ok(){
  local path="$1"
  local body="$2"
  local out code
  out="$(mktemp -t agentw.out.XXXXXX)"
  code="$(curl -sS --max-time 6 -o "$out" -w "%{http_code}" \
    -X POST "$BASE$path" -H "$H" -H "content-type: application/json" -d "$body" || true)"
  rm -f "$out" 2>/dev/null || true
  [[ "$code" =~ ^2 ]]
}

echo "[ok] worker start: BASE=$BASE WORKER=$WORKER SLEEP_MS=$SLEEP_MS"

while true; do
  pick="$(curl -fsS --max-time 5 -X POST "$BASE/agent/v0/pick2" -H "$H" -H "content-type: application/json" \
    -d "{\"worker\":\"$WORKER\"}" 2>/dev/null || true)"

  ok="$(printf "%s" "$pick" | jq -er "if type==\"object\" then (.ok // false) else false end" 2>/dev/null || echo false)"
  jid="$(printf "%s" "$pick" | jq -er "if type==\"object\" then (.job.id // \"\") else \"\" end" 2>/dev/null || echo "")"
  msg="$(printf "%s" "$pick" | jq -er "if type==\"object\" then (.job.input.msg // \"\") else \"\" end" 2>/dev/null || echo "")"

  if [ "$ok" != "true" ] || [ -z "$jid" ]; then
    sleep_ms "$SLEEP_MS"
    continue
  fi

  body_result="$(jq -cn --arg m "$msg" --arg w "$WORKER" --arg ts "$(date -Is)" \
    "{ok:true, output:{ok:true, kind:\"echo\", msg:\$m, worker:\$w, ts:\$ts}}")"

  # IMPORTANT: only hit /result/:id once; do NOT call /done, /fail, or /receipt
  post_json_ok "/agent/v0/result/$jid" "$body_result" >/dev/null 2>&1 || true

  sleep_ms "$SLEEP_MS"
done
