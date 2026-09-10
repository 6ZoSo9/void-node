#!/usr/bin/env node
// Fresh compiler invocation and artifact capture; never imports the built node.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { canonical, sha256, sourceIdentity, inventory, readRegular, runtimeIdentity, RECIPE, verifyBuildReceipt, readBuildReceipt }
  from "./lib/void_nimo_build_admission_v1.mjs";
const root = fs.realpathSync(process.cwd()), [mode, file, argument] = process.argv.slice(2);
assert.equal(process.argv.length, 5); assert.equal(process.execArgv.length, 0);
assert([22, 24, 26].includes(Number(process.versions.node.split(".")[0])));
assert(file && !path.isAbsolute(file) && !file.split("/").includes(".."));
if (mode === "--aggregate") {
  assert(/^[A-Za-z0-9-]{1,80}$/.test(argument)); const names = [22, 24, 26].map(n => `node-${n}.json`);
  assert.deepEqual(fs.readdirSync(path.join(root, file)).sort(), names); const source = sourceIdentity(root), members = [];
  let dist;
  for (const major of [22, 24, 26]) {
    const name = `${file}/node-${major}.json`, bytes = readRegular(root, name, 16 * 1024 * 1024), digest = sha256(bytes);
    const receipt = readBuildReceipt(root, name, digest);
    assert.equal(receipt.generation, argument); assert.equal(canonical(receipt.source), canonical(source));
    assert.equal(Number(receipt.runtime.version.slice(1).split(".")[0]), major); assert(/^[0-9a-f]{64}$/.test(receipt.runtime.sha256));
    assert(Number.isSafeInteger(receipt.runtime.bytes) && receipt.runtime.bytes > 0 && receipt.runtime.bytes <= 256 * 1024 * 1024);
    if (dist) assert.equal(canonical(receipt.dist), canonical(dist), "cross-runtime compiled output differs"); else dist = receipt.dist;
    members.push({ major, runtime: receipt.runtime, receipt_sha256: digest, receipt_bytes: bytes.length,
      dependencies_sha256: receipt.dependencies.aggregate_sha256 });
  }
  const aggregate = { marker: "VOID_NIMO_BUILD_DERIVATION_MATRIX_V1_GREEN", head: source.head, tree: source.tree,
    generation: argument, members, dist_sha256: dist.aggregate_sha256, dist_files: dist.members.length,
    source_sha256: source.aggregate_sha256, compiled_outputs_identical: true, actual_void_node_started: false,
    runtime_session_bound: false, public_onboarding_accepted: false };
  const bytes = Buffer.from(canonical(aggregate) + "\n"), out = path.join(root, ".runtime/nimo-build-aggregate-v1.json");
  const fd = fs.openSync(out, "wx", 0o600); try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  console.log(canonical({ ...aggregate, aggregate_sha256: sha256(bytes), aggregate_bytes: bytes.length }));
} else if (mode === "--verify") {
  const result = verifyBuildReceipt(root, file, argument);
  console.log(canonical({ marker: "VOID_NIMO_BUILD_RECEIPT_VERIFIED_V1", ...result, actual_void_node_started: false }));
} else {
  assert.equal(mode, "--prepare"); assert(/^[A-Za-z0-9-]{1,80}$/.test(argument));
  assert(!fs.existsSync(path.join(root, "dist")), "fresh checkout with no dist required; existing output is never deleted");
  const source = sourceIdentity(root), runtime = runtimeIdentity(), dependencies = inventory(root, "node_modules");
  const pkg = JSON.parse(readRegular(root, "package.json")); assert.equal(pkg.scripts.build, RECIPE);
  const lock = JSON.parse(readRegular(root, "package-lock.json"));
  const compiler = JSON.parse(readRegular(root, "node_modules/typescript/package.json"));
  assert.equal(compiler.version, lock.packages["node_modules/typescript"].version);
  assert.equal(compiler.version, "5.9.3");
  const commands = [["node_modules/typescript/bin/tsc", "-p", "tsconfig.build.json"],
    ["scripts/copy_void_runtime_js_v1.mjs"], ["scripts/retire_saveblock_periodic_rewriters_v1.mjs"]];
  for (const argv of commands) {
    const result = spawnSync(process.execPath, argv, { cwd: root, timeout: 300000, maxBuffer: 8 * 1024 * 1024,
      env: { PATH: path.dirname(process.execPath) + ":/usr/bin:/bin", LANG: "C", LC_ALL: "C", TZ: "UTC" } });
    if (result.status !== 0) {
      console.error("VOID_NIMO_BUILD_STEP_HOLD", argv[0]);
      process.stderr.write(result.stderr || ""); process.stderr.write(result.stdout || "");
      process.exit(1);
    }
  }
  assert.equal(canonical(sourceIdentity(root)), canonical(source), "source changed during build");
  assert.equal(canonical(inventory(root, "node_modules")), canonical(dependencies), "dependency changed during build");
  assert.equal(canonical(runtimeIdentity()), canonical(runtime), "runtime changed during build");
  const receipt = { schema: "void_nimo_build_admission_v1", generation: argument, source, runtime,
    build_recipe: RECIPE, dependencies, dist: inventory(root, "dist"), actual_void_node_started: false, public_onboarding_accepted: false };
  const bytes = Buffer.from(canonical(receipt) + "\n"); assert(bytes.length <= 16 * 1024 * 1024);
  // Caller prepares the output directory; create-only receipt and no path alias.
  const parent = path.dirname(path.resolve(root, file)); assert.equal(fs.realpathSync(parent), parent);
  const fd = fs.openSync(path.join(root, file), "wx", 0o600);
  try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  console.log(canonical({ marker: "VOID_NIMO_BUILD_DERIVATION_V1_GREEN", head: source.head, generation: argument,
    runtime, receipt_bytes: bytes.length, receipt_sha256: sha256(bytes), dist_files: receipt.dist.members.length,
    dist_sha256: receipt.dist.aggregate_sha256, dependencies_files: dependencies.members.length,
    dependencies_sha256: dependencies.aggregate_sha256, source_files: source.members.length, source_sha256: source.aggregate_sha256,
    actual_void_node_started: false, public_onboarding_accepted: false }));
}
