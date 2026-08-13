#!/usr/bin/env node

import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadCoordinationFiles,
} from "../tools/void-worker-coordination-v3.mjs";
import {
  CoordinationSnapshotFreshnessError,
  MARKER,
  OUTCOME_MAIN_ANCHOR_MATCH,
  OUTCOME_STALE,
  assessCoordinationSnapshotFreshnessV1,
} from "../tools/void-worker-coordination-snapshot-freshness-v1.mjs";

const PROOF_MARKER = "VOID_WORKER_COORDINATION_SNAPSHOT_FRESHNESS_V1_PROOF_GREEN";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROSTER_PATH = path.join(ROOT, "ops/coordination/worker-roster-v1.json");
const STATE_PATH = path.join(ROOT, "ops/coordination/worker-coordination-state-v3.json");

const { roster, state } = await loadCoordinationFiles({
  rosterPath: ROSTER_PATH,
  statePath: STATE_PATH,
});

const matching = assessCoordinationSnapshotFreshnessV1(roster, state, state.main_sha);
assert.equal(matching.marker, MARKER);
assert.equal(matching.version, 1);
assert.equal(matching.outcome, OUTCOME_MAIN_ANCHOR_MATCH);
assert.equal(matching.main_anchor_matches, true);
assert.equal(matching.main_refresh_required, false);
assert.equal(matching.live_refresh_required_before_mutation, true);
assert.equal(matching.snapshot.lifecycle_scope, "point_in_time_only");
assert.equal(matching.snapshot.main_sha, state.main_sha);
assert.equal(matching.observed_main_sha, state.main_sha);
assert.equal(matching.authority_granted, false);
assert.equal(matching.source_mutation_authorized, false);
assert.equal(matching.runtime_mutation_authorized, false);
assert.equal(matching.merge_authority_granted, false);
assert.equal(matching.deployment_authority_granted, false);
assert.equal(Object.isFrozen(matching), true);
assert.equal(Object.isFrozen(matching.snapshot), true);
assert.equal(Object.isFrozen(matching.canonical_prs_requiring_live_reread), true);
assert.equal(Object.isFrozen(matching.live_facts_required_before_mutation), true);
assert.equal(matching.live_facts_required_before_mutation.includes("current_main"), true);
assert.equal(matching.live_facts_required_before_mutation.includes("recent_writes"), true);
assert.equal(matching.live_facts_required_before_mutation.includes("v1_collision_evidence"), true);
assert.equal(matching.tracking_issues_requiring_live_reread.includes(1182), true);
assert.equal(
  matching.canonical_prs_requiring_live_reread.some((entry) => entry.canonical_pr === 1238),
  true,
);

const alternateMain = state.main_sha === "f".repeat(40) ? "e".repeat(40) : "f".repeat(40);
const stale = assessCoordinationSnapshotFreshnessV1(roster, state, alternateMain);
assert.equal(stale.outcome, OUTCOME_STALE);
assert.equal(stale.main_anchor_matches, false);
assert.equal(stale.main_refresh_required, true);
assert.equal(stale.live_refresh_required_before_mutation, true);
assert.equal(stale.snapshot.main_sha, state.main_sha);
assert.equal(stale.observed_main_sha, alternateMain);
assert.deepEqual(
  stale.canonical_prs_requiring_live_reread,
  matching.canonical_prs_requiring_live_reread,
);
assert.deepEqual(
  stale.tracking_issues_requiring_live_reread,
  matching.tracking_issues_requiring_live_reread,
);
assert.equal(stale.authority_granted, false);

assert.throws(
  () => assessCoordinationSnapshotFreshnessV1(roster, state, "ABC"),
  (error) =>
    error instanceof CoordinationSnapshotFreshnessError &&
    /lowercase 40-character SHA-1/.test(error.message),
);
assert.throws(
  () => assessCoordinationSnapshotFreshnessV1(roster, state, "A".repeat(40)),
  (error) =>
    error instanceof CoordinationSnapshotFreshnessError &&
    /lowercase 40-character SHA-1/.test(error.message),
);

console.log(PROOF_MARKER);
console.log(`snapshot_main=${state.main_sha}`);
console.log(`matching_outcome=${matching.outcome}`);
console.log(`stale_outcome=${stale.outcome}`);
console.log(`canonical_pr_rereads=${matching.canonical_prs_requiring_live_reread.length}`);
console.log(`tracking_issue_rereads=${matching.tracking_issues_requiring_live_reread.length}`);
console.log("live_refresh_required_before_mutation=true");
console.log("point_in_time_lifecycle_only=true");
console.log("source_mutation_authorized=false");
console.log("runtime_mutation_authorized=false");
console.log("authority_granted=false");
