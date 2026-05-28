#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
OUT="/tmp/void-native-site-serve-datanet-first-proof-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"

echo "=== VOID-native site serve DataNet-first proof ==="

echo
echo "=== [0] repo/runtime truth ==="
git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty
curl -fsS --max-time 8 "$BASE/__void/ready.json" && echo

echo
echo "=== [1] source markers ==="
grep -q 'readSiteFromDatanetOrStatic' src/index.ts
grep -q 'x-void-site-source' src/index.ts
grep -q 'x-void-datanet-backed' src/index.ts
grep -q 'repo_static_fallback_v1' src/index.ts
grep -q 'datanet_live_v1' src/index.ts
echo "[ok] source markers present"

echo
echo "=== [2] build ==="
npm run build --if-present

echo
echo "=== [3] served pages prefer DataNet and match manifests ==="
for site in voidchain nullfeed; do
  curl -sS --max-time 8 -D "$OUT/$site.headers" -o "$OUT/$site.html" "$BASE/site/$site"
  curl -fsS --max-time 8 "$BASE/__void/site-manifest/$site.json" > "$OUT/$site.manifest.json"

  echo
  echo "--- $site headers ---"
  grep -iE '^x-void-site|^x-void-datanet' "$OUT/$site.headers" || true
done

python3 - "$OUT" <<'PY'
import hashlib
import json
import pathlib
import sys

out = pathlib.Path(sys.argv[1])

for site in ["voidchain", "nullfeed"]:
    headers = (out / f"{site}.headers").read_text(errors="replace").lower()
    html = (out / f"{site}.html").read_bytes()
    manifest = json.load(open(out / f"{site}.manifest.json"))

    sha = hashlib.sha256(html).hexdigest()

    assert "x-void-site-source: datanet_live_v1" in headers
    assert "x-void-datanet-backed: true" in headers
    assert "x-void-datanet-dataset-id:" in headers
    assert "x-void-datanet-content-root:" in headers

    assert manifest["datanet_backed"] is True
    assert manifest["content_source"] == "datanet_live_v1_with_repo_static_fallback"
    assert sha == manifest["content_sha256"]
    assert sha == manifest["datanet_content_root"]

print("[ok] /site routes are serving DataNet-backed content matching manifests")
PY

echo
echo "=== [4] public route smoke ==="
for path in / /participant /site/voidchain /site/nullfeed /__void/site-manifest/voidchain.json /__void/site-manifest/nullfeed.json /__void/ready.json; do
  CODE="$(curl -sS --max-time 8 -o "$OUT/route.out" -w '%{http_code}' "$BASE$path")"
  echo "$CODE $path"
  case "$path" in
    /) test "$CODE" = "302" ;;
    *) test "$CODE" = "200" ;;
  esac
done

echo
echo "=== [5] status smoke ==="
make mainnet0-status-smoke

echo
echo "summary_dir=$OUT"
echo "=== VOID-native site serve DataNet-first proof OK ==="
