#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  loadCoordinationFiles,
  validateCoordinationV3,
} from "./void-worker-coordination-v3.mjs";

export const MARKER = "VOID_WORKER_EXPLORATION_EXTENSION_V1";
const BASE_KEYS = Object.freeze([
  "repository",
  "roster_marker",
  "state_marker",
  "coordination_pr",
  "branch",
  "expected_head_at_creation",
]);
const ROOT_KEYS = Object.freeze([
  "marker",
  "version",
  "base_coordination",
  "doctrine",
  "policy",
  "new_workers",
  "fallback_exploration_assignments",
]);
const POLICY_KEYS = Object.freeze([
  "enabled",
  "idle_behavior",
  "max_open_exploration_issues_per_worker",
  "max_open_exploration_prs_per_worker",
  "max_candidates_per_report",
  "max_recommended_candidates",
  "candidate_score_scale_max",
  "candidate_score_threshold",
  "candidate_score_dimensions",
  "source_mutation_requires_fresh_v1_check",
  "ranked_candidate_required_before_branch",
  "automatic_merge_authority",
  "stale_exploration_days",
  "review_at",
  "forbidden_outcomes",
]);
const NEW_WORKER_KEYS = Object.freeze([
  "id",
  "name",
  "tracking_issue",
  "lane_id",
  "state",
  "priority",
  "sensitive",
  "primary_job",
  "exploration_domains",
  "authority_boundary",
]);
const FALLBACK_KEYS = Object.freeze([
  "worker_id",
  "lane_id",
  "state",
  "priority",
  "tracking_issue",
  "sensitive",
  "reason",
  "exploration_domains",
  "authority_boundary",
]);
const EXPECTED_DOCTRINE = Object.freeze([
  "protect_core",
  "protect_truth",
  "protect_sovereign",
]);
const PRIORITIES = new Set(["P0", "P1", "P2", "P3"]);
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TOKEN_PATTERN = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;
const SHA_PATTERN = /^[0-9a-f]{40}$/;
const BRANCH_PATTERN = /^(?!\/)(?!.*\\)(?!.*\.\.)(?!.*\/$)[A-Za-z0-9._\/-]+$/;

export class ExplorationValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ExplorationValidationError";
  }
}

function fail(message) {
  throw new ExplorationValidationError(message);
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
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    fail(`${label} keys mismatch: expected=${wanted.join(",")} actual=${actual.join(",")}`);
  }
}

function requireString(value, label) {
  if (typeof value !== "string" || value.trim() === "") fail(`${label} must be a non-empty string`);
  return value;
}

function requireBoolean(value, label) {
  if (typeof value !== "boolean") fail(`${label} must be boolean`);
  return value;
}

function requireInteger(value, label, min = 0) {
  if (!Number.isSafeInteger(value) || value < min) fail(`${label} must be a safe integer >= ${min}`);
  return value;
}

function requireArray(value, label) {
  if (!Array.isArray(value)) fail(`${label} must be an array`);
  return value;
}

function requireId(value, label) {
  requireString(value, label);
  if (!ID_PATTERN.test(value)) fail(`${label} must be lowercase kebab-case`);
  return value;
}

function requireToken(value, label) {
  requireString(value, label);
  if (!TOKEN_PATTERN.test(value)) fail(`${label} must be a lowercase token`);
  return value;
}

function requireUniqueTokens(value, label, { minLength = 1 } = {}) {
  const array = requireArray(value, label);
  if (array.length < minLength) fail(`${label} must contain at least ${minLength} value(s)`);
  const seen = new Set();
  for (const [index, item] of array.entries()) {
    requireToken(item, `${label}[${index}]`);
    if (seen.has(item)) fail(`${label} contains duplicate value: ${item}`);
    seen.add(item);
  }
  return array;
}

function requireIsoTimestamp(value, label) {
  requireString(value, label);
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) {
    fail(`${label} must be a canonical UTC ISO timestamp`);
  }
  return value;
}

function requirePriority(value, label) {
  if (!PRIORITIES.has(value)) fail(`${label} is unsupported: ${value}`);
  return value;
}

function requireAuthorityBoundary(value, label, sensitive) {
  requireString(value, label);
  const minimum = sensitive ? 120 : 80;
  if (value.length < minimum) fail(`${label} must be at least ${minimum} characters`);
  return value;
}

