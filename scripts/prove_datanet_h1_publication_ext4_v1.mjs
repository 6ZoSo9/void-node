// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import * as fs from "node:fs";

const MARKER = "VOID_DATANET_H1_PUBLICATION_EXT4_V1_GREEN";
const O_TMPFILE = 0o20200000;
const O_DIRECTORY = fs.constants.O_DIRECTORY || 0;
const O_NOFOLLOW = fs.constants.O_NOFOLLOW || 0;
const O_CLOEXEC = fs.constants.O_CLOEXEC || 0;
const ADMISSION_PREFIX = ".void-datanet-admission-";
const ADMISSION_SUFFIX = ".lock.v1";

const fixture = JSON.parse(fs.readFileSync(
  new URL("../fixtures/datanet-h1-publication-ext4-v1.json", import.meta.url),
  "utf8",
));

const EXACT_FIXTURE_KEYS = [
  "v", "format", "quota_key", "slot", "slot_name", "payload_bytes", "io_block_bytes",
  "payload_sha256", "filesystem_type", "filesystem_magic_hex", "image_bytes",
  "fallocate_path", "fallocate_sha256", "link_path", "link_sha256",
  "helper_timeout_ms", "helper_stderr_max_bytes", "one_publication_ledger",
  "v29_composed_success_ledger",
].sort();
assert.deepEqual(Object.keys(fixture).sort(), EXACT_FIXTURE_KEYS);
assert.equal(fixture.v, 1);
assert.equal(fixture.format, "VOID_DATANET_H1_PUBLICATION_EXT4_CONTROL_V1");
assert.match(fixture.quota_key, /^[0-9a-f]{64}$/);
assert.equal(fixture.slot, 1);
assert.equal(fixture.slot_name, `datanet-${fixture.quota_key}-s1.v1`);
assert.equal(fixture.payload_bytes, 67_108_864);
assert.equal(fixture.io_block_bytes, 65_536);
assert.equal(fixture.payload_bytes % fixture.io_block_bytes, 0);
assert.match(fixture.payload_sha256, /^[0-9a-f]{64}$/);
assert.equal(fixture.filesystem_type, "ext4");
assert.equal(fixture.filesystem_magic_hex, "ef53");
assert.equal(fixture.image_bytes, 402_653_184);
assert.equal(fixture.helper_timeout_ms, 5_000);
assert.equal(fixture.helper_stderr_max_bytes, 8_192);
assert.deepEqual(fixture.v29_composed_success_ledger, {
  calls: 13_322,
  requested_bytes: 872_415_242,
  completed_or_returned_bytes: 872_415_232,
  writes: 3_072,
  reads: 10_250,
  nonempty_calls: 13_312,
  eof_probes: 10,
});

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
  const value = identity(st);
  return `${value.dev}:${value.ino}`;
}

