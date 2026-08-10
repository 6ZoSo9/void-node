#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export const VOID_PR_EXACT_HEAD_ACTIONS_SETTLEMENT_AUDIT_V1 =
  "VOID_PR_EXACT_HEAD_ACTIONS_SETTLEMENT_AUDIT_V1";

const SHA40 = /^[0-9a-f]{40}$/;
const KNOWN_PENDING_STATUSES = new Set([
  "requested",
  "queued",
  "pending",
  "waiting",
  "in_progress",
]);
const BLOCKING_CONCLUSIONS = new Set([
  "failure",
  "cancelled",
  "timed_out",
  "action_required",
  "startup_failure",
  "stale",
  "neutral",
  "skipped",
]);

function fail(message) {
  throw new Error(message);
}

function freeze(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(freeze));
  if (value && typeof value === "object") {
    return Object.freeze(
      Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, freeze(item)]),
      ),
    );
  }
  return value;
}

export function normalizeRepository(value) {
  const repository = String(value || "").trim();
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    fail("github_repository_invalid");
  }
  return repository;
}

export function normalizeSha40(value, label = "sha") {
  const sha = String(value || "").trim().toLowerCase();
  if (!SHA40.test(sha)) fail(`${label}_invalid`);
  return sha;
}

function normalizePositiveInteger(value, label) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) fail(`${label}_invalid`);
  return number;
}

function normalizeIsoTimestamp(value, label) {
  const text = String(value || "").trim();
  const millis = Date.parse(text);
  if (!text || !Number.isFinite(millis)) fail(`${label}_invalid`);
  return text;
}

export function parseOpenPullRequest(raw, repositoryInput) {
  const repository = normalizeRepository(repositoryInput);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    fail("github_pr_payload_invalid");
  }
  const number = normalizePositiveInteger(raw.number, "github_pr_number");
  if (String(raw.state || "").trim().toLowerCase() !== "open") {
    fail("github_pr_not_open");
  }
  if (raw.merged === true || raw.merged_at) fail("github_pr_already_merged");
  const headRepo = String(raw.head?.repo?.full_name || "").trim();
  const baseRepo = String(raw.base?.repo?.full_name || "").trim();
  if (headRepo !== repository || baseRepo !== repository) {
    fail("cross_repository_pr_unsupported_v1");
  }
  const headSha = normalizeSha40(raw.head?.sha, "github_pr_head_sha");
  const title = String(raw.title || "").trim();
  const url = String(raw.html_url || "").trim();
  if (!title || !/^https:\/\/github\.com\//.test(url)) {
    fail("github_pr_identity_invalid");
  }
  return freeze({ pr_number: number, title, url, head_sha: headSha });
}

function flattenWorkflowRunPages(raw) {
  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      fail(`github_actions_runs_json_invalid:${error.message}`);
    }
  }
  if (!Array.isArray(parsed)) fail("github_actions_run_pages_must_be_array");
  const runs = [];
  for (const page of parsed) {
    if (!page || typeof page !== "object" || Array.isArray(page)) {
      fail("github_actions_run_page_invalid");
    }
    if (!Array.isArray(page.workflow_runs)) {
      fail("github_actions_workflow_runs_missing");
    }
    runs.push(...page.workflow_runs);
  }
  return runs;
}

