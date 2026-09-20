#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const targets = [
  ".github/workflows/p2p-signed-trust-policy-wall-v1.yml",
  ".github/workflows/wc-public-earning-participant-cli-v1.yml",
  ".github/workflows/prom-guards.yml",
  ".github/workflows/ops-guards-proposer-loop.yml",
  ".github/workflows/prom-verify.yml",
  ".github/workflows/ops-verify.yml",
  ".github/workflows/void-ai-agent-first-contact-runtime-control-flow-repair-v1.yml",
  ".github/workflows/legacy-txroot-forensics-bundle-retirement.yml",
  ".github/workflows/secret-check.yml",
  ".github/workflows/beta-proof-guards.yml",
  ".github/workflows/p2p-live-activation-lease-wall-v1.yml",
  ".github/workflows/guard-index.yml",
  ".github/workflows/ops-guards-header3-gap.yml",
  ".github/workflows/ops-guards-autostart.yml",
  ".github/workflows/p2p-authenticated-edge-wall-v1.yml",
  ".github/workflows/refined-tracked-raw-empty-catches-terminal-zero.yml",
  ".github/workflows/ops-guards.yml",
  ".github/workflows/economic-activation-wc-capability-v1.yml",
];

assert.equal(targets.length, 18);
assert.equal(new Set(targets).size, targets.length);

for (const file of targets) {
  const text = fs.readFileSync(file, "utf8");
  assert.match(
    text,
    /on:\n  push:\n    branches: \[main\]\n  pull_request:/,
    file + ": main-only push plus PR trigger required",
  );
  assert.doesNotMatch(
    text,
    /on:\s*\[push,\s*pull_request\]/,
    file + ": shorthand all-branch push trigger forbidden",
  );
  assert.match(
    text,
    /concurrency:\n  group: \$\{\{ github\.workflow \}\}-\$\{\{ github\.event\.pull_request\.number \|\| github\.ref \}\}\n  cancel-in-progress: true/,
    file + ": per-PR/ref cancellation policy required",
  );
}

console.log("VOID_CI_FEATURE_PUSH_FANOUT_V1_PROOF_GREEN");
console.log("target_workflows=18");
console.log("feature_branch_push_execution=false");
console.log("pull_request_execution=true");
console.log("main_push_execution=true");
console.log("superseded_run_cancellation=true");
console.log("job_commands_changed=false");
