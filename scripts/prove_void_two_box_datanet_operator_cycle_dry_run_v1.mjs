#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const MARKER = "VOID_TWO_BOX_DATANET_OPERATOR_CYCLE_DRY_RUN_V1";
const path = "ops/two-box-datanet-operator-cycle.sh";
const text = fs.readFileSync(path, "utf8");

assert.ok(text.includes(`MARKER="${MARKER}"`));
assert.equal(text.includes(":-zoso@100.122.79.39"), false);
assert.equal(text.includes(":-http://100.122.79.39"), false);
assert.ok(text.includes('HOLD: missing explicit ALIEN'));
assert.ok(text.includes('HOLD: missing explicit REMOTE_BASE'));
assert.ok(text.includes('HOLD: retired Alienware target is forbidden'));
assert.ok(text.includes('export ALIEN REMOTE_BASE'));

const provenancePos = text.indexOf("bash ops/two-box-datanet-provenance-diff.sh");
const applyGatePos = text.indexOf('if [ "$APPLY" != "1" ]');
assert.ok(provenancePos >= 0 && applyGatePos > provenancePos, "read-only provenance must precede dry-run exit");

for (const token of [
  'git fetch origin',
  'git checkout main',
  'git reset --hard origin/main',
  'systemctl --user restart void-node.service',
  'APPLY=1 LIMIT="$LIMIT"',
  'bash ops/two-box-datanet-materialize-proof.sh',
]) {
  const pos = text.indexOf(token);
  assert.ok(pos > applyGatePos, `mutation/proof token escaped APPLY gate: ${token}`);
}

assert.ok(
  text.includes('[dry-run] remote sync/restart/materialization skipped; set APPLY=1 to mutate'),
  "dry-run boundary message missing",
);
assert.ok(
  text.includes('ALIEN="$ALIEN" REMOTE_BASE="$REMOTE_BASE" \\\n  bash ops/two-box-datanet-provenance-diff.sh'),
  "explicit targets not forwarded to provenance proof",
);
assert.ok(
  text.includes('ALIEN="$ALIEN" REMOTE_BASE="$REMOTE_BASE" APPLY=1 LIMIT="$LIMIT" WHO="$WHO"'),
  "explicit targets not forwarded to materializer",
);
assert.ok(
  text.includes('ALIEN="$ALIEN" REMOTE_BASE="$REMOTE_BASE" LIMIT="$LIMIT" WHO="$WHO"'),
  "explicit targets not forwarded to materialize proof",
);

const missing = spawnSync("bash", [path], {
  cwd: process.cwd(),
  env: { PATH: process.env.PATH || "/usr/bin:/bin" },
  encoding: "utf8",
  timeout: 5000,
});
assert.equal(missing.status, 2, missing.stderr);
assert.match(missing.stderr, new RegExp(`${MARKER} HOLD: missing explicit ALIEN`));

const retired = spawnSync("bash", [path], {
  cwd: process.cwd(),
  env: {
    PATH: process.env.PATH || "/usr/bin:/bin",
    ALIEN: "zoso@100.122.79.39",
    REMOTE_BASE: "http://203.0.113.10:4100",
    APPLY: "0",
  },
  encoding: "utf8",
  timeout: 5000,
});
assert.equal(retired.status, 2, retired.stderr);
assert.match(retired.stderr, new RegExp(`${MARKER} HOLD: retired Alienware target is forbidden`));

console.log(`${MARKER}_PROOF_GREEN`);
console.log("explicit_remote_target_required=true");
console.log("retired_alienware_target_rejected=true");
console.log("dry_run_remote_mutation=false");
console.log("apply_gate_precedes_remote_reset_restart_materialize=true");
console.log("live_network_execution=false");
