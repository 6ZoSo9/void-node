#!/usr/bin/env node
// Composed source/STOPPED-image package evidence only.
// The real saga source is byte-checked but never imported or executed.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  readDescriptorRelativeLinuxV1,
} from "./prove_buy_void_enforcement_descriptor_relative_linux_v1.mjs";
import {
  runReviewedGitV1,
  proveReviewedGitV1Synthetic,
} from "./prove_buy_void_reviewed_git_invocation_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_PARENT = "eeef850affd912a0d1e019bfac2d681b38ea24ed";
const DOCKERFILE_GIT_BLOB = "2acd9bcf0416eeb0f9fd72c1a556696863ff1607";
const ECONOMIC_SOURCE_GIT_BLOB = "acf2f88b513bbe50e192531f9fc8d261b69bd0f1";
const SOURCE_SAGA_GIT_BLOB = "d6a2d1cd82e5e255f435c1e21d1783774a44b2b1";
const ECONOMIC_SOURCE =
  "src/economic/buy_void_erc20_execution_composition_v1.ts";
const COMPILED_IMPORTER =
  "dist/economic/buy_void_erc20_execution_composition_v1.js";
const COMPILED_IMPORTER_SHA256 =
  "b243a1611bceff0a7d758aeaaebf4e74c2bad6b762595ff0e13804e11b5c2af1";
const COMPILED_IMPORTER_BYTES = 86455;
const SAGA = "buy-void-crash-consistent-fulfillment-saga-v1.mjs";
const SAGA_SOURCE = "tools/" + SAGA;
const SAGA_SIZE = 58023;
const SAGA_SHA256 =
  "e94b2c5c2da0a4849acab936d0d7f8710f2d2229909d73bc679a83c63f777e01";
const BROADCASTER =
  "buy-void-prepared-transaction-broadcaster-service-v1.mjs";
const CUSTODIAN =
  "buy-void-prepared-transaction-custodian-service-v1.mjs";
const EXISTING_POSITIVE = "void-wc-void-coupled-launch-readiness-v1.mjs";

const sha256 = (bytes) =>
  crypto.createHash("sha256").update(bytes).digest("hex");
const gitBlob = (bytes) =>
  crypto.createHash("sha1")
    .update(Buffer.from("blob " + bytes.length + "\0", "utf8"))
    .update(bytes)
    .digest("hex");

function readPinned(relativePath, maxBytes = 16 * 1024 * 1024) {
  return readDescriptorRelativeLinuxV1(ROOT, relativePath, maxBytes);
}

function reviewedSourceBoundary() {
  runReviewedGitV1(
    ["merge-base", "--is-ancestor", SOURCE_PARENT, "HEAD"],
    ROOT,
  );
  runReviewedGitV1(
    [
      "diff",
      "--quiet",
      "--no-ext-diff",
      "--no-textconv",
      SOURCE_PARENT,
      "HEAD",
      "--",
      ECONOMIC_SOURCE,
      SAGA_SOURCE,
      "package.json",
      "package-lock.json",
      "tsconfig.json",
      "tsconfig.build.json",
    ],
    ROOT,
  );
}

function originalSaga() {
  const saga = readPinned(SAGA_SOURCE, 128 * 1024);
  assert.equal(saga.length, SAGA_SIZE, "reviewed saga source size drift");
  assert.equal(sha256(saga), SAGA_SHA256, "reviewed saga source SHA-256 drift");
  assert.equal(
    gitBlob(saga),
    SOURCE_SAGA_GIT_BLOB,
    "reviewed saga source Git blob drift",
  );
  return saga;
}

