#!/usr/bin/env bash
set -euo pipefail

RUN_PORT="${RUN_PORT:-4145}"
BASE="${BASE:-http://127.0.0.1:${RUN_PORT}}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-tester-result-import-helper-v1-proof-$STAMP"
mkdir -p "$OUT/data"

openssl genpkey -algorithm ED25519 -out "$OUT/nodeA.key" >/dev/null 2>&1
chmod 600 "$OUT/nodeA.key"

echo "=== Public Node Tester Result Import Helper v1 proof ==="
echo "out=$OUT"

bash -n ops/mainnet0/public-node-import-tester-result.sh
bash -n ops/mainnet0/public-node-tester-result-intake-proof.sh

grep -Fq "VOID_PUBLIC_NODE_TESTER_RESULT_IMPORT_HELPER_V1_IMPORTED" ops/mainnet0/public-node-import-tester-result.sh
grep -Fq "VOID_PUBLIC_NODE_TESTER_RESULT_IMPORT_HELPER_DOC_V1" docs/public/public-node-tester-result-import-helper.md
grep -Fq "VOID_PUBLIC_NODE_TESTER_RESULT_INTAKE_V1" src/index.ts

cat > "$OUT/valid-receipt.json" <<JSON
{
  "marker": "VOID_PUBLIC_NODE_TESTER_RESULT_RECEIPT_V1",
  "tester_label": "proof-fixture-outside-tester",
  "tested_base_url": "$BASE",
  "observed_green_marker": "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN",
  "result": "green"
}
JSON

cat > "$OUT/bad-receipt.json" <<JSON
{
  "marker": "BAD_RECEIPT",
  "observed_green_marker": "BAD_GREEN",
  "result": "red"
}
JSON

DATA_DIR="$OUT/data" ops/mainnet0/public-node-import-tester-result.sh "$OUT/valid-receipt.json" > "$OUT/import-valid.log"

if DATA_DIR="$OUT/data" ops/mainnet0/public-node-import-tester-result.sh "$OUT/bad-receipt.json" > "$OUT/import-bad.log" 2>&1; then
  echo "[fail] bad receipt imported unexpectedly" >&2
  exit 1
fi

grep -Fq "VOID_PUBLIC_NODE_TESTER_RESULT_IMPORT_HELPER_V1_IMPORTED" "$OUT/import-valid.log"
grep -Fq "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN" "$OUT/data/public-node/tester-result-intake/latest.json"
grep -Fq '"trusted_as_network_truth": false' "$OUT/data/public-node/tester-result-intake/latest.json"
test "$(find "$OUT/data/public-node/tester-result-intake/archive" -type f -name 'tester-result-*.json' | wc -l)" -ge 1

npm run build
echo "[ok] source/build/import-helper"

PIDS="$(lsof -tiTCP:${RUN_PORT} -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$PIDS" ]; then kill $PIDS 2>/dev/null || true; sleep 1; fi

(
  export DATA_DIR="$OUT/data"
  export P2P_PORT=4745
  export NODE_PRIVKEY_PATH="$OUT/nodeA.key"
  export PORT="${RUN_PORT}"
  export HTTP_PORT="${RUN_PORT}"
  export VOID_HTTP_PORT="${RUN_PORT}"
  export HOST=127.0.0.1
  export PUBLIC_NODE_EXTERNAL_BASE_URL="$BASE"
  npm start
) > "$OUT/server.log" 2>&1 &

PID="$!"
trap 'kill "$PID" 2>/dev/null || true' EXIT

for i in $(seq 1 100); do
  if curl --max-time 10 -fsS "$BASE/public-node/tester-result-intake.json" > "$OUT/tester-result-intake.json" 2>/dev/null; then
    echo "[ok] npm start server live"
    break
  fi
  sleep 0.25
done

node - "$OUT/tester-result-intake.json" <<'NODE'
const fs = require("fs");
const intake = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));

function ok(x, msg) {
  if (!x) {
    console.error("[fail]", msg);
    process.exit(1);
  }
}

ok(intake.marker === "VOID_PUBLIC_NODE_TESTER_RESULT_INTAKE_V1", "intake marker");
ok(intake.status === "external_tester_result_imported", "imported status");
ok(intake.intake.latest_imported === true, "latest imported");
ok(intake.intake.latest_result.intake_marker === "VOID_PUBLIC_NODE_TESTER_RESULT_IMPORT_HELPER_V1", "import helper marker");
ok(intake.intake.latest_result.observed_green_marker === "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN", "observed green marker");
ok(intake.intake.latest_result.trusted_as_network_truth === false, "not network truth");
ok(intake.policy.public_post_endpoint === false, "no public post");
ok(intake.policy.operator_local_import_only === true, "operator local only");
ok(intake.policy.trusted_as_network_truth === false, "policy not network truth");

console.log("[ok] imported result visible through intake route");
NODE

echo "marker=VOID_PUBLIC_NODE_TESTER_RESULT_IMPORT_HELPER_V1"
echo "script=ops/mainnet0/public-node-import-tester-result.sh"
echo "doc=docs/public/public-node-tester-result-import-helper.md"
echo "intake_route=/public-node/tester-result-intake.json"
echo "valid_receipt_imported=true"
echo "bad_receipt_rejected=true"
echo "archive_written=true"
echo "latest_visible=true"
echo "public_post_endpoint=false"
echo "operator_local_import_only=true"
echo "trusted_as_network_truth=false"
echo "out=$OUT"
echo "VOID_PUBLIC_NODE_TESTER_RESULT_IMPORT_HELPER_V1_GREEN"
