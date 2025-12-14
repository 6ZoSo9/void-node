#!/usr/bin/env bash
set -euo pipefail

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
STATE="${STATE:-docs/VOID-DEVNET-PROTOCOL-STATE.json}"
SPOOL="${SPOOL:-docs/VOID-DEVNET-JOB-SPOOL.tsv}"
EXPECT_STATUS="${EXPECT_STATUS:-1}"

OUT_FILE="${OUT_FILE:-/var/lib/node_exporter/textfile_collector/void_devnet_coverage.prom}"

die(){ echo "[ERR] $*" >&2; exit 2; }

need(){ command -v "$1" >/dev/null 2>&1 || die "missing: $1"; }

# prefer user toolchain (sudo will lose these)
need jq
need awk
need tr
need date
need rg

CAST_BIN="${CAST_BIN:-}"
if [[ -z "$CAST_BIN" ]]; then
  for c in "$(command -v cast 2>/dev/null || true)" "$HOME/.foundry/bin/cast" "/home/zoso/.foundry/bin/cast" "/usr/local/bin/cast"; do
    [[ -n "$c" && -x "$c" ]] && CAST_BIN="$c" && break
  done
fi
[[ -x "$CAST_BIN" ]] || die "missing cast (set CAST_BIN=/path/to/cast). Try: echo \$HOME/.foundry/bin/cast"

[[ -f "$STATE" ]] || die "missing STATE: $STATE"
[[ -f "$SPOOL" ]] || die "missing SPOOL: $SPOOL"

RECEIPTR="$(jq -r '(.ReceiptRegistry | (if type=="object" then (.address // empty) elif type=="string" then . else empty end))' "$STATE")"
[[ "$RECEIPTR" =~ ^0x[0-9a-fA-F]{40}$ ]] || die "bad ReceiptRegistry addr: '$RECEIPTR'"

TOTAL_RECEIPTS="$("$CAST_BIN" call "$RECEIPTR" 'totalReceipts()(uint256)' --rpc-url "$RPC_URL" 2>/dev/null | tr -d '\r' | tail -n 1 || echo 0)"
[[ "$TOTAL_RECEIPTS" =~ ^[0-9]+$ ]] || TOTAL_RECEIPTS=0

spool_jobs=0
jobs_with_receipt=0
ok=0
fail=0

status0=0
status1=0
status2=0
status_other=0

last_ts=0
last_job=""
last_rid=""
now="$(date +%s)"

first_rid_for_job() {
  local job="$1"
  "$CAST_BIN" call "$RECEIPTR" 'getReceiptsForJob(bytes32)(bytes32[])' "$job" --rpc-url "$RPC_URL" 2>/dev/null \
    | tr -d '[],' | awk '{print $1}' | head -n 1
}

dump_receipt_typed() {
  local rid="$1"
  "$CAST_BIN" call "$RECEIPTR" \
    'receipts(bytes32)(bytes32,bytes32,address,string,bytes32,bytes32,bytes32,uint64,uint64,uint8)' \
    "$rid" --rpc-url "$RPC_URL" 2>/dev/null | tr -d '\r'
}

while IFS=$'\t' read -r job model inhash outhash; do
  [[ -n "${job:-}" ]] || continue
  [[ "$job" =~ ^0x[0-9a-fA-F]{64}$ ]] || continue
  spool_jobs=$((spool_jobs+1))

  rid="$(first_rid_for_job "$job" || true)"
  if [[ ! "${rid:-}" =~ ^0x[0-9a-fA-F]{64}$ ]]; then
    continue
  fi

  jobs_with_receipt=$((jobs_with_receipt+1))
  last_job="$job"
  last_rid="$rid"

  mapfile -t L < <(dump_receipt_typed "$rid" | sed '/^\s*$/d' || true)
  if [[ "${#L[@]}" -lt 10 ]]; then
    fail=$((fail+1))
    continue
  fi

  got_job="${L[0]}"
  got_model="${L[3]//\"/}"
  got_in="${L[4]}"
  got_out="${L[5]}"
  got_chain="${L[7]}"
  got_ts="${L[8]%% *}"
  got_status="${L[9]}"

  case "$got_status" in
    0) status0=$((status0+1));;
    1) status1=$((status1+1));;
    2) status2=$((status2+1));;
    *) status_other=$((status_other+1));;
  esac

  if [[ "$got_ts" =~ ^[0-9]+$ ]] && (( got_ts > last_ts )); then
    last_ts="$got_ts"
  fi

  bad=0
  [[ "$got_job" == "$job" ]] || bad=1
  [[ "$got_model" == "$model" ]] || bad=1
  [[ "$got_in" == "$inhash" ]] || bad=1
  [[ "$got_out" == "$outhash" ]] || bad=1
  [[ "$got_chain" == "2050" ]] || bad=1
  [[ "$got_status" == "$EXPECT_STATUS" ]] || bad=1

  if [[ "$bad" == "0" ]]; then
    ok=$((ok+1))
  else
    fail=$((fail+1))
  fi
