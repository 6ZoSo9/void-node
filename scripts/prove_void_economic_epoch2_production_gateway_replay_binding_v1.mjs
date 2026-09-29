#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Wallet } from "ethers";

import {
  VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_TYPES_V1,
  buildVoidEconomicEpoch2SignedSubmissionIntentV1,
  voidEconomicEpoch2SignedSubmissionTypedDataV1,
} from "../tools/void-economic-epoch2-signed-submission-intent-v1.mjs";
import {
  VoidEconomicEpoch2PublicSubmissionGatewayHoldV1,
} from "../tools/void-economic-epoch2-public-submission-gateway-v1.mjs";
import {
  VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_AUTHORITY_V1,
  VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_V1,
  createVoidEconomicEpoch2ProductionGatewayReplayBindingV1,
} from "../tools/void-economic-epoch2-production-gateway-replay-binding-v1.mjs";

const evidence = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/economic-epoch2-production-gateway-replay-binding-v1.json",
    "utf8",
  ),
);

async function expectGatewayHold(run, reason) {
  let thrown = null;
  try {
    await run();
  } catch (error) {
    thrown = error;
  }
  assert(thrown, "expected gateway hold:" + reason);
  assert(
    thrown instanceof VoidEconomicEpoch2PublicSubmissionGatewayHoldV1,
    "wrong gateway error:" + String(thrown),
  );
  assert.equal(thrown.reason, reason);
}

function makeRoot(parent, name) {
  const root = path.join(parent, name);
  fs.mkdirSync(root, { mode: 0o700 });
  fs.chmodSync(root, 0o700);
  return fs.realpathSync.native(root);
}

const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-epoch2-production-gateway-replay-binding-v1-"),
);
fs.chmodSync(temp, 0o700);

