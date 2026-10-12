#!/usr/bin/env bash
set -euo pipefail

echo "=== VOID Public Node Proof Mode Status Card Source Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"

grep -Fq "publicNodeProofModeStatusCard" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_PROOF_MODE_STATUS_UI_V1" src/index.ts
grep -Fq "Proof Mode Status" src/index.ts
grep -Fq "Precision-only green" src/index.ts
grep -Fq "Alienware is temporarily offline after a storm" src/index.ts
grep -Fq "cross-box confirmation is pending" src/index.ts
grep -Fq "ckpt-public-node-precision-only-storm-baseline-green-20260612-084430" src/index.ts
grep -Fq "ckpt-public-node-alienware-rejoin-runbook-green-20260612-085138" src/index.ts
grep -Fq "Precision-only green / Alienware deferred / cross-box pending" src/index.ts
grep -Fq "not yet re-confirmed cross-box" src/index.ts

npm run build --if-present

echo "VOID_PUBLIC_NODE_PROOF_MODE_STATUS_CARD_SOURCE_V1_GREEN"
