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

# 2) copy live configs without root ownership
sudo rsync -a --chown="$(id -un)":"$(id -gn)" /etc/prometheus/prometheus.yml "$OUT/"
sudo rsync -a --chown="$(id -un)":"$(id -gn)" /etc/prometheus/rules.d     "$OUT/"
sudo rsync -a --chown="$(id -un)":"$(id -gn)" /etc/prometheus/alerts      "$OUT/"

echo "snapshot: $OUT"
