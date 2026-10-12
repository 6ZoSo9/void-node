#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
OUT="/tmp/void-native-site-datanet-bundle-proof-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"

echo "=== VOID-native site DataNet bundle proof v1 ==="

git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty

echo
echo "=== [1] source site files exist ==="
test -f docs/site/voidchain/index.html
test -f docs/site/nullfeed/index.html
echo "[ok] site files present"

echo
echo "=== [2] served manifests exist ==="
curl -fsS "$BASE/__void/site-manifest/voidchain.json" > "$OUT/voidchain.manifest.json"
curl -fsS "$BASE/__void/site-manifest/nullfeed.json" > "$OUT/nullfeed.manifest.json"

python3 - "$OUT" <<'PY'
import json, pathlib, re, sys
out = pathlib.Path(sys.argv[1])
for site in ["voidchain", "nullfeed"]:
    j = json.load(open(out / f"{site}.manifest.json"))
    assert j["ok"] is True
    assert j["site"] == site
    assert j["content_source"] == "repo_static_v1"
    assert j["external_cloud_canonical"] is False
    assert j["google_cloud_required"] is False
    assert re.fullmatch(r"[0-9a-f]{64}", j["content_sha256"])
print("[ok] served manifests valid")
PY

echo
echo "=== [3] content hashes match served manifest ==="
for site in voidchain nullfeed; do
  SRC="docs/site/$site/index.html"
  LOCAL_SHA="$(sha256sum "$SRC" | awk '{print $1}')"
  MANIFEST_SHA="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["content_sha256"])' "$OUT/$site.manifest.json")"
  echo "$site local_sha=$LOCAL_SHA"
  echo "$site manifest_sha=$MANIFEST_SHA"
  test "$LOCAL_SHA" = "$MANIFEST_SHA"
done
echo "[ok] local source hash matches served manifest"

echo
echo "=== [4] create canonical DataNet-style site bundle records ==="
BUNDLE_ROOT="$OUT/bundles"
mkdir -p "$BUNDLE_ROOT"

python3 - "$OUT" "$BUNDLE_ROOT" <<'PY'
import json, pathlib, hashlib, time, sys

out = pathlib.Path(sys.argv[1])
bundle_root = pathlib.Path(sys.argv[2])
repo = pathlib.Path.cwd()

records = []
for site in ["voidchain", "nullfeed"]:
    html_path = repo / "docs" / "site" / site / "index.html"
    html = html_path.read_bytes()
    html_sha = hashlib.sha256(html).hexdigest()
    manifest = json.load(open(out / f"{site}.manifest.json"))

    record = {
        "ok": True,
        "kind": "void_native_site_datanet_bundle_v1",
        "site": site,
        "public_domain": manifest["public_domain"],
        "entry": "index.html",
        "content_sha256": html_sha,
        "manifest_sha256": hashlib.sha256(json.dumps(manifest, sort_keys=True).encode()).hexdigest(),
        "hosted_by": "VOID node",
        "canonical_target": "VOID Network / DataNet",
        "external_cloud_canonical": False,
        "google_cloud_required": False,
        "datanet_backed": "proof_record_v1",
        "proof_note": "This proof packages the site as a content-addressed record. Next lane should publish the bundle into live DataNet storage and serve from dataset id.",
        "created_at_ms": int(time.time() * 1000),
        "files": [
            {
                "path": "index.html",
                "bytes": len(html),
                "sha256": html_sha,
            }
        ],
    }

    site_dir = bundle_root / site
    site_dir.mkdir(parents=True, exist_ok=True)
    (site_dir / "index.html").write_bytes(html)
    (site_dir / "site.manifest.json").write_text(json.dumps(manifest, indent=2, sort_keys=True))
    (site_dir / "datanet-bundle-record.v1.json").write_text(json.dumps(record, indent=2, sort_keys=True))

    bundle_bytes = json.dumps(record, sort_keys=True).encode() + b"\n" + html
    bundle_sha = hashlib.sha256(bundle_bytes).hexdigest()
    record["bundle_sha256"] = bundle_sha
    (site_dir / "datanet-bundle-record.v1.json").write_text(json.dumps(record, indent=2, sort_keys=True))

    records.append(record)

(out / "site-datanet-bundle-summary.json").write_text(json.dumps({
    "ok": True,
    "kind": "void_native_site_datanet_bundle_summary_v1",
    "records": records,
}, indent=2, sort_keys=True))

print(json.dumps({"ok": True, "records": records}, indent=2))
PY

echo
echo "=== [5] verify bundle records ==="
python3 - "$OUT/site-datanet-bundle-summary.json" <<'PY'
import json, re, sys
j = json.load(open(sys.argv[1]))
assert j["ok"] is True
assert len(j["records"]) == 2
for r in j["records"]:
    assert r["site"] in ("voidchain", "nullfeed")
    assert r["external_cloud_canonical"] is False
    assert r["google_cloud_required"] is False
    assert r["datanet_backed"] == "proof_record_v1"
    assert re.fullmatch(r"[0-9a-f]{64}", r["content_sha256"])
    assert re.fullmatch(r"[0-9a-f]{64}", r["bundle_sha256"])
print("[ok] bundle records valid")
PY

echo
echo "=== [6] public routes still work ==="
for path in / /participant /site/voidchain /site/nullfeed /__void/site-manifest/voidchain.json /__void/site-manifest/nullfeed.json /__void/ready.json; do
  CODE="$(curl -sS -o "$OUT/route.out" -w '%{http_code}' "$BASE$path")"
  echo "$CODE $path"
  case "$path" in
    /) test "$CODE" = "302" ;;
    *) test "$CODE" = "200" ;;
  esac
done

echo
echo "=== [7] local status smoke ==="
make mainnet0-status-smoke

echo
echo "summary=$OUT/site-datanet-bundle-summary.json"
echo "=== VOID-native site DataNet bundle proof OK ==="
