// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import { runDatanetBoundedPayloadIoV1 } from "./datanet_v24_bounded_payload_io_v1.mjs";

const GREEN_MARKER = "VOID_DATANET_H1_ADMITTED_S0_S1_PUBLICATION_EXT4_V1_GREEN";
const REJECT_MARKER = "VOID_DATANET_H1_ADMITTED_S0_S1_PUBLICATION_EXT4_V1_REJECTED";
const O_TMPFILE = 0o20200000;
const O_DIRECTORY = fs.constants.O_DIRECTORY || 0;
const O_NOFOLLOW = fs.constants.O_NOFOLLOW || 0;
const O_CLOEXEC = fs.constants.O_CLOEXEC || 0;

const fixture = JSON.parse(fs.readFileSync(
  new URL("../fixtures/datanet-h1-s0-s1-publication-ext4-v1.json", import.meta.url),
  "utf8",
));

const EXACT_FIXTURE_KEYS = [
  "v", "format", "quota_key", "slot_names", "forbidden_slot", "forbidden_slot_name",
  "payload_bytes", "io_block_bytes", "payload_sha256", "filesystem_type",
  "filesystem_magic_hex", "image_bytes", "fallocate_path", "fallocate_sha256",
  "link_path", "link_sha256", "helper_timeout_ms", "helper_stderr_max_bytes",
  "one_publication_ledger", "successful_helper_lifetimes",
].sort();
assert.deepEqual(Object.keys(fixture).sort(), EXACT_FIXTURE_KEYS);
assert.equal(fixture.v, 1);
assert.equal(fixture.format, "VOID_DATANET_H1_S0_S1_PUBLICATION_EXT4_CONTROL_V1");
assert.match(fixture.quota_key, /^[0-9a-f]{64}$/);
assert.deepEqual(Object.keys(fixture.slot_names).sort(), ["0", "1"]);
assert.equal(fixture.slot_names["0"], `datanet-${fixture.quota_key}-s0.v1`);
assert.equal(fixture.slot_names["1"], `datanet-${fixture.quota_key}-s1.v1`);
assert.equal(fixture.forbidden_slot, 2);
assert.equal(fixture.forbidden_slot_name, `datanet-${fixture.quota_key}-s2.v1`);
assert.equal(fixture.payload_bytes, 67_108_864);
assert.equal(fixture.io_block_bytes, 65_536);
assert.equal(fixture.payload_bytes % fixture.io_block_bytes, 0);
assert.match(fixture.payload_sha256, /^[0-9a-f]{64}$/);
assert.equal(fixture.filesystem_type, "ext4");
assert.equal(fixture.filesystem_magic_hex, "ef53");
assert.equal(fixture.image_bytes, 402_653_184);
assert.equal(fixture.helper_timeout_ms, 5_000);
assert.equal(fixture.helper_stderr_max_bytes, 8_192);
assert.deepEqual(fixture.successful_helper_lifetimes, { fallocate: 1, link: 1 });

function emit(obj) {
  process.stdout.write(`${JSON.stringify(obj)}\n`);
}

