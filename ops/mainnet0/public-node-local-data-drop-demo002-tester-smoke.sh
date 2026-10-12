#!/usr/bin/env bash
set -euo pipefail

PUBLIC_NODE_BASE="${PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"
BASE="${PUBLIC_NODE_BASE%/}"
OBJECT_ID="${OBJECT_ID:-live-import-demo-002.txt}"
SHA256_EXPECTED="${SHA256_EXPECTED:-264e0d3832fbad60f3a5bd574794148a0db313583717c4b6bedb94e7db75e871}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/public-node-local-data-drop-demo002-tester-smoke-$STAMP}"

mkdir -p "$OUT"

echo "=== VOID Public Node Local Data Drop Demo 002 Tester Smoke v1 ==="
echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_TESTER_SMOKE_V1"
echo "base=$BASE"
echo "object_id=$OBJECT_ID"
echo "sha256_expected=$SHA256_EXPECTED"
echo "out=$OUT"

curl --max-time 10 -fsS "$BASE/version" > "$OUT/version.json"
echo "ok /version"

curl --max-time 10 -fsS "$BASE/public-node/local-data-drop/$OBJECT_ID" > "$OUT/object-by-id.bin"
echo "ok /public-node/local-data-drop/$OBJECT_ID"

curl --max-time 10 -fsS "$BASE/public-node/local-data-drop/by-sha256/$SHA256_EXPECTED" > "$OUT/object-by-sha.bin"
echo "ok /public-node/local-data-drop/by-sha256/$SHA256_EXPECTED"

curl --max-time 10 -fsS "$BASE/public-node/local-data-drop/proof/$SHA256_EXPECTED.json" > "$OUT/proof.json"
echo "ok /public-node/local-data-drop/proof/$SHA256_EXPECTED.json"

ID_SHA="$(sha256sum "$OUT/object-by-id.bin" | awk '{print $1}')"
BY_SHA="$(sha256sum "$OUT/object-by-sha.bin" | awk '{print $1}')"

test "$ID_SHA" = "$SHA256_EXPECTED"
test "$BY_SHA" = "$SHA256_EXPECTED"
cmp -s "$OUT/object-by-id.bin" "$OUT/object-by-sha.bin"

node - "$OUT/proof.json" "$OBJECT_ID" "$SHA256_EXPECTED" <<'NODE'
const fs = require("fs");
const proofPath = process.argv[2];
const objectId = process.argv[3];
const sha = process.argv[4];
const proof = JSON.parse(fs.readFileSync(proofPath, "utf8"));
const body = JSON.stringify(proof);
function ok(x, msg) {
  if (!x) {
    console.error("[fail]", msg);
    process.exit(1);
  }
}
ok(body.includes(objectId), "proof includes object id");
ok(body.includes(sha), "proof includes sha256");
console.log("[ok] proof json contains object id and sha256");
NODE

OBJECT_BYTES="$(wc -c < "$OUT/object-by-id.bin" | tr -d ' ')"
PROOF_BYTES="$(wc -c < "$OUT/proof.json" | tr -d ' ')"
RECEIPT="$OUT/demo002-tester-smoke-receipt.json"

node - "$RECEIPT" "$BASE" "$OBJECT_ID" "$SHA256_EXPECTED" "$ID_SHA" "$BY_SHA" "$OBJECT_BYTES" "$PROOF_BYTES" <<'NODE'
const fs = require("fs");
const [receiptPath, base, objectId, expectedSha, idSha, bySha, objectBytes, proofBytes] = process.argv.slice(2);
const receipt = {
  marker: "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_TESTER_SMOKE_RECEIPT_V1",
  smoke_marker: "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_TESTER_SMOKE_V1",
  generated_at_utc: new Date().toISOString(),
  public_node_base: base,
  object_id: objectId,
  sha256_expected: expectedSha,
  object_by_id_sha256: idSha,
  object_by_sha256_sha256: bySha,
  object_bytes: Number(objectBytes),
  proof_json_bytes: Number(proofBytes),
  object_url: `${base}/public-node/local-data-drop/${objectId}`,
  by_sha256_url: `${base}/public-node/local-data-drop/by-sha256/${expectedSha}`,
  proof_url: `${base}/public-node/local-data-drop/proof/${expectedSha}.json`,
  objects_match: idSha === expectedSha && bySha === expectedSha,
  proof_json_verified: true,
  public_routes_only: true,
  read_only: true,
  mutation: false,
  money_movement: false,
  wallet_send: false,
  validator_mutation: false
};
fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + "\n");
console.log(`[ok] receipt ${receiptPath}`);
NODE

echo "receipt=$RECEIPT"
echo "receipt_marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_TESTER_SMOKE_RECEIPT_V1"
echo "object_by_id_sha256=$ID_SHA"
echo "object_by_sha256_sha256=$BY_SHA"
echo "objects_match=true"
echo "proof_json_verified=true"
echo "public_routes_only=true"
echo "read_only=true"
echo "mutation=false"
echo "money_movement=false"
echo "wallet_send=false"
echo "validator_mutation=false"
echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_TESTER_SMOKE_V1_GREEN"
