#!/usr/bin/env bash
set -euo pipefail

node - <<'NODE'
const fs = require("fs");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const required = {
  "datanet:field-object:create": "node tools/datanet-field-object-create-v1.mjs",
  "datanet:field-object:pull": "node tools/datanet-field-object-pull-v1.mjs",
};
for (const [k, v] of Object.entries(required)) {
  if (pkg.scripts?.[k] !== v) throw new Error(`missing package script ${k}`);
}
for (const p of [
  "tools/datanet-field-object-create-v1.mjs",
  "tools/datanet-field-object-pull-v1.mjs",
]) {
  if (!fs.existsSync(p)) throw new Error(`missing ${p}`);
}
NODE

VOID_FIELD_BASE_URL=http://127.0.0.1:8088 npm run datanet:field-object:create | grep -q 'VOID_DATANET_FIELD_OBJECT_CREATE_V1_GREEN'

node - <<'NODE' >/tmp/void-field-object-latest.env
const fs = require("fs");
const path = require("path");
const latest = JSON.parse(fs.readFileSync("public/public-node/datanet/field-objects/latest.json", "utf8"));
console.log(`FILE_URL=file://${process.cwd()}/${latest.object_path}`);
console.log(`SHA256=${latest.sha256}`);
NODE

source /tmp/void-field-object-latest.env

npm run datanet:field-object:pull -- "$FILE_URL" "$SHA256" | grep -q 'VOID_DATANET_FIELD_OBJECT_PULL_V1_GREEN'

echo "VOID_DATANET_FIELD_OBJECT_EXCHANGE_V1_GREEN"
