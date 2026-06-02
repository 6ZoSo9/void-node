#!/usr/bin/env bash
set -uo pipefail
set +H
set +o histexpand 2>/dev/null || true

cd "${VOID_REPO:-$HOME/dev/void-node}" || exit 1

ALIEN="${ALIEN:-zoso@100.122.79.39}"
LOCAL_BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"
REMOTE_BASE="${REMOTE_BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/void-public-site-bundle-peer-readiness-proof-$(date +%Y%m%d-%H%M%S)}"

mkdir -p "$OUT"

VOIDCHAIN_DATASET="1b8bf41db2d64f8877d0aec397373fa1"
VOIDCHAIN_ROOT="db0c54edcad0130b8de61e73ec61ff60701e97bee6bb3ac065d6c55efbd634e2"
NULLFEED_DATASET="2930d5e8436eb5674be06d2b0152d20c"
NULLFEED_ROOT="f4c8b03bb8f5dae627bb6df9eddab48060bc0dab1a8c886d56dbeab2b4b0c372"

FAIL=0
ok(){ echo "[ok] $*"; }
fail(){ echo "[fail] $*"; FAIL=1; }

check_ready_json(){
  local file="$1"
  local label="$2"
  python3 - "$file" "$label" <<'PY' || exit 1
import json, sys
p,label=sys.argv[1],sys.argv[2]
j=json.load(open(p, encoding="utf-8"))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print(f"[ok] {label} ready/gap/txroot")
PY
}

check_manifest_json(){
  local file="$1"
  local site="$2"
  local dataset="$3"
  local root="$4"
  python3 - "$file" "$site" "$dataset" "$root" <<'PY' || exit 1
import json, sys
p,site,dataset,root=sys.argv[1:5]
j=json.load(open(p, encoding="utf-8"))
assert j.get("ok") is True, j
assert j.get("site") == site, j
assert j.get("identity_authority") == "VOID/DataNet site manifest and content root", j
assert j.get("datanet_backed") is True, j
assert j.get("datanet_dataset_id") == dataset, j
assert j.get("datanet_content_root") == root, j
assert j.get("datanet_fetch_url"), j
print(f"[ok] {site} manifest locks DataNet identity/root")
PY
}

check_fetch_json(){
  local file="$1"
  local dataset="$2"
  local root="$3"
  python3 - "$file" "$dataset" "$root" <<'PY' || exit 1
import json, sys
p,dataset,root=sys.argv[1:4]
j=json.load(open(p, encoding="utf-8"))
assert j.get("ok") is True, j
assert j.get("id") == dataset, j
assert j.get("rootTxt") == root, j
assert int(j.get("sizeBytes") or 0) > 0, j
m=j.get("manifest") or {}
assert int(m.get("sizeBytes") or 0) == int(j.get("sizeBytes") or 0), j
chunks=m.get("chunks") or []
assert len(chunks) >= 1, j
print(f"[ok] fetch endpoint exposes packed bundle {dataset} root={root} size={j.get('sizeBytes')}")
PY
}

check_packed_dir(){
  local dataset="$1"
  local root="$2"
  local label="$3"
  local dir="data_a/datanet/publish_shim_v1/packed/$dataset"

  if [ ! -f "$dir/chunk_000000.bin" ]; then
    fail "$label packed chunk missing for $dataset"
    return
  fi
  if [ ! -f "$dir/root.txt" ]; then
    fail "$label root.txt missing for $dataset"
    return
  fi
  got="$(sha256sum "$dir/chunk_000000.bin" | awk '{print $1}')"
  root_txt="$(cat "$dir/root.txt" | tr -d '\r\n')"
  if [ "$got" = "$root" ] && [ "$root_txt" = "$root" ]; then
    ok "$label packed dir hash/root match for $dataset"
  else
    fail "$label packed dir mismatch for $dataset got=$got root_txt=$root_txt expected=$root"
  fi
}

