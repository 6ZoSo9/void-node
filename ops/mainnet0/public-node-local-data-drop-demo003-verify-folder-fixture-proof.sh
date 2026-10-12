#!/usr/bin/env bash
set -euo pipefail

FIXTURE="ops/mainnet0/public-node-local-data-drop-demo003-folder-fixture.sh"
VERIFY="ops/mainnet0/public-node-local-data-drop-demo003-verify-folder-fixture.sh"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-local-data-drop-demo003-verify-folder-fixture-proof-$STAMP"

mkdir -p "$OUT"

echo "=== VOID Public Node Demo 003 Verify Folder Fixture Proof v1 ==="
echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_VERIFY_FOLDER_FIXTURE_PROOF_V1"
echo "head=$(git rev-parse --short=8 HEAD)"
echo "out=$OUT"
echo "no_source_mutation=true"

test -x "$FIXTURE"
test -x "$VERIFY"
bash -n "$FIXTURE"
bash -n "$VERIFY"

OUT="$OUT/fixture-run" "$FIXTURE" | tee "$OUT/fixture.log"

TARBALL="$(grep '^tarball=' "$OUT/fixture.log" | tail -n 1 | cut -d= -f2-)"
test -f "$TARBALL"

OUT="$OUT/verify-valid" "$VERIFY" "$TARBALL" | tee "$OUT/verify-valid.log"

grep -q "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_VERIFY_FOLDER_FIXTURE_V1_GREEN" "$OUT/verify-valid.log"
grep -q "manifest_verified=true" "$OUT/verify-valid.log"
grep -q "checksums_verified=true" "$OUT/verify-valid.log"
grep -q "files_verified=true" "$OUT/verify-valid.log"
grep -q "metadata_verified=true" "$OUT/verify-valid.log"
grep -q "offline_verified=true" "$OUT/verify-valid.log"
grep -q "network_fetch=false" "$OUT/verify-valid.log"
grep -q "trusted_as_network_truth=false" "$OUT/verify-valid.log"

BAD_DIR="$OUT/bad-fixture"
mkdir -p "$BAD_DIR/extract"
tar -xzf "$TARBALL" -C "$BAD_DIR/extract"

node - "$BAD_DIR/extract/demo003-folder-fixture/files/metadata.json" <<'NODE'
const fs = require("fs");
const p = process.argv[2];
const j = JSON.parse(fs.readFileSync(p, "utf8"));
j.trusted_as_network_truth = true;
fs.writeFileSync(p, JSON.stringify(j, null, 2) + "\n");
NODE

tar -C "$BAD_DIR/extract" -czf "$BAD_DIR/bad-demo003-folder-fixture.tar.gz" demo003-folder-fixture

set +e
OUT="$OUT/verify-bad" "$VERIFY" "$BAD_DIR/bad-demo003-folder-fixture.tar.gz" > "$OUT/verify-bad.log" 2>&1
BAD_RC=$?
set -e

if [ "$BAD_RC" -eq 0 ]; then
  echo "bad_fixture_unexpectedly_verified=true"
  cat "$OUT/verify-bad.log"
  exit 1
fi

grep -Eq "FAILED|fail|trusted_as_network_truth|sha mismatch|checksum" "$OUT/verify-bad.log"

if git diff --name-only -- src/index.ts | grep -q .; then
  echo "unexpected_source_diff=true"
  exit 1
fi

echo "valid_folder_fixture_verified=true"
echo "bad_folder_fixture_rejected=true"
echo "offline_verify_verified=true"
echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_VERIFY_FOLDER_FIXTURE_PROOF_V1_GREEN"
