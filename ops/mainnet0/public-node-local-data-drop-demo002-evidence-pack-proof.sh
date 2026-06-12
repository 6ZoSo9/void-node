#!/usr/bin/env bash
set -euo pipefail

PACK="ops/mainnet0/public-node-local-data-drop-demo002-evidence-pack.sh"
SHA="264e0d3832fbad60f3a5bd574794148a0db313583717c4b6bedb94e7db75e871"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-local-data-drop-demo002-evidence-pack-proof-$STAMP"

mkdir -p "$OUT/data"

echo "=== VOID Public Node Demo 002 Evidence Pack Proof v1 ==="
echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_EVIDENCE_PACK_PROOF_V1"
echo "head=$(git rev-parse --short=8 HEAD)"
echo "out=$OUT"
echo "no_source_mutation=true"

test -x "$PACK"
bash -n "$PACK"

PUBLIC_NODE_BASE="${BASE:-http://127.0.0.1:4100}" \
DATA_DIR="$OUT/data" \
OUT="$OUT/pack-run" \
  "$PACK" | tee "$OUT/pack.log"

grep -q "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_EVIDENCE_PACK_V1_GREEN" "$OUT/pack.log"
grep -q "offline_verified=true" "$OUT/pack.log"
grep -q "network_fetch_during_import=false" "$OUT/pack.log"
grep -q "trusted_as_network_truth=false" "$OUT/pack.log"

PACK_DIR="$(grep '^pack_dir=' "$OUT/pack.log" | tail -n 1 | cut -d= -f2-)"
TARBALL="$(grep '^tarball=' "$OUT/pack.log" | tail -n 1 | cut -d= -f2-)"
test -d "$PACK_DIR"
test -f "$TARBALL"
test -f "$PACK_DIR/manifest.json"
test -f "$PACK_DIR/sha256sums.txt"
test -f "$PACK_DIR/demo002-tester-smoke-receipt.json"
test -f "$PACK_DIR/runtime/latest.json"
test -f "$PACK_DIR/logs/roundtrip.log"
test -f "$PACK_DIR/logs/status.log"

grep -q "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_EVIDENCE_PACK_MANIFEST_V1" "$PACK_DIR/manifest.json"
grep -q "$SHA" "$PACK_DIR/manifest.json"
grep -q '"offline_verified": true' "$PACK_DIR/manifest.json"
grep -q '"network_fetch_during_import": false' "$PACK_DIR/manifest.json"
grep -q '"trusted_as_network_truth": false' "$PACK_DIR/manifest.json"
grep -q "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_EVIDENCE_ROUNDTRIP_V1_GREEN" "$PACK_DIR/logs/roundtrip.log"
grep -q "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_RECEIPT_INTAKE_STATUS_V1_GREEN=true" "$PACK_DIR/logs/status.log"

(
  cd "$PACK_DIR"
  sha256sum -c sha256sums.txt
) | tee "$OUT/sha256-check.log"

node - "$PACK_DIR/manifest.json" "$SHA" <<'NODE'
const fs = require("fs");
const manifest = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const sha = process.argv[3];
function ok(x, msg) {
  if (!x) {
    console.error("[fail]", msg);
    process.exit(1);
  }
}
ok(manifest.marker === "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_EVIDENCE_PACK_MANIFEST_V1", "manifest marker");
ok(manifest.object_id === "live-import-demo-002.txt", "object id");
ok(manifest.sha256_expected === sha, "sha expected");
ok(manifest.offline_verified === true, "offline verified");
ok(manifest.network_fetch_during_import === false, "no import fetch");
ok(manifest.trusted_as_network_truth === false, "not network truth");
ok(Array.isArray(manifest.files) && manifest.files.length >= 4, "files listed");
console.log("[ok] evidence pack manifest verified");
NODE

if git diff --name-only -- src/index.ts | grep -q .; then
  echo "unexpected_source_diff=true"
  exit 1
fi

echo "pack_manifest_verified=true"
echo "pack_checksums_verified=true"
echo "pack_tarball_verified=true"
echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_EVIDENCE_PACK_PROOF_V1_GREEN"
