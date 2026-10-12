#!/usr/bin/env bash
set -euo pipefail

node - <<'NODE'
const fs = require("fs");
const src = fs.readFileSync("tools/datanet-field-replication-runner-v1.mjs", "utf8");
if (!src.includes('console.log(`host=${receipt.host || ""}`);')) {
  throw new Error("runner does not print host");
}
NODE

npm run datanet:field-object:create | grep -q 'VOID_DATANET_FIELD_OBJECT_CREATE_V1_GREEN'

VOID_NETWORK_HINT=local-runner-host-check npm run datanet:field-replication:run -- \
  public/public-node/datanet/field-objects/latest.json \
  http://127.0.0.1:8088 \
  | tee /tmp/void-field-replication-runner-host.out

grep -q 'VOID_DATANET_FIELD_REPLICATION_RUNNER_V1_GREEN' /tmp/void-field-replication-runner-host.out
grep -q '^host=' /tmp/void-field-replication-runner-host.out
grep -q '^next_roundtrip=' /tmp/void-field-replication-runner-host.out

echo "VOID_DATANET_FIELD_REPLICATION_RUNNER_HOST_OUTPUT_V1_GREEN"
