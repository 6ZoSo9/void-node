#!/usr/bin/env bash
set -euo pipefail

ROUNDTRIP="ops/mainnet0/public-node-local-data-drop-demo002-evidence-roundtrip.sh"
STATUS="ops/mainnet0/public-node-local-data-drop-demo002-receipt-intake-status.sh"
SHA="264e0d3832fbad60f3a5bd574794148a0db313583717c4b6bedb94e7db75e871"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-local-data-drop-demo002-evidence-roundtrip-proof-$STAMP"

mkdir -p "$OUT/data"

echo "=== VOID Public Node Demo 002 Evidence Roundtrip Proof v1 ==="
echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_EVIDENCE_ROUNDTRIP_PROOF_V1"
echo "head=$(git rev-parse --short=8 HEAD)"
echo "out=$OUT"
echo "no_source_mutation=true"

test -x "$ROUNDTRIP"
test -x "$STATUS"
bash -n "$ROUNDTRIP"
bash -n "$STATUS"

PUBLIC_NODE_BASE="${BASE:-http://127.0.0.1:4100}" \
DATA_DIR="$OUT/data" \
OUT="$OUT/roundtrip" \
  "$ROUNDTRIP" | tee "$OUT/roundtrip.log"

grep -q "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_EVIDENCE_ROUNDTRIP_V1_GREEN" "$OUT/roundtrip.log"
grep -q "offline_verified=true" "$OUT/roundtrip.log"
grep -q "network_fetch_during_import=false" "$OUT/roundtrip.log"
grep -q "trusted_as_network_truth=false" "$OUT/roundtrip.log"

LATEST="$OUT/data/public-node/local-data-drop-demo002-tester-receipts/latest.json"
test -f "$LATEST"

DATA_DIR="$OUT/data" "$STATUS" | tee "$OUT/status-final.log"
grep -q "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_RECEIPT_INTAKE_STATUS_V1_GREEN=true" "$OUT/status-final.log"
grep -q "archive_count=1" "$OUT/status-final.log"
grep -q "$SHA" "$OUT/status-final.log"

node - "$LATEST" "$SHA" <<'NODE'
const fs = require("fs");
const latest = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const sha = process.argv[3];
function ok(x, msg) {
  if (!x) {
    console.error("[fail]", msg);
    process.exit(1);
  }
}
ok(latest.marker === "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_SMOKE_RECEIPT_INTAKE_V1", "intake marker");
ok(latest.sha256_expected === sha, "sha expected");
ok(latest.object_by_id_sha256 === sha, "sha id");
ok(latest.object_by_sha256_sha256 === sha, "sha by-sha");
ok(latest.offline_verified === true, "offline verified");
ok(latest.network_fetch_during_import === false, "no import fetch");
ok(latest.trusted_as_network_truth === false, "not network truth");
console.log("[ok] roundtrip latest intake verified");
NODE

if git diff --name-only -- src/index.ts | grep -q .; then
  echo "unexpected_source_diff=true"
  exit 1
fi

echo "roundtrip_smoke_verified=true"
echo "roundtrip_offline_verify_verified=true"
echo "roundtrip_import_verified=true"
echo "roundtrip_status_verified=true"
echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_EVIDENCE_ROUNDTRIP_PROOF_V1_GREEN"
