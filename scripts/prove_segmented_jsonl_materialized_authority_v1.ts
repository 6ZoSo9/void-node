// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  buildSegmentedJsonlV1FromFile,
  readSegmentedJsonlManifestV1,
  reconstructSegmentedJsonlV1ToFile,
} from "../src/storage/segmented_jsonl_v1.js";
import {
  VOID_SEGMENTED_JSONL_MATERIALIZED_AUTHORITY_V1,
  deriveSegmentedJsonlMaterializedAuthorityV1,
  type SegmentedJsonlMaterializedUseReaderV1,
  verifySegmentedJsonlMaterializedAuthorityAtUseV1,
  verifySegmentedJsonlMaterializedAuthorityObjectV1,
} from "../src/storage/segmented_jsonl_materialized_authority_v1.js";

const base = fs.mkdtempSync(path.join(os.tmpdir(), "void-segmented-materialized-authority-v1-"));
fs.chmodSync(base, 0o700);

function consumeAll(reader: SegmentedJsonlMaterializedUseReaderV1): Buffer {
  const chunks: Buffer[] = [];
  let offset = 0;
  while (offset < reader.total_bytes) {
    const length = Math.min(257, reader.total_bytes - offset);
    chunks.push(reader.read(offset, length));
    offset += length;
  }
  return Buffer.concat(chunks);
}

