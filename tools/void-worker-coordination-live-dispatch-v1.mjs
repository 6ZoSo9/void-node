#!/usr/bin/env node

import crypto from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

export const MARKER = "VOID_WORKER_LIVE_DISPATCH_V1";
export const POLICY_MARKER = "VOID_WORKER_LIVE_DISPATCH_POLICY_V1";
export const EVIDENCE_MARKER = "VOID_WORKER_LIVE_DISPATCH_EVIDENCE_V1";

const MAX_STDIN_BYTES = 1_048_576;
const SHA_PATTERN = /^[0-9a-f]{40}$/;
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TOKEN_PATTERN = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;
const PRIORITIES = new Set(["P0", "P1", "P2", "P3"]);
const COHORTS = new Set(["coordinator", "stooges", "specialist", "experimental"]);
const COLLISIONS = new Set(["CLEAR", "ADVISORY", "HARD_STOP"]);
const PRIMARY_STATES = new Set([
  "RUNNING",
  "ACTIONABLE",
  "WAITING_REVIEW",
  "WAITING_AUTHORITY",
  "WAITING_DEPENDENCY",
  "WAITING_EVENT",
  "PARKED",
  "FROZEN",
  "COMPLETE",
  "BLOCKED_RED",
  "NONE",
]);

const POLICY_KEYS = Object.freeze([
  "marker",
  "version",
  "repository",
  "plan_issue",
  "composition",
  "reevaluation",
  "noise_budget",
  "universal_fallback",
  "workers",
]);
const COMPOSITION_KEYS = Object.freeze([
  "base_worker_ids",
  "exploration_extension_worker_ids",
  "supplemental_worker_ids",
  "expected_worker_count",
]);
const REEVALUATION_KEYS = Object.freeze([
  "interval_minutes",
  "execution_evidence_max_age_minutes",
  "stale_exploration_days",
  "continuous_execution_guaranteed",
  "external_worker_invocation_required",
  "no_unassigned_worker_when_evaluated",
]);
const NOISE_KEYS = Object.freeze([
  "max_open_exploration_issues_per_worker",
  "max_open_exploration_prs_per_worker",
  "ranked_candidate_required_before_branch",
  "source_mutation_requires_fresh_collision_check",
  "automatic_issue_or_pr_creation",
  "automatic_merge_authority",
]);
const FALLBACK_POLICY_KEYS = Object.freeze([
  "lane_id",
  "priority",
  "sensitive",
  "tracking_issue",
  "exploration_domains",
  "authority_boundary",
]);
const WORKER_POLICY_KEYS = Object.freeze([
  "id",
  "name",
  "cohort",
  "tracking_issue",
  "fallback_lane_id",
  "fallback_priority",
  "sensitive",
  "exploration_domains",
  "authority_boundary",
]);
const EVIDENCE_KEYS = Object.freeze([
  "marker",
  "version",
  "repository",
  "plan_issue",
  "evaluated_at",
  "observed_main_sha",
  "workers",
]);
const WORKER_EVIDENCE_KEYS = Object.freeze(["id", "primary", "fallback"]);
const PRIMARY_KEYS = Object.freeze([
  "lane_id",
  "state",
  "priority",
  "collision",
  "next_action",
  "execution_evidence_at",
]);
const FALLBACK_EVIDENCE_KEYS = Object.freeze([
  "collision",
  "issue_open",
  "draft_pr_open",
  "progress_evidence_at",
]);

export class WorkerLiveDispatchError extends Error {
  constructor(message) {
    super(message);
    this.name = "WorkerLiveDispatchError";
  }
}

function fail(message) {
  throw new WorkerLiveDispatchError(message);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireObject(value, label) {
  if (!isPlainObject(value)) fail(`${label} must be an object`);
  return value;
}

function requireExactKeys(value, expected, label) {
  const object = requireObject(value, label);
  const actual = Object.keys(object).sort();
  const wanted = [...expected].sort();
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index])
  ) {
    fail(`${label} keys mismatch: expected=${wanted.join(",")} actual=${actual.join(",")}`);
  }
  return object;
}