function sourceProbe() {
  reviewedSourceBoundary();

  const docker = readPinned("Dockerfile", 64 * 1024);
  assert.equal(
    gitBlob(docker),
    DOCKERFILE_GIT_BLOB,
    "composed Dockerfile identity changed",
  );

  const source = readPinned(ECONOMIC_SOURCE, 256 * 1024);
  assert.equal(
    gitBlob(source),
    ECONOMIC_SOURCE_GIT_BLOB,
    "compiled runtime importer source drift",
  );
  const sourceText = source.toString("utf8");
  assert.match(
    sourceText,
    /new Function\(\s*["']specifier["']\s*,\s*["']return import\(specifier\)["']\s*\)/u,
    "reviewed generated importer absent",
  );
  assert.ok(
    sourceText.includes("../../tools/" + SAGA),
    "reviewed saga specifier absent",
  );

  originalSaga();

  const text = docker.toString("utf8");
  const finalIndex = text.indexOf("\nFROM node:24-alpine\n");
  assert.ok(finalIndex >= 0, "unreviewed final stage");
  const final = text.slice(finalIndex + 1);
  assert.equal(
    (final.match(/^FROM[ ]+/gmu) || []).length,
    1,
    "unexpected final stages",
  );
  const copy = "COPY --from=build /app/tools/" + SAGA + " ./tools/";
  assert.equal(
    final.split(copy).length,
    2,
    "single reviewed saga COPY required",
  );
  assert.ok(
    final.includes("COPY --from=build /app/dist ./dist"),
    "compiled module not copied",
  );
  assert.ok(
    final.includes("/app/tools/" + EXISTING_POSITIVE),
    "known positive copied tool missing",
  );
  assert.equal(
    final.includes("/app/tools/" + BROADCASTER),
    false,
    "unreviewed broadcaster copied",
  );
  assert.equal(
    final.includes("/app/tools/" + CUSTODIAN),
    false,
    "unreviewed custodian copied",
  );
  assert.doesNotMatch(
    final,
    /COPY\s+--from=build\s+\/app\/tools\s+\.\/tools/u,
    "blanket tools copy would widen package authority",
  );

  return Object.freeze({
    schema: "void_buy_void_composed_stopped_saga_package_candidate_v1",
    marker: "VOID_BUY_VOID_COMPOSED_STOPPED_SAGA_PACKAGE_CANDIDATE_V1",
    source_parent: SOURCE_PARENT,
    dockerfile_git_blob_sha1: DOCKERFILE_GIT_BLOB,
    saga_source_git_blob_sha1: SOURCE_SAGA_GIT_BLOB,
    saga_source_sha256: SAGA_SHA256,
    reviewed_saga_source_bytes: SAGA_SIZE,
    reviewed_importer_git_blob_sha1: ECONOMIC_SOURCE_GIT_BLOB,
    compiled_importer_sha256: COMPILED_IMPORTER_SHA256,
    compiled_importer_bytes: COMPILED_IMPORTER_BYTES,
    saga_source_copy_declared: true,
    descriptor_relative_source_reads: true,
    reviewed_git_source_boundary: true,
    stopped_image_saga_byte_identity_verified: false,
    real_saga_module_imported: false,
    real_saga_module_executed: false,
    real_saga_exports_invoked: false,
    executed_saga_loader_qualified: false,
    dynamic_tool_transitive_closure_verified: false,
    complete_executable_closure_verified: false,
    image_generation_accepted: false,
    deployed_artifact_generation_verified: false,
    runtime_mount_authority: false,
    production_source_finality_authority_ready: false,
    presale_activation: false,
    funds_movement: false,
  });
}

function regularStoppedFile(location, maxBytes = 16 * 1024 * 1024) {
  const stat = fs.lstatSync(location);
  assert.ok(
    stat.isFile() &&
      !stat.isSymbolicLink() &&
      stat.nlink === 1 &&
      stat.size > 0 &&
      stat.size <= maxBytes,
    "file missing/nonregular/unbounded: " + location,
  );
  return fs.readFileSync(location);
}

function matchStagedSaga(candidate, source) {
  assert.equal(
    candidate.length,
    source.length,
    "staged saga byte length drift",
  );
  assert.ok(
    candidate.equals(source),
    "staged saga must be EXACT reviewed source bytes",
  );
  assert.equal(
    sha256(candidate),
    SAGA_SHA256,
    "staged saga SHA-256 mismatch",
  );
  assert.equal(
    gitBlob(candidate),
    SOURCE_SAGA_GIT_BLOB,
    "staged saga source blob mismatch",
  );
}

function verifyStopped(root) {
  sourceProbe();
  const source = originalSaga();
  const tools = path.join(root, "tools");
  const stat = fs.lstatSync(tools);
  assert.ok(
    stat.isDirectory() && !stat.isSymbolicLink(),
    "stopped tools directory missing",
  );
  const dir = fs.readdirSync(tools);
  assert.ok(
    dir.includes(EXISTING_POSITIVE),
    "expected existing positive tool missing",
  );
  assert.ok(dir.includes(SAGA), "reviewed saga tool missing from stopped image");
  assert.equal(
    dir.includes(BROADCASTER),
    false,
    "unreviewed broadcaster accidentally included",
  );
  assert.equal(
    dir.includes(CUSTODIAN),
    false,
    "unreviewed custodian accidentally included",
  );

  const compiled = regularStoppedFile(
    path.join(root, COMPILED_IMPORTER),
  );
  assert.equal(
    compiled.length,
    COMPILED_IMPORTER_BYTES,
    "compiled importer byte count changed",
  );
  assert.equal(
    sha256(compiled),
    COMPILED_IMPORTER_SHA256,
    "compiled importer SHA-256 changed",
  );
  const compiledText = compiled.toString("utf8");
  assert.match(
    compiledText,
    /new Function\(\s*["']specifier["']\s*,\s*["']return import\(specifier\)["']\s*\)/u,
    "compiled generated saga importer missing",
  );
  assert.ok(
    compiledText.includes("../../tools/" + SAGA),
    "compiled tool import missing",
  );

  const staged = regularStoppedFile(path.join(tools, SAGA), 128 * 1024);
  matchStagedSaga(staged, source);

  return Object.freeze({
    schema: "void_buy_void_composed_stopped_saga_package_candidate_v1",
    marker: "VOID_BUY_VOID_COMPOSED_STOPPED_SAGA_PACKAGE_CANDIDATE_V1",
    source_parent: SOURCE_PARENT,
    dockerfile_git_blob_sha1: DOCKERFILE_GIT_BLOB,
    saga_source_git_blob_sha1: SOURCE_SAGA_GIT_BLOB,
    saga_source_bytes: SAGA_SIZE,
    saga_source_sha256: SAGA_SHA256,
    compiled_importer_path: "/app/" + COMPILED_IMPORTER,
    compiled_importer_sha256: COMPILED_IMPORTER_SHA256,
    compiled_importer_bytes: COMPILED_IMPORTER_BYTES,
    stopped_image_saga_path: "/app/tools/" + SAGA,
    stopped_image_saga_byte_identity_verified: true,
    unreviewed_broadcaster_and_custodian_absent: true,
    real_saga_module_imported: false,
    real_saga_module_executed: false,
    real_saga_exports_invoked: false,
    executed_saga_loader_qualified: false,
    dynamic_tool_transitive_closure_verified: false,
    complete_executable_closure_verified: false,
    tool_runtime_side_effects_reviewed: false,
    image_generation_accepted: false,
    deployed_artifact_generation_verified: false,
    runtime_mount_authority: false,
    production_source_finality_authority_ready: false,
    presale_activation: false,
    funds_movement: false,
  });
}

function selfTest() {
  proveReviewedGitV1Synthetic();
  reviewedSourceBoundary();
  const original = originalSaga();
  const tmp = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-composed-saga-package-"),
  );
  try {
    const target = path.join(tmp, SAGA);
    fs.writeFileSync(target, original, { mode: 0o600 });
    matchStagedSaga(regularStoppedFile(target), original);

    const substitute = Buffer.from(original);
    substitute[0] ^= 1;
    fs.writeFileSync(target, substitute, { mode: 0o600 });
    assert.throws(
      () => matchStagedSaga(regularStoppedFile(target), original),
      /staged saga must be EXACT reviewed source bytes/u,
    );

    fs.rmSync(target);
    assert.throws(
      () => regularStoppedFile(target),
      /ENOENT/u,
    );

    console.log("VOID_BUY_VOID_COMPOSED_SAGA_PACKAGE_SELF_TEST_GREEN");
    console.log("ancestor_safe_source_reads=true");
    console.log("reviewed_git_source_boundary=true");
    console.log("same_length_substitution_rejected=true");
    console.log("missing_saga_target_rejected=true");
    console.log("real_saga_module_imported=false");
    console.log("real_saga_module_executed=false");
    console.log("image_generation_accepted=false");
    console.log("production_source_finality_authority_ready=false");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

const args = process.argv.slice(2);
if (args.length === 1 && args[0] === "--source") {
  process.stdout.write(JSON.stringify(sourceProbe(), null, 2) + "\n");
} else if (args.length === 1 && args[0] === "--self-test") {
  selfTest();
} else if (args.length === 2 && args[0] === "--stopped-root") {
  process.stdout.write(
    JSON.stringify(verifyStopped(path.resolve(args[1])), null, 2) + "\n",
  );
} else {
  throw new Error(
    "composed_stopped_saga_candidate_only_no_live_execution_authority",
  );
}
