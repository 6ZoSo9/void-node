// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import fsDefault from "node:fs";
import * as fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import * as os from "node:os";
import * as path from "node:path";

import { autoRepairDataDir } from "../dist/chain/auto_repair.js";

const MARKER = "VOID_SEGSTORE_AUTO_REPAIR_CHUNKED_SCAN_V1_PROOF_GREEN";
const SEGMENT = "00000000";
const SCAN_READ_CHUNK_BYTES = 1024 * 1024;

function frameBody(body) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(body.length, 0);
  return Buffer.concat([len, body]);
}

function frameValue(value) {
  return frameBody(Buffer.from(JSON.stringify(value), "utf8"));
}

function exactJsonBody(number, bodyBytes) {
  const prefix = Buffer.from(`{"number":${number},"payload":"`, "utf8");
  const suffix = Buffer.from('"}', "utf8");
  const fillBytes = bodyBytes - prefix.length - suffix.length;
  assert(fillBytes >= 0, "requested exact JSON body is too small");
  const body = Buffer.concat([
    prefix,
    Buffer.alloc(fillBytes, 0x78),
    suffix,
  ]);
  assert.equal(body.length, bodyBytes);
  JSON.parse(body.toString("utf8"));
  return body;
}

function tempRoot(label) {
  return fs.mkdtempSync(
    path.join(os.tmpdir(), `void-segstore-chunked-scan-${label}-`),
  );
}

function segmentBin(root) {
  const dir = path.join(root, "segments", SEGMENT);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "blocks.bin");
}

function cleanup(root) {
  fs.rmSync(root, { recursive: true, force: true });
}

async function countReadSyncCalls(run) {
  const original = fsDefault.readSync;
  let calls = 0;
  fsDefault.readSync = function countedReadSync(...args) {
    calls += 1;
    return Reflect.apply(original, fsDefault, args);
  };
  syncBuiltinESMExports();
  try {
    const value = await run();
    return { value, calls };
  } finally {
    fsDefault.readSync = original;
    syncBuiltinESMExports();
  }
}

async function proveTenThousandFramesUseBoundedReads() {
  const root = tempRoot("10k");
  try {
    const bin = segmentBin(root);
    const bytes = Buffer.concat(
      Array.from({ length: 10_000 }, (_, number) => frameValue({ number })),
    );
    fs.writeFileSync(bin, bytes);

    const { value: result, calls } = await countReadSyncCalls(() =>
      autoRepairDataDir(root, { sparseEvery: 256, dryRun: true }),
    );

    assert.equal(result.head, 9_999);
    assert.equal(result.plan.rebuildSparseIndexes[0].entries, 40);
    const idealChunkReads = Math.ceil(bytes.length / SCAN_READ_CHUNK_BYTES);
    assert(
      calls <= idealChunkReads + 4,
      `bounded chunk scan used too many readSync calls: ${calls} for ${bytes.length} bytes`,
    );
    assert(
      calls < 100,
      `10k-frame scan regressed toward per-frame reads: ${calls} calls`,
    );

    return { bytes: bytes.length, calls, idealChunkReads };
  } finally {
    cleanup(root);
  }
}

async function proveHeaderMaySplitAcrossChunkBoundary() {
  const root = tempRoot("header-split");
  try {
    const bin = segmentBin(root);
    const frame0 = frameBody(
      exactJsonBody(0, SCAN_READ_CHUNK_BYTES - 6),
    );
    assert.equal(frame0.length, SCAN_READ_CHUNK_BYTES - 2);

    const frame1 = frameValue({ number: 1, payload: "header-crosses-boundary" });
    fs.writeFileSync(bin, Buffer.concat([frame0, frame1]));

    const result = await autoRepairDataDir(root, {
      sparseEvery: 1,
      dryRun: true,
    });
    assert.equal(result.head, 1);
    assert.equal(result.wouldRepairTornSegments, 0);
    assert.equal(result.plan.rebuildSparseIndexes[0].entries, 2);
  } finally {
    cleanup(root);
  }
}

async function provePayloadMaySplitAcrossChunkBoundary() {
  const root = tempRoot("payload-split");
  try {
    const bin = segmentBin(root);
    const frame0 = frameBody(
      exactJsonBody(0, SCAN_READ_CHUNK_BYTES - 12),
    );
    assert.equal(frame0.length, SCAN_READ_CHUNK_BYTES - 8);

    const frame1 = frameValue({
      number: 1,
      payload: "payload-starts-before-and-finishes-after-the-boundary",
    });
    fs.writeFileSync(bin, Buffer.concat([frame0, frame1]));

    const result = await autoRepairDataDir(root, {
      sparseEvery: 1,
      dryRun: true,
    });
    assert.equal(result.head, 1);
    assert.equal(result.wouldRepairTornSegments, 0);
  } finally {
    cleanup(root);
  }
}

async function proveTornHeaderRemainsTornTail() {
  const root = tempRoot("torn-header");
  try {
    const bin = segmentBin(root);
    const frame0 = frameValue({ number: 0 });
    fs.writeFileSync(
      bin,
      Buffer.concat([frame0, Buffer.from([0xde, 0xad, 0xbe])]),
    );

    const result = await autoRepairDataDir(root, { dryRun: true });
    assert.equal(result.head, 0);
    assert.equal(result.wouldRepairTornSegments, 1);
    assert.equal(result.wouldTruncateTornTailBytes, 3);
    assert.equal(result.plan.truncateTornTails[0].toBytes, frame0.length);
  } finally {
    cleanup(root);
  }
}

async function proveTornPayloadRemainsTornTail() {
  const root = tempRoot("torn-payload");
  try {
    const bin = segmentBin(root);
    const frame0 = frameValue({ number: 0 });
    const declared = Buffer.alloc(4);
    declared.writeUInt32BE(100, 0);
    const partialBody = Buffer.from("0123456789", "utf8");
    fs.writeFileSync(
      bin,
      Buffer.concat([frame0, declared, partialBody]),
    );

    const result = await autoRepairDataDir(root, { dryRun: true });
    assert.equal(result.head, 0);
    assert.equal(result.wouldRepairTornSegments, 1);
    assert.equal(
      result.wouldTruncateTornTailBytes,
      declared.length + partialBody.length,
    );
    assert.equal(result.plan.truncateTornTails[0].toBytes, frame0.length);
  } finally {
    cleanup(root);
  }
}

async function proveCompleteMalformedFrameStillFailsClosed() {
  const root = tempRoot("malformed");
  try {
    const bin = segmentBin(root);
    fs.writeFileSync(bin, frameBody(Buffer.from("{not-json}", "utf8")));
    await assert.rejects(
      autoRepairDataDir(root, { dryRun: true }),
      /complete frame JSON invalid/,
    );
  } finally {
    cleanup(root);
  }
}

async function proveWrongOrderStillFailsClosed() {
  const root = tempRoot("wrong-order");
  try {
    const bin = segmentBin(root);
    fs.writeFileSync(
      bin,
      Buffer.concat([
        frameValue({ number: 0 }),
        frameValue({ number: 2 }),
      ]),
    );
    await assert.rejects(
      autoRepairDataDir(root, { dryRun: true }),
      /complete frame order invalid/,
    );
  } finally {
    cleanup(root);
  }
}

async function proveWrongSegmentStillFailsClosed() {
  const root = tempRoot("wrong-segment");
  try {
    const bin = segmentBin(root);
    fs.writeFileSync(bin, frameValue({ number: 10_000 }));
    await assert.rejects(
      autoRepairDataDir(root, { dryRun: true }),
      /complete frame segment mismatch/,
    );
  } finally {
    cleanup(root);
  }
}

const source = fs.readFileSync("src/chain/auto_repair.ts", "utf8");
assert.match(source, /const SCAN_READ_CHUNK_BYTES = 1024 \* 1024;/);
assert.match(source, /function refill\(\): boolean/);
assert.match(source, /function readExact\(/);
assert.equal(
  (source.match(/fs\.readSync\(/g) ?? []).length,
  1,
  "auto_repair.ts must have exactly one direct readSync call after chunking",
);
assert.doesNotMatch(source, /fs\.readSync\(fd,\s*lenBuf/);
assert.doesNotMatch(source, /fs\.readSync\(fd,\s*body/);

const readBound = await proveTenThousandFramesUseBoundedReads();
await proveHeaderMaySplitAcrossChunkBoundary();
await provePayloadMaySplitAcrossChunkBoundary();
await proveTornHeaderRemainsTornTail();
await proveTornPayloadRemainsTornTail();
await proveCompleteMalformedFrameStillFailsClosed();
await proveWrongOrderStillFailsClosed();
await proveWrongSegmentStillFailsClosed();

console.log(MARKER);
console.log(`ten_thousand_frame_bytes=${readBound.bytes}`);
console.log(`ten_thousand_frame_readsync_calls=${readBound.calls}`);
console.log(`ideal_chunk_reads=${readBound.idealChunkReads}`);
console.log("per_frame_readsync_regression=false");
console.log("header_chunk_boundary_split_preserved=true");
console.log("payload_chunk_boundary_split_preserved=true");
console.log("torn_header_detection_preserved=true");
console.log("torn_payload_detection_preserved=true");
console.log("complete_malformed_frame_accepted=false");
console.log("wrong_order_complete_frame_accepted=false");
console.log("wrong_segment_complete_frame_accepted=false");
console.log("runtime_live_chain_mutation_performed=false");
console.log("wallet_signer_validator_wc_money_authority=0");
