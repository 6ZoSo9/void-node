#!/usr/bin/env node

import crypto from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import {
  resolveCoordinationSuccessorChainLiveV1,
} from "./void-coordination-successor-chain-v1.mjs";
import {
  evaluateWorkerLiveDispatchV1,
} from "./void-worker-coordination-live-dispatch-v1.mjs";

export const MARKER = "VOID_WORKER_DISPATCH_HUB_GUARD_V1";
export const EVIDENCE_MARKER = "VOID_WORKER_DISPATCH_HUB_GUARD_EVIDENCE_V1";
export const CHAIN_MARKER = "VOID_COORDINATION_SUCCESSOR_CHAIN_V1";
export const DISPATCH_MARKER = "VOID_WORKER_LIVE_DISPATCH_V1";

const MAX_STDIN_BYTES = 2 * 1024 * 1024;
const DEFAULT_DISPATCH_POLICY_PATH =
  "ops/coordination/worker-live-dispatch-policy-v1.json";
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

export function assertRederivedDispatchMatchesV1(
  suppliedDispatch,
  rederivedDispatch,
) {
  requireObject(suppliedDispatch, "supplied dispatch");
  requireObject(rederivedDispatch, "rederived dispatch");
  if (canonicalJson(suppliedDispatch) !== canonicalJson(rederivedDispatch)) {
    fail("supplied live dispatch does not match rederived dispatch output");
  }
  return true;
}

function contentId(value) {
  return "sha256:" + crypto
    .createHash("sha256")
    .update(canonicalJson(value))
    .digest("hex");
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
  requirePositiveInteger(dispatch.plan_issue, "evidence.dispatch.plan_issue");
  requireString(dispatch.evaluation_id, "evidence.dispatch.evaluation_id");
  if (!SHA256_ID_PATTERN.test(dispatch.evaluation_id)) {
    fail("evidence.dispatch.evaluation_id must be sha256 content id");
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
    rederivedDispatch = null,
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
  if (chain.repository_scope !== dispatch.repository) {
    fail("coordination chain and live dispatch repository mismatch");
  }

  const liveChainRevalidated =
    liveChain !== null
    && assertFreshLiveChainMatchesV1(evidence.chain, liveChain) === true;
  const dispatchProvenanceRevalidated =
    rederivedDispatch !== null
    && assertRederivedDispatchMatchesV1(
      evidence.dispatch,
      rederivedDispatch,
    ) === true;

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
  } else if (dispatchProvenanceRevalidated !== true) {
    outcome = "HOLD_DISPATCH_PROVENANCE_UNPROVEN";
    reason =
      "supplied live dispatch output was not rederived from original evidence and current policy";
  } else {
    outcome = "DISPATCH_HUB_ALIGNED";
    reason = "live dispatch plan issue matches the freshly revalidated current coordination hub";
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
    dispatch_provenance_revalidated:
      dispatchProvenanceRevalidated === true,
    normal_dispatch_allowed: normalDispatchAllowed,
    read_only_evidence_only: !normalDispatchAllowed,
    requires_fresh_chain_evidence: liveChainRevalidated !== true,
    requires_fresh_dispatch_evidence: !dispatchState.dispatchFresh,
    requires_dispatch_provenance_rederivation:
      dispatchProvenanceRevalidated !== true,
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
  const args = {
    outputPath: null,
    policyPath: DEFAULT_DISPATCH_POLICY_PATH,
    pretty: false,
  };
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
    else if (flag === "--policy") args.policyPath = value;
    else fail("unknown argument: " + flag);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const evidence = JSON.parse(await readBoundedStdin());
  const suppliedChain = validateChain(evidence.chain);
  const dispatchEvidence = structuredClone(
    requireObject(evidence.dispatch_evidence, "evidence.dispatch_evidence"),
  );
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
  const policyRaw = JSON.parse(
    await readFile(path.resolve(args.policyPath), "utf8"),
  );
  const rederivedDispatch = evaluateWorkerLiveDispatchV1(
    policyRaw,
    dispatchEvidence,
  );
  const liveChain = resolveCoordinationSuccessorChainLiveV1(
    suppliedDispatch.repository,
    suppliedChain.root_issue,
  );
  const result = evaluateWorkerDispatchHubGuardV1(evidence, {
    liveChain,
    rederivedDispatch,
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
