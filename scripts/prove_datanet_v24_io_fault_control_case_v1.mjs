// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import assert from "node:assert/strict";
import * as fs from "node:fs";
import {
  DatanetPayloadIoHoldV1,
  runDatanetBoundedPayloadIoV1,
} from "./datanet_v24_bounded_payload_io_v1.mjs";

const MARKER = "VOID_DATANET_V24_IO_FAULT_CONTROL_CASE_V1_HOLD";
const TOTAL_BYTES = 67_108_864;
const BLOCK_BYTES = 65_536;
const CONTROL_RE = /^(read|write):(short-positive|zero-before-end|eintr|duplicate-offset|discontinuous-offset|max-plus-one-offset)$/;

const control = process.argv[2];
assert.equal(typeof control, "string", "one control argument required");
assert.match(control, CONTROL_RE);
const [kind, fault] = control.split(":");
const destination = process.env.VOID_DATANET_FAULT_DESTINATION;
assert.equal(typeof destination, "string", "VOID_DATANET_FAULT_DESTINATION required");
assert.ok(destination.startsWith("/"), "fault destination must be absolute");

let injectedEvents = 0;
let syntheticDispatchCalls = 0;
let realDispatchCalls = 0;
let realFdOpens = 0;

const adapter = {
  plan(operation) {
    if (fault === "duplicate-offset" && operation.ordinal === 1) {
      injectedEvents += 1;
      return { ...operation, offset: operation.offset - BLOCK_BYTES };
    }
    if (fault === "discontinuous-offset" && operation.ordinal === 0) {
      injectedEvents += 1;
      return { ...operation, offset: operation.offset + BLOCK_BYTES };
    }
    if (fault === "max-plus-one-offset" && operation.ordinal === 0) {
      injectedEvents += 1;
      return { ...operation, offset: TOTAL_BYTES + 1 };
    }
    return operation;
  },
  dispatch(operation, _realDispatch) {
    if (operation.ordinal === 0 && fault === "short-positive") {
      injectedEvents += 1;
      syntheticDispatchCalls += 1;
      return operation.requested - 1;
    }
    if (operation.ordinal === 0 && fault === "zero-before-end") {
      injectedEvents += 1;
      syntheticDispatchCalls += 1;
      return 0;
    }
    if (operation.ordinal === 0 && fault === "eintr") {
      injectedEvents += 1;
      syntheticDispatchCalls += 1;
      const error = new Error("source-bound injected EINTR");
      error.code = "EINTR";
      throw error;
    }
    syntheticDispatchCalls += 1;
    return operation.eof ? 0 : operation.requested;
  },
};

function realDispatch(operation) {
  realDispatchCalls += 1;
  const flags = kind === "read" ? fs.constants.O_RDONLY : fs.constants.O_RDWR;
  const fd = fs.openSync(destination, flags);
  realFdOpens += 1;
  try {
    const buffer = Buffer.alloc(operation.requested);
    return kind === "read"
      ? fs.readSync(fd, buffer, 0, operation.requested, operation.offset)
      : fs.writeSync(fd, buffer, 0, operation.requested, operation.offset);
  } finally {
    fs.closeSync(fd);
  }
}

let observed = null;
try {
  runDatanetBoundedPayloadIoV1({
    phase: `fault-control-${kind}`,
    kind,
    totalBytes: TOTAL_BYTES,
    blockBytes: BLOCK_BYTES,
    dispatch: realDispatch,
    adapter,
    includeEofProbe: kind === "read",
  });
  assert.fail(`control unexpectedly completed: ${control}`);
} catch (error) {
  if (!(error instanceof DatanetPayloadIoHoldV1)) throw error;
  observed = error;
}

const expectedReason = {
  "short-positive": "SHORT_POSITIVE_RETURN",
  "zero-before-end": "ZERO_BEFORE_END",
  "eintr": "EINTR",
  "duplicate-offset": "DUPLICATE_OFFSET",
  "discontinuous-offset": "DISCONTINUOUS_OFFSET",
  "max-plus-one-offset": "MAX_PLUS_ONE_OFFSET",
}[fault];
assert.equal(observed.reason, expectedReason);
assert.equal(injectedEvents, 1, "exactly one injected fault event required");
assert.equal(realDispatchCalls, 0, "fault control reached real payload dispatch");
assert.equal(realFdOpens, 0, "fault control opened payload destination");

process.stdout.write(`${JSON.stringify({
  marker: MARKER,
  status: "HOLD",
  control,
  kind,
  fault,
  reason: observed.reason,
  injected_events: injectedEvents,
  synthetic_dispatch_calls: syntheticDispatchCalls,
  real_dispatch_calls: realDispatchCalls,
  real_destination_fd_opens: realFdOpens,
  retry_count: 0,
  destination_touched: false,
  payload_allocation_count: 0,
  fallocate_helper_lifetimes: 0,
  link_helper_lifetimes: 0,
  rename_count: 0,
  unlink_count: 0,
  publication_count: 0,
  availability_terminal_count: 0,
  source_bound_adapter_used: true,
})}\n`);
process.exitCode = 73;
