#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  VOID_PR_PATH_COLLISION_AUDIT_V1,
  auditCandidatePathCollisions,
  auditOpenPrPathCollisions,
  normalizeTouchedPath,
} from "../tools/void-pr-path-collision-audit-v1.mjs";

const SHA_A = "a".repeat(40);
const SHA_B = "b".repeat(40);
const SHA_C = "c".repeat(40);
const SHA_D = "d".repeat(40);
const SHA_E = "e".repeat(40);
const REPO = "6ZoSo9/void-node";

function pr({
  number,
  head,
  base = "main",
  sha,
  draft = true,
  headRepo = REPO,
}) {
  return {
    number,
    title: `PR ${number}`,
    html_url: `https://github.com/6ZoSo9/void-node/pull/${number}`,
    state: "open",
    draft,
    head: {
      ref: head,
      sha,
      repo: { full_name: headRepo },
    },
    base: {
      ref: base,
      repo: { full_name: REPO },
    },
  };
}

function file(filename, previous_filename) {
  return previous_filename === undefined
    ? { filename, status: "modified" }
    : { filename, previous_filename, status: "renamed" };
}

function fileMap(prs, overrides = {}) {
  const result = {};
  for (const entry of prs) {
    result[String(entry.number)] = overrides[entry.number] || [
      file(`fixtures/pr-${entry.number}.txt`),
    ];
  }
  return result;
}

const disjointPrs = [
  pr({ number: 10, head: "feat/alpha", sha: SHA_A }),
  pr({ number: 20, head: "feat/beta", sha: SHA_B }),
];
const disjointCandidate = auditCandidatePathCollisions({
  repository: REPO,
  candidate_paths: ["src/new-lane.ts", "scripts/prove_new_lane.ts"],
  open_prs: disjointPrs,
  pr_files_by_number: fileMap(disjointPrs),
});
assert.equal(disjointCandidate.marker, VOID_PR_PATH_COLLISION_AUDIT_V1);
assert.equal(disjointCandidate.safe_to_publish_candidate_paths, true);
assert.equal(disjointCandidate.decision, "SAFE_NO_OPEN_PR_PATH_COLLISIONS");
assert.equal(disjointCandidate.collision_pr_count, 0);

const candidateCollisionFiles = fileMap(disjointPrs, {
  20: [file("src/new-lane.ts")],
});
const candidateHeld = auditCandidatePathCollisions({
  repository: REPO,
  candidate_paths: ["src/new-lane.ts"],
  open_prs: disjointPrs,
  pr_files_by_number: candidateCollisionFiles,
});
assert.equal(candidateHeld.safe_to_publish_candidate_paths, false);
assert.equal(candidateHeld.decision, "HOLD_OPEN_PR_PATH_COLLISIONS");
assert.deepEqual(candidateHeld.reasons, ["open_pr_path_collision"]);
assert.deepEqual(candidateHeld.collisions[0].overlap_paths, ["src/new-lane.ts"]);

const renameCollisionFiles = fileMap(disjointPrs, {
  10: [file("src/new-name.ts", "src/legacy-name.ts")],
});
const renameHeld = auditCandidatePathCollisions({
  repository: REPO,
  candidate_paths: ["src/legacy-name.ts"],
  open_prs: disjointPrs,
  pr_files_by_number: renameCollisionFiles,
});
assert.equal(renameHeld.safe_to_publish_candidate_paths, false);
assert.deepEqual(renameHeld.collisions[0].overlap_paths, ["src/legacy-name.ts"]);

const prefixSafe = auditCandidatePathCollisions({
  repository: REPO,
  candidate_paths: ["src/node.ts"],
  open_prs: disjointPrs,
  pr_files_by_number: fileMap(disjointPrs, {
    10: [file("src/node.ts.extra")],
  }),
});
assert.equal(prefixSafe.safe_to_publish_candidate_paths, true);

const stackPrs = [
  pr({ number: 100, head: "feat/parent", sha: SHA_A }),
  pr({
    number: 110,
    head: "feat/child",
    base: "feat/parent",
    sha: SHA_B,
  }),
  pr({
    number: 120,
    head: "feat/grandchild",
    base: "feat/child",
    sha: SHA_C,
  }),
  pr({
    number: 130,
    head: "feat/sibling",
    base: "feat/parent",
    sha: SHA_D,
  }),
  pr({ number: 140, head: "feat/unrelated", sha: SHA_E }),
];
const shared = "src/shared.ts";
const stackFiles = fileMap(stackPrs, {
  100: [file(shared)],
  110: [file(shared), file("src/child.ts")],
  120: [file(shared)],
  130: [file(shared)],
  140: [file("src/unrelated.ts")],
});

