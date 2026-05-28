#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
OUT="/tmp/void-native-site-datanet-manifest-proof-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"

echo "=== VOID-native DataNet-backed site manifest proof ==="

echo
echo "=== [0] repo/runtime truth ==="
git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty
curl -fsS --max-time 8 "$BASE/__void/ready.json" && echo

echo
echo "=== [1] source markers ==="
grep -q 'datanet_live_v1_with_repo_static_fallback' src/index.ts
grep -q '3280ff66058b5429872a7e41a4b5c21d' src/index.ts
grep -q '6519ce3c3233cd0d89845b7140791231' src/index.ts
grep -q 'ckpt-void-native-site-live-datanet-publish-green-20260528-102010' src/index.ts
echo "[ok] source markers present"

echo
echo "=== [2] build ==="
npm run build --if-present

echo
echo "=== [3] served manifests carry DataNet proof ids ==="
for site in voidchain nullfeed; do
  curl -fsS --max-time 8 "$BASE/__void/site-manifest/$site.json" > "$OUT/$site.manifest.json"
done

python3 - "$OUT" <<'PY'
import json, pathlib, sys

out = pathlib.Path(sys.argv[1])

expected = {
    "voidchain": {
        "dataset_id": "3280ff66058b5429872a7e41a4b5c21d",
        "content_root": "ec877b747894d093e4ffd4ab9ad8e83c0c43729efb9e002806287e4cfb4296a1",
        "sha256": "ec877b747894d093e4ffd4ab9ad8e83c0c43729efb9e002806287e4cfb4296a1",
    },
    "nullfeed": {
        "dataset_id": "6519ce3c3233cd0d89845b7140791231",
        "content_root": "83f77b7ba41564da7671539a6bef1cf681832b9951477d8cc415381db46cf1b3",
        "sha256": "83f77b7ba41564da7671539a6bef1cf681832b9951477d8cc415381db46cf1b3",
    },
}

for site, exp in expected.items():
    j = json.load(open(out / f"{site}.manifest.json"))
    assert j["ok"] is True
    assert j["site"] == site
    assert j["datanet_backed"] is True
    assert j["google_cloud_required"] is False
    assert j["external_cloud_canonical"] is False
    assert j["content_source"] == "datanet_live_v1_with_repo_static_fallback"
    assert j["datanet_who"] == "void-site-bundle-v1"
    assert j["datanet_dataset_id"] == exp["dataset_id"]
    assert j["datanet_content_root"] == exp["content_root"]
    assert j["content_sha256"] == exp["sha256"]
    assert exp["dataset_id"] in j["datanet_fetch_url"]
    assert "who=void-site-bundle-v1" in j["datanet_fetch_url"]
print("[ok] served manifests expose proven DataNet ids")
PY

echo
echo "=== [4] fetch manifest DataNet ids and verify content ==="
python3 - "$BASE" "$OUT" <<'PY'
import base64
import hashlib
import json
import pathlib
import urllib.request
import sys

base = sys.argv[1].rstrip("/")
out = pathlib.Path(sys.argv[2])
repo = pathlib.Path.cwd()

for site in ["voidchain", "nullfeed"]:
    manifest = json.load(open(out / f"{site}.manifest.json"))
    url = base + manifest["datanet_fetch_url"]
    with urllib.request.urlopen(url, timeout=20) as resp:
        fetched = json.loads(resp.read().decode("utf-8"))
    (out / f"{site}.fetch.json").write_text(json.dumps(fetched, indent=2, sort_keys=True))

    assert fetched["ok"] is True
    fetched_root = fetched.get("rootTxt") or (fetched.get("manifest") or {}).get("merkleRootHex") or (fetched.get("meta") or {}).get("merkleRootHex")
    assert fetched_root == manifest["datanet_content_root"]

    b64 = fetched.get("plaintext_b64") or fetched.get("cipher_b64")
    assert b64
    got = base64.b64decode(b64)
    src = (repo / "docs" / "site" / site / "index.html").read_bytes()

    assert got == src
    assert hashlib.sha256(got).hexdigest() == manifest["content_sha256"]

print("[ok] manifest DataNet fetch ids read back matching site content")
PY

echo
echo "=== [5] public routes still work ==="
for path in / /participant /site/voidchain /site/nullfeed /__void/ready.json; do
  CODE="$(curl -sS --max-time 8 -o "$OUT/route.out" -w '%{http_code}' "$BASE$path")"
  echo "$CODE $path"
  case "$path" in
    /) test "$CODE" = "302" ;;
    *) test "$CODE" = "200" ;;
  esac
done

echo
echo "=== [6] status smoke ==="
make mainnet0-status-smoke

echo
echo "summary_dir=$OUT"
echo "=== VOID-native DataNet-backed site manifest proof OK ==="
