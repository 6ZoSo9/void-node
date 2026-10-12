#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
OUT="/tmp/voidchain-download-page-proof-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"

echo "=== voidchain download page proof ==="

git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty

grep -q 'Download / Run a Node' docs/site/voidchain/index.html
grep -q 'GitHub source' docs/site/voidchain/index.html
grep -q 'Quick start' docs/site/voidchain/index.html
grep -q 'Why run a node?' docs/site/voidchain/index.html
grep -q 'Verify the site' docs/site/voidchain/index.html
grep -q 'Google Cloud is not canonical infrastructure' docs/site/voidchain/index.html

npm run build --if-present

systemctl --user restart void-node.service
sleep 5

# /site/voidchain is DataNet-first, so it may still serve the previous
# DataNet bundle until a later publish/promote lane republishes this edited HTML.
# This proof only verifies the repo source update and that the current served route remains healthy.
curl -sS --max-time 8 -D "$OUT/voidchain.headers" -o "$OUT/voidchain.html" "$BASE/site/voidchain"

CODE="$(curl -sS --max-time 8 -o "$OUT/voidchain.route.html" -w '%{http_code}' "$BASE/site/voidchain")"
echo "site_route_code=$CODE"
test "$CODE" = "200"

grep -i '^x-void-site-source:' "$OUT/voidchain.headers" || true
grep -i '^x-void-datanet-backed:' "$OUT/voidchain.headers" || true

grep -q 'Download / Run a Node' docs/site/voidchain/index.html
grep -q 'Quick start' docs/site/voidchain/index.html
grep -q 'GitHub source' docs/site/voidchain/index.html
grep -q 'Verify the site' docs/site/voidchain/index.html

curl -fsS --max-time 8 "$BASE/__void/ready.json" > "$OUT/ready.json"
make mainnet0-status-smoke

echo "=== voidchain download page proof OK ==="
