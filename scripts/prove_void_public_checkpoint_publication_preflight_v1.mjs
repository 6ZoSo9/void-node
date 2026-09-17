#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  computeVoidPublicCheckpointIdV1,
} from "./lib/void_public_checkpoint_contract_v1.mjs";
import {
  stableStringify,
} from "./mainnet0_historical_cartography_v1.mjs";

const MARKER =
  "VOID_PUBLIC_CHECKPOINT_PUBLICATION_PREFLIGHT_V1_PROOF_GREEN";
const root = process.cwd();
const tool = path.join(
  root,
  "tools/void-public-checkpoint-publication-preflight-v1.mjs",
);

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function frame(body) {
  const prefix = Buffer.alloc(4);
  prefix.writeUInt32BE(body.length, 0);
  return Buffer.concat([prefix, body]);
}

function makePacket(
  packetDir,
  acceptanceFile,
  {
    timestamp = 1,
    sourceSha = "1".repeat(40),
  } = {},
) {
  const segmentDir = path.join(
    packetDir,
    "segments",
    "00000000",
  );
  fs.mkdirSync(segmentDir, { recursive: true, mode: 0o700 });

  const body = Buffer.from(
    JSON.stringify({ number: 0, timestamp }),
  );
  const segmentBytes = frame(body);
  const segmentSha = sha256(segmentBytes);
  fs.writeFileSync(
    path.join(segmentDir, "blocks.bin"),
    segmentBytes,
    { mode: 0o600 },
  );

  const base = {
    schema: "void_public_canonical_checkpoint_v1",
    network: "VOID Network",
    chain_id: 2050,
    format: "blocks-bin-only-v1",
    source_sha: sourceSha,
    captured_at: "2026-09-17T00:00:00.000Z",
    head: 0,
    head_era: "minimal",
    head_header_hash: null,
    head_body_sha256: sha256(body),
    block_count: 1,
    segment_span: 10_000,
    segment_count: 1,
    payload_bytes: segmentBytes.length,
    segments: [
      {
        name: "00000000",
        path: "segments/00000000/blocks.bin",
        first: 0,
        last: 0,
        blocks: 1,
        bytes: segmentBytes.length,
        sha256: segmentSha,
      },
    ],
    rebuild: {
      auto_repair_required: true,
      sparse_every: 16,
      sparse_index_reconstructed: true,
      segment_meta_reconstructed: true,
      head_markers_reconstructed: true,
      wal_included: false,
      derived_indexes_included: false,
      other_data_dir_content_included: false,
    },
    authority: {
      private_routes_exposed: false,
      wallet_authority: false,
      signer_authority: false,
      validator_authority: false,
      treasury_authority: false,
      work_credit_authority: false,
      money_movement_authority: false,
    },
  };
  const manifest = {
    ...base,
    checkpoint_id: computeVoidPublicCheckpointIdV1({
      ...base,
      checkpoint_id: "",
    }),
  };
  const manifestBytes = Buffer.from(
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(packetDir, "checkpoint.json"),
    manifestBytes,
    { mode: 0o600 },
  );

  const descriptor = {
    segment: "00000000",
    from: 0,
    to: 0,
    prefix_bytes: segmentBytes.length,
    prefix_sha256: segmentSha,
  };
  const authorityId =
    `voidm0auth1_${sha256(Buffer.from(
      `synthetic-authority:${manifest.checkpoint_id}`,
    ))}`;
  const prefixRoot = sha256(
    Buffer.from(stableStringify([descriptor])),
  );
  const checkpointDescriptorSha256 =
    sha256(manifestBytes);

  const acceptanceBody = {
    schema: "void_mainnet0_historical_cartography_acceptance_v1",
    status: "complete",
    version: "v1.2",
    marker:
      "VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_ACCEPTANCE_V1_2",
    network: "VOID Mainnet-0",
    chain_id: 2050,
    acceptance_contract: {
      append_authority: false,
      canonical_bytes_modified: 0,
      canonical_prefix_independently_witnessed: true,
      classification_semantics_content_bound: true,
      immutable_snapshot_rescan_equal: true,
      modern_validator_modified: false,
      numeric_count_conservation_revalidated: true,
      runtime_authority: false,
      validator_authority: false,
    },
    canonical_prefix_authority: {
      authority_basis:
        "independent_materialization_exact_byte_prefix_match",
      block_count: 1,
      descriptors: [descriptor],
      exact_byte_prefix_match: true,
      frozen_head: 0,
      frozen_raw_sha256: sha256(segmentBytes),
      genesis_raw_sha256: sha256(segmentBytes),
      independent_materializations: 2,
      independent_witness_repeat_passes: 2,
      prefix_root: prefixRoot,
      segment_count: 1,
      source_authority_id: authorityId,
      total_prefix_bytes: segmentBytes.length,
    },
    immutable_snapshot: {
      checkpoint_descriptor_sha256:
        checkpointDescriptorSha256,
      checkpoint_prefix_root: prefixRoot,
      checkpoint_source_id:
        `voidm0src1_${sha256(Buffer.from(
          `synthetic-source:${manifest.checkpoint_id}`,
        ))}`,
      immutable_rescan_complete_scan_digest:
        sha256(Buffer.from(
          `synthetic-rescan:${manifest.checkpoint_id}`,
        )),
      immutable_rescan_manifest_id:
        `voidm0map1_${sha256(Buffer.from(
          `synthetic-map:${manifest.checkpoint_id}`,
        ))}`,
      kind: "blocks_only_checkpoint_v1",
    },
    scan: {
      class_counts: {
        MINIMAL_V1: 1,
        LEGACY_V2FS_V1: 0,
        MODERN_SIGNED_V1: 0,
        LEGACY_V2FS_EMPTY_HEADER_ROOT_OBJECT_V1: 0,
        MODERN_SIGNED_LEGACY_EMPTY_HEADER_ROOT_V1: 0,
      },
      complete_scan_digest:
        sha256(Buffer.from(
          `synthetic-complete:${manifest.checkpoint_id}`,
        )),
      frozen_head: 0,
      historical_blocks_scanned: 1,
      manifest_id:
        `voidm0map1_${sha256(Buffer.from(
          `synthetic-scan:${manifest.checkpoint_id}`,
        ))}`,
      scanner_version: "v1.1",
      source_id:
        `voidm0src1_${sha256(Buffer.from(
          `synthetic-scan-source:${manifest.checkpoint_id}`,
        ))}`,
    },
  };
  const acceptanceId =
    `voidm0accept1_${sha256(
      Buffer.from(stableStringify(acceptanceBody)),
    )}`;
  const acceptance = {
    ...acceptanceBody,
    acceptance_id: acceptanceId,
  };
  fs.writeFileSync(
    acceptanceFile,
    `${JSON.stringify(acceptance)}\n`,
    { mode: 0o600 },
  );

  return {
    manifest,
    manifestBytes,
    sourceSha,
    acceptanceId,
    authorityId,
    prefixRoot,
    checkpointDescriptorSha256,
  };
}

