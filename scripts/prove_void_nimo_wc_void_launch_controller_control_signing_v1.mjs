#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import * as ethers from "ethers";

import {
  canonicalJson,
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
  validateSanitizedOfflineSignerEnvironmentV1,
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

{
  const temporary = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-offline-signer-launch-proof-"),
  );
  try {
    const challengePath = path.join(temporary, "challenge.json");
    const challengeBytes = Buffer.from(
      JSON.stringify(challenge, null, 2) + "\n",
      "utf8",
    );
    fs.writeFileSync(challengePath, challengeBytes, { mode: 0o600 });
    fs.chmodSync(challengePath, 0o600);
    const challengeSha = crypto
      .createHash("sha256")
      .update(challengeBytes)
      .digest("hex");
    const launcher = path.resolve(
      "ops/nimo/void-nimo-wc-void-launch-controller-control-signing-launch-v1.sh",
    );
    const result = spawnSync(
      "/usr/bin/env",
      [
        "-i",
        "HOME=/home/zoso",
        "PATH=/usr/bin:/bin",
        "LANG=C",
        "LC_ALL=C",
        "/bin/bash",
        "--noprofile",
        "--norc",
        launcher,
        "preflight",
        challengePath,
        challengeSha,
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    assert.equal(
      result.status,
      0,
      ["launcher preflight failed", result.stdout, result.stderr].join("\n"),
    );
    assert.match(
      result.stdout,
      /status=EXACT_REVIEWED_SIGNER_PREFLIGHT_GREEN/u,
    );
    assert.match(result.stdout, /repository_clean=true/u);
    assert.match(result.stdout, /critical_source_blobs_verified=true/u);
    assert.match(result.stdout, /private_key_access=false/u);
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}

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

{
  const forged = structuredClone(challenge);
  forged.source_binding.source_head_sha = "f".repeat(40);
  const bindingMaterial = {
    source_head_sha: forged.source_binding.source_head_sha,
    source_tree_sha: forged.source_binding.source_tree_sha,
    control_contract_git_blob_sha1:
      forged.source_binding.control_contract_git_blob_sha1,
    source_blobs: forged.source_binding.source_blobs,
    coupled_launch_id: forged.source_binding.coupled_launch_id,
    coupled_launch_id_bytes32:
      forged.source_binding.coupled_launch_id_bytes32,
    compiled_identity_id: forged.source_binding.compiled_identity_id,
    void_token: forged.source_binding.void_token,
  };
  const bindingDigest = crypto
    .createHash("sha256")
    .update(Buffer.from(canonicalJson(bindingMaterial), "utf8"))
    .digest("hex");
  forged.source_binding.source_binding_sha256 = bindingDigest;
  forged.challenge.source_binding_sha256 = "0x" + bindingDigest;
  forged.typed_data.value.source_binding_sha256 = "0x" + bindingDigest;
  forged.typed_data_digest = ethers.TypedDataEncoder.hash(
    forged.typed_data.domain,
    forged.typed_data.types,
    forged.typed_data.value,
  );
  const challengeMaterial = {
    marker: forged.marker,
    version: forged.version,
    challenge: forged.challenge,
    source_binding: forged.source_binding,
    typed_data: forged.typed_data,
  };
  forged.challenge_id =
    "voidwclcc1_" +
    crypto
      .createHash("sha256")
      .update(Buffer.from(canonicalJson(challengeMaterial), "utf8"))
      .digest("hex");

  await assert.rejects(
    () =>
      signControlChallengeCoreV1({
        challengeEnvelope: forged,
        privateKey: PRIVATE_A,
        expectedAddress: walletA.address,
        nowUnix: now,
        ethers,
      }),
    /offline_signer_current_head_not_exact_challenge_head/u,
  );
}

{
  const cleanEnv = {
    HOME: "/home/zoso",
    PATH: "/usr/bin:/bin",
    LANG: "C",
    LC_ALL: "C",
    VOID_NIMO_OFFLINE_SIGNER_LAUNCH_V1: "1",
  };
  const clean = validateSanitizedOfflineSignerEnvironmentV1(
    cleanEnv,
    "/usr/bin/node",
    [],
  );
  assert.equal(clean.sanitized_environment, true);
  assert.equal(clean.node_preload_flags_absent, true);

  assert.throws(
    () =>
      validateSanitizedOfflineSignerEnvironmentV1(
        { ...cleanEnv, NODE_OPTIONS: "--import=/tmp/evil.mjs" },
        "/usr/bin/node",
        [],
      ),
    /offline_signer_environment_not_sanitized/u,
  );
  assert.throws(
    () =>
      validateSanitizedOfflineSignerEnvironmentV1(
        cleanEnv,
        "/usr/bin/node",
        ["--import=/tmp/evil.mjs"],
      ),
    /offline_signer_node_preload_flags_forbidden/u,
  );
  assert.throws(
    () =>
      validateSanitizedOfflineSignerEnvironmentV1(
        { ...cleanEnv, HOME: "/tmp/alternate" },
        "/usr/bin/node",
        [],
      ),
    /offline_signer_environment_not_sanitized/u,
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

const launcherSource = fs.readFileSync(
  "ops/nimo/void-nimo-wc-void-launch-controller-control-signing-launch-v1.sh",
  "utf8",
);
assert.equal(
  launcherSource.includes('current_head_not_exact_challenge_head'),
  true,
);
assert.equal(
  launcherSource.includes('critical_worktree_blob_mismatch'),
  true,
);
assert.equal(
  launcherSource.includes('"ops/nimo/void-nimo-wc-void-launch-controller-control-signing-v1.mjs"'),
  true,
);
assert.equal(
  launcherSource.includes('"tools/void-reviewed-node-package-runtime-v1.mjs"'),
  true,
);
assert.equal(
  launcherSource.includes('exec /usr/bin/env -i'),
  true,
);
assert.equal(
  launcherSource.includes(
    "status=EXACT_REVIEWED_SIGNER_SIGN_OPERATION_AUTHORIZED",
  ),
  true,
);
assert.equal(
  launcherSource.indexOf("private_key_access=true") <
    launcherSource.indexOf("exec /usr/bin/env -i"),
  true,
  "sign mode must announce key access before exec",
);
assert.equal(
  launcherSource.indexOf("credential_access=true") <
    launcherSource.indexOf("exec /usr/bin/env -i"),
  true,
  "sign mode must announce credential access before exec",
);
assert.equal(
  launcherSource.indexOf("wallet_or_signer_access=true") <
    launcherSource.indexOf("exec /usr/bin/env -i"),
  true,
  "sign mode must announce signer access before exec",
);

const signerSource = fs.readFileSync(
  "ops/nimo/void-nimo-wc-void-launch-controller-control-signing-v1.mjs",
  "utf8",
);

assert.equal(
  signerSource.includes(
    '"/home/zoso/.local/share/void/offline-keys/wc-void-launch-controller-v1/private-key.hex"',
  ),
  true,
);
assert.equal(signerSource.includes("os.homedir()"), false);
assert.equal(signerSource.includes('"key-file"'), false);
assert.equal(
  signerSource.includes('/^(?:0x)?[0-9a-fA-F]{64}\\n?$/u'),
  true,
);
assert.equal(signerSource.includes(".trim()"), false);
assert.equal(
  signerSource.includes('fail(label + "_path_alias_forbidden")'),
  true,
);
assert.equal(
  signerSource.includes("function openPinnedParentDirectoryV1"),
  true,
);
{
  const readStart = signerSource.indexOf("function readStableFileV1");
  const readEnd = signerSource.indexOf("function readChallengeV1", readStart);
  const readSource = signerSource.slice(readStart, readEnd);
  const pinIndex = readSource.indexOf(
    "const parent = openPinnedParentDirectoryV1(file, label);",
  );
  const canonicalIndex = readSource.indexOf(
    "canonicalBound = fs.realpathSync.native(file);",
  );
  const pinnedOpenIndex = readSource.indexOf(
    "fd = fs.openSync(\n      pinnedPath",
  );
  assert.ok(readStart >= 0 && readEnd > readStart);
  assert.ok(pinIndex >= 0, "descriptor chain must be acquired");
  assert.ok(pinnedOpenIndex > pinIndex, "file open must use pinned parent");
  assert.ok(
    canonicalIndex > pinnedOpenIndex,
    "pathname canonicalization must occur only after parent/file pinning",
  );
  assert.equal(
    readSource.includes("canonicalBefore = fs.realpathSync.native(file)"),
    false,
    "no unpinned canonical-path authority may precede descriptor acquisition",
  );
  assert.equal(
    readSource.includes(
      "!sameOpenedFileIdentityV1(before, originalPathBefore)",
    ),
    true,
    "original path must bind back to the pinned opened inode before read",
  );
  assert.equal(
    readSource.includes(
      "!sameOpenedFileIdentityV1(after, originalPathAfter)",
    ),
    true,
    "original path must still bind to the pinned inode after read",
  );
}
assert.equal(
  signerSource.includes('"/proc/self/fd/" + fd'),
  true,
);
assert.equal(
  signerSource.includes("pathnameBefore = fs.lstatSync(pinnedPath"),
  true,
);
assert.equal(
  signerSource.includes("!sameOpenedFileIdentityV1(pathnameBefore, before)"),
  true,
);
assert.equal(
  signerSource.includes("!sameOpenedFileIdentityV1(after, pathnameAfter)"),
  true,
);
assert.equal(signerSource.includes("http:"), false);
assert.equal(signerSource.includes("https:"), false);
assert.equal(signerSource.includes("fetch("), false);
assert.equal(signerSource.includes("WebSocket"), false);
assert.equal(signerSource.includes("JsonRpcProvider"), false);
assert.equal(signerSource.includes("transaction_signing: false"), true);
assert.equal(signerSource.includes("transaction_broadcast: false"), true);
assert.equal(signerSource.includes("funds_movement: false"), true);
assert.equal(
  signerSource.includes(
    "return await signValidatedControlChallengeV1({\n    reviewed,\n    privateKey,\n    ethers,\n  });",
  ),
  false,
  "validated signing helper must not recursively call itself",
);
assert.equal(
  signerSource.includes(
    'fail("offline_signer_current_head_not_exact_challenge_head")',
  ),
  true,
  "production signer must require exact challenge source HEAD",
);
assert.equal(
  signerSource.includes(
    "const signingNowUnix = Math.floor(Date.now() / 1000);",
  ),
  true,
  "production signing must sample the clock after reviewed runtime setup",
);
assert.equal(
  signerSource.includes(
    "BigInt(Math.floor(Date.now() / 1000)) >=\n      BigInt(reviewed.expires_at_unix)",
  ),
  true,
  "production signing must recheck expiry before private-key access",
);
assert.equal(
  signerSource.includes(
    "if (liveNow() >= BigInt(reviewed.expires_at_unix))",
  ),
  true,
  "validated signing must recheck expiry around signature generation",
);
assert.equal(
  /signSelectedLaunchControllerChallengeV1\(\{[\s\S]*?nowUnix\s*=/u.test(
    signerSource,
  ),
  false,
  "production selected-key signer must not accept a caller-supplied signing time",
);

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
    sanitized_process_environment_required: true,
    node_preload_flags_forbidden: true,
    current_source_binding_reverification_required: true,
    private_key_path_fixed: true,
    absolute_key_path_fixed: true,
    private_key_access: true,
    credential_access: true,
    wallet_or_signer_access: true,
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
console.log("self_authored_source_binding_rejected=true");
console.log("sanitized_launch_environment_required=true");
console.log("node_preload_flags_rejected=true");
console.log("home_override_rejected=true");
console.log("current_source_binding_reverified_before_key_access=true");
console.log("exact_challenge_source_head_required=true");
console.log("exact_head_launcher_preflight_green=true");
console.log("launcher_critical_blobs_verified=true");
console.log("private_key_access_reported=true");
console.log("credential_access_reported=true");
console.log("wallet_or_signer_access_reported=true");
console.log("sign_mode_access_announced_before_exec=true");
console.log("reviewed_ethers_runtime_verified=true");
console.log("ambient_ethers_byte_drift_rejected_before_key_access=true");
console.log("selected_reviewer_fixed=true");
console.log("private_key_path_fixed=true");
console.log("key_file_cli_override=false");
console.log("exact_private_key_file_format=true");
console.log("private_key_whitespace_normalization=false");
console.log("canonical_input_paths_required=true");
console.log("descriptor_chain_is_first_trusted_path_observation=true");
console.log("unpinned_realpath_precheck=false");
console.log("original_path_rebound_to_pinned_inode=true");
console.log("pinned_parent_directory_chain=true");
console.log("preopen_path_identity_bound=true");
console.log("parent_symlink_alias_rejected=true");
console.log("input_path_inode_rebound_after_read=true");
console.log("production_signing_helper_non_recursive=true");
console.log("post_runtime_signing_clock_sampled=true");
console.log("expiry_rechecked_before_and_after_signature=true");
console.log("production_now_override=false");
console.log("network_access_required=false");
console.log("transaction_signing=false");
console.log("transaction_broadcast=false");
console.log("chain2050_write=false");
console.log("funds_movement=false");
console.log(
  "marker=" +
    VOID_NIMO_WC_VOID_LAUNCH_CONTROLLER_CONTROL_SIGNING_V1,
);