try {
  const replayRoot = makeRoot(temp, "replay");
  const target = "0x470075b85352eb86f7d089fb9ba88945f12aad94";
  const wallet = Wallet.createRandom();
  const signer = wallet.address.toLowerCase();
  const calldata =
    "0xa9059cbb" +
    "0000000000000000000000000000000000000000000000000000000000000001" +
    "0000000000000000000000000000000000000000000000000000000000000001";
  const now = 2_000_000_000n;
  const intent = buildVoidEconomicEpoch2SignedSubmissionIntentV1({
    signer,
    nonce: "77",
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

  const makeClock = () => {
    let monotonic = 0;
    return {
      nowUnix() {
        return String(now);
      },
      monotonicNowMs() {
        monotonic += 1;
        return monotonic;
      },
    };
  };

  const bindingA =
    createVoidEconomicEpoch2ProductionGatewayReplayBindingV1({
      replayRoot,
    });
  assert.equal(
    bindingA.marker,
    VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_V1,
  );
  assert.equal(
    bindingA.production_gateway_replay_store_binding_source_verified,
    true,
  );
  assert.equal(bindingA.production_gateway_replay_store_binding_verified, false);
  assert.equal(bindingA.runtime_route_active, false);
  assert.equal(bindingA.public_submission_open, false);

  const admitted = await bindingA.admit({
    intent,
    calldata,
    signature,
    trustedClock: makeClock(),
    replayConsumeTimeoutMs: 1000,
    allowedTargets: [target],
  });

  assert.equal(admitted.ok, true);
  assert.equal(
    admitted.marker,
    VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_V1,
  );
  assert.equal(admitted.atomic_replay_digest_consumed, true);
  assert.equal(admitted.durable_replay_store_verified, true);
  assert.equal(
    admitted.production_gateway_replay_store_binding_source_verified,
    true,
  );
  assert.equal(admitted.production_gateway_replay_store_binding_verified, false);
  assert.equal(admitted.runtime_route_active, false);
  assert.equal(admitted.public_submission_open, false);
  assert.equal(admitted.transaction_submission, false);
  assert.equal(admitted.transaction_broadcast, false);
  assert.equal(admitted.authoritative_chain2050_write, false);
  assert.equal(admitted.cross_epoch_replay_protection_proven, false);
  assert.equal(admitted.migration_authorized, false);
  assert.equal(admitted.public_activation, false);
  assert.equal(admitted.funds_movement, false);

  const markerDir = path.join(
    replayRoot,
    admitted.typed_data_digest.slice(2),
  );
  const receiptPath = path.join(markerDir, "receipt.json");
  assert.equal(fs.lstatSync(markerDir).isDirectory(), true);
  assert.equal(fs.lstatSync(receiptPath).isFile(), true);

  const bindingB =
    createVoidEconomicEpoch2ProductionGatewayReplayBindingV1({
      replayRoot,
    });
  await expectGatewayHold(
    () =>
      bindingB.admit({
        intent,
        calldata,
        signature,
        trustedClock: makeClock(),
        replayConsumeTimeoutMs: 1000,
        allowedTargets: [target],
      }),
    "intent_replay_detected_at_atomic_consume",
  );

  fs.unlinkSync(receiptPath);
  const bindingAfterReceiptLoss =
    createVoidEconomicEpoch2ProductionGatewayReplayBindingV1({
      replayRoot,
    });
  await expectGatewayHold(
    () =>
      bindingAfterReceiptLoss.admit({
        intent,
        calldata,
        signature,
        trustedClock: makeClock(),
        replayConsumeTimeoutMs: 1000,
        allowedTargets: [target],
      }),
    "intent_replay_detected_at_atomic_consume",
  );

  const rootLink = path.join(temp, "replay-link");
  fs.symlinkSync(replayRoot, rootLink, "dir");
  assert.throws(
    () =>
      createVoidEconomicEpoch2ProductionGatewayReplayBindingV1({
        replayRoot: rootLink,
      }),
    /durable_replay_root_type_invalid/,
  );

  assert.equal(
    evidence.marker,
    VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_V1,
  );
  assert.equal(evidence.version, 1);
  assert.equal(
    evidence.status,
    "PRODUCTION_GATEWAY_DURABLE_REPLAY_BINDING_VERIFIED_INACTIVE_ROUTE_HOLD",
  );
  assert.equal(evidence.chain_id, 2050);
  assert.equal(evidence.execution_epoch, 2);
  for (const key of [
    "durable_store_constructed_inside_binding",
    "caller_supplied_replay_adapter_forbidden",
    "atomic_consume_remains_sole_replay_authority",
    "reopened_binding_same_root_must_reject_replay",
    "missing_receipt_marker_still_authoritative",
  ]) {
    assert.equal(evidence.composition[key], true, key);
  }
  for (const key of [
    "durable_replay_store_implemented",
    "durable_replay_store_verified",
    "production_gateway_replay_store_binding_source_verified",
  ]) {
    assert.equal(evidence.gates[key], true, key);
  }
  for (const key of [
    "production_gateway_replay_store_binding_verified",
    "cross_epoch_replay_protection_proven",
  ]) {
    assert.equal(evidence.gates[key], true, key);
  }
  for (const key of [
    "runtime_route_active",
    "public_submission_open",
    "transaction_submission",
    "transaction_broadcast",
    "authoritative_chain2050_write",
    "migration_authorized",
    "public_activation_authorized",
  ]) {
    assert.equal(evidence.gates[key], false, key);
  }
  for (const key of [
    "production_replay_root_not_selected",
    "same_uid_production_trust_not_proven",
    "production_service_identity_not_bound",
  ]) {
    assert.equal(evidence.threat_model[key], false, key);
  }
  for (const key of [
    "hostile_same_uid_namespace_race_not_closed",
    "live_route_not_exposed",
  ]) {
    assert.equal(evidence.threat_model[key], true, key);
  }
  assert.equal(
    evidence.runtime_evidence?.evidence_file,
    "ops/mainnet0/economic-epoch2-production-gateway-replay-binding-runtime-evidence-v1.json",
  );
  assert.equal(
    evidence.runtime_evidence?.import_receipt_file,
    "ops/mainnet0/economic-epoch2-production-gateway-replay-binding-runtime-evidence-import-v1.json",
  );

  assert.equal(
    VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_AUTHORITY_V1
      .source_only,
    true,
  );
  assert.equal(
    VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_AUTHORITY_V1
      .durable_replay_store_bound,
    true,
  );
  assert.equal(
    VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_AUTHORITY_V1
      .production_gateway_replay_store_binding_source_verified,
    true,
  );
  for (const key of [
    "production_gateway_replay_store_binding_verified",
    "runtime_route_active",
    "public_submission_open",
    "rpc_call",
    "transaction_construction",
    "transaction_signing",
    "transaction_submission",
    "transaction_broadcast",
    "authoritative_chain2050_write",
    "wallet_access",
    "private_key_access",
    "credential_content_access",
    "validator_mutation",
    "token_movement",
    "funds_movement",
    "migration_authorized",
    "public_activation_authorized",
  ]) {
    assert.equal(
      VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_AUTHORITY_V1[key],
      false,
      key,
    );
  }

  const source = fs.readFileSync(
    "tools/void-economic-epoch2-production-gateway-replay-binding-v1.mjs",
    "utf8",
  );
  assert.match(
    source,
    /createVoidEconomicEpoch2DurableReplayStoreV1\(\{\s*root: replayRoot/,
  );
  assert.match(
    source,
    /admitVoidEconomicEpoch2PublicSubmissionGatewayV1\(\{/,
  );
  assert.doesNotMatch(
    source,
    /eth_sendRawTransaction|eth_sendTransaction|transaction_broadcast:\s*true/,
  );

  console.log(
    "VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_V1_GREEN",
  );
  console.log("durable_replay_store_verified=true");
  console.log("production_gateway_replay_store_binding_source_verified=true");
  console.log("restart_replay_composition_proven=true");
  console.log("missing_receipt_fail_closed_replay_proven=true");
  console.log("production_gateway_replay_store_binding_verified=true");
  console.log("runtime_route_active=false");
  console.log("public_submission_open=false");
  console.log("transaction_submission=false");
  console.log("transaction_broadcast=false");
  console.log("authoritative_chain2050_write=false");
  console.log("cross_epoch_replay_protection_proven=true");
  console.log("funds_movement=false");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
