#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export const VOID_PR_BASE_RECONCILIATION_AUDIT_V1 =
  "VOID_PR_BASE_RECONCILIATION_AUDIT_V1";

const SHA40 = /^[0-9a-f]{40}$/;

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

function normalizeBranch(value, label) {
  if (typeof value !== "string") fail(`${label}_must_be_string`);
  const branch = value.trim();
  if (
    !branch ||
    branch.length > 255 ||
    branch !== value ||
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
    fail(`${label}_invalid`);
  }
  return branch;
}

export function normalizeRepositoryPath(value) {
  if (typeof value !== "string") fail("repository_path_must_be_string");
  if (
    value.length === 0 ||
    value.length > 4096 ||
    value !== value.trim() ||
    value.startsWith("/") ||
    value.includes("\0") ||
    value.includes("\n") ||
    value.includes("\r")
  ) {
    fail(`repository_path_invalid:${JSON.stringify(value)}`);
  }
  const segments = value.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    fail(`repository_path_invalid:${JSON.stringify(value)}`);
  }
  return value;
}

export function parseOpenSameRepoPullRequest(raw, repositoryInput) {
  const repository = normalizeRepository(repositoryInput);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    fail("github_pr_payload_invalid");
  }
  if (!Number.isInteger(raw.number) || raw.number <= 0) {
    fail("github_pr_number_invalid");
  }
  if (String(raw.state || "").trim().toLowerCase() !== "open") {
    fail("github_pr_not_open");
  }
  if (raw.merged === true || raw.merged_at) fail("github_pr_already_merged");

  const headRepo = String(raw.head?.repo?.full_name || "").trim();
  const baseRepo = String(raw.base?.repo?.full_name || "").trim();
  if (headRepo !== repository || baseRepo !== repository) {
    fail("cross_repository_pr_unsupported_v1");
  }

  const headBranch = normalizeBranch(raw.head?.ref, "head_branch");
  const baseBranch = normalizeBranch(raw.base?.ref, "base_branch");
  if (headBranch === baseBranch) fail("head_base_branch_same");

  const headSha = normalizeSha40(raw.head?.sha, "head_sha");
  const baseSha = normalizeSha40(raw.base?.sha, "base_sha");
  const title = String(raw.title || "").trim();
  const url = String(raw.html_url || "").trim();
  if (!title || !/^https:\/\/github\.com\//.test(url)) {
    fail("github_pr_identity_invalid");
  }

  return freeze({
    pr_number: raw.number,
    title,
    url,
    head_branch: headBranch,
    head_sha: headSha,
    base_branch: baseBranch,
    base_sha: baseSha,
  });
}

export function parseNameStatusZ(buffer) {
  const raw = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || "");
  if (raw.length === 0) return freeze({ records: [], touched_paths: [] });
  if (raw[raw.length - 1] !== 0) fail("git_name_status_not_nul_terminated");

  const tokens = raw
    .toString("utf8")
    .split("\0")
    .slice(0, -1);
  const records = [];
  const touched = new Set();

  for (let index = 0; index < tokens.length; ) {
    const status = tokens[index++];
    if (!/^(?:[ACDMRTUXB]|R[0-9]{1,3}|C[0-9]{1,3})$/.test(status)) {
      fail(`git_name_status_invalid:${JSON.stringify(status)}`);
    }
    const pathA = normalizeRepositoryPath(tokens[index++]);
    if (status.startsWith("R") || status.startsWith("C")) {
      if (index >= tokens.length) fail("git_name_status_rename_truncated");
      const pathB = normalizeRepositoryPath(tokens[index++]);
      records.push(freeze({ status, paths: [pathA, pathB] }));
      touched.add(pathA);
      touched.add(pathB);
    } else {
      records.push(freeze({ status, paths: [pathA] }));
      touched.add(pathA);
    }
  }

  return freeze({
    records,
    touched_paths: [...touched].sort(),
  });
}

