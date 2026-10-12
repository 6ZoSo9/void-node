#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

export const MARKER = "VOID_WORKER_COORDINATION_V3";
export const ROSTER_MARKER = "VOID_WORKER_ROSTER_V1";
export const STATE_MARKER = "VOID_WORKER_COORDINATION_STATE_V3";
export const GATE_NAMES = Object.freeze([
  "source_green",
  "merged",
  "deployed",
  "runtime_green",
  "external_accepted",
]);

const ROSTER_KEYS = Object.freeze(["marker", "version", "experiment", "workers"]);
const EXPERIMENT_KEYS = Object.freeze([
  "id",
  "status",
  "started_at",
  "new_worker_ids",
  "review_after_completed_lanes",
  "stop_conditions",
]);
const WORKER_KEYS = Object.freeze([
  "id",
  "name",
  "cohort",
  "status",
  "experimental",
  "primary_job",
  "allowed_lane_families",
  "excluded_authority",
  "max_active_lanes",
  "max_parked_lanes",
]);
const STATE_KEYS = Object.freeze([
  "marker",
  "version",
  "repository",
  "main_sha",
  "updated_at",
  "plan_issue",
  "policy",
  "lanes",
]);
const POLICY_KEYS = Object.freeze([
  "active_states",
  "parked_states",
  "terminal_states",
  "capability_gate_order",
  "semantic_invalidation_state",
  "wip_limits_enforced",
]);
const LANE_KEYS = Object.freeze([
  "id",
  "title",
  "owner_worker_id",
  "state",
  "priority",
  "experimental",
  "sensitive",
  "canonical_branch",
  "canonical_pr",
  "tracking_issues",
  "tracking_state",
  "changed_paths",
  "semantic_dependencies",
  "invalidated_by",
  "required_gates",
  "gates",
  "next_gate",
  "hold_reasons",
  "authority_boundary",
  "stack_prs",
]);
const DEPENDENCY_KEYS = Object.freeze(["id", "kind", "anchor", "required_state"]);
const INVALIDATION_KEYS = Object.freeze(["kind", "reference", "reason"]);
const TRACKING_STATES = new Set(["open", "closed", "none"]);
const WORKER_STATUSES = new Set(["active", "paused", "retired"]);
const EXPERIMENT_STATUSES = new Set(["active", "paused", "complete", "stopped"]);
const PRIORITIES = new Set(["P0", "P1", "P2", "P3"]);
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TOKEN_PATTERN = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;
const SHA_PATTERN = /^[0-9a-f]{40}$/;
const BRANCH_PATTERN = /^(?!\/)(?!.*(?:^|\/)\.\.?\/(?:|$))(?!.*\\)(?!.*\.\.)(?!.*\/$)[A-Za-z0-9._\/-]+$/;

export class CoordinationValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "CoordinationValidationError";
  }
}

function fail(message) {
  throw new CoordinationValidationError(message);
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

function requireString(value, label, { nonempty = true } = {}) {
  if (typeof value !== "string") fail(`${label} must be a string`);
  if (nonempty && value.trim() === "") fail(`${label} must not be empty`);
  return value;
}

function requireBoolean(value, label) {
  if (typeof value !== "boolean") fail(`${label} must be boolean`);
  return value;
}

function requireInteger(value, label, { min = Number.MIN_SAFE_INTEGER } = {}) {
  if (!Number.isSafeInteger(value) || value < min) fail(`${label} must be a safe integer >= ${min}`);
  return value;
}

function requireArray(value, label) {
  if (!Array.isArray(value)) fail(`${label} must be an array`);
  return value;
}

function requireUniqueStrings(values, label, { allowEmpty = false } = {}) {
  const array = requireArray(values, label);
  const seen = new Set();
  for (const [index, value] of array.entries()) {
    requireString(value, `${label}[${index}]`, { nonempty: !allowEmpty });
    if (seen.has(value)) fail(`${label} contains duplicate value: ${value}`);
    seen.add(value);
  }
  return array;
}

function requireUniquePositiveIntegers(values, label) {
  const array = requireArray(values, label);
  const seen = new Set();
  for (const [index, value] of array.entries()) {
    requireInteger(value, `${label}[${index}]`, { min: 1 });
    if (seen.has(value)) fail(`${label} contains duplicate value: ${value}`);
    seen.add(value);
  }
  return array;
}

function requireId(value, label) {
  requireString(value, label);
  if (!ID_PATTERN.test(value)) fail(`${label} must be a lowercase kebab-case identifier`);
  return value;
}

function requireToken(value, label) {
  requireString(value, label);
  if (!TOKEN_PATTERN.test(value)) fail(`${label} must be a lowercase token`);
  return value;
}

function requireIsoTimestamp(value, label) {
  requireString(value, label);
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) {
    fail(`${label} must be a canonical UTC ISO timestamp`);
  }
  return value;
}

