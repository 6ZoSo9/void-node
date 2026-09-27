#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { Wallet } from "ethers";

import {
  VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_AUTHORITY_V1,
  VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_DOMAIN_V1,
  VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_GATEWAY_ID_V1,
  VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_INTENT_V1,
  VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_POLICY_V1,
  VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_TYPES_V1,
  VoidEconomicEpoch2SignedSubmissionIntentHoldV1,
  buildVoidEconomicEpoch2SignedSubmissionIntentV1,
  verifyVoidEconomicEpoch2SignedSubmissionIntentV1,
  voidEconomicEpoch2SignedSubmissionDigestV1,
  voidEconomicEpoch2SignedSubmissionTypedDataV1,
} from "../tools/void-economic-epoch2-signed-submission-intent-v1.mjs";

const policy = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/economic-epoch2-signed-submission-policy-v1.json",
    "utf8",
  ),
);

async function expectHold(run, reason) {
  let thrown = null;
  try {
    await run();
  } catch (error) {
    thrown = error;
  }
  assert(thrown, `expected hold: ${reason}`);
  assert(
    thrown instanceof VoidEconomicEpoch2SignedSubmissionIntentHoldV1,
    `wrong error for ${reason}: ${String(thrown)}`,
  );
  assert.equal(thrown.reason, reason);
}

function rawTypedValue(intent) {
  return {
    execution_epoch: intent.execution_epoch,
    gateway_id: intent.gateway_id,
    policy_generation: intent.policy_generation,
    signer: intent.signer,
    nonce: intent.nonce,
    issued_at_unix: intent.issued_at_unix,
    expires_at_unix: intent.expires_at_unix,
    target: intent.target,
    value_wei: intent.value_wei,
    gas_limit: intent.gas_limit,
    calldata_keccak256: intent.calldata_keccak256,
  };
}

async function signIntent(wallet, intent, domain = VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_DOMAIN_V1) {
  return await wallet.signTypedData(
    domain,
    VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_TYPES_V1,
    rawTypedValue(intent),
  );
}

assert.equal(policy.marker, "VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_POLICY_V1");
assert.equal(policy.version, 1);
assert.equal(policy.status, "SOURCE_GATEWAY_CORE_READY_RUNTIME_ROUTE_INACTIVE");
assert.equal(policy.chain_id, 2050);
assert.equal(policy.execution_epoch, 2);
assert.equal(
  policy.gateway_identity,
  "VOID_ECONOMIC_EPOCH2_PUBLIC_SUBMISSION_GATEWAY_V1",
);
assert.equal(
  policy.signature_domain_identity,
  "VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_DOMAIN_V1",
);
assert.equal(policy.signature_scheme, "EIP-712 secp256k1");
assert.equal(policy.policy_generation, "1");
assert.equal(policy.envelope.max_ttl_seconds, "300");
assert.equal(policy.envelope.native_value_wei_required, "0");
assert.equal(policy.envelope.max_gas_limit, "3000000");
assert.equal(policy.envelope.atomic_replay_digest_consume_required, true);
assert.equal(policy.network_boundary.raw_public_rpc_allowed, false);
assert.equal(policy.network_boundary.gateway_route_active, false);
assert.equal(policy.network_boundary.transaction_submission_active, false);
assert.equal(policy.network_boundary.transaction_broadcast_active, false);
assert.equal(policy.gates.signed_submission_source_primitive_proven, true);
assert.equal(policy.gates.execution_epoch_bound_in_public_gateway, true);
for (const gate of [
  "privileged_signer_nonce_or_key_replay_fence_proven",
  "pending_legacy_signed_transaction_census_complete",
  "cross_epoch_replay_protection_proven",
  "migration_authorized",
  "public_activation_authorized",
]) {
  assert.equal(policy.gates[gate], false, gate);
}

assert.equal(VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_POLICY_V1.chain_id, 2050);
assert.equal(
  VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_POLICY_V1.execution_epoch,
  "2",
);
assert.equal(
  VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_POLICY_V1.gateway_id,
  VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_GATEWAY_ID_V1,
);
assert.equal(VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_DOMAIN_V1.chainId, 2050);
assert.equal(VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_DOMAIN_V1.version, "1");
assert.equal(
  VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_DOMAIN_V1.name,
  "VOID Epoch2 Submission Intent",
);

const wallet = Wallet.createRandom();
const otherWallet = Wallet.createRandom();
const signer = wallet.address.toLowerCase();
const target = "0x470075b85352eb86f7d089fb9ba88945f12aad94";
const calldata =
  "0xa9059cbb" +
  "0000000000000000000000000000000000000000000000000000000000000001" +
  "0000000000000000000000000000000000000000000000000000000000000001";
