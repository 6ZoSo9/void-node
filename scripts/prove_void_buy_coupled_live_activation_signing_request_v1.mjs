#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  TypedDataEncoder,
  Wallet,
  verifyTypedData,
} from "ethers";

import {
  VOID_BUY_COUPLED_LAUNCH_ID_V1,
  VOID_BUY_COUPLED_LIVE_ACTIVATION_CONTROLLER_V1,
  VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_V1,
  VOID_BUY_COUPLED_LIVE_SOVEREIGN_COSIGNER_V1,
} from "../src/economic/buy_void_coupled_launch_gate_v1.mjs";
import {
  VOID_BUY_COUPLED_LIVE_ACTIVATION_SIGNING_REQUEST_AUTHORITY_V1,
  buildBuyCoupledLiveActivationSigningRequestV1,
  verifyBuyCoupledLiveActivationSigningRequestV1,
} from "../tools/void-buy-coupled-live-activation-signing-request-v1.mjs";

const NOW = 1791014400000;
const input = Object.freeze({
  activated_at_ms: NOW,
  activation_generation: "0x" + "a".repeat(64),
  activation_nonce: "0x" + "b".repeat(64),
  expires_at_ms: NOW + 120_000,
  generation_tip_sha256: "sha256:" + "c".repeat(64),
  source_composition_id: "sha256:" + "d".repeat(64),
});

const request =
  buildBuyCoupledLiveActivationSigningRequestV1(input, NOW + 1);

assert.match(request.signing_request_id, /^voidbclasr1_[0-9a-f]{64}$/u);
assert.match(request.activation_receipt_id, /^voidbclive1_[0-9a-f]{64}$/u);
assert.match(request.typed_data_digest, /^0x[0-9a-f]{64}$/u);
assert.equal(
  request.status,
  "HOLD_PENDING_DUAL_OFFLINE_SIGNATURES_AND_LIVE_REVALIDATION",
);
assert.equal(
  request.typed_data.primary_type,
  "CoupledPublicLaunchActivation",
);
assert.equal(
  request.unsigned_receipt.marker,
  VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_V1,
);
assert.equal(
  request.unsigned_receipt.coupled_launch_id,
  VOID_BUY_COUPLED_LAUNCH_ID_V1,
);
assert.equal(
  request.unsigned_receipt.activation_signer,
  VOID_BUY_COUPLED_LIVE_ACTIVATION_CONTROLLER_V1,
);
assert.equal(
  request.unsigned_receipt.sovereign_signer,
  VOID_BUY_COUPLED_LIVE_SOVEREIGN_COSIGNER_V1,
);
for (const key of [
  "buy_void_private_runtime_active",
  "wc_void_market_active",
  "public_presale_active",
  "same_launch_ceremony",
  "public_buy_request_intake_authorized",
  "runtime_or_launch_evidence",
]) {
  assert.equal(request.unsigned_receipt[key], true, key);
}
assert.equal(request.unsigned_receipt.source_ready_only, false);
assert.equal(
  request.typed_data_digest,
  TypedDataEncoder.hash(
    request.typed_data.domain,
    request.typed_data.types,
    request.typed_data.value,
  ).toLowerCase(),
);
assert.deepEqual(
  verifyBuyCoupledLiveActivationSigningRequestV1(request),
  {
    verified: true,
    signing_request_id: request.signing_request_id,
    activation_receipt_id: request.activation_receipt_id,
    typed_data_digest: request.typed_data_digest,
  },
);

const syntheticController = new Wallet(
  "0x1111111111111111111111111111111111111111111111111111111111111111",
);
const syntheticSovereign = new Wallet(
  "0x2222222222222222222222222222222222222222222222222222222222222222",
);
const controllerSignature = await syntheticController.signTypedData(
  request.typed_data.domain,
  request.typed_data.types,
  request.typed_data.value,
);
const sovereignSignature = await syntheticSovereign.signTypedData(
  request.typed_data.domain,
  request.typed_data.types,
  request.typed_data.value,
);
assert.equal(
  verifyTypedData(
    request.typed_data.domain,
    request.typed_data.types,
    request.typed_data.value,
    controllerSignature,
  ).toLowerCase(),
  syntheticController.address.toLowerCase(),
);
assert.equal(
  verifyTypedData(
    request.typed_data.domain,
    request.typed_data.types,
    request.typed_data.value,
    sovereignSignature,
  ).toLowerCase(),
  syntheticSovereign.address.toLowerCase(),
);
assert.notEqual(
  syntheticController.address.toLowerCase(),
  VOID_BUY_COUPLED_LIVE_ACTIVATION_CONTROLLER_V1,
);
assert.notEqual(
  syntheticSovereign.address.toLowerCase(),
  VOID_BUY_COUPLED_LIVE_SOVEREIGN_COSIGNER_V1,
);

