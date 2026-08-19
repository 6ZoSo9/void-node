#!/usr/bin/env node

import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const REVIEWER = path.resolve(
  "tools/public-node-operator-self-check-receipt-review-v1.mjs",
);
const MARKER =
  "VOID_PUBLIC_NODE_OPERATOR_RECEIPT_GENERATION_AUTHORITY_V1_PROOF_GREEN";
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

function holdReceipt(nodeId = "fixture-node-generation-A") {
  return {
    marker: "VOID_PUBLIC_NODE_OPERATOR_SELF_CHECK_V1",
    network: "Mainnet-0",
    read_only: true,
    observed_at: "2026-08-19T15:30:00.000Z",
    target: {
      scheme: "http",
      host_class: "loopback",
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
      node_id: nodeId,
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

function encodedReceipt(nodeId) {
  return `${JSON.stringify(holdReceipt(nodeId), null, 2)}\n`;
}

function writeReceipt(file, nodeId = "fixture-node-generation-A") {
  fs.writeFileSync(file, encodedReceipt(nodeId), { mode: 0o600 });
  fs.chmodSync(file, 0o600);
}

function runReviewer(receipt, env = {}) {
  return spawnSync(
    process.execPath,
    [
      REVIEWER,
      "--receipt",
      receipt,
      "--reviewed-at",
      "2026-08-19T15:31:00Z",
    ],
    {
      encoding: "utf8",
      env: { ...process.env, ...env },
    },
  );
}

function assertReceiptLoadRejected(result, label) {
  assert.equal(result.status, 3, `${label}: ${result.stderr || result.stdout}`);
  const review = JSON.parse(result.stdout);
  assert.equal(review.accepted, false, `${label}: must not accept mutated receipt`);
  assert.deepEqual(
    review.summary.failed_check_ids,
    ["receipt_load"],
    `${label}: must fail at generation-bound receipt loading`,
  );
}

function writeMutationPreload(temp) {
  const preload = path.join(temp, "receipt-generation-preload.mjs");
  fs.writeFileSync(
    preload,
    `import fs from "node:fs";\n` +
      `const originalReadSync = fs.readSync.bind(fs);\n` +
      `let injected = false;\n` +
      `fs.readSync = function(fd, buffer, offset, length, position) {\n` +
      `  const result = originalReadSync(fd, buffer, offset, length, position);\n` +
      `  if (!injected && result > 0 && process.env.VOID_RECEIPT_MUTATION_MODE) {\n` +
      `    injected = true;\n` +
      `    const target = process.env.VOID_RECEIPT_MUTATION_PATH;\n` +
      `    const replacement = Buffer.from(process.env.VOID_RECEIPT_MUTATION_BYTES_B64, "base64");\n` +
      `    if (process.env.VOID_RECEIPT_MUTATION_MODE === "same_inode") {\n` +
      `      const writeFd = fs.openSync(target, "r+");\n` +
      `      try {\n` +
      `        fs.writeSync(writeFd, replacement, 0, replacement.length, 0);\n` +
      `        fs.ftruncateSync(writeFd, replacement.length);\n` +
      `        fs.fsyncSync(writeFd);\n` +
      `      } finally { fs.closeSync(writeFd); }\n` +
      `    } else if (process.env.VOID_RECEIPT_MUTATION_MODE === "replace_path") {\n` +
      `      fs.renameSync(target, target + ".old");\n` +
      `      fs.writeFileSync(target, replacement, { mode: 0o600 });\n` +
      `      fs.chmodSync(target, 0o600);\n` +
      `    }\n` +
      `  }\n` +
      `  return result;\n` +
      `};\n`,
    { mode: 0o600 },
  );
  return preload;
}

const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-public-receipt-generation-proof-"),
);

try {
  const baseline = path.join(temp, "baseline.json");
  writeReceipt(baseline);
  let result = runReviewer(baseline);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(JSON.parse(result.stdout).accepted, true);

  const permissive = path.join(temp, "permissive.json");
  writeReceipt(permissive);
  fs.chmodSync(permissive, 0o640);
  assertReceiptLoadRejected(runReviewer(permissive), "non-private mode");

  const hardlinked = path.join(temp, "hardlinked.json");
  const hardlinkAlias = path.join(temp, "hardlinked-alias.json");
  writeReceipt(hardlinked);
  fs.linkSync(hardlinked, hardlinkAlias);
  assertReceiptLoadRejected(runReviewer(hardlinked), "multiple hard links");

  const preload = writeMutationPreload(temp);
  const replacement = encodedReceipt("fixture-node-generation-B");
  assert.equal(
    Buffer.byteLength(replacement),
    Buffer.byteLength(encodedReceipt("fixture-node-generation-A")),
    "adversarial replacement must preserve byte length",
  );
  const commonEnv = {
    NODE_OPTIONS: [process.env.NODE_OPTIONS, `--import=${preload}`]
      .filter(Boolean)
      .join(" "),
    VOID_RECEIPT_MUTATION_BYTES_B64: Buffer.from(replacement).toString("base64"),
  };

  const sameInode = path.join(temp, "same-inode.json");
  writeReceipt(sameInode);
  result = runReviewer(sameInode, {
    ...commonEnv,
    VOID_RECEIPT_MUTATION_MODE: "same_inode",
    VOID_RECEIPT_MUTATION_PATH: sameInode,
  });
  assertReceiptLoadRejected(result, "same-inode same-size rewrite");

  const replaced = path.join(temp, "replacement.json");
  writeReceipt(replaced);
  result = runReviewer(replaced, {
    ...commonEnv,
    VOID_RECEIPT_MUTATION_MODE: "replace_path",
    VOID_RECEIPT_MUTATION_PATH: replaced,
  });
  assertReceiptLoadRejected(result, "same-path replacement generation");

  console.log("receipt_owner_private_mode_required=true");
  console.log("receipt_single_link_required=true");
  console.log("same_inode_same_size_rewrite_rejected=true");
  console.log("same_path_replacement_generation_rejected=true");
  console.log(MARKER);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
