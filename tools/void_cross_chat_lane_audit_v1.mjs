#!/usr/bin/env node
/**
 * VOID Cross-Chat Lane Audit v1
 *
 * Read-only collision audit across a shared multi-worktree repository and an
 * independently cloned lane repository.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const GREEN = "VOID_CROSS_CHAT_LANE_AUDIT_V1_EXACT_GREEN";
const HOLD = "VOID_CROSS_CHAT_LANE_AUDIT_V1_HOLD";
const COMMANDS = new Set(["git", "gh", "npm", "npx", "tsx", "node", "python", "python3"]);
const DEFAULT_SAFE_UNITS = [
  "void-node-live.service",
  "void-node-nimo.service",
  "void-node-alienware.service",
  "void-follower-once.service",
];
const MIN_RUNTIME_AGE_SECONDS = 120;

function stop(message, details = {}) {
  const error = new Error(message);
  error.details = details;
  throw error;
}

function execute(command, args, { cwd, allowFailure = false, timeout = 60000 } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    timeout,
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error) stop(`cannot execute ${command}`, { error: String(result.error) });
  if (!allowFailure && result.status !== 0) {
    stop(`command failed: ${command} ${args.join(" ")}`, {
      status: result.status,
      stdout: (result.stdout ?? "").trim(),
      stderr: (result.stderr ?? "").trim(),
    });
  }
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function git(repo, args, allowFailure = false) {
  return execute("git", ["-C", repo, ...args], { allowFailure }).stdout.trim();
}

function normalizeRepoPath(value) {
  const normalized = value.replaceAll("\\", "/").replace(/^\.\/+/, "");
  if (!normalized || normalized.startsWith("/") || normalized === ".." || normalized.startsWith("../")) {
    stop(`invalid repository-relative path: ${value}`);
  }
  return normalized;
}

function parseArgs(argv) {
  const options = {
    sharedRepo: "",
    laneRepo: "",
    laneBranch: "",
    reservedPaths: [],
    allowRuntimeScripts: [],
    safeUnits: [...DEFAULT_SAFE_UNITS],
    fixture: "",
    scans: 3,
    delayMs: 400,
    ignorePids: [process.pid],
  };

  const next = (index, flag) => {
    if (index + 1 >= argv.length) stop(`missing value for ${flag}`);
    return argv[index + 1];
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    switch (value) {
      case "--shared-repo":
        options.sharedRepo = next(index, value);
        index += 1;
        break;
      case "--lane-repo":
        options.laneRepo = next(index, value);
        index += 1;
        break;
      case "--lane-branch":
        options.laneBranch = next(index, value);
        index += 1;
        break;
      case "--reserve":
        options.reservedPaths.push(next(index, value));
        index += 1;
        break;
      case "--allow-runtime-script":
        options.allowRuntimeScripts.push(next(index, value));
        index += 1;
        break;
      case "--safe-service-unit":
        options.safeUnits.push(next(index, value));
        index += 1;
        break;
      case "--fixture":
        options.fixture = next(index, value);
        index += 1;
        break;
      case "--scans":
        options.scans = Number.parseInt(next(index, value), 10);
        index += 1;
        break;
      case "--delay-ms":
        options.delayMs = Number.parseInt(next(index, value), 10);
        index += 1;
        break;
      case "--ignore-pid":
        options.ignorePids.push(Number.parseInt(next(index, value), 10));
        index += 1;
        break;
      case "--help":
        console.log(`Usage:
  node tools/void_cross_chat_lane_audit_v1.mjs \
    --shared-repo ~/dev/void-node \
    --lane-repo ~/dev/void-node-cross-chat-lane-audit-standalone-v1 \
    --lane-branch parallel/cross-chat-lane-audit-standalone-v1 \
    --reserve tools/void_cross_chat_lane_audit_v1.mjs
`);
        process.exit(0);
        break;
      default:
        stop(`unknown argument: ${value}`);
    }
  }

  if (!options.sharedRepo) stop("--shared-repo is required");
  if (!options.laneRepo) stop("--lane-repo is required");
  if (!options.laneBranch) stop("--lane-branch is required");
  if (options.reservedPaths.length === 0) stop("at least one --reserve is required");
  if (!Number.isInteger(options.scans) || options.scans < 1 || options.scans > 10) {
    stop("--scans must be from 1 to 10");
  }
  if (!Number.isInteger(options.delayMs) || options.delayMs < 0 || options.delayMs > 10000) {
    stop("--delay-ms must be from 0 to 10000");
  }

  options.sharedRepo = fs.realpathSync(path.resolve(options.sharedRepo));
  options.laneRepo = fs.realpathSync(path.resolve(options.laneRepo));
  options.reservedPaths = [...new Set(options.reservedPaths.map(normalizeRepoPath))].sort();
  options.allowRuntimeScripts = [...new Set(options.allowRuntimeScripts.map((value) => {
    return path.resolve(options.sharedRepo, value);
  }))].sort();
  options.safeUnits = [...new Set(options.safeUnits)].sort();
  options.ignorePids = [...new Set(options.ignorePids)].sort((a, b) => a - b);
  return options;
}

function parseWorktrees(raw) {
  const result = [];
  let current = {};
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) {
      if (Object.keys(current).length > 0) result.push(current);
      current = {};
      continue;
    }
    const separator = line.indexOf(" ");
    const key = separator < 0 ? line : line.slice(0, separator);
    const value = separator < 0 ? "" : line.slice(separator + 1);
    if (key === "worktree") current.path = value;
    else if (key === "HEAD") current.head = value;
    else if (key === "branch") current.branch = value.replace(/^refs\/heads\//, "");
    else if (key === "detached") current.detached = true;
  }
  if (Object.keys(current).length > 0) result.push(current);
  return result;
}

function dirtyPaths(repo) {
  const raw = git(repo, ["status", "--porcelain=v1", "--untracked-files=all"]);
  const paths = [];
  for (const line of raw.split(/\r?\n/)) {
    if (line.length < 4) continue;
    let value = line.slice(3);
    if (value.includes(" -> ")) value = value.split(" -> ", 2)[1];
    paths.push(value);
  }
  return [...new Set(paths)].sort();
}

function repoSlug(repo) {
  let remote = git(repo, ["remote", "get-url", "origin"]).replace(/\.git$/, "");
  if (remote.startsWith("git@github.com:")) return remote.slice("git@github.com:".length);
  const marker = "github.com/";
  const index = remote.indexOf(marker);
  if (index >= 0) return remote.slice(index + marker.length);
  stop(`unsupported origin URL: ${remote}`);
}

function remoteMain(repo) {
  const result = execute("git", ["-C", repo, "ls-remote", "origin", "refs/heads/main"]);
  const fields = result.stdout.trim().split(/\s+/);
  if (fields.length !== 2 || fields[1] !== "refs/heads/main") {
    stop("unexpected ls-remote output", { stdout: result.stdout.trim() });
  }
  return fields[0];
}

function collectSharedWorktrees(options) {
  const entries = parseWorktrees(git(options.sharedRepo, ["worktree", "list", "--porcelain"]));
  const localBase = git(options.sharedRepo, ["rev-parse", "refs/remotes/origin/main"]);
  return entries.map((entry) => {
    const repo = fs.realpathSync(entry.path);
    const head = entry.head || git(repo, ["rev-parse", "HEAD"]);
    const branch = entry.branch || "(detached)";
    const dirty = dirtyPaths(repo);
    let changed = [];
    let inspectionError = "";
    if (branch !== "main") {
      const mergeBaseResult = execute(
        "git",
        ["-C", options.sharedRepo, "merge-base", head, localBase],
        { allowFailure: true },
      );
      if (mergeBaseResult.status !== 0) {
        inspectionError = mergeBaseResult.stderr.trim() || "merge-base failed";
      } else {
        const mergeBase = mergeBaseResult.stdout.trim();
        const diffResult = execute(
          "git",
          ["-C", options.sharedRepo, "diff", "--name-only", `${mergeBase}...${head}`, "--"],
          { allowFailure: true },
        );
        if (diffResult.status !== 0) {
          inspectionError = diffResult.stderr.trim() || "diff failed";
        } else {
          changed = [...new Set(diffResult.stdout.split(/\r?\n/).filter(Boolean))].sort();
        }
      }
    }
    return {
      path: repo,
      branch,
      head,
      dirtyPaths: dirty,
      changedPaths: changed,
      changedPathInspectionError: inspectionError,
    };
  });
}

function collectOpenPrs(options) {
  const available = execute(
    "sh",
    ["-c", "command -v gh >/dev/null 2>&1"],
    { allowFailure: true },
  ).status === 0;
  if (!available) stop("gh is unavailable");

  const slug = repoSlug(options.laneRepo);
  const list = execute(
    "gh",
    [
      "pr", "list",
      "--repo", slug,
      "--state", "open",
      "--limit", "100",
      "--json", "number,headRefName,headRefOid,title,url",
    ],
    { cwd: options.laneRepo },
  );
  const prs = JSON.parse(list.stdout);
  return prs.map((pr) => {
    const view = execute(
      "gh",
      [
        "pr", "view", String(pr.number),
        "--repo", slug,
        "--json", "number,headRefName,headRefOid,title,url,files",
      ],
      { cwd: options.laneRepo },
    );
    const detail = JSON.parse(view.stdout);
    return {
      number: detail.number,
      headRefName: detail.headRefName,
      headRefOid: detail.headRefOid,
      title: detail.title,
      url: detail.url,
      paths: [...new Set((detail.files ?? []).map((item) => item.path).filter(Boolean))].sort(),
    };
  });
}

function procText(pid, name) {
  try {
    return fs.readFileSync(`/proc/${pid}/${name}`, "utf8");
  } catch {
    return "";
  }
}

function procArgv(pid) {
  try {
    return fs.readFileSync(`/proc/${pid}/cmdline`).toString("utf8").split("\0").filter(Boolean);
  } catch {
    return [];
  }
}

function procCwd(pid) {
  try {
    return fs.realpathSync(`/proc/${pid}/cwd`);
  } catch {
    return "";
  }
}

function procParent(pid) {
  const match = procText(pid, "status").match(/^PPid:\s+(\d+)$/m);
  return match ? Number.parseInt(match[1], 10) : null;
}

function procState(pid) {
  const match = procText(pid, "status").match(/^State:\s+(.+)$/m);
  return match ? match[1].trim() : "";
}

function childPids(pid) {
  const children = [];
  for (const entry of fs.readdirSync("/proc", { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^\d+$/.test(entry.name)) continue;
    const candidate = Number.parseInt(entry.name, 10);
    if (procParent(candidate) === pid) children.push(candidate);
  }
  return children.sort((a, b) => a - b);
}

function processAgeSeconds(pid) {
  const stat = procText(pid, "stat");
  const close = stat.lastIndexOf(")");
  if (close < 0) return null;
  const fields = stat.slice(close + 2).trim().split(/\s+/);
  const startTicks = Number.parseInt(fields[19], 10);
  let uptime;
  try {
    uptime = Number.parseFloat(fs.readFileSync("/proc/uptime", "utf8").split(/\s+/, 1)[0]);
  } catch {
    return null;
  }
  if (!Number.isFinite(startTicks) || !Number.isFinite(uptime)) return null;
  // Linux systems used by VOID expose USER_HZ as 100.
  return Math.max(0, uptime - startTicks / 100);
}

function within(candidate, root) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function gitFdCount(pid, gitDirs) {
  let entries;
  try {
    entries = fs.readdirSync(`/proc/${pid}/fd`);
  } catch {
    return 0;
  }
  let count = 0;
  for (const entry of entries) {
    try {
      const target = fs.realpathSync(`/proc/${pid}/fd/${entry}`);
      if (gitDirs.some((gitDir) => within(target, gitDir))) count += 1;
    } catch {
      // Descriptor disappeared during inspection.
    }
  }
  return count;
}

function collectProcessScans(options, sharedWorktrees) {
  let sharedGitDir = git(options.sharedRepo, ["rev-parse", "--git-common-dir"]);
  if (!path.isAbsolute(sharedGitDir)) sharedGitDir = path.resolve(options.sharedRepo, sharedGitDir);
  sharedGitDir = fs.realpathSync(sharedGitDir);
  let laneGitDir = git(options.laneRepo, ["rev-parse", "--git-common-dir"]);
  if (!path.isAbsolute(laneGitDir)) laneGitDir = path.resolve(options.laneRepo, laneGitDir);
  laneGitDir = fs.realpathSync(laneGitDir);

  const roots = [...sharedWorktrees.map((entry) => entry.path), options.laneRepo];
  const gitDirs = [sharedGitDir, laneGitDir];
  const scans = [];

  for (let scan = 1; scan <= options.scans; scan += 1) {
    const conflicts = [];
    const safeServices = [];
    const safeRuntimes = [];

    for (const entry of fs.readdirSync("/proc", { withFileTypes: true })) {
      if (!entry.isDirectory() || !/^\d+$/.test(entry.name)) continue;
      const pid = Number.parseInt(entry.name, 10);
      if (options.ignorePids.includes(pid)) continue;
      const cwd = procCwd(pid);
      if (!cwd || !roots.some((root) => within(cwd, root))) continue;

      const argv = procArgv(pid);
      const comm = procText(pid, "comm").trim();
      const name = path.basename(argv[0] ?? comm);
      if (!COMMANDS.has(name) && !COMMANDS.has(comm)) continue;

      const cgroup = procText(pid, "cgroup");
      const unit = options.safeUnits.find((candidate) => cgroup.includes(candidate)) ?? "";
      const fdCount = gitFdCount(pid, gitDirs);
      const base = { pid, comm, cwd, argv, serviceUnit: unit, gitMetadataFdCount: fdCount };

      if (unit && fdCount === 0) {
        safeServices.push(base);
        continue;
      }

      const script = argv.length === 2 ? path.resolve(argv[1]) : "";
      const age = processAgeSeconds(pid);
      const children = childPids(pid);
      const state = procState(pid);
      const assessment = {
        ...base,
        ageSeconds: age,
        children,
        state,
        executableOk: argv.length === 2 && path.resolve(argv[0] ?? "") === "/usr/bin/node",
        argvOk: argv.length === 2 && options.allowRuntimeScripts.includes(script),
        cwdOk: cwd === options.sharedRepo,
        scriptOk: Boolean(script) && fs.existsSync(script) && path.dirname(script) === path.join(options.sharedRepo, "ops"),
        ageOk: age !== null && age >= MIN_RUNTIME_AGE_SECONDS,
        stateOk: Boolean(state) && !state.startsWith("Z") && !state.startsWith("X"),
        childrenOk: children.length === 0,
        gitFdOk: fdCount === 0,
      };
      const safe = [
        assessment.executableOk,
        assessment.argvOk,
        assessment.cwdOk,
        assessment.scriptOk,
        assessment.ageOk,
        assessment.stateOk,
        assessment.childrenOk,
        assessment.gitFdOk,
      ].every(Boolean);

      if (safe) safeRuntimes.push(assessment);
      else conflicts.push({ ...base, runtimeAssessment: assessment });
    }

    scans.push({
      scan,
      conflicts: conflicts.sort((a, b) => a.pid - b.pid),
      safeServices: safeServices.sort((a, b) => a.pid - b.pid),
      safeRuntimes: safeRuntimes.sort((a, b) => a.pid - b.pid),
    });

    if (scan < options.scans && options.delayMs > 0) {
      const shared = new Int32Array(new SharedArrayBuffer(4));
      Atomics.wait(shared, 0, 0, options.delayMs);
    }
  }
  return scans;
}

function collectLive(options) {
  const laneLocalMain = git(options.laneRepo, ["rev-parse", "refs/remotes/origin/main"]);
  const laneRemoteMain = remoteMain(options.laneRepo);
  const lane = {
    path: options.laneRepo,
    branch: git(options.laneRepo, ["branch", "--show-current"]),
    head: git(options.laneRepo, ["rev-parse", "HEAD"]),
    dirtyPaths: dirtyPaths(options.laneRepo),
  };
  const sharedWorktrees = collectSharedWorktrees(options);
  return {
    source: "live",
    laneLocalMain,
    laneRemoteMain,
    lane,
    sharedWorktrees,
    openPrs: collectOpenPrs(options),
    processScans: collectProcessScans(options, sharedWorktrees),
  };
}

function collectFixture(options) {
  const fixture = JSON.parse(fs.readFileSync(path.resolve(options.fixture), "utf8"));
  return {
    source: "fixture",
    laneLocalMain: fixture.laneLocalMain,
    laneRemoteMain: fixture.laneRemoteMain,
    lane: fixture.lane,
    sharedWorktrees: fixture.sharedWorktrees ?? [],
    openPrs: fixture.openPrs ?? [],
    processScans: fixture.processScans ?? [],
  };
}

function intersection(left, right) {
  const rightSet = new Set(right);
  return left.filter((item) => rightSet.has(item)).sort();
}

function audit(options, evidence) {
  const laneDirtyOutsideReserve = evidence.lane.dirtyPaths.filter(
    (item) => !options.reservedPaths.includes(item),
  );

  const worktreeInspectionErrors = evidence.sharedWorktrees
    .filter((entry) => entry.changedPathInspectionError)
    .map((entry) => ({
      path: entry.path,
      branch: entry.branch,
      error: entry.changedPathInspectionError,
    }));

  const worktreeOverlaps = [];
  for (const entry of evidence.sharedWorktrees) {
    const overlap = intersection(
      options.reservedPaths,
      [...(entry.changedPaths ?? []), ...(entry.dirtyPaths ?? [])],
    );
    if (overlap.length > 0) {
      worktreeOverlaps.push({
        path: entry.path,
        branch: entry.branch,
        head: entry.head,
        overlap,
      });
    }
  }

  const prOverlaps = [];
  for (const pr of evidence.openPrs) {
    if (pr.headRefName === options.laneBranch) continue;
    const overlap = intersection(options.reservedPaths, pr.paths ?? []);
    if (overlap.length > 0) {
      prOverlaps.push({
        number: pr.number,
        headRefName: pr.headRefName,
        url: pr.url,
        overlap,
      });
    }
  }

  const unstableScans = evidence.processScans
    .filter((scan) => (scan.conflicts ?? []).length > 0)
    .map((scan) => ({ scan: scan.scan, conflicts: scan.conflicts }));

  const checks = {
    laneRemoteMainExact: Boolean(evidence.laneLocalMain) && evidence.laneLocalMain === evidence.laneRemoteMain,
    lanePathExact: path.resolve(evidence.lane.path) === options.laneRepo,
    laneBranchExact: evidence.lane.branch === options.laneBranch,
    laneDirtyReservedOnly: laneDirtyOutsideReserve.length === 0,
    sharedWorktreeInspectionComplete: worktreeInspectionErrors.length === 0,
    sharedWorktreeReservedPathsClear: worktreeOverlaps.length === 0,
    openPrReservedPathsClear: prOverlaps.length === 0,
    processBoundaryStable: evidence.processScans.length >= 1 && unstableScans.length === 0,
  };

  return {
    version: 1,
    source: evidence.source,
    generatedAt: new Date().toISOString(),
    collisionSafe: Object.values(checks).every(Boolean),
    lane: {
      ...evidence.lane,
      reservedPaths: options.reservedPaths,
      dirtyOutsideReserve: laneDirtyOutsideReserve,
    },
    base: {
      localRemoteMain: evidence.laneLocalMain,
      remoteMain: evidence.laneRemoteMain,
    },
    checks,
    sharedWorktreeCount: evidence.sharedWorktrees.length,
    openPrCount: evidence.openPrs.length,
    worktreeInspectionErrors,
    worktreeOverlaps,
    prOverlaps,
    unstableScans,
    processScans: evidence.processScans,
  };
}

try {
  const options = parseArgs(process.argv.slice(2));
  const evidence = options.fixture ? collectFixture(options) : collectLive(options);
  const report = audit(options, evidence);
  console.log(JSON.stringify(report, null, 2));
  console.log(report.collisionSafe ? GREEN : HOLD);
  process.exit(report.collisionSafe ? 0 : 1);
} catch (error) {
  console.error(JSON.stringify({
    version: 1,
    collisionSafe: false,
    fatal: {
      message: error instanceof Error ? error.message : String(error),
      details: error?.details ?? {},
    },
  }, null, 2));
  console.error(HOLD);
  process.exit(1);
}