function requireRepoPath(value, label) {
  requireString(value, label);
  if (value.startsWith("/") || value.includes("\\") || value.includes("\0")) {
    fail(`${label} must be a repository-relative POSIX path`);
  }
  const directoryClaim = value.endsWith("/");
  const normalizedInput = directoryClaim ? value.slice(0, -1) : value;
  if (!normalizedInput || normalizedInput === "." || normalizedInput === "..") {
    fail(`${label} is not a valid repository path`);
  }
  const segments = normalizedInput.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    fail(`${label} contains an invalid path segment`);
  }
  if (path.posix.normalize(normalizedInput) !== normalizedInput) {
    fail(`${label} is not normalized`);
  }
  return value;
}

function requireGateObject(value, label) {
  requireExactKeys(value, GATE_NAMES, label);
  for (const gate of GATE_NAMES) {
    const state = value[gate];
    if (state !== true && state !== false && state !== null) {
      fail(`${label}.${gate} must be true, false, or null`);
    }
  }
}

function validateRoster(roster) {
  requireExactKeys(roster, ROSTER_KEYS, "roster");
  if (roster.marker !== ROSTER_MARKER) fail(`roster.marker must equal ${ROSTER_MARKER}`);
  if (roster.version !== 1) fail("roster.version must equal 1");

  requireExactKeys(roster.experiment, EXPERIMENT_KEYS, "roster.experiment");
  requireId(roster.experiment.id, "roster.experiment.id");
  if (!EXPERIMENT_STATUSES.has(roster.experiment.status)) {
    fail(`roster.experiment.status is unsupported: ${roster.experiment.status}`);
  }
  requireIsoTimestamp(roster.experiment.started_at, "roster.experiment.started_at");
  requireUniqueStrings(roster.experiment.new_worker_ids, "roster.experiment.new_worker_ids");
  requireInteger(roster.experiment.review_after_completed_lanes, "roster.experiment.review_after_completed_lanes", { min: 1 });
  requireUniqueStrings(roster.experiment.stop_conditions, "roster.experiment.stop_conditions");

  const workers = requireArray(roster.workers, "roster.workers");
  if (workers.length === 0) fail("roster.workers must not be empty");
  const workerById = new Map();
  const workerNames = new Set();
  for (const [index, worker] of workers.entries()) {
    const label = `roster.workers[${index}]`;
    requireExactKeys(worker, WORKER_KEYS, label);
    requireId(worker.id, `${label}.id`);
    requireString(worker.name, `${label}.name`);
    requireId(worker.cohort, `${label}.cohort`);
    if (!WORKER_STATUSES.has(worker.status)) fail(`${label}.status is unsupported: ${worker.status}`);
    requireBoolean(worker.experimental, `${label}.experimental`);
    requireString(worker.primary_job, `${label}.primary_job`);
    requireUniqueStrings(worker.allowed_lane_families, `${label}.allowed_lane_families`);
    requireUniqueStrings(worker.excluded_authority, `${label}.excluded_authority`);
    requireInteger(worker.max_active_lanes, `${label}.max_active_lanes`, { min: 0 });
    requireInteger(worker.max_parked_lanes, `${label}.max_parked_lanes`, { min: 0 });
    if (workerById.has(worker.id)) fail(`duplicate worker id: ${worker.id}`);
    if (workerNames.has(worker.name)) fail(`duplicate worker name: ${worker.name}`);
    workerById.set(worker.id, worker);
    workerNames.add(worker.name);
  }

  const newWorkerIds = new Set(roster.experiment.new_worker_ids);
  for (const id of newWorkerIds) {
    const worker = workerById.get(id);
    if (!worker) fail(`experiment references unknown worker: ${id}`);
    if (!worker.experimental) fail(`experiment worker must have experimental=true: ${id}`);
  }
  for (const worker of workers) {
    if (worker.experimental !== newWorkerIds.has(worker.id)) {
      fail(`worker experimental flag does not match experiment roster: ${worker.id}`);
    }
  }

  return workerById;
}

