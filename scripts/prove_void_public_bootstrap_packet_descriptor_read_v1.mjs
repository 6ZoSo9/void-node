#!/usr/bin/env node
// No repository or production write. All adversaries act on OS temporary files.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readBytes, assertCleanExactRepository } from "./lib/void_public_bootstrap_manifest_publication_contract_v1.mjs";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-publication-fd-reader-v1-"));
const nested = path.join(root, "data", "nested");
const file = path.join(nested, "candidate.json");
const outside = path.join(root, "outside");
const write = (name, bytes) => fs.writeFileSync(name, bytes, { mode: 0o600 });
try {
  fs.mkdirSync(nested, { recursive: true });
  fs.mkdirSync(outside, { recursive: true });
  write(file, "SAFE!");
  write(path.join(outside, "candidate.json"), "X".repeat(128 * 1024));
  assert.equal(readBytes(file, "candidate", 64).toString(), "SAFE!");
  assert.throws(() => readBytes(file, "candidate", 4),
    /bounded single-link regular file/);
  assert.throws(() => readBytes(file, "candidate", Number.POSITIVE_INFINITY),
    /invalid maximum byte count/);

  fs.renameSync(file, path.join(nested, "moved.json"));
  fs.symlinkSync(path.join(outside, "candidate.json"), file);
  assert.throws(() => readBytes(file, "candidate", 64));
  fs.rmSync(file);
  fs.renameSync(path.join(nested, "moved.json"), file);

  fs.linkSync(file, path.join(nested, "hardlink.json"));
  assert.throws(() => readBytes(file, "candidate", 64),
    /bounded single-link regular file/);
  fs.rmSync(path.join(nested, "hardlink.json"));

  const originalOpen = fs.openSync;
  let swapped = false;
  // A replaced ancestor cannot change where a pinned directory FD resolves.
  try {
    fs.openSync = function (name, ...args) {
      if (typeof name === "string" && name.endsWith("/nested") && !swapped) {
        swapped = true;
        fs.renameSync(nested, nested + "-held");
        fs.symlinkSync(outside, nested);
      }
      return originalOpen.call(this, name, ...args);
    };
    assert.throws(() => readBytes(file, "candidate", 64));
    assert.equal(swapped, true);
  } finally {
    fs.openSync = originalOpen;
    fs.rmSync(nested, { force: true });
    fs.renameSync(nested + "-held", nested);
  }

  swapped = false;
  try {
    fs.openSync = function (name, ...args) {
      if (typeof name === "string" &&
          name.endsWith("/candidate.json") &&
          name.startsWith("/proc/self/fd/") && !swapped) {
        swapped = true;
        fs.renameSync(nested, nested + "-held");
        fs.symlinkSync(outside, nested);
      }
      return originalOpen.call(this, name, ...args);
    };
    assert.throws(() => readBytes(file, "candidate", 64),
      /changed file\/path identity/);
    assert.equal(swapped, true);
  } finally {
    fs.openSync = originalOpen;
    fs.rmSync(nested, { force: true });
    fs.renameSync(nested + "-held", nested);
  }

  swapped = false;
  try {
    fs.openSync = function (name, ...args) {
      if (typeof name === "string" &&
          name.endsWith("/candidate.json") &&
          name.startsWith("/proc/self/fd/") && !swapped) {
        swapped = true;
        fs.renameSync(file, file + ".held");
        write(file, "EVIL!");
      }
      return originalOpen.call(this, name, ...args);
    };
    assert.throws(() => readBytes(file, "candidate", 64),
      /descriptor changed before reading/);
    assert.equal(swapped, true);
  } finally {
    fs.openSync = originalOpen;
    fs.rmSync(file, { force: true });
    fs.renameSync(file + ".held", file);
  }

  const originalRead = fs.readSync;
  let total = 0;
  let max = 0;
  let grew = false;
  try {
    fs.readSync = function (fd, buffer, offset, length, position) {
      if (!grew) {
        grew = true;
        fs.appendFileSync(file, Buffer.alloc(2 * 1024 * 1024));
      }
      max = Math.max(max, length);
      const n = originalRead.call(this, fd, buffer, offset, length, position);
      total += n;
      return n;
    };
    assert.throws(() => readBytes(file, "candidate", 64),
      /changed size during bounded read/);
    assert.equal(grew, true);
    assert.equal(max, 6);
    assert.equal(total, 6);
  } finally {
    fs.readSync = originalRead;
  }


  // A dirty publication source must never appear clean because the operator's
  // inherited environment points git -C at a separate clean checkout.
  const genuine = path.join(root, "git-genuine");
  const decoy = path.join(root, "git-decoy");
  fs.mkdirSync(genuine);
  const fixtureGitEnv = Object.freeze({
    PATH: "/usr/bin:/bin",
    HOME: "/nonexistent",
    LC_ALL: "C",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_SYSTEM: "/dev/null",
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_TERMINAL_PROMPT: "0",
  });
  function gitFixture(args, cwd = genuine) {
    const result = spawnSync("/usr/bin/git", ["-C", cwd, ...args], {
      encoding: "utf8",
      env: fixtureGitEnv,
      stdio: ["ignore", "pipe", "pipe"],
    });
    assert.equal(result.status, 0, result.stderr || "fixture Git failed");
    return result.stdout.trim();
  }
  gitFixture(["init", "-q"]);
  const tracked = path.join(genuine, "manifest.txt");
  write(tracked, "fixture\\n");
  gitFixture(["add", "manifest.txt"]);
  gitFixture([
    "-c", "user.name=VOID Proof",
    "-c", "user.email=void-proof@example.invalid",
    "-c", "commit.gpgSign=false",
    "commit", "-q", "-m", "fixture",
  ]);
  const expectedSourceSha = gitFixture(["rev-parse", "HEAD"]);
  const clone = spawnSync("/usr/bin/git", ["clone", "-q", genuine, decoy], {
    encoding: "utf8", env: fixtureGitEnv, stdio: ["ignore", "pipe", "pipe"],
  });
  assert.equal(clone.status, 0, clone.stderr || "fixture clone failed");
  assert.equal(assertCleanExactRepository(genuine, expectedSourceSha).sourceSha,
    expectedSourceSha);
  fs.appendFileSync(tracked, "uncommitted\\n");
  // The original git-status-only admission accepted a modified worktree
  // hidden by assume-unchanged/skip-worktree index flags as CLEAN.
  for (const [kind, enable, disable] of [
    ["assume-unchanged", "--assume-unchanged", "--no-assume-unchanged"],
    ["skip-worktree", "--skip-worktree", "--no-skip-worktree"],
  ]) {
    gitFixture(["update-index", enable, "manifest.txt"]);
    try {
      assert.equal(gitFixture(["status", "--porcelain=v1", "--untracked-files=all"]), "",
        `${kind} fixture must hide modified worktree from git status`);
      assert.throws(() => assertCleanExactRepository(genuine, expectedSourceSha),
        /concealed or noncanonical Git index flags/, `${kind} must HOLD`);
    } finally {
      gitFixture(["update-index", disable, "manifest.txt"]);
    }
  }
  const injected = {
    GIT_DIR: path.join(decoy, ".git"),
    GIT_WORK_TREE: decoy,
    GIT_INDEX_FILE: path.join(decoy, ".git", "index"),
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: "core.fsmonitor",
    GIT_CONFIG_VALUE_0: "false",
  };
  const previous = Object.fromEntries(
    Object.keys(injected).map((key) => [key, process.env[key]]),
  );
  try {
    Object.assign(process.env, injected);
    // The fake checkout has the SAME commit and is clean. The real source
    // is dirty; a Git invocation trusting inherited GIT_DIR gives false GREEN.
    assert.throws(() => assertCleanExactRepository(genuine, expectedSourceSha),
      /repository must be completely clean/);
    write(tracked, "fixture\\n");
    write(path.join(decoy, "manifest.txt"), "spoofed\\n");
    gitFixture(["add", "manifest.txt"], decoy);
    gitFixture([
      "-c", "user.name=VOID Proof",
      "-c", "user.email=void-proof@example.invalid",
      "-c", "commit.gpgSign=false",
      "commit", "-q", "-m", "spoof",
    ], decoy);
    assert.notEqual(gitFixture(["rev-parse", "HEAD"], decoy), expectedSourceSha);
    assert.equal(assertCleanExactRepository(genuine, expectedSourceSha).sourceSha,
      expectedSourceSha);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }

  console.log("VOID_PUBLICATION_PACKET_DESCRIPTOR_READER_V1_GREEN");
  console.log("positive_read=true");
  console.log("leaf_symlink_rejected=true");
  console.log("hardlink_rejected=true");
  console.log("ancestor_swap_before_open_rejected=true");
  console.log("ancestor_swap_after_pin_rejected=true");
  console.log("same_size_leaf_swap_rejected=true");
  console.log("growth_read_bounded_to_initial_size_plus_one=true");
  console.log("ambient_git_dir_and_worktree_cannot_hide_dirty_repository=true");
  console.log("ambient_git_config_and_index_cannot_override_source_identity=true");
  console.log("assume_unchanged_flag_cannot_hide_dirty_source=true");
  console.log("skip_worktree_flag_cannot_hide_dirty_source=true");
  console.log("git_fsmonitor_shortcuts_disabled=true");
  console.log("source_repository_mutation=false");
  console.log("live_service_or_network_access=false");
  console.log("funds_movement=false");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
