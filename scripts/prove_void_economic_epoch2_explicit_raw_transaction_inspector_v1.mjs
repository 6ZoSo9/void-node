#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { Transaction, Wallet } from "ethers";

import {
  VOID_ECONOMIC_EPOCH2_EXPLICIT_RAW_TRANSACTION_INSPECTOR_AUTHORITY_V1,
  VOID_ECONOMIC_EPOCH2_EXPLICIT_RAW_TRANSACTION_INSPECTOR_CONFIRMATION_V1,
  VOID_ECONOMIC_EPOCH2_EXPLICIT_RAW_TRANSACTION_INSPECTOR_V1,
  VoidEconomicEpoch2ExplicitRawTransactionInspectorHoldV1,
  inspectVoidEconomicEpoch2ExplicitRawTransactionV1,
} from "../tools/void-economic-epoch2-explicit-raw-transaction-inspector-v1.mjs";

function nonceCandidate(entries) {
  return {
    marker: "VOID_ECONOMIC_EPOCH2_ACCOUNT_NONCE_CONTINUITY_CANDIDATE_V1",
    version: 1,
    accounts: entries.map(([address, nonce]) => ({
      address: address.toLowerCase(),
      frozen_final_nonce: String(nonce),
    })),
  };
}

function registry(lineages) {
  return {
    marker: "VOID_ECONOMIC_EPOCH2_KNOWN_SIGNED_TRANSACTION_LINEAGES_V1",
    version: 1,
    lineages,
    interpretation: {
      pending_legacy_signed_transaction_census_complete: false,
    },
  };
}

async function signedRaw(wallet, { nonce, chainId = 2050, digit = "1" }) {
  return wallet.signTransaction({
    type: 2,
    chainId,
    nonce,
    to: "0x" + digit.repeat(40),
    value: 0n,
    gasLimit: 21_000n,
    maxFeePerGas: 1n,
    maxPriorityFeePerGas: 0n,
  });
}

function hashOf(raw) {
  return Transaction.from(raw).hash.toLowerCase();
}

function lineageFor(raw, signer, nonce, overrides = {}) {
  return {
    id: "synthetic-lineage",
    signer_address: signer.toLowerCase(),
    transaction_nonce: String(nonce),
    signed_transaction_hash: hashOf(raw),
    stale_under_exact_nonce_continuity: true,
    ...overrides,
  };
}

function expectHold(fn, reason) {
  assert.throws(
    fn,
    (error) =>
      error instanceof VoidEconomicEpoch2ExplicitRawTransactionInspectorHoldV1 &&
      error.reason === reason,
    reason,
  );
}

const wallet = Wallet.createRandom();
const signer = wallet.address.toLowerCase();
const rawNonce2 = await signedRaw(wallet, { nonce: 2 });
const rawNonce3 = await signedRaw(wallet, { nonce: 3, digit: "2" });

{
  const result = inspectVoidEconomicEpoch2ExplicitRawTransactionV1({
    rawTransaction: rawNonce2,
    registry: registry([lineageFor(rawNonce2, signer, 2)]),
    nonceCandidate: nonceCandidate([[signer, 3]]),
  });
  assert.equal(result.marker, VOID_ECONOMIC_EPOCH2_EXPLICIT_RAW_TRANSACTION_INSPECTOR_V1);
  assert.equal(result.status, "KNOWN_LINEAGE_STALE");
  assert.equal(result.chain_id, "2050");
  assert.equal(result.transaction_hash, hashOf(rawNonce2));
  assert.equal(result.signer_address, signer);
  assert.equal(result.transaction_nonce, "2");
  assert.equal(result.frozen_final_nonce, "3");
  assert.equal(result.known_repository_lineage, true);
  assert.equal(result.replay_staleness_proven, true);
  assert.equal(result.requires_operator_followup, false);
  assert.equal(result.pending_legacy_signed_transaction_census_complete, false);
}

{
  const result = inspectVoidEconomicEpoch2ExplicitRawTransactionV1({
    rawTransaction: rawNonce2,
    registry: registry([]),
    nonceCandidate: nonceCandidate([[signer, 3]]),
  });
  assert.equal(result.status, "UNKNOWN_HASH_STALE_BY_RECOVERED_NONCE");
  assert.equal(result.replay_staleness_proven, true);
  assert.equal(result.requires_operator_followup, false);
}

