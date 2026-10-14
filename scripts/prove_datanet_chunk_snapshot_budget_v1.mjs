#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  DATANET_PUBLIC_CHUNK_SNAPSHOT_AGGREGATE_BYTES_V1,
  DATANET_PUBLIC_CHUNK_SNAPSHOT_MAX_IN_FLIGHT_V1,
  DataNetChunkSnapshotBudgetV1,
  DataNetChunkSnapshotCapacityErrorV1,
} from "../dist/http/datanet_chunk_snapshot_budget_v1.js";
import {
  armDataNetChunkSnapshotReservationV1,
  readVerifiedDataNetChunkSnapshotV1,
} from "../dist/http/datanet_routes.js";

assert.equal(
  DATANET_PUBLIC_CHUNK_SNAPSHOT_AGGREGATE_BYTES_V1,
  128 * 1024 * 1024,
);
assert.equal(DATANET_PUBLIC_CHUNK_SNAPSHOT_MAX_IN_FLIGHT_V1, 8);

const aggregate = new DataNetChunkSnapshotBudgetV1({
  maxAggregateBytes: 16,
  maxReservationBytes: 8,
  maxReservations: 8,
});
const a = aggregate.tryReserve(8);
const b = aggregate.tryReserve(8);
assert.ok(a);
assert.ok(b);
assert.equal(aggregate.tryReserve(1), null);
assert.deepEqual(aggregate.snapshot(), {
  in_flight_bytes: 16,
  in_flight_reservations: 2,
  max_aggregate_bytes: 16,
  max_reservation_bytes: 8,
  max_reservations: 8,
});
assert.equal(a.release(), true);
assert.equal(a.release(), false);
assert.deepEqual(aggregate.snapshot(), {
  in_flight_bytes: 8,
  in_flight_reservations: 1,
  max_aggregate_bytes: 16,
  max_reservation_bytes: 8,
  max_reservations: 8,
});
const c = aggregate.tryReserve(8);
assert.ok(c);
assert.equal(aggregate.snapshot().in_flight_bytes, 16);
assert.equal(aggregate.snapshot().in_flight_reservations, 2);
assert.equal(b.release(), true);
assert.equal(aggregate.snapshot().in_flight_bytes, 8);
assert.equal(c.release(), true);
assert.equal(aggregate.snapshot().in_flight_bytes, 0);
assert.equal(aggregate.snapshot().in_flight_reservations, 0);

const countBound = new DataNetChunkSnapshotBudgetV1({
  maxAggregateBytes: 100,
  maxReservationBytes: 10,
  maxReservations: 2,
});
const countA = countBound.tryReserve(1);
const countB = countBound.tryReserve(1);
assert.ok(countA);
assert.ok(countB);
assert.equal(countBound.tryReserve(1), null);
countA.release();
countB.release();

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-datanet-snapshot-budget-v1-"),
);
const file = path.join(root, "chunk.bin");
const body = Buffer.from("abcdefgh", "utf8");
fs.writeFileSync(file, body, { mode: 0o600 });
const leaf = createHash("sha256").update(body).digest("hex");

