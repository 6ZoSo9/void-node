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
const VENV_NAME = "void-war-college-runtime-venv-v1";
const SOURCE_HEAD = "ce0d29e5bcb91d0f3746d81905956410f13a55f5";
const PYPROJECT_BLOB = "6a32df4cab3e4198cee6ca426bea1e6ccb36533f";

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

function writeReceipt(dir, rows) {
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
      symlink_descendants: rows,
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

function makeVenv(root, changed = false) {
  const venv = path.join(root, VENV_NAME);
  fs.mkdirSync(path.join(venv, "bin"), { recursive: true });
  fs.mkdirSync(path.join(venv, "include"), { recursive: true });
  fs.mkdirSync(path.join(venv, "lib"), { recursive: true });

  fs.writeFileSync(
    path.join(venv, ".void-war-college-runtime-venv-v1.json"),
    JSON.stringify({
      marker: "VOID_WAR_COLLEGE_RUNTIME_VENV_V1",
      source_head: SOURCE_HEAD,
      pyproject_blob: PYPROJECT_BLOB,
      dependencies_requested: [
        "grpcio>=1.60.0",
        "grpcio-tools>=1.60.0",
        "protobuf>=4.25.0",
      ],
      pip_freeze: ["fixture==1"],
      sudo_used: false,
      systemd_action: false,
      runtime_execution: false,
    }, null, 2) + "\n",
    { mode: 0o600 },
  );

  const links = [
    [path.join(venv, "bin", "python"), "python3"],
    [
      path.join(venv, "bin", "python3"),
      changed ? "/usr/bin/python3.11" : "/usr/bin/python3.12",
    ],
    [path.join(venv, "bin", "python3.12"), "python3"],
    [path.join(venv, "lib64"), "lib"],
  ];
  for (const [link, target] of links) fs.symlinkSync(target, link);
  return links.map(([link]) => link);
}

const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-epoch2-war-college-venv-symlink-"),
);

try {
  const acceptedRoot = path.join(temp, "accepted");
  fs.mkdirSync(acceptedRoot);
  const acceptedLinks = makeVenv(acceptedRoot);
  writeReceipt(acceptedRoot, acceptedLinks.map(symlinkRow));

  const accepted = run(acceptedRoot);
  assert.equal(accepted.status, 0, accepted.stderr);
  assert.match(
    accepted.stdout,
    /FULL_SIGNED_ARTIFACT_CONTENT_SWEEP_V1_GREEN/,
  );
  assert.match(accepted.stdout, /symlink_descendant_count=4/);
  assert.match(accepted.stdout, /symlink_internal_alias_count=0/);
  assert.match(
    accepted.stdout,
    /reviewed_war_college_runtime_venv_symlink_count=4/,
  );
  assert.match(
    accepted.stdout,
    /reviewed_war_college_runtime_venv_symlink_target_bytes=36/,
  );
  assert.match(
    accepted.stdout,
    /reviewed_war_college_runtime_venv_symlink_target_followed=false/,
  );
  assert.match(accepted.stdout, /symlink_external_target_count=0/);

  const changedRoot = path.join(temp, "changed");
  fs.mkdirSync(changedRoot);
  const changedLinks = makeVenv(changedRoot, true);
  writeReceipt(changedRoot, changedLinks.map(symlinkRow));

  const changed = run(changedRoot);
  assert.notEqual(changed.status, 0);
  assert.match(
    changed.stderr,
    /war_college_runtime_venv_symlink_target_mismatch/,
  );

  const externalRoot = path.join(temp, "external");
  fs.mkdirSync(externalRoot);
  const externalTarget = path.join(temp, "outside-target");
  fs.writeFileSync(externalTarget, "fixture\n", { mode: 0o600 });
  const externalLink = path.join(externalRoot, "unrelated-external-link");
  fs.symlinkSync(externalTarget, externalLink);
  writeReceipt(externalRoot, [symlinkRow(externalLink)]);

  const external = run(externalRoot);
  assert.notEqual(external.status, 0);
  assert.match(
    external.stderr,
    /external_symlink_target_requires_review/,
  );

  const source = fs.readFileSync(TOOL, "utf8");
  assert.match(source, /REVIEWED_WAR_COLLEGE_RUNTIME_VENV_SYMLINK/);
  assert.match(
    source,
    /war_college_runtime_venv_symlink_target_mismatch/,
  );
  assert.ok(source.includes(SOURCE_HEAD));
  assert.ok(source.includes(PYPROJECT_BLOB));
  assert.ok(source.includes("/usr/bin/python3.12"));

  console.log(
    "VOID_ECONOMIC_EPOCH2_WAR_COLLEGE_RUNTIME_VENV_SYMLINK_V1_PROOF_GREEN",
  );
  console.log("war_college_runtime_venv_symlink_metadata_proven=true");
  console.log("war_college_runtime_venv_changed_target_rejected=true");
  console.log("unrelated_external_symlink_still_rejected=true");
  console.log("war_college_runtime_venv_symlink_target_followed=false");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