export function classifyPathCollisions(featurePathsInput, basePathsInput) {
  const featurePaths = [...new Set(featurePathsInput.map(normalizeRepositoryPath))].sort();
  const basePaths = [...new Set(basePathsInput.map(normalizeRepositoryPath))].sort();
  const baseSet = new Set(basePaths);
  const exact = featurePaths.filter((item) => baseSet.has(item));

  const structural = [];
  for (const feature of featurePaths) {
    for (const base of basePaths) {
      if (feature === base) continue;
      if (feature.startsWith(`${base}/`) || base.startsWith(`${feature}/`)) {
        structural.push({ feature_path: feature, base_path: base });
      }
    }
  }
  structural.sort((left, right) =>
    left.feature_path.localeCompare(right.feature_path) ||
    left.base_path.localeCompare(right.base_path),
  );

  return freeze({
    exact_collision_paths: exact,
    structural_collisions: structural,
  });
}

export function decideBaseReconciliation(input) {
  const pr = parseOpenSameRepoPullRequest(input?.pull_request, input?.repository);
  const expectedHead =
    input?.expected_head === undefined || input?.expected_head === null ||
    String(input.expected_head).trim() === ""
      ? null
      : normalizeSha40(input.expected_head, "expected_head");
  const expectedBase =
    input?.expected_base === undefined || input?.expected_base === null ||
    String(input.expected_base).trim() === ""
      ? null
      : normalizeSha40(input.expected_base, "expected_base");
  const mergeBase = normalizeSha40(input?.merge_base, "merge_base");

  const ahead = Number(input?.ahead_by);
  const behind = Number(input?.behind_by);
  if (!Number.isSafeInteger(ahead) || ahead < 0) fail("ahead_by_invalid");
  if (!Number.isSafeInteger(behind) || behind < 0) fail("behind_by_invalid");

  const featurePaths = [...new Set((input?.feature_paths || []).map(normalizeRepositoryPath))].sort();
  const basePaths = [...new Set((input?.base_movement_paths || []).map(normalizeRepositoryPath))].sort();
  const collisions = classifyPathCollisions(featurePaths, basePaths);

  const reasons = [];
  if (expectedHead !== null && expectedHead !== pr.head_sha) reasons.push("head_sha_mismatch");
  if (expectedBase !== null && expectedBase !== pr.base_sha) reasons.push("base_sha_mismatch");

  if (ahead === 0) reasons.push("no_feature_commits");
  if (behind > 0 && mergeBase === pr.base_sha) reasons.push("behind_count_merge_base_contradiction");
  if (behind === 0 && mergeBase !== pr.base_sha) reasons.push("base_ancestry_contradiction");
  if (featurePaths.length === 0 && ahead > 0) reasons.push("feature_path_set_empty");
  if (basePaths.length === 0 && behind > 0) reasons.push("base_movement_path_set_empty");
  if (collisions.exact_collision_paths.length > 0) reasons.push("exact_path_collision");
  if (collisions.structural_collisions.length > 0) reasons.push("structural_path_collision");

  const uniqueReasons = [...new Set(reasons)].sort();
  let decision;
  let safe = false;
  let reconciliationNeeded = behind > 0;

  if (uniqueReasons.length > 0) {
    decision = "HOLD_BASE_RECONCILIATION_AUDIT";
  } else if (behind === 0) {
    decision = "CURRENT_WITH_BASE_NO_RECONCILIATION_NEEDED";
    safe = true;
    reconciliationNeeded = false;
  } else {
    decision = "SAFE_PATH_DISJOINT_RECONCILIATION_CANDIDATE";
    safe = true;
    reconciliationNeeded = true;
  }

  return freeze({
    marker: VOID_PR_BASE_RECONCILIATION_AUDIT_V1,
    version: 1,
    repository: normalizeRepository(input?.repository),
    pr_number: pr.pr_number,
    title: pr.title,
    url: pr.url,
    head_branch: pr.head_branch,
    head_sha: pr.head_sha,
    base_branch: pr.base_branch,
    base_sha: pr.base_sha,
    expected_head: expectedHead,
    expected_base: expectedBase,
    merge_base: mergeBase,
    ahead_by: ahead,
    behind_by: behind,
    feature_touched_paths: featurePaths,
    base_movement_touched_paths: basePaths,
    exact_collision_paths: collisions.exact_collision_paths,
    structural_collisions: collisions.structural_collisions,
    reconciliation_needed: reconciliationNeeded,
    safe_or_current: safe,
    safe_path_disjoint_candidate: safe && behind > 0,
    decision,
    reasons: uniqueReasons,
    authority: {
      github_pr_metadata_read: true,
      local_git_read: true,
      network_fetch: false,
      remote_git_mutation: false,
      working_tree_mutation: false,
      local_git_ref_update: false,
      branch_create: false,
      branch_update: false,
      branch_delete: false,
      commit: false,
      push: false,
      pull_request_change: false,
      workflow_rerun: false,
      runtime_mutation: false,
      credential_material_read: false,
      wallet_or_signer: false,
      transaction: false,
      funds_moved: false,
    },
  });
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env || process.env,
    encoding: options.encoding === "buffer" ? undefined : "utf8",
    maxBuffer: 128 * 1024 * 1024,
  });
  if (result.error) fail(`${options.label || command}_start_failed:${result.error.message}`);
  if (result.status !== 0) {
    const stderr = Buffer.isBuffer(result.stderr)
      ? result.stderr.toString("utf8")
      : String(result.stderr || result.stdout || "").trim();
    fail(`${options.label || command}_failed:${stderr}`);
  }
  return result.stdout;
}

