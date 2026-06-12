#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "usage: $0 /path/to/demo003-folder-fixture.tar.gz" >&2
  exit 2
fi

TARBALL="$1"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/public-node-local-data-drop-demo003-verify-folder-fixture-$STAMP}"
EXTRACT="$OUT/extract"
FIXTURE_DIR="$EXTRACT/demo003-folder-fixture"

echo "=== VOID Public Node Demo 003 Verify Folder Fixture v1 ==="
echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_VERIFY_FOLDER_FIXTURE_V1"
echo "tarball=$TARBALL"
echo "out=$OUT"
echo "offline_verify=true"
echo "network_fetch=false"

test -f "$TARBALL"
mkdir -p "$EXTRACT"

tar -tzf "$TARBALL" >/dev/null
tar -xzf "$TARBALL" -C "$EXTRACT"

test -d "$FIXTURE_DIR"
test -f "$FIXTURE_DIR/manifest.json"
test -f "$FIXTURE_DIR/sha256sums.txt"
test -f "$FIXTURE_DIR/files/README.txt"
test -f "$FIXTURE_DIR/files/index.html"
test -f "$FIXTURE_DIR/files/metadata.json"

(
  cd "$FIXTURE_DIR"
  sha256sum -c sha256sums.txt
) | tee "$OUT/sha256-check.log"

node - "$FIXTURE_DIR" <<'NODE'
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const fixtureDir = process.argv[2];

function ok(x, msg) {
  if (!x) {
    console.error("[fail]", msg);
    process.exit(1);
  }
}

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(fixtureDir, rel), "utf8"));
}

function sha256File(rel) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(fixtureDir, rel))).digest("hex");
}

const manifest = readJson("manifest.json");
const metadata = readJson("files/metadata.json");

ok(manifest.marker === "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_FIXTURE_MANIFEST_V1", "manifest marker");
ok(manifest.fixture_marker === "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_FIXTURE_V1", "fixture marker");
ok(manifest.object_set_id === "demo003-folder-fixture-v1", "object set id");
ok(manifest.file_count === 3, "file count");
ok(Array.isArray(manifest.files) && manifest.files.length === 3, "files array");

const expected = new Set(["files/README.txt", "files/index.html", "files/metadata.json"]);
for (const f of manifest.files) {
  ok(expected.has(f.path), `unexpected file ${f.path}`);
  ok(f.sha256 === sha256File(f.path), `sha mismatch ${f.path}`);
  ok(f.sizeBytes === fs.statSync(path.join(fixtureDir, f.path)).size, `size mismatch ${f.path}`);
}

ok(manifest.trust_boundary.offline_verified === true, "offline verified");
ok(manifest.trust_boundary.network_fetch === false, "network fetch false");
ok(manifest.trust_boundary.network_fetch_during_import === false, "network fetch during import false");
ok(manifest.trust_boundary.trusted_as_network_truth === false, "not network truth");

ok(manifest.safety_boundary.public_routes_only === true, "public routes only");
ok(manifest.safety_boundary.read_only === true, "read only");
ok(manifest.safety_boundary.mutation === false, "no mutation");
ok(manifest.safety_boundary.money_movement === false, "no money movement");
ok(manifest.safety_boundary.wallet_send === false, "no wallet send");
ok(manifest.safety_boundary.validator_mutation === false, "no validator mutation");

ok(metadata.public_routes_only === true, "metadata public routes only");
ok(metadata.read_only === true, "metadata read only");
ok(metadata.mutation === false, "metadata no mutation");
ok(metadata.money_movement === false, "metadata no money movement");
ok(metadata.wallet_send === false, "metadata no wallet send");
ok(metadata.validator_mutation === false, "metadata no validator mutation");
ok(metadata.trusted_as_network_truth === false, "metadata not network truth");

console.log("[ok] Demo 003 folder fixture offline verified");
NODE

echo "fixture_dir=$FIXTURE_DIR"
echo "manifest_verified=true"
echo "checksums_verified=true"
echo "files_verified=true"
echo "metadata_verified=true"
echo "offline_verified=true"
echo "network_fetch=false"
echo "trusted_as_network_truth=false"
echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_VERIFY_FOLDER_FIXTURE_V1_GREEN"