function allocatedBytes(st) {
  return BigInt(st.blocks) * 512n;
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

function requireAdmissionCapability(rootStable, name, expectedIdentity) {
  const expectedName = `${ADMISSION_PREFIX}${fixture.quota_key}${ADMISSION_SUFFIX}`;
  assert.equal(name, expectedName, "admission capability name/K mismatch");
  assert.match(expectedIdentity, /^[0-9]+:[0-9]+$/, "invalid admission capability identity");
  const st = fs.lstatSync(`${rootStable}/${name}`, { bigint: true });
  assert.equal(st.isFile(), true, "admission capability not regular");
  assert.equal(st.isSymbolicLink(), false, "admission capability is symlink");
  assert.equal(st.uid, currentUid(), "admission capability UID drift");
  assert.equal(Number(st.mode) & 0o777, 0o600, "admission capability mode drift");
  assert.equal(st.nlink, 1n, "admission capability nlink drift");
  assert.equal(st.size, 0n, "admission capability size drift");
  assert.equal(identityText(st), expectedIdentity, "admission capability identity drift");
  return Object.freeze({ name, identity: expectedIdentity });
}

function expectedEntries(admission, ...extra) {
  const entries = admission === null ? [...extra] : [admission.name, ...extra];
  return entries.sort();
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
  return Object.freeze({ status: result.status, stderr: stderr.toString("utf8") });
}

function fallocateExact(payloadFd) {
  const result = runHelper(
    fixture.fallocate_path,
    ["--length", String(fixture.payload_bytes), "/proc/self/fd/3"],
    [payloadFd],
  );
  assert.equal(result.status, 0, `fallocate status=${String(result.status)} stderr=${result.stderr.trim()}`);
}

function linkExactCreateOnly(payloadFd, rootFd, slotName) {
  return runHelper(
    fixture.link_path,
    ["-L", "-T", "--", "/proc/self/fd/3", `/proc/self/fd/4/${slotName}`],
    [payloadFd, rootFd],
  );
}

function writePayload(fd) {
  const block = Buffer.alloc(fixture.io_block_bytes);
  const hash = createHash("sha256");
  let calls = 0;
  let requested = 0;
  let completed = 0;
  for (let offset = 0; offset < fixture.payload_bytes; offset += block.length) {
    const n = fs.writeSync(fd, block, 0, block.length, offset);
    calls += 1;
    requested += block.length;
    completed += n;
    assert.equal(n, block.length, `short payload write at ${offset}`);
    hash.update(block);
  }
  const sha256 = hash.digest("hex");
  assert.equal(sha256, fixture.payload_sha256, "write-stream payload hash drift");
  return Object.freeze({ calls, requested, completed, sha256 });
}

function fullHashFd(fd, label) {
  const st = fs.fstatSync(fd, { bigint: true });
  assert.equal(st.isFile(), true, `${label}: nonregular`);
  assert.equal(st.size, BigInt(fixture.payload_bytes), `${label}: size drift`);
  const block = Buffer.alloc(fixture.io_block_bytes);
  const hash = createHash("sha256");
  let calls = 0;
  let requested = 0;
  let completed = 0;
  for (let offset = 0; offset < fixture.payload_bytes; offset += block.length) {
    const n = fs.readSync(fd, block, 0, block.length, offset);
    calls += 1;
    requested += block.length;
    completed += n;
    assert.equal(n, block.length, `${label}: short read at ${offset}`);
    hash.update(block.subarray(0, n));
  }
  const eof = Buffer.alloc(1);
  const eofResult = fs.readSync(fd, eof, 0, 1, fixture.payload_bytes);
  calls += 1;
  requested += 1;
  completed += eofResult;
  assert.equal(eofResult, 0, `${label}: EOF probe returned data`);
  const sha256 = hash.digest("hex");
  assert.equal(sha256, fixture.payload_sha256, `${label}: payload hash mismatch`);
  return Object.freeze({ calls, requested, completed, sha256, eof_probes: 1 });
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

function main() {
  assert.equal(process.platform, "linux", "Linux-only proof");
  const rootInput = process.env.VOID_DATANET_EXT4_ROOT;
  assert.equal(typeof rootInput, "string", "VOID_DATANET_EXT4_ROOT is required");
  assert.ok(rootInput.length > 1, "invalid ext4 root");

  const admissionNameEnv = process.env.VOID_DATANET_ADMISSION_CAPABILITY_NAME;
  const admissionIdentityEnv = process.env.VOID_DATANET_ADMISSION_CAPABILITY_IDENTITY;
  const admissionRequested = admissionNameEnv !== undefined || admissionIdentityEnv !== undefined;
  if (admissionRequested) {
    assert.equal(typeof admissionNameEnv, "string", "admission capability name required");
    assert.equal(typeof admissionIdentityEnv, "string", "admission capability identity required");
  }

  const fallocateIdentity = helperIdentity(fixture.fallocate_path, fixture.fallocate_sha256);
  const linkIdentity = helperIdentity(fixture.link_path, fixture.link_sha256);

  const rootFd = fs.openSync(rootInput, fs.constants.O_RDONLY | O_DIRECTORY | O_NOFOLLOW | O_CLOEXEC);
  const rootStable = `/proc/self/fd/${rootFd}`;
  let payloadFd = -1;
  let readbackFd = -1;
  try {
    const rootStat = fs.fstatSync(rootFd, { bigint: true });
    assert.equal(rootStat.isDirectory(), true, "store root not directory");
    const rootIdentity = identity(rootStat);
    const admission = admissionRequested
      ? requireAdmissionCapability(rootStable, admissionNameEnv, admissionIdentityEnv)
      : null;
    const fsBeforeAny = statfsBytes(rootStable);
    assert.equal(fsBeforeAny.type, BigInt(`0x${fixture.filesystem_magic_hex}`), "filesystem is not ext4");
    assert.deepEqual(fs.readdirSync(rootStable).sort(), expectedEntries(admission), "unexpected store-root entries at start");
    assertSlotMissing(rootStable, fixture.slot_name);

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
    const freeBeforeReservation = statfsBytes(rootStable);
    assert.equal(freeBeforeReservation.type, fsBeforeAny.type, "filesystem type changed during candidate creation");
    assert.equal(freeBeforeReservation.bsize, fsBeforeAny.bsize, "filesystem block size changed during candidate creation");
    const candidateCreationDelta = fsBeforeAny.free_bytes - freeBeforeReservation.free_bytes;

    fallocateExact(payloadFd);
    const reserved = requireAnonymous(payloadFd, payloadIdentity, fixture.payload_bytes, fixture.payload_bytes);
    const freeAfterReservation = statfsBytes(rootStable);
    assert.equal(freeAfterReservation.type, fsBeforeAny.type, "filesystem type changed during reservation");
    assert.equal(freeAfterReservation.bsize, fsBeforeAny.bsize, "filesystem block size changed during reservation");
    const fallocateDelta = freeBeforeReservation.free_bytes - freeAfterReservation.free_bytes;
    const totalCandidateReservationDelta = fsBeforeAny.free_bytes - freeAfterReservation.free_bytes;
    const reservedInodeBytes = allocatedBytes(reserved);
    assert.equal(
      candidateCreationDelta + fallocateDelta,
      totalCandidateReservationDelta,
      "ext4 phase deltas do not compose to total candidate reservation delta",
    );
    assert.ok(reservedInodeBytes >= BigInt(fixture.payload_bytes), "ext4 full reservation shortfall");
    assert.deepEqual(fs.readdirSync(rootStable).sort(), expectedEntries(admission), "fallocate changed visible root entries");

    const writeLedger = writePayload(payloadFd);
    assertLedger(writeLedger, fixture.one_publication_ledger, "write");
    fs.fsyncSync(payloadFd);
    const afterWrite = requireAnonymous(payloadFd, payloadIdentity, fixture.payload_bytes, fixture.payload_bytes);
    assert.equal(allocatedBytes(afterWrite), reservedInodeBytes, "allocation drift after payload write");
    const freeAfterWrite = statfsBytes(rootStable);
    assert.equal(freeAfterWrite.type, fsBeforeAny.type, "filesystem type changed after payload write");
    assert.equal(freeAfterWrite.bsize, fsBeforeAny.bsize, "filesystem block size changed after payload write");
    const writePhaseFreeBlockDelta = freeAfterReservation.free_bytes - freeAfterWrite.free_bytes;

    // V26 requires this as a distinct fresh read of the retained anonymous inode.
    // It is not the write-stream hash and cannot be reused as post-publication readback.
    const prepublication = fullHashFd(payloadFd, "prepublication-anonymous");
    assertLedger(prepublication, fixture.one_publication_ledger, "prepublication_read");
    requireAnonymous(payloadFd, payloadIdentity, fixture.payload_bytes, fixture.payload_bytes);
    assertSlotMissing(rootStable, fixture.slot_name);
    assert.deepEqual(fs.readdirSync(rootStable).sort(), expectedEntries(admission), "namespace drift before publication");
    if (admission !== null) {
      requireAdmissionCapability(rootStable, admission.name, admission.identity);
    }

    const firstLink = linkExactCreateOnly(payloadFd, rootFd, fixture.slot_name);
    assert.equal(firstLink.status, 0, `first link status=${String(firstLink.status)} stderr=${firstLink.stderr.trim()}`);
    const linkedFromFd = fs.fstatSync(payloadFd, { bigint: true });
    const target = fs.lstatSync(`${rootStable}/${fixture.slot_name}`, { bigint: true });
    assert.equal(target.isFile(), true);
    assert.equal(target.isSymbolicLink(), false);
    assert.equal(target.uid, currentUid());
    assert.equal(Number(target.mode) & 0o777, 0o600);
    assert.equal(target.nlink, 1n);
    assert.deepEqual(identity(target), payloadIdentity, "published leaf is not anonymous inode");
    assert.deepEqual(identity(linkedFromFd), payloadIdentity, "source inode changed during link");
    assert.equal(linkedFromFd.nlink, 1n);
    assert.equal(target.size, BigInt(fixture.payload_bytes));
    assert.equal(allocatedBytes(target), reservedInodeBytes, "published inode allocation drift");
    assert.ok(allocatedBytes(target) >= BigInt(fixture.payload_bytes));
    fs.fsyncSync(rootFd);

    // Test-only collision probe: same exact source, same exact occupied destination.
    // It is not a second admitted publication and must not replace the leaf.
    const beforeCollision = fs.lstatSync(`${rootStable}/${fixture.slot_name}`, { bigint: true });
    const collision = linkExactCreateOnly(payloadFd, rootFd, fixture.slot_name);
    assert.notEqual(collision.status, 0, "occupied create-only destination was replaceable");
    const afterCollision = fs.lstatSync(`${rootStable}/${fixture.slot_name}`, { bigint: true });
    assert.deepEqual(identity(afterCollision), identity(beforeCollision), "collision changed destination inode");
    assert.equal(afterCollision.size, beforeCollision.size, "collision changed destination size");

    fs.closeSync(payloadFd);
    payloadFd = -1;

    readbackFd = fs.openSync(`${rootStable}/${fixture.slot_name}`, fs.constants.O_RDONLY | O_NOFOLLOW | O_CLOEXEC);
    const openedReadback = fs.fstatSync(readbackFd, { bigint: true });
    assert.deepEqual(identity(openedReadback), payloadIdentity, "fresh no-follow readback opened different inode");
    assert.equal(openedReadback.nlink, 1n);
    assert.equal(allocatedBytes(openedReadback), reservedInodeBytes, "readback inode allocation drift");
    const postpublication = fullHashFd(readbackFd, "postpublication-readback");
    assertLedger(postpublication, fixture.one_publication_ledger, "postpublication_read");
    fs.closeSync(readbackFd);
    readbackFd = -1;

    const terminal = fs.lstatSync(`${rootStable}/${fixture.slot_name}`, { bigint: true });
    assert.deepEqual(identity(terminal), payloadIdentity);
    assert.equal(terminal.nlink, 1n);
    assert.equal(allocatedBytes(terminal), reservedInodeBytes, "terminal inode allocation drift");
    const terminalAdmission = admission === null
      ? null
      : requireAdmissionCapability(rootStable, admission.name, admission.identity);
    assert.deepEqual(fs.readdirSync(rootStable).sort(), expectedEntries(admission, fixture.slot_name));
    const freeTerminal = statfsBytes(rootStable);
    assert.equal(freeTerminal.type, fsBeforeAny.type, "filesystem type changed at terminal state");
    assert.equal(freeTerminal.bsize, fsBeforeAny.bsize, "filesystem block size changed at terminal state");
    const terminalFreeBlockDeltaFromReservation = freeAfterReservation.free_bytes - freeTerminal.free_bytes;

    process.stdout.write(`${JSON.stringify({
      marker: MARKER,
      status: "GREEN",
      root_identity: `${rootIdentity.dev}:${rootIdentity.ino}`,
      filesystem_magic_hex: fixture.filesystem_magic_hex,
      image_bytes: fixture.image_bytes,
      quota_key: fixture.quota_key,
      slot_name: fixture.slot_name,
      payload_identity: payloadIdentity,
      payload_bytes: fixture.payload_bytes,
      payload_sha256: fixture.payload_sha256,
      helper_identities: { fallocate: fallocateIdentity, link: linkIdentity },
      admission_capability_binding: terminalAdmission === null ? null : {
        name: terminalAdmission.name,
        identity: terminalAdmission.identity,
        visible_and_identity_bound: true,
      },
      reservation: {
        initial_allocated_bytes: String(initialAllocated),
        reserved_inode_bytes: String(reservedInodeBytes),
        inode_local_full_reservation_proved: true,
        filesystem_wide_delta_attributed_to_single_inode: false,
        filesystem_block_bytes: String(fsBeforeAny.bsize),
        free_bytes_before_candidate: String(fsBeforeAny.free_bytes),
        free_bytes_before_reservation: String(freeBeforeReservation.free_bytes),
        free_bytes_after_reservation: String(freeAfterReservation.free_bytes),
        free_bytes_after_write: String(freeAfterWrite.free_bytes),
        free_bytes_terminal: String(freeTerminal.free_bytes),
        candidate_creation_free_block_delta_bytes: String(candidateCreationDelta),
        fallocate_free_block_delta_bytes: String(fallocateDelta),
        total_candidate_reservation_free_block_delta_bytes: String(totalCandidateReservationDelta),
        write_phase_free_block_delta_bytes: String(writePhaseFreeBlockDelta),
        terminal_free_block_delta_from_reservation_bytes: String(terminalFreeBlockDeltaFromReservation),
      },
      write_ledger: writeLedger,
      prepublication_anonymous_rehash: prepublication,
      postpublication_readback: postpublication,
      parent_directory_fsync: true,
      writable_payload_fd_closed_before_postpublication_readback: true,
      create_only_publication_preserved_inode: true,
      occupied_destination_replacement_rejected: true,
      successful_publication_helper_lifetimes: { fallocate: 1, link: 1 },
      test_only_collision_link_helper_lifetimes: 1,
      v29_composed_success_ledger: fixture.v29_composed_success_ledger,
      admission_capability_visible_and_identity_bound: terminalAdmission !== null,
      source_bound_injected_fault_matrix_proved: false,
      root_k_posix_capability_composed: false,
      source_distinct_aggregate_proved: false,
      fiemap_provenance_proved: false,
      cold_remount_proved: false,
      physical_power_loss_proved: false,
      public_peer_retrieval_proved: false,
      chain_2050_authority_claimed: false,
      production_runtime_touched: false,
    })}\n`);
  } finally {
    if (readbackFd >= 0) fs.closeSync(readbackFd);
    if (payloadFd >= 0) fs.closeSync(payloadFd);
    fs.closeSync(rootFd);
  }
}

main();
