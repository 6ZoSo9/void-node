#!/usr/bin/env bash
set -euo pipefail

PORT="${VOID_PROOF_BUNDLE_CHECK_PORT:-$((19100 + ($$ % 800)))}"
SERVER_OUT="/tmp/void-datanet-proof-bundle-safe-serve-${PORT}.out"
RUNNER_OUT="/tmp/void-datanet-proof-bundle-runner-${PORT}.out"
ROUNDTRIP_OUT="/tmp/void-datanet-proof-bundle-roundtrip-${PORT}.out"
BUNDLE_OUT="/tmp/void-datanet-proof-bundle-${PORT}.out"

cleanup() {
  if [ -n "${pid:-}" ]; then
    kill "$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
  fi
}
trap cleanup EXIT

node - <<'NODE'
const fs = require("fs");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const expected = "node tools/datanet-field-replication-proof-bundle-v1.mjs";
const actual = pkg.scripts?.["datanet:field-replication:proof-bundle"];
if (actual !== expected) {
  throw new Error(`missing/incorrect proof bundle script. expected ${expected}, got ${actual}`);
}
if (!fs.existsSync("tools/datanet-field-replication-proof-bundle-v1.mjs")) {
  throw new Error("missing proof bundle tool");
}
NODE

npm run datanet:field-object:create >/tmp/void-datanet-proof-bundle-create.out

node tools/public-node-safe-serve-v1.mjs --host 127.0.0.1 --port "$PORT" >"$SERVER_OUT" 2>&1 &
pid=$!

for _ in $(seq 1 60); do
  if grep -q 'VOID_PUBLIC_NODE_SAFE_SERVE_V1_READY' "$SERVER_OUT"; then
    break
  fi
  sleep 0.25
done

grep -q 'VOID_PUBLIC_NODE_SAFE_SERVE_V1_READY' "$SERVER_OUT"
grep -q 'dangerous_paths_touched=false' "$SERVER_OUT"

VOID_NETWORK_HINT=local-proof-bundle-check npm run datanet:field-replication:run -- \
  public/public-node/datanet/field-objects/latest.json \
  "http://127.0.0.1:${PORT}" \
  | tee "$RUNNER_OUT"

grep -q 'VOID_DATANET_FIELD_REPLICATION_RUNNER_V1_GREEN' "$RUNNER_OUT"
sha="$(awk -F= '/^sha256=/{print $2; exit}' "$RUNNER_OUT")"
if [ -z "$sha" ]; then
  echo "missing sha from runner"
  exit 1
fi

VOID_NETWORK_HINT=local-proof-bundle-check npm run datanet:field-object:roundtrip -- \
  "http://127.0.0.1:${PORT}" \
  "$sha" \
  | tee "$ROUNDTRIP_OUT"

grep -q 'VOID_DATANET_FIELD_OBJECT_ROUNDTRIP_V1_GREEN' "$ROUNDTRIP_OUT"
grep -q 'match=true' "$ROUNDTRIP_OUT"

VOID_NETWORK_HINT=local-proof-bundle-check npm run void:field-report >/tmp/void-datanet-proof-bundle-field-report.out
grep -q 'VOID_FIELD_REPORT_V1_READY' /tmp/void-datanet-proof-bundle-field-report.out

npm run datanet:field-replication:proof-bundle | tee "$BUNDLE_OUT"

grep -q 'VOID_DATANET_FIELD_REPLICATION_PROOF_BUNDLE_V1_GREEN' "$BUNDLE_OUT"
grep -q '^bundle_json=' "$BUNDLE_OUT"
grep -q '^bundle_md=' "$BUNDLE_OUT"
grep -q '^local_only=true' "$BUNDLE_OUT"
grep -q '^public_safe=false' "$BUNDLE_OUT"

bundle_json="$(awk -F= '/^bundle_json=/{print $2; exit}' "$BUNDLE_OUT")"
bundle_md="$(awk -F= '/^bundle_md=/{print $2; exit}' "$BUNDLE_OUT")"

test -f "$bundle_json"
test -f "$bundle_md"

BUNDLE_JSON="$bundle_json" EXPECTED_SHA="$sha" node - <<'NODE'
const fs = require("fs");
const bundle = JSON.parse(fs.readFileSync(process.env.BUNDLE_JSON, "utf8"));
if (bundle.marker !== "VOID_DATANET_FIELD_REPLICATION_PROOF_BUNDLE_V1_GREEN") {
  throw new Error("bad bundle marker");
}
if (bundle.status !== "green") throw new Error("bundle not green");
if (bundle.local_only !== true) throw new Error("bundle local_only must be true");
if (bundle.public_safe !== false) throw new Error("bundle public_safe must be false");
if (bundle.proof?.match !== true) throw new Error("bundle proof match not true");
if (bundle.proof?.actual_sha256 !== process.env.EXPECTED_SHA && bundle.proof?.expected_sha256 !== process.env.EXPECTED_SHA && bundle.proof?.runner_sha256 !== process.env.EXPECTED_SHA) {
  throw new Error("bundle proof sha did not match runner sha");
}
for (const [key, value] of Object.entries(bundle.boundaries || {})) {
  if (key === "local_operator_bundle_only" && value !== true) {
    throw new Error("local operator boundary not true");
  }
  if (key !== "local_operator_bundle_only" && key !== "writes_public_tree" && value !== false) {
    throw new Error(`boundary should be false: ${key}`);
  }
}
for (const entry of Object.values(bundle.copied || {})) {
  if (entry && entry.bundle_path && !fs.existsSync(entry.bundle_path)) {
    throw new Error(`missing copied artifact: ${entry.bundle_path}`);
  }
}
NODE

echo "VOID_DATANET_FIELD_REPLICATION_PROOF_BUNDLE_V1_GREEN"