try {
  const source = path.join(base, "source.jsonl");
  const store = path.join(base, "store");
  const materialized = path.join(base, "materialized.jsonl");

  const records = Array.from({ length: 8 }, (_, index) =>
    JSON.stringify({ index, payload: String(index).repeat(380) }),
  );
  const sourceBytes = Buffer.from(`${records.join("\n")}\n`, "utf8");
  fs.writeFileSync(source, sourceBytes, { mode: 0o600 });

  const manifest = buildSegmentedJsonlV1FromFile(source, store, {
    segmentTargetBytes: 1024,
    maxRecordBytes: 512,
    generation: 1,
  });
  assert.ok(manifest.sealed_segments.length >= 2, "fixture must include sealed generations");

  const reconstructed = reconstructSegmentedJsonlV1ToFile(store, materialized);
  assert.equal(reconstructed.bytes, sourceBytes.length);
  assert.equal(reconstructed.records, records.length);
  assert.deepEqual(fs.readFileSync(materialized), sourceBytes);

  const authority = deriveSegmentedJsonlMaterializedAuthorityV1(store, materialized);
  assert.equal(authority.format, VOID_SEGMENTED_JSONL_MATERIALIZED_AUTHORITY_V1);
  assert.equal(authority.store_generation, 1);
  assert.equal(authority.total_bytes, sourceBytes.length);
  assert.equal(authority.total_records, records.length);
  assert.equal(authority.live_tree_terminal_authority, false);
  assert.equal(authority.materialized_exact_generation_authority, true);
  const consumed = verifySegmentedJsonlMaterializedAuthorityAtUseV1(
    store,
    materialized,
    authority,
    (reader) => consumeAll(reader),
  );
  assert.deepEqual(consumed, sourceBytes);

  // The materialized generation, not the mutable live segmented tree, is the
  // authority that a downstream consumer actually reads.
  const currentManifest = readSegmentedJsonlManifestV1(store);
  const firstSealed = path.join(store, currentManifest.sealed_segments[0].file);
  const originalSealed = fs.readFileSync(firstSealed);
  const changedSealed = Buffer.from(originalSealed);
  changedSealed[0] = changedSealed[0] === 0x7b ? 0x5b : 0x7b;
  fs.chmodSync(firstSealed, 0o600);
  fs.writeFileSync(firstSealed, changedSealed, { mode: 0o600 });
  fs.chmodSync(firstSealed, 0o400);
  const consumedAfterLiveTreeMutation = verifySegmentedJsonlMaterializedAuthorityAtUseV1(
    store,
    materialized,
    authority,
    (reader) => consumeAll(reader),
  );
  assert.deepEqual(consumedAfterLiveTreeMutation, sourceBytes);
  fs.chmodSync(firstSealed, 0o600);
  fs.writeFileSync(firstSealed, originalSealed, { mode: 0o600 });
  fs.chmodSync(firstSealed, 0o400);

  const originalMaterialized = fs.readFileSync(materialized);
  const changedMaterialized = Buffer.from(originalMaterialized);
  changedMaterialized[0] = changedMaterialized[0] === 0x7b ? 0x5b : 0x7b;
  fs.writeFileSync(materialized, changedMaterialized, { mode: 0o600 });
  assert.throws(
    () => verifySegmentedJsonlMaterializedAuthorityAtUseV1(
      store,
      materialized,
      authority,
      (reader) => reader.read(0, 1),
    ),
    /VOID_SEGMENTED_JSONL_MATERIALIZED_AUTHORITY_V1:MATERIALIZED_AUTHORITY_USE_MISMATCH:/,
  );
  fs.writeFileSync(materialized, originalMaterialized, { mode: 0o600 });

  // Rebind to the exact restored generation. Content/snapshot authority is the
  // same, but the file generation is intentionally different after the
  // mutation-and-restore adversary above.
  const restoredAuthority = deriveSegmentedJsonlMaterializedAuthorityV1(store, materialized);
  assert.equal(restoredAuthority.snapshot_sha256, authority.snapshot_sha256);
  assert.equal(restoredAuthority.materialized_sha256, authority.materialized_sha256);
  assert.notEqual(
    restoredAuthority.materialized_generation_sha256,
    authority.materialized_generation_sha256,
  );

  // A same-byte replacement that exists before the at-use boundary is a
  // different generation and cannot inherit the reviewed authority.
  const aside = path.join(base, "materialized.original.jsonl");
  fs.renameSync(materialized, aside);
  fs.writeFileSync(materialized, originalMaterialized, { mode: 0o600 });
  assert.throws(
    () => verifySegmentedJsonlMaterializedAuthorityAtUseV1(
      store,
      materialized,
      restoredAuthority,
      (reader) => reader.read(0, 1),
    ),
    /VOID_SEGMENTED_JSONL_MATERIALIZED_AUTHORITY_V1:MATERIALIZED_AUTHORITY_USE_MISMATCH:/,
  );
  fs.rmSync(materialized);
  fs.renameSync(aside, materialized);

  // Rebind once more because the replacement/restore fixture above may itself
  // advance the original inode's metadata generation.
  const preUseAuthority = deriveSegmentedJsonlMaterializedAuthorityV1(store, materialized);

  // The critical verify->use adversary: replacement happens only after the
  // at-use API has fully reverified the authority and entered the consumer.
  // The retained reader must never consume replacement generation B under A's
  // successful verification result.
  const postVerifyAside = path.join(base, "materialized.post-verify-original.jsonl");
  let postVerifyConsumerEntered = false;
  assert.throws(
    () => verifySegmentedJsonlMaterializedAuthorityAtUseV1(
      store,
      materialized,
      preUseAuthority,
      (reader) => {
        postVerifyConsumerEntered = true;
        fs.renameSync(materialized, postVerifyAside);
        const replacement = Buffer.from(originalMaterialized);
        replacement[0] = replacement[0] === 0x7b ? 0x5b : 0x7b;
        fs.writeFileSync(materialized, replacement, { mode: 0o600 });
        return reader.read(0, 1);
      },
    ),
    /VOID_SEGMENTED_JSONL_MATERIALIZED_AUTHORITY_V1:MATERIALIZED_USE_GENERATION_CHANGED:/,
  );
  assert.equal(postVerifyConsumerEntered, true);
  assert.deepEqual(fs.readFileSync(postVerifyAside), originalMaterialized);
  fs.rmSync(materialized);
  fs.renameSync(postVerifyAside, materialized);

  // A retained fd is not enough if the same inode can still be modified through
  // another hardlink after full at-use verification. The reader must HOLD before
  // returning bytes whenever that exact inode generation changes.
  const sameInodeAlias = path.join(base, "materialized.same-inode-alias.jsonl");
  fs.linkSync(materialized, sameInodeAlias);
  const sameInodeAuthority = deriveSegmentedJsonlMaterializedAuthorityV1(store, materialized);
  const sameInodeMutated = Buffer.from(originalMaterialized);
  sameInodeMutated[0] = sameInodeMutated[0] === 0x7b ? 0x5b : 0x7b;
  let sameInodeConsumerEntered = false;
  assert.throws(
    () => verifySegmentedJsonlMaterializedAuthorityAtUseV1(
      store,
      materialized,
      sameInodeAuthority,
      (reader) => {
        sameInodeConsumerEntered = true;
        const writerFd = fs.openSync(sameInodeAlias, fs.constants.O_RDWR);
        try {
          fs.writeSync(writerFd, sameInodeMutated, 0, sameInodeMutated.length, 0);
          fs.fsyncSync(writerFd);
        } finally {
          fs.closeSync(writerFd);
        }
        return reader.read(0, 1);
      },
    ),
    /VOID_SEGMENTED_JSONL_MATERIALIZED_AUTHORITY_V1:MATERIALIZED_USE_GENERATION_CHANGED:/,
  );
  assert.equal(sameInodeConsumerEntered, true);
  assert.deepEqual(fs.readFileSync(materialized), sameInodeMutated);
  fs.writeFileSync(materialized, originalMaterialized, { mode: 0o600 });
  fs.rmSync(sameInodeAlias);

  // Reader capabilities are scoped to the synchronous retained-fd callback.
  // A caller cannot retain the reader and reopen/consume after the exact fd is
  // closed by the at-use boundary.
  const finalAuthority = deriveSegmentedJsonlMaterializedAuthorityV1(store, materialized);
  let escapedReader: SegmentedJsonlMaterializedUseReaderV1 | null = null;
  const firstByte = verifySegmentedJsonlMaterializedAuthorityAtUseV1(
    store,
    materialized,
    finalAuthority,
    (reader) => {
      escapedReader = reader;
      return reader.read(0, 1)[0];
    },
  );
  assert.equal(firstByte, sourceBytes[0]);
  assert.ok(escapedReader);
  assert.throws(
    () => escapedReader!.read(0, 1),
    /VOID_SEGMENTED_JSONL_MATERIALIZED_AUTHORITY_V1:MATERIALIZED_USE_CLOSED:/,
  );

  // The at-use verifier consumes an externally supplied authority; it must not
  // mint trust from a self-consistent replacement of the mutable local store and
  // materialized file. Replace both with a valid foreign generation while the
  // independently retained authority remains fixed and require fail-closed use.
  const originalStoreAside = path.join(base, "store.independent-authority-original");
  const originalMaterializedAside = path.join(base, "materialized.independent-authority-original.jsonl");
  const foreignSource = path.join(base, "source.foreign.jsonl");
  const foreignText = sourceBytes.toString("utf8").replace('"payload":"000', '"payload":"900');
  const foreignSourceBytes = Buffer.from(foreignText, "utf8");
  assert.equal(foreignSourceBytes.length, sourceBytes.length);
  assert.notDeepEqual(foreignSourceBytes, sourceBytes);
  fs.writeFileSync(foreignSource, foreignSourceBytes, { mode: 0o600 });
  fs.renameSync(store, originalStoreAside);
  fs.renameSync(materialized, originalMaterializedAside);
  buildSegmentedJsonlV1FromFile(foreignSource, store, {
    segmentTargetBytes: 1024,
    maxRecordBytes: 512,
    generation: 1,
  });
  reconstructSegmentedJsonlV1ToFile(store, materialized);
  const foreignAuthority = deriveSegmentedJsonlMaterializedAuthorityV1(store, materialized);
  assert.notEqual(foreignAuthority.snapshot_sha256, finalAuthority.snapshot_sha256);
  assert.notEqual(foreignAuthority.materialized_sha256, finalAuthority.materialized_sha256);
  assert.throws(
    () => verifySegmentedJsonlMaterializedAuthorityAtUseV1(
      store,
      materialized,
      finalAuthority,
      (reader) => reader.read(0, 1),
    ),
    /VOID_SEGMENTED_JSONL_MATERIALIZED_AUTHORITY_V1:MATERIALIZED_AUTHORITY_USE_MISMATCH:/,
  );
  fs.rmSync(store, { recursive: true, force: true });
  fs.rmSync(materialized, { force: true });
  fs.renameSync(originalStoreAside, store);
  fs.renameSync(originalMaterializedAside, materialized);

  const tamperedAuthority = {
    ...finalAuthority,
    total_records: finalAuthority.total_records + 1,
  };
  assert.throws(
    () => verifySegmentedJsonlMaterializedAuthorityObjectV1(tamperedAuthority),
    /VOID_SEGMENTED_JSONL_MATERIALIZED_AUTHORITY_V1:MATERIALIZED_AUTHORITY_DIGEST_MISMATCH:/,
  );

  console.log("materialized_snapshot_exact_generation_authority=true");
  console.log("mutable_live_tree_not_promoted_to_terminal_authority=true");
  console.log("same_byte_replacement_generation_rejected=true");
  console.log("materialized_content_mutation_rejected=true");
  console.log("materialized_verify_to_use_generation_pinned=true");
  console.log("materialized_same_inode_post_verify_mutation_rejected=true");
  console.log("materialized_independent_authority_rejects_local_rewrite=true");
  console.log("materialized_reader_lifetime_bounded=true");
  console.log("VOID_SEGMENTED_JSONL_MATERIALIZED_AUTHORITY_V1_PROOF_GREEN");
} finally {
  fs.rmSync(base, { recursive: true, force: true });
}
