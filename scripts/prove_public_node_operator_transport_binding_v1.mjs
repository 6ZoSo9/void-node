#!/usr/bin/env node

import { strict as assert } from "node:assert";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const SELF_CHECK = path.resolve("tools/public-node-operator-self-check-v1.mjs");
const REVIEWER = path.resolve("tools/public-node-operator-self-check-receipt-review-v1.mjs");
const MARKER = "VOID_PUBLIC_NODE_OPERATOR_TRANSPORT_BINDING_V1_PROOF_GREEN";
const CHECK_IDS = [
  "health",
  "readiness",
  "chain_head",
  "peer_visibility",
  "well_known_discovery",
  "route_index",
  "route_manifest",
  "self_check_snapshot",
  "public_discovery_alignment",
];

function runNode(tool, args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [tool, ...args], {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, ...env },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.once("error", reject);
    child.once("close", (status) => resolve({ status, stdout, stderr }));
  });
}

function writeFetchCounterPreload(temp) {
  const preload = path.join(temp, "fetch-counter-preload.mjs");
  fs.writeFileSync(
    preload,
    `import fs from "node:fs";\n` +
      `let count = 0;\n` +
      `globalThis.fetch = async () => {\n` +
      `  count += 1;\n` +
      `  return new Response("{}\\n", { status: 503, headers: { "content-type": "application/json" } });\n` +
      `};\n` +
      `process.on("exit", () => {\n` +
      `  fs.writeFileSync(process.env.VOID_SELF_CHECK_FETCH_COUNT_FILE, String(count), { encoding: "utf8" });\n` +
      `});\n`,
    { mode: 0o600 },
  );
  return preload;
}

async function proveSelfCheckAdmission(base, expectedStatus, expectedFetches, label) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "void-public-self-check-transport-"));
  try {
    const countFile = path.join(temp, "fetch-count.txt");
    const preload = writeFetchCounterPreload(temp);
    const nodeOptions = [process.env.NODE_OPTIONS, `--import=${preload}`].filter(Boolean).join(" ");
    const result = await runNode(
      SELF_CHECK,
      [
        "--base",
        base,
        "--timeout-ms",
        "250",
        "--expected-peer-count",
        "0",
        "--observed-at",
        "2026-08-19T12:00:00Z",
      ],
      {
        NODE_OPTIONS: nodeOptions,
        VOID_SELF_CHECK_FETCH_COUNT_FILE: countFile,
      },
    );
    assert.equal(result.status, expectedStatus, `${label}: ${result.stderr || result.stdout}`);
    assert(fs.existsSync(countFile), `${label}: fetch counter missing`);
    const fetchCount = Number(fs.readFileSync(countFile, "utf8"));
    if (expectedFetches === 0) assert.equal(fetchCount, 0, `${label}: request must fail before fetch`);
    else assert(fetchCount > 0, `${label}: admitted target must reach fetch boundary`);
    return result;
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

function holdReceipt(target) {
  return {
    marker: "VOID_PUBLIC_NODE_OPERATOR_SELF_CHECK_V1",
    network: "Mainnet-0",
    read_only: true,
    observed_at: "2026-08-19T12:00:00.000Z",
    target: {
      scheme: target.scheme,
      host_class: target.hostClass,
      port: 4100,
      raw_target_included: false,
    },
    summary: {
      status: "hold",
      checks_total: CHECK_IDS.length,
      checks_green: 0,
      checks_failed: CHECK_IDS.length,
      failed_check_ids: [...CHECK_IDS],
    },
    runtime: {
      node_id: "fixture-node-transport-binding-v1",
      http_port: 4100,
      p2p_port: 4700,
      chain_head: 0,
      peer_count: 0,
      expected_peer_count: 1,
      ready: false,
      gap: 1,
      txroot_live: 0,
    },
    checks: CHECK_IDS.map((id) => ({
      id,
      path: `/fixture/${id}`,
      ok: false,
      reason: "fixture_hold",
      observed: {},
    })),
    safety: {
      methods_used: ["GET"],
      redirects_followed: false,
      credentials_sent: false,
      mutation_attempted: false,
      registration_attempted: false,
      validator_activation_attempted: false,
      staking_attempted: false,
      wallet_connection_attempted: false,
      ledger_write_attempted: false,
      peer_state_write_attempted: false,
      validator_set_write_attempted: false,
      ticket_claim_attempted: false,
      buy_void_fulfillment_attempted: false,
    },
  };
}

async function proveReviewerTarget(target, expectedStatus, label) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "void-public-self-check-review-transport-"));
  try {
    const receiptPath = path.join(temp, "receipt.json");
    fs.writeFileSync(receiptPath, `${JSON.stringify(holdReceipt(target), null, 2)}\n`, { mode: 0o600 });
    const result = await runNode(REVIEWER, [
      "--receipt",
      receiptPath,
      "--reviewed-at",
      "2026-08-19T12:01:00Z",
    ]);
    assert.equal(result.status, expectedStatus, `${label}: ${result.stderr || result.stdout}`);
    const review = JSON.parse(result.stdout);
    if (expectedStatus === 0) {
      assert.equal(review.accepted, true, `${label}: allowed target should be structurally accepted`);
    } else {
      assert.equal(review.accepted, false, `${label}: forbidden transport must be rejected`);
      assert(
        review.summary.failed_check_ids.includes("target_redaction"),
        `${label}: target transport gate must fail`,
      );
    }
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

for (const base of [
  "http://node.lan:4100",
  "http://node.local:4100",
  "http://node.internal:4100",
  "http://node.ts.net:4100",
  "http://example.invalid:4100",
  "http://8.8.8.8:4100",
  "http://[2001:4860:4860::8888]:4100",
]) {
  await proveSelfCheckAdmission(base, 1, 0, `forbid cleartext DNS/public target ${base}`);
}

for (const base of [
  "http://localhost:4100",
  "http://127.0.0.1:4100",
  "http://100.64.0.1:4100",
  "http://[fd00::1]:4100",
  "https://node.lan:4100",
  "https://example.invalid:4100",
]) {
  await proveSelfCheckAdmission(base, 2, 1, `admit reviewed transport ${base}`);
}

for (const target of [
  { scheme: "http", hostClass: "loopback" },
  { scheme: "http", hostClass: "private_or_overlay_ipv4" },
  { scheme: "http", hostClass: "private_or_linklocal_ipv6" },
  { scheme: "https", hostClass: "private_dns" },
  { scheme: "https", hostClass: "overlay_dns" },
  { scheme: "https", hostClass: "public_dns" },
]) {
  await proveReviewerTarget(target, 0, `reviewer admits ${target.scheme}/${target.hostClass}`);
}

for (const target of [
  { scheme: "http", hostClass: "private_dns" },
  { scheme: "http", hostClass: "overlay_dns" },
  { scheme: "http", hostClass: "public_dns" },
  { scheme: "http", hostClass: "public_ipv4" },
  { scheme: "http", hostClass: "public_ipv6" },
  { scheme: "https", hostClass: "unknown_host_class" },
]) {
  await proveReviewerTarget(target, 3, `reviewer rejects ${target.scheme}/${target.hostClass}`);
}

console.log("dns_cleartext_prefetch_rejected=true");
console.log("literal_private_http_preserved=true");
console.log("offline_receipt_transport_parity=true");
console.log(MARKER);
