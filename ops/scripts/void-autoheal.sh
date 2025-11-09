#!/usr/bin/env bash
set -euo pipefail

PROM="http://127.0.0.1:9090/api/v1/query"
NODE="http://127.0.0.1:4100"
TFD="${TEXTFILE_DIR:-/var/lib/node_exporter/textfile_collector}"
OUT="$TFD/void_autoheal.prom"
TMP="$OUT.$$"

q() { curl -fsS -G "$PROM" --data-urlencode "query=$1" | jq -r '.data.result[0].value[1] // empty'; }

txok="$(q 'void:txroot_ok:scalar')"
slok="$(q 'void:seals_ok:scalar')"
walok="$(q 'void:wal_ok:scalar')"
[[ -z "$txok$slok$walok" ]] && txok="NaN" && slok="NaN" && walok="NaN"

# Read raw inputs we might need for conditional nudges
mp="$(curl -fsS "$NODE/mempool/global/size.json" | jq -r '.size // 0' || echo 0)"

fired=0
act="none"

# If WAL not OK, brake (your unit already flips proposer off/on)
if [[ "$walok" = "0" ]]; then
  systemctl --user start void-wal-autobrake.service || true
  fired=$((fired+1)); act="${act},brake"
fi

# If seals leg is down but txroot is OK, try to nudge head:
#  - run autorescue (checks advance)
#  - if mempool==0, inject single NOOP via emptyfill
if [[ "$slok" = "0" && "$txok" = "1" ]]; then
  systemctl --user start void-proposer-autorescue.service || true
  fired=$((fired+1)); act="${act},autorescue"
  if [[ "$mp" = "0" ]]; then
    systemctl --user start void-emptyfill.service || true
    fired=$((fired+1)); act="${act},emptyfill"
  fi
fi

# If txroot is down, just flag it (don’t take destructive action here)
if [[ "$txok" = "0" ]]; then
  act="${act},txroot-watch"
fi

# Emit textfile
{
  echo "# HELP void_autoheal_actions_total Total actions fired by autoheal"
  echo "# TYPE void_autoheal_actions_total counter"
  echo "void_autoheal_actions_total $fired"
  echo "# HELP void_autoheal_last_action Last action string (info gauge=1)"
  echo "# TYPE void_autoheal_last_action gauge"
  # Encode action string as a label; value always 1
  printf 'void_autoheal_last_action{act="%s"} 1\n' "${act#,}"
} >"$TMP"
mv -f "$TMP" "$OUT"
chmod 0644 "$OUT"
