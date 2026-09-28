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
  const safetensorsFile = path.join(cleanDir, "model.safetensors");
  fs.writeFileSync(asciiFile, "fixture=" + raw + "\n", { mode: 0o600 });
  fs.writeFileSync(binaryFile, Buffer.from(raw.slice(2), "hex"), { mode: 0o600 });

  const safetensorsPayloadBytes = 64 * 1024 * 1024 + 4;
  let safetensorsHeaderText = "";
  for (let attempt = 0; attempt < 4; attempt += 1) {
    safetensorsHeaderText = JSON.stringify({
      weight: {
        dtype: "F32",
        shape: [Math.floor(safetensorsPayloadBytes / 4)],
        data_offsets: [0, safetensorsPayloadBytes],
      },
      __metadata__: {
        note: "fixture-no-transaction",
      },
    });
  }
  const safetensorsHeader = Buffer.from(safetensorsHeaderText, "utf8");
  const safetensorsFd = fs.openSync(safetensorsFile, "w", 0o600);
  try {
    const prefix = Buffer.alloc(8);
    prefix.writeBigUInt64LE(BigInt(safetensorsHeader.length), 0);
    fs.writeSync(safetensorsFd, prefix, 0, prefix.length, 0);
    fs.writeSync(
      safetensorsFd,
      safetensorsHeader,
      0,
      safetensorsHeader.length,
      8,
    );
    fs.ftruncateSync(
      safetensorsFd,
      8 + safetensorsHeader.length + safetensorsPayloadBytes,
    );
  } finally {
    fs.closeSync(safetensorsFd);
  }
  fs.chmodSync(safetensorsFile, 0o600);

  const ext4FixtureDir = path.join(
    cleanDir,
    "void-pr1352-ext4-restart-fixture1",
  );
  fs.mkdirSync(ext4FixtureDir, { recursive: true });
  const ext4Fixture = path.join(ext4FixtureDir, "support.ext4");
  const ext4PayloadSentinel =
    "DO_NOT_READ_PR1352_EXT4_PAYLOAD_SENTINEL";
  const ext4Fd = fs.openSync(ext4Fixture, "w", 0o600);
  try {
    const ext4Bytes = 384 * 1024 * 1024;
    fs.ftruncateSync(ext4Fd, ext4Bytes);

    const superblock = Buffer.alloc(1024);
    superblock.writeUInt32LE(ext4Bytes / 4096, 4);
    superblock.writeUInt32LE(2, 24);
    superblock.writeUInt16LE(0xef53, 56);
    fs.writeSync(ext4Fd, superblock, 0, superblock.length, 1024);

    const sentinelBytes = Buffer.from(
      ext4PayloadSentinel + "\n" + raw + "\n",
      "utf8",
    );
    fs.writeSync(
      ext4Fd,
      sentinelBytes,
      0,
      sentinelBytes.length,
      1024 * 1024,
    );
  } finally {
    fs.closeSync(ext4Fd);
  }
  fs.chmodSync(ext4Fixture, 0o600);

  const portableMismatchDir = path.join(temp, "portable-hash-mismatch");
  fs.mkdirSync(portableMismatchDir);
  const portableNodeDir = path.join(
    portableMismatchDir,
    "void-pr1464-portable-nodes-v1",
    "node-v24.20.0-linux-x64",
  );
  fs.mkdirSync(portableNodeDir, { recursive: true });
  const portableNode = path.join(portableNodeDir, "node");
  const portableNodePayloadSentinel =
    "DO_NOT_PRINT_PR1464_PORTABLE_NODE_PAYLOAD_SENTINEL";
  const portableNodeFd = fs.openSync(portableNode, "w", 0o700);
  try {
    const portableNodeBytes = 70 * 1024 * 1024;
    fs.ftruncateSync(portableNodeFd, portableNodeBytes);

    const elfHeader = Buffer.alloc(64);
    elfHeader[0] = 0x7f;
    elfHeader.write("ELF", 1, "ascii");
    elfHeader[4] = 2;
    elfHeader[5] = 1;
    elfHeader[6] = 1;
    elfHeader.writeUInt16LE(3, 16);
    elfHeader.writeUInt16LE(62, 18);
    elfHeader.writeUInt32LE(1, 20);
    elfHeader.writeBigUInt64LE(64n, 32);
    elfHeader.writeUInt16LE(64, 52);
    elfHeader.writeUInt16LE(56, 54);
    elfHeader.writeUInt16LE(1, 56);
    fs.writeSync(portableNodeFd, elfHeader, 0, elfHeader.length, 0);

    const interpreter = Buffer.from(
      "/lib64/ld-linux-x86-64.so.2\0",
      "utf8",
    );
    const program = Buffer.alloc(56);
    program.writeUInt32LE(3, 0);
    program.writeBigUInt64LE(512n, 8);
    program.writeBigUInt64LE(BigInt(interpreter.length), 32);
    program.writeBigUInt64LE(BigInt(interpreter.length), 40);
    program.writeBigUInt64LE(1n, 48);
    fs.writeSync(portableNodeFd, program, 0, program.length, 64);
    fs.writeSync(
      portableNodeFd,
      interpreter,
      0,
      interpreter.length,
      512,
    );

    const sentinelBytes = Buffer.from(
      portableNodePayloadSentinel,
      "utf8",
    );
    fs.writeSync(
      portableNodeFd,
      sentinelBytes,
      0,
      sentinelBytes.length,
      1024 * 1024,
    );
  } finally {
    fs.closeSync(portableNodeFd);
  }
  fs.chmodSync(portableNode, 0o700);

  const publicPem = path.join(cleanDir, "producer-public.pem");
  const { publicKey } = crypto.generateKeyPairSync("ed25519");
  fs.writeFileSync(
    publicPem,
    publicKey.export({ format: "pem", type: "spki" }),
    { mode: 0o600 },
  );
  fs.chmodSync(publicPem, 0o600);

  const warCollegeDir = path.join(cleanDir, "ops", "war-college");
  fs.mkdirSync(warCollegeDir, { recursive: true });
  const verifierEnv = path.join(
    warCollegeDir,
    "void-war-college-evidence-verifier.env",
  );
  fs.writeFileSync(
    verifierEnv,
    [
      "VOID_WAR_COLLEGE_VERIFIER_MODE=offline",
      "VOID_WAR_COLLEGE_EVIDENCE_ROOT=/tmp/fixture",
      "VOID_WAR_COLLEGE_PUBLIC_KEY_ID=fixture-public",
      "",
    ].join("\n"),
    { mode: 0o600 },
  );
  fs.chmodSync(verifierEnv, 0o600);

  const sitePackagesDir = path.join(
    cleanDir,
    "lib",
    "python3.12",
    "site-packages",
    "grpc",
    "_cython",
    "_cygrpc",
    "private_key_signing",
  );
  fs.mkdirSync(sitePackagesDir, { recursive: true });
  const generatedSensitiveSource = path.join(
    sitePackagesDir,
    "private_key_signer_py_wrapper.cc",
  );
  const generatedSensitiveSentinel =
    "DO_NOT_READ_GENERATED_PRIVATE_KEY_SIGNING_SOURCE_SENTINEL";
  fs.writeFileSync(
    generatedSensitiveSource,
    generatedSensitiveSentinel,
    { mode: 0o600 },
  );
  fs.chmodSync(generatedSensitiveSource, 0o600);

  const generatedTrustRootDir = path.join(
    cleanDir,
    "lib",
    "python3.12",
    "site-packages",
    "grpc",
    "_cython",
    "_credentials",
  );
  fs.mkdirSync(generatedTrustRootDir, { recursive: true });
  const generatedTrustRoot = path.join(
    generatedTrustRootDir,
    "roots.pem",
  );
  const generatedTrustRootSentinel =
    "DO_NOT_READ_GENERATED_TRUST_ROOT_BUNDLE_SENTINEL";
  fs.writeFileSync(
    generatedTrustRoot,
    [
      "-----BEGIN PRIVATE KEY-----",
      Buffer.from(generatedTrustRootSentinel, "utf8").toString("base64"),
      "-----END PRIVATE KEY-----",
      "",
    ].join("\n"),
    { mode: 0o600 },
  );
  fs.chmodSync(generatedTrustRoot, 0o600);

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
    files: [
      fileRow(asciiFile),
      fileRow(binaryFile),
      fileRow(safetensorsFile),
      fileRow(publicPem),
      fileRow(verifierEnv),
      fileRow(generatedSensitiveSource),
    ],
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
  assert.match(clean.stdout, /receipt_regular_file_count=6/);
  assert.match(clean.stdout, /depth_boundary_subtree_count=1/);
  assert.match(clean.stdout, /depth_expanded_file_count=1/);
  assert.match(clean.stdout, /generated_dependency_cache_subtree_count=1/);
  assert.match(clean.stdout, /symlink_descendant_count=1/);
  assert.match(clean.stdout, /symlink_internal_alias_count=1/);
  assert.match(clean.stdout, /symlink_external_target_count=0/);
  assert.match(clean.stdout, /sensitive_path_count=3/);
  assert.match(clean.stdout, /sensitive_public_pem_count=1/);
  assert.match(clean.stdout, /sensitive_war_college_env_count=1/);
  assert.match(clean.stdout, /sensitive_generated_dependency_source_count=1/);
  assert.match(clean.stdout, /sensitive_generated_trust_root_count=0/);
  assert.match(clean.stdout, /sensitive_unknown_path_count=0/);
  assert.match(clean.stdout, /sensitive_file_values_printed=false/);
  assert.match(clean.stdout, /private_key_or_secret_content_read=false/);
  assert.match(clean.stdout, /validated_pr1464_portable_node_runtime_count=0/);
  assert.match(
    clean.stdout,
    /validated_pr1464_portable_node_runtime_versions=\[\]/,
  );
  assert.match(
    clean.stdout,
    /pr1464_portable_node_identity_hash_full_file_read_count=0/,
  );
  assert.match(
    clean.stdout,
    /pr1464_portable_node_payload_content_scanned=false/,
  );
  assert.match(
    clean.stdout,
    /pr1464_portable_node_payload_content_printed=false/,
  );
  assert.match(clean.stdout, /validated_pr1352_ext4_support_fixture_count=0/);
  assert.match(
    clean.stdout,
    /validated_pr1352_ext4_support_fixture_bytes=0/,
  );
  assert.match(clean.stdout, /pr1352_ext4_fixture_payload_content_read=false/);
  assert.match(clean.stdout, /validated_safetensors_model_artifact_count=1/);
  assert.match(clean.stdout, /safetensors_tensor_payload_content_read=false/);
  assert.match(clean.stdout, /safetensors_header_hex_candidate_count=0/);
  assert.match(clean.stdout, /content_scanned_file_count=6/);
  assert.match(clean.stdout, /signed_chain2050_transaction_count=1/);
  assert.match(clean.stdout, /requires_operator_followup_count=1/);
  assert.match(clean.stdout, /full_receipt_bound_content_sweep_complete=true/);
  assert.match(clean.stdout, /raw_transaction_printed=false/);
  assert.match(clean.stdout, /raw_transaction_persisted=false/);
  assert.match(clean.stdout, /generated_dependency_cache_content_read=false/);
  assert.match(
    clean.stdout,
    /generated_sensitive_dependency_source_content_read=true/,
  );
  assert.match(
    clean.stdout,
    /generated_sensitive_trust_root_content_read=false/,
  );
  assert.match(clean.stdout, /private_key_or_secret_content_read=false/);
  assert.match(clean.stdout, /sensitive_file_values_printed=false/);
  assert.match(clean.stdout, new RegExp(txHash.replace(/[.*+?^$()|[\]\\]/g, "\\$&")));
  assert.equal(clean.stdout.includes(raw), false);
  assert.equal(clean.stdout.includes(generatedRaw), false);
  assert.equal(clean.stdout.includes(generatedHash), false);
  assert.equal(
    clean.stdout.includes(generatedSensitiveSentinel),
    false,
  );
  assert.equal(
    clean.stdout.includes(generatedTrustRootSentinel),
    false,
  );
  assert.equal(
    clean.stdout.includes(ext4PayloadSentinel),
    false,
  );
  assert.equal(
    clean.stdout.includes(portableNodePayloadSentinel),
    false,
  );

  const trustRootHoldDir = path.join(temp, "trust-root-provenance-hold");
  fs.mkdirSync(trustRootHoldDir);
  writeReceipt(trustRootHoldDir, { files: [fileRow(generatedTrustRoot)] });
  const trustRootHeld = run(trustRootHoldDir);
  assert.notEqual(trustRootHeld.status, 0);
  assert.match(
    trustRootHeld.stderr,
    /generated_trust_root_requires_bound_provenance/,
  );
  assert.equal(trustRootHeld.stdout.includes(generatedTrustRootSentinel), false);
  assert.equal(trustRootHeld.stderr.includes(generatedTrustRootSentinel), false);

  const ext4HoldDir = path.join(temp, "ext4-provenance-hold");
  fs.mkdirSync(ext4HoldDir);
  writeReceipt(ext4HoldDir, { files: [fileRow(ext4Fixture)] });
  const ext4Held = run(ext4HoldDir);
  assert.notEqual(ext4Held.status, 0);
  assert.match(
    ext4Held.stderr,
    /pr1352_ext4_fixture_requires_bound_provenance/,
  );
  assert.equal(ext4Held.stdout.includes(ext4PayloadSentinel), false);
  assert.equal(ext4Held.stderr.includes(ext4PayloadSentinel), false);
  assert.equal(ext4Held.stdout.includes(raw), false);
  assert.equal(ext4Held.stderr.includes(raw), false);

  writeReceipt(portableMismatchDir, { files: [fileRow(portableNode)] });
  const portableHeld = run(portableMismatchDir);
  assert.notEqual(portableHeld.status, 0);
  assert.match(
    portableHeld.stderr,
    /pr1464_portable_node_sha256_mismatch/,
  );
  assert.equal(
    portableHeld.stdout.includes(portableNodePayloadSentinel),
    false,
  );
  assert.equal(
    portableHeld.stderr.includes(portableNodePayloadSentinel),
    false,
  );

  const sensitiveDir = path.join(temp, "sensitive");
  fs.mkdirSync(sensitiveDir);
  const sensitive = path.join(sensitiveDir, "void-private-key.pem");
  const sentinel = "DO_NOT_READ_OR_PRINT_PRIVATE_KEY_SENTINEL";
  fs.writeFileSync(
    sensitive,
    [
      "-----BEGIN PRIVATE KEY-----",
      Buffer.from(sentinel, "utf8").toString("base64"),
      "-----END PRIVATE KEY-----",
      "",
    ].join("\n"),
    { mode: 0o600 },
  );
  writeReceipt(sensitiveDir, { files: [fileRow(sensitive)] });
  const held = run(sensitiveDir);
  assert.notEqual(held.status, 0);
  assert.match(held.stderr, /private_pem_material_rejected/);
  assert.equal(held.stdout.includes(sentinel), false);
  assert.equal(held.stderr.includes(sentinel), false);

  const secretEnvDir = path.join(temp, "secret-env", "ops", "war-college");
  fs.mkdirSync(secretEnvDir, { recursive: true });
  const secretEnv = path.join(
    secretEnvDir,
    "void-war-college-evidence-verifier.env",
  );
  const envSentinel = "DO_NOT_PRINT_SECRET_ENV_VALUE";
  fs.writeFileSync(
    secretEnv,
    "VOID_SECRET=" + envSentinel + "\n",
    { mode: 0o600 },
  );
  writeReceipt(path.dirname(path.dirname(secretEnvDir)), {
    files: [fileRow(secretEnv)],
  });
  const envHeld = run(path.dirname(path.dirname(secretEnvDir)));
  assert.notEqual(envHeld.status, 0);
  assert.match(envHeld.stderr, /sensitive_env_secret_variable_rejected/);
  assert.equal(envHeld.stdout.includes(envSentinel), false);
  assert.equal(envHeld.stderr.includes(envSentinel), false);

  const source = fs.readFileSync(
    "tools/void-economic-epoch2-full-signed-artifact-content-sweep-v1.mjs",
    "utf8",
  );
  assert.match(source, /scans_ascii_and_binary_serialized_evm_transactions/);
  assert.match(source, /private_key_or_secret_content_read: false/);
  assert.match(source, /reviewed_sensitive_nonsecret_content_read_on_apply: true/);
  assert.match(source, /PUBLIC_PEM_OR_CERTIFICATE/);
  assert.match(source, /WAR_COLLEGE_VERIFIER_ENV/);
  assert.match(source, /GENERATED_DEPENDENCY_PRIVATE_KEY_SIGNING_SOURCE/);
  assert.match(source, /GENERATED_DEPENDENCY_TRUST_ROOT_PEM/);
  assert.match(source, /GENERATED_SDK_TRUST_ROOT_PEM/);
  assert.match(source, /generated_trust_root_requires_bound_provenance/);
  assert.match(source, /private_pem_material_rejected/);
  assert.match(source, /sensitive_env_secret_variable_rejected/);
  assert.match(source, /generated_dependency_cache_content_read=false/);
  assert.match(source, /VALIDATED_PR1464_PORTABLE_NODE_RUNTIME/);
  assert.match(source, /pr1464_portable_node_sha256_mismatch/);
  assert.match(source, /pr1464_portable_node_identity_hash_full_file_read_count=/);
  assert.match(source, /pr1464_portable_node_payload_content_scanned=false/);
  assert.match(source, /pr1464_portable_node_payload_content_printed=false/);
  assert.match(source, /void-pr1464-portable-nodes-v1/);
  assert.ok(source.includes('"v24.20.0"'));
  assert.ok(source.includes('"v26.8.1"'));
  assert.ok(source.includes("89af8424dd53e560b1933f87ba650d8bf57c83ca5a04600eefb31f416aabbae7"));
  assert.ok(source.includes("19235a9b678f84729464c52623f92de130a165452747c6826d3fdc13df3abcc3"));
  assert.equal(source.includes('"v22.23.2"'), false);
  assert.match(source, /pr1352_ext4_fixture_requires_bound_provenance/);
  assert.match(source, /pr1352_ext4_fixture_payload_content_read=false/);
  assert.match(source, /void-pr1352-ext4-restart-/);
  assert.match(source, /VALIDATED_SAFETENSORS_MODEL_WEIGHT_ARTIFACT/);
  assert.match(source, /safetensors_tensor_payload_content_read=false/);
  assert.match(source, /safetensors_tensor_payload_not_fully_described/);
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
  console.log("pr1464_portable_node_exact_hash_rejection_proven=true");
  console.log("pr1464_portable_node_candidate_full_file_hash_proven=true");
  console.log("pr1464_portable_node_payload_content_scanned=false");
  console.log("pr1464_portable_node_payload_content_printed=false");
  console.log("pr1352_ext4_path_only_exclusion_rejected=true");
  console.log("pr1352_ext4_fixture_payload_content_read=false");
  console.log("validated_safetensors_model_artifact_exclusion_proven=true");
  console.log("safetensors_tensor_payload_content_read=false");
  console.log("sensitive_public_pem_review_proven=true");
  console.log("war_college_verifier_env_review_proven=true");
  console.log("generated_sensitive_dependency_source_scanned_proven=true");
  console.log("generated_sensitive_trust_root_path_only_exclusion_rejected=true");
  console.log("private_pem_rejection_proven=true");
  console.log("secret_env_variable_rejection_proven=true");
  console.log("generated_dependency_cache_content_read=false");
  console.log("private_key_or_secret_content_read=false");
  console.log("sensitive_file_values_printed=false");
  console.log("raw_transaction_printed=false");
  console.log("raw_transaction_persisted=false");
  console.log("pending_legacy_signed_transaction_census_complete=false");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
