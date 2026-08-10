#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_PRIVATE_CHAIN2050_CHECKPOINT_MARKER_V1,
  VOID_PRIVATE_CHAIN2050_CHECKPOINT_RPC_METHODS_V1,
  VoidPrivateChain2050CheckpointHoldV1,
  captureVoidPrivateChain2050CheckpointV1,
  validateVoidPrivateChain2050RpcUrlV1,
} from "../tools/void-private-chain2050-checkpoint-v1.mjs";

const HEAD = 37371;
const HASH_A = `0x${"a1".repeat(32)}`;
const HASH_B = `0x${"b2".repeat(32)}`;
const DUMP = `0x${"c3".repeat(128)}`;
const FIXED_TIME = "2026-08-10T07:00:00.000Z";

function hex(value) {
  return `0x${value.toString(16)}`;
}

function fixture({
  chainId = 2050,
  beforeNumber = HEAD,
  afterNumber = beforeNumber,
  beforeHash = HASH_A,
  afterHash = beforeHash,
  accounts = [],
  dumpState = DUMP,
} = {}) {
  const methods = [];
  let blockNumberCalls = 0;
  let blockCalls = 0;
  const rpcCall = async (method, params) => {
    methods.push(method);
    if (method === "eth_chainId") return hex(chainId);
    if (method === "eth_blockNumber") {
      blockNumberCalls += 1;
      return hex(blockNumberCalls === 1 ? beforeNumber : afterNumber);
    }
    if (method === "eth_getBlockByNumber") {
      blockCalls += 1;
      const number = blockCalls === 1 ? beforeNumber : afterNumber;
      const hash = blockCalls === 1 ? beforeHash : afterHash;
      assert.deepEqual(params, [hex(number), false]);
      return { number: hex(number), hash };
    }
    if (method === "eth_accounts") return accounts;
    if (method === "anvil_dumpState") return dumpState;
    throw new Error(`unexpected_rpc_method:${method}`);
  };
  return { rpcCall, methods };
}

