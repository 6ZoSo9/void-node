#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "void-epoch2-candidate-review-"));
const stamp = "20260928T162432Z";
const marker = "VOID_ECONOMIC_EPOCH2_SIGNED_ARTIFACT_METADATA_CENSUS_V1";
const status = "METADATA_CENSUS_READY_OPERATOR_REVIEW_REQUIRED";

function writeReceipt(name, files, symlinks = []) {
  const target = path.join(temp, name);
  fs.writeFileSync(target, JSON.stringify({
    marker,
    version: 1,
    status,
    scanned_file_content_read: false,
    files,
    symlink_descendants: symlinks,
  }) + "\n", { mode: 0o600 });
  fs.chmodSync(target, 0o600);
}

const base = "/home/operator/Downloads";
writeReceipt(
  `void_epoch2_signed_artifact_metadata_census_precision_v1_${stamp}_root_batch_01.json`,
  [
    {
      absolute_path: base + "/void-role-authority-deployment-signed-v1.txt",
      basename: "void-role-authority-deployment-signed-v1.txt",
      size_bytes: 512,
      source_kind: "explicit_void_owned_root",
      candidate_name_hint: true,
      content_read: false,
    },
    {
      absolute_path: base + "/docs/buy-void-prepared-transaction.md",
      basename: "buy-void-prepared-transaction.md",
      size_bytes: 2048,
      source_kind: "explicit_void_owned_root",
      candidate_name_hint: true,
      content_read: false,
    },
    {
      absolute_path: base + "/notes.txt",
      basename: "notes.txt",
      size_bytes: 10,
      source_kind: "explicit_void_owned_root",
      candidate_name_hint: false,
      content_read: false,
    },
  ],
);
writeReceipt(
  `void_epoch2_signed_artifact_metadata_census_precision_v1_${stamp}_file_batch_01.json`,
  [
    {
      absolute_path: base + "/void-evidence.json",
      basename: "void-evidence.json",
      size_bytes: 4096,
      source_kind: "explicit_operator_file",
      candidate_name_hint: true,
      content_read: false,
    },
    {
      absolute_path: base + "/void-export.zip",
      basename: "void-export.zip",
      size_bytes: 8192,
      source_kind: "explicit_operator_file",
      candidate_name_hint: true,
      content_read: false,
    },
  ],
);

try {
  const run = spawnSync(
    process.execPath,
    [
      "tools/void-economic-epoch2-signed-artifact-candidate-metadata-review-v1.mjs",
      "--receipt-dir",
      temp,
      "--stamp",
      stamp,
      "--apply",
      "--confirmation",
      "reviewVoidSignedArtifactCandidateMetadata",
    ],
    { encoding: "utf8" },
  );
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /receipt_count=2/);
  assert.match(run.stdout, /candidate_occurrence_count=4/);
  assert.match(run.stdout, /unique_candidate_path_count=4/);
  assert.match(run.stdout, /unique_candidate_basename_count=4/);
  assert.match(run.stdout, /symlink_candidate_name_hint_count=0/);
  assert.match(run.stdout, /"direct_text_candidate":1/);
  assert.match(run.stdout, /"structured_json_candidate":1/);
  assert.match(run.stdout, /"archive_candidate":1/);
  assert.match(run.stdout, /"source_or_document_name":1/);
  assert.match(run.stdout, /focused_candidate_count=3/);
  assert.match(run.stdout, /candidate_file_content_read=false/);
  assert.match(run.stdout, /pending_legacy_signed_transaction_census_complete=false/);
  assert.match(run.stdout, /privileged_signer_nonce_or_key_replay_fence_proven=false/);
  assert.match(run.stdout, /cross_epoch_replay_protection_proven=false/);
  assert.match(
    run.stdout,
    /VOID_ECONOMIC_EPOCH2_SIGNED_ARTIFACT_CANDIDATE_METADATA_REVIEW_V1_GREEN/,
  );

  const source = fs.readFileSync(
    "tools/void-economic-epoch2-signed-artifact-candidate-metadata-review-v1.mjs",
    "utf8",
  );
  assert.match(source, /fs\.readFileSync\(receiptFile, "utf8"\)/);
  assert.doesNotMatch(source, /eth_sendRawTransaction|eth_sendTransaction|cast send/);
  assert.doesNotMatch(source, /PRIVATE_KEY|MNEMONIC|KEYSTORE/);
  assert.match(source, /candidate_file_content_read=false/);
  assert.match(source, /source_or_document_name/);
  assert.match(source, /structured_json_candidate/);
  assert.match(source, /archive_candidate/);
  assert.match(source, /direct_text_candidate/);

  console.log(
    "VOID_ECONOMIC_EPOCH2_SIGNED_ARTIFACT_CANDIDATE_METADATA_REVIEW_V1_PROOF_GREEN",
  );
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