function validatePolicy(policy) {
  requireExactKeys(policy, POLICY_KEYS, "extension.policy");
  if (requireBoolean(policy.enabled, "extension.policy.enabled") !== true) {
    fail("extension.policy.enabled must be true");
  }
  if (policy.idle_behavior !== "bounded_exploration") {
    fail("extension.policy.idle_behavior must equal bounded_exploration");
  }
  if (requireInteger(policy.max_open_exploration_issues_per_worker, "extension.policy.max_open_exploration_issues_per_worker", 1) !== 1) {
    fail("exploration issue noise budget must remain exactly one per worker");
  }
  if (requireInteger(policy.max_open_exploration_prs_per_worker, "extension.policy.max_open_exploration_prs_per_worker", 1) !== 1) {
    fail("exploration PR noise budget must remain exactly one per worker");
  }
  requireInteger(policy.max_candidates_per_report, "extension.policy.max_candidates_per_report", 1);
  requireInteger(policy.max_recommended_candidates, "extension.policy.max_recommended_candidates", 1);
  if (policy.max_recommended_candidates > policy.max_candidates_per_report) {
    fail("recommended candidates cannot exceed report candidates");
  }
  if (policy.max_recommended_candidates !== 1) {
    fail("exactly one candidate may be recommended for a later source lane");
  }
  requireInteger(policy.candidate_score_scale_max, "extension.policy.candidate_score_scale_max", 1);
  const dimensions = requireUniqueTokens(
    policy.candidate_score_dimensions,
    "extension.policy.candidate_score_dimensions",
    { minLength: 5 },
  );
  requireInteger(policy.candidate_score_threshold, "extension.policy.candidate_score_threshold", 1);
  const maximumScore = dimensions.length * policy.candidate_score_scale_max;
  if (policy.candidate_score_threshold > maximumScore) {
    fail(`candidate score threshold exceeds maximum score: ${policy.candidate_score_threshold} > ${maximumScore}`);
  }
  if (requireBoolean(policy.source_mutation_requires_fresh_v1_check, "extension.policy.source_mutation_requires_fresh_v1_check") !== true) {
    fail("source mutation must require a fresh V1 coordination check");
  }
  if (requireBoolean(policy.ranked_candidate_required_before_branch, "extension.policy.ranked_candidate_required_before_branch") !== true) {
    fail("a ranked candidate must be required before branch creation");
  }
  if (requireBoolean(policy.automatic_merge_authority, "extension.policy.automatic_merge_authority") !== false) {
    fail("exploration must not grant automatic merge authority");
  }
  requireInteger(policy.stale_exploration_days, "extension.policy.stale_exploration_days", 1);
  requireIsoTimestamp(policy.review_at, "extension.policy.review_at");
  requireUniqueTokens(policy.forbidden_outcomes, "extension.policy.forbidden_outcomes", { minLength: 5 });
}

function validateNewWorker(worker, index, context) {
  const label = `extension.new_workers[${index}]`;
  requireExactKeys(worker, NEW_WORKER_KEYS, label);
  requireId(worker.id, `${label}.id`);
  requireString(worker.name, `${label}.name`);
  requireInteger(worker.tracking_issue, `${label}.tracking_issue`, 1);
  requireId(worker.lane_id, `${label}.lane_id`);
  if (worker.state !== "ACTIVE_RESEARCH") fail(`${label}.state must equal ACTIVE_RESEARCH`);
  requirePriority(worker.priority, `${label}.priority`);
  requireBoolean(worker.sensitive, `${label}.sensitive`);
  requireString(worker.primary_job, `${label}.primary_job`);
  requireUniqueTokens(worker.exploration_domains, `${label}.exploration_domains`, { minLength: 3 });
  requireAuthorityBoundary(worker.authority_boundary, `${label}.authority_boundary`, worker.sensitive);

  if (context.baseWorkerIds.has(worker.id)) fail(`${label} duplicates base worker id: ${worker.id}`);
  if (context.baseWorkerNames.has(worker.name)) fail(`${label} duplicates base worker name: ${worker.name}`);
  if (context.workerIds.has(worker.id)) fail(`duplicate extension worker id: ${worker.id}`);
  if (context.workerNames.has(worker.name)) fail(`duplicate extension worker name: ${worker.name}`);
  if (context.issueIds.has(worker.tracking_issue)) fail(`duplicate extension tracking issue: #${worker.tracking_issue}`);
  if (context.laneIds.has(worker.lane_id)) fail(`duplicate or conflicting exploration lane id: ${worker.lane_id}`);

  context.workerIds.add(worker.id);
  context.workerNames.add(worker.name);
  context.issueIds.add(worker.tracking_issue);
  context.laneIds.add(worker.lane_id);
}

