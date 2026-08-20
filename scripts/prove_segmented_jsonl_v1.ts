import assert from "node:assert/strict";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  buildSegmentedJsonlV1FromFile,
  planSegmentReplicationV1,
  readSegmentedJsonlManifestV1,
  reconstructSegmentedJsonlV1ToFile,
  sealedSegmentInventoryV1,
  verifySegmentedJsonlV1,
  VOID_SEGMENTED_JSONL_MAX_RECORD_BYTES_V1,
  VOID_SEGMENTED_JSONL_MAX_TARGET_BYTES_V1,
} from "../src/storage/segmented_jsonl_v1.js";

function sha256(data: Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function expectFailure(fn: () => unknown, fragment: string): void {
  let seen = "";
  try {
    fn();
  } catch (err) {
    seen = err instanceof Error ? err.message : String(err);
  }
  assert.ok(seen.includes(fragment), `expected failure containing ${fragment}, got ${seen}`);
}

function makeFixture(recordCount: number): Buffer {
  const rows: Buffer[] = [];
  for (let i = 0; i < recordCount; i++) {
    const payload = "x".repeat(80 + ((i * 37) % 700));
    rows.push(
      Buffer.from(
        `${JSON.stringify({ v: 1, id: `row-${i}`, seq: i, payload })}\n`,
        "utf8",
      ),
    );
  }
  return Buffer.concat(rows);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-segmented-jsonl-v1-"));
try {
  const source = path.join(tmp, "source.jsonl");
  const store = path.join(tmp, "store");
  const rebuilt = path.join(tmp, "rebuilt.jsonl");
  const body = makeFixture(500);
  fs.writeFileSync(source, body);

  const expectBuildControlFailure = (
    suffix: string,
    options: Record<string, unknown>,
    fragment: string,
  ) => {
    const destination = path.join(tmp, `invalid-control-${suffix}`);
    assert.equal(fs.existsSync(destination), false, `${suffix} destination must begin absent`);
    expectFailure(
      () => buildSegmentedJsonlV1FromFile(source, destination, options as any),
      fragment,
    );
    assert.equal(
      fs.existsSync(destination),
      false,
      `${suffix} invalid controls must fail before destination publication`,
    );
  };

  expectBuildControlFailure("target-string", { segmentTargetBytes: "16384" }, "INVALID_SEGMENT_TARGET");
  expectBuildControlFailure("target-array", { segmentTargetBytes: [16384] }, "INVALID_SEGMENT_TARGET");
  expectBuildControlFailure("target-boolean", { segmentTargetBytes: true }, "INVALID_SEGMENT_TARGET");
  expectBuildControlFailure("target-fraction", { segmentTargetBytes: 16384.5 }, "INVALID_SEGMENT_TARGET");
  expectBuildControlFailure("target-nan", { segmentTargetBytes: Number.NaN }, "INVALID_SEGMENT_TARGET");
  expectBuildControlFailure("target-infinity", { segmentTargetBytes: Number.POSITIVE_INFINITY }, "INVALID_SEGMENT_TARGET");
  expectBuildControlFailure(
    "target-excessive-safe",
    { segmentTargetBytes: VOID_SEGMENTED_JSONL_MAX_TARGET_BYTES_V1 + 1 },
    "INVALID_SEGMENT_TARGET",
  );
  expectBuildControlFailure("record-string", { maxRecordBytes: "4096" }, "INVALID_MAX_RECORD");
  expectBuildControlFailure("record-array", { maxRecordBytes: [4096] }, "INVALID_MAX_RECORD");
  expectBuildControlFailure("record-fraction", { maxRecordBytes: 4096.5 }, "INVALID_MAX_RECORD");
  expectBuildControlFailure(
    "record-excessive-safe",
    {
      segmentTargetBytes: VOID_SEGMENTED_JSONL_MAX_TARGET_BYTES_V1,
      maxRecordBytes: VOID_SEGMENTED_JSONL_MAX_RECORD_BYTES_V1 + 1,
    },
    "INVALID_MAX_RECORD",
  );
  expectBuildControlFailure("generation-string", { generation: "7" }, "INVALID_GENERATION");
  expectBuildControlFailure("generation-array", { generation: [7] }, "INVALID_GENERATION");
  expectBuildControlFailure("generation-fraction", { generation: 7.5 }, "INVALID_GENERATION");
  expectBuildControlFailure("generation-infinity", { generation: Number.POSITIVE_INFINITY }, "INVALID_GENERATION");

  const manifest = buildSegmentedJsonlV1FromFile(source, store, {
    segmentTargetBytes: 16 * 1024,
    maxRecordBytes: 4 * 1024,
    generation: 7,
  });

  assert.equal(manifest.generation, 7);
  assert.ok(manifest.sealed_segments.length >= 5, "fixture should produce multiple immutable segments");
  assert.ok(manifest.active.bytes <= manifest.segment_target_bytes);
  assert.equal(manifest.total_bytes, body.length);
  assert.equal(manifest.total_records, 500);

  for (const segment of manifest.sealed_segments) {
    assert.ok(segment.bytes <= manifest.segment_target_bytes);
    const segmentFile = path.join(store, segment.file);
    const bytes = fs.readFileSync(segmentFile);
    assert.equal(bytes[bytes.length - 1], 0x0a, `sealed segment ${segment.id} must end on record boundary`);
    assert.equal(sha256(bytes), segment.sha256);
    const mode = fs.statSync(segmentFile).mode & 0o777;
    assert.equal(mode & 0o222, 0, `sealed segment ${segment.id} must not retain write bits`);
  }

  const verified = verifySegmentedJsonlV1(store);
  assert.equal(verified.total_bytes_verified, body.length);
  assert.equal(verified.total_records_verified, 500);

  const reconstruction = reconstructSegmentedJsonlV1ToFile(store, rebuilt);
  const rebuiltBytes = fs.readFileSync(rebuilt);
  assert.deepEqual(rebuiltBytes, body, "segmentation must reconstruct source byte-for-byte");
  assert.equal(reconstruction.sha256, sha256(body));

  const inventory = sealedSegmentInventoryV1(manifest);
  const localPrefix = inventory.slice(0, Math.max(1, inventory.length - 2));
  const plan = planSegmentReplicationV1(manifest, localPrefix);
  assert.equal(plan.conflicting.length, 0);
  assert.equal(plan.matching.length, localPrefix.length);
  assert.equal(plan.missing.length, inventory.length - localPrefix.length);
  assert.deepEqual(
    plan.missing.map((x) => x.id),
    inventory.slice(localPrefix.length).map((x) => x.id),
    "a lagging peer should request only missing sealed segments",
  );

  const conflicted = [...localPrefix];
  conflicted[0] = { ...conflicted[0], sha256: "0".repeat(64) };
  const conflictPlan = planSegmentReplicationV1(manifest, conflicted);
  assert.equal(conflictPlan.conflicting.length, 1, "same segment id with different hash must conflict");

  const tamperedSegment = manifest.sealed_segments[0];
  const tamperedPath = path.join(store, tamperedSegment.file);
  fs.chmodSync(tamperedPath, 0o600);
  const original = fs.readFileSync(tamperedPath);
  const tampered = Buffer.from(original);
  const mutateAt = Math.min(8, tampered.length - 2);
  tampered[mutateAt] = tampered[mutateAt] ^ 0x01;
  fs.writeFileSync(tamperedPath, tampered);
  fs.chmodSync(tamperedPath, 0o400);
  expectFailure(() => verifySegmentedJsonlV1(store), "SEGMENT_HASH_MISMATCH");
  fs.chmodSync(tamperedPath, 0o600);
  fs.writeFileSync(tamperedPath, original);
  fs.chmodSync(tamperedPath, 0o400);
  verifySegmentedJsonlV1(store);

  fs.chmodSync(tamperedPath, 0o600);
  expectFailure(() => verifySegmentedJsonlV1(store), "SEALED_SEGMENT_WRITABLE");
  fs.chmodSync(tamperedPath, 0o400);
  verifySegmentedJsonlV1(store);

  const activePath = path.join(store, "active.jsonl");
  const activeOriginal = fs.readFileSync(activePath);
  if (activeOriginal.length > 2) {
    const activeTampered = Buffer.from(activeOriginal);
    const xAt = activeTampered.indexOf("x".charCodeAt(0));
    assert.ok(xAt >= 0, "fixture active segment should contain mutable payload bytes");
    activeTampered[xAt] = "y".charCodeAt(0);
    fs.writeFileSync(activePath, activeTampered);
    expectFailure(() => verifySegmentedJsonlV1(store), "ACTIVE_HASH_MISMATCH");
    fs.writeFileSync(activePath, activeOriginal);
    verifySegmentedJsonlV1(store);
  }

  const missingPath = path.join(store, manifest.sealed_segments[1].file);
  const missingBytes = fs.readFileSync(missingPath);
  fs.unlinkSync(missingPath);
  expectFailure(() => verifySegmentedJsonlV1(store), "MISSING_FILE");
  fs.writeFileSync(missingPath, missingBytes, { mode: 0o400 });
  fs.chmodSync(missingPath, 0o400);
  verifySegmentedJsonlV1(store);

  const malformedSource = path.join(tmp, "malformed.jsonl");
  fs.writeFileSync(malformedSource, Buffer.from('{"ok":1}\nnot-json\n', "utf8"));
  expectFailure(
    () => buildSegmentedJsonlV1FromFile(malformedSource, path.join(tmp, "malformed-store"), {
      segmentTargetBytes: 4096,
      maxRecordBytes: 1024,
    }),
    "INVALID_JSON",
  );

  const unterminatedSource = path.join(tmp, "unterminated.jsonl");
  fs.writeFileSync(unterminatedSource, Buffer.from('{"ok":1}', "utf8"));
  expectFailure(
    () => buildSegmentedJsonlV1FromFile(unterminatedSource, path.join(tmp, "unterminated-store"), {
      segmentTargetBytes: 4096,
      maxRecordBytes: 1024,
    }),
    "SOURCE_UNTERMINATED",
  );

  const oversizedSource = path.join(tmp, "oversized.jsonl");
  fs.writeFileSync(
    oversizedSource,
    Buffer.from(`${JSON.stringify({ payload: "z".repeat(2000) })}\n`, "utf8"),
  );
  expectFailure(
    () => buildSegmentedJsonlV1FromFile(oversizedSource, path.join(tmp, "oversized-store"), {
      segmentTargetBytes: 4096,
      maxRecordBytes: 1024,
    }),
    "RECORD_TOO_LARGE",
  );

  const excessiveTargetStore = path.join(tmp, "manifest-excessive-target");
  fs.cpSync(store, excessiveTargetStore, { recursive: true });
  const excessiveTargetManifestPath = path.join(excessiveTargetStore, "manifest.v1.json");
  const excessiveTargetManifest = JSON.parse(fs.readFileSync(excessiveTargetManifestPath, "utf8"));
  excessiveTargetManifest.segment_target_bytes = VOID_SEGMENTED_JSONL_MAX_TARGET_BYTES_V1 + 1;
  fs.writeFileSync(excessiveTargetManifestPath, `${JSON.stringify(excessiveTargetManifest, null, 2)}\n`);
  expectFailure(
    () => readSegmentedJsonlManifestV1(excessiveTargetStore),
    "INVALID_MANIFEST_RANGE",
  );

  const excessiveRecordStore = path.join(tmp, "manifest-excessive-record");
  fs.cpSync(store, excessiveRecordStore, { recursive: true });
  const excessiveRecordManifestPath = path.join(excessiveRecordStore, "manifest.v1.json");
  const excessiveRecordManifest = JSON.parse(fs.readFileSync(excessiveRecordManifestPath, "utf8"));
  excessiveRecordManifest.segment_target_bytes = VOID_SEGMENTED_JSONL_MAX_TARGET_BYTES_V1;
  excessiveRecordManifest.max_record_bytes = VOID_SEGMENTED_JSONL_MAX_RECORD_BYTES_V1 + 1;
  fs.writeFileSync(excessiveRecordManifestPath, `${JSON.stringify(excessiveRecordManifest, null, 2)}\n`);
  expectFailure(
    () => readSegmentedJsonlManifestV1(excessiveRecordStore),
    "INVALID_MANIFEST_RANGE",
  );

  const reread = readSegmentedJsonlManifestV1(store);
  assert.deepEqual(reread, manifest, "durable manifest must round-trip exactly");

  console.log("VOID_SEGMENTED_JSONL_V1_PROOF_GREEN");
  console.log(
    JSON.stringify({
      source_bytes: body.length,
      records: manifest.total_records,
      sealed_segments: manifest.sealed_segments.length,
      active_bytes: manifest.active.bytes,
      sealed_root_sha256: manifest.sealed_root_sha256,
      reconstruction_sha256: reconstruction.sha256,
      peer_missing_segments: plan.missing.length,
      exact_numeric_policy: true,
      max_segment_target_bytes: VOID_SEGMENTED_JSONL_MAX_TARGET_BYTES_V1,
      max_record_bytes: VOID_SEGMENTED_JSONL_MAX_RECORD_BYTES_V1,
    }),
  );
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
