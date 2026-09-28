#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_MANIFEST_PUBLISHER_AUTHORITY_V1,
  VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_MANIFEST_PUBLISHER_CONFIRMATION_V1,
  VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_MANIFEST_PUBLISHER_V1,
  VoidEconomicEpoch2PublicStateManifestPublisherHoldV1,
  qualifyVoidEconomicEpoch2PublicStateManifestV1,
  publishVoidEconomicEpoch2PublicStateManifestV1,
  runVoidEconomicEpoch2PublicStateManifestPublisherSelfTestV1,
} from "../tools/void-economic-epoch2-public-state-manifest-publisher-v1.mjs";

const EXPECTED_FILE_SHA =
  "affe08799c73320c6fc4efe4a91772cc1c64f6a3ff6e75c2698ea87d27e306d9";
const EXPECTED_MATERIAL_SHA =
  "286034e3adb1654c13899b959075fcfa2504a6942c83ec52febb156bd0ea2a4f";

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function expectHold(fn, reason) {
  assert.throws(
    fn,
    (error) =>
      error instanceof VoidEconomicEpoch2PublicStateManifestPublisherHoldV1 &&
      error.reason === reason,
    reason,
  );
}

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-epoch2-public-state-publisher-proof-"),
);
try {
  const repo = path.join(root, "repo");
  const evidenceDir = path.join(repo, "public", "public-node", "evidence");
  const inputDir = path.join(root, "inputs");
  fs.mkdirSync(evidenceDir, { recursive: true, mode: 0o755 });
  fs.mkdirSync(inputDir, { recursive: true, mode: 0o700 });

  const filename =
    "void_economic_epoch2_client_neutral_state_manifest_v1_20260926T211912Z.json";
  const source = path.join(inputDir, filename);

  // The production proof must not invent the canonical artifact bytes, so use a
  // fixture only to exercise the fail-closed publisher machinery and verify
  // static production constants below.
  const fixture = {
    marker: "VOID_ECONOMIC_EPOCH2_CLIENT_NEUTRAL_STATE_MANIFEST_V1",
    version: 1,
    status: "CLIENT_NEUTRAL_STATE_MANIFEST_GREEN",
    manifest_material_sha256: EXPECTED_MATERIAL_SHA,
    chain_id: 2050,
    execution_epoch: 2,
    accounts: [{}, {}, {}, {}],
    migration_authorized: false,
    public_activation_authorized: false,
  };
  fs.writeFileSync(source, JSON.stringify(fixture) + "\n", { mode: 0o600 });

  expectHold(
    () =>
      qualifyVoidEconomicEpoch2PublicStateManifestV1({
        repoRoot: repo,
        sourcePath: source,
      }),
    "source_manifest_file_sha256_mismatch",
  );

  const sourceCode = fs.readFileSync(
    "tools/void-economic-epoch2-public-state-manifest-publisher-v1.mjs",
    "utf8",
  );
  assert.match(sourceCode, new RegExp(EXPECTED_FILE_SHA));
  assert.match(sourceCode, new RegExp(EXPECTED_MATERIAL_SHA));
  assert.match(
    sourceCode,
    /economic-epoch2-client-neutral-state-manifest-v1\.json/,
  );
  assert.match(sourceCode, /explicit_publish_confirmation_required/);
  const publishCoreStart = sourceCode.indexOf("function publishCore({");
  const publishReread = sourceCode.indexOf(
    "const raw = readBoundedSourceManifest(sourcePath);",
    publishCoreStart,
  );
  const publishRevalidate = sourceCode.indexOf(
    "validateManifest(raw, sourcePath, profile);",
    publishReread,
  );
  const publishCreate = sourceCode.indexOf(
    "const publication = atomicCreateExact(",
    publishRevalidate,
  );
  assert(publishCoreStart >= 0, "publishCore missing");
  assert(publishReread > publishCoreStart, "publishCore reread missing");
  assert(
    publishRevalidate > publishReread,
    "publication bytes must be revalidated after reread",
  );
  assert(
    publishCreate > publishRevalidate,
    "create-once publication must follow revalidation",
  );
  assert.match(sourceCode, /public_target_existing_not_direct_regular_file/);
  assert.match(sourceCode, /public_target_exists_with_different_bytes/);
  assert.match(sourceCode, /fs\.constants\.O_DIRECTORY/);
  assert.match(sourceCode, /fs\.constants\.O_NOFOLLOW/);
  assert.match(sourceCode, /fs\.constants\.O_NONBLOCK/);
  assert.match(sourceCode, /readBoundedRegularThroughHeldDirectory/);
  assert.match(sourceCode, /openSourceManifestBoundToAncestors/);
  assert.match(sourceCode, /readBoundedSourceManifest/);
  assert.match(sourceCode, /source_manifest_path_component_invalid/);
  assert.match(sourceCode, /source_manifest_changed_during_read/);
  assert.match(sourceCode, /fs\.fstatSync\(fd\)/);
  assert.match(sourceCode, /fs\.readSync\(/);
  assert.match(sourceCode, /\/proc\/self\/fd\//);
  assert.match(sourceCode, /public_evidence_parent_changed_before_write/);
  assert.match(sourceCode, /parent_identity_stable_after_write/);
  assert.match(sourceCode, /directory_fsync_confirmed/);
  assert.match(sourceCode, /let targetContentFsyncConfirmed = false;/);
  assert.match(sourceCode, /targetContentFsyncConfirmed = true;/);
  assert.match(sourceCode, /let directoryFsyncConfirmed = false;/);
  assert.match(sourceCode, /fs\.fsyncSync\(opened\.fd\);/);
  assert.match(sourceCode, /directoryFsyncConfirmed = true;/);
  assert.match(sourceCode, /successor_genesis_or_state_manifest_public_evidence_ready: false/);

  const behavior = runVoidEconomicEpoch2PublicStateManifestPublisherSelfTestV1();
  assert.equal(
    behavior.marker,
    "VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_MANIFEST_PUBLISHER_SELF_TEST_V1",
  );
  assert.equal(
    behavior.qualified_status,
    "QUALIFIED_EXACT_PUBLICATION_ARTIFACT_NOT_WRITTEN",
  );
  assert.equal(
    behavior.source_ancestor_symlink_reason,
    "source_manifest_path_component_invalid",
  );
  assert.equal(
    behavior.source_final_symlink_reason,
    "source_manifest_open_failed",
  );
  assert.equal(behavior.first_publication_outcome, "created");
  assert.equal(behavior.first_filesystem_write_performed, true);
  assert.equal(behavior.repeat_publication_outcome, "already_exact");
  assert.equal(behavior.repeat_filesystem_write_performed, false);
  assert.equal(
    behavior.conflict_reason,
    "public_target_exists_with_different_bytes",
  );
  assert.equal(
    behavior.source_mutation_after_qualification_reason,
    "source_manifest_file_sha256_mismatch",
  );
  assert.equal(behavior.source_mutation_target_created, false);
  assert.equal(
    behavior.existing_symlink_target_reason,
    "public_target_existing_metadata_unreadable",
  );
  assert.equal(behavior.existing_symlink_external_bytes_unchanged, true);
  assert.equal(
    behavior.parent_replacement_race_reason,
    "public_evidence_parent_changed_before_write",
  );
  assert.equal(behavior.parent_replacement_held_target_created, false);
  assert.equal(behavior.parent_replacement_outside_target_created, false);
  assert.equal(behavior.first_target_content_fsync_confirmed, true);
  assert.equal(behavior.repeat_target_content_fsync_confirmed, false);
  assert.equal(behavior.first_directory_fsync_confirmed, true);
  assert.equal(behavior.repeat_directory_fsync_confirmed, true);
  assert.equal(
    behavior.repeat_status,
    "EXACT_PUBLICATION_ARTIFACT_WRITTEN_FILESYSTEM_REVIEW_REQUIRED",
  );
  assert.equal(
    behavior.repeat_next_gate,
    "review_local_publication_filesystem_state_before_any_followup",
  );
  assert.equal(behavior.first_parent_identity_stable_after_write, true);
  assert.equal(behavior.published_bytes_exact, true);
  assert.equal(behavior.published_sha256, behavior.expected_sha256);
  assert.equal(
    behavior.successor_genesis_or_state_manifest_public_evidence_ready,
    false,
  );
  assert.equal(behavior.migration_authorized, false);
  assert.equal(behavior.public_activation_authorized, false);
  assert.equal(behavior.funds_movement, false);

  const toolPath = path.resolve(
    "tools/void-economic-epoch2-public-state-manifest-publisher-v1.mjs",
  );
  const helpRun = spawnSync(process.execPath, [toolPath, "--help"], {
    encoding: "utf8",
  });
  assert.equal(helpRun.status, 0);
  const help = JSON.parse(helpRun.stdout);
  assert.equal(help.marker, VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_MANIFEST_PUBLISHER_V1);
  assert.equal(help.status, "PLAN_READY");
  assert.equal(help.mode_default, "qualify_only");
  assert.equal(
    help.required_confirmation,
    VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_MANIFEST_PUBLISHER_CONFIRMATION_V1,
  );
  assert.equal(
    help.successor_genesis_or_state_manifest_public_evidence_ready,
    false,
  );

  const wrongConfirmation = spawnSync(
    process.execPath,
    [
      toolPath,
      "--repo-root",
      path.resolve("."),
      "--source",
      path.join(root, "missing-canonical-source.json"),
      "--publish",
      "--confirmation",
      "wrong-confirmation",
    ],
    { encoding: "utf8" },
  );
  assert.equal(wrongConfirmation.status, 2);
  assert.match(
    wrongConfirmation.stderr,
    /explicit_publish_confirmation_required/,
  );

  for (const receiptField of [
    "published_sha256: result.published_sha256 ?? null",
    "target_content_fsync_confirmed:",
    "directory_fsync_confirmed: result.directory_fsync_confirmed ?? null",
    "parent_identity_stable_after_write:",
    "next_gate: result.next_gate ?? null",
  ]) {
    assert.ok(
      sourceCode.includes(receiptField),
      `CLI durability receipt field missing: ${receiptField}`,
    );
  }

  assert.doesNotMatch(sourceCode, /fetch\s*\(|https?:\/\//);
  assert.doesNotMatch(sourceCode, /eth_sendRawTransaction|eth_sendTransaction/);
  assert.doesNotMatch(
    sourceCode,
    /mnemonic|process\.env\.[A-Z0-9_]*PRIVATE_KEY|fromMnemonic|fromPhrase/i,
  );

  for (const [key, value] of Object.entries(
    VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_MANIFEST_PUBLISHER_AUTHORITY_V1,
  )) {
    assert.equal(
      key === "local_source_read" ||
        key === "public_artifact_write_only_when_explicitly_requested"
        ? value
        : !value,
      true,
      key,
    );
  }

  assert.equal(
    VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_MANIFEST_PUBLISHER_V1,
    "VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_MANIFEST_PUBLISHER_V1",
  );

  // Prove the explicit publication wall executes before any write.
  expectHold(
    () =>
      publishVoidEconomicEpoch2PublicStateManifestV1({
        repoRoot: repo,
        sourcePath: source,
        explicitPublish: false,
      }),
    "explicit_publish_confirmation_required",
  );

  assert.equal(
    fs.existsSync(
      path.join(
        evidenceDir,
        "economic-epoch2-client-neutral-state-manifest-v1.json",
      ),
    ),
    false,
  );

  console.log("VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_MANIFEST_PUBLISHER_V1_GREEN");
  console.log("canonical_file_sha256=" + EXPECTED_FILE_SHA);
  console.log("canonical_material_sha256=" + EXPECTED_MATERIAL_SHA);
  console.log("explicit_publish_required=true");
  console.log("source_bytes_revalidated_immediately_before_publication=true");
  console.log("source_manifest_descriptor_walk_bound=true");
  console.log("source_manifest_ancestor_symlink_rejected=true");
  console.log("source_manifest_final_symlink_rejected=true");
  console.log("source_mutation_after_qualification_rejected=true");
  console.log("publication_parent_descriptor_bound=true");
  console.log("existing_target_descriptor_read_bound=true");
  console.log("existing_symlink_target_rejected=true");
  console.log("existing_target_nonblocking_open=true");
  console.log("cli_durability_facts_emitted=true");
  console.log("publication_parent_replacement_rejected_before_write=true");
  console.log("publication_directory_fsync_truth_reported=true");
  console.log("already_exact_directory_fsync_confirmed=true");
  console.log("created_target_content_fsync_confirmed=true");
  console.log("already_exact_content_fsync_unproven=true");
  console.log("already_exact_status_requires_filesystem_review=true");
  console.log("publication_parent_postwrite_identity_reported=true");
  console.log("production_cli_executable=true");
  console.log("production_cli_confirmation_fail_closed=true");
  console.log("first_create_path_executed=true");
  console.log("idempotent_already_exact_path_executed=true");
  console.log("conflicting_existing_target_path_executed=true");
  console.log("published_bytes_exactly_verified=true");
  console.log("network_call=false");
  console.log("credential_content_access=false");
  console.log("chain2050_write=false");
  console.log("migration_authorized=false");
  console.log("public_activation=false");
  console.log("successor_genesis_or_state_manifest_public_evidence_ready=false");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
