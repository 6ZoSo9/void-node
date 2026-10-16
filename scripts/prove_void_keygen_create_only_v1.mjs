#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const keygen = path.join(root, "scripts", "keygen.js");
const keygenSource = fs.readFileSync(keygen, "utf8");
assert.ok(keygenSource.includes("import * as crypto from 'node:crypto';"));
assert.ok(keygenSource.includes("import * as fs from 'node:fs';"));
assert.equal(keygenSource.includes("require("), false);
assert.equal(keygenSource.includes("exports"), false);
assert.equal(keygenSource.includes("unlinkSync"), false);
assert.equal(keygenSource.includes("rmSync"), false);
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "void-keygen-create-only-"));

function run(...args) {
  return spawnSync(process.execPath, [keygen, ...args], {
    cwd: fixture,
    encoding: "utf8",
    env: { PATH: process.env.PATH || "/usr/bin:/bin" },
  });
}

try {
  const target = path.join(fixture, "node-key.pem");
  const created = run(target);
  assert.equal(created.status, 0, created.stderr);
  const original = fs.readFileSync(target);
  assert.equal(fs.statSync(target).mode & 0o777, 0o600);
  assert.doesNotThrow(() => crypto.createPrivateKey(original));
  assert.ok(!created.stdout.includes("PRIVATE KEY"));

  const repeated = run(target);
  assert.notEqual(repeated.status, 0);
  assert.match(repeated.stderr, /keygen_refused_existing_target/);
  assert.deepEqual(fs.readFileSync(target), original);

  const victim = path.join(fixture, "victim.txt");
  const link = path.join(fixture, "linked-key.pem");
  fs.writeFileSync(victim, "preserve-me\n", { mode: 0o600 });
  fs.symlinkSync(victim, link);
  const linked = run(link);
  assert.notEqual(linked.status, 0);
  assert.equal(fs.readFileSync(victim, "utf8"), "preserve-me\n");
  assert.equal(fs.readlinkSync(link), victim);

  const directory = path.join(fixture, "directory-target");
  fs.mkdirSync(directory);
  const directoryResult = run(directory);
  assert.notEqual(directoryResult.status, 0);
  assert.ok(fs.statSync(directory).isDirectory());

  const defaultDir = path.join(fixture, "default-output");
  fs.mkdirSync(defaultDir);
  const defaultResult = spawnSync(process.execPath, [keygen], {
    cwd: defaultDir,
    encoding: "utf8",
    env: { PATH: process.env.PATH || "/usr/bin:/bin" },
  });
  assert.equal(defaultResult.status, 0, defaultResult.stderr);
  assert.equal(fs.statSync(path.join(defaultDir, ".nodekey")).mode & 0o777, 0o600);

  const usage = run("one", "two");
  assert.notEqual(usage.status, 0);
  assert.match(usage.stderr, /usage: node scripts\/keygen\.js/);


const workflow = fs.readFileSync(
  path.join(root, ".github", "workflows", "void-keygen-create-only-v1.yml"),
  "utf8",
);
for (const required of [
  'scripts/void_keygen_ci_diff_base_v1.mjs',
  'EVENT_NAME: ${{ github.event_name }}',
  'PUSH_BEFORE: ${{ github.event.before }}',
  '--event "$EVENT_NAME"',
  '--push-before "${PUSH_BEFORE:-}"',
]) {
  assert.ok(workflow.includes(required), "workflow event contract missing: " + required);
}

  console.log("VOID_KEYGEN_CREATE_ONLY_V1_PROOF_GREEN");
} finally {
  fs.rmSync(fixture, { recursive: true, force: true });
}
