#!/usr/bin/env node
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

export const RETIREMENT_MARKER = "VOID_ACTIVE_LANE_RETIREMENT_V2";
export const POLICY_MARKER = "VOID_ACTIVE_LANE_RESERVATION_POLICY_V1";

function fail(message, exitCode = 1) {
  const error = new Error(message);
  error.exitCode = exitCode;
  throw error;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    env: options.env ?? process.env,
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error) {
    fail(`${command} failed to start: ${result.error.message}`);
  }
  if (options.check !== false && result.status !== 0) {
    const detail = (result.stderr || result.stdout || "").trim();
    fail(`${command} ${args.join(" ")} failed (${result.status}): ${detail}`);
  }
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function git(repoRoot, args, options = {}) {
  return run("git", ["-C", repoRoot, ...args], options);
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map((item) => canonicalize(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function sha256Value(value) {
  return createHash("sha256").update(value).digest("hex");
}

function receiptDigest(value) {
  const copy = { ...value };
  delete copy.receipt_sha256;
  return sha256Value(canonicalJson(copy));
}

function writeJsonAtomic(path, value) {
  const resolved = resolve(path);
  mkdirSync(dirname(resolved), { recursive: true, mode: 0o700 });
  const temp = `${resolved}.tmp-${process.pid}-${Date.now()}`;
  writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  chmodSync(temp, 0o600);
  renameSync(temp, resolved);
  chmodSync(resolved, 0o600);
}

function writeTextAtomic(path, value, mode = 0o600) {
  const resolved = resolve(path);
  mkdirSync(dirname(resolved), { recursive: true, mode: 0o700 });
  const temp = `${resolved}.tmp-${process.pid}-${Date.now()}`;
  writeFileSync(temp, value, { mode });
  chmodSync(temp, mode);
  renameSync(temp, resolved);
  chmodSync(resolved, mode);
}

function isInside(parent, candidate) {
  const rel = relative(resolve(parent), resolve(candidate));
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function validateAbsoluteOutside(path, repoRoot, worktreePath, label) {
  if (typeof path !== "string" || !path) fail(`${label} missing`);
  if (!isAbsolute(path)) fail(`${label} must be absolute`);
  const resolved = resolve(path);
  if (isInside(repoRoot, resolved)) {
    fail(`${label} must be outside the canonical repository`);
  }
  if (isInside(worktreePath, resolved)) {
    fail(`${label} must be outside the retiring worktree`);
  }
  return resolved;
}

export function confirmationToken(branch, head) {
  return `RETIRE_VOID_LANE:${branch}:${head}`;
}

export function parseArgs(argv) {
  if (argv.length === 0 || argv.includes("--help")) return { help: true };
  const command = argv[0];
  const values = {};
  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--require-github") {
      values.require_github = true;
      continue;
    }
    if (!token.startsWith("--")) fail(`unexpected argument: ${token}`);
    const key = token.slice(2).replaceAll("-", "_");
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      fail(`missing value for ${token}`);
    }
    values[key] = value;
    index += 1;
  }
  return { command, ...values };
}

function validateBranch(repoRoot, branch) {
  if (typeof branch !== "string" || !branch) fail("candidate branch missing");
  const check = git(repoRoot, ["check-ref-format", "--branch", branch], {
    check: false,
  });
  if (check.status !== 0) fail("candidate branch is not a valid Git branch");
  if (branch === "main") fail("candidate branch main is forbidden");
  return branch;
}

export function validateCandidate({
  repoRoot,
  branch,
  worktreePath,
  outputPath,
  archiveDir,
}) {
  if (typeof repoRoot !== "string" || !repoRoot) {
    fail("canonical repository path missing");
  }
  const resolvedRepo = realpathSync(repoRoot);
  validateBranch(resolvedRepo, branch);
  if (typeof worktreePath !== "string" || !worktreePath) {
    fail("candidate worktree path missing");
  }
  if (!isAbsolute(worktreePath)) {
    fail("candidate worktree path must be absolute");
  }
  const resolvedWorktree = resolve(worktreePath);
  if (isInside(resolvedRepo, resolvedWorktree)) {
    fail("candidate worktree must be outside the canonical repository");
  }
  const resolvedOutput = validateAbsoluteOutside(
    outputPath,
    resolvedRepo,
    resolvedWorktree,
    "output path",
  );
  const resolvedArchive = validateAbsoluteOutside(
    archiveDir,
    resolvedRepo,
    resolvedWorktree,
    "archive directory",
  );
  if (resolvedOutput === resolvedArchive) {
    fail("output path must not equal archive directory");
  }
  if (isInside(resolvedArchive, resolvedOutput)) {
    fail("output path must be outside the archive directory");
  }
  return {
    repo_root: resolvedRepo,
    branch,
    worktree: resolvedWorktree,
    output: resolvedOutput,
    archive_dir: resolvedArchive,
  };
}

export function parseWorktreePorcelain(raw) {
  const records = [];
  let current = null;
  for (const part of raw.split("\0")) {
    if (!part) continue;
    const separator = part.indexOf(" ");
    const key = separator === -1 ? part : part.slice(0, separator);
    const value = separator === -1 ? "" : part.slice(separator + 1);
    if (key === "worktree") {
      if (current) records.push(current);
      current = {
        path: value,
        detached: false,
        locked: false,
        prunable: false,
      };
      continue;
    }
    if (!current) fail(`malformed worktree porcelain near ${part}`);
    if (key === "HEAD") current.head = value;
    else if (key === "branch") {
      current.branch_ref = value;
      current.branch = value.replace(/^refs\/heads\//, "");
    } else if (key === "detached") current.detached = true;
    else if (key === "locked") current.locked = value || true;
    else if (key === "prunable") current.prunable = value || true;
  }
  if (current) records.push(current);
  return records;
}

function policyRepository(repoRoot) {
  const policyPath = resolve(
    repoRoot,
    "ops/coordination/active-lane-reservations-v1.json",
  );
  if (!existsSync(policyPath)) return null;
  const policy = JSON.parse(readFileSync(policyPath, "utf8"));
  if (policy.marker !== POLICY_MARKER || policy.version !== 1) {
    fail("reservation policy marker/version mismatch");
  }
  if (
    typeof policy.github_repository !== "string"
    || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(policy.github_repository)
  ) {
    fail("reservation policy github_repository mismatch");
  }
  return {
    path: policyPath,
    repository: policy.github_repository,
    exact: Array.isArray(policy.reserved_exact_branches)
      ? policy.reserved_exact_branches
      : [],
    families: Array.isArray(policy.reserved_families)
      ? policy.reserved_families
      : [],
    runtime_evidence_pattern:
      typeof policy.runtime_evidence_pattern === "string"
        ? policy.runtime_evidence_pattern
        : null,
  };
}

function reservationMatches(policy, branch, worktreePath) {
  if (!policy) return [];
  const matches = [];
  for (const item of policy.exact) {
    if (item && item.branch === branch) {
      matches.push({
        type: "exact",
        id: branch,
        reason: item.reason ?? "",
      });
    }
  }
  for (const item of policy.families) {
    if (
      item
      && typeof item.pattern === "string"
      && new RegExp(item.pattern, "i").test(branch)
    ) {
      matches.push({
        type: "family",
        id: item.id ?? "",
        label: item.label ?? "",
      });
    }
  }
  if (policy.runtime_evidence_pattern) {
    const runtimePattern = new RegExp(policy.runtime_evidence_pattern, "i");
    if (runtimePattern.test(branch) || runtimePattern.test(worktreePath)) {
      matches.push({ type: "runtime_evidence_pattern" });
    }
  }
  return matches;
}

function openPrsForBranch(repoRoot, branch, requireGithub) {
  const policy = policyRepository(repoRoot);
  if (!policy) {
    if (requireGithub) fail("reservation policy GitHub repository is unavailable");
    return [];
  }
  const result = run(
    "gh",
    [
      "pr",
      "list",
      "--repo",
      policy.repository,
      "--state",
      "open",
      "--head",
      branch,
      "--limit",
      "100",
      "--json",
      "number,state,headRefName,headRefOid,title,url",
    ],
    { check: false },
  );
  if (result.status !== 0) {
    if (requireGithub) {
      fail(
        `GitHub PR metadata unavailable: ${
          (result.stderr || result.stdout).trim()
        }`,
      );
    }
    return [];
  }
  const value = JSON.parse(result.stdout);
  if (!Array.isArray(value)) fail("malformed GitHub open PR response");
  return value;
}


function mergedPrsForBranch(repoRoot, branch, requireGithub) {
  const policy = policyRepository(repoRoot);
  if (!policy) {
    if (requireGithub) fail("reservation policy GitHub repository is unavailable");
    return [];
  }
  const result = run(
    "gh",
    [
      "pr",
      "list",
      "--repo",
      policy.repository,
      "--state",
      "merged",
      "--head",
      branch,
      "--limit",
      "100",
      "--json",
      "number,state,baseRefName,headRefName,headRefOid,mergeCommit,title,url,mergedAt",
    ],
    { check: false },
  );
  if (result.status !== 0) {
    if (requireGithub) {
      fail(
        `GitHub merged PR metadata unavailable: ${
          (result.stderr || result.stdout).trim()
        }`,
      );
    }
    return [];
  }
  const value = JSON.parse(result.stdout);
  if (!Array.isArray(value)) fail("malformed GitHub merged PR response");
  return value;
}

function normalizeMergedPr(item) {
  const mergeCommitOid =
    item
    && item.mergeCommit
    && typeof item.mergeCommit.oid === "string"
      ? item.mergeCommit.oid
      : null;
  return {
    number: Number.isInteger(item?.number) ? item.number : null,
    state: typeof item?.state === "string" ? item.state : null,
    base_ref_name:
      typeof item?.baseRefName === "string" ? item.baseRefName : null,
    head_ref_name:
      typeof item?.headRefName === "string" ? item.headRefName : null,
    head_ref_oid:
      typeof item?.headRefOid === "string" ? item.headRefOid : null,
    merge_commit_oid: mergeCommitOid,
    title: typeof item?.title === "string" ? item.title : null,
    url: typeof item?.url === "string" ? item.url : null,
    merged_at: typeof item?.mergedAt === "string" ? item.mergedAt : null,
  };
}

export function resolveRetirementLineage({
  repoRoot,
  branch,
  branchHead,
  liveMain,
  liveMainObjectPresent,
  headAncestorOfLiveMain,
  requireGithub,
  allowObjectFetch,
  mergedPrCheck = mergedPrsForBranch,
}) {
  if (branchHead && liveMainObjectPresent && headAncestorOfLiveMain) {
    return {
      kind: "direct_commit_ancestry",
      verified: true,
      candidate_head: branchHead,
      live_origin_main: liveMain,
      pull_request: null,
      merge_commit_oid: null,
      exact_match_count: 0,
      candidates: [],
      reason: null,
    };
  }

  if (!branchHead || !liveMainObjectPresent) {
    return {
      kind: "unverified",
      verified: false,
      candidate_head: branchHead,
      live_origin_main: liveMain,
      pull_request: null,
      merge_commit_oid: null,
      exact_match_count: 0,
      candidates: [],
      reason: null,
    };
  }

  if (!requireGithub) {
    return {
      kind: "unverified",
      verified: false,
      candidate_head: branchHead,
      live_origin_main: liveMain,
      pull_request: null,
      merge_commit_oid: null,
      exact_match_count: 0,
      candidates: [],
      reason: "squash_lineage_requires_github_metadata",
    };
  }

  const raw = mergedPrCheck(repoRoot, branch, requireGithub);
  if (!Array.isArray(raw)) fail("malformed merged PR lineage response");
  const candidates = raw.map((item) => normalizeMergedPr(item));
  const identityMatches = candidates.filter(
    (item) =>
      item.state === "MERGED"
      && item.base_ref_name === "main"
      && item.head_ref_name === branch
      && item.head_ref_oid === branchHead,
  );

  const evaluated = identityMatches.map((item) => {
    const oid = item.merge_commit_oid;
    const validOid = typeof oid === "string" && /^[0-9a-f]{40}$/.test(oid);
    let objectPresent = false;
    let ancestorOfLiveMain = false;
    if (validOid) {
      objectPresent = objectExists(repoRoot, oid);
      if (!objectPresent && allowObjectFetch) {
        fetchObjectNeutral(repoRoot, oid);
        objectPresent = objectExists(repoRoot, oid);
      }
      if (objectPresent) {
        ancestorOfLiveMain = git(
          repoRoot,
          ["merge-base", "--is-ancestor", oid, liveMain],
          { check: false },
        ).status === 0;
      }
    }
    return {
      ...item,
      merge_commit_oid_valid: validOid,
      merge_commit_object_present: objectPresent,
      merge_commit_ancestor_of_live_origin_main: ancestorOfLiveMain,
    };
  });

  if (identityMatches.length === 0) {
    return {
      kind: "unverified",
      verified: false,
      candidate_head: branchHead,
      live_origin_main: liveMain,
      pull_request: null,
      merge_commit_oid: null,
      exact_match_count: 0,
      candidates: evaluated,
      reason: "verified_squash_lineage_not_found",
    };
  }
  if (identityMatches.length !== 1) {
    return {
      kind: "unverified",
      verified: false,
      candidate_head: branchHead,
      live_origin_main: liveMain,
      pull_request: null,
      merge_commit_oid: null,
      exact_match_count: identityMatches.length,
      candidates: evaluated,
      reason: "verified_squash_lineage_ambiguous",
    };
  }

  const match = evaluated[0];
  let reason = null;
  if (!match.merge_commit_oid_valid) {
    reason = "verified_squash_merge_commit_invalid";
  } else if (!match.merge_commit_object_present) {
    reason = "verified_squash_merge_commit_object_unavailable";
  } else if (!match.merge_commit_ancestor_of_live_origin_main) {
    reason = "verified_squash_merge_commit_not_ancestor_of_live_origin_main";
  }

  if (reason) {
    return {
      kind: "unverified",
      verified: false,
      candidate_head: branchHead,
      live_origin_main: liveMain,
      pull_request: match,
      merge_commit_oid: match.merge_commit_oid,
      exact_match_count: 1,
      candidates: evaluated,
      reason,
    };
  }

  return {
    kind: "verified_squash_merged_pull_request",
    verified: true,
    candidate_head: branchHead,
    live_origin_main: liveMain,
    pull_request: match,
    merge_commit_oid: match.merge_commit_oid,
    exact_match_count: 1,
    candidates: evaluated,
    reason: null,
  };
}

function liveRemoteBranch(repoRoot, branch) {
  const result = git(
    repoRoot,
    ["ls-remote", "--heads", "origin", `refs/heads/${branch}`],
    { check: false },
  );
  if (result.status !== 0) {
    fail(
      `unable to inspect live origin branch: ${
        (result.stderr || result.stdout).trim()
      }`,
    );
  }
  const lines = result.stdout.split("\n").filter(Boolean);
  if (lines.length === 0) return null;
  if (lines.length !== 1) {
    fail(`unexpected live origin branch record count: ${lines.length}`);
  }
  const [sha, ref] = lines[0].split("\t");
  if (
    !/^[0-9a-f]{40}$/.test(sha)
    || ref !== `refs/heads/${branch}`
  ) {
    fail("malformed live origin branch record");
  }
  return sha;
}

function liveOriginMain(repoRoot) {
  const result = git(
    repoRoot,
    ["ls-remote", "--heads", "origin", "refs/heads/main"],
    { check: false },
  );
  if (result.status !== 0) {
    fail(
      `unable to inspect live origin/main: ${
        (result.stderr || result.stdout).trim()
      }`,
    );
  }
  const lines = result.stdout.split("\n").filter(Boolean);
  if (lines.length !== 1) {
    fail(`live origin/main record count mismatch: ${lines.length}`);
  }
  const [sha, ref] = lines[0].split("\t");
  if (!/^[0-9a-f]{40}$/.test(sha) || ref !== "refs/heads/main") {
    fail("malformed live origin/main record");
  }
  return sha;
}

function objectExists(repoRoot, oid) {
  return git(repoRoot, ["cat-file", "-e", `${oid}^{commit}`], {
    check: false,
  }).status === 0;
}

function fetchObjectNeutral(repoRoot, oid) {
  git(
    repoRoot,
    [
      "fetch",
      "--no-tags",
      "--no-write-fetch-head",
      "origin",
      oid,
    ],
  );
}

function processReferencesForPath(targetPath) {
  const references = [];
  let entries = [];
  try {
    entries = readdirSync("/proc", { withFileTypes: true });
  } catch {
    return references;
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || !/^\d+$/.test(entry.name)) continue;
    const pid = Number(entry.name);
    if (pid === process.pid) continue;
    const root = `/proc/${entry.name}`;
    const reasons = new Set();
    let cwd = "";
    let argv = [];
    const fd_hits = [];

    try {
      cwd = readlinkSync(`${root}/cwd`);
      if (cwd === targetPath || cwd.startsWith(`${targetPath}/`)) {
        reasons.add("cwd");
      }
    } catch {
      // Process exited or link is unreadable.
    }

    try {
      argv = readFileSync(`${root}/cmdline`)
        .toString("utf8")
        .split("\0")
        .filter(Boolean);
      if (
        argv.some(
          (item) => item === targetPath || item.startsWith(`${targetPath}/`),
        )
      ) {
        reasons.add("argv");
      }
    } catch {
      // Process exited or cmdline is unreadable.
    }

    try {
      for (const fd of readdirSync(`${root}/fd`)) {
        try {
          const target = readlinkSync(`${root}/fd/${fd}`);
          if (
            target === targetPath
            || target.startsWith(`${targetPath}/`)
          ) {
            fd_hits.push(`${fd}:${target}`);
            if (fd_hits.length >= 8) break;
          }
        } catch {
          // Descriptor disappeared or is unreadable.
        }
      }
      if (fd_hits.length > 0) reasons.add("fd");
    } catch {
      // Process exited or descriptor directory is unreadable.
    }

    if (reasons.size > 0) {
      references.push({
        pid,
        reasons: [...reasons].sort(),
        cwd,
        argv,
        fd_hits,
      });
    }
  }

  return references.sort((a, b) => a.pid - b.pid);
}

function canonicalMainState(repoRoot) {
  return {
    branch: git(repoRoot, ["branch", "--show-current"]).stdout.trim(),
    head: git(repoRoot, ["rev-parse", "HEAD"]).stdout.trim(),
    status: git(
      repoRoot,
      ["status", "--porcelain=v1", "--untracked-files=all"],
    ).stdout,
  };
}

function captureCandidate({
  repoRoot,
  branch,
  worktreePath,
  requireGithub,
  allowObjectFetch,
  openPrCheck = openPrsForBranch,
  mergedPrCheck = mergedPrsForBranch,
}) {
  const reasons = [];
  const canonicalMain = canonicalMainState(repoRoot);
  if (canonicalMain.branch !== "main") {
    reasons.push("canonical_main_not_checked_out");
  }
  if (canonicalMain.status) reasons.push("canonical_main_dirty");

  const worktrees = parseWorktreePorcelain(
    git(repoRoot, ["worktree", "list", "--porcelain", "-z"]).stdout,
  );
  const matches = worktrees.filter(
    (item) => resolve(item.path) === resolve(worktreePath),
  );
  if (matches.length !== 1) {
    reasons.push(`worktree_registration_count:${matches.length}`);
  }
  const registration = matches[0] ?? null;

  let resolvedWorktree = resolve(worktreePath);
  let worktreeExists = existsSync(resolvedWorktree);
  let worktreeIsSymlink = false;
  if (worktreeExists) {
    worktreeIsSymlink = lstatSync(resolvedWorktree).isSymbolicLink();
    if (worktreeIsSymlink) reasons.push("worktree_path_is_symlink");
    try {
      resolvedWorktree = realpathSync(resolvedWorktree);
    } catch {
      reasons.push("worktree_realpath_unavailable");
    }
  } else {
    reasons.push("worktree_path_missing");
  }

  let branchHead = null;
  const localRef = `refs/heads/${branch}`;
  const localBranch = git(
    repoRoot,
    ["rev-parse", "--verify", localRef],
    { check: false },
  );
  if (localBranch.status !== 0) reasons.push("local_branch_missing");
  else branchHead = localBranch.stdout.trim();

  let worktreeBranch = null;
  let worktreeHead = null;
  let worktreeStatus = null;
  if (worktreeExists) {
    worktreeBranch = git(
      resolvedWorktree,
      ["branch", "--show-current"],
      { check: false },
    ).stdout.trim();
    worktreeHead = git(
      resolvedWorktree,
      ["rev-parse", "HEAD"],
      { check: false },
    ).stdout.trim();
    worktreeStatus = git(
      resolvedWorktree,
      ["status", "--porcelain=v1", "--untracked-files=all"],
      { check: false },
    ).stdout;
    if (worktreeBranch !== branch) reasons.push("worktree_branch_mismatch");
    if (worktreeStatus) reasons.push("worktree_dirty");
  }

  if (registration) {
    if (registration.detached) reasons.push("worktree_detached");
    if (registration.locked) reasons.push("worktree_locked");
    if (registration.prunable) reasons.push("worktree_prunable");
    if (registration.branch !== branch) {
      reasons.push("registered_branch_mismatch");
    }
    if (branchHead && registration.head !== branchHead) {
      reasons.push("registered_head_mismatch");
    }
  }

  if (branchHead && worktreeHead && branchHead !== worktreeHead) {
    reasons.push("local_branch_worktree_head_mismatch");
  }

  const liveMain = liveOriginMain(repoRoot);
  let liveMainObjectPresent = objectExists(repoRoot, liveMain);
  if (!liveMainObjectPresent && allowObjectFetch) {
    fetchObjectNeutral(repoRoot, liveMain);
    liveMainObjectPresent = objectExists(repoRoot, liveMain);
  }
  if (!liveMainObjectPresent) reasons.push("live_origin_main_object_unavailable");

  let headAncestorOfLiveMain = false;
  if (branchHead && liveMainObjectPresent) {
    headAncestorOfLiveMain = git(
      repoRoot,
      ["merge-base", "--is-ancestor", branchHead, liveMain],
      { check: false },
    ).status === 0;
  }

  const lineage = resolveRetirementLineage({
    repoRoot,
    branch,
    branchHead,
    liveMain,
    liveMainObjectPresent,
    headAncestorOfLiveMain,
    requireGithub,
    allowObjectFetch,
    mergedPrCheck,
  });
  if (!lineage.verified && lineage.reason) reasons.push(lineage.reason);

  const openPrs = openPrCheck(repoRoot, branch, requireGithub);
  if (!Array.isArray(openPrs)) fail("malformed open PR check response");
  if (openPrs.length > 0) {
    reasons.push(`open_pr_exists:${openPrs.map((item) => `#${item.number}`).join(",")}`);
  }

  const processReferences = worktreeExists
    ? processReferencesForPath(resolvedWorktree)
    : [];
  if (processReferences.length > 0) {
    reasons.push("process_references_worktree");
  }

  const remoteBranchOid = liveRemoteBranch(repoRoot, branch);
  if (remoteBranchOid && branchHead && remoteBranchOid !== branchHead) {
    reasons.push("remote_branch_head_mismatch");
  }

  const policy = policyRepository(repoRoot);
  const reservations = reservationMatches(policy, branch, resolvedWorktree);

  return {
    marker: RETIREMENT_MARKER,
    version: 2,
    generated_at: new Date().toISOString(),
    candidate: {
      branch,
      worktree: resolvedWorktree,
      local_branch_head: branchHead,
      worktree_head: worktreeHead,
      worktree_branch: worktreeBranch,
      worktree_clean: worktreeStatus === "",
      worktree_exists: worktreeExists,
      worktree_is_symlink: worktreeIsSymlink,
      registration,
      remote_branch_oid: remoteBranchOid,
      open_prs: openPrs,
      process_references: processReferences,
      reservation_matches: reservations,
      live_origin_main: liveMain,
      live_origin_main_object_present: liveMainObjectPresent,
      head_ancestor_of_live_origin_main: headAncestorOfLiveMain,
      retirement_lineage: lineage,
    },
    canonical_main: canonicalMain,
    ready: reasons.length === 0,
    reasons: [...new Set(reasons)].sort(),
  };
}

function baseReceipt({
  command,
  validated,
  requireGithub,
  inspection,
}) {
  return {
    marker: RETIREMENT_MARKER,
    version: 2,
    command,
    generated_at: new Date().toISOString(),
    repo_root: validated.repo_root,
    branch: validated.branch,
    worktree: validated.worktree,
    output: validated.output,
    archive_dir: validated.archive_dir,
    require_github: Boolean(requireGithub),
    ready: inspection.ready,
    reasons: inspection.reasons,
    inspection,
  };
}

export function planRetirement({
  repoRoot,
  branch,
  worktreePath,
  outputPath,
  archiveDir,
  requireGithub = false,
  openPrCheck = openPrsForBranch,
  mergedPrCheck = mergedPrsForBranch,
}) {
  const validated = validateCandidate({
    repoRoot,
    branch,
    worktreePath,
    outputPath,
    archiveDir,
  });
  const inspection = captureCandidate({
    repoRoot: validated.repo_root,
    branch: validated.branch,
    worktreePath: validated.worktree,
    requireGithub,
    allowObjectFetch: false,
    openPrCheck,
    mergedPrCheck,
  });
  const reasons = [...inspection.reasons];
  if (existsSync(validated.archive_dir)) reasons.push("archive_directory_exists");
  const receipt = {
    ...baseReceipt({
      command: "plan",
      validated,
      requireGithub,
      inspection,
    }),
    ready: reasons.length === 0,
    reasons: [...new Set(reasons)].sort(),
    confirmation: inspection.candidate.local_branch_head
      ? confirmationToken(
          validated.branch,
          inspection.candidate.local_branch_head,
        )
      : null,
    mutation_performed: false,
  };
  receipt.receipt_sha256 = receiptDigest(receipt);
  writeJsonAtomic(validated.output, receipt);
  return receipt;
}

function createBundle(repoRoot, branch, head, archiveDir) {
  mkdirSync(archiveDir, { recursive: false, mode: 0o700 });
  chmodSync(archiveDir, 0o700);
  const bundlePath = resolve(archiveDir, "active-lane-source-v2.bundle");
  git(repoRoot, [
    "bundle",
    "create",
    bundlePath,
    `refs/heads/${branch}`,
  ]);
  chmodSync(bundlePath, 0o600);

  const verify = git(repoRoot, ["bundle", "verify", bundlePath]);
  const heads = git(repoRoot, ["bundle", "list-heads", bundlePath])
    .stdout
    .split("\n")
    .filter(Boolean);
  const expected = `${head} refs/heads/${branch}`;
  if (!heads.includes(expected)) {
    fail(`archive bundle is missing expected source ref: ${expected}`);
  }
  return {
    path: bundlePath,
    sha256: sha256Value(readFileSync(bundlePath)),
    verify_stdout: verify.stdout.trim(),
    verify_stderr: verify.stderr.trim(),
    heads,
  };
}

function checksumArtifacts(archiveDir, artifacts) {
  const lines = artifacts.map((path) => {
    const bytes = readFileSync(path);
    return `${sha256Value(bytes)}  ${path.slice(archiveDir.length + 1)}`;
  });
  const checksumPath = resolve(archiveDir, "SHA256SUMS.txt");
  writeTextAtomic(checksumPath, `${lines.join("\n")}\n`, 0o600);
  return {
    path: checksumPath,
    sha256: sha256Value(readFileSync(checksumPath)),
  };
}

export function applyRetirement({
  repoRoot,
  branch,
  worktreePath,
  outputPath,
  archiveDir,
  confirmation,
  requireGithub = false,
  hooks = {},
  openPrCheck = openPrsForBranch,
  mergedPrCheck = mergedPrsForBranch,
}) {
  const validated = validateCandidate({
    repoRoot,
    branch,
    worktreePath,
    outputPath,
    archiveDir,
  });
  let stage = "preflight";
  let archive = null;
  const completed = {
    archive_created: false,
    remote_branch_deleted: false,
    remote_branch_delete_performed: false,
    worktree_removed: false,
    local_branch_deleted: false,
  };
  let candidateHead = null;
  let canonicalHeadBefore = null;
  let remoteBranchBefore = null;
  let retirementLineage = null;

  try {
    if (existsSync(validated.archive_dir)) {
      fail("archive directory already exists", 2);
    }
    const inspection = captureCandidate({
      repoRoot: validated.repo_root,
      branch: validated.branch,
      worktreePath: validated.worktree,
      requireGithub,
      allowObjectFetch: true,
      openPrCheck,
      mergedPrCheck,
    });
    if (!inspection.ready) {
      const error = new Error(
        `retirement candidate is not ready: ${inspection.reasons.join(", ")}`,
      );
      error.exitCode = 2;
      throw error;
    }

    candidateHead = inspection.candidate.local_branch_head;
    retirementLineage = inspection.candidate.retirement_lineage;
    const expectedConfirmation = confirmationToken(
      validated.branch,
      candidateHead,
    );
    if (confirmation !== expectedConfirmation) {
      fail(
        `explicit confirmation required: ${expectedConfirmation}`,
        2,
      );
    }

    canonicalHeadBefore = inspection.canonical_main.head;
    remoteBranchBefore = inspection.candidate.remote_branch_oid;

    archive = createBundle(
      validated.repo_root,
      validated.branch,
      candidateHead,
      validated.archive_dir,
    );
    completed.archive_created = true;
    stage = "archive_created";

    const preflightPath = resolve(
      validated.archive_dir,
      "retirement-preflight-v2.json",
    );
    const preflight = {
      ...baseReceipt({
        command: "apply",
        validated,
        requireGithub,
        inspection,
      }),
      confirmation_expected: expectedConfirmation,
      archive,
      completed: { ...completed },
      mutation_performed: false,
    };
    preflight.receipt_sha256 = receiptDigest(preflight);
    writeJsonAtomic(preflightPath, preflight);

    if (hooks.afterArchive) hooks.afterArchive({ inspection, archive });

    const immediate = captureCandidate({
      repoRoot: validated.repo_root,
      branch: validated.branch,
      worktreePath: validated.worktree,
      requireGithub,
      allowObjectFetch: true,
      openPrCheck,
      mergedPrCheck,
    });
    if (
      !immediate.ready
      || immediate.candidate.local_branch_head !== candidateHead
      || immediate.candidate.remote_branch_oid !== remoteBranchBefore
      || immediate.canonical_main.head !== canonicalHeadBefore
      || canonicalJson(immediate.candidate.retirement_lineage)
        !== canonicalJson(retirementLineage)
    ) {
      fail("candidate state changed immediately before retirement", 2);
    }

    if (remoteBranchBefore) {
      stage = "remote_branch_delete";
      git(validated.repo_root, [
        "push",
        "origin",
        "--delete",
        validated.branch,
      ]);
      if (liveRemoteBranch(validated.repo_root, validated.branch)) {
        fail("remote branch remains after deletion");
      }
      completed.remote_branch_deleted = true;
      completed.remote_branch_delete_performed = true;
    } else {
      completed.remote_branch_deleted = true;
    }

    if (hooks.afterRemoteDelete) {
      hooks.afterRemoteDelete({ inspection: immediate, archive });
    }

    stage = "worktree_remove";
    git(validated.repo_root, [
      "worktree",
      "remove",
      validated.worktree,
    ]);
    git(validated.repo_root, ["worktree", "prune", "--expire", "now"]);
    if (existsSync(validated.worktree)) {
      fail("worktree path remains after removal");
    }
    const registeredAfter = parseWorktreePorcelain(
      git(validated.repo_root, ["worktree", "list", "--porcelain", "-z"]).stdout,
    );
    if (
      registeredAfter.some(
        (item) => resolve(item.path) === resolve(validated.worktree),
      )
    ) {
      fail("worktree remains registered after removal");
    }
    completed.worktree_removed = true;

    if (hooks.afterWorktreeRemove) {
      hooks.afterWorktreeRemove({ inspection: immediate, archive });
    }

    stage = "local_branch_delete";
    const localHeadBeforeDelete = git(
      validated.repo_root,
      ["rev-parse", "--verify", `refs/heads/${validated.branch}`],
    ).stdout.trim();
    if (localHeadBeforeDelete !== candidateHead) {
      fail("local branch moved before deletion");
    }
    git(validated.repo_root, ["branch", "-D", validated.branch]);
    if (
      git(
        validated.repo_root,
        ["show-ref", "--verify", "--quiet", `refs/heads/${validated.branch}`],
        { check: false },
      ).status === 0
    ) {
      fail("local branch remains after deletion");
    }
    completed.local_branch_deleted = true;

    stage = "post_verify";
    const canonicalAfter = canonicalMainState(validated.repo_root);
    if (
      canonicalAfter.branch !== "main"
      || canonicalAfter.head !== canonicalHeadBefore
      || canonicalAfter.status
    ) {
      fail("canonical main changed during retirement");
    }
    if (liveRemoteBranch(validated.repo_root, validated.branch)) {
      fail("remote branch reappeared after retirement");
    }

    const finalReceipt = {
      marker: RETIREMENT_MARKER,
      version: 2,
      command: "apply",
      generated_at: new Date().toISOString(),
      repo_root: validated.repo_root,
      branch: validated.branch,
      worktree: validated.worktree,
      output: validated.output,
      archive_dir: validated.archive_dir,
      require_github: Boolean(requireGithub),
      candidate_head: candidateHead,
      live_origin_main: immediate.candidate.live_origin_main,
      head_ancestor_of_live_origin_main:
        immediate.candidate.head_ancestor_of_live_origin_main,
      retirement_lineage: immediate.candidate.retirement_lineage,
      lineage_kind: immediate.candidate.retirement_lineage.kind,
      lineage_merge_commit_oid:
        immediate.candidate.retirement_lineage.merge_commit_oid,
      lineage_pull_request_number:
        immediate.candidate.retirement_lineage.pull_request?.number ?? null,
      remote_branch_oid_before: remoteBranchBefore,
      canonical_main_head_before: canonicalHeadBefore,
      canonical_main_head_after: canonicalAfter.head,
      archive,
      completed,
      retired: true,
      mutation_performed: true,
      service_or_process_changed: false,
      listener_or_tor_configuration_changed: false,
      deployment_or_money_mutation: false,
    };
    finalReceipt.receipt_sha256 = receiptDigest(finalReceipt);

    const archiveReceipt = resolve(
      validated.archive_dir,
      "retirement-receipt-v2.json",
    );
    const checksums = checksumArtifacts(validated.archive_dir, [
      archive.path,
      preflightPath,
    ]);
    finalReceipt.checksums = checksums;
    finalReceipt.receipt_sha256 = receiptDigest(finalReceipt);
    writeJsonAtomic(archiveReceipt, finalReceipt);
    writeJsonAtomic(validated.output, finalReceipt);

    return finalReceipt;
  } catch (error) {
    const failure = {
      marker: RETIREMENT_MARKER,
      version: 2,
      command: "apply",
      generated_at: new Date().toISOString(),
      repo_root: validated.repo_root,
      branch: validated.branch,
      worktree: validated.worktree,
      output: validated.output,
      archive_dir: validated.archive_dir,
      require_github: Boolean(requireGithub),
      candidate_head: candidateHead,
      retirement_lineage: retirementLineage,
      remote_branch_oid_before: remoteBranchBefore,
      canonical_main_head_before: canonicalHeadBefore,
      stage,
      completed,
      retired: false,
      mutation_performed:
        completed.remote_branch_delete_performed
        || completed.worktree_removed
        || completed.local_branch_deleted,
      error: error instanceof Error ? error.message : String(error),
      service_or_process_changed: false,
      listener_or_tor_configuration_changed: false,
      deployment_or_money_mutation: false,
    };
    failure.receipt_sha256 = receiptDigest(failure);
    try {
      writeJsonAtomic(validated.output, failure);
      if (existsSync(validated.archive_dir)) {
        writeJsonAtomic(
          resolve(validated.archive_dir, "retirement-failure-receipt-v2.json"),
          failure,
        );
      }
    } catch {
      // Preserve the original failure.
    }
    throw error;
  }
}

function helpText() {
  return `VOID Active Lane Retirement V2

Plan (read-only):
  node tools/void-active-lane-retirement-v2.mjs plan \\
    --repo-root /absolute/path/to/void-node \\
    --branch feat/example-v1 \\
    --worktree /absolute/path/to/worktree \\
    --archive-dir /absolute/path/to/new/archive-dir \\
    --output /absolute/path/to/plan.json \\
    --require-github

Apply:
  node tools/void-active-lane-retirement-v2.mjs apply \\
    --repo-root /absolute/path/to/void-node \\
    --branch feat/example-v1 \\
    --worktree /absolute/path/to/worktree \\
    --archive-dir /absolute/path/to/new/archive-dir \\
    --output /absolute/path/to/receipt.json \\
    --confirm RETIRE_VOID_LANE:feat/example-v1:<40-hex-head> \\
    --require-github
`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(helpText());
    return 0;
  }

  if (!["plan", "apply"].includes(args.command)) {
    fail(`unsupported command: ${args.command}`);
  }

  try {
    if (args.command === "plan") {
      const receipt = planRetirement({
        repoRoot: args.repo_root,
        branch: args.branch,
        worktreePath: args.worktree,
        outputPath: args.output,
        archiveDir: args.archive_dir,
        requireGithub: Boolean(args.require_github),
      });
      console.log(`marker=${receipt.marker}`);
      console.log("command=plan");
      console.log(`branch=${receipt.branch}`);
      console.log(`worktree=${receipt.worktree}`);
      console.log(`candidate_head=${receipt.inspection.candidate.local_branch_head ?? ""}`);
      console.log(`ready=${receipt.ready}`);
      console.log(`reasons=${JSON.stringify(receipt.reasons)}`);
      console.log(`confirmation=${receipt.confirmation ?? ""}`);
      console.log(`output=${receipt.output}`);
      console.log("mutation_performed=false");
      console.log("VOID_ACTIVE_LANE_RETIREMENT_V2_COMPLETE=true");
      return receipt.ready ? 0 : 2;
    }

    const receipt = applyRetirement({
      repoRoot: args.repo_root,
      branch: args.branch,
      worktreePath: args.worktree,
      outputPath: args.output,
      archiveDir: args.archive_dir,
      confirmation: args.confirm,
      requireGithub: Boolean(args.require_github),
    });
    console.log(`marker=${receipt.marker}`);
    console.log("command=apply");
    console.log(`branch=${receipt.branch}`);
    console.log(`candidate_head=${receipt.candidate_head}`);
    console.log(`archive_dir=${receipt.archive_dir}`);
    console.log(`output=${receipt.output}`);
    console.log(`retired=${receipt.retired}`);
    console.log("mutation_performed=true");
    console.log("VOID_ACTIVE_LANE_RETIREMENT_V2_COMPLETE=true");
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`HOLD: ${message}`);
    return Number.isInteger(error?.exitCode) ? error.exitCode : 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = main();
}