{
  const result = inspectVoidEconomicEpoch2ExplicitRawTransactionV1({
    rawTransaction: rawNonce3,
    registry: registry([]),
    nonceCandidate: nonceCandidate([[signer, 3]]),
  });
  assert.equal(result.status, "UNKNOWN_HASH_REPLAY_RELEVANT");
  assert.equal(result.replay_staleness_proven, false);
  assert.equal(result.requires_operator_followup, true);
}

{
  const other = Wallet.createRandom();
  const raw = await signedRaw(other, { nonce: 0, digit: "3" });
  const result = inspectVoidEconomicEpoch2ExplicitRawTransactionV1({
    rawTransaction: raw,
    registry: registry([]),
    nonceCandidate: nonceCandidate([[signer, 3]]),
  });
  assert.equal(result.frozen_final_nonce, null);
  assert.equal(result.signer_present_in_nonzero_frozen_nonce_census, false);
  assert.equal(result.status, "UNKNOWN_HASH_REPLAY_RELEVANT");
  assert.equal(result.replay_staleness_proven, false);
}

{
  const other = Wallet.createRandom();
  const raw = await signedRaw(other, { nonce: 0, digit: "4" });
  const known = lineageFor(raw, other.address, 0, {
    stale_under_exact_nonce_continuity: false,
    historical_disposition: "SUPERSEDED_BY_RECOVERY",
    replay_staleness_proven: false,
  });
  const result = inspectVoidEconomicEpoch2ExplicitRawTransactionV1({
    rawTransaction: raw,
    registry: registry([known]),
    nonceCandidate: nonceCandidate([[signer, 3]]),
  });
  assert.equal(
    result.status,
    "KNOWN_SUPERSEDED_REPLAY_STALENESS_UNPROVEN",
  );
  assert.equal(result.replay_staleness_proven, false);
  assert.equal(result.requires_operator_followup, true);
}

{
  const known = lineageFor(rawNonce2, Wallet.createRandom().address, 2);
  expectHold(
    () =>
      inspectVoidEconomicEpoch2ExplicitRawTransactionV1({
        rawTransaction: rawNonce2,
        registry: registry([known]),
        nonceCandidate: nonceCandidate([[signer, 3]]),
      }),
    "known_lineage_signer_mismatch",
  );
}

{
  const known = lineageFor(rawNonce2, signer, 1);
  expectHold(
    () =>
      inspectVoidEconomicEpoch2ExplicitRawTransactionV1({
        rawTransaction: rawNonce2,
        registry: registry([known]),
        nonceCandidate: nonceCandidate([[signer, 3]]),
      }),
    "known_lineage_nonce_mismatch",
  );
}

{
  const raw = await signedRaw(wallet, { nonce: 0, chainId: 1, digit: "5" });
  expectHold(
    () =>
      inspectVoidEconomicEpoch2ExplicitRawTransactionV1({
        rawTransaction: raw,
        registry: registry([]),
        nonceCandidate: nonceCandidate([[signer, 3]]),
      }),
    "raw_transaction_chain_id_mismatch",
  );
}

expectHold(
  () =>
    inspectVoidEconomicEpoch2ExplicitRawTransactionV1({
      rawTransaction: "0xnothex",
      registry: registry([]),
      nonceCandidate: nonceCandidate([[signer, 3]]),
    }),
  "raw_transaction_encoding_invalid",
);

for (const [key, value] of Object.entries(
  VOID_ECONOMIC_EPOCH2_EXPLICIT_RAW_TRANSACTION_INSPECTOR_AUTHORITY_V1,
)) {
  assert.equal(
    key === "source_only" ||
      key === "explicit_operator_file_only" ||
      key === "raw_signed_transaction_content_read"
      ? value
      : !value,
    true,
    key,
  );
}

{
  const tmp = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-explicit-raw-inspector-proof-"),
  );
  const rawFile = path.join(tmp, "void-proof-signed-transaction.txt");
  const receipt = path.join(tmp, "receipt.json");
  fs.writeFileSync(rawFile, rawNonce2 + "\n", { mode: 0o600 });

  const output = execFileSync(
    process.execPath,
    [
      "tools/void-economic-epoch2-explicit-raw-transaction-inspector-v1.mjs",
      "--file",
      rawFile,
      "--out",
      receipt,
      "--apply",
      "--confirmation",
      VOID_ECONOMIC_EPOCH2_EXPLICIT_RAW_TRANSACTION_INSPECTOR_CONFIRMATION_V1,
    ],
    { encoding: "utf8" },
  );
  const stdout = JSON.parse(output);
  const stored = JSON.parse(fs.readFileSync(receipt, "utf8"));
  assert.equal(stdout.marker, VOID_ECONOMIC_EPOCH2_EXPLICIT_RAW_TRANSACTION_INSPECTOR_V1);
  assert.equal(stdout.transaction_hash, hashOf(rawNonce2));
  assert.equal(stdout.raw_transaction_persisted, false);
  assert.equal(stdout.transaction_submission, false);
  assert.equal(stored.inspected_file.raw_transaction_persisted, false);
  assert.equal(Object.hasOwn(stored, "raw_transaction"), false);
  assert.equal(fs.statSync(receipt).mode & 0o777, 0o600);
  assert.equal(stored.pending_legacy_signed_transaction_census_complete, false);
  fs.rmSync(tmp, { recursive: true, force: true });
}

