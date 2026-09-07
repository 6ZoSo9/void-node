// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import assert from "node:assert/strict";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { createRequire, syncBuiltinESMExports } from "node:module";

import {
  buildSegmentedJsonlV1FromFile,
  readSegmentedJsonlManifestV1,
  sealedSegmentInventoryV1,
  serializeSegmentedJsonlManifestV1,
  verifySegmentedJsonlV1,
  type SegmentedJsonlManifestV1,
  type SegmentedJsonlSegmentV1,
} from "../src/storage/segmented_jsonl_v1.js";

const ZERO_HASH = "0".repeat(64);

function sha256(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function sealedRoot(segments: SegmentedJsonlSegmentV1[]): string {
  return sha256(
    JSON.stringify(
      segments.map((segment) => ({
        id: segment.id,
        bytes: segment.bytes,
        records: segment.records,
        first_record_index: segment.first_record_index,
        last_record_index: segment.last_record_index,
        sha256: segment.sha256,
      })),
    ),
  );
}

function expectFailure(action: () => unknown, fragment: string): void {
  let seen = "";
  try {
    action();
  } catch (error) {
    seen = error instanceof Error ? error.message : String(error);
  }
  assert.ok(seen.includes(fragment), `expected ${fragment}, got ${seen}`);
}

function oneSealedManifest(bytes: number): SegmentedJsonlManifestV1 {
  const sealed: SegmentedJsonlSegmentV1[] = [
    {
      id: 0,
      file: "segments/000000000000.jsonl",
      bytes,
      records: 1,
      first_record_index: 0,
      last_record_index: 0,
      sha256: ZERO_HASH,
    },
  ];
  return {
    v: 1,
    format: "VOID_SEGMENTED_JSONL_V1",
    generation: 1,
    segment_target_bytes: 1024,
    max_record_bytes: 1,
    total_bytes: bytes,
    total_records: 1,
    sealed_bytes: bytes,
    sealed_records: 1,
    sealed_root_sha256: sealedRoot(sealed),
    sealed_segments: sealed,
    active: {
      file: "active.jsonl",
      bytes: 0,
      records: 0,
      first_record_index: 1,
      last_record_index: null,
      sha256: ZERO_HASH,
    },
  };
}

function oneActiveManifest(bytes: number): SegmentedJsonlManifestV1 {
  return {
    v: 1,
    format: "VOID_SEGMENTED_JSONL_V1",
    generation: 1,
    segment_target_bytes: 1024,
    max_record_bytes: 1,
    total_bytes: bytes,
    total_records: 1,
    sealed_bytes: 0,
    sealed_records: 0,
    sealed_root_sha256: sealedRoot([]),
    sealed_segments: [],
    active: {
      file: "active.jsonl",
      bytes,
      records: 1,
      first_record_index: 0,
      last_record_index: 0,
      sha256: ZERO_HASH,
    },
  };
}

const smallestValidSealed = oneSealedManifest(2);
assert.equal(sealedSegmentInventoryV1(smallestValidSealed).length, 1);
serializeSegmentedJsonlManifestV1(smallestValidSealed);
expectFailure(() => sealedSegmentInventoryV1(oneSealedManifest(3)), "INVALID_SEGMENT_RANGE");

const smallestValidActive = oneActiveManifest(2);
serializeSegmentedJsonlManifestV1(smallestValidActive);
expectFailure(() => serializeSegmentedJsonlManifestV1(oneActiveManifest(3)), "INVALID_ACTIVE_RANGE");

const require = createRequire(import.meta.url);
const mutableFs = require("node:fs") as typeof fs;

function matchesOpenedTarget(candidateInput: unknown, targetPath: string): boolean {
  if (typeof candidateInput !== "string") return false;
  const candidate = path.resolve(candidateInput);
  const target = path.resolve(targetPath);
  if (candidate === target) return true;
  if (!candidate.includes("/proc/self/fd/") || path.basename(candidate) !== path.basename(target)) return false;
  try {
    return fs.realpathSync(path.dirname(candidate)) === path.dirname(target);
  } catch {
    return false;
  }
}

function makeMultiSegmentFixture(): Buffer {
  const rows: Buffer[] = [];
  for (let i = 0; i < 4; i++) {
    rows.push(Buffer.from(`${JSON.stringify({ v: 1, id: i, payload: "x".repeat(700) })}\n`, "utf8"));
  }
  return Buffer.concat(rows);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-segmented-terminal-generation-v1-"));
try {
  const privateParent = path.join(tmp, "private");
  fs.mkdirSync(privateParent, { mode: 0o700 });
  fs.chmodSync(privateParent, 0o700);

  const durableInvalidStore = path.join(privateParent, "durable-invalid");
  fs.mkdirSync(durableInvalidStore, { mode: 0o700 });
  fs.chmodSync(durableInvalidStore, 0o700);
  fs.writeFileSync(
    path.join(durableInvalidStore, "manifest.v1.json"),
    `${JSON.stringify(oneSealedManifest(3), null, 2)}\n`,
    { mode: 0o600 },
  );
  expectFailure(() => readSegmentedJsonlManifestV1(durableInvalidStore), "INVALID_SEGMENT_RANGE");

  const source = path.join(privateParent, "source.jsonl");
  const store = path.join(privateParent, "store");
  fs.writeFileSync(source, makeMultiSegmentFixture(), { mode: 0o600 });
  const built = buildSegmentedJsonlV1FromFile(source, store, {
    segmentTargetBytes: 1024,
    maxRecordBytes: 900,
  });
  assert.ok(built.sealed_segments.length >= 2, "fixture must contain multiple sealed segments");
  assert.equal(verifySegmentedJsonlV1(store).sealed_segments_verified, built.sealed_segments.length);

  const segment0 = path.join(store, built.sealed_segments[0].file);
  const segment1 = path.join(store, built.sealed_segments[1].file);
  const replacement = `${segment0}.terminal-replacement`;
  fs.writeFileSync(replacement, fs.readFileSync(segment0), { mode: 0o400 });
  fs.chmodSync(replacement, 0o400);

  const originalOpenSync = (mutableFs as any).openSync;
  let swapped = false;
  try {
    (mutableFs as any).openSync = (...args: any[]) => {
      if (!swapped && matchesOpenedTarget(args[0], segment1)) {
        fs.renameSync(replacement, segment0);
        swapped = true;
      }
      return originalOpenSync(...args);
    };
    syncBuiltinESMExports();
    expectFailure(() => verifySegmentedJsonlV1(store), "VERIFY_TERMINAL_LEAF_GENERATION_MISMATCH");
  } finally {
    (mutableFs as any).openSync = originalOpenSync;
    syncBuiltinESMExports();
  }
  assert.equal(swapped, true, "segment 0 must be replaced only after its scan and before segment 1 scan");

  console.log("manifest_max_record_cardinality_bound=true");
  console.log("verify_terminal_tree_generation_bound=true");
  console.log("VOID_SEGMENTED_JSONL_TERMINAL_GENERATION_V1_PROOF_GREEN");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