echo "=== public site bundle peer-readiness proof ==="
echo "mutation=false"
echo "note=This proves peer-readable fixed site bundles and DataNet-backed local serving. It does not claim automatic peer materialization yet."
echo

echo "=== [1] local truth ==="
git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty
curl -fsS --max-time 8 "$LOCAL_BASE/__void/ready.json" > "$OUT/local.ready.json" || fail "local ready fetch"
check_ready_json "$OUT/local.ready.json" "local" || FAIL=1

echo
echo "=== [2] remote truth ==="
ssh "$ALIEN" 'cd "$HOME/dev/void-node" && git status --short && git rev-parse --short HEAD && git describe --tags --always --dirty' | tee "$OUT/remote.git.txt"
ssh "$ALIEN" 'curl -fsS --max-time 8 http://127.0.0.1:4100/__void/ready.json' > "$OUT/remote.ready.json" || fail "remote ready fetch"
check_ready_json "$OUT/remote.ready.json" "remote" || FAIL=1

echo
echo "=== [3] local manifests and fetch endpoints ==="
curl -fsS --max-time 8 "$LOCAL_BASE/__void/site-manifest/voidchain.json" > "$OUT/local.voidchain.manifest.json" || fail "local voidchain manifest"
curl -fsS --max-time 8 "$LOCAL_BASE/__void/site-manifest/nullfeed.json" > "$OUT/local.nullfeed.manifest.json" || fail "local nullfeed manifest"
curl -fsS --max-time 8 "$LOCAL_BASE/datanet/v1/fetch/$VOIDCHAIN_DATASET?who=void-site-bundle-v1" > "$OUT/local.voidchain.fetch.json" || fail "local voidchain fetch"
curl -fsS --max-time 8 "$LOCAL_BASE/datanet/v1/fetch/$NULLFEED_DATASET?who=void-site-bundle-v1" > "$OUT/local.nullfeed.fetch.json" || fail "local nullfeed fetch"

check_manifest_json "$OUT/local.voidchain.manifest.json" "voidchain" "$VOIDCHAIN_DATASET" "$VOIDCHAIN_ROOT" || FAIL=1
check_manifest_json "$OUT/local.nullfeed.manifest.json" "nullfeed" "$NULLFEED_DATASET" "$NULLFEED_ROOT" || FAIL=1
check_fetch_json "$OUT/local.voidchain.fetch.json" "$VOIDCHAIN_DATASET" "$VOIDCHAIN_ROOT" || FAIL=1
check_fetch_json "$OUT/local.nullfeed.fetch.json" "$NULLFEED_DATASET" "$NULLFEED_ROOT" || FAIL=1

echo
echo "=== [4] remote manifests and fetch endpoints over peer SSH ==="
ssh "$ALIEN" "curl -fsS --max-time 8 http://127.0.0.1:4100/__void/site-manifest/voidchain.json" > "$OUT/remote.voidchain.manifest.json" || fail "remote voidchain manifest"
ssh "$ALIEN" "curl -fsS --max-time 8 http://127.0.0.1:4100/__void/site-manifest/nullfeed.json" > "$OUT/remote.nullfeed.manifest.json" || fail "remote nullfeed manifest"
ssh "$ALIEN" "curl -fsS --max-time 8 'http://127.0.0.1:4100/datanet/v1/fetch/$VOIDCHAIN_DATASET?who=void-site-bundle-v1'" > "$OUT/remote.voidchain.fetch.json" || fail "remote voidchain fetch"
ssh "$ALIEN" "curl -fsS --max-time 8 'http://127.0.0.1:4100/datanet/v1/fetch/$NULLFEED_DATASET?who=void-site-bundle-v1'" > "$OUT/remote.nullfeed.fetch.json" || fail "remote nullfeed fetch"

