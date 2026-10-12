#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
OUT="/tmp/nullfeed-public-preview-proof-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"

echo "=== nullfeed public preview proof ==="

git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty

grep -q 'NullFeed public preview' docs/site/nullfeed/index.html
grep -q 'DataNet social storage' docs/site/nullfeed/index.html
grep -q 'Work Credits powered actions' docs/site/nullfeed/index.html
grep -q 'user-owned data' docs/site/nullfeed/index.html
grep -q 'verifiable content roots' docs/site/nullfeed/index.html

npm run build --if-present

systemctl --user restart void-node.service

echo "=== wait for ready ==="
READY_OK=0
for i in $(seq 1 30); do
  if curl -fsS --max-time 3 "$BASE/__void/ready.json" > "$OUT/ready.json"; then
    READY_OK=1
    break
  fi
  sleep 2
done

if [ "$READY_OK" != "1" ]; then
  echo "[fail] node did not become ready after restart"
  systemctl --user --no-pager --full status void-node.service | sed -n '1,80p'
  exit 1
fi

# /site/nullfeed is DataNet-first, so this source update appears live only after the next DataNet publish/promote lane.
CODE="$(curl -sS --max-time 8 -D "$OUT/nullfeed.headers" -o "$OUT/nullfeed.html" -w '%{http_code}' "$BASE/site/nullfeed")"
echo "site_route_code=$CODE"
test "$CODE" = "200"

grep -i '^x-void-site-source:' "$OUT/nullfeed.headers" || true
grep -i '^x-void-datanet-backed:' "$OUT/nullfeed.headers" || true

CODE_ALIAS="$(curl -sS --max-time 8 -D "$OUT/nullfeed-alias.headers" -o "$OUT/nullfeed-alias.body" -w '%{http_code}' "$BASE/nullfeed")"
echo "alias_route_code=$CODE_ALIAS"
test "$CODE_ALIAS" = "302"
grep -qi '^Location: /site/nullfeed' "$OUT/nullfeed-alias.headers"

make mainnet0-status-smoke

echo "=== nullfeed public preview proof OK ==="
