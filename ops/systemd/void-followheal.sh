#!/usr/bin/env bash
set -euo pipefail

# --- config (env overrides allowed) ---
PROM="${PROM_URL:-http://127.0.0.1:9090/api/v1/query}"
FOLLOWER_SERVICE="${FOLLOWER_SERVICE:-void-node@bootstrap-1.service}"
DRIFT_QUERY="${DRIFT_QUERY:-void:follower_drift:last_2m}"
PEER_ADV_QUERY="${PEER_ADV_QUERY:-void:follower_head_peer:increase_2m}"
LOCAL_CHG_QUERY="${LOCAL_CHG_QUERY:-void:follower_head_local:changes_2m}"
REBOOTSTRAP_MAX_10M="${REBOOTSTRAP_MAX_10M:-3}"   # after this many restarts in 10m, escalate once
BACKOFF_SECONDS="${BACKOFF_SECONDS:-120}"

TF_DIR="${TEXTFILE_DIR:-/var/lib/node_exporter/textfile_collector}"
PROMF="$TF_DIR/void_followheal.prom"
RCF="$TF_DIR/void_followheal_rc.prom"

ts_ms() { echo $(( $(date +%s) * 1000 )); }
ts_s()  { date +%s; }
ts_iso(){ date -Is; }

emit() {
  local k="$1" v="$2" out="$3"
  mkdir -p "$(dirname "$out")" 2>/dev/null || true
  # atomic rewrite, keep other keys
  tmp="$(mktemp)"
  if [ -f "$out" ]; then cat "$out" > "$tmp"; fi
  awk -v k="$k" -v v="$v" '
    BEGIN{found=0}
    $1==k {$2=v; found=1}
    {print}
    END{if(!found) print k, v}
  ' "$tmp" > "${tmp}.2"
  mv -f "${tmp}.2" "$out"; rm -f "$tmp"
}

prom_q() {
  curl -fsS --data-urlencode "query=$1" "$PROM" \
    | jq -r '.data.result[0].value[1]' 2>/dev/null || echo ""
}

# --- backoff: at most once per BACKOFF_SECONDS ---
if [ -f "$PROMF" ]; then
  last_ts=$(awk '/^void_followheal_last_ts_seconds/{print $2}' "$PROMF" 2>/dev/null || echo 0)
  now=$(ts_s)
  if [ "${last_ts:-0}" -gt 0 ] && [ $(( now - last_ts )) -lt "$BACKOFF_SECONDS" ]; then
    echo "$(ts_iso) [followheal] backoff ($BACKOFF_SECONDS s); skipping" >&2
    emit "void_followheal_last_rc" 0 "$RCF"
    exit 0
  fi
fi

# --- read signals ---
drift="$(prom_q "$DRIFT_QUERY")"
peer_adv="$(prom_q "$PEER_ADV_QUERY")"
local_chg="$(prom_q "$LOCAL_CHG_QUERY")"

if [ -z "$drift" ] || [ -z "$peer_adv" ] || [ -z "$local_chg" ]; then
  echo "$(ts_iso) [followheal] metrics missing; skip" >&2
  emit "void_followheal_last_rc" 0 "$RCF"
  emit "void_followheal_last_ts_ms" "$(ts_ms)" "$RCF"
  emit "void_followheal_last_ts_seconds" "$(ts_s)" "$RCF"
  exit 0
fi

echo "$(ts_iso) [followheal] drift=$drift peer_adv=$peer_adv local_changes=$local_chg"

need_restart=0
# Heal criteria: peer is moving AND we are not; drift > 0
# (peer_adv is a 2m increase; local_chg is 2m changes; both come from your recordings)
awk 'BEGIN{exit !(('"$peer_adv"' > 0) && ('"$local_chg"' == 0) && ('"$drift"' > 0))}' || need_restart=1

rc=0
if [ "$need_restart" = "1" ]; then
  echo "$(ts_iso) [followheal] restarting $FOLLOWER_SERVICE" >&2
  systemctl --user restart "$FOLLOWER_SERVICE" || true
  rc=1
fi

# Escalation: if we restarted too many times in 10m, do a one-shot rebootstrap
# We use the rc counter as "actions" too; if you prefer a dedicated counter, emit one.
actions_10m="$(curl -fsS 127.0.0.1:9100/metrics 2>/dev/null | awk '/^void_followheal_last_rc/{print $2}' | awk '{s+=$1} END{print s+0}' || echo 0)"
# Not precise over window, so use Prom rule instead if you prefer. Optional quick guard:
# if Prom says churn>REBOOTSTRAP_MAX_10M, escalate.
churn="$(prom_q "increase(void_followheal_last_rc[10m])")"
if [ -n "$churn" ] && awk 'BEGIN{exit !('"$churn"' > '"$REBOOTSTRAP_MAX_10M"')}' ; then
  echo "$(ts_iso) [followheal] escalation: rebootstrap follower" >&2
  # Example escalation hooks (best-effort; customize to your attach helper):
  # 1) try your follower_once pull
  curl -fsS -X POST 127.0.0.1:4101/follower/rebootstrap  >/dev/null 2>&1 || true
  # 2) or stop, clean transient state, start (KEEP DATA!)
  # systemctl --user stop "$FOLLOWER_SERVICE" || true
  # sleep 1
  # systemctl --user start "$FOLLOWER_SERVICE" || true
fi

# --- textfile metrics (rc + timestamps) ---
emit "void_followheal_last_rc" "$rc" "$RCF"
emit "void_followheal_last_ts_ms" "$(ts_ms)" "$RCF"
emit "void_followheal_last_ts_seconds" "$(ts_s)" "$RCF"

# summary file (optional, tidy for dashboards)
emit "void_followheal_up" 1 "$PROMF"
emit "void_followheal_last_ts_ms" "$(ts_ms)" "$PROMF"
emit "void_followheal_last_ts_seconds" "$(ts_s)" "$PROMF"

exit 0
