#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

function makeCentralDirectoryOnlyZip(entryName) {
  const name = Buffer.from(entryName, "utf8");
  const central = Buffer.alloc(46 + name.length);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0, 8);
  central.writeUInt16LE(0, 10);
  central.writeUInt32LE(0, 16);
  central.writeUInt32LE(0, 20);
  central.writeUInt32LE(0, 24);
  central.writeUInt16LE(name.length, 28);
  central.writeUInt16LE(0, 30);
  central.writeUInt16LE(0, 32);
  central.writeUInt16LE(0, 34);
  central.writeUInt16LE(0, 36);
  central.writeUInt32LE(0, 38);
  central.writeUInt32LE(0, 42);
  name.copy(central, 46);

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(central.length, 12);
  eocd.writeUInt32LE(0, 16);
  eocd.writeUInt16LE(0, 20);
  return Buffer.concat([central, eocd]);
}

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "void-epoch2-container-review-"));
const jsonPath = path.join(temp, "void-candidate.json");
const zipPath = path.join(temp, "void-candidate.zip");

const SECRET = "DO_NOT_PRINT_PRIVATE_KEY_SENTINEL";
const RAW = "0xDO_NOT_PRINT_RAW_TRANSACTION_SENTINEL";

fs.writeFileSync(jsonPath, JSON.stringify({
  marker: "fixture",
  raw_signed_transaction: RAW,
  nested: {
    private_key: SECRET,
    benign: "visible-length-only",
  },
}) + "\n", { mode: 0o600 });
fs.chmodSync(jsonPath, 0o600);
fs.writeFileSync(
  zipPath,
  makeCentralDirectoryOnlyZip("signed-transaction-candidate.txt"),
  { mode: 0o600 },
);
fs.chmodSync(zipPath, 0o600);

try {
  const jsonRun = spawnSync(
    process.execPath,
    [
      "tools/void-economic-epoch2-candidate-container-structure-inspector-v1.mjs",
      "--file",
      jsonPath,
      "--apply",
      "--confirmation",
      "inspectApprovedVoidCandidateContainerStructure",
    ],
    { encoding: "utf8" },
  );
  assert.equal(jsonRun.status, 0, jsonRun.stderr);
  assert.match(jsonRun.stdout, /container_kind":"json"/);
  assert.match(jsonRun.stdout, /raw_signed_transaction/);
  assert.match(jsonRun.stdout, /private_key/);
  assert.match(jsonRun.stdout, /candidate_values_printed=false/);
  assert.equal(jsonRun.stdout.includes(SECRET), false);
  assert.equal(jsonRun.stdout.includes(RAW), false);

  const zipRun = spawnSync(
    process.execPath,
    [
      "tools/void-economic-epoch2-candidate-container-structure-inspector-v1.mjs",
      "--file",
      zipPath,
      "--apply",
      "--confirmation",
      "inspectApprovedVoidCandidateContainerStructure",
    ],
    { encoding: "utf8" },
  );
  assert.equal(zipRun.status, 0, zipRun.stderr);
  assert.match(zipRun.stdout, /container_kind":"zip"/);
  assert.match(zipRun.stdout, /signed-transaction-candidate\.txt/);
  assert.match(zipRun.stdout, /archive_entry_content_extracted=false/);
  assert.match(zipRun.stdout, /transaction_broadcast=false/);
  assert.match(zipRun.stdout, /cross_epoch_replay_protection_proven=false/);

  const source = fs.readFileSync(
    "tools/void-economic-epoch2-candidate-container-structure-inspector-v1.mjs",
    "utf8",
  );
  assert.doesNotMatch(source, /eth_sendRawTransaction|eth_sendTransaction|cast send/);
  assert.doesNotMatch(source, /writeFileSync\(|appendFileSync\(|createWriteStream\(/);
  assert.match(source, /candidate_values_printed: false/);
  assert.match(source, /archive_entry_content_extracted: false/);
  assert.match(source, /MAX_FILE_BYTES = 2 \* 1024 \* 1024/);
  assert.match(source, /MAX_ZIP_ENTRIES = 512/);

  console.log(
    "VOID_ECONOMIC_EPOCH2_CANDIDATE_CONTAINER_STRUCTURE_INSPECTOR_V1_PROOF_GREEN",
  );
  console.log("candidate_values_printed=false");
  console.log("archive_entry_content_extracted=false");
  console.log("transaction_broadcast=false");
  console.log("cross_epoch_replay_protection_proven=false");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
