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
    `expected CartographyAcceptanceHold for ${reason}, got ${observed?.name}`,
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

function makeMinimal(number) {
  return {
    number,
    timestamp: 1700000000000 + number,
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

function createCheckpoint(source, checkpoint) {
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
      frozen_head: 6,
      source: "synthetic",
    })}\n`,
    { mode: 0o600 },
  );
}

function authorityFromCheckpoint(checkpoint, frozenHead) {
  const prefix = checkpointPrefixCommitment(checkpoint, frozenHead);
  const withoutId = {
    schema: AUTHORITY_SCHEMA,
    network: "VOID Mainnet-0",
    chain_id: 2050,
    frozen_head: frozenHead,
    block_count: prefix.block_count,
    segment_count: prefix.segment_count,
    total_prefix_bytes: prefix.total_prefix_bytes,
    prefix_root: prefix.prefix_root,
    genesis_raw_sha256: prefix.genesis_raw_sha256,
    frozen_raw_sha256: prefix.frozen_raw_sha256,
    authority_basis:
      "independent_materialization_exact_byte_prefix_match",
    primary_materialization: {
      label: "synthetic-primary",
      hostname: "synthetic-primary-host",
      source: "/synthetic/primary",
      head_surfaces: [frozenHead, frozenHead, frozenHead],
    },
    independent_witness: {
      label: "synthetic-witness",
      hostname: "synthetic-witness-host",
      source: "/synthetic/witness",
      head_before_pass1: [frozenHead, frozenHead, frozenHead],
      head_after_pass1: [frozenHead, frozenHead, frozenHead],
      head_before_pass2: [frozenHead, frozenHead, frozenHead],
      head_after_pass2: [frozenHead, frozenHead, frozenHead],
      repeat_prefix_root_equal: true,
    },
    descriptors: prefix.descriptors,
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

function withRecomputedManifestId(manifest) {
  const withoutId = structuredClone(manifest);
  delete withoutId.manifest_id;
  return {
    ...withoutId,
    manifest_id:
      "voidm0map1_" +
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

const repoRoot = path.resolve(".");
const tempRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-mainnet0-cartography-v1-2-proof-"),
);

try {
  const source = path.join(tempRoot, "source");
  const checkpoint = path.join(tempRoot, "checkpoint");
  const blocks = Array.from({ length: 7 }, (_, index) =>
    makeMinimal(index),
  );
  createSource(source, blocks);
  createCheckpoint(source, checkpoint);

  const scan = scanHistoricalSource({
    sourceDir: source,
    frozenHead: 6,
    sourceLabel: "synthetic-cartography-v1-2-proof",
  });
  assert(
    scan.manifest.status === "complete",
    "synthetic V1.1 scan must be complete",
  );

  const authority = authorityFromCheckpoint(checkpoint, 6);
  const semantics = computeClassificationSemantics(repoRoot);

  const acceptance1 = sealHistoricalCartography({
    scanManifest: scan.manifest,
    authorityReceipt: authority,
    checkpointDir: checkpoint,
    repoRoot,
    expectedAuthorityId: authority.authority_id,
    expectedSemanticsRoot: semantics.root,
  });

  const acceptance2 = sealHistoricalCartography({
    scanManifest: scan.manifest,
    authorityReceipt: authority,
    checkpointDir: checkpoint,
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
    "acceptance must bind independent prefix root",
  );
  assert(
    acceptance1.classification_semantics.root === semantics.root,
    "acceptance must bind exact classification semantics",
  );
  assert(
    acceptance1.immutable_snapshot.immutable_rescan_complete_scan_digest ===
      scan.manifest.complete_scan_digest,
    "immutable snapshot rescan must reproduce original map digest",
  );
  assert(
    acceptance1.acceptance_contract.canonical_prefix_independently_witnessed ===
      true &&
      acceptance1.acceptance_contract.immutable_snapshot_rescan_equal ===
        true &&
      acceptance1.acceptance_contract.classification_semantics_content_bound ===
        true,
    "acceptance authority flags incomplete",
  );
  assert(
    acceptance1.acceptance_contract.append_authority === false &&
      acceptance1.acceptance_contract.validator_authority === false &&
      acceptance1.acceptance_contract.runtime_authority === false,
    "acceptance seal must not grant runtime/validator/append authority",
  );

  const wrongAuthorityId = {
    ...authority,
    authority_id: `${AUTHORITY_ID_PREFIX}${"0".repeat(64)}`,
  };
  expectHold(
    () =>
      sealHistoricalCartography({
        scanManifest: scan.manifest,
        authorityReceipt: wrongAuthorityId,
        checkpointDir: checkpoint,
        repoRoot,
      }),
    "authority_receipt_content_id_mismatch",
  );

  const wrongPrefix = withRecomputedAuthorityId({
    ...authority,
    prefix_root: "f".repeat(64),
  });
  expectHold(
    () =>
      sealHistoricalCartography({
        scanManifest: scan.manifest,
        authorityReceipt: wrongPrefix,
        checkpointDir: checkpoint,
        repoRoot,
      }),
    "authority_prefix_root_mismatch",
  );

  const sameMachine = withRecomputedAuthorityId({
    ...authority,
    independent_witness: {
      ...authority.independent_witness,
      hostname: authority.primary_materialization.hostname,
    },
  });
  expectHold(
    () =>
      sealHistoricalCartography({
        scanManifest: scan.manifest,
        authorityReceipt: sameMachine,
        checkpointDir: checkpoint,
        repoRoot,
      }),
    "authority_independent_materialization_contract_mismatch",
  );

  const badCount = withRecomputedManifestId({
    ...scan.manifest,
    historical_blocks_scanned: 6,
  });
  expectHold(
    () =>
      sealHistoricalCartography({
        scanManifest: badCount,
        authorityReceipt: authority,
        checkpointDir: checkpoint,
        repoRoot,
      }),
    "scan_manifest_count_conservation_failed",
  );

  const tamperedCheckpoint = path.join(tempRoot, "checkpoint-tampered");
  fs.cpSync(checkpoint, tamperedCheckpoint, { recursive: true });
  const tamperedFile = path.join(
    tamperedCheckpoint,
    "segments",
    "00000000",
    "blocks.bin",
  );
  const tamperedBlocks = [...blocks];
  tamperedBlocks[5] = {
    ...tamperedBlocks[5],
    timestamp: tamperedBlocks[5].timestamp + 1,
  };
  fs.rmSync(tamperedFile);
  const fd = fs.openSync(tamperedFile, "wx", 0o600);
  try {
    for (const block of tamperedBlocks) writeFrame(fd, block);
  } finally {
    fs.closeSync(fd);
  }
  expectHold(
    () =>
      sealHistoricalCartography({
        scanManifest: scan.manifest,
        authorityReceipt: authority,
        checkpointDir: tamperedCheckpoint,
        repoRoot,
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
  const semanticsRootB =
    computeClassificationSemantics(alteredRepo).root;
  assert(
    semanticsRootA !== semanticsRootB,
    "changed classifier predicate must change semantics root",
  );
  expectHold(
    () =>
      sealHistoricalCartography({
        scanManifest: scan.manifest,
        authorityReceipt: authority,
        checkpointDir: checkpoint,
        repoRoot: alteredRepo,
        expectedSemanticsRoot: semanticsRootA,
      }),
    "classification_semantics_root_mismatch",
  );

  console.log(PROOF_MARKER);
  console.log("authority_receipt_content_addressed=true");
  console.log("independent_materializations_distinct=true");
  console.log("authority_prefix_root_recomputed=true");
  console.log("immutable_checkpoint_prefix_matches_authority=true");
  console.log("immutable_checkpoint_rescan_equal=true");
  console.log("original_complete_scan_digest_preserved=true");
  console.log("classification_semantics_root_content_bound=true");
  console.log("changed_classifier_same_labels_changes_semantics_root=true");
  console.log("wrong_authority_id_holds=true");
  console.log("wrong_prefix_root_holds=true");
  console.log("same_machine_witness_holds=true");
  console.log("numeric_count_conservation_holds=true");
  console.log("tampered_checkpoint_holds=true");
  console.log("append_authority=false");
  console.log("validator_authority=false");
  console.log("runtime_authority=false");
  console.log(`classification_semantics_root=${semanticsRootA}`);
  console.log(`${ACCEPTANCE_MARKER}_PROOF_COMPLETE=true`);
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
