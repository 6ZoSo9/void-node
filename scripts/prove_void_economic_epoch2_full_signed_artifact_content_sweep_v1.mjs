#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { Transaction, Wallet } from "ethers";

const stamp = "20260928T162432Z";
const marker = "VOID_ECONOMIC_EPOCH2_SIGNED_ARTIFACT_METADATA_CENSUS_V1";
const status = "METADATA_CENSUS_READY_OPERATOR_REVIEW_REQUIRED";
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "void-epoch2-full-content-"));
const sha256 = (text) => crypto.createHash("sha256").update(text).digest("hex");

function receiptPath(dir, suffix) {
  return path.join(
    dir,
    "void_epoch2_signed_artifact_metadata_census_precision_v1_" +
      stamp + "_" + suffix + ".json",
  );
}
function fileRow(file) {
  const stat = fs.lstatSync(file);
  return {
    source_kind: "explicit_void_owned_root",
    absolute_path: file,
    path_sha256: sha256(file),
    basename: path.basename(file),
    size_bytes: stat.size,
    mode_octal: (stat.mode & 0o777).toString(8).padStart(3, "0"),
    candidate_name_hint: false,
    content_read: false,
  };
}
function writeReceipt(dir, body, suffix = "root_batch_01") {
  const out = receiptPath(dir, suffix);
  fs.writeFileSync(
    out,
    JSON.stringify({
      marker,
      version: 1,
      status,
      scanned_file_content_read: false,
      files: body.files ?? [],
      symlink_descendants: body.symlink_descendants ?? [],
      skipped_generated_subtrees: body.skipped_generated_subtrees ?? [],
      skipped_depth_subtrees: body.skipped_depth_subtrees ?? [],
    }) + "\n",
    { mode: 0o600 },
  );
  fs.chmodSync(out, 0o600);
  return out;
}
function run(dir) {
  return spawnSync(
    process.execPath,
    [
      "tools/void-economic-epoch2-full-signed-artifact-content-sweep-v1.mjs",
      "--receipt-dir",
      dir,
      "--stamp",
      stamp,
      "--apply",
      "--confirmation",
      "scanApprovedVoidArtifactContentsForSignedTransactions",
    ],
    { encoding: "utf8" },
  );
}