const childAudit = auditOpenPrPathCollisions({
  repository: REPO,
  target_pr_number: 110,
  expected_target_head: SHA_B,
  open_prs: stackPrs,
  pr_files_by_number: stackFiles,
});
assert.equal(childAudit.safe_to_work_without_unrelated_collision, false);
assert.equal(childAudit.decision, "HOLD_PR_PATH_COLLISION_AUDIT");
assert.equal(childAudit.stack_related_overlap_count, 2);
assert.deepEqual(
  childAudit.stack_related_overlaps.map((row) => [row.pr_number, row.relation]),
  [[100, "ancestor"], [120, "descendant"]],
);
assert.equal(childAudit.unrelated_overlap_count, 1);
assert.equal(childAudit.unrelated_overlaps[0].pr_number, 130);
assert.deepEqual(childAudit.reasons, ["unrelated_open_pr_path_collision"]);

const stackOnlyPrs = stackPrs.filter((entry) => entry.number !== 130);
const stackOnlyFiles = {};
for (const entry of stackOnlyPrs) {
  stackOnlyFiles[String(entry.number)] = stackFiles[String(entry.number)];
}
const stackOnlyAudit = auditOpenPrPathCollisions({
  repository: REPO,
  target_pr_number: 110,
  expected_target_head: SHA_B,
  open_prs: stackOnlyPrs,
  pr_files_by_number: stackOnlyFiles,
});
assert.equal(stackOnlyAudit.safe_to_work_without_unrelated_collision, true);
assert.equal(
  stackOnlyAudit.decision,
  "SAFE_NO_UNRELATED_OPEN_PR_PATH_COLLISIONS",
);
assert.equal(stackOnlyAudit.stack_related_overlap_count, 2);
assert.equal(stackOnlyAudit.unrelated_overlap_count, 0);

const mismatch = auditOpenPrPathCollisions({
  repository: REPO,
  target_pr_number: 110,
  expected_target_head: SHA_D,
  open_prs: stackOnlyPrs,
  pr_files_by_number: stackOnlyFiles,
});
assert.equal(mismatch.safe_to_work_without_unrelated_collision, false);
assert.deepEqual(mismatch.reasons, ["target_head_mismatch"]);

const duplicateHeadPrs = [
  pr({ number: 200, head: "feat/dup", sha: SHA_A }),
  pr({ number: 201, head: "feat/dup", base: "release", sha: SHA_B }),
];
const duplicateHeadAudit = auditOpenPrPathCollisions({
  repository: REPO,
  target_pr_number: 200,
  open_prs: duplicateHeadPrs,
  pr_files_by_number: fileMap(duplicateHeadPrs),
});
assert.equal(duplicateHeadAudit.safe_to_work_without_unrelated_collision, false);
assert.deepEqual(duplicateHeadAudit.reasons, ["local_head_branch_ambiguous"]);

assert.throws(
  () => normalizeTouchedPath(" src/bad.ts"),
  /github_file_path_invalid/,
);
assert.throws(
  () =>
    auditCandidatePathCollisions({
      repository: REPO,
      candidate_paths: ["src/a.ts", "src/a.ts"],
      open_prs: [],
      pr_files_by_number: {},
    }),
  /candidate_path_duplicate/,
);
assert.throws(
  () =>
    auditCandidatePathCollisions({
      repository: REPO,
      candidate_paths: ["src/a.ts"],
      open_prs: disjointPrs,
      pr_files_by_number: { 10: [file("src/a.ts")] },
    }),
  /github_pr_file_map_missing:#20/,
);

assert.deepEqual(stackOnlyAudit.authority, {
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

console.log("VOID_PR_PATH_COLLISION_AUDIT_V1_PROOF_GREEN");
console.log("candidate_path_collision_detected=true");
console.log("rename_source_collision_detected=true");
console.log("exact_path_matching=true");
console.log("stack_ancestor_descendant_overlap_classified=true");
console.log("sibling_overlap_unrelated=true");
console.log("expected_head_binding=true");
console.log("incomplete_file_map_fail_closed=true");
console.log("mutation_performed=false");
