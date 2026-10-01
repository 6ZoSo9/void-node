#!/usr/bin/env node

import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import {
  DEFAULT_REPOSITORY,
  DEFAULT_ROOT_ISSUE,
  resolveCoordinationSuccessorChainLiveV1,
} from "./void-coordination-successor-chain-v1.mjs";
import {
  EVIDENCE_MARKER as SNAPSHOT_EVIDENCE_MARKER,
  buildCoordinationRotationSnapshotV1,
} from "./void-coordination-rotation-snapshot-v1.mjs";

export const MARKER = "VOID_COORDINATION_ROTATION_LIVE_SNAPSHOT_V1";

const MAX_OPEN_PRS = 250;
const MAX_CHANGED_PATHS_PER_PR = 500;
const MAX_PR_PAGES = 3;
const MAX_FILE_PAGES = 5;
const SHA_PATTERN = /^[0-9a-f]{40}$/u;\nconst MAX_POLICY_BYTES = 1024 * 1024;

export class CoordinationRotationLiveSnapshotError extends Error {
  constructor(message) {
    super(message);
    this.name = "CoordinationRotationLiveSnapshotError";
  }
}

function fail(message) {
  throw new CoordinationRotationLiveSnapshotError(message);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireObject(value, label) {
  if (!isPlainObject(value)) fail(label + " must be an object");
  return value;
}

function requireString(value, label, maxLength = 1000) {
  if (typeof value !== "string" || value.length === 0 || value.length > maxLength) {
    fail(label + " must be bounded non-empty text");
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
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u.test(value)) {
      fail(label + " must be canonical UTC");
    }
    const secondsParsed = Date.parse(value);
    if (!Number.isFinite(secondsParsed)) fail(label + " must be canonical UTC");
  }
  return value;
}

function requireRepository(value) {
  if (
    typeof value !== "string"
    || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(value)
  ) {
    fail("repository must be owner/name");
  }
  return value;
}

function normalizeRepositoryPath(value, label) {
  requireString(value, label, 1000);
  if (
    value.startsWith("/")
    || value.startsWith("./")
    || value.includes("\\")
    || value.includes("\0")
  ) {
    fail(label + " must be normalized repository-relative path");
  }
  const parts = value.split("/");
  if (parts.some((part) => !part || part === "." || part === "..")) {
    fail(label + " must be normalized repository-relative path");
  }
  return parts.join("/");
}

export function gitBlobShaV1(bytes) {
  if (typeof bytes !== "string") fail("git blob bytes must be UTF-8 text");
  const body = Buffer.from(bytes, "utf8");
  const header = Buffer.from("blob " + body.length + "\0", "utf8");
  return crypto
    .createHash("sha1")
    .update(Buffer.concat([header, body]))
    .digest("hex");
}

