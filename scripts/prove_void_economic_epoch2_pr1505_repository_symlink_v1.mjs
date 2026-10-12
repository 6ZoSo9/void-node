#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const STAMP = "20260928T162432Z";
const MARKER = "VOID_ECONOMIC_EPOCH2_SIGNED_ARTIFACT_METADATA_CENSUS_V1";
const STATUS = "METADATA_CENSUS_READY_OPERATOR_REVIEW_REQUIRED";
const TOOL = "tools/void-economic-epoch2-full-signed-artifact-content-sweep-v1.mjs";
const REVIEWED_TARGET = "/usr/local/bin/prom-textfile-snap-age.sh";
const REVIEWED_BLOB = "4d8b82d38eee4814462b9e21f21102361b35f7e5";

const sha256 = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

function symlinkRow(file) {
  const stat = fs.lstatSync(file);
  return {
    source_kind: "symlink_descendant",
    absolute_path: file,
    path_sha256: sha256(file),
    basename: path.basename(file),
    size_bytes: stat.size,
    mode_octal: (stat.mode & 0o777).toString(8).padStart(3, "0"),
    candidate_name_hint: false,
    content_read: false,
    symlink_target_read: false,
    followed: false,
  };
}

function writeReceipt(dir, row) {
  const file = path.join(
    dir,
    "void_epoch2_signed_artifact_metadata_census_precision_v1_" +
      STAMP +
      "_root_batch_01.json",
  );
  fs.writeFileSync(
    file,
    JSON.stringify({
      marker: MARKER,
      version: 1,
      status: STATUS,
      scanned_file_content_read: false,
      files: [],
      symlink_descendants: [row],
      skipped_generated_subtrees: [],
      skipped_depth_subtrees: [],
    }) + "\n",
    { mode: 0o600 },
  );
  fs.chmodSync(file, 0o600);
}

function run(dir) {
  return spawnSync(
    process.execPath,
    [
      TOOL,
      "--receipt-dir",
      dir,
      "--stamp",
      STAMP,
      "--apply",
      "--confirmation",
      "scanApprovedVoidArtifactContentsForSignedTransactions",
    ],
    { encoding: "utf8" },
  );
}

function cacheLink(root, cacheName, target) {
  const ops = path.join(root, cacheName, "worktree", "ops");
  fs.mkdirSync(ops, { recursive: true });
  const link = path.join(ops, "prom-textfile-snap-age.sh");
  fs.symlinkSync(target, link);
  return link;
}

const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-epoch2-pr1505-symlink-"),
);

try {
  const acceptedRoot = path.join(temp, "accepted");
  fs.mkdirSync(acceptedRoot);
  const acceptedLink = cacheLink(
    acceptedRoot,
    "void-pr1505-exec-digest-cache-v2-a1b2c3d4",
    REVIEWED_TARGET,
  );
  writeReceipt(acceptedRoot, symlinkRow(acceptedLink));

  const accepted = run(acceptedRoot);
  assert.equal(accepted.status, 0, accepted.stderr);
  assert.match(
    accepted.stdout,
    /FULL_SIGNED_ARTIFACT_CONTENT_SWEEP_V1_GREEN/,
  );
  assert.match(accepted.stdout, /symlink_descendant_count=1/);
  assert.match(accepted.stdout, /symlink_internal_alias_count=0/);
  assert.match(
    accepted.stdout,
    /reviewed_pr1505_repository_symlink_count=1/,
  );
  assert.match(
    accepted.stdout,
    /reviewed_pr1505_repository_symlink_target_bytes=40/,
  );
  assert.match(
    accepted.stdout,
    /reviewed_pr1505_repository_symlink_target_followed=false/,
  );
  assert.match(accepted.stdout, /symlink_external_target_count=0/);

  const mismatchRoot = path.join(temp, "mismatch");
  fs.mkdirSync(mismatchRoot);
  const mismatchLink = cacheLink(
    mismatchRoot,
    "void-pr1505-exec-digest-cache-v3-z9y8x7w6",
    "/usr/local/bin/prom-textfile-snap-age-NOT-REVIEWED.sh",
  );
  writeReceipt(mismatchRoot, symlinkRow(mismatchLink));

  const mismatch = run(mismatchRoot);
  assert.notEqual(mismatch.status, 0);
  assert.match(
    mismatch.stderr,
    /pr1505_repository_symlink_target_identity_mismatch/,
  );

  const unrelatedRoot = path.join(temp, "unrelated");
  fs.mkdirSync(unrelatedRoot);
  const unrelatedLink = path.join(unrelatedRoot, "unrelated-broken-link");
  fs.symlinkSync(
    path.join(unrelatedRoot, "definitely-absent-target"),
    unrelatedLink,
  );
  writeReceipt(unrelatedRoot, symlinkRow(unrelatedLink));

  const unrelated = run(unrelatedRoot);
  assert.notEqual(unrelated.status, 0);
  assert.match(unrelated.stderr, /broken_symlink_requires_review/);

  const source = fs.readFileSync(TOOL, "utf8");
  assert.match(
    source,
    /REVIEWED_PR1505_EXEC_DIGEST_CACHE_REPOSITORY_SYMLINK/,
  );
  assert.ok(source.includes(REVIEWED_TARGET));
  assert.ok(source.includes(REVIEWED_BLOB));
  assert.match(
    source,
    /pr1505_repository_symlink_target_identity_mismatch/,
  );

  console.log(
    "VOID_ECONOMIC_EPOCH2_PR1505_REPOSITORY_SYMLINK_V1_PROOF_GREEN",
  );
  console.log("pr1505_repository_symlink_metadata_proven=true");
  console.log("pr1505_repository_symlink_changed_target_rejected=true");
  console.log("unrelated_broken_symlink_still_rejected=true");
  console.log("pr1505_repository_symlink_target_followed=false");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
