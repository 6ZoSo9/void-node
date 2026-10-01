#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { Wallet } from "ethers";

import {
  buildVoidWcVoidLaunchControllerControlSignatureEnvelopeV1,
  prepareVoidWcVoidLaunchControllerControlChallengeV1,
  verifyVoidWcVoidLaunchControllerControlSignatureV1,
} from "../tools/void-wc-void-launch-controller-control-requalification-v1.mjs";
import {
  VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_AUTHORITY_V1,
  VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_SOURCE_BLOBS_V1,
  VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_V1,
  qualifyVoidWcVoidMarketVaultRoleDeploymentV1,
} from "../tools/void-wc-void-market-vault-role-deployment-qualification-v1.mjs";

const TOOL =
  "tools/void-wc-void-market-vault-role-deployment-qualification-v1.mjs";
const CONTROL_TOOL =
  "tools/void-wc-void-launch-controller-control-requalification-v1.mjs";
const DOC =
  "docs/operators/wc-void-market-vault-role-deployment-qualification-v1.md";
const VOID_TOKEN =
  "0x470075b85352eb86f7d089fb9ba88945f12aad94";
const SETTLEMENT_EXECUTOR =
  "0xc884f631c3881b8b672bfcbf019c856146cd7f73";
const CLOSEOUT_CONTROLLER =
  "0xe1f147b6b2671f140c4107fa4a1dd5f7cbd06d0b";
const LAUNCH =
  "sha256:fe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26";
const LAUNCH_BYTES32 =
  "0xfe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26";
const IDENTITY =
  "voidwcvci1_51841520b1db294e44023c127bbe7caa28d8f87a97c788109b6609222941125a";
const CREATION_SHA =
  "9fae041d06d317b326fd1a9cee6efc34fa0e214b74a9447e44131969d886a5af";

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
  VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_V1,
  "VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_V1",
);

const trueAuthorityKeys = new Set([
  "source_qualification_only",
  "canonical_git_source_binding_required",
  "actual_worktree_blob_binding_required",
  "launch_controller_control_reverification",
  "reviewed_control_execution_from_exact_git_objects",
  "private_reviewed_source_materialization",
  "git_replacement_objects_disabled",
  "settlement_executor_public_identity_rederivation",
  "closeout_controller_public_identity_rederivation",
  "role_separation_verification",
  "constructor_data_derivation",
  "reviewed_git_executable_required",
  "ambient_git_overrides_rejected",
]);
for (const [key, value] of Object.entries(
  VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_AUTHORITY_V1,
)) {
  assert.equal(value, trueAuthorityKeys.has(key), key);
}
assert.equal(
  Object.keys(
    VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_SOURCE_BLOBS_V1,
  ).length,
  9,
);

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
const evidenceSha = sha256(evidenceBytes);

const request = {
  launchControllerEvidenceBytes: evidenceBytes,
  launchControllerEvidenceFileSha256: evidenceSha,
  evaluationTimeUnix: String(now + 2),
};

const qualified =
  await qualifyVoidWcVoidMarketVaultRoleDeploymentV1(request);

assert.equal(
  qualified.status,
  "QUALIFIED_DEPLOYMENT_PREPARATION_READY_NOT_AUTHORIZED",
);
assert.equal(qualified.chain_id, 2050);
assert.equal(qualified.execution_epoch, 2);
assert.equal(qualified.coupled_launch_id, LAUNCH);
assert.equal(
  qualified.launch_controller.address,
  wallet.address.toLowerCase(),
);
assert.equal(qualified.launch_controller.evidence_id, evidence.evidence_id);
assert.equal(qualified.launch_controller.control_verified, true);
assert.equal(qualified.launch_controller.role_binding_authorized, false);
assert.equal(qualified.settlement_executor.address, SETTLEMENT_EXECUTOR);
assert.equal(qualified.closeout_controller.address, CLOSEOUT_CONTROLLER);
assert.equal(qualified.role_separation.all_addresses_nonzero, true);
assert.equal(qualified.role_separation.all_addresses_distinct, true);
assert.equal(
  qualified.role_separation.void_token_distinct_from_all_roles,
  true,
);
assert.equal(qualified.vault_identity.canonical_void_token, VOID_TOKEN);
assert.equal(
  qualified.vault_identity.accepted_compiled_identity_id,
  IDENTITY,
);
assert.equal(
  qualified.vault_identity.creation_bytecode_sha256,
  CREATION_SHA,
);
assert.equal(
  qualified.deployment_preparation.constructor.values.void_token,
  VOID_TOKEN,
);
assert.equal(
  qualified.deployment_preparation.constructor.values.launch_controller,
  wallet.address.toLowerCase(),
);
assert.equal(
  qualified.deployment_preparation.constructor.values.settlement_executor,
  SETTLEMENT_EXECUTOR,
);
assert.equal(
  qualified.deployment_preparation.constructor.values.closeout_controller,
  CLOSEOUT_CONTROLLER,
);
assert.equal(
  qualified.deployment_preparation.constructor.values.coupled_launch_id,
  LAUNCH_BYTES32,
);
assert.match(
  qualified.deployment_preparation.constructor.abi_encoded_arguments_hex,
  /^0x[0-9a-f]+$/u,
);
assert.match(
  qualified.deployment_preparation.deployment_data_hex,
  /^0x[0-9a-f]+$/u,
);
assert.ok(qualified.deployment_preparation.deployment_data_bytes > 10_404);
assert.match(
  qualified.deployment_preparation.deployment_data_sha256,
  /^[0-9a-f]{64}$/u,
);
assert.match(
  qualified.deployment_preparation.deployment_data_keccak256,
  /^0x[0-9a-f]{64}$/u,
);
assert.equal(
  qualified.deployment_preparation.exact_creation_payload_ready,
  true,
);
for (const key of [
  "deployer_selected",
  "nonce_observed",
  "fee_observed",
  "transaction_envelope_ready",
  "deployment_authorized",
  "inventory_funding_authorized",
]) {
  assert.equal(qualified.deployment_preparation[key], false, key);
}
assert.equal(
  qualified.next_gate,
  "separately_authorized_exact_market_vault_deployment_and_inventory_lock",
);
assert.equal(qualified.authority.deployment, false);
assert.equal(qualified.authority.inventory_funding, false);
assert.equal(qualified.authority.transaction_envelope_construction, false);
assert.equal(qualified.authority.transaction_signing, false);
assert.equal(qualified.authority.transaction_broadcast, false);
assert.equal(qualified.authority.market_activation, false);
assert.equal(qualified.authority.public_presale_activation, false);
assert.equal(qualified.authority.funds_movement, false);
assert.match(qualified.qualification_id, /^voidwcvrdq1_[0-9a-f]{64}$/u);

const repeat =
  await qualifyVoidWcVoidMarketVaultRoleDeploymentV1(request);
assert.equal(repeat.qualification_id, qualified.qualification_id);
assert.equal(
  repeat.deployment_preparation.deployment_data_sha256,
  qualified.deployment_preparation.deployment_data_sha256,
);

await rejects(
  () =>
    qualifyVoidWcVoidMarketVaultRoleDeploymentV1({
      ...request,
      launchControllerEvidenceFileSha256: "0".repeat(64),
    }),
  /launch_controller_evidence_sha256_mismatch/u,
);

await rejects(
  () =>
    qualifyVoidWcVoidMarketVaultRoleDeploymentV1({
      ...request,
      evaluationTimeUnix: String(now + 300),
    }),
  /control_challenge_expired/u,
);

{
  const forged = structuredClone(evidence);
  forged.compiled_identity_id = "forged";
  const forgedBytes = pretty(forged);
  await rejects(
    () =>
      qualifyVoidWcVoidMarketVaultRoleDeploymentV1({
        ...request,
        launchControllerEvidenceBytes: forgedBytes,
        launchControllerEvidenceFileSha256: sha256(forgedBytes),
      }),
    /control_evidence_reverification_mismatch:compiled_identity_id|control_evidence_identity_invalid/u,
  );
}

await rejects(
  () =>
    qualifyVoidWcVoidMarketVaultRoleDeploymentV1({
      ...request,
      extra: true,
    }),
  /qualification_input_keys_invalid/u,
);

{
  const previous = process.env.GIT_DIR;
  process.env.GIT_DIR = "/tmp/void-forged-git-dir";
  try {
    await rejects(
      () => qualifyVoidWcVoidMarketVaultRoleDeploymentV1(request),
      /ambient_git_override_forbidden:GIT_DIR/u,
    );
  } finally {
    if (previous === undefined) delete process.env.GIT_DIR;
    else process.env.GIT_DIR = previous;
  }
}

{
  const original = fs.readFileSync(DOC);
  try {
    fs.appendFileSync(DOC, "\n");
    await rejects(
      () => qualifyVoidWcVoidMarketVaultRoleDeploymentV1(request),
      /repository_not_clean/u,
    );
  } finally {
    fs.writeFileSync(DOC, original);
  }
}

{
  const head = spawnSync(
    "/usr/bin/git",
    ["--no-replace-objects","rev-parse","HEAD"],
    { cwd:process.cwd(), encoding:"utf8" },
  );
  const parent = spawnSync(
    "/usr/bin/git",
    ["--no-replace-objects","rev-parse","HEAD^"],
    { cwd:process.cwd(), encoding:"utf8" },
  );
  assert.equal(head.status,0,head.stderr);
  assert.equal(parent.status,0,parent.stderr);
  const headSha=String(head.stdout).trim();
  const parentSha=String(parent.stdout).trim();
  const replaceRef="refs/replace/"+headSha;
  const install=spawnSync(
    "/usr/bin/git",
    ["--no-replace-objects","update-ref",replaceRef,parentSha],
    { cwd:process.cwd(), encoding:"utf8" },
  );
  assert.equal(install.status,0,install.stderr);
  try{
    const replacementSafe=
      await qualifyVoidWcVoidMarketVaultRoleDeploymentV1(request);
    assert.equal(replacementSafe.qualification_id,qualified.qualification_id);
  }finally{
    const remove=spawnSync(
      "/usr/bin/git",
      ["--no-replace-objects","update-ref","-d",replaceRef],
      { cwd:process.cwd(), encoding:"utf8" },
    );
    assert.equal(remove.status,0,remove.stderr);
  }
}

