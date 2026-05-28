#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
HDR="/tmp/void-root-redirect-proof-headers-$(date +%Y%m%d-%H%M%S).txt"
BODY="/tmp/void-root-redirect-proof-body-$(date +%Y%m%d-%H%M%S).txt"

echo "=== public root redirect proof ==="

git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty

echo
echo "=== [1] source markers ==="
grep -q 'VOID public root redirect v1' src/index.ts
grep -q 'app.get("/", (_req:any, res:any) =>' src/index.ts
grep -q 'res.redirect(302, "/participant")' src/index.ts
echo "[ok] root redirect source markers present"

echo
echo "=== [2] build check ==="
npm run build --if-present

echo
echo "=== [3] served root route redirect ==="
CODE="$(curl -sS -D "$HDR" -o "$BODY" -w '%{http_code}' "$BASE/")"
echo "code=$CODE"
cat "$HDR" | sed -n '1,20p'

if [ "$CODE" != "302" ]; then
  echo "[fail] expected root route to return 302"
  echo "body:"
  sed -n '1,40p' "$BODY"
  exit 1
fi

if ! grep -qi '^Location: /participant' "$HDR"; then
  echo "[fail] expected Location: /participant"
  exit 1
fi

echo "[ok] root redirects to /participant"

echo
echo "=== [4] participant and readiness still healthy ==="
PCODE="$(curl -sS -o /tmp/void-root-redirect-participant.out -w '%{http_code}' "$BASE/participant")"
echo "participant_code=$PCODE"
test "$PCODE" = "200"

make mainnet0-status-smoke

echo "=== public root redirect proof OK ==="