done < "$SPOOL"

coverage="0.000000"
if (( spool_jobs > 0 )); then
  coverage="$(awk -v a="$jobs_with_receipt" -v b="$spool_jobs" 'BEGIN{printf "%.6f", (b>0)?(a/b):0}')"
fi

health=0
if (( fail == 0 )) && [[ "$coverage" == "1.000000" ]]; then
  health=1
fi

# build receipts metrics block
block="$(mktemp)"
{
  echo "# HELP void_devnet_receipts_coverage_v2 receipts/job ratio on VOID devnet"
  echo "# TYPE void_devnet_receipts_coverage_v2 gauge"
  echo "void_devnet_receipts_coverage_v2{chain=\"devnet\"} $coverage"

  echo "# HELP void_devnet_receipts_health_v2 receipts vs jobs health (1=ok,0=bad)"
  echo "# TYPE void_devnet_receipts_health_v2 gauge"
  echo "void_devnet_receipts_health_v2{chain=\"devnet\"} $health"

  echo "# HELP void_devnet_receipts_total_onchain_v2 ReceiptRegistry.totalReceipts()"
  echo "# TYPE void_devnet_receipts_total_onchain_v2 gauge"
  echo "void_devnet_receipts_total_onchain_v2{chain=\"devnet\"} $TOTAL_RECEIPTS"

  echo "# HELP void_devnet_receipts_spool_jobs_v2 spool jobs scanned"
  echo "# TYPE void_devnet_receipts_spool_jobs_v2 gauge"
  echo "void_devnet_receipts_spool_jobs_v2{chain=\"devnet\"} $spool_jobs"

  echo "# HELP void_devnet_receipts_jobs_with_receipt_v2 spool jobs that have a receipt"
  echo "# TYPE void_devnet_receipts_jobs_with_receipt_v2 gauge"
  echo "void_devnet_receipts_jobs_with_receipt_v2{chain=\"devnet\"} $jobs_with_receipt"

  echo "# HELP void_devnet_receipts_verify_ok_v2 verified ok count"
  echo "# TYPE void_devnet_receipts_verify_ok_v2 gauge"
  echo "void_devnet_receipts_verify_ok_v2{chain=\"devnet\"} $ok"

  echo "# HELP void_devnet_receipts_verify_fail_v2 verified fail count"
  echo "# TYPE void_devnet_receipts_verify_fail_v2 gauge"
  echo "void_devnet_receipts_verify_fail_v2{chain=\"devnet\"} $fail"

  echo "# HELP void_devnet_receipts_status_count_v2 status counts among scanned receipts"
  echo "# TYPE void_devnet_receipts_status_count_v2 gauge"
  echo "void_devnet_receipts_status_count_v2{chain=\"devnet\",status=\"0\"} $status0"
  echo "void_devnet_receipts_status_count_v2{chain=\"devnet\",status=\"1\"} $status1"
  echo "void_devnet_receipts_status_count_v2{chain=\"devnet\",status=\"2\"} $status2"
  echo "void_devnet_receipts_status_count_v2{chain=\"devnet\",status=\"other\"} $status_other"

  echo "# HELP void_devnet_receipts_last_timestamp_seconds_v2 last receipt timestamp observed"
  echo "# TYPE void_devnet_receipts_last_timestamp_seconds_v2 gauge"
  echo "void_devnet_receipts_last_timestamp_seconds_v2{chain=\"devnet\"} $last_ts"

  echo "# HELP void_devnet_receipts_exporter_run_timestamp_seconds_v2 exporter run time"
  echo "# TYPE void_devnet_receipts_exporter_run_timestamp_seconds_v2 gauge"
  echo "void_devnet_receipts_exporter_run_timestamp_seconds_v2{chain=\"devnet\"} $now"

  echo "# HELP void_devnet_receipts_last_seen_v2 last job/rid seen (labels only, value=1)"
  echo "# TYPE void_devnet_receipts_last_seen_v2 gauge"
  echo "void_devnet_receipts_last_seen_v2{chain=\"devnet\",job=\"${last_job}\",rid=\"${last_rid}\"} 1"
} > "$block"

# patch OUT_FILE: remove any existing receipts metrics then append new block
tmp="$(mktemp)"
if [[ -f "$OUT_FILE" ]]; then
  cp -a "$OUT_FILE" "${OUT_FILE}.bak.$(date +%s)" 2>/dev/null || true
  awk '!/void_devnet_receipts_/' "$OUT_FILE" > "$tmp"
else
  : > "$tmp"
fi
cat "$block" >> "$tmp"
cat "$tmp" > "$OUT_FILE"
rm -f "$tmp" "$block"

echo "[ok] patched $OUT_FILE"