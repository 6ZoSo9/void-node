#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  CartographyExtensionHold,
  EXPECTED_ACCEPTANCE_ID,
  EXPECTED_CLASSIFICATION_SEMANTICS_ROOT,
  EXPECTED_COMPLETE_SCAN_DIGEST,
  EXPECTED_FROZEN_HEAD,
  EXPECTED_MANIFEST_ID,
  EXPECTED_PREFIX_ROOT,
  EXPECTED_SOURCE_ID,
  MARKER,
  productionBaselineV1,
  sha256Hex,
  stableStringify,
  validateBaselineArtifactsV1,
  extendCartographySourceV1,
} from "../tools/void-mainnet0-historical-cartography-extension-v1.mjs";

import * as scanner from "./mainnet0_historical_cartography_v1.mjs";

const PROOF_MARKER =
  "VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_EXTENSION_V1_PROOF_GREEN";
const SOURCE_LABEL = "synthetic-extension";
const PRIOR_HEAD = 10_000;
const NEW_HEAD = 10_003;

function frame(block) {
  const body = Buffer.from(JSON.stringify(block), "utf8");
  const prefix = Buffer.allocUnsafe(4);
  prefix.writeUInt32BE(body.length, 0);
  return Buffer.concat([prefix, body]);
}

function block(height) {
  return {
    number: height,
    timestamp: 1_700_000_000 + height,
  };
}

function writeSegment(root, base, heights) {
  const segment = String(base).padStart(8, "0");
  const dir = path.join(root, "segments", segment);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const bytes = Buffer.concat(heights.map((height) => frame(block(height))));
  fs.writeFileSync(path.join(dir, "blocks.bin"), bytes, { mode: 0o600 });
  return bytes;
}

function makePriorSource(parent, name) {
  const root = path.join(parent, name);
  fs.mkdirSync(path.join(root, "segments"), {
    recursive: true,
    mode: 0o700,
  });
  const first = writeSegment(
    root,
    0,
    Array.from({ length: 10_000 }, (_, index) => index),
  );
  const terminal = writeSegment(root, 10_000, [10_000]);
  return { root, first, terminal };
}

function appendBlocks(root, heights, customBlocks = null) {
  const file = path.join(root, "segments", "00010000", "blocks.bin");
  const values = customBlocks || heights.map((height) => block(height));
  fs.appendFileSync(file, Buffer.concat(values.map((value) => frame(value))));
}

function fileSha(file, limit = null) {
  const bytes = fs.readFileSync(file);
  const slice = limit === null ? bytes : bytes.subarray(0, limit);
  return crypto.createHash("sha256").update(slice).digest("hex");
}

function prefixAuthority(root) {
  const firstFile = path.join(root, "segments", "00000000", "blocks.bin");
  const finalFile = path.join(root, "segments", "00010000", "blocks.bin");
  const firstBytes = fs.statSync(firstFile).size;
  const finalBytes = fs.statSync(finalFile).size;
  const descriptors = [
    {
      segment: "00000000",
      from: 0,
      to: 9_999,
      prefix_bytes: firstBytes,
      prefix_sha256: fileSha(firstFile),
    },
    {
      segment: "00010000",
      from: 10_000,
      to: 10_000,
      prefix_bytes: finalBytes,
      prefix_sha256: fileSha(finalFile),
    },
  ];
  const body = {
    schema: "void_mainnet0_prefix_commitment_body_v1",
    chain_id: 2050,
    frozen_head: PRIOR_HEAD,
    segment_count: descriptors.length,
    total_prefix_bytes: firstBytes + finalBytes,
    descriptors,
  };
  return {
    frozen_head: PRIOR_HEAD,
    block_count: PRIOR_HEAD + 1,
    segment_count: descriptors.length,
    total_prefix_bytes: body.total_prefix_bytes,
    prefix_root: sha256Hex(
      Buffer.from(stableStringify(body), "utf8"),
    ),
    descriptors,
  };
}

function scannerMeta() {
  return {
    MARKER: scanner.MARKER,
    SCHEMA: scanner.SCHEMA,
    SCANNER_VERSION: scanner.SCANNER_VERSION,
    SEG_SPAN: scanner.SEG_SPAN,
    VOCABULARY: scanner.VOCABULARY,
  };
}

