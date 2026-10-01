#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

export const MARKER = "VOID_COORDINATION_SUCCESSOR_CHAIN_V1";
export const ROTATION_THRESHOLD_TOTAL_MESSAGES = 250;
export const ROTATION_WRITER_WORKER_ID = "ada";
export const DEFAULT_ROOT_ISSUE = 1507;
export const DEFAULT_REPOSITORY = "6ZoSo9/void-node";

const MAX_CHAIN_HOPS = 32;
const MAX_COMMENT_PAGES = 100;
const POINTER_PATTERN = /^COORDINATION_SUCCESSOR=#([1-9][0-9]*)$/u;
const ROTATION_MARKER_PATTERN = /^(?:#{1,6}\\s+)?CONTROL-PLANE ROTATION$/u;

export class CoordinationSuccessorChainError extends Error {
  constructor(message) {
    super(message);
    this.name = "CoordinationSuccessorChainError";
  }
}

function fail(message) {
  throw new CoordinationSuccessorChainError(message);
}

function requirePositiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 1) {
    fail(label + " must be a positive safe integer");
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

function requireIssue(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(label + " must be an object");
  }
  requirePositiveInteger(value.number, label + ".number");
  if (Object.hasOwn(value, "pull_request")) {
    fail(label + " must be an issue, not a pull request");
  }
  if (!["open", "closed"].includes(value.state)) {
    fail(label + ".state must be open or closed");
  }
  if (!Number.isSafeInteger(value.comments) || value.comments < 0) {
    fail(label + ".comments must be a non-negative safe integer");
  }
  if (typeof value.updated_at !== "string" || !value.updated_at) {
    fail(label + ".updated_at must be present");
  }
  return value;
}

function requireComment(value, index) {
  const label = "comments[" + index + "]";
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(label + " must be an object");
  }
  requirePositiveInteger(value.id, label + ".id");
  if (typeof value.body !== "string") {
    fail(label + ".body must be text");
  }
  return value;
}

function commentLines(body) {
  return String(body).replace(/\r\n?/gu, "\n").split("\n").map((line) => line.trim());
}

export function inspectCoordinationIssueV1(issueInput, commentsInput) {
  const issue = requireIssue(structuredClone(issueInput), "issue");
  if (!Array.isArray(commentsInput)) fail("comments must be an array");
  const comments = commentsInput.map((item, index) => requireComment(item, index));
  const commentIds = comments.map((item) => item.id);
  if (new Set(commentIds).size !== commentIds.length) {
    fail("duplicate coordination comment id in capture");
  }
  if (comments.length !== issue.comments) {
    fail(
      "complete comment capture required: issue.comments="
      + issue.comments
      + " captured="
      + comments.length,
    );
  }

  const pointers = [];
  for (const comment of comments) {
    const lines = commentLines(comment.body);
    const pointerLines = lines
      .map((line) => POINTER_PATTERN.exec(line))
      .filter(Boolean);
    if (pointerLines.length > 1) {
      fail("one comment contains multiple coordination successor pointers");
    }
    if (pointerLines.length === 1) {
      if (!lines.some((line) => ROTATION_MARKER_PATTERN.test(line))) {
        fail("coordination successor pointer lacks CONTROL-PLANE ROTATION marker");
      }
      pointers.push({
        comment_id: comment.id,
        successor_issue: Number.parseInt(pointerLines[0][1], 10),
      });
    }
  }

  if (pointers.length > 1) {
    fail("multiple coordination successor pointers found");
  }

  const pointer = pointers[0] ?? null;
  if (pointer && pointer.successor_issue === issue.number) {
    fail("coordination successor pointer cannot target itself");
  }

  const totalMessages = issue.comments + 1;
  const rotationRequired =
    issue.state === "open"
    && pointer === null
    && totalMessages >= ROTATION_THRESHOLD_TOTAL_MESSAGES;

  return Object.freeze({
    issue_number: issue.number,
    issue_state: issue.state,
    issue_updated_at: issue.updated_at,
    comment_count: issue.comments,
    total_issue_messages: totalMessages,
    rotation_threshold_total_messages: ROTATION_THRESHOLD_TOTAL_MESSAGES,
    successor_issue: pointer ? pointer.successor_issue : null,
    rotation_pointer_comment_id: pointer ? pointer.comment_id : null,
    rotation_required_here: rotationRequired,
  });
}