function validateFallback(assignment, index, context) {
  const label = `extension.fallback_exploration_assignments[${index}]`;
  requireExactKeys(assignment, FALLBACK_KEYS, label);
  requireId(assignment.worker_id, `${label}.worker_id`);
  requireId(assignment.lane_id, `${label}.lane_id`);
  if (assignment.state !== "ACTIVE_RESEARCH") fail(`${label}.state must equal ACTIVE_RESEARCH`);
  requirePriority(assignment.priority, `${label}.priority`);
  requireInteger(assignment.tracking_issue, `${label}.tracking_issue`, 1);
  requireBoolean(assignment.sensitive, `${label}.sensitive`);
  requireString(assignment.reason, `${label}.reason`);
  requireUniqueTokens(assignment.exploration_domains, `${label}.exploration_domains`, { minLength: 3 });
  requireAuthorityBoundary(assignment.authority_boundary, `${label}.authority_boundary`, assignment.sensitive);

  const worker = context.baseWorkerById.get(assignment.worker_id);
  if (!worker) fail(`${label} references unknown base worker: ${assignment.worker_id}`);
  if (worker.status !== "active") fail(`${label} worker is not active: ${assignment.worker_id}`);
  if (!context.idleBaseWorkerIds.has(assignment.worker_id)) {
    fail(`${label} targets a worker that already has an active base lane: ${assignment.worker_id}`);
  }
  if (context.fallbackWorkerIds.has(assignment.worker_id)) {
    fail(`duplicate fallback exploration assignment: ${assignment.worker_id}`);
  }
  if (context.laneIds.has(assignment.lane_id)) fail(`duplicate or conflicting exploration lane id: ${assignment.lane_id}`);

  context.fallbackWorkerIds.add(assignment.worker_id);
  context.laneIds.add(assignment.lane_id);
}

export function validateExplorationExtension(baseRoster, baseState, extension) {
  const baseSummary = validateCoordinationV3(baseRoster, baseState);
  requireExactKeys(extension, ROOT_KEYS, "extension");
  if (extension.marker !== MARKER) fail(`extension.marker must equal ${MARKER}`);
  if (extension.version !== 1) fail("extension.version must equal 1");

  requireExactKeys(extension.base_coordination, BASE_KEYS, "extension.base_coordination");
  if (extension.base_coordination.repository !== baseState.repository) {
    fail("extension repository does not match base coordination state");
  }
  if (extension.base_coordination.roster_marker !== baseRoster.marker) {
    fail("extension roster marker does not match base roster");
  }
  if (extension.base_coordination.state_marker !== baseState.marker) {
    fail("extension state marker does not match base state");
  }
  requireInteger(extension.base_coordination.coordination_pr, "extension.base_coordination.coordination_pr", 1);
  requireString(extension.base_coordination.branch, "extension.base_coordination.branch");
  if (!BRANCH_PATTERN.test(extension.base_coordination.branch)) fail("extension base branch is invalid");
  requireString(extension.base_coordination.expected_head_at_creation, "extension.base_coordination.expected_head_at_creation");
  if (!SHA_PATTERN.test(extension.base_coordination.expected_head_at_creation)) {
    fail("extension expected_head_at_creation must be a lowercase 40-character SHA-1");
  }

  const doctrine = requireUniqueTokens(extension.doctrine, "extension.doctrine", { minLength: 3 });
  if (doctrine.length !== EXPECTED_DOCTRINE.length || doctrine.some((value, index) => value !== EXPECTED_DOCTRINE[index])) {
    fail(`extension.doctrine must equal ${EXPECTED_DOCTRINE.join(",")}`);
  }
  validatePolicy(extension.policy);

  const baseWorkerById = new Map(baseRoster.workers.map((worker) => [worker.id, worker]));
  const baseWorkerIds = new Set(baseWorkerById.keys());
  const baseWorkerNames = new Set(baseRoster.workers.map((worker) => worker.name));
  const baseLaneIds = new Set(baseState.lanes.map((lane) => lane.id));
  const activeStates = new Set(baseState.policy.active_states);
  const activeBaseWorkerIds = new Set(
    baseState.lanes.filter((lane) => activeStates.has(lane.state)).map((lane) => lane.owner_worker_id),
  );
  const idleBaseWorkerIds = new Set(
    baseRoster.workers
      .filter((worker) => worker.status === "active" && !activeBaseWorkerIds.has(worker.id))
      .map((worker) => worker.id),
  );

  const context = {
    baseWorkerById,
    baseWorkerIds,
    baseWorkerNames,
    idleBaseWorkerIds,
    workerIds: new Set(),
    workerNames: new Set(),
    issueIds: new Set(),
    laneIds: new Set(baseLaneIds),
    fallbackWorkerIds: new Set(),
  };

  const newWorkers = requireArray(extension.new_workers, "extension.new_workers");
  if (newWorkers.length === 0) fail("extension.new_workers must not be empty");
  newWorkers.forEach((worker, index) => validateNewWorker(worker, index, context));

  const fallbacks = requireArray(
    extension.fallback_exploration_assignments,
    "extension.fallback_exploration_assignments",
  );
  fallbacks.forEach((assignment, index) => validateFallback(assignment, index, context));

  const missingFallbacks = [...idleBaseWorkerIds].filter((id) => !context.fallbackWorkerIds.has(id)).sort();
  const unexpectedFallbacks = [...context.fallbackWorkerIds].filter((id) => !idleBaseWorkerIds.has(id)).sort();
  if (missingFallbacks.length > 0 || unexpectedFallbacks.length > 0) {
    fail(
      `fallback exploration assignments must exactly cover idle active base workers: ` +
        `missing=${missingFallbacks.join(",") || "none"} unexpected=${unexpectedFallbacks.join(",") || "none"}`,
    );
  }

  const combinedWorkerIds = new Set([...baseWorkerIds, ...context.workerIds]);
  const combinedActiveWorkerIds = new Set([
    ...activeBaseWorkerIds,
    ...context.fallbackWorkerIds,
    ...context.workerIds,
  ]);
  const workersWithoutActiveOrExploration = [...combinedWorkerIds]
    .filter((id) => !combinedActiveWorkerIds.has(id))
    .sort();
  if (workersWithoutActiveOrExploration.length > 0) {
    fail(`workers remain idle without active or exploration assignment: ${workersWithoutActiveOrExploration.join(",")}`);
  }

  return Object.freeze({
    marker: MARKER,
    valid: true,
    repository: baseState.repository,
    coordination_pr: extension.base_coordination.coordination_pr,
    base_head_at_creation: extension.base_coordination.expected_head_at_creation,
    doctrine: [...doctrine],
    base_worker_count: baseSummary.worker_count,
    new_worker_count: context.workerIds.size,
    combined_worker_count: combinedWorkerIds.size,
    base_lane_count: baseSummary.lane_count,
    new_research_lane_count: newWorkers.length,
    fallback_exploration_lane_count: fallbacks.length,
    combined_active_or_exploring_worker_count: combinedActiveWorkerIds.size,
    idle_base_workers_before_extension: [...idleBaseWorkerIds].sort(),
    fallback_exploration_workers: [...context.fallbackWorkerIds].sort(),
    new_worker_ids: [...context.workerIds].sort(),
    new_worker_issue_ids: [...context.issueIds].sort((a, b) => a - b),
    workers_without_active_or_exploration: workersWithoutActiveOrExploration,
    max_open_exploration_issues_per_worker: extension.policy.max_open_exploration_issues_per_worker,
    max_open_exploration_prs_per_worker: extension.policy.max_open_exploration_prs_per_worker,
    candidate_score_threshold: extension.policy.candidate_score_threshold,
    candidate_score_maximum:
      extension.policy.candidate_score_dimensions.length * extension.policy.candidate_score_scale_max,
    automatic_merge_authority: false,
    source_mutation_requires_fresh_v1_check: true,
    source_mutation_performed: false,
    runtime_mutation_performed: false,
    authority_granted: false,
  });
}

