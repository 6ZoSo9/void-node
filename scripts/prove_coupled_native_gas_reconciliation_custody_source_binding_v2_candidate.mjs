#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_REVIEWED_SOURCE_MANIFEST_SHA256_V1,
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_REVIEWED_SOURCE_V1,
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_SOURCE_BINDING_V1,
} from "../tools/void-coupled-native-gas-reconciliation-custody-source-binding-v1.mjs";

export const VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_SOURCE_BINDING_V2_CANDIDATE =
  "VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_SOURCE_BINDING_V2_CANDIDATE";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_STACK_HEAD =
  "b0f7189af0d29769ec701bd590e0df81b23b5c07";
const PREDECESSOR_REVIEWED_BASE =
  "70faa71371eed9a8a0de4ffeb6c20e2c737cbc66";
const BAKERY_PATH =
  "src/economic/buy_void_filesystem_bakery_lock_v1.ts";
const PREDECESSOR_BAKERY_BLOB =
  "03376ad9853c1ca37c5be4d7f36d9daccab25078";
const CANDIDATE_BAKERY_BLOB =
  "9bd47abb857368d928c0ca289766cdf3571629ba";

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
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonical).join(",") + "]";
  }
  if (value && typeof value === "object") {
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonical(value[key]))
        .join(",") +
      "}"
    );
  }
  throw new Error("source_binding_v2_candidate_noncanonical_value");
}

function sha256Canonical(value) {
  return crypto
    .createHash("sha256")
    .update(canonical(value), "utf8")
    .digest("hex");
}

function assertGenerationStable() {
  const ancestor = spawnSync(
    "git",
    ["merge-base", "--is-ancestor", SOURCE_STACK_HEAD, "HEAD"],
    { cwd: ROOT, stdio: "ignore" },
  );
  assert.equal(
    ancestor.status,
    0,
    "candidate HEAD must descend from the reviewed bakery-lock repair head",
  );

  const paths =
    VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_REVIEWED_SOURCE_V1
      .map((row) => row.path);
  const diff = spawnSync(
    "git",
    ["diff", "--quiet", SOURCE_STACK_HEAD, "HEAD", "--", ...paths],
    { cwd: ROOT, stdio: "ignore" },
  );
  assert.equal(
    diff.status,
    0,
    "reviewed native-gas custody source set drifted after source stack head",
  );
  const worktree = spawnSync(
    "git",
    ["diff", "--quiet", "HEAD", "--", ...paths],
    { cwd: ROOT, stdio: "ignore" },
  );
  assert.equal(
    worktree.status,
    0,
    "reviewed native-gas custody worktree differs from exact HEAD",
  );
  const index = spawnSync(
    "git",
    ["diff", "--cached", "--quiet", "HEAD", "--", ...paths],
    { cwd: ROOT, stdio: "ignore" },
  );
  assert.equal(
    index.status,
    0,
    "reviewed native-gas custody index differs from exact HEAD",
  );
}

function derive() {
  assertGenerationStable();

  const currentSources =
    VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_REVIEWED_SOURCE_V1.map(
      (predecessor) => {
        const bytes = fs.readFileSync(path.join(ROOT, predecessor.path));
        return Object.freeze({
          path: predecessor.path,
          git_blob_sha1: gitBlobSha1(bytes),
        });
      },
    );

  const changed = [];
  for (let index = 0; index < currentSources.length; index += 1) {
    const current = currentSources[index];
    const predecessor =
      VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_REVIEWED_SOURCE_V1[index];
    if (current.git_blob_sha1 !== predecessor.git_blob_sha1) {
      changed.push(current.path);
    }
  }

  assert.deepEqual(
    changed,
    [BAKERY_PATH],
    "source-binding V2 candidate must change only bakery-lock source",
  );
  assert.equal(
    VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_REVIEWED_SOURCE_V1.find(
      (row) => row.path === BAKERY_PATH,
    )?.git_blob_sha1,
    PREDECESSOR_BAKERY_BLOB,
    "historical bakery source identity drifted",
  );
  assert.equal(
    currentSources.find((row) => row.path === BAKERY_PATH)?.git_blob_sha1,
    CANDIDATE_BAKERY_BLOB,
    "repaired bakery source identity mismatch",
  );

  const manifestBody = Object.freeze({
    marker:
      "VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_SOURCE_BINDING_V2",
    version: 2,
    reviewed_base_commit_sha: SOURCE_STACK_HEAD,
    predecessor: Object.freeze({
      marker:
        VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_SOURCE_BINDING_V1,
      reviewed_base_commit_sha: PREDECESSOR_REVIEWED_BASE,
      reviewed_source_manifest_sha256:
        VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_REVIEWED_SOURCE_MANIFEST_SHA256_V1,
      bakery_lock_git_blob_sha1: PREDECESSOR_BAKERY_BLOB,
    }),
    reviewed_sources: Object.freeze(currentSources),
  });
  const manifestSha256 = sha256Canonical(manifestBody);

  return Object.freeze({
    schema:
      "void_coupled_native_gas_reconciliation_custody_source_binding_v2_candidate_v1",
    marker:
      VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_SOURCE_BINDING_V2_CANDIDATE,
    version: 1,
    source_stack_head: SOURCE_STACK_HEAD,
    predecessor_reviewed_source_manifest_sha256:
      VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_REVIEWED_SOURCE_MANIFEST_SHA256_V1,
    candidate_reviewed_source_manifest_sha256: manifestSha256,
    predecessor_bakery_lock_git_blob_sha1: PREDECESSOR_BAKERY_BLOB,
    candidate_bakery_lock_git_blob_sha1: CANDIDATE_BAKERY_BLOB,
    changed_source_paths: Object.freeze(changed),
    reviewed_source_count: currentSources.length,
    reviewed_sources: Object.freeze(currentSources),
    candidate_manifest_accepted: false,
    deployed_artifact_generation_verified: false,
    trusted_collector_proven: false,
    live_host_qualification_performed: false,
    runtime_integration: false,
    payment_acceptance: false,
    production_gate_ready: false,
    funds_movement: false,
  });
}

assert.deepEqual(
  process.argv.slice(2),
  ["--derive"],
  "derive-only candidate: use --derive",
);
process.stdout.write(JSON.stringify(derive(), null, 2) + "\n");
