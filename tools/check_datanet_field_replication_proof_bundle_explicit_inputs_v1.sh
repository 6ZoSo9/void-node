#!/usr/bin/env bash
set -euo pipefail

PORT="${VOID_PROOF_BUNDLE_EXPLICIT_CHECK_PORT:-$((20100 + ($$ % 800)))}"
SERVER_OUT="/tmp/void-datanet-proof-bundle-explicit-safe-serve-${PORT}.out"
RUNNER_OUT="/tmp/void-datanet-proof-bundle-explicit-runner-${PORT}.out"
ROUNDTRIP_OUT="/tmp/void-datanet-proof-bundle-explicit-roundtrip-${PORT}.out"
BUNDLE_OUT="/tmp/void-datanet-proof-bundle-explicit-${PORT}.out"
IMPORT_DIR=".void-field-trial/imported-proof-inputs/explicit-check-${PORT}-$(date +%Y%m%d%H%M%S)"

cleanup() {
  if [ -n "${pid:-}" ]; then
    kill "$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
  fi
}
trap cleanup EXIT

npm run datanet:field-object:create >/tmp/void-datanet-proof-bundle-explicit-create.out

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

VOID_NETWORK_HINT=explicit-proof-bundle-check npm run datanet:field-replication:run -- \
  public/public-node/datanet/field-objects/latest.json \
  "http://127.0.0.1:${PORT}" \
  | tee "$RUNNER_OUT"

grep -q 'VOID_DATANET_FIELD_REPLICATION_RUNNER_V1_GREEN' "$RUNNER_OUT"
runner_receipt="$(awk -F= '/^receipt=/{print $2; exit}' "$RUNNER_OUT")"
sha="$(awk -F= '/^sha256=/{print $2; exit}' "$RUNNER_OUT")"

test -n "$runner_receipt"
test -n "$sha"
test -f "$runner_receipt"

VOID_NETWORK_HINT=explicit-proof-bundle-check npm run datanet:field-object:roundtrip -- \
  "http://127.0.0.1:${PORT}" \
  "$sha" \
  | tee "$ROUNDTRIP_OUT"

grep -q 'VOID_DATANET_FIELD_OBJECT_ROUNDTRIP_V1_GREEN' "$ROUNDTRIP_OUT"
grep -q 'match=true' "$ROUNDTRIP_OUT"
roundtrip_receipt="$(awk -F= '/^receipt=/{print $2; exit}' "$ROUNDTRIP_OUT")"
test -n "$roundtrip_receipt"
test -f "$roundtrip_receipt"

mkdir -p "$IMPORT_DIR"
cp "$runner_receipt" "$IMPORT_DIR/imported-field-runner-receipt.json"
cp "$roundtrip_receipt" "$IMPORT_DIR/imported-source-roundtrip-receipt.json"

cat > "$IMPORT_DIR/imported-source-field-report.json" <<JSON
{
  "marker": "VOID_FIELD_REPORT_V1_READY",
  "status": "green",
  "kind": "proof_bundle_explicit_input_check_fixture",
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "artifacts": [
    "$IMPORT_DIR/imported-field-runner-receipt.json",
    "$IMPORT_DIR/imported-source-roundtrip-receipt.json"
  ],
  "note": "Fixture report used by explicit-input proof-bundle check to avoid recursive field-report growth."
}
JSON

cat > "$IMPORT_DIR/imported-source-field-report.md" <<MD
# Explicit input proof bundle field report fixture

VOID_FIELD_REPORT_V1_READY

This fixture is used only by the explicit-input check.
MD

npm run datanet:field-replication:proof-bundle -- \
  --runner-receipt "$IMPORT_DIR/imported-field-runner-receipt.json" \
  --roundtrip-receipt "$IMPORT_DIR/imported-source-roundtrip-receipt.json" \
  --field-report-json "$IMPORT_DIR/imported-source-field-report.json" \
  --field-report-md "$IMPORT_DIR/imported-source-field-report.md" \
  --label explicit-input-check \
  | tee "$BUNDLE_OUT"

grep -q 'VOID_DATANET_FIELD_REPLICATION_PROOF_BUNDLE_V1_GREEN' "$BUNDLE_OUT"
grep -q '^input_mode_runner=explicit' "$BUNDLE_OUT"
grep -q '^input_mode_roundtrip=explicit' "$BUNDLE_OUT"
grep -q '^input_mode_field_report_json=explicit' "$BUNDLE_OUT"
grep -q '^local_only=true' "$BUNDLE_OUT"
grep -q '^public_safe=false' "$BUNDLE_OUT"

bundle_json="$(awk -F= '/^bundle_json=/{print $2; exit}' "$BUNDLE_OUT")"
bundle_md="$(awk -F= '/^bundle_md=/{print $2; exit}' "$BUNDLE_OUT")"
test -f "$bundle_json"
test -f "$bundle_md"

BUNDLE_JSON="$bundle_json" EXPECTED_SHA="$sha" IMPORT_DIR="$(cd "$IMPORT_DIR" && pwd)" node - <<'NODE'
const fs = require("fs");
const path = require("path");
const bundle = JSON.parse(fs.readFileSync(process.env.BUNDLE_JSON, "utf8"));
const importDir = process.env.IMPORT_DIR;
if (bundle.marker !== "VOID_DATANET_FIELD_REPLICATION_PROOF_BUNDLE_V1_GREEN") throw new Error("bad bundle marker");
if (bundle.status !== "green") throw new Error("bundle not green");
if (bundle.local_only !== true) throw new Error("bundle local_only must be true");
if (bundle.public_safe !== false) throw new Error("bundle public_safe must be false");
if (bundle.label !== "explicit-input-check") throw new Error("bundle label mismatch");
if (bundle.input_mode?.runner_receipt !== "explicit") throw new Error("runner input mode not explicit");
if (bundle.input_mode?.roundtrip_receipt !== "explicit") throw new Error("roundtrip input mode not explicit");
if (bundle.input_mode?.field_report_json !== "explicit") throw new Error("field report JSON input mode not explicit");
if (bundle.input_mode?.field_report_md !== "explicit") throw new Error("field report Markdown input mode not explicit");
if (bundle.proof?.match !== true) throw new Error("bundle proof match not true");
const proofSha = bundle.proof?.actual_sha256 || bundle.proof?.expected_sha256 || bundle.proof?.runner_sha256;
if (proofSha !== process.env.EXPECTED_SHA) throw new Error("bundle proof sha mismatch");
if (bundle.boundaries?.local_operator_bundle_only !== true) throw new Error("local operator boundary not true");
if (bundle.boundaries?.writes_public_tree !== false) throw new Error("writes public tree boundary must be false");
for (const [key, value] of Object.entries(bundle.boundaries || {})) {
  if (key !== "local_operator_bundle_only" && value !== false) {
    throw new Error(`boundary should be false: ${key}`);
  }
}
for (const [key, entry] of Object.entries(bundle.copied || {})) {
  if (entry && entry.bundle_path && !fs.existsSync(entry.bundle_path)) {
    throw new Error(`missing copied artifact for ${key}: ${entry.bundle_path}`);
  }
  if (entry && entry.source_path && !path.resolve(entry.source_path).startsWith(importDir)) {
    throw new Error(`source path for ${key} was not imported input: ${entry.source_path}`);
  }
}
NODE

echo "VOID_DATANET_FIELD_REPLICATION_PROOF_BUNDLE_EXPLICIT_INPUTS_V1_GREEN"

