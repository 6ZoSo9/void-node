#!/usr/bin/env bash
set -euo pipefail
PROM="${PROM:-http://127.0.0.1:9090/api/v1/query}"
q(){ curl -fsS --get "$PROM" --data-urlencode "query=$1" | jq -r '.data.result[0].value[1] // "NA"'; }
h(){ printf "\033[1m%s\033[0m\n" "$*"; }
ok(){ printf "✅ %s\n" "$*"; }; bad(){ printf "❌ %s\n" "$*"; }; warn(){ printf "⚠️  %s\n" "$*"; }

overall=$(q 'max(void:overall_green)')
fresh=$(q 'max(void:rollup_fresh)')
age=$(q 'void:rollup_age_seconds')
pillars=$(q 'max(void:pillars_ok_count)')
sys=$(q 'max(void:system_green:last_2m)')
lag=$(q 'max(void_lag_to_head)')
head=$(q 'max(void_head_number)')
seals=$(q 'max(void_seals_last)')
parity=$(q 'max(void:rollup_green:diff)')

h "VOID — Overall Status"
[ "$overall" = "1" ] && ok "overall_green=1" || bad "overall_green=0"
[ "$fresh" = "1" ]   && ok "rollup_fresh=1 (age ${age}s)" || warn "rollup_fresh=0 (age ${age}s)"
[ "$pillars" = "4" ] && ok "pillars_ok_count=4" || bad "pillars_ok_count=${pillars}"
[ "$sys" = "1" ]     && ok "system_green=1" || bad "system_green=${sys}"
printf "ℹ️  head=%s seals_last=%s lag_to_head=%s\n" "$head" "$seals" "$lag"
[ "$parity" = "0" ]  && ok "rollup parity OK (diff=0)" || bad "rollup parity diff=${parity}"
