#!/usr/bin/env bash
set -euo pipefail
set +H

BASE="${BASE:-http://127.0.0.1:4100}"
OUT="/tmp/void-public-site-bundle-proof-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"

echo "=== void public site bundle proof ==="
git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty

echo
echo "=== build ==="
npm run build

echo
echo "=== readiness ==="
curl -fsS --max-time 8 "$BASE/__void/ready.json" > "$OUT/ready.json"
python3 - "$OUT/ready.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print({"ready": j.get("ready"), "head": j.get("head"), "gap": j.get("gap"), "txroot_live": j.get("txroot_live")})
PY

echo
echo "=== route aliases ==="
check_redirect() {
  local path="$1"
  local expected="$2"
  local hdr="$OUT/alias-${path//\//_}.headers"
  local body="$OUT/alias-${path//\//_}.body"
  local code
  code="$(curl -sS --max-time 8 -D "$hdr" -o "$body" -w '%{http_code}' "$BASE$path")"
  echo "$code $path"
  test "$code" = "302"
  grep -qi "^Location: $expected" "$hdr"
}
check_redirect "/download" "/site/voidchain"
check_redirect "/voidchain" "/site/voidchain"
check_redirect "/nullfeed" "/site/nullfeed"

echo
echo "=== site manifests ==="
check_manifest() {
  local site="$1"
  local expected_dataset="$2"
  local expected_root="$3"
  local file="$OUT/manifest-$site.json"

  curl -fsS --max-time 8 "$BASE/__void/site-manifest/$site.json" > "$file"

  python3 - "$file" "$site" "$expected_dataset" "$expected_root" <<'PY'
import json, sys
path, site, expected_dataset, expected_root = sys.argv[1:5]
j=json.load(open(path))
assert j.get("ok") is True, j
assert j.get("site") == site, j
assert j.get("canonical_site_id") == site, j
assert j.get("datanet_backed") is True, j
assert j.get("content_source") == "datanet_live_v1_with_repo_static_fallback", j
assert j.get("external_cloud_canonical") is False, j
assert j.get("google_cloud_required") is False, j
assert j.get("datanet_dataset_id") == expected_dataset, j
assert j.get("datanet_content_root") == expected_root, j
assert j.get("content_sha256") == expected_root, j
assert j.get("domain_alias_model") == "domains_are_replaceable_aliases_not_identity", j
assert j.get("identity_authority") == "VOID/DataNet site manifest and content root", j
print({
  "site": site,
  "dataset_id": j.get("datanet_dataset_id"),
  "content_root": j.get("datanet_content_root"),
  "alias": j.get("preferred_public_alias"),
})
PY
}

check_manifest \
  "voidchain" \
  "1b8bf41db2d64f8877d0aec397373fa1" \
  "db0c54edcad0130b8de61e73ec61ff60701e97bee6bb3ac065d6c55efbd634e2"

check_manifest \
  "nullfeed" \
  "6a24c375872459c0f9941c58e88bd61e" \
  "f4c8b03bb8f5dae627bb6df9eddab48060bc0dab1a8c886d56dbeab2b4b0c372"

echo
echo "=== served DataNet site content ==="
check_site() {
  local site="$1"
  local expected_dataset="$2"
  local expected_root="$3"
  shift 3

  local hdr="$OUT/site-$site.headers"
  local html="$OUT/site-$site.html"
  local code
  code="$(curl -sS --max-time 8 -D "$hdr" -o "$html" -w '%{http_code}' "$BASE/site/$site")"
  echo "$code /site/$site"
  test "$code" = "200"

  grep -qi "^x-void-site: $site" "$hdr"
  grep -qi "^x-void-site-source: datanet_live_v1" "$hdr"
  grep -qi "^x-void-datanet-backed: true" "$hdr"
  grep -qi "^x-void-datanet-dataset-id: $expected_dataset" "$hdr"
  grep -qi "^x-void-datanet-content-root: $expected_root" "$hdr"
  grep -qi "^x-void-site-sha256: $expected_root" "$hdr"

  for marker in "$@"; do
    grep -q "$marker" "$html"
    echo "[ok] $site marker: $marker"
  done
}

check_site \
  "voidchain" \
  "1b8bf41db2d64f8877d0aec397373fa1" \
  "db0c54edcad0130b8de61e73ec61ff60701e97bee6bb3ac065d6c55efbd634e2" \
  "Mainnet-0 public-live" \
  "DataNet-backed website" \
  "Google Cloud not required" \
  "Quick start"

check_site \
  "nullfeed" \
  "6a24c375872459c0f9941c58e88bd61e" \
  "f4c8b03bb8f5dae627bb6df9eddab48060bc0dab1a8c886d56dbeab2b4b0c372" \
  "NullFeed public preview" \
  "DataNet social storage" \
  "Data-owned feeds" \
  "VOID/DataNet backed"

echo
echo "=== final readiness ==="
curl -fsS --max-time 8 "$BASE/__void/ready.json" > "$OUT/ready-final.json"
python3 - "$OUT/ready-final.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print({"ready": j.get("ready"), "head": j.get("head"), "gap": j.get("gap"), "txroot_live": j.get("txroot_live")})
PY

echo
echo "public_site_bundle_proof=green"
echo "out=$OUT"
