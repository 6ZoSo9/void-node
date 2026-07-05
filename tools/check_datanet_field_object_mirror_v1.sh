#!/usr/bin/env bash
set -euo pipefail

node - <<'NODE'
const fs = require("fs");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
if (pkg.scripts?.["datanet:field-object:mirror"] !== "node tools/datanet-field-object-mirror-v1.mjs") {
  throw new Error("missing datanet:field-object:mirror package script");
}
if (!fs.existsSync("tools/datanet-field-object-mirror-v1.mjs")) {
  throw new Error("missing tools/datanet-field-object-mirror-v1.mjs");
}
NODE

npm run datanet:field-object:create | grep -q 'VOID_DATANET_FIELD_OBJECT_CREATE_V1_GREEN'
npm run datanet:field-object:trial -- public/public-node/datanet/field-objects/latest.json | grep -q 'VOID_DATANET_FIELD_OBJECT_TRIAL_V1_GREEN'
VOID_MIRROR_BASE_URL=http://127.0.0.1:8088 npm run datanet:field-object:mirror | grep -q 'VOID_DATANET_FIELD_OBJECT_MIRROR_V1_GREEN'

node - <<'NODE'
const fs = require("fs");
const latest = JSON.parse(fs.readFileSync("public/public-node/datanet/field-object-mirrors/latest.json", "utf8"));
if (latest.marker !== "VOID_DATANET_FIELD_OBJECT_MIRROR_V1_GREEN") throw new Error("bad mirror marker");
if (!latest.verified_locally) throw new Error("mirror not verified locally");
if (!/^sha256:[a-f0-9]{64}$/.test(latest.object_id)) throw new Error("bad object_id");
if (!latest.public_path.includes("/field-object-mirrors/")) throw new Error("bad mirror public path");
if (!fs.existsSync(latest.mirror_object_path)) throw new Error("missing mirrored object");
NODE

echo "VOID_DATANET_FIELD_OBJECT_MIRROR_V1_GREEN"
