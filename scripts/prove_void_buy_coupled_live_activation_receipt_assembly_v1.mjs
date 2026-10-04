#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import { Wallet } from "ethers";

import {
  VOID_BUY_COUPLED_LIVE_ACTIVATION_CONTROLLER_V1,
  VOID_BUY_COUPLED_LIVE_SOVEREIGN_COSIGNER_V1,
} from "../src/economic/buy_void_coupled_launch_gate_v1.mjs";
import {
  buildBuyCoupledLiveActivationSigningRequestV1,
} from "../tools/void-buy-coupled-live-activation-signing-request-v1.mjs";
import {
  VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_ASSEMBLY_AUTHORITY_V1,
  assembleBuyCoupledLiveActivationReceiptV1,
  verifyCoupledLiveActivationTypedDataSignaturesV1,
} from "../tools/void-buy-coupled-live-activation-receipt-assembly-v1.mjs";

const NOW = 1791014400000;
const request = buildBuyCoupledLiveActivationSigningRequestV1(
  {
    activated_at_ms: NOW,
    activation_generation: "0x" + "a".repeat(64),
    activation_nonce: "0x" + "b".repeat(64),
    expires_at_ms: NOW + 120_000,
    generation_tip_sha256: "sha256:" + "c".repeat(64),
    source_composition_id: "sha256:" + "d".repeat(64),
  },
  NOW + 1,
);

const syntheticController = new Wallet(
  "0x1111111111111111111111111111111111111111111111111111111111111111",
);
const syntheticSovereign = new Wallet(
  "0x2222222222222222222222222222222222222222222222222222222222222222",
);
const activationSignature = await syntheticController.signTypedData(
  request.typed_data.domain,
  request.typed_data.types,
  request.typed_data.value,
);
const sovereignSignature = await syntheticSovereign.signTypedData(
  request.typed_data.domain,
  request.typed_data.types,
  request.typed_data.value,
);

assert.deepEqual(
  verifyCoupledLiveActivationTypedDataSignaturesV1({
    typedData: request.typed_data,
    activationSignature,
    sovereignSignature,
    expectedActivationSigner: syntheticController.address,
    expectedSovereignSigner: syntheticSovereign.address,
  }),
  {
    verified: true,
    activation_signer: syntheticController.address.toLowerCase(),
    sovereign_signer: syntheticSovereign.address.toLowerCase(),
  },
);

assert.throws(
  () =>
    assembleBuyCoupledLiveActivationReceiptV1({
      signingRequest: request,
      activationSignature,
      sovereignSignature,
    }),
  /activation_controller_signature_mismatch/u,
  "synthetic signatures must never assemble a production receipt",
);

assert.throws(
  () =>
    verifyCoupledLiveActivationTypedDataSignaturesV1({
      typedData: request.typed_data,
      activationSignature: "0x01",
      sovereignSignature,
      expectedActivationSigner: syntheticController.address,
      expectedSovereignSigner: syntheticSovereign.address,
    }),
  /activation_receipt_signature_input_invalid/u,
);

assert.throws(
  () =>
    verifyCoupledLiveActivationTypedDataSignaturesV1({
      typedData: request.typed_data,
      activationSignature,
      sovereignSignature,
      expectedActivationSigner:
        VOID_BUY_COUPLED_LIVE_ACTIVATION_CONTROLLER_V1,
      expectedSovereignSigner:
        VOID_BUY_COUPLED_LIVE_SOVEREIGN_COSIGNER_V1,
    }),
  /activation_controller_signature_mismatch/u,
);

for (const [key, expected] of Object.entries({
  private_key_access: false,
  credential_access: false,
  wallet_or_signer_access: false,
  signature_creation: false,
  signature_verification: true,
  filesystem_write: false,
  runtime_mutation: false,
  service_restart: false,
  transaction_construction: false,
  transaction_signing: false,
  transaction_submission: false,
  transaction_broadcast: false,
  chain2050_write: false,
  wc_ledger_write: false,
  market_activation: false,
  public_presale_activation: false,
  funds_movement: false,
})) {
  assert.equal(
    VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_ASSEMBLY_AUTHORITY_V1[key],
    expected,
    key,
  );
}

const source = fs.readFileSync(
  "tools/void-buy-coupled-live-activation-receipt-assembly-v1.mjs",
  "utf8",
);
for (const required of [
  "verifyBuyCoupledLiveActivationSigningRequestV1(signingRequest)",
  "VOID_BUY_COUPLED_LIVE_ACTIVATION_CONTROLLER_V1",
  "VOID_BUY_COUPLED_LIVE_SOVEREIGN_COSIGNER_V1",
  "verifyTypedData(",
  'JSON.stringify(receipt, null, 2) + "\\n"',
  "activate-coupled-public-buy-v1:",
  "private_receipt_installation_then_exact_runtime_gate_revalidation",
]) {
  assert.equal(source.includes(required), true, required);
}
for (const forbidden of [
  "new Wallet(",
  ".signTypedData(",
  "private-key",
  "privateKey",
  "mnemonic",
  "writeFile",
  "appendFile",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "sendTransaction(",
  "signTransaction(",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log("VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_ASSEMBLY_V1_GREEN");
console.log("production_positive_fixture_present=false");
console.log("synthetic_signatures_can_assemble_production_receipt=false");
console.log("private_key_access=false");
console.log("signature_creation=false");
console.log("filesystem_write=false");
console.log("runtime_activation=false");
console.log("funds_movement=false");
