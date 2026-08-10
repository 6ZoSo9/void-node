#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export const VOID_PR_PATH_COLLISION_AUDIT_V1 =
  "VOID_PR_PATH_COLLISION_AUDIT_V1";

const SHA40 = /^[0-9a-f]{40}$/;
const MAX_GITHUB_PR_FILES = 3000;

function fail(message) {
  throw new Error(message);
}

export function normalizeRepository(value) {
  const repository = String(value || "").trim();
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    fail("github_repository_invalid");
  }
  return repository;
}

export function normalizeSha40(value, label = "head_sha") {
  const sha = String(value || "").trim().toLowerCase();
  if (!SHA40.test(sha)) fail(`${label}_invalid`);
  return sha;
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

export function normalizeTouchedPath(value) {
  if (typeof value !== "string") fail("github_file_path_must_be_string");
  if (
    value.length === 0 ||
    value.length > 4096 ||
    value !== value.trim() ||
    value.startsWith("/") ||
    value.includes("\0") ||
    value.includes("\n") ||
    value.includes("\r")
  ) {
    fail(`github_file_path_invalid:${JSON.stringify(value)}`);
  }
  const segments = value.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    fail(`github_file_path_invalid:${JSON.stringify(value)}`);
  }
  return value;
}

function flattenApiPages(raw, label) {
  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      fail(`${label}_json_invalid:${error.message}`);
    }
  }
  if (!Array.isArray(parsed)) fail(`${label}_must_be_array`);
  if (parsed.length === 0) return [];
  if (parsed.every((entry) => Array.isArray(entry))) {
    return parsed.flat();
  }
  if (parsed.some((entry) => Array.isArray(entry))) {
    fail(`${label}_page_shape_invalid`);
  }
  return parsed;
}

function normalizePr(raw, repository) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    fail("github_pr_entry_must_be_object");
  }
  if (!Number.isInteger(raw.number) || raw.number <= 0) {
    fail("github_pr_number_invalid");
  }
  if (String(raw.state || "").trim().toLowerCase() !== "open") {
    fail(`github_pr_state_not_open:#${raw.number}`);
  }
  if (typeof raw.draft !== "boolean") {
    fail(`github_pr_draft_flag_invalid:#${raw.number}`);
  }

  const title = String(raw.title || "").trim();
  const url = String(raw.html_url || "").trim();
  if (!title || !/^https:\/\/github\.com\//.test(url)) {
    fail(`github_pr_metadata_invalid:#${raw.number}`);
  }

  const headBranch = normalizeBranchName(raw.head?.ref);
  const baseBranch = normalizeBranchName(raw.base?.ref);
  const headSha = normalizeSha40(raw.head?.sha, `github_pr_head_sha:#${raw.number}`);
  const headRepo = String(raw.head?.repo?.full_name || "").trim();
  const baseRepo = String(raw.base?.repo?.full_name || "").trim();
  if (!headRepo || !baseRepo) fail(`github_pr_repository_binding_missing:#${raw.number}`);
  if (baseRepo !== repository) fail(`github_pr_base_repository_mismatch:#${raw.number}`);
  if (headRepo === repository && headBranch === baseBranch) {
    fail(`github_pr_self_base_invalid:#${raw.number}`);
  }

  return Object.freeze({
    pr_number: raw.number,
    title,
    url,
    is_draft: raw.draft,
    head_repository: headRepo,
    head_branch: headBranch,
    head_sha: headSha,
    base_branch: baseBranch,
  });
}

export function parseOpenPullRequests(raw, repositoryInput) {
  const repository = normalizeRepository(repositoryInput);
  const entries = flattenApiPages(raw, "github_open_prs");
  const seenNumbers = new Set();
  const result = entries.map((entry) => {
    const pr = normalizePr(entry, repository);
    if (seenNumbers.has(pr.pr_number)) {
      fail(`github_pr_number_duplicate:#${pr.pr_number}`);
    }
    seenNumbers.add(pr.pr_number);
    return pr;
  });
  return result.sort((left, right) => left.pr_number - right.pr_number);
}

export function normalizePrFileRecords(raw, prNumber) {
  const entries = flattenApiPages(raw, `github_pr_files:#${prNumber}`);
  if (entries.length >= MAX_GITHUB_PR_FILES) {
    fail(`github_pr_file_limit_reached:#${prNumber}`);
  }
  const touched = new Set();
  const seenCurrent = new Set();

  for (const entry of entries) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      fail(`github_pr_file_entry_invalid:#${prNumber}`);
    }
    const current = normalizeTouchedPath(entry.filename);
    if (seenCurrent.has(current)) {
      fail(`github_pr_file_duplicate:#${prNumber}:${current}`);
    }
    seenCurrent.add(current);
    touched.add(current);

    if (entry.previous_filename !== undefined && entry.previous_filename !== null) {
      touched.add(normalizeTouchedPath(entry.previous_filename));
    }
  }

  return Object.freeze({
    file_record_count: entries.length,
    touched_paths: Object.freeze([...touched].sort()),
  });
}

