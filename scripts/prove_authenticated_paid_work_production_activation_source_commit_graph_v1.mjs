#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repo = process.cwd();
const packetPath = path.join(
  repo,
  "config/activation-candidates/authenticated-paid-work-production-activation-execution-packet-v1.json",
);
const packet = JSON.parse(fs.readFileSync(packetPath, "utf8"));

const SHA256_COMMIT = /^[0-9a-f]{40}$/u;
const EXPECTED_POLICY = Object.freeze({
  shallow_history_forbidden: true,
  reviewed_source_main_must_exist: true,
  reviewed_source_main_must_be_ancestor_of_checkout: true,
  required_source_commits_must_exist: true,
  required_source_commits_must_be_ancestors_of_reviewed_source_main: true,
});

function check(value, message) {
  if (!value) throw new Error(message);
}

function git(args, label) {
  try {
    return execFileSync("git", args, {
      cwd: repo,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    const stderr =
      error && typeof error === "object" && "stderr" in error
        ? String(error.stderr).trim()
        : "";
    throw new Error(`${label}${stderr ? `: ${stderr}` : ""}`);
  }
}

function proveCommitExists(commit, label) {
  check(SHA256_COMMIT.test(commit), `${label} is not a full commit SHA`);
  git(["cat-file", "-e", `${commit}^{commit}`], `${label} does not exist`);
}

function proveAncestor(ancestor, descendant, label) {
  git(
    ["merge-base", "--is-ancestor", ancestor, descendant],
    `${label} is not an ancestor`,
  );
}

check(
  packet.marker ===
    "VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_EXECUTION_PACKET_V1",
  "packet marker mismatch",
);
check(packet.version === 1, "packet version mismatch");
check(
  packet.status === "source_ready_execution_not_authorized",
  "packet status mismatch",
);
assert.deepEqual(
  packet.source_commit_graph_policy,
  EXPECTED_POLICY,
  "source commit graph policy mismatch",
);

const shallow = git(
  ["rev-parse", "--is-shallow-repository"],
  "unable to inspect repository history depth",
);
check(shallow === "false", "source commit graph proof requires full history");

const checkoutHead = git(["rev-parse", "HEAD"], "unable to resolve checkout HEAD");
check(SHA256_COMMIT.test(checkoutHead), "checkout HEAD is not a full commit SHA");

const reviewedMain = packet.reviewed_source_main;
proveCommitExists(reviewedMain, "reviewed_source_main");
proveAncestor(
  reviewedMain,
  checkoutHead,
  "reviewed_source_main -> checkout HEAD",
);

const required = packet.required_source_commits;
check(
  required !== null &&
    typeof required === "object" &&
    !Array.isArray(required),
  "required_source_commits must be an object",
);
const entries = Object.entries(required);
check(entries.length === 12, "required source commit count mismatch");

for (const [name, commit] of entries) {
  proveCommitExists(commit, `required_source_commits.${name}`);
  proveAncestor(
    commit,
    reviewedMain,
    `required_source_commits.${name} -> reviewed_source_main`,
  );
}

check(
  required.credential_reference_metadata !== reviewedMain,
  "credential metadata prerequisite collapsed into reviewed main",
);
proveAncestor(
  required.credential_reference_metadata,
  reviewedMain,
  "credential metadata prerequisite -> reviewed_source_main",
);

const authority = packet.authority;
check(
  authority !== null &&
    typeof authority === "object" &&
    !Array.isArray(authority),
  "authority must be an object",
);
check(
  Object.values(authority).every((value) => value === false),
  "source commit graph proof found granted authority",
);

check(
  Number.parseInt(process.versions.node.split(".")[0], 10) === 22,
  "Node.js 22 required",
);

console.log(`checkout_head=${checkoutHead}`);
console.log(`reviewed_source_main=${reviewedMain}`);
console.log(`required_source_commits=${entries.length}`);
console.log("repository_history_shallow=false");
console.log("reviewed_source_main_exists=true");
console.log("reviewed_source_main_ancestor_of_checkout=true");
console.log("required_source_commits_exist=true");
console.log("required_source_commits_ancestors_of_reviewed_main=true");
console.log("credential_metadata_ancestor_of_reviewed_main=true");
console.log("activation_authorized=false");
console.log(
  "VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_SOURCE_COMMIT_GRAPH_V1_PROOF_GREEN=true",
);
