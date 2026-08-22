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

  // A same-byte replacement that exists before the at-use boundary is a
  // different generation and cannot inherit the reviewed authority.
  const aside = path.join(base, "materialized.original.jsonl");
  fs.renameSync(materialized, aside);
  fs.writeFileSync(materialized, originalMaterialized, { mode: 0o600 });
  assert.throws(
    () => verifySegmentedJsonlMaterializedAuthorityAtUseV1(
      store,
      materialized,
      authority,
      (reader) => reader.read(0, 1),
    ),
    /VOID_SEGMENTED_JSONL_MATERIALIZED_AUTHORITY_V1:MATERIALIZED_AUTHORITY_USE_MISMATCH:/,
  );
  fs.rmSync(materialized);
  fs.renameSync(aside, materialized);

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
      authority,
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

  // Reader capabilities are scoped to the synchronous retained-fd callback.
  // A caller cannot retain the reader and reopen/consume after the exact fd is
  // closed by the at-use boundary.
  let escapedReader: SegmentedJsonlMaterializedUseReaderV1 | null = null;
  const firstByte = verifySegmentedJsonlMaterializedAuthorityAtUseV1(
    store,
    materialized,
    authority,
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

  const tamperedAuthority = {
    ...authority,
    total_records: authority.total_records + 1,
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
  console.log("materialized_reader_lifetime_bounded=true");
  console.log("VOID_SEGMENTED_JSONL_MATERIALIZED_AUTHORITY_V1_PROOF_GREEN");
} finally {
  fs.rmSync(base, { recursive: true, force: true });
}
