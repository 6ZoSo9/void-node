#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { realpathSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  VOID_NODE_FLEET_RUNTIME_PIN_STATUS_V1,
  buildFleetRuntimePinStatusV1,
  readFreshFleetDriftAuditV1,
  readFreshFleetProcessAuditV1,
} from "../tools/void-node-fleet-runtime-pin-status-v1.mjs";

const SHA_RE = /^[0-9a-f]{40}$/;
const REMOTE_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/i;
const DEFAULT_MAX_EVIDENCE_AGE_SECONDS = 300;
const MAX_EVIDENCE_AGE_SECONDS = 86_400;
const MAX_GIT_OUTPUT_BYTES = 1024 * 1024;
const DEFAULT_REPO_ROOT = resolve(
  fileURLToPath(new URL("..", import.meta.url)),
);

const FORBIDDEN_GIT_ENV_KEYS = new Set([
  "GIT_DIR",
  "GIT_WORK_TREE",
  "GIT_INDEX_FILE",
  "GIT_COMMON_DIR",
  "GIT_OBJECT_DIRECTORY",
  "GIT_ALTERNATE_OBJECT_DIRECTORIES",
  "GIT_NAMESPACE",
  "GIT_CONFIG_GLOBAL",
  "GIT_CONFIG_SYSTEM",
  "GIT_CONFIG_NOSYSTEM",
  "GIT_CONFIG_PARAMETERS",
  "GIT_CONFIG_COUNT",
]);

function fail(message) {
  const error = new Error(message);
  error.name = "VoidFleetRuntimePinStatusCanonicalEvaluatorError";
  throw error;
}

function assertString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    fail(`${label} must be a non-empty string`);
  }
  if (/[^\x20-\x7e]/.test(value)) {
    fail(`${label} contains a control or non-ASCII character`);
  }
  return value;
}

function assertSha(value, label) {
  const normalized = String(value ?? "");
  if (!SHA_RE.test(normalized)) fail(`${label} must be lowercase 40-hex`);
  return normalized;
}

function expandHome(input) {
  if (input === "~") return homedir();
  if (input.startsWith("~/")) return resolve(homedir(), input.slice(2));
  return input;
}

