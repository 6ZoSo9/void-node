#!/usr/bin/env node

import crypto from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import {
  MARKER as SUCCESSOR_CHAIN_MARKER,
  ROTATION_THRESHOLD_TOTAL_MESSAGES,
  ROTATION_WRITER_WORKER_ID,
} from "./void-coordination-successor-chain-v1.mjs";
import {
  POLICY_MARKER as LIVE_DISPATCH_POLICY_MARKER,
  validateWorkerLiveDispatchPolicyV1,
} from "./void-worker-coordination-live-dispatch-v1.mjs";

export const MARKER = "VOID_COORDINATION_ROTATION_SNAPSHOT_V1";
export const EVIDENCE_MARKER = "VOID_COORDINATION_ROTATION_SNAPSHOT_EVIDENCE_V1";

const MAX_STDIN_BYTES = 4 * 1024 * 1024;
const SHA_PATTERN = /^[0-9a-f]{40}$/u;
const MAX_OPEN_PRS = 250;
const MAX_CHANGED_PATHS_PER_PR = 500;
const CHAIN_OUTCOMES = new Set([
  "CURRENT",
  "ROTATION_REQUIRED",
  "SUCCESSOR_RESOLVED",
  "HOLD_INVALID_SUCCESSOR_CHAIN",
]);
const SUCCESSOR_SECTION_GUIDE = Object.freeze([
  "authority_order",
  "current_main",
  "current_coordination_hub",
  "scheduled_worker_roster",
  "active_open_pull_requests",
  "ownership_and_wip",
  "dependencies_and_blockers",
  "rollover_rules",
  "comment_discipline",
  "authority_boundaries",
]);

export class CoordinationRotationSnapshotError extends Error {
  constructor(message) {
    super(message);
    this.name = "CoordinationRotationSnapshotError";
  }
}

function fail(message) {
  throw new CoordinationRotationSnapshotError(message);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireObject(value, label) {
  if (!isPlainObject(value)) fail(label + " must be an object");
  return value;
}

function requireExactKeys(value, expectedKeys, label) {
  const object = requireObject(value, label);
  const actual = Object.keys(object).sort();
  const expected = [...expectedKeys].sort();
  if (
    actual.length !== expected.length
    || actual.some((key, index) => key !== expected[index])
  ) {
    fail(
      label
      + " keys mismatch: expected="
      + expected.join(",")
      + " actual="
      + actual.join(","),
    );
  }
  return object;
}

function requireString(value, label, maxLength = 2_000) {
  if (typeof value !== "string" || value.length === 0) {
    fail(label + " must be a non-empty string");
  }
  if (
    value.length > maxLength
    || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value)
  ) {
    fail(label + " is not bounded plain text");
  }
  return value;
}

function requireBoolean(value, label) {
  if (typeof value !== "boolean") fail(label + " must be boolean");
  return value;
}

function requirePositiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 1) {
    fail(label + " must be a positive safe integer");
  }
  return value;
}

function requireNonNegativeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    fail(label + " must be a non-negative safe integer");
  }
  return value;
}

function requireSha(value, label) {
  if (typeof value !== "string" || !SHA_PATTERN.test(value)) {
    fail(label + " must be a lowercase 40-character SHA-1");
  }
  return value;
}

function requireIsoTimestamp(value, label) {
  requireString(value, label, 40);
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    fail(label + " must be a canonical UTC ISO timestamp");
  }
  const canonical = new Date(parsed).toISOString();
  const canonicalWithoutZeroMillis = canonical.replace(/\.000Z$/u, "Z");
  if (value !== canonical && value !== canonicalWithoutZeroMillis) {
    fail(label + " must be a canonical UTC ISO timestamp");
  }
  return value;
}

