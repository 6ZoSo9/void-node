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
  ".github/workflows/wc-public-earning-outbound-participant-v1.yml",
  ".github/workflows/wc-public-ticket-claim-v1.yml",
  ".github/workflows/void-public-safe-background-loop-backpressure-v1.yml",
  ".github/workflows/canonical-txsubmit-admission-dedupe-v1.yml",
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
  ".github/workflows/public-node-operator-trial-review-decision-example.yml",
  ".github/workflows/public-node-operator-trial-public-entrypoint.yml",
  ".github/workflows/void-ai-agent-provenance-unfiltered-v1.yml",
  ".github/workflows/void-github-actions-ref-guard-v1.yml",
  ".github/workflows/public-node-operator-trial-submission-review-chain-final-seal.yml",
  ".github/workflows/public-node-operator-trial-lane-rollup.yml",
  ".github/workflows/public-node-operator-trial-submission-review-queue.yml",
  ".github/workflows/public-node-operator-trial-terminal-closeout-rollup.yml",
  ".github/workflows/public-node-operator-trial-packet.yml",
  ".github/workflows/public-node-operator-trial-closeout-rollup.yml",
  ".github/workflows/license-guard.yml",
  ".github/workflows/void-public-checkpoint-restore-v1.yml",
  ".github/workflows/public-first-official-release-rehearsal-v1.yml",
  ".github/workflows/public-node-operator-trial-root-link.yml",
  ".github/workflows/ci-cost-boundary-v1.yml",
];

const pendingSupersessionTargets = [
  ".github/workflows/void-nimo-build-admission-v1.yml",
  ".github/workflows/void-nimo-executed-runtime-v1.yml",
  ".github/workflows/void-nimo-fresh-sync-session-v1.yml",
];

const allTargets = [...featurePushTargets, ...prCancellationTargets, ...pendingSupersessionTargets];
assert.equal(featurePushTargets.length, 22);
assert.equal(prCancellationTargets.length, 26);
assert.equal(pendingSupersessionTargets.length, 3);
assert.equal(allTargets.length, 51);
assert.equal(new Set(allTargets).size, allTargets.length);

const cancelConcurrency = [
  "concurrency:",
  "  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.run_id }}",
  "  cancel-in-progress: ${{ github.event_name == 'pull_request' }}",
].join("\n");

const preserveRunningConcurrency = [
  "concurrency:",
  "  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.run_id }}",
  "  cancel-in-progress: false",
].join("\n");

function concurrencyGroup({ workflow, prNumber, runId }) {
  assert.equal(typeof workflow, "string");
  assert.equal(Number.isSafeInteger(runId), true);
  const suffix = prNumber ?? runId;
  return `${workflow}-${suffix}`;
}

const prHeadAGroup = concurrencyGroup({
  workflow: "CI",
  prNumber: 1590,
  runId: 91001,
});
const prHeadBGroup = concurrencyGroup({
  workflow: "CI",
  prNumber: 1590,
  runId: 91002,
});
assert.equal(prHeadAGroup, prHeadBGroup);

const mainPushAGroup = concurrencyGroup({
  workflow: "CI",
  prNumber: null,
  runId: 92001,
});
const mainPushBGroup = concurrencyGroup({
  workflow: "CI",
  prNumber: null,
  runId: 92002,
});
assert.notEqual(mainPushAGroup, mainPushBGroup);

const manualAGroup = concurrencyGroup({
  workflow: "CI",
  prNumber: null,
  runId: 93001,
});
const manualBGroup = concurrencyGroup({
  workflow: "CI",
  prNumber: null,
  runId: 93002,
});
assert.notEqual(manualAGroup, manualBGroup);

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
assert.equal(
  new Set(workflowNames.map((name) => name.toLowerCase())).size,
  workflowNames.length,
  "target workflow names must be case-insensitively unique for GitHub concurrency isolation",
);

const forbiddenStateful = [
  /\b(?:contents|packages|actions|deployments|issues|pull-requests|id-token):\s*write\b/,
  /actions\/upload-artifact@/,
  /\bgit\s+push\b/,
  /\bgh\s+(?:release|api|pr|issue|run|workflow)\b/,
  /curl[^\n]*\s-X\s+(?:POST|PUT|PATCH|DELETE)\b/i,
];

