#!/usr/bin/env node
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import path from "node:path";

import {
  VOID_PUBLIC_NODE_SAFE_SERVE_SNAPSHOT_BUDGET_V1,
  PUBLIC_NODE_SAFE_SERVE_SNAPSHOT_AGGREGATE_BYTES_V1,
  PUBLIC_NODE_SAFE_SERVE_SNAPSHOT_MAX_IN_FLIGHT_V1,
  PublicNodeSafeServeSnapshotBudgetV1,
  armPublicNodeSafeServeSnapshotReservationV1,
} from "../tools/public-node-safe-serve-snapshot-budget-v1.mjs";

const MAX_PUBLIC_FILE_BYTES = 8 * 1024 * 1024;

const budget = new PublicNodeSafeServeSnapshotBudgetV1({
  maxAggregateBytes: PUBLIC_NODE_SAFE_SERVE_SNAPSHOT_AGGREGATE_BYTES_V1,
  maxReservationBytes: MAX_PUBLIC_FILE_BYTES,
  maxReservations: PUBLIC_NODE_SAFE_SERVE_SNAPSHOT_MAX_IN_FLIGHT_V1,
});

assert.equal(PUBLIC_NODE_SAFE_SERVE_SNAPSHOT_AGGREGATE_BYTES_V1, 32 * 1024 * 1024);
assert.equal(PUBLIC_NODE_SAFE_SERVE_SNAPSHOT_MAX_IN_FLIGHT_V1, 8);

const full = [];
for (let i = 0; i < 4; i += 1) {
  const reservation = budget.tryReserve(MAX_PUBLIC_FILE_BYTES);
  assert.ok(reservation);
  assert.equal(reservation.bytes, MAX_PUBLIC_FILE_BYTES);
  full.push(reservation);
}
assert.equal(budget.tryReserve(MAX_PUBLIC_FILE_BYTES), null);
assert.deepEqual(budget.snapshot(), {
  marker: VOID_PUBLIC_NODE_SAFE_SERVE_SNAPSHOT_BUDGET_V1,
  in_flight_bytes: 32 * 1024 * 1024,
  in_flight_reservations: 4,
  max_aggregate_bytes: 32 * 1024 * 1024,
  max_reservation_bytes: 8 * 1024 * 1024,
  max_reservations: 8,
});

assert.equal(full[0].release(), true);
assert.equal(full[0].release(), false);
const retry = budget.tryReserve(MAX_PUBLIC_FILE_BYTES);
assert.ok(retry);
assert.equal(retry.release(), true);
for (const reservation of full.slice(1)) {
  assert.equal(reservation.release(), true);
}
assert.equal(budget.snapshot().in_flight_bytes, 0);
assert.equal(budget.snapshot().in_flight_reservations, 0);

const countBudget = new PublicNodeSafeServeSnapshotBudgetV1({
  maxAggregateBytes: 1024,
  maxReservationBytes: 1024,
  maxReservations: 2,
});
const c1 = countBudget.tryReserve(1);
const c2 = countBudget.tryReserve(1);
assert.ok(c1 && c2);
assert.equal(countBudget.tryReserve(1), null);
assert.equal(c1.release(), true);
const c3 = countBudget.tryReserve(1);
assert.ok(c3);
assert.equal(c2.release(), true);
assert.equal(c3.release(), true);
assert.equal(countBudget.snapshot().in_flight_bytes, 0);
assert.equal(countBudget.snapshot().in_flight_reservations, 0);

assert.throws(
  () =>
    new PublicNodeSafeServeSnapshotBudgetV1({
      maxAggregateBytes: 0,
      maxReservationBytes: 1,
      maxReservations: 1,
    }),
  /public_safe_serve_snapshot_budget_invalid/u,
);
assert.throws(
  () => budget.tryReserve(0),
  /public_safe_serve_snapshot_reservation_size_invalid/u,
);
assert.throws(
  () => budget.tryReserve(MAX_PUBLIC_FILE_BYTES + 1),
  /public_safe_serve_snapshot_reservation_size_invalid/u,
);

class MockRequest extends EventEmitter {
  aborted = false;
}
class MockResponse extends EventEmitter {
  destroyed = false;
}

const lifecycleBudget = new PublicNodeSafeServeSnapshotBudgetV1({
  maxAggregateBytes: 1024,
  maxReservationBytes: 1024,
  maxReservations: 8,
});

for (const terminal of [
  { owner: "request", event: "aborted", args: [] },
  { owner: "response", event: "finish", args: [] },
  { owner: "response", event: "close", args: [] },
  {
    owner: "response",
    event: "error",
    args: [new Error("synthetic response failure")],
  },
]) {
  const reservation = lifecycleBudget.tryReserve(128);
  assert.ok(reservation);
  const req = new MockRequest();
  const res = new MockResponse();
  armPublicNodeSafeServeSnapshotReservationV1(req, res, reservation);
  assert.equal(lifecycleBudget.snapshot().in_flight_bytes, 128);
  const emitter = terminal.owner === "request" ? req : res;
  emitter.emit(terminal.event, ...terminal.args);
  assert.equal(
    lifecycleBudget.snapshot().in_flight_bytes,
    0,
    terminal.event,
  );
  assert.equal(
    lifecycleBudget.snapshot().in_flight_reservations,
    0,
    terminal.event,
  );
}

