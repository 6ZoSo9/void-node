#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
WHO="${WHO:-void-site-bundle-v1}"
OUT="/tmp/void-native-site-live-datanet-publish-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"

echo "=== VOID-native site live DataNet publish/readback proof v1 ==="

echo
echo "=== [0] repo/runtime truth ==="
git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty
curl -fsS --max-time 8 "$BASE/__void/ready.json" && echo

echo
echo "=== [1] source site files and routes ==="
test -f docs/site/voidchain/index.html
test -f docs/site/nullfeed/index.html

for path in /site/voidchain /site/nullfeed /__void/site-manifest/voidchain.json /__void/site-manifest/nullfeed.json; do
  CODE="$(curl -sS --max-time 8 -o "$OUT/route.out" -w '%{http_code}' "$BASE$path")"
  echo "$CODE $path"
  test "$CODE" = "200"
done

echo
echo "=== [2] publish and fetch site HTML through DataNet ==="
python3 - "$BASE" "$WHO" "$OUT" <<'PY'
import base64
import hashlib
import json
import pathlib
import sys
import urllib.parse
import urllib.request

base = sys.argv[1].rstrip("/")
who = sys.argv[2]
out = pathlib.Path(sys.argv[3])
repo = pathlib.Path.cwd()

sites = {
    "voidchain": repo / "docs" / "site" / "voidchain" / "index.html",
    "nullfeed": repo / "docs" / "site" / "nullfeed" / "index.html",
}

summary = {
    "ok": True,
    "kind": "void_native_site_live_datanet_publish_summary_v1",
    "who": who,
    "base": base,
    "records": [],
}

def http_json(method, url, payload=None):
    data = None
    headers = {}
    if payload is not None:
        data = json.dumps(payload, sort_keys=True).encode("utf-8")
        headers["content-type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=20) as resp:
        body = resp.read()
        return resp.status, json.loads(body.decode("utf-8"))

for site, path in sites.items():
    html = path.read_bytes()
    html_sha = hashlib.sha256(html).hexdigest()
    b64 = base64.b64encode(html).decode("ascii")

    publish_url = f"{base}/datanet/v1/publish?who={urllib.parse.quote(who)}"
    payload = {
        "plaintext_b64": b64,
        "name": f"{site}-index.html",
        "mime": "text/html; charset=utf-8",
    }

    p_status, published = http_json("POST", publish_url, payload)
    (out / f"{site}.publish.json").write_text(json.dumps(published, indent=2, sort_keys=True))

    # Live /datanet/v1/fetch/:id expects the short publish id plus ?who=...
    # The Merkle root remains the verification/content root.
    dataset_id = published.get("id")
    content_root = (
        published.get("merkleRootHex")
        or (published.get("manifest") or {}).get("merkleRootHex")
        or published.get("root")
        or (published.get("manifest") or {}).get("root")
    )

    if p_status != 200:
        raise SystemExit(f"{site}: publish returned HTTP {p_status}")
    if not published.get("ok"):
        raise SystemExit(f"{site}: publish ok=false: {published}")
    if not dataset_id:
        raise SystemExit(f"{site}: could not find short publish id in publish response keys={sorted(published.keys())}")
    if not content_root:
        raise SystemExit(f"{site}: could not find content root in publish response keys={sorted(published.keys())}")

    fetch_url = f"{base}/datanet/v1/fetch/{urllib.parse.quote(str(dataset_id))}?who={urllib.parse.quote(who)}"
    f_status, fetched = http_json("GET", fetch_url)
    (out / f"{site}.fetch.json").write_text(json.dumps(fetched, indent=2, sort_keys=True))

    if f_status != 200:
        raise SystemExit(f"{site}: fetch returned HTTP {f_status}")
    if not fetched.get("ok"):
        raise SystemExit(f"{site}: fetch ok=false: {fetched}")

    fetched_root = (
        fetched.get("rootTxt")
        or (fetched.get("manifest") or {}).get("merkleRootHex")
        or (fetched.get("meta") or {}).get("merkleRootHex")
    )
    if str(fetched_root) != str(content_root):
        raise SystemExit(f"{site}: fetched root mismatch {fetched_root} != {content_root}")

    fetched_b64 = str(fetched.get("plaintext_b64") or fetched.get("cipher_b64") or "")
    if not fetched_b64:
        raise SystemExit(f"{site}: fetch response missing plaintext_b64/cipher_b64")
    fetched_plain = base64.b64decode(fetched_b64)
    fetched_sha = hashlib.sha256(fetched_plain).hexdigest()

    if fetched_plain != html:
        raise SystemExit(f"{site}: fetched content does not match source HTML")
    if fetched_sha != html_sha:
        raise SystemExit(f"{site}: fetched sha mismatch {fetched_sha} != {html_sha}")

    record = {
        "ok": True,
        "site": site,
        "dataset_id": str(dataset_id),
        "content_root": str(content_root),
        "publish_local_id": str(published.get("id") or ""),
        "source_file": str(path),
        "bytes": len(html),
        "sha256": html_sha,
        "publish_http": p_status,
        "fetch_http": f_status,
        "fetch_root_matches_publish_root": True,
        "content_matches_source": True,
        "google_cloud_required": False,
        "external_cloud_canonical": False,
    }
    summary["records"].append(record)
    print(json.dumps(record, indent=2, sort_keys=True))

(out / "summary.json").write_text(json.dumps(summary, indent=2, sort_keys=True))
print("summary=" + str(out / "summary.json"))
PY

echo
echo "=== [3] validate publish/readback summary ==="
python3 - "$OUT/summary.json" <<'PY'
import json
import re
import sys

j = json.load(open(sys.argv[1]))
assert j["ok"] is True
assert j["kind"] == "void_native_site_live_datanet_publish_summary_v1"
assert len(j["records"]) == 2

sites = {r["site"] for r in j["records"]}
assert sites == {"voidchain", "nullfeed"}

for r in j["records"]:
    assert r["ok"] is True
    assert r["fetch_root_matches_publish_root"] is True
    assert r["content_matches_source"] is True
    assert str(r["content_root"]).strip()
    assert r["google_cloud_required"] is False
    assert r["external_cloud_canonical"] is False
    assert re.fullmatch(r"[0-9a-f]{64}", r["sha256"])
    assert str(r["dataset_id"]).strip()

print("[ok] live DataNet site publish/readback summary valid")
PY

echo
echo "=== [4] public routes still work ==="
for path in / /participant /site/voidchain /site/nullfeed /__void/site-manifest/voidchain.json /__void/site-manifest/nullfeed.json /__void/ready.json; do
  CODE="$(curl -sS --max-time 8 -o "$OUT/public-route.out" -w '%{http_code}' "$BASE$path")"
  echo "$CODE $path"
  case "$path" in
    /) test "$CODE" = "302" ;;
    *) test "$CODE" = "200" ;;
  esac
done

echo
echo "=== [5] local status smoke ==="
make mainnet0-status-smoke

echo
echo "summary=$OUT/summary.json"
echo "=== VOID-native site live DataNet publish/readback proof OK ==="
