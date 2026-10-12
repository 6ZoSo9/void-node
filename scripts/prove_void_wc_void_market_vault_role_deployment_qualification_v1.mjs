#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";

import { Wallet } from "ethers";

import {
  buildVoidWcVoidLaunchControllerControlSignatureEnvelopeV1,
  prepareVoidWcVoidLaunchControllerControlChallengeV1,
  verifyVoidWcVoidLaunchControllerControlSignatureV1,
} from "../tools/void-wc-void-launch-controller-control-requalification-v1.mjs";
import {
  VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_AUTHORITY_V1,
  VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_SOURCE_BLOBS_V1,
  qualifyVoidWcVoidMarketVaultRoleDeploymentV1,
} from "../tools/void-wc-void-market-vault-role-deployment-qualification-v1.mjs";

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function pretty(value) {
  return Buffer.from(JSON.stringify(value, null, 2) + "\n", "utf8");
}

const wallet = Wallet.createRandom();
const now = 2_000_000_000;
const challenge =
  prepareVoidWcVoidLaunchControllerControlChallengeV1({
    candidateAddress: wallet.address,
    nowUnix: now,
    ttlSeconds: 300,
    nonce: "0x" + "42".repeat(32),
  });
const signature = await wallet.signTypedData(
  challenge.typed_data.domain,
  challenge.typed_data.types,
  challenge.typed_data.value,
);
const signatureEnvelope =
  buildVoidWcVoidLaunchControllerControlSignatureEnvelopeV1({
    challengeId: challenge.challenge_id,
    signature,
  });
const evidence =
  await verifyVoidWcVoidLaunchControllerControlSignatureV1({
    challengeEnvelope: challenge,
    signatureEnvelope,
    nowUnix: now + 1,
  });
const evidenceBytes = pretty(evidence);

const qualification =
  await qualifyVoidWcVoidMarketVaultRoleDeploymentV1({
    launchControllerEvidenceBytes: evidenceBytes,
    launchControllerEvidenceFileSha256: sha256(evidenceBytes),
    evaluationTimeUnix: String(now + 2),
  });
assert.equal(
  qualification.status,
  "QUALIFIED_DEPLOYMENT_PREPARATION_READY_NOT_AUTHORIZED",
);
assert.equal(
  qualification.coupled_launch_id,
  "sha256:b893f68c8202cb1a8ea25792fb0c032876bbac85ba11a15f4e95dad1f1d75a3d",
);
assert.equal(
  qualification.launch_controller.address,
  wallet.address.toLowerCase(),
);
assert.equal(
  qualification.vault_identity.creation_bytecode_sha256,
  "84bbf44ee873c9e8b271271d8d3dc10bf6bb58d38b0d7da26558275510c0d540",
);
assert.equal(
  qualification.vault_identity.runtime_template_sha256,
  "99a7179850af5a6e13c1a1b24cf873b011a98fcc8d54479722c20fc254188f7e",
);
assert.equal(
  qualification.vault_identity.creation_bytecode_keccak256,
  "0xa741a938f6570d3b8de727e7487460a0dda04244e6e45a79ab22756b16369c41",
);
assert.equal(
  qualification.vault_identity.runtime_template_keccak256,
  "0xea29fc4564e552b4b16a824f9f9566edc82d886b81d908f6205091cbe6ce24af",
);
assert.equal(
  qualification.deployment_preparation.exact_creation_payload_ready,
  true,
);
assert.equal(qualification.deployment_preparation.deployer_selected, false);
assert.equal(qualification.deployment_preparation.nonce_observed, false);
assert.equal(qualification.deployment_preparation.fee_observed, false);
assert.equal(
  qualification.deployment_preparation.transaction_envelope_ready,
  false,
);
assert.equal(
  qualification.deployment_preparation.deployment_authorized,
  false,
);
assert.equal(
  qualification.deployment_preparation.inventory_funding_authorized,
  false,
);

assert.equal(
  Object.keys(
    VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_SOURCE_BLOBS_V1,
  ).length,
  14,
);

assert.equal(
  VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_AUTHORITY_V1
    .deployment,
  false,
);
assert.equal(
  VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_AUTHORITY_V1
    .inventory_funding,
  false,
);
assert.equal(
  VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_AUTHORITY_V1
    .transaction_signing,
  false,
);
assert.equal(
  VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_AUTHORITY_V1
    .transaction_broadcast,
  false,
);
assert.equal(
  VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_AUTHORITY_V1
    .funds_movement,
  false,
);

console.log(
  "VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_V1_GREEN",
);
console.log("compiled_identity_v1_superseded=true");
console.log("corrected_current_identity_qualified=true");
console.log("exact_creation_payload_ready=true");
console.log(
  "corrected_coupled_launch_id=sha256:b893f68c8202cb1a8ea25792fb0c032876bbac85ba11a15f4e95dad1f1d75a3d",
);
console.log("deployment_authorized=false");
console.log("inventory_funding_authorized=false");
console.log("transaction_signing=false");
console.log("transaction_broadcast=false");
console.log("funds_movement=false");