try {
  const cleanDir = path.join(temp, "clean");
  fs.mkdirSync(cleanDir);

  const wallet = new Wallet(
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412df4e9b6d86f1fb",
  );
  const raw = await wallet.signTransaction({
    type: 2,
    chainId: 2050,
    nonce: 0,
    to: "0x0000000000000000000000000000000000000001",
    value: 0n,
    gasLimit: 21000n,
    maxFeePerGas: 1000000000n,
    maxPriorityFeePerGas: 0n,
  });
  const txHash = Transaction.from(raw).hash;

  const asciiFile = path.join(cleanDir, "void-notes.md");
  const binaryFile = path.join(cleanDir, "void-binary.bin");
  fs.writeFileSync(asciiFile, "fixture=" + raw + "\n", { mode: 0o600 });
  fs.writeFileSync(binaryFile, Buffer.from(raw.slice(2), "hex"), { mode: 0o600 });

  const symlink = path.join(cleanDir, "void-alias");
  fs.symlinkSync(asciiFile, symlink);

  const generated = path.join(cleanDir, "node_modules");
  fs.mkdirSync(generated);
  const generatedWallet = Wallet.createRandom();
  const generatedRaw = await generatedWallet.signTransaction({
    type: 2,
    chainId: 2050,
    nonce: 0,
    to: "0x0000000000000000000000000000000000000002",
    value: 0n,
    gasLimit: 21000n,
    maxFeePerGas: 1000000000n,
    maxPriorityFeePerGas: 0n,
  });
  const generatedHash = Transaction.from(generatedRaw).hash;
  fs.writeFileSync(path.join(generated, "void-generated.txt"), generatedRaw + "\n");

  const depthRoot = path.join(cleanDir, "net6.0");
  fs.mkdirSync(depthRoot);
  const depthFile = path.join(depthRoot, "void-depth-copy.txt");
  fs.writeFileSync(depthFile, raw + "\n", { mode: 0o600 });

  writeReceipt(cleanDir, {
    files: [fileRow(asciiFile), fileRow(binaryFile)],
    symlink_descendants: [{
      source_kind: "symlink_descendant",
      absolute_path: symlink,
      path_sha256: sha256(symlink),
      basename: path.basename(symlink),
      size_bytes: fs.lstatSync(symlink).size,
      mode_octal: "777",
      candidate_name_hint: false,
      content_read: false,
      symlink_target_read: false,
      followed: false,
    }],
    skipped_generated_subtrees: [{
      source_kind: "skipped_generated_subtree",
      absolute_path: generated,
      path_sha256: sha256(generated),
      basename: "node_modules",
      mode_octal: "755",
      skip_reason: "generated_dependency_or_cache_directory",
      contents_enumerated: false,
      content_read: false,
      followed: false,
    }],
    skipped_depth_subtrees: [{
      source_kind: "skipped_depth_subtree",
      absolute_path: depthRoot,
      path_sha256: sha256(depthRoot),
      basename: "net6.0",
      mode_octal: "755",
      skip_reason: "maximum_scan_depth_boundary",
      subtree_depth: 13,
      maximum_scan_depth: 12,
      contents_enumerated: false,
      content_read: false,
      followed: false,
    }],
  });

  const clean = run(cleanDir);
  assert.equal(clean.status, 0, clean.stderr);
  assert.match(clean.stdout, /FULL_SIGNED_ARTIFACT_CONTENT_SWEEP_V1_GREEN/);
  assert.match(clean.stdout, /receipt_regular_file_count=2/);
  assert.match(clean.stdout, /depth_boundary_subtree_count=1/);
  assert.match(clean.stdout, /depth_expanded_file_count=1/);
  assert.match(clean.stdout, /generated_dependency_cache_subtree_count=1/);
  assert.match(clean.stdout, /symlink_descendant_count=1/);
  assert.match(clean.stdout, /symlink_internal_alias_count=1/);
  assert.match(clean.stdout, /symlink_external_target_count=0/);
  assert.match(clean.stdout, /credential_or_key_path_skipped_count=0/);
  assert.match(clean.stdout, /content_scanned_file_count=3/);
  assert.match(clean.stdout, /signed_chain2050_transaction_count=1/);
  assert.match(clean.stdout, /requires_operator_followup_count=1/);
  assert.match(clean.stdout, /full_receipt_bound_content_sweep_complete=true/);
  assert.match(clean.stdout, /raw_transaction_printed=false/);
  assert.match(clean.stdout, /raw_transaction_persisted=false/);
  assert.match(clean.stdout, /generated_dependency_cache_content_read=false/);
  assert.match(clean.stdout, /credential_or_key_path_content_read=false/);
  assert.match(clean.stdout, new RegExp(txHash.replace(/[.*+?^$()|[\]\\]/g, "\\$&")));
  assert.equal(clean.stdout.includes(raw), false);
  assert.equal(clean.stdout.includes(generatedRaw), false);
  assert.equal(clean.stdout.includes(generatedHash), false);

  const sensitiveDir = path.join(temp, "sensitive");
  fs.mkdirSync(sensitiveDir);
  const sensitive = path.join(sensitiveDir, "void-private-key.pem");
  const sentinel = "DO_NOT_READ_OR_PRINT_PRIVATE_KEY_SENTINEL";
  fs.writeFileSync(sensitive, sentinel, { mode: 0o600 });
  writeReceipt(sensitiveDir, { files: [fileRow(sensitive)] });
  const held = run(sensitiveDir);
  assert.notEqual(held.status, 0);
  assert.match(held.stderr, /credential_or_key_path_requires_separate_exclusion_review/);
  assert.equal(held.stdout.includes(sentinel), false);
  assert.equal(held.stderr.includes(sentinel), false);

  const source = fs.readFileSync(
    "tools/void-economic-epoch2-full-signed-artifact-content-sweep-v1.mjs",
    "utf8",
  );
  assert.match(source, /scans_ascii_and_binary_serialized_evm_transactions/);
  assert.match(source, /credential_or_key_path_content_read: false/);
  assert.match(source, /generated_dependency_cache_content_read=false/);
  assert.match(source, /full_receipt_bound_content_sweep_complete=true/);
  assert.doesNotMatch(source, /eth_sendRawTransaction|eth_sendTransaction|cast send/);
  assert.doesNotMatch(source, /writeFileSync\(|appendFileSync\(|createWriteStream\(/);

  console.log(
    "VOID_ECONOMIC_EPOCH2_FULL_SIGNED_ARTIFACT_CONTENT_SWEEP_V1_PROOF_GREEN",
  );
  console.log("ascii_transaction_detection_proven=true");
  console.log("binary_transaction_detection_proven=true");
  console.log("depth_boundary_expansion_proven=true");
  console.log("internal_symlink_alias_proven=true");
  console.log("generated_dependency_cache_content_read=false");
  console.log("credential_or_key_path_content_read=false");
  console.log("raw_transaction_printed=false");
  console.log("raw_transaction_persisted=false");
  console.log("pending_legacy_signed_transaction_census_complete=false");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