function requireString(value, label, { maxLength = 1_000 } = {}) {
  if (typeof value !== "string" || value.trim() === "") {
    fail(`${label} must be a non-empty string`);
  }
  if (value.length > maxLength || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value)) {
    fail(`${label} is not bounded plain text`);
  }
  return value;
}

function requireNullableString(value, label, options = {}) {
  if (value === null) return null;
  return requireString(value, label, options);
}

function requireBoolean(value, label) {
  if (typeof value !== "boolean") fail(`${label} must be boolean`);
  return value;
}

function requireInteger(value, label, { min = Number.MIN_SAFE_INTEGER } = {}) {
  if (!Number.isSafeInteger(value) || value < min) {
    fail(`${label} must be a safe integer >= ${min}`);
  }
  return value;
}

function requireId(value, label) {
  requireString(value, label, { maxLength: 120 });
  if (!ID_PATTERN.test(value)) fail(`${label} must be lowercase kebab-case`);
  return value;
}

function requireToken(value, label) {
  requireString(value, label, { maxLength: 120 });
  if (!TOKEN_PATTERN.test(value)) fail(`${label} must be a lowercase token`);
  return value;
}

function requireSha(value, label) {
  if (typeof value !== "string" || !SHA_PATTERN.test(value)) {
    fail(`${label} must be a lowercase 40-character SHA-1`);
  }
  return value;
}

function requireIsoTimestamp(value, label) {
  requireString(value, label, { maxLength: 40 });
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) {
    fail(`${label} must be a canonical UTC ISO timestamp`);
  }
  return parsed;
}

function requireNullableIsoTimestamp(value, label, evaluatedAtMs) {
  if (value === null) return null;
  const parsed = requireIsoTimestamp(value, label);
  if (parsed > evaluatedAtMs) fail(`${label} must not be in the future`);
  return parsed;
}

