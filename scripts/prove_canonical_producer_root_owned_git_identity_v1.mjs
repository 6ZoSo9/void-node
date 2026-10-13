#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const MARKER = "VOID_CANONICAL_PRODUCER_ROOT_OWNED_GIT_IDENTITY_V1";
const launcher = fs.readFileSync("ops/run-void-node-live-v1.sh", "utf8");

for (const token of [
  "source_git() {",
  '-c "safe.directory=$ROOT"',
  "GIT_CONFIG_GLOBAL=/dev/null",
  "GIT_CONFIG_SYSTEM=/dev/null",
  "GIT_NO_REPLACE_OBJECTS=1",
  "GIT_OPTIONAL_LOCKS=0",
  "-u GIT_DIR",
  "-u GIT_WORK_TREE",
  "-u GIT_INDEX_FILE",
  "-u GIT_OBJECT_DIRECTORY",
  "-u GIT_ALTERNATE_OBJECT_DIRECTORIES",
  "-u GIT_CONFIG_PARAMETERS",
  "-u GIT_CONFIG_COUNT",
  "-u GIT_EXEC_PATH",
]) {
  assert.ok(launcher.includes(token), `launcher missing bounded Git token: ${token}`);
}

assert.ok(!launcher.includes("git config --global"),
  "launcher must never mutate global Git safe.directory state");

for (const forbidden of [
  'source_commit_before="$(git ',
  'source_tree_before="$(git ',
  'source_branch_before="$(git ',
  'source_status_before="$(git ',
  'source_commit_after="$(git ',
  'source_tree_after="$(git ',
  'source_branch_after="$(git ',
  'source_status_after="$(git ',
  'producer_index_blob="$(git ',
  'tracked_index_blob="$(git ',
]) {
  assert.ok(!launcher.includes(forbidden), `plain launcher Git read remains: ${forbidden}`);
}

for (const required of [
  'source_commit_before="$(source_git rev-parse',
  'source_tree_before="$(source_git rev-parse',
  'source_branch_before="$(source_git symbolic-ref',
  'source_status_before="$(source_git status',
  'source_commit_after="$(source_git rev-parse',
  'source_tree_after="$(source_git rev-parse',
  'source_branch_after="$(source_git symbolic-ref',
  'source_status_after="$(source_git status',
  'producer_index_blob="$(source_git hash-object',
  'tracked_index_blob="$(source_git rev-parse',
]) {
  assert.ok(launcher.includes(required), `reviewed Git route missing: ${required}`);
}

assert.notEqual(process.getuid?.(), 0, "proof must run unprivileged");

const fixture =
  "/var/lib/void-root-owned-git-proof-" +
  String(process.pid) + "-" + String(process.getuid());
assert.match(fixture, /^\/var\/lib\/void-root-owned-git-proof-[0-9]+-[0-9]+$/);

function sudo(...args) {
  const r = spawnSync("sudo", ["-n", ...args], {
    encoding: "utf8",
    timeout: 12000,
  });
  assert.equal(r.error, undefined, "sudo unavailable");
  assert.equal(r.status, 0, "fixture sudo failed: " + args.join(" "));
}

const gitEnv = {
  PATH: "/usr/bin:/bin",
  HOME: os.tmpdir(),
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_SYSTEM: "/dev/null",
  GIT_NO_REPLACE_OBJECTS: "1",
  GIT_OPTIONAL_LOCKS: "0",
  GIT_TERMINAL_PROMPT: "0",
  GIT_ASKPASS: "/bin/false",
};

function globalSafeDirectorySnapshot() {
  const r = spawnSync("git", ["config", "--global", "--get-all", "safe.directory"], {
    encoding: "utf8",
    timeout: 3000,
    env: { ...process.env },
  });
  assert.ok(r.status === 0 || r.status === 1, r.stderr);
  return r.stdout;
}

const globalBefore = globalSafeDirectorySnapshot();

try {
  sudo("install", "-d", "-m", "0755", fixture);
  sudo("git", "-C", fixture, "init", "-q", "-b", "main");
  sudo("git", "-C", fixture, "config", "user.name", "VOID custody proof");
  sudo("git", "-C", fixture, "config", "user.email", "void-custody-proof@invalid");
  sudo("install", "-m", "0644", "/dev/null", path.join(fixture, "source.txt"));
  sudo("git", "-C", fixture, "add", "source.txt");
  sudo("git", "-C", fixture, "commit", "-q", "-m", "root-owned fixture");

  const plain = spawnSync("git", ["-C", fixture, "rev-parse", "HEAD"], {
    encoding: "utf8",
    timeout: 3000,
    env: gitEnv,
  });
  assert.notEqual(plain.status, 0,
    "ordinary unprivileged Git unexpectedly trusted root-owned fixture");
  assert.match(plain.stderr, /dubious ownership|safe\.directory/i);

  const reviewed = spawnSync(
    "git",
    ["-c", "safe.directory=" + fixture, "-C", fixture, "rev-parse", "HEAD"],
    { encoding: "utf8", timeout: 3000, env: gitEnv },
  );
  assert.equal(reviewed.status, 0, reviewed.stderr);
  assert.match(reviewed.stdout.trim(), /^[0-9a-f]{40}$/);

  const status = spawnSync(
    "git",
    ["-c", "safe.directory=" + fixture, "-C", fixture, "status", "--porcelain=v1"],
    { encoding: "utf8", timeout: 3000, env: gitEnv },
  );
  assert.equal(status.status, 0, status.stderr);
  assert.equal(status.stdout, "");

  assert.equal(globalSafeDirectorySnapshot(), globalBefore,
    "command-scoped safe.directory changed global Git configuration");

  console.log(MARKER + "_GREEN");
  console.log("plain_git_root_owned_fixture_rejected=true");
  console.log("exact_root_safe_directory_git_read_green=true");
  console.log("exact_root_safe_directory_status_green=true");
  console.log("global_git_config_mutation=false");
  console.log("production_runtime_mutation=false");
} finally {
  sudo("rm", "-rf", "--", fixture);
}
