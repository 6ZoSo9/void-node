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

  write(source, "fixture.txt", "base\n");
  git(source, "add", "fixture.txt");
  git(source, "commit", "-m", "base");
  const deepBase = git(source, "rev-parse", "HEAD");

  const commits = [];
  for (let i = 1; i <= 6; i += 1) {
    write(source, "fixture.txt", `base\nclean-${i}\n`);
    git(source, "add", "fixture.txt");
    git(source, "commit", "-m", `clean-${i}`);
    commits.push(git(source, "rev-parse", "HEAD"));
  }
  const cleanHead = commits.at(-1);
  const pushBefore = commits.at(-2);

  const remote = path.join(FIXTURE, "base-remote.git");
  git(FIXTURE, "clone", "--bare", source, remote);
  git(remote, "config", "uploadpack.allowReachableSHA1InWant", "true");
  const baseRemote = `file://${remote}`;

  const deepRunner = makeShallowRunner(remote, cleanHead, "deep-runner");
  assert.equal(run("git", ["cat-file", "-e", `${deepBase}^{commit}`], { cwd: deepRunner }).status, 128);
  git(deepRunner, "remote", "set-url", "origin", "file:///definitely-not-the-base-repository");
  const deepResult = invokeHelper(deepRunner, {
    CI_DIFF_EVENT_NAME: "pull_request",
    CI_DIFF_PR_BASE_SHA: deepBase,
    CI_DIFF_CURRENT_SHA: cleanHead,
    CI_DIFF_CHECKOUT_SHA: cleanHead,
    CI_DIFF_BASE_REMOTE: baseRemote,
    CI_DIFF_HEAD_REMOTE: baseRemote,
  });
  assert.equal(deepResult.status, 0, deepResult.stderr);
  assert.match(deepResult.stdout, /VOID_CI_DIFF_HYGIENE_V1_GREEN/);
  assert.equal(run("git", ["cat-file", "-e", `${deepBase}^{commit}`], { cwd: deepRunner }).status, 0);

  const missingResult = invokeHelper(deepRunner, {
    CI_DIFF_EVENT_NAME: "pull_request",
    CI_DIFF_PR_BASE_SHA: "f".repeat(40),
    CI_DIFF_CURRENT_SHA: cleanHead,
    CI_DIFF_CHECKOUT_SHA: cleanHead,
    CI_DIFF_BASE_REMOTE: baseRemote,
    CI_DIFF_HEAD_REMOTE: baseRemote,
  });
  assert.equal(missingResult.status, 2);
  assert.match(missingResult.stderr, /base_commit_unavailable/);

  const mismatchedCheckout = invokeHelper(deepRunner, {
    CI_DIFF_EVENT_NAME: "pull_request",
    CI_DIFF_PR_BASE_SHA: deepBase,
    CI_DIFF_CURRENT_SHA: cleanHead,
    CI_DIFF_CHECKOUT_SHA: pushBefore,
    CI_DIFF_BASE_REMOTE: baseRemote,
    CI_DIFF_HEAD_REMOTE: baseRemote,
  });
  assert.equal(mismatchedCheckout.status, 2);
  assert.match(mismatchedCheckout.stderr, /checkout_not_exact_event_state/);

  const pushRunner = makeShallowRunner(remote, cleanHead, "push-runner");
  git(pushRunner, "remote", "set-url", "origin", "file:///definitely-not-the-base-repository");
  const pushResult = invokeHelper(pushRunner, {
    CI_DIFF_EVENT_NAME: "push",
    CI_DIFF_PUSH_BEFORE_SHA: pushBefore,
    CI_DIFF_CURRENT_SHA: cleanHead,
    CI_DIFF_CHECKOUT_SHA: cleanHead,
    CI_DIFF_BASE_REMOTE: baseRemote,
  });
  assert.equal(pushResult.status, 0, pushResult.stderr);
  assert.match(pushResult.stdout, /event=push/);

  git(source, "checkout", "-b", "bad-whitespace", deepBase);
  write(source, "fixture.txt", "base\ntrailing-space   \n");
  git(source, "add", "fixture.txt");
  git(source, "commit", "-m", "bad-whitespace");
  const badHead = git(source, "rev-parse", "HEAD");
  git(source, "push", baseRemote, `HEAD:refs/heads/bad-whitespace`);

  const badRunner = makeShallowRunner(remote, badHead, "bad-runner");
  const badResult = invokeHelper(badRunner, {
    CI_DIFF_EVENT_NAME: "pull_request",
    CI_DIFF_PR_BASE_SHA: deepBase,
    CI_DIFF_CURRENT_SHA: badHead,
    CI_DIFF_CHECKOUT_SHA: badHead,
    CI_DIFF_BASE_REMOTE: baseRemote,
    CI_DIFF_HEAD_REMOTE: baseRemote,
  });
  assert.notEqual(badResult.status, 0);
  assert.match(`${badResult.stdout}\n${badResult.stderr}`, /trailing whitespace/);

  // Adversarial integration fixture: the branch head is individually coherent,
  // but a newer event base changes a contract that makes the merged integration
  // state incompatible. Product checks must therefore stay on the normal PR
  // merge checkout rather than being switched to the raw head merely to make
  // committed-range hygiene available.
  const integrationSource = path.join(FIXTURE, "integration-source");
  git(FIXTURE, "init", "-b", "main", integrationSource);
  git(integrationSource, "config", "user.email", "proof@example.invalid");
  git(integrationSource, "config", "user.name", "VOID CI proof");
  write(integrationSource, "contract.txt", "v1\n");
  git(integrationSource, "add", "contract.txt");
  git(integrationSource, "commit", "-m", "integration-base");
  const integrationBase0 = git(integrationSource, "rev-parse", "HEAD");

  git(integrationSource, "checkout", "-b", "feature", integrationBase0);
  write(integrationSource, "feature.txt", "requires=v1\n");
  git(integrationSource, "add", "feature.txt");
  git(integrationSource, "commit", "-m", "feature-head");
  const featureHead = git(integrationSource, "rev-parse", "HEAD");
  assert.equal(readFileSync(path.join(integrationSource, "contract.txt"), "utf8"), "v1\n");
  assert.equal(readFileSync(path.join(integrationSource, "feature.txt"), "utf8"), "requires=v1\n");

  git(integrationSource, "checkout", "main");
  write(integrationSource, "contract.txt", "v2\n");
  git(integrationSource, "add", "contract.txt");
  git(integrationSource, "commit", "-m", "event-base-v2");
  const eventBase = git(integrationSource, "rev-parse", "HEAD");

  git(integrationSource, "checkout", "-b", "integration", eventBase);
  git(integrationSource, "merge", "--no-ff", "feature", "-m", "synthetic-pr-merge");
  const integrationMerge = git(integrationSource, "rev-parse", "HEAD");
  assert.equal(readFileSync(path.join(integrationSource, "contract.txt"), "utf8"), "v2\n");
  assert.equal(readFileSync(path.join(integrationSource, "feature.txt"), "utf8"), "requires=v1\n");
  assert.notEqual(
    readFileSync(path.join(integrationSource, "contract.txt"), "utf8").trim(),
    readFileSync(path.join(integrationSource, "feature.txt"), "utf8").trim().replace("requires=", ""),
    "integration fixture must prove head-only green can become integration-incompatible",
  );

  const integrationRemote = path.join(FIXTURE, "integration-remote.git");
  git(FIXTURE, "clone", "--bare", integrationSource, integrationRemote);
  git(integrationRemote, "config", "uploadpack.allowReachableSHA1InWant", "true");
  const integrationRemoteUrl = `file://${integrationRemote}`;
  const integrationRunner = makeShallowRunner(integrationRemote, integrationMerge, "integration-runner");
  assert.equal(run("git", ["cat-file", "-e", `${featureHead}^{commit}`], { cwd: integrationRunner }).status, 128);
  const integrationResult = invokeHelper(integrationRunner, {
    CI_DIFF_EVENT_NAME: "pull_request",
    CI_DIFF_PR_BASE_SHA: eventBase,
    CI_DIFF_CURRENT_SHA: featureHead,
    CI_DIFF_CHECKOUT_SHA: integrationMerge,
    CI_DIFF_BASE_REMOTE: integrationRemoteUrl,
    CI_DIFF_HEAD_REMOTE: integrationRemoteUrl,
  });
  assert.equal(integrationResult.status, 0, integrationResult.stderr);
  assert.match(integrationResult.stdout, /product_checkout_preserved=true/);
  assert.equal(git(integrationRunner, "rev-parse", "HEAD"), integrationMerge);

  const unsupported = invokeHelper(deepRunner, {
    CI_DIFF_EVENT_NAME: "workflow_dispatch",
    CI_DIFF_CURRENT_SHA: cleanHead,
    CI_DIFF_CHECKOUT_SHA: cleanHead,
    CI_DIFF_BASE_REMOTE: baseRemote,
  });
  assert.equal(unsupported.status, 2);
  assert.match(unsupported.stderr, /unsupported_event/);
} finally {
  rmSync(FIXTURE, { recursive: true, force: true });
}

console.log("VOID_CI_DIFF_HYGIENE_V1_PROOF_GREEN");
console.log(`workflow_count=${WORKFLOWS.length}`);
console.log("deep_old_pr_base_recovered=true");
console.log("base_repo_fetch_independent_of_head_origin=true");
console.log("missing_base_fail_closed=true");
console.log("merge_integration_checkout_preserved=true");
console.log("pr_head_range_fetched_without_checkout_replacement=true");
console.log("shared_proof_self_enforced=true");
console.log("push_before_supported=true");
console.log("whitespace_defect_still_fails=true");
console.log("persist_credentials=false");
console.log("diff_hygiene_skipped=false");