function normalizeRun(raw, expectedHead) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    fail("github_actions_run_invalid");
  }
  const id = normalizePositiveInteger(raw.id, "github_actions_run_id");
  const workflowId = normalizePositiveInteger(
    raw.workflow_id,
    `github_actions_workflow_id:${id}`,
  );
  const runNumber = normalizePositiveInteger(
    raw.run_number,
    `github_actions_run_number:${id}`,
  );
  const runAttempt = normalizePositiveInteger(
    raw.run_attempt ?? 1,
    `github_actions_run_attempt:${id}`,
  );
  const headSha = normalizeSha40(raw.head_sha, `github_actions_head_sha:${id}`);
  if (headSha !== expectedHead) fail(`github_actions_head_sha_mismatch:${id}`);
  if (String(raw.event || "").trim() !== "pull_request") {
    fail(`github_actions_event_mismatch:${id}`);
  }
  const name = String(raw.name || "").trim();
  if (!name) fail(`github_actions_name_invalid:${id}`);
  const status = String(raw.status || "").trim();
  if (!status) fail(`github_actions_status_invalid:${id}`);
  const conclusion = raw.conclusion === null || raw.conclusion === undefined
    ? null
    : String(raw.conclusion).trim();
  const createdAt = normalizeIsoTimestamp(raw.created_at, `github_actions_created_at:${id}`);
  const updatedAt = normalizeIsoTimestamp(raw.updated_at, `github_actions_updated_at:${id}`);
  const url = String(raw.html_url || "").trim();
  if (!/^https:\/\/github\.com\//.test(url)) {
    fail(`github_actions_url_invalid:${id}`);
  }
  return freeze({
    id,
    workflow_id: workflowId,
    name,
    run_number: runNumber,
    run_attempt: runAttempt,
    head_sha: headSha,
    event: "pull_request",
    status,
    conclusion,
    created_at: createdAt,
    updated_at: updatedAt,
    url,
  });
}

function compareRunFreshness(left, right) {
  if (left.run_number !== right.run_number) return left.run_number - right.run_number;
  if (left.run_attempt !== right.run_attempt) return left.run_attempt - right.run_attempt;
  const leftUpdated = Date.parse(left.updated_at);
  const rightUpdated = Date.parse(right.updated_at);
  if (leftUpdated !== rightUpdated) return leftUpdated - rightUpdated;
  return left.id - right.id;
}

function classifyLatestRun(run) {
  if (run.status !== "completed") {
    if (!KNOWN_PENDING_STATUSES.has(run.status)) {
      return freeze({ classification: "blocked", reason: `unknown_status:${run.status}` });
    }
    if (run.conclusion !== null && run.conclusion !== "") {
      return freeze({ classification: "blocked", reason: "nonterminal_has_conclusion" });
    }
    return freeze({ classification: "pending", reason: run.status });
  }

  if (run.conclusion === "success") {
    return freeze({ classification: "green", reason: "success" });
  }
  if (run.conclusion === null || run.conclusion === "") {
    return freeze({ classification: "blocked", reason: "completed_without_conclusion" });
  }
  if (BLOCKING_CONCLUSIONS.has(run.conclusion)) {
    return freeze({ classification: "blocked", reason: run.conclusion });
  }
  return freeze({ classification: "blocked", reason: `unknown_conclusion:${run.conclusion}` });
}

