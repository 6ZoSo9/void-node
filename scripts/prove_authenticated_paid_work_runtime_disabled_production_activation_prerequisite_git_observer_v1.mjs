#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CONFIG_MARKER,
  RESULT_MARKER,
  observeGitCheckpointLineageV1,
  validateConfig,
} from "../tools/void-authenticated-paid-work-runtime-disabled-production-activation-prerequisite-git-observer-v1.mjs";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    env: options.env ?? process.env,
    maxBuffer: 8 * 1024 * 1024,
    shell: false,
  });
  if (result.error) throw result.error;
  if (options.check !== false && result.status !== 0) {
    throw new Error(`${command} failed (${result.status}): ${(result.stderr || result.stdout).trim()}`);
  }
  return result;
}

function git(repo, args, options = {}) {
  return run("git", ["-C", repo, ...args], options);
}

function commit(repo, label) {
  const target = path.join(repo, "lineage.txt");
  writeFileSync(target, `${readFileSync(target, "utf8")}${label}\n`);
  git(repo, ["add", "lineage.txt"]);
  git(repo, ["commit", "-m", label]);
  return git(repo, ["rev-parse", "HEAD"]).stdout.trim();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const root = mkdtempSync(path.join(tmpdir(), "void-apw-git-observer-v1-proof-"));
const repo = path.join(root, "repo");

try {
  run("git", ["init", "--initial-branch=main", repo]);
  git(repo, ["config", "user.name", "VOID observer proof"]);
  git(repo, ["config", "user.email", "observer-proof@void.invalid"]);
  writeFileSync(path.join(repo, "lineage.txt"), "root\n");
  git(repo, ["add", "lineage.txt"]);
  git(repo, ["commit", "-m", "root"]);

  const runtimeSource = commit(repo, "runtime source");
  const packet = commit(repo, "packet");
  const pr894 = commit(repo, "PR 894");
  const prerequisiteMain = commit(repo, "prerequisite main");
  const prerequisiteMerge = commit(repo, "PR 899");
  const repairMerge = commit(repo, "PR 902");

  const installTag = "ckpt-install-proof-v1";
  const mechanismTag = "ckpt-install-mechanism-proof-v1";
  const repairTag = "ckpt-repair-chain-proof-v1";
  git(repo, ["tag", "-a", installTag, prerequisiteMain, "-m", "install"]);
  git(repo, ["tag", mechanismTag, pr894]);
  git(repo, ["tag", "-a", repairTag, repairMerge, "-m", "repair"]);
  git(repo, ["update-ref", "refs/remotes/origin/main", repairMerge]);

  const config = {
    expected: {
      install_checkpoint_tag: installTag,
      install_checkpoint_target: prerequisiteMain,
      install_mechanism_checkpoint_tag: mechanismTag,
      install_mechanism_checkpoint_target: pr894,
      packet_commit: packet,
      pr894_merge_commit: pr894,
      prerequisite_main_commit: prerequisiteMain,
      prerequisite_merge_commit: prerequisiteMerge,
      repair_checkpoint_tag: repairTag,
      repair_checkpoint_target: repairMerge,
      repair_merge_commit: repairMerge,
      runtime_source_commit: runtimeSource,
    },
    marker: CONFIG_MARKER,
    version: 1,
  };

  const beforeRefs = git(repo, ["for-each-ref", "--format=%(refname)%09%(objectname)"]).stdout;
  const beforeStatus = git(repo, ["status", "--porcelain=v1", "--untracked-files=all"]).stdout;
  const result = observeGitCheckpointLineageV1(config, {
    repositoryRoot: repo,
    now: () => new Date("2026-08-01T16:00:00.000Z"),
  });
  const afterRefs = git(repo, ["for-each-ref", "--format=%(refname)%09%(objectname)"]).stdout;
  const afterStatus = git(repo, ["status", "--porcelain=v1", "--untracked-files=all"]).stdout;

  assert.equal(result.marker, RESULT_MARKER);
  assert.equal(result.status, "git_checkpoint_lineage_observed_exact_activation_forbidden");
  assert.equal(result.observed_at_utc, "2026-08-01T16:00:00Z");
  assert.equal(result.observation_provenance.independently_observed, true);
  assert.equal(result.observation_provenance.source, "local_git_cli");
  assert.equal(result.observations.observed_main_commit, repairMerge);
  assert.equal(result.observations.install_checkpoint.target, prerequisiteMain);
  assert.equal(result.observations.install_mechanism_checkpoint.target, pr894);
  assert.equal(result.observations.repair_checkpoint.target, repairMerge);
  assert.equal(result.observations.lineage.length, 6);
  assert.ok(result.observations.lineage.every((item) => item.verified === true));
  assert.equal(result.execution_boundary.read_only, true);
  assert.equal(result.execution_boundary.separate_activation_execution_lane_required, true);
  for (const [key, value] of Object.entries(result.execution_boundary)) {
    if (key !== "read_only" && key !== "separate_activation_execution_lane_required") {
      assert.equal(value, false, `forbidden boundary enabled: ${key}`);
    }
  }
  assert.equal(beforeRefs, afterRefs);
  assert.equal(beforeStatus, afterStatus);

  const commands = result.observation_provenance.commands;
  assert.equal(result.observation_provenance.command_count, commands.length);
  assert.ok(commands.length >= 30);
  assert.ok(commands.every((item) => item.argv[0] === "git" && item.exit_code === 0));
  const commandWords = commands.flatMap((item) => item.argv);
  for (const forbidden of ["fetch", "push", "update-ref", "checkout", "reset", "config", "credential"] ) {
    assert.equal(commandWords.includes(forbidden), false, `forbidden Git command recorded: ${forbidden}`);
  }

  const wrongTagTarget = clone(config);
  wrongTagTarget.expected.install_checkpoint_target = repairMerge;
  wrongTagTarget.expected.prerequisite_main_commit = repairMerge;
  assert.throws(
    () => observeGitCheckpointLineageV1(wrongTagTarget, { repositoryRoot: repo }),
    /install_checkpoint_tag target mismatch/,
  );

  const wrongRepair = clone(config);
  wrongRepair.expected.repair_checkpoint_target = prerequisiteMerge;
  wrongRepair.expected.repair_merge_commit = prerequisiteMerge;
  assert.throws(
    () => observeGitCheckpointLineageV1(wrongRepair, { repositoryRoot: repo }),
    /repair_checkpoint_tag target mismatch/,
  );

  const behindMain = commit(repo, "unrelated head after observed remote main");
  assert.notEqual(behindMain, repairMerge);
  git(repo, ["update-ref", "refs/remotes/origin/main", prerequisiteMerge]);
  assert.throws(
    () => observeGitCheckpointLineageV1(config, { repositoryRoot: repo }),
    /repair merge is retained by observed main failed with exit 1/,
  );
  git(repo, ["update-ref", "refs/remotes/origin/main", repairMerge]);

  const injected = clone(config);
  injected.expected.install_checkpoint_tag = "tag;touch-pwned";
  assert.throws(() => validateConfig(injected), /must be a safe tag name/);

  const extraKey = clone(config);
  extraKey.expected.unreviewed_commit = repairMerge;
  assert.throws(() => validateConfig(extraKey), /config.expected keys mismatch/);

  const configPath = path.join(root, "config.json");
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  const toolPath = fileURLToPath(new URL(
    "../tools/void-authenticated-paid-work-runtime-disabled-production-activation-prerequisite-git-observer-v1.mjs",
    import.meta.url,
  ));
  const cli = run(process.execPath, [toolPath, "--config", configPath, "--repository-root", repo]);
  const cliResult = JSON.parse(cli.stdout);
  assert.equal(cliResult.marker, RESULT_MARKER);
  assert.equal(cliResult.observation_provenance.independently_observed, true);
  assert.equal(cliResult.observations.observed_main_commit, repairMerge);

  console.log("VOID_AUTHENTICATED_PAID_WORK_DISABLED_RUNTIME_ACTIVATION_PREREQUISITE_GIT_OBSERVER_V1_PROOF_GREEN");
  console.log("local_git_observation_exact=true");
  console.log("command_provenance_complete=true");
  console.log("annotated_and_lightweight_tags_green=true");
  console.log("configured_commits_resolve_to_commit_objects=true");
  console.log("complete_ancestry_chain_exact=true");
  console.log("wrong_tag_target_rejected=true");
  console.log("stale_main_rejected=true");
  console.log("unsafe_tag_name_rejected=true");
  console.log("unexpected_config_key_rejected=true");
  console.log("repository_refs_unchanged=true");
  console.log("repository_worktree_unchanged=true");
  console.log("git_fetch=false");
  console.log("git_ref_write=false");
  console.log("credential_or_token_read=false");
  console.log("external_network_request=false");
  console.log("activation_configuration_written=false");
  console.log("service_restart=false");
  console.log("payment_execution=false");
  console.log("work_credit_write=false");
  console.log("wallet_or_signer_access=false");
  console.log("fund_movement=false");
  console.log("activation_forbidden_separate_execution_lane_required=true");
} finally {
  rmSync(root, { recursive: true, force: true });
}
