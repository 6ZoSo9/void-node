#!/usr/bin/env bash

# AUTOSUDO_TEXTFILE_WRAPPER_V1
TF_DIR="/var/lib/node_exporter/textfile_collector"
if [ "${EUID:-$(id -u)}" != "0" ] && [ ! -w "$TF_DIR" ]; then
  exec sudo -n "$0" "$@"
fi

set -euo pipefail

# systemd can run with a tiny PATH; be explicit
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

# IMPORTANT: do NOT depend on $HOME (can be unset under systemd root)
DEFAULT_DATA_DIR="/home/zoso/dev/void-node/data_a"
DATA_DIR="${DATA_DIR:-$DEFAULT_DATA_DIR}"

RFILE="$DATA_DIR/datanet/receipts/datanet.jsonl"
OUT="/var/lib/node_exporter/textfile_collector/void_datanet_http_receipts.prom.$$"
FINAL="/var/lib/node_exporter/textfile_collector/void_datanet_http_receipts.prom"

N="${TAIL_LINES:-5000}"
now="$(date +%s)"

# default zeros (always numeric)
pub_ok=0; pub_fail=0; pub_who_missing=0
fet_ok=0; fet_fail=0; fet_who_missing=0

count_lines() {
  # usage: count_lines "<haystack>" "<rg1>" "<rg2>"
  # returns a number, always
  local hay="$1"
  local q1="$2"
  local q2="${3:-}"
  if [ -z "$q2" ]; then
    printf '%s\n' "$hay" \
      | rg -F "$q1" 2>/dev/null \
      | wc -l | tr -d ' ' \
      || echo 0
  else
    printf '%s\n' "$hay" \
      | rg -F "$q1" 2>/dev/null \
      | rg -F "$q2" 2>/dev/null \
      | wc -l | tr -d ' ' \
      || echo 0
  fi
}

if [ -r "$RFILE" ]; then
  T="$(tail -n "$N" "$RFILE" 2>/dev/null || true)"

  pub_ok="$(count_lines "$T" '"op":"datanet_publish_http_mw_v1"' '"ok":1')"
  pub_fail="$(count_lines "$T" '"op":"datanet_publish_http_mw_v1"' '"ok":0')"
  pub_who_missing="$(
    printf '%s\n' "$T" \
      | rg -F '"op":"datanet_publish_http_mw_v1"' 2>/dev/null \
      | rg -n -e '"who":null' -e '"who":""' -e '"who":"null"' 2>/dev/null \
      | wc -l | tr -d ' ' \
      || echo 0
  )"

  fet_ok="$(count_lines "$T" '"op":"datanet_fetch_http_mw_v1"' '"ok":1')"
  fet_fail="$(count_lines "$T" '"op":"datanet_fetch_http_mw_v1"' '"ok":0')"
  fet_who_missing="$(
    printf '%s\n' "$T" \
      | rg -F '"op":"datanet_fetch_http_mw_v1"' 2>/dev/null \
      | rg -n -e '"who":null' -e '"who":""' -e '"who":"null"' 2>/dev/null \
      | wc -l | tr -d ' ' \
      || echo 0
  )"
fi

# final safety: strip non-digits (should be unnecessary, but keeps Prom clean)
pub_ok="${pub_ok//[^0-9]/}"; pub_ok="${pub_ok:-0}"
pub_fail="${pub_fail//[^0-9]/}"; pub_fail="${pub_fail:-0}"
pub_who_missing="${pub_who_missing//[^0-9]/}"; pub_who_missing="${pub_who_missing:-0}"
fet_ok="${fet_ok//[^0-9]/}"; fet_ok="${fet_ok:-0}"
fet_fail="${fet_fail//[^0-9]/}"; fet_fail="${fet_fail:-0}"
fet_who_missing="${fet_who_missing//[^0-9]/}"; fet_who_missing="${fet_who_missing:-0}"

{
  echo "# HELP void_datanet_http_receipts_exporter_ts_seconds Exporter timestamp"
  echo "# TYPE void_datanet_http_receipts_exporter_ts_seconds gauge"
  echo "void_datanet_http_receipts_exporter_ts_seconds $now"

  echo "# HELP void_datanet_publish_http_mw_ok_total Count of publish receipts (ok=1) observed in tail window"
  echo "# TYPE void_datanet_publish_http_mw_ok_total gauge"
  echo "void_datanet_publish_http_mw_ok_total $pub_ok"

  echo "# HELP void_datanet_publish_http_mw_fail_total Count of publish receipts (ok=0) observed in tail window"
  echo "# TYPE void_datanet_publish_http_mw_fail_total gauge"
  echo "void_datanet_publish_http_mw_fail_total $pub_fail"

  echo "# HELP void_datanet_publish_http_mw_missing_who_total Count of publish receipts with missing who observed in tail window"
  echo "# TYPE void_datanet_publish_http_mw_missing_who_total gauge"
  echo "void_datanet_publish_http_mw_missing_who_total $pub_who_missing"

  echo "# HELP void_datanet_fetch_http_mw_ok_total Count of fetch receipts (ok=1) observed in tail window"
  echo "# TYPE void_datanet_fetch_http_mw_ok_total gauge"
  echo "void_datanet_fetch_http_mw_ok_total $fet_ok"

  echo "# HELP void_datanet_fetch_http_mw_fail_total Count of fetch receipts (ok=0) observed in tail window"
  echo "# TYPE void_datanet_fetch_http_mw_fail_total gauge"
  echo "void_datanet_fetch_http_mw_fail_total $fet_fail"

  echo "# HELP void_datanet_fetch_http_mw_missing_who_total Count of fetch receipts with missing who observed in tail window"
  echo "# TYPE void_datanet_fetch_http_mw_missing_who_total gauge"
  echo "void_datanet_fetch_http_mw_missing_who_total $fet_who_missing"
} > "$OUT"

mv -f "$OUT" "$FINAL"
