#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  CoordinationRotationSnapshotError,
  EVIDENCE_MARKER,
  MARKER,
  buildCoordinationRotationSnapshotV1,
} from "../tools/void-coordination-rotation-snapshot-v1.mjs";
import {
  MARKER as SUCCESSOR_CHAIN_MARKER,
  ROTATION_THRESHOLD_TOTAL_MESSAGES,
  ROTATION_WRITER_WORKER_ID,
} from "../tools/void-coordination-successor-chain-v1.mjs";
import {
  POLICY_MARKER as LIVE_DISPATCH_POLICY_MARKER,
} from "../tools/void-worker-coordination-live-dispatch-v1.mjs";

const PROOF_MARKER =
  "VOID_COORDINATION_ROTATION_SNAPSHOT_V1_PROOF_GREEN";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const POLICY_PATH = path.join(
  ROOT,
  "ops/coordination/worker-live-dispatch-policy-v1.json",
);
const policyRaw = JSON.parse(fs.readFileSync(POLICY_PATH, "utf8"));
const MAIN = "a".repeat(40);

function expectRejected(operation, pattern) {
  assert.throws(
    operation,
    (error) =>
      error instanceof CoordinationRotationSnapshotError
      && pattern.test(error.message),
  );
}

function terminalIssue({
  number = 1507,
  state = "open",
  comments = 344,
  totalMessages = comments + 1,
  successor = null,
  rotationRequired = true,
} = {}) {
  return {
    issue_number: number,
    issue_state: state,
    issue_updated_at: "2026-10-01T19:13:19.000Z",
    comment_count: comments,
    total_issue_messages: totalMessages,
    rotation_threshold_total_messages: 250,
    successor_issue: successor,
    rotation_pointer_comment_id: null,
    rotation_required_here: rotationRequired,
  };
}

function chain(overrides = {}) {
  const terminal = terminalIssue();
  return {
    marker: SUCCESSOR_CHAIN_MARKER,
    version: 1,
    repository_scope: "6ZoSo9/void-node",
    root_issue: 1507,
    current_issue: 1507,
    outcome: "ROTATION_REQUIRED",
    chain_valid: true,
    hold_reasons: [],
    rotation_required: true,
    rotation_writer_worker_id: ROTATION_WRITER_WORKER_ID,
    rotation_threshold_total_messages:
      ROTATION_THRESHOLD_TOTAL_MESSAGES,
    chain_issue_numbers: [1507],
    chain: [terminal],
    dispatch_plan_issue_should_be: 1507,
    plan_issue_update_required: false,
    issue_creation_authorized: false,
    issue_close_authorized: false,
    scheduler_mutation_authorized: false,
    source_mutation_authorized: false,
    runtime_mutation_authorized: false,
    authority_granted: false,
    mutation_performed: false,
    ...overrides,
  };
}

function openPr({
  number,
  title,
  draft,
  head,
  base,
  updatedAt,
  changedPaths,
}) {
  return {
    number,
    title,
    draft,
    head_sha: head,
    base_sha: base,
    updated_at: updatedAt,
    changed_paths: changedPaths,
  };
}

function evidence({
  chainValue = chain(),
  prs = [
    openPr({
      number: 2299,
      title: "fix(ops): isolate Precision recovery Git provenance reads",
      draft: true,
      head: "b".repeat(40),
      base: "c".repeat(40),
      updatedAt: "2026-10-01T19:18:01.000Z",
      changedPaths: [
        "tools/z.mjs",
        "docs/a.md",
      ],
    }),
    openPr({
      number: 2290,
      title: "feat(security): bind reviewed ethers execution bytes",
      draft: true,
      head: "d".repeat(40),
      base: "e".repeat(40),
      updatedAt: "2026-10-01T19:20:12.000Z",
      changedPaths: [
        "tools/security.mjs",
      ],
    }),
  ],
  main = MAIN,
} = {}) {
  return {
    marker: EVIDENCE_MARKER,
    version: 1,
    observed_main_sha: main,
    chain: chainValue,
    open_pull_requests: prs,
  };
}

