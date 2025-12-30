#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

BASE="${BASE:-http://127.0.0.1:4100}"
SIZE_BYTES="${SIZE_BYTES:-1024}"
CHUNK_BYTES="${CHUNK_BYTES:-1048576}" # 1 chunk
FILE="src/http/datanet_routes.ts"
CTL="src/voidctl/index.ts"

[[ -f "$FILE" ]] || { echo "[ERR] missing $FILE"; exit 2; }
[[ -f "$CTL"  ]] || { echo "[ERR] missing $CTL"; exit 3; }

ROOTDIR="$(pwd)"
TSX_REQ="${TSX_REQ:-$ROOTDIR/node_modules/tsx/dist/preflight.cjs}"
TSX_LOADER="${TSX_LOADER:-file://$ROOTDIR/node_modules/tsx/dist/loader.mjs}"

[[ -f "$TSX_REQ" ]] || { echo "[ERR] missing TSX_REQ=$TSX_REQ (but systemd uses it)."; exit 4; }

TMPDIR="${TMPDIR:-/tmp}"
BIN="$TMPDIR/void-datanet-smoke.bin.$$"
PACKDIR="$TMPDIR/void-datanet-pack.$$"
MANI="$TMPDIR/void-datanet-manifest.$$\.json"
CHUNK="$TMPDIR/void-datanet-chunk.$$\.bin"
FETCH_CH="$TMPDIR/void-datanet-fetch.chunk.$$"
cleanup(){ rm -rf "$BIN" "$PACKDIR" "$MANI" "$CHUNK" "$FETCH_CH" 2>/dev/null || true; }
trap cleanup EXIT

python3 - <<PY
import os
p=r"$BIN"; n=int(r"$SIZE_BYTES")
with open(p,"wb") as f: f.write(os.urandom(n))
print(p)
PY

SHA="$(python3 - <<PY
import hashlib
p=r"$BIN"
print(hashlib.sha256(open(p,'rb').read()).hexdigest())
PY
)"

PREFIX="$(python3 - <<'PY' "$FILE"
import re,sys
s=open(sys.argv[1],"r",errors="replace").read()
m=re.search(r'app\.use\(\s*["\']([^"\']+)["\']\s*,\s*router\s*\)', s)
print(m.group(1) if m else "/datanet/v1")
PY
)"

echo "BASE=$BASE"
echo "PREFIX=$PREFIX"
echo "BIN=$BIN bytes=$SIZE_BYTES sha256=$SHA"
echo "CHUNK_BYTES=$CHUNK_BYTES"
echo "TSX_REQ=$TSX_REQ"
echo "TSX_LOADER=$TSX_LOADER"
echo

echo "=== [precheck] status must not be 404 if mounted ==="
CODE_STATUS="$(curl -sS -o /tmp/void-dn.status.body.$$ -w "%{http_code}" --connect-timeout 1 --max-time 3 "$BASE$PREFIX/status" || true)"
echo "status_code=$CODE_STATUS"
head -c 200 /tmp/void-dn.status.body.$$ 2>/dev/null | tr '\n' ' '; echo
rm -f /tmp/void-dn.status.body.$$ 2>/dev/null || true
if [[ "$CODE_STATUS" == "404" ]]; then
  echo "[ERR] status is 404 -> routes not mounted (or filtered to 404)."
  exit 40
fi
echo

echo "=== [pack] via voidctl under tsx loader ==="
rm -rf "$PACKDIR"; mkdir -p "$PACKDIR"
node --require "$TSX_REQ" --import "$TSX_LOADER" "$CTL" datanet pack --in "$BIN" --out "$PACKDIR" --chunk-bytes "$CHUNK_BYTES"

MJSON="$(ls -1 "$PACKDIR"/*.json 2>/dev/null | head -n 1 || true)"
[[ -n "$MJSON" ]] || { echo "[ERR] no manifest json in $PACKDIR"; ls -la "$PACKDIR" || true; exit 10; }
cp -a "$MJSON" "$MANI"