function finalizeChain(entries, rootIssue) {
  if (!Array.isArray(entries) || entries.length === 0) {
    fail("successor chain must contain at least one issue");
  }
  const holdReasons = [];
  for (let index = 0; index < entries.length - 1; index += 1) {
    const current = entries[index];
    const next = entries[index + 1];
    if (current.successor_issue !== next.issue_number) {
      holdReasons.push(
        "successor_link_mismatch:#"
        + current.issue_number
        + "->#"
        + String(current.successor_issue),
      );
    }
    if (current.issue_state !== "closed") {
      holdReasons.push("predecessor_with_successor_still_open:#" + current.issue_number);
    }
  }

  const terminal = entries[entries.length - 1];
  if (terminal.successor_issue !== null) {
    holdReasons.push("terminal_entry_still_has_successor:#" + terminal.issue_number);
  }
  if (terminal.issue_state !== "open") {
    holdReasons.push("terminal_issue_not_open:#" + terminal.issue_number);
  }

  const uniqueHoldReasons = [...new Set(holdReasons)].sort();
  let outcome;
  if (uniqueHoldReasons.length > 0) {
    outcome = "HOLD_INVALID_SUCCESSOR_CHAIN";
  } else if (terminal.rotation_required_here) {
    outcome = "ROTATION_REQUIRED";
  } else if (entries.length > 1) {
    outcome = "SUCCESSOR_RESOLVED";
  } else {
    outcome = "CURRENT";
  }

  return Object.freeze({
    marker: MARKER,
    version: 1,
    repository_scope: DEFAULT_REPOSITORY,
    root_issue: rootIssue,
    current_issue: terminal.issue_number,
    outcome,
    chain_valid: uniqueHoldReasons.length === 0,
    hold_reasons: Object.freeze(uniqueHoldReasons),
    rotation_required: outcome === "ROTATION_REQUIRED",
    rotation_writer_worker_id: ROTATION_WRITER_WORKER_ID,
    rotation_threshold_total_messages: ROTATION_THRESHOLD_TOTAL_MESSAGES,
    chain_issue_numbers: Object.freeze(entries.map((entry) => entry.issue_number)),
    chain: Object.freeze(entries.map((entry) => Object.freeze({ ...entry }))),
    dispatch_plan_issue_should_be:
      uniqueHoldReasons.length === 0 ? terminal.issue_number : null,
    plan_issue_update_required:
      uniqueHoldReasons.length === 0
      && terminal.issue_number !== rootIssue,
    issue_creation_authorized: false,
    issue_close_authorized: false,
    scheduler_mutation_authorized: false,
    source_mutation_authorized: false,
    runtime_mutation_authorized: false,
    authority_granted: false,
    mutation_performed: false,
  });
}

export function resolveCoordinationSuccessorChainRecordsV1(recordsInput, rootIssueInput = DEFAULT_ROOT_ISSUE) {
  const rootIssue = requirePositiveInteger(rootIssueInput, "root issue");
  if (!recordsInput || typeof recordsInput !== "object" || Array.isArray(recordsInput)) {
    fail("records must be an object keyed by issue number");
  }

  const entries = [];
  const visited = new Set();
  let issueNumber = rootIssue;
  for (let hop = 0; hop < MAX_CHAIN_HOPS; hop += 1) {
    if (visited.has(issueNumber)) {
      fail("coordination successor cycle detected at #" + issueNumber);
    }
    visited.add(issueNumber);
    const record = recordsInput[String(issueNumber)] ?? recordsInput[issueNumber];
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      fail("missing coordination issue record for #" + issueNumber);
    }
    const inspected = inspectCoordinationIssueV1(record.issue, record.comments);
    if (inspected.issue_number !== issueNumber) {
      fail("coordination record issue number mismatch");
    }
    entries.push(inspected);
    if (inspected.successor_issue === null) {
      return finalizeChain(entries, rootIssue);
    }
    issueNumber = inspected.successor_issue;
  }
  fail("coordination successor chain exceeds maximum hops");
}

