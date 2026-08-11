#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export const VOID_PR_STACK_DEPENDENCY_AUDIT_V1 =
  "VOID_PR_STACK_DEPENDENCY_AUDIT_V1";

const SHA40 = /^[0-9a-f]{40}$/;

function fail(message) {
  throw new Error(message);
}

export function normalizeBranchName(value) {
  if (typeof value !== "string") fail("branch_name_must_be_string");
  const branch = value.trim();
  if (
    !branch ||
    branch.length > 255 ||
    branch.startsWith("-") ||
    branch.startsWith("/") ||
    branch.endsWith("/") ||
    branch.endsWith(".") ||
    branch.endsWith(".lock") ||
    branch.includes("//") ||
    branch.includes("..") ||
    branch.includes("@{") ||
    /[\x00-\x20\x7f~^:?*[\]\\]/.test(branch)
  ) {
    fail(`branch_name_invalid:${JSON.stringify(value)}`);
  }
  return branch;
}

export function normalizeSha40(value) {
  const sha = String(value || "").trim().toLowerCase();
  if (!SHA40.test(sha)) fail("expected_parent_head_invalid");
  return sha;
}

function normalizePr(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    fail("github_pr_entry_must_be_object");
  }
  if (!Number.isInteger(raw.number) || raw.number <= 0) {
    fail("github_pr_number_invalid");
  }
  const state = String(raw.state || "").trim().toUpperCase();
  if (state !== "OPEN") fail(`github_pr_state_not_open:#${raw.number}`);
  if (typeof raw.isDraft !== "boolean") {
    fail(`github_pr_draft_flag_invalid:#${raw.number}`);
  }
  const title = String(raw.title || "").trim();
  const url = String(raw.url || "").trim();
  if (!title || !/^https:\/\/github\.com\//.test(url)) {
    fail(`github_pr_metadata_invalid:#${raw.number}`);
  }
  const headRefName = normalizeBranchName(raw.headRefName);
  const baseRefName = normalizeBranchName(raw.baseRefName);
  const headRefOid = normalizeSha40(raw.headRefOid);
  if (headRefName === baseRefName) {
    fail(`github_pr_self_base_invalid:#${raw.number}`);
  }
  return Object.freeze({
    number: raw.number,
    title,
    url,
    is_draft: raw.isDraft,
    state: "open",
    head_branch: headRefName,
    head_sha: headRefOid,
    base_branch: baseRefName,
  });
}

export function parseOpenPullRequests(raw) {
  let parsed;
  try {
    parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch (error) {
    fail(`github_pr_json_invalid:${error.message}`);
  }
  if (!Array.isArray(parsed)) fail("github_pr_list_must_be_array");
  const seenNumbers = new Set();
  const result = parsed.map((item) => {
    const pr = normalizePr(item);
    if (seenNumbers.has(pr.number)) {
      fail(`github_pr_number_duplicate:#${pr.number}`);
    }
    seenNumbers.add(pr.number);
    return pr;
  });
  return result.sort((left, right) => left.number - right.number);
}

function dependencyRow(pr, depth) {
  return Object.freeze({
    pr_number: pr.number,
    title: pr.title,
    url: pr.url,
    is_draft: pr.is_draft,
    base_branch: pr.base_branch,
    head_branch: pr.head_branch,
    head_sha: pr.head_sha,
    depth,
  });
}

export function auditParentBranchDependencies(input) {
  const parentBranch = normalizeBranchName(input?.parent_branch);
  const expectedParentHead =
    input?.expected_parent_head === undefined ||
      input?.expected_parent_head === null ||
      String(input.expected_parent_head).trim() === ""
      ? null
      : normalizeSha40(input.expected_parent_head);
  const openPrs = parseOpenPullRequests(input?.open_prs || []);

  const parentPrs = openPrs.filter((pr) => pr.head_branch === parentBranch);
  const reasons = [];

  let observedParentHead = null;
  let parentPrNumber = null;
  if (parentPrs.length === 1) {
    observedParentHead = parentPrs[0].head_sha;
    parentPrNumber = parentPrs[0].number;
  } else if (parentPrs.length > 1) {
    reasons.push("parent_pr_ambiguous");
  }

  if (expectedParentHead !== null) {
    if (parentPrs.length !== 1) {
      reasons.push("parent_head_unverified");
    } else if (observedParentHead !== expectedParentHead) {
      reasons.push("parent_head_mismatch");
    }
  }

  const byBase = new Map();
  for (const pr of openPrs) {
    const list = byBase.get(pr.base_branch) || [];
    list.push(pr);
    byBase.set(pr.base_branch, list);
  }
  for (const list of byBase.values()) {
    list.sort((left, right) => left.number - right.number);
  }

  const directChildren = (byBase.get(parentBranch) || [])
    .map((pr) => dependencyRow(pr, 1));

  const descendants = [];
  const visitedPrNumbers = new Set();
  const queue = directChildren.map((row) => ({
    row,
    lineage: [parentBranch, row.head_branch],
  }));
  let cycleDetected = false;

  while (queue.length > 0) {
    const current = queue.shift();
    if (visitedPrNumbers.has(current.row.pr_number)) continue;
    visitedPrNumbers.add(current.row.pr_number);
    descendants.push(current.row);

    const children = byBase.get(current.row.head_branch) || [];
    for (const child of children) {
      if (current.lineage.includes(child.head_branch)) {
        cycleDetected = true;
        continue;
      }
      queue.push({
        row: dependencyRow(child, current.row.depth + 1),
        lineage: [...current.lineage, child.head_branch],
      });
    }
  }

  descendants.sort(
    (left, right) =>
      left.depth - right.depth ||
      left.pr_number - right.pr_number,
  );

  if (directChildren.length > 0) reasons.push("open_child_pr_dependencies");
  if (cycleDetected) reasons.push("dependency_cycle_detected");

  const uniqueReasons = [...new Set(reasons)].sort();
  const safeToMove = uniqueReasons.length === 0;

  return Object.freeze({
    marker: VOID_PR_STACK_DEPENDENCY_AUDIT_V1,
    version: 1,
    parent_branch: parentBranch,
    parent_pr_number: parentPrNumber,
    expected_parent_head: expectedParentHead,
    observed_parent_head: observedParentHead,
    safe_to_move_parent_branch: safeToMove,
    decision: safeToMove
      ? "SAFE_NO_OPEN_CHILD_DEPENDENCIES"
      : "HOLD_PARENT_BRANCH_MOVEMENT",
    reasons: uniqueReasons,
    direct_child_count: directChildren.length,
    descendant_count: descendants.length,
    direct_children: directChildren,
    descendants,
    authority: Object.freeze({
      git_fetch: false,
      git_pull: false,
      checkout: false,
      reset: false,
      branch_create: false,
      branch_update: false,
      branch_delete: false,
      commit: false,
      push: false,
      pull_request_change: false,
      workflow_rerun: false,
      runtime_mutation: false,
      credential_read: false,
      wallet_or_signer: false,
      transaction: false,
      funds_moved: false,
    }),
  });
}

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help") return { help: true };
    if (!token.startsWith("--")) fail(`unexpected_argument:${token}`);
    const key = token.slice(2).replaceAll("-", "_");
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      values[key] = true;
    } else {
      values[key] = value;
      index += 1;
    }
  }
  return values;
}