CF="$(ls -1 "$PACKDIR"/* 2>/dev/null | rg -v '\.json$' | head -n 1 || true)"
[[ -n "$CF" ]] || { echo "[ERR] no chunk file in $PACKDIR"; ls -la "$PACKDIR" || true; exit 11; }
cp -a "$CF" "$CHUNK"

ROOT="$(python3 - <<PY
import json
j=json.load(open(r"$MANI","r"))
for k in ("root","merkleRoot","manifestRoot","datasetRoot"):
  v=j.get(k)
  if isinstance(v,str) and v:
    print(v); break
PY
)"
LEAF="$(python3 - <<PY
import json,re,os
j=json.load(open(r"$MANI","r"))
leaves=j.get("leaves") or j.get("chunks") or j.get("chunkLeaves")
leaf=None
if isinstance(leaves,list) and len(leaves)==1:
  e=leaves[0]
  if isinstance(e,str): leaf=e
  elif isinstance(e,dict):
    for k in ("leaf","hash","id","key"):
      if isinstance(e.get(k),str) and e.get(k):
        leaf=e[k]; break
elif isinstance(leaves,dict) and len(leaves)==1:
  leaf=list(leaves.keys())[0]
if not leaf:
  bn=os.path.basename(r"$CF")
  m=re.search(r'([0-9a-f]{64})', bn)
  if m: leaf=m.group(1)
print(leaf or "")
PY
)"

# === [BEGIN PACK MANIFEST PARSE V8E] ===
# If ROOT/LEAF were not extracted from console output, parse them from the pack manifest JSON in PACKDIR.
if [[ -z "${ROOT:-}" || -z "${LEAF:-}" ]]; then
  if [[ -z "${PACKDIR:-}" || ! -d "${PACKDIR:-}" ]]; then
    echo "[ERR] PACKDIR missing/invalid; cannot parse manifest"
    echo "PACKDIR=${PACKDIR:-}"
    exit 31
  fi
  MANIFEST_JSON=""
  if [[ -f "$PACKDIR/manifest.json" ]]; then
    MANIFEST_JSON="$PACKDIR/manifest.json"
  elif [[ -f "$PACKDIR/manifest.cbor.json" ]]; then
    MANIFEST_JSON="$PACKDIR/manifest.cbor.json"
  else
    MANIFEST_JSON="$(ls -1 "$PACKDIR"/*.json 2>/dev/null | head -n 1 || true)"
  fi
  if [[ -z "${MANIFEST_JSON:-}" || ! -f "$MANIFEST_JSON" ]]; then
    echo "[ERR] could not locate manifest JSON in $PACKDIR"
    ls -la "$PACKDIR" || true
    exit 32
  fi
  ROOT="$(MANIFEST_JSON="$MANIFEST_JSON" python3 - <<'PY'
import json,os
p=os.environ["MANIFEST_JSON"]
m=json.load(open(p,"r"))
# prefer the canonical v1 keys used by voidctl pack
root = (
    m.get("merkleRootHex") or m.get("merkle_root_hex") or
    m.get("merkleRoot") or m.get("root") or
    m.get("datasetRoot") or m.get("datasetId") or m.get("dataset_id") or ""
)
print(root)
PY
)"
  LEAF="$(MANIFEST_JSON="$MANIFEST_JSON" python3 - <<'PY'
import json,os
p=os.environ["MANIFEST_JSON"]
m=json.load(open(p,"r"))
leaf=""
# v1 manifest: chunks[0].leafHashHex
chs = m.get("chunks")
if isinstance(chs, list) and chs:
    c = chs[0]
    if isinstance(c, dict):
        leaf = (
            c.get("leafHashHex") or c.get("leaf_hash_hex") or
            c.get("leaf") or c.get("hash") or c.get("id") or ""
        )
# older shapes: leaves[0]
if not leaf and isinstance(m.get("leaves"), list) and m["leaves"]:
    leaf = m["leaves"][0]