assert.equal(MARKER, "VOID_COORDINATION_ROTATION_SNAPSHOT_V1");
assert.equal(
  EVIDENCE_MARKER,
  "VOID_COORDINATION_ROTATION_SNAPSHOT_EVIDENCE_V1",
);
assert.equal(SUCCESSOR_CHAIN_MARKER, "VOID_COORDINATION_SUCCESSOR_CHAIN_V1");
assert.equal(
  LIVE_DISPATCH_POLICY_MARKER,
  "VOID_WORKER_LIVE_DISPATCH_POLICY_V1",
);
assert.equal(ROTATION_THRESHOLD_TOTAL_MESSAGES, 250);
assert.equal(ROTATION_WRITER_WORKER_ID, "ada");
assert.equal(policyRaw.marker, LIVE_DISPATCH_POLICY_MARKER);
assert.equal(policyRaw.plan_issue, 1507);
assert.equal(policyRaw.workers.length, 15);

const rotation = buildCoordinationRotationSnapshotV1(
  policyRaw,
  evidence(),
);
assert.equal(rotation.marker, MARKER);
assert.equal(rotation.version, 1);
assert.equal(rotation.repository, "6ZoSo9/void-node");
assert.equal(rotation.observed_main_sha, MAIN);
assert.match(rotation.live_dispatch_policy_sha256, /^sha256:[0-9a-f]{64}$/u);
assert.match(rotation.successor_chain_sha256, /^sha256:[0-9a-f]{64}$/u);
assert.match(rotation.open_pull_request_evidence_sha256, /^sha256:[0-9a-f]{64}$/u);
assert.equal(rotation.outcome, "ROTATION_PREPARATION_READY");
assert.equal(rotation.rotation_preparation_ready, true);
assert.equal(rotation.successor_creation_required, true);
assert.equal(rotation.rotation_writer_worker_id, "ada");
assert.equal(rotation.rotation_threshold_total_messages, 250);
assert.equal(rotation.root_issue, 1507);
assert.equal(rotation.resolved_current_issue, 1507);
assert.equal(rotation.current_hub_comment_count, 344);
assert.equal(rotation.current_hub_total_messages, 345);
assert.equal(rotation.rotation_required, true);
assert.equal(rotation.policy_plan_issue, 1507);
assert.equal(rotation.policy_plan_issue_matches_current, true);
assert.equal(rotation.policy_plan_issue_rebind_required, false);
assert.equal(rotation.scheduled_worker_count, 15);
assert.equal(rotation.scheduled_workers.length, 15);
assert.deepEqual(
  rotation.scheduled_workers.map((worker) => worker.id),
  [
    "ada",
    "curly",
    "darwin",
    "dijkstra",
    "feynman",
    "grace",
    "hopper",
    "katherine",
    "keller",
    "lamarr",
    "larry",
    "moe",
    "satoshi",
    "shannon",
    "turing",
  ],
);
assert.equal(rotation.open_pull_request_count, 2);
assert.deepEqual(
  rotation.open_pull_requests.map((pr) => pr.number),
  [2290, 2299],
);
assert.deepEqual(
  rotation.open_pull_requests.find((pr) => pr.number === 2299).changed_paths,
  ["docs/a.md", "tools/z.mjs"],
);
assert.match(
  rotation.open_pull_requests[0].changed_paths_sha256,
  /^sha256:[0-9a-f]{64}$/u,
);
assert.equal(rotation.ownership_scope, "open_pull_requests_only");
assert.equal(rotation.ownership_complete, false);
assert.equal(rotation.issue_lane_refresh_required, true);
assert.equal(rotation.dependency_graph_refresh_required, true);
assert.equal(rotation.recent_coordination_comment_refresh_required, true);
assert.equal(rotation.open_issue_refresh_required, true);
assert.equal(rotation.successor_body_generation_authorized, false);
assert.equal(rotation.successor_issue_creation_authorized, false);
assert.equal(rotation.predecessor_issue_close_authorized, false);
assert.equal(rotation.comment_post_authorized, false);
assert.equal(rotation.scheduler_mutation_authorized, false);
assert.equal(rotation.source_mutation_authorized, false);
assert.equal(rotation.runtime_mutation_authorized, false);
assert.equal(rotation.automatic_merge_authorized, false);
assert.equal(rotation.authority_granted, false);
assert.equal(rotation.mutation_performed, false);
assert.match(rotation.snapshot_id, /^sha256:[0-9a-f]{64}$/u);
assert.equal(Object.isFrozen(rotation), true);
assert.equal(Object.isFrozen(rotation.open_pull_requests), true);