const cancelTargets = [...featurePushTargets, ...prCancellationTargets];

for (const file of cancelTargets) {
  const text = fs.readFileSync(file, "utf8");
  assert.equal(
    text.includes(cancelConcurrency),
    true,
    file + ": event-aware PR-only cancellation policy required",
  );
  assert.match(text, /\n  pull_request:/, file + ": pull_request coverage required");
  assert.match(text, /\n  push:/, file + ": push coverage required");
  for (const pattern of forbiddenStateful) {
    assert.doesNotMatch(text, pattern, file + ": stateful target must not cancel in-progress work");
  }
}

for (const file of pendingSupersessionTargets) {
  const text = fs.readFileSync(file, "utf8");
  assert.equal(
    text.includes(preserveRunningConcurrency),
    true,
    file + ": PR queue supersession must preserve an already-running evidence job",
  );
  assert.match(text, /\n  pull_request:/, file + ": pull_request coverage required");
  assert.match(text, /\n  push:/, file + ": push coverage required");
  assert.match(text, /actions\/upload-artifact@/, file + ": preserve-running class requires evidence artifact publication");
}

function assertMainOnlyPush(text, file) {
  const message = file + ": main-only push and pull_request coverage required";
  // Recognize only the explicit two-space event grammar used by these targets.
  // No aliases, flow maps, multiline scalars, or arbitrary YAML are accepted.
  text = text.replace(/^[ \t]*(?:#[^\n]*)?(?:\n|$)/gm, "");
  const rootFields = text.split("\n").filter((line) => /^\S/.test(line));
  assert.ok(rootFields.every((line) => /^(?:[a-z][a-z0-9_-]*:|name: [A-Za-z0-9][A-Za-z0-9 .()&/_-]*)$/.test(line)), message);
  const onHeaders = [...text.matchAll(/^on:[^\n]*(?:\n|$)/gm)];
  assert.equal(onHeaders.length, 1, message);
  assert.equal(onHeaders[0][0], "on:\n", message);
  const body = text.slice(onHeaders[0].index + onHeaders[0][0].length).split(/^\S/m)[0];
  const events = new Map();
  let event;
  let paths;
  for (const line of body.split("\n").filter(Boolean)) {
    const header = line.match(/^  (push|pull_request|workflow_dispatch):(?: \{\})?$/);
    if (header) {
      event = header[1];
      assert.equal(events.has(event), false, message);
      events.set(event, new Map());
      paths = null;
      continue;
    }
    const field = line.match(/^    (branches|paths|paths-ignore):(?: (\[main\]))?$/);
    if (field) {
      assert.ok(event === "push" || event === "pull_request", message);
      const fields = events.get(event);
      assert.equal(fields.has(field[1]), false, message);
      if (field[1] === "branches") {
        assert.ok(event === "push" && field[2] === "[main]", message);
        fields.set("branches", "main");
        paths = null;
      } else {
        assert.equal(field[2], undefined, message);
        assert.equal(fields.has("paths") || fields.has("paths-ignore"), false, message);
        paths = [];
        fields.set(field[1], paths);
      }
      continue;
    }
    // A path is a single-line scalar; quote fragments must never become keys.
    assert.match(line, /^      - (?:"[A-Za-z0-9_./*?!-]+"|'[A-Za-z0-9_./*?!-]+'|[A-Za-z0-9_./][A-Za-z0-9_./*?!-]*)$/, message);
    assert.ok(paths, message);
    paths.push(line);
  }
  assert.equal(events.get("push")?.get("branches"), "main", message);
  assert.ok(events.has("pull_request"), message);
  for (const fields of events.values()) {
    for (const value of fields.values()) {
      if (Array.isArray(value)) assert.ok(value.length > 0, message);
    }
  }
}

const mainOnlyPush = "  push:\n    branches: [main]\n";
const pullRequest = "  pull_request:\n";
for (const events of [
  mainOnlyPush + pullRequest,
  pullRequest + mainOnlyPush,
  pullRequest + mainOnlyPush + "  workflow_dispatch:\n",
  "  workflow_dispatch:\n" + pullRequest + mainOnlyPush,
  mainOnlyPush + "    paths:\n      - 'scripts/**'\n" + pullRequest,
  pullRequest + "  push:\n    paths:\n      - 'scripts/**'\n    branches: [main]\n",
]) {
  for (const ending of ["", "\npermissions:\n  contents: read\n"]) {
    assertMainOnlyPush("on:\n" + events + ending, "valid reordered event fixture");
  }
}
for (const events of [
  "  push:\n" + pullRequest,
  "  push: {}\n" + pullRequest,
  "  push:\n    branches: [main, feature]\n" + pullRequest,
  "  push:\n    branches: ['**']\n" + pullRequest,
  "  push:\n    branches-ignore: [feature]\n" + pullRequest,
  "  push:\n" + pullRequest + "    branches: [main]\n",
  mainOnlyPush + "    branches: ['**']\n" + pullRequest,
  mainOnlyPush + "# comment\n    branches: ['**']\n" + pullRequest,
  mainOnlyPush + "  # comment\n    branches: ['**']\n" + pullRequest,
  mainOnlyPush + "# comment\n    tags: ['**']\n" + pullRequest,
  mainOnlyPush + " \n    branches: ['**']\n" + pullRequest,
  mainOnlyPush + "  \n    branches: ['**']\n" + pullRequest,
  mainOnlyPush + "   \n    branches: ['**']\n" + pullRequest,
  mainOnlyPush + "\t\n    branches: ['**']\n" + pullRequest,
  mainOnlyPush + pullRequest + "  push:\n",
  mainOnlyPush + "# comment must not hide another push\n" + pullRequest + "  push:\n",
  mainOnlyPush + pullRequest + "  'push':\n",
  mainOnlyPush,
  mainOnlyPush + "  pull_request_target:\n",
]) {
  assert.throws(() => assertMainOnlyPush("on:\n" + events, "unsafe event fixture"), assert.AssertionError);
}
for (const text of [
  'name: "\non:\n' + mainOnlyPush + pullRequest + 'jobs: "\n',
  'on:\n  pull_request:\n  push:\n    paths:\n      - "\n    branches: [main]\n        "\n',
  'on:\n  workflow_dispatch:\n    inputs:\n      note:\n        description: "\n  pull_request:\n          "\n  push:\n    branches: [main]\n',
  "on: [push, pull_request]\n",
  "on: [pull_request, push]\n",
  "on:\n" + mainOnlyPush + pullRequest + "on: [push, pull_request]\n",
  "on:\n" + mainOnlyPush + pullRequest + "'on': [push, pull_request]\n",
  "on:\n" + mainOnlyPush + pullRequest + '"on" : [push, pull_request]\n',
  "on:\n" + mainOnlyPush + pullRequest + "on : [push, pull_request]\n",
  "on:\n" + mainOnlyPush + pullRequest + "? on\n: [push, pull_request]\n",
]) {
  assert.throws(() => assertMainOnlyPush(text, "unsafe on fixture"), assert.AssertionError);
}

for (const file of featurePushTargets) {
  assertMainOnlyPush(fs.readFileSync(file, "utf8"), file);
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
  self.includes(cancelConcurrency),
  true,
  "focused proof workflow must preserve main/manual runs and cancel only stale PR heads",
);

console.log("VOID_CI_FEATURE_PUSH_FANOUT_V1_PROOF_GREEN");
console.log("feature_push_targets=22");
console.log("pr_supersession_targets=51");
console.log("feature_branch_push_execution=false");
console.log("pull_request_execution=true");
console.log("main_push_execution=true");
console.log("main_push_cancellation=false");
console.log("manual_dispatch_cancellation=false");
console.log("stateful_target_workflows=3");
console.log("cancel_in_progress_stateful_targets=0");
console.log("preserve_running_targets=3");
console.log("in_progress_evidence_cancellation=false");
console.log("target_workflow_names_unique=true");
console.log("target_workflow_names_case_insensitively_unique=true");
console.log("same_pr_heads_share_group=true");
console.log("same_ref_main_pushes_distinct_groups=true");
console.log("same_ref_manual_dispatches_distinct_groups=true");
console.log("non_pr_pending_supersession=false");