print(leaf)
PY
)"
  if [[ -z "${ROOT:-}" || -z "${LEAF:-}" ]]; then
    echo "[ERR] manifest JSON missing ROOT/LEAF (file=$MANIFEST_JSON)"
    python3 - <<PY
import json
print(json.dumps(json.load(open(r"$MANIFEST_JSON","r")), indent=2)[:2500])
PY
    exit 33
  fi
  echo "[ok] manifest=$MANIFEST_JSON"
  echo "[ok] ROOT=$ROOT"
  echo "[ok] LEAF=$LEAF"
fi
# === [END PACK MANIFEST PARSE V8E] ===

[[ -n "$ROOT" && -n "$LEAF" ]] || { echo "[ERR] could not extract ROOT/LEAF"; echo "ROOT=$ROOT LEAF=$LEAF"; exit 12; }

echo "[ok] ROOT=$ROOT"
echo "[ok] LEAF=$LEAF"
echo

put(){
  local url="$1"; shift
  local ctype="$1"; shift
  local data="$1"; shift
  curl -sS -o /tmp/void-dn.body.$$ -w "%{http_code}" \
    --connect-timeout 1 --max-time 20 \
    -X PUT \
    -H "Content-Type: $ctype" \
    --data-binary @"$data" \
    "$url" || true
}
get(){
  local url="$1"; shift
  local out="$1"; shift
  curl -sS -o "$out" -w "%{http_code}" \
    --connect-timeout 1 --max-time 20 \
    "$url" || true
}

CHUNK_URL="$BASE$PREFIX/chunks/$LEAF"
MAN_URL="$BASE$PREFIX/manifests/$ROOT"

echo "=== [publish] PUT chunk ==="
CODE_CHUNK="$(put "$CHUNK_URL" "application/octet-stream" "$CHUNK")"
echo "chunk_put_code=$CODE_CHUNK url=$CHUNK_URL"
echo

echo "=== [publish] PUT manifest ==="
CODE_MAN="$(put "$MAN_URL" "application/json" "$MANI")"
echo "manifest_put_code=$CODE_MAN url=$MAN_URL"
echo

if [[ "$CODE_CHUNK" == "404" || "$CODE_MAN" == "404" ]]; then
  echo "[ERR] got 404 on PUT -> routes not mounted (or filtered)."
  exit 41
fi

ok_put(){ [[ "$1" == "200" || "$1" == "201" || "$1" == "204" ]]; }
ok_get(){ [[ "$1" == "200" ]]; }

ok_put "$CODE_CHUNK" || { echo "[ERR] chunk PUT failed ($CODE_CHUNK)"; exit 21; }
ok_put "$CODE_MAN"   || { echo "[ERR] manifest PUT failed ($CODE_MAN)"; exit 22; }

echo "=== [fetch] GET chunk ==="
CODE_GCH="$(get "$CHUNK_URL" "$FETCH_CH")"
echo "fetch_chunk_code=$CODE_GCH url=$CHUNK_URL"
echo
ok_get "$CODE_GCH" || { echo "[ERR] chunk GET failed ($CODE_GCH)"; exit 23; }

echo "=== [verify] roundtrip ==="
python3 - <<PY
import hashlib
orig=open(r"$BIN","rb").read()
got=open(r"$FETCH_CH","rb").read()
ho=hashlib.sha256(orig).hexdigest()
hg=hashlib.sha256(got).hexdigest()
print("orig_sha256=",ho)
print("got_sha256 =",hg)
if orig!=got: raise SystemExit(9)
PY

echo
echo "dataset_root=$ROOT"
echo "leaf=$LEAF"
echo "status_code=$CODE_STATUS"
echo "publish_chunk=PUT $CHUNK_URL ($CODE_CHUNK)"
echo "publish_manifest=PUT $MAN_URL ($CODE_MAN)"
echo "fetch_chunk=GET $CHUNK_URL ($CODE_GCH)"
echo "=== [done] datanet smoke OK ==="
