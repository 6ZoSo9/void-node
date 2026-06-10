#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

PORT="${RUN_PORT:-4150}"
BASE="http://127.0.0.1:$PORT"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-local-data-drop-import-dir-v1-proof-$STAMP"
SRC_DIR="$OUT/src"
DATA_ROOT="$OUT/data"

mkdir -p "$SRC_DIR/nested" "$DATA_ROOT"

echo "=== Public Node Local Data Drop Import Directory v1 proof ==="
echo "out=$OUT"

bash -n ops/mainnet0/public-node-local-data-drop-import.sh
bash -n ops/mainnet0/public-node-local-data-drop-import-dir.sh
bash -n ops/mainnet0/public-node-local-data-drop-verify-object.sh
bash -n ops/mainnet0/public-node-local-data-drop-verify-manifest.sh

printf 'VOID import directory alpha fixture v1\n' > "$SRC_DIR/alpha.txt"
printf 'VOID import directory beta fixture v1\n' > "$SRC_DIR/beta.txt"
printf '{"marker":"VOID_IMPORT_DIRECTORY_GAMMA_FIXTURE_V1","n":3}\n' > "$SRC_DIR/nested/gamma.json"

DATA_DIR="$DATA_ROOT" ops/mainnet0/public-node-local-data-drop-import-dir.sh "$SRC_DIR" > "$OUT/import-dir.log"

grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_DIR_V1_IMPORTED" "$OUT/import-dir.log"
grep -Fq "imported_count=3" "$OUT/import-dir.log"
grep -Fq "imported_object_id=alpha.txt" "$OUT/import-dir.log"
grep -Fq "imported_object_id=beta.txt" "$OUT/import-dir.log"
grep -Fq "imported_object_id=nested__gamma.json" "$OUT/import-dir.log"

npm run build >/dev/null

openssl genpkey -algorithm ED25519 -out "$OUT/nodeA.key" >/dev/null 2>&1 || openssl genrsa -out "$OUT/nodeA.key" 2048 >/dev/null 2>&1
chmod 600 "$OUT/nodeA.key"
test -s "$OUT/nodeA.key"

PIDS="$(lsof -tiTCP:${PORT} -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$PIDS" ]; then kill $PIDS 2>/dev/null || true; sleep 1; fi

(
  export DATA_DIR="$DATA_ROOT"
  export P2P_PORT=4750
  export NODE_PRIVKEY_PATH="$OUT/nodeA.key"
  export PORT="$PORT"
  export HTTP_PORT="$PORT"
  export VOID_HTTP_PORT="$PORT"
  export HOST=127.0.0.1
  export PUBLIC_NODE_EXTERNAL_BASE_URL="$BASE"
  npm start
) > "$OUT/server.log" 2>&1 &

PID="$!"
trap 'kill "$PID" 2>/dev/null || true' EXIT

for i in $(seq 1 100); do
  if curl --max-time 10 -fsS "$BASE/public-node/local-data-drop.json" > "$OUT/local-data-drop.json" 2>/dev/null; then
    echo "[ok] npm start server live"
    break
  fi
  sleep 0.25
done

curl --max-time 10 -fsS "$BASE/public-node/local-data-drop.json" > "$OUT/local-data-drop.json"
curl --max-time 10 -fsS "$BASE/public-node/local-data-drop/manifest.json" > "$OUT/local-data-drop-manifest.json"

ops/mainnet0/public-node-local-data-drop-verify-manifest.sh "$BASE" "$OUT/client-manifest-verify" > "$OUT/client-manifest-verify.log"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_VERIFY_MANIFEST_V1_GREEN" "$OUT/client-manifest-verify.log"
grep -Fq "object_verifier_chain_green=true" "$OUT/client-manifest-verify.log"

node - "$OUT/local-data-drop.json" "$OUT/local-data-drop-manifest.json" "$SRC_DIR" "$BASE" <<'NODE'
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const index = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const manifest = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const src = process.argv[4];
const base = process.argv[5];

function ok(x, m) {
  if (!x) {
    console.error("[fail]", m);
    process.exit(1);
  }
}

function sha(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

const expected = [
  { object_id: "alpha.txt", file: path.join(src, "alpha.txt") },
  { object_id: "beta.txt", file: path.join(src, "beta.txt") },
  { object_id: "nested__gamma.json", file: path.join(src, "nested", "gamma.json") },
].map(x => ({ ...x, sha256: sha(x.file) }));

ok(index.marker === "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_INDEX_V1", "index marker");
ok(index.object_count === 3, "index object count");
ok(index.objects.length === 3, "index objects length");
ok(index.policy.public_upload === false, "index no public upload");
ok(index.policy.operator_local_import_only === true, "index operator local only");
ok(index.policy.public_read_only === true, "index public read only");
ok(index.policy.trusted_as_network_truth === false, "index not network truth");

ok(manifest.marker === "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_MANIFEST_V1", "manifest marker");
ok(manifest.manifest_root_marker === "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_MANIFEST_ROOT_V1", "manifest root marker");
ok(manifest.object_count === 3, "manifest object count");
ok(manifest.objects.length === 3, "manifest objects length");
ok(manifest.policy.public_upload === false, "manifest no public upload");
ok(manifest.policy.operator_local_import_only === true, "manifest operator local only");
ok(manifest.policy.public_read_only === true, "manifest public read only");
ok(manifest.policy.trusted_as_network_truth === false, "manifest not network truth");

for (const e of expected) {
  const idxObj = index.objects.find(o => o.object_id === e.object_id);
  const manObj = manifest.objects.find(o => o.object_id === e.object_id);
  ok(idxObj, `index has ${e.object_id}`);
  ok(manObj, `manifest has ${e.object_id}`);
  ok(idxObj.sha256 === e.sha256, `index sha ${e.object_id}`);
  ok(manObj.sha256 === e.sha256, `manifest sha ${e.object_id}`);
  ok(idxObj.href_by_sha256 === `${base}/public-node/local-data-drop/by-sha256/${e.sha256}`, `index content href ${e.object_id}`);
  ok(idxObj.proof_href === `${base}/public-node/local-data-drop/proof/${e.sha256}.json`, `index proof href ${e.object_id}`);
  ok(manObj.proof_href === `${base}/public-node/local-data-drop/proof/${e.sha256}.json`, `manifest proof href ${e.object_id}`);
  ok(idxObj.receipt_valid_for_current_object === true, `index receipt valid ${e.object_id}`);
  ok(manObj.receipt_valid_for_current_object === true, `manifest receipt valid ${e.object_id}`);
}

const recomputedRoot = crypto.createHash("sha256").update(JSON.stringify(manifest.root_payload)).digest("hex");
ok(recomputedRoot === manifest.manifest_root_sha256, "manifest root recomputes");
NODE

echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_DIR_PROOF_V1"
echo "import_dir_marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_DIR_V1"
echo "route=/public-node/local-data-drop.json"
echo "manifest_route=/public-node/local-data-drop/manifest.json"
echo "object_count=3"
echo "object_id=alpha.txt"
echo "object_id_2=beta.txt"
echo "object_id_3=nested__gamma.json"
echo "directory_import_green=true"
echo "manifest_root_verified=true"
echo "client_verify_manifest_green=true"
echo "object_verifier_chain_green=true"
echo "public_upload=false"
echo "operator_local_import_only=true"
echo "public_read_only=true"
echo "read_only=true"
echo "trusted_as_network_truth=false"
echo "out=$OUT"
echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_DIR_V1_GREEN"
