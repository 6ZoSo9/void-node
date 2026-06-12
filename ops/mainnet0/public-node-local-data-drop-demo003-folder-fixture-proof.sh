#!/usr/bin/env bash
set -euo pipefail

SCRIPT="ops/mainnet0/public-node-local-data-drop-demo003-folder-fixture.sh"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-local-data-drop-demo003-folder-fixture-proof-$STAMP"

mkdir -p "$OUT"

echo "=== VOID Public Node Demo 003 Folder Fixture Proof v1 ==="
echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_FIXTURE_PROOF_V1"
echo "head=$(git rev-parse --short=8 HEAD)"
echo "out=$OUT"
echo "no_source_mutation=true"

test -x "$SCRIPT"
bash -n "$SCRIPT"

OUT="$OUT/run" "$SCRIPT" | tee "$OUT/fixture.log"

FIXTURE_DIR="$(grep '^fixture_dir=' "$OUT/fixture.log" | tail -n 1 | cut -d= -f2-)"
TARBALL="$(grep '^tarball=' "$OUT/fixture.log" | tail -n 1 | cut -d= -f2-)"
MANIFEST="$(grep '^manifest=' "$OUT/fixture.log" | tail -n 1 | cut -d= -f2-)"
SUMS="$(grep '^sha256sums=' "$OUT/fixture.log" | tail -n 1 | cut -d= -f2-)"

test -d "$FIXTURE_DIR"
test -f "$TARBALL"
test -f "$MANIFEST"
test -f "$SUMS"
test -f "$FIXTURE_DIR/files/README.txt"
test -f "$FIXTURE_DIR/files/index.html"
test -f "$FIXTURE_DIR/files/metadata.json"

grep -q "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_FIXTURE_V1_GREEN" "$OUT/fixture.log"
grep -q "offline_verified=true" "$OUT/fixture.log"
grep -q "network_fetch=false" "$OUT/fixture.log"
grep -q "network_fetch_during_import=false" "$OUT/fixture.log"
grep -q "trusted_as_network_truth=false" "$OUT/fixture.log"
grep -q "mutation=false" "$OUT/fixture.log"
grep -q "money_movement=false" "$OUT/fixture.log"
grep -q "wallet_send=false" "$OUT/fixture.log"
grep -q "validator_mutation=false" "$OUT/fixture.log"

(
  cd "$FIXTURE_DIR"
  sha256sum -c sha256sums.txt
) | tee "$OUT/sha256-check.log"

tar -tzf "$TARBALL" | tee "$OUT/tar-list.log"
grep -q "demo003-folder-fixture/manifest.json" "$OUT/tar-list.log"
grep -q "demo003-folder-fixture/sha256sums.txt" "$OUT/tar-list.log"
grep -q "demo003-folder-fixture/files/README.txt" "$OUT/tar-list.log"
grep -q "demo003-folder-fixture/files/index.html" "$OUT/tar-list.log"
grep -q "demo003-folder-fixture/files/metadata.json" "$OUT/tar-list.log"

node - "$FIXTURE_DIR" <<'NODE'
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const fixtureDir = process.argv[2];
const manifest = JSON.parse(fs.readFileSync(path.join(fixtureDir, "manifest.json"), "utf8"));

function ok(x, msg) {
  if (!x) {
    console.error("[fail]", msg);
    process.exit(1);
  }
}

function sha256File(rel) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(fixtureDir, rel))).digest("hex");
}

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

console.log("[ok] Demo 003 folder fixture manifest verified");
NODE

if git diff --name-only -- src/index.ts | grep -q .; then
  echo "unexpected_source_diff=true"
  exit 1
fi

echo "demo003_folder_fixture_manifest_verified=true"
echo "demo003_folder_fixture_checksums_verified=true"
echo "demo003_folder_fixture_tarball_verified=true"
echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_FIXTURE_PROOF_V1_GREEN"
