#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HELPER = path.join(ROOT, "scripts", "ci_diff_hygiene_v1.sh");
const PROOF_PATH = "scripts/prove_ci_diff_hygiene_v1.mjs";
const WORKFLOWS = [
  ".github/workflows/void-public-bootstrap-client-resilience-v1.yml",
  ".github/workflows/buy-void-erc20-transaction-preparation-planner-v1.yml",
  ".github/workflows/buy-void-erc20-delivery-receipt-reconciler-v1.yml",
  ".github/workflows/buy-void-erc20-delivery-dependency-bootstrap-v1.yml",
  ".github/workflows/buy-void-erc20-delivery-dependency-bootstrap-integration-gate-v1.yml",
  ".github/workflows/buy-void-delivery-runtime-integration-v1.yml",
  ".github/workflows/buy-void-erc20-delivery-runtime-activation-configuration-contract-v1.yml",
];

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd,
    env: { ...process.env, ...(options.env ?? {}) },
    encoding: "utf8",
  });
}

function must(command, args, options = {}) {
  const result = run(command, args, options);
  assert.equal(
    result.status,
    0,
    `${command} ${args.join(" ")} failed\nstdout=${result.stdout}\nstderr=${result.stderr}`,
  );
  return result.stdout.trim();
}

function git(cwd, ...args) {
  return must("git", args, { cwd });
}

function write(cwd, relative, text) {
  writeFileSync(path.join(cwd, relative), text, "utf8");
}

function invokeHelper(cwd, env) {
  return run("bash", [HELPER], { cwd, env });
}

function makeShallowRunner(remote, sha, name) {
  const runner = path.join(FIXTURE, name);
  git(FIXTURE, "init", runner);
  git(runner, "remote", "add", "origin", `file://${remote}`);
  git(runner, "fetch", "--no-tags", "--depth=1", "origin", sha);
  git(runner, "checkout", "--detach", "FETCH_HEAD");
  assert.equal(git(runner, "rev-parse", "HEAD"), sha);
  assert.equal(git(runner, "rev-list", "--count", "HEAD"), "1");
  return runner;
}

for (const relative of WORKFLOWS) {
  const source = readFileSync(path.join(ROOT, relative), "utf8");
  assert.match(source, /fetch-depth:\s*1\b/, `${relative}: exact shallow checkout depth missing`);
  assert.ok(source.includes("persist-credentials: false"), `${relative}: credentials persisted`);
  assert.ok(
    !source.includes("repository: ${{ github.event.pull_request.head.repo.full_name || github.repository }}"),
    `${relative}: product checkout incorrectly forced to PR-head repository`,
  );
  assert.ok(
    !source.includes("ref: ${{ github.event.pull_request.head.sha || github.sha }}"),
    `${relative}: product checkout incorrectly forced to raw PR head`,
  );
  assert.ok(source.includes("scripts/ci_diff_hygiene_v1.sh"), `${relative}: helper not dependency-bound`);
  assert.ok(source.includes(PROOF_PATH), `${relative}: shared proof not dependency-bound`);
  assert.ok(source.includes("bash scripts/ci_diff_hygiene_v1.sh"), `${relative}: helper not invoked`);
  assert.ok(
    source.includes("run: node scripts/prove_ci_diff_hygiene_v1.mjs"),
    `${relative}: shared adversarial proof not self-enforced`,
  );
  assert.ok(
    source.includes("CI_DIFF_PR_BASE_SHA: ${{ github.event.pull_request.base.sha }}"),
    `${relative}: event-base diagnostic binding missing`,
  );
  assert.ok(
    source.includes("CI_DIFF_CHECKOUT_SHA: ${{ github.sha }}"),
    `${relative}: integration checkout identity missing`,
  );
  assert.ok(
    source.includes("CI_DIFF_CURRENT_SHA: ${{ github.event.pull_request.head.sha || github.sha }}"),
    `${relative}: committed-range head identity missing`,
  );
  assert.ok(
    source.includes("CI_DIFF_BASE_REMOTE: ${{ github.server_url }}/${{ github.repository }}.git"),
    `${relative}: base-repository fetch binding missing`,
  );
  assert.ok(
    source.includes("CI_DIFF_HEAD_REMOTE: ${{ github.server_url }}/${{ github.event.pull_request.head.repo.full_name || github.repository }}.git"),
    `${relative}: head-repository fetch binding missing`,
  );
  assert.ok(
    !source.includes("git diff --check \"${{ github.event.pull_request.base.sha }}..HEAD\""),
    `${relative}: stale direct diff retained`,
  );
}

