[[ -x "./ops/void-devnet-receipt-dump.sh" ]] || die "missing ./ops/void-devnet-receipt-dump.sh"
#!/usr/bin/env bash
set -euo pipefail

SPOOL="${SPOOL:-docs/VOID-DEVNET-JOB-SPOOL.tsv}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
STATE="${STATE:-docs/VOID-DEVNET-PROTOCOL-STATE.json}"

die(){ echo "[ERR] $*" >&2; exit 1; }

[[ -f "$SPOOL" ]] || die "missing SPOOL: $SPOOL"
[[ -f "$STATE" ]] || die "missing STATE: $STATE"
command -v jq >/dev/null || die "jq missing"
command -v cast >/dev/null || die "foundry cast missing"

RECEIPTR="$(jq -r '(.ReceiptRegistry | (if type=="object" then (.address // empty) elif type=="string" then . else empty end))' "$STATE")"
[[ "$RECEIPTR" =~ ^0x[0-9a-fA-F]{40}$ ]] || die "bad ReceiptRegistry addr from STATE: '$RECEIPTR'"

ok=0; fail=0; skip=0

while IFS=$'\t' read -r job model inhash outhash; do
  [[ -n "${job:-}" ]] || continue
  [[ "$job" =~ ^0x[0-9a-fA-F]{64}$ ]] || { echo "[skip] bad jobId: $job"; skip=$((skip+1)); continue; }

  rids="$(cast call "$RECEIPTR" 'getReceiptsForJob(bytes32)(bytes32[])' "$job" --rpc-url "$RPC_URL" | tr -d '[]",' || true)"
  rid="$(echo "$rids" | awk '{print $1}')"

  if [[ ! "$rid" =~ ^0x[0-9a-fA-F]{64}$ ]]; then
    echo "[FAIL] no receipt for job=$job"
    fail=$((fail+1))
    echo "[dbg] verify failed; dumping receipt for jobId=${job:-}"
    RPC_URL="${RPC_URL:-http://127.0.0.1:8545}" ./ops/void-devnet-receipt-dump.sh "${job:-}" || true
    continue
  fi

  # tuple: (jobId, receiptId, submitter, modelId, inputHash, outputHash, modelHash, chainId, ts, status)
  mapfile -t tup < <(cast call "$RECEIPTR" 'receipts(bytes32)(bytes32,bytes32,address,string,bytes32,bytes32,bytes32,uint64,uint64,uint8)' "$rid" --rpc-url "$RPC_URL")

  got_job="${tup[0]}"
  got_rid="${tup[1]}"
  got_model="$(echo "${tup[3]}" | tr -d '"')"
  got_in="${tup[4]}"
  got_out="${tup[5]}"
  got_chain="${tup[7]}"
  got_status="${tup[9]}"

  if [[ "$got_job" == "$job" && "$got_rid" == "$rid" && "$got_model" == "$model" && "$got_in" == "$inhash" && "$got_out" == "$outhash" && "$got_chain" == "2050" && "$got_status" == "1" ]]; then
    echo "[OK] job=$job rid=$rid"
    ok=$((ok+1))
  else
    echo "[FAIL] mismatch job=$job rid=$rid"
    echo "[dbg] mismatch; dumping receipt for jobId=${job:-} rid=${rid:-}"
    RPC_URL="${RPC_URL:-http://127.0.0.1:8545}" ./ops/void-devnet-receipt-dump.sh "${rid:-${job:-}}" || true
    echo "       model:   got=$got_model exp=$model"
    echo "       input:   got=$got_in exp=$inhash"
    echo "       output:  got=$got_out exp=$outhash"
    echo "       chain:   got=$got_chain exp=2050"
    echo "       status:  got=$got_status exp=1"
    fail=$((fail+1))
  fi
done < "$SPOOL"

echo
echo "[done] ok=$ok fail=$fail skip=$skip receiptReg=$RECEIPTR rpc=$RPC_URL"
[[ "$fail" -eq 0 ]]
