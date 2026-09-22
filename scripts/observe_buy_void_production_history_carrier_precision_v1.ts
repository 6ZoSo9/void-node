#!/usr/bin/env node
import { execFileSync } from "node:child_process";
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

function git(args: string[]): string {
  return execFileSync(
    "/usr/bin/git",
    ["-C", REPO_ROOT, ...args],
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

if (process.argv.length !== 2) {
  fail("ARGUMENTS_FORBIDDEN", process.argv.slice(2).join(","));
}
if (path.resolve(process.cwd()) !== REPO_ROOT) {
  fail("WORKING_DIRECTORY_MISMATCH", path.resolve(process.cwd()));
}

const branch = git(["branch", "--show-current"]);
const head = git(["rev-parse", "HEAD"]);
const localMain = git(["rev-parse", "main"]);
const tree = git(["rev-parse", "HEAD^{tree}"]);
const status = git([
  "status",
  "--porcelain=v1",
  "--untracked-files=all",
]);

if (branch !== "main") {
  fail("BRANCH_NOT_MAIN", branch || "detached");
}
if (head !== localMain) {
  fail("HEAD_MAIN_MISMATCH", head + ":" + localMain);
}
if (status !== "") {
  fail("WORKTREE_NOT_CLEAN", "tracked-or-untracked-change-present");
}
if (!/^[0-9a-f]{40}$/u.test(head)) {
  fail("HEAD_INVALID", head);
}
if (!/^[0-9a-f]{40}$/u.test(tree)) {
  fail("TREE_INVALID", tree);
}

const census =
  observeBuyVoidProductionHistoryCarrierCensusV1();

const receipt = {
  marker: MARKER,
  version: 1,
  repo_root: REPO_ROOT,
  repo_branch: branch,
  repo_head: head,
  repo_tree: tree,
  census,
  authority: {
    git_read_only: true,
    git_fetch: false,
    git_mutation: false,
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
