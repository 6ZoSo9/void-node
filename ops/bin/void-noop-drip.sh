#!/usr/bin/env bash
set -euo pipefail
HTTP="${HTTP:-127.0.0.1:4100}"

log(){ if command -v systemd-cat >/dev/null; then systemd-cat -t void-noop-drip echo "$*"; else echo "[noop-drip] $*" >&2; fi; }

# proposer must be enabled
ENABLED=$(curl -fsS "http://$HTTP/proposer/auto/status2" | jq -r '.enabled // 0' || echo 0)
if [ "$ENABLED" != "1" ]; then log "proposer disabled; skip"; exit 0; fi

HEAD0=$(curl -fsS "http://$HTTP/blocks/latest/number2.json" | jq -r .number || echo -1)
sleep 6
HEAD1=$(curl -fsS "http://$HTTP/blocks/latest/number2.json" | jq -r .number || echo -1)

if [ "$HEAD0" != "$HEAD1" ]; then log "head moved ($HEAD0->$HEAD1); no nudge"; exit 0; fi

log "flat ($HEAD0->$HEAD1); nudging..."
# make sure exporter truth is marked + auto is on
curl -fsS -X POST "http://$HTTP/proposer/auto/start?ms=2000&dry=0&confirm=proposerAutoStart" >/dev/null || true

adv=0
for i in 1 2 3; do
  if curl -fsS -X POST "http://$HTTP/tx/dev/burst?n=1" >/dev/null 2>&1; then
    log "posted 1 dev tx (attempt $i)"
  else
    log "post failed (attempt $i)"
  fi
  sleep 3
  H=$(curl -fsS "http://$HTTP/blocks/latest/number2.json" | jq -r .number || echo -1)
  if [ "$H" != "$HEAD1" ]; then log "advanced ($HEAD1->$H)"; adv=1; break; fi
done

if [ "$adv" -eq 0 ]; then log "still flat after 3 tries (start=$HEAD0 now=$H)"; fi
exit 0