export function auditExactHeadActionsSettlement(input) {
  const repository = normalizeRepository(input?.repository);
  const pr = parseOpenPullRequest(input?.pull_request, repository);
  const expectedHead = input?.expected_head === undefined || input?.expected_head === null ||
    String(input.expected_head).trim() === ""
    ? null
    : normalizeSha40(input.expected_head, "expected_head");
  const minimumWorkflows = normalizePositiveInteger(
    input?.minimum_workflows ?? 1,
    "minimum_workflows",
  );

  const reasons = [];
  if (expectedHead !== null && expectedHead !== pr.head_sha) reasons.push("head_sha_mismatch");

  const rawRuns = Array.isArray(input?.workflow_runs)
    ? input.workflow_runs
    : flattenWorkflowRunPages(input?.workflow_run_pages ?? []);
  const runs = rawRuns.map((run) => normalizeRun(run, pr.head_sha));

  const seenRunIds = new Set();
  for (const run of runs) {
    if (seenRunIds.has(run.id)) fail(`github_actions_run_id_duplicate:${run.id}`);
    seenRunIds.add(run.id);
  }

  const byWorkflow = new Map();
  for (const run of runs) {
    const list = byWorkflow.get(run.workflow_id) || [];
    list.push(run);
    byWorkflow.set(run.workflow_id, list);
  }

  const latest = [];
  let supersededRunCount = 0;
  for (const [workflowId, list] of byWorkflow.entries()) {
    const ordered = [...list].sort(compareRunFreshness);
    const selected = ordered[ordered.length - 1];
    supersededRunCount += Math.max(0, ordered.length - 1);
    const classified = classifyLatestRun(selected);
    latest.push(freeze({
      workflow_id: workflowId,
      name: selected.name,
      run_id: selected.id,
      run_number: selected.run_number,
      run_attempt: selected.run_attempt,
      status: selected.status,
      conclusion: selected.conclusion,
      classification: classified.classification,
      classification_reason: classified.reason,
      url: selected.url,
      superseded_run_count: Math.max(0, ordered.length - 1),
    }));
  }
  latest.sort((left, right) =>
    left.name.localeCompare(right.name) || left.workflow_id - right.workflow_id,
  );

  const green = latest.filter((row) => row.classification === "green");
  const pending = latest.filter((row) => row.classification === "pending");
  const blocked = latest.filter((row) => row.classification === "blocked");

  if (latest.length < minimumWorkflows) reasons.push("minimum_workflow_count_not_met");
  if (pending.length > 0) reasons.push("latest_workflows_pending");
  if (blocked.length > 0) reasons.push("latest_workflows_failed_or_blocked");

  const uniqueReasons = [...new Set(reasons)].sort();
  let decision = "EXACT_HEAD_ACTIONS_SETTLED_GREEN";
  if (blocked.length > 0 || uniqueReasons.includes("head_sha_mismatch") || uniqueReasons.includes("minimum_workflow_count_not_met")) {
    decision = "EXACT_HEAD_ACTIONS_FAILED_OR_BLOCKED";
  } else if (pending.length > 0) {
    decision = "EXACT_HEAD_ACTIONS_PENDING";
  }

  return freeze({
    marker: VOID_PR_EXACT_HEAD_ACTIONS_SETTLEMENT_AUDIT_V1,
    version: 1,
    repository,
    pr_number: pr.pr_number,
    head_sha: pr.head_sha,
    expected_head: expectedHead,
    observed_run_count: runs.length,
    observed_workflow_count: latest.length,
    minimum_workflows: minimumWorkflows,
    superseded_run_count: supersededRunCount,
    green_workflow_count: green.length,
    pending_workflow_count: pending.length,
    blocked_workflow_count: blocked.length,
    latest_workflows: latest,
    pending_workflows: pending,
    blocked_workflows: blocked,
    all_observed_latest_workflows_green:
      uniqueReasons.length === 0 && latest.length >= minimumWorkflows && green.length === latest.length,
    decision,
    reasons: uniqueReasons,
    authority: {
      github_pr_metadata_read: true,
      github_actions_metadata_read: true,
      workflow_jobs_read: false,
      workflow_logs_read: false,
      workflow_rerun: false,
      git_read: false,
      git_mutation: false,
      pull_request_change: false,
      runtime_mutation: false,
      credential_material_read: false,
      wallet_or_signer: false,
      transaction: false,
      funds_moved: false,
    },
  });
}

function runGh(endpoint, label) {
  const result = spawnSync("gh", ["api", endpoint], {
    encoding: "utf8",
    env: process.env,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) fail(`${label}_start_failed:${result.error.message}`);
  if (result.status !== 0) {
    fail(`${label}_failed:${String(result.stderr || result.stdout || "").trim()}`);
  }
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    fail(`${label}_json_invalid:${error.message}`);
  }
}

