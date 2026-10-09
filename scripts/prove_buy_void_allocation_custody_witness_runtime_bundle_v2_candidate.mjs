#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_CENSUS_SOURCE_COMMIT_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_FILES_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_MANIFEST_ID_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_MANIFEST_SHA256_V1,
} from "../dist/economic/buy_void_allocation_custody_witness_runtime_bundle_qualification_v1.js";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_V2_CANDIDATE =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_V2_CANDIDATE";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_STACK_HEAD =
  "b0f7189af0d29769ec701bd590e0df81b23b5c07";
const BAKERY_SOURCE =
  "src/economic/buy_void_filesystem_bakery_lock_v1.ts";
const BAKERY_SOURCE_GIT_BLOB =
  "9bd47abb857368d928c0ca289766cdf3571629ba";
const BAKERY_ARTIFACT =
  "dist/economic/buy_void_filesystem_bakery_lock_v1.js";
const PREDECESSOR_BAKERY_SHA256 =
  "sha256:7c7a6b92c1a88b14d325d331700a2bd19a0068630ae0094c65b2dcc6a25a9994";
const CANDIDATE_BAKERY_SHA256 =
  "sha256:47e80dfffa0cd1fd97169f9d63e836c9dbf52461aaafafdf10499b5cf91fd3ca";
const ENTRY =
  "tools/void-buy-allocation-custody-witness-forced-command-v2.mjs";

function sha256Id(bytes) {
  return "sha256:" + crypto.createHash("sha256").update(bytes).digest("hex");
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
  throw new Error("runtime_bundle_v2_candidate_noncanonical_value");
}

function git(args) {
  const result = spawnSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  assert.equal(
    result.status,
    0,
    "git command failed: git " + args.join(" ") + "\n" + result.stderr,
  );
  return String(result.stdout || "").trim();
}