function validatePolicy(policy) {
  requireExactKeys(policy, POLICY_KEYS, "state.policy");
  const activeStates = new Set(requireUniqueStrings(policy.active_states, "state.policy.active_states"));
  const parkedStates = new Set(requireUniqueStrings(policy.parked_states, "state.policy.parked_states"));
  const terminalStates = new Set(requireUniqueStrings(policy.terminal_states, "state.policy.terminal_states"));
  if (activeStates.size === 0) fail("state.policy.active_states must not be empty");
  for (const state of activeStates) {
    if (parkedStates.has(state) || terminalStates.has(state)) fail(`state appears in multiple lifecycle classes: ${state}`);
  }
  for (const state of parkedStates) {
    if (terminalStates.has(state)) fail(`state appears in multiple lifecycle classes: ${state}`);
  }
  const gateOrder = requireUniqueStrings(policy.capability_gate_order, "state.policy.capability_gate_order");
  if (gateOrder.length !== GATE_NAMES.length || gateOrder.some((gate, index) => gate !== GATE_NAMES[index])) {
    fail(`state.policy.capability_gate_order must equal ${GATE_NAMES.join(",")}`);
  }
  requireString(policy.semantic_invalidation_state, "state.policy.semantic_invalidation_state");
  if (!parkedStates.has(policy.semantic_invalidation_state)) {
    fail("state.policy.semantic_invalidation_state must be a parked state");
  }
  requireBoolean(policy.wip_limits_enforced, "state.policy.wip_limits_enforced");
  return { activeStates, parkedStates, terminalStates };
}

function validateDependency(dependency, label) {
  requireExactKeys(dependency, DEPENDENCY_KEYS, label);
  requireId(dependency.id, `${label}.id`);
  requireId(dependency.kind, `${label}.kind`);
  requireString(dependency.anchor, `${label}.anchor`);
  requireToken(dependency.required_state, `${label}.required_state`);
}

function validateInvalidation(invalidation, label) {
  requireExactKeys(invalidation, INVALIDATION_KEYS, label);
  requireId(invalidation.kind, `${label}.kind`);
  requireString(invalidation.reference, `${label}.reference`);
  requireString(invalidation.reason, `${label}.reason`);
}

