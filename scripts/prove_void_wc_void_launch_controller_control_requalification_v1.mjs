#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { Wallet } from "ethers";

import {
  VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_AUTHORITY_V1,
  VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_CHALLENGE_V1,
  VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_EVIDENCE_V1,
  VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_REQUALIFICATION_V1,
  VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_SIGNATURE_V1,
  VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_DOMAIN_V1,
  VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_TYPES_V1,
  VOID_WC_VOID_LAUNCH_CONTROLLER_HISTORICAL_REFERENCE_V1,
  buildVoidWcVoidLaunchControllerControlSignatureEnvelopeV1,
  canonicalJson,
  prepareVoidWcVoidLaunchControllerControlChallengeV1,
  reverifyVoidWcVoidLaunchControllerControlEvidenceV1,
  verifyVoidWcVoidLaunchControllerControlSignatureV1,
  voidWcVoidLaunchControllerControlDigestV1,
} from "../tools/void-wc-void-launch-controller-control-requalification-v1.mjs";

const TOOL =
  "tools/void-wc-void-launch-controller-control-requalification-v1.mjs";
const WORKFLOW =
  ".github/workflows/void-wc-void-launch-controller-control-requalification-v1.yml";
const COUPLED =
  "ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json";
const IDENTITY =
  "ops/mainnet0/wc-void-market-vault-compiled-identity-acceptance-v1.json";

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function pretty(value) {
  return Buffer.from(JSON.stringify(value, null, 2) + "\n", "utf8");
}

async function rejects(fn, pattern) {
  let error = null;
  try {
    await fn();
  } catch (caught) {
    error = caught;
  }
  assert(error instanceof Error);
  assert.match(error.message, pattern);
}

assert.equal(
  VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_REQUALIFICATION_V1,
  "VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_REQUALIFICATION_V1",
);
assert.equal(
  VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_CHALLENGE_V1,
  "VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_CHALLENGE_V1",
);
assert.equal(
  VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_SIGNATURE_V1,
  "VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_SIGNATURE_V1",
);
assert.equal(
  VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_EVIDENCE_V1,
  "VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_EVIDENCE_V1",
);
assert.deepEqual(
  VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_AUTHORITY_V1,
  {
    source_only_control_verification: true,
    public_challenge_material: true,
    public_signature_material: true,
    signature_verification: true,
    current_source_binding_required: true,
    private_key_access: false,
    credential_access: false,
    wallet_or_signer_access: false,
    transaction_construction: false,
    transaction_signing_performed: false,
    transaction_broadcast: false,
    chain2050_write: false,
    role_binding_authorized: false,
    deployment_authorized: false,
    inventory_funding_authorized: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
  },
);
assert.deepEqual(
  VOID_WC_VOID_LAUNCH_CONTROLLER_HISTORICAL_REFERENCE_V1,
  {
    address: "0x2f1e0005e865b772b268bd8c797bf3eaa901d97e",
    public_identity_sha256:
      "7ca273a6b188e64e7099d57e7705345559fe7156c12406cde5097ce47350f431",
    source_generation: "2026-09-25",
    current_authority: false,
    signing_challenge_previously_verified: false,
  },
);

assert.equal(
  VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_DOMAIN_V1.chainId,
  2050,
);
assert.deepEqual(
  Object.keys(VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_TYPES_V1),
  ["LaunchControllerControl"],
);

const fixtureWallet = Wallet.createRandom();
const otherWallet = Wallet.createRandom();
const now = 2_000_000_000;
const nonce = "0x" + "11".repeat(32);
const challenge =
  prepareVoidWcVoidLaunchControllerControlChallengeV1({
    candidateAddress: fixtureWallet.address,
    nowUnix: now,
    ttlSeconds: 300,
    nonce,
  });

assert.match(challenge.challenge_id, /^voidwclcc1_[0-9a-f]{64}$/u);
assert.equal(challenge.challenge.marker, VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_CHALLENGE_V1);
assert.equal(challenge.challenge.execution_epoch, "2");
assert.equal(challenge.challenge.candidate_address, fixtureWallet.address.toLowerCase());
assert.equal(
  challenge.challenge.coupled_launch_id,
  "0xfe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26",
);
assert.equal(
  challenge.challenge.compiled_identity_id,
  "voidwcvci1_51841520b1db294e44023c127bbe7caa28d8f87a97c788109b6609222941125a",
);
assert.equal(
  challenge.challenge.void_token,
  "0x470075b85352eb86f7d089fb9ba88945f12aad94",
);
assert.equal(challenge.challenge.nonce, nonce);
assert.equal(challenge.challenge.issued_at_unix, String(now));
assert.equal(challenge.challenge.expires_at_unix, String(now + 300));
assert.equal(
  challenge.typed_data_digest,
  voidWcVoidLaunchControllerControlDigestV1(challenge.challenge),
);
assert.equal(
  canonicalJson(challenge.typed_data.domain),
  canonicalJson(VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_DOMAIN_V1),
);
assert.equal(
  canonicalJson(challenge.typed_data.types),
  canonicalJson(VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_TYPES_V1),
);

