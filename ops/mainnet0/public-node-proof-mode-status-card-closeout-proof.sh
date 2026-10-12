#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/public-node-proof-mode-status-card-closeout.md"

echo "=== VOID Public Node Proof Mode Status Card Closeout Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"

test -f "$DOC"
test -x ops/mainnet0/public-node-proof-mode-status-card-source-proof.sh
test -x ops/mainnet0/public-node-proof-mode-status-card-live-proof.sh

grep -Fq "VOID_PUBLIC_NODE_PROOF_MODE_STATUS_CARD_CLOSEOUT_V1" "$DOC"
grep -Fq "publicNodeProofModeStatusCard" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_PROOF_MODE_STATUS_UI_V1" "$DOC"
grep -Fq "Precision-only green" "$DOC"
grep -Fq "Alienware is temporarily offline after a storm" "$DOC"
grep -Fq "Precision-only green / Alienware deferred / cross-box pending" "$DOC"
grep -Fq "9f3a5ca9" "$DOC"
grep -Fq "ee6b9d60" "$DOC"
grep -Fq "ckpt-public-node-proof-mode-status-card-source-repair-green-20260612-134730" "$DOC"
grep -Fq "ckpt-public-node-proof-mode-status-card-live-green-20260612-134907" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_PROOF_MODE_STATUS_CARD_SOURCE_V1_GREEN" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_PROOF_MODE_STATUS_CARD_LIVE_V1_GREEN" "$DOC"
grep -Fq "ckpt-public-node-proof-mode-status-card-source-green-20260612-085236" "$DOC"
grep -Fq "Do not claim cross-box green" "$DOC"

bash ops/mainnet0/public-node-proof-mode-status-card-source-proof.sh
bash ops/mainnet0/public-node-proof-mode-status-card-live-proof.sh

echo "VOID_PUBLIC_NODE_PROOF_MODE_STATUS_CARD_CLOSEOUT_V1_GREEN"
