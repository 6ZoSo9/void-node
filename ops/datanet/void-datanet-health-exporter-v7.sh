#!/usr/bin/env bash
: "${HOME:=/root}"
set -euo pipefail

REPO="${REPO:-$HOME/dev/void-node}"
cd "$REPO" 2>/dev/null || cd "$HOME/dev/void-node" || exit 1

SMOKE7="${SMOKE7:-ops/datanet/void-datanet-smoke-v7.sh}"
TRUTH="${TRUTH:-/tmp/void-datanet-smoke.last.json}"
TEXTFILE="${TEXTFILE:-/var/lib/node_exporter/textfile_collector/void_datanet_health.prom}"

echo "=== [exporter.v7] run smoke ==="
bash "$SMOKE7" >/dev/null

echo "=== [exporter.v7] read truth JSON ==="
[[ -f "$TRUTH" ]] || { echo "[ERR] missing truth json: $TRUTH"; exit 10; }

# extract fields with python (no jq dependency)
py_get() {
  local key="$1"
  python3 - "$key" "$TRUTH" <<'PY'
import json,sys
k=sys.argv[1]
p=sys.argv[2]
j=json.load(open(p,"r"))
v=j.get(k,"")
if isinstance(v,(int,float)):
  print(v)
else:
  print(str(v))
PY
}

ts="$(py_get ts)"
ok="$(py_get ok)"
rc="$(py_get rc)"
dataset_root="$(py_get dataset_root)"
leaf="$(py_get leaf)"
status_code="$(py_get status_code)"
chunk_put_code="$(py_get chunk_put_code)"
manifest_put_code="$(py_get manifest_put_code)"
fetch_chunk_code="$(py_get fetch_chunk_code)"
size_bytes="$(py_get size_bytes)"
chunk_bytes="$(py_get chunk_bytes)"
chunks_count="$(py_get chunks_count)"

# normalize numerics
ts="${ts:-0}"
ok="${ok:-0}"
rc="${rc:-1}"
status_code="${status_code:-0}"
chunk_put_code="${chunk_put_code:-0}"
manifest_put_code="${manifest_put_code:-0}"
fetch_chunk_code="${fetch_chunk_code:-0}"
size_bytes="${size_bytes:-0}"
chunk_bytes="${chunk_bytes:-0}"
chunks_count="${chunks_count:-0}"

not_mounted=0
if [[ "$status_code" == "404" || "$status_code" == "0" ]]; then not_mounted=1; fi

now="$(date +%s)"
last_ok_ts=0
if [[ "$ok" == "1" ]]; then last_ok_ts="$ts"; fi

TMP="/tmp/void_datanet_health.prom.$$"
cat > "$TMP" <<PROM
# HELP void_datanet_smoke_ok 1 if publish->fetch->roundtrip smoke passed.
# TYPE void_datanet_smoke_ok gauge
void_datanet_smoke_ok $ok
# HELP void_datanet_smoke_rc Exit code from last smoke run.
# TYPE void_datanet_smoke_rc gauge
void_datanet_smoke_rc $rc
# HELP void_datanet_smoke_status_code HTTP status from /status probe.
# TYPE void_datanet_smoke_status_code gauge
void_datanet_smoke_status_code $status_code
# HELP void_datanet_put_chunk_ok 1 if chunk PUT succeeded in last run.
# TYPE void_datanet_put_chunk_ok gauge
void_datanet_put_chunk_ok $([[ "$chunk_put_code" == "200" ]] && echo 1 || echo 0)
# HELP void_datanet_put_manifest_ok 1 if manifest PUT succeeded in last run.
# TYPE void_datanet_put_manifest_ok gauge
void_datanet_put_manifest_ok $([[ "$manifest_put_code" == "200" ]] && echo 1 || echo 0)
# HELP void_datanet_get_chunk_ok 1 if chunk GET succeeded in last run.
# TYPE void_datanet_get_chunk_ok gauge
void_datanet_get_chunk_ok $([[ "$fetch_chunk_code" == "200" ]] && echo 1 || echo 0)
# HELP void_datanet_not_mounted 1 if status/PUT indicates routes missing or filtered to 404.
# TYPE void_datanet_not_mounted gauge
void_datanet_not_mounted $not_mounted
# HELP void_datanet_last_run_timestamp_seconds Unix timestamp of last smoke attempt.
# TYPE void_datanet_last_run_timestamp_seconds gauge
void_datanet_last_run_timestamp_seconds $ts
# HELP void_datanet_last_ok_timestamp_seconds Unix timestamp of last successful smoke.
# TYPE void_datanet_last_ok_timestamp_seconds gauge
void_datanet_last_ok_timestamp_seconds $last_ok_ts
# HELP void_datanet_last_root_info Last dataset root observed.
# TYPE void_datanet_last_root_info gauge
void_datanet_last_root_info{root="$dataset_root"} 1
# HELP void_datanet_last_leaf_info Last chunk leaf observed.
# TYPE void_datanet_last_leaf_info gauge
void_datanet_last_leaf_info{leaf="$leaf"} 1
# HELP void_datanet_last_size_bytes Last dataset size in bytes observed.
# TYPE void_datanet_last_size_bytes gauge
void_datanet_last_size_bytes $size_bytes
# HELP void_datanet_last_chunk_bytes Last chunk size setting observed.
# TYPE void_datanet_last_chunk_bytes gauge
void_datanet_last_chunk_bytes $chunk_bytes
# HELP void_datanet_last_chunks_count Last chunk count observed.
# TYPE void_datanet_last_chunks_count gauge
void_datanet_last_chunks_count $chunks_count
PROM

echo "=== [exporter.v7] write textfile ($TEXTFILE) ==="
if [[ "$(id -u)" == "0" ]]; then
  install -d "$(dirname "$TEXTFILE")"
  install -m 0644 "$TMP" "$TEXTFILE"
else
  sudo install -d "$(dirname "$TEXTFILE")"
  sudo install -m 0644 "$TMP" "$TEXTFILE"
fi
rm -f "$TMP" || true
echo "[ok] wrote $TEXTFILE"
echo "[ok] truth_json=$TRUTH"
