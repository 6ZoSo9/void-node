#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/public-node-local-data-drop-import-own-data-card-closeout.md"

echo "=== VOID Public Node Local Data Drop Import Own Data Card Closeout Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"

test -f "$DOC"
test -x ops/mainnet0/public-node-local-data-drop-import-own-data-card-source-proof.sh
test -x ops/mainnet0/public-node-local-data-drop-import-own-data-card-proof.sh
test -x ops/mainnet0/public-node-local-data-drop-import-dir.sh
test -f docs/public/public-node-local-data-drop-import-directory-runbook.md

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_OWN_DATA_CARD_CLOSEOUT_V1" "$DOC"
grep -Fq "publicNodeLocalDataDropImportOwnDataCard" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_OWN_DATA_CARD_UI_V1" "$DOC"
grep -Fq "Import Your Own Local Data" "$DOC"
grep -Fq "ops/mainnet0/public-node-local-data-drop-import-dir.sh" "$DOC"
grep -Fq "mkdir -p /tmp/void-local-data-drop-demo" "$DOC"
grep -Fq "echo 'hello from my VOID node' > /tmp/void-local-data-drop-demo/my-first-void-object.txt" "$DOC"
grep -Fq 'DATA_DIR="$PWD/data_a" MAX_FILES=25 ops/mainnet0/public-node-local-data-drop-import-dir.sh /tmp/void-local-data-drop-demo' "$DOC"
grep -Fq "/public-node/local-data-drop.json" "$DOC"
grep -Fq "/public-node/local-data-drop/weighted.json" "$DOC"
grep -Fq "docs/public/public-node-local-data-drop-import-directory-runbook.md" "$DOC"
grep -Fq "ckpt-public-node-local-data-drop-import-own-data-card-source-green-20260612-074224" "$DOC"
grep -Fq "ckpt-public-node-local-data-drop-import-own-data-card-copy-green-20260612-074637" "$DOC"
grep -Fq "ckpt-public-node-local-data-drop-import-own-data-card-live-green-20260612-075012" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_OWN_DATA_CARD_SOURCE_V1_GREEN" "$DOC"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_OWN_DATA_CARD_V1_GREEN" "$DOC"

bash ops/mainnet0/public-node-local-data-drop-import-own-data-card-source-proof.sh
bash ops/mainnet0/public-node-local-data-drop-import-own-data-card-proof.sh

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_OWN_DATA_CARD_CLOSEOUT_V1_GREEN"
