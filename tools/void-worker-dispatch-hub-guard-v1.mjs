#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  resolveCoordinationSuccessorChainLiveV1,
} from "./void-coordination-successor-chain-v1.mjs";
import {
  EVIDENCE_MARKER as LIVE_DISPATCH_EVIDENCE_MARKER,
  evaluateWorkerLiveDispatchV1,
} from "./void-worker-coordination-live-dispatch-v1.mjs";

export const MARKER = "VOID_WORKER_DISPATCH_HUB_GUARD_V1";
export const EVIDENCE_MARKER = "VOID_WORKER_DISPATCH_HUB_GUARD_EVIDENCE_V1";
export const CHAIN_MARKER = "VOID_COORDINATION_SUCCESSOR_CHAIN_V1";
export const DISPATCH_MARKER = "VOID_WORKER_LIVE_DISPATCH_V1";
export const CANONICAL_REPOSITORY = "6ZoSo9/void-node";
export const CANONICAL_GIT_URL =
  "https://github.com/6ZoSo9/void-node.git";
export const CANONICAL_MAIN_REF = "refs/heads/main";
export const LIVE_MAIN_QUERY_TIMEOUT_MS = 15_000;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GIT = "/usr/bin/git";
const DISPATCH_POLICY_REL =
  "ops/coordination/worker-live-dispatch-policy-v1.json";
const MAX_STDIN_BYTES = 2 * 1024 * 1024;
const SHA1_PATTERN = /^[0-9a-f]{40}$/u;
const SHA256_ID_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const CHAIN_OUTCOMES = new Set([
  "CURRENT",
  "ROTATION_REQUIRED",
  "SUCCESSOR_RESOLVED",
  "HOLD_INVALID_SUCCESSOR_CHAIN",
]);

export class WorkerDispatchHubGuardError extends Error {
  constructor(message) {
    super(message);
    this.name = "WorkerDispatchHubGuardError";
  }
}

function fail(message) {
  throw new WorkerDispatchHubGuardError(message);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireObject(value, label) {
  if (!isPlainObject(value)) fail(label + " must be an object");
  return value;
}

function requireString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    fail(label + " must be a non-empty string");
  }
  return value;
}

function requireBoolean(value, label) {
  if (typeof value !== "boolean") fail(label + " must be boolean");
  return value;
}

function requireSafeInteger(value, label) {
  if (!Number.isSafeInteger(value)) fail(label + " must be a safe integer");
  return value;
}

function requireIsoTimestamp(value, label) {
  requireString(value, label);
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) {
    fail(label + " must be a canonical UTC ISO timestamp");
  }
  return parsed;
}

function requirePositiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 1) {
    fail(label + " must be a positive safe integer");
  }
  return value;
}

