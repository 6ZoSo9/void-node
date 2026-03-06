#!/usr/bin/env bash
set -euo pipefail
set +H; set +o histexpand || true

ROOT="${ROOT:-$HOME/dev/void-node}"
TOKF="${TOKF:-$ROOT/.secrets/agent.token}"
BASE="${BASE:-http://127.0.0.1:4100}"
WORKER="${WORKER:-local-worker-v1}"
SLEEP_MS="${SLEEP_MS:-2000}"

tok="$(cat "$TOKF" 2>/dev/null || true)"
if [ -z "${tok:-}" ]; then
  echo "[FAIL] empty token in $TOKF" >&2
  exit 2
fi
H="x-agent-token: $tok"

msleep(){ python3 - <<PY
import time
time.sleep(${SLEEP_MS}/1000.0)
PY
}

post(){ local p="$1" body="$2"
  curl -fsS --max-time 3 -X POST "$BASE$p" -H "$H" -H "content-type: application/json" -d "$body"
}

# one iteration: pick2 -> run -> result -> receipt
step(){
  pick="1000 4 24 27 30 46 100 114 125 992 1000 1001post /agent/v0/pick2 "{\"worker\":\"\"}" 2>/dev/null)" || { backoff; return 0; }
  ok="$(printf "%s" "$pick" | jq -r ".ok // false")"
  [ "$ok" = "true" ] || return 0

  jid="$(printf "%s" "$pick" | jq -r ".job.id // empty")"
  [ -n "$jid" ] || return 0

  kind="$(printf "%s" "$pick" | jq -r ".job.kind // empty")"
  input="$(printf "%s" "$pick" | jq -c ".job.input // {}")"

  # minimal built-ins
  out="{}"
  if [ "$kind" = "echo" ]; then
    msg="$(printf "%s" "$input" | jq -r ".msg // \"\"")"
    out="$(jq -cn --arg msg "$msg" --arg worker "$WORKER" --arg ts "$(date -Is)" "{msg:\$msg, worker:\$worker, ts:\$ts}")"
  elif [ "$kind" = "noop" ] || [ -z "$kind" ]; then
    out="$(jq -cn --arg worker "$WORKER" --arg ts "$(date -Is)" "{ok:true, worker:\$worker, ts:\$ts}")"
  else
    # unknown job kind: mark failed (so it doesn’t jam the queue)
    curl -fsS --max-time 3 -X POST "$BASE/agent/v0/fail/$jid" -H "$H" -H "content-type: application/json" \
      -d "$(jq -cn --arg e "unsupported kind: $kind" "{error:\$e}")" >/dev/null 2>&1 || true
    return 0
  fi

  # post result (NOTE: no bash expansion inside jq program)
  body_result="$(jq -cn --argjson outj "$out" "{ok:true, output:\$outj}")"
  post "/agent/v0/result/$jid" "$body_result" >/dev/null 2>&1 || true

  # receipt is now canonicalized server-side by POST /agent/v0/result/:id
  # do NOT post a second explicit /agent/v0/receipt here, or receipts.jsonl duplicates per job.
}

while true; do
  step || true
  msleep
done