function runGhPrList(repository) {
  const result = spawnSync(
    "gh",
    [
      "pr",
      "list",
      "--repo",
      repository,
      "--state",
      "open",
      "--limit",
      "1000",
      "--json",
      "number,title,url,isDraft,state,headRefName,headRefOid,baseRefName",
    ],
    {
      encoding: "utf8",
      env: process.env,
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  if (result.error) {
    fail(`github_cli_start_failed:${result.error.message}`);
  }
  if (result.status !== 0) {
    fail(
      `github_pr_list_failed:${String(result.stderr || result.stdout || "").trim()}`,
    );
  }
  return parseOpenPullRequests(result.stdout);
}

function validateRepository(value) {
  const repository = String(value || "").trim();
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    fail("github_repository_invalid");
  }
  return repository;
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
    "VOID PR stack dependency audit v1",
    "",
    "Read-only pre-movement guard for a branch that may have open child PRs.",
    "",
    "  node tools/void-pr-stack-dependency-audit-v1.mjs \\",
    "    --repo 6ZoSo9/void-node \\",
    "    --parent-branch feat/example-parent-v1 \\",
    "    --expected-parent-head <40-hex-sha> \\",
    "    --output /tmp/void-pr-stack-audit.json",
    "",
    "--expected-parent-head is optional. When supplied, the parent must be the",
    "head branch of exactly one open PR and its GitHub head SHA must match exactly.",
    "",
    "Exit 0: safe; exit 2: hold; exit 1: audit unavailable/malformed.",
  ].join("\n"));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }
  const repository = validateRepository(args.repo);
  const parentBranch = normalizeBranchName(args.parent_branch);
  const output = String(args.output || "").trim();
  if (!output) fail("output_required");

  const openPrs = runGhPrList(repository);
  const audit = auditParentBranchDependencies({
    parent_branch: parentBranch,
    expected_parent_head: args.expected_parent_head,
    open_prs: openPrs.map((pr) => ({
      number: pr.number,
      title: pr.title,
      url: pr.url,
      isDraft: pr.is_draft,
      state: "OPEN",
      headRefName: pr.head_branch,
      headRefOid: pr.head_sha,
      baseRefName: pr.base_branch,
    })),
  });

  const envelope = {
    ...audit,
    repository,
    generated_at_utc: new Date().toISOString(),
    open_pr_count: openPrs.length,
    mutation_performed: false,
  };
  const written = writePrivateJson(output, envelope);

  console.log(`marker=${audit.marker}`);
  console.log(`repository=${repository}`);
  console.log(`parent_branch=${audit.parent_branch}`);
  console.log(`parent_pr_number=${audit.parent_pr_number ?? "none"}`);
  console.log(`direct_child_count=${audit.direct_child_count}`);
  console.log(`descendant_count=${audit.descendant_count}`);
  console.log(`decision=${audit.decision}`);
  if (audit.reasons.length > 0) {
    console.log(`reasons=${audit.reasons.join(",")}`);
  }
  console.log(`output=${written}`);
  console.log("mutation_performed=false");
  console.log("VOID_PR_STACK_DEPENDENCY_AUDIT_V1_COMPLETE=true");

  if (!audit.safe_to_move_parent_branch) process.exitCode = 2;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`HOLD: ${error.message}`);
    process.exitCode = 1;
  });
}