function validateLane(lane, index, context) {
  const label = `state.lanes[${index}]`;
  requireExactKeys(lane, LANE_KEYS, label);
  requireId(lane.id, `${label}.id`);
  requireString(lane.title, `${label}.title`);
  requireId(lane.owner_worker_id, `${label}.owner_worker_id`);
  const owner = context.workerById.get(lane.owner_worker_id);
  if (!owner) fail(`${label} references unknown owner: ${lane.owner_worker_id}`);
  if (owner.status !== "active") fail(`${label} owner is not active: ${lane.owner_worker_id}`);

  requireString(lane.state, `${label}.state`);
  const allStates = new Set([...context.activeStates, ...context.parkedStates, ...context.terminalStates]);
  if (!allStates.has(lane.state)) fail(`${label}.state is unsupported: ${lane.state}`);
  if (!PRIORITIES.has(lane.priority)) fail(`${label}.priority is unsupported: ${lane.priority}`);
  requireBoolean(lane.experimental, `${label}.experimental`);
  requireBoolean(lane.sensitive, `${label}.sensitive`);
  if (lane.experimental !== owner.experimental) {
    fail(`${label}.experimental must match owner experimental flag`);
  }

  if (lane.canonical_branch !== null) {
    requireString(lane.canonical_branch, `${label}.canonical_branch`);
    if (!BRANCH_PATTERN.test(lane.canonical_branch)) fail(`${label}.canonical_branch is invalid`);
  }
  if (lane.canonical_pr !== null) requireInteger(lane.canonical_pr, `${label}.canonical_pr`, { min: 1 });
  requireUniquePositiveIntegers(lane.tracking_issues, `${label}.tracking_issues`);
  if (!TRACKING_STATES.has(lane.tracking_state)) fail(`${label}.tracking_state is unsupported`);
  if (lane.tracking_issues.length === 0 && lane.tracking_state !== "none") {
    fail(`${label}.tracking_state must be none when no tracking issue exists`);
  }
  if (lane.tracking_issues.length > 0 && lane.tracking_state === "none") {
    fail(`${label}.tracking_state must describe the tracked issue set`);
  }

  const changedPaths = requireUniqueStrings(lane.changed_paths, `${label}.changed_paths`);
  changedPaths.forEach((value, pathIndex) => requireRepoPath(value, `${label}.changed_paths[${pathIndex}]`));

  const dependencyIds = new Set();
  for (const [dependencyIndex, dependency] of requireArray(lane.semantic_dependencies, `${label}.semantic_dependencies`).entries()) {
    validateDependency(dependency, `${label}.semantic_dependencies[${dependencyIndex}]`);
    if (dependencyIds.has(dependency.id)) fail(`${label} has duplicate semantic dependency id: ${dependency.id}`);
    dependencyIds.add(dependency.id);
  }

  for (const [invalidationIndex, invalidation] of requireArray(lane.invalidated_by, `${label}.invalidated_by`).entries()) {
    validateInvalidation(invalidation, `${label}.invalidated_by[${invalidationIndex}]`);
  }

  const requiredGates = requireUniqueStrings(lane.required_gates, `${label}.required_gates`);
  for (const gate of requiredGates) {
    if (!GATE_NAMES.includes(gate)) fail(`${label}.required_gates contains unknown gate: ${gate}`);
  }
  requireGateObject(lane.gates, `${label}.gates`);
  requireString(lane.next_gate, `${label}.next_gate`);
  requireUniqueStrings(lane.hold_reasons, `${label}.hold_reasons`);
  requireString(lane.authority_boundary, `${label}.authority_boundary`);
  requireUniquePositiveIntegers(lane.stack_prs, `${label}.stack_prs`);

  if (context.activeStates.has(lane.state)) {
    const hasSourceAnchor = lane.canonical_branch !== null;
    const hasResearchAnchor = lane.tracking_issues.length > 0;
    if (!hasSourceAnchor && !hasResearchAnchor) fail(`${label} active lane lacks a branch or tracking issue anchor`);
  }
  if (lane.state === context.semanticInvalidationState && lane.invalidated_by.length === 0) {
    fail(`${label} semantic review state requires invalidated_by evidence`);
  }
  if ((lane.state === "HELD" || lane.state === "PARKED" || lane.state === "FROZEN_STACK") && lane.hold_reasons.length === 0) {
    fail(`${label} parked/held state requires hold_reasons`);
  }
  if (lane.state === "FROZEN_STACK" && lane.stack_prs.length < 2) {
    fail(`${label} frozen stack must compress at least two pull requests`);
  }
  if (lane.state !== "FROZEN_STACK" && lane.stack_prs.length > 0) {
    fail(`${label} stack_prs are only valid for FROZEN_STACK lanes`);
  }
  if (lane.sensitive && lane.authority_boundary.length < 80) {
    fail(`${label} sensitive lane requires an explicit authority boundary`);
  }
  if (context.terminalStates.has(lane.state)) {
    for (const gate of requiredGates) {
      if (lane.gates[gate] !== true) fail(`${label} terminal lane is missing required gate: ${gate}`);
    }
  }
  if (lane.tracking_state === "closed") {
    const incomplete = requiredGates.filter((gate) => lane.gates[gate] !== true);
    if (incomplete.length > 0) {
      fail(`${label} tracking is closed before required gates completed: ${incomplete.join(",")}`);
    }
  }
  for (let gateIndex = 0; gateIndex < GATE_NAMES.length - 1; gateIndex += 1) {
    const gate = GATE_NAMES[gateIndex];
    const laterGate = GATE_NAMES[gateIndex + 1];
    if (lane.gates[laterGate] === true && lane.gates[gate] !== true) {
      fail(`${label} gate order violation: ${laterGate}=true while ${gate} is not true`);
    }
  }

  return owner;
}

