#!/usr/bin/env bash
set -euo pipefail
HTTP="${HTTP_PORT:-4100}"
DIR="${TEXTFILE_DIR:-$HOME/.cache/node-exporter-textfile}"
OUT="$DIR/void_autorescue.prom"
TMP="$OUT.tmp.$$"
mkdir -p "$DIR" || true

curl_json() { curl -fsS --max-time 2 "http://127.0.0.1:${HTTP}$1" || true; }
curl_ok()   { curl -fsS -o /dev/null --max-time 2 "http://127.0.0.1:${HTTP}$1" || true; }

enable_auto() {
  curl_ok "/proposer/auto/start?ms=${PROPOSER_TICK_MS:-2000}"
  curl_ok "/proposer/auto/start"
  curl_ok "/proposer/auto/enable2"
  curl_ok "/proposer/auto/enable"
}
fire_rescue() {
  curl_ok '/proposer/hook/run?name=rescue-v1&max=10'
  curl_ok '/proposer/hook/run2?name=rescue-v1&max=10'
  curl_ok '/proposer/rescue/run?name=rescue-v1&max=10'
}

S=$(curl_json "/proposer/auto/status2")
EN=$(echo "$S" | jq -r '.enabled // 0' 2>/dev/null || echo 0)

# If mempool is 0, we don't call it a stall (avoids false alarms when empty-blocks are off)
MP=$(curl_json "/mempool/global/size.json" | jq -r '.size // 0' 2>/dev/null || echo 0)

H0=$(curl -fsS --max-time 2 "http://127.0.0.1:${HTTP}/head.txt" 2>/dev/null | head -1 || echo -1)
sleep 6
H1=$(curl -fsS --max-time 2 "http://127.0.0.1:${HTTP}/head.txt" 2>/dev/null | head -1 || echo -1)
ADV=0; [[ "$H1" =~ ^[0-9]+$ && "$H0" =~ ^[0-9]+$ && "$H1" -gt "$H0" ]] && ADV=1

OK=0; STALL=0; FIRED=0
if [[ "$EN" = "1" && "$ADV" = "0" && "$MP" -gt 0 ]]; then
  STALL=1; enable_auto; fire_rescue; FIRED=1
else
  OK=1
fi

cat >"$TMP" <<EOF
# HELP void_autorescue_ok Last run saw progress (1/0)
# TYPE void_autorescue_ok gauge
void_autorescue_ok $OK
# HELP void_autorescue_stall Stall detected (1/0)
# TYPE void_autorescue_stall gauge
void_autorescue_stall $STALL
# HELP void_autorescue_fired_total Number of rescues fired
# TYPE void_autorescue_fired_total counter
void_autorescue_fired_total $FIRED
EOF
mv -f "$TMP" "$OUT"
chmod 0644 "$OUT"
