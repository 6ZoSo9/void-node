import assert from "node:assert/strict";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { createRequire, syncBuiltinESMExports } from "node:module";

import {
  buildSegmentedJsonlV1FromFile,
  planSegmentReplicationV1,
  readSegmentedJsonlManifestV1,
  reconstructSegmentedJsonlV1ToFile,
  sealedSegmentInventoryV1,
  verifySegmentedJsonlV1,
  VOID_SEGMENTED_JSONL_MAX_MANIFEST_BYTES_V1,
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

const require = createRequire(import.meta.url);
const mutableFs = require("node:fs") as typeof fs;

function sameLengthReplacementBytes(input: Buffer): Buffer {
  const output = Buffer.from(input);
  const at = output.indexOf("x".charCodeAt(0));
  assert.ok(at >= 0, "fixture must contain a mutable payload byte");
  output[at] = "y".charCodeAt(0);
  return output;
}

function proveReconstructRejectsPostVerifyReplacement(
  storePath: string,
  targetPath: string,
  outputPath: string,
  label: string,
): void {
  const replacementPath = `${targetPath}.replacement`;
  const originalBytes = fs.readFileSync(targetPath);
  const replacementBytes = sameLengthReplacementBytes(originalBytes);
  const originalMode = fs.statSync(targetPath).mode & 0o777;
  assert.equal(replacementBytes.length, originalBytes.length);
  fs.writeFileSync(replacementPath, replacementBytes, { mode: originalMode });
  fs.chmodSync(replacementPath, originalMode);

  const originalOpenSync = (mutableFs as any).openSync;
  let targetOpenCount = 0;
  let swapped = false;
  try {
    (mutableFs as any).openSync = (...args: any[]) => {
      const candidate = typeof args[0] === "string" ? path.resolve(args[0]) : "";
      if (candidate === path.resolve(targetPath)) {
        targetOpenCount += 1;
        if (targetOpenCount === 2) {
          fs.renameSync(replacementPath, targetPath);
          swapped = true;
        }
      }
      return originalOpenSync(...args);
    };
    syncBuiltinESMExports();
    expectFailure(
      () => reconstructSegmentedJsonlV1ToFile(storePath, outputPath),
      "RECONSTRUCT_SOURCE_HASH_MISMATCH",
    );
  } finally {
    (mutableFs as any).openSync = originalOpenSync;
    syncBuiltinESMExports();
  }
  assert.equal(swapped, true, `${label} replacement must occur between verify and copy`);
  assert.equal(targetOpenCount >= 2, true, `${label} must be opened for verify and copy`);
}

function proveWritableReplacementRejected(
  targetPath: string,
  targetOpenOrdinal: number,
  action: () => unknown,
  expectedFailure: string,
  label: string,
): void {
  const replacementPath = `${targetPath}.writable-replacement`;
  fs.writeFileSync(replacementPath, fs.readFileSync(targetPath), { mode: 0o600 });
  fs.chmodSync(replacementPath, 0o600);
  const originalOpenSync = (mutableFs as any).openSync;
  let targetOpenCount = 0;
  let swapped = false;
  try {
    (mutableFs as any).openSync = (...args: any[]) => {
      const candidate = typeof args[0] === "string" ? path.resolve(args[0]) : "";
      if (candidate === path.resolve(targetPath)) {
        targetOpenCount += 1;
        if (targetOpenCount === targetOpenOrdinal) {
          fs.renameSync(replacementPath, targetPath);
          swapped = true;
        }
      }
      return originalOpenSync(...args);
    };
    syncBuiltinESMExports();
    expectFailure(action, expectedFailure);
  } finally {
    (mutableFs as any).openSync = originalOpenSync;
    syncBuiltinESMExports();
  }
  assert.equal(swapped, true, `${label} writable replacement must occur`);
}

function proveInScanModeChangeRejected(storePath: string, targetPath: string): void {
  const originalOpenSync = (mutableFs as any).openSync;
  const originalFstatSync = (mutableFs as any).fstatSync;
  let targetFd = -1;
  let changed = false;
  try {
    (mutableFs as any).openSync = (...args: any[]) => {
      const fd = originalOpenSync(...args);
      const candidate = typeof args[0] === "string" ? path.resolve(args[0]) : "";
      if (candidate === path.resolve(targetPath)) targetFd = fd;
      return fd;
    };
    (mutableFs as any).fstatSync = (...args: any[]) => {
      const st = originalFstatSync(...args);
      if (args[0] === targetFd && !changed) {
        fs.chmodSync(targetPath, 0o600);
        changed = true;
      }
      return st;
    };
    syncBuiltinESMExports();
    expectFailure(() => verifySegmentedJsonlV1(storePath), "UNSTABLE_FILE_BEFORE_SCAN");
  } finally {
    (mutableFs as any).openSync = originalOpenSync;
    (mutableFs as any).fstatSync = originalFstatSync;
    syncBuiltinESMExports();
    fs.chmodSync(targetPath, 0o400);
  }
  assert.equal(changed, true, "sealed mode must change after exact-fd admission");
}

function proveManifestReplacementRejected(storePath: string): void {
  const manifestPath = path.join(storePath, "manifest.v1.json");
  const replacementPath = `${manifestPath}.replacement`;
  fs.writeFileSync(replacementPath, fs.readFileSync(manifestPath), { mode: 0o600 });
  const originalOpenSync = (mutableFs as any).openSync;
  const originalReadSync = (mutableFs as any).readSync;
  let manifestFd = -1;
  let swapped = false;
  try {
    (mutableFs as any).openSync = (...args: any[]) => {
      const fd = originalOpenSync(...args);
      const candidate = typeof args[0] === "string" ? path.resolve(args[0]) : "";
      if (candidate === path.resolve(manifestPath)) manifestFd = fd;
      return fd;
    };
    (mutableFs as any).readSync = (...args: any[]) => {
      const n = originalReadSync(...args);
      if (args[0] === manifestFd && n > 0 && !swapped) {
        fs.renameSync(replacementPath, manifestPath);
        swapped = true;
      }
      return n;
    };
    syncBuiltinESMExports();
    expectFailure(() => readSegmentedJsonlManifestV1(storePath), "UNSTABLE_FILE_DURING_READ");
  } finally {
    (mutableFs as any).openSync = originalOpenSync;
    (mutableFs as any).readSync = originalReadSync;
    syncBuiltinESMExports();
  }
  assert.equal(swapped, true, "manifest replacement must occur after exact-fd admission");
}

function proveGrowthReadIsBounded(
  targetPath: string,
  targetOpenOrdinal: number,
  action: () => unknown,
  expectedFailure: string,
  expectedBytes: number,
  label: string,
): void {
  const originalOpenSync = (mutableFs as any).openSync;
  const originalReadSync = (mutableFs as any).readSync;
  let targetOpenCount = 0;
  let targetFd = -1;
  let admittedReadBytes = 0;
  let grew = false;
  try {
    (mutableFs as any).openSync = (...args: any[]) => {
      const fd = originalOpenSync(...args);
      const candidate = typeof args[0] === "string" ? path.resolve(args[0]) : "";
      if (candidate === path.resolve(targetPath)) {
        targetOpenCount += 1;
        if (targetOpenCount === targetOpenOrdinal) targetFd = fd;
      }
      return fd;
    };
    (mutableFs as any).readSync = (...args: any[]) => {
      const n = originalReadSync(...args);
      if (args[0] === targetFd && n > 0) {
        admittedReadBytes += n;
        if (!grew) {
          fs.appendFileSync(targetPath, Buffer.from('{"late":true}\n', "utf8"));
          grew = true;
        }
      }
      return n;
    };
    syncBuiltinESMExports();
    expectFailure(action, expectedFailure);
  } finally {
    (mutableFs as any).openSync = originalOpenSync;
    (mutableFs as any).readSync = originalReadSync;
    syncBuiltinESMExports();
  }
  assert.equal(grew, true, `${label} must grow after the admitted read begins`);
  assert.equal(
    admittedReadBytes <= expectedBytes + 1,
    true,
    `${label} read ${admittedReadBytes} bytes beyond admitted ${expectedBytes}`,
  );
}

function proveManifestPublicationIsCreateOnly(
  sourcePath: string,
  destinationPath: string,
): void {
  const manifestPath = path.join(destinationPath, "manifest.v1.json");
  const sentinel = Buffer.from("foreign-manifest-sentinel\n", "utf8");
  const originalLinkSync = (mutableFs as any).linkSync;
  let occupied = false;
  try {
    (mutableFs as any).linkSync = (...args: any[]) => {
      const target = typeof args[1] === "string" ? path.resolve(args[1]) : "";
      if (!occupied && target.endsWith("/manifest.v1.json")) {
        fs.writeFileSync(manifestPath, sentinel, { flag: "wx", mode: 0o600 });
        occupied = true;
      }
      return originalLinkSync(...args);
    };
    syncBuiltinESMExports();
    expectFailure(
      () => buildSegmentedJsonlV1FromFile(sourcePath, destinationPath, {
        segmentTargetBytes: 16 * 1024,
        maxRecordBytes: 4 * 1024,
      }),
      "MANIFEST_EXISTS_AT_COMMIT",
    );
  } finally {
    (mutableFs as any).linkSync = originalLinkSync;
    syncBuiltinESMExports();
  }
  assert.equal(occupied, true, "foreign manifest must occupy the final name at commit");
  assert.deepEqual(fs.readFileSync(manifestPath), sentinel, "foreign manifest must survive unchanged");
}

function proveFailedLeafCleanupPreservesReplacement(
  sourcePath: string,
  destinationPath: string,
): void {
  const segmentPath = path.join(destinationPath, "segments", "000000000000.jsonl");
  const ownedPath = `${segmentPath}.owned-generation`;
  const sentinel = Buffer.from("foreign-segment-sentinel\n", "utf8");
  const originalFchmodSync = (mutableFs as any).fchmodSync;
  let replaced = false;
  try {
    (mutableFs as any).fchmodSync = (...args: any[]) => {
      if (!replaced && fs.existsSync(segmentPath)) {
        fs.renameSync(segmentPath, ownedPath);
        fs.writeFileSync(segmentPath, sentinel, { flag: "wx", mode: 0o400 });
        replaced = true;
        const error = new Error("injected exact-leaf failure") as NodeJS.ErrnoException;
        error.code = "EIO";
        throw error;
      }
      return originalFchmodSync(...args);
    };
    syncBuiltinESMExports();
    expectFailure(
      () => buildSegmentedJsonlV1FromFile(sourcePath, destinationPath, {
        segmentTargetBytes: 16 * 1024,
        maxRecordBytes: 4 * 1024,
      }),
      "injected exact-leaf failure",
    );
  } finally {
    (mutableFs as any).fchmodSync = originalFchmodSync;
    syncBuiltinESMExports();
  }
  assert.equal(replaced, true, "failed leaf must be replaced before cleanup boundary");
  assert.deepEqual(fs.readFileSync(segmentPath), sentinel, "foreign replacement must survive failure cleanup");
}

function proveManifestParentGenerationSwapHolds(
  sourcePath: string,
  destinationPath: string,
): void {
  const detachedPath = `${destinationPath}.detached`;
  const originalLinkSync = (mutableFs as any).linkSync;
  let swapped = false;
  try {
    (mutableFs as any).linkSync = (...args: any[]) => {
      if (!swapped && typeof args[1] === "string" && String(args[1]).endsWith("/manifest.v1.json")) {
        fs.renameSync(destinationPath, detachedPath);
        fs.mkdirSync(destinationPath, { mode: 0o700 });
        swapped = true;
      }
      return originalLinkSync(...args);
    };
    syncBuiltinESMExports();
    expectFailure(
      () => buildSegmentedJsonlV1FromFile(sourcePath, destinationPath, {
        segmentTargetBytes: 16 * 1024,
        maxRecordBytes: 4 * 1024,
      }),
      "DIRECTORY_AUTHORITY_CHANGED",
    );
  } finally {
    (mutableFs as any).linkSync = originalLinkSync;
    syncBuiltinESMExports();
  }
  assert.equal(swapped, true, "manifest parent generation must be substituted before commit");
  assert.equal(
    fs.existsSync(path.join(destinationPath, "manifest.v1.json")),
    false,
    "manifest publication must not redirect into a substituted parent generation",
  );
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-segmented-jsonl-v1-"));
try {
  const source = path.join(tmp, "source.jsonl");
  const store = path.join(tmp, "store");
  const rebuilt = path.join(tmp, "rebuilt.jsonl");
  const body = makeFixture(500);
  fs.writeFileSync(source, body);

  proveManifestPublicationIsCreateOnly(source, path.join(tmp, "manifest-no-replace-store"));
  proveFailedLeafCleanupPreservesReplacement(source, path.join(tmp, "leaf-cleanup-store"));
  proveManifestParentGenerationSwapHolds(source, path.join(tmp, "manifest-parent-swap-store"));

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

  const verifyWritableStore = path.join(tmp, "verify-writable-replacement-store");
  fs.cpSync(store, verifyWritableStore, { recursive: true });
  proveWritableReplacementRejected(
    path.join(verifyWritableStore, manifest.sealed_segments[0].file),
    1,
    () => verifySegmentedJsonlV1(verifyWritableStore),
    "FILE_MODE_MISMATCH",
    "verification sealed leaf",
  );

  const scanModeStore = path.join(tmp, "verify-mode-change-store");
  fs.cpSync(store, scanModeStore, { recursive: true });
  proveInScanModeChangeRejected(
    scanModeStore,
    path.join(scanModeStore, manifest.sealed_segments[0].file),
  );

  const reconstructWritableStore = path.join(tmp, "reconstruct-writable-replacement-store");
  fs.cpSync(store, reconstructWritableStore, { recursive: true });
  proveWritableReplacementRejected(
    path.join(reconstructWritableStore, manifest.sealed_segments[0].file),
    2,
    () => reconstructSegmentedJsonlV1ToFile(
      reconstructWritableStore,
      path.join(tmp, "reconstruct-writable-replacement-output.jsonl"),
    ),
    "RECONSTRUCT_SOURCE_MODE_MISMATCH",
    "reconstruction sealed leaf",
  );

  const manifestRaceStore = path.join(tmp, "manifest-generation-race-store");
  fs.cpSync(store, manifestRaceStore, { recursive: true });
  proveManifestReplacementRejected(manifestRaceStore);

  const oversizedManifestStore = path.join(tmp, "oversized-manifest-store");
  fs.cpSync(store, oversizedManifestStore, { recursive: true });
  fs.truncateSync(
    path.join(oversizedManifestStore, "manifest.v1.json"),
    VOID_SEGMENTED_JSONL_MAX_MANIFEST_BYTES_V1 + 1,
  );
  expectFailure(
    () => readSegmentedJsonlManifestV1(oversizedManifestStore),
    "MANIFEST_TOO_LARGE",
  );

  const segmentRaceStore = path.join(tmp, "reconstruct-segment-race-store");
  fs.cpSync(store, segmentRaceStore, { recursive: true });
  proveReconstructRejectsPostVerifyReplacement(
    segmentRaceStore,
    path.join(segmentRaceStore, manifest.sealed_segments[0].file),
    path.join(tmp, "reconstruct-segment-race-output.jsonl"),
    "sealed segment",
  );

  const activeRaceStore = path.join(tmp, "reconstruct-active-race-store");
  fs.cpSync(store, activeRaceStore, { recursive: true });
  assert.ok(manifest.active.bytes > 0, "fixture must retain an active segment");
  proveReconstructRejectsPostVerifyReplacement(
    activeRaceStore,
    path.join(activeRaceStore, "active.jsonl"),
    path.join(tmp, "reconstruct-active-race-output.jsonl"),
    "active segment",
  );

  const buildGrowthSource = path.join(tmp, "build-growth-source.jsonl");
  const buildGrowthBody = makeFixture(20);
  fs.writeFileSync(buildGrowthSource, buildGrowthBody);
  proveGrowthReadIsBounded(
    buildGrowthSource,
    1,
    () => buildSegmentedJsonlV1FromFile(
      buildGrowthSource,
      path.join(tmp, "build-growth-store"),
      { segmentTargetBytes: 4096, maxRecordBytes: 1024 },
    ),
    "SOURCE_GREW_DURING_BUILD",
    buildGrowthBody.length,
    "builder source generation",
  );

  const scanGrowthStore = path.join(tmp, "scan-growth-store");
  fs.cpSync(store, scanGrowthStore, { recursive: true });
  const scanGrowthActive = path.join(scanGrowthStore, "active.jsonl");
  const scanGrowthBytes = fs.statSync(scanGrowthActive).size;
  proveGrowthReadIsBounded(
    scanGrowthActive,
    1,
    () => verifySegmentedJsonlV1(scanGrowthStore),
    "FILE_GREW_DURING_SCAN",
    scanGrowthBytes,
    "verification leaf generation",
  );

  const reconstructGrowthStore = path.join(tmp, "reconstruct-growth-store");
  fs.cpSync(store, reconstructGrowthStore, { recursive: true });
  const reconstructGrowthActive = path.join(reconstructGrowthStore, "active.jsonl");
  const reconstructGrowthBytes = fs.statSync(reconstructGrowthActive).size;
  proveGrowthReadIsBounded(
    reconstructGrowthActive,
    2,
    () => reconstructSegmentedJsonlV1ToFile(
      reconstructGrowthStore,
      path.join(tmp, "reconstruct-growth-output.jsonl"),
    ),
    "RECONSTRUCT_SOURCE_GREW_DURING_COPY",
    reconstructGrowthBytes,
    "reconstruction source generation",
  );

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
  expectFailure(() => verifySegmentedJsonlV1(store), "FILE_MODE_MISMATCH");
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

  const invalidUtf8Records = [
    {
      label: "invalid-byte",
      body: Buffer.concat([
        Buffer.from('{"value":"', "utf8"),
        Buffer.from([0xff]),
        Buffer.from('"}\n', "utf8"),
      ]),
    },
    {
      label: "truncated-multibyte",
      body: Buffer.concat([
        Buffer.from('{"value":"', "utf8"),
        Buffer.from([0xe2, 0x82]),
        Buffer.from('"}\n', "utf8"),
      ]),
    },
  ];
  for (const fixture of invalidUtf8Records) {
    const invalidSource = path.join(tmp, `${fixture.label}.jsonl`);
    const strictStore = path.join(tmp, `${fixture.label}-strict-store`);
    const opaqueStore = path.join(tmp, `${fixture.label}-opaque-store`);
    fs.writeFileSync(invalidSource, fixture.body);
    expectFailure(
      () => buildSegmentedJsonlV1FromFile(invalidSource, strictStore, {
        segmentTargetBytes: 4096,
        maxRecordBytes: 1024,
      }),
      "INVALID_UTF8",
    );
    buildSegmentedJsonlV1FromFile(invalidSource, opaqueStore, {
      segmentTargetBytes: 4096,
      maxRecordBytes: 1024,
      validateJson: false,
    });
    expectFailure(
      () => verifySegmentedJsonlV1(opaqueStore),
      "INVALID_UTF8",
    );
    verifySegmentedJsonlV1(opaqueStore, { validateJson: false });
  }

  const validUtf8Source = path.join(tmp, "valid-utf8.jsonl");
  const validUtf8Store = path.join(tmp, "valid-utf8-store");
  fs.writeFileSync(
    validUtf8Source,
    Buffer.from('{"value":"VOID 🌌"}\r\n', "utf8"),
  );
  buildSegmentedJsonlV1FromFile(validUtf8Source, validUtf8Store, {
    segmentTargetBytes: 4096,
    maxRecordBytes: 1024,
  });
  verifySegmentedJsonlV1(validUtf8Store);

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

  for (const [label, mutate, expected] of [
    ["top", (value: any) => { value.extra = true; }, "INVALID_MANIFEST_KEYS"],
    ["segment", (value: any) => { value.sealed_segments[0].extra = true; }, "INVALID_SEGMENT_KEYS"],
    ["active", (value: any) => { value.active.extra = true; }, "INVALID_ACTIVE_KEYS"],
  ] as const) {
    const exactStore = path.join(tmp, `manifest-exact-keys-${label}`);
    fs.cpSync(store, exactStore, { recursive: true });
    const exactPath = path.join(exactStore, "manifest.v1.json");
    const value = JSON.parse(fs.readFileSync(exactPath, "utf8"));
    mutate(value);
    fs.writeFileSync(exactPath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
    expectFailure(() => readSegmentedJsonlManifestV1(exactStore), expected);
  }

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
      exact_utf8_json_records: true,
      admitted_generation_reads_bounded: true,
      reconstruct_copy_generation_bound: true,
      sealed_mode_bound_to_exact_fd_generation: true,
      publication_parent_generation_bound: true,
      manifest_publication_create_only: true,
      failed_leaf_cleanup_preserves_foreign_generation: true,
      manifest_generation_and_retention_bounded: true,
      manifest_runtime_shape_exact: true,
      max_manifest_bytes: VOID_SEGMENTED_JSONL_MAX_MANIFEST_BYTES_V1,
      max_segment_target_bytes: VOID_SEGMENTED_JSONL_MAX_TARGET_BYTES_V1,
      max_record_bytes: VOID_SEGMENTED_JSONL_MAX_RECORD_BYTES_V1,
    }),
  );
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
