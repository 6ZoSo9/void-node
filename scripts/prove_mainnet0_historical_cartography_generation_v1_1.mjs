#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  CartographyHold,
  scanHistoricalSource,
  writeManifestExclusive,
} from "./mainnet0_historical_cartography_v1.mjs";

const MARKER =
  "VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_GENERATION_V1_1_PROOF_GREEN";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function expectHold(fn, reasons) {
  let observed = null;
  try {
    fn();
  } catch (error) {
    observed = error;
  }
  const allowed = Array.isArray(reasons) ? reasons : [reasons];
  assert(observed, `expected HOLD ${allowed.join("|")}, but call succeeded`);
  assert(
    observed instanceof CartographyHold,
    `expected CartographyHold, got ${observed?.name}: ${observed?.message}`,
  );
  assert(
    allowed.includes(observed.reason),
    `expected HOLD ${allowed.join("|")}, got ${observed.reason}`,
  );
}

function writeFrame(fd, block) {
  const body = Buffer.from(JSON.stringify(block));
  const prefix = Buffer.alloc(4);
  prefix.writeUInt32BE(body.length, 0);
  fs.writeSync(fd, prefix);
  fs.writeSync(fd, body);
}

function createFixture(root) {
  const segmentDir = path.join(root, "segments", "00000000");
  fs.mkdirSync(segmentDir, { recursive: true });
  const blocks = path.join(segmentDir, "blocks.bin");
  const fd = fs.openSync(blocks, "wx", 0o600);
  try {
    for (let number = 0; number < 7; number += 1) {
      writeFrame(fd, {
        number,
        timestamp: 1700000000000 + number,
      });
    }
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }

  fs.mkdirSync(path.join(root, "wal"), { recursive: true });
  fs.writeFileSync(path.join(root, "wal", "00000000.wal"), "");
  fs.writeFileSync(
    path.join(root, "heads.json"),
    `${JSON.stringify({ head: 6, number: 6, hash: "0x0" })}\n`,
  );
  fs.writeFileSync(path.join(root, "head.txt"), "6\n");
}

function cloneFixture(source, destination) {
  fs.cpSync(source, destination, { recursive: true });
}

function scan(root, extra = {}) {
  return scanHistoricalSource({
    sourceDir: root,
    frozenHead: 6,
    sourceLabel: "generation-v1-1-proof",
    ...extra,
  });
}

const tempRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-mainnet0-generation-proof-"),
);

try {
  const source = path.join(tempRoot, "source");
  createFixture(source);
  const baseline = scan(source);
  assert(baseline.manifest.status === "complete", "baseline scan must complete");

  const walMoving = path.join(tempRoot, "wal-moving");
  cloneFixture(source, walMoving);
  expectHold(
    () =>
      scan(walMoving, {
        testAfterSegmentHook: () => {
          fs.writeFileSync(
            path.join(walMoving, "wal", "00000000.wal"),
            '{"pending":true}\n',
          );
        },
      }),
    "nonempty_wal",
  );

  const headMoving = path.join(tempRoot, "head-moving");
  cloneFixture(source, headMoving);
  expectHold(
    () =>
      scan(headMoving, {
        testAfterSegmentHook: () => {
          fs.writeFileSync(path.join(headMoving, "head.txt"), "7\n");
        },
      }),
    "source_head_marker_mismatch",
  );

  const segmentMoving = path.join(tempRoot, "segment-moving");
  cloneFixture(source, segmentMoving);
  expectHold(
    () =>
      scan(segmentMoving, {
        testAfterSegmentHook: () => {
          const extra = path.join(
            segmentMoving,
            "segments",
            "00010000",
          );
          fs.mkdirSync(extra);
          fs.writeFileSync(path.join(extra, "blocks.bin"), "");
        },
      }),
    "segment_generation_mismatch",
  );

  const checkpointMoving = path.join(tempRoot, "checkpoint-moving");
  cloneFixture(source, checkpointMoving);
  fs.writeFileSync(
    path.join(checkpointMoving, "checkpoint.json"),
    '{"schema":"synthetic-checkpoint","generation":1}\n',
  );
  expectHold(
    () =>
      scan(checkpointMoving, {
        testAfterSegmentHook: () => {
          fs.writeFileSync(
            path.join(checkpointMoving, "checkpoint.json"),
            '{"schema":"synthetic-checkpoint","generation":2}\n',
          );
        },
      }),
    "source_generation_changed_during_scan",
  );

  const sourceOutputParent = path.join(source, "sealed-output-parent");
  fs.mkdirSync(sourceOutputParent);
  const sourceAlias = path.join(tempRoot, "source-alias");
  fs.symlinkSync(source, sourceAlias, "dir");
  const aliasedOutput = path.join(
    sourceAlias,
    "sealed-output-parent",
    "cartography.json",
  );
  expectHold(
    () => scan(source, { output: aliasedOutput }),
    "output_path_overlaps_source",
  );
  assert(
    !fs.existsSync(path.join(sourceOutputParent, "cartography.json")),
    "output alias validation must not mutate source namespace",
  );

  const aliasedEvidence = path.join(
    sourceAlias,
    "sealed-output-parent",
    "evidence.jsonl",
  );
  expectHold(
    () => scan(source, { evidenceJsonl: aliasedEvidence }),
    "output_path_overlaps_source",
  );
  assert(
    !fs.existsSync(path.join(sourceOutputParent, "evidence.jsonl")),
    "evidence alias validation must not mutate source namespace",
  );

  const external = path.join(tempRoot, "external");
  fs.mkdirSync(external);
  const safeOutput = path.join(external, "manifest.json");
  writeManifestExclusive(safeOutput, baseline.manifest, source);
  assert(fs.existsSync(safeOutput), "safe external manifest publication failed");

  const replacementParent = path.join(tempRoot, "replacement-parent");
  fs.mkdirSync(replacementParent);
  fs.rmSync(replacementParent, { recursive: true });
  fs.symlinkSync(source, replacementParent, "dir");
  expectHold(
    () =>
      writeManifestExclusive(
        path.join(replacementParent, "replacement.json"),
        baseline.manifest,
        source,
      ),
    ["output_path_overlaps_source", "output_parent_not_admitted"],
  );
  assert(
    !fs.existsSync(path.join(source, "replacement.json")),
    "replacement parent must not redirect publication into source",
  );

  console.log(MARKER);
  console.log("post_preflight_wal_change_holds=true");
  console.log("post_preflight_head_change_holds=true");
  console.log("post_inventory_segment_change_holds=true");
  console.log("checkpoint_descriptor_change_holds=true");
  console.log("output_symlink_alias_holds_before_source_mutation=true");
  console.log("evidence_symlink_alias_holds_before_source_mutation=true");
  console.log("replacement_parent_holds_before_source_mutation=true");
  console.log("external_create_only_publication=true");
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