function expectHold(operation, pattern) {
  assert.throws(
    operation,
    (error) =>
      error instanceof CartographyExtensionHold &&
      pattern.test(error.reason),
  );
}

assert.equal(
  MARKER,
  "VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_EXTENSION_V1",
);

const production = productionBaselineV1();
assert.equal(production.acceptance.acceptance_id, EXPECTED_ACCEPTANCE_ID);
assert.equal(production.manifest.manifest_id, EXPECTED_MANIFEST_ID);
assert.equal(production.manifest.source.source_id, EXPECTED_SOURCE_ID);
assert.equal(production.manifest.source.frozen_head, EXPECTED_FROZEN_HEAD);
assert.equal(
  production.manifest.complete_scan_digest,
  EXPECTED_COMPLETE_SCAN_DIGEST,
);
assert.equal(
  production.semantics.root,
  EXPECTED_CLASSIFICATION_SEMANTICS_ROOT,
);
assert.equal(production.prefix.prefix_root, EXPECTED_PREFIX_ROOT);
assert.equal(production.acceptance.acceptance_contract.append_authority, false);
assert.equal(production.acceptance.acceptance_contract.runtime_authority, false);

{
  const badAcceptance = structuredClone(production.acceptance);
  badAcceptance.classification_semantics.root = "0".repeat(64);
  const clone = structuredClone(badAcceptance);
  delete clone.acceptance_id;
  badAcceptance.acceptance_id =
    "voidm0accept1_" +
    sha256Hex(Buffer.from(stableStringify(clone), "utf8"));
  expectHold(
    () =>
      validateBaselineArtifactsV1(
        badAcceptance,
        production.manifest,
        {
          repoRoot: path.resolve("."),
          scannerMeta: scannerMeta(),
        },
      ),
    /classification_semantics_root_mismatch/u,
  );
}

