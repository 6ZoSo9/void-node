#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  stableStringify,
  sha256Hex,
  scanHistoricalSource,
} from "./mainnet0_historical_cartography_v1.mjs";

import {
  AUTHORITY_SCHEMA,
  AUTHORITY_ID_PREFIX,
  ACCEPTANCE_MARKER,
  CartographyAcceptanceHold,
  checkpointPrefixCommitment,
  computeClassificationSemantics,
  sealHistoricalCartography,
  writeAcceptanceExclusive,
} from "./seal_mainnet0_historical_cartography_v1_2.mjs";

const PROOF_MARKER =
  "VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_V1_2_AUTHORITY_PROOF_GREEN";

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function expectHold(fn, reason) {
  let observed = null;
  try {
    fn();
  } catch (error) {
    observed = error;
  }
  assert(observed, `expected HOLD ${reason}, but call succeeded`);
  assert(
    observed instanceof CartographyAcceptanceHold,
    `expected CartographyAcceptanceHold for ${reason}, got ${observed?.name}: ${observed?.message}`,
  );
  assert(
    observed.reason === reason,
    `expected HOLD ${reason}, got ${observed.reason}`,
  );
}

function writeFrame(fd, block) {
  const body = Buffer.from(JSON.stringify(block));
  const prefix = Buffer.alloc(4);
  prefix.writeUInt32BE(body.length, 0);
  fs.writeSync(fd, prefix);
  fs.writeSync(fd, body);
}

function makeMinimal(number, timestampOffset = 0) {
  return {
    number,
    timestamp: 1700000000000 + number + timestampOffset,
  };
}

function createSource(root, blocks) {
  const segmentDir = path.join(root, "segments", "00000000");
  fs.mkdirSync(segmentDir, { recursive: true });
  const file = path.join(segmentDir, "blocks.bin");
  const fd = fs.openSync(file, "wx", 0o600);
  try {
    for (const block of blocks) writeFrame(fd, block);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }

  fs.mkdirSync(path.join(root, "wal"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "wal", "00000000.wal"),
    "",
    { mode: 0o600 },
  );

  const head = blocks.length - 1;
  fs.writeFileSync(
    path.join(root, "heads.json"),
    `${JSON.stringify({ head, number: head, hash: "0x0" })}\n`,
  );
  fs.writeFileSync(path.join(root, "head.txt"), `${head}\n`);

  return { file, head };
}

function createCheckpoint(source, checkpoint, frozenHead) {
  fs.mkdirSync(path.join(checkpoint, "segments"), { recursive: true });
  fs.cpSync(
    path.join(source, "segments"),
    path.join(checkpoint, "segments"),
    { recursive: true },
  );
  fs.writeFileSync(
    path.join(checkpoint, "checkpoint.json"),
    `${stableStringify({
      schema: "synthetic_blocks_only_checkpoint_v1",
      frozen_head: frozenHead,
      source: "synthetic",
    })}\n`,
    { mode: 0o600 },
  );
}

function authorityFromIndependentCheckpoints(
  primaryCheckpoint,
  witnessCheckpoint,
  frozenHead,
) {
  const primary = checkpointPrefixCommitment(
    primaryCheckpoint,
    frozenHead,
  );
  const witnessPass1 = checkpointPrefixCommitment(
    witnessCheckpoint,
    frozenHead,
  );
  const witnessPass2 = checkpointPrefixCommitment(
    witnessCheckpoint,
    frozenHead,
  );

  assert(
    stableStringify(primary) === stableStringify(witnessPass1) &&
      stableStringify(primary) === stableStringify(witnessPass2),
    "independent synthetic prefix commitments must be byte-identical",
  );

  const headTuple = [frozenHead, frozenHead, frozenHead];
  const withoutId = {
    schema: AUTHORITY_SCHEMA,
    network: "VOID Mainnet-0",
    chain_id: 2050,
    frozen_head: frozenHead,
    block_count: primary.block_count,
    segment_count: primary.segment_count,
    total_prefix_bytes: primary.total_prefix_bytes,
    prefix_root: primary.prefix_root,
    genesis_raw_sha256: primary.genesis_raw_sha256,
    frozen_raw_sha256: primary.frozen_raw_sha256,
    authority_basis:
      "independent_materialization_exact_byte_prefix_match",
    primary_materialization: {
      label: "synthetic-primary",
      hostname: "synthetic-primary-host",
      source: primaryCheckpoint,
      head_surfaces: headTuple,
    },
    independent_witness: {
      label: "synthetic-witness",
      hostname: "synthetic-witness-host",
      source: witnessCheckpoint,
      head_before_pass1: headTuple,
      head_after_pass1: headTuple,
      head_before_pass2: headTuple,
      head_after_pass2: headTuple,
      repeat_prefix_root_equal: true,
    },
    descriptors: primary.descriptors,
    authority_only: true,
    append_authority: false,
    validator_authority: false,
    runtime_authority: false,
  };
  return {
    ...withoutId,
    authority_id:
      AUTHORITY_ID_PREFIX +
      sha256Hex(Buffer.from(stableStringify(withoutId), "utf8")),
  };
}

