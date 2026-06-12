#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/public-node-local-data-drop-hide-legacy-intelligence-live-closeout.md"

echo "=== VOID Public Node Hide Legacy Intelligence Live Closeout Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"

test -f "$DOC"
test -x ops/mainnet0/public-node-local-data-drop-hide-legacy-intelligence-source-proof.sh
test -x ops/mainnet0/public-node-local-data-drop-hide-legacy-intelligence-live-proof.sh

grep -Fq "VOID_PUBLIC_NODE_HIDE_LEGACY_INTELLIGENCE_LIVE_CLOSEOUT_V1" "$DOC"
grep -Fq "publicNodeDataIntelligenceCard" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_DATA_INTELLIGENCE_HIDDEN_UNTIL_LIVE_UI_V1" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_HIDE_LEGACY_INTELLIGENCE_SOURCE_V1_GREEN" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_HIDE_LEGACY_INTELLIGENCE_V1_GREEN" "$DOC"
grep -Fq "ckpt-public-node-hide-legacy-intelligence-source-green-20260612-083100" "$DOC"
grep -Fq "ckpt-public-node-hide-legacy-intelligence-live-green-20260612-083343" "$DOC"
grep -Fq "5c4b1f25" "$DOC"
grep -Fq "d3af461f" "$DOC"
grep -Fq "Precision-only" "$DOC"
grep -Fq "Alienware is offline" "$DOC"
grep -Fq "Cross-box confirmation is deferred" "$DOC"

bash ops/mainnet0/public-node-local-data-drop-hide-legacy-intelligence-source-proof.sh
bash ops/mainnet0/public-node-local-data-drop-hide-legacy-intelligence-live-proof.sh

echo "VOID_PUBLIC_NODE_HIDE_LEGACY_INTELLIGENCE_LIVE_CLOSEOUT_V1_GREEN"
