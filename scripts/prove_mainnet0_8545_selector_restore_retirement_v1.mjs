#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const legacyRestore = path.join(
  repoRoot,
  "ops/mainnet0/mainnet0-restore-8545-epoch125-state.sh",
);
const selectedStart = path.join(
  repoRoot,
  "ops/mainnet0/mainnet0-start-8545-selected-durable-state.sh",
);
const makefile = path.join(repoRoot, "Makefile");
const workflow = path.join(
  repoRoot,
  ".github/workflows/void-private-chain2050-durability-integration-v1.yml",
);

const legacyText = fs.readFileSync(legacyRestore, "utf8");
const selectedText = fs.readFileSync(selectedStart, "utf8");
const makeText = fs.readFileSync(makefile, "utf8");
const workflowText = fs.readFileSync(workflow, "utf8");
const selectedRelativePath = path
  .relative(repoRoot, selectedStart)
  .split(path.sep)
  .join("/");
const selectedGitIndex = spawnSync(
  "git",
  ["ls-files", "-s", "--", selectedRelativePath],
  { cwd: repoRoot, encoding: "utf8" },
);

assert.equal(selectedGitIndex.status, 0, selectedGitIndex.stderr);
const selectedGitIndexMode = selectedGitIndex.stdout.trim().split(/\s+/, 1)[0];
if (selectedGitIndexMode !== "100755") {
  const proposedMode = spawnSync(
    "git",
    ["diff", "--summary", "--", selectedRelativePath],
    { cwd: repoRoot, encoding: "utf8" },
  );
  assert.equal(proposedMode.status, 0, proposedMode.stderr);
  assert.match(
    proposedMode.stdout,
    /mode change 100644 => 100755/,
    "selector replacement must be tracked or proposed as executable mode 100755",
  );
}
assert.equal(
  fs.statSync(selectedStart).mode & 0o777,
  0o755,
  "selector replacement must be executable in the checked-out worktree",
);

assert.match(legacyText, /fixed_epoch125_restore_retired/);
assert.match(legacyText, /mainnet0-start-8545-selected-durable-state\.sh/);
for (const forbidden of [
  "fuser -k",
  "nohup anvil",
  "mainnet0-catchup-vault123-chain-only.sh",
  "/mnt/key2/anvil-state/",
  "--load-state",
]) {
  assert.equal(
    legacyText.includes(forbidden),
    false,
    `legacy restore still contains forbidden behavior: ${forbidden}`,
  );
}
assert.match(
  makeText,
  /mainnet0-restore-8545-epoch125-state\.sh/,
  "historical operator target should now land on the fail-closed shim",
);
assert.match(
  selectedText,
  /tools\/void-private-chain2050-startup-integration-v1\.mjs/,
);
assert.match(
  selectedText,
  /VOID_MAINNET0_8545_MINIMUM_BLOCK_NUMBER/,
);
assert.match(
  selectedText,
  /VOID_MAINNET0_8545_START_MODE:-plan/,
);
assert.match(
  selectedText,
  /startPrivateChain2050FromSelectedDurableState/,
);
assert.equal(selectedText.includes("fuser -k"), false);
assert.equal(selectedText.includes("mainnet0-catchup-vault123-chain-only.sh"), false);

const tempRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-mainnet0-selector-retirement-"),
);
try {
  const fakeNode = path.join(tempRoot, "fake-node");
  const capture = path.join(tempRoot, "captured-args.txt");
  fs.writeFileSync(
    fakeNode,
    `#!/usr/bin/env bash\nset -euo pipefail\n: "\${VOID_SELECTOR_CAPTURE:?}"\nprintf '%s\\n' "$@" > "$VOID_SELECTOR_CAPTURE"\n`,
    { mode: 0o755 },
  );
  fs.chmodSync(fakeNode, 0o755);

  const baseEnv = {
    ...process.env,
    VOID_REPO: repoRoot,
    VOID_NODE_BIN: fakeNode,
    VOID_SELECTOR_CAPTURE: capture,
    VOID_MAINNET0_8545_BASELINE_STATE: "/operator/private/mainnet0-baseline.json",
    VOID_MAINNET0_8545_BASELINE_STATE_SHA256: "a".repeat(64),
    VOID_MAINNET0_8545_BASELINE_STATE_FORMAT: "anvil_cli_state_json",
    VOID_MAINNET0_8545_BASELINE_BLOCK_NUMBER: "125",
    VOID_MAINNET0_8545_BASELINE_BLOCK_HASH: `0x${"b".repeat(64)}`,
    VOID_MAINNET0_8545_CHECKPOINT_ROOT: "/operator/private/chain2050-checkpoints-v1",
    VOID_MAINNET0_8545_MINIMUM_BLOCK_NUMBER: "125",
    VOID_MAINNET0_8545_RPC_URL: "http://127.0.0.1:8545/",
  };

  const runViaBash = (script, extraEnv = {}) =>
    spawnSync("bash", [script], {
      cwd: repoRoot,
      env: { ...baseEnv, ...extraEnv },
      encoding: "utf8",
    });

  const runDirect = (script, extraEnv = {}) =>
    spawnSync(script, [], {
      cwd: repoRoot,
      env: { ...baseEnv, ...extraEnv },
      encoding: "utf8",
    });

  const retired = runViaBash(legacyRestore);
  assert.equal(retired.status, 2);
  assert.match(retired.stderr, /VOID_MAINNET0_8545_EPOCH125_RESTORE_RETIRED_V1_HOLD/);
  assert.equal(fs.existsSync(capture), false, "retired restore must not invoke startup");

  const plan = runDirect(selectedStart);
  assert.equal(plan.status, 0, plan.stderr);
  const planArgs = fs.readFileSync(capture, "utf8").trim().split("\n");
  assert.ok(
    planArgs[0].endsWith("tools/void-private-chain2050-startup-integration-v1.mjs"),
  );
  assert.ok(planArgs.includes("--minimum-block-number"));
  assert.ok(planArgs.includes("125"));
  assert.equal(planArgs.includes("--apply"), false);
  assert.equal(planArgs.includes("--confirmation"), false);

  fs.rmSync(capture, { force: true });
  const missingConfirmation = runDirect(selectedStart, {
    VOID_MAINNET0_8545_START_MODE: "apply",
    VOID_MAINNET0_8545_CONFIRMATION: "wrong",
  });
  assert.equal(missingConfirmation.status, 2);
  assert.match(missingConfirmation.stderr, /selector_start_confirmation_required/);
  assert.equal(fs.existsSync(capture), false);

  const invalidMinimum = runDirect(selectedStart, {
    VOID_MAINNET0_8545_MINIMUM_BLOCK_NUMBER: "0",
  });
  assert.equal(invalidMinimum.status, 2);
  assert.match(invalidMinimum.stderr, /minimum_block_number_invalid/);
  assert.equal(fs.existsSync(capture), false);

  const apply = runDirect(selectedStart, {
    VOID_MAINNET0_8545_START_MODE: "apply",
    VOID_MAINNET0_8545_CONFIRMATION:
      "startPrivateChain2050FromSelectedDurableState",
  });
  assert.equal(apply.status, 0, apply.stderr);
  const applyArgs = fs.readFileSync(capture, "utf8").trim().split("\n");
  assert.ok(applyArgs.includes("--apply"));
  const confirmationIndex = applyArgs.indexOf("--confirmation");
  assert.ok(confirmationIndex >= 0);
  assert.equal(
    applyArgs[confirmationIndex + 1],
    "startPrivateChain2050FromSelectedDurableState",
  );

  assert.match(
    workflowText,
    /prove_mainnet0_8545_selector_restore_retirement_v1\.mjs/,
    "existing P0-A workflow must run the restore-retirement regression",
  );

  console.log("legacy_fixed_restore_mutation_authority=0");
  console.log("legacy_make_target_fails_closed=1");
  console.log("selector_wrapper_default_read_only_plan=1");
  console.log("selector_entrypoint_git_mode_100755=1");
  console.log("selector_entrypoint_direct_invocation=1");
  console.log("independent_minimum_block_required=1");
  console.log("apply_exact_confirmation_required=1");
  console.log("manual_catchup_removed=1");
  console.log("VOID_MAINNET0_8545_SELECTOR_RESTORE_RETIREMENT_V1_PROOF_GREEN");
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