const toolPath = path.resolve(
  "tools/void-economic-epoch2-explicit-raw-transaction-inspector-v1.mjs",
);

{
  const tmp = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-explicit-raw-inspector-symlink-proof-"),
  );
  const rawFile = path.join(tmp, "approved.txt");
  const linkFile = path.join(tmp, "swapped.txt");
  const receipt = path.join(tmp, "receipt.json");
  fs.writeFileSync(rawFile, rawNonce2 + "\n", { mode: 0o600 });
  fs.symlinkSync(rawFile, linkFile);

  const result = spawnSync(
    process.execPath,
    [
      toolPath,
      "--file",
      linkFile,
      "--out",
      receipt,
      "--apply",
      "--confirmation",
      VOID_ECONOMIC_EPOCH2_EXPLICIT_RAW_TRANSACTION_INSPECTOR_CONFIRMATION_V1,
    ],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 2);
  assert.match(result.stderr, /symlink_path_rejected/);
  assert.equal(fs.existsSync(receipt), false);
  fs.rmSync(tmp, { recursive: true, force: true });
}

{
  const tmp = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-explicit-raw-inspector-ancestor-proof-"),
  );
  const realDir = path.join(tmp, "real");
  const linkedDir = path.join(tmp, "linked");
  const receipt = path.join(tmp, "receipt.json");
  fs.mkdirSync(realDir);
  const rawFile = path.join(realDir, "approved.txt");
  fs.writeFileSync(rawFile, rawNonce2 + "\n", { mode: 0o600 });
  fs.symlinkSync(realDir, linkedDir);

  const result = spawnSync(
    process.execPath,
    [
      toolPath,
      "--file",
      path.join(linkedDir, "approved.txt"),
      "--out",
      receipt,
      "--apply",
      "--confirmation",
      VOID_ECONOMIC_EPOCH2_EXPLICIT_RAW_TRANSACTION_INSPECTOR_CONFIRMATION_V1,
    ],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 2);
  assert.match(
    result.stderr,
    /symlink_or_invalid_path_component_rejected/,
  );
  assert.equal(fs.existsSync(receipt), false);
  fs.rmSync(tmp, { recursive: true, force: true });
}

{
  const tmp = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-explicit-raw-inspector-fifo-proof-"),
  );
  const fifo = path.join(tmp, "approved.fifo");
  const receipt = path.join(tmp, "receipt.json");
  execFileSync("mkfifo", [fifo]);

  const started = Date.now();
  const result = spawnSync(
    process.execPath,
    [
      toolPath,
      "--file",
      fifo,
      "--out",
      receipt,
      "--apply",
      "--confirmation",
      VOID_ECONOMIC_EPOCH2_EXPLICIT_RAW_TRANSACTION_INSPECTOR_CONFIRMATION_V1,
    ],
    { encoding: "utf8", timeout: 3_000 },
  );
  assert.equal(result.status, 2);
  assert.equal(result.signal, null);
  assert.match(result.stderr, /explicit_file_not_direct_regular_file/);
  assert.ok(Date.now() - started < 3_000, "FIFO open must not block");
  assert.equal(fs.existsSync(receipt), false);
  fs.rmSync(tmp, { recursive: true, force: true });
}

