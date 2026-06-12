#!/usr/bin/env bash
set -euo pipefail

STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/public-node-local-data-drop-demo003-folder-fixture-$STAMP}"
FIXTURE_DIR="$OUT/demo003-folder-fixture"
FILES_DIR="$FIXTURE_DIR/files"
TARBALL="$OUT/demo003-folder-fixture.tar.gz"

mkdir -p "$FILES_DIR"

cat > "$FILES_DIR/README.txt" <<'EOF'
VOID Public Node Local Data Drop Demo 003

This is a folder-style local data-drop fixture.
It proves a multi-file payload can be packaged with per-file hashes,
a manifest, trust boundaries, and safety boundaries before public serving.
EOF

cat > "$FILES_DIR/index.html" <<'EOF'
<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>VOID Demo 003 Folder Fixture</title>
  </head>
  <body>
    <h1>VOID Demo 003</h1>
    <p>Folder-style local data-drop fixture.</p>
  </body>
</html>
EOF

cat > "$FILES_DIR/metadata.json" <<'EOF'
{
  "name": "VOID Demo 003 Folder Fixture",
  "purpose": "folder-style local data-drop proof fixture",
  "public_routes_only": true,
  "read_only": true,
  "mutation": false,
  "money_movement": false,
  "wallet_send": false,
  "validator_mutation": false,
  "trusted_as_network_truth": false
}
EOF

node - "$FIXTURE_DIR" <<'NODE'
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const fixtureDir = process.argv[2];
const filesDir = path.join(fixtureDir, "files");

function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

const files = fs.readdirSync(filesDir).sort().map((name) => {
  const p = path.join(filesDir, name);
  const data = fs.readFileSync(p);
  return {
    path: `files/${name}`,
    sizeBytes: data.length,
    sha256: sha256(data)
  };
});

const manifest = {
  marker: "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_FIXTURE_MANIFEST_V1",
  fixture_marker: "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_FIXTURE_V1",
  object_set_id: "demo003-folder-fixture-v1",
  created_at_utc: new Date().toISOString(),
  file_count: files.length,
  files,
  trust_boundary: {
    offline_verified: true,
    network_fetch: false,
    network_fetch_during_import: false,
    trusted_as_network_truth: false
  },
  safety_boundary: {
    public_routes_only: true,
    read_only: true,
    mutation: false,
    money_movement: false,
    wallet_send: false,
    validator_mutation: false
  }
};

fs.writeFileSync(
  path.join(fixtureDir, "manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n"
);
NODE

CHECKSUM_TMP="$OUT/sha256sums.txt.tmp"
(
  cd "$FIXTURE_DIR"
  find . -type f ! -name 'sha256sums.txt' -print0 | sort -z | xargs -0 sha256sum > "$CHECKSUM_TMP"
)
mv "$CHECKSUM_TMP" "$FIXTURE_DIR/sha256sums.txt"

tar -C "$OUT" -czf "$TARBALL" demo003-folder-fixture

echo "=== VOID Public Node Demo 003 Folder Fixture v1 ==="
echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_FIXTURE_V1"
echo "out=$OUT"
echo "fixture_dir=$FIXTURE_DIR"
echo "tarball=$TARBALL"
echo "manifest=$FIXTURE_DIR/manifest.json"
echo "sha256sums=$FIXTURE_DIR/sha256sums.txt"
echo "object_set_id=demo003-folder-fixture-v1"
echo "file_count=3"
echo "offline_verified=true"
echo "network_fetch=false"
echo "network_fetch_during_import=false"
echo "trusted_as_network_truth=false"
echo "public_routes_only=true"
echo "read_only=true"
echo "mutation=false"
echo "money_movement=false"
echo "wallet_send=false"
echo "validator_mutation=false"
echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_FIXTURE_V1_GREEN"
