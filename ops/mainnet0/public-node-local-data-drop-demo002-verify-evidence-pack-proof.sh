#!/usr/bin/env bash
set -euo pipefail

PACK="ops/mainnet0/public-node-local-data-drop-demo002-evidence-pack.sh"
VERIFY="ops/mainnet0/public-node-local-data-drop-demo002-verify-evidence-pack.sh"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-local-data-drop-demo002-verify-evidence-pack-proof-$STAMP"

mkdir -p "$OUT/data"

echo "=== VOID Public Node Demo 002 Verify Evidence Pack Proof v1 ==="
echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_VERIFY_EVIDENCE_PACK_PROOF_V1"
echo "head=$(git rev-parse --short=8 HEAD)"
echo "out=$OUT"
echo "no_source_mutation=true"

test -x "$PACK"
test -x "$VERIFY"
bash -n "$PACK"
bash -n "$VERIFY"

PUBLIC_NODE_BASE="${BASE:-http://127.0.0.1:4100}" \
DATA_DIR="$OUT/data" \
OUT="$OUT/pack-run" \
  "$PACK" | tee "$OUT/pack.log"

TARBALL="$(grep '^tarball=' "$OUT/pack.log" | tail -n 1 | cut -d= -f2-)"
test -f "$TARBALL"

OUT="$OUT/verify-valid" "$VERIFY" "$TARBALL" | tee "$OUT/verify-valid.log"

grep -q "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_VERIFY_EVIDENCE_PACK_V1_GREEN" "$OUT/verify-valid.log"
grep -q "manifest_verified=true" "$OUT/verify-valid.log"
grep -q "checksums_verified=true" "$OUT/verify-valid.log"
grep -q "receipt_verified=true" "$OUT/verify-valid.log"
grep -q "latest_verified=true" "$OUT/verify-valid.log"
grep -q "logs_verified=true" "$OUT/verify-valid.log"
grep -q "network_fetch=false" "$OUT/verify-valid.log"
grep -q "trusted_as_network_truth=false" "$OUT/verify-valid.log"

BAD_DIR="$OUT/bad-pack"
mkdir -p "$BAD_DIR/extract"
tar -xzf "$TARBALL" -C "$BAD_DIR/extract"

node - "$BAD_DIR/extract/demo002-evidence-pack/runtime/latest.json" <<'NODE'
const fs = require("fs");
const p = process.argv[2];
const j = JSON.parse(fs.readFileSync(p, "utf8"));
j.trusted_as_network_truth = true;
fs.writeFileSync(p, JSON.stringify(j, null, 2) + "\n");
NODE

tar -C "$BAD_DIR/extract" -czf "$BAD_DIR/bad-demo002-evidence-pack.tar.gz" demo002-evidence-pack

set +e
OUT="$OUT/verify-bad" "$VERIFY" "$BAD_DIR/bad-demo002-evidence-pack.tar.gz" > "$OUT/verify-bad.log" 2>&1
BAD_RC=$?
set -e

if [ "$BAD_RC" -eq 0 ]; then
  echo "bad_pack_unexpectedly_verified=true"
  cat "$OUT/verify-bad.log"
  exit 1
fi

grep -Eq "FAILED|fail|not network truth|checksum" "$OUT/verify-bad.log"

if git diff --name-only -- src/index.ts | grep -q .; then
  echo "unexpected_source_diff=true"
  exit 1
fi

echo "valid_pack_verified=true"
echo "bad_pack_rejected=true"
echo "offline_verify_verified=true"
echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_VERIFY_EVIDENCE_PACK_PROOF_V1_GREEN"