function withRecomputedAuthorityId(receipt) {
  const withoutId = structuredClone(receipt);
  delete withoutId.authority_id;
  return {
    ...withoutId,
    authority_id:
      AUTHORITY_ID_PREFIX +
      sha256Hex(Buffer.from(stableStringify(withoutId), "utf8")),
  };
}

function semanticRootForTree(repoRoot) {
  const inputs = [
    "scripts/mainnet0_historical_cartography_v1.mjs",
    "public/mainnet0-historical-cartography-v1.schema.json",
  ].map((relativePath) => ({
    path: relativePath,
    sha256: sha256Hex(fs.readFileSync(path.join(repoRoot, relativePath))),
  }));
  const body = {
    schema: "void_mainnet0_classification_semantics_v1",
    algorithm: "sha256_stable_json_file_digest_set_v1",
    inputs,
  };
  return sha256Hex(Buffer.from(stableStringify(body), "utf8"));
}

const repoRoot = path.resolve(".");
const tempRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-mainnet0-cartography-v1-2-proof-"),
);

try {
  const source = path.join(tempRoot, "source");
  const primaryCheckpoint = path.join(tempRoot, "checkpoint-primary");
  const witnessCheckpoint = path.join(tempRoot, "checkpoint-witness");
  const blocks = Array.from({ length: 7 }, (_, index) =>
    makeMinimal(index),
  );
  createSource(source, blocks);
  createCheckpoint(source, primaryCheckpoint, 6);
  createCheckpoint(source, witnessCheckpoint, 6);

  const scan = scanHistoricalSource({
    sourceDir: source,
    frozenHead: 6,
    sourceLabel: "synthetic-cartography-v1-2-proof",
  });
  assert(
    scan.manifest.status === "complete",
    "synthetic V1.1 scan must be complete",
  );

  const authority = authorityFromIndependentCheckpoints(
    primaryCheckpoint,
    witnessCheckpoint,
    6,
  );
  const semantics = computeClassificationSemantics(repoRoot);

  const acceptance1 = sealHistoricalCartography({
    scanManifest: scan.manifest,
    authorityReceipt: authority,
    checkpointDir: primaryCheckpoint,
    repoRoot,
    expectedAuthorityId: authority.authority_id,
    expectedSemanticsRoot: semantics.root,
  });
  const acceptance2 = sealHistoricalCartography({
    scanManifest: scan.manifest,
    authorityReceipt: authority,
    checkpointDir: primaryCheckpoint,
    repoRoot,
    expectedAuthorityId: authority.authority_id,
    expectedSemanticsRoot: semantics.root,
  });

  assert(
    acceptance1.status === "complete",
    "authority-sealed acceptance must complete",
  );
  assert(
    acceptance1.acceptance_id === acceptance2.acceptance_id,
    "acceptance seal must be reproducible",
  );
  assert(
    acceptance1.scan.complete_scan_digest ===
      scan.manifest.complete_scan_digest,
    "acceptance must preserve exhaustive scan digest",
  );
  assert(
    acceptance1.canonical_prefix_authority.prefix_root ===
      authority.prefix_root,
    "acceptance must bind reviewed independent prefix root",
  );
  assert(
    acceptance1.classification_semantics.root === semantics.root,
    "acceptance must bind executable classification semantics",
  );
  assert(
    acceptance1.acceptance_contract.append_authority === false &&
      acceptance1.acceptance_contract.validator_authority === false &&
      acceptance1.acceptance_contract.runtime_authority === false,
    "acceptance seal must not grant runtime/validator/append authority",
  );

  expectHold(
    () =>
      sealHistoricalCartography({
        scanManifest: scan.manifest,
        authorityReceipt: authority,
        checkpointDir: primaryCheckpoint,
        repoRoot,
        expectedSemanticsRoot: semantics.root,
      }),
    "expected_authority_id_required",
  );

  expectHold(
    () =>
      sealHistoricalCartography({
        scanManifest: scan.manifest,
        authorityReceipt: authority,
        checkpointDir: primaryCheckpoint,
        repoRoot,
        expectedAuthorityId: authority.authority_id,
      }),
    "expected_classification_semantics_root_required",
  );

  const malformedHead = withRecomputedAuthorityId({
    ...authority,
    primary_materialization: {
      ...authority.primary_materialization,
      head_surfaces: [6, "6", 6],
    },
  });
  expectHold(
    () =>
      sealHistoricalCartography({
        scanManifest: scan.manifest,
        authorityReceipt: malformedHead,
        checkpointDir: primaryCheckpoint,
        repoRoot,
        expectedAuthorityId: malformedHead.authority_id,
        expectedSemanticsRoot: semantics.root,
      }),
    "authority_head_surface_mismatch",
  );

  const driftedHead = withRecomputedAuthorityId({
    ...authority,
    independent_witness: {
      ...authority.independent_witness,
      head_after_pass2: [6, 7, 6],
    },
  });
  expectHold(
    () =>
      sealHistoricalCartography({
        scanManifest: scan.manifest,
        authorityReceipt: driftedHead,
        checkpointDir: primaryCheckpoint,
        repoRoot,
        expectedAuthorityId: driftedHead.authority_id,
        expectedSemanticsRoot: semantics.root,
      }),
    "authority_head_surface_mismatch",
  );

  const substituteSource = path.join(tempRoot, "substitute-source");
  const substitutePrimary = path.join(tempRoot, "substitute-primary");
  const substituteWitness = path.join(tempRoot, "substitute-witness");
  const substituteBlocks = Array.from({ length: 7 }, (_, index) =>
    makeMinimal(index, index === 3 ? 1000 : 0),
  );
  createSource(substituteSource, substituteBlocks);
  createCheckpoint(substituteSource, substitutePrimary, 6);
  createCheckpoint(substituteSource, substituteWitness, 6);
  const substituteScan = scanHistoricalSource({
    sourceDir: substituteSource,
    frozenHead: 6,
    sourceLabel: "synthetic-substitute",
  });
  const substituteAuthority = authorityFromIndependentCheckpoints(
    substitutePrimary,
    substituteWitness,
    6,
  );
  assert(
    substituteAuthority.authority_id !== authority.authority_id,
    "substitute history must mint a different authority identity",
  );
  expectHold(
    () =>
      sealHistoricalCartography({
        scanManifest: substituteScan.manifest,
        authorityReceipt: substituteAuthority,
        checkpointDir: substitutePrimary,
        repoRoot,
        expectedAuthorityId: authority.authority_id,
        expectedSemanticsRoot: semantics.root,
      }),
    "authority_id_expected_mismatch",
  );

  const tamperedCheckpoint = path.join(tempRoot, "checkpoint-tampered");
  fs.cpSync(primaryCheckpoint, tamperedCheckpoint, { recursive: true });
  const tamperedFile = path.join(
    tamperedCheckpoint,
    "segments",
    "00000000",
    "blocks.bin",
  );
  fs.rmSync(tamperedFile);
  const tamperedFd = fs.openSync(tamperedFile, "wx", 0o600);
  try {
    for (let index = 0; index < 7; index += 1) {
      writeFrame(
        tamperedFd,
        makeMinimal(index, index === 5 ? 1 : 0),
      );
    }
  } finally {
    fs.closeSync(tamperedFd);
  }
  expectHold(
    () =>
      sealHistoricalCartography({
        scanManifest: scan.manifest,
        authorityReceipt: authority,
        checkpointDir: tamperedCheckpoint,
        repoRoot,
        expectedAuthorityId: authority.authority_id,
        expectedSemanticsRoot: semantics.root,
      }),
    "checkpoint_prefix_authority_mismatch",
  );

  const semanticsRootA = computeClassificationSemantics(repoRoot).root;
  const alteredRepo = path.join(tempRoot, "altered-repo");
  fs.mkdirSync(path.join(alteredRepo, "scripts"), { recursive: true });
  fs.mkdirSync(path.join(alteredRepo, "public"), { recursive: true });
  const scannerSource = fs.readFileSync(
    path.join(repoRoot, "scripts", "mainnet0_historical_cartography_v1.mjs"),
    "utf8",
  );
  const alteredScanner = scannerSource.replace(
    "nested.leaves.length === 0",
    "nested.leaves.length >= 0",
  );
  assert(
    alteredScanner !== scannerSource,
    "semantics falsifier failed to alter classifier predicate",
  );
  fs.writeFileSync(
    path.join(
      alteredRepo,
      "scripts",
      "mainnet0_historical_cartography_v1.mjs",
    ),
    alteredScanner,
  );
  fs.copyFileSync(
    path.join(
      repoRoot,
      "public",
      "mainnet0-historical-cartography-v1.schema.json",
    ),
    path.join(
      alteredRepo,
      "public",
      "mainnet0-historical-cartography-v1.schema.json",
    ),
  );
  const semanticsRootB = semanticRootForTree(alteredRepo);
  assert(
    semanticsRootA !== semanticsRootB,
    "changed classifier predicate must change semantics root",
  );
  expectHold(
    () =>
      sealHistoricalCartography({
        scanManifest: scan.manifest,
        authorityReceipt: authority,
        checkpointDir: primaryCheckpoint,
        repoRoot: alteredRepo,
        expectedAuthorityId: authority.authority_id,
        expectedSemanticsRoot: semanticsRootA,
      }),
    "classification_semantics_repo_root_not_execution_root",
  );

  const aliasTarget = path.join(primaryCheckpoint, "sealed-output-parent");
  fs.mkdirSync(aliasTarget);
  const alias = path.join(tempRoot, "checkpoint-alias");
  fs.symlinkSync(primaryCheckpoint, alias, "dir");
  expectHold(
    () =>
      writeAcceptanceExclusive(
        path.join(alias, "sealed-output-parent", "acceptance.json"),
        acceptance1,
        [primaryCheckpoint],
      ),
    "acceptance_output_parent_overlaps_forbidden_source",
  );
  assert(
    !fs.existsSync(path.join(aliasTarget, "acceptance.json")),
    "output alias falsifier must not mutate checkpoint namespace",
  );

  console.log(PROOF_MARKER);
  console.log("expected_authority_id_mandatory=true");
  console.log("self_consistent_substitute_history_holds=true");
  console.log("authority_head_surfaces_strictly_bound=true");
  console.log("expected_semantics_root_mandatory=true");
  console.log("semantics_root_uses_executing_checkout=true");
  console.log("caller_selected_semantics_tree_holds=true");
  console.log("changed_classifier_same_labels_changes_semantics_root=true");
  console.log("checkpoint_prefix_captured_before_rescan=true");
  console.log("tampered_checkpoint_holds=true");
  console.log("acceptance_output_alias_holds_before_source_mutation=true");
  console.log("append_authority=false");
  console.log("validator_authority=false");
  console.log("runtime_authority=false");
  console.log(`classification_semantics_root=${semanticsRootA}`);
  console.log(`${ACCEPTANCE_MARKER}_PROOF_COMPLETE=true`);
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