function parsePolicyBytes(bytes) {
  if (
    typeof bytes !== "string"
    || Buffer.byteLength(bytes, "utf8") === 0
    || Buffer.byteLength(bytes, "utf8") > MAX_POLICY_BYTES
  ) {
    fail("policy bytes must be non-empty UTF-8 within " + MAX_POLICY_BYTES + " bytes");
  }
  try {
    return JSON.parse(bytes);
  } catch (error) {
    fail("policy bytes are not valid JSON: " + error.message);
  }
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

function normalizeChangedPath(value, label) {
  requireString(value, label, 1000);
  if (
    value.startsWith("/")
    || value.startsWith("./")
    || value.includes("\\")
    || value.includes("\0")
  ) {
    fail(label + " must be normalized repository-relative path");
  }
  const parts = value.split("/");
  if (parts.some((part) => !part || part === "." || part === "..")) {
    fail(label + " must be normalized repository-relative path");
  }
  return value;
}

function normalizePrSummary(raw, label) {
  const pr = requireObject(raw, label);
  requirePositiveInteger(pr.number, label + ".number");
  requireString(pr.title, label + ".title", 500);
  if (pr.state !== "open") fail(label + ".state must equal open");
  requireBoolean(pr.draft, label + ".draft");
  requireSha(pr.head_sha, label + ".head_sha");
  requireSha(pr.base_sha, label + ".base_sha");
  requireIsoTimestamp(pr.updated_at, label + ".updated_at");
  return {
    number: pr.number,
    title: pr.title,
    state: "open",
    draft: pr.draft,
    head_sha: pr.head_sha,
    base_sha: pr.base_sha,
    updated_at: pr.updated_at,
  };
}

function normalizePrList(raw, label) {
  if (!Array.isArray(raw) || raw.length > MAX_OPEN_PRS) {
    fail(label + " must be an array with at most " + MAX_OPEN_PRS + " entries");
  }
  const values = raw.map((item, index) =>
    normalizePrSummary(item, label + "[" + index + "]")
  );
  const numbers = values.map((item) => item.number);
  if (new Set(numbers).size !== numbers.length) {
    fail(label + " contains duplicate PR numbers");
  }
  return values.sort((a, b) => a.number - b.number);
}

function normalizePrDetail(raw, label) {
  const pr = normalizePrSummary(raw, label);
  requireNonNegativeInteger(raw.changed_files, label + ".changed_files");
  if (raw.changed_files > MAX_CHANGED_PATHS_PER_PR) {
    fail(label + ".changed_files exceeds " + MAX_CHANGED_PATHS_PER_PR);
  }
  return {
    ...pr,
    changed_files: raw.changed_files,
  };
}

function normalizePullRequestCapture(raw, index) {
  const label = "capture.pull_request_captures[" + index + "]";
  const value = requireObject(raw, label);
  const before = normalizePrDetail(value.before, label + ".before");
  const after = normalizePrDetail(value.after, label + ".after");
  if (canonicalJson(before) !== canonicalJson(after)) {
    fail("PR #" + before.number + " changed during live capture");
  }
  if (!Array.isArray(value.changed_paths)) {
    fail(label + ".changed_paths must be an array");
  }
  const changedPaths = value.changed_paths.map((item, pathIndex) =>
    normalizeChangedPath(item, label + ".changed_paths[" + pathIndex + "]")
  );
  const unique = [...new Set(changedPaths)].sort();
  if (unique.length !== changedPaths.length) {
    fail("PR #" + before.number + " changed path list contains duplicates");
  }
  if (unique.length !== before.changed_files) {
    fail(
      "PR #" + before.number
      + " changed path count mismatch: metadata="
      + before.changed_files
      + " captured="
      + unique.length,
    );
  }
  return {
    ...before,
    changed_paths: unique,
  };
}

function ensurePrListMatchesDetails(list, details, label) {
  if (list.length !== details.length) {
    fail(label + " open PR count differs from detailed captures");
  }
  for (let index = 0; index < list.length; index += 1) {
    const summary = list[index];
    const detail = details[index];
    const detailSummary = {
      number: detail.number,
      title: detail.title,
      state: detail.state,
      draft: detail.draft,
      head_sha: detail.head_sha,
      base_sha: detail.base_sha,
      updated_at: detail.updated_at,
    };
    if (canonicalJson(summary) !== canonicalJson(detailSummary)) {
      fail(label + " PR #" + summary.number + " differs from detailed capture");
    }
  }
}

export function buildCoordinationRotationLiveSnapshotV1({
  repository,
  rootIssue,
  capturedAt,
  policyPath,
  policyBytes,
  policyBlobSha,
  mainBefore,
  mainAfter,
  chainBefore,
  chainAfter,
  openPrListBefore,
  openPrListAfter,
  pullRequestCaptures,
}) {
  const repo = requireRepository(repository);
  const root = requirePositiveInteger(rootIssue, "rootIssue");
  const captured = requireIsoTimestamp(capturedAt, "capturedAt");
  const canonicalPolicyPath = normalizeRepositoryPath(
    policyPath,
    "policyPath",
  );
  const canonicalPolicyBlobSha = requireSha(
    policyBlobSha,
    "policyBlobSha",
  );
  if (gitBlobShaV1(policyBytes) !== canonicalPolicyBlobSha) {
    fail("policy bytes do not match captured Git blob SHA");
  }
  const policyRaw = parsePolicyBytes(policyBytes);
  const beforeMain = requireSha(mainBefore, "mainBefore");
  const afterMain = requireSha(mainAfter, "mainAfter");
  if (beforeMain !== afterMain) {
    fail("current main changed during live capture");
  }

  const beforeChain = requireObject(chainBefore, "chainBefore");
  const afterChain = requireObject(chainAfter, "chainAfter");
  if (canonicalJson(beforeChain) !== canonicalJson(afterChain)) {
    fail("coordination successor chain changed during live capture");
  }
  if (afterChain.repository_scope !== repo) {
    fail("successor chain repository does not match live capture repository");
  }
  if (afterChain.root_issue !== root) {
    fail("successor chain root issue does not match live capture root");
  }

  const beforeList = normalizePrList(openPrListBefore, "openPrListBefore");
  const afterList = normalizePrList(openPrListAfter, "openPrListAfter");
  if (canonicalJson(beforeList) !== canonicalJson(afterList)) {
    fail("open PR census changed during live capture");
  }

  if (!Array.isArray(pullRequestCaptures)) {
    fail("pullRequestCaptures must be an array");
  }
  const details = pullRequestCaptures
    .map(normalizePullRequestCapture)
    .sort((a, b) => a.number - b.number);
  const detailNumbers = details.map((item) => item.number);
  if (new Set(detailNumbers).size !== detailNumbers.length) {
    fail("pullRequestCaptures contains duplicate PR numbers");
  }
  ensurePrListMatchesDetails(afterList, details, "live capture");

  const evidence = {
    marker: SNAPSHOT_EVIDENCE_MARKER,
    version: 1,
    observed_at: captured,
    observed_main_sha: afterMain,
    chain: afterChain,
    open_pull_requests: details.map((detail) => ({
      number: detail.number,
      title: detail.title,
      state: detail.state,
      draft: detail.draft,
      head_sha: detail.head_sha,
      base_sha: detail.base_sha,
      updated_at: detail.updated_at,
      changed_paths: detail.changed_paths,
    })),
  };
  const snapshot = buildCoordinationRotationSnapshotV1(policyRaw, evidence);

  const material = {
    marker: MARKER,
    version: 1,
    repository: repo,
    root_issue: root,
    captured_at: captured,
    main_sha: afterMain,
    policy_path: canonicalPolicyPath,
    policy_blob_sha: canonicalPolicyBlobSha,
    open_pull_request_count: details.length,
    successor_chain_outcome: snapshot.chain_outcome,
    snapshot_outcome: snapshot.outcome,
    snapshot_id: snapshot.snapshot_id,
    live_capture_consistent: true,
    point_in_time_only: true,
    live_refresh_required_before_successor_write: true,
    snapshot,
    issue_creation_authorized: false,
    issue_close_authorized: false,
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
    live_capture_id: sha256Id(material),
  });
}

