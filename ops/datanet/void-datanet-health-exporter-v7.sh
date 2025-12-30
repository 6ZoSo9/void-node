#!/usr/bin/env bash
set -euo pipefail

# --- paths / defaults ---
REPO_DEFAULT_1="$HOME/dev/void-node"
REPO_DEFAULT_2="/home/zoso/dev/void-node"
if [[ -d "${REPO:-}" ]]; then
  REPO="$REPO"
elif [[ -d "$REPO_DEFAULT_1" ]]; then
  REPO="$REPO_DEFAULT_1"
else
  REPO="$REPO_DEFAULT_2"
fi

TRUTH="${TRUTH:-/tmp/void-datanet-smoke.last.json}"
TEXTFILE="${TEXTFILE:-/var/lib/node_exporter/textfile_collector/void_datanet_health.prom}"
SMOKE7="${SMOKE7:-ops/datanet/void-datanet-smoke-v7.sh}"

now_ms(){ python3 -c 'import time; print(int(time.time()*1000))'; }

# run smoke as the repo user (so tsx/paths match your node runtime)
run_smoke_as_user() {
  if [[ $EUID -ne 0 ]]; then
    (cd "$REPO" && REPO="$REPO" TRUTH="$TRUTH" bash "$SMOKE7")
    return
  fi
  u="${SUDO_USER:-}"
  [[ -n "$u" ]] || u="zoso"
  sudo -u "$u" bash -lc "cd \"$REPO\" && REPO=\"$REPO\" TRUTH=\"$TRUTH\" bash \"$SMOKE7\""
}

hash_u64_hi() {
  H="${1:-}" python3 -c 'import os; h=os.environ.get("H","").strip().lower(); print(int(h[:16],16) if len(h)>=16 else 0)'
}
hash_u64_lo() {
  H="${1:-}" python3 -c 'import os; h=os.environ.get("H","").strip().lower(); print(int(h[-16:],16) if len(h)>=16 else 0)'
}

echo "=== [exporter.v7] run smoke ==="
t0="$(now_ms)"
set +e
run_smoke_as_user
rc="$?"
set -e
t1="$(now_ms)"
dur_ms="$((t1 - t0))"

echo "=== [exporter.v7] read truth JSON ==="
if [[ ! -f "$TRUTH" ]]; then
  echo "[WARN] missing truth JSON ($TRUTH) -> exporting minimal failure metrics"
  truth_ts="$(date +%s)"
  truth_ok=0
  truth_rc="$rc"
  root=""
  leaf=""
  size_bytes=0
  chunk_bytes=0
  chunks_count=0
else
  read -r truth_ts truth_ok truth_rc root leaf size_bytes chunk_bytes chunks_count < <(
    TRUTH="$TRUTH" python3 -c '
import os, json
d=json.load(open(os.environ["TRUTH"],"r"))
print(d.get("ts",0), d.get("ok",0), d.get("rc",0),
      (d.get("dataset_root","") or "").strip(),
      (d.get("leaf","") or "").strip(),
      int(d.get("size_bytes",0) or 0),
      int(d.get("chunk_bytes",0) or 0),
      int(d.get("chunks_count",0) or 0))
'
  )
fi

root_hi="$(hash_u64_hi "$root")"
root_lo="$(hash_u64_lo "$root")"
leaf_hi="$(hash_u64_hi "$leaf")"
leaf_lo="$(hash_u64_lo "$leaf")"

last_ok_ts=0
if [[ "${truth_ok:-0}" == "1" ]]; then last_ok_ts="$truth_ts"; fi

echo "=== [exporter.v7] write textfile ($TEXTFILE) ==="
tmp="/tmp/void_datanet_health.prom.$$"
cat > "$tmp" <<EOF
# HELP void_datanet_smoke_ok 1 if publish->fetch->roundtrip smoke passed.
# TYPE void_datanet_smoke_ok gauge
void_datanet_smoke_ok ${truth_ok:-0}
# HELP void_datanet_smoke_ms Duration of last smoke run in ms.
# TYPE void_datanet_smoke_ms gauge
void_datanet_smoke_ms ${dur_ms:-0}
# HELP void_datanet_last_rc Last smoke process exit code.
# TYPE void_datanet_last_rc gauge
void_datanet_last_rc ${truth_rc:-0}
# HELP void_datanet_last_run_timestamp_seconds Unix timestamp of last smoke attempt.
# TYPE void_datanet_last_run_timestamp_seconds gauge
void_datanet_last_run_timestamp_seconds ${truth_ts:-0}
# HELP void_datanet_last_ok_timestamp_seconds Unix timestamp of last successful smoke.
# TYPE void_datanet_last_ok_timestamp_seconds gauge
void_datanet_last_ok_timestamp_seconds ${last_ok_ts:-0}
# HELP void_datanet_last_size_bytes Size of last dataset used in smoke.
# TYPE void_datanet_last_size_bytes gauge
void_datanet_last_size_bytes ${size_bytes:-0}
# HELP void_datanet_last_chunk_bytes Chunk size used in smoke.
# TYPE void_datanet_last_chunk_bytes gauge
void_datanet_last_chunk_bytes ${chunk_bytes:-0}
# HELP void_datanet_last_chunks_count Number of chunks in last smoke dataset.
# TYPE void_datanet_last_chunks_count gauge
void_datanet_last_chunks_count ${chunks_count:-0}

# HELP void_datanet_last_root_info Last dataset root observed.
# TYPE void_datanet_last_root_info gauge
void_datanet_last_root_info{root="${root:-}"} 1
# HELP void_datanet_last_leaf_info Last chunk leaf observed.
# TYPE void_datanet_last_leaf_info gauge
void_datanet_last_leaf_info{leaf="${leaf:-}"} 1

# HELP void_datanet_last_root_hash_hi_u64 First 16 hex chars of root as u64.
# TYPE void_datanet_last_root_hash_hi_u64 gauge
void_datanet_last_root_hash_hi_u64 ${root_hi:-0}
# HELP void_datanet_last_root_hash_lo_u64 Last 16 hex chars of root as u64.
# TYPE void_datanet_last_root_hash_lo_u64 gauge
void_datanet_last_root_hash_lo_u64 ${root_lo:-0}
# HELP void_datanet_last_leaf_hash_hi_u64 First 16 hex chars of leaf as u64.
# TYPE void_datanet_last_leaf_hash_hi_u64 gauge
void_datanet_last_leaf_hash_hi_u64 ${leaf_hi:-0}
# HELP void_datanet_last_leaf_hash_lo_u64 Last 16 hex chars of leaf as u64.
# TYPE void_datanet_last_leaf_hash_lo_u64 gauge
void_datanet_last_leaf_hash_lo_u64 ${leaf_lo:-0}
EOF

if [[ $EUID -eq 0 ]]; then
  cp -f "$tmp" "$TEXTFILE"
else
  sudo cp -f "$tmp" "$TEXTFILE"
fi
rm -f "$tmp" 2>/dev/null || true
echo "[ok] wrote $TEXTFILE"
echo "[ok] truth_json=$TRUTH"
