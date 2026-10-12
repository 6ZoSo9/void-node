#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  VOID_PR_STACK_DEPENDENCY_AUDIT_V1,
  auditParentBranchDependencies,
  normalizeBranchName,
  parseOpenPullRequests,
} from "../tools/void-pr-stack-dependency-audit-v1.mjs";

const SHA_A = "a".repeat(40);
const SHA_B = "b".repeat(40);
const SHA_C = "c".repeat(40);
const SHA_D = "d".repeat(40);

function pr({
  number,
  head,
  base,
  sha,
  draft = true,
}) {
  return {
    number,
    title: `PR ${number}`,
    url: `https://github.com/6ZoSo9/void-node/pull/${number}`,
    isDraft: draft,
    state: "OPEN",
    headRefName: head,
    headRefOid: sha,
    baseRefName: base,
  };
}

const empty = auditParentBranchDependencies({
  parent_branch: "feat/parent-v1",
  open_prs: [],
});
assert.equal(empty.marker, VOID_PR_STACK_DEPENDENCY_AUDIT_V1);
assert.equal(empty.safe_to_move_parent_branch, true);
assert.equal(empty.decision, "SAFE_NO_OPEN_CHILD_DEPENDENCIES");
assert.equal(empty.direct_child_count, 0);
assert.equal(empty.descendant_count, 0);

const stack = [
  pr({
    number: 1159,
    head: "fix/buy-void-terminal-closeout-plan-binding-v1-20260809",
    base: "main",
    sha: SHA_A,
    draft: false,
  }),
  pr({
    number: 1158,
    head: "fix/buy-void-postmerge-terminal-closeout-hardening-v1-20260809",
    base: "fix/buy-void-terminal-closeout-plan-binding-v1-20260809",
    sha: SHA_B,
  }),
  pr({
    number: 1162,
    head: "fix/buy-void-terminal-closeout-child-proof-v1-20260809",
    base: "fix/buy-void-postmerge-terminal-closeout-hardening-v1-20260809",
    sha: SHA_C,
  }),
  pr({
    number: 1163,
    head: "fix/buy-void-terminal-closeout-unrelated-prefix-v1-20260809",
    base: "main",
    sha: SHA_D,
  }),
];

const held = auditParentBranchDependencies({
  parent_branch: "fix/buy-void-terminal-closeout-plan-binding-v1-20260809",
  expected_parent_head: SHA_A,
  open_prs: stack,
});
assert.equal(held.safe_to_move_parent_branch, false);
assert.equal(held.decision, "HOLD_PARENT_BRANCH_MOVEMENT");
assert.deepEqual(held.reasons, ["open_child_pr_dependencies"]);
assert.equal(held.parent_pr_number, 1159);
assert.equal(held.observed_parent_head, SHA_A);
assert.equal(held.direct_child_count, 1);
assert.equal(held.direct_children[0].pr_number, 1158);
assert.equal(held.descendant_count, 2);
assert.deepEqual(
  held.descendants.map((row) => [row.pr_number, row.depth]),
  [[1158, 1], [1162, 2]],
);
assert.equal(
  held.descendants.some((row) => row.pr_number === 1163),
  false,
);

const mismatch = auditParentBranchDependencies({
  parent_branch: "fix/buy-void-terminal-closeout-plan-binding-v1-20260809",
  expected_parent_head: SHA_D,
  open_prs: stack,
});
assert.equal(mismatch.safe_to_move_parent_branch, false);
assert.deepEqual(mismatch.reasons, [
  "open_child_pr_dependencies",
  "parent_head_mismatch",
]);

const unverified = auditParentBranchDependencies({
  parent_branch: "feat/no-parent-pr-v1",
  expected_parent_head: SHA_A,
  open_prs: [],
});
assert.equal(unverified.safe_to_move_parent_branch, false);
assert.deepEqual(unverified.reasons, ["parent_head_unverified"]);

const prefixOnly = auditParentBranchDependencies({
  parent_branch: "feat/foo",
  open_prs: [
    pr({
      number: 9,
      head: "feat/child",
      base: "feat/foo-extra",
      sha: SHA_A,
    }),
  ],
});
assert.equal(prefixOnly.safe_to_move_parent_branch, true);

assert.throws(
  () => normalizeBranchName("feat/bad branch"),
  /branch_name_invalid/,
);
assert.throws(
  () => parseOpenPullRequests("[{}]"),
  /github_pr_number_invalid/,
);
assert.throws(
  () =>
    parseOpenPullRequests([
      pr({ number: 1, head: "feat/a", base: "main", sha: SHA_A }),
      pr({ number: 1, head: "feat/b", base: "main", sha: SHA_B }),
    ]),
  /github_pr_number_duplicate/,
);

const cycle = auditParentBranchDependencies({
  parent_branch: "feat/a",
  open_prs: [
    pr({ number: 1, head: "feat/b", base: "feat/a", sha: SHA_A }),
    pr({ number: 2, head: "feat/a", base: "feat/b", sha: SHA_B }),
  ],
});
assert.equal(cycle.safe_to_move_parent_branch, false);
assert.equal(cycle.reasons.includes("dependency_cycle_detected"), true);

assert.deepEqual(held.authority, {
  git_fetch: false,
  git_pull: false,
  checkout: false,
  reset: false,
  branch_create: false,
  branch_update: false,
  branch_delete: false,
  commit: false,
  push: false,
  pull_request_change: false,
  workflow_rerun: false,
  runtime_mutation: false,
  credential_read: false,
  wallet_or_signer: false,
  transaction: false,
  funds_moved: false,
});

console.log("VOID_PR_STACK_DEPENDENCY_AUDIT_V1_PROOF_GREEN");
console.log("direct_child_hold=true");
console.log("transitive_descendants_visible=true");
console.log("exact_branch_matching=true");
console.log("expected_parent_head_bound=true");
console.log("fail_closed_head_unverified=true");
console.log("dependency_cycle_hold=true");
console.log("mutation_performed=false");
