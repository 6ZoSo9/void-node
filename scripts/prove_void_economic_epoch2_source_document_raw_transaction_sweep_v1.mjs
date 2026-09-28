#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { Wallet } from "ethers";

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "void-epoch2-source-sweep-"));
const stamp = "20260928T162432Z";
const sourceA = path.join(temp, "void-signed-transaction-example.ts");
const sourceB = path.join(temp, "void-raw-tx-notes.md");
const secretSentinel = "DO_NOT_PRINT_SECRET_SENTINEL";

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

fs.writeFileSync(
  sourceA,
  `export const fixture = "${raw}";\nexport const secret = "${secretSentinel}";\n`,
  { mode: 0o600 },
);
fs.chmodSync(sourceA, 0o600);
fs.writeFileSync(
  sourceB,
  "# Bytecode-like non-transaction\n0x" + "60".repeat(120) + "\n",
  { mode: 0o600 },
);
fs.chmodSync(sourceB, 0o600);

const receipt = path.join(
  temp,
  `void_epoch2_signed_artifact_metadata_census_precision_v1_${stamp}_root_batch_01.json`,
);
fs.writeFileSync(
  receipt,
  JSON.stringify({
    marker: "VOID_ECONOMIC_EPOCH2_SIGNED_ARTIFACT_METADATA_CENSUS_V1",
    version: 1,
    status: "METADATA_CENSUS_READY_OPERATOR_REVIEW_REQUIRED",
    scanned_file_content_read: false,
    files: [
      {
        source_kind: "explicit_void_owned_root",
        absolute_path: sourceA,
        basename: path.basename(sourceA),
        size_bytes: fs.statSync(sourceA).size,
        mode_octal: "600",
        candidate_name_hint: true,
        content_read: false,
      },
      {
        source_kind: "explicit_void_owned_root",
        absolute_path: sourceB,
        basename: path.basename(sourceB),
        size_bytes: fs.statSync(sourceB).size,
        mode_octal: "600",
        candidate_name_hint: true,
        content_read: false,
      },
    ],
    symlink_descendants: [],
  }) + "\n",
  { mode: 0o600 },
);
fs.chmodSync(receipt, 0o600);

try {
  const run = spawnSync(
    process.execPath,
    [
      "tools/void-economic-epoch2-source-document-raw-transaction-sweep-v1.mjs",
      "--receipt-dir",
      temp,
      "--stamp",
      stamp,
      "--apply",
      "--confirmation",
      "scanApprovedVoidSourceDocumentCandidates",
    ],
    { encoding: "utf8" },
  );

  assert.equal(run.status, 0, run.stderr);
  assert.match(
    run.stdout,
    /VOID_ECONOMIC_EPOCH2_SOURCE_DOCUMENT_RAW_TRANSACTION_SWEEP_V1_GREEN/,
  );
  assert.match(run.stdout, /source_document_candidate_count=2/);
  assert.match(run.stdout, /signed_chain2050_transaction_count=1/);
  assert.match(run.stdout, /requires_operator_followup_count=1/);
  assert.match(run.stdout, /source_document_content_sweep_complete=true/);
  assert.match(run.stdout, /raw_transaction_printed=false/);
  assert.match(run.stdout, /raw_transaction_persisted=false/);
  assert.match(run.stdout, /transaction_broadcast=false/);
  assert.match(run.stdout, /pending_legacy_signed_transaction_census_complete=false/);
  assert.match(run.stdout, /cross_epoch_replay_protection_proven=false/);
  assert.equal(run.stdout.includes(raw), false);
  assert.equal(run.stdout.includes(secretSentinel), false);

  const source = fs.readFileSync(
    "tools/void-economic-epoch2-source-document-raw-transaction-sweep-v1.mjs",
    "utf8",
  );
  assert.match(source, /source_document_content_sweep_complete=true/);
  assert.match(source, /candidate_size_changed_since_census/);
  assert.match(source, /candidate_not_valid_utf8_text/);
  assert.match(source, /MIN_HEX_DIGITS = 160/);
  assert.match(source, /REGISTRY_GIT_BLOB_SHA1/);
  assert.match(source, /NONCE_GIT_BLOB_SHA1/);
  assert.doesNotMatch(source, /eth_sendRawTransaction|eth_sendTransaction|cast send/);
  assert.doesNotMatch(source, /writeFileSync\(|appendFileSync\(|createWriteStream\(/);

  console.log(
    "VOID_ECONOMIC_EPOCH2_SOURCE_DOCUMENT_RAW_TRANSACTION_SWEEP_V1_PROOF_GREEN",
  );
  console.log("raw_transaction_printed=false");
  console.log("raw_transaction_persisted=false");
  console.log("transaction_broadcast=false");
  console.log("pending_legacy_signed_transaction_census_complete=false");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
