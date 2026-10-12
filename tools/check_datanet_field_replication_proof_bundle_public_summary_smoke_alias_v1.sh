#!/usr/bin/env bash
set -euo pipefail

alias_name="datanet:field-replication:public-summary-smoke"
alias_cmd="bash tools/check_datanet_field_replication_proof_bundle_public_summary_runtime_v1.sh"
out="/tmp/void-datanet-field-replication-public-summary-smoke-alias-v1.out"

node - <<'NODE'
const fs = require("fs");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const actual = pkg.scripts?.["datanet:field-replication:public-summary-smoke"];
const expected = "bash tools/check_datanet_field_replication_proof_bundle_public_summary_runtime_v1.sh";
if (actual !== expected) {
  throw new Error(`missing/incorrect npm alias. expected ${expected}, got ${actual}`);
}
if (!fs.existsSync("tools/check_datanet_field_replication_proof_bundle_public_summary_runtime_v1.sh")) {
  throw new Error("missing public summary runtime smoke tool");
}
NODE

rm -f "$out"

npm run "$alias_name" | tee "$out"

grep -q 'runtime public summary fetch ok' "$out"
grep -q 'VOID_DATANET_FIELD_REPLICATION_PROOF_BUNDLE_PUBLIC_SUMMARY_RUNTIME_V1_GREEN' "$out"

echo "VOID_DATANET_FIELD_REPLICATION_PROOF_BUNDLE_PUBLIC_SUMMARY_SMOKE_ALIAS_V1_GREEN"