async function expectHold(options, expectedReason) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-chain2050-hold-"));
  try {
    await assert.rejects(
      () =>
        captureVoidPrivateChain2050CheckpointV1({
          ...options,
          outputRoot: root,
          capturedAt: FIXED_TIME,
        }),
      (error) => {
        assert(error instanceof VoidPrivateChain2050CheckpointHoldV1);
        assert.equal(error.reason, expectedReason);
        return true;
      },
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

assert.equal(
  VOID_PRIVATE_CHAIN2050_CHECKPOINT_MARKER_V1,
  "VOID_PRIVATE_CHAIN2050_CHECKPOINT_V1",
);
assert.deepEqual(VOID_PRIVATE_CHAIN2050_CHECKPOINT_RPC_METHODS_V1, [
  "eth_chainId",
  "eth_blockNumber",
  "eth_getBlockByNumber",
  "eth_accounts",
  "anvil_dumpState",
  "eth_blockNumber",
  "eth_getBlockByNumber",
]);

assert.equal(
  validateVoidPrivateChain2050RpcUrlV1("http://127.0.0.1:8545/").hostname,
  "127.0.0.1",
);
assert.throws(
  () => validateVoidPrivateChain2050RpcUrlV1("https://127.0.0.1:8545/"),
  /rpc_url_protocol_invalid/,
);
assert.throws(
  () => validateVoidPrivateChain2050RpcUrlV1("http://192.168.1.20:8545/"),
  /rpc_url_not_loopback/,
);
assert.throws(
  () => validateVoidPrivateChain2050RpcUrlV1("http://user:pass@127.0.0.1:8545/"),
  /rpc_url_credentials_forbidden/,
);

const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-chain2050-checkpoint-"));
try {
  const firstFixture = fixture();
  const first = await captureVoidPrivateChain2050CheckpointV1({
    rpcCall: firstFixture.rpcCall,
    outputRoot: root,
    minimumBlockNumber: HEAD,
    capturedAt: FIXED_TIME,
  });

  assert.equal(first.marker, VOID_PRIVATE_CHAIN2050_CHECKPOINT_MARKER_V1);
  assert.equal(first.chain_id, 2050);
  assert.equal(first.block_number, HEAD);
  assert.equal(first.block_hash, HASH_A);
  assert.equal(first.rpc_unlocked_account_count, 0);
  assert.equal(first.chain_mutation_performed, false);
  assert.equal(first.transaction_broadcast_performed, false);
  assert.equal(first.wallet_access_performed, false);
  assert.equal(first.credential_access_performed, false);
  assert.equal(first.money_movement_performed, false);
  assert.equal(first.state_write, "created");
  assert.equal(first.manifest_write, "created");
  assert.deepEqual(firstFixture.methods, VOID_PRIVATE_CHAIN2050_CHECKPOINT_RPC_METHODS_V1);
  assert.equal(
    firstFixture.methods.some((method) =>
      /send|sign|setBalance|setNonce|impersonate|mine/i.test(method),
    ),
    false,
  );

  const expectedStateSha = crypto.createHash("sha256").update(DUMP, "utf8").digest("hex");
  assert.equal(first.state_sha256, expectedStateSha);
  assert.equal(fs.readFileSync(first.state_path, "utf8"), DUMP);
  assert.equal(fs.statSync(first.state_path).mode & 0o777, 0o600);
  assert.equal(fs.statSync(first.manifest_path).mode & 0o777, 0o600);
  assert.equal(fs.statSync(root).mode & 0o777, 0o700);

  const persisted = JSON.parse(fs.readFileSync(first.manifest_path, "utf8"));
  assert.equal(persisted.checkpoint_id_sha256, first.checkpoint_id_sha256);
  assert.equal(persisted.state_sha256, expectedStateSha);
  assert.equal(persisted.captured_at, FIXED_TIME);
  assert.equal(persisted.state_file, path.basename(first.state_path));

  const secondFixture = fixture();
  const second = await captureVoidPrivateChain2050CheckpointV1({
    rpcCall: secondFixture.rpcCall,
    outputRoot: root,
    minimumBlockNumber: HEAD,
    capturedAt: "2026-08-10T08:00:00.000Z",
  });
  assert.equal(second.checkpoint_id_sha256, first.checkpoint_id_sha256);
  assert.equal(second.state_write, "existing_exact");
  assert.equal(second.manifest_write, "existing_exact_identity");
  assert.equal(second.captured_at, FIXED_TIME);
  assert.deepEqual(secondFixture.methods, VOID_PRIVATE_CHAIN2050_CHECKPOINT_RPC_METHODS_V1);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

await expectHold({ rpcCall: fixture({ chainId: 1 }).rpcCall }, "chain_id_mismatch");
await expectHold(
  { rpcCall: fixture({ beforeNumber: HEAD - 1, afterNumber: HEAD - 1 }).rpcCall, minimumBlockNumber: HEAD },
  "durable_head_below_required_minimum",
);
await expectHold(
  { rpcCall: fixture({ accounts: ["0x1111111111111111111111111111111111111111"] }).rpcCall },
  "rpc_unlocked_accounts_present",
);
await expectHold(
  { rpcCall: fixture({ afterNumber: HEAD + 1, afterHash: HASH_B }).rpcCall },
  "chain_changed_during_checkpoint_capture",
);
await expectHold(
  { rpcCall: fixture({ afterHash: HASH_B }).rpcCall },
  "chain_changed_during_checkpoint_capture",
);
await expectHold(
  { rpcCall: fixture({ dumpState: "not-a-dump" }).rpcCall },
  "anvil_dump_state_invalid",
);
await expectHold(
  { rpcCall: fixture({ dumpState: `0x${"ab".repeat(600)}` }).rpcCall, maxStateBytes: 1024 },
  "anvil_dump_state_too_large",
);

console.log("VOID_PRIVATE_CHAIN2050_CHECKPOINT_V1_PROOF_GREEN");
console.log("chain_id_exact=2050");
console.log(`minimum_block_number_proven=${HEAD}`);
console.log("stable_head_bracketing=1");
console.log("unlocked_accounts_required_zero=1");
console.log("anvil_dump_state_content_addressed=1");
console.log("checkpoint_files_mode_0600=1");
console.log("checkpoint_directory_mode_0700=1");
console.log("idempotent_exact_checkpoint=1");
console.log("chain_mutation=0");
console.log("transaction_broadcast=0");
console.log("wallet_access=0");
console.log("credential_access=0");
console.log("money_movement=0");