const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-cartography-extension-proof-"),
);
try {
  const prior = makePriorSource(temp, "green");
  const priorScan = scanner.scanHistoricalSource({
    sourceDir: prior.root,
    frozenHead: PRIOR_HEAD,
    sourceLabel: SOURCE_LABEL,
  });
  assert.equal(priorScan.manifest.status, "complete");
  const authority = prefixAuthority(prior.root);

  appendBlocks(prior.root, [10_001, 10_002, 10_003]);

  const extended = extendCartographySourceV1({
    priorManifest: priorScan.manifest,
    priorPrefixAuthority: authority,
    sourceDir: prior.root,
    newFrozenHead: NEW_HEAD,
    sourceLabel: SOURCE_LABEL,
  });

  {
    const tampered = structuredClone(priorScan.manifest);
    tampered.complete_scan_digest = "0".repeat(64);
    expectHold(
      () =>
        extendCartographySourceV1({
          priorManifest: tampered,
          priorPrefixAuthority: authority,
          sourceDir: prior.root,
          newFrozenHead: NEW_HEAD,
          sourceLabel: SOURCE_LABEL,
        }),
      /prior_manifest_integrity_mismatch/u,
    );
  }
  const full = scanner.scanHistoricalSource({
    sourceDir: prior.root,
    frozenHead: NEW_HEAD,
    sourceLabel: SOURCE_LABEL,
  });

  assert.deepEqual(extended.candidate_manifest, full.manifest);
  assert.equal(extended.suffix.from_height, PRIOR_HEAD + 1);
  assert.equal(extended.suffix.to_height, NEW_HEAD);
  assert.equal(extended.suffix.blocks_scanned, 3);
  assert.equal(
    extended.suffix.class_counts[scanner.CLASS_MINIMAL],
    3,
  );
  assert.equal(
    extended.suffix.digest_start,
    priorScan.manifest.complete_scan_digest,
  );
  assert.equal(
    extended.suffix.digest_end,
    full.manifest.complete_scan_digest,
  );
  assert.equal(
    extended.prefix_verification.prefix_root,
    authority.prefix_root,
  );
  assert.equal(
    extended.prefix_verification.accepted_prefix_modified,
    false,
  );
  assert.equal(
    extended.candidate_manifest.historical_blocks_scanned,
    NEW_HEAD + 1,
  );
  assert.equal(
    extended.candidate_manifest.class_counts[scanner.CLASS_MINIMAL],
    NEW_HEAD + 1,
  );
  assert.equal(
    extended.candidate_manifest.ranges.length,
    1,
  );
  assert.deepEqual(extended.candidate_manifest.ranges[0], {
    from: 0,
    to: NEW_HEAD,
    count: NEW_HEAD + 1,
    classification: scanner.CLASS_MINIMAL,
  });
  assert.deepEqual(extended.candidate_manifest.exceptions, []);

  {
    const source = makePriorSource(temp, "closed-segment-mutation");
    const auth = prefixAuthority(source.root);
    const scan = scanner.scanHistoricalSource({
      sourceDir: source.root,
      frozenHead: PRIOR_HEAD,
      sourceLabel: SOURCE_LABEL,
    });
    const file = path.join(
      source.root,
      "segments",
      "00000000",
      "blocks.bin",
    );
    const fd = fs.openSync(file, "r+");
    try {
      const byte = Buffer.allocUnsafe(1);
      fs.readSync(fd, byte, 0, 1, 100);
      byte[0] ^= 1;
      fs.writeSync(fd, byte, 0, 1, 100);
    } finally {
      fs.closeSync(fd);
    }
    appendBlocks(source.root, [10_001]);
    expectHold(
      () =>
        extendCartographySourceV1({
          priorManifest: scan.manifest,
          priorPrefixAuthority: auth,
          sourceDir: source.root,
          newFrozenHead: 10_001,
          sourceLabel: SOURCE_LABEL,
        }),
      /accepted_prefix_sha256_mismatch/u,
    );
  }

  {
    const source = makePriorSource(temp, "terminal-prefix-mutation");
    const auth = prefixAuthority(source.root);
    const scan = scanner.scanHistoricalSource({
      sourceDir: source.root,
      frozenHead: PRIOR_HEAD,
      sourceLabel: SOURCE_LABEL,
    });
    const file = path.join(
      source.root,
      "segments",
      "00010000",
      "blocks.bin",
    );
    fs.appendFileSync(file, Buffer.from(" "));
    expectHold(
      () =>
        extendCartographySourceV1({
          priorManifest: scan.manifest,
          priorPrefixAuthority: auth,
          sourceDir: source.root,
          newFrozenHead: 10_001,
          sourceLabel: SOURCE_LABEL,
        }),
      /torn_frame_prefix|invalid_frame_length/u,
    );
  }

  {
    const source = makePriorSource(temp, "height-gap");
    const auth = prefixAuthority(source.root);
    const scan = scanner.scanHistoricalSource({
      sourceDir: source.root,
      frozenHead: PRIOR_HEAD,
      sourceLabel: SOURCE_LABEL,
    });
    appendBlocks(source.root, [10_002]);
    expectHold(
      () =>
        extendCartographySourceV1({
          priorManifest: scan.manifest,
          priorPrefixAuthority: auth,
          sourceDir: source.root,
          newFrozenHead: 10_001,
          sourceLabel: SOURCE_LABEL,
        }),
      /suffix_height_sequence_mismatch/u,
    );
  }

  {
    const source = makePriorSource(temp, "unknown-shape");
    const auth = prefixAuthority(source.root);
    const scan = scanner.scanHistoricalSource({
      sourceDir: source.root,
      frozenHead: PRIOR_HEAD,
      sourceLabel: SOURCE_LABEL,
    });
    appendBlocks(
      source.root,
      [10_001],
      [{ number: 10_001, timestamp: 1_700_010_001, unexpected: true }],
    );
    expectHold(
      () =>
        extendCartographySourceV1({
          priorManifest: scan.manifest,
          priorPrefixAuthority: auth,
          sourceDir: source.root,
          newFrozenHead: 10_001,
          sourceLabel: SOURCE_LABEL,
        }),
      /suffix_classification_not_closed/u,
    );
  }

  {
    const source = makePriorSource(temp, "nonempty-wal");
    const auth = prefixAuthority(source.root);
    const scan = scanner.scanHistoricalSource({
      sourceDir: source.root,
      frozenHead: PRIOR_HEAD,
      sourceLabel: SOURCE_LABEL,
    });
    appendBlocks(source.root, [10_001]);
    const wal = path.join(source.root, "wal");
    fs.mkdirSync(wal, { mode: 0o700 });
    fs.writeFileSync(path.join(wal, "0001.wal"), "x", { mode: 0o600 });
    expectHold(
      () =>
        extendCartographySourceV1({
          priorManifest: scan.manifest,
          priorPrefixAuthority: auth,
          sourceDir: source.root,
          newFrozenHead: 10_001,
          sourceLabel: SOURCE_LABEL,
        }),
      /nonempty_wal/u,
    );
  }

  {
    const source = makePriorSource(temp, "head-mismatch");
    const auth = prefixAuthority(source.root);
    const scan = scanner.scanHistoricalSource({
      sourceDir: source.root,
      frozenHead: PRIOR_HEAD,
      sourceLabel: SOURCE_LABEL,
    });
    appendBlocks(source.root, [10_001]);
    fs.writeFileSync(
      path.join(source.root, "heads.json"),
      JSON.stringify({ head: 10_000, number: 10_000 }),
    );
    fs.writeFileSync(path.join(source.root, "head.txt"), "10000\n");
    expectHold(
      () =>
        extendCartographySourceV1({
          priorManifest: scan.manifest,
          priorPrefixAuthority: auth,
          sourceDir: source.root,
          newFrozenHead: 10_001,
          sourceLabel: SOURCE_LABEL,
        }),
      /source_head_marker_mismatch/u,
    );
  }

  {
    const source = makePriorSource(temp, "generation-move");
    const auth = prefixAuthority(source.root);
    const scan = scanner.scanHistoricalSource({
      sourceDir: source.root,
      frozenHead: PRIOR_HEAD,
      sourceLabel: SOURCE_LABEL,
    });
    appendBlocks(source.root, [10_001, 10_002]);
    let mutated = false;
    expectHold(
      () =>
        extendCartographySourceV1({
          priorManifest: scan.manifest,
          priorPrefixAuthority: auth,
          sourceDir: source.root,
          newFrozenHead: 10_002,
          sourceLabel: SOURCE_LABEL,
          testAfterSuffixFrameHook({ file }) {
            if (mutated) return;
            mutated = true;
            fs.appendFileSync(file, Buffer.from([0]));
          },
        }),
      /source_generation_changed_during_extension|source_generation_changed_during_suffix_scan/u,
    );
    assert.equal(mutated, true);
  }

  {
    const source = makePriorSource(temp, "prefix-boundary-garbage");
    const auth = prefixAuthority(source.root);
    const scan = scanner.scanHistoricalSource({
      sourceDir: source.root,
      frozenHead: PRIOR_HEAD,
      sourceLabel: SOURCE_LABEL,
    });
    const file = path.join(
      source.root,
      "segments",
      "00010000",
      "blocks.bin",
    );
    fs.appendFileSync(file, Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05]));
    expectHold(
      () =>
        extendCartographySourceV1({
          priorManifest: scan.manifest,
          priorPrefixAuthority: auth,
          sourceDir: source.root,
          newFrozenHead: 10_001,
          sourceLabel: SOURCE_LABEL,
        }),
      /invalid_frame_length|torn_frame_body/u,
    );
  }

  console.log(PROOF_MARKER);
  console.log("production_acceptance_id_bound=true");
  console.log("classification_semantics_root_bound=true");
  console.log("accepted_prefix_hash_only_revalidation=true");
  console.log("historical_prefix_reparse_required=false");
  console.log("terminal_segment_boundary_recovered=true");
  console.log("suffix_digest_continued=true");
  console.log("combined_manifest_equals_fresh_full_scan=true");
  console.log("prior_manifest_tamper_rejected=true");
  console.log("closed_segment_mutation_rejected=true");
  console.log("terminal_prefix_mutation_rejected=true");
  console.log("height_gap_rejected=true");
  console.log("unknown_shape_rejected=true");
  console.log("nonempty_wal_rejected=true");
  console.log("head_marker_mismatch_rejected=true");
  console.log("source_generation_movement_rejected=true");
  console.log("append_authority=false");
  console.log("runtime_authority=false");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
