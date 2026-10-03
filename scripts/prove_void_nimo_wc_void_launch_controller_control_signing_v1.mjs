#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import * as ethers from "ethers";

import {
  prepareVoidWcVoidLaunchControllerControlChallengeV1,
  verifyVoidWcVoidLaunchControllerControlSignatureV1,
} from "../tools/void-wc-void-launch-controller-control-requalification-v1.mjs";

import {
  SELECTED_REVIEWER_ADDRESS_V1,
  SIGNATURE_MARKER_V1,
  VOID_NIMO_WC_VOID_LAUNCH_CONTROLLER_CONTROL_SIGNING_AUTHORITY_V1,
  VOID_NIMO_WC_VOID_LAUNCH_CONTROLLER_CONTROL_SIGNING_V1,
  reviewedOfflineSigningRuntimeV1,
  signControlChallengeCoreV1,
} from "../ops/nimo/void-nimo-wc-void-launch-controller-control-signing-v1.mjs";

const PRIVATE_A =
  "0x1111111111111111111111111111111111111111111111111111111111111111";
const PRIVATE_B =
  "0x2222222222222222222222222222222222222222222222222222222222222222";
const NONCE =
  "0x3333333333333333333333333333333333333333333333333333333333333333";

const walletA = new ethers.Wallet(PRIVATE_A);
const walletB = new ethers.Wallet(PRIVATE_B);
const now = Math.floor(Date.now() / 1000);

const challenge =
  prepareVoidWcVoidLaunchControllerControlChallengeV1({
    candidateAddress: walletA.address,
    nowUnix: now,
    ttlSeconds: 900,
    nonce: NONCE,
  });

const envelope = await signControlChallengeCoreV1({
  challengeEnvelope: challenge,
  privateKey: PRIVATE_A,
  expectedAddress: walletA.address,
  nowUnix: now,
  ethers,
});

assert.equal(envelope.marker, SIGNATURE_MARKER_V1);
assert.equal(envelope.version, 1);
assert.equal(envelope.challenge_id, challenge.challenge_id);
assert.match(envelope.signature, /^0x[0-9a-fA-F]{130}$/u);

const verified =
  await verifyVoidWcVoidLaunchControllerControlSignatureV1({
    challengeEnvelope: challenge,
    signatureEnvelope: envelope,
    nowUnix: now,
  });

assert.equal(
  verified.candidate_address,
  walletA.address.toLowerCase(),
);
assert.equal(verified.control_verified, true);
assert.equal(verified.role_binding_authorized, false);
assert.equal(verified.deployment_authorized, false);
assert.equal(verified.funds_movement_authorized, false);

await assert.rejects(
  () =>
    signControlChallengeCoreV1({
      challengeEnvelope: challenge,
      privateKey: PRIVATE_B,
      expectedAddress: walletA.address,
      nowUnix: now,
      ethers,
    }),
  /launch_controller_private_key_address_mismatch/u,
);

await assert.rejects(
  () =>
    signControlChallengeCoreV1({
      challengeEnvelope: challenge,
      privateKey: PRIVATE_A,
      expectedAddress: walletB.address,
      nowUnix: now,
      ethers,
    }),
  /control_challenge_semantics_invalid/u,
);

await assert.rejects(
  () =>
    signControlChallengeCoreV1({
      challengeEnvelope: challenge,
      privateKey: PRIVATE_A,
      expectedAddress: walletA.address,
      nowUnix: now + 901,
      ethers,
    }),
  /control_challenge_expired/u,
);

{
  const tampered = structuredClone(challenge);
  tampered.typed_data.value.nonce =
    "0x4444444444444444444444444444444444444444444444444444444444444444";
  await assert.rejects(
    () =>
      signControlChallengeCoreV1({
        challengeEnvelope: tampered,
        privateKey: PRIVATE_A,
        expectedAddress: walletA.address,
        nowUnix: now,
        ethers,
      }),
    /control_typed_data_semantics_invalid/u,
  );
}