function runGhJson(args) {
  const result = spawnSync("gh", ["api", ...args], {
    encoding: "utf8",
    env: {
      ...process.env,
      GH_PAGER: "cat",
      GIT_TERMINAL_PROMPT: "0",
    },
    maxBuffer: 32 * 1024 * 1024,
    timeout: 30_000,
  });
  if (result.error) fail("gh failed to start: " + result.error.message);
  if (result.status !== 0) {
    fail("gh api failed with status " + result.status);
  }
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    fail("gh api returned malformed JSON: " + error.message);
  }
}

function githubPrSummary(raw) {
  return {
    number: raw.number,
    title: raw.title,
    state: raw.state,
    draft: raw.draft,
    head_sha: raw.head?.sha,
    base_sha: raw.base?.sha,
    updated_at: raw.updated_at,
  };
}

function githubPrDetail(raw) {
  return {
    ...githubPrSummary(raw),
    changed_files: raw.changed_files,
  };
}

function fetchMainSha(repository) {
  const value = runGhJson(["repos/" + repository + "/branches/main"]);
  return requireSha(value?.commit?.sha, "live main SHA");
}

function fetchRepositoryTextAtRef(repository, repositoryPath, ref) {
  const normalizedPath = normalizeRepositoryPath(
    repositoryPath,
    "policy repository path",
  );
  const encodedPath = normalizedPath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  const value = runGhJson([
    "repos/"
    + repository
    + "/contents/"
    + encodedPath
    + "?ref="
    + encodeURIComponent(ref),
  ]);
  if (
    !isPlainObject(value)
    || value.type !== "file"
    || value.encoding !== "base64"
    || typeof value.content !== "string"
  ) {
    fail("GitHub policy content response is not a base64 file");
  }
  const blobSha = requireSha(value.sha, "GitHub policy blob SHA");
  const bytes = Buffer
    .from(value.content.replace(/\s/gu, ""), "base64")
    .toString("utf8");
  if (gitBlobShaV1(bytes) !== blobSha) {
    fail("GitHub policy bytes do not match returned blob SHA");
  }
  return {
    path: normalizedPath,
    blob_sha: blobSha,
    bytes,
  };
}

function fetchOpenPrList(repository) {
  const values = [];
  for (let page = 1; page <= MAX_PR_PAGES; page += 1) {
    const rows = runGhJson([
      "repos/"
      + repository
      + "/pulls?state=open&sort=created&direction=asc&per_page=100&page="
      + page,
    ]);
    if (!Array.isArray(rows)) fail("GitHub open PR list must be an array");
    values.push(...rows.map(githubPrSummary));
    if (rows.length < 100) break;
    if (page === MAX_PR_PAGES) {
      fail("open PR census exceeds pagination bound");
    }
  }
  if (values.length > MAX_OPEN_PRS) fail("open PR census exceeds " + MAX_OPEN_PRS);
  return normalizePrList(values, "live open PR list");
}

