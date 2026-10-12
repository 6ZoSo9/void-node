#!/usr/bin/env bash
set -euo pipefail

PROM="${PROM:-http://127.0.0.1:9090/api/v1/query}"
EXPORTER="${EXPORTER:-http://127.0.0.1:9100/metrics}"
TEXTFILE="/var/lib/node_exporter/textfile/void_lag_to_head.prom"

qprom() {
  curl -fsS --get "$PROM" --data-urlencode "query=$1" \
  | jq -r '.data.result[0].value[1] // "NA"'
}

qexp() {
  # return first number matching ^void_lag_to_head <num>
  curl -fsS "$EXPORTER" \
  | awk '/^void_lag_to_head[[:space:]]+/ {print $2; exit}' \
  | sed -e 's/[[:space:]]//g' -e 's/^$/NA/'
}

now(){ date +%s; }

refresh_all(){
  /usr/bin/sudo /usr/local/bin/void-breadcrumbs-refresh.sh
  /usr/bin/sudo /usr/local/bin/void-rollup-textfile.sh
  /usr/bin/sudo /usr/local/bin/void-overall-textfile.sh
}

wait_for_prom(){
  local expr="$1" want="$2" timeout_s="${3:-90}" start="$(now)" got="NA"
  while :; do
    got="$(qprom "$expr" || echo NA)"
    if [ "$got" = "$want" ]; then echo "OK (Prom): $expr == $want"; return 0; fi
    if [ $(( $(now) - start )) -ge "$timeout_s" ]; then
      echo "TIMEOUT (Prom): $expr wanted $want got $got"
      return 1
    fi
    sleep 1
  done
}

wait_for_exporter(){
  local want="$1" timeout_s="${2:-45}" start="$(now)" got="NA"
  while :; do
    got="$(qexp || echo NA)"
    if [ "$got" = "$want" ]; then echo "OK (Exporter): void_lag_to_head == $want"; return 0; fi
    if [ $(( $(now) - start )) -ge "$timeout_s" ]; then
      echo "TIMEOUT (Exporter): wanted $want got $got"
      return 1
    fi
    sleep 1
  done
}

echo "== Smoke: force RED (lag=999) =="

# Force textfile lag
printf 'void_lag_to_head %s\nvoid_lag_to_head_updated_seconds %s\n' 999 "$(now)" \
  | /usr/bin/sudo tee "$TEXTFILE" >/dev/null

# 1) Wait for node_exporter to publish it
wait_for_exporter "999" 60

# 2) Wait for Prom to scrape it
wait_for_prom 'max(void_lag_to_head)' '999' 90

# 3) Recompute rollup/overall textfiles
refresh_all

# 4) Expect RED
wait_for_prom 'max(void:rollup_green:textfile)' '0' 90
wait_for_prom 'max(void:overall_green)'        '0' 90

echo "== Restore GREEN (recompute real lag from node) =="
/usr/bin/sudo /usr/local/bin/void-breadcrumbs-refresh.sh

# 5) Wait for exporter and Prom to see the real lag (0)
wait_for_exporter "0" 60
wait_for_prom 'max(void_lag_to_head)' '0' 90

# 6) Refresh rollup & overall and expect GREEN
/usr/bin/sudo /usr/local/bin/void-rollup-textfile.sh
/usr/bin/sudo /usr/local/bin/void-overall-textfile.sh

wait_for_prom 'max(void:rollup_green:textfile)' '1' 90
wait_for_prom 'max(void:overall_green)'        '1' 90

echo "PASS: overall flipped RED then GREEN successfully."
