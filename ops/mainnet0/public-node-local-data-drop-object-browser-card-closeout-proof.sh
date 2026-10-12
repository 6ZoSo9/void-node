#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/public-node-local-data-drop-object-browser-card-closeout.md"

echo "=== VOID Public Node Local Data Drop Object Browser Card Closeout Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"

test -f "$DOC"
test -x ops/mainnet0/public-node-local-data-drop-object-browser-card-source-proof.sh
test -x ops/mainnet0/public-node-local-data-drop-object-browser-card-proof.sh

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_OBJECT_BROWSER_CARD_CLOSEOUT_V1" "$DOC"
grep -Fq "publicNodeLocalDataDropObjectBrowserCard" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_OBJECT_BROWSER_CARD_UI_V1" "$DOC"
grep -Fq "publicNodeWeightedObjectBrowserWeightedLink" "$DOC"
grep -Fq "publicNodeWeightedObjectBrowserProofLink" "$DOC"
grep -Fq "publicNodeWeightedObjectBrowserObjectLink" "$DOC"
grep -Fq "publicNodeWeightedObjectBrowserShaLink" "$DOC"
grep -Fq "void-weighted-seed-v1.txt" "$DOC"
grep -Fq "0b3b3284a47dd583f209008a9088c682c82af4609ee3dce222176b9617526a2d" "$DOC"
grep -Fq "/public-node/local-data-drop/weighted.json" "$DOC"
grep -Fq "/public-node/local-data-drop/proof/0b3b3284a47dd583f209008a9088c682c82af4609ee3dce222176b9617526a2d.json" "$DOC"
grep -Fq "/public-node/local-data-drop/void-weighted-seed-v1.txt" "$DOC"
grep -Fq "/public-node/local-data-drop/by-sha256/0b3b3284a47dd583f209008a9088c682c82af4609ee3dce222176b9617526a2d" "$DOC"
grep -Fq "ckpt-public-node-local-data-drop-object-browser-card-source-green-20260612-005519" "$DOC"
grep -Fq "ckpt-public-node-local-data-drop-object-browser-card-live-green-20260612-073134" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_OBJECT_BROWSER_CARD_SOURCE_V1_GREEN" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_OBJECT_BROWSER_CARD_V1_GREEN" "$DOC"

bash ops/mainnet0/public-node-local-data-drop-object-browser-card-source-proof.sh
bash ops/mainnet0/public-node-local-data-drop-object-browser-card-proof.sh

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_OBJECT_BROWSER_CARD_CLOSEOUT_V1_GREEN"
