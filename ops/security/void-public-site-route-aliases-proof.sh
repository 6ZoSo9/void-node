#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
OUT="/tmp/void-public-site-route-aliases-proof-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"

echo "=== VOID public site route aliases proof ==="

git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty

grep -q 'VOID public site route aliases v1' src/index.ts
grep -q 'app.get("/download"' src/index.ts
grep -q 'app.get("/voidchain"' src/index.ts
grep -q 'app.get("/nullfeed"' src/index.ts

npm run build --if-present

systemctl --user restart void-node.service
sleep 5

curl -fsS --max-time 8 "$BASE/__void/ready.json" > "$OUT/ready.json"

check_redirect() {
  local path="$1"
  local want="$2"
  local hdr="$OUT/$(echo "$path" | tr '/' '_').headers"
  local body="$OUT/$(echo "$path" | tr '/' '_').body"
  local code

  code="$(curl -sS --max-time 8 -D "$hdr" -o "$body" -w '%{http_code}' "$BASE$path")"
  echo "$code $path"
  test "$code" = "302"

  if ! grep -qi "^Location: $want" "$hdr"; then
    echo "[fail] $path did not redirect to $want"
    cat "$hdr"
    exit 1
  fi
}

check_redirect "/download" "/site/voidchain"
check_redirect "/voidchain" "/site/voidchain"
check_redirect "/nullfeed" "/site/nullfeed"

for path in /site/voidchain /site/nullfeed /__void/site-manifest/voidchain.json /__void/site-manifest/nullfeed.json /participant /__void/ready.json; do
  code="$(curl -sS --max-time 8 -o "$OUT/route.body" -w '%{http_code}' "$BASE$path")"
  echo "$code $path"
  test "$code" = "200"
done

for site in voidchain nullfeed; do
  hdr="$OUT/$site.site.headers"
  body="$OUT/$site.site.html"
  code="$(curl -sS --max-time 8 -D "$hdr" -o "$body" -w '%{http_code}' "$BASE/site/$site")"
  test "$code" = "200"
  grep -qi '^x-void-site-source: datanet_live_v1' "$hdr"
  grep -qi '^x-void-datanet-backed: true' "$hdr"
done

make mainnet0-status-smoke

echo "=== VOID public site route aliases proof OK ==="
