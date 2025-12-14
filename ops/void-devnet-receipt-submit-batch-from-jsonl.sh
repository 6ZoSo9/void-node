#!/usr/bin/env bash
set -euo pipefail

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
SPOOL="${SPOOL:-docs/VOID-DEVNET-JOB-SPOOL.txt}"
STATE="${STATE:-docs/VOID-DEVNET-PROTOCOL-STATE.json}"
RFILE="${RFILE:-}"

die(){ echo "[ERR] $*" >&2; exit 1; }

[[ -f "$SPOOL" ]] || die "missing SPOOL: $SPOOL"
[[ -f "$STATE" ]] || die "missing STATE: $STATE"
[[ -n "${PRIVKEY:-}" ]] || die "PRIVKEY missing (export PRIVKEY=...)"

if [[ -z "$RFILE" ]]; then
  RFILE="$(find . -maxdepth 8 -type f \( -iname '*receipts*.jsonl' -o -iname '*receipt*.jsonl' \) -print | head -n 1 || true)"
fi
[[ -n "$RFILE" ]] || die "could not find receipts jsonl (set RFILE=/path/to/receipts.jsonl)"
[[ -f "$RFILE" ]] || die "RFILE not found: $RFILE"

echo "[cfg] RPC_URL=$RPC_URL"
echo "[cfg] SPOOL=$SPOOL"
echo "[cfg] RFILE=$RFILE"

# helpers to tolerate different key names
jq_sel='
  def jid: (.jobId // .job_id // .job // .id // empty);
  def mid: (.modelId // .model_id // .model // empty);
  def ih:  (.inputHash // .input_hash // .input // empty);
  def oh:  (.outputHash // .output_hash // .output // empty);
  select(jid == $JID) | [jid, (mid // "dev.demo.v1"), ih, oh] | @tsv
'

ok=0; miss=0; fail=0;

while read -r JID; do
  [[ -n "$JID" ]] || continue
  [[ "$JID" =~ ^0x[0-9a-fA-F]{64}$ ]] || { echo "[skip] not bytes32: $JID"; continue; }

  row="$(jq -r --arg JID "$JID" "$jq_sel" "$RFILE" | tail -n 1 || true)"
  if [[ -z "$row" ]]; then
    echo "[miss] no receipt row in jsonl for jobId=$JID"
    miss=$((miss+1))
    continue
  fi

  job="$(echo "$row" | awk '{print $1}')"
  model="$(echo "$row" | awk '{print $2}')"
  inhash="$(echo "$row" | awk '{print $3}')"
  outhash="$(echo "$row" | awk '{print $4}')"

  if [[ ! "$inhash" =~ ^0x[0-9a-fA-F]{64}$ || ! "$outhash" =~ ^0x[0-9a-fA-F]{64}$ ]]; then
    echo "[skip] bad hashes for jobId=$job in=$inhash out=$outhash"
    fail=$((fail+1))
    continue
  fi

  echo
  echo "=== [submit] jobId=$job model=$model ==="
  if ./ops/void-devnet-receipt-submit-v2.sh "$job" "$model" "$inhash" "$outhash"; then
    ok=$((ok+1))
  else
    fail=$((fail+1))
  fi

done < "$SPOOL"

echo
echo "[done] ok=$ok miss=$miss fail=$fail"