function sha256File(filePath) {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function helperIdentity(filePath, expectedSha256) {
  assert.equal(filePath.startsWith("/"), true, `helper path is not absolute: ${filePath}`);
  const st = fs.statSync(filePath, { bigint: true });
  assert.equal(st.isFile(), true, `${filePath} is not regular`);
  fs.accessSync(filePath, fs.constants.X_OK);
  const sha256 = sha256File(filePath);
  assert.equal(sha256, expectedSha256, `${filePath} SHA-256 drift`);
  return Object.freeze({
    path: filePath,
    sha256,
    dev: String(st.dev),
    ino: String(st.ino),
    uid: String(st.uid),
    mode: (Number(st.mode) & 0o7777).toString(8),
    bytes: Number(st.size),
    regular: true,
    executable: true,
  });
}

function currentUid() {
  assert.equal(typeof process.getuid, "function", "process.getuid unavailable");
  return BigInt(process.getuid());
}

function identity(st) {
  return Object.freeze({ dev: String(st.dev), ino: String(st.ino) });
}

function identityText(st) {
  const id = identity(st);
  return `${id.dev}:${id.ino}`;
}

function allocatedBytes(st) {
  return BigInt(st.blocks) * 512n;
}

function parseRequestedSlot() {
  const raw = process.env.VOID_DATANET_TARGET_SLOT;
  assert.equal(typeof raw, "string", "VOID_DATANET_TARGET_SLOT is required");
  assert.match(raw, /^(0|1|2)$/);
  return Number(raw);
}

function parseAdmissionBinding() {
  const expectedName = `.void-datanet-admission-${fixture.quota_key}.lock.v1`;
  const name = process.env.VOID_DATANET_ADMISSION_CAPABILITY_NAME;
  const rootIdentity = process.env.VOID_DATANET_ADMISSION_ROOT_IDENTITY;
  const lockIdentity = process.env.VOID_DATANET_ADMISSION_CAPABILITY_IDENTITY;
  const lockFdRaw = process.env.VOID_DATANET_ADMISSION_LOCK_FD;
  assert.equal(name, expectedName, "admission capability name drift");
  assert.equal(typeof rootIdentity, "string");
  assert.match(rootIdentity, /^[0-9]+:[0-9]+$/);
  assert.equal(typeof lockIdentity, "string");
  assert.match(lockIdentity, /^[0-9]+:[0-9]+$/);
  assert.equal(typeof lockFdRaw, "string");
  assert.match(lockFdRaw, /^[0-9]+$/);
  const lockFd = Number(lockFdRaw);
  assert.equal(Number.isSafeInteger(lockFd), true);
  assert.ok(lockFd >= 3, "admission lock fd must be inherited above stdio");
  return Object.freeze({ name, root_identity: rootIdentity, lock_identity: lockIdentity, lock_fd: lockFd });
}

function parseOptionalHoldFd(lockFd) {
  const raw = process.env.VOID_DATANET_HOLD_FD;
  if (raw === undefined) return null;
  assert.match(raw, /^[0-9]+$/, "VOID_DATANET_HOLD_FD must be a decimal fd");
  const fd = Number(raw);
  assert.equal(Number.isSafeInteger(fd), true);
  assert.ok(fd >= 3, "hold fd must be inherited above stdio");
  assert.notEqual(fd, lockFd, "hold fd must differ from admission lock fd");
  return fd;
}

function awaitOptionalHold(fd) {
  if (fd === null) return;
  const token = Buffer.alloc(1);
  const n = fs.readSync(fd, token, 0, 1, null);
  assert.equal(n, 1, "campaign hold release missing");
  assert.equal(token[0], "X".charCodeAt(0), "campaign hold release token mismatch");
}

function requireAdmissionCapability(rootStable, binding) {
  const path = `${rootStable}/${binding.name}`;
  const visible = fs.lstatSync(path, { bigint: true });
  assert.equal(visible.isFile(), true, "admission capability is not regular");
  assert.equal(visible.isSymbolicLink(), false, "admission capability is symlink");
  assert.equal(visible.uid, currentUid(), "admission capability UID drift");
  assert.equal(Number(visible.mode) & 0o777, 0o600, "admission capability mode drift");
  assert.equal(visible.nlink, 1n, "admission capability nlink drift");
  assert.equal(visible.size, 0n, "admission capability size drift");
  assert.equal(identityText(visible), binding.lock_identity, "visible admission capability identity drift");

  const inherited = fs.fstatSync(binding.lock_fd, { bigint: true });
  assert.equal(inherited.isFile(), true, "inherited admission fd is not regular");
  assert.equal(inherited.uid, currentUid(), "inherited admission fd UID drift");
  assert.equal(Number(inherited.mode) & 0o777, 0o600, "inherited admission fd mode drift");
  assert.equal(inherited.nlink, 1n, "inherited admission fd nlink drift");
  assert.equal(inherited.size, 0n, "inherited admission fd size drift");
  assert.equal(identityText(inherited), binding.lock_identity, "inherited admission fd identity drift");
  assert.deepEqual(identity(inherited), identity(visible), "inherited admission fd does not match visible capability");
  return Object.freeze({
    name: binding.name,
    root_identity: binding.root_identity,
    lock_identity: binding.lock_identity,
    inherited_lock_fd: binding.lock_fd,
    inherited_lock_fd_verified: true,
    visible_and_identity_bound: true,
  });
}

function statfsBytes(rootStable) {
  const st = fs.statfsSync(rootStable, { bigint: true });
  return Object.freeze({
    type: BigInt(st.type),
    bsize: BigInt(st.bsize),
    blocks: BigInt(st.blocks),
    bfree: BigInt(st.bfree),
    bavail: BigInt(st.bavail),
    free_bytes: BigInt(st.bfree) * BigInt(st.bsize),
    available_bytes: BigInt(st.bavail) * BigInt(st.bsize),
  });
}

function requireAnonymous(fd, expectedIdentity, expectedSize, minimumAllocated) {
  const st = fs.fstatSync(fd, { bigint: true });
  assert.equal(st.isFile(), true, "anonymous inode not regular");
  assert.equal(st.uid, currentUid(), "anonymous inode UID drift");
  assert.equal(Number(st.mode) & 0o777, 0o600, "anonymous inode mode drift");
  assert.equal(st.nlink, 0n, "anonymous inode unexpectedly linked");
  assert.equal(st.size, BigInt(expectedSize), "anonymous inode size drift");
  assert.deepEqual(identity(st), expectedIdentity, "anonymous inode identity drift");
  assert.ok(allocatedBytes(st) >= BigInt(minimumAllocated), "anonymous inode reservation shortfall");
  return st;
}

function requirePublishedSlot(rootStable, slotName, expectedIdentity = null) {
  const st = fs.lstatSync(`${rootStable}/${slotName}`, { bigint: true });
  assert.equal(st.isFile(), true, `${slotName}: not regular`);
  assert.equal(st.isSymbolicLink(), false, `${slotName}: symlink`);
  assert.equal(st.uid, currentUid(), `${slotName}: UID drift`);
  assert.equal(Number(st.mode) & 0o777, 0o600, `${slotName}: mode drift`);
  assert.equal(st.nlink, 1n, `${slotName}: nlink drift`);
  assert.equal(st.size, BigInt(fixture.payload_bytes), `${slotName}: size drift`);
  assert.ok(allocatedBytes(st) >= BigInt(fixture.payload_bytes), `${slotName}: reservation shortfall`);
  if (expectedIdentity !== null) assert.deepEqual(identity(st), expectedIdentity, `${slotName}: identity drift`);
  return st;
}

function runHelper(executable, args, inheritedFds) {
  const stdio = ["ignore", "ignore", "pipe", ...inheritedFds];
  const result = spawnSync(executable, args, {
    cwd: "/",
    env: { LANG: "C", LC_ALL: "C" },
    timeout: fixture.helper_timeout_ms,
    killSignal: "SIGKILL",
    maxBuffer: fixture.helper_stderr_max_bytes,
    stdio,
  });
  const stderr = Buffer.isBuffer(result.stderr) ? result.stderr : Buffer.from(result.stderr || "");
  assert.ok(stderr.length <= fixture.helper_stderr_max_bytes, "helper stderr bound exceeded");
  assert.equal(result.error, undefined, `${executable} error: ${String(result.error)}`);
  assert.equal(result.signal, null, `${executable} signal: ${String(result.signal)}`);
  assert.ok(Number.isInteger(result.pid) && result.pid > 0, `${executable} missing helper pid`);
  return Object.freeze({ status: result.status, stderr: stderr.toString("utf8"), pid: result.pid });
}

function fallocateExact(payloadFd) {
  const result = runHelper(
    fixture.fallocate_path,
    ["--length", String(fixture.payload_bytes), "/proc/self/fd/3"],
    [payloadFd],
  );
  assert.equal(result.status, 0, `fallocate status=${String(result.status)} stderr=${result.stderr.trim()}`);
  return result;
}

function linkExactCreateOnly(payloadFd, rootFd, slotName) {
  const result = runHelper(
    fixture.link_path,
    ["-L", "-T", "--", "/proc/self/fd/3", `/proc/self/fd/4/${slotName}`],
    [payloadFd, rootFd],
  );
  assert.equal(result.status, 0, `link status=${String(result.status)} stderr=${result.stderr.trim()}`);
  return result;
}

function writePayload(fd) {
  const block = Buffer.alloc(fixture.io_block_bytes);
  const hash = createHash("sha256");
  const ledger = runDatanetBoundedPayloadIoV1({
    phase: "publisher-write",
    kind: "write",
    totalBytes: fixture.payload_bytes,
    blockBytes: fixture.io_block_bytes,
    dispatch(operation) {
      return fs.writeSync(fd, block, 0, operation.requested, operation.offset);
    },
    onFullResult(_operation, result) {
      hash.update(block.subarray(0, result));
    },
  });
  assert.equal(ledger.retry_count, 0, "publisher write retried payload I/O");
  const sha256 = hash.digest("hex");
  assert.equal(sha256, fixture.payload_sha256, "write-stream payload hash drift");
  return Object.freeze({
    calls: ledger.calls,
    requested: ledger.requested,
    completed: ledger.completed,
    sha256,
  });
}

function fullHashFd(fd, label) {
  const st = fs.fstatSync(fd, { bigint: true });
  assert.equal(st.isFile(), true, `${label}: nonregular`);
  assert.equal(st.size, BigInt(fixture.payload_bytes), `${label}: size drift`);
  const block = Buffer.alloc(fixture.io_block_bytes);
  const hash = createHash("sha256");
  const ledger = runDatanetBoundedPayloadIoV1({
    phase: label,
    kind: "read",
    totalBytes: fixture.payload_bytes,
    blockBytes: fixture.io_block_bytes,
    includeEofProbe: true,
    dispatch(operation) {
      return fs.readSync(fd, block, 0, operation.requested, operation.offset);
    },
    onFullResult(_operation, result) {
      hash.update(block.subarray(0, result));
    },
  });
  assert.equal(ledger.retry_count, 0, `${label}: payload read retried`);
  const sha256 = hash.digest("hex");
  assert.equal(sha256, fixture.payload_sha256, `${label}: payload hash mismatch`);
  return Object.freeze({
    calls: ledger.calls,
    requested: ledger.requested,
    completed: ledger.completed,
    sha256,
    eof_probes: ledger.eof_probes,
  });
}

function assertLedger(actual, expected, prefix) {
  assert.deepEqual(
    { calls: actual.calls, requested: actual.requested, completed: actual.completed },
    {
      calls: expected[`${prefix}_calls`],
      requested: expected[`${prefix}_requested_bytes`],
      completed: expected[`${prefix}_completed_bytes`] ?? expected[`${prefix}_returned_bytes`],
    },
  );
}

function assertSlotMissing(rootStable, slotName) {
  try {
    fs.lstatSync(`${rootStable}/${slotName}`, { bigint: true });
    assert.fail(`slot already exists: ${slotName}`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

function verifyExistingS0BeforeAllocation(rootStable) {
  const slot0 = fixture.slot_names["0"];
  const before = requirePublishedSlot(rootStable, slot0);
  const beforeIdentity = identity(before);
  const fd = fs.openSync(`${rootStable}/${slot0}`, fs.constants.O_RDONLY | O_NOFOLLOW | O_CLOEXEC);
  try {
    const opened = fs.fstatSync(fd, { bigint: true });
    assert.deepEqual(identity(opened), beforeIdentity, "S0 changed between lstat and open");
    assert.equal(allocatedBytes(opened), allocatedBytes(before), "S0 allocation drift before verification");
    const ledger = fullHashFd(fd, "existing-s0-before-s1-allocation");
    assert.deepEqual(identity(fs.fstatSync(fd, { bigint: true })), beforeIdentity, "S0 changed during verification");
    return Object.freeze({
      identity: beforeIdentity,
      allocated_bytes: String(allocatedBytes(before)),
      ledger,
      verified_before_candidate_allocation: true,
    });
  } finally {
    fs.closeSync(fd);
  }
}

function expectedNamespaceBefore(targetSlot, capabilityName) {
  return targetSlot === 0
    ? [capabilityName]
    : [capabilityName, fixture.slot_names["0"]].sort();
}

function expectedNamespaceAfter(targetSlot, capabilityName) {
  return targetSlot === 0
    ? [capabilityName, fixture.slot_names["0"]].sort()
    : [capabilityName, fixture.slot_names["0"], fixture.slot_names["1"]].sort();
}

function main() {
  assert.equal(process.platform, "linux", "Linux-only proof");
  const requestedSlot = parseRequestedSlot();
  const admission = parseAdmissionBinding();
  const holdFd = parseOptionalHoldFd(admission.lock_fd);
  const fallocateIdentity = helperIdentity(fixture.fallocate_path, fixture.fallocate_sha256);
  const linkIdentity = helperIdentity(fixture.link_path, fixture.link_sha256);

  const rootInput = process.env.VOID_DATANET_EXT4_ROOT;
  assert.equal(typeof rootInput, "string", "VOID_DATANET_EXT4_ROOT is required");
  assert.ok(rootInput.length > 1, "invalid ext4 root");
  const rootFd = fs.openSync(rootInput, fs.constants.O_RDONLY | O_DIRECTORY | O_NOFOLLOW | O_CLOEXEC);
  const rootStable = `/proc/self/fd/${rootFd}`;
  let payloadFd = -1;
  let readbackFd = -1;
  let existingS0 = null;
  try {
    const rootStat = fs.fstatSync(rootFd, { bigint: true });
    assert.equal(rootStat.isDirectory(), true, "store root not directory");
    assert.equal(identityText(rootStat), admission.root_identity, "admission root identity drift");
    const admissionReceipt = requireAdmissionCapability(rootStable, admission);
    const fsBeforeAny = statfsBytes(rootStable);
    assert.equal(fsBeforeAny.type, BigInt(`0x${fixture.filesystem_magic_hex}`), "filesystem is not ext4");

    if (requestedSlot === fixture.forbidden_slot) {
      const beforeNames = fs.readdirSync(rootStable).sort();
      assert.deepEqual(
        beforeNames,
        [admission.name, fixture.slot_names["0"], fixture.slot_names["1"]].sort(),
        "noncanonical namespace before S2 rejection",
      );
      assertSlotMissing(rootStable, fixture.forbidden_slot_name);
      requireAdmissionCapability(rootStable, admission);
      emit({
        marker: REJECT_MARKER,
        status: "REJECTED",
        reason: "S2_FORBIDDEN_BEFORE_MUTATION",
        requested_slot: requestedSlot,
        requested_slot_name: fixture.forbidden_slot_name,
        publisher_pid: process.pid,
        quota_key: fixture.quota_key,
        root_identity: identity(rootStat),
        admission_capability_binding: admissionReceipt,
        mutation_started: false,
        anonymous_payload_inode_opened: false,
        helper_lifetimes: { fallocate: 0, link: 0 },
        helper_identities: { fallocate: fallocateIdentity, link: linkIdentity },
        campaign_hold_fd_active: holdFd !== null,
        root_k_posix_capability_composed: true,
        production_runtime_touched: false,
      });
      process.exitCode = 3;
      awaitOptionalHold(holdFd);
      return;
    }

    assert.ok(requestedSlot === 0 || requestedSlot === 1);
    const targetSlotName = fixture.slot_names[String(requestedSlot)];
    const beforeNames = fs.readdirSync(rootStable).sort();
    assert.deepEqual(
      beforeNames,
      expectedNamespaceBefore(requestedSlot, admission.name),
      "noncanonical namespace before publication",
    );
    assertSlotMissing(rootStable, fixture.forbidden_slot_name);
    assertSlotMissing(rootStable, targetSlotName);

    if (requestedSlot === 1) {
      existingS0 = verifyExistingS0BeforeAllocation(rootStable);
      requireAdmissionCapability(rootStable, admission);
      assert.deepEqual(fs.readdirSync(rootStable).sort(), beforeNames, "namespace changed during S0 verification");
      assertSlotMissing(rootStable, fixture.slot_names["1"]);
      assertSlotMissing(rootStable, fixture.forbidden_slot_name);
    }

    requireAdmissionCapability(rootStable, admission);
    payloadFd = fs.openSync(rootStable, fs.constants.O_RDWR | O_TMPFILE | O_CLOEXEC, 0o600);
    fs.fchmodSync(payloadFd, 0o600);
    const initial = fs.fstatSync(payloadFd, { bigint: true });
    assert.equal(initial.isFile(), true);
    assert.equal(initial.uid, currentUid());
    assert.equal(Number(initial.mode) & 0o777, 0o600);
    assert.equal(initial.nlink, 0n);
    assert.equal(initial.size, 0n);
    const payloadIdentity = identity(initial);
    const initialAllocated = allocatedBytes(initial);
    assert.equal(initialAllocated, 0n, "fresh anonymous inode unexpectedly allocated payload blocks");
    if (existingS0 !== null) assert.notDeepEqual(payloadIdentity, existingS0.identity, "S1 anonymous candidate aliases S0");

    const freeBeforeReservation = statfsBytes(rootStable);
    const fallocateResult = fallocateExact(payloadFd);
    const reserved = requireAnonymous(payloadFd, payloadIdentity, fixture.payload_bytes, fixture.payload_bytes);
    const freeAfterReservation = statfsBytes(rootStable);
    const reservedInodeBytes = allocatedBytes(reserved);
    assert.ok(reservedInodeBytes >= BigInt(fixture.payload_bytes), "full reservation shortfall");
    assert.deepEqual(fs.readdirSync(rootStable).sort(), beforeNames, "reservation mutated namespace");
    requireAdmissionCapability(rootStable, admission);

    const writeLedger = writePayload(payloadFd);
    assertLedger(writeLedger, fixture.one_publication_ledger, "write");
    fs.fsyncSync(payloadFd);
    const afterWrite = requireAnonymous(payloadFd, payloadIdentity, fixture.payload_bytes, fixture.payload_bytes);
    assert.equal(allocatedBytes(afterWrite), reservedInodeBytes, "allocation drift after payload write");

    const prepublication = fullHashFd(payloadFd, "prepublication-anonymous");
    assertLedger(prepublication, fixture.one_publication_ledger, "prepublication_read");
    requireAnonymous(payloadFd, payloadIdentity, fixture.payload_bytes, fixture.payload_bytes);

    assert.deepEqual(fs.readdirSync(rootStable).sort(), beforeNames, "namespace drift before publication");
    requireAdmissionCapability(rootStable, admission);
    assertSlotMissing(rootStable, targetSlotName);
    assertSlotMissing(rootStable, fixture.forbidden_slot_name);
    if (existingS0 !== null) {
      const currentS0 = requirePublishedSlot(rootStable, fixture.slot_names["0"], existingS0.identity);
      assert.equal(String(allocatedBytes(currentS0)), existingS0.allocated_bytes, "S0 allocation drift before S1 link");
    }

    const linkResult = linkExactCreateOnly(payloadFd, rootFd, targetSlotName);
    const linkedFromFd = fs.fstatSync(payloadFd, { bigint: true });
    const target = requirePublishedSlot(rootStable, targetSlotName, payloadIdentity);
    assert.deepEqual(identity(linkedFromFd), payloadIdentity, "source inode changed during link");
    assert.equal(linkedFromFd.nlink, 1n);
    assert.equal(allocatedBytes(target), reservedInodeBytes, "published inode allocation drift");
    fs.fsyncSync(rootFd);

    fs.closeSync(payloadFd);
    payloadFd = -1;
    readbackFd = fs.openSync(`${rootStable}/${targetSlotName}`, fs.constants.O_RDONLY | O_NOFOLLOW | O_CLOEXEC);
    const openedReadback = fs.fstatSync(readbackFd, { bigint: true });
    assert.deepEqual(identity(openedReadback), payloadIdentity, "fresh readback opened different inode");
    assert.equal(openedReadback.nlink, 1n);
    assert.equal(allocatedBytes(openedReadback), reservedInodeBytes, "readback allocation drift");
    const postpublication = fullHashFd(readbackFd, "postpublication-readback");
    assertLedger(postpublication, fixture.one_publication_ledger, "postpublication_read");
    fs.closeSync(readbackFd);
    readbackFd = -1;

    const afterNames = fs.readdirSync(rootStable).sort();
    assert.deepEqual(
      afterNames,
      expectedNamespaceAfter(requestedSlot, admission.name),
      "noncanonical terminal namespace",
    );
    assertSlotMissing(rootStable, fixture.forbidden_slot_name);
    const terminalAdmission = requireAdmissionCapability(rootStable, admission);
    const terminalTarget = requirePublishedSlot(rootStable, targetSlotName, payloadIdentity);
    assert.equal(allocatedBytes(terminalTarget), reservedInodeBytes, "terminal allocation drift");

    let terminalS0Identity = null;
    let s0S1Distinct = null;
    if (requestedSlot === 1) {
      const terminalS0 = requirePublishedSlot(rootStable, fixture.slot_names["0"], existingS0.identity);
      terminalS0Identity = identity(terminalS0);
      s0S1Distinct = (
        terminalS0Identity.dev !== payloadIdentity.dev ||
        terminalS0Identity.ino !== payloadIdentity.ino
      );
      assert.equal(s0S1Distinct, true, "S0/S1 must be distinct inodes");
    }

    const freeTerminal = statfsBytes(rootStable);
    emit({
      marker: GREEN_MARKER,
      status: "GREEN",
      requested_slot: requestedSlot,
      target_slot_name: targetSlotName,
      publisher_pid: process.pid,
      quota_key: fixture.quota_key,
      root_identity: identity(rootStat),
      filesystem_magic_hex: fixture.filesystem_magic_hex,
      admission_capability_binding: terminalAdmission,
      payload_identity: payloadIdentity,
      payload_bytes: fixture.payload_bytes,
      payload_sha256: fixture.payload_sha256,
      helper_identities: { fallocate: fallocateIdentity, link: linkIdentity },
      successful_helper_lifetimes: { fallocate: 1, link: 1 },
      helper_processes: {
        fallocate: { count: 1, pid: fallocateResult.pid },
        link: { count: 1, pid: linkResult.pid },
      },
      helper_execution_sequential: true,
      test_only_collision_link_helper_lifetimes: 0,
      existing_s0_verification: existingS0,
      s0_verified_before_s1_candidate_allocation: requestedSlot === 1,
      terminal_s0_identity: terminalS0Identity,
      s0_s1_distinct_inodes: s0S1Distinct,
      s2_selected: false,
      s2_created: false,
      namespace_before: beforeNames,
      namespace_after: afterNames,
      reservation: {
        initial_allocated_bytes: String(initialAllocated),
        reserved_inode_bytes: String(reservedInodeBytes),
        inode_local_full_reservation_proved: true,
        free_bytes_before_candidate: String(fsBeforeAny.free_bytes),
        free_bytes_before_reservation: String(freeBeforeReservation.free_bytes),
        free_bytes_after_reservation: String(freeAfterReservation.free_bytes),
        free_bytes_terminal: String(freeTerminal.free_bytes),
      },
      write_ledger: writeLedger,
      prepublication_anonymous_rehash: prepublication,
      postpublication_readback: postpublication,
      parent_directory_fsync: true,
      writable_payload_fd_closed_before_postpublication_readback: true,
      create_only_publication_preserved_inode: true,
      inherited_admission_lock_fd_verified_in_node: true,
      root_k_posix_capability_composed: true,
      campaign_hold_fd_active: holdFd !== null,
      full_27_lifetime_campaign_proved: false,
      source_bound_injected_fault_matrix_proved: false,
      fiemap_provenance_proved: false,
      cold_remount_proved: false,
      physical_power_loss_proved: false,
      public_peer_retrieval_proved: false,
      chain_2050_authority_claimed: false,
      production_runtime_touched: false,
    });
    awaitOptionalHold(holdFd);
  } finally {
    if (readbackFd >= 0) fs.closeSync(readbackFd);
    if (payloadFd >= 0) fs.closeSync(payloadFd);
    fs.closeSync(rootFd);
  }
}

main();