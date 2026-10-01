#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  MARKER,
  CoordinationRotationLiveSnapshotError,
  buildCoordinationRotationLiveSnapshotV1,
  gitBlobShaV1,
} from "../tools/void-coordination-rotation-live-snapshot-v1.mjs";
import {
  resolveCoordinationSuccessorChainRecordsV1,
} from "../tools/void-coordination-successor-chain-v1.mjs";

const PROOF_MARKER =
  "VOID_COORDINATION_ROTATION_LIVE_SNAPSHOT_V1_PROOF_GREEN";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const POLICY_PATH = path.join(
  ROOT,
  "ops/coordination/worker-live-dispatch-policy-v1.json",
);
const policyBytes = fs.readFileSync(POLICY_PATH, "utf8");
const policyRaw = JSON.parse(policyBytes);
const policyBlobSha = gitBlobShaV1(policyBytes);
const POLICY_REPOSITORY_PATH =
  "ops/coordination/worker-live-dispatch-policy-v1.json";
const MAIN = "a".repeat(40);
const CAPTURED_AT = "2026-10-01T21:00:00.000Z";

function comment(id, body = "coordination evidence") {
  return { id, body };
}

function comments(count, lastBody = null) {
  const values = Array.from(
    { length: count },
    (_, index) => comment(index + 1),
  );
  if (lastBody !== null && values.length > 0) {
    values[values.length - 1] = comment(values.length, lastBody);
  }
  return values;
}

function record(number, state, commentCount, lastBody = null) {
  return {
    issue: {
      number,
      state,
      comments: commentCount,
      updated_at: "2026-10-01T20:30:00Z",
    },
    comments: comments(commentCount, lastBody),
  };
}

function rotationChain() {
  return resolveCoordinationSuccessorChainRecordsV1({
    "1507": record(1507, "open", 349),
  });
}

function successorChain() {
  const pointer = [
    "## CONTROL-PLANE ROTATION",
    "COORDINATION_SUCCESSOR=#2400",
  ].join("\n");
  return resolveCoordinationSuccessorChainRecordsV1({
    "1507": record(1507, "closed", 349, pointer),
    "2400": {
      issue: {
        number: 2400,
        state: "open",
        comments: 5,
        updated_at: "2026-10-01T20:35:00Z",
      },
      comments: comments(5),
    },
  });
}

function summary({
  number = 2302,
  title = "feat(coordination): add Ada rotation preparation snapshot",
  draft = true,
  head = "b".repeat(40),
  base = "c".repeat(40),
  updatedAt = "2026-10-01T20:40:00Z",
} = {}) {
  return {
    number,
    title,
    state: "open",
    draft,
    head_sha: head,
    base_sha: base,
    updated_at: updatedAt,
  };
}

function capture({
  value = summary(),
  changedFiles = 2,
  paths = [
    "docs/operations/example.md",
    "tools/example.mjs",
  ],
} = {}) {
  return {
    before: {
      ...value,
      changed_files: changedFiles,
    },
    after: {
      ...value,
      changed_files: changedFiles,
    },
    changed_paths: paths,
  };
}

function input(overrides = {}) {
  const pr = summary();
  const chain = rotationChain();
  return {
    repository: "6ZoSo9/void-node",
    rootIssue: 1507,
    capturedAt: CAPTURED_AT,
    policyPath: POLICY_REPOSITORY_PATH,
    policyBytes,
    policyBlobSha,
    mainBefore: MAIN,
    mainAfter: MAIN,
    chainBefore: chain,
    chainAfter: chain,
    openPrListBefore: [pr],
    openPrListAfter: [pr],
    pullRequestCaptures: [capture({ value: pr })],
    ...overrides,
  };
}

function expectRejected(operation, pattern) {
  assert.throws(
    operation,
    (error) =>
      error instanceof CoordinationRotationLiveSnapshotError
      && pattern.test(error.message),
  );
}

