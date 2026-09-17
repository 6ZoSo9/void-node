import assert from "node:assert/strict";
import * as crypto from "node:crypto";

import {
  buildDatanetHierarchyStructureV1,
  canonicalJsonFileV1,
  segmentRowFromBytesV1,
  VOID_DATANET_HIERARCHY_DEFAULT_LEAF_MAX_SEGMENTS_V1,
  VOID_DATANET_HIERARCHY_DEFAULT_OBJECT_MAX_SEGMENTS_V1,
  VOID_DATANET_HIERARCHY_DEFAULT_SEGMENT_BYTES_V1,
} from "../src/storage/datanet_immutable_hierarchy_v1.js";

function sha256(data: Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function expectFailure(fn: () => unknown, fragment: string): void {
  let seen = "";
  try {
    fn();
  } catch (error) {
    seen = error instanceof Error ? error.message : String(error);
  }
  assert.ok(seen.includes(fragment), `expected failure containing ${fragment}, got ${seen}`);
}

assert.equal(
  canonicalJsonFileV1({ z: 1, a: [true, "x"] }).toString("utf8"),
  '{"a":[true,"x"],"z":1}\n',
);

const empty = buildDatanetHierarchyStructureV1({
  object_id: "empty",
  generation: "0",
  media_type: "application/octet-stream",
  payload_length: 0,
  payload_sha256: sha256(Buffer.alloc(0)),
  segments: [],
});
assert.equal(empty.leaves.length, 0);
assert.equal(empty.top.leaf_count, 0);
assert.equal(empty.top.segment_count, 0);
assert.equal(empty.top.segment_hashes_root, "395c2f5598a1643a205154c6f4c46ce36895b28e6c35660a95e5c6fd5ef9aeab");

const oneBytes = Buffer.from("abc", "utf8");
const one = buildDatanetHierarchyStructureV1({
  object_id: "tiny",
  generation: "7",
  media_type: "application/octet-stream",
  payload_length: oneBytes.length,
  payload_sha256: sha256(oneBytes),
  segments: [segmentRowFromBytesV1(0, oneBytes)],
  segment_size: 3,
  leaf_max_segments: 1,
  max_object_segments: 1,
});
assert.equal(one.leaves.length, 1);
assert.equal(one.top.segment_hashes_root, "49ea68b811a9c8c79aeafa446dbcaf877a868a6940cf5670fa2cdbd73081511f");
assert.equal(one.leaves[0].manifest.segment_rows_root, "b89c1974ef5f790a14a1e2473bd94fe5a97df675368d61b33e33b981ca651374");
assert.equal(one.manifest_sha256, "97b56a5d690922b13c3a1ca46e27b709de5b74f28b97b5da61585d2eb8cc9e6e");
assert.equal(one.composition_root, "7b6e74d2e8d192e00953aadb021e7e7e737e483189721e7072621caa56f8be52");

const scaledBuffers = Array.from({ length: 34 }, (_, index) => Buffer.alloc(4096, index));
const scaledPayload = Buffer.concat(scaledBuffers);
const scaled = buildDatanetHierarchyStructureV1({
  object_id: "scaled-34",
  generation: "9",
  media_type: "application/octet-stream",
  payload_length: scaledPayload.length,
  payload_sha256: sha256(scaledPayload),
  segments: scaledBuffers.map((buffer, index) => segmentRowFromBytesV1(index, buffer)),
  segment_size: 4096,
  leaf_max_segments: 8,
  max_object_segments: 34,
});
assert.deepEqual(scaled.leaves.map((leaf) => leaf.manifest.segment_count), [8, 8, 8, 8, 2]);
assert.deepEqual(scaled.leaves.map((leaf) => leaf.manifest.first_segment), [0, 8, 16, 24, 32]);
assert.equal(scaled.top.leaf_count, 5);
assert.equal(scaled.top.segment_count, 34);
assert.equal(scaled.top.payload_length, 139_264);
assert.equal(scaled.leaves.reduce((sum, leaf) => sum + leaf.manifest.byte_length, 0), 139_264);

const badShort = scaledBuffers.map((buffer, index) => segmentRowFromBytesV1(index, buffer));
badShort[7] = { ...badShort[7], byte_length: 4095 };
expectFailure(
  () => buildDatanetHierarchyStructureV1({
    object_id: "bad-short",
    generation: "1",
    media_type: "application/octet-stream",
    payload_length: scaledPayload.length,
    payload_sha256: sha256(scaledPayload),
    segments: badShort,
    segment_size: 4096,
    leaf_max_segments: 8,
    max_object_segments: 34,
  }),
  "SEGMENT_BYTE_LENGTH",
);

const reordered = scaledBuffers.map((buffer, index) => segmentRowFromBytesV1(index, buffer));
[reordered[0], reordered[1]] = [reordered[1], reordered[0]];
expectFailure(
  () => buildDatanetHierarchyStructureV1({
    object_id: "bad-order",
    generation: "1",
    media_type: "application/octet-stream",
    payload_length: scaledPayload.length,
    payload_sha256: sha256(scaledPayload),
    segments: reordered,
    segment_size: 4096,
    leaf_max_segments: 8,
    max_object_segments: 34,
  }),
  "SEGMENT_INDEX_ORDER",
);

expectFailure(
  () => buildDatanetHierarchyStructureV1({
    object_id: "bad-generation",
    generation: "01",
    media_type: "application/octet-stream",
    payload_length: 0,
    payload_sha256: sha256(Buffer.alloc(0)),
    segments: [],
  }),
  "GENERATION",
);
expectFailure(
  () => buildDatanetHierarchyStructureV1({
    object_id: "e\u0301",
    generation: "1",
    media_type: "application/octet-stream",
    payload_length: 0,
    payload_sha256: sha256(Buffer.alloc(0)),
    segments: [],
  }),
  "OBJECT_ID_NFC",
);
expectFailure(
  () => buildDatanetHierarchyStructureV1({
    object_id: "bad-media",
    generation: "1",
    media_type: "application/octet-stream\n",
    payload_length: 0,
    payload_sha256: sha256(Buffer.alloc(0)),
    segments: [],
  }),
  "MEDIA_TYPE",
);
expectFailure(
  () => buildDatanetHierarchyStructureV1({
    object_id: "bad-parameters",
    generation: "1",
    media_type: "application/octet-stream",
    payload_length: 0,
    payload_sha256: sha256(Buffer.alloc(0)),
    segments: [],
    segment_size: 4096,
    leaf_max_segments: 8,
    max_object_segments: 41,
  }),
  "PARAMETER_LEAF_COUNT",
);
expectFailure(
  () => buildDatanetHierarchyStructureV1({
    object_id: "too-many",
    generation: "1",
    media_type: "application/octet-stream",
    payload_length: (VOID_DATANET_HIERARCHY_DEFAULT_OBJECT_MAX_SEGMENTS_V1 + 1) * VOID_DATANET_HIERARCHY_DEFAULT_SEGMENT_BYTES_V1,
    payload_sha256: sha256(Buffer.alloc(0)),
    segments: [],
  }),
  "PAYLOAD_LENGTH",
);
expectFailure(
  () => buildDatanetHierarchyStructureV1({
    object_id: "unknown-key",
    generation: "1",
    media_type: "application/octet-stream",
    payload_length: 0,
    payload_sha256: sha256(Buffer.alloc(0)),
    segments: [],
    extra: true,
  } as any),
  "INPUT_KEY",
);

assert.equal(VOID_DATANET_HIERARCHY_DEFAULT_SEGMENT_BYTES_V1, 8_388_608);
assert.equal(VOID_DATANET_HIERARCHY_DEFAULT_LEAF_MAX_SEGMENTS_V1, 31_190);
assert.equal(VOID_DATANET_HIERARCHY_DEFAULT_OBJECT_MAX_SEGMENTS_V1, 131_072);

console.log("VOID_DATANET_IMMUTABLE_HIERARCHY_V1_PROOF_GREEN");