function normalizePrFileMap(rawMap, openPrs) {
  if (!rawMap || typeof rawMap !== "object" || Array.isArray(rawMap)) {
    fail("github_pr_file_map_invalid");
  }
  const normalized = new Map();
  const expected = new Set(openPrs.map((pr) => String(pr.pr_number)));
  const supplied = Object.keys(rawMap).sort();

  for (const key of supplied) {
    if (!/^[1-9][0-9]*$/.test(key) || !expected.has(key)) {
      fail(`github_pr_file_map_unexpected_key:${key}`);
    }
  }
  for (const pr of openPrs) {
    const key = String(pr.pr_number);
    if (!Object.prototype.hasOwnProperty.call(rawMap, key)) {
      fail(`github_pr_file_map_missing:#${pr.pr_number}`);
    }
    normalized.set(
      pr.pr_number,
      normalizePrFileRecords(rawMap[key], pr.pr_number),
    );
  }
  return normalized;
}

function overlapPaths(left, right) {
  const rightSet = new Set(right);
  return left.filter((item) => rightSet.has(item)).sort();
}

function buildStackRelations(openPrs, repository) {
  const localHeads = new Map();
  for (const pr of openPrs) {
    if (pr.head_repository !== repository) continue;
    const list = localHeads.get(pr.head_branch) || [];
    list.push(pr.pr_number);
    localHeads.set(pr.head_branch, list);
  }

  const ambiguousBranches = [...localHeads.entries()]
    .filter(([, numbers]) => numbers.length !== 1)
    .map(([branch, numbers]) => ({
      branch,
      pr_numbers: [...numbers].sort((a, b) => a - b),
    }))
    .sort((left, right) => left.branch.localeCompare(right.branch));

  const children = new Map();
  const parents = new Map();
  for (const pr of openPrs) {
    const candidates = localHeads.get(pr.base_branch) || [];
    if (candidates.length !== 1) continue;
    const parentNumber = candidates[0];
    if (parentNumber === pr.pr_number) continue;

    const childList = children.get(parentNumber) || [];
    childList.push(pr.pr_number);
    children.set(parentNumber, childList);

    const parentList = parents.get(pr.pr_number) || [];
    parentList.push(parentNumber);
    parents.set(pr.pr_number, parentList);
  }

  const traverse = (start, adjacency) => {
    const seen = new Set();
    const queue = [...(adjacency.get(start) || [])];
    while (queue.length > 0) {
      const current = queue.shift();
      if (seen.has(current)) continue;
      seen.add(current);
      queue.push(...(adjacency.get(current) || []));
    }
    return seen;
  };

  return {
    ambiguous_branches: ambiguousBranches,
    ancestorsOf: (prNumber) => traverse(prNumber, parents),
    descendantsOf: (prNumber) => traverse(prNumber, children),
  };
}

function authorityBoundary() {
  return Object.freeze({
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
  });
}

function normalizeCandidatePaths(values) {
  if (!Array.isArray(values) || values.length === 0) {
    fail("candidate_paths_required");
  }
  const normalized = values.map(normalizeTouchedPath);
  const unique = [...new Set(normalized)].sort();
  if (unique.length !== normalized.length) fail("candidate_path_duplicate");
  return unique;
}

export function auditCandidatePathCollisions(input) {
  const repository = normalizeRepository(input?.repository);
  const openPrs = parseOpenPullRequests(input?.open_prs || [], repository);
  const filesByPr = normalizePrFileMap(input?.pr_files_by_number || {}, openPrs);
  const candidatePaths = normalizeCandidatePaths(input?.candidate_paths);

  const overlaps = [];
  for (const pr of openPrs) {
    const paths = overlapPaths(
      candidatePaths,
      filesByPr.get(pr.pr_number).touched_paths,
    );
    if (paths.length === 0) continue;
    overlaps.push(Object.freeze({
      pr_number: pr.pr_number,
      title: pr.title,
      url: pr.url,
      head_branch: pr.head_branch,
      head_sha: pr.head_sha,
      overlap_paths: Object.freeze(paths),
    }));
  }

  const safe = overlaps.length === 0;
  return Object.freeze({
    marker: VOID_PR_PATH_COLLISION_AUDIT_V1,
    version: 1,
    mode: "candidate_paths",
    repository,
    candidate_paths: Object.freeze(candidatePaths),
    open_pr_count: openPrs.length,
    collision_pr_count: overlaps.length,
    collisions: Object.freeze(overlaps),
    safe_to_publish_candidate_paths: safe,
    decision: safe
      ? "SAFE_NO_OPEN_PR_PATH_COLLISIONS"
      : "HOLD_OPEN_PR_PATH_COLLISIONS",
    reasons: Object.freeze(safe ? [] : ["open_pr_path_collision"]),
    authority: authorityBoundary(),
  });
}