const FIXTURE = mkdtempSync(path.join(tmpdir(), "void-ci-diff-hygiene-v1-"));
try {
  const source = path.join(FIXTURE, "source");
  git(FIXTURE, "init", "-b", "main", source);
  git(source, "config", "user.email", "proof@example.invalid");
  git(source, "config", "user.name", "VOID CI proof");

  write(source, "contract.txt", "v1\n");
  git(source, "add", "contract.txt");
  git(source, "commit", "-m", "base-v1");
  const staleEventBase = git(source, "rev-parse", "HEAD");

  write(source, "contract.txt", "v2\n");
  git(source, "add", "contract.txt");
  git(source, "commit", "-m", "integration-base-v2");
  const integrationBase = git(source, "rev-parse", "HEAD");

  git(source, "checkout", "-b", "feature", staleEventBase);
  write(source, "feature.txt", "clean-feature\n");
  git(source, "add", "feature.txt");
  git(source, "commit", "-m", "feature-head");
  const featureHead = git(source, "rev-parse", "HEAD");

  git(source, "checkout", "-b", "integration", integrationBase);
  git(source, "merge", "--no-ff", "feature", "-m", "synthetic-pr-merge");
  const integrationMerge = git(source, "rev-parse", "HEAD");
  const integrationParents = git(source, "show", "-s", "--format=%P", integrationMerge).split(" ");
  assert.deepEqual(integrationParents, [integrationBase, featureHead]);

  git(source, "checkout", "-b", "bad-feature", integrationBase);
  write(source, "bad.txt", "trailing-space   \n");
  git(source, "add", "bad.txt");
  git(source, "commit", "-m", "bad-whitespace");
  const badHead = git(source, "rev-parse", "HEAD");
  git(source, "checkout", "-b", "bad-integration", integrationBase);
  git(source, "merge", "--no-ff", "bad-feature", "-m", "synthetic-bad-pr-merge");
  const badIntegration = git(source, "rev-parse", "HEAD");

  git(source, "checkout", "-b", "push-line", integrationBase);
  write(source, "push.txt", "clean-push\n");
  git(source, "add", "push.txt");
  git(source, "commit", "-m", "push-head");
  const pushHead = git(source, "rev-parse", "HEAD");

  const remote = path.join(FIXTURE, "base-remote.git");
  git(FIXTURE, "clone", "--bare", source, remote);
  git(remote, "config", "uploadpack.allowReachableSHA1InWant", "true");
  const remoteUrl = `file://${remote}`;

  const staleRunner = makeShallowRunner(remote, integrationMerge, "stale-event-base-runner");
  assert.equal(run("git", ["cat-file", "-e", `${integrationBase}^{commit}`], { cwd: staleRunner }).status, 128);
  assert.equal(run("git", ["cat-file", "-e", `${featureHead}^{commit}`], { cwd: staleRunner }).status, 128);
  git(staleRunner, "remote", "set-url", "origin", "file:///definitely-not-the-base-repository");
  const staleResult = invokeHelper(staleRunner, {
    CI_DIFF_EVENT_NAME: "pull_request",
    CI_DIFF_PR_BASE_SHA: staleEventBase,
    CI_DIFF_CURRENT_SHA: featureHead,
    CI_DIFF_CHECKOUT_SHA: integrationMerge,
    CI_DIFF_BASE_REMOTE: remoteUrl,
    CI_DIFF_HEAD_REMOTE: remoteUrl,
  });
  assert.equal(staleResult.status, 0, staleResult.stderr);
  assert.match(staleResult.stdout, new RegExp(`base_sha=${integrationBase}`));
  assert.match(staleResult.stdout, new RegExp(`event_base_sha=${staleEventBase}`));
  assert.match(staleResult.stdout, /integration_base_from_checkout=true/);
  assert.match(staleResult.stdout, /event_base_matches_integration_base=false/);
  assert.match(staleResult.stdout, /product_checkout_preserved=true/);
  assert.equal(git(staleRunner, "rev-parse", "HEAD"), integrationMerge);

  const wrongHead = invokeHelper(staleRunner, {
    CI_DIFF_EVENT_NAME: "pull_request",
    CI_DIFF_PR_BASE_SHA: staleEventBase,
    CI_DIFF_CURRENT_SHA: staleEventBase,
    CI_DIFF_CHECKOUT_SHA: integrationMerge,
    CI_DIFF_BASE_REMOTE: remoteUrl,
    CI_DIFF_HEAD_REMOTE: remoteUrl,
  });
  assert.equal(wrongHead.status, 2);
  assert.match(wrongHead.stderr, /checkout_pr_head_mismatch/);

  const missingBaseRunner = makeShallowRunner(remote, integrationMerge, "missing-base-runner");
  const missingBase = invokeHelper(missingBaseRunner, {
    CI_DIFF_EVENT_NAME: "pull_request",
    CI_DIFF_PR_BASE_SHA: staleEventBase,
    CI_DIFF_CURRENT_SHA: featureHead,
    CI_DIFF_CHECKOUT_SHA: integrationMerge,
    CI_DIFF_BASE_REMOTE: "file:///definitely-not-the-base-repository",
    CI_DIFF_HEAD_REMOTE: remoteUrl,
  });
  assert.equal(missingBase.status, 2);
  assert.match(missingBase.stderr, /base_commit_unavailable/);

  const badRunner = makeShallowRunner(remote, badIntegration, "bad-runner");
  const badResult = invokeHelper(badRunner, {
    CI_DIFF_EVENT_NAME: "pull_request",
    CI_DIFF_PR_BASE_SHA: staleEventBase,
    CI_DIFF_CURRENT_SHA: badHead,
    CI_DIFF_CHECKOUT_SHA: badIntegration,
    CI_DIFF_BASE_REMOTE: remoteUrl,
    CI_DIFF_HEAD_REMOTE: remoteUrl,
  });
  assert.notEqual(badResult.status, 0);
  assert.match(`${badResult.stdout}\n${badResult.stderr}`, /trailing whitespace/);

  const pushRunner = makeShallowRunner(remote, pushHead, "push-runner");
  const pushResult = invokeHelper(pushRunner, {
    CI_DIFF_EVENT_NAME: "push",
    CI_DIFF_PUSH_BEFORE_SHA: integrationBase,
    CI_DIFF_CURRENT_SHA: pushHead,
    CI_DIFF_CHECKOUT_SHA: pushHead,
    CI_DIFF_BASE_REMOTE: remoteUrl,
  });
  assert.equal(pushResult.status, 0, pushResult.stderr);
  assert.match(pushResult.stdout, /event=push/);
  assert.match(pushResult.stdout, /integration_base_from_checkout=false/);

  const unsupported = invokeHelper(pushRunner, {
    CI_DIFF_EVENT_NAME: "workflow_dispatch",
    CI_DIFF_CURRENT_SHA: pushHead,
    CI_DIFF_CHECKOUT_SHA: pushHead,
    CI_DIFF_BASE_REMOTE: remoteUrl,
  });
  assert.equal(unsupported.status, 2);
  assert.match(unsupported.stderr, /unsupported_event/);
} finally {
  rmSync(FIXTURE, { recursive: true, force: true });
}

console.log("VOID_CI_DIFF_HYGIENE_V1_PROOF_GREEN");
console.log(`workflow_count=${WORKFLOWS.length}`);
console.log("stale_event_base_ignored_for_range=true");
console.log("integration_base_derived_from_checkout=true");
console.log("checkout_pr_head_identity_bound=true");
console.log("base_repo_fetch_independent_of_head_origin=true");
console.log("missing_base_fail_closed=true");
console.log("merge_integration_checkout_preserved=true");
console.log("pr_head_range_fetched_without_checkout_replacement=true");
console.log("shared_proof_self_enforced=true");
console.log("push_before_supported=true");
console.log("whitespace_defect_still_fails=true");
console.log("persist_credentials=false");
console.log("diff_hygiene_skipped=false");
