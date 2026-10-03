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
  nodePermissionFlagV1,
  testOnlyReadTransferredControlChallengeV1,
  testOnlyReviewedAncestorPackageFallbackBlockedV1,
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
const reviewedHeadResult = spawnSync(
  "/usr/bin/git",
  ["rev-parse", "HEAD"],
  {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  },
);
assert.equal(reviewedHeadResult.status, 0);
const reviewedHead = reviewedHeadResult.stdout.trim();
assert.match(reviewedHead, /^[0-9a-f]{40}$/u);

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
    const sourceLauncher = path.resolve(
      "ops/nimo/void-nimo-wc-void-launch-controller-control-signing-launch-v1.sh",
    );
    const launcher = path.join(temporary, "reviewed-launcher.sh");
    fs.copyFileSync(sourceLauncher, launcher);
    fs.chmodSync(launcher, 0o700);
    const result = spawnSync(
      "/usr/bin/env",
      [
        "-i",
        "HOME=/home/zoso",
        "PATH=/usr/bin:/bin",
        "LANG=C",
        "LC_ALL=C",
        "VOID_NIMO_OFFLINE_SIGNER_REPO_ROOT_V1=" + process.cwd(),
        "/bin/bash",
        "--noprofile",
        "--norc",
        launcher,
        "preflight",
        challengePath,
        challengeSha,
        reviewedHead,
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
    assert.match(
      result.stdout,
      new RegExp("operator_reviewed_head=" + reviewedHead, "u"),
    );
    assert.match(result.stdout, /private_key_access=false/u);
    assert.match(result.stdout, /executed_launcher_blob=[0-9a-f]{40}/u);

    const forgedReviewedHead = spawnSync(
      "/usr/bin/env",
      [
        "-i",
        "HOME=/home/zoso",
        "PATH=/usr/bin:/bin",
        "LANG=C",
        "LC_ALL=C",
        "VOID_NIMO_OFFLINE_SIGNER_REPO_ROOT_V1=" + process.cwd(),
        "/bin/bash",
        "--noprofile",
        "--norc",
        launcher,
        "preflight",
        challengePath,
        challengeSha,
        "0".repeat(40),
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    assert.notEqual(forgedReviewedHead.status, 0);
    assert.match(
      forgedReviewedHead.stderr,
      /current_head_not_exact_operator_reviewed_head/u,
    );

    const tamperedLauncher = path.join(temporary, "tampered-launcher.sh");
    fs.writeFileSync(
      tamperedLauncher,
      fs.readFileSync(sourceLauncher, "utf8") + "\n# tampered fixture\n",
      { mode: 0o700 },
    );
    fs.chmodSync(tamperedLauncher, 0o700);
    const tamperedResult = spawnSync(
      "/usr/bin/env",
      [
        "-i",
        "HOME=/home/zoso",
        "PATH=/usr/bin:/bin",
        "LANG=C",
        "LC_ALL=C",
        "VOID_NIMO_OFFLINE_SIGNER_REPO_ROOT_V1=" + process.cwd(),
        "/bin/bash",
        "--noprofile",
        "--norc",
        tamperedLauncher,
        "preflight",
        challengePath,
        challengeSha,
        reviewedHead,
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    assert.notEqual(tamperedResult.status, 0);
    assert.match(
      tamperedResult.stderr,
      /executed_launcher_not_operator_reviewed_blob/u,
    );
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}

// Adversary for the reviewed-launcher bootstrap: verify the complete launcher
// bytes in memory, replace the source pathname, then execute only the already-
// verified byte buffer through Bash stdin. The replacement path must be inert.
{
  const temporary = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-offline-signer-launcher-stream-race-"),
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

    const sourceLauncher = path.resolve(
      "ops/nimo/void-nimo-wc-void-launch-controller-control-signing-launch-v1.sh",
    );
    const stagedLauncher = path.join(temporary, "launcher.sh");
    fs.copyFileSync(sourceLauncher, stagedLauncher);
    fs.chmodSync(stagedLauncher, 0o400);

    const verifiedLauncherBytes = fs.readFileSync(stagedLauncher);
    const verifiedLauncherBlob = crypto
      .createHash("sha1")
      .update(
        Buffer.from(
          "blob " + verifiedLauncherBytes.length + "\0",
          "utf8",
        ),
      )
      .update(verifiedLauncherBytes)
      .digest("hex");

    const expectedBlobResult = spawnSync(
      "/usr/bin/git",
      [
        "--no-replace-objects",
        "-c", "core.hooksPath=/dev/null",
        "-c", "core.attributesFile=/dev/null",
        "-c", "core.fsmonitor=false",
        "-c", "core.untrackedCache=false",
        "-c", "core.preloadIndex=false",
        "-c", "submodule.recurse=false",
        "-C", process.cwd(),
        "rev-parse",
        reviewedHead +
          ":ops/nimo/void-nimo-wc-void-launch-controller-control-signing-launch-v1.sh",
      ],
      {
        cwd: "/",
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          PATH: "/usr/bin:/bin",
          LANG: "C",
          LC_ALL: "C",
          HOME: "/nonexistent",
          GIT_CONFIG_NOSYSTEM: "1",
          GIT_CONFIG_GLOBAL: "/dev/null",
          GIT_OPTIONAL_LOCKS: "0",
          GIT_TERMINAL_PROMPT: "0",
        },
      },
    );
    assert.equal(expectedBlobResult.status, 0);
    const expectedLauncherBlob = expectedBlobResult.stdout.trim();
    assert.equal(verifiedLauncherBlob, expectedLauncherBlob);

    fs.writeFileSync(
      stagedLauncher,
      [
        "#!/bin/bash",
        "printf 'UNREVIEWED_REPLACEMENT_LAUNCHER_EXECUTED\\n'",
        "exit 0",
        "",
      ].join("\n"),
      { mode: 0o700 },
    );

    const result = spawnSync(
      "/usr/bin/env",
      [
        "-i",
        "HOME=/home/zoso",
        "PATH=/usr/bin:/bin",
        "LANG=C",
        "LC_ALL=C",
        "VOID_NIMO_OFFLINE_SIGNER_REPO_ROOT_V1=" + process.cwd(),
        "VOID_NIMO_OFFLINE_SIGNER_EXECUTED_LAUNCHER_BLOB_V1=" +
          expectedLauncherBlob,
        "/bin/bash",
        "--noprofile",
        "--norc",
        "-s",
        "--",
        "preflight",
        challengePath,
        challengeSha,
        reviewedHead,
      ],
      {
        cwd: process.cwd(),
        input: verifiedLauncherBytes,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      },
    );

    assert.equal(
      result.status,
      0,
      ["buffered launcher preflight failed", result.stdout, result.stderr]
        .join("\n"),
    );
    assert.match(
      result.stdout,
      /status=EXACT_REVIEWED_SIGNER_PREFLIGHT_GREEN/u,
    );
    assert.equal(
      result.stdout.includes("UNREVIEWED_REPLACEMENT_LAUNCHER_EXECUTED"),
      false,
    );
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}

// Adversary for the historical pre-pin realpath race: when the canonical-path
// observation fires, swap the ancestor directory. Old ordering would then pin
// and read the replacement; descriptor-first ordering has already pinned the
// original inode and must reject the original pathname rebinding.
{
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-offline-signer-path-race-"),
  );
  const active = path.join(root, "active");
  const replacement = path.join(root, "replacement");
  const displaced = path.join(root, "displaced");
  fs.mkdirSync(active, { mode: 0o700 });
  fs.mkdirSync(replacement, { mode: 0o700 });
  const target = path.join(active, "challenge.json");
  const replacementTarget = path.join(replacement, "challenge.json");
  const challengeBytes = Buffer.from(
    JSON.stringify(challenge, null, 2) + "\n",
    "utf8",
  );
  fs.writeFileSync(target, challengeBytes, { mode: 0o600 });
  fs.writeFileSync(replacementTarget, challengeBytes, { mode: 0o600 });
  fs.chmodSync(target, 0o600);
  fs.chmodSync(replacementTarget, 0o600);
  const challengeSha = crypto
    .createHash("sha256")
    .update(challengeBytes)
    .digest("hex");

  const originalNative = fs.realpathSync.native;
  let swapped = false;
  fs.realpathSync.native = function injectedRealpath(candidate, ...args) {
    const resolved = originalNative(candidate, ...args);
    if (!swapped && candidate === target) {
      fs.renameSync(active, displaced);
      fs.renameSync(replacement, active);
      swapped = true;
    }
    return resolved;
  };
  try {
    assert.throws(
      () =>
        testOnlyReadTransferredControlChallengeV1(
          target,
          challengeSha,
        ),
      /control_challenge_original_path_not_bound_to_pinned_file/u,
    );
    assert.equal(swapped, true);
  } finally {
    fs.realpathSync.native = originalNative;
    fs.rmSync(root, { recursive: true, force: true });
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
    VOID_NIMO_OFFLINE_SIGNER_REVIEWED_HEAD_V1: reviewedHead,
    VOID_NIMO_OFFLINE_SIGNER_REPO_ROOT_V1: process.cwd(),
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
  assert.throws(
    () =>
      validateSanitizedOfflineSignerEnvironmentV1(
        {
          ...cleanEnv,
          VOID_NIMO_OFFLINE_SIGNER_REPO_ROOT_V1: "/tmp",
        },
        "/usr/bin/node",
        [],
      ),
    /offline_signer_environment_not_sanitized/u,
  );
}

assert.equal(
  nodePermissionFlagV1("22.0.0"),
  "--experimental-permission",
);
assert.equal(
  nodePermissionFlagV1("22.12.0"),
  "--experimental-permission",
);
assert.equal(
  nodePermissionFlagV1("22.13.0"),
  "--permission",
);
assert.equal(nodePermissionFlagV1("24.0.0"), "--permission");
assert.equal(nodePermissionFlagV1("26.0.0"), "--permission");
assert.throws(
  () => nodePermissionFlagV1("20.19.0"),
  /offline_signer_node_version_unsupported/u,
);

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
assert.equal(runtime.permission_fenced_execution, true);
assert.equal(runtime.ancestor_package_resolution_allowed, false);
assert.equal(runtime.ambient_node_resolution_overrides_ignored, true);
assert.equal(runtime.ambient_dynamic_loader_overrides_ignored, true);
assert.equal(runtime.private_key_access, false);
assert.equal(runtime.network_access_required, false);
assert.equal(runtime.execution_network_isolation_provided, false);
assert.equal(runtime.transaction_signing, false);
assert.equal(runtime.funds_movement, false);

const ancestorFallback =
  await testOnlyReviewedAncestorPackageFallbackBlockedV1();
assert.equal(ancestorFallback.ancestor_package_present, true);
assert.equal(ancestorFallback.ancestor_package_executed, false);
assert.equal(ancestorFallback.permission_fenced_execution, true);
assert.equal(
  ancestorFallback.ancestor_package_resolution_allowed,
  false,
);

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
const operatorDoc = fs.readFileSync(
  "docs/operators/wc-void-launch-controller-control-offline-signing-v1.md",
  "utf8",
);
assert.equal(
  operatorDoc.includes('cat-file", "blob", expected_blob'),
  true,
  "operator bootstrap must read the reviewed launcher by Git blob ID",
);
assert.equal(
  operatorDoc.includes('actual_blob = hashlib.sha1('),
  true,
  "operator bootstrap must verify the complete launcher Git blob in memory",
);
assert.equal(
  operatorDoc.includes('input=launcher_bytes'),
  true,
  "operator bootstrap must execute the already-verified launcher bytes through Bash stdin",
);
assert.equal(
  operatorDoc.includes(
    '"VOID_NIMO_OFFLINE_SIGNER_EXECUTED_LAUNCHER_BLOB_V1": expected_blob',
  ),
  true,
  "operator bootstrap must pass the verified launcher blob as defense-in-depth",
);
assert.equal(
  operatorDoc.includes('/proc/self/fd/9'),
  false,
  "production ceremony must not depend on a mutable staged launcher inode",
);
assert.equal(
  operatorDoc.includes('$stage/launcher.sh'),
  false,
  "production ceremony must not stage and reopen a launcher pathname",
);
assert.equal(
  launcherSource.includes('current_head_not_exact_operator_reviewed_head'),
  true,
);
assert.equal(
  launcherSource.includes('challenge_source_head_not_operator_reviewed_head'),
  true,
);
assert.equal(
  launcherSource.includes('VOID_NIMO_OFFLINE_SIGNER_REVIEWED_HEAD_V1'),
  true,
);
assert.equal(
  launcherSource.includes('executed_launcher_not_operator_reviewed_blob'),
  true,
);
assert.equal(
  launcherSource.includes('VOID_NIMO_OFFLINE_SIGNER_REPO_ROOT_V1'),
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
  launcherSource.includes('reviewed_signer_materialized=true'),
  true,
);
assert.equal(
  launcherSource.includes('materialize_reviewed_blob "$signer_rel"'),
  true,
);
assert.equal(
  launcherSource.includes('materialize_reviewed_blob "$runtime_rel"'),
  true,
);
assert.equal(
  launcherSource.includes(
    'VOID_NIMO_OFFLINE_SIGNER_REPO_ROOT_V1="$repo"',
  ),
  true,
);
assert.equal(
  launcherSource.includes(
    '"$reviewed_runtime_root/$signer_rel"',
  ),
  true,
);
assert.equal(
  launcherSource.includes(
    '"$repo/ops/nimo/void-nimo-wc-void-launch-controller-control-signing-v1.mjs"',
  ),
  false,
  "sign mode must not execute the mutable worktree signer path",
);
assert.equal(
  launcherSource.includes(
    "status=EXACT_REVIEWED_SIGNER_SIGN_OPERATION_AUTHORIZED",
  ),
  true,
);
{
  const modeBranch = launcherSource.indexOf(
    'if [[ "$mode" == "preflight" ]]',
  );
  const preflightFalse = launcherSource.indexOf(
    "private_key_access=false",
    modeBranch,
  );
  const branchEnd = launcherSource.indexOf("\nfi\n", modeBranch);
  const signTrue = launcherSource.indexOf(
    "private_key_access=true",
    branchEnd,
  );
  const execIndex = launcherSource.indexOf(
    '"$reviewed_runtime_root/$signer_rel"',
  );
  assert.ok(modeBranch >= 0 && branchEnd > modeBranch);
  assert.ok(
    preflightFalse > modeBranch && preflightFalse < branchEnd,
    "false key-access fact must be emitted only in preflight branch",
  );
  assert.ok(
    signTrue > branchEnd && signTrue < execIndex,
    "sign mode must announce true key access after preflight branch and before exec",
  );
}
assert.equal(
  launcherSource.indexOf("private_key_access=true") <
    launcherSource.indexOf('"$reviewed_runtime_root/$signer_rel"'),
  true,
  "sign mode must announce key access before exec",
);
assert.equal(
  launcherSource.indexOf("credential_access=true") <
    launcherSource.indexOf('"$reviewed_runtime_root/$signer_rel"'),
  true,
  "sign mode must announce credential access before exec",
);
assert.equal(
  launcherSource.indexOf("wallet_or_signer_access=true") <
    launcherSource.indexOf('"$reviewed_runtime_root/$signer_rel"'),
  true,
  "sign mode must announce signer access before exec",
);

const signerSource = fs.readFileSync(
  "ops/nimo/void-nimo-wc-void-launch-controller-control-signing-v1.mjs",
  "utf8",
);

assert.equal(
  signerSource.includes("const ethersEntry = path.join("),
  false,
  "production parent must not construct an in-process ethers entry path",
);
assert.equal(
  /await import\(\s*pathToFileURL\(ethersEntry\)/u.test(signerSource),
  false,
  "production parent must not dynamically import reviewed ethers",
);
assert.equal(
  signerSource.includes(
    'bridgeResult = runtime.run(\n          "sign"',
  ),
  true,
  "production signing must be delegated to the fenced reviewed child",
);
assert.equal(
  signerSource.includes(
    'const candidate = await import("bufferutil");',
  ),
  true,
  "focused bridge must contain the ancestor-package adversary operation",
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
  signerSource.includes("withReviewedEthersV1"),
  false,
  "production signer must not use the former in-process reviewed ethers import",
);
assert.equal(
  signerSource.includes(
    "return await withReviewedSigningRuntimeV1(",
  ),
  true,
  "production signer must enter the permission-fenced reviewed child runtime",
);
assert.equal(
  signerSource.includes('"--experimental-permission"'),
  true,
  "Node 22.0 through 22.12 must use the experimental permission flag",
);
assert.equal(
  signerSource.includes('return "--permission";'),
  true,
  "Node 22.13+ and supported newer majors must use the stable permission flag",
);
assert.equal(
  signerSource.includes("const permissionFlag = nodePermissionFlagV1();"),
  true,
  "reviewed signer child must select the permission flag by supported Node version",
);
assert.equal(
  signerSource.includes('"--allow-fs-read=" + root'),
  true,
  "reviewed signer child must restrict filesystem reads to the private runtime",
);
assert.equal(
  signerSource.includes("input: stdinText"),
  true,
  "production private key must enter the child only through stdin",
);
assert.equal(
  signerSource.includes('fs.readFileSync(0, "utf8")'),
  false,
  "permission-fenced child must consume the key from process.stdin, not a filesystem read on fd 0",
);
assert.equal(
  signerSource.includes('process.stdin.setEncoding("utf8")'),
  true,
  "permission-fenced child must consume key material through the stdin stream",
);
assert.equal(
  signerSource.includes("ancestor_package_resolution_allowed: false"),
  true,
  "production result must expose ancestor-resolution denial",
);
assert.equal(
  signerSource.includes("permission_fenced_execution: true"),
  true,
  "production result must expose permission-fenced execution",
);
assert.equal(
  signerSource.includes(
    "BigInt(Math.floor(Date.now() / 1000)) >=\n        BigInt(preflight.expires_at_unix)",
  ),
  true,
  "production parent must recheck expiry immediately before private-key access",
);
assert.equal(
  signerSource.includes('throw new Error("bridge_challenge_expired")'),
  true,
  "reviewed child must recheck expiry around private-key use and signing",
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
console.log("independent_operator_reviewed_head_required=true");
console.log("challenge_head_cannot_self_authorize_signer=true");
console.log("launcher_materialized_from_reviewed_commit=true");
console.log("executed_launcher_self_blob_verified=true");
console.log("tampered_launcher_rejected=true");
console.log("content_addressed_launcher_stream_execution=true");
console.log("launcher_bytes_verified_before_bash_stdin=true");
console.log("launcher_path_replacement_after_byte_verification_ignored=true");
console.log("reviewed_launcher_bootstrap_descriptor_pinned=true");
console.log("reviewed_launcher_path_reopen=false");
console.log("reviewed_signer_materialized_before_execution=true");
console.log("mutable_worktree_signer_execution=false");
console.log("node_22_0_to_22_12_permission_flag_supported=true");
console.log("node_22_13_plus_permission_flag_supported=true");
console.log("exact_head_launcher_preflight_green=true");
console.log("launcher_critical_blobs_verified=true");
console.log("private_key_access_reported=true");
console.log("credential_access_reported=true");
console.log("wallet_or_signer_access_reported=true");
console.log("sign_mode_access_announced_before_exec=true");
console.log("reviewed_ethers_runtime_verified=true");
console.log("permission_fenced_signing_child=true");
console.log("ancestor_package_resolution_allowed=false");
console.log("ancestor_package_fallback_blocked=true");
console.log("production_parent_dynamic_ethers_import=false");
console.log("private_key_transport=stdin_stream_only");
console.log("ambient_ethers_byte_drift_rejected_before_key_access=true");
console.log("selected_reviewer_fixed=true");
console.log("private_key_path_fixed=true");
console.log("key_file_cli_override=false");
console.log("exact_private_key_file_format=true");
console.log("private_key_whitespace_normalization=false");
console.log("canonical_input_paths_required=true");
console.log("descriptor_chain_is_first_trusted_path_observation=true");
console.log("unpinned_realpath_precheck=false");
console.log("ancestor_swap_after_pin_rejected=true");
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
