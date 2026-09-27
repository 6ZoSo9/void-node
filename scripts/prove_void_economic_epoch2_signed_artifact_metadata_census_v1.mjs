#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_ECONOMIC_EPOCH2_SIGNED_ARTIFACT_METADATA_CENSUS_AUTHORITY_V1,
  VOID_ECONOMIC_EPOCH2_SIGNED_ARTIFACT_METADATA_CENSUS_V1,
  VoidEconomicEpoch2SignedArtifactMetadataCensusHoldV1,
  discoverVoidSignedArtifactMetadataV1,
} from "../tools/void-economic-epoch2-signed-artifact-metadata-census-v1.mjs";

function expectHold(run, reason) {
  assert.throws(
    run,
    (error) =>
      error instanceof
        VoidEconomicEpoch2SignedArtifactMetadataCensusHoldV1 &&
      error.reason === reason,
    reason,
  );
}

const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-signed-artifact-metadata-census-proof-"),
);
const root = path.join(temp, "void-owned-artifacts");
const nested = path.join(root, "archive");
const outside = path.join(temp, "operator-selected");
fs.mkdirSync(nested, { recursive: true, mode: 0o700 });
fs.mkdirSync(outside, { recursive: true, mode: 0o700 });

const signed = path.join(root, "void-role-authority-deployment-signed-v1.txt");
const notes = path.join(nested, "notes.txt");
const explicit = path.join(outside, "historical-transaction-candidate.bin");

fs.writeFileSync(
  signed,
  "THIS_CONTENT_MUST_NOT_BE_READ_PRIVATE_KEY_SENTINEL\n",
  { mode: 0o000 },
);
fs.writeFileSync(
  notes,
  "THIS_CONTENT_MUST_NOT_BE_READ_MNEMONIC_SENTINEL\n",
  { mode: 0o000 },
);
fs.writeFileSync(
  explicit,
  "THIS_CONTENT_MUST_NOT_BE_READ_EXPLICIT_SENTINEL\n",
  { mode: 0o000 },
);