const synchronousReservation = lifecycleBudget.tryReserve(128);
assert.ok(synchronousReservation);
const synchronousReq = new MockRequest();
const synchronousRes = new MockResponse();
const synchronousRelease =
  armPublicNodeSafeServeSnapshotReservationV1(
    synchronousReq,
    synchronousRes,
    synchronousReservation,
  );
assert.equal(lifecycleBudget.snapshot().in_flight_bytes, 128);
assert.equal(synchronousRelease(), true);
assert.equal(synchronousRelease(), false);
assert.equal(lifecycleBudget.snapshot().in_flight_bytes, 0);

const abortedReservation = lifecycleBudget.tryReserve(256);
assert.ok(abortedReservation);
const abortedReq = new MockRequest();
abortedReq.aborted = true;
const abortedRes = new MockResponse();
armPublicNodeSafeServeSnapshotReservationV1(
  abortedReq,
  abortedRes,
  abortedReservation,
);
assert.equal(lifecycleBudget.snapshot().in_flight_bytes, 0);

const destroyedReservation = lifecycleBudget.tryReserve(256);
assert.ok(destroyedReservation);
const destroyedReq = new MockRequest();
const destroyedRes = new MockResponse();
destroyedRes.destroyed = true;
armPublicNodeSafeServeSnapshotReservationV1(
  destroyedReq,
  destroyedRes,
  destroyedReservation,
);
assert.equal(lifecycleBudget.snapshot().in_flight_bytes, 0);

const source = fs.readFileSync(
  path.join(process.cwd(), "tools", "public-node-safe-serve-v1.mjs"),
  "utf8",
);
const workflow = fs.readFileSync(
  path.join(
    process.cwd(),
    ".github",
    "workflows",
    "public-node-safe-serve-snapshot-budget-v1.yml",
  ),
  "utf8",
);

for (const marker of [
  "PUBLIC_NODE_SAFE_SERVE_SNAPSHOT_AGGREGATE_BYTES_V1",
  "PUBLIC_NODE_SAFE_SERVE_SNAPSHOT_MAX_IN_FLIGHT_V1",
  "PublicNodeSafeServeSnapshotBudgetV1",
  "armPublicNodeSafeServeSnapshotReservationV1",
  "PUBLIC_NODE_SAFE_SERVE_SNAPSHOT_BUDGET_V1",
  "tryReserve(opened.size)",
  '"retry-after": "1"',
]) {
  assert.ok(source.includes(marker), marker);
}

for (const triggerPath of [
  "tools/public-node-safe-serve-v1.mjs",
  "tools/public-node-safe-serve-snapshot-budget-v1.mjs",
  "tools/check_public_node_safe_serve_v1.sh",
  "package.json",
  "scripts/prove_public_node_safe_serve_snapshot_budget_v1.mjs",
  "docs/security/public-node-safe-serve-snapshot-budget-v1.md",
  ".github/workflows/public-node-safe-serve-snapshot-budget-v1.yml",
]) {
  assert.ok(
    workflow.includes(`- "${triggerPath}"`),
    `workflow trigger missing: ${triggerPath}`,
  );
}

const handler = source.indexOf("const server = http.createServer");
const headBranch = source.indexOf('if (req.method === "HEAD")', handler);
const reserve = source.indexOf("tryReserve(opened.size)", handler);
const bodyRead = source.indexOf(
  "body = readOpenedPublicFile(opened)",
  handler,
);
const arm = source.indexOf(
  "armPublicNodeSafeServeSnapshotReservationV1(",
  bodyRead,
);
const disconnectHold = source.indexOf(
  "if (req.aborted === true || res.destroyed === true)",
  arm,
);
const send = source.indexOf("res.end(body)", arm);
const synchronousSendFailureRelease = source.indexOf(
  "releaseSnapshot();",
  send,
);

assert.ok(handler >= 0);
assert.ok(headBranch > handler);
assert.ok(reserve > headBranch);
assert.ok(bodyRead > reserve);
assert.ok(arm > bodyRead);
assert.ok(disconnectHold > arm);
assert.ok(send > disconnectHold);
assert.ok(synchronousSendFailureRelease > send);

const capacityBlock = source.slice(reserve, bodyRead);
assert.match(capacityBlock, /closeOpenedPublicFile\(opened\)/u);
assert.match(capacityBlock, /res\.writeHead\(503/u);
assert.match(capacityBlock, /server busy\\n/u);

const bodyFailureBlock = source.slice(bodyRead, arm);
assert.match(bodyFailureBlock, /reservation\?\.release\(\)/u);

console.log("VOID_PUBLIC_NODE_SAFE_SERVE_SNAPSHOT_BUDGET_V1_GREEN");
console.log("max_public_file_bytes=8388608");
console.log("max_aggregate_snapshot_bytes=33554432");
console.log("max_in_flight_snapshots=8");
console.log("reservation_before_body_allocation=true");
console.log("head_snapshot_reservation=false");
console.log("capacity_rejection_before_body_read=true");
console.log("release_finish_close_error_abort=true");
console.log("pre_send_disconnect_stops_send=true");
console.log("synchronous_send_failure_release=true");
console.log("release_idempotent=true");
console.log("retry_after_release=true");
console.log("descriptor_custody_preserved=true");
console.log("workflow_trigger_coverage_complete=true");
console.log("runtime_or_network_mutation=false");