const reordered = evidence({
  prs: [
    evidence().open_pull_requests[1],
    {
      ...evidence().open_pull_requests[0],
      changed_paths: ["docs/a.md", "tools/z.mjs"],
    },
  ],
});
const reorderedResult = buildCoordinationRotationSnapshotV1(
  policyRaw,
  reordered,
);
assert.equal(reorderedResult.snapshot_id, rotation.snapshot_id);
assert.deepEqual(reorderedResult, rotation);

const resolvedTerminal = terminalIssue({
  number: 1600,
  comments: 10,
  totalMessages: 11,
  rotationRequired: false,
});
const successorResolved = buildCoordinationRotationSnapshotV1(
  policyRaw,
  evidence({
    chainValue: chain({
      current_issue: 1600,
      outcome: "SUCCESSOR_RESOLVED",
      rotation_required: false,
      chain_issue_numbers: [1507, 1600],
      chain: [
        terminalIssue({
          number: 1507,
          state: "closed",
          comments: 249,
          totalMessages: 250,
          successor: 1600,
          rotationRequired: false,
        }),
        resolvedTerminal,
      ],
      dispatch_plan_issue_should_be: 1600,
      plan_issue_update_required: true,
    }),
  }),
);
assert.equal(successorResolved.outcome, "SUCCESSOR_ALREADY_RESOLVED");
assert.equal(successorResolved.rotation_preparation_ready, false);
assert.equal(successorResolved.successor_creation_required, false);
assert.equal(successorResolved.resolved_current_issue, 1600);
assert.equal(successorResolved.policy_plan_issue_matches_current, false);
assert.equal(successorResolved.policy_plan_issue_rebind_required, true);

const notDue = buildCoordinationRotationSnapshotV1(
  policyRaw,
  evidence({
    chainValue: chain({
      outcome: "CURRENT",
      rotation_required: false,
      chain: [
        terminalIssue({
          comments: 100,
          totalMessages: 101,
          rotationRequired: false,
        }),
      ],
    }),
  }),
);
assert.equal(notDue.outcome, "ROTATION_NOT_DUE");
assert.equal(notDue.rotation_preparation_ready, false);
assert.equal(notDue.successor_creation_required, false);

const invalid = buildCoordinationRotationSnapshotV1(
  policyRaw,
  evidence({
    chainValue: chain({
      outcome: "HOLD_INVALID_SUCCESSOR_CHAIN",
      chain_valid: false,
      hold_reasons: ["terminal_issue_not_open:#1507"],
      rotation_required: false,
      chain: [
        terminalIssue({
          state: "closed",
          rotationRequired: false,
        }),
      ],
      dispatch_plan_issue_should_be: null,
      plan_issue_update_required: false,
    }),
  }),
);
assert.equal(invalid.outcome, "HOLD_INVALID_SUCCESSOR_CHAIN");
assert.equal(invalid.rotation_preparation_ready, false);