function runGhPr(repository, prNumber) {
  const stdout = run(
    "gh",
    ["api", `repos/${repository}/pulls/${prNumber}`],
    { label: "github_pr_read" },
  );
  try {
    return JSON.parse(stdout);
  } catch (error) {
    fail(`github_pr_json_invalid:${error.message}`);
  }
}

function requireFullGitRepository(cwd) {
  const shallow = String(
    run("git", ["rev-parse", "--is-shallow-repository"], {
      cwd,
      label: "git_shallow_check",
    }),
  ).trim();
  if (shallow !== "false") fail("git_repository_must_be_full_history");

  const inside = String(
    run("git", ["rev-parse", "--is-inside-work-tree"], {
      cwd,
      label: "git_worktree_check",
    }),
  ).trim();
  if (inside !== "true") fail("git_worktree_required");
}

function verifyCommitAvailable(cwd, sha, label) {
  run("git", ["cat-file", "-e", `${sha}^{commit}`], {
    cwd,
    label: `${label}_object_check`,
  });
  const resolved = String(
    run("git", ["rev-parse", "--verify", `${sha}^{commit}`], {
      cwd,
      label: `${label}_object_verify`,
    }),
  ).trim();
  if (resolved !== sha) fail(`${label}_object_sha_mismatch`);
}

function singleMergeBase(cwd, baseRef, headRef) {
  const raw = String(
    run("git", ["merge-base", "--all", baseRef, headRef], {
      cwd,
      label: "git_merge_base",
    }),
  ).trim();
  const values = raw.split(/\r?\n/).filter(Boolean);
  if (values.length !== 1) fail("merge_base_ambiguous");
  return normalizeSha40(values[0], "merge_base");
}

function countAheadBehind(cwd, baseRef, headRef) {
  const raw = String(
    run("git", ["rev-list", "--left-right", "--count", `${baseRef}...${headRef}`], {
      cwd,
      label: "git_ahead_behind",
    }),
  ).trim();
  const match = /^([0-9]+)\s+([0-9]+)$/.exec(raw);
  if (!match) fail("git_ahead_behind_invalid");
  return {
    behind_by: Number(match[1]),
    ahead_by: Number(match[2]),
  };
}

