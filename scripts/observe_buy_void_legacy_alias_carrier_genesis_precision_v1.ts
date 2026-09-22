#!/usr/bin/env node
import { execFileSync } from "node:child_process";

import {
  planBuyVoidProductionLegacyAliasCarrierGenesisV1,
} from "../src/economic/buy_void_legacy_alias_carrier_genesis_v1.js";

const REPO_ROOT = "/home/zoso/dev/void-node";
const GIT_DIR = REPO_ROOT + "/.git";
const GIT_ENV = {
  ...process.env,
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_CONFIG_GLOBAL: "/dev/null",
};

function fail(code: string, detail: string): never {
  throw new Error(
    "VOID_BUY_VOID_LEGACY_ALIAS_CARRIER_GENESIS_PRECISION_OBSERVER_V1:" +
      code + ":" + detail,
  );
}

function git(args: string[]): string {
  return execFileSync(
    "/usr/bin/git",
    [
      "--git-dir=" + GIT_DIR,
      "--work-tree=" + REPO_ROOT,
      "-c",
      "core.fsmonitor=false",
      ...args,
    ],
    {
      cwd: REPO_ROOT,
      env: GIT_ENV,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  ).trim();
}

function snapshot(): {
  branch: string;
  head: string;
  tree: string;
  status: string;
} {
  return {
    branch: git(["branch", "--show-current"]),
    head: git(["rev-parse", "HEAD"]),
    tree: git(["rev-parse", "HEAD^{tree}"]),
    status: git([
      "status",
      "--porcelain=v1",
      "--untracked-files=all",
    ]),
  };
}

if (process.argv.length !== 2) {
  fail("ARGUMENTS_FORBIDDEN", String(process.argv.length));
}

const before = snapshot();
if (before.branch !== "main") {
  fail("MAIN_REQUIRED", before.branch || "detached");
}
if (before.status !== "") {
  fail("WORKTREE_NOT_CLEAN", before.status.slice(0, 200));
}

const firstPlan =
  planBuyVoidProductionLegacyAliasCarrierGenesisV1();
const secondPlan =
  planBuyVoidProductionLegacyAliasCarrierGenesisV1();

if (JSON.stringify(firstPlan) !== JSON.stringify(secondPlan)) {
  fail(
    "PLAN_UNSTABLE_BETWEEN_PASSES",
    firstPlan.attestation_plan_sha256 +
      ":" +
      secondPlan.attestation_plan_sha256,
  );
}

const after = snapshot();
if (
  JSON.stringify(before) !== JSON.stringify(after)
) {
  fail(
    "REPOSITORY_CHANGED_DURING_OBSERVATION",
    before.head + ":" + after.head,
  );
}

const receipt = {
  marker:
    "VOID_BUY_VOID_LEGACY_ALIAS_CARRIER_GENESIS_PRECISION_OBSERVER_V1",
  version: 1,
  repo_root: REPO_ROOT,
  repo_branch: before.branch,
  repo_head: before.head,
  repo_tree: before.tree,
  plan: firstPlan,
  authority: {
    git_read_only: true,
    git_fetch: false,
    git_mutation: false,
    git_repository_paths_pinned: true,
    git_fsmonitor_disabled: true,
    stable_double_pass_plan: true,
    post_observation_git_revalidation: true,
    filesystem_read: true,
    filesystem_write: false,
    page_publication: false,
    carrier_root_publication: false,
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
};

process.stdout.write(JSON.stringify(receipt, null, 2) + "\n");