export async function loadExplorationFiles({ rosterPath, statePath, extensionPath }) {
  const [{ roster, state }, extensionText] = await Promise.all([
    loadCoordinationFiles({ rosterPath, statePath }),
    readFile(extensionPath, "utf8"),
  ]);
  return { roster, state, extension: JSON.parse(extensionText) };
}

function parseArgs(argv) {
  const args = {
    command: "validate",
    rosterPath: "ops/coordination/worker-roster-v1.json",
    statePath: "ops/coordination/worker-coordination-state-v3.json",
    extensionPath: "ops/coordination/worker-exploration-extension-v1.json",
    outputPath: null,
  };
  const remaining = [...argv];
  if (remaining[0] && !remaining[0].startsWith("--")) args.command = remaining.shift();
  while (remaining.length > 0) {
    const flag = remaining.shift();
    const value = remaining.shift();
    if (!value || value.startsWith("--")) fail(`missing value for ${flag}`);
    if (flag === "--roster") args.rosterPath = value;
    else if (flag === "--state") args.statePath = value;
    else if (flag === "--extension") args.extensionPath = value;
    else if (flag === "--output") args.outputPath = value;
    else fail(`unknown argument: ${flag}`);
  }
  if (!new Set(["validate", "status"]).has(args.command)) fail(`unsupported command: ${args.command}`);
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { roster, state, extension } = await loadExplorationFiles({
    rosterPath: path.resolve(args.rosterPath),
    statePath: path.resolve(args.statePath),
    extensionPath: path.resolve(args.extensionPath),
  });
  const summary = validateExplorationExtension(roster, state, extension);
  const output = `${JSON.stringify(summary, null, 2)}\n`;
  if (args.outputPath) {
    await writeFile(path.resolve(args.outputPath), output, { encoding: "utf8", flag: "w" });
  }
  process.stdout.write(output);
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (invokedDirectly) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${MARKER}=HOLD\n${message}\n`);
    process.exitCode = 1;
  });
}