const ready = buildCoordinationRotationLiveSnapshotV1(input());
assert.equal(MARKER, "VOID_COORDINATION_ROTATION_LIVE_SNAPSHOT_V1");
assert.equal(ready.marker, MARKER);
assert.equal(ready.version, 1);
assert.equal(ready.repository, "6ZoSo9/void-node");
assert.equal(ready.root_issue, 1507);
assert.equal(ready.captured_at, CAPTURED_AT);
assert.equal(ready.main_sha, MAIN);
assert.equal(ready.policy_path, POLICY_REPOSITORY_PATH);
assert.equal(ready.policy_blob_sha, policyBlobSha);
assert.equal(ready.open_pull_request_count, 1);
assert.equal(ready.successor_chain_outcome, "ROTATION_REQUIRED");
assert.equal(ready.snapshot_outcome, "ROTATION_PREPARATION_READY");
assert.equal(ready.snapshot.rotation_preparation_ready, true);
assert.equal(ready.snapshot.successor_creation_required, true);
assert.equal(ready.snapshot.rotation_writer_worker_id, "ada");
assert.equal(
  ready.snapshot.scheduled_worker_count,
  policyRaw.workers.length,
);
assert.deepEqual(
  ready.snapshot.scheduled_workers.map((worker) => worker.id),
  [...policyRaw.workers]
    .map((worker) => worker.id)
    .sort((a, b) => a.localeCompare(b)),
);
assert.equal(ready.live_capture_consistent, true);
assert.equal(ready.point_in_time_only, true);
assert.equal(ready.live_refresh_required_before_successor_write, true);
assert.equal(ready.issue_creation_authorized, false);
assert.equal(ready.issue_close_authorized, false);
assert.equal(ready.comment_post_authorized, false);
assert.equal(ready.scheduler_mutation_authorized, false);
assert.equal(ready.source_mutation_authorized, false);
assert.equal(ready.runtime_mutation_authorized, false);
assert.equal(ready.automatic_merge_authorized, false);
assert.equal(ready.authority_granted, false);
assert.equal(ready.mutation_performed, false);
assert.match(ready.live_capture_id, /^sha256:[0-9a-f]{64}$/u);
assert.match(ready.snapshot_id, /^sha256:[0-9a-f]{64}$/u);
assert.equal(Object.isFrozen(ready), true);
assert.equal(Object.isFrozen(ready.snapshot), true);

const reorderedPaths = buildCoordinationRotationLiveSnapshotV1(
  input({
    pullRequestCaptures: [
      capture({
        paths: [
          "tools/example.mjs",
          "docs/operations/example.md",
        ],
      }),
    ],
  }),
);
assert.equal(reorderedPaths.live_capture_id, ready.live_capture_id);
assert.deepEqual(reorderedPaths.snapshot, ready.snapshot);

const resolved = successorChain();
const successorPr = summary({
  number: 2305,
  title: "reviewed successor work",
  head: "d".repeat(40),
  base: "e".repeat(40),
  updatedAt: "2026-10-01T20:45:00Z",
});
const successor = buildCoordinationRotationLiveSnapshotV1(
  input({
    chainBefore: resolved,
    chainAfter: resolved,
    openPrListBefore: [successorPr],
    openPrListAfter: [successorPr],
    pullRequestCaptures: [
      capture({
        value: successorPr,
        changedFiles: 1,
        paths: ["tools/successor.mjs"],
      }),
    ],
  }),
);
assert.equal(successor.successor_chain_outcome, "SUCCESSOR_RESOLVED");
assert.equal(successor.snapshot_outcome, "SUCCESSOR_ALREADY_RESOLVED");
assert.equal(successor.snapshot.policy_plan_issue_rebind_required, true);
assert.equal(successor.snapshot.successor_creation_required, false);

expectRejected(
  () =>
    buildCoordinationRotationLiveSnapshotV1(
      input({
        policyBytes: policyBytes + "\n",
      }),
    ),
  /policy bytes do not match captured Git blob SHA/,
);

expectRejected(
  () =>
    buildCoordinationRotationLiveSnapshotV1(
      input({
        policyBlobSha: "f".repeat(40),
      }),
    ),
  /policy bytes do not match captured Git blob SHA/,
);

expectRejected(
  () =>
    buildCoordinationRotationLiveSnapshotV1(
      input({
        policyPath: "../policy.json",
      }),
    ),
  /normalized repository-relative path/,
);

expectRejected(
  () =>
    buildCoordinationRotationLiveSnapshotV1(
      input({ mainAfter: "f".repeat(40) }),
    ),
  /current main changed during live capture/,
);

expectRejected(
  () =>
    buildCoordinationRotationLiveSnapshotV1(
      input({ chainAfter: successorChain() }),
    ),
  /successor chain changed during live capture/,
);

const secondPr = summary({
  number: 2303,
  title: "second open PR",
  head: "d".repeat(40),
  base: "e".repeat(40),
  updatedAt: "2026-10-01T20:41:00Z",
});
expectRejected(
  () =>
    buildCoordinationRotationLiveSnapshotV1(
      input({
        openPrListAfter: [summary(), secondPr],
      }),
    ),
  /open PR census changed during live capture/,
);