const runtime = await reviewedOfflineSigningRuntimeV1();
assert.equal(
  runtime.reviewed_runtime_profile_id,
  "voidrnpr1_bb76a6a16b4fb779edffb4f541f7a91d0ddb00bfe404031b4387840e74001e77",
);
assert.equal(
  runtime.reviewed_packages_aggregate_sha256,
  "5ac562a4396ef1d7ec302ef3af4eba7de7f2e62d478ee83fc30814d13d8d3b73",
);
assert.equal(runtime.ethers_version, "6.17.0");
assert.equal(runtime.private_key_access, false);
assert.equal(runtime.network_access_required, false);
assert.equal(runtime.transaction_signing, false);
assert.equal(runtime.funds_movement, false);

{
  const packageFile = path.resolve("node_modules/ethers/package.json");
  const original = fs.readFileSync(packageFile);
  const originalMode = fs.statSync(packageFile).mode & 0o777;
  try {
    fs.chmodSync(packageFile, 0o600);
    fs.writeFileSync(
      packageFile,
      Buffer.concat([original, Buffer.from(" ", "utf8")]),
    );
    await assert.rejects(
      () => reviewedOfflineSigningRuntimeV1(),
      /reviewed_node_runtime_/u,
    );
  } finally {
    fs.writeFileSync(packageFile, original);
    fs.chmodSync(packageFile, originalMode);
  }
}

const signerSource = fs.readFileSync(
  "ops/nimo/void-nimo-wc-void-launch-controller-control-signing-v1.mjs",
  "utf8",
);

assert.equal(
  signerSource.includes(
    ".local/share/void/offline-keys/wc-void-launch-controller-v1/private-key.hex",
  ),
  true,
);
assert.equal(signerSource.includes('"key-file"'), false);
assert.equal(
  signerSource.includes('/^(?:0x)?[0-9a-fA-F]{64}\\n?$/u'),
  true,
);
assert.equal(signerSource.includes(".trim()"), false);
assert.equal(signerSource.includes("http:"), false);
assert.equal(signerSource.includes("https:"), false);
assert.equal(signerSource.includes("fetch("), false);
assert.equal(signerSource.includes("WebSocket"), false);
assert.equal(signerSource.includes("JsonRpcProvider"), false);
assert.equal(signerSource.includes("transaction_signing: false"), true);
assert.equal(signerSource.includes("transaction_broadcast: false"), true);
assert.equal(signerSource.includes("funds_movement: false"), true);

assert.equal(
  SELECTED_REVIEWER_ADDRESS_V1,
  "0x2f1e0005e865b772b268bd8c797bf3eaa901d97e",
);
assert.deepEqual(
  VOID_NIMO_WC_VOID_LAUNCH_CONTROLLER_CONTROL_SIGNING_AUTHORITY_V1,
  {
    offline_operator_action: true,
    fixed_selected_reviewer_only: true,
    exact_public_challenge_required: true,
    reviewed_ethers_runtime_required: true,
    private_key_path_fixed: true,
    private_key_printed: false,
    private_key_copied_to_repository: false,
    private_key_exported: false,
    network_access_required: false,
    rpc_call: false,
    wallet_provider_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    chain2050_write: false,
    credential_access: false,
    wc_ledger_write: false,
    runtime_service_mutation: false,
    deployment_authorized: false,
    inventory_funding_authorized: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
  },
);

console.log(
  "VOID_NIMO_WC_VOID_LAUNCH_CONTROLLER_CONTROL_SIGNING_V1_PROOF_GREEN",
);
console.log("synthetic_typed_data_signature_verified=true");
console.log("wrong_private_key_rejected=true");
console.log("wrong_candidate_rejected=true");
console.log("expired_challenge_rejected=true");
console.log("typed_data_tamper_rejected=true");
console.log("reviewed_ethers_runtime_verified=true");
console.log("ambient_ethers_byte_drift_rejected_before_key_access=true");
console.log("selected_reviewer_fixed=true");
console.log("private_key_path_fixed=true");
console.log("key_file_cli_override=false");
console.log("exact_private_key_file_format=true");
console.log("private_key_whitespace_normalization=false");
console.log("network_access_required=false");
console.log("transaction_signing=false");
console.log("transaction_broadcast=false");
console.log("chain2050_write=false");
console.log("funds_movement=false");
console.log(
  "marker=" +
    VOID_NIMO_WC_VOID_LAUNCH_CONTROLLER_CONTROL_SIGNING_V1,
);