check_manifest_json "$OUT/remote.voidchain.manifest.json" "voidchain" "$VOIDCHAIN_DATASET" "$VOIDCHAIN_ROOT" || FAIL=1
check_manifest_json "$OUT/remote.nullfeed.manifest.json" "nullfeed" "$NULLFEED_DATASET" "$NULLFEED_ROOT" || FAIL=1
check_fetch_json "$OUT/remote.voidchain.fetch.json" "$VOIDCHAIN_DATASET" "$VOIDCHAIN_ROOT" || FAIL=1
check_fetch_json "$OUT/remote.nullfeed.fetch.json" "$NULLFEED_DATASET" "$NULLFEED_ROOT" || FAIL=1

echo
echo "=== [5] local packed dirs hash/root ==="
check_packed_dir "$VOIDCHAIN_DATASET" "$VOIDCHAIN_ROOT" "local voidchain"
check_packed_dir "$NULLFEED_DATASET" "$NULLFEED_ROOT" "local nullfeed"

echo
echo "=== [6] remote packed dirs hash/root ==="
ssh "$ALIEN" "cd '$HOME/dev/void-node' && \
  sha256sum data_a/datanet/publish_shim_v1/packed/$VOIDCHAIN_DATASET/chunk_000000.bin && \
  cat data_a/datanet/publish_shim_v1/packed/$VOIDCHAIN_DATASET/root.txt && echo && \
  sha256sum data_a/datanet/publish_shim_v1/packed/$NULLFEED_DATASET/chunk_000000.bin && \
  cat data_a/datanet/publish_shim_v1/packed/$NULLFEED_DATASET/root.txt && echo" > "$OUT/remote.packed.hashes.txt" || fail "remote packed hash/root inspect"

grep -q "$VOIDCHAIN_ROOT" "$OUT/remote.packed.hashes.txt" && ok "remote voidchain packed hash/root present" || fail "remote voidchain packed hash/root missing"
grep -q "$NULLFEED_ROOT" "$OUT/remote.packed.hashes.txt" && ok "remote nullfeed packed hash/root present" || fail "remote nullfeed packed hash/root missing"

echo
echo "=== [7] served routes are DataNet-backed, not fallback ==="
for route in /site/voidchain /site/nullfeed; do
  name="$(basename "$route")"
  curl -fsS --max-time 8 -D "$OUT/local.$name.headers" -o "$OUT/local.$name.html" "$LOCAL_BASE$route" || fail "local route $route"
  grep -qi '^x-void-datanet-backed: true' "$OUT/local.$name.headers" && ok "local $route DataNet-backed" || fail "local $route not DataNet-backed"
  ssh "$ALIEN" "curl -fsS --max-time 8 -D - -o /tmp/void-site-peer-readiness-$name.html http://127.0.0.1:4100$route" > "$OUT/remote.$name.headers" || fail "remote route $route"
  grep -qi '^x-void-datanet-backed: true' "$OUT/remote.$name.headers" && ok "remote $route DataNet-backed" || fail "remote $route not DataNet-backed"
done

echo
echo "=== [8] status smoke ==="
make mainnet0-status-smoke || FAIL=1
ssh "$ALIEN" 'cd "$HOME/dev/void-node" && make mainnet0-status-smoke' || FAIL=1

echo
echo "=== [9] summary ==="
python3 - <<PY
print({
  "public_site_bundle_peer_readiness": "green" if $FAIL == 0 else "failed",
  "mutation": False,
  "automatic_peer_materialization": False,
  "peer_fetchable_fixed_site_bundles": True,
  "local_and_remote_datanet_backed_serving": $FAIL == 0,
  "voidchain_dataset": "$VOIDCHAIN_DATASET",
  "nullfeed_dataset": "$NULLFEED_DATASET",
  "out": "$OUT"
})
PY

if [ "$FAIL" -eq 0 ]; then
  echo "[ok] public site bundle peer-readiness proof passed"
  echo "out=$OUT"
  exit 0
fi

echo "[fail] public site bundle peer-readiness proof failed"
echo "out=$OUT"
exit 1