const now = 2_000_000_000n;

const intent = buildVoidEconomicEpoch2SignedSubmissionIntentV1({
  signer,
  nonce: "7",
  issuedAtUnix: String(now - 10n),
  expiresAtUnix: String(now + 110n),
  target,
  gasLimit: "100000",
  calldata,
});

assert.equal(intent.marker, VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_INTENT_V1);
assert.equal(intent.execution_epoch, "2");
assert.equal(
  intent.gateway_id,
  VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_GATEWAY_ID_V1,
);
assert.equal(intent.value_wei, "0");

const typed = voidEconomicEpoch2SignedSubmissionTypedDataV1(intent);
const signature = await wallet.signTypedData(
  typed.domain,
  typed.types,
  typed.value,
);
const digest = voidEconomicEpoch2SignedSubmissionDigestV1(intent);

const consumed = new Set();
const verified = verifyVoidEconomicEpoch2SignedSubmissionIntentV1({
  intent,
  calldata,
  signature,
  nowUnix: String(now),
  allowedTargets: [target],
  consumedDigests: consumed,
});
assert.equal(verified.ok, true);
assert.equal(verified.status, "VERIFIED_REPLAY_CONSUMPTION_REQUIRED");
assert.equal(verified.chain_id, 2050);
assert.equal(verified.execution_epoch, 2);
assert.equal(verified.signer, signer);
assert.equal(verified.typed_data_digest, digest);
assert.equal(verified.atomic_replay_digest_consume_required, true);
assert.equal(verified.runtime_route_active, false);
assert.equal(verified.transaction_submission, false);
assert.equal(verified.transaction_broadcast, false);
assert.equal(verified.authoritative_chain2050_write, false);
assert.equal(verified.migration_authorized, false);
assert.equal(verified.public_activation, false);

consumed.add(digest);
await expectHold(
  async () =>
    verifyVoidEconomicEpoch2SignedSubmissionIntentV1({
      intent,
      calldata,
      signature,
      nowUnix: String(now),
      allowedTargets: [target],
      consumedDigests: consumed,
    }),
  "intent_replay_detected",
);

await expectHold(
  async () =>
    verifyVoidEconomicEpoch2SignedSubmissionIntentV1({
      intent,
      calldata: calldata.slice(0, -2) + "02",
      signature,
      nowUnix: String(now),
      allowedTargets: [target],
      consumedDigests: new Set(),
    }),
  "calldata_hash_mismatch",
);

await expectHold(
  async () =>
    verifyVoidEconomicEpoch2SignedSubmissionIntentV1({
      intent,
      calldata,
      signature,
      nowUnix: String(now),
      allowedTargets: [
        "0x530bc90ba74f2539a9e484ccb1be9291c3bc35ce",
      ],
      consumedDigests: new Set(),
    }),
  "target_not_allowed",
);

await expectHold(
  async () =>
    verifyVoidEconomicEpoch2SignedSubmissionIntentV1({
      intent,
      calldata,
      signature,
      nowUnix: intent.expires_at_unix,
      allowedTargets: [target],
      consumedDigests: new Set(),
    }),
  "intent_expired",
);

await expectHold(
  async () =>
    verifyVoidEconomicEpoch2SignedSubmissionIntentV1({
      intent,
      calldata,
      signature,
      nowUnix: String(BigInt(intent.issued_at_unix) - 1n),
      allowedTargets: [target],
      consumedDigests: new Set(),
    }),
  "intent_not_yet_valid",
);

const wrongEpoch = {
  ...intent,
  execution_epoch: "1",
};
const wrongEpochSignature = await signIntent(wallet, wrongEpoch);
await expectHold(
  async () =>
    verifyVoidEconomicEpoch2SignedSubmissionIntentV1({
      intent: wrongEpoch,
      calldata,
      signature: wrongEpochSignature,
      nowUnix: String(now),
      allowedTargets: [target],
      consumedDigests: new Set(),
    }),
  "execution_epoch_mismatch",
);

const wrongGateway = {
  ...intent,
  gateway_id: "0x" + "11".repeat(32),
};
const wrongGatewaySignature = await signIntent(wallet, wrongGateway);
await expectHold(
  async () =>
    verifyVoidEconomicEpoch2SignedSubmissionIntentV1({
      intent: wrongGateway,
      calldata,
      signature: wrongGatewaySignature,
      nowUnix: String(now),
      allowedTargets: [target],
      consumedDigests: new Set(),
    }),
  "gateway_id_mismatch",
);

