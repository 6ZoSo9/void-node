// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import { runDatanetBoundedPayloadIoV1 } from "./datanet_v24_bounded_payload_io_v1.mjs";

const GREEN_MARKER = "VOID_DATANET_H1_ADMITTED_S0_S1_PUBLICATION_EXT4_V1_GREEN";
const O_TMPFILE = 0o20200000;
const O_DIRECTORY = fs.constants.O_DIRECTORY || 0;
const O_NOFOLLOW = fs.constants.O_NOFOLLOW || 0;
const O_CLOEXEC = fs.constants.O_CLOEXEC || 0;
const U32_MAX = 0xffff_ffff;

const fixture = JSON.parse(fs.readFileSync(
  new URL("../fixtures/datanet-h1-s0-s1-publication-ext4-v1.json", import.meta.url),
  "utf8",
));

function emit(obj) {
  process.stdout.write(`${JSON.stringify(obj)}\n`);
}

function sha256File(filePath) {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function helperIdentity(filePath, expectedSha256) {
  assert.equal(filePath.startsWith("/"), true);
  const st = fs.statSync(filePath, { bigint: true });
  assert.equal(st.isFile(), true);
  fs.accessSync(filePath, fs.constants.X_OK);
  const sha256 = sha256File(filePath);
  assert.equal(sha256, expectedSha256);
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
  assert.equal(typeof process.getuid, "function");
  return BigInt(process.getuid());
}

function identity(st) {
  return Object.freeze({ dev: String(st.dev), ino: String(st.ino) });
}

function identityText(st) {
  const value = identity(st);
  return `${value.dev}:${value.ino}`;
}

function allocatedBytes(st) {
  return BigInt(st.blocks) * 512n;
}

function parseDecimalFd(name) {
  const raw = process.env[name];
  assert.equal(typeof raw, "string", `${name} is required`);
  assert.match(raw, /^[0-9]+$/);
  const fd = Number(raw);
  assert.equal(Number.isSafeInteger(fd), true);
  assert.ok(fd >= 3);
  return fd;
}

function parseAdmissionBinding() {
  const expectedName = `.void-datanet-admission-${fixture.quota_key}.lock.v1`;
  const name = process.env.VOID_DATANET_ADMISSION_CAPABILITY_NAME;
  const rootIdentity = process.env.VOID_DATANET_ADMISSION_ROOT_IDENTITY;
  const lockIdentity = process.env.VOID_DATANET_ADMISSION_CAPABILITY_IDENTITY;
  const lockFd = parseDecimalFd("VOID_DATANET_ADMISSION_LOCK_FD");
  assert.equal(name, expectedName);
  assert.match(rootIdentity, /^[0-9]+:[0-9]+$/);
  assert.match(lockIdentity, /^[0-9]+:[0-9]+$/);
  return Object.freeze({ name, root_identity: rootIdentity, lock_identity: lockIdentity, lock_fd: lockFd });
}

function parseGenerationBinding(lockFd, holdFd) {
  const fd = parseDecimalFd("VOID_DATANET_VERIFIED_S0_FD");
  assert.notEqual(fd, lockFd);
  assert.notEqual(fd, holdFd);
  const identityValue = process.env.VOID_DATANET_VERIFIED_S0_IDENTITY;
  const generationRaw = process.env.VOID_DATANET_VERIFIED_S0_GENERATION;
  const moduleSha256 = process.env.VOID_DATANET_VERIFIED_S0_GENERATION_MODULE_SHA256;
  assert.match(identityValue, /^[0-9]+:[0-9]+$/);
  assert.match(generationRaw, /^(0|[1-9][0-9]*)$/);
  assert.match(moduleSha256, /^[0-9a-f]{64}$/);
  const generation = Number(generationRaw);
  assert.equal(Number.isSafeInteger(generation), true);
  assert.ok(generation >= 0 && generation <= U32_MAX);
  return Object.freeze({ fd, identity: identityValue, generation, generation_module_sha256: moduleSha256 });
}

function requireAdmissionCapability(rootStable, binding) {
  const visible = fs.lstatSync(`${rootStable}/${binding.name}`, { bigint: true });
  assert.equal(visible.isFile(), true);
  assert.equal(visible.isSymbolicLink(), false);
  assert.equal(visible.uid, currentUid());
  assert.equal(Number(visible.mode) & 0o777, 0o600);
  assert.equal(visible.nlink, 1n);
  assert.equal(visible.size, 0n);
  assert.equal(identityText(visible), binding.lock_identity);

  const inherited = fs.fstatSync(binding.lock_fd, { bigint: true });
  assert.equal(inherited.isFile(), true);
  assert.equal(inherited.uid, currentUid());
  assert.equal(Number(inherited.mode) & 0o777, 0o600);
  assert.equal(inherited.nlink, 1n);
  assert.equal(inherited.size, 0n);
  assert.equal(identityText(inherited), binding.lock_identity);
  assert.deepEqual(identity(inherited), identity(visible));
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
  assert.equal(st.isFile(), true);
  assert.equal(st.uid, currentUid());
  assert.equal(Number(st.mode) & 0o777, 0o600);
  assert.equal(st.nlink, 0n);
  assert.equal(st.size, BigInt(expectedSize));
  assert.deepEqual(identity(st), expectedIdentity);
  assert.ok(allocatedBytes(st) >= BigInt(minimumAllocated));
  return st;
}

function requirePublishedSlot(rootStable, slotName, expectedIdentity = null) {
  const st = fs.lstatSync(`${rootStable}/${slotName}`, { bigint: true });
  assert.equal(st.isFile(), true);
  assert.equal(st.isSymbolicLink(), false);
  assert.equal(st.uid, currentUid());
  assert.equal(Number(st.mode) & 0o777, 0o600);
  assert.equal(st.nlink, 1n);
  assert.equal(st.size, BigInt(fixture.payload_bytes));
  assert.ok(allocatedBytes(st) >= BigInt(fixture.payload_bytes));
  if (expectedIdentity !== null) assert.deepEqual(identity(st), expectedIdentity);
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
  assert.ok(stderr.length <= fixture.helper_stderr_max_bytes);
  assert.equal(result.error, undefined);
  assert.equal(result.signal, null);
  assert.ok(Number.isInteger(result.pid) && result.pid > 0);
  return Object.freeze({ status: result.status, stderr: stderr.toString("utf8"), pid: result.pid });
}

function fallocateExact(payloadFd) {
  const result = runHelper(fixture.fallocate_path, ["--length", String(fixture.payload_bytes), "/proc/self/fd/3"], [payloadFd]);
  assert.equal(result.status, 0, result.stderr);
  return result;
}

function linkExactCreateOnly(payloadFd, rootFd, slotName) {
  const result = runHelper(fixture.link_path, ["-L", "-T", "--", "/proc/self/fd/3", `/proc/self/fd/4/${slotName}`], [payloadFd, rootFd]);
  assert.equal(result.status, 0, result.stderr);
  return result;
}

function boundedWrite(fd) {
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
  assert.equal(ledger.retry_count, 0);
  const sha256 = hash.digest("hex");
  assert.equal(sha256, fixture.payload_sha256);
  return Object.freeze({ calls: ledger.calls, requested: ledger.requested, completed: ledger.completed, sha256 });
}

function fullHashFd(fd, label) {
  const st = fs.fstatSync(fd, { bigint: true });
  assert.equal(st.isFile(), true, `${label}: nonregular`);
  assert.equal(st.size, BigInt(fixture.payload_bytes), `${label}: size`);
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
  assert.equal(ledger.retry_count, 0, `${label}: retry`);
  const sha256 = hash.digest("hex");
  assert.equal(sha256, fixture.payload_sha256, `${label}: hash`);
  return Object.freeze({ calls: ledger.calls, requested: ledger.requested, completed: ledger.completed, sha256, eof_probes: ledger.eof_probes });
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

function verifyInheritedS0(rootStable, generationBinding) {
  const slot0 = fixture.slot_names["0"];
  const openedBefore = fs.fstatSync(generationBinding.fd, { bigint: true });
  const visibleBefore = requirePublishedSlot(rootStable, slot0);
  assert.equal(identityText(openedBefore), generationBinding.identity);
  assert.deepEqual(identity(openedBefore), identity(visibleBefore));
  assert.equal(openedBefore.uid, currentUid());
  assert.equal(Number(openedBefore.mode) & 0o777, 0o600);
  assert.equal(openedBefore.nlink, 1n);
  assert.equal(openedBefore.size, BigInt(fixture.payload_bytes));
  const allocated = allocatedBytes(openedBefore);
  assert.ok(allocated >= BigInt(fixture.payload_bytes));

  const ledger = fullHashFd(generationBinding.fd, "existing-s0-inherited-before-s1-allocation");
  assertLedger(ledger, fixture.one_publication_ledger, "postpublication_read");

  const openedAfter = fs.fstatSync(generationBinding.fd, { bigint: true });
  const visibleAfter = requirePublishedSlot(rootStable, slot0, identity(openedBefore));
  assert.equal(identityText(openedAfter), generationBinding.identity);
  assert.deepEqual(identity(openedAfter), identity(visibleAfter));
  assert.equal(allocatedBytes(openedAfter), allocated);
  return Object.freeze({
    identity: identity(openedBefore),
    generation: generationBinding.generation,
    generation_identity: `${generationBinding.identity}:${generationBinding.generation}`,
    generation_module_sha256: generationBinding.generation_module_sha256,
    inherited_s0_fd: generationBinding.fd,
    inherited_s0_fd_verified: true,
    generation_observed_pre_exec: true,
    generation_ioctl_calls_in_node: 0,
    canonical_name_matches_inherited_fd_before_allocation: true,
    allocated_bytes: String(allocated),
    ledger,
    verified_before_candidate_allocation: true,
  });
}

function awaitHold(fd) {
  const token = Buffer.alloc(1);
  const n = fs.readSync(fd, token, 0, 1, null);
  assert.equal(n, 1);
  assert.equal(token[0], "X".charCodeAt(0));
}

function main() {
  assert.equal(process.platform, "linux");
  assert.equal(process.env.VOID_DATANET_TARGET_SLOT, "1");
  const admission = parseAdmissionBinding();
  const holdFd = parseDecimalFd("VOID_DATANET_HOLD_FD");
  assert.notEqual(holdFd, admission.lock_fd);
  const generationBinding = parseGenerationBinding(admission.lock_fd, holdFd);
  const fallocateIdentity = helperIdentity(fixture.fallocate_path, fixture.fallocate_sha256);
  const linkIdentity = helperIdentity(fixture.link_path, fixture.link_sha256);

  const rootInput = process.env.VOID_DATANET_EXT4_ROOT;
  assert.equal(typeof rootInput, "string");
  assert.ok(rootInput.length > 1);
  const rootFd = fs.openSync(rootInput, fs.constants.O_RDONLY | O_DIRECTORY | O_NOFOLLOW | O_CLOEXEC);
  const rootStable = `/proc/self/fd/${rootFd}`;
  let payloadFd = -1;
  let readbackFd = -1;
  try {
    const rootStat = fs.fstatSync(rootFd, { bigint: true });
    assert.equal(rootStat.isDirectory(), true);
    assert.equal(identityText(rootStat), admission.root_identity);
    const admissionReceipt = requireAdmissionCapability(rootStable, admission);
    const fsBeforeAny = statfsBytes(rootStable);
    assert.equal(fsBeforeAny.type, BigInt(`0x${fixture.filesystem_magic_hex}`));

    const slot0 = fixture.slot_names["0"];
    const slot1 = fixture.slot_names["1"];
    assert.deepEqual(fs.readdirSync(rootStable).sort(), [admission.name, slot0].sort());
    assert.equal(fs.existsSync(`${rootStable}/${slot1}`), false);
    assert.equal(fs.existsSync(`${rootStable}/${fixture.forbidden_slot_name}`), false);

    const existingS0 = verifyInheritedS0(rootStable, generationBinding);
    requireAdmissionCapability(rootStable, admission);
    assert.deepEqual(fs.readdirSync(rootStable).sort(), [admission.name, slot0].sort());

    payloadFd = fs.openSync(rootStable, fs.constants.O_RDWR | O_TMPFILE | O_CLOEXEC, 0o600);
    fs.fchmodSync(payloadFd, 0o600);
    const initial = fs.fstatSync(payloadFd, { bigint: true });
    assert.equal(initial.isFile(), true);
    assert.equal(initial.uid, currentUid());
    assert.equal(Number(initial.mode) & 0o777, 0o600);
    assert.equal(initial.nlink, 0n);
    assert.equal(initial.size, 0n);
    const payloadIdentity = identity(initial);
    assert.notDeepEqual(payloadIdentity, existingS0.identity);
    const initialAllocated = allocatedBytes(initial);
    assert.equal(initialAllocated, 0n);

    const freeBeforeReservation = statfsBytes(rootStable);
    const fallocateResult = fallocateExact(payloadFd);
    const reserved = requireAnonymous(payloadFd, payloadIdentity, fixture.payload_bytes, fixture.payload_bytes);
    const freeAfterReservation = statfsBytes(rootStable);
    const reservedInodeBytes = allocatedBytes(reserved);

    const writeLedger = boundedWrite(payloadFd);
    assertLedger(writeLedger, fixture.one_publication_ledger, "write");
    fs.fsyncSync(payloadFd);
    requireAnonymous(payloadFd, payloadIdentity, fixture.payload_bytes, fixture.payload_bytes);
    const prepublication = fullHashFd(payloadFd, "prepublication-anonymous");
    assertLedger(prepublication, fixture.one_publication_ledger, "prepublication_read");

    const inheritedStill = fs.fstatSync(generationBinding.fd, { bigint: true });
    assert.equal(identityText(inheritedStill), generationBinding.identity);
    requirePublishedSlot(rootStable, slot0, existingS0.identity);
    assert.equal(fs.existsSync(`${rootStable}/${slot1}`), false);

    const linkResult = linkExactCreateOnly(payloadFd, rootFd, slot1);
    const linkedFromFd = fs.fstatSync(payloadFd, { bigint: true });
    const target = requirePublishedSlot(rootStable, slot1, payloadIdentity);
    assert.deepEqual(identity(linkedFromFd), payloadIdentity);
    assert.equal(linkedFromFd.nlink, 1n);
    assert.equal(allocatedBytes(target), reservedInodeBytes);
    fs.fsyncSync(rootFd);

    fs.closeSync(payloadFd);
    payloadFd = -1;
    readbackFd = fs.openSync(`${rootStable}/${slot1}`, fs.constants.O_RDONLY | O_NOFOLLOW | O_CLOEXEC);
    const postpublication = fullHashFd(readbackFd, "postpublication-readback");
    assertLedger(postpublication, fixture.one_publication_ledger, "postpublication_read");
    assert.deepEqual(identity(fs.fstatSync(readbackFd, { bigint: true })), payloadIdentity);
    fs.closeSync(readbackFd);
    readbackFd = -1;

    const terminalS0 = requirePublishedSlot(rootStable, slot0, existingS0.identity);
    assert.equal(identityText(fs.fstatSync(generationBinding.fd, { bigint: true })), generationBinding.identity);
    assert.deepEqual(identity(terminalS0), existingS0.identity);
    const terminalTarget = requirePublishedSlot(rootStable, slot1, payloadIdentity);
    assert.notDeepEqual(identity(terminalS0), identity(terminalTarget));
    const terminalAdmission = requireAdmissionCapability(rootStable, admission);
    const freeTerminal = statfsBytes(rootStable);

    emit({
      marker: GREEN_MARKER,
      status: "GREEN",
      requested_slot: 1,
      target_slot_name: slot1,
      publisher_pid: process.pid,
      publisher_variant: "generation-bound-inherited-s0-fd-v1",
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
      s0_verified_before_s1_candidate_allocation: true,
      terminal_s0_identity: identity(terminalS0),
      s0_s1_distinct_inodes: true,
      s2_selected: false,
      s2_created: false,
      namespace_before: [admission.name, slot0].sort(),
      namespace_after: fs.readdirSync(rootStable).sort(),
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
      inherited_verified_s0_fd_verified_in_node: true,
      verified_s0_fd_retained_through_s1_publication: true,
      root_k_posix_capability_composed: true,
      campaign_hold_fd_active: true,
      full_27_lifetime_campaign_proved: false,
      source_bound_injected_fault_matrix_proved: false,
      fiemap_provenance_proved: false,
      cold_remount_proved: false,
      physical_power_loss_proved: false,
      public_peer_retrieval_proved: false,
      chain_2050_authority_claimed: false,
      production_runtime_touched: false,
    });
    awaitHold(holdFd);
  } finally {
    if (readbackFd >= 0) fs.closeSync(readbackFd);
    if (payloadFd >= 0) fs.closeSync(payloadFd);
    fs.closeSync(rootFd);
  }
}

main();