function fetchPrChangedPaths(repository, number, changedFiles) {
  if (changedFiles > MAX_CHANGED_PATHS_PER_PR) {
    fail("PR #" + number + " exceeds changed path capture bound");
  }
  if (changedFiles === 0) return [];
  const paths = [];
  for (let page = 1; page <= MAX_FILE_PAGES; page += 1) {
    const rows = runGhJson([
      "repos/"
      + repository
      + "/pulls/"
      + number
      + "/files?per_page=100&page="
      + page,
    ]);
    if (!Array.isArray(rows)) fail("GitHub PR files response must be an array");
    for (const row of rows) {
      paths.push(row.filename);
    }
    if (paths.length > changedFiles) {
      fail("PR #" + number + " changed path response exceeds metadata count");
    }
    if (paths.length === changedFiles) return paths;
    if (rows.length < 100) break;
    if (page === MAX_FILE_PAGES) {
      fail("PR #" + number + " changed paths exceed pagination bound");
    }
  }
  return paths;
}

function fetchPullRequestCapture(repository, summary) {
  const beforeRaw = runGhJson([
    "repos/" + repository + "/pulls/" + summary.number,
  ]);
  const before = normalizePrDetail(
    githubPrDetail(beforeRaw),
    "live PR #" + summary.number + " before",
  );
  const changedPaths = fetchPrChangedPaths(
    repository,
    summary.number,
    before.changed_files,
  );
  const afterRaw = runGhJson([
    "repos/" + repository + "/pulls/" + summary.number,
  ]);
  const after = normalizePrDetail(
    githubPrDetail(afterRaw),
    "live PR #" + summary.number + " after",
  );
  return {
    before,
    after,
    changed_paths: changedPaths,
  };
}

export async function captureCoordinationRotationLiveSnapshotV1({
  repository = DEFAULT_REPOSITORY,
  rootIssue = DEFAULT_ROOT_ISSUE,
  policyPath = "ops/coordination/worker-live-dispatch-policy-v1.json",
} = {}) {
  const repo = requireRepository(repository);
  const root = requirePositiveInteger(rootIssue, "rootIssue");
  const canonicalPolicyPath = normalizeRepositoryPath(
    policyPath,
    "policyPath",
  );

  const chainBefore = resolveCoordinationSuccessorChainLiveV1(repo, root);
  const mainBefore = fetchMainSha(repo);
  const policy = fetchRepositoryTextAtRef(
    repo,
    canonicalPolicyPath,
    mainBefore,
  );
  const openPrListBefore = fetchOpenPrList(repo);
  const pullRequestCaptures = openPrListBefore.map((summary) =>
    fetchPullRequestCapture(repo, summary)
  );
  const openPrListAfter = fetchOpenPrList(repo);
  const mainAfter = fetchMainSha(repo);
  const chainAfter = resolveCoordinationSuccessorChainLiveV1(repo, root);
  const capturedAt = new Date().toISOString();

  return buildCoordinationRotationLiveSnapshotV1({
    repository: repo,
    rootIssue: root,
    capturedAt,
    policyPath: policy.path,
    policyBytes: policy.bytes,
    policyBlobSha: policy.blob_sha,
    mainBefore,
    mainAfter,
    chainBefore,
    chainAfter,
    openPrListBefore,
    openPrListAfter,
    pullRequestCaptures,
  });
}

function parseArgs(argv) {
  const args = {
    repository: DEFAULT_REPOSITORY,
    rootIssue: DEFAULT_ROOT_ISSUE,
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
    if (!value || value.startsWith("--")) fail("missing value for " + flag);
    if (flag === "--repository") args.repository = value;
    else if (flag === "--root-issue") args.rootIssue = Number.parseInt(value, 10);
    else if (flag === "--policy") args.policyPath = value;
    else if (flag === "--output") args.outputPath = value;
    else fail("unknown argument: " + flag);
  }
  requireRepository(args.repository);
  requirePositiveInteger(args.rootIssue, "--root-issue");
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await captureCoordinationRotationLiveSnapshotV1(args);
  const output = JSON.stringify(result, null, args.pretty ? 2 : 0) + "\n";
  if (args.outputPath) {
    await writeFile(path.resolve(args.outputPath), output, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
  }
  process.stdout.write(output);
  if (String(result.snapshot_outcome).startsWith("HOLD_")) {
    process.exitCode = 3;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(MARKER + "=HOLD\n" + message + "\n");
    process.exitCode = 2;
  });
}