export function auditOpenPrPathCollisions(input) {
  const repository = normalizeRepository(input?.repository);
  const openPrs = parseOpenPullRequests(input?.open_prs || [], repository);
  const filesByPr = normalizePrFileMap(input?.pr_files_by_number || {}, openPrs);
  const targetNumber = Number(input?.target_pr_number);
  if (!Number.isInteger(targetNumber) || targetNumber <= 0) {
    fail("target_pr_number_invalid");
  }

  const target = openPrs.find((pr) => pr.pr_number === targetNumber);
  if (!target) fail(`target_pr_not_open:#${targetNumber}`);

  const expectedHead =
    input?.expected_target_head === undefined ||
    input?.expected_target_head === null ||
    String(input.expected_target_head).trim() === ""
      ? null
      : normalizeSha40(input.expected_target_head, "expected_target_head");

  const reasons = [];
  if (expectedHead !== null && target.head_sha !== expectedHead) {
    reasons.push("target_head_mismatch");
  }

  const relations = buildStackRelations(openPrs, repository);
  if (relations.ambiguous_branches.length > 0) {
    reasons.push("local_head_branch_ambiguous");
  }
  const ancestors = relations.ancestorsOf(targetNumber);
  const descendants = relations.descendantsOf(targetNumber);
  if (ancestors.has(targetNumber) || descendants.has(targetNumber)) {
    reasons.push("dependency_cycle_detected");
  }

  const targetPaths = filesByPr.get(targetNumber).touched_paths;
  const stackRelated = [];
  const unrelated = [];

  for (const pr of openPrs) {
    if (pr.pr_number === targetNumber) continue;
    const paths = overlapPaths(
      targetPaths,
      filesByPr.get(pr.pr_number).touched_paths,
    );
    if (paths.length === 0) continue;

    let relation = "unrelated";
    if (ancestors.has(pr.pr_number)) relation = "ancestor";
    if (descendants.has(pr.pr_number)) relation = "descendant";
    const row = Object.freeze({
      pr_number: pr.pr_number,
      title: pr.title,
      url: pr.url,
      head_branch: pr.head_branch,
      head_sha: pr.head_sha,
      relation,
      overlap_paths: Object.freeze(paths),
    });
    if (relation === "unrelated") unrelated.push(row);
    else stackRelated.push(row);
  }

  if (unrelated.length > 0) reasons.push("unrelated_open_pr_path_collision");
  const uniqueReasons = [...new Set(reasons)].sort();
  const safe = uniqueReasons.length === 0;

  return Object.freeze({
    marker: VOID_PR_PATH_COLLISION_AUDIT_V1,
    version: 1,
    mode: "open_pr",
    repository,
    target_pr_number: targetNumber,
    target_head_branch: target.head_branch,
    target_head_sha: target.head_sha,
    expected_target_head: expectedHead,
    target_touched_paths: Object.freeze([...targetPaths]),
    open_pr_count: openPrs.length,
    stack_related_overlap_count: stackRelated.length,
    unrelated_overlap_count: unrelated.length,
    stack_related_overlaps: Object.freeze(stackRelated),
    unrelated_overlaps: Object.freeze(unrelated),
    ambiguous_local_head_branches: Object.freeze(relations.ambiguous_branches),
    safe_to_work_without_unrelated_collision: safe,
    decision: safe
      ? "SAFE_NO_UNRELATED_OPEN_PR_PATH_COLLISIONS"
      : "HOLD_PR_PATH_COLLISION_AUDIT",
    reasons: Object.freeze(uniqueReasons),
    authority: authorityBoundary(),
  });
}

function parseArgs(argv) {
  const values = { candidate_path: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help") return { help: true, candidate_path: [] };
    if (!token.startsWith("--")) fail(`unexpected_argument:${token}`);

    const key = token.slice(2).replaceAll("-", "_");
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      fail(`option_value_required:${token}`);
    }
    index += 1;

    if (key === "candidate_path") {
      values.candidate_path.push(value);
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(values, key)) {
      fail(`duplicate_option:${token}`);
    }
    values[key] = value;
  }
  return values;
}