{
  const originalControl=fs.readFileSync(CONTROL_TOOL);
  const previous=
    process.env.VOID_TEST_VAULT_ROLE_QUALIFICATION_YIELD_AFTER_SOURCE_BINDING;
  process.env.VOID_TEST_VAULT_ROLE_QUALIFICATION_YIELD_AFTER_SOURCE_BINDING="1";
  try{
    const race=
      qualifyVoidWcVoidMarketVaultRoleDeploymentV1(request);
    fs.writeFileSync(
      CONTROL_TOOL,
      Buffer.concat([originalControl,Buffer.from("\n// test-race-mutated\n")]),
    );
    fs.writeFileSync(CONTROL_TOOL,originalControl);
    const isolated=await race;
    assert.equal(isolated.qualification_id,qualified.qualification_id);
  }finally{
    fs.writeFileSync(CONTROL_TOOL,originalControl);
    if(previous===undefined){
      delete process.env.VOID_TEST_VAULT_ROLE_QUALIFICATION_YIELD_AFTER_SOURCE_BINDING;
    }else{
      process.env.VOID_TEST_VAULT_ROLE_QUALIFICATION_YIELD_AFTER_SOURCE_BINDING=previous;
    }
  }
}

const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-wc-void-vault-qualification-"),
);
try {
  fs.chmodSync(temp, 0o700);
  const evidencePath = path.join(temp, "control-evidence.json");
  const output = path.join(temp, "qualification.json");
  fs.writeFileSync(evidencePath, evidenceBytes, { mode: 0o600 });

  const cli = spawnSync(
    process.execPath,
    [
      TOOL,
      "--control-evidence", evidencePath,
      "--expected-evidence-sha256", evidenceSha,
      "--evaluation-time-unix", String(now + 2),
      "--output", output,
    ],
    { cwd: process.cwd(), encoding: "utf8" },
  );
  assert.equal(cli.status, 0, cli.stderr || cli.stdout);
  assert.match(
    cli.stdout,
    /status=QUALIFIED_DEPLOYMENT_PREPARATION_READY_NOT_AUTHORIZED/u,
  );
  assert.match(cli.stdout, /exact_creation_payload_ready=true/u);
  assert.match(cli.stdout, /deployment_authorized=false/u);
  assert.match(cli.stdout, /inventory_funding_authorized=false/u);
  assert.equal(fs.statSync(output).mode & 0o077, 0);

  const second = spawnSync(
    process.execPath,
    [
      TOOL,
      "--control-evidence", evidencePath,
      "--expected-evidence-sha256", evidenceSha,
      "--evaluation-time-unix", String(now + 2),
      "--output", output,
    ],
    { cwd: process.cwd(), encoding: "utf8" },
  );
  assert.notEqual(second.status, 0);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

const source = fs.readFileSync(TOOL, "utf8");
for (const forbidden of [
  "new Wallet(",
  "signTypedData(",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "systemctl",
  "fetch(",
  "getTransactionCount",
  "getFeeData",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}
for (const required of [
  "withReviewedControlReverifier",
  "reviewed_control_execution_from_exact_git_objects: true",
  "private_reviewed_source_materialization: true",
  "git_replacement_objects_disabled: true",
  "GIT_NO_REPLACE_OBJECTS",
  "--no-replace-objects",
  "reverifyVoidWcVoidLaunchControllerControlEvidenceV1",
  "AbiCoder.defaultAbiCoder",
  "creation_bytecode_hex",
  "source_worktree_blob_mismatch",
  "ambient_git_override_forbidden",
  "canonical_origin_required",
  "deployment_data_sha256",
  "transaction_envelope_ready: false",
  "deployment_authorized: false",
  "inventory_funding_authorized: false",
]) {
  assert.equal(source.includes(required), true, required);
}

console.log(
  "VOID_WC_VOID_MARKET_VAULT_ROLE_DEPLOYMENT_QUALIFICATION_V1_PROOF_GREEN",
);
console.log("ephemeral_control_signature_verified=true");
console.log("launch_controller_control_reverified=true");
console.log("reviewed_control_execution_from_exact_git_objects=true");
console.log("git_replacement_ref_attack_held=true");
console.log("worktree_change_restore_execution_race_held=true");
console.log("settlement_executor_public_identity_rederived=true");
console.log("closeout_controller_public_identity_rederived=true");
console.log("all_role_addresses_distinct=true");
console.log("accepted_creation_bytecode_bound=true");
console.log("exact_constructor_data_derived=true");
console.log("ambient_git_override_held=true");
console.log("dirty_worktree_held=true");
console.log("create_only_private_output_green=true");
console.log("deployment_authorized=false");
console.log("inventory_funding_authorized=false");
console.log("market_activation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
