#!/usr/bin/env bash
set -euo pipefail

echo "=== VOID Public Node Local Data Drop Import Own Data Card Source Proof v1 ==="
echo "head=$(git rev-parse --short HEAD)"

grep -Fq "publicNodeLocalDataDropImportOwnDataCard" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_OWN_DATA_CARD_UI_V1" src/index.ts
grep -Fq "Import Your Own Local Data" src/index.ts
grep -Fq "Node runners can place a small local file" src/index.ts
grep -Fq "mkdir -p /tmp/void-local-data-drop-demo" src/index.ts
grep -Fq "my-first-void-object.txt" src/index.ts
grep -Fq "echo 'hello from my VOID node' &gt; /tmp/void-local-data-drop-demo/my-first-void-object.txt" src/index.ts
grep -Fq "DATA_DIR=&quot;\$PWD/data_a&quot; MAX_FILES=25 ops/mainnet0/public-node-local-data-drop-import-dir.sh /tmp/void-local-data-drop-demo" src/index.ts
grep -Fq "/public-node/local-data-drop.json" src/index.ts
grep -Fq "/public-node/local-data-drop/weighted.json" src/index.ts
grep -Fq "docs/public/public-node-local-data-drop-import-directory-runbook.md" src/index.ts

test -x ops/mainnet0/public-node-local-data-drop-import-dir.sh
test -f docs/public/public-node-local-data-drop-import-directory-runbook.md

npm run build --if-present

echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_OWN_DATA_CARD_SOURCE_V1_GREEN"
