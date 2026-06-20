#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

src="src/index.ts"
doc="docs/public/public-node-funding-public-proof-pack-abort-recovery-seal-v1.md"

grep -F "VOID_FUNDING_PUBLIC_PROOF_PACK_ABORT_RECOVERY_SEAL_DOC_V1" "$doc" >/dev/null
grep -F "Funding Gateway Card v1" "$doc" >/dev/null
grep -F "40a07171" "$doc" >/dev/null
grep -F "VOID_FUNDING_GATEWAY_CARD_V1_GREEN" "$doc" >/dev/null
grep -F "VOID_FUNDING_GATEWAY_CARD_V1_LIVE_LOCAL_GREEN" "$doc" >/dev/null
grep -F "VOID_FUNDING_GATEWAY_CARD_V1_LIVE_PUBLIC_GREEN" "$doc" >/dev/null
grep -F "VOID_FUNDING_GATEWAY_CARD_V1_RUNTIME_EXPOSURE_CONFIRMED" "$doc" >/dev/null
grep -F "status: aborted" "$doc" >/dev/null
grep -F "public route shipped: false" "$doc" >/dev/null
grep -F "cross-box green: false" "$doc" >/dev/null
grep -F "runtime green: false" "$doc" >/dev/null

grep -F "VOID_FUNDING_GATEWAY_CARD_UI_V1" "$src" >/dev/null
grep -F "publicNodeFundingGatewayCard" "$src" >/dev/null
grep -F "VOID_FUNDING_PATH_TIGHTEN_V1" "$src" >/dev/null
grep -F "VOID_PUBLIC_GATEWAY_TRIAD_SEAL_V1" "$src" >/dev/null

if grep -F 'APP.get("/public-node/funding-proof-pack-v1.json"' "$src" >/dev/null; then
  echo "aborted funding proof pack route unexpectedly present" >&2
  exit 11
fi

if test -f docs/public/public-node-funding-public-proof-pack-v1.md; then
  echo "aborted funding proof pack doc unexpectedly present" >&2
  exit 12
fi

if test -f ops/mainnet0/funding-public-proof-pack-v1-proof.sh; then
  echo "aborted funding proof pack proof unexpectedly present" >&2
  exit 13
fi

echo "VOID_FUNDING_PUBLIC_PROOF_PACK_ABORT_RECOVERY_SEAL_V1_GREEN"