const driftingPr = summary();
expectRejected(
  () =>
    buildCoordinationRotationLiveSnapshotV1(
      input({
        pullRequestCaptures: [
          {
            before: {
              ...driftingPr,
              changed_files: 2,
            },
            after: {
              ...driftingPr,
              head_sha: "f".repeat(40),
              changed_files: 2,
            },
            changed_paths: [
              "docs/operations/example.md",
              "tools/example.mjs",
            ],
          },
        ],
      }),
    ),
  /changed during live capture/,
);

expectRejected(
  () =>
    buildCoordinationRotationLiveSnapshotV1(
      input({
        pullRequestCaptures: [
          capture({
            changedFiles: 2,
            paths: ["tools/example.mjs"],
          }),
        ],
      }),
    ),
  /changed path count mismatch/,
);

expectRejected(
  () =>
    buildCoordinationRotationLiveSnapshotV1(
      input({
        pullRequestCaptures: [],
      }),
    ),
  /open PR count differs from detailed captures/,
);

const duplicatePr = summary();
expectRejected(
  () =>
    buildCoordinationRotationLiveSnapshotV1(
      input({
        openPrListBefore: [duplicatePr, duplicatePr],
        openPrListAfter: [duplicatePr, duplicatePr],
        pullRequestCaptures: [
          capture({ value: duplicatePr }),
          capture({ value: duplicatePr }),
        ],
      }),
    ),
  /duplicate PR numbers/,
);

expectRejected(
  () =>
    buildCoordinationRotationLiveSnapshotV1(
      input({
        pullRequestCaptures: [
          capture({
            paths: [
              "../escape.md",
              "tools/example.mjs",
            ],
          }),
        ],
      }),
    ),
  /normalized repository-relative path/,
);

expectRejected(
  () =>
    buildCoordinationRotationLiveSnapshotV1(
      input({
        repository: "6ZoSo9/other",
      }),
    ),
  /successor chain repository does not match/,
);

expectRejected(
  () =>
    buildCoordinationRotationLiveSnapshotV1(
      input({
        rootIssue: 999,
      }),
    ),
  /successor chain root issue does not match/,
);

const maxPaths = Array.from(
  { length: 500 },
  (_, index) => "generated/path-" + String(index).padStart(3, "0") + ".txt",
);
const maxPr = summary({
  number: 2310,
  title: "max changed-path boundary",
  head: "1".repeat(40),
  base: "2".repeat(40),
  updatedAt: "2026-10-01T20:50:00Z",
});
const maxBoundary = buildCoordinationRotationLiveSnapshotV1(
  input({
    openPrListBefore: [maxPr],
    openPrListAfter: [maxPr],
    pullRequestCaptures: [
      capture({
        value: maxPr,
        changedFiles: 500,
        paths: maxPaths,
      }),
    ],
  }),
);
assert.equal(maxBoundary.open_pull_request_count, 1);
assert.equal(maxBoundary.snapshot.open_pull_requests[0].changed_path_count, 500);

expectRejected(
  () =>
    buildCoordinationRotationLiveSnapshotV1(
      input({
        openPrListBefore: [maxPr],
        openPrListAfter: [maxPr],
        pullRequestCaptures: [
          capture({
            value: maxPr,
            changedFiles: 501,
            paths: [
              ...maxPaths,
              "generated/path-500.txt",
            ],
          }),
        ],
      }),
    ),
  /changed_files exceeds 500/,
);

const repeated = buildCoordinationRotationLiveSnapshotV1(input());
assert.equal(repeated.live_capture_id, ready.live_capture_id);
assert.deepEqual(repeated, ready);

console.log(PROOF_MARKER);
console.log("rotation_preparation_ready=true");
console.log("successor_resolved_rebind_detected=true");
console.log("policy_git_blob_bound=true");
console.log("policy_tamper_rejected=true");
console.log("current_main_race_rejected=true");
console.log("successor_chain_race_rejected=true");
console.log("open_pr_census_race_rejected=true");
console.log("per_pr_metadata_race_rejected=true");
console.log("changed_path_truncation_rejected=true");
console.log("missing_pr_capture_rejected=true");
console.log("duplicate_pr_rejected=true");
console.log("unsafe_path_rejected=true");
console.log("exact_500_changed_paths_accepted=true");
console.log("501_changed_paths_rejected=true");
console.log("live_capture_id_deterministic=true");
console.log("authority_granted=false");
console.log("mutation_performed=false");