function diffTouched(cwd, fromRef, toRef) {
  const stdout = run(
    "git",
    [
      "diff",
      "--name-status",
      "-z",
      "--find-renames",
      "--find-copies",
      fromRef,
      toRef,
    ],
    { cwd, label: "git_diff_name_status", encoding: "buffer" },
  );
  return parseNameStatusZ(stdout);
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help") return { help: true };
    if (!token.startsWith("--")) fail(`unexpected_argument:${token}`);
    const key = token.slice(2).replaceAll("-", "_");
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      fail(`option_value_required:${token}`);
    }
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
    "VOID PR base reconciliation audit v1",
    "",
    "Read-only GitHub-metadata / local-history audit for deciding whether an open same-repo PR",
    "is a path-disjoint candidate to inherit its current base branch.",
    "",
    "  node tools/void-pr-base-reconciliation-audit-v1.mjs \\",
    "    --repo 6ZoSo9/void-node \\",
    "    --pr-number 1234 \\",
    "    --expected-head <optional-40-hex-sha> \\",
    "    --expected-base <optional-40-hex-sha> \\",
    "    --output /tmp/void-pr-base-reconciliation-audit.json",
    "",
    "Exit 0: safe/current; exit 2: hold; exit 1: unavailable/malformed.",
  ].join("\n"));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }

  const repository = normalizeRepository(args.repo);
  const prNumber = Number(args.pr_number);
  if (!Number.isInteger(prNumber) || prNumber <= 0) fail("pr_number_invalid");
  const output = String(args.output || "").trim();
  if (!output) fail("output_required");

  const cwd = process.cwd();
  requireFullGitRepository(cwd);
  const rawPr = runGhPr(repository, prNumber);
  const pr = parseOpenSameRepoPullRequest(rawPr, repository);

  const expectedHead =
    args.expected_head === undefined ? null : normalizeSha40(args.expected_head, "expected_head");
  const expectedBase =
    args.expected_base === undefined ? null : normalizeSha40(args.expected_base, "expected_base");

  // GitHub metadata is rebound to exact commit objects already present in the
  // full-history checkout. Caller-pinned SHAs remain independent fail-closed
  // decision inputs.
  verifyCommitAvailable(cwd, pr.head_sha, "head");
  verifyCommitAvailable(cwd, pr.base_sha, "base");

  const mergeBase = singleMergeBase(cwd, pr.base_sha, pr.head_sha);
  const counts = countAheadBehind(cwd, pr.base_sha, pr.head_sha);
  const feature = diffTouched(cwd, mergeBase, pr.head_sha);
  const baseMovement = diffTouched(cwd, mergeBase, pr.base_sha);

  const audit = decideBaseReconciliation({
    repository,
    pull_request: rawPr,
    expected_head: expectedHead,
    expected_base: expectedBase,
    merge_base: mergeBase,
    ahead_by: counts.ahead_by,
    behind_by: counts.behind_by,
    feature_paths: feature.touched_paths,
    base_movement_paths: baseMovement.touched_paths,
  });

  const written = writePrivateJson(output, {
    ...audit,
    feature_change_record_count: feature.records.length,
    base_movement_change_record_count: baseMovement.records.length,
    generated_at_utc: new Date().toISOString(),
    mutation_performed: false,
  });

  console.log(`marker=${audit.marker}`);
  console.log(`repository=${audit.repository}`);
  console.log(`pr_number=${audit.pr_number}`);
  console.log(`head_sha=${audit.head_sha}`);
  console.log(`base_sha=${audit.base_sha}`);
  console.log(`merge_base=${audit.merge_base}`);
  console.log(`ahead_by=${audit.ahead_by}`);
  console.log(`behind_by=${audit.behind_by}`);
  console.log(`feature_touched_path_count=${audit.feature_touched_paths.length}`);
  console.log(`base_movement_touched_path_count=${audit.base_movement_touched_paths.length}`);
  console.log(`exact_collision_count=${audit.exact_collision_paths.length}`);
  console.log(`structural_collision_count=${audit.structural_collisions.length}`);
  console.log(`decision=${audit.decision}`);
  if (audit.reasons.length > 0) console.log(`reasons=${audit.reasons.join(",")}`);
  console.log(`output=${written}`);
  console.log("network_fetch=false");
  console.log("remote_git_mutation=false");
  console.log("working_tree_mutation=false");
  console.log("local_git_ref_update=false");
  console.log("VOID_PR_BASE_RECONCILIATION_AUDIT_V1_COMPLETE=true");

  if (audit.decision === "HOLD_BASE_RECONCILIATION_AUDIT") process.exitCode = 2;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`HOLD: ${error.message}`);
    process.exitCode = 1;
  });
}
