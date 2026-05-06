#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

NOTE="ops/mainnet0/buy-void-base-claim-rehearsal.current.md"

echo "=== Buy VOID Base claim rehearsal note proof ==="
echo "note=$NOTE"

test -f "$NOTE"

needles=(
  "Status: rehearsal_created_no_claim_no_void_send"
  "Commit: c7606032"
  "ckpt-buy-void-base-claim-create-rehearsal-green-20260506-021206"
  "OUT_JSON=/tmp/buy-void-base-claim-create-rehearsal-20260506-020909.json"
  "REQUEST_ID=buyreq_1778051350148_af9d3023"
  "QUEUE_ID=buyq_1778051350285_11b64d45"
  "WATCH_ID=buywatch_1778051350400_6dcb454d"
  "Amount: 25 USDC"
  "Receiver: 0x45dd104e3F7CC2A080F2edA094D011D09c51960B"
  "Delivery wallet: 0x1101A058E98eDCD775c93E26900d1DdBbdfa5d31"
  "Do not run MODE=claim until a real Base native USDC transaction hash exists"
  "Do not treat claim verification as VOID fulfillment."
  "Do not send VOID from this lane."
  "No VOID send should occur until a separate fulfillment proof exists and passes."
  "Blind direct deposits are not supported."
  "Exchange or custodial wallet sends are not supported."
)

for needle in "${needles[@]}"; do
  grep -Fq "$needle" "$NOTE" || {
    echo "[ERR] missing note text: $needle"
    exit 1
  }
  echo "[ok] $needle"
done

echo
echo "[ok] Buy VOID Base claim rehearsal note proof passed"
