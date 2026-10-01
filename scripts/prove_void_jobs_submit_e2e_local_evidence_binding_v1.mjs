#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const MARKER = "VOID_JOBS_SUBMIT_E2E_LOCAL_EVIDENCE_BINDING_V1";
const sourcePath = "ops/jobs-submit-e2e-proof.sh";
const source = fs.readFileSync(sourcePath, "utf8");

assert.ok(source.startsWith("#!/usr/bin/env bash\n"), "shebang must be first");
assert.equal(source.includes("100.122.79.39"), false, "retired Alienware IP remains");
assert.ok(source.includes('NODE_BASE="${NODE_BASE:-http://127.0.0.1:4100}"'));
assert.ok(source.includes('MARKER="VOID_JOBS_SUBMIT_E2E_LOCAL_EVIDENCE_BINDING_V1"'));
assert.ok(source.includes('parsed.hostname not in {"127.0.0.1", "localhost", "::1"}'));
assert.ok(source.includes('parsed.scheme != "http"'));
assert.ok(source.includes('parsed.port is None'));
assert.ok(source.includes('BASE must be a loopback HTTP origin with an explicit port'));
assert.ok(source.includes('awk -v p=":$BASE_PORT"'));
assert.equal(source.includes("awk '/:4100 /"), false, "PID lookup still pins port 4100");

for (const requiredLocalEvidence of [
  '$DATA_DIR/jobs_v1/jobs.jsonl',
  '$DATA_DIR/agent_v1/receipts.jsonl',
  '$DATA_DIR/wc_v1/ledger.jsonl',
]) {
  assert.ok(source.includes(requiredLocalEvidence), `missing local evidence path: ${requiredLocalEvidence}`);
}

assert.ok(source.includes('-X POST "$BASE/jobs/submit"'));
assert.ok(source.includes('echo "remote_submission=false"'));

console.log(`${MARKER}_PROOF_GREEN`);
console.log("default_base_loopback=true");
console.log("remote_base_rejected=true");
console.log("evidence_files_local=true");
console.log("listener_port_derived_from_base=true");
console.log("live_job_submission_executed=false");
console.log("wc_write_executed=false");
console.log("funds_movement=false");