export function validateCoordinationV3(roster, state) {
  const workerById = validateRoster(roster);
  requireExactKeys(state, STATE_KEYS, "state");
  if (state.marker !== STATE_MARKER) fail(`state.marker must equal ${STATE_MARKER}`);
  if (state.version !== 3) fail("state.version must equal 3");
  requireString(state.repository, "state.repository");
  requireString(state.main_sha, "state.main_sha");
  if (!SHA_PATTERN.test(state.main_sha)) fail("state.main_sha must be a lowercase 40-character SHA-1");
  requireIsoTimestamp(state.updated_at, "state.updated_at");
  requireInteger(state.plan_issue, "state.plan_issue", { min: 1 });

  const { activeStates, parkedStates, terminalStates } = validatePolicy(state.policy);
  const context = {
    workerById,
    activeStates,
    parkedStates,
    terminalStates,
    semanticInvalidationState: state.policy.semantic_invalidation_state,
  };

  const lanes = requireArray(state.lanes, "state.lanes");
  if (lanes.length === 0) fail("state.lanes must not be empty");
  const laneIds = new Set();
  const branchOwners = new Map();
  const prOwners = new Map();
  const activeCounts = new Map();
  const parkedCounts = new Map();
  const countsByState = {};
  const incompleteCapabilityLanes = [];
  const semanticReviewLanes = [];

  for (const [index, lane] of lanes.entries()) {
    const owner = validateLane(lane, index, context);
    if (laneIds.has(lane.id)) fail(`duplicate lane id: ${lane.id}`);
    laneIds.add(lane.id);

    if (lane.canonical_branch !== null) {
      const existing = branchOwners.get(lane.canonical_branch);
      if (existing) fail(`canonical branch reused by lanes ${existing} and ${lane.id}`);
      branchOwners.set(lane.canonical_branch, lane.id);
    }
    if (lane.canonical_pr !== null) {
      const existing = prOwners.get(lane.canonical_pr);
      if (existing) fail(`canonical PR #${lane.canonical_pr} reused by lanes ${existing} and ${lane.id}`);
      prOwners.set(lane.canonical_pr, lane.id);
    }

    countsByState[lane.state] = (countsByState[lane.state] ?? 0) + 1;
    if (activeStates.has(lane.state)) {
      activeCounts.set(owner.id, (activeCounts.get(owner.id) ?? 0) + 1);
    } else if (parkedStates.has(lane.state)) {
      parkedCounts.set(owner.id, (parkedCounts.get(owner.id) ?? 0) + 1);
    }
    if (lane.invalidated_by.length > 0) semanticReviewLanes.push(lane.id);
    const incomplete = lane.required_gates.filter((gate) => lane.gates[gate] !== true);
    if (incomplete.length > 0) incompleteCapabilityLanes.push({ id: lane.id, missing_gates: incomplete });
  }

  if (state.policy.wip_limits_enforced) {
    for (const worker of workerById.values()) {
      const active = activeCounts.get(worker.id) ?? 0;
      const parked = parkedCounts.get(worker.id) ?? 0;
      if (active > worker.max_active_lanes) {
        fail(`worker ${worker.id} exceeds active WIP limit: ${active} > ${worker.max_active_lanes}`);
      }
      if (parked > worker.max_parked_lanes) {
        fail(`worker ${worker.id} exceeds parked WIP limit: ${parked} > ${worker.max_parked_lanes}`);
      }
    }
  }

  const experimentalIds = new Set(roster.experiment.new_worker_ids);
  const experimentalAssignments = {};
  for (const id of experimentalIds) experimentalAssignments[id] = [];
  for (const lane of lanes) {
    if (experimentalIds.has(lane.owner_worker_id)) experimentalAssignments[lane.owner_worker_id].push(lane.id);
  }
  for (const [workerId, assignments] of Object.entries(experimentalAssignments)) {
    if (assignments.length === 0) fail(`experimental worker has no assigned lane: ${workerId}`);
  }

  return Object.freeze({
    marker: MARKER,
    valid: true,
    repository: state.repository,
    main_sha: state.main_sha,
    plan_issue: state.plan_issue,
    worker_count: workerById.size,
    experimental_worker_count: experimentalIds.size,
    lane_count: lanes.length,
    counts_by_state: Object.fromEntries(Object.entries(countsByState).sort(([a], [b]) => a.localeCompare(b))),
    active_lanes_by_worker: Object.fromEntries([...activeCounts.entries()].sort(([a], [b]) => a.localeCompare(b))),
    parked_lanes_by_worker: Object.fromEntries([...parkedCounts.entries()].sort(([a], [b]) => a.localeCompare(b))),
    experimental_assignments: Object.fromEntries(
      Object.entries(experimentalAssignments)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([id, assignments]) => [id, [...assignments].sort()]),
    ),
    semantic_review_lanes: [...semanticReviewLanes].sort(),
    incomplete_capability_lanes: incompleteCapabilityLanes.sort((a, b) => a.id.localeCompare(b.id)),
    source_mutation_performed: false,
    runtime_mutation_performed: false,
    authority_granted: false,
  });
}

