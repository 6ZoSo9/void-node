#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_REVIEWED_SOURCE_V1,
  testOnlyClassifyCoupledNativeGasReconciliationCustodySourceBindingV1,
} from "../tools/void-coupled-native-gas-reconciliation-custody-source-binding-v1.mjs";

const MARKER =
  "VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_SOURCE_BINDING_CURRENT_V2";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REVIEWED_BASE_COMMIT = "70faa71371eed9a8a0de4ffeb6c20e2c737cbc66";
const AUTO_FULFILLMENT =
  "src/economic/buy_void_auto_fulfillment_v1.ts";
const BAKERY =
  "src/economic/buy_void_filesystem_bakery_lock_v1.ts";
const HISTORICAL_AUTO_FULFILLMENT_BLOB =
  "1ac1ad6213be83f1aa8261a554caa91544fe5e09";
const CURRENT_AUTO_FULFILLMENT_BLOB =
  "b7c963b1d55f000d82ad82289b31107b432503de";
const HISTORICAL_BAKERY_BLOB =
  "03376ad9853c1ca37c5be4d7f36d9daccab25078";
const CURRENT_BAKERY_BLOB =
  "9bd47abb857368d928c0ca289766cdf3571629ba";
const CURRENT_OVERRIDES = new Map([
  [AUTO_FULFILLMENT, CURRENT_AUTO_FULFILLMENT_BLOB],
  [BAKERY, CURRENT_BAKERY_BLOB],
]);
const HEX40 = /^[0-9a-f]{40}$/u;

function closedGitEnv() {
  return {
    PATH: "/usr/bin:/bin",
    LANG: "C",
    LC_ALL: "C",
    HOME: "/nonexistent",
    XDG_CONFIG_HOME: "/nonexistent",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_SYSTEM: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_ATTR_NOSYSTEM: "1",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_TERMINAL_PROMPT: "0",
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_NO_LAZY_FETCH: "1",
    GIT_GRAFT_FILE: "/dev/null",
    GIT_ALLOW_PROTOCOL: "file",
  };
}