{
  const tmp = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-explicit-raw-inspector-evidence-proof-"),
  );
  const evidenceDir = path.join(tmp, "ops", "mainnet0");
  fs.mkdirSync(evidenceDir, { recursive: true });
  const rawFile = path.join(tmp, "approved.txt");
  const receipt = path.join(tmp, "receipt.json");
  fs.writeFileSync(rawFile, rawNonce2 + "\n", { mode: 0o600 });

  fs.writeFileSync(
    path.join(
      evidenceDir,
      "economic-epoch2-known-signed-transaction-lineages-v1.json",
    ),
    JSON.stringify({
      marker: "VOID_ECONOMIC_EPOCH2_KNOWN_SIGNED_TRANSACTION_LINEAGES_V1",
      version: 1,
      status: "KNOWN_REPOSITORY_EVIDENCE_LINEAGES_BOUND_GLOBAL_CENSUS_HOLD",
      lineages: [],
      interpretation: {
        pending_legacy_signed_transaction_census_complete: false,
      },
    }) + "\n",
  );
  fs.writeFileSync(
    path.join(
      evidenceDir,
      "economic-epoch2-account-nonce-continuity-candidate-v1.json",
    ),
    JSON.stringify({
      marker: "VOID_ECONOMIC_EPOCH2_ACCOUNT_NONCE_CONTINUITY_CANDIDATE_V1",
      version: 1,
      status: "CANDIDATE_NONCE_CONTINUITY_READY_BESU_READBACK_PENDING",
      accounts: [],
    }) + "\n",
  );

  const result = spawnSync(
    process.execPath,
    [
      toolPath,
      "--file",
      rawFile,
      "--out",
      receipt,
      "--apply",
      "--confirmation",
      VOID_ECONOMIC_EPOCH2_EXPLICIT_RAW_TRANSACTION_INSPECTOR_CONFIRMATION_V1,
    ],
    { cwd: tmp, encoding: "utf8" },
  );
  assert.equal(result.status, 2);
  assert.match(
    result.stderr,
    /canonical_repository_evidence_identity_mismatch/,
  );
  assert.equal(fs.existsSync(receipt), false);
  fs.rmSync(tmp, { recursive: true, force: true });
}

const source = fs.readFileSync(
  "tools/void-economic-epoch2-explicit-raw-transaction-inspector-v1.mjs",
  "utf8",
);
assert.doesNotMatch(source, /eth_sendRawTransaction|eth_sendTransaction/);
assert.doesNotMatch(source, /broadcastTransaction\s*\(/);
assert.doesNotMatch(
  source,
  /mnemonic|PRIVATE_KEY\s*=|process\.env\.[A-Z0-9_]*PRIVATE_KEY|new\s+Wallet\s*\(/i,
);
assert.match(source, /explicit_operator_file_only: true/);
assert.match(source, /raw_signed_transaction_content_read: true/);
assert.match(source, /raw_transaction_persisted: false/);
assert.match(source, /pending_legacy_signed_transaction_census_complete: false/);
assert.match(source, /fs\.constants\.O_NOFOLLOW/);
assert.match(source, /fs\.constants\.O_DIRECTORY/);
assert.match(source, /fs\.constants\.O_NONBLOCK/);
assert.match(source, /\/proc\/self\/fd\//);
assert.match(source, /openNoSymlinkPathBoundToAncestors/);
assert.doesNotMatch(
  source,
  /assertNoSymlinkAncestors\(path\.dirname\(filePath\)\)/,
);
assert.match(source, /fs\.fstatSync\(fd\)/);
assert.match(source, /fs\.readSync\(\s*fd,/);
assert.doesNotMatch(source, /fs\.readFileSync\(filePath/);
assert.match(
  source,
  /f96d7d4d5857a33bc292dce677678db026aabf2f/,
);
assert.match(
  source,
  /83191d30131a2c99ef0cf51e43d2954fc34ffd06/,
);
assert.match(source, /canonical_repository_evidence_identity_mismatch/);

console.log("VOID_ECONOMIC_EPOCH2_EXPLICIT_RAW_TRANSACTION_INSPECTOR_V1_GREEN");
console.log("explicit_operator_file_only=true");
console.log("chain_id_required=2050");
console.log("signer_recovery=true");
console.log("nonce_recovery=true");
console.log("known_lineage_binding=true");
console.log("canonical_repository_evidence_identity_bound=true");
console.log("explicit_file_single_descriptor_read=true");
console.log("explicit_file_nofollow_open=true");
console.log("explicit_file_ancestor_descriptor_walk=true");
console.log("explicit_file_symlink_ancestor_rejected=true");
console.log("explicit_file_special_file_open_nonblocking=true");
console.log("explicit_file_fifo_rejected_without_blocking=true");
console.log("frozen_nonce_comparison=true");
console.log("unknown_hash_below_frozen_nonce_stale=true");
console.log("nonce_at_or_above_freeze_replay_relevant=true");
console.log("absent_nonzero_nonce_census_signer_replay_relevant=true");
console.log("raw_transaction_persisted=false");
console.log("transaction_submission=false");
console.log("pending_legacy_signed_transaction_census_complete=false");