const wrongValue = {
  ...intent,
  value_wei: "1",
};
const wrongValueSignature = await signIntent(wallet, wrongValue);
await expectHold(
  async () =>
    verifyVoidEconomicEpoch2SignedSubmissionIntentV1({
      intent: wrongValue,
      calldata,
      signature: wrongValueSignature,
      nowUnix: String(now),
      allowedTargets: [target],
      consumedDigests: new Set(),
    }),
  "native_value_forbidden",
);

const oversizedNonce = {
  ...intent,
  nonce: "9".repeat(1000),
};
await expectHold(
  async () =>
    verifyVoidEconomicEpoch2SignedSubmissionIntentV1({
      intent: oversizedNonce,
      calldata,
      signature,
      nowUnix: String(now),
      allowedTargets: [target],
      consumedDigests: new Set(),
    }),
  "nonce_invalid",
);

const noncanonicalNonce = {
  ...intent,
  nonce: "07",
};
await expectHold(
  async () =>
    verifyVoidEconomicEpoch2SignedSubmissionIntentV1({
      intent: noncanonicalNonce,
      calldata,
      signature,
      nowUnix: String(now),
      allowedTargets: [target],
      consumedDigests: new Set(),
    }),
  "nonce_invalid",
);

const extraField = {
  ...intent,
  surprise: true,
};
await expectHold(
  async () =>
    verifyVoidEconomicEpoch2SignedSubmissionIntentV1({
      intent: extraField,
      calldata,
      signature,
      nowUnix: String(now),
      allowedTargets: [target],
      consumedDigests: new Set(),
    }),
  "intent_schema_mismatch",
);

const wrongSignerSignature = await otherWallet.signTypedData(
  typed.domain,
  typed.types,
  typed.value,
);
await expectHold(
  async () =>
    verifyVoidEconomicEpoch2SignedSubmissionIntentV1({
      intent,
      calldata,
      signature: wrongSignerSignature,
      nowUnix: String(now),
      allowedTargets: [target],
      consumedDigests: new Set(),
    }),
  "signature_signer_mismatch",
);

const wrongChainSignature = await wallet.signTypedData(
  {
    ...typed.domain,
    chainId: 2051,
  },
  typed.types,
  typed.value,
);
await expectHold(
  async () =>
    verifyVoidEconomicEpoch2SignedSubmissionIntentV1({
      intent,
      calldata,
      signature: wrongChainSignature,
      nowUnix: String(now),
      allowedTargets: [target],
      consumedDigests: new Set(),
    }),
  "signature_signer_mismatch",
);

await expectHold(
  async () =>
    buildVoidEconomicEpoch2SignedSubmissionIntentV1({
      signer,
      nonce: "8",
      issuedAtUnix: String(now),
      expiresAtUnix: String(now + 301n),
      target,
      gasLimit: "100000",
      calldata,
    }),
  "intent_ttl_above_policy_maximum",
);

await expectHold(
  async () =>
    buildVoidEconomicEpoch2SignedSubmissionIntentV1({
      signer,
      nonce: "8",
      issuedAtUnix: String(now),
      expiresAtUnix: String(now + 100n),
      target,
      gasLimit: "3000001",
      calldata,
    }),
  "gas_limit_above_policy_maximum",
);

assert.deepEqual(
  VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_AUTHORITY_V1,
  {
    source_only: true,
    signature_verification: true,
    local_replay_set_observation: true,
    runtime_route_active: false,
    public_submission_open: false,
    rpc_call: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    wallet_access: false,
    private_key_access: false,
    credential_content_access: false,
    authoritative_chain2050_write: false,
    token_movement: false,
    funds_movement: false,
    migration_authorized: false,
    public_activation: false,
  },
);

console.log("VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_INTENT_V1_PROOF_GREEN");
console.log("chain_id=2050");
console.log("execution_epoch=2");
console.log("eip712_domain_bound=true");
console.log("gateway_identity_bound=true");
console.log("signer_bound=true");
console.log("nonce_bound=true");
console.log("decimal_length_bounded_before_bigint=true");
console.log("expiry_bound=true");
console.log("target_allowlist_required=true");
console.log("native_value_zero_required=true");
console.log("gas_limit_bounded=true");
console.log("calldata_hash_bound=true");
console.log("atomic_replay_digest_consume_required=true");
console.log("wrong_chain_signature_rejected=true");
console.log("wrong_epoch_rejected=true");
console.log("replay_rejected=true");
console.log("runtime_route_active=false");
console.log("signed_submission_source_primitive_proven=true");
console.log("execution_epoch_bound_in_public_gateway=true");
console.log("cross_epoch_replay_protection_proven=false");
console.log("transaction_submission=false");
console.log("transaction_broadcast=false");
console.log("authoritative_chain2050_write=false");
console.log("migration_authorized=false");
console.log("public_activation=false");