const signature = await fixtureWallet.signTypedData(
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

assert.match(evidence.evidence_id, /^voidwlcce1_[0-9a-f]{64}$/u);
assert.equal(
  evidence.status,
  "CANDIDATE_CONTROL_VERIFIED_ROLE_NOT_AUTHORIZED",
);
assert.equal(evidence.candidate_address, fixtureWallet.address.toLowerCase());
assert.equal(evidence.control_verified, true);
assert.equal(evidence.role_binding_authorized, false);
assert.equal(evidence.deployment_authorized, false);
assert.equal(evidence.inventory_funding_authorized, false);
assert.equal(evidence.market_activation_authorized, false);
assert.equal(evidence.public_presale_activation_authorized, false);
assert.equal(evidence.funds_movement_authorized, false);
assert.equal(evidence.typed_data_digest, challenge.typed_data_digest);
assert.equal(evidence.signature, signature);

assert.deepEqual(evidence.challenge_envelope, challenge);
assert.deepEqual(evidence.signature_envelope, signatureEnvelope);

const reverifiedEvidence =
  await reverifyVoidWcVoidLaunchControllerControlEvidenceV1({
    evidence,
    nowUnix: now + 2,
  });
assert.equal(reverifiedEvidence.evidence_id, evidence.evidence_id);
assert.equal(reverifiedEvidence.evidence_reverified, true);
assert.equal(reverifiedEvidence.reverified_at_unix, String(now + 2));
assert.equal(
  reverifiedEvidence.verified_at_unix,
  evidence.verified_at_unix,
);

const forgedEvidence = structuredClone(evidence);
forgedEvidence.coupled_launch_id =
  "sha256:" + "f".repeat(64);
await rejects(
  () =>
    reverifyVoidWcVoidLaunchControllerControlEvidenceV1({
      evidence: forgedEvidence,
      nowUnix: now + 2,
    }),
  /control_evidence_reverification_mismatch:coupled_launch_id/u,
);

await rejects(
  () =>
    reverifyVoidWcVoidLaunchControllerControlEvidenceV1({
      evidence,
      nowUnix: now + 300,
    }),
  /control_challenge_expired/u,
);

const wrongSignature = await otherWallet.signTypedData(
  challenge.typed_data.domain,
  challenge.typed_data.types,
  challenge.typed_data.value,
);
await rejects(
  () =>
    verifyVoidWcVoidLaunchControllerControlSignatureV1({
      challengeEnvelope: challenge,
      signatureEnvelope:
        buildVoidWcVoidLaunchControllerControlSignatureEnvelopeV1({
          challengeId: challenge.challenge_id,
          signature: wrongSignature,
        }),
      nowUnix: now + 1,
    }),
  /control_signature_candidate_mismatch/u,
);

await rejects(
  () =>
    verifyVoidWcVoidLaunchControllerControlSignatureV1({
      challengeEnvelope: challenge,
      signatureEnvelope,
      nowUnix: now + 300,
    }),
  /control_challenge_expired/u,
);
await rejects(
  () =>
    verifyVoidWcVoidLaunchControllerControlSignatureV1({
      challengeEnvelope: challenge,
      signatureEnvelope,
      nowUnix: now - 1,
    }),
  /control_challenge_not_yet_valid/u,
);

const wrongChallengeId = structuredClone(signatureEnvelope);
wrongChallengeId.challenge_id = "voidwclcc1_" + "f".repeat(64);
await rejects(
  () =>
    verifyVoidWcVoidLaunchControllerControlSignatureV1({
      challengeEnvelope: challenge,
      signatureEnvelope: wrongChallengeId,
      nowUnix: now + 1,
    }),
  /control_signature_envelope_invalid/u,
);

const typedDataDrift = structuredClone(challenge);
typedDataDrift.typed_data.value.compiled_identity_id = "drift";
await rejects(
  () =>
    verifyVoidWcVoidLaunchControllerControlSignatureV1({
      challengeEnvelope: typedDataDrift,
      signatureEnvelope,
      nowUnix: now + 1,
    }),
  /control_challenge_typed_data_mismatch/u,
);

const sourceDrift = structuredClone(challenge);
sourceDrift.source_binding.source_blobs[COUPLED] =
  "f".repeat(40);
await rejects(
  () =>
    verifyVoidWcVoidLaunchControllerControlSignatureV1({
      challengeEnvelope: sourceDrift,
      signatureEnvelope,
      nowUnix: now + 1,
    }),
  /control_source_binding_blob_invalid/u,
);

let typedGetterCalls = 0;
const typedAccessor = structuredClone(challenge);
Object.defineProperty(
  typedAccessor.typed_data.value,
  "compiled_identity_id",
  {
    enumerable: true,
    get() {
      typedGetterCalls += 1;
      return challenge.challenge.compiled_identity_id;
    },
  },
);
await rejects(
  () =>
    verifyVoidWcVoidLaunchControllerControlSignatureV1({
      challengeEnvelope: typedAccessor,
      signatureEnvelope,
      nowUnix: now + 1,
    }),
  /control_typed_data_value_data_property_required:compiled_identity_id/u,
);
assert.equal(
  typedGetterCalls,
  0,
  "typed-data getter must not execute",
);

let getterCalls = 0;
const accessorChallenge = {
  ...structuredClone(challenge),
};
Object.defineProperty(accessorChallenge, "challenge_id", {
  enumerable: true,
  get() {
    getterCalls += 1;
    return challenge.challenge_id;
  },
});
await rejects(
  () =>
    verifyVoidWcVoidLaunchControllerControlSignatureV1({
      challengeEnvelope: accessorChallenge,
      signatureEnvelope,
      nowUnix: now + 1,
    }),
  /control_challenge_envelope_data_property_required:challenge_id/u,
);
assert.equal(getterCalls, 0);

assert.throws(
  () =>
    prepareVoidWcVoidLaunchControllerControlChallengeV1({
      candidateAddress: fixtureWallet.address,
      nowUnix: now,
      ttlSeconds: 59,
      nonce,
    }),
  /control_ttl_out_of_range/u,
);
assert.throws(
  () =>
    prepareVoidWcVoidLaunchControllerControlChallengeV1({
      candidateAddress: fixtureWallet.address,
      nowUnix: now,
      ttlSeconds: 1801,
      nonce,
    }),
  /control_ttl_out_of_range/u,
);

const forbiddenRepoOutput = path.join(
  process.cwd(),
  "void-launch-controller-control-live-evidence-forbidden.json",
);
try {
  fs.unlinkSync(forbiddenRepoOutput);
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}
const forbiddenOutputRun = spawnSync(
  process.execPath,
  [
    TOOL,
    "prepare",
    "--candidate-address",
    fixtureWallet.address,
    "--output",
    forbiddenRepoOutput,
  ],
  { encoding: "utf8" },
);
assert.notEqual(forbiddenOutputRun.status, 0);
assert.match(
  forbiddenOutputRun.stderr,
  /control_output_must_be_outside_repository/u,
);
assert.equal(fs.existsSync(forbiddenRepoOutput), false);

const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-launch-controller-control-proof-"),
);
try {
  fs.chmodSync(temp, 0o700);
  const challengeFile = path.join(temp, "challenge.json");
  const signatureFile = path.join(temp, "signature.json");
  const evidenceFile = path.join(temp, "evidence.json");

  const prepareCli = spawnSync(
    process.execPath,
    [
      TOOL,
      "prepare",
      "--candidate-address",
      fixtureWallet.address,
      "--ttl-seconds",
      "300",
      "--output",
      challengeFile,
    ],
    { encoding: "utf8" },
  );
  assert.equal(prepareCli.status, 0, prepareCli.stderr || prepareCli.stdout);
  assert.match(prepareCli.stdout, /status=CHALLENGE_PREPARED_NO_AUTHORITY/u);
  assert.match(prepareCli.stdout, /role_binding_authorized=false/u);
  assert.equal(fs.statSync(challengeFile).mode & 0o077, 0);

  const cliChallengeBytes = fs.readFileSync(challengeFile);
  const cliChallenge = JSON.parse(cliChallengeBytes.toString("utf8"));
  const cliSignature = await fixtureWallet.signTypedData(
    cliChallenge.typed_data.domain,
    cliChallenge.typed_data.types,
    cliChallenge.typed_data.value,
  );
  const cliSignatureEnvelope =
    buildVoidWcVoidLaunchControllerControlSignatureEnvelopeV1({
      challengeId: cliChallenge.challenge_id,
      signature: cliSignature,
    });
  fs.writeFileSync(signatureFile, pretty(cliSignatureEnvelope), {
    mode: 0o600,
  });
  fs.chmodSync(signatureFile, 0o600);

  const verifyCli = spawnSync(
    process.execPath,
    [
      TOOL,
      "verify",
      "--challenge",
      challengeFile,
      "--challenge-sha256",
      sha256(cliChallengeBytes),
      "--signature",
      signatureFile,
      "--signature-sha256",
      sha256(fs.readFileSync(signatureFile)),
      "--output",
      evidenceFile,
    ],
    { encoding: "utf8" },
  );
  assert.equal(verifyCli.status, 0, verifyCli.stderr || verifyCli.stdout);
  assert.match(
    verifyCli.stdout,
    /status=CANDIDATE_CONTROL_VERIFIED_ROLE_NOT_AUTHORIZED/u,
  );
  assert.match(verifyCli.stdout, /control_verified=true/u);
  assert.match(verifyCli.stdout, /deployment_authorized=false/u);
  assert.match(verifyCli.stdout, /funds_movement=false/u);
  assert.equal(fs.statSync(evidenceFile).mode & 0o077, 0);

  const cliEvidence = JSON.parse(fs.readFileSync(evidenceFile, "utf8"));
  assert.equal(cliEvidence.control_verified, true);
  assert.equal(cliEvidence.role_binding_authorized, false);
  const cliReverified =
    await reverifyVoidWcVoidLaunchControllerControlEvidenceV1({
      evidence: cliEvidence,
      nowUnix: Number(cliEvidence.verified_at_unix),
    });
  assert.equal(cliReverified.evidence_id, cliEvidence.evidence_id);
  assert.equal(cliReverified.evidence_reverified, true);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

const toolSource = fs.readFileSync(TOOL, "utf8");
for (const forbidden of [
  "privateKey",
  "new Wallet(",
  "Wallet.createRandom",
  ".signTypedData(",
  ".signMessage(",
  "signTransaction(",
  "sendTransaction(",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "systemctl",
  "sudo ",
  "JsonRpcProvider",
]) {
  assert.equal(toolSource.includes(forbidden), false, forbidden);
}

const workflow = fs.readFileSync(WORKFLOW, "utf8");
const dependencies = [
  WORKFLOW,
  "docs/operators/wc-void-launch-controller-control-requalification-v1.md",
  "scripts/prove_void_wc_void_launch_controller_control_requalification_v1.mjs",
  TOOL,
  COUPLED,
  IDENTITY,
  "package.json",
  "package-lock.json",
];
const prStart = workflow.indexOf("  pull_request:\n");
const pushStart = workflow.indexOf("  push:\n");
const permissionsStart = workflow.indexOf("\npermissions:\n");
assert(prStart >= 0 && pushStart > prStart && permissionsStart > pushStart);
const prBlock = workflow.slice(prStart, pushStart);
const pushBlock = workflow.slice(pushStart, permissionsStart);
for (const dependency of dependencies) {
  const token = `- "${dependency}"`;
  assert.equal(prBlock.split(token).length - 1, 1, dependency);
  assert.equal(pushBlock.split(token).length - 1, 1, dependency);
}
assert.match(workflow, /actions\/checkout@[0-9a-f]{40}/u);
assert.match(workflow, /actions\/setup-node@[0-9a-f]{40}/u);
assert.match(workflow, /persist-credentials:\s*false/u);
assert.match(workflow, /fetch-depth:\s*0/u);
assert.doesNotMatch(
  workflow,
  /uses: actions\/(?:checkout|setup-node)@v[0-9]/u,
);

console.log(
  "VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_REQUALIFICATION_V1_PROOF_GREEN",
);
console.log("eip712_chain2050_control_signature_green=true");
console.log("current_launch_source_binding_green=true");
console.log("source_head_ancestry_required=true");
console.log("candidate_address_control_only=true");
console.log("historical_launch_controller_current_authority=false");
console.log("historical_signing_challenge_previously_verified=false");
console.log("challenge_ttl_bounded_green=true");
console.log("wrong_signer_held_green=true");
console.log("expired_challenge_held_green=true");
console.log("source_drift_held_green=true");
console.log("accessor_nonexecution_green=true");
console.log("typed_data_accessor_nonexecution_green=true");
console.log("cli_round_trip_green=true");
console.log("self_contained_evidence_reverification_green=true");
console.log("forged_evidence_summary_held_green=true");\nconsole.log("live_evidence_outside_repository_green=true");
console.log("role_binding_authorized=false");
console.log("deployment_authorized=false");
console.log("inventory_funding_authorized=false");
console.log("market_activation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