const stalePolicy = structuredClone(policyRaw);
stalePolicy.plan_issue = 1600;
const stalePolicySnapshot = buildCoordinationRotationSnapshotV1(
  stalePolicy,
  evidence(),
);
assert.equal(
  stalePolicySnapshot.outcome,
  "HOLD_POLICY_PLAN_ISSUE_MISMATCH",
);
assert.equal(stalePolicySnapshot.rotation_preparation_ready, false);
assert.equal(stalePolicySnapshot.policy_plan_issue_rebind_required, true);

expectRejected(
  () => buildCoordinationRotationSnapshotV1(
    policyRaw,
    evidence({
      chainValue: chain({
        authority_granted: true,
      }),
    }),
  ),
  /authority_granted must remain false/,
);

expectRejected(
  () => buildCoordinationRotationSnapshotV1(
    policyRaw,
    evidence({
      chainValue: chain({
        current_issue: 1600,
        outcome: "SUCCESSOR_RESOLVED",
        rotation_required: false,
        chain_issue_numbers: [1507, 1600],
        chain: [
          terminalIssue({
            number: 1507,
            state: "closed",
            comments: 249,
            totalMessages: 250,
            successor: 1700,
            rotationRequired: false,
          }),
          terminalIssue({
            number: 1600,
            comments: 10,
            totalMessages: 11,
            rotationRequired: false,
          }),
        ],
        dispatch_plan_issue_should_be: 1600,
        plan_issue_update_required: true,
      }),
    }),
  ),
  /successor-chain link mismatch/,
);

expectRejected(
  () => buildCoordinationRotationSnapshotV1(
    policyRaw,
    evidence({
      chainValue: chain({
        outcome: "HOLD_INVALID_SUCCESSOR_CHAIN",
        chain_valid: false,
        hold_reasons: [],
        rotation_required: false,
        chain: [
          terminalIssue({
            state: "closed",
            rotationRequired: false,
          }),
        ],
        dispatch_plan_issue_should_be: null,
      }),
    }),
  ),
  /must retain hold reasons/,
);

expectRejected(
  () => buildCoordinationRotationSnapshotV1(
    policyRaw,
    evidence({
      chainValue: chain({
        chain: [
          terminalIssue({
            comments: 100,
            totalMessages: 101,
          }),
        ],
      }),
    }),
  ),
  /rotation-required chain is below the message threshold/,
);

expectRejected(
  () => buildCoordinationRotationSnapshotV1(
    policyRaw,
    evidence({
      prs: [
        evidence().open_pull_requests[0],
        evidence().open_pull_requests[0],
      ],
    }),
  ),
  /duplicate PR numbers/,
);

expectRejected(
  () => buildCoordinationRotationSnapshotV1(
    policyRaw,
    evidence({
      prs: [
        openPr({
          number: 1,
          title: "bad path",
          draft: true,
          head: "b".repeat(40),
          base: "c".repeat(40),
          updatedAt: "2026-10-01T19:18:01.000Z",
          changedPaths: ["../outside"],
        }),
      ],
    }),
  ),
  /invalid path segments/,
);

expectRejected(
  () => buildCoordinationRotationSnapshotV1(
    policyRaw,
    {
      ...evidence(),
      observed_main_sha: "ABC",
    },
  ),
  /lowercase 40-character SHA-1/,
);

expectRejected(
  () => buildCoordinationRotationSnapshotV1(
    policyRaw,
    {
      ...evidence(),
      extra: true,
    },
  ),
  /keys mismatch/,
);

console.log(PROOF_MARKER);
console.log("rotation_preparation_ready=true");
console.log("rotation_writer_worker_id=ada");
console.log("scheduled_workers=15");
console.log("open_pr_ownership_scope_is_partial=true");
console.log("issue_lane_refresh_required=true");
console.log("dependency_graph_refresh_required=true");
console.log("successor_resolved_detected=true");
console.log("stale_policy_plan_issue_detected=true");
console.log("invalid_chain_holds=true");
console.log("pr_order_deterministic=true");
console.log("forged_chain_link_rejected=true");
console.log("snapshot_lineage_content_addressed=true");
console.log("authority_granted=false");
console.log("mutation_performed=false");
