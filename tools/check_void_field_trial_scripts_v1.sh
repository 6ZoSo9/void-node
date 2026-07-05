#!/usr/bin/env bash
set -euo pipefail

node - <<'NODE'
const fs = require("fs");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const required = {
  "void:field-trial": "node tools/void-field-trial-v1.mjs",
  "datanet:demo": "node tools/datanet-demo-v1.mjs",
  "datanet:pull": "node tools/datanet-pull-v1.mjs",
  "void:field-report": "node tools/void-field-report-v1.mjs",
};
for (const [k, v] of Object.entries(required)) {
  if (pkg.scripts?.[k] !== v) {
    throw new Error(`missing package script ${k}`);
  }
}
for (const p of [
  "tools/void-field-trial-v1.mjs",
  "tools/datanet-demo-v1.mjs",
  "tools/datanet-pull-v1.mjs",
  "tools/void-field-report-v1.mjs",
]) {
  if (!fs.existsSync(p)) throw new Error(`missing ${p}`);
}
NODE

npm run void:field-trial | grep -q 'VOID_FIELD_TRIAL_V1_REPORT_READY'
npm run datanet:demo | grep -q 'VOID_DATANET_DEMO_V1_GREEN'
npm run void:field-report | grep -q 'VOID_FIELD_REPORT_V1_READY'

if npm run datanet:pull -- '<precision-or-public-node-url>' >/tmp/void-field-pull-placeholder.out 2>&1; then
  echo "placeholder pull unexpectedly passed"
  exit 1
fi

grep -q 'Do not paste the placeholder' /tmp/void-field-pull-placeholder.out

echo "VOID_FIELD_TRIAL_SCRIPTS_V1_GREEN"
