#!/usr/bin/env bash
set -euo pipefail
TS="$(date +%Y%m%d-%H%M%S)"
OUT="ops/prom-snap/$TS"
mkdir -p "$OUT"

# 1) scrape Prom state
curl -fsS 'http://127.0.0.1:9090/api/v1/targets?state=active' > "$OUT/targets.$TS.json"
curl -fsS 'http://127.0.0.1:9090/api/v1/rules'               > "$OUT/rules.$TS.json"

for q in \
  'void_header3_last_number' \
  'void_seal_last_number' \
  'time() - timestamp(void_header3_last_number)' \
  'time() - timestamp(void_seal_last_number)' \
  'void:header3_adv_rate_2m' \
  'void:seals_rate_2m' \
  'void:header3_age_s' \
  'void:seals_age_s'
do
  curl -fsS 'http://127.0.0.1:9090/api/v1/query' \
    --data-urlencode "query=$q" \
    | jq . > "$OUT/query.$(echo "$q" | tr ':() ' '____').$TS.json"
done

# 2) copy live configs if readable (non-root timer-safe). Otherwise, try sudo -n, else skip.
copy_cfg() {
  local src="$1" dst="$2"
  if [ -r "$src" ]; then
    rsync -a "$src" "$dst"/
    return 0
  fi
  if command -v sudo >/dev/null 2>&1; then
    # Non-interactive; if it fails, we skip without error.
    sudo -n rsync -a "$src" "$dst"/ 2>/dev/null || return 1
    return 0
  fi
  return 1
}

mkdir -p "$OUT"
ok1=skip ok2=skip ok3=skip
copy_cfg /etc/prometheus/prometheus.yml "$OUT" && ok1=ok
copy_cfg /etc/prometheus/rules.d        "$OUT" && ok2=ok
copy_cfg /etc/prometheus/alerts.d               "$OUT" && ok3=ok

printf 'config copies: prometheus.yml=%s rules.d=%s alerts=%s\n' "$ok1" "$ok2" "$ok3" \
  | tee "$OUT/copy-status.$TS.txt"

echo

# 3) validate snapshot prometheus.yml (if present) and stamp status
if command -v promtool >/dev/null 2>&1; then
  if [ -f "$OUT/prometheus.yml" ]; then
    if promtool check config "$OUT/prometheus.yml" >/dev/null 2>&1; then
      : > "$OUT/PROM_YML_OK"
      rm -f "$OUT/PROM_YML_BROKEN" "$OUT/PROM_YML_BROKEN.txt" 2>/dev/null || true
      echo "snapshot prometheus.yml: OK" | tee "$OUT/prometheus-yml-status.$TS.txt"
    else
      : > "$OUT/PROM_YML_BROKEN"
      rm -f "$OUT/PROM_YML_OK" 2>/dev/null || true
      promtool check config "$OUT/prometheus.yml" > "$OUT/PROM_YML_BROKEN.txt" 2>&1 || true
      echo "snapshot prometheus.yml: BROKEN (see $OUT/PROM_YML_BROKEN.txt)" | tee "$OUT/prometheus-yml-status.$TS.txt"
    fi
  fi
fi

echo "snapshot: $OUT"
