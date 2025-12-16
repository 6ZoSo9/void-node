#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$HOME/dev/void-node}"
cd "$ROOT"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
STATE="${STATE:-docs/VOID-DEVNET-PROTOCOL-STATE.json}"
SPOOL="${SPOOL:-docs/VOID-DEVNET-JOB-SPOOL.txt}"

OUT_TMP="${OUT_TMP:-$HOME/.cache/node-exporter-textfile/void_devnet_coverage.prom}"
OUT_FINAL="${OUT_FINAL:-/var/lib/node_exporter/textfile_collector/void_devnet_coverage.prom}"

mkdir -p "$(dirname "$OUT_TMP")"

is_addr(){ [[ "${1:-}" =~ ^0x[0-9a-fA-F]{40}$ ]]; }

get_addr_from_state() {
  local key="$1"
  [ -f "$STATE" ] || { echo ""; return 0; }
  python3 - "$key" "$STATE" <<'PY' || true
import json, re, sys
from pathlib import Path

key = sys.argv[1]
path = Path(sys.argv[2])

addr_re = re.compile(r"^0x[0-9a-fA-F]{40}$")

def pick(v):
  if isinstance(v, str) and addr_re.match(v): return v
  if isinstance(v, dict):
    for k in ("address","contractAddress","deployedTo"):
      vv = v.get(k)
      if isinstance(vv, str) and addr_re.match(vv): return vv
  return None

def walk(o):
  if isinstance(o, dict):
    yield o
    for v in o.values():
      yield from walk(v)
  elif isinstance(o, list):
    for it in o:
      yield from walk(it)

try:
  state = json.loads(path.read_text(encoding="utf-8"))
except Exception:
  print("")
  raise SystemExit(0)

cand = None
if isinstance(state, dict):
  cand = pick(state.get(key))
  if not cand and isinstance(state.get("contracts"), dict):
    cand = pick(state["contracts"].get(key))

  if not cand:
    # case-insensitive scan
    for d in walk(state):
      if isinstance(d, dict):
        for kk, vv in d.items():
          if isinstance(kk, str) and kk.lower() == key.lower():
            cand = pick(vv)
            if cand:
              print(cand); raise SystemExit(0)

print(cand or "")
PY
}

count_spool_jobs() {
  if [ ! -f "$SPOOL" ]; then echo 0; return; fi
  awk 'NF && $0 !~ /^[[:space:]]*#/ {c++} END{print c+0}' "$SPOOL"
}

jobs="$(count_spool_jobs)"
now="$(date +%s)"

# ---- receipts metrics compute ----
receipts_total=0
receipts_cov_v2="0.0"
receipts_health_v2=0

if [ "$jobs" -eq 0 ]; then
  receipts_total=0
  receipts_cov_v2="1.0"
  receipts_health_v2=1
else
  receipt_addr="$(get_addr_from_state ReceiptRegistry)"
  if is_addr "$receipt_addr" && command -v cast >/dev/null 2>&1; then
    if rt_raw="$(cast call --rpc-url "$RPC_URL" "$receipt_addr" "totalReceipts()(uint256)" 2>/dev/null)"; then
      receipts_total="$(python3 - <<PY
s="${rt_raw}".strip()
try:
  v=int(s,16) if s.startswith("0x") else int(s)
  print(v)
except Exception:
  print(0)
PY
)"
      receipts_cov_v2="$(python3 - <<PY
rt=${receipts_total}
j=${jobs}
den=j if j>0 else 1
print("{:.6f}".format(rt/den))
PY
)"
      if [ "$receipts_total" -ge "$jobs" ]; then
        receipts_health_v2=1
      else
        receipts_health_v2=0
      fi
    else
      receipts_total=0
      receipts_cov_v2="0.0"
      receipts_health_v2=0
    fi
  else
    receipts_total=0
    receipts_cov_v2="0.0"
    receipts_health_v2=0
  fi
fi

# ---- coverage defaults (avoid NaN) ----
# If coverage gauges are missing from the preserved file, we will emit:
#   jobs==0 => coverage=1, health=1
#   jobs>0  => conservative proxy = receipts_health_v2 (NOT perfect, but avoids NaN)
if [ "$jobs" -eq 0 ]; then
  cov="1.000000"
  cov_h="1"
else
  if [ "$receipts_health_v2" -eq 1 ]; then
    cov="1.000000"
    cov_h="1"
  else
    cov="0.000000"
    cov_h="0"
  fi
fi

