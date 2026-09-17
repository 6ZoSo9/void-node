import assert from "node:assert/strict";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  buildDatanetHierarchyStructureV1,
  segmentRowFromBytesV1,
} from "../src/storage/datanet_immutable_hierarchy_v1.js";
import {
  publishDatanetHierarchyCreateOnlyV1,
  verifyDatanetHierarchyRetainedV1,
  VOID_DATANET_HIERARCHY_PUBLICATION_V1,
} from "../src/storage/datanet_hierarchy_publication_v1.js";

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

function makeRoot(prefix: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  fs.chmodSync(root, 0o700);
  return root;
}

const buffers = Array.from({ length: 10 }, (_, index) => Buffer.alloc(8, index + 1));
const payload = Buffer.concat(buffers);
const structure = buildDatanetHierarchyStructureV1({
  object_id: "publication-scaled",
  generation: "11",
  media_type: "application/octet-stream",
  payload_length: payload.length,
  payload_sha256: sha256(payload),
  segments: buffers.map((buffer, index) => segmentRowFromBytesV1(index, buffer)),
  segment_size: 8,
  leaf_max_segments: 2,
  max_object_segments: 10,
});
assert.equal(structure.leaves.length, 5);

const cleanup: string[] = [];
try {
  const root = makeRoot("void-datanet-hierarchy-publication-");
  cleanup.push(root);
  const receipt = publishDatanetHierarchyCreateOnlyV1(root, structure);
  assert.equal(receipt.schema, VOID_DATANET_HIERARCHY_PUBLICATION_V1);
  assert.equal(receipt.object_id, "publication-scaled");
  assert.equal(receipt.generation, "11");
  assert.equal(receipt.manifest_sha256, structure.manifest_sha256);
  assert.equal(receipt.composition_root, structure.composition_root);
  assert.equal(receipt.leaf_count, 5);
  assert.equal(receipt.retained_file_count, 6);
  assert.equal(receipt.payload_availability_proved, false);
  assert.equal(
    receipt.retained_bytes,
    structure.top_bytes.length + structure.leaves.reduce((sum, leaf) => sum + leaf.bytes.length, 0),
  );
  assert.deepEqual(
    receipt.retained_files.map((entry) => entry.file),
    [
      "leaf-000000.v1.json",
      "leaf-000001.v1.json",
      "leaf-000002.v1.json",
      "leaf-000003.v1.json",
      "leaf-000004.v1.json",
      "top.v1.json",
    ],
  );
  assert.deepEqual(verifyDatanetHierarchyRetainedV1(root, structure), receipt);
  expectFailure(() => publishDatanetHierarchyCreateOnlyV1(root, structure), "PUBLICATION_ALREADY_EXISTS");

  const preexistingRoot = makeRoot("void-datanet-hierarchy-preexisting-");
  cleanup.push(preexistingRoot);
  fs.mkdirSync(path.join(preexistingRoot, `hierarchy-${structure.manifest_sha256}`), { mode: 0o700 });
  expectFailure(
    () => publishDatanetHierarchyCreateOnlyV1(preexistingRoot, structure),
    "PUBLICATION_ALREADY_EXISTS",
  );

  const noncanonicalRoot = makeRoot("void-datanet-hierarchy-noncanonical-");
  cleanup.push(noncanonicalRoot);
  const noncanonical = {
    ...structure,
    leaves: structure.leaves.map((leaf, index) => index === 0
      ? { ...leaf, bytes: Buffer.concat([leaf.bytes, Buffer.from(" ")]) }
      : leaf),
  };
  expectFailure(
    () => publishDatanetHierarchyCreateOnlyV1(noncanonicalRoot, noncanonical),
    "LEAF_CANONICAL_BYTES",
  );

  const corruptRoot = makeRoot("void-datanet-hierarchy-corrupt-");
  cleanup.push(corruptRoot);
  const corruptReceipt = publishDatanetHierarchyCreateOnlyV1(corruptRoot, structure);
  const corruptLeaf = path.join(corruptRoot, corruptReceipt.publication_name, "leaf-000000.v1.json");
  const corruptBytes = fs.readFileSync(corruptLeaf);
  corruptBytes[0] ^= 0x01;
  fs.writeFileSync(corruptLeaf, corruptBytes, { flag: "r+" });
  expectFailure(() => verifyDatanetHierarchyRetainedV1(corruptRoot, structure), "RETAINED_SHA256");

  const truncateRoot = makeRoot("void-datanet-hierarchy-truncate-");
  cleanup.push(truncateRoot);
  const truncateReceipt = publishDatanetHierarchyCreateOnlyV1(truncateRoot, structure);
  const truncateTop = path.join(truncateRoot, truncateReceipt.publication_name, "top.v1.json");
  fs.truncateSync(truncateTop, Math.max(0, structure.top_bytes.length - 1));
  expectFailure(() => verifyDatanetHierarchyRetainedV1(truncateRoot, structure), "RETAINED_SIZE");

  const extraRoot = makeRoot("void-datanet-hierarchy-extra-");
  cleanup.push(extraRoot);
  const extraReceipt = publishDatanetHierarchyCreateOnlyV1(extraRoot, structure);
  fs.writeFileSync(path.join(extraRoot, extraReceipt.publication_name, "unexpected"), "x", { mode: 0o600, flag: "wx" });
  expectFailure(() => verifyDatanetHierarchyRetainedV1(extraRoot, structure), "PUBLICATION_INVENTORY");

  const symlinkRoot = makeRoot("void-datanet-hierarchy-symlink-");
  cleanup.push(symlinkRoot);
  const symlinkReceipt = publishDatanetHierarchyCreateOnlyV1(symlinkRoot, structure);
  const symlinkLeaf = path.join(symlinkRoot, symlinkReceipt.publication_name, "leaf-000000.v1.json");
  const foreign = path.join(symlinkRoot, "foreign");
  fs.writeFileSync(foreign, structure.leaves[0].bytes, { mode: 0o600, flag: "wx" });
  fs.unlinkSync(symlinkLeaf);
  fs.symlinkSync(foreign, symlinkLeaf);
  expectFailure(() => verifyDatanetHierarchyRetainedV1(symlinkRoot, structure), "RETAINED_OPEN");

  const emptyRoot = makeRoot("void-datanet-hierarchy-empty-");
  cleanup.push(emptyRoot);
  const empty = buildDatanetHierarchyStructureV1({
    object_id: "publication-empty",
    generation: "0",
    media_type: "application/octet-stream",
    payload_length: 0,
    payload_sha256: sha256(Buffer.alloc(0)),
    segments: [],
  });
  const emptyReceipt = publishDatanetHierarchyCreateOnlyV1(emptyRoot, empty);
  assert.equal(emptyReceipt.leaf_count, 0);
  assert.equal(emptyReceipt.retained_file_count, 1);
  assert.deepEqual(emptyReceipt.retained_files.map((entry) => entry.file), ["top.v1.json"]);
  assert.equal(emptyReceipt.payload_availability_proved, false);

  console.log("VOID_DATANET_HIERARCHY_PUBLICATION_V1_PROOF_GREEN");
} finally {
  for (const root of cleanup.reverse()) fs.rmSync(root, { recursive: true, force: true });
}
