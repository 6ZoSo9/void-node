#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

import { Wallet } from "ethers";

import {
  VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_GATEWAY_ID_V1,
  VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_TYPES_V1,
  buildVoidEconomicEpoch2SignedSubmissionIntentV1,
  voidEconomicEpoch2SignedSubmissionTypedDataV1,
} from "../tools/void-economic-epoch2-signed-submission-intent-v1.mjs";

import {
  VoidEconomicEpoch2PublicSubmissionGatewayHoldV1,
  admitVoidEconomicEpoch2PublicSubmissionGatewayV1,
} from "../tools/void-economic-epoch2-public-submission-gateway-v1.mjs";

import {
  VOID_ECONOMIC_EPOCH2_DURABLE_REPLAY_STORE_AUTHORITY_V1,
  VOID_ECONOMIC_EPOCH2_DURABLE_REPLAY_STORE_V1,
  VoidEconomicEpoch2DurableReplayStoreErrorV1,
  createVoidEconomicEpoch2DurableReplayStoreV1,
} from "../tools/void-economic-epoch2-durable-replay-store-v1.mjs";

const evidence = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/economic-epoch2-durable-replay-store-v1.json",
    "utf8",
  ),
);

const digest = (label) =>
  "0x" + crypto.createHash("sha256").update(label, "utf8").digest("hex");

const target = "0x470075b85352eb86f7d089fb9ba88945f12aad94";
const signer = "0x1111111111111111111111111111111111111111";
const metadata = Object.freeze({
  chain_id: 2050,
  execution_epoch: 2,
  gateway_id: VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_GATEWAY_ID_V1,
  signer,
  nonce: "7",
  target,
  calldata_keccak256: digest("calldata"),
  expires_at_unix: "2000000300",
});

function makeRoot(parent, name) {
  const root = path.join(parent, name);
  fs.mkdirSync(root, { mode: 0o700 });
  fs.chmodSync(root, 0o700);
  return fs.realpathSync.native(root);
}

async function expectStoreError(run, reason) {
  let thrown = null;
  try {
    await run();
  } catch (error) {
    thrown = error;
  }
  assert(thrown, "expected durable store error: " + reason);
  assert(
    thrown instanceof VoidEconomicEpoch2DurableReplayStoreErrorV1,
    "wrong durable store error: " + String(thrown),
  );
  assert.equal(thrown.reason, reason);
}

async function expectGatewayHold(run, reason) {
  let thrown = null;
  try {
    await run();
  } catch (error) {
    thrown = error;
  }
  assert(thrown, "expected gateway hold: " + reason);
  assert(
    thrown instanceof VoidEconomicEpoch2PublicSubmissionGatewayHoldV1,
    "wrong gateway error: " + String(thrown),
  );
  assert.equal(thrown.reason, reason);
}

const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-epoch2-durable-replay-store-v1-"),
);
fs.chmodSync(temp, 0o700);