function normalizeChangedPath(value, label) {
  requireString(value, label, 1_000);
  let normalized = value;
  while (normalized.startsWith("./")) normalized = normalized.slice(2);
  if (
    !normalized
    || normalized === "."
    || normalized.startsWith("/")
    || normalized.includes("\\")
    || normalized.includes("\0")
    || /[\u0000-\u001f\u007f]/u.test(normalized)
  ) {
    fail(label + " must be a repository-relative path");
  }
  const parts = normalized.split("/");
  if (parts.some((part) => !part || part === "." || part === "..")) {
    fail(label + " contains invalid path segments");
  }
  return parts.join("/");
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

function sha256Id(value) {
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
  if (chain.marker !== SUCCESSOR_CHAIN_MARKER) {
    fail("evidence.chain.marker mismatch");
  }
  if (chain.version !== 1) fail("evidence.chain.version must equal 1");
  requireString(chain.repository_scope, "evidence.chain.repository_scope", 200);
  requirePositiveInteger(chain.root_issue, "evidence.chain.root_issue");
  requirePositiveInteger(chain.current_issue, "evidence.chain.current_issue");
  if (!CHAIN_OUTCOMES.has(chain.outcome)) {
    fail("evidence.chain.outcome is unsupported");
  }
  requireBoolean(chain.chain_valid, "evidence.chain.chain_valid");
  requireBoolean(chain.rotation_required, "evidence.chain.rotation_required");
  if (chain.rotation_writer_worker_id !== ROTATION_WRITER_WORKER_ID) {
    fail("evidence.chain.rotation_writer_worker_id mismatch");
  }
  if (
    chain.rotation_threshold_total_messages
    !== ROTATION_THRESHOLD_TOTAL_MESSAGES
  ) {
    fail("evidence.chain rotation threshold mismatch");
  }
  if (!Array.isArray(chain.chain) || chain.chain.length === 0) {
    fail("evidence.chain.chain must contain at least one issue");
  }
  if (
    !Array.isArray(chain.chain_issue_numbers)
    || chain.chain_issue_numbers.length !== chain.chain.length
  ) {
    fail("evidence.chain.chain_issue_numbers must match chain length");
  }
  const seenIssues = new Set();
  for (let index = 0; index < chain.chain.length; index += 1) {
    const entry = requireObject(
      chain.chain[index],
      "evidence.chain.chain[" + index + "]",
    );
    requirePositiveInteger(
      entry.issue_number,
      "evidence.chain.chain[" + index + "].issue_number",
    );
    if (seenIssues.has(entry.issue_number)) {
      fail("evidence.chain.chain contains duplicate issue numbers");
    }
    seenIssues.add(entry.issue_number);
    if (chain.chain_issue_numbers[index] !== entry.issue_number) {
      fail("evidence.chain.chain_issue_numbers order mismatch");
    }
    if (!["open", "closed"].includes(entry.issue_state)) {
      fail("evidence.chain.chain issue state is unsupported");
    }
    requireNonNegativeInteger(
      entry.comment_count,
      "evidence.chain.chain[" + index + "].comment_count",
    );
    requirePositiveInteger(
      entry.total_issue_messages,
      "evidence.chain.chain[" + index + "].total_issue_messages",
    );
    if (entry.total_issue_messages !== entry.comment_count + 1) {
      fail("successor-chain issue message count mismatch");
    }
    if (
      entry.rotation_threshold_total_messages
      !== ROTATION_THRESHOLD_TOTAL_MESSAGES
    ) {
      fail("successor-chain entry rotation threshold mismatch");
    }
    requireIsoTimestamp(
      entry.issue_updated_at,
      "evidence.chain.chain[" + index + "].issue_updated_at",
    );
    if (
      entry.successor_issue !== null
      && (
        !Number.isSafeInteger(entry.successor_issue)
        || entry.successor_issue < 1
      )
    ) {
      fail("successor-chain entry successor_issue is invalid");
    }
    if (entry.successor_issue === null) {
      if (entry.rotation_pointer_comment_id !== null) {
        fail("successor-chain entry without successor must not retain pointer comment");
      }
    } else {
      requirePositiveInteger(
        entry.rotation_pointer_comment_id,
        "evidence.chain.chain[" + index + "].rotation_pointer_comment_id",
      );
    }
    if (typeof entry.rotation_required_here !== "boolean") {
      fail("successor-chain entry rotation_required_here must be boolean");
    }
    const expectedRotationRequiredHere =
      entry.issue_state === "open"
      && entry.successor_issue === null
      && entry.total_issue_messages >= ROTATION_THRESHOLD_TOTAL_MESSAGES;
    if (entry.rotation_required_here !== expectedRotationRequiredHere) {
      fail("successor-chain entry rotation_required_here is inconsistent");
    }
    if (index < chain.chain.length - 1) {
      const nextIssue = chain.chain_issue_numbers[index + 1];
      if (entry.successor_issue !== nextIssue) {
        fail("successor-chain link mismatch");
      }
      if (entry.issue_state !== "closed") {
        fail("successor-chain predecessor with successor must be closed");
      }
    }
  }
  if (chain.chain_issue_numbers[0] !== chain.root_issue) {
    fail("successor-chain root issue mismatch");
  }
  const terminal = requireObject(
    chain.chain[chain.chain.length - 1],
    "evidence.chain.chain[terminal]",
  );
  if (terminal.issue_number !== chain.current_issue) {
    fail("successor-chain terminal issue mismatch");
  }
  if (terminal.successor_issue !== null) {
    fail("successor-chain terminal issue must not retain a successor");
  }
  if (chain.chain_valid && terminal.issue_state !== "open") {
    fail("valid successor-chain terminal issue must be open");
  }

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

  if (!Array.isArray(chain.hold_reasons)) {
    fail("evidence.chain.hold_reasons must be an array");
  }
  if (chain.outcome === "HOLD_INVALID_SUCCESSOR_CHAIN") {
    if (chain.chain_valid !== false) {
      fail("invalid chain outcome must set chain_valid=false");
    }
    if (chain.hold_reasons.length === 0) {
      fail("invalid chain outcome must retain hold reasons");
    }
    if (chain.dispatch_plan_issue_should_be !== null) {
      fail("invalid chain must suppress dispatch plan issue");
    }
    if (chain.plan_issue_update_required !== false) {
      fail("invalid chain must not request plan issue update");
    }
  } else {
    if (chain.chain_valid !== true) {
      fail("non-HOLD chain outcome must set chain_valid=true");
    }
    if (chain.hold_reasons.length !== 0) {
      fail("valid chain must not retain hold reasons");
    }
    if (chain.dispatch_plan_issue_should_be !== chain.current_issue) {
      fail("valid chain dispatch plan issue must equal current issue");
    }
    const expectedPlanUpdate = chain.current_issue !== chain.root_issue;
    if (chain.plan_issue_update_required !== expectedPlanUpdate) {
      fail("valid chain plan issue update flag is inconsistent");
    }
  }

  if (chain.outcome === "ROTATION_REQUIRED") {
    if (chain.rotation_required !== true) {
      fail("ROTATION_REQUIRED must set rotation_required=true");
    }
    if (
      terminal.total_issue_messages
      < ROTATION_THRESHOLD_TOTAL_MESSAGES
    ) {
      fail("rotation-required chain is below the message threshold");
    }
    if (terminal.rotation_required_here !== true) {
      fail("rotation-required terminal issue must mark rotation_required_here");
    }
  } else if (chain.rotation_required !== false) {
    fail("only ROTATION_REQUIRED may set rotation_required=true");
  }

  return chain;
}

function validateOpenPullRequest(raw, index) {
  const label = "evidence.open_pull_requests[" + index + "]";
  const pr = requireExactKeys(
    structuredClone(raw),
    [
      "number",
      "title",
      "state",
      "draft",
      "head_sha",
      "base_sha",
      "updated_at",
      "changed_paths",
    ],
    label,
  );
  requirePositiveInteger(pr.number, label + ".number");
  requireString(pr.title, label + ".title", 500);
  if (pr.state !== "open") {
    fail(label + ".state must equal open");
  }
  requireBoolean(pr.draft, label + ".draft");
  requireSha(pr.head_sha, label + ".head_sha");
  requireSha(pr.base_sha, label + ".base_sha");
  requireIsoTimestamp(pr.updated_at, label + ".updated_at");
  if (
    !Array.isArray(pr.changed_paths)
    || pr.changed_paths.length > MAX_CHANGED_PATHS_PER_PR
  ) {
    fail(
      label
      + ".changed_paths must be an array with at most "
      + MAX_CHANGED_PATHS_PER_PR
      + " entries",
    );
  }
  const paths = pr.changed_paths.map((value, pathIndex) =>
    normalizeChangedPath(
      value,
      label + ".changed_paths[" + pathIndex + "]",
    )
  );
  const unique = [...new Set(paths)].sort();
  if (unique.length !== paths.length) {
    fail(label + ".changed_paths contains duplicates");
  }
  return {
    number: pr.number,
    title: pr.title,
    state: pr.state,
    draft: pr.draft,
    head_sha: pr.head_sha,
    base_sha: pr.base_sha,
    updated_at: pr.updated_at,
    changed_paths: unique,
  };
}

function normalizeOpenPullRequests(raw) {
  if (!Array.isArray(raw) || raw.length > MAX_OPEN_PRS) {
    fail(
      "evidence.open_pull_requests must be an array with at most "
      + MAX_OPEN_PRS
      + " entries",
    );
  }
  const values = raw.map(validateOpenPullRequest);
  const numbers = values.map((pr) => pr.number);
  if (new Set(numbers).size !== numbers.length) {
    fail("evidence.open_pull_requests contains duplicate PR numbers");
  }
  return values.sort((left, right) =>
    left.number - right.number
    || left.head_sha.localeCompare(right.head_sha)
  );
}

function policyWorkers(policy) {
  return policy.workers
    .map((worker) => ({
      id: worker.id,
      name: worker.name,
      cohort: worker.cohort,
      tracking_issue: worker.tracking_issue,
      fallback_lane_id: worker.fallback_lane_id,
      fallback_priority: worker.fallback_priority,
      sensitive: worker.sensitive,
      exploration_domains: [...worker.exploration_domains].sort(),
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

export function buildCoordinationRotationSnapshotV1(policyRaw, evidenceRaw) {
  const policy = validateWorkerLiveDispatchPolicyV1(policyRaw);
  const evidence = structuredClone(
    requireExactKeys(
      evidenceRaw,
      [
        "marker",
        "version",
        "observed_at",
        "observed_main_sha",
        "chain",
        "open_pull_requests",
      ],
      "evidence",
    ),
  );
  if (evidence.marker !== EVIDENCE_MARKER) {
    fail("evidence.marker mismatch");
  }
  if (evidence.version !== 1) fail("evidence.version must equal 1");

  const observedAt = requireIsoTimestamp(
    evidence.observed_at,
    "evidence.observed_at",
  );
  const observedAtMs = Date.parse(observedAt);
  const observedMainSha = requireSha(
    evidence.observed_main_sha,
    "evidence.observed_main_sha",
  );
  const chain = validateChain(evidence.chain);
  const openPullRequests = normalizeOpenPullRequests(
    evidence.open_pull_requests,
  );
  const terminalUpdatedAtMs = Date.parse(
    chain.chain[chain.chain.length - 1].issue_updated_at,
  );
  if (terminalUpdatedAtMs > observedAtMs) {
    fail("successor-chain terminal issue update postdates evidence.observed_at");
  }
  for (const pr of openPullRequests) {
    if (Date.parse(pr.updated_at) > observedAtMs) {
      fail(
        "open PR #" + pr.number + " update postdates evidence.observed_at",
      );
    }
  }

  if (policy.marker !== LIVE_DISPATCH_POLICY_MARKER) {
    fail("validated live-dispatch policy marker mismatch");
  }
  if (policy.repository !== chain.repository_scope) {
    fail("policy repository and successor-chain repository mismatch");
  }

  const planIssueMatchesCurrent = policy.plan_issue === chain.current_issue;
  const policyPlanIssueRebindRequired =
    chain.chain_valid && !planIssueMatchesCurrent;
  const workerRoster = policyWorkers(policy);

  let outcome;
  let rotationPreparationReady = false;
  let successorCreationRequired = false;

  if (!chain.chain_valid || chain.outcome === "HOLD_INVALID_SUCCESSOR_CHAIN") {
    outcome = "HOLD_INVALID_SUCCESSOR_CHAIN";
  } else if (chain.outcome === "ROTATION_REQUIRED") {
    if (!planIssueMatchesCurrent) {
      outcome = "HOLD_POLICY_PLAN_ISSUE_MISMATCH";
    } else {
      outcome = "ROTATION_PREPARATION_READY";
      rotationPreparationReady = true;
      successorCreationRequired = true;
    }
  } else if (chain.outcome === "SUCCESSOR_RESOLVED") {
    outcome = "SUCCESSOR_ALREADY_RESOLVED";
  } else {
    outcome = "ROTATION_NOT_DUE";
  }

  const prSummary = openPullRequests.map((pr) => ({
    number: pr.number,
    title: pr.title,
    state: pr.state,
    draft: pr.draft,
    head_sha: pr.head_sha,
    base_sha: pr.base_sha,
    updated_at: pr.updated_at,
    changed_path_count: pr.changed_paths.length,
    changed_paths_sha256: sha256Id(pr.changed_paths),
    changed_paths: pr.changed_paths,
  }));

  const material = {
    marker: MARKER,
    version: 1,
    repository: policy.repository,
    observed_at: observedAt,
    observed_main_sha: observedMainSha,
    live_dispatch_policy_sha256: sha256Id(policyRaw),
    successor_chain_sha256: sha256Id(chain),
    open_pull_request_evidence_sha256: sha256Id(openPullRequests),
    outcome,
    rotation_preparation_ready: rotationPreparationReady,
    successor_creation_required: successorCreationRequired,
    rotation_writer_worker_id: ROTATION_WRITER_WORKER_ID,
    rotation_threshold_total_messages:
      ROTATION_THRESHOLD_TOTAL_MESSAGES,
    root_issue: chain.root_issue,
    resolved_current_issue: chain.current_issue,
    current_hub_comment_count:
      chain.chain[chain.chain.length - 1].comment_count,
    current_hub_total_messages:
      chain.chain[chain.chain.length - 1].total_issue_messages,
    current_hub_updated_at:
      chain.chain[chain.chain.length - 1].issue_updated_at,
    chain_outcome: chain.outcome,
    chain_valid: chain.chain_valid,
    rotation_required: chain.rotation_required,
    policy_plan_issue: policy.plan_issue,
    policy_plan_issue_matches_current: planIssueMatchesCurrent,
    policy_plan_issue_rebind_required: policyPlanIssueRebindRequired,
    scheduled_worker_count: workerRoster.length,
    scheduled_workers: workerRoster,
    open_pull_request_count: prSummary.length,
    open_pull_requests: prSummary,
    ownership_scope: "open_pull_requests_only",
    ownership_complete: false,
    point_in_time_only: true,
    live_refresh_required_before_successor_write: true,
    issue_lane_refresh_required: true,
    dependency_graph_refresh_required: true,
    recent_coordination_comment_refresh_required: true,
    open_issue_refresh_required: true,
    successor_section_guide: [...SUCCESSOR_SECTION_GUIDE],
    successor_body_generation_authorized: false,
    successor_issue_creation_authorized: false,
    predecessor_issue_close_authorized: false,
    predecessor_issue_lock_authorized: false,
    comment_post_authorized: false,
    scheduler_mutation_authorized: false,
    source_mutation_authorized: false,
    runtime_mutation_authorized: false,
    automatic_merge_authorized: false,
    authority_granted: false,
    mutation_performed: false,
  };

  return deepFreeze({
    ...material,
    snapshot_id: sha256Id(material),
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
    if (!value || value.startsWith("--")) {
      fail("missing value for " + flag);
    }
    if (flag === "--policy") args.policyPath = value;
    else if (flag === "--output") args.outputPath = value;
    else fail("unknown argument: " + flag);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const policy = JSON.parse(
    await readFile(path.resolve(args.policyPath), "utf8"),
  );
  const evidence = JSON.parse(await readBoundedStdin());
  const result = buildCoordinationRotationSnapshotV1(policy, evidence);
  const output =
    JSON.stringify(result, null, args.pretty ? 2 : 0) + "\n";
  if (args.outputPath) {
    await writeFile(path.resolve(args.outputPath), output, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
  }
  process.stdout.write(output);
}

if (
  process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(MARKER + "=HOLD\n" + message + "\n");
    process.exitCode = 2;
  });
}