function runGhApiPages(endpoint, label) {
  const result = spawnSync(
    "gh",
    ["api", "--paginate", "--slurp", endpoint],
    {
      encoding: "utf8",
      env: process.env,
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  if (result.error) fail(`github_cli_start_failed:${result.error.message}`);
  if (result.status !== 0) {
    fail(
      `${label}_failed:${String(result.stderr || result.stdout || "").trim()}`,
    );
  }
  return flattenApiPages(result.stdout, label);
}

function listOpenPrs(repository) {
  return runGhApiPages(
    `repos/${repository}/pulls?state=open&per_page=100`,
    "github_open_prs",
  );
}

function listPrFiles(repository, prNumber) {
  return runGhApiPages(
    `repos/${repository}/pulls/${prNumber}/files?per_page=100`,
    `github_pr_files:#${prNumber}`,
  );
}

function collectAllPrFiles(repository, openPrsRaw) {
  const normalized = parseOpenPullRequests(openPrsRaw, repository);
  const result = {};
  for (const pr of normalized) {
    result[String(pr.pr_number)] = listPrFiles(repository, pr.pr_number);
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

function parseCandidatePathsJson(raw) {
  if (raw === undefined) return [];
  let parsed;
  try {
    parsed = JSON.parse(String(raw));
  } catch (error) {
    fail(`candidate_paths_json_invalid:${error.message}`);
  }
  if (!Array.isArray(parsed)) fail("candidate_paths_json_must_be_array");
  return parsed;
}

function usage() {
  console.log([
    "VOID PR path collision audit v1",
    "",
    "Read-only exact-path overlap guard for concurrent open pull requests.",
    "",
    "Audit an existing open PR:",
    "  node tools/void-pr-path-collision-audit-v1.mjs \\",
    "    --repo 6ZoSo9/void-node \\",
    "    --pr-number 1234 \\",
    "    --expected-head <40-hex-sha> \\",
    "    --output /tmp/void-pr-path-collision-audit.json",
    "",
    "Audit proposed paths before opening a PR:",
    "  node tools/void-pr-path-collision-audit-v1.mjs \\",
    "    --repo 6ZoSo9/void-node \\",
    "    --candidate-path src/example.ts \\",
    "    --candidate-path scripts/prove_example.ts \\",
    "    --output /tmp/void-pr-path-collision-audit.json",
    "",
    "Alternatively pass --candidate-paths-json '[\"src/example.ts\"]'.",
    "Exit 0: safe; exit 2: hold; exit 1: audit unavailable/malformed.",
  ].join("\n"));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }

  const repository = normalizeRepository(args.repo);
  const output = String(args.output || "").trim();
  if (!output) fail("output_required");

  const prMode = args.pr_number !== undefined;
  const candidatePaths = [
    ...(args.candidate_path || []),
    ...parseCandidatePathsJson(args.candidate_paths_json),
  ];
  const candidateMode = candidatePaths.length > 0;
  if (prMode === candidateMode) {
    fail("select_exactly_one_audit_mode");
  }
  if (!prMode && args.expected_head !== undefined) {
    fail("expected_head_requires_pr_mode");
  }

  const openPrsRaw = listOpenPrs(repository);
  const prFilesRaw = collectAllPrFiles(repository, openPrsRaw);

  const audit = prMode
    ? auditOpenPrPathCollisions({
        repository,
        target_pr_number: Number(args.pr_number),
        expected_target_head: args.expected_head,
        open_prs: openPrsRaw,
        pr_files_by_number: prFilesRaw,
      })
    : auditCandidatePathCollisions({
        repository,
        candidate_paths: candidatePaths,
        open_prs: openPrsRaw,
        pr_files_by_number: prFilesRaw,
      });

  const envelope = {
    ...audit,
    generated_at_utc: new Date().toISOString(),
    mutation_performed: false,
  };
  const written = writePrivateJson(output, envelope);

  console.log(`marker=${audit.marker}`);
  console.log(`mode=${audit.mode}`);
  console.log(`repository=${audit.repository}`);
  if (audit.mode === "open_pr") {
    console.log(`target_pr_number=${audit.target_pr_number}`);
    console.log(`target_head_sha=${audit.target_head_sha}`);
    console.log(`stack_related_overlap_count=${audit.stack_related_overlap_count}`);
    console.log(`unrelated_overlap_count=${audit.unrelated_overlap_count}`);
  } else {
    console.log(`candidate_path_count=${audit.candidate_paths.length}`);
    console.log(`collision_pr_count=${audit.collision_pr_count}`);
  }
  console.log(`decision=${audit.decision}`);
  if (audit.reasons.length > 0) {
    console.log(`reasons=${audit.reasons.join(",")}`);
  }
  console.log(`output=${written}`);
  console.log("mutation_performed=false");
  console.log("VOID_PR_PATH_COLLISION_AUDIT_V1_COMPLETE=true");

  if (
    audit.decision === "HOLD_OPEN_PR_PATH_COLLISIONS" ||
    audit.decision === "HOLD_PR_PATH_COLLISION_AUDIT"
  ) {
    process.exitCode = 2;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`HOLD: ${error.message}`);
    process.exitCode = 1;
  });
}
