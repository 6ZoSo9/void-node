// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { runDatanetBoundedPayloadIoV1 } from "./datanet_v24_bounded_payload_io_v1.mjs";

const MARKER = "VOID_DATANET_V24_BOUNDED_PAYLOAD_IO_POSITIVE_V1_GREEN";
const TOTAL_BYTES = 67_108_864;
const BLOCK_BYTES = 65_536;
const block = Buffer.alloc(BLOCK_BYTES);
const expectedHash = createHash("sha256");
for (let i = 0; i < TOTAL_BYTES / BLOCK_BYTES; i += 1) expectedHash.update(block);
const expectedSha256 = expectedHash.digest("hex");

const base = process.env.RUNNER_TEMP || os.tmpdir();
const directory = fs.mkdtempSync(path.join(base, "void-datanet-v24-io-"));
const filePath = path.join(directory, "payload.bin");
const fd = fs.openSync(filePath, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_RDWR, 0o600);
try {
  fs.ftruncateSync(fd, TOTAL_BYTES);
  const writeHash = createHash("sha256");
  const writeLedger = runDatanetBoundedPayloadIoV1({
    phase: "positive-write",
    kind: "write",
    totalBytes: TOTAL_BYTES,
    blockBytes: BLOCK_BYTES,
    dispatch(operation) {
      const result = fs.writeSync(fd, block, 0, operation.requested, operation.offset);
      if (result === operation.requested) writeHash.update(block);
      return result;
    },
  });
  fs.fsyncSync(fd);
  assert.deepEqual(
    { calls: writeLedger.calls, requested: writeLedger.requested, completed: writeLedger.completed },
    { calls: 1024, requested: TOTAL_BYTES, completed: TOTAL_BYTES },
  );
  assert.equal(writeLedger.retry_count, 0);
  assert.equal(writeLedger.real_dispatch_calls, 1024);
  assert.equal(writeHash.digest("hex"), expectedSha256);

  const readBuffer = Buffer.alloc(BLOCK_BYTES);
  const readHash = createHash("sha256");
  const readLedger = runDatanetBoundedPayloadIoV1({
    phase: "positive-read",
    kind: "read",
    totalBytes: TOTAL_BYTES,
    blockBytes: BLOCK_BYTES,
    includeEofProbe: true,
    dispatch(operation) {
      const length = operation.eof ? 1 : operation.requested;
      return fs.readSync(fd, readBuffer, 0, length, operation.offset);
    },
    onFullResult(operation) {
      if (!operation.eof) readHash.update(readBuffer);
    },
  });
  assert.deepEqual(
    {
      calls: readLedger.calls,
      requested: readLedger.requested,
      completed: readLedger.completed,
      eof_probes: readLedger.eof_probes,
    },
    { calls: 1025, requested: TOTAL_BYTES + 1, completed: TOTAL_BYTES, eof_probes: 1 },
  );
  assert.equal(readLedger.retry_count, 0);
  assert.equal(readLedger.real_dispatch_calls, 1025);
  assert.equal(readHash.digest("hex"), expectedSha256);

  process.stdout.write(`${JSON.stringify({
    marker: MARKER,
    status: "GREEN",
    payload_bytes: TOTAL_BYTES,
    io_block_bytes: BLOCK_BYTES,
    payload_sha256: expectedSha256,
    write_ledger: writeLedger,
    read_ledger: readLedger,
    retry_count: 0,
  })}\n`);
} finally {
  fs.closeSync(fd);
}
