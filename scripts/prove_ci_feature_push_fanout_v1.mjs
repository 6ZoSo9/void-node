#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const featurePushTargets = [
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

const prCancellationTargets = [
  ".github/workflows/ci.yml",
  ".github/workflows/public-root-artifact-rotation-closeout.yml",
  ".github/workflows/public-node-operator-trial-receipt-example.yml",
  ".github/workflows/public-node-operator-trial-submission-intake.yml",
  ".github/workflows/public-node-operator-trial-tester-instruction-pack.yml",
  ".github/workflows/public-repo-hygiene.yml",
  ".github/workflows/public-node-operator-trial-submission-review-decision-example.yml",
  ".github/workflows/public-python-bytecode-hygiene-v1.yml",
  ".github/workflows/public-node-operator-trial-submission-review-chain-rollup.yml",
  ".github/workflows/public-node-operator-trial-submission-review-chain-closeout-rollup.yml",
  ".github/workflows/public-node-operator-trial-lane-dashboard-link.yml",
];

const allTargets = [...featurePushTargets, ...prCancellationTargets];
assert.equal(featurePushTargets.length, 18);
assert.equal(prCancellationTargets.length, 11);
assert.equal(allTargets.length, 29);
assert.equal(new Set(allTargets).size, allTargets.length);

const concurrency = [
  "concurrency:",
  "  group: ${{ github.workflow }}-${{ github.event_name }}-${{ github.event.pull_request.number || github.ref }}",
  "  cancel-in-progress: ${{ github.event_name == 'pull_request' }}",
].join("\n");

const workflowNames = allTargets.map((file) => {
  const text = fs.readFileSync(file, "utf8");
  const match = text.match(/^name:\s*(.+)$/m);
  assert.ok(match, file + ": workflow name required");
  return match[1].trim();
});
assert.equal(
  new Set(workflowNames).size,
  workflowNames.length,
  "target workflow names must be unique for concurrency isolation",
);

const forbiddenStateful = [
  /\b(?:contents|packages|actions|deployments|issues|pull-requests|id-token):\s*write\b/,
  /actions\/upload-artifact@/,
  /\bgit\s+push\b/,
  /\bgh\s+(?:release|api|pr|issue|run|workflow)\b/,
  /curl[^\n]*\s-X\s+(?:POST|PUT|PATCH|DELETE)\b/i,
];

for (const file of allTargets) {
  const text = fs.readFileSync(file, "utf8");
  assert.equal(
    text.includes(concurrency),
    true,
    file + ": event-aware PR-only cancellation policy required",
  );
  assert.match(text, /\n  pull_request:/, file + ": pull_request coverage required");
  assert.match(text, /\n  push:/, file + ": push coverage required");
  for (const pattern of forbiddenStateful) {
    assert.doesNotMatch(text, pattern, file + ": stateful target is not cancel-safe");
  }
}

for (const file of featurePushTargets) {
  const text = fs.readFileSync(file, "utf8");
  assert.match(
    text,
    /on:\n  push:\n    branches: \[main\]\n  pull_request:/,
    file + ": feature-branch push must remain disabled",
  );
  assert.doesNotMatch(
    text,
    /on:\s*\[push,\s*pull_request\]/,
    file + ": shorthand all-branch push trigger forbidden",
  );
}

const ci = fs.readFileSync(".github/workflows/ci.yml", "utf8");
assert.match(
  ci,
  /push:\n    branches: \[ new-main\*, restore-2025-10-28, main \]/,
  "CI push branch coverage must remain unchanged",
);

for (const file of [
  ".github/workflows/void-ai-agent-first-contact-runtime-control-flow-repair-v1.yml",
  ".github/workflows/public-python-bytecode-hygiene-v1.yml",
]) {
  assert.match(
    fs.readFileSync(file, "utf8"),
    /workflow_dispatch:/,
    file + ": manual dispatch must remain available",
  );
}

const self = fs.readFileSync(
  ".github/workflows/ci-feature-push-fanout-v1.yml",
  "utf8",
);
assert.equal(
  self.includes(concurrency),
  true,
  "focused proof workflow must preserve main/manual runs and cancel only stale PR heads",
);

console.log("VOID_CI_FEATURE_PUSH_FANOUT_V1_PROOF_GREEN");
console.log("feature_push_targets=18");
console.log("pr_supersession_targets=29");
console.log("feature_branch_push_execution=false");
console.log("pull_request_execution=true");
console.log("main_push_execution=true");
console.log("main_push_cancellation=false");
console.log("manual_dispatch_cancellation=false");
console.log("stateful_target_workflows=0");
console.log("target_workflow_names_unique=true");