export async function loadCoordinationFiles({ rosterPath, statePath }) {
  const [rosterText, stateText] = await Promise.all([
    readFile(rosterPath, "utf8"),
    readFile(statePath, "utf8"),
  ]);
  return {
    roster: JSON.parse(rosterText),
    state: JSON.parse(stateText),
  };
}

function parseArgs(argv) {
  const args = {
    command: "validate",
    rosterPath: "ops/coordination/worker-roster-v1.json",
    statePath: "ops/coordination/worker-coordination-state-v3.json",
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
    else if (flag === "--output") args.outputPath = value;
    else fail(`unknown argument: ${flag}`);
  }
  if (!new Set(["validate", "status"]).has(args.command)) fail(`unsupported command: ${args.command}`);
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { roster, state } = await loadCoordinationFiles({
    rosterPath: path.resolve(args.rosterPath),
    statePath: path.resolve(args.statePath),
  });
  const summary = validateCoordinationV3(roster, state);
  const output = `${JSON.stringify(summary, null, 2)}\n`;
  if (args.outputPath) await writeFile(path.resolve(args.outputPath), output, { encoding: "utf8", flag: "w" });
  process.stdout.write(output);
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (invokedDirectly) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${MARKER}=HOLD\n${message}\n`);
    process.exitCode = 1;
  });
}
