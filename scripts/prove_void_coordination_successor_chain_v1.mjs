#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  CoordinationSuccessorChainError,
  DEFAULT_ROOT_ISSUE,
  MARKER,
  ROTATION_THRESHOLD_TOTAL_MESSAGES,
  ROTATION_WRITER_WORKER_ID,
  inspectCoordinationIssueV1,
  resolveCoordinationSuccessorChainRecordsV1,
} from "../tools/void-coordination-successor-chain-v1.mjs";

const PROOF_MARKER = "VOID_COORDINATION_SUCCESSOR_CHAIN_V1_PROOF_GREEN";

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
      updated_at: "2026-10-01T00:00:00Z",
    },
    comments: comments(commentCount, lastBody),
  };
}

function expectRejected(operation, pattern) {
  assert.throws(
    operation,
    (error) =>
      error instanceof CoordinationSuccessorChainError
      && pattern.test(error.message),
  );
}

assert.equal(MARKER, "VOID_COORDINATION_SUCCESSOR_CHAIN_V1");
assert.equal(DEFAULT_ROOT_ISSUE, 1507);
assert.equal(ROTATION_THRESHOLD_TOTAL_MESSAGES, 250);
assert.equal(ROTATION_WRITER_WORKER_ID, "ada");

const below = resolveCoordinationSuccessorChainRecordsV1({
  "1507": record(1507, "open", 248),
});
assert.equal(below.outcome, "CURRENT");
assert.equal(below.rotation_required, false);
assert.equal(below.current_issue, 1507);
assert.deepEqual(below.chain_issue_numbers, [1507]);
assert.equal(below.dispatch_plan_issue_should_be, 1507);
assert.equal(below.plan_issue_update_required, false);
assert.equal(below.authority_granted, false);
assert.equal(below.mutation_performed, false);

const atThreshold = resolveCoordinationSuccessorChainRecordsV1({
  "1507": record(1507, "open", 249),
});
assert.equal(atThreshold.outcome, "ROTATION_REQUIRED");
assert.equal(atThreshold.rotation_required, true);
assert.equal(atThreshold.current_issue, 1507);
assert.equal(atThreshold.chain[0].total_issue_messages, 250);
assert.equal(atThreshold.chain[0].rotation_required_here, true);
assert.equal(atThreshold.rotation_writer_worker_id, "ada");
assert.equal(atThreshold.issue_creation_authorized, false);
assert.equal(atThreshold.issue_close_authorized, false);

const overThreshold = resolveCoordinationSuccessorChainRecordsV1({
  "1507": record(1507, "open", 277),
});
assert.equal(overThreshold.outcome, "ROTATION_REQUIRED");
assert.equal(overThreshold.chain[0].total_issue_messages, 278);

const pointerBody = [
  "COORDINATION_SUCCESSOR=#1600",
  "CONTROL-PLANE ROTATION",
].join("\n");
const successor = resolveCoordinationSuccessorChainRecordsV1({
  "1507": record(1507, "closed", 249, pointerBody),
  "1600": record(1600, "open", 10),
});
const headingPointer = resolveCoordinationSuccessorChainRecordsV1({
  "1507": record(
    1507,
    "closed",
    249,
    [
      "## CONTROL-PLANE ROTATION",
      "COORDINATION_SUCCESSOR=#1600",
    ].join("\n"),
  ),
  "1600": record(1600, "open", 10),
});
assert.equal(headingPointer.outcome, "SUCCESSOR_RESOLVED");
assert.equal(successor.outcome, "SUCCESSOR_RESOLVED");
assert.equal(successor.chain_valid, true);
assert.equal(successor.rotation_required, false);
assert.equal(successor.current_issue, 1600);
assert.deepEqual(successor.chain_issue_numbers, [1507, 1600]);
assert.equal(successor.dispatch_plan_issue_should_be, 1600);
assert.equal(successor.plan_issue_update_required, true);
assert.equal(successor.chain[0].successor_issue, 1600);
assert.equal(successor.chain[0].rotation_pointer_comment_id, 249);