function fixtureEnv(packet) {
  return {
    ...process.env,
    VOID_PUBLIC_BOOTSTRAP_ALLOW_LOOPBACK_FIXTURE: "1",
    VOID_PUBLIC_CHECKPOINT_RESTART_AUTHORITY_FIXTURE: "1",
    VOID_PUBLIC_CHECKPOINT_RESTART_AUTHORITY_FIXTURE_FILE:
      packet.acceptanceFile,
    VOID_PUBLIC_CHECKPOINT_RESTART_AUTHORITY_EXPECTED_ACCEPTANCE_ID:
      packet.acceptanceId,
    VOID_PUBLIC_CHECKPOINT_RESTART_AUTHORITY_EXPECTED_AUTHORITY_ID:
      packet.authorityId,
    VOID_PUBLIC_CHECKPOINT_RESTART_AUTHORITY_EXPECTED_PREFIX_ROOT:
      packet.prefixRoot,
    VOID_PUBLIC_CHECKPOINT_RESTART_AUTHORITY_EXPECTED_CHECKPOINT_DESCRIPTOR_SHA256:
      packet.checkpointDescriptorSha256,
  };
}

function runPreflight({
  packetDir,
  packet,
  receipt,
  expectedSourceSha = packet.sourceSha,
}) {
  return spawnSync(
    process.execPath,
    [
      tool,
      "--packet",
      packetDir,
      "--expected-source-sha",
      expectedSourceSha,
      "--receipt",
      receipt,
    ],
    {
      cwd: root,
      encoding: "utf8",
      env: fixtureEnv(packet),
      timeout: 60_000,
      maxBuffer: 8 * 1024 * 1024,
    },
  );
}

const toolSource = fs.readFileSync(tool, "utf8");
assert.doesNotMatch(toolSource, /createPublicSeedClientAdapterV1/);
assert.doesNotMatch(toolSource, /http\.createServer/);
assert.doesNotMatch(toolSource, /VOID_PUBLIC_SEED_BIND/);
assert.match(toolSource, /publication_performed=false/);
assert.match(toolSource, /gateway_started=false/);

const tmp = fs.mkdtempSync(
  path.join(
    os.tmpdir(),
    "void-checkpoint-publication-preflight-v1-",
  ),
);

