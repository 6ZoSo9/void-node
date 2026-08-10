#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_PRIVATE_CHAIN2050_CHECKPOINT_DELIVERY_BINDING_RPC_METHODS_V1,
  VOID_PRIVATE_CHAIN2050_CHECKPOINT_MARKER_V1,
  VOID_PRIVATE_CHAIN2050_CHECKPOINT_RPC_METHODS_V1,
  VoidPrivateChain2050CheckpointHoldV1,
  captureVoidPrivateChain2050CheckpointV1,
  validateVoidPrivateChain2050RpcUrlV1,
} from "../tools/void-private-chain2050-checkpoint-v1.mjs";

const HEAD = 37371;
const DELIVERY_BLOCK = 37369;
const HASH_A = `0x${"a1".repeat(32)}`;
const HASH_B = `0x${"b2".repeat(32)}`;
const DELIVERY_HASH = `0x${"d4".repeat(32)}`;
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
  deliveryBlockNumber = DELIVERY_BLOCK,
  deliveryBeforeHash = DELIVERY_HASH,
  deliveryAfterHash = deliveryBeforeHash,
  accounts = [],
  dumpState = DUMP,
} = {}) {
  const methods = [];
  let blockNumberCalls = 0;
  let headBlockCalls = 0;
  let deliveryBlockCalls = 0;
  const rpcCall = async (method, params) => {
    methods.push(method);
    if (method === "eth_chainId") return hex(chainId);
    if (method === "eth_blockNumber") {
      blockNumberCalls += 1;
      return hex(blockNumberCalls === 1 ? beforeNumber : afterNumber);
    }
    if (method === "eth_getBlockByNumber") {
      const requested = Number.parseInt(String(params[0]).slice(2), 16);
      assert.equal(params[1], false);
      if (requested === deliveryBlockNumber && requested !== beforeNumber) {
        deliveryBlockCalls += 1;
        return {
          number: hex(deliveryBlockNumber),
          hash: deliveryBlockCalls === 1
            ? deliveryBeforeHash
            : deliveryAfterHash,
        };
      }
      headBlockCalls += 1;
      const number = headBlockCalls === 1 ? beforeNumber : afterNumber;
      const hash = headBlockCalls === 1 ? beforeHash : afterHash;
      assert.equal(requested, number);
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
          outputRoot: options.outputRoot || root,
          capturedAt: options.capturedAt || FIXED_TIME,
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
assert.deepEqual(
  VOID_PRIVATE_CHAIN2050_CHECKPOINT_DELIVERY_BINDING_RPC_METHODS_V1,
  [
    "eth_chainId",
    "eth_blockNumber",
    "eth_getBlockByNumber",
    "eth_getBlockByNumber",
    "eth_accounts",
    "anvil_dumpState",
    "eth_blockNumber",
    "eth_getBlockByNumber",
    "eth_getBlockByNumber",
  ],
);

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
  const originalOpenSync = fs.openSync;
  const originalFsyncSync = fs.fsyncSync;
  const originalCloseSync = fs.closeSync;
  const fdPaths = new Map();
  let rootDirectoryFsyncCount = 0;
  fs.openSync = function patchedOpenSync(pathname, ...args) {
    const fd = originalOpenSync.call(fs, pathname, ...args);
    if (typeof pathname === "string") fdPaths.set(fd, path.resolve(pathname));
    return fd;
  };
  fs.fsyncSync = function patchedFsyncSync(fd) {
    if (fdPaths.get(fd) === path.resolve(root)) rootDirectoryFsyncCount += 1;
    return originalFsyncSync.call(fs, fd);
  };
  fs.closeSync = function patchedCloseSync(fd) {
    try {
      return originalCloseSync.call(fs, fd);
    } finally {
      fdPaths.delete(fd);
    }
  };

  let first;
  const firstFixture = fixture();
  try {
    first = await captureVoidPrivateChain2050CheckpointV1({
      rpcCall: firstFixture.rpcCall,
      outputRoot: root,
      minimumBlockNumber: HEAD,
      capturedAt: FIXED_TIME,
    });
  } finally {
    fs.openSync = originalOpenSync;
    fs.fsyncSync = originalFsyncSync;
    fs.closeSync = originalCloseSync;
  }

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
  assert.equal(first.complete_write, "created");
  assert.equal(first.checkpoint_finalized, true);
  assert.equal(first.checkpoint_directory_fsync_performed, true);
  assert(rootDirectoryFsyncCount >= 2);
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
  assert.equal(fs.statSync(first.complete_path).mode & 0o777, 0o600);
  assert.equal(
    fs.readFileSync(first.complete_path, "utf8"),
    `VOID_PRIVATE_CHAIN2050_CHECKPOINT_COMPLETE_V1 ${first.checkpoint_id_sha256}\n`,
  );
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
  assert.equal(second.complete_write, "existing_exact");
  assert.equal(second.checkpoint_finalized, true);
  assert.equal(second.captured_at, FIXED_TIME);
  assert.deepEqual(secondFixture.methods, VOID_PRIVATE_CHAIN2050_CHECKPOINT_RPC_METHODS_V1);

  const originalManifestText = fs.readFileSync(first.manifest_path, "utf8");
  const tamperedManifest = JSON.parse(originalManifestText);
  tamperedManifest.money_movement_performed = true;
  fs.writeFileSync(first.manifest_path, `${JSON.stringify(tamperedManifest, null, 2)}\n`, {
    mode: 0o600,
  });
  await assert.rejects(
    () =>
      captureVoidPrivateChain2050CheckpointV1({
        rpcCall: fixture().rpcCall,
        outputRoot: root,
        minimumBlockNumber: HEAD,
        capturedAt: FIXED_TIME,
      }),
    (error) => {
      assert(error instanceof VoidPrivateChain2050CheckpointHoldV1);
      assert.equal(error.reason, "checkpoint_existing_manifest_mismatch");
      return true;
    },
  );
  fs.writeFileSync(first.manifest_path, originalManifestText, { mode: 0o600 });
  fs.chmodSync(first.manifest_path, 0o600);

  const manifestBackup = `${first.manifest_path}.backup`;
  fs.renameSync(first.manifest_path, manifestBackup);
  fs.symlinkSync(path.basename(manifestBackup), first.manifest_path);
  await assert.rejects(
    () =>
      captureVoidPrivateChain2050CheckpointV1({
        rpcCall: fixture().rpcCall,
        outputRoot: root,
        minimumBlockNumber: HEAD,
        capturedAt: FIXED_TIME,
      }),
    (error) => {
      assert(error instanceof VoidPrivateChain2050CheckpointHoldV1);
      assert.equal(error.reason, "checkpoint_existing_manifest_unsafe");
      return true;
    },
  );
  fs.unlinkSync(first.manifest_path);
  fs.renameSync(manifestBackup, first.manifest_path);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

const deliveryBoundRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-chain2050-delivery-bound-checkpoint-"),
);
try {
  const deliveryFixture = fixture();
  const deliveryBound = await captureVoidPrivateChain2050CheckpointV1({
    rpcCall: deliveryFixture.rpcCall,
    outputRoot: deliveryBoundRoot,
    minimumBlockNumber: DELIVERY_BLOCK,
    expectedDeliveryBlockNumber: DELIVERY_BLOCK,
    expectedDeliveryBlockHash: DELIVERY_HASH,
    capturedAt: FIXED_TIME,
  });
  assert.equal(deliveryBound.delivery_block_number, DELIVERY_BLOCK);
  assert.equal(deliveryBound.delivery_block_hash, DELIVERY_HASH);
  assert.equal(deliveryBound.delivery_block_hash_verified, true);
  assert.deepEqual(
    deliveryBound.rpc_methods_used,
    VOID_PRIVATE_CHAIN2050_CHECKPOINT_DELIVERY_BINDING_RPC_METHODS_V1,
  );
  assert.deepEqual(
    deliveryFixture.methods,
    VOID_PRIVATE_CHAIN2050_CHECKPOINT_DELIVERY_BINDING_RPC_METHODS_V1,
  );
  const manifest = JSON.parse(
    fs.readFileSync(deliveryBound.manifest_path, "utf8"),
  );
  assert.equal(manifest.delivery_block_number, DELIVERY_BLOCK);
  assert.equal(manifest.delivery_block_hash, DELIVERY_HASH);
  assert.equal(manifest.delivery_block_hash_verified, true);
} finally {
  fs.rmSync(deliveryBoundRoot, { recursive: true, force: true });
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
  {
    rpcCall: fixture({ deliveryBeforeHash: HASH_B }).rpcCall,
    expectedDeliveryBlockNumber: DELIVERY_BLOCK,
    expectedDeliveryBlockHash: DELIVERY_HASH,
  },
  "delivery_block_hash_mismatch_before_checkpoint",
);
await expectHold(
  {
    rpcCall: fixture({ deliveryAfterHash: HASH_B }).rpcCall,
    expectedDeliveryBlockNumber: DELIVERY_BLOCK,
    expectedDeliveryBlockHash: DELIVERY_HASH,
  },
  "delivery_block_hash_changed_during_checkpoint_capture",
);
await expectHold(
  {
    rpcCall: fixture().rpcCall,
    expectedDeliveryBlockNumber: DELIVERY_BLOCK,
  },
  "delivery_block_binding_incomplete",
);
await expectHold(
  { rpcCall: fixture({ dumpState: "not-a-dump" }).rpcCall },
  "anvil_dump_state_invalid",
);
await expectHold(
  { rpcCall: fixture({ dumpState: `0x${"ab".repeat(600)}` }).rpcCall, maxStateBytes: 1024 },
  "anvil_dump_state_too_large",
);
await expectHold(
  { rpcCall: fixture().rpcCall, capturedAt: "not-a-time" },
  "captured_at_invalid",
);

const symlinkParent = fs.mkdtempSync(path.join(os.tmpdir(), "void-chain2050-symlink-parent-"));
try {
  const realRoot = path.join(symlinkParent, "real");
  fs.mkdirSync(realRoot, { mode: 0o700 });
  const linkedRoot = path.join(symlinkParent, "linked");
  fs.symlinkSync(realRoot, linkedRoot);
  await assert.rejects(
    () =>
      captureVoidPrivateChain2050CheckpointV1({
        rpcCall: fixture().rpcCall,
        outputRoot: linkedRoot,
        minimumBlockNumber: HEAD,
        capturedAt: FIXED_TIME,
      }),
    (error) => {
      assert(error instanceof VoidPrivateChain2050CheckpointHoldV1);
      assert.equal(error.reason, "checkpoint_path_symlink_component");
      return true;
    },
  );
} finally {
  fs.rmSync(symlinkParent, { recursive: true, force: true });
}

console.log("VOID_PRIVATE_CHAIN2050_CHECKPOINT_V1_PROOF_GREEN");
console.log("chain_id_exact=2050");
console.log(`minimum_block_number_proven=${HEAD}`);
console.log("stable_head_bracketing=1");
console.log("confirmed_delivery_block_hash_bracketing=1");
console.log("reset_or_reorg_delivery_hash_mismatch_rejected=1");
console.log("unlocked_accounts_required_zero=1");
console.log("anvil_dump_state_content_addressed=1");
console.log("checkpoint_files_mode_0600=1");
console.log("checkpoint_directory_mode_0700=1");
console.log("checkpoint_directory_two_phase_fsync=1");
console.log("checkpoint_finalization_marker=1");
console.log("idempotent_exact_checkpoint=1");
console.log("existing_manifest_fully_rebound=1");
console.log("symlink_path_components_rejected=1");
console.log("chain_mutation=0");
console.log("transaction_broadcast=0");
console.log("wallet_access=0");
console.log("credential_access=0");
console.log("money_movement=0");
