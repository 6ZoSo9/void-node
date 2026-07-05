#!/usr/bin/env bash
set -euo pipefail

node - <<'NODE'
const fs = require("fs");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
if (pkg.scripts?.["datanet:field-replication:run"] !== "node tools/datanet-field-replication-runner-v1.mjs") {
  throw new Error("missing datanet:field-replication:run package script");
}
if (!fs.existsSync("tools/datanet-field-replication-runner-v1.mjs")) {
  throw new Error("missing tools/datanet-field-replication-runner-v1.mjs");
}
NODE

npm run datanet:field-object:create | grep -q 'VOID_DATANET_FIELD_OBJECT_CREATE_V1_GREEN'

VOID_NETWORK_HINT=local-runner-check npm run datanet:field-replication:run -- \
  public/public-node/datanet/field-objects/latest.json \
  http://127.0.0.1:8088 \
  | tee /tmp/void-field-replication-runner.out

grep -q 'VOID_DATANET_FIELD_REPLICATION_RUNNER_V1_GREEN' /tmp/void-field-replication-runner.out
grep -q 'next_roundtrip=' /tmp/void-field-replication-runner.out

node - <<'NODE'
const fs = require("fs");
const path = require("path");

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (name === "receipt.json") acc.push({ p, m: st.mtimeMs });
  }
  return acc;
}

const latest = walk(".void-field-trial/datanet-field-replication-runner").sort((a,b) => b.m - a.m)[0];
if (!latest) throw new Error("missing runner receipt");
const j = JSON.parse(fs.readFileSync(latest.p, "utf8"));
if (j.marker !== "VOID_DATANET_FIELD_REPLICATION_RUNNER_V1_GREEN") throw new Error("bad runner marker");
if (j.dangerous_paths_touched !== false) throw new Error("dangerous paths touched");
if (!/^sha256:[a-f0-9]{64}$/.test(j.object_id)) throw new Error("bad object id");
if (!j.next_roundtrip_command.includes("datanet:field-object:roundtrip")) throw new Error("missing next roundtrip command");
NODE

echo "VOID_DATANET_FIELD_REPLICATION_RUNNER_V1_GREEN"