for (const [label, mutate] of [
  ["extra_input", (v) => { v.extra = true; }],
  ["bad_generation", (v) => { v.activation_generation = "0x01"; }],
  ["bad_nonce", (v) => { v.activation_nonce = "0x02"; }],
  ["bad_tip", (v) => { v.generation_tip_sha256 = "c".repeat(64); }],
  ["bad_composition", (v) => { v.source_composition_id = "d".repeat(64); }],
  ["expired", (v) => { v.expires_at_ms = NOW; }],
  ["lease_too_long", (v) => { v.expires_at_ms = NOW + 300_001; }],
  ["too_future", (v) => {
    v.activated_at_ms = NOW + 30_002;
    v.expires_at_ms = v.activated_at_ms + 60_000;
  }],
]) {
  const candidate = structuredClone(input);
  mutate(candidate);
  assert.throws(
    () => buildBuyCoupledLiveActivationSigningRequestV1(candidate, NOW + 1),
    undefined,
    label,
  );
}

for (const mutate of [
  (v) => { v.typed_data_digest = "0x" + "0".repeat(64); },
  (v) => { v.activation_receipt_id = "voidbclive1_" + "0".repeat(64); },
  (v) => { v.required_signers[0].signer_address = syntheticController.address; },
  (v) => { v.authority_boundary.signature_creation = true; },
]) {
  const candidate = structuredClone(request);
  mutate(candidate);
  assert.throws(
    () => verifyBuyCoupledLiveActivationSigningRequestV1(candidate),
  );
}

for (const [key, expected] of Object.entries({
  private_key_access: false,
  credential_access: false,
  wallet_or_signer_access: false,
  signature_creation: false,
  transaction_construction: false,
  transaction_signing: false,
  transaction_submission: false,
  transaction_broadcast: false,
  chain2050_write: false,
  wc_ledger_write: false,
  runtime_mutation: false,
  service_restart: false,
  market_activation: false,
  public_presale_activation: false,
  funds_movement: false,
})) {
  assert.equal(
    VOID_BUY_COUPLED_LIVE_ACTIVATION_SIGNING_REQUEST_AUTHORITY_V1[key],
    expected,
    key,
  );
}

const source = fs.readFileSync(
  "tools/void-buy-coupled-live-activation-signing-request-v1.mjs",
  "utf8",
);
for (const required of [
  "buyLaunchLiveActivationReceiptIdV1",
  "buyLaunchLiveActivationTypedDataV1",
  "TypedDataEncoder.hash",
  "VOID_BUY_COUPLED_LIVE_ACTIVATION_CONTROLLER_V1",
  "VOID_BUY_COUPLED_LIVE_SOVEREIGN_COSIGNER_V1",
  "dual_offline_signatures_then_content_addressed_receipt_assembly_and_live_gate_revalidation",
]) {
  assert.equal(source.includes(required), true, required);
}
for (const forbidden of [
  "new Wallet(",
  ".signTypedData(",
  "private-key",
  "privateKey",
  "mnemonic",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "sendTransaction(",
  "signTransaction(",
  "fs.readFile",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log("VOID_BUY_COUPLED_LIVE_ACTIVATION_SIGNING_REQUEST_V1_GREEN");
console.log("signing_request_id=" + request.signing_request_id);
console.log("activation_receipt_id=" + request.activation_receipt_id);
console.log("typed_data_digest=" + request.typed_data_digest);
console.log("launch_controller_signature_created=false");
console.log("sovereign_signature_created=false");
console.log("live_generation_verified=false");
console.log("runtime_activation=false");
console.log("funds_movement=false");
