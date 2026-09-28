#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import { spawnSync } from "node:child_process";
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
const venv = path.join(root, "venv");
const venvNested = path.join(venv, "lib", "python", "site-packages");
let deepBoundary = root;
for (let depth = 1; depth <= 13; depth += 1) {
  deepBoundary = path.join(
    deepBoundary,
    "depth-" + String(depth).padStart(2, "0"),
  );
}
const outside = path.join(temp, "operator-selected");
fs.mkdirSync(nested, { recursive: true, mode: 0o700 });
fs.mkdirSync(venvNested, { recursive: true, mode: 0o700 });
fs.mkdirSync(deepBoundary, { recursive: true, mode: 0o700 });
fs.mkdirSync(outside, { recursive: true, mode: 0o700 });

const signed = path.join(root, "void-role-authority-deployment-signed-v1.txt");
const notes = path.join(nested, "notes.txt");
const generatedDependency = path.join(venvNested, "generated-dependency.py");
const deepBoundarySentinel = path.join(
  deepBoundary,
  "must-not-enumerate-or-read.txt",
);
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
  generatedDependency,
  "THIS_GENERATED_DEPENDENCY_CONTENT_MUST_NOT_BE_ENUMERATED_OR_READ\n",
  { mode: 0o000 },
);
fs.writeFileSync(
  deepBoundarySentinel,
  "THIS_DEPTH_BOUNDARY_CONTENT_MUST_NOT_BE_ENUMERATED_OR_READ\n",
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
  assert.equal(first.symlink_descendant_count, 0);
  assert.equal(first.symlink_candidate_name_hint_count, 0);
  assert.deepEqual(first.symlink_descendants, []);
  assert.equal(first.skipped_generated_subtree_count, 1);
  assert.equal(first.skipped_generated_subtrees.length, 1);
  assert.equal(first.skipped_generated_subtrees[0].absolute_path, venv);
  assert.equal(first.skipped_generated_subtrees[0].basename, "venv");
  assert.equal(
    first.skipped_generated_subtrees[0].skip_reason,
    "generated_dependency_or_cache_directory",
  );
  assert.equal(
    first.skipped_generated_subtrees[0].contents_enumerated,
    false,
  );
  assert.equal(first.skipped_generated_subtrees[0].content_read, false);
  assert.equal(first.skipped_generated_subtrees[0].followed, false);
  assert.equal(
    first.files.some((row) => row.absolute_path === generatedDependency),
    false,
  );
  assert.equal(first.skipped_depth_subtree_count, 1);
  assert.equal(first.skipped_depth_subtrees.length, 1);
  assert.equal(first.skipped_depth_subtrees[0].absolute_path, deepBoundary);
  assert.equal(first.skipped_depth_subtrees[0].basename, "depth-13");
  assert.equal(
    first.skipped_depth_subtrees[0].skip_reason,
    "maximum_scan_depth_boundary",
  );
  assert.equal(first.skipped_depth_subtrees[0].subtree_depth, 13);
  assert.equal(first.skipped_depth_subtrees[0].maximum_scan_depth, 12);
  assert.equal(first.skipped_depth_subtrees[0].contents_enumerated, false);
  assert.equal(first.skipped_depth_subtrees[0].content_read, false);
  assert.equal(first.skipped_depth_subtrees[0].followed, false);
  assert.equal(
    first.files.some((row) => row.absolute_path === deepBoundarySentinel),
    false,
  );
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
  assert.equal(
    byBase.get("historical-transaction-candidate.bin")?.candidate_name_hint,
    false,
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
  const partitionChildFile = path.join(
    genericChild,
    "void-signed-transaction-child-v1.bin",
  );
  fs.mkdirSync(genericChild, { recursive: true, mode: 0o700 });
  fs.writeFileSync(
    partitionChildFile,
    "THIS_PARTITION_CHILD_CONTENT_MUST_NOT_BE_READ\n",
    { mode: 0o000 },
  );
  expectHold(
    () =>
      discoverVoidSignedArtifactMetadataV1({
        roots: [genericChild],
        files: [],
      }),
    "root_not_void_owned_by_name",
  );

  const partitionChild = discoverVoidSignedArtifactMetadataV1({
    roots: [],
    partitionChildRoots: [genericChild],
    files: [],
  });
  assert.equal(partitionChild.discovered_file_count, 1);
  assert.equal(partitionChild.partition_child_root_count, 1);
  assert.deepEqual(partitionChild.roots, [genericChild]);
  assert.deepEqual(partitionChild.partition_child_root_bindings, [
    {
      root: genericChild,
      approved_parent: voidParent,
    },
  ]);
  assert.equal(
    partitionChild.files[0].source_kind,
    "partition_child_root",
  );
  assert.equal(partitionChild.files[0].absolute_path, partitionChildFile);
  assert.equal(partitionChild.files[0].candidate_name_hint, true);
  assert.equal(partitionChild.files[0].content_read, false);

  const genericParent = path.join(temp, "generic-parent");
  const invalidPartitionChild = path.join(genericParent, "child");
  fs.mkdirSync(invalidPartitionChild, { recursive: true, mode: 0o700 });
  expectHold(
    () =>
      discoverVoidSignedArtifactMetadataV1({
        roots: [],
        partitionChildRoots: [invalidPartitionChild],
        files: [],
      }),
    "partition_child_parent_not_void_owned_by_name",
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
  const symlinkObserved = discoverVoidSignedArtifactMetadataV1({
    roots: [root],
    files: [],
  });
  assert.equal(symlinkObserved.discovered_file_count, 2);
  assert.equal(symlinkObserved.symlink_descendant_count, 1);
  assert.equal(symlinkObserved.symlink_candidate_name_hint_count, 1);
  assert.equal(symlinkObserved.symlink_descendants.length, 1);
  assert.equal(
    symlinkObserved.symlink_descendants[0].absolute_path,
    link,
  );
  assert.equal(
    symlinkObserved.symlink_descendants[0].basename,
    "void-signed-link.txt",
  );
  assert.equal(
    symlinkObserved.symlink_descendants[0].source_kind,
    "symlink_descendant",
  );
  assert.equal(
    symlinkObserved.symlink_descendants[0].candidate_name_hint,
    true,
  );
  assert.equal(
    symlinkObserved.symlink_descendants[0].content_read,
    false,
  );
  assert.equal(
    symlinkObserved.symlink_descendants[0].symlink_target_read,
    false,
  );
  assert.equal(
    symlinkObserved.symlink_descendants[0].followed,
    false,
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

  const receiptPath = path.join(temp, "metadata-census-receipt.json");
  const cli = spawnSync(
    process.execPath,
    [
      "tools/void-economic-epoch2-signed-artifact-metadata-census-v1.mjs",
      "--file",
      explicit,
      "--out",
      receiptPath,
      "--apply",
      "--confirmation",
      "discoverVoidSignedArtifactCandidates",
    ],
    { encoding: "utf8" },
  );
  assert.equal(cli.status, 0, cli.stderr);
  const receiptStat = fs.lstatSync(receiptPath);
  assert.equal(receiptStat.isFile(), true);
  assert.equal((receiptStat.mode & 0o777).toString(8), "600");
  const cliReceipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
  assert.equal(cliReceipt.discovered_file_count, 1);
  assert.equal(cliReceipt.scanned_file_content_read, false);
  assert.equal(
    cliReceipt.pending_legacy_signed_transaction_census_complete,
    false,
  );

  const partitionReceiptPath = path.join(
    temp,
    "metadata-census-partition-child-receipt.json",
  );
  const partitionCli = spawnSync(
    process.execPath,
    [
      "tools/void-economic-epoch2-signed-artifact-metadata-census-v1.mjs",
      "--partition-child-root",
      genericChild,
      "--out",
      partitionReceiptPath,
      "--apply",
      "--confirmation",
      "discoverVoidSignedArtifactCandidates",
    ],
    { encoding: "utf8" },
  );
  assert.equal(partitionCli.status, 0, partitionCli.stderr);
  const partitionCliReceipt = JSON.parse(
    fs.readFileSync(partitionReceiptPath, "utf8"),
  );
  assert.equal(partitionCliReceipt.partition_child_root_count, 1);
  assert.equal(
    partitionCliReceipt.partition_child_root_bindings[0].approved_parent,
    voidParent,
  );
  assert.equal(partitionCliReceipt.scanned_file_content_read, false);

  const duplicateCli = spawnSync(
    process.execPath,
    [
      "tools/void-economic-epoch2-signed-artifact-metadata-census-v1.mjs",
      "--file",
      explicit,
      "--out",
      receiptPath,
      "--apply",
      "--confirmation",
      "discoverVoidSignedArtifactCandidates",
    ],
    { encoding: "utf8" },
  );
  assert.notEqual(duplicateCli.status, 0);
  assert.match(duplicateCli.stderr, /output_receipt_already_exists/);

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
  assert.match(source, /partition_child_parent_not_void_owned_by_name/);
  assert.match(source, /partition_child_root_realpath_mismatch/);
  assert.match(source, /source_kind: "partition_child_root"/);
  assert.match(source, /--partition-child-root/);
  assert.match(source, /directory_metadata_read_failed/);
  assert.match(source, /maximum_total_discovered_files_exceeded/);
  assert.match(source, /path\.basename\(resolved\)/);
  assert.match(source, /O_NOFOLLOW/);
  assert.match(source, /O_DIRECTORY/);
  assert.match(source, /\/proc\/self\/fd\//);
  assert.match(source, /directory_entry_changed_during_open/);
  assert.match(source, /descendant_escaped_approved_root/);
  assert.match(source, /opened\.dev !== before\.dev \|\| opened\.ino !== before\.ino/);
  assert.match(source, /fs\.linkSync\(temporary, resolved\)/);
  assert.match(source, /fsyncDirectory\(parent\)/);
  assert.match(source, /source_kind: "symlink_descendant"/);
  assert.match(source, /symlink_target_read: false/);
  assert.match(source, /source_kind: "skipped_generated_subtree"/);
  assert.match(source, /generated_dependency_or_cache_directory/);
  assert.match(source, /contents_enumerated: false/);
  assert.match(source, /MAX_SKIPPED_GENERATED_SUBTREES/);
  assert.match(source, /source_kind: "skipped_depth_subtree"/);
  assert.match(source, /maximum_scan_depth_boundary/);
  assert.match(source, /MAX_SKIPPED_DEPTH_SUBTREES/);
  assert.match(source, /maximum_scan_depth: MAX_DEPTH/);
  assert.match(source, /contents_enumerated: false/);
  assert.match(source, /followed: false/);
  assert.match(source, /scanned_file_content_read: false/);

  console.log("VOID_ECONOMIC_EPOCH2_SIGNED_ARTIFACT_METADATA_CENSUS_V1_GREEN");
  console.log("known_repository_lineage_count=20");
  console.log("explicit_operator_paths_only=true");
  console.log("explicit_file_only_scope_supported=true");
  console.log("filesystem_metadata_failures_map_to_hold=true");
  console.log("void_owned_root_requires_matching_basename=true");
  console.log("partition_child_root_requires_void_owned_immediate_parent=true");
  console.log("partition_child_root_content_read=false");
  console.log("global_discovered_file_cap_enforced=true");
  console.log("descriptor_relative_nofollow_descent=true");
  console.log("directory_inode_stability_checked=true");
  console.log("descendant_realpath_contained_by_approved_root=true");
  console.log("private_receipt_atomic_create_once=true");
  console.log("broad_home_or_downloads_root_forbidden=true");
  console.log("scanned_file_content_read=false");
  console.log("symlink_root_and_explicit_paths_rejected=true");
  console.log("symlink_descendants_recorded_no_follow=true");
  console.log("symlink_target_read=false");
  console.log("generated_dependency_cache_subtrees_recorded_and_skipped=true");
  console.log("generated_subtree_contents_enumerated=false");
  console.log("depth_boundary_subtrees_recorded_and_skipped=true");
  console.log("depth_boundary_contents_enumerated=false");
  console.log("maximum_scan_depth=12");
  console.log("pending_legacy_signed_transaction_census_complete=false");
  console.log("privileged_signer_nonce_or_key_replay_fence_proven=false");
  console.log("cross_epoch_replay_protection_proven=false");
} finally {
  fs.chmodSync(signed, 0o600);
  fs.chmodSync(notes, 0o600);
  fs.chmodSync(explicit, 0o600);
  fs.chmodSync(generatedDependency, 0o600);
  fs.chmodSync(deepBoundarySentinel, 0o600);
  fs.chmodSync(partitionChildFile, 0o600);
  fs.rmSync(temp, { recursive: true, force: true });
}
