#!/usr/bin/env bash
set -euo pipefail

alias_name="datanet:field-replication:safe-serve-smoke"
alias_cmd="bash tools/check_datanet_field_replication_safe_serve_runbook_discovery_runtime_v1.sh"
out="/tmp/void-datanet-field-replication-safe-serve-smoke-alias-v1.out"

node - <<'NODE'
const fs = require("fs");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const actual = pkg.scripts?.["datanet:field-replication:safe-serve-smoke"];
const expected = "bash tools/check_datanet_field_replication_safe_serve_runbook_discovery_runtime_v1.sh";
if (actual !== expected) {
  throw new Error(`missing/incorrect npm alias. expected ${expected}, got ${actual}`);
}
if (!fs.existsSync("tools/check_datanet_field_replication_safe_serve_runbook_discovery_runtime_v1.sh")) {
  throw new Error("missing runtime smoke tool");
}
NODE

rm -f "$out"

npm run "$alias_name" | tee "$out"

grep -q 'runtime fetch ok' "$out"
grep -q 'VOID_DATANET_FIELD_REPLICATION_SAFE_SERVE_RUNBOOK_DISCOVERY_RUNTIME_V1_GREEN' "$out"

echo "VOID_DATANET_FIELD_REPLICATION_SAFE_SERVE_SMOKE_ALIAS_V1_GREEN"
