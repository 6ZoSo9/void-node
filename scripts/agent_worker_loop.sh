#!/usr/bin/env bash
set -euo pipefail
: "${VOID_AGENT_TOKEN:?set VOID_AGENT_TOKEN in env}"
while :; do
  P=$(curl -sS -X POST 127.0.0.1:4100/agent/v0/pick2 \
      -H "Authorization: Bearer $VOID_AGENT_TOKEN" -H 'content-type: application/json' \
      -d '{"worker":"dev-worker-1"}')
  RID=$(jq -r '.job.id // empty' <<<"$P")
  if [[ -z "$RID" ]]; then sleep 1; continue; fi
  OUT='{"ok":true,"echo":'$P'}'
  curl -sS -X POST 127.0.0.1:4100/agent/v0/result/"$RID" \
    -H "Authorization: Bearer $VOID_AGENT_TOKEN" -H 'content-type: application/json' \
    -d '{"output":'"$OUT"'}' >/dev/null
done
