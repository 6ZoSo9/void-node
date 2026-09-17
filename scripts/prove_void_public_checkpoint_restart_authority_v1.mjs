#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  PRODUCTION_ACCEPTANCE_ID_V1,
  PRODUCTION_AUTHORITY_ID_V1,
  PRODUCTION_BLOCK_COUNT_V1,
  PRODUCTION_CHECKPOINT_DESCRIPTOR_SHA256_V1,
  PRODUCTION_FROZEN_HEAD_V1,
  PRODUCTION_PREFIX_BYTES_V1,
  PRODUCTION_PREFIX_ROOT_V1,
  PRODUCTION_SEGMENT_COUNT_V1,
  assertVoidPublicCheckpointManifestMatchesRestartAuthorityV1,
  loadVoidPublicCheckpointRestartAuthorityV1,
} from "./lib/void_public_checkpoint_restart_authority_v1.mjs";

const MARKER =
  "VOID_PUBLIC_CHECKPOINT_RESTART_AUTHORITY_V1_PROOF";
const root = process.cwd();

const authority =
  loadVoidPublicCheckpointRestartAuthorityV1({
    repoRoot: root,
  });

assert.equal(authority.production, true);
assert.equal(authority.acceptance_id, PRODUCTION_ACCEPTANCE_ID_V1);
assert.equal(authority.source_authority_id, PRODUCTION_AUTHORITY_ID_V1);
assert.equal(authority.prefix_root, PRODUCTION_PREFIX_ROOT_V1);
assert.equal(
  authority.checkpoint_descriptor_sha256,
  PRODUCTION_CHECKPOINT_DESCRIPTOR_SHA256_V1,
);
assert.equal(authority.frozen_head, PRODUCTION_FROZEN_HEAD_V1);
assert.equal(authority.block_count, PRODUCTION_BLOCK_COUNT_V1);
assert.equal(authority.segment_count, PRODUCTION_SEGMENT_COUNT_V1);
assert.equal(authority.total_prefix_bytes, PRODUCTION_PREFIX_BYTES_V1);
assert.equal(authority.descriptors.length, PRODUCTION_SEGMENT_COUNT_V1);

const manifest = {
  head: authority.frozen_head,
  block_count: authority.block_count,
  segment_count: authority.segment_count,
  payload_bytes: authority.total_prefix_bytes,
  manifest: {
    segments: authority.descriptors.map((row) => ({
      name: row.segment,
      path: `segments/${row.segment}/blocks.bin`,
      first: row.from,
      last: row.to,
      blocks: row.to - row.from + 1,
      bytes: row.prefix_bytes,
      sha256: row.prefix_sha256,
    })),
  },
};

assert.equal(
  assertVoidPublicCheckpointManifestMatchesRestartAuthorityV1(
    manifest,
    authority,
  ).accepted,
  true,
);

const badManifest = structuredClone(manifest);
badManifest.manifest.segments[0].sha256 =
  "0".repeat(64);
assert.throws(
  () =>
    assertVoidPublicCheckpointManifestMatchesRestartAuthorityV1(
      badManifest,
      authority,
    ),
  /differs from independently accepted canonical prefix/,
);

const acceptancePath = path.join(
  root,
  "public/mainnet0-historical-cartography-acceptance-v1.json",
);
const original = JSON.parse(fs.readFileSync(acceptancePath, "utf8"));
const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-restart-authority-proof-"),
);
try {
  const badFile = path.join(temp, "bad-acceptance.json");
  const bad = structuredClone(original);
  bad.canonical_prefix_authority.descriptors[0].prefix_sha256 =
    "f".repeat(64);
  fs.writeFileSync(
    badFile,
    `${JSON.stringify(bad)}\n`,
    { mode: 0o600 },
  );

  const fixtureEnv = {
    ...process.env,
    VOID_PUBLIC_BOOTSTRAP_ALLOW_LOOPBACK_FIXTURE: "1",
    VOID_PUBLIC_CHECKPOINT_RESTART_AUTHORITY_FIXTURE: "1",
    VOID_PUBLIC_CHECKPOINT_RESTART_AUTHORITY_FIXTURE_FILE: badFile,
    VOID_PUBLIC_CHECKPOINT_RESTART_AUTHORITY_EXPECTED_ACCEPTANCE_ID:
      PRODUCTION_ACCEPTANCE_ID_V1,
    VOID_PUBLIC_CHECKPOINT_RESTART_AUTHORITY_EXPECTED_AUTHORITY_ID:
      PRODUCTION_AUTHORITY_ID_V1,
    VOID_PUBLIC_CHECKPOINT_RESTART_AUTHORITY_EXPECTED_PREFIX_ROOT:
      PRODUCTION_PREFIX_ROOT_V1,
    VOID_PUBLIC_CHECKPOINT_RESTART_AUTHORITY_EXPECTED_CHECKPOINT_DESCRIPTOR_SHA256:
      PRODUCTION_CHECKPOINT_DESCRIPTOR_SHA256_V1,
  };
  assert.throws(
    () =>
      loadVoidPublicCheckpointRestartAuthorityV1({
        repoRoot: root,
        env: fixtureEnv,
      }),
    /content ID mismatch/,
  );
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

console.log(`acceptance_id=${authority.acceptance_id}`);
console.log(`independent_authority_id=${authority.source_authority_id}`);
console.log(`prefix_root=${authority.prefix_root}`);
console.log(`frozen_head=${authority.frozen_head}`);
console.log(`block_count=${authority.block_count}`);
console.log(`segment_count=${authority.segment_count}`);
console.log(`total_prefix_bytes=${authority.total_prefix_bytes}`);
console.log(
  `checkpoint_descriptor_sha256=${authority.checkpoint_descriptor_sha256}`,
);
console.log("acceptance_content_id_recomputed=true");
console.log("independent_materialization_authority_pinned=true");
console.log("all_196_segment_prefix_commitments_bound=true");
console.log("self_consistent_substitute_manifest_rejected=true");
console.log("acceptance_descriptor_mutation_rejected=true");
console.log("runtime_authority=false");
console.log("validator_authority=false");
console.log("wallet_or_funds_authority=false");
console.log(`${MARKER}_GREEN`);
