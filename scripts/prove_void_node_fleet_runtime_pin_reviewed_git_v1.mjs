#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import {
  assertReviewedGitInvocationEnvironmentV1,
  bindReviewedGitOperatorEvidenceV1,
  buildReviewedGitEnvironmentV1,
  inspectReviewedGitExecutableV1,
  queryCanonicalMainWithReviewedGitV1,
} from "../ops/run_void_node_fleet_runtime_pin_status_v1.mjs";

const REVIEWED_GIT = realpathSync("/usr/bin/git");
const LEGACY_CORE_CLI = fileURLToPath(
  new URL("../ops/void-node-fleet-runtime-pin-status-core-v1.mjs", import.meta.url),
);

function git(cwd, args) {
  const result = spawnSync(REVIEWED_GIT, args, {
    cwd,
    encoding: "utf8",
    timeout: 10_000,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
  assert.equal(result.status, 0, `git ${args.join(" ")} failed: ${result.stderr || result.stdout}`);
  return result.stdout.trim();
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

const tempRoot = mkdtempSync(join(tmpdir(), "void-runtime-pin-reviewed-git-"));
try {
  const remote = join(tempRoot, "remote.git");
  const coordinator = join(tempRoot, "coordinator");
  git(tempRoot, ["init", "--bare", remote]);
  git(tempRoot, ["init", coordinator]);
  git(coordinator, ["config", "user.name", "VOID proof"]);
  git(coordinator, ["config", "user.email", "void-proof@example.invalid"]);
  writeFileSync(join(coordinator, "fixture.txt"), "A\n");
  git(coordinator, ["add", "fixture.txt"]);
  git(coordinator, ["commit", "-m", "fixture A"]);
  git(coordinator, ["branch", "-M", "main"]);
  git(coordinator, ["remote", "add", "origin", remote]);
  git(coordinator, ["push", "-u", "origin", "main"]);
  const commitA = git(coordinator, ["rev-parse", "HEAD"]);

  const identity = inspectReviewedGitExecutableV1(REVIEWED_GIT);
  assert.equal(identity.path, REVIEWED_GIT);
  assert.equal(identity.sha256, sha256(readFileSync(REVIEWED_GIT)));
  assert.match(identity.sha256, /^[0-9a-f]{64}$/);

  const fakeHelperDir = join(tempRoot, "fake-helper");
  const fakeHelperMarker = join(tempRoot, "fake-helper-invoked");
  mkdirSync(fakeHelperDir);
  const fakeHelper = join(fakeHelperDir, "git-remote-https");
  writeFileSync(fakeHelper, `#!/bin/sh\nprintf invoked > '${fakeHelperMarker}'\nexit 99\n`);
  chmodSync(fakeHelper, 0o755);
  const helperEnv = { ...process.env, GIT_EXEC_PATH: fakeHelperDir };
  assert.throws(
    () => assertReviewedGitInvocationEnvironmentV1(helperEnv),
    /Git helper\/program override environment is not allowed: GIT_EXEC_PATH/,
  );
  assert.equal(existsSync(fakeHelperMarker), false);

  const fakePathDir = join(tempRoot, "fake-path");
  const fakeGitMarker = join(tempRoot, "fake-git-invoked");
  mkdirSync(fakePathDir);
  const fakeGit = join(fakePathDir, "git");
  writeFileSync(fakeGit, `#!/bin/sh\nprintf invoked > '${fakeGitMarker}'\nexit 99\n`);
  chmodSync(fakeGit, 0o755);
  const fakePathEnv = { ...process.env, PATH: `${fakePathDir}:${process.env.PATH || ""}` };
  const query = queryCanonicalMainWithReviewedGitV1({
    canonicalUrl: remote,
    gitExecutable: REVIEWED_GIT,
    env: fakePathEnv,
  });
  assert.equal(query.sha, commitA);
  assert.equal(query.canonical_git_executable.path, REVIEWED_GIT);
  assert.equal(query.canonical_git_executable.sha256, identity.sha256);
  assert.equal(existsSync(fakeGitMarker), false);

  const reviewed = buildReviewedGitEnvironmentV1({
    gitExecutable: REVIEWED_GIT,
    env: fakePathEnv,
  });
  assert.equal(reviewed.env.PATH, realpathSync("/usr/bin"));
  assert.equal(reviewed.identity.sha256, identity.sha256);

  const bound = bindReviewedGitOperatorEvidenceV1(
    {
      marker: "VOID_NODE_FLEET_RUNTIME_PIN_STATUS_V1",
      status_id_sha256: "a".repeat(64),
      status: "CURRENT_WITH_MAIN",
    },
    identity,
  );
  assert.equal(bound.canonical_git_executable.path, REVIEWED_GIT);
  assert.equal(bound.canonical_git_executable.sha256, identity.sha256);
  assert.match(bound.operator_evidence_id_sha256, /^[0-9a-f]{64}$/);

  const legacyCore = spawnSync(process.execPath, [LEGACY_CORE_CLI, "--help"], {
    encoding: "utf8",
    timeout: 10_000,
    env: process.env,
  });
  assert.equal(legacyCore.status, 1);
  assert.equal(legacyCore.stdout, "");
  const legacyCoreHold = JSON.parse(legacyCore.stderr.trim());
  assert.equal(legacyCoreHold.marker, "VOID_NODE_FLEET_RUNTIME_PIN_STATUS_V1");
  assert.equal(legacyCoreHold.status, "HOLD");
  assert.equal(legacyCoreHold.reason, "legacy_core_cli_disabled");
  assert.equal(legacyCoreHold.guard, "VOID_NODE_FLEET_RUNTIME_PIN_CORE_DIRECT_CLI_DISABLED_V1");
  assert.match(legacyCoreHold.error, /direct core CLI is disabled/);
  assert.equal(Object.hasOwn(legacyCoreHold, "canonical_main_sha"), false);
  assert.equal(Object.hasOwn(legacyCoreHold, "nodes"), false);
  assert.equal(legacyCoreHold.mutation_attempted, false);
  assert.equal(legacyCoreHold.evidence_output_created, false);

  for (const key of [
    "GIT_SSH",
    "GIT_SSH_COMMAND",
    "GIT_SSH_VARIANT",
    "GIT_PROXY_COMMAND",
    "GIT_TRACE",
    "GIT_TRACE2",
    "GIT_TRACE_PACKET",
    "GIT_TRACE_CURL",
    "GIT_ASKPASS",
    "SSH_ASKPASS",
    "LD_PRELOAD",
    "LD_LIBRARY_PATH",
    "DYLD_INSERT_LIBRARIES",
  ]) {
    assert.throws(
      () => assertReviewedGitInvocationEnvironmentV1({ ...process.env, [key]: "attacker" }),
      /Git helper\/program override environment is not allowed/,
    );
  }

  console.log(`reviewed_git_path=${REVIEWED_GIT}`);
  console.log(`reviewed_git_sha256=${identity.sha256}`);
  console.log("git_exec_path_helper_override_rejected_before_helper=true");
  console.log("ambient_path_cannot_replace_bound_git_executable=true");
  console.log("canonical_git_executable_identity_bound_in_packet=true");
  console.log("operator_evidence_id_binds_status_to_git_identity=true");
  console.log("legacy_core_direct_cli_disabled=true");
  console.log("legacy_core_success_class_evidence_blocked=true");
  console.log("git_trace_helper_and_loader_overrides_rejected=true");
  console.log("git_fetch_performed=false");
  console.log("service_or_runtime_mutation_performed=false");
  console.log("VOID_NODE_FLEET_RUNTIME_PIN_REVIEWED_GIT_V1_PROOF_GREEN");
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