function requireUniqueTokens(values, label, { minLength = 1 } = {}) {
  if (!Array.isArray(values) || values.length < minLength) {
    fail(`${label} must contain at least ${minLength} value(s)`);
  }
  const seen = new Set();
  for (const [index, value] of values.entries()) {
    requireToken(value, `${label}[${index}]`);
    if (seen.has(value)) fail(`${label} contains duplicate value: ${value}`);
    seen.add(value);
  }
  return values;
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
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

function contentId(value) {
  return `sha256:${crypto.createHash("sha256").update(canonicalJson(value)).digest("hex")}`;
}

function validateFallbackPolicy(value, label) {
  requireExactKeys(value, FALLBACK_POLICY_KEYS, label);
  requireId(value.lane_id, `${label}.lane_id`);
  if (!PRIORITIES.has(value.priority)) fail(`${label}.priority is unsupported`);
  requireBoolean(value.sensitive, `${label}.sensitive`);
  requireInteger(value.tracking_issue, `${label}.tracking_issue`, { min: 1 });
  requireUniqueTokens(value.exploration_domains, `${label}.exploration_domains`, {
    minLength: 3,
  });
  const boundary = requireString(value.authority_boundary, `${label}.authority_boundary`, {
    maxLength: 2_000,
  });
  const minimum = value.sensitive ? 160 : 120;
  if (boundary.length < minimum) fail(`${label}.authority_boundary must be explicit`);
}

function validateWorkerPolicy(worker, index, context) {
  const label = `policy.workers[${index}]`;
  requireExactKeys(worker, WORKER_POLICY_KEYS, label);
  requireId(worker.id, `${label}.id`);
  requireString(worker.name, `${label}.name`, { maxLength: 80 });
  if (!COHORTS.has(worker.cohort)) fail(`${label}.cohort is unsupported`);
  requireInteger(worker.tracking_issue, `${label}.tracking_issue`, { min: 1 });
  requireId(worker.fallback_lane_id, `${label}.fallback_lane_id`);
  if (!PRIORITIES.has(worker.fallback_priority)) {
    fail(`${label}.fallback_priority is unsupported`);
  }
  requireBoolean(worker.sensitive, `${label}.sensitive`);
  requireUniqueTokens(worker.exploration_domains, `${label}.exploration_domains`, {
    minLength: 3,
  });
  const boundary = requireString(worker.authority_boundary, `${label}.authority_boundary`, {
    maxLength: 2_000,
  });
  const minimum = worker.sensitive ? 160 : 120;
  if (boundary.length < minimum) fail(`${label}.authority_boundary must be explicit`);

  if (context.ids.has(worker.id)) fail(`duplicate policy worker id: ${worker.id}`);
  if (context.names.has(worker.name)) fail(`duplicate policy worker name: ${worker.name}`);
  if (context.lanes.has(worker.fallback_lane_id)) {
    fail(`duplicate policy fallback lane: ${worker.fallback_lane_id}`);
  }
  context.ids.add(worker.id);
  context.names.add(worker.name);
  context.lanes.add(worker.fallback_lane_id);
}

export function validateWorkerLiveDispatchPolicyV1(raw) {
  const policy = structuredClone(raw);
  requireExactKeys(policy, POLICY_KEYS, "policy");
  if (policy.marker !== POLICY_MARKER) fail(`policy.marker must equal ${POLICY_MARKER}`);
  if (policy.version !== 1) fail("policy.version must equal 1");
  requireString(policy.repository, "policy.repository", { maxLength: 200 });
  requireInteger(policy.plan_issue, "policy.plan_issue", { min: 1 });

  requireExactKeys(policy.composition, COMPOSITION_KEYS, "policy.composition");
  const baseIds = requireUniqueTokens(
    policy.composition.base_worker_ids,
    "policy.composition.base_worker_ids",
  );
  const extensionIds = requireUniqueTokens(
    policy.composition.exploration_extension_worker_ids,
    "policy.composition.exploration_extension_worker_ids",
  );
  const supplementalIds = requireUniqueTokens(
    policy.composition.supplemental_worker_ids,
    "policy.composition.supplemental_worker_ids",
  );
  requireInteger(
    policy.composition.expected_worker_count,
    "policy.composition.expected_worker_count",
    { min: 1 },
  );

  const layeredIds = [...baseIds, ...extensionIds, ...supplementalIds];
  const layeredSet = new Set(layeredIds);
  if (layeredSet.size !== layeredIds.length) {
    fail("policy.composition worker layers overlap");
  }
  if (layeredIds.length !== policy.composition.expected_worker_count) {
    fail("policy.composition expected_worker_count mismatch");
  }

  requireExactKeys(policy.reevaluation, REEVALUATION_KEYS, "policy.reevaluation");
  if (policy.reevaluation.interval_minutes !== 30) {
    fail("policy.reevaluation.interval_minutes must equal 30");
  }
  if (policy.reevaluation.execution_evidence_max_age_minutes !== 30) {
    fail("policy.reevaluation.execution_evidence_max_age_minutes must equal 30");
  }
  requireInteger(
    policy.reevaluation.stale_exploration_days,
    "policy.reevaluation.stale_exploration_days",
    { min: 1 },
  );
  if (
    requireBoolean(
      policy.reevaluation.continuous_execution_guaranteed,
      "policy.reevaluation.continuous_execution_guaranteed",
    ) !== false
  ) {
    fail("continuous execution must not be claimed by repository coordination");
  }
  if (
    requireBoolean(
      policy.reevaluation.external_worker_invocation_required,
      "policy.reevaluation.external_worker_invocation_required",
    ) !== true
  ) {
    fail("external worker invocation requirement must remain explicit");
  }
  if (
    requireBoolean(
      policy.reevaluation.no_unassigned_worker_when_evaluated,
      "policy.reevaluation.no_unassigned_worker_when_evaluated",
    ) !== true
  ) {
    fail("no-unassigned-worker evaluation invariant must remain enabled");
  }

  requireExactKeys(policy.noise_budget, NOISE_KEYS, "policy.noise_budget");
  if (policy.noise_budget.max_open_exploration_issues_per_worker !== 1) {
    fail("exploration issue noise budget must remain exactly one");
  }
  if (policy.noise_budget.max_open_exploration_prs_per_worker !== 1) {
    fail("exploration PR noise budget must remain exactly one");
  }
  for (const key of [
    "ranked_candidate_required_before_branch",
    "source_mutation_requires_fresh_collision_check",
  ]) {
    if (requireBoolean(policy.noise_budget[key], `policy.noise_budget.${key}`) !== true) {
      fail(`policy.noise_budget.${key} must remain true`);
    }
  }
  for (const key of ["automatic_issue_or_pr_creation", "automatic_merge_authority"]) {
    if (requireBoolean(policy.noise_budget[key], `policy.noise_budget.${key}`) !== false) {
      fail(`policy.noise_budget.${key} must remain false`);
    }
  }

  validateFallbackPolicy(policy.universal_fallback, "policy.universal_fallback");

  if (!Array.isArray(policy.workers) || policy.workers.length === 0) {
    fail("policy.workers must be a non-empty array");
  }
  const context = { ids: new Set(), names: new Set(), lanes: new Set() };
  policy.workers.forEach((worker, index) => validateWorkerPolicy(worker, index, context));
  if (policy.workers.length !== policy.composition.expected_worker_count) {
    fail("policy.workers count does not match composition");
  }
  const missing = [...layeredSet].filter((id) => !context.ids.has(id)).sort();
  const unexpected = [...context.ids].filter((id) => !layeredSet.has(id)).sort();
  if (missing.length > 0 || unexpected.length > 0) {
    fail(
      `policy worker composition mismatch: missing=${missing.join(",") || "none"} ` +
        `unexpected=${unexpected.join(",") || "none"}`,
    );
  }

  return deepFreeze(policy);
}

function validatePrimary(primary, label, evaluatedAtMs) {
  requireExactKeys(primary, PRIMARY_KEYS, label);
  if (primary.lane_id !== null) requireId(primary.lane_id, `${label}.lane_id`);
  if (!PRIMARY_STATES.has(primary.state)) fail(`${label}.state is unsupported`);
  if (primary.priority !== null && !PRIORITIES.has(primary.priority)) {
    fail(`${label}.priority is unsupported`);
  }
  if (!COLLISIONS.has(primary.collision)) fail(`${label}.collision is unsupported`);
  requireNullableString(primary.next_action, `${label}.next_action`, { maxLength: 500 });
  const executionEvidenceMs = requireNullableIsoTimestamp(
    primary.execution_evidence_at,
    `${label}.execution_evidence_at`,
    evaluatedAtMs,
  );

  if (primary.state === "NONE") {
    if (
      primary.lane_id !== null ||
      primary.priority !== null ||
      primary.next_action !== null ||
      primary.execution_evidence_at !== null ||
      primary.collision !== "CLEAR"
    ) {
      fail(`${label} NONE state must contain no primary claim`);
    }
  } else if (primary.lane_id === null || primary.priority === null) {
    fail(`${label} non-NONE state requires lane_id and priority`);
  }
  if (["RUNNING", "ACTIONABLE"].includes(primary.state) && primary.next_action === null) {
    fail(`${label} ${primary.state} state requires next_action`);
  }
  if (primary.state === "BLOCKED_RED" && primary.collision !== "HARD_STOP") {
    fail(`${label} BLOCKED_RED requires HARD_STOP collision`);
  }

  return executionEvidenceMs;
}

function validateFallbackEvidence(fallback, label, evaluatedAtMs) {
  requireExactKeys(fallback, FALLBACK_EVIDENCE_KEYS, label);
  if (!COLLISIONS.has(fallback.collision)) fail(`${label}.collision is unsupported`);
  requireBoolean(fallback.issue_open, `${label}.issue_open`);
  requireBoolean(fallback.draft_pr_open, `${label}.draft_pr_open`);
  if (fallback.draft_pr_open && !fallback.issue_open) {
    fail(`${label}.draft_pr_open requires issue_open`);
  }
  return requireNullableIsoTimestamp(
    fallback.progress_evidence_at,
    `${label}.progress_evidence_at`,
    evaluatedAtMs,
  );
}

function validateEvidence(raw, policy) {
  const evidence = structuredClone(raw);
  requireExactKeys(evidence, EVIDENCE_KEYS, "evidence");
  if (evidence.marker !== EVIDENCE_MARKER) {
    fail(`evidence.marker must equal ${EVIDENCE_MARKER}`);
  }
  if (evidence.version !== 1) fail("evidence.version must equal 1");
  if (evidence.repository !== policy.repository) fail("evidence.repository mismatch");
  if (evidence.plan_issue !== policy.plan_issue) fail("evidence.plan_issue mismatch");
  const evaluatedAtMs = requireIsoTimestamp(evidence.evaluated_at, "evidence.evaluated_at");
  requireSha(evidence.observed_main_sha, "evidence.observed_main_sha");
  if (!Array.isArray(evidence.workers)) fail("evidence.workers must be an array");

  const policyById = new Map(policy.workers.map((worker) => [worker.id, worker]));
  const seen = new Set();
  const normalized = [];
  for (const [index, workerEvidence] of evidence.workers.entries()) {
    const label = `evidence.workers[${index}]`;
    requireExactKeys(workerEvidence, WORKER_EVIDENCE_KEYS, label);
    requireId(workerEvidence.id, `${label}.id`);
    if (!policyById.has(workerEvidence.id)) fail(`${label} references unknown worker`);
    if (seen.has(workerEvidence.id)) fail(`duplicate evidence worker: ${workerEvidence.id}`);
    seen.add(workerEvidence.id);
    const executionEvidenceMs = validatePrimary(
      workerEvidence.primary,
      `${label}.primary`,
      evaluatedAtMs,
    );
    const fallbackProgressMs = validateFallbackEvidence(
      workerEvidence.fallback,
      `${label}.fallback`,
      evaluatedAtMs,
    );
    normalized.push({
      ...workerEvidence,
      executionEvidenceMs,
      fallbackProgressMs,
    });
  }

  const missing = policy.workers.map((worker) => worker.id).filter((id) => !seen.has(id)).sort();
  if (missing.length > 0) fail(`evidence is missing workers: ${missing.join(",")}`);
  if (seen.size !== policy.workers.length) fail("evidence worker count mismatch");

  normalized.sort((a, b) => a.id.localeCompare(b.id));
  return { evidence, evaluatedAtMs, normalized, policyById };
}

function minutesBetween(laterMs, earlierMs) {
  return (laterMs - earlierMs) / 60_000;
}

function chooseFallbackDispatch({
  worker,
  workerEvidence,
  fallbackProgressMs,
  evaluatedAtMs,
  nextReevaluationAt,
  policy,
  primaryReason,
}) {
  const fallback = workerEvidence.fallback;
  if (fallback.collision === "HARD_STOP" || !fallback.issue_open) {
    return {
      decision: "RUN_UNIVERSAL_EVIDENCE_REFRESH",
      dispatch_mode: "READ_ONLY_EVIDENCE",
      dispatch_lane_id: policy.universal_fallback.lane_id,
      priority: policy.universal_fallback.priority,
      tracking_issue: policy.universal_fallback.tracking_issue,
      reason:
        fallback.collision === "HARD_STOP"
          ? `${primaryReason}; worker fallback has a hard collision`
          : `${primaryReason}; worker fallback tracking issue is not open`,
      fallback_used: true,
      read_only_only: true,
      requires_existing_authority: false,
      requires_fresh_collision_check: true,
      next_reevaluation_at: nextReevaluationAt,
    };
  }

  const staleAfterMinutes = policy.reevaluation.stale_exploration_days * 24 * 60;
  let decision;
  let reason;
  if (fallbackProgressMs === null) {
    decision = "BEGIN_BOUNDED_FALLBACK_RESEARCH";
    reason = `${primaryReason}; no fallback progress evidence is recorded`;
  } else if (minutesBetween(evaluatedAtMs, fallbackProgressMs) > staleAfterMinutes) {
    decision = "REFRESH_STALE_FALLBACK_EVIDENCE";
    reason = `${primaryReason}; fallback evidence exceeds the stale-exploration window`;
  } else {
    decision = "CONTINUE_BOUNDED_FALLBACK_RESEARCH";
    reason = `${primaryReason}; bounded fallback research is available`;
  }

  return {
    decision,
    dispatch_mode: "READ_ONLY_FALLBACK",
    dispatch_lane_id: worker.fallback_lane_id,
    priority: worker.fallback_priority,
    tracking_issue: worker.tracking_issue,
    reason,
    fallback_used: true,
    read_only_only: true,
    requires_existing_authority: false,
    requires_fresh_collision_check: true,
    next_reevaluation_at: nextReevaluationAt,
  };
}

function chooseDispatch({ worker, workerEvidence, executionEvidenceMs, fallbackProgressMs, evaluatedAtMs, nextReevaluationAt, policy }) {
  const primary = workerEvidence.primary;
  const executionAgeMinutes =
    executionEvidenceMs === null ? null : minutesBetween(evaluatedAtMs, executionEvidenceMs);
  const executionEvidenceFresh =
    executionAgeMinutes !== null &&
    executionAgeMinutes <= policy.reevaluation.execution_evidence_max_age_minutes;

  let selected;
  if (primary.state === "RUNNING") {
    if (primary.collision === "HARD_STOP") {
      selected = {
        decision: "REVALIDATE_PRIMARY_COLLISION",
        dispatch_mode: "READ_ONLY_EVIDENCE",
        dispatch_lane_id: primary.lane_id,
        priority: primary.priority,
        tracking_issue: worker.tracking_issue,
        reason: "running primary lane now has a hard collision and must be reread before any further mutation",
        fallback_used: false,
        read_only_only: true,
        requires_existing_authority: false,
        requires_fresh_collision_check: true,
        next_reevaluation_at: nextReevaluationAt,
      };
    } else if (executionEvidenceFresh) {
      selected = {
        decision: "CONTINUE_PRIMARY",
        dispatch_mode: "PRIMARY",
        dispatch_lane_id: primary.lane_id,
        priority: primary.priority,
        tracking_issue: worker.tracking_issue,
        reason: "primary lane is running with fresh execution evidence",
        fallback_used: false,
        read_only_only: false,
        requires_existing_authority: true,
        requires_fresh_collision_check: primary.collision === "ADVISORY",
        next_reevaluation_at: nextReevaluationAt,
      };
    } else {
      selected = {
        decision: "REFRESH_PRIMARY_EVIDENCE",
        dispatch_mode: "READ_ONLY_EVIDENCE",
        dispatch_lane_id: primary.lane_id,
        priority: primary.priority,
        tracking_issue: worker.tracking_issue,
        reason: "primary lane claims running state without execution evidence fresh enough for the 30-minute contract",
        fallback_used: false,
        read_only_only: true,
        requires_existing_authority: false,
        requires_fresh_collision_check: true,
        next_reevaluation_at: nextReevaluationAt,
      };
    }
  } else if (primary.state === "ACTIONABLE" && primary.collision !== "HARD_STOP") {
    selected = {
      decision: "TAKE_PRIMARY_NEXT_ACTION",
      dispatch_mode: "PRIMARY",
      dispatch_lane_id: primary.lane_id,
      priority: primary.priority,
      tracking_issue: worker.tracking_issue,
      reason: "primary lane is actionable and not hard-blocked",
      fallback_used: false,
      read_only_only: false,
      requires_existing_authority: true,
      requires_fresh_collision_check: true,
      next_reevaluation_at: nextReevaluationAt,
    };
  } else {
    const primaryReason =
      primary.state === "ACTIONABLE" && primary.collision === "HARD_STOP"
        ? "actionable primary lane is hard-blocked"
        : `primary state ${primary.state} is not currently executable`;
    selected = chooseFallbackDispatch({
      worker,
      workerEvidence,
      fallbackProgressMs,
      evaluatedAtMs,
      nextReevaluationAt,
      policy,
      primaryReason,
    });
  }

  const material = {
    worker_id: worker.id,
    worker_name: worker.name,
    ...selected,
    primary_state: primary.state,
    primary_collision: primary.collision,
    execution_evidence_fresh: executionEvidenceFresh,
    execution_evidence_age_minutes:
      executionAgeMinutes === null ? null : Number(executionAgeMinutes.toFixed(3)),
    source_mutation_authorized: false,
    runtime_mutation_authorized: false,
    automatic_issue_or_pr_creation_authorized: false,
    automatic_merge_authorized: false,
    external_worker_invocation_required: true,
  };
  return deepFreeze({ ...material, dispatch_id: contentId(material) });
}

export function evaluateWorkerLiveDispatchV1(policyRaw, evidenceRaw) {
  const policy = validateWorkerLiveDispatchPolicyV1(policyRaw);
  const { evidence, evaluatedAtMs, normalized, policyById } = validateEvidence(
    evidenceRaw,
    policy,
  );
  const nextReevaluationMs =
    evaluatedAtMs + policy.reevaluation.interval_minutes * 60_000;
  if (!Number.isSafeInteger(nextReevaluationMs)) fail("next reevaluation time overflow");
  const nextReevaluationAt = new Date(nextReevaluationMs).toISOString();

  const dispatches = normalized.map((workerEvidence) =>
    chooseDispatch({
      worker: policyById.get(workerEvidence.id),
      workerEvidence,
      executionEvidenceMs: workerEvidence.executionEvidenceMs,
      fallbackProgressMs: workerEvidence.fallbackProgressMs,
      evaluatedAtMs,
      nextReevaluationAt,
      policy,
    }),
  );
  const dispatchedIds = new Set(dispatches.map((dispatch) => dispatch.worker_id));
  const workersWithoutDispatch = policy.workers
    .map((worker) => worker.id)
    .filter((id) => !dispatchedIds.has(id))
    .sort();
  if (workersWithoutDispatch.length > 0) {
    fail(`workers remain without dispatch: ${workersWithoutDispatch.join(",")}`);
  }

  const decisionCounts = {};
  for (const dispatch of dispatches) {
    decisionCounts[dispatch.decision] = (decisionCounts[dispatch.decision] ?? 0) + 1;
  }
  const material = {
    marker: MARKER,
    version: 1,
    repository: policy.repository,
    plan_issue: policy.plan_issue,
    observed_main_sha: evidence.observed_main_sha,
    evaluated_at: evidence.evaluated_at,
    reevaluation_interval_minutes: policy.reevaluation.interval_minutes,
    next_reevaluation_at: nextReevaluationAt,
    composition: {
      base_worker_count: policy.composition.base_worker_ids.length,
      exploration_extension_worker_count:
        policy.composition.exploration_extension_worker_ids.length,
      supplemental_worker_count: policy.composition.supplemental_worker_ids.length,
      worker_ids: policy.workers
        .map((worker) => worker.id)
        .sort((a, b) => a.localeCompare(b)),
    },
    worker_count: policy.workers.length,
    dispatch_count: dispatches.length,
    decision_counts: Object.fromEntries(
      Object.entries(decisionCounts).sort(([a], [b]) => a.localeCompare(b)),
    ),
    dispatches,
    workers_without_dispatch: workersWithoutDispatch,
    no_unassigned_worker_when_evaluated: workersWithoutDispatch.length === 0,
    continuous_execution_guaranteed: false,
    external_worker_invocation_required: true,
    source_mutation_authorized: false,
    runtime_mutation_authorized: false,
    automatic_issue_or_pr_creation_authorized: false,
    automatic_merge_authorized: false,
    authority_granted: false,
  };
  return deepFreeze({ ...material, evaluation_id: contentId(material) });
}

async function readBoundedStdin() {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of process.stdin) {
    bytes += chunk.length;
    if (bytes > MAX_STDIN_BYTES) fail(`stdin exceeds ${MAX_STDIN_BYTES} bytes`);
    chunks.push(chunk);
  }
  if (bytes === 0) fail("stdin evidence JSON is required");
  return Buffer.concat(chunks).toString("utf8");
}

function parseArgs(argv) {
  const args = {
    policyPath: "ops/coordination/worker-live-dispatch-policy-v1.json",
    outputPath: null,
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
    if (!value || value.startsWith("--")) fail(`missing value for ${flag}`);
    if (flag === "--policy") args.policyPath = value;
    else if (flag === "--output") args.outputPath = value;
    else fail(`unknown argument: ${flag}`);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const policy = JSON.parse(await readFile(path.resolve(args.policyPath), "utf8"));
  const evidence = JSON.parse(await readBoundedStdin());
  const result = evaluateWorkerLiveDispatchV1(policy, evidence);
  const output = `${JSON.stringify(result, null, args.pretty ? 2 : 0)}\n`;
  if (args.outputPath) {
    await writeFile(path.resolve(args.outputPath), output, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
  }
  process.stdout.write(output);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${MARKER}=HOLD\n${message}\n`);
    process.exitCode = 2;
  });
}