function runGhJson(args) {
  const result = spawnSync("gh", ["api", ...args], {
    encoding: "utf8",
    env: {
      ...process.env,
      GH_PAGER: "cat",
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

function fetchIssue(repository, issueNumber) {
  return runGhJson(["repos/" + repository + "/issues/" + issueNumber]);
}

function fetchAllComments(repository, issueNumber) {
  const comments = [];
  for (let page = 1; page <= MAX_COMMENT_PAGES; page += 1) {
    const value = runGhJson([
      "repos/"
      + repository
      + "/issues/"
      + issueNumber
      + "/comments?per_page=100&page="
      + page,
    ]);
    if (!Array.isArray(value)) fail("GitHub comments response must be an array");
    comments.push(...value);
    if (value.length < 100) return comments;
  }
  fail("GitHub comments exceed maximum pagination bound");
}

function liveRecord(repository, issueNumber) {
  const before = fetchIssue(repository, issueNumber);
  const comments = fetchAllComments(repository, issueNumber);
  const after = fetchIssue(repository, issueNumber);
  if (
    before.number !== after.number
    || before.state !== after.state
    || before.comments !== after.comments
    || before.updated_at !== after.updated_at
  ) {
    fail("coordination issue changed during live capture");
  }
  return { issue: after, comments };
}

export function resolveCoordinationSuccessorChainLiveV1(repositoryInput, rootIssueInput = DEFAULT_ROOT_ISSUE) {
  const repository = requireRepository(repositoryInput);
  const rootIssue = requirePositiveInteger(rootIssueInput, "root issue");
  const records = {};
  const visited = new Set();
  let issueNumber = rootIssue;

  for (let hop = 0; hop < MAX_CHAIN_HOPS; hop += 1) {
    if (visited.has(issueNumber)) {
      fail("coordination successor cycle detected at #" + issueNumber);
    }
    visited.add(issueNumber);
    const record = liveRecord(repository, issueNumber);
    records[String(issueNumber)] = record;
    const inspected = inspectCoordinationIssueV1(record.issue, record.comments);
    if (inspected.successor_issue === null) {
      const result = resolveCoordinationSuccessorChainRecordsV1(records, rootIssue);
      return Object.freeze({ ...result, repository_scope: repository });
    }
    issueNumber = inspected.successor_issue;
  }
  fail("coordination successor chain exceeds maximum hops");
}

function parseArgs(argv) {
  const args = {
    repository: DEFAULT_REPOSITORY,
    rootIssue: DEFAULT_ROOT_ISSUE,
    outputPath: null,
  };
  const remaining = [...argv];
  while (remaining.length > 0) {
    const flag = remaining.shift();
    const value = remaining.shift();
    if (!value || value.startsWith("--")) fail("missing value for " + flag);
    if (flag === "--repository") args.repository = value;
    else if (flag === "--root-issue") args.rootIssue = Number.parseInt(value, 10);
    else if (flag === "--output") args.outputPath = value;
    else fail("unknown argument: " + flag);
  }
  requireRepository(args.repository);
  requirePositiveInteger(args.rootIssue, "--root-issue");
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = resolveCoordinationSuccessorChainLiveV1(
    args.repository,
    args.rootIssue,
  );
  const output = JSON.stringify(result, null, 2) + "\n";
  if (args.outputPath) {
    await writeFile(path.resolve(args.outputPath), output, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
  }
  process.stdout.write(output);
  if (!result.chain_valid) process.exitCode = 3;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(MARKER + "=HOLD\n" + message + "\n");
    process.exitCode = 2;
  });
}
