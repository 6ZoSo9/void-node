#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  closeSync,
  readFileSync,
  realpathSync,
  statSync,
} from "node:fs";
import { basename, dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import * as core from "./void-node-fleet-runtime-pin-status-core-v1.mjs";
import {
  VOID_NODE_FLEET_RUNTIME_PIN_STATUS_V1,
  readFreshFleetDriftAuditV1,
  readFreshFleetProcessAuditV1,
} from "../tools/void-node-fleet-runtime-pin-status-v1.mjs";

export * from "./void-node-fleet-runtime-pin-status-core-v1.mjs";

const DEFAULT_MAX_EVIDENCE_AGE_SECONDS = 300;
const MAX_EVIDENCE_AGE_SECONDS = 86_400;
const MAX_GIT_OUTPUT_BYTES = 1024 * 1024;
const DEFAULT_REPO_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

const FORBIDDEN_HELPER_PROGRAM_ENV_KEYS = new Set([
  "GIT_EXEC_PATH",
  "GIT_SSH",
  "GIT_SSH_COMMAND",
  "GIT_SSH_VARIANT",
  "GIT_PROXY_COMMAND",
  "GIT_TRACE",
  "GIT_TRACE2",
  "GIT_TRACE2_EVENT",
  "GIT_TRACE2_PERF",
  "GIT_TRACE_PERFORMANCE",
  "GIT_TRACE_SETUP",
  "GIT_TRACE_PACKET",
  "GIT_TRACE_CURL",
  "GIT_CURL_VERBOSE",
  "GIT_ASKPASS",
  "SSH_ASKPASS",
  "LD_PRELOAD",
  "LD_LIBRARY_PATH",
  "DYLD_INSERT_LIBRARIES",
  "DYLD_LIBRARY_PATH",
  "DYLD_FRAMEWORK_PATH",
]);

function fail(message) {
  const error = new Error(message);
  error.name = "VoidFleetRuntimePinStatusReviewedGitError";
  throw error;
}

function assertString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    fail(`${label} must be a non-empty string`);
  }
  if (/[^\x20-\x7e]/.test(value)) fail(`${label} contains a control or non-ASCII character`);
  return value;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseUnpaddedInteger(value, label) {
  if (!/^(?:0|[1-9][0-9]*)$/.test(String(value ?? ""))) {
    fail(`${label} must be an unpadded integer`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) fail(`${label} is outside the safe integer range`);
  return parsed;
}

export function assertReviewedGitInvocationEnvironmentV1(env = process.env) {
  core.assertCanonicalEvaluationGitEnvironmentV1(env);
  const forbidden = Object.keys(env).filter((key) =>
    FORBIDDEN_HELPER_PROGRAM_ENV_KEYS.has(key),
  );
  if (forbidden.length > 0) {
    fail(`Git helper/program override environment is not allowed: ${forbidden.sort().join(",")}`);
  }
  return true;
}

export function inspectReviewedGitExecutableV1(gitExecutable) {
  const input = assertString(gitExecutable, "Git executable");
  if (!isAbsolute(input)) fail("Git executable must be an absolute path");
  const path = realpathSync(input);
  const stat = statSync(path);
  if (!stat.isFile()) fail("Git executable must be a regular file");
  if ((stat.mode & 0o111) === 0) fail("Git executable must be executable");
  if (basename(path) !== "git") fail("reviewed Git executable canonical basename must be git");
  return Object.freeze({
    path,
    sha256: sha256(readFileSync(path)),
    size: stat.size,
    dev: String(stat.dev),
    ino: String(stat.ino),
  });
}

function assertSameGitExecutableIdentityV1(before, after) {
  for (const key of ["path", "sha256", "size", "dev", "ino"]) {
    if (before?.[key] !== after?.[key]) {
      fail("reviewed Git executable identity changed during runtime-pin evaluation");
    }
  }
  return true;
}

export function buildReviewedGitEnvironmentV1({ gitExecutable, env = process.env }) {
  assertReviewedGitInvocationEnvironmentV1(env);
  const identity = inspectReviewedGitExecutableV1(gitExecutable);
  const reviewedPath = dirname(identity.path);
  if (resolve(reviewedPath, "git") !== identity.path) {
    fail("reviewed Git executable must be addressable as git within its canonical directory");
  }
  return Object.freeze({
    identity,
    env: Object.freeze({
      ...env,
      PATH: reviewedPath,
      GIT_TERMINAL_PROMPT: "0",
      GIT_OPTIONAL_LOCKS: "0",
    }),
  });
}

export function bindReviewedGitOperatorEvidenceV1(packet, gitIdentity) {
  if (!packet || typeof packet !== "object" || typeof packet.status_id_sha256 !== "string") {
    fail("runtime-pin packet must contain status_id_sha256");
  }
  const canonicalGitExecutable = Object.freeze({
    path: gitIdentity.path,
    sha256: gitIdentity.sha256,
  });
  const operatorEvidenceIdSha256 = sha256(
    JSON.stringify({
      marker: VOID_NODE_FLEET_RUNTIME_PIN_STATUS_V1,
      status_id_sha256: packet.status_id_sha256,
      canonical_git_executable: canonicalGitExecutable,
    }),
  );
  return Object.freeze({
    ...packet,
    canonical_git_executable: canonicalGitExecutable,
    operator_evidence_id_sha256: operatorEvidenceIdSha256,
  });
}

export function queryCanonicalMainWithReviewedGitV1({
  canonicalUrl,
  canonicalBranch = "main",
  gitExecutable,
  env = process.env,
}) {
  const reviewed = buildReviewedGitEnvironmentV1({ gitExecutable, env });
  const before = reviewed.identity;
  const sha = core.queryCanonicalMainExplicitUrlV1({
    canonicalUrl,
    canonicalBranch,
    env: reviewed.env,
  });
  const after = inspectReviewedGitExecutableV1(before.path);
  assertSameGitExecutableIdentityV1(before, after);
  return Object.freeze({
    sha,
    canonical_git_executable: Object.freeze({ path: before.path, sha256: before.sha256 }),
  });
}

export function evaluateRuntimePinStatusWithReviewedGitV1({
  driftEvidence,
  processEvidence,
  approvedRuntimeSha,
  coordinatorRepo,
  gitExecutable,
  expectedCanonicalUrl = core.VOID_CANONICAL_REPOSITORY_URL_V1,
  env = process.env,
  evaluatedAtEpochMs = Date.now(),
  evidenceOutputCreated = false,
}) {
  const reviewed = buildReviewedGitEnvironmentV1({ gitExecutable, env });
  const packet = core.evaluateRuntimePinStatusLiveCanonicalV1({
    driftEvidence,
    processEvidence,
    approvedRuntimeSha,
    coordinatorRepo,
    expectedCanonicalUrl,
    env: reviewed.env,
    evaluatedAtEpochMs,
    evidenceOutputCreated,
  });
  const after = inspectReviewedGitExecutableV1(reviewed.identity.path);
  assertSameGitExecutableIdentityV1(reviewed.identity, after);
  return bindReviewedGitOperatorEvidenceV1(packet, reviewed.identity);
}

function parseArgs(argv) {
  const out = {
    driftAudit: "",
    processAudit: "",
    approvedRuntimeSha: "",
    coordinatorRepo: DEFAULT_REPO_ROOT,
    gitExecutable: "",
    maxEvidenceAgeSeconds: DEFAULT_MAX_EVIDENCE_AGE_SECONDS,
    output: "",
  };
  const seen = new Set();
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help") {
      console.log(
        "Usage: node ops/run_void_node_fleet_runtime_pin_status_v1.mjs --drift-audit PATH --process-freshness-audit PATH --approved-runtime-sha SHA --git-executable ABS_PATH [--coordinator-repo PATH] [--max-evidence-age-seconds N] [--output PATH]",
      );
      process.exit(0);
    }
    if (![
      "--drift-audit",
      "--process-freshness-audit",
      "--approved-runtime-sha",
      "--coordinator-repo",
      "--git-executable",
      "--max-evidence-age-seconds",
      "--output",
    ].includes(arg)) {
      fail(`unknown argument: ${arg}`);
    }
    if (seen.has(arg)) fail(`duplicate argument: ${arg}`);
    seen.add(arg);
    const value = argv[++index];
    if (value === undefined) fail(`missing value for ${arg}`);
    if (arg === "--drift-audit") out.driftAudit = value;
    else if (arg === "--process-freshness-audit") out.processAudit = value;
    else if (arg === "--approved-runtime-sha") out.approvedRuntimeSha = value;
    else if (arg === "--coordinator-repo") out.coordinatorRepo = value;
    else if (arg === "--git-executable") out.gitExecutable = value;
    else if (arg === "--max-evidence-age-seconds") {
      out.maxEvidenceAgeSeconds = parseUnpaddedInteger(value, "max evidence age");
    } else if (arg === "--output") out.output = value;
  }
  if (!out.driftAudit) fail("--drift-audit is required");
  if (!out.processAudit) fail("--process-freshness-audit is required");
  if (!out.approvedRuntimeSha) fail("--approved-runtime-sha is required");
  if (!out.gitExecutable) fail("--git-executable is required");
  if (out.maxEvidenceAgeSeconds < 1 || out.maxEvidenceAgeSeconds > MAX_EVIDENCE_AGE_SECONDS) {
    fail(`max evidence age must be 1..${MAX_EVIDENCE_AGE_SECONDS} seconds`);
  }
  return out;
}

