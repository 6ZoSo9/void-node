#!/usr/bin/env node

import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const SELF_CHECK_TOOL = path.resolve("tools/public-node-operator-self-check-v1.mjs");
const EVIDENCE_PACK_TOOL = path.resolve("tools/public-node-operator-evidence-pack-v1.mjs");
const OBSERVED_AT = "2026-08-18T23:00:00Z";
const REVIEWED_AT = "2026-08-18T23:00:01Z";
const BASE = "http://127.0.0.1:1";
const MARKER = "VOID_PUBLIC_NODE_OPERATOR_CLI_NUMERIC_CONTROLS_V1_PROOF_GREEN";

function run(tool, args) {
  return spawnSync(process.execPath, [tool, ...args], {
    cwd: path.resolve("."),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function assertInvocationRejected(result, label) {
  assert.equal(result.error, undefined, `${label}: process failed to start`);
  assert.equal(result.status, 1, `${label}: expected invocation error, got ${String(result.status)}\n${result.stderr}\n${result.stdout}`);
  assert.match(result.stderr, /canonical base-10 integer/, `${label}: strict token error missing`);
}

function assertSelfCheckControlRejected(temp, flag, token, index) {
  const output = path.join(temp, `self-${flag.slice(2)}-${index}.json`);
  const args = [
    "--base",
    BASE,
    "--timeout-ms",
    flag === "--timeout-ms" ? token : "250",
    "--expected-peer-count",
    flag === "--expected-peer-count" ? token : "0",
    "--observed-at",
    OBSERVED_AT,
    "--output",
    output,
  ];
  const result = run(SELF_CHECK_TOOL, args);
  assertInvocationRejected(result, `self-check ${flag} ${JSON.stringify(token)}`);
  assert.equal(fs.existsSync(output), false, `${flag} invalid token must not publish receipt`);
}

function assertPackPeerControlRejected(temp, token, index) {
  const outputDir = path.join(temp, `pack-invalid-${index}`);
  const result = run(EVIDENCE_PACK_TOOL, [
    "--output-dir",
    outputDir,
    "--base",
    BASE,
    "--expected-peer-count",
    token,
    "--allow-hold",
    "--observed-at",
    OBSERVED_AT,
    "--reviewed-at",
    REVIEWED_AT,
  ]);
  assertInvocationRejected(result, `evidence-pack --expected-peer-count ${JSON.stringify(token)}`);
  assert.equal(fs.existsSync(outputDir), false, "invalid wrapper token must not create output directory");
}

function assertSelfCheckBoundaryAccepted(flag, token) {
  const args = [
    "--base",
    BASE,
    "--timeout-ms",
    flag === "--timeout-ms" ? token : "250",
    "--expected-peer-count",
    flag === "--expected-peer-count" ? token : "0",
    "--observed-at",
    OBSERVED_AT,
  ];
  const result = run(SELF_CHECK_TOOL, args);
  assert.equal(result.error, undefined);
  assert.notEqual(result.status, 1, `${flag} boundary ${token} must pass CLI validation: ${result.stderr}`);
  const receipt = JSON.parse(result.stdout);
  assert.equal(receipt.marker, "VOID_PUBLIC_NODE_OPERATOR_SELF_CHECK_V1");
  assert.equal(receipt.summary.status, "hold");
}

const invalidTimeoutTokens = [
  "",
  " ",
  "+250",
  "-0",
  "0250",
  "250.0",
  "2.5e2",
  "0x100",
  "0b11111010",
  "0o372",
  "9007199254740992",
  "249",
  "120001",
];

const invalidPeerTokens = [
  "",
  " ",
  "+0",
  "-0",
  "00",
  "01",
  "1.0",
  "1e0",
  "0x1",
  "0b1",
  "0o1",
  "9007199254740992",
  "10001",
];

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "void-public-node-cli-numeric-controls-"));
try {
  invalidTimeoutTokens.forEach((token, index) => {
    assertSelfCheckControlRejected(temp, "--timeout-ms", token, index);
  });
  invalidPeerTokens.forEach((token, index) => {
    assertSelfCheckControlRejected(temp, "--expected-peer-count", token, index);
    assertPackPeerControlRejected(temp, token, index);
  });

  assertSelfCheckBoundaryAccepted("--timeout-ms", "250");
  assertSelfCheckBoundaryAccepted("--timeout-ms", "120000");
  assertSelfCheckBoundaryAccepted("--expected-peer-count", "0");
  assertSelfCheckBoundaryAccepted("--expected-peer-count", "10000");

  console.log("strict_self_check_timeout_tokens=true");
  console.log("strict_self_check_peer_tokens=true");
  console.log("strict_evidence_pack_peer_tokens=true");
  console.log("invalid_controls_publish_no_receipt_or_pack=true");
  console.log(MARKER);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
