#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
OUT="/tmp/voidchain-public-status-block-proof-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"

echo "=== voidchain public status block proof ==="

git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty

grep -q 'Mainnet-0 public-live' docs/site/voidchain/index.html
grep -q 'DataNet-backed website' docs/site/voidchain/index.html
grep -q 'Google Cloud not required' docs/site/voidchain/index.html
grep -q 'External domains are aliases, not identity' docs/site/voidchain/index.html

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

# /site/voidchain is DataNet-first, so this source update will appear after the next DataNet publish/promote lane.
CODE="$(curl -sS --max-time 8 -D "$OUT/voidchain.headers" -o "$OUT/voidchain.html" -w '%{http_code}' "$BASE/site/voidchain")"
echo "site_route_code=$CODE"
test "$CODE" = "200"

grep -i '^x-void-site-source:' "$OUT/voidchain.headers" || true
grep -i '^x-void-datanet-backed:' "$OUT/voidchain.headers" || true

make mainnet0-status-smoke

echo "=== voidchain public status block proof OK ==="
