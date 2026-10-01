#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const MARKER = "VOID_TWO_BOX_REMOTE_JOBS_EXPLICIT_TARGET_V1";
const files = [
  "ops/two-box-remote-jobs-submit-proof.sh",
  "ops/two-box-remote-jobs-submit-product-proof.sh",
  "ops/two-box-remote-datanet-view-proof.sh",
];

for (const path of files) {
  const source = fs.readFileSync(path, "utf8");
  assert.ok(source.startsWith("#!/usr/bin/env bash\n"), path);
  assert.ok(source.includes(`MARKER="${MARKER}"`), path);
  assert.equal(
    source.includes('${ALIEN:-zoso@100.122.79.39}'),
    false,
    `legacy implicit SSH target remains: ${path}`,
  );
  assert.ok(
    source.includes(': "${ALIEN:?set ALIEN to an explicit SSH target, for example user@host}"'),
    `explicit SSH target requirement missing: ${path}`,
  );
  assert.ok(source.includes("retired Alienware"), path);
  assert.equal((source.match(/100\.122\.79\.39/g) || []).length, 1, path);
}

for (const path of [
  "ops/two-box-remote-jobs-submit-product-proof.sh",
  "ops/two-box-remote-datanet-view-proof.sh",
]) {
  const source = fs.readFileSync(path, "utf8");
  assert.equal(
    source.includes('${REMOTE_NODE_BASE:-http://100.122.79.39:4100}'),
    false,
    `legacy implicit HTTP origin remains: ${path}`,
  );
  assert.ok(
    source.includes(': "${REMOTE_NODE_BASE:?set REMOTE_NODE_BASE to the explicit remote node HTTP origin}"'),
    `explicit HTTP origin requirement missing: ${path}`,
  );
  assert.ok(source.includes('case "$REMOTE_NODE_BASE" in'), path);
  assert.ok(source.includes('http://*|https://*)'), path);
}

const sshOnly = fs.readFileSync("ops/two-box-remote-jobs-submit-proof.sh", "utf8");
assert.equal(sshOnly.includes("REMOTE_NODE_BASE="), false);

console.log(`${MARKER}_PROOF_GREEN`);
console.log("implicit_retired_ssh_target=false");
console.log("implicit_retired_http_origin=false");
console.log("explicit_remote_target_required=true");
console.log("live_ssh_executed=false");
console.log("live_http_executed=false");
console.log("job_submission_executed=false");
console.log("wc_write_executed=false");
console.log("funds_movement=false");
