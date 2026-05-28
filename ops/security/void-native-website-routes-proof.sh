#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"

echo "=== VOID-native website routes proof ==="

git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty

echo
echo "=== [1] files and source markers ==="
test -f docs/site/voidchain/index.html
test -f docs/site/nullfeed/index.html
grep -Eq 'VOID-native site bundle v1|VOID-hosted site bundle v1' docs/site/voidchain/index.html
grep -q 'NULLFEED' docs/site/nullfeed/index.html
grep -q 'VOID native website routes v1' src/index.ts
grep -q '/site/voidchain' src/index.ts
grep -q '/site/nullfeed' src/index.ts
grep -q '/__void/site-manifest/voidchain.json' src/index.ts
grep -q '/__void/site-manifest/nullfeed.json' src/index.ts
echo "[ok] site files and source markers present"

echo
echo "=== [2] build check ==="
npm run build --if-present

echo
echo "=== [3] served site routes ==="
for path in /site/voidchain /site/nullfeed /__void/site-manifest/voidchain.json /__void/site-manifest/nullfeed.json; do
  OUT="/tmp/void-native-site-proof-$(echo "$path" | tr '/?&=' '----').out"
  HDR="/tmp/void-native-site-proof-$(echo "$path" | tr '/?&=' '----').hdr"
  CODE="$(curl -sS -D "$HDR" -o "$OUT" -w '%{http_code}' "$BASE$path")"
  BYTES="$(wc -c < "$OUT")"
  echo "$CODE $BYTES $path"
  test "$CODE" = "200"
done

grep -q 'Run the network. Own the path.' /tmp/void-native-site-proof--site-voidchain.out
grep -q 'Social data without surrender.' /tmp/void-native-site-proof--site-nullfeed.out

python3 - <<'PY'
import json, pathlib, re
for site in ["voidchain", "nullfeed"]:
    p = pathlib.Path(f"/tmp/void-native-site-proof---void-site-manifest-{site}.json.out")
    # fallback for tr filename variants
    matches = list(pathlib.Path("/tmp").glob(f"void-native-site-proof-*site-manifest-{site}.json.out"))
    if matches:
        p = matches[0]
    j = json.load(open(p))
    assert j["ok"] is True
    assert j["site"] == site
    assert re.fullmatch(r"[0-9a-f]{64}", j["content_sha256"])
    assert j["external_cloud_canonical"] is False
    assert j["google_cloud_required"] is False
print("[ok] site manifests valid")
PY

echo
echo "=== [4] public routes still work ==="
ROOT_CODE="$(curl -sS -o /tmp/void-native-site-root.out -w '%{http_code}' "$BASE/")"
PART_CODE="$(curl -sS -o /tmp/void-native-site-participant.out -w '%{http_code}' "$BASE/participant")"
READY_CODE="$(curl -sS -o /tmp/void-native-site-ready.out -w '%{http_code}' "$BASE/__void/ready.json")"
echo "root_code=$ROOT_CODE"
echo "participant_code=$PART_CODE"
echo "ready_code=$READY_CODE"
test "$ROOT_CODE" = "302"
test "$PART_CODE" = "200"
test "$READY_CODE" = "200"

echo
echo "=== [5] local status smoke ==="
make mainnet0-status-smoke

echo "=== VOID-native website routes proof OK ==="