function git(args, allow = new Set([0])) {
  const result = spawnSync(
    "/usr/bin/git",
    [
      "--no-replace-objects",
      "--no-lazy-fetch",
      "-c", "core.fsmonitor=false",
      "-c", "core.hooksPath=/dev/null",
      "-c", "core.attributesFile=/dev/null",
      "-c", "submodule.recurse=false",
      "-C", ROOT,
      ...args,
    ],
    {
      env: closedGitEnv(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 30_000,
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  assert.equal(result.error, undefined);
  assert.ok(
    allow.has(result.status),
    "git failed: " + args.join(" ") + "\n" + String(result.stderr || ""),
  );
  return result;
}

function gitText(args) {
  return String(git(args).stdout || "").trim();
}

function gitBlobSha1(bytes) {
  return crypto
    .createHash("sha1")
    .update(Buffer.from("blob " + bytes.length + "\0", "utf8"))
    .update(bytes)
    .digest("hex");
}

function canonical(value) {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    assert.ok(Number.isSafeInteger(value));
    return String(value);
  }
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  assert.ok(value && typeof value === "object");
  return (
    "{" +
    Object.keys(value)
      .sort()
      .map((key) => JSON.stringify(key) + ":" + canonical(value[key]))
      .join(",") +
    "}"
  );
}

const historicalAutoFulfillment =
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_REVIEWED_SOURCE_V1.find(
    (row) => row.path === AUTO_FULFILLMENT,
  );
const historicalBakery =
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_REVIEWED_SOURCE_V1.find(
    (row) => row.path === BAKERY,
  );
assert.equal(
  historicalAutoFulfillment?.git_blob_sha1,
  HISTORICAL_AUTO_FULFILLMENT_BLOB,
);
assert.equal(historicalBakery?.git_blob_sha1, HISTORICAL_BAKERY_BLOB);

const currentSources =
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_REVIEWED_SOURCE_V1.map(
    (row) =>
      CURRENT_OVERRIDES.has(row.path)
        ? Object.freeze({
            path: row.path,
            git_blob_sha1: CURRENT_OVERRIDES.get(row.path),
          })
        : Object.freeze({ ...row }),
  );

const changed = currentSources.filter(
  (row, index) =>
    row.git_blob_sha1 !==
    VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_REVIEWED_SOURCE_V1[index]
      .git_blob_sha1,
);
assert.deepEqual(changed, [
  {
    path: AUTO_FULFILLMENT,
    git_blob_sha1: CURRENT_AUTO_FULFILLMENT_BLOB,
  },
  { path: BAKERY, git_blob_sha1: CURRENT_BAKERY_BLOB },
]);

function classifyCurrent(input) {
  try {
    assert.ok(input && typeof input === "object" && !Array.isArray(input));
    assert.match(input.repository_head_sha, HEX40);
    assert.match(input.repository_tree_sha, HEX40);
    assert.equal(input.worktree_clean, true);
    assert.equal(input.reviewed_base_is_ancestor, true);
    assert.equal(
      input.repository_origin,
      "https://github.com/6ZoSo9/void-node.git",
    );
    assert.equal(input.source_blobs.length, currentSources.length);
    for (let index = 0; index < currentSources.length; index += 1) {
      const want = currentSources[index];
      const got = input.source_blobs[index];
      assert.equal(got.path, want.path);
      assert.equal(got.git_blob_sha1, want.git_blob_sha1);
      assert.equal(got.worktree_git_blob_sha1, want.git_blob_sha1);
    }
    const material = {
      marker: MARKER,
      version: 2,
      repository_head_sha: input.repository_head_sha,
      repository_tree_sha: input.repository_tree_sha,
      reviewed_base_commit_sha: REVIEWED_BASE_COMMIT,
      reviewed_sources: currentSources,
      historical_v1_auto_fulfillment_git_blob_sha1:
        HISTORICAL_AUTO_FULFILLMENT_BLOB,
      current_auto_fulfillment_git_blob_sha1:
        CURRENT_AUTO_FULFILLMENT_BLOB,
      historical_v1_bakery_git_blob_sha1: HISTORICAL_BAKERY_BLOB,
      current_bakery_git_blob_sha1: CURRENT_BAKERY_BLOB,
      historical_v1_accepted: false,
      current_source_generation_bound: true,
      deployed_artifact_generation_verified: false,
      runtime_integration: false,
      production_gate_ready: false,
      funds_movement: false,
    };
    const digest = crypto
      .createHash("sha256")
      .update(canonical(material), "utf8")
      .digest("hex");
    return Object.freeze({
      ok: true,
      ...material,
      source_generation_id: "voidngrcsg2_" + digest,
    });
  } catch {
    return Object.freeze({
      ok: false,
      marker: MARKER,
      version: 2,
      current_source_generation_bound: false,
      deployed_artifact_generation_verified: false,
      runtime_integration: false,
      production_gate_ready: false,
      funds_movement: false,
    });
  }
}

const synthetic = {
  repository_head_sha: "a".repeat(40),
  repository_tree_sha: "b".repeat(40),
  repository_origin: "https://github.com/6ZoSo9/void-node.git",
  worktree_clean: true,
  reviewed_base_is_ancestor: true,
  source_blobs: currentSources.map((row) => ({
    ...row,
    worktree_git_blob_sha1: row.git_blob_sha1,
  })),
};
assert.equal(classifyCurrent(synthetic).ok, true);
for (let index = 0; index < currentSources.length; index += 1) {
  const bad = structuredClone(synthetic);
  bad.source_blobs[index].worktree_git_blob_sha1 = "0".repeat(40);
  assert.equal(classifyCurrent(bad).ok, false, currentSources[index].path);
}

const head = gitText(["rev-parse", "HEAD"]);
const tree = gitText(["rev-parse", "HEAD^{tree}"]);
const originRaw = gitText(["remote", "get-url", "origin"]);
assert.ok(
  new Set([
    "https://github.com/6ZoSo9/void-node",
    "https://github.com/6ZoSo9/void-node.git",
    "git@github.com:6ZoSo9/void-node.git",
    "ssh://git@github.com/6ZoSo9/void-node.git",
  ]).has(originRaw),
);
assert.equal(
  git(["merge-base", "--is-ancestor", REVIEWED_BASE_COMMIT, head]).status,
  0,
);

const indexFlags = String(
  git(["ls-files", "-v", "-z"]).stdout || "",
);
for (const entry of indexFlags.split("\0")) {
  if (entry) assert.ok(entry.startsWith("H "), "forbidden index flag");
}
assert.equal(
  git(["diff-index", "--cached", "--quiet", "--no-ext-diff", head, "--"]).status,
  0,
);
assert.equal(
  git(["diff-files", "--quiet", "--no-ext-diff", "--"]).status,
  0,
);
assert.equal(
  String(
    git(["ls-files", "--others", "--exclude-standard", "-z"]).stdout || "",
  ),
  "",
);

const liveRows = currentSources.map((row) => {
  const committed = gitText(["rev-parse", head + ":" + row.path]);
  const absolute = path.join(ROOT, row.path);
  const visible = fs.lstatSync(absolute);
  assert.ok(visible.isFile() && !visible.isSymbolicLink(), row.path);
  const bytes = fs.readFileSync(absolute);
  const worktree = gitBlobSha1(bytes);
  assert.equal(committed, row.git_blob_sha1, "commit drift: " + row.path);
  assert.equal(worktree, row.git_blob_sha1, "worktree drift: " + row.path);
  return {
    path: row.path,
    git_blob_sha1: committed,
    worktree_git_blob_sha1: worktree,
  };
});

const liveInput = {
  repository_head_sha: head,
  repository_tree_sha: tree,
  repository_origin: "https://github.com/6ZoSo9/void-node.git",
  worktree_clean: true,
  reviewed_base_is_ancestor: true,
  source_blobs: liveRows,
};

const current = classifyCurrent(liveInput);
assert.equal(current.ok, true);
assert.equal(current.current_source_generation_bound, true);
assert.equal(current.deployed_artifact_generation_verified, false);
assert.equal(current.production_gate_ready, false);

const historical =
  testOnlyClassifyCoupledNativeGasReconciliationCustodySourceBindingV1(
    liveInput,
  );
assert.equal(historical.ok, false);
if (historical.ok) throw new Error("historical V1 unexpectedly accepted");
assert.equal(
  historical.reason,
  "source_binding_reviewed_source_drift:" + AUTO_FULFILLMENT,
);
assert.equal(historical.production_gate_ready, false);

console.log(MARKER + "_GREEN");
console.log("repository_head_sha=" + head);
console.log("repository_tree_sha=" + tree);
console.log("reviewed_source_count=" + currentSources.length);
console.log(
  "historical_v1_auto_fulfillment_git_blob_sha1=" +
    HISTORICAL_AUTO_FULFILLMENT_BLOB,
);
console.log(
  "current_auto_fulfillment_git_blob_sha1=" +
    CURRENT_AUTO_FULFILLMENT_BLOB,
);
console.log("historical_v1_bakery_git_blob_sha1=" + HISTORICAL_BAKERY_BLOB);
console.log("current_bakery_git_blob_sha1=" + CURRENT_BAKERY_BLOB);
console.log("historical_v1_expected_hold=true");
console.log("current_source_generation_bound=true");
console.log("source_generation_id=" + current.source_generation_id);
console.log("deployed_artifact_generation_verified=false");
console.log("runtime_integration=false");
console.log("production_gate_ready=false");
console.log("funds_movement=false");
