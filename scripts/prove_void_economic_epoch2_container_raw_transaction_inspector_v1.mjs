#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { Wallet } from "ethers";

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "void-epoch2-container-raw-proof-"));
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
const secretSentinel = "DO_NOT_PRINT_SECRET_SENTINEL";

function runField(name, field) {
  const file = path.join(temp, name);
  fs.writeFileSync(
    file,
    JSON.stringify({
      marker: "fixture",
      [field]: raw,
      owner_private_key_path: secretSentinel,
    }) + "\n",
    { mode: 0o600 },
  );
  fs.chmodSync(file, 0o600);

  const run = spawnSync(
    process.execPath,
    [
      "tools/void-economic-epoch2-container-raw-transaction-inspector-v1.mjs",
      "--file",
      file,
      "--field",
      field,
      "--apply",
      "--confirmation",
      "inspectApprovedVoidContainerRawTransaction",
    ],
    { encoding: "utf8" },
  );

  assert.equal(run.status, 0, run.stderr);
  assert.match(
    run.stdout,
    /VOID_ECONOMIC_EPOCH2_CONTAINER_RAW_TRANSACTION_INSPECTOR_V1_GREEN/,
  );
  assert.match(run.stdout, new RegExp("field=" + field));
  assert.match(run.stdout, /chain_id=2050/);
  assert.match(run.stdout, /raw_transaction_printed=false/);
  assert.match(run.stdout, /raw_transaction_persisted=false/);
  assert.match(run.stdout, /transaction_submission=false/);
  assert.match(run.stdout, /transaction_broadcast=false/);
  assert.match(run.stdout, /pending_legacy_signed_transaction_census_complete=false/);
  assert.match(run.stdout, /cross_epoch_replay_protection_proven=false/);
  assert.equal(run.stdout.includes(raw), false);
  assert.equal(run.stdout.includes(secretSentinel), false);
}

try {
  runField("void-container-signed-transaction.json", "signed_transaction");
  runField("void-container-signed-serialized.json", "signed_serialized_hex");

  const rejected = path.join(temp, "void-container-rejected.json");
  fs.writeFileSync(
    rejected,
    JSON.stringify({ raw_transaction: raw }) + "\n",
    { mode: 0o600 },
  );
  fs.chmodSync(rejected, 0o600);
  const rejectedRun = spawnSync(
    process.execPath,
    [
      "tools/void-economic-epoch2-container-raw-transaction-inspector-v1.mjs",
      "--file",
      rejected,
      "--field",
      "raw_transaction",
      "--apply",
      "--confirmation",
      "inspectApprovedVoidContainerRawTransaction",
    ],
    { encoding: "utf8" },
  );
  assert.notEqual(rejectedRun.status, 0);
  assert.match(rejectedRun.stderr, /raw_transaction_field_not_allowlisted/);

  const source = fs.readFileSync(
    "tools/void-economic-epoch2-container-raw-transaction-inspector-v1.mjs",
    "utf8",
  );
  assert.doesNotMatch(source, /eth_sendRawTransaction|eth_sendTransaction|cast send/);
  assert.doesNotMatch(source, /writeFileSync\(|appendFileSync\(|createWriteStream\(/);
  assert.match(source, /raw_transaction_printed=false/);
  assert.match(source, /raw_transaction_persisted=false/);
  assert.match(source, /signed_transaction/);
  assert.match(source, /signed_serialized_hex/);
  assert.match(source, /REGISTRY_GIT_BLOB_SHA1/);
  assert.match(source, /NONCE_GIT_BLOB_SHA1/);

  console.log(
    "VOID_ECONOMIC_EPOCH2_CONTAINER_RAW_TRANSACTION_INSPECTOR_V1_PROOF_GREEN",
  );
  console.log("raw_transaction_printed=false");
  console.log("raw_transaction_persisted=false");
  console.log("transaction_broadcast=false");
  console.log("cross_epoch_replay_protection_proven=false");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