function main() {
  let reservation = null;
  try {
    const args = parseArgs(process.argv.slice(2));
    const reviewed = buildReviewedGitEnvironmentV1({
      gitExecutable: args.gitExecutable,
      env: process.env,
    });
    if (args.output) {
      reservation = core.reserveEvidenceOutputV1({
        outputPath: args.output,
        coordinatorRepo: args.coordinatorRepo,
        env: reviewed.env,
      });
    }

    const drift = readFreshFleetDriftAuditV1(args.driftAudit, args.maxEvidenceAgeSeconds);
    const processEvidence = readFreshFleetProcessAuditV1(
      args.processAudit,
      args.maxEvidenceAgeSeconds,
    );
    const packet = evaluateRuntimePinStatusWithReviewedGitV1({
      driftEvidence: drift,
      processEvidence,
      approvedRuntimeSha: args.approvedRuntimeSha,
      coordinatorRepo: args.coordinatorRepo,
      gitExecutable: reviewed.identity.path,
      env: process.env,
      evidenceOutputCreated: Boolean(reservation),
    });

    const json = reservation
      ? core.publishReservedEvidenceOutputV1(reservation, packet)
      : `${JSON.stringify(packet, null, 2)}\n`;
    process.stdout.write(json);
    process.exitCode = ["HOLD", "UNEXPECTED_RUNTIME_DRIFT"].includes(packet.status) ? 2 : 0;
  } catch (error) {
    const evidenceOutputCreated = core.cleanupEvidenceOutputReservationV1(reservation);
    console.error(
      JSON.stringify({
        marker: VOID_NODE_FLEET_RUNTIME_PIN_STATUS_V1,
        status: "HOLD",
        error: String(error?.message || error),
        mutation_attempted: false,
        canonical_remote_read_only: true,
        evidence_output_created: evidenceOutputCreated,
      }),
    );
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  main();
}
