#!/usr/bin/env bash
set -euo pipefail

node - <<'NODE'
const fs = require("fs");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
if (pkg.scripts?.["datanet:field-object:roundtrip"] !== "node tools/datanet-field-object-roundtrip-v1.mjs") {
  throw new Error("missing datanet:field-object:roundtrip package script");
}
if (!fs.existsSync("tools/datanet-field-object-roundtrip-v1.mjs")) {
  throw new Error("missing tools/datanet-field-object-roundtrip-v1.mjs");
}
NODE

npm run datanet:field-object:create | grep -q 'VOID_DATANET_FIELD_OBJECT_CREATE_V1_GREEN'
npm run datanet:field-object:trial -- public/public-node/datanet/field-objects/latest.json | grep -q 'VOID_DATANET_FIELD_OBJECT_TRIAL_V1_GREEN'
VOID_MIRROR_BASE_URL=http://127.0.0.1:8088 npm run datanet:field-object:mirror | grep -q 'VOID_DATANET_FIELD_OBJECT_MIRROR_V1_GREEN'

SHA="$(node -e "const fs=require('fs'); const j=JSON.parse(fs.readFileSync('public/public-node/datanet/field-object-mirrors/latest.json','utf8')); console.log(j.sha256)")"

npm run datanet:field-object:roundtrip -- public/public-node/datanet/field-object-mirrors/latest.json "$SHA" | grep -q 'VOID_DATANET_FIELD_OBJECT_ROUNDTRIP_V1_GREEN'

echo "VOID_DATANET_FIELD_OBJECT_ROUNDTRIP_V1_GREEN"
