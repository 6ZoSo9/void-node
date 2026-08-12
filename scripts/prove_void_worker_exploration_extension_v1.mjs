#!/usr/bin/env node

import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ExplorationValidationError,
  loadExplorationFiles,
  validateExplorationExtension,
} from "../tools/void-worker-exploration-extension-v1.mjs";

const PROOF_MARKER = "VOID_WORKER_EXPLORATION_EXTENSION_V1_PROOF_GREEN";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROSTER_PATH = path.join(ROOT, "ops/coordination/worker-roster-v1.json");
const STATE_PATH = path.join(ROOT, "ops/coordination/worker-coordination-state-v3.json");
const EXTENSION_PATH = path.join(ROOT, "ops/coordination/worker-exploration-extension-v1.json");

function clone(value) {
  return structuredClone(value);
}

function expectRejected(roster, state, extension, pattern) {
  assert.throws(
    () => validateExplorationExtension(roster, state, extension),
    (error) => error instanceof ExplorationValidationError && pattern.test(error.message),
  );
}

const { roster, state, extension } = await loadExplorationFiles({
  rosterPath: ROSTER_PATH,
  statePath: STATE_PATH,
  extensionPath: EXTENSION_PATH,
});

const summary = validateExplorationExtension(roster, state, extension);
assert.equal(summary.valid, true);
assert.deepEqual(summary.doctrine, ["protect_core", "protect_truth", "protect_sovereign"]);
assert.equal(summary.base_worker_count, 9);
assert.equal(summary.new_worker_count, 3);
assert.equal(summary.combined_worker_count, 12);
assert.equal(summary.base_lane_count, 10);
assert.equal(summary.new_research_lane_count, 3);
assert.equal(summary.fallback_exploration_lane_count, 3);
assert.equal(summary.combined_active_or_exploring_worker_count, 12);
assert.deepEqual(summary.idle_base_workers_before_extension, ["curly", "larry", "moe"]);
assert.deepEqual(summary.fallback_exploration_workers, ["curly", "larry", "moe"]);
assert.deepEqual(summary.new_worker_ids, ["darwin", "hopper", "lamarr"]);
assert.deepEqual(summary.new_worker_issue_ids, [1239, 1240, 1241]);
assert.deepEqual(summary.workers_without_active_or_exploration, []);
assert.equal(summary.max_open_exploration_issues_per_worker, 1);
assert.equal(summary.max_open_exploration_prs_per_worker, 1);
assert.equal(summary.candidate_score_threshold, 24);
assert.equal(summary.candidate_score_maximum, 35);
assert.equal(summary.automatic_merge_authority, false);
assert.equal(summary.source_mutation_requires_fresh_v1_check, true);
assert.equal(summary.source_mutation_performed, false);
assert.equal(summary.runtime_mutation_performed, false);
assert.equal(summary.authority_granted, false);

{
  const bad = clone(extension);
  bad.doctrine = ["protect_core", "protect_truth"];
  expectRejected(roster, state, bad, /doctrine/);
}

{
  const bad = clone(extension);
  bad.policy.max_open_exploration_prs_per_worker = 2;
  expectRejected(roster, state, bad, /PR noise budget/);
}

{
  const bad = clone(extension);
  bad.policy.automatic_merge_authority = true;
  expectRejected(roster, state, bad, /automatic merge authority/);
}

{
  const bad = clone(extension);
  bad.policy.source_mutation_requires_fresh_v1_check = false;
  expectRejected(roster, state, bad, /fresh V1 coordination check/);
}

{
  const bad = clone(extension);
  bad.policy.ranked_candidate_required_before_branch = false;
  expectRejected(roster, state, bad, /ranked candidate/);
}

{
  const bad = clone(extension);
  bad.policy.candidate_score_threshold = 36;
  expectRejected(roster, state, bad, /exceeds maximum score/);
}

{
  const bad = clone(extension);
  bad.new_workers[1].id = bad.new_workers[0].id;
  expectRejected(roster, state, bad, /duplicate extension worker id/);
}

{
  const bad = clone(extension);
  bad.new_workers[1].tracking_issue = bad.new_workers[0].tracking_issue;
  expectRejected(roster, state, bad, /duplicate extension tracking issue/);
}

{
  const bad = clone(extension);
  bad.new_workers[0].state = "ACTIVE_SOURCE";
  expectRejected(roster, state, bad, /state must equal ACTIVE_RESEARCH/);
}

{
  const bad = clone(extension);
  bad.new_workers[1].authority_boundary = "too short";
  expectRejected(roster, state, bad, /at least 120 characters/);
}

{
  const bad = clone(extension);
  bad.fallback_exploration_assignments.pop();
  expectRejected(roster, state, bad, /must exactly cover idle active base workers/);
}

{
  const bad = clone(extension);
  bad.fallback_exploration_assignments[0].worker_id = "ren";
  expectRejected(roster, state, bad, /already has an active base lane/);
}

{
  const bad = clone(extension);
  bad.new_workers[0].lane_id = state.lanes[0].id;
  expectRejected(roster, state, bad, /conflicting exploration lane id/);
}

console.log(PROOF_MARKER);
console.log(`base_workers=${summary.base_worker_count}`);
console.log(`new_workers=${summary.new_worker_count}`);
console.log(`combined_workers=${summary.combined_worker_count}`);
console.log("new_worker_ids=hopper,lamarr,darwin");
console.log("fallback_exploration_workers=larry,curly,moe");
console.log("workers_without_active_or_exploration=0");
console.log("exploration_issue_noise_budget=1");
console.log("exploration_pr_noise_budget=1");
console.log("ranked_candidate_required_before_branch=true");
console.log("fresh_v1_check_required_before_source_mutation=true");
console.log("automatic_merge_authority=false");
console.log("source_mutation_performed=false");
console.log("runtime_mutation_performed=false");
console.log("authority_granted=false");
