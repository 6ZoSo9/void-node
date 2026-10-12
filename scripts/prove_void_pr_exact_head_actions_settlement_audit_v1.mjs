#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  VOID_PR_EXACT_HEAD_ACTIONS_SETTLEMENT_AUDIT_V1,
  auditExactHeadActionsSettlement,
} from "../tools/void-pr-exact-head-actions-settlement-audit-v1.mjs";

const REPO = "6ZoSo9/void-node";
const HEAD = "a".repeat(40);
const OTHER = "b".repeat(40);

function pr(head = HEAD) {
  return {
    number: 4242,
    title: "fixture",
    html_url: "https://github.com/6ZoSo9/void-node/pull/4242",
    state: "open",
    merged: false,
    merged_at: null,
    head: { sha: head, repo: { full_name: REPO } },
    base: { sha: OTHER, repo: { full_name: REPO } },
  };
}

let nextId = 100;
function run({
  workflow = 1,
  name = `workflow-${workflow}`,
  runNumber = 1,
  attempt = 1,
  status = "completed",
  conclusion = "success",
  head = HEAD,
  created = "2026-08-10T00:00:00Z",
  updated = "2026-08-10T00:01:00Z",
} = {}) {
  nextId += 1;
  return {
    id: nextId,
    workflow_id: workflow,
    name,
    run_number: runNumber,
    run_attempt: attempt,
    head_sha: head,
    event: "pull_request",
    status,
    conclusion,
    created_at: created,
    updated_at: updated,
    html_url: `https://github.com/6ZoSo9/void-node/actions/runs/${nextId}`,
  };
}

function audit(runs, overrides = {}) {
  return auditExactHeadActionsSettlement({
    repository: REPO,
    pull_request: pr(),
    expected_head: HEAD,
    minimum_workflows: 1,
    workflow_runs: runs,
    ...overrides,
  });
}

const allGreen = audit([
  run({ workflow: 1, name: "alpha" }),
  run({ workflow: 2, name: "beta" }),
]);
assert.equal(allGreen.marker, VOID_PR_EXACT_HEAD_ACTIONS_SETTLEMENT_AUDIT_V1);
assert.equal(allGreen.decision, "EXACT_HEAD_ACTIONS_SETTLED_GREEN");
assert.equal(allGreen.green_workflow_count, 2);
assert.equal(allGreen.pending_workflow_count, 0);
assert.equal(allGreen.blocked_workflow_count, 0);
assert.equal(allGreen.all_observed_latest_workflows_green, true);

const pendingLatest = audit([
  run({ workflow: 1, name: "alpha", runNumber: 1 }),
  run({ workflow: 1, name: "alpha", runNumber: 2, status: "in_progress", conclusion: null }),
]);
assert.equal(pendingLatest.decision, "EXACT_HEAD_ACTIONS_PENDING");
assert.equal(pendingLatest.pending_workflow_count, 1);
assert.equal(pendingLatest.superseded_run_count, 1);

const failedLatest = audit([
  run({ workflow: 1, name: "alpha", runNumber: 1 }),
  run({ workflow: 1, name: "alpha", runNumber: 2, conclusion: "failure" }),
]);
assert.equal(failedLatest.decision, "EXACT_HEAD_ACTIONS_FAILED_OR_BLOCKED");
assert.equal(failedLatest.blocked_workflow_count, 1);
assert.equal(failedLatest.blocked_workflows[0].classification_reason, "failure");

const actionRequired = audit([
  run({ workflow: 1, conclusion: "action_required" }),
]);
assert.equal(actionRequired.decision, "EXACT_HEAD_ACTIONS_FAILED_OR_BLOCKED");
assert.equal(actionRequired.blocked_workflows[0].classification_reason, "action_required");

for (const conclusion of ["cancelled", "timed_out", "startup_failure", "stale", "neutral", "skipped"]) {
  const blocked = audit([run({ workflow: 1, conclusion })]);
  assert.equal(blocked.decision, "EXACT_HEAD_ACTIONS_FAILED_OR_BLOCKED");
  assert.equal(blocked.blocked_workflows[0].classification_reason, conclusion);
}

const latestSuccessWins = audit([
  run({ workflow: 7, name: "repair", runNumber: 4, conclusion: "failure" }),
  run({ workflow: 7, name: "repair", runNumber: 5, conclusion: "success" }),
]);
assert.equal(latestSuccessWins.decision, "EXACT_HEAD_ACTIONS_SETTLED_GREEN");
assert.equal(latestSuccessWins.superseded_run_count, 1);

const attemptWins = audit([
  run({ workflow: 8, name: "attempt", runNumber: 9, attempt: 1, conclusion: "failure" }),
  run({ workflow: 8, name: "attempt", runNumber: 9, attempt: 2, conclusion: "success" }),
]);
assert.equal(attemptWins.decision, "EXACT_HEAD_ACTIONS_SETTLED_GREEN");
assert.equal(attemptWins.latest_workflows[0].run_attempt, 2);

const noRuns = audit([]);
assert.equal(noRuns.decision, "EXACT_HEAD_ACTIONS_FAILED_OR_BLOCKED");
assert.deepEqual(noRuns.reasons, ["minimum_workflow_count_not_met"]);

const belowMinimum = audit([
  run({ workflow: 1 }),
], { minimum_workflows: 2 });
assert.equal(belowMinimum.decision, "EXACT_HEAD_ACTIONS_FAILED_OR_BLOCKED");
assert.ok(belowMinimum.reasons.includes("minimum_workflow_count_not_met"));

const mismatchedExpected = audit([
  run({ workflow: 1 }),
], { expected_head: OTHER });
assert.equal(mismatchedExpected.decision, "EXACT_HEAD_ACTIONS_FAILED_OR_BLOCKED");
assert.ok(mismatchedExpected.reasons.includes("head_sha_mismatch"));

assert.throws(
  () => audit([run({ workflow: 1, head: OTHER })]),
  /github_actions_head_sha_mismatch/,
);
const completedNull = audit([run({ workflow: 1, status: "completed", conclusion: null })]);
assert.equal(completedNull.decision, "EXACT_HEAD_ACTIONS_FAILED_OR_BLOCKED");
assert.equal(completedNull.blocked_workflows[0].classification_reason, "completed_without_conclusion");

const unknownStatus = audit([run({ workflow: 1, status: "mystery", conclusion: null })]);
assert.equal(unknownStatus.decision, "EXACT_HEAD_ACTIONS_FAILED_OR_BLOCKED");
assert.equal(unknownStatus.blocked_workflows[0].classification_reason, "unknown_status:mystery");

assert.deepEqual(allGreen.authority, {
  github_pr_metadata_read: true,
  github_actions_metadata_read: true,
  workflow_jobs_read: false,
  workflow_logs_read: false,
  workflow_rerun: false,
  git_read: false,
  git_mutation: false,
  pull_request_change: false,
  runtime_mutation: false,
  credential_material_read: false,
  wallet_or_signer: false,
  transaction: false,
  funds_moved: false,
});

console.log("VOID_PR_EXACT_HEAD_ACTIONS_SETTLEMENT_AUDIT_V1_PROOF_GREEN");
console.log("latest_run_per_workflow=true");
console.log("run_attempt_precedence=true");
console.log("older_failure_superseded_by_latest_success=true");
console.log("latest_pending_blocks_settlement=true");
console.log("action_required_blocks_settlement=true");
console.log("neutral_and_skipped_not_green=true");
console.log("minimum_workflow_floor_fail_closed=true");
console.log("exact_head_binding=true");
console.log("workflow_rerun=false");
console.log("git_mutation=false");