# ---- merge: keep everything EXCEPT previous receipts lines ----
PRESERVE_TMP="$(mktemp)"
if [ -f "$OUT_FINAL" ]; then
  awk '
    $0 ~ /^# HELP void_devnet_receipts_/ {next}
    $0 ~ /^# TYPE void_devnet_receipts_/ {next}
    $0 ~ /^void_devnet_receipts_/ {next}
    {print}
  ' "$OUT_FINAL" > "$PRESERVE_TMP"
else
  : > "$PRESERVE_TMP"
fi

# detect if coverage gauges already exist in preserved content
have_cov=0
have_cov_h=0
if rg -q '^void_devnet_coverage(\{|\s)' "$PRESERVE_TMP"; then have_cov=1; fi
if rg -q '^void_devnet_coverage_health(\{|\s)' "$PRESERVE_TMP"; then have_cov_h=1; fi

# write merged output
cat "$PRESERVE_TMP" > "$OUT_TMP"

# add coverage gauges if missing (prevents NaN)
if [ "$have_cov" -eq 0 ] || [ "$have_cov_h" -eq 0 ]; then
  cat >> "$OUT_TMP" <<PROM

# HELP void_devnet_coverage Job coverage on VOID devnet (0..1)
# TYPE void_devnet_coverage gauge
void_devnet_coverage{chain="devnet"} ${cov}
# HELP void_devnet_coverage_health coverage health (1=ok,0=bad)
# TYPE void_devnet_coverage_health gauge
void_devnet_coverage_health{chain="devnet"} ${cov_h}
PROM
fi

# append receipts block (authoritative)
cat >> "$OUT_TMP" <<PROM

# HELP void_devnet_receipts_coverage_v2 receipts/job ratio on VOID devnet
# TYPE void_devnet_receipts_coverage_v2 gauge
void_devnet_receipts_coverage_v2{chain="devnet"} ${receipts_cov_v2}
# HELP void_devnet_receipts_health_v2 receipts vs jobs health (1=ok,0=bad)
# TYPE void_devnet_receipts_health_v2 gauge
void_devnet_receipts_health_v2{chain="devnet"} ${receipts_health_v2}
# HELP void_devnet_receipts_total_onchain_v2 ReceiptRegistry.totalReceipts()
# TYPE void_devnet_receipts_total_onchain_v2 gauge
void_devnet_receipts_total_onchain_v2{chain="devnet"} ${receipts_total}
# HELP void_devnet_receipts_spool_jobs_v2 spool jobs scanned
# TYPE void_devnet_receipts_spool_jobs_v2 gauge
void_devnet_receipts_spool_jobs_v2{chain="devnet"} ${jobs}
# HELP void_devnet_receipts_jobs_with_receipt_v2 spool jobs that have a receipt
# TYPE void_devnet_receipts_jobs_with_receipt_v2 gauge
void_devnet_receipts_jobs_with_receipt_v2{chain="devnet"} 0
# HELP void_devnet_receipts_verify_ok_v2 verified ok count
# TYPE void_devnet_receipts_verify_ok_v2 gauge
void_devnet_receipts_verify_ok_v2{chain="devnet"} 0
# HELP void_devnet_receipts_verify_fail_v2 verified fail count
# TYPE void_devnet_receipts_verify_fail_v2 gauge
void_devnet_receipts_verify_fail_v2{chain="devnet"} 0
# HELP void_devnet_receipts_last_timestamp_seconds_v2 last receipt timestamp observed
# TYPE void_devnet_receipts_last_timestamp_seconds_v2 gauge
void_devnet_receipts_last_timestamp_seconds_v2{chain="devnet"} 0
# HELP void_devnet_receipts_exporter_run_timestamp_seconds_v2 exporter run time
# TYPE void_devnet_receipts_exporter_run_timestamp_seconds_v2 gauge
void_devnet_receipts_exporter_run_timestamp_seconds_v2{chain="devnet"} ${now}
# HELP void_devnet_receipts_last_seen_v2 last job/rid seen (labels only, value=1)
# TYPE void_devnet_receipts_last_seen_v2 gauge
void_devnet_receipts_last_seen_v2{chain="devnet",job="",rid=""} 1
PROM

# sync to node_exporter textfile collector
if [ "$(id -u)" -eq 0 ]; then
  cp -a "$OUT_TMP" "$OUT_FINAL"
else
  sudo cp -a "$OUT_TMP" "$OUT_FINAL"
fi

rm -f "$PRESERVE_TMP"
echo "[ok] merged -> $OUT_FINAL (jobs=${jobs} receipts_total=${receipts_total} receipts_health=${receipts_health_v2})"