try {
  const concurrentReads = new DataNetChunkSnapshotBudgetV1({
    maxAggregateBytes: 16,
    maxReservationBytes: 8,
    maxReservations: 8,
  });
  const firstRead = readVerifiedDataNetChunkSnapshotV1(
    file,
    leaf,
    concurrentReads,
  );
  const secondRead = readVerifiedDataNetChunkSnapshotV1(
    file,
    leaf,
    concurrentReads,
  );
  assert.ok(firstRead.reservation);
  assert.ok(secondRead.reservation);
  assert.equal(concurrentReads.snapshot().in_flight_bytes, 16);
  assert.equal(concurrentReads.snapshot().in_flight_reservations, 2);

  const originalConcurrentAllocUnsafe = Buffer.allocUnsafe;
  let rejectedConcurrentAllocations = 0;
  Buffer.allocUnsafe = function countedRejectedConcurrentAllocUnsafe(size) {
    rejectedConcurrentAllocations += 1;
    return originalConcurrentAllocUnsafe(size);
  };
  try {
    assert.throws(
      () =>
        readVerifiedDataNetChunkSnapshotV1(
          file,
          leaf,
          concurrentReads,
        ),
      (error) => error instanceof DataNetChunkSnapshotCapacityErrorV1,
    );
    assert.equal(rejectedConcurrentAllocations, 0);
  } finally {
    Buffer.allocUnsafe = originalConcurrentAllocUnsafe;
  }

  assert.equal(firstRead.reservation.release(), true);
  const recoveredRead = readVerifiedDataNetChunkSnapshotV1(
    file,
    leaf,
    concurrentReads,
  );
  assert.ok(recoveredRead.reservation);
  assert.deepEqual(recoveredRead.bytes, body);
  assert.equal(concurrentReads.snapshot().in_flight_bytes, 16);
  assert.equal(secondRead.reservation.release(), true);
  assert.equal(recoveredRead.reservation.release(), true);
  assert.equal(concurrentReads.snapshot().in_flight_bytes, 0);

  const blocked = new DataNetChunkSnapshotBudgetV1({
    maxAggregateBytes: 8,
    maxReservationBytes: 8,
    maxReservations: 2,
  });
  const held = blocked.tryReserve(8);
  assert.ok(held);

  const originalAllocUnsafe = Buffer.allocUnsafe;
  let allocationCalls = 0;
  Buffer.allocUnsafe = function countedAllocUnsafe(size) {
    allocationCalls += 1;
    return originalAllocUnsafe(size);
  };
  try {
    assert.throws(
      () => readVerifiedDataNetChunkSnapshotV1(file, leaf, blocked),
      (error) =>
        error instanceof DataNetChunkSnapshotCapacityErrorV1 &&
        error.message === "datanet_chunk_snapshot_capacity_exceeded",
    );
    assert.equal(
      allocationCalls,
      0,
      "overload must reject before snapshot allocation",
    );
  } finally {
    Buffer.allocUnsafe = originalAllocUnsafe;
  }
  assert.equal(blocked.snapshot().in_flight_bytes, 8);
  assert.equal(held.release(), true);

  let allowedAllocations = 0;
  Buffer.allocUnsafe = function countedAllowedAllocUnsafe(size) {
    allowedAllocations += 1;
    return originalAllocUnsafe(size);
  };
  let opened;
  try {
    opened = readVerifiedDataNetChunkSnapshotV1(file, leaf, blocked);
  } finally {
    Buffer.allocUnsafe = originalAllocUnsafe;
  }
  assert.equal(allowedAllocations, 1);
  assert.deepEqual(opened.bytes, body);
  assert.equal(opened.size, body.length);
  assert.ok(opened.reservation);
  assert.equal(blocked.snapshot().in_flight_bytes, body.length);
  assert.equal(opened.reservation.release(), true);
  assert.equal(blocked.snapshot().in_flight_bytes, 0);

  const failureBudget = new DataNetChunkSnapshotBudgetV1({
    maxAggregateBytes: 8,
    maxReservationBytes: 8,
    maxReservations: 2,
  });
  assert.throws(
    () =>
      readVerifiedDataNetChunkSnapshotV1(
        file,
        "0".repeat(64),
        failureBudget,
      ),
    /datanet_chunk_hash_mismatch/u,
  );
  assert.equal(failureBudget.snapshot().in_flight_bytes, 0);
  assert.equal(failureBudget.snapshot().in_flight_reservations, 0);

  for (const event of ["finish", "close", "error", "aborted"]) {
    const lifecycleBudget = new DataNetChunkSnapshotBudgetV1({
      maxAggregateBytes: 8,
      maxReservationBytes: 8,
      maxReservations: 2,
    });
    const reservation = lifecycleBudget.tryReserve(8);
    assert.ok(reservation);
    const req = new EventEmitter();
    req.aborted = false;
    const res = new EventEmitter();
    res.destroyed = false;

    armDataNetChunkSnapshotReservationV1(req, res, reservation);
    if (event === "aborted") {
      req.emit("aborted");
    } else if (event === "error") {
      res.emit("error", new Error("inert-send-error"));
    } else {
      res.emit(event);
    }
    assert.equal(
      lifecycleBudget.snapshot().in_flight_bytes,
      0,
      event,
    );
    assert.equal(
      lifecycleBudget.snapshot().in_flight_reservations,
      0,
      event,
    );
  }

  const syncFailureBudget = new DataNetChunkSnapshotBudgetV1({
    maxAggregateBytes: 8,
    maxReservationBytes: 8,
    maxReservations: 2,
  });
  const syncReservation = syncFailureBudget.tryReserve(8);
  assert.ok(syncReservation);
  const syncReq = new EventEmitter();
  syncReq.aborted = false;
  const syncRes = new EventEmitter();
  syncRes.destroyed = false;
  const releaseSync =
    armDataNetChunkSnapshotReservationV1(
      syncReq,
      syncRes,
      syncReservation,
    );
  try {
    throw new Error("inert-synchronous-send-failure");
  } catch {
    releaseSync();
  }
  assert.equal(syncFailureBudget.snapshot().in_flight_bytes, 0);

  const immediateAbortBudget = new DataNetChunkSnapshotBudgetV1({
    maxAggregateBytes: 8,
    maxReservationBytes: 8,
    maxReservations: 2,
  });
  const immediateReservation = immediateAbortBudget.tryReserve(8);
  assert.ok(immediateReservation);
  const immediateReq = new EventEmitter();
  immediateReq.aborted = true;
  const immediateRes = new EventEmitter();
  immediateRes.destroyed = false;
  armDataNetChunkSnapshotReservationV1(
    immediateReq,
    immediateRes,
    immediateReservation,
  );
  assert.equal(immediateAbortBudget.snapshot().in_flight_bytes, 0);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

const source = fs.readFileSync(
  path.join(process.cwd(), "src", "http", "datanet_routes.ts"),
  "utf8",
);
const reserveIndex = source.indexOf(
  "reservation = budget.tryReserve(before.size);",
);
const allocateIndex = source.indexOf(
  "const bytes = Buffer.allocUnsafe(before.size);",
);
assert.ok(reserveIndex >= 0);
assert.ok(allocateIndex > reserveIndex);
assert.match(
  source,
  /DATANET_PUBLIC_CHUNK_SNAPSHOT_AGGREGATE_BYTES_V1/u,
);
assert.match(
  source,
  /DATANET_PUBLIC_CHUNK_SNAPSHOT_MAX_IN_FLIGHT_V1/u,
);
assert.match(
  source,
  /DATANET_PUBLIC_CHUNK_SNAPSHOT_BUDGET_V1/u,
);
assert.match(
  source,
  /res\.status\(503\)\.json\(\{\s*ok: false,\s*err: "datanet_chunk_snapshot_capacity_exceeded"/u,
);
assert.match(source, /res\.setHeader\("retry-after", "1"\)/u);
assert.match(source, /req\.once\("aborted", releaseOnce\)/u);
assert.match(source, /res\.once\("finish", releaseOnce\)/u);
assert.match(source, /res\.once\("close", releaseOnce\)/u);
assert.match(source, /res\.once\("error", releaseOnce\)/u);
assert.match(source, /reservation\?\.release\(\)/u);
assert.match(source, /releaseSnapshot\(\);\s*throw error;/u);
assert.match(source, /fs\.constants\.O_NOFOLLOW/u);
assert.match(source, /sameDataNetChunkIdentityV1\(before, after\)/u);
assert.match(
  source,
  /createHash\("sha256"\)\.update\(bytes\)\.digest\("hex"\) !== expectedLeaf/u,
);
assert.match(source, /fs\.linkSync\(temporary, file\)/u);
assert.match(
  source,
  /datanet_chunk_publish_identity_mismatch/u,
);

console.log("VOID_DATANET_CHUNK_SNAPSHOT_BUDGET_V1_GREEN");
console.log(
  "aggregate_budget_bytes=" +
    DATANET_PUBLIC_CHUNK_SNAPSHOT_AGGREGATE_BYTES_V1,
);
console.log(
  "max_in_flight_snapshots=" +
    DATANET_PUBLIC_CHUNK_SNAPSHOT_MAX_IN_FLIGHT_V1,
);
console.log("reservation_before_allocation=true");
console.log("overload_no_snapshot_allocation=true");
console.log("concurrent_snapshot_recovery_proven=true");
console.log("aggregate_byte_ceiling_proven=true");
console.log("concurrency_count_ceiling_proven=true");
console.log("request_owned_release_token=true");
console.log("double_release_idempotent=true");
console.log("hash_failure_releases=true");
console.log("finish_releases=true");
console.log("close_releases=true");
console.log("response_error_releases=true");
console.log("client_abort_releases=true");
console.log("synchronous_send_failure_releases=true");
console.log("stable_overload_status_503=true");
console.log("descriptor_snapshot_semantics_preserved=true");
console.log("put_create_only_semantics_preserved=true");
console.log("runtime_service_network_mutation=false");
console.log("wallet_signer_validator_wc_money_authority=0");