try {
  const first = discoverVoidSignedArtifactMetadataV1({
    roots: [root],
    files: [explicit],
  });
  assert.equal(
    first.marker,
    VOID_ECONOMIC_EPOCH2_SIGNED_ARTIFACT_METADATA_CENSUS_V1,
  );
  assert.equal(first.status, "METADATA_CENSUS_READY_OPERATOR_REVIEW_REQUIRED");
  assert.match(first.census_material_sha256, /^[0-9a-f]{64}$/);
  assert.equal(first.discovered_file_count, 3);
  assert.equal(first.candidate_name_hint_count, 1);
  assert.equal(first.scanned_file_content_read, false);
  assert.equal(first.arbitrary_home_scan_performed, false);
  assert.equal(first.pending_legacy_signed_transaction_census_complete, false);
  assert.equal(first.privileged_signer_nonce_or_key_replay_fence_proven, false);
  assert.equal(first.cross_epoch_replay_protection_proven, false);
  assert.equal(
    first.known_repository_lineage_count,
    20,
  );
  assert.equal(
    first.known_repository_lineage_set_sha256,
    "84c3b99115d6dbc9f5ec909c190a1c69e7e692d8123c241f66dac79e66a5741d",
  );
  assert.equal(
    first.next_gate,
    "operator_review_then_explicit_exact_raw_transaction_inspection_v1",
  );

  const byBase = new Map(first.files.map((row) => [row.basename, row]));
  assert.equal(
    byBase.get("void-role-authority-deployment-signed-v1.txt")
      ?.candidate_name_hint,
    true,
  );
  assert.equal(byBase.get("notes.txt")?.candidate_name_hint, false);
  assert.equal(
    byBase.get("historical-transaction-candidate.bin")?.source_kind,
    "explicit_operator_file",
  );
  for (const row of first.files) {
    assert.equal(row.content_read, false);
    assert.match(row.path_sha256, /^[0-9a-f]{64}$/);
    assert.equal(typeof row.size_bytes, "number");
  }

  const second = discoverVoidSignedArtifactMetadataV1({
    roots: [root],
    files: [explicit],
  });
  assert.equal(second.census_material_sha256, first.census_material_sha256);
  assert.deepEqual(second.files, first.files);

  const explicitOnly = discoverVoidSignedArtifactMetadataV1({
    roots: [],
    files: [explicit],
  });
  assert.equal(explicitOnly.discovered_file_count, 1);
  assert.equal(explicitOnly.files[0].source_kind, "explicit_operator_file");
  assert.equal(explicitOnly.scanned_file_content_read, false);

  expectHold(
    () => discoverVoidSignedArtifactMetadataV1({ roots: [], files: [] }),
    "explicit_census_scope_required",
  );

  expectHold(
    () =>
      discoverVoidSignedArtifactMetadataV1({
        roots: [os.homedir()],
        files: [],
      }),
    "broad_root_forbidden",
  );

  const generic = path.join(temp, "generic-artifacts");
  fs.mkdirSync(generic, { mode: 0o700 });
  expectHold(
    () =>
      discoverVoidSignedArtifactMetadataV1({
        roots: [generic],
        files: [],
      }),
    "root_not_void_owned_by_name",
  );

  const voidParent = path.join(temp, "void-parent");
  const genericChild = path.join(voidParent, "personal-child");
  fs.mkdirSync(genericChild, { recursive: true, mode: 0o700 });
  expectHold(
    () =>
      discoverVoidSignedArtifactMetadataV1({
        roots: [genericChild],
        files: [],
      }),
    "root_not_void_owned_by_name",
  );

  expectHold(
    () =>
      discoverVoidSignedArtifactMetadataV1({
        roots: [root, root],
        files: [],
      }),
    "duplicate_root_rejected",
  );

  expectHold(
    () =>
      discoverVoidSignedArtifactMetadataV1({
        roots: [root],
        files: [signed],
      }),
    "explicit_file_already_in_root_scan",
  );

  const link = path.join(root, "void-signed-link.txt");
  fs.symlinkSync(explicit, link);
  expectHold(
    () =>
      discoverVoidSignedArtifactMetadataV1({
        roots: [root],
        files: [],
      }),
    "symlink_descendant_rejected",
  );
  fs.unlinkSync(link);

  const linkRoot = path.join(temp, "void-link-root");
  fs.symlinkSync(root, linkRoot);
  expectHold(
    () =>
      discoverVoidSignedArtifactMetadataV1({
        roots: [linkRoot],
        files: [],
      }),
    "symlink_path_rejected",
  );

  const registry = JSON.parse(
    fs.readFileSync(
      "ops/mainnet0/economic-epoch2-known-signed-transaction-lineages-v1.json",
      "utf8",
    ),
  );
  assert.equal(registry.interpretation.known_repository_evidence_lineage_count, 20);
  assert.equal(
    registry.lineage_set_sha256,
    first.known_repository_lineage_set_sha256,
  );
  assert.equal(
    registry.interpretation.pending_legacy_signed_transaction_census_complete,
    false,
  );

  for (const [key, value] of Object.entries(
    VOID_ECONOMIC_EPOCH2_SIGNED_ARTIFACT_METADATA_CENSUS_AUTHORITY_V1,
  )) {
    assert.equal(
      key === "source_only" ||
        key === "explicit_operator_paths_only" ||
        key === "metadata_read" ||
        key === "local_receipt_write"
        ? value
        : !value,
      true,
      key,
    );
  }

  const source = fs.readFileSync(
    "tools/void-economic-epoch2-signed-artifact-metadata-census-v1.mjs",
    "utf8",
  );
  assert.doesNotMatch(source, /readFileSync\s*\(/);
  assert.doesNotMatch(source, /createReadStream\s*\(/);
  assert.doesNotMatch(source, /readFile\s*\(/);
  assert.doesNotMatch(source, /eth_sendRawTransaction|eth_sendTransaction/);
  assert.doesNotMatch(source, /PRIVATE_KEY\s*=|process\.env\.[A-Z0-9_]*PRIVATE_KEY/i);
  assert.match(source, /broad_root_forbidden/);
  assert.match(source, /explicit_census_scope_required/);
  assert.match(source, /directory_metadata_read_failed/);
  assert.match(source, /maximum_total_discovered_files_exceeded/);
  assert.match(source, /path\.basename\(resolved\)/);
  assert.match(source, /symlink_descendant_rejected/);
  assert.match(source, /scanned_file_content_read: false/);

  console.log("VOID_ECONOMIC_EPOCH2_SIGNED_ARTIFACT_METADATA_CENSUS_V1_GREEN");
  console.log("known_repository_lineage_count=20");
  console.log("explicit_operator_paths_only=true");
  console.log("explicit_file_only_scope_supported=true");
  console.log("filesystem_metadata_failures_map_to_hold=true");
  console.log("void_owned_root_requires_matching_basename=true");
  console.log("global_discovered_file_cap_enforced=true");
  console.log("broad_home_or_downloads_root_forbidden=true");
  console.log("scanned_file_content_read=false");
  console.log("symlink_paths_rejected=true");
  console.log("pending_legacy_signed_transaction_census_complete=false");
  console.log("privileged_signer_nonce_or_key_replay_fence_proven=false");
  console.log("cross_epoch_replay_protection_proven=false");
} finally {
  fs.chmodSync(signed, 0o600);
  fs.chmodSync(notes, 0o600);
  fs.chmodSync(explicit, 0o600);
  fs.rmSync(temp, { recursive: true, force: true });
}