function runGhPaginatedSlurp(endpoint, label) {
  const result = spawnSync("gh", ["api", "--paginate", "--slurp", endpoint], {
    encoding: "utf8",
    env: process.env,
    maxBuffer: 128 * 1024 * 1024,
  });
  if (result.error) fail(`${label}_start_failed:${result.error.message}`);
  if (result.status !== 0) {
    fail(`${label}_failed:${String(result.stderr || result.stdout || "").trim()}`);
  }
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    fail(`${label}_json_invalid:${error.message}`);
  }
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help") return { help: true };
    if (!token.startsWith("--")) fail(`unexpected_argument:${token}`);
    const key = token.slice(2).replaceAll("-", "_");
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) fail(`option_value_required:${token}`);
    if (Object.prototype.hasOwnProperty.call(result, key)) fail(`duplicate_option:${token}`);
    result[key] = value;
    index += 1;
  }
  return result;
}

function writePrivateJson(outputPath, value) {
  const resolved = path.resolve(outputPath);
  const descriptor = fs.openSync(resolved, "wx", 0o600);
  try {
    fs.writeFileSync(descriptor, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
  return resolved;
}

function usage() {
  console.log([
    "VOID PR exact-head Actions settlement audit v1",
    "",
    "Read-only audit of the latest observed pull_request workflow run for each workflow ID on one exact PR head.",
    "",
    "  node tools/void-pr-exact-head-actions-settlement-audit-v1.mjs \\",
    "    --repo 6ZoSo9/void-node \\",
    "    --pr-number 1234 \\",
    "    --expected-head <optional-40-hex-sha> \\",
    "    --minimum-workflows 1 \\",
    "    --output /tmp/void-pr-actions-settlement.json",
    "",
    "Exit 0: settled green; exit 2: pending/blocked; exit 1: unavailable/malformed.",
  ].join("\n"));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }
  const repository = normalizeRepository(args.repo);
  const prNumber = normalizePositiveInteger(args.pr_number, "pr_number");
  const output = String(args.output || "").trim();
  if (!output) fail("output_required");
  const minimumWorkflows = args.minimum_workflows === undefined
    ? 1
    : normalizePositiveInteger(args.minimum_workflows, "minimum_workflows");

  const pullRequest = runGh(`repos/${repository}/pulls/${prNumber}`, "github_pr_read");
  const pr = parseOpenPullRequest(pullRequest, repository);
  const pages = runGhPaginatedSlurp(
    `repos/${repository}/actions/runs?head_sha=${pr.head_sha}&event=pull_request&per_page=100`,
    "github_actions_runs_read",
  );

  const audit = auditExactHeadActionsSettlement({
    repository,
    pull_request: pullRequest,
    expected_head: args.expected_head,
    minimum_workflows: minimumWorkflows,
    workflow_run_pages: pages,
  });
  const written = writePrivateJson(output, {
    ...audit,
    generated_at_utc: new Date().toISOString(),
    mutation_performed: false,
  });

  console.log(`marker=${audit.marker}`);
  console.log(`repository=${audit.repository}`);
  console.log(`pr_number=${audit.pr_number}`);
  console.log(`head_sha=${audit.head_sha}`);
  console.log(`observed_run_count=${audit.observed_run_count}`);
  console.log(`observed_workflow_count=${audit.observed_workflow_count}`);
  console.log(`superseded_run_count=${audit.superseded_run_count}`);
  console.log(`green_workflow_count=${audit.green_workflow_count}`);
  console.log(`pending_workflow_count=${audit.pending_workflow_count}`);
  console.log(`blocked_workflow_count=${audit.blocked_workflow_count}`);
  console.log(`decision=${audit.decision}`);
  if (audit.reasons.length > 0) console.log(`reasons=${audit.reasons.join(",")}`);
  console.log(`output=${written}`);
  console.log("workflow_rerun=false");
  console.log("git_mutation=false");
  console.log("pull_request_change=false");
  console.log("VOID_PR_EXACT_HEAD_ACTIONS_SETTLEMENT_AUDIT_V1_COMPLETE=true");

  if (audit.decision !== "EXACT_HEAD_ACTIONS_SETTLED_GREEN") process.exitCode = 2;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`HOLD: ${error.message}`);
    process.exitCode = 1;
  });
}
