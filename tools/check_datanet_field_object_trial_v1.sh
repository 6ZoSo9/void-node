#!/usr/bin/env bash
set -euo pipefail

node - <<'NODE'
const fs = require("fs");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
if (pkg.scripts?.["datanet:field-object:trial"] !== "node tools/datanet-field-object-trial-v1.mjs") {
  throw new Error("missing datanet:field-object:trial package script");
}
if (!fs.existsSync("tools/datanet-field-object-trial-v1.mjs")) {
  throw new Error("missing tools/datanet-field-object-trial-v1.mjs");
}
NODE

VOID_FIELD_BASE_URL=http://127.0.0.1:8088 npm run datanet:field-object:create | grep -q 'VOID_DATANET_FIELD_OBJECT_CREATE_V1_GREEN'

npm run datanet:field-object:trial -- public/public-node/datanet/field-objects/latest.json | grep -q 'VOID_DATANET_FIELD_OBJECT_TRIAL_V1_GREEN'

echo "VOID_DATANET_FIELD_OBJECT_TRIAL_V1_GREEN"
