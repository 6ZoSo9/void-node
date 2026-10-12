#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  planBuyVoidProductionLegacyHistoryMigrationV1,
} from "../src/economic/buy_void_legacy_history_migration_plan_v1.js";

const MARKER =
  "VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_PLAN_PRECISION_OBSERVER_V1";
const REPO_ROOT = "/home/zoso/dev/void-node";
const GIT_DIR = path.join(REPO_ROOT, ".git");

function fail(code: string, detail: string): never {
  throw new Error(MARKER + ":" + code + ":" + detail);
}

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
  planner_blob: string;
  projection_blob: string;
  census_blob: string;
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
    planner_blob: git([
      "rev-parse",
      "HEAD:src/economic/buy_void_legacy_history_migration_plan_v1.ts",
    ]),
    projection_blob: git([
      "rev-parse",
      "HEAD:src/economic/buy_void_payment_history_projection_v1.ts",
    ]),
    census_blob: git([
      "rev-parse",
      "HEAD:src/economic/buy_void_production_history_carrier_census_v1.ts",
    ]),
  };
}

if (process.argv.length !== 2) {
  fail(
    "ARGUMENTS_FORBIDDEN",
    process.argv.slice(2).join(","),
  );
}
if (path.resolve(process.cwd()) !== REPO_ROOT) {
  fail(
    "WORKING_DIRECTORY_MISMATCH",
    path.resolve(process.cwd()),
  );
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
  fail(
    "GIT_DIRECTORY_AUTHORITY_MISMATCH",
    GIT_DIR,
  );
}

const before = gitSnapshot();
if (before.branch !== "main") {
  fail(
    "BRANCH_NOT_MAIN",
    before.branch || "detached",
  );
}
if (before.head !== before.local_main) {
  fail(
    "HEAD_MAIN_MISMATCH",
    before.head + ":" + before.local_main,
  );
}
if (before.status !== "") {
  fail(
    "WORKTREE_NOT_CLEAN",
    "tracked-or-untracked-change-present",
  );
}
for (const [label, value] of [
  ["HEAD", before.head],
  ["TREE", before.tree],
  ["PLANNER_BLOB", before.planner_blob],
  ["PROJECTION_BLOB", before.projection_blob],
  ["CENSUS_BLOB", before.census_blob],
] as const) {
  if (!/^[0-9a-f]{40}$/u.test(value)) {
    fail(label + "_INVALID", value);
  }
}

const firstPlan =
  planBuyVoidProductionLegacyHistoryMigrationV1();
const secondPlan =
  planBuyVoidProductionLegacyHistoryMigrationV1();

if (
  JSON.stringify(firstPlan) !==
    JSON.stringify(secondPlan)
) {
  fail(
    "PLAN_UNSTABLE_BETWEEN_PASSES",
    firstPlan.migration_plan_sha256 +
      ":" +
      secondPlan.migration_plan_sha256,
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
  planner_blob: before.planner_blob,
  projection_blob: before.projection_blob,
  census_blob: before.census_blob,
  migration_plan: secondPlan,
  authority: {
    git_read_only: true,
    git_fetch: false,
    git_mutation: false,
    git_repository_paths_pinned: true,
    git_fsmonitor_disabled: true,
    stable_double_pass_plan: true,
    post_observation_git_revalidation: true,
    filesystem_content_read: true,
    filesystem_mutation: false,
    segmented_store_write: false,
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

process.stdout.write(
  JSON.stringify(receipt, null, 2) + "\n",
);