try {
  const packetDir = path.join(tmp, "packet");
  fs.mkdirSync(packetDir, { mode: 0o700 });
  const acceptanceFile =
    path.join(tmp, "acceptance.json");

  const made = makePacket(
    packetDir,
    acceptanceFile,
  );
  const packet = {
    ...made,
    acceptanceFile,
  };

  const receipt = path.join(tmp, "receipt.json");
  const first = runPreflight({
    packetDir,
    packet,
    receipt,
  });
  assert.equal(
    first.status,
    0,
    `preflight failed: stdout=${first.stdout} stderr=${first.stderr}`,
  );
  assert.match(
    first.stdout,
    /VOID_PUBLIC_CHECKPOINT_PUBLICATION_PREFLIGHT_V1_GREEN/,
  );
  assert.match(
    first.stdout,
    /independent_restart_authority_bound=true/,
  );
  assert.match(
    first.stdout,
    /raw_checkpoint_descriptor_sha256_bound=true/,
  );
  assert.match(
    first.stdout,
    /gateway_three_pin_tuple_derived=true/,
  );
  assert.equal(fs.existsSync(receipt), true);
  assert.equal(fs.statSync(receipt).mode & 0o777, 0o600);

  const decoded = JSON.parse(
    fs.readFileSync(receipt, "utf8"),
  );
  assert.equal(
    decoded.schema,
    "void_public_checkpoint_publication_preflight_v1",
  );
  assert.equal(decoded.status, "green");
  assert.equal(
    decoded.checkpoint_id,
    packet.manifest.checkpoint_id,
  );
  assert.equal(
    decoded.gateway_env.VOID_PUBLIC_SEED_CHECKPOINT_ROOT,
    packetDir,
  );
  assert.equal(
    decoded.gateway_env.VOID_PUBLIC_SEED_CHECKPOINT_ID,
    packet.manifest.checkpoint_id,
  );
  assert.equal(
    decoded.gateway_env
      .VOID_PUBLIC_SEED_CHECKPOINT_MANIFEST_SHA256,
    sha256(packet.manifestBytes),
  );
  assert.equal(
    decoded.restart_authority.acceptance_id,
    packet.acceptanceId,
  );
  assert.equal(decoded.authority.publication_authority, false);
  assert.equal(decoded.authority.gateway_start_authority, false);

  const second = runPreflight({
    packetDir,
    packet,
    receipt,
  });
  assert.notEqual(second.status, 0);
  assert.match(
    `${second.stdout}\n${second.stderr}`,
    /receipt already exists/,
  );

  const wrongSourceReceipt =
    path.join(tmp, "wrong-source.json");
  const wrongSource = runPreflight({
    packetDir,
    packet,
    receipt: wrongSourceReceipt,
    expectedSourceSha: "2".repeat(40),
  });
  assert.notEqual(wrongSource.status, 0);
  assert.equal(fs.existsSync(wrongSourceReceipt), false);

  const foreignDir = path.join(tmp, "foreign");
  fs.mkdirSync(foreignDir, { mode: 0o700 });
  const foreignAcceptance =
    path.join(tmp, "foreign-acceptance.json");
  const foreignMade = makePacket(
    foreignDir,
    foreignAcceptance,
    { timestamp: 2 },
  );
  const foreignReceipt =
    path.join(tmp, "foreign-receipt.json");
  const foreignAgainstAccepted = spawnSync(
    process.execPath,
    [
      tool,
      "--packet",
      foreignDir,
      "--expected-source-sha",
      foreignMade.sourceSha,
      "--receipt",
      foreignReceipt,
    ],
    {
      cwd: root,
      encoding: "utf8",
      env: fixtureEnv(packet),
      timeout: 60_000,
      maxBuffer: 8 * 1024 * 1024,
    },
  );
  assert.notEqual(foreignAgainstAccepted.status, 0);
  assert.equal(fs.existsSync(foreignReceipt), false);
  assert.match(
    `${foreignAgainstAccepted.stdout}\n${foreignAgainstAccepted.stderr}`,
    /accepted frozen prefix|restart authority|checkpoint manifest/,
  );

  const tamperedDir = path.join(tmp, "tampered");
  fs.cpSync(packetDir, tamperedDir, { recursive: true });
  fs.appendFileSync(
    path.join(tamperedDir, "checkpoint.json"),
    " ",
  );
  const tamperedReceipt =
    path.join(tmp, "tampered-receipt.json");
  const tampered = runPreflight({
    packetDir: tamperedDir,
    packet,
    receipt: tamperedReceipt,
  });
  assert.notEqual(tampered.status, 0);
  assert.equal(fs.existsSync(tamperedReceipt), false);

  console.log("canonical_packet_verified=true");
  console.log("independent_restart_authority_bound=true");
  console.log("raw_checkpoint_descriptor_sha256_bound=true");
  console.log("gateway_three_pin_tuple_derived=true");
  console.log("gateway_root_pin_derived=true");
  console.log("gateway_checkpoint_id_pin_derived=true");
  console.log("gateway_manifest_sha256_pin_derived=true");
  console.log("receipt_mode_0600=true");
  console.log("receipt_create_only=true");
  console.log("wrong_source_sha_rejected=true");
  console.log("foreign_self_consistent_packet_rejected=true");
  console.log("tampered_manifest_rejected=true");
  console.log("publication_performed=false");
  console.log("gateway_started=false");
  console.log("network_action=false");
  console.log(MARKER);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
