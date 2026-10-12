#!/usr/bin/env bash
set -euo pipefail

IMPORT="ops/mainnet0/public-node-local-data-drop-demo002-import-smoke-receipt.sh"
VERIFY="ops/mainnet0/public-node-local-data-drop-demo002-verify-smoke-receipt.sh"
SMOKE="ops/mainnet0/public-node-local-data-drop-demo002-tester-smoke.sh"
SHA="264e0d3832fbad60f3a5bd574794148a0db313583717c4b6bedb94e7db75e871"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-local-data-drop-demo002-smoke-receipt-intake-proof-$STAMP"

mkdir -p "$OUT/data"

echo "=== VOID Public Node Demo 002 Smoke Receipt Intake Proof v1 ==="
echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_SMOKE_RECEIPT_INTAKE_PROOF_V1"
echo "head=$(git rev-parse --short=8 HEAD)"
echo "out=$OUT"
echo "no_source_mutation=true"

test -x "$IMPORT"
test -x "$VERIFY"
test -x "$SMOKE"
bash -n "$IMPORT"
bash -n "$VERIFY"
bash -n "$SMOKE"

PUBLIC_NODE_BASE="${BASE:-http://127.0.0.1:4100}" OUT="$OUT/smoke-run" "$SMOKE" | tee "$OUT/smoke.log"
RECEIPT="$(grep '^receipt=' "$OUT/smoke.log" | tail -n 1 | cut -d= -f2-)"
test -f "$RECEIPT"

DATA_DIR="$OUT/data" "$IMPORT" "$RECEIPT" | tee "$OUT/import-good.log"

grep -q "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_SMOKE_RECEIPT_INTAKE_V1_IMPORTED" "$OUT/import-good.log"
grep -q "offline_verified=true" "$OUT/import-good.log"
grep -q "network_fetch_during_import=false" "$OUT/import-good.log"
grep -q "trusted_as_network_truth=false" "$OUT/import-good.log"

LATEST="$OUT/data/public-node/local-data-drop-demo002-tester-receipts/latest.json"
test -f "$LATEST"
test "$(find "$OUT/data/public-node/local-data-drop-demo002-tester-receipts/archive" -type f -name 'demo002-tester-smoke-receipt-*.json' | wc -l)" -ge 1

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
ok(latest.source_receipt_marker === "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_TESTER_SMOKE_RECEIPT_V1", "source receipt marker");
ok(latest.source_smoke_marker === "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_TESTER_SMOKE_V1", "source smoke marker");
ok(latest.offline_verified === true, "offline verified");
ok(latest.network_fetch_during_import === false, "no network fetch during import");
ok(latest.trusted_as_network_truth === false, "not network truth");
ok(latest.sha256_expected === sha, "expected sha");
ok(latest.object_by_id_sha256 === sha, "id sha");
ok(latest.object_by_sha256_sha256 === sha, "by sha");
ok(latest.objects_match === true, "objects match");
ok(latest.proof_json_verified === true, "proof json");
ok(typeof latest.source_receipt_sha256 === "string" && latest.source_receipt_sha256.length === 64, "source receipt sha");
console.log("[ok] latest intake json verified");
NODE

node - "$RECEIPT" "$OUT/bad-receipt.json" <<'NODE'
const fs = require("fs");
const bad = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
bad.object_by_sha256_sha256 = "bad";
fs.writeFileSync(process.argv[3], JSON.stringify(bad, null, 2) + "\n");
NODE

if DATA_DIR="$OUT/data" "$IMPORT" "$OUT/bad-receipt.json" > "$OUT/import-bad.log" 2>&1; then
  echo "[fail] bad receipt imported unexpectedly" >&2
  exit 1
fi

if git diff --name-only -- src/index.ts | grep -q .; then
  echo "unexpected_source_diff=true"
  exit 1
fi

echo "valid_receipt_imported=true"
echo "bad_receipt_rejected=true"
echo "archive_written=true"
echo "latest_written=true"
echo "offline_verified=true"
echo "network_fetch_during_import=false"
echo "trusted_as_network_truth=false"
echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_SMOKE_RECEIPT_INTAKE_PROOF_V1_GREEN"
