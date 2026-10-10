#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

// Exercise the EXACT reviewed production function, with a disposable
// same-filesystem fixture. No real custody path or customer file is touched.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WRITER = "src/economic/buy_void_custody_launch_high_water_writer_v1.mjs";
const EXPECTED_WRITER_BLOB = "8d44f6651b9210f7cb1a5ac3f895ce18d0890fb5";
const HIGH_WATER_NAME = "buy-void-custody-launch-high-water-v2.json";
const STATIC_PID = 41872;
const STATIC_NONCE = "55".repeat(8);
const text = fs.readFileSync(path.join(ROOT, WRITER), "utf8");
const bytes = Buffer.from(text, "utf8");
const gitBlob = crypto.createHash("sha1")
  .update(Buffer.from("blob " + bytes.length + "\0"))
  .update(bytes).digest("hex");
assert.equal(gitBlob, EXPECTED_WRITER_BLOB, "exact writer identity");

const start = text.indexOf("function atomicAdvance(");
const end = text.indexOf("\nfunction held(", start);
assert.ok(start > 0 && end > start, "exact atomicAdvance body required");
assert.equal(text.indexOf("function atomicAdvance(", start + 1), -1);
const actualBody = text.slice(start, end);
assert.match(actualBody, /tempCreated\s*=\s*false/u);
assert.match(actualBody, /tempCreated\s*=\s*true/u);
assert.match(actualBody, /if\s*\(tempCreated\s*&&\s*!renamed\)/u);
assert.match(actualBody, /fs\.constants\.O_EXCL/u);

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "void-owned-hw-temp-"));
const basename = "." + HIGH_WATER_NAME + ".tmp-" + STATIC_PID + "-" + STATIC_NONCE;
const target = path.join(dir, basename);
const previous = Buffer.from("other-writer-staged-intent-do-not-unlink\n", "utf8");
const beforeHighWater = Buffer.from("prior-verified-high-water\n", "utf8");
const nextHighWater = Buffer.from("new-unpublished-high-water\n", "utf8");
let directoryFd = -1;
let unlinkCalls = 0;
let fsyncCalls = 0;
let createCalls = 0;
let failedWriteCalls = 0;

const isolatedFs = {
  ...fs,
  openSync(file, flags, mode) {
    if (file === target) {
      createCalls += 1;
      assert.ok((flags & fs.constants.O_EXCL) !== 0, "exclusivity");
      assert.ok((flags & fs.constants.O_NOFOLLOW) !== 0, "symlink refusal");
      assert.equal(mode, 0o600, "private temp mode");
    }
    return fs.openSync(file, flags, mode);
  },
  unlinkSync(file) {
    if (file === target) unlinkCalls += 1;
    return fs.unlinkSync(file);
  },
  fsyncSync(fd) {
    fsyncCalls += 1;
    return fs.fsyncSync(fd);
  },
};

try {
  directoryFd = fs.openSync(dir, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY);
  const captured = vm.runInNewContext(
    actualBody + "\natomicAdvance",
    {
      Buffer,
      crypto: { randomBytes(size) {
        assert.equal(size, 8);
        return Buffer.alloc(8, 0x55);
      } },
      fs: isolatedFs,
      path,
      process: { pid: STATIC_PID },
      HIGH_WATER_NAME,
      O_NOFOLLOW: fs.constants.O_NOFOLLOW,
      fail(message) { throw new Error("synthetic_" + message); },
      // This callback is never reached after EEXIST, and deliberately fails
      // as soon as the other test successfully creates its own temp.
      writeAll() {
        failedWriteCalls += 1;
        throw new Error("synthetic_owned_temp_write_failure");
      },
      recordFdCloseFailureV1() {
        throw new Error("unexpected_descriptor_close_error");
      },
    },
    { timeout: 1000 },
  );
  assert.equal(typeof captured, "function");

  const evidence = {
    custodyDirectory: { proc_path: dir, fd: directoryFd },
  };

  // First: somebody else's 0600 temp exists. O_EXCL must fail. The
  // failing attempt did not acquire ownership and MUST NOT unlink it.
  fs.writeFileSync(target, previous, { mode: 0o600, flag: "wx" });
  const preStat = fs.lstatSync(target);
  assert.throws(
    () => captured(evidence, beforeHighWater, nextHighWater, null, null, null),
    e => e?.code === "EEXIST",
    "pre-existing private temp collision must fail O_EXCL",
  );
  assert.equal(createCalls, 1);
  assert.equal(failedWriteCalls, 0, "must stop before write");
  assert.equal(unlinkCalls, 0, "must never remove unowned temp");
  assert.equal(fsyncCalls, 0, "must never fsync after unowned attempt");
  assert.ok(fs.existsSync(target), "foreign-owned temp still exists");
  assert.deepEqual(fs.readFileSync(target), previous, "foreign bytes unchanged");
  assert.equal(fs.lstatSync(target).ino, preStat.ino, "foreign inode unchanged");

  // Second: free the name, now THIS attempt succeeds with O_EXCL, then
  // an inert write fault forces cleanup. Exactly its own temp may go.
  fs.unlinkSync(target);
  unlinkCalls = 0;
  fsyncCalls = 0;
  assert.throws(
    () => captured(evidence, beforeHighWater, nextHighWater, null, null, null),
    /synthetic_owned_temp_write_failure/u,
  );
  assert.equal(createCalls, 2);
  assert.equal(failedWriteCalls, 1);
  assert.equal(unlinkCalls, 1, "only owned failed temp removed");
  assert.equal(fsyncCalls, 1, "directory cleanup fsync");
  assert.equal(fs.existsSync(target), false, "owned failed temp absent");
  assert.equal(fs.readdirSync(dir).length, 0, "no stray temp");
  console.log("VOID_BUY_VOID_CUSTODY_OWNED_TEMP_CLEANUP_V1_GREEN");
  console.log("writer_source_git_blob_verified=true");
  console.log("preexisting_private_temp_EEXIST_rejected=true");
  console.log("preexisting_private_temp_bytes_and_inode_preserved=true");
  console.log("unowned_temp_unlink_calls=0");
  console.log("unowned_temp_fsync_calls=0");
  console.log("owned_failed_temp_cleanup_verified=true");
  console.log("exclusive_creation_required_before_cleanup=true");
  console.log("cross_process_exclusive_writer_fence_verified=false");
  console.log("production_allocation_mutation_ready=false");
  console.log("funds_movement=false");
} finally {
  if (directoryFd >= 0) fs.closeSync(directoryFd);
  fs.rmSync(dir, { recursive: true, force: true });
}