function parseUnpaddedInteger(value, label) {
  if (!/^(?:0|[1-9][0-9]*)$/.test(String(value ?? ""))) {
    fail(`${label} must be an unpadded integer`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) fail(`${label} is outside the safe integer range`);
  return parsed;
}

export function assertCanonicalEvaluationGitEnvironmentV1(env = process.env) {
  const forbidden = [];
  for (const key of Object.keys(env)) {
    if (
      FORBIDDEN_GIT_ENV_KEYS.has(key) ||
      /^GIT_CONFIG_(?:KEY|VALUE)_[0-9]+$/.test(key)
    ) {
      forbidden.push(key);
    }
  }
  if (forbidden.length > 0) {
    fail(`Git repository/configuration override environment is not allowed: ${forbidden.sort().join(",")}`);
  }
  return true;
}

function runGit(repo, args) {
  assertCanonicalEvaluationGitEnvironmentV1(process.env);
  const result = spawnSync("git", ["-C", repo, ...args], {
    encoding: "utf8",
    timeout: 10_000,
    maxBuffer: MAX_GIT_OUTPUT_BYTES,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
  if (result.error || result.status !== 0) {
    fail("read-only canonical Git inspection failed");
  }
  return result.stdout ?? "";
}

export function parseCanonicalLsRemoteV1(stdout, expectedRef = "refs/heads/main") {
  const lines = String(stdout)
    .split(/\r?\n/)
    .filter((line) => line.length > 0);
  if (lines.length !== 1) {
    fail("canonical main inspection must return exactly one ref");
  }
  const fields = lines[0].split(/\s+/);
  if (fields.length !== 2 || fields[1] !== expectedRef) {
    fail("canonical main inspection returned an unexpected ref");
  }
  return assertSha(fields[0], "live canonical main SHA");
}

export function sampleLiveCanonicalMainV1({
  coordinatorRepo,
  canonicalRemote,
  canonicalBranch = "main",
}) {
  assertCanonicalEvaluationGitEnvironmentV1(process.env);
  const repo = realpathSync(expandHome(assertString(coordinatorRepo, "coordinator repo")));
  const remote = assertString(canonicalRemote, "canonical remote");
  if (!REMOTE_RE.test(remote)) fail("canonical remote name is invalid");
  if (canonicalBranch !== "main") fail("canonical branch must be exact main");

  const topLevel = realpathSync(
    runGit(repo, ["rev-parse", "--show-toplevel"]).trim(),
  );
  if (topLevel !== repo) {
    fail("coordinator repo must be the exact Git worktree root");
  }

  const remoteUrl = runGit(repo, ["remote", "get-url", remote]).trim();
  if (!remoteUrl || /[\r\n]/.test(remoteUrl)) {
    fail("canonical remote URL is unavailable or ambiguous");
  }

  const ref = `refs/heads/${canonicalBranch}`;
  const sha = parseCanonicalLsRemoteV1(
    runGit(repo, ["ls-remote", "--exit-code", remote, ref]),
    ref,
  );
  return Object.freeze({ sha, remote_url: remoteUrl });
}

export function assertCanonicalBracketV1({
  driftCanonicalSha,
  before,
  after,
}) {
  const driftSha = assertSha(driftCanonicalSha, "drift canonical SHA");
  const beforeSha = assertSha(before?.sha, "pre-evaluation canonical SHA");
  const afterSha = assertSha(after?.sha, "post-evaluation canonical SHA");
  if (beforeSha !== driftSha) {
    fail("drift audit canonical main is stale relative to live canonical main");
  }
  if (afterSha !== beforeSha) {
    fail("canonical main changed during runtime-pin evaluation");
  }
  if (after?.remote_url !== before?.remote_url) {
    fail("canonical remote identity changed during runtime-pin evaluation");
  }
  return beforeSha;
}

function parseArgs(argv) {
  const out = {
    driftAudit: "",
    processAudit: "",
    approvedRuntimeSha: "",
    coordinatorRepo: DEFAULT_REPO_ROOT,
    maxEvidenceAgeSeconds: DEFAULT_MAX_EVIDENCE_AGE_SECONDS,
    output: "",
  };
  const seen = new Set();
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help") {
      console.log(
        "Usage: node ops/run_void_node_fleet_runtime_pin_status_v1.mjs --drift-audit PATH --process-freshness-audit PATH --approved-runtime-sha SHA [--coordinator-repo PATH] [--max-evidence-age-seconds N] [--output PATH]",
      );
      process.exit(0);
    }
    if (
      ![
        "--drift-audit",
        "--process-freshness-audit",
        "--approved-runtime-sha",
        "--coordinator-repo",
        "--max-evidence-age-seconds",
        "--output",
      ].includes(arg)
    ) {
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
    else if (arg === "--max-evidence-age-seconds") {
      out.maxEvidenceAgeSeconds = parseUnpaddedInteger(value, "max evidence age");
    } else if (arg === "--output") out.output = value;
  }
  if (!out.driftAudit) fail("--drift-audit is required");
  if (!out.processAudit) fail("--process-freshness-audit is required");
  if (!out.approvedRuntimeSha) fail("--approved-runtime-sha is required");
  if (
    out.maxEvidenceAgeSeconds < 1 ||
    out.maxEvidenceAgeSeconds > MAX_EVIDENCE_AGE_SECONDS
  ) {
    fail(`max evidence age must be 1..${MAX_EVIDENCE_AGE_SECONDS} seconds`);
  }
  return out;
}

function emitJson(packet, outputPath = "") {
  const json = `${JSON.stringify(packet, null, 2)}\n`;
  if (outputPath) {
    writeFileSync(expandHome(outputPath), json, {
      encoding: "utf8",
      mode: 0o600,
      flag: "wx",
    });
  }
  process.stdout.write(json);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  assertCanonicalEvaluationGitEnvironmentV1(process.env);

  const drift = readFreshFleetDriftAuditV1(
    args.driftAudit,
    args.maxEvidenceAgeSeconds,
  );
  const processEvidence = readFreshFleetProcessAuditV1(
    args.processAudit,
    args.maxEvidenceAgeSeconds,
  );

  const canonicalContext = {
    coordinatorRepo: args.coordinatorRepo,
    canonicalRemote: drift.audit.canonical.remote,
    canonicalBranch: drift.audit.canonical.branch,
  };
  const before = sampleLiveCanonicalMainV1(canonicalContext);
  if (before.sha !== drift.audit.canonical.sha) {
    fail("drift audit canonical main is stale relative to live canonical main");
  }

  const packet = buildFleetRuntimePinStatusV1({
    audit: drift.audit,
    processAudit: processEvidence.audit,
    approvedRuntimeSha: args.approvedRuntimeSha,
    sourceAuditFileSha256: drift.file_sha256,
    sourceAuditMtimeEpochMs: drift.mtime_epoch_ms,
    processAuditFileSha256: processEvidence.file_sha256,
    processAuditMtimeEpochMs: processEvidence.mtime_epoch_ms,
    evaluatedAtEpochMs: Date.now(),
    evidenceOutputCreated: Boolean(args.output),
  });

  const after = sampleLiveCanonicalMainV1(canonicalContext);
  assertCanonicalBracketV1({
    driftCanonicalSha: drift.audit.canonical.sha,
    before,
    after,
  });

  emitJson(packet, args.output);
  process.exitCode = ["HOLD", "UNEXPECTED_RUNTIME_DRIFT"].includes(
    packet.status,
  )
    ? 2
    : 0;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  try {
    main();
  } catch (error) {
    console.error(
      JSON.stringify({
        marker: VOID_NODE_FLEET_RUNTIME_PIN_STATUS_V1,
        status: "HOLD",
        error: String(error?.message || error),
        mutation_attempted: false,
        canonical_remote_read_only: true,
      }),
    );
    process.exitCode = 1;
  }
}
