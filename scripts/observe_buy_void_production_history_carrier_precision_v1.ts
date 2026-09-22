#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  observeBuyVoidProductionHistoryCarrierCensusV1,
} from "../src/economic/buy_void_production_history_carrier_census_v1.js";

const MARKER =
  "VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_PRECISION_OBSERVER_V1";
const REPO_ROOT = "/home/zoso/dev/void-node";

function fail(code: string, detail: string): never {
  throw new Error(MARKER + ":" + code + ":" + detail);
}

const GIT_DIR = path.join(REPO_ROOT, ".git");

function git(args: string[]): string {
  return execFileSync(
    "/usr/bin/git",
    [
      "-C",
      REPO_ROOT,
      "--git-dir=" + GIT_DIR,
      "--work-tree=" + REPO_ROOT,
      "-c",
      "core.fsmonitor=false",
      ...args,
    ],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        PATH: "/usr/bin:/bin",
        HOME: process.env.HOME || "/home/zoso",
        LANG: "C",
        LC_ALL: "C",
        GIT_CONFIG_NOSYSTEM: "1",
        GIT_CONFIG_GLOBAL: "/dev/null",
      },
    },
  ).trim();
}

function gitSnapshot(): {
  branch: string;
  head: string;
  local_main: string;
  tree: string;
  status: string;
} {
  return {
    branch: git(["branch", "--show-current"]),
    head: git(["rev-parse", "HEAD"]),
    local_main: git(["rev-parse", "main"]),
    tree: git(["rev-parse", "HEAD^{tree}"]),
    status: git([
      "status",
      "--porcelain=v1",
      "--untracked-files=all",
    ]),
  };
}

if (process.argv.length !== 2) {
  fail("ARGUMENTS_FORBIDDEN", process.argv.slice(2).join(","));
}
if (path.resolve(process.cwd()) !== REPO_ROOT) {
  fail("WORKING_DIRECTORY_MISMATCH", path.resolve(process.cwd()));
}

const gitDirMetadata = fs.lstatSync(GIT_DIR);
if (
  !gitDirMetadata.isDirectory() ||
  gitDirMetadata.isSymbolicLink() ||
  (
    typeof process.getuid === "function" &&
    gitDirMetadata.uid !== process.getuid()
  )
) {
  fail("GIT_DIRECTORY_AUTHORITY_MISMATCH", GIT_DIR);
}

const before = gitSnapshot();
if (before.branch !== "main") {
  fail("BRANCH_NOT_MAIN", before.branch || "detached");
}
if (before.head !== before.local_main) {
  fail(
    "HEAD_MAIN_MISMATCH",
    before.head + ":" + before.local_main,
  );
}
if (before.status !== "") {
  fail("WORKTREE_NOT_CLEAN", "tracked-or-untracked-change-present");
}
if (!/^[0-9a-f]{40}$/u.test(before.head)) {
  fail("HEAD_INVALID", before.head);
}
if (!/^[0-9a-f]{40}$/u.test(before.tree)) {
  fail("TREE_INVALID", before.tree);
}

const firstCensus =
  observeBuyVoidProductionHistoryCarrierCensusV1();
const secondCensus =
  observeBuyVoidProductionHistoryCarrierCensusV1();
if (
  JSON.stringify(firstCensus) !== JSON.stringify(secondCensus)
) {
  fail(
    "CENSUS_UNSTABLE_BETWEEN_PASSES",
    firstCensus.history_state + ":" + secondCensus.history_state,
  );
}

const after = gitSnapshot();
if (JSON.stringify(before) !== JSON.stringify(after)) {
  fail(
    "REPOSITORY_CHANGED_DURING_OBSERVATION",
    before.head + ":" + after.head,
  );
}

const receipt = {
  marker: MARKER,
  version: 1,
  repo_root: REPO_ROOT,
  repo_branch: before.branch,
  repo_head: before.head,
  repo_tree: before.tree,
  census: secondCensus,
  authority: {
    git_read_only: true,
    git_fetch: false,
    git_mutation: false,
    git_repository_paths_pinned: true,
    git_fsmonitor_disabled: true,
    stable_double_pass_census: true,
    post_observation_git_revalidation: true,
    filesystem_content_read: false,
    filesystem_mutation: false,
    service_action: false,
    credential_content_read: false,
    wallet_or_signer_access: false,
    rpc_call: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    inventory_mutation: false,
    treasury_or_liquidity_action: false,
    funds_movement: false,
  },
} as const;

process.stdout.write(JSON.stringify(receipt, null, 2) + "\n");
