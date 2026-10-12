#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"

echo "=== public sensitive route guard proof ==="

git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty

echo
echo "=== [1] source markers ==="
grep -q 'VOID public sensitive route guard v1' src/index.ts
grep -q 'VOID_ALLOW_REMOTE_SENSITIVE_ROUTES' src/index.ts
grep -q 'path === "/__void/participant/wallet/export"' src/index.ts
grep -q 'path.startsWith("/__void/operator/")' src/index.ts
grep -q 'path.startsWith("/__void/admin/")' src/index.ts
grep -q 'path.startsWith("/__void/dev/")' src/index.ts
grep -q 'path.startsWith("/__void/diag/")' src/index.ts
grep -q 'path.startsWith("/__debug/")' src/index.ts
grep -q 'path.startsWith("/dev/")' src/index.ts
grep -q 'isLocalRemote(req)' src/index.ts
echo "[ok] sensitive route guard source markers present"

echo
echo "=== [2] build check ==="
npm run build --if-present

echo
echo "=== [3] public routes still work locally ==="
ROOT_CODE="$(curl -sS -o /tmp/void-sensitive-root.out -w '%{http_code}' "$BASE/")"
PART_CODE="$(curl -sS -o /tmp/void-sensitive-participant.out -w '%{http_code}' "$BASE/participant")"
READY_CODE="$(curl -sS -o /tmp/void-sensitive-ready.out -w '%{http_code}' "$BASE/__void/ready.json")"
echo "root_code=$ROOT_CODE"
echo "participant_code=$PART_CODE"
echo "ready_code=$READY_CODE"
test "$ROOT_CODE" = "200"
test "$PART_CODE" = "200"
test "$READY_CODE" = "200"

echo
echo "=== [4] local operator/export routes remain local-accessible for operator tooling ==="
for path in \
  "/__void/operator/buy-void/watch-targets/latest" \
  "/__void/participant/wallet/export?account=zoso"
do
  CODE="$(curl -sS --max-time 8 -o /tmp/void-sensitive-local-route.out -w '%{http_code}' "$BASE$path")"
  echo "$CODE $path"
  test "$CODE" != "000"
done

echo
echo "=== [5] local status smoke ==="
make mainnet0-status-smoke

echo "=== public sensitive route guard proof OK ==="
