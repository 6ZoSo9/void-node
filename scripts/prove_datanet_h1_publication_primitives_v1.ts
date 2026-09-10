// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  VOID_DATANET_PAYLOAD_BYTES_V1,
  VOID_DATANET_PAYLOAD_READ_BYTES_V1,
  bindDataNetRootIdentityV1,
} from "../src/storage/datanet_state_derived_h1_v1.js";

const MARKER = "VOID_DATANET_H1_PUBLICATION_PRIMITIVES_V1_GREEN";
const O_TMPFILE = 0o20200000;
const FALLOCATE = "/usr/bin/fallocate";
const LN = "/usr/bin/ln";
const HELPER_TIMEOUT_MS = 5_000;
const HELPER_STDERR_MAX = 8 * 1024;
const ZERO_64_MIB_SHA256 = "3b6a07d0d404fab4e23b6d34bc6696a6a312dd92821332385e5af7c01c421351";

function helperSha256(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function requireHelper(filePath: string): void {
  const st = fs.statSync(filePath);
  assert.equal(st.isFile(), true, `${filePath} is not a regular file`);
  fs.accessSync(filePath, fs.constants.X_OK);
}

function currentUid(): bigint {
  const getuid = process.getuid;
  assert.equal(typeof getuid, "function", "process.getuid unavailable");
  return BigInt(getuid());
}

function openAnonymous(root: string): number {
  return fs.openSync(root, fs.constants.O_RDWR | O_TMPFILE, 0o600);
}

function allocatedBytes(st: fs.BigIntStats): bigint {
  return BigInt(st.blocks) * 512n;
}

function assertAnonymousReservation(fd: number, expectedIdentity?: { dev: bigint; ino: bigint }): fs.BigIntStats {
  const st = fs.fstatSync(fd, { bigint: true });
  assert.equal(st.isFile(), true);
  assert.equal(st.uid, currentUid());
  assert.equal(Number(st.mode) & 0o777, 0o600);
  assert.equal(st.nlink, 0n);
  assert.equal(st.size, BigInt(VOID_DATANET_PAYLOAD_BYTES_V1));
  assert.ok(
    allocatedBytes(st) >= BigInt(VOID_DATANET_PAYLOAD_BYTES_V1),
    `reserved bytes ${allocatedBytes(st)} below payload bytes ${VOID_DATANET_PAYLOAD_BYTES_V1}`,
  );
  if (expectedIdentity) {
    assert.equal(st.dev, expectedIdentity.dev);
    assert.equal(st.ino, expectedIdentity.ino);
  }
  return st;
}

function fallocateExact(fd: number): void {
  const result = spawnSync(
    FALLOCATE,
    ["--length", String(VOID_DATANET_PAYLOAD_BYTES_V1), "/proc/self/fd/3"],
    {
      cwd: "/",
      env: { PATH: "/usr/bin:/bin", LANG: "C", LC_ALL: "C" },
      timeout: HELPER_TIMEOUT_MS,
      killSignal: "SIGKILL",
      maxBuffer: HELPER_STDERR_MAX,
      stdio: ["ignore", "ignore", "pipe", fd],
    },
  );
  assert.equal(result.error, undefined, `fallocate error: ${String(result.error)}`);
  assert.equal(result.signal, null, `fallocate signal: ${String(result.signal)}`);
  assert.equal(result.status, 0, `fallocate status=${String(result.status)} stderr=${String(result.stderr || "").trim()}`);
}

function writeZeroPayload(fd: number): { calls: number; bytes: number; sha256: string } {
  const block = Buffer.alloc(VOID_DATANET_PAYLOAD_READ_BYTES_V1);
  const digest = crypto.createHash("sha256");
  let calls = 0;
  let bytes = 0;
  for (let offset = 0; offset < VOID_DATANET_PAYLOAD_BYTES_V1; offset += block.length) {
    const completed = fs.writeSync(fd, block, 0, block.length, offset);
    assert.equal(completed, block.length, `short write at ${offset}`);
    digest.update(block);
    calls += 1;
    bytes += completed;
  }
  return { calls, bytes, sha256: digest.digest("hex") };
}

function linkExactFdCreateOnly(fd: number, rootFd: number, name: string): boolean {
  const result = spawnSync(
    LN,
    ["-L", "-T", "--", "/proc/self/fd/3", `/proc/self/fd/4/${name}`],
    {
      cwd: "/",
      env: { PATH: "/usr/bin:/bin", LANG: "C", LC_ALL: "C" },
      timeout: HELPER_TIMEOUT_MS,
      killSignal: "SIGKILL",
      maxBuffer: HELPER_STDERR_MAX,
      stdio: ["ignore", "ignore", "pipe", fd, rootFd],
    },
  );
  assert.equal(result.error, undefined, `ln error: ${String(result.error)}`);
  assert.equal(result.signal, null, `ln signal: ${String(result.signal)}`);
  return result.status === 0;
}

function fsyncDirectory(fd: number): void {
  fs.fsyncSync(fd);
}

function fullHash(filePath: string): { calls: number; requested: number; completed: number; sha256: string } {
  const fd = fs.openSync(filePath, fs.constants.O_RDONLY | ((fs.constants as any).O_NOFOLLOW || 0));
  try {
    const block = Buffer.alloc(VOID_DATANET_PAYLOAD_READ_BYTES_V1);
    const digest = crypto.createHash("sha256");
    let calls = 0;
    let requested = 0;
    let completed = 0;
    for (let offset = 0; offset < VOID_DATANET_PAYLOAD_BYTES_V1; offset += block.length) {
      const got = fs.readSync(fd, block, 0, block.length, offset);
      assert.equal(got, block.length, `short read at ${offset}`);
      digest.update(block);
      calls += 1;
      requested += block.length;
      completed += got;
    }
    const eof = Buffer.alloc(1);
    const eofResult = fs.readSync(fd, eof, 0, 1, VOID_DATANET_PAYLOAD_BYTES_V1);
    calls += 1;
    requested += 1;
    completed += eofResult;
    assert.equal(eofResult, 0, "EOF probe returned data");
    return { calls, requested, completed, sha256: digest.digest("hex") };
  } finally {
    fs.closeSync(fd);
  }
}

function main(): void {
  assert.equal(process.platform, "linux", "publication primitive proof is Linux-only");
  requireHelper(FALLOCATE);
  requireHelper(LN);

  const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-datanet-h1-pub-"));
  fs.chmodSync(root, 0o700);
  const rootFd = fs.openSync(root, fs.constants.O_RDONLY | ((fs.constants as any).O_DIRECTORY || 0));
  let fd = -1;
  let collisionFd = -1;
  try {
    const rootIdentity = bindDataNetRootIdentityV1(root);
    assert.deepEqual(fs.readdirSync(root), []);

    fd = openAnonymous(root);
    const initial = fs.fstatSync(fd, { bigint: true });
    assert.equal(initial.isFile(), true);
    assert.equal(initial.uid, currentUid());
    assert.equal(Number(initial.mode) & 0o777, 0o600);
    assert.equal(initial.nlink, 0n);
    assert.equal(initial.size, 0n);
    const identity = { dev: initial.dev, ino: initial.ino };

    fallocateExact(fd);
    const reserved = assertAnonymousReservation(fd, identity);
    assert.deepEqual(fs.readdirSync(root), [], "reservation must not publish a name");

    const written = writeZeroPayload(fd);
    assert.equal(written.calls, 1024);
    assert.equal(written.bytes, VOID_DATANET_PAYLOAD_BYTES_V1);
    assert.equal(written.sha256, ZERO_64_MIB_SHA256);
    fs.fchmodSync(fd, 0o600);
    fs.fsyncSync(fd);

    const afterWrite = assertAnonymousReservation(fd, identity);
    assert.ok(allocatedBytes(afterWrite) >= allocatedBytes(reserved));

    const published = linkExactFdCreateOnly(fd, rootFd, "S1");
    assert.equal(published, true, "first exact-fd S1 publication failed");
    fsyncDirectory(rootFd);

    const fdAfterLink = fs.fstatSync(fd, { bigint: true });
    const target = fs.lstatSync(path.join(root, "S1"), { bigint: true });
    assert.equal(fdAfterLink.nlink, 1n);
    assert.equal(target.isFile(), true);
    assert.equal(target.isSymbolicLink(), false);
    assert.equal(target.uid, currentUid());
    assert.equal(Number(target.mode) & 0o777, 0o600);
    assert.equal(target.nlink, 1n);
    assert.equal(target.dev, identity.dev);
    assert.equal(target.ino, identity.ino);
    assert.equal(target.size, BigInt(VOID_DATANET_PAYLOAD_BYTES_V1));
    assert.ok(allocatedBytes(target) >= BigInt(VOID_DATANET_PAYLOAD_BYTES_V1));

    // Publication readback is intentionally a fresh no-follow open after all
    // writable custody of the published payload inode has been closed.
    fs.closeSync(fd);
    fd = -1;
    const readback = fullHash(path.join(root, "S1"));
    assert.deepEqual(
      { calls: readback.calls, requested: readback.requested, completed: readback.completed },
      { calls: 1025, requested: 67_108_865, completed: 67_108_864 },
    );
    assert.equal(readback.sha256, ZERO_64_MIB_SHA256);

    const targetBeforeCollision = fs.lstatSync(path.join(root, "S1"), { bigint: true });
    collisionFd = openAnonymous(root);
    fs.writeSync(collisionFd, Buffer.from("foreign-candidate"), 0, 17, 0);
    fs.fsyncSync(collisionFd);
    const collisionPublished = linkExactFdCreateOnly(collisionFd, rootFd, "S1");
    assert.equal(collisionPublished, false, "existing S1 was unexpectedly replaceable");
    const targetAfterCollision = fs.lstatSync(path.join(root, "S1"), { bigint: true });
    assert.equal(targetAfterCollision.dev, targetBeforeCollision.dev);
    assert.equal(targetAfterCollision.ino, targetBeforeCollision.ino);
    assert.equal(fullHash(path.join(root, "S1")).sha256, ZERO_64_MIB_SHA256);
    assert.deepEqual(fs.readdirSync(root).sort(), ["S1"]);

    console.log(JSON.stringify({
      marker: MARKER,
      root_identity: rootIdentity,
      fallocate_helper: FALLOCATE,
      fallocate_sha256: helperSha256(FALLOCATE),
      link_helper: LN,
      link_helper_sha256: helperSha256(LN),
      admitted_publication_helper_lifetimes: 2,
      fallocate_exact_bytes: VOID_DATANET_PAYLOAD_BYTES_V1,
      anonymous_owner_uid_bound: true,
      anonymous_mode_0600_bound: true,
      anonymous_reserved_bytes_min: Number(allocatedBytes(reserved)),
      anonymous_nlink_before_publication: Number(reserved.nlink),
      payload_write_calls: written.calls,
      payload_write_bytes: written.bytes,
      payload_sha256: written.sha256,
      create_only_publication: true,
      published_owner_uid_bound: true,
      published_mode_0600_bound: true,
      published_inode_preserved: true,
      parent_directory_fsync: true,
      writable_custody_closed_before_readback: true,
      publication_readback: readback,
      existing_s1_replacement_rejected: true,
      existing_s1_preserved: true,
      helper_processes_required_by_node_runtime: true,
      dedicated_ext4_image_full_reservation_proved: false,
      fiemap_provenance_proved: false,
      h1_integrated_with_candidate_classifier: false,
      cold_storage_acceptance_claimed: false,
      production_runtime_touched: false,
    }));
  } finally {
    if (collisionFd >= 0) fs.closeSync(collisionFd);
    if (fd >= 0) fs.closeSync(fd);
    fs.closeSync(rootFd);
    fs.rmSync(root, { recursive: true, force: true });
  }
}

main();