function requireNullablePositiveInteger(value, label) {
  if (value === null) return null;
  return requirePositiveInteger(value, label);
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

export function assertFreshLiveChainMatchesV1(suppliedChain, liveChain) {
  requireObject(suppliedChain, "supplied chain");
  requireObject(liveChain, "live chain");
  if (canonicalJson(suppliedChain) !== canonicalJson(liveChain)) {
    fail("supplied successor chain does not match fresh live resolution");
  }
  return true;
}

export function assertFreshLiveDispatchMatchesV1(
  suppliedDispatch,
  liveDispatch,
) {
  requireObject(suppliedDispatch, "supplied dispatch");
  requireObject(liveDispatch, "live dispatch");
  if (canonicalJson(suppliedDispatch) !== canonicalJson(liveDispatch)) {
    fail("supplied live dispatch does not match fresh live evaluation");
  }
  return true;
}

function contentId(value) {
  return "sha256:" + crypto
    .createHash("sha256")
    .update(canonicalJson(value))
    .digest("hex");
}

function reviewedGitEnvV1() {
  const env = { ...process.env };
  for (const key of [
    "GIT_DIR",
    "GIT_WORK_TREE",
    "GIT_COMMON_DIR",
    "GIT_INDEX_FILE",
    "GIT_OBJECT_DIRECTORY",
    "GIT_ALTERNATE_OBJECT_DIRECTORIES",
    "GIT_NAMESPACE",
    "GIT_REPLACE_REF_BASE",
    "GIT_CONFIG_PARAMETERS",
    "GIT_CONFIG_COUNT",
    "GIT_EXEC_PATH",
  ]) {
    delete env[key];
  }
  for (const key of Object.keys(env)) {
    if (/^GIT_CONFIG_(?:KEY|VALUE)_\d+$/u.test(key)) delete env[key];
  }
  env.GIT_CONFIG_GLOBAL = "/dev/null";
  env.GIT_CONFIG_SYSTEM = "/dev/null";
  env.GIT_CONFIG_NOSYSTEM = "1";
  env.GIT_OPTIONAL_LOCKS = "0";
  env.GIT_SSL_NO_VERIFY = "false";
  env.LANG = "C";
  env.LC_ALL = "C";
  env.PATH = "/usr/bin:/bin";
  return env;
}

export function parseCanonicalMainLsRemoteV1(raw) {
  if (typeof raw !== "string") {
    fail("canonical live-main ls-remote bytes must be text");
  }
  const lines = raw.split(/\r?\n/u).filter((line) => line.length > 0);
  if (lines.length !== 1) {
    fail("canonical live-main ls-remote must contain exactly one record");
  }
  const match = /^([0-9a-f]{40})\trefs\/heads\/main$/u.exec(lines[0]);
  if (!match) {
    fail("canonical live-main ls-remote record is malformed");
  }
  return match[1];
}

export function assertCanonicalMainCheckoutV1(localHead, liveMain) {
  if (typeof localHead !== "string" || !SHA1_PATTERN.test(localHead)) {
    fail("local HEAD must be a lowercase 40-character SHA-1");
  }
  if (typeof liveMain !== "string" || !SHA1_PATTERN.test(liveMain)) {
    fail("live canonical main must be a lowercase 40-character SHA-1");
  }
  if (localHead !== liveMain) {
    fail("local HEAD does not equal live canonical main");
  }
  return true;
}

function gitReadV1(
  args,
  {
    timeoutMs = 15_000,
    cwd = undefined,
  } = {},
) {
  const result = spawnSync(
    GIT,
    args,
    {
      cwd,
      encoding: "utf8",
      maxBuffer: MAX_STDIN_BYTES,
      stdio: ["ignore", "pipe", "pipe"],
      timeout: timeoutMs,
      env: {
        ...reviewedGitEnvV1(),
        GIT_TERMINAL_PROMPT: "0",
      },
    },
  );
  if (result.error || result.status !== 0) {
    return null;
  }
  return result.stdout;
}

function resolveCanonicalReviewedMainV1() {
  const localHeadRaw = gitReadV1([
    "--no-replace-objects",
    "-C",
    ROOT,
    "rev-parse",
    "--verify",
    "HEAD^{commit}",
  ]);
  if (localHeadRaw === null) {
    fail("local reviewed HEAD commit is unavailable");
  }
  const localHead = localHeadRaw.trim();
  if (!SHA1_PATTERN.test(localHead)) {
    fail("local reviewed HEAD commit is malformed");
  }

  const liveMainRaw = gitReadV1(
    [
      "ls-remote",
      "--heads",
      CANONICAL_GIT_URL,
      CANONICAL_MAIN_REF,
    ],
    {
      timeoutMs: LIVE_MAIN_QUERY_TIMEOUT_MS,
      cwd: "/",
    },
  );
  if (liveMainRaw === null) {
    fail("live canonical main metadata is unavailable");
  }
  const liveMain = parseCanonicalMainLsRemoteV1(liveMainRaw);
  assertCanonicalMainCheckoutV1(localHead, liveMain);
  return liveMain;
}

function loadReviewedDispatchPolicyAtCommitV1(commitSha) {
  if (typeof commitSha !== "string" || !SHA1_PATTERN.test(commitSha)) {
    fail("reviewed dispatch policy commit must be a lowercase 40-character SHA-1");
  }
  const result = spawnSync(
    GIT,
    [
      "--no-replace-objects",
      "-C",
      ROOT,
      "show",
      commitSha + ":" + DISPATCH_POLICY_REL,
    ],
    {
      encoding: "utf8",
      maxBuffer: MAX_STDIN_BYTES,
      stdio: ["ignore", "pipe", "pipe"],
      env: reviewedGitEnvV1(),
    },
  );
  if (result.error || result.status !== 0) {
    fail("reviewed live-dispatch policy commit object is unavailable");
  }
  let policy;
  try {
    policy = JSON.parse(result.stdout);
  } catch {
    fail("reviewed live-dispatch policy commit object is not valid JSON");
  }
  if (policy?.repository !== CANONICAL_REPOSITORY) {
    fail("reviewed live-dispatch policy repository is not canonical");
  }
  return policy;
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function validateChain(raw) {
  const chain = structuredClone(requireObject(raw, "evidence.chain"));
  if (chain.marker !== CHAIN_MARKER) {
    fail("evidence.chain.marker mismatch");
  }
  if (chain.version !== 1) fail("evidence.chain.version must equal 1");
  requireString(chain.repository_scope, "evidence.chain.repository_scope");
  if (chain.repository_scope !== CANONICAL_REPOSITORY) {
    fail("evidence.chain.repository_scope must equal canonical repository");
  }
  requirePositiveInteger(chain.root_issue, "evidence.chain.root_issue");
  requirePositiveInteger(chain.current_issue, "evidence.chain.current_issue");
  if (!CHAIN_OUTCOMES.has(chain.outcome)) {
    fail("evidence.chain.outcome is unsupported");
  }
  requireBoolean(chain.chain_valid, "evidence.chain.chain_valid");
  requireBoolean(chain.rotation_required, "evidence.chain.rotation_required");
  const dispatchPlanIssue = requireNullablePositiveInteger(
    chain.dispatch_plan_issue_should_be,
    "evidence.chain.dispatch_plan_issue_should_be",
  );
  requireBoolean(
    chain.plan_issue_update_required,
    "evidence.chain.plan_issue_update_required",
  );

  for (const key of [
    "issue_creation_authorized",
    "issue_close_authorized",
    "scheduler_mutation_authorized",
    "source_mutation_authorized",
    "runtime_mutation_authorized",
    "authority_granted",
    "mutation_performed",
  ]) {
    if (requireBoolean(chain[key], "evidence.chain." + key) !== false) {
      fail("evidence.chain." + key + " must remain false");
    }
  }

  if (chain.outcome === "HOLD_INVALID_SUCCESSOR_CHAIN") {
    if (chain.chain_valid !== false) {
      fail("invalid successor-chain outcome must set chain_valid=false");
    }
    if (dispatchPlanIssue !== null) {
      fail("invalid successor chain must suppress dispatch plan issue");
    }
    if (chain.plan_issue_update_required !== false) {
      fail("invalid successor chain must not request plan issue update");
    }
  } else {
    if (chain.chain_valid !== true) {
      fail("non-HOLD successor-chain outcome must set chain_valid=true");
    }
    if (dispatchPlanIssue === null) {
      fail("valid successor chain must identify dispatch plan issue");
    }
    if (dispatchPlanIssue !== chain.current_issue) {
      fail("valid successor chain dispatch plan issue must equal current issue");
    }
    const expectedUpdate = chain.current_issue !== chain.root_issue;
    if (chain.plan_issue_update_required !== expectedUpdate) {
      fail("successor-chain plan issue update flag is inconsistent");
    }
  }

  if (chain.outcome === "ROTATION_REQUIRED") {
    if (chain.rotation_required !== true) {
      fail("ROTATION_REQUIRED must set rotation_required=true");
    }
  } else if (chain.rotation_required !== false) {
    fail("only ROTATION_REQUIRED may set rotation_required=true");
  }

  return chain;
}

function validateDispatch(raw, trustedNowMs) {
  const dispatch = structuredClone(requireObject(raw, "evidence.dispatch"));
  if (dispatch.marker !== DISPATCH_MARKER) {
    fail("evidence.dispatch.marker mismatch");
  }
  if (dispatch.version !== 1) fail("evidence.dispatch.version must equal 1");
  requireString(dispatch.repository, "evidence.dispatch.repository");
  if (dispatch.repository !== CANONICAL_REPOSITORY) {
    fail("evidence.dispatch.repository must equal canonical repository");
  }
  requirePositiveInteger(dispatch.plan_issue, "evidence.dispatch.plan_issue");
  requireString(dispatch.evaluation_id, "evidence.dispatch.evaluation_id");
  if (!SHA256_ID_PATTERN.test(dispatch.evaluation_id)) {
    fail("evidence.dispatch.evaluation_id must be sha256 content id");
  }
  const { evaluation_id: suppliedEvaluationId, ...dispatchMaterial } = dispatch;
  if (contentId(dispatchMaterial) !== suppliedEvaluationId) {
    fail("evidence.dispatch.evaluation_id content identity mismatch");
  }

  const evaluatedAtMs = requireIsoTimestamp(
    dispatch.evaluated_at,
    "evidence.dispatch.evaluated_at",
  );
  const nextReevaluationMs = requireIsoTimestamp(
    dispatch.next_reevaluation_at,
    "evidence.dispatch.next_reevaluation_at",
  );
  const reevaluationMinutes = requireSafeInteger(
    dispatch.reevaluation_interval_minutes,
    "evidence.dispatch.reevaluation_interval_minutes",
  );
  if (reevaluationMinutes !== 30) {
    fail("evidence.dispatch.reevaluation_interval_minutes must equal 30");
  }
  if (evaluatedAtMs > trustedNowMs) {
    fail("evidence.dispatch.evaluated_at must not be in the future");
  }
  if (nextReevaluationMs - evaluatedAtMs !== reevaluationMinutes * 60_000) {
    fail("evidence.dispatch reevaluation window is inconsistent");
  }
  const dispatchFresh = trustedNowMs < nextReevaluationMs;

  for (const key of [
    "continuous_execution_guaranteed",
    "source_mutation_authorized",
    "runtime_mutation_authorized",
    "automatic_issue_or_pr_creation_authorized",
    "automatic_merge_authorized",
    "authority_granted",
  ]) {
    if (requireBoolean(dispatch[key], "evidence.dispatch." + key) !== false) {
      fail("evidence.dispatch." + key + " must remain false");
    }
  }
  if (
    requireBoolean(
      dispatch.external_worker_invocation_required,
      "evidence.dispatch.external_worker_invocation_required",
    ) !== true
  ) {
    fail("live dispatch must require external worker invocation");
  }

  return {
    dispatch,
    evaluatedAtMs,
    nextReevaluationMs,
    dispatchFresh,
  };
}

export function evaluateWorkerDispatchHubGuardV1(
  rawEvidence,
  {
    liveChain = null,
    liveDispatch = null,
    reviewedMainSha = null,
  } = {},
) {
  const evidence = structuredClone(requireObject(rawEvidence, "evidence"));
  if (evidence.marker !== EVIDENCE_MARKER) {
    fail("evidence.marker mismatch");
  }
  if (evidence.version !== 1) fail("evidence.version must equal 1");

  const chain = validateChain(evidence.chain);
  const trustedNowMs = Date.now();
  if (!Number.isSafeInteger(trustedNowMs)) fail("trusted current time is invalid");
  const dispatchState = validateDispatch(evidence.dispatch, trustedNowMs);
  const dispatch = dispatchState.dispatch;
  requireObject(evidence.dispatch_evidence, "evidence.dispatch_evidence");
  if (chain.repository_scope !== dispatch.repository) {
    fail("coordination chain and live dispatch repository mismatch");
  }

  const liveChainRevalidated =
    liveChain !== null
    && assertFreshLiveChainMatchesV1(evidence.chain, liveChain) === true;
  const liveDispatchRevalidated =
    liveDispatch !== null
    && assertFreshLiveDispatchMatchesV1(
      evidence.dispatch,
      liveDispatch,
    ) === true;
  const liveMainRevalidated =
    reviewedMainSha !== null
    && typeof reviewedMainSha === "string"
    && SHA1_PATTERN.test(reviewedMainSha);

  let outcome;
  let reason;
  let normalDispatchAllowed = false;

  if (!chain.chain_valid || chain.outcome === "HOLD_INVALID_SUCCESSOR_CHAIN") {
    outcome = "HOLD_INVALID_SUCCESSOR_CHAIN";
    reason = "coordination successor chain is structurally invalid";
  } else if (chain.outcome === "ROTATION_REQUIRED") {
    outcome = "HOLD_ROTATION_REQUIRED";
    reason = "current coordination hub exceeded the rotation boundary without a successor";
  } else if (dispatch.plan_issue !== chain.dispatch_plan_issue_should_be) {
    outcome = "HOLD_PLAN_ISSUE_MISMATCH";
    reason =
      "live dispatch plan issue does not match the resolved coordination hub";
  } else if (!dispatchState.dispatchFresh) {
    outcome = "HOLD_DISPATCH_EVIDENCE_EXPIRED";
    reason = "live dispatch output passed its 30-minute reevaluation deadline";
  } else if (liveChainRevalidated !== true) {
    outcome = "HOLD_CHAIN_LIVENESS_UNPROVEN";
    reason =
      "aligned retained evidence was not revalidated against the live successor chain";
  } else if (liveDispatchRevalidated !== true) {
    outcome = "HOLD_DISPATCH_LIVENESS_UNPROVEN";
    reason =
      "supplied dispatch was not freshly re-evaluated from the reviewed policy and worker evidence";
  } else if (liveMainRevalidated !== true) {
    outcome = "HOLD_MAIN_PROVENANCE_UNPROVEN";
    reason =
      "reviewed dispatch policy generation was not bound to live canonical main";
  } else {
    outcome = "DISPATCH_HUB_ALIGNED";
    reason =
      "dispatch and successor chain both match their freshly revalidated live generations";
    normalDispatchAllowed = true;
  }

  const material = {
    marker: MARKER,
    version: 1,
    repository: dispatch.repository,
    outcome,
    reason,
    chain_outcome: chain.outcome,
    chain_valid: chain.chain_valid,
    rotation_required: chain.rotation_required,
    root_issue: chain.root_issue,
    resolved_current_issue: chain.current_issue,
    dispatch_plan_issue_should_be: chain.dispatch_plan_issue_should_be,
    dispatch_plan_issue_observed: dispatch.plan_issue,
    dispatch_evaluation_id: dispatch.evaluation_id,
    dispatch_evaluated_at: dispatch.evaluated_at,
    dispatch_next_reevaluation_at: dispatch.next_reevaluation_at,
    dispatch_evidence_fresh: dispatchState.dispatchFresh,
    live_chain_revalidated: liveChainRevalidated === true,
    live_dispatch_revalidated: liveDispatchRevalidated === true,
    reviewed_main_sha:
      liveMainRevalidated === true ? reviewedMainSha : null,
    live_main_revalidated: liveMainRevalidated === true,
    normal_dispatch_allowed: normalDispatchAllowed,
    read_only_evidence_only: !normalDispatchAllowed,
    requires_fresh_chain_evidence: liveChainRevalidated !== true,
    requires_fresh_dispatch_evidence:
      !dispatchState.dispatchFresh || liveDispatchRevalidated !== true,
    requires_live_main_evidence: liveMainRevalidated !== true,
    external_worker_invocation_required: true,
    issue_creation_authorized: false,
    issue_close_authorized: false,
    scheduler_mutation_authorized: false,
    source_mutation_authorized: false,
    runtime_mutation_authorized: false,
    automatic_issue_or_pr_creation_authorized: false,
    automatic_merge_authorized: false,
    authority_granted: false,
    mutation_performed: false,
  };

  return deepFreeze({
    ...material,
    guard_id: contentId(material),
  });
}

async function readBoundedStdin() {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of process.stdin) {
    bytes += chunk.length;
    if (bytes > MAX_STDIN_BYTES) {
      fail("stdin exceeds " + MAX_STDIN_BYTES + " bytes");
    }
    chunks.push(chunk);
  }
  if (bytes === 0) fail("stdin evidence JSON is required");
  return Buffer.concat(chunks).toString("utf8");
}

function parseArgs(argv) {
  const args = { outputPath: null, pretty: false };
  const remaining = [...argv];
  while (remaining.length > 0) {
    const flag = remaining.shift();
    if (flag === "--pretty") {
      args.pretty = true;
      continue;
    }
    const value = remaining.shift();
    if (!value || value.startsWith("--")) fail("missing value for " + flag);
    if (flag === "--output") args.outputPath = value;
    else fail("unknown argument: " + flag);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const evidence = JSON.parse(await readBoundedStdin());
  const suppliedChain = validateChain(evidence.chain);
  const trustedNowMs = Date.now();
  if (!Number.isSafeInteger(trustedNowMs)) fail("trusted current time is invalid");
  const suppliedDispatchState = validateDispatch(
    evidence.dispatch,
    trustedNowMs,
  );
  const suppliedDispatch = suppliedDispatchState.dispatch;
  if (suppliedChain.repository_scope !== suppliedDispatch.repository) {
    fail("coordination chain and live dispatch repository mismatch");
  }
  const dispatchEvidence = structuredClone(
    requireObject(evidence.dispatch_evidence, "evidence.dispatch_evidence"),
  );
  if (dispatchEvidence.marker !== LIVE_DISPATCH_EVIDENCE_MARKER) {
    fail("evidence.dispatch_evidence.marker mismatch");
  }
  const reviewedMainSha = resolveCanonicalReviewedMainV1();
  const reviewedPolicy = loadReviewedDispatchPolicyAtCommitV1(
    reviewedMainSha,
  );
  const liveDispatch = evaluateWorkerLiveDispatchV1(
    reviewedPolicy,
    dispatchEvidence,
  );
  assertFreshLiveDispatchMatchesV1(suppliedDispatch, liveDispatch);
  const liveChain = resolveCoordinationSuccessorChainLiveV1(
    CANONICAL_REPOSITORY,
    suppliedChain.root_issue,
  );
  const result = evaluateWorkerDispatchHubGuardV1(evidence, {
    liveChain,
    liveDispatch,
    reviewedMainSha,
  });
  const output = JSON.stringify(result, null, args.pretty ? 2 : 0) + "\n";
  if (args.outputPath) {
    await writeFile(path.resolve(args.outputPath), output, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
  }
  process.stdout.write(output);
  if (!result.normal_dispatch_allowed) process.exitCode = 3;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(MARKER + "=HOLD\n" + message + "\n");
    process.exitCode = 2;
  });
}
