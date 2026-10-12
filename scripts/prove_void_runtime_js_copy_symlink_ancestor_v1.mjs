#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const COPY_SCRIPT = path.join(ROOT, "scripts", "copy_void_runtime_js_v1.mjs");

function runFixture(configure) {
  const fixture = mkdtempSync(path.join(tmpdir(), "void-runtime-copy-proof-"));
  const outside = mkdtempSync(path.join(tmpdir(), "void-runtime-copy-outside-"));
  try {
    mkdirSync(path.join(fixture, "scripts"), { recursive: true });
    cpSync(COPY_SCRIPT, path.join(fixture, "scripts", "copy_void_runtime_js_v1.mjs"));
    configure({ fixture, outside });
    const result = spawnSync(
      process.execPath,
      [path.join(fixture, "scripts", "copy_void_runtime_js_v1.mjs")],
      { encoding: "utf8" },
    );
    return {
      status: result.status,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
      fixture,
      outside,
      cleanup() {
        rmSync(fixture, { recursive: true, force: true });
        rmSync(outside, { recursive: true, force: true });
      },
    };
  } catch (error) {
    rmSync(fixture, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
    throw error;
  }
}

{
  const run = runFixture(({ fixture }) => {
    mkdirSync(path.join(fixture, "src", "wal"), { recursive: true });
    writeFileSync(path.join(fixture, "src", "wal", "wal_v1.js"), "normal\n");
  });
  try {
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, /VOID_NODE_RUNTIME_JS_COPY_V1_GREEN/);
    assert.equal(
      readFileSync(path.join(run.fixture, "dist", "wal", "wal_v1.js"), "utf8"),
      "normal\n",
    );
  } finally {
    run.cleanup();
  }
}

{
  const run = runFixture(({ fixture, outside }) => {
    mkdirSync(path.join(fixture, "src", "wal"), { recursive: true });
    writeFileSync(
      path.join(fixture, "src", "wal", "wal_v1.js"),
      "destination-escape\n",
    );
    mkdirSync(path.join(outside, "wal"), { recursive: true });
    symlinkSync(outside, path.join(fixture, "dist"));
  });
  try {
    assert.notEqual(run.status, 0);
    assert.match(
      run.stderr,
      /destination runtime path must not contain symlink ancestors/,
    );
    assert.equal(existsSync(path.join(run.outside, "wal", "wal_v1.js")), false);
  } finally {
    run.cleanup();
  }
}

{
  const run = runFixture(({ fixture, outside }) => {
    mkdirSync(path.join(outside, "wal"), { recursive: true });
    writeFileSync(path.join(outside, "wal", "wal_v1.js"), "source-escape\n");
    symlinkSync(outside, path.join(fixture, "src"));
  });
  try {
    assert.notEqual(run.status, 0);
    assert.match(
      run.stderr,
      /source runtime path must not contain symlink ancestors/,
    );
    assert.equal(
      existsSync(path.join(run.fixture, "dist", "wal", "wal_v1.js")),
      false,
    );
  } finally {
    run.cleanup();
  }
}

console.log("normal_runtime_copy_preserved=true");
console.log("destination_symlink_ancestor_escape_written=false");
console.log("source_symlink_ancestor_escape_read=false");
console.log("VOID_RUNTIME_JS_COPY_SYMLINK_ANCESTOR_V1_PROOF_GREEN");