try {
  // Sequential create-once and reopen/restart persistence.
  const sequentialRoot = makeRoot(temp, "sequential");
  const sequentialDigest = digest("sequential");
  const storeA = createVoidEconomicEpoch2DurableReplayStoreV1({
    root: sequentialRoot,
  });
  assert.deepEqual(
    await storeA.consumeIfFresh(
      sequentialDigest,
      metadata,
      Object.freeze({ timeout_ms: 1000 }),
    ),
    { consumed: true, already_consumed: false, atomic: true },
  );
  assert.deepEqual(
    await storeA.consumeIfFresh(
      sequentialDigest,
      metadata,
      Object.freeze({ timeout_ms: 1000 }),
    ),
    { consumed: false, already_consumed: true, atomic: true },
  );

  const markerDir = path.join(sequentialRoot, sequentialDigest.slice(2));
  const receiptPath = path.join(markerDir, "receipt.json");
  assert.equal(fs.lstatSync(markerDir).isDirectory(), true);
  assert.equal(fs.lstatSync(receiptPath).isFile(), true);

  const storeB = createVoidEconomicEpoch2DurableReplayStoreV1({
    root: sequentialRoot,
  });
  assert.deepEqual(
    await storeB.consumeIfFresh(
      sequentialDigest,
      metadata,
      Object.freeze({ timeout_ms: 1000 }),
    ),
    { consumed: false, already_consumed: true, atomic: true },
  );

  // Audit receipt loss cannot resurrect a consumed digest because the
  // create-once digest directory is the replay authority.
  fs.unlinkSync(receiptPath);
  const storeAfterReceiptLoss =
    createVoidEconomicEpoch2DurableReplayStoreV1({
      root: sequentialRoot,
    });
  assert.deepEqual(
    await storeAfterReceiptLoss.consumeIfFresh(
      sequentialDigest,
      metadata,
      Object.freeze({ timeout_ms: 1000 }),
    ),
    { consumed: false, already_consumed: true, atomic: true },
  );

  // Cross-process concurrency: exactly one process may create the digest marker.
  const concurrentRoot = makeRoot(temp, "concurrent");
  const concurrentDigest = digest("concurrent");
  const toolUrl = pathToFileURL(
    path.resolve("tools/void-economic-epoch2-durable-replay-store-v1.mjs"),
  ).href;
  const childSource = [
    "import { createVoidEconomicEpoch2DurableReplayStoreV1 as createStore } from " +
      JSON.stringify(toolUrl) + ";",
    "const store=createStore({root:process.env.VOID_REPLAY_ROOT});",
    "const result=await store.consumeIfFresh(",
    "  process.env.VOID_REPLAY_DIGEST,",
    "  JSON.parse(process.env.VOID_REPLAY_METADATA),",
    "  {timeout_ms:1000},",
    ");",
    "process.stdout.write(JSON.stringify(result));",
  ].join("\n");

  const runChild = () =>
    new Promise((resolve, reject) => {
      const child = spawn(
        process.execPath,
        ["--input-type=module", "--eval", childSource],
        {
          cwd: process.cwd(),
          env: {
            ...process.env,
            VOID_REPLAY_ROOT: concurrentRoot,
            VOID_REPLAY_DIGEST: concurrentDigest,
            VOID_REPLAY_METADATA: JSON.stringify(metadata),
          },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      let stdout = "";
      let stderr = "";
      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk;
      });
      child.on("error", reject);
      child.on("close", (code) => {
        if (code !== 0) {
          reject(new Error("child_failed:" + code + ":" + stderr));
          return;
        }
        resolve(JSON.parse(stdout));
      });
    });

  const concurrent = await Promise.all(
    Array.from({ length: 8 }, () => runChild()),
  );
  assert.equal(
    concurrent.filter(
      (row) =>
        row.consumed === true &&
        row.already_consumed === false &&
        row.atomic === true,
    ).length,
    1,
  );
  assert.equal(
    concurrent.filter(
      (row) =>
        row.consumed === false &&
        row.already_consumed === true &&
        row.atomic === true,
    ).length,
    7,
  );

  // A present receipt with conflicting metadata is corruption, never a
  // normal replay response.
  const concurrentStore =
    createVoidEconomicEpoch2DurableReplayStoreV1({
      root: concurrentRoot,
    });
  await expectStoreError(
    () =>
      concurrentStore.consumeIfFresh(
        concurrentDigest,
        { ...metadata, nonce: "8" },
        { timeout_ms: 1000 },
      ),
    "durable_replay_receipt_metadata_mismatch",
  );

  // Marker path substitution is fail-closed.
  const markerAttackRoot = makeRoot(temp, "marker-attack");
  const markerAttackDigest = digest("marker-attack");
  fs.symlinkSync(
    markerAttackRoot,
    path.join(markerAttackRoot, markerAttackDigest.slice(2)),
    "dir",
  );
  const markerAttackStore =
    createVoidEconomicEpoch2DurableReplayStoreV1({
      root: markerAttackRoot,
    });
  await expectStoreError(
    () =>
      markerAttackStore.consumeIfFresh(
        markerAttackDigest,
        metadata,
        { timeout_ms: 1000 },
      ),
    "durable_replay_marker_type_invalid",
  );

  // Root symlinks and root generation replacement are fail-closed.
  const stableRoot = makeRoot(temp, "stable-root");
  const stableStore = createVoidEconomicEpoch2DurableReplayStoreV1({
    root: stableRoot,
  });
  const rootLink = path.join(temp, "root-link");
  fs.symlinkSync(stableRoot, rootLink, "dir");
  await expectStoreError(
    async () =>
      createVoidEconomicEpoch2DurableReplayStoreV1({
        root: rootLink,
      }),
    "durable_replay_root_type_invalid",
  );

  const movedRoot = path.join(temp, "stable-root-old");
  fs.renameSync(stableRoot, movedRoot);
  fs.mkdirSync(stableRoot, { mode: 0o700 });
  fs.chmodSync(stableRoot, 0o700);
  await expectStoreError(
    () =>
      stableStore.consumeIfFresh(
        digest("root-replaced"),
        metadata,
        { timeout_ms: 1000 },
      ),
    "durable_replay_root_changed",
  );

  // Compose the durable store through the existing inactive gateway. The
  // core remains conservative and reports its own generic durable bit false;
  // this proof establishes the concrete adapter separately.
  const gatewayRoot = makeRoot(temp, "gateway");
  const durableGatewayStore =
    createVoidEconomicEpoch2DurableReplayStoreV1({
      root: gatewayRoot,
    });
  const wallet = Wallet.createRandom();
  const gatewaySigner = wallet.address.toLowerCase();
  const calldata =
    "0xa9059cbb" +
    "0000000000000000000000000000000000000000000000000000000000000001" +
    "0000000000000000000000000000000000000000000000000000000000000001";
  const now = 2_000_000_000n;
  const intent = buildVoidEconomicEpoch2SignedSubmissionIntentV1({
    signer: gatewaySigner,
    nonce: "42",
    issuedAtUnix: String(now - 10n),
    expiresAtUnix: String(now + 110n),
    target,
    gasLimit: "100000",
    calldata,
  });
  const typed = voidEconomicEpoch2SignedSubmissionTypedDataV1(intent);
  const signature = await wallet.signTypedData(
    typed.domain,
    VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_TYPES_V1,
    typed.value,
  );
  const trustedClock = () => ({
    nowUnix() {
      return String(now);
    },
    monotonicNowMs() {
      return performance.now();
    },
  });

  const admitted = await admitVoidEconomicEpoch2PublicSubmissionGatewayV1({
    intent,
    calldata,
    signature,
    trustedClock: trustedClock(),
    replayConsumeTimeoutMs: 1000,
    allowedTargets: [target],
    replayStore: durableGatewayStore,
  });
  assert.equal(admitted.ok, true);
  assert.equal(admitted.atomic_replay_digest_consumed, true);
  assert.equal(admitted.durable_replay_store_verified, false);
  assert.equal(admitted.runtime_route_active, false);
  assert.equal(admitted.transaction_submission, false);
  assert.equal(admitted.transaction_broadcast, false);
  assert.equal(admitted.authoritative_chain2050_write, false);

  const reopenedGatewayStore =
    createVoidEconomicEpoch2DurableReplayStoreV1({
      root: gatewayRoot,
    });
  await expectGatewayHold(
    () =>
      admitVoidEconomicEpoch2PublicSubmissionGatewayV1({
        intent,
        calldata,
        signature,
        trustedClock: trustedClock(),
        replayConsumeTimeoutMs: 1000,
        allowedTargets: [target],
        replayStore: reopenedGatewayStore,
      }),
    "intent_replay_detected_at_atomic_consume",
  );

  assert.equal(
    evidence.marker,
    VOID_ECONOMIC_EPOCH2_DURABLE_REPLAY_STORE_V1,
  );
  assert.equal(evidence.version, 1);
  assert.equal(
    evidence.status,
    "SOURCE_RUNTIME_DURABLE_REPLAY_STORE_GREEN_PRODUCTION_BINDING_HOLD",
  );
  for (const key of [
    "sequential_exactly_once_proven",
    "reopened_store_replay_proven",
    "cross_process_exactly_once_proven",
    "missing_receipt_fail_closed_replay_proven",
    "marker_symlink_rejected",
    "root_symlink_rejected",
    "metadata_mismatch_rejected",
    "public_submission_gateway_composition_proven",
  ]) {
    assert.equal(evidence.verification[key], true, key);
  }
  assert.equal(evidence.gates.durable_replay_store_implemented, true);
  assert.equal(evidence.gates.durable_replay_store_verified, true);
  assert.equal(
    evidence.gates.production_gateway_replay_store_binding_verified,
    false,
  );
  assert.equal(evidence.gates.runtime_route_active, false);
  assert.equal(evidence.gates.transaction_submission, false);
  assert.equal(evidence.gates.transaction_broadcast, false);
  assert.equal(evidence.gates.authoritative_chain2050_write, false);

  assert.equal(
    VOID_ECONOMIC_EPOCH2_DURABLE_REPLAY_STORE_AUTHORITY_V1.source_only,
    true,
  );
  for (const [key, value] of Object.entries(
    VOID_ECONOMIC_EPOCH2_DURABLE_REPLAY_STORE_AUTHORITY_V1,
  )) {
    if (key === "source_only") continue;
    assert.equal(value, false, key);
  }

  const source = fs.readFileSync(
    "tools/void-economic-epoch2-durable-replay-store-v1.mjs",
    "utf8",
  );
  assert.match(source, /fs\.mkdirSync\(markerDir/);
  assert.match(source, /fsyncDirectory\(root/);
  assert.match(source, /fs\.renameSync\(pendingPath, receiptPath\)/);
  assert.match(source, /error\?\.code === "ENOENT"\) return/);
  assert.doesNotMatch(source, /eth_sendRawTransaction|eth_sendTransaction/);
  assert.doesNotMatch(source, /transaction_broadcast:\s*true/);

  console.log("VOID_ECONOMIC_EPOCH2_DURABLE_REPLAY_STORE_V1_GREEN");
  console.log("sequential_exactly_once_proven=true");
  console.log("reopened_store_replay_proven=true");
  console.log("cross_process_exactly_once_proven=true");
  console.log("missing_receipt_fail_closed_replay_proven=true");
  console.log("marker_symlink_rejected=true");
  console.log("root_generation_replacement_rejected=true");
  console.log("metadata_mismatch_rejected=true");
  console.log("public_submission_gateway_composition_proven=true");
  console.log("durable_replay_store_verified=true");
  console.log("production_gateway_replay_store_binding_verified=false");
  console.log("runtime_route_active=false");
  console.log("transaction_submission=false");
  console.log("transaction_broadcast=false");
  console.log("authoritative_chain2050_write=false");
  console.log("funds_movement=false");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
