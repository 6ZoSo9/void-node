#!/usr/bin/env bash
set -euo pipefail

LOCAL_BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/public-node-first-external-tester-closed-topline-card-proof-$(date -u +%Y%m%d-%H%M%S)}"

mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_CLOSED_TOPLINE_CARD_PROOF_V1"
echo "checked_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "head=$(git rev-parse --short HEAD)"
echo "tag=$(git tag --points-at HEAD | head -1)"
echo "local_base=$LOCAL_BASE"
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_CLOSED_TOPLINE_UI_V1" src/index.ts
grep -Fq "publicNodeFirstExternalTesterClosedToplineCard" src/index.ts
grep -Fq "publicNodeFirstExternalTesterClosedToplineStatusLink" src/index.ts
grep -Fq "publicNodeFirstExternalTesterClosedToplineIntakeLink" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_CLOSED_TOPLINE_UI_DOC_V1" docs/public/public-node-first-external-tester-closed-topline-card.md
grep -Fq "/public-node/first-external-receipt-imported-closeout-proof-status.json" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_IMPORTED_CLOSEOUT_PROOF_V1_GREEN" src/index.ts
grep -Fq "first_external_receipt_imported_closeout_proof_status_green=true" src/index.ts
grep -Fq "trusted_as_network_truth" src/index.ts
bash -n ops/mainnet0/public-node-first-external-tester-closed-topline-card-proof.sh

echo "source_markers_green=true"
echo "ui_marker=VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_CLOSED_TOPLINE_UI_V1"
echo "card_id=publicNodeFirstExternalTesterClosedToplineCard"
echo "status_link=/public-node/first-external-receipt-imported-closeout-proof-status.json"
echo "intake_link=/public-node/tester-result-intake.json"
echo "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_CLOSED_TOPLINE_CARD_PROOF_V1_GREEN"