function assertSourceGenerationStable() {
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

  const sourceInputs = [
    ENTRY,
    ...VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_FILES_V1
      .filter((file) => file.source_path.startsWith("dist/economic/"))
      .map((file) =>
        file.source_path
          .replace(/^dist\/economic\//u, "src/economic/")
          .replace(/\.js$/u, ".ts"),
      ),
    "package.json",
    "package-lock.json",
    "tsconfig.build.json",
    "scripts/copy_void_runtime_js_v1.mjs",
    "scripts/retire_saveblock_periodic_rewriters_v1.mjs",
  ];

  const diff = spawnSync(
    "git",
    ["diff", "--quiet", SOURCE_STACK_HEAD, "HEAD", "--", ...sourceInputs],
    { cwd: ROOT, stdio: "ignore" },
  );
  assert.equal(
    diff.status,
    0,
    "reviewed runtime-bundle source/build inputs drifted after source stack head",
  );

  const bakeryBytes = fs.readFileSync(path.join(ROOT, BAKERY_SOURCE));
  assert.equal(
    gitBlobSha1(bakeryBytes),
    BAKERY_SOURCE_GIT_BLOB,
    "reviewed bakery-lock source Git blob drifted",
  );
}

function scanClosure() {
  const staticImport =
    /(?:^|\n)\s*import\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']\s*;?/gmu;
  const exportFrom =
    /(?:^|\n)\s*export\s+[\s\S]*?\s+from\s+["']([^"']+)["']\s*;?/gmu;
  const dynamicImport = /import\s*\(/u;
  const requireCall = /(?:^|[^A-Za-z0-9_$])require\s*\(/u;

  function matches(regex, text) {
    regex.lastIndex = 0;
    const out = [];
    let match;
    while ((match = regex.exec(text)) !== null) out.push(match[1]);
    return out;
  }

  const expected = new Set(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_FILES_V1
      .map((file) => file.source_path),
  );
  const queue = [ENTRY];
  const seen = new Set();
  const edges = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (seen.has(current)) continue;
    seen.add(current);

    const text = fs.readFileSync(path.join(ROOT, current), "utf8");
    assert.equal(
      dynamicImport.test(text),
      false,
      "dynamic import is not permitted in runtime bundle: " + current,
    );
    assert.equal(
      requireCall.test(text),
      false,
      "require() is not permitted in runtime bundle: " + current,
    );

    for (const specifier of [
      ...matches(staticImport, text),
      ...matches(exportFrom, text),
    ]) {
      if (!specifier.startsWith(".")) continue;
      const resolved = path
        .normalize(path.join(path.dirname(current), specifier))
        .replaceAll("\\", "/");
      assert.equal(
        fs.existsSync(path.join(ROOT, resolved)),
        true,
        "relative import missing: " + current + " -> " + specifier,
      );
      edges.push({ from: current, specifier, to: resolved });
      queue.push(resolved);
    }
  }

  assert.deepEqual(
    [...seen].sort(),
    [...expected].sort(),
    "reviewed runtime dependency closure changed",
  );
  assert.equal(edges.length, 11, "reviewed runtime edge count changed");
  return edges.sort((a, b) =>
    (a.from + "\0" + a.specifier + "\0" + a.to).localeCompare(
      b.from + "\0" + b.specifier + "\0" + b.to,
    ),
  );
}

function derive() {
  assertSourceGenerationStable();
  const edges = scanClosure();

  const files =
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_FILES_V1.map(
      (predecessor) => {
        const bytes = fs.readFileSync(path.join(ROOT, predecessor.source_path));
        return Object.freeze({
          source_path: predecessor.source_path,
          installed_path: predecessor.installed_path,
          bytes: bytes.length,
          sha256: sha256Id(bytes),
        });
      },
    );

  const changed = [];
  for (let index = 0; index < files.length; index += 1) {
    const current = files[index];
    const predecessor =
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_FILES_V1[index];
    if (current.sha256 !== predecessor.sha256) {
      changed.push(current.source_path);
    }
  }
  assert.deepEqual(
    changed,
    [BAKERY_ARTIFACT],
    "V2 candidate must change only the repaired bakery-lock runtime artifact",
  );

  const bakery = files.find((file) => file.source_path === BAKERY_ARTIFACT);
  assert.ok(bakery, "bakery-lock runtime artifact missing");
  assert.equal(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_FILES_V1.find(
      (file) => file.source_path === BAKERY_ARTIFACT,
    )?.sha256,
    PREDECESSOR_BAKERY_SHA256,
    "predecessor bakery-lock artifact identity drifted",
  );
  assert.equal(
    bakery.sha256,
    CANDIDATE_BAKERY_SHA256,
    "repaired bakery-lock artifact bytes differ from independently observed build",
  );

  const body = {
    schema: "void_buy_void_witness_forced_command_runtime_bundle_manifest_v2",
    marker: "VOID_BUY_VOID_WITNESS_FORCED_COMMAND_RUNTIME_BUNDLE_MANIFEST_V2",
    version: 2,
    source_commit: SOURCE_STACK_HEAD,
    entry: ENTRY,
    files: files
      .map((file) => ({
        path: file.source_path,
        bytes: file.bytes,
        sha256: file.sha256.slice("sha256:".length),
      }))
      .sort((a, b) => a.path.localeCompare(b.path)),
    edges,
    dynamic_import_files: [],
    require_call_files: [],
  };

  const manifestId =
    "voidwfb2_" +
    crypto.createHash("sha256").update(canonical(body), "utf8").digest("hex");
  const manifestSha256 = sha256Id(
    Buffer.from(
      canonical({ ...body, manifest_id: manifestId }) + "\n",
      "utf8",
    ),
  );

  return Object.freeze({
    schema:
      "void_buy_void_allocation_custody_witness_runtime_bundle_v2_candidate_v1",
    marker: VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_V2_CANDIDATE,
    version: 1,
    predecessor: Object.freeze({
      runtime_bundle_census_source_commit:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_CENSUS_SOURCE_COMMIT_V1,
      runtime_bundle_manifest_id:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_MANIFEST_ID_V1,
      runtime_bundle_manifest_sha256:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_MANIFEST_SHA256_V1,
      bakery_lock_sha256: PREDECESSOR_BAKERY_SHA256,
    }),
    source_stack_head: SOURCE_STACK_HEAD,
    bakery_lock_source_git_blob_sha1: BAKERY_SOURCE_GIT_BLOB,
    candidate_runtime_bundle_manifest_id: manifestId,
    candidate_runtime_bundle_manifest_sha256: manifestSha256,
    candidate_bakery_lock_sha256: CANDIDATE_BAKERY_SHA256,
    changed_runtime_paths: Object.freeze(changed),
    runtime_bundle_files: Object.freeze(files),
    runtime_edge_count: edges.length,
    dynamic_import_count: 0,
    require_call_count: 0,
    predecessor_manifest_accepted: false,
    candidate_manifest_accepted: false,
    live_nimo_installed: false,
    runtime_integration: false,
    protected_high_water_custody_proven: false,
    production_gate_ready: false,
    funds_movement: false,
  });
}

const args = process.argv.slice(2);
assert.deepEqual(
  args,
  ["--derive"],
  "derive-only candidate: use --derive",
);
process.stdout.write(JSON.stringify(derive(), null, 2) + "\n");