const openPredecessor = resolveCoordinationSuccessorChainRecordsV1({
  "1507": record(1507, "open", 249, pointerBody),
  "1600": record(1600, "open", 10),
});
assert.equal(openPredecessor.outcome, "HOLD_INVALID_SUCCESSOR_CHAIN");
assert.equal(openPredecessor.chain_valid, false);
assert.deepEqual(
  openPredecessor.hold_reasons,
  ["predecessor_with_successor_still_open:#1507"],
);

const closedTerminal = resolveCoordinationSuccessorChainRecordsV1({
  "1507": record(1507, "closed", 10),
});
assert.equal(closedTerminal.outcome, "HOLD_INVALID_SUCCESSOR_CHAIN");
assert.equal(closedTerminal.chain_valid, false);
assert.deepEqual(
  closedTerminal.hold_reasons,
  ["terminal_issue_not_open:#1507"],
);

expectRejected(
  () => inspectCoordinationIssueV1(
    {
      number: 1507,
      state: "open",
      comments: 1,
      updated_at: "2026-10-01T00:00:00Z",
    },
    [comment(1, "COORDINATION_SUCCESSOR=#1600")],
  ),
  /lacks CONTROL-PLANE ROTATION marker/,
);

expectRejected(
  () => inspectCoordinationIssueV1(
    {
      number: 1507,
      state: "open",
      comments: 2,
      updated_at: "2026-10-01T00:00:00Z",
    },
    [
      comment(1, pointerBody),
      comment(
        2,
        [
          "COORDINATION_SUCCESSOR=#1700",
          "CONTROL-PLANE ROTATION",
        ].join("\n"),
      ),
    ],
  ),
  /multiple coordination successor pointers/,
);

expectRejected(
  () => inspectCoordinationIssueV1(
    {
      number: 1507,
      state: "open",
      comments: 1,
      updated_at: "2026-10-01T00:00:00Z",
    },
    [],
  ),
  /complete comment capture required/,
);

expectRejected(
  () => inspectCoordinationIssueV1(
    {
      number: 1507,
      state: "open",
      comments: 0,
      updated_at: "2026-10-01T00:00:00Z",
      pull_request: { url: "https://example.invalid/pull/1507" },
    },
    [],
  ),
  /must be an issue, not a pull request/,
);

expectRejected(
  () => resolveCoordinationSuccessorChainRecordsV1({
    "1507": record(
      1507,
      "closed",
      1,
      [
        "COORDINATION_SUCCESSOR=#1600",
        "CONTROL-PLANE ROTATION",
      ].join("\n"),
    ),
    "1600": record(
      1600,
      "closed",
      1,
      [
        "COORDINATION_SUCCESSOR=#1507",
        "CONTROL-PLANE ROTATION",
      ].join("\n"),
    ),
  }),
  /successor cycle detected/,
);

expectRejected(
  () => inspectCoordinationIssueV1(
    {
      number: 1507,
      state: "open",
      comments: 1,
      updated_at: "2026-10-01T00:00:00Z",
    },
    [
      comment(
        1,
        [
          "COORDINATION_SUCCESSOR=#1507",
          "CONTROL-PLANE ROTATION",
        ].join("\n"),
      ),
    ],
  ),
  /cannot target itself/,
);

console.log(PROOF_MARKER);
console.log("root_issue=1507");
console.log("rotation_threshold_total_messages=250");
console.log("rotation_writer_worker_id=ada");
console.log("below_threshold_outcome=" + below.outcome);
console.log("threshold_outcome=" + atThreshold.outcome);
console.log("over_threshold_278_message_outcome=" + overThreshold.outcome);
console.log("successor_resolved_outcome=" + successor.outcome);
console.log("open_predecessor_hold=true");
console.log("cycle_rejected=true");
console.log("ambiguous_pointer_rejected=true");
console.log("complete_comment_capture_required=true");
console.log("markdown_rotation_heading_accepted=true");
console.log("pull_request_target_rejected=true");
console.log("authority_granted=false");
console.log("mutation_performed=false");
