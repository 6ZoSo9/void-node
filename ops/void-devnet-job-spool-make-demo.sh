#!/usr/bin/env bash
set -euo pipefail

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
STATE="${STATE:-docs/VOID-DEVNET-PROTOCOL-STATE.json}"
OUT="${OUT:-docs/VOID-DEVNET-JOB-SPOOL.tsv}"
N="${N:-6}"
MODEL_ID="${MODEL_ID:-dev.demo.v1}"
APP_TAG="${APP_TAG:-void-devnet-demo}"

die(){ echo "[ERR] $*" >&2; exit 1; }

[[ -f "$STATE" ]] || die "STATE not found: $STATE"
[[ -n "${PRIVKEY:-}" ]] || die "PRIVKEY missing (export PRIVKEY=...)"

JOBQ="$(jq -r '(.JobQueue | (if type=="object" then (.address // empty) elif type=="string" then . else empty end))' "$STATE")"
[[ -n "$JOBQ" ]] || die "JobQueue missing in $STATE"

TOPIC0="$(cast keccak 'JobPosted(bytes32,uint256,string,address,string,bytes32,uint64)')"
JOBQ_LC="$(echo "$JOBQ" | tr 'A-F' 'a-f')"
TOPIC0_LC="$(echo "$TOPIC0" | tr 'A-F' 'a-f')"

echo "[cfg] RPC_URL=$RPC_URL"
echo "[cfg] JOBQ=$JOBQ"
echo "[cfg] OUT=$OUT"
echo "[cfg] N=$N MODEL_ID=$MODEL_ID APP_TAG=$APP_TAG"

: > "$OUT"

for i in $(seq 1 "$N"); do
  inhash="$(cast keccak "input:${MODEL_ID}:${APP_TAG}:${i}:$(date +%s%N)")"
  outhash="$(cast keccak "output:${MODEL_ID}:${APP_TAG}:${i}:$(date +%s%N)")"

  tx="$(cast send "$JOBQ" \
    'postJob(string,bytes32,string)(bytes32)' \
    "$MODEL_ID" "$inhash" "$APP_TAG" \
    --rpc-url "$RPC_URL" \
    --private-key "$PRIVKEY" \
    --json | jq -r '.transactionHash // .txHash // empty')"

  [[ -n "$tx" ]] || die "could not parse tx hash from cast send"

  jobid="$(cast receipt "$tx" --rpc-url "$RPC_URL" --json \
    | jq -r --arg A "$JOBQ_LC" --arg T "$TOPIC0_LC" '
        .logs[]
        | select((.address|ascii_downcase)==$A)
        | select((.topics[0]|ascii_downcase)==$T)
        | .topics[1]
      ' | head -n 1)"

  [[ "$jobid" =~ ^0x[0-9a-fA-F]{64}$ ]] || die "could not extract jobId from receipt tx=$tx (got: $jobid)"

  printf "%s\t%s\t%s\t%s\n" "$jobid" "$MODEL_ID" "$inhash" "$outhash" >> "$OUT"
  echo "[ok] job $i posted jobId=$jobid"
done

echo
echo "[done] wrote: $OUT"
echo "       format: jobId<TAB>modelId<TAB>inputHash<TAB>outputHash"
