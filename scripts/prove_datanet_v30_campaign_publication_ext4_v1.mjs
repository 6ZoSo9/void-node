// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import * as fs from "node:fs";

const MARKER = "VOID_DATANET_V30_CAMPAIGN_PUBLICATION_EXT4_V1_GREEN";
const O_TMPFILE = 0o20200000;
const O_DIRECTORY = fs.constants.O_DIRECTORY || 0;
const O_NOFOLLOW = fs.constants.O_NOFOLLOW || 0;
const O_CLOEXEC = fs.constants.O_CLOEXEC || 0;
const CAP_PREFIX = ".void-datanet-admission-";
const CAP_SUFFIX = ".lock.v1";

const fixture = JSON.parse(fs.readFileSync(
  new URL("../fixtures/datanet-v30-campaign-topology-ext4-v1.json", import.meta.url),
  "utf8",
));
assert.equal(fixture.v, 1);
assert.equal(fixture.format, "VOID_DATANET_V30_CAMPAIGN_TOPOLOGY_EXT4_CONTROL_V1");
assert.equal(fixture.payload_bytes, 67_108_864);
assert.equal(fixture.io_block_bytes, 65_536);
assert.match(fixture.quota_key, /^[0-9a-f]{64}$/);

function identity(st) {
  return `${st.dev}:${st.ino}`;
}

function currentUid() {
  assert.equal(typeof process.getuid, "function");
  return BigInt(process.getuid());
}

function allocatedBytes(st) {
  return BigInt(st.blocks) * 512n;
}

function sha256File(filePath) {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function helperIdentity(filePath, expectedSha256) {
  assert.ok(filePath.startsWith("/"));
  const st = fs.statSync(filePath, { bigint: true });
  assert.equal(st.isFile(), true);
  fs.accessSync(filePath, fs.constants.X_OK);
  const sha256 = sha256File(filePath);
  assert.equal(sha256, expectedSha256, `${filePath} SHA-256 drift`);
  return Object.freeze({
    path: filePath,
    sha256,
    identity: identity(st),
    uid: String(st.uid),
    mode: (Number(st.mode) & 0o7777).toString(8),
    bytes: Number(st.size),
  });
}

function statfs(rootStable) {
  const st = fs.statfsSync(rootStable, { bigint: true });
  return Object.freeze({
    type: BigInt(st.type),
    bsize: BigInt(st.bsize),
    free_bytes: BigInt(st.bfree) * BigInt(st.bsize),
    available_bytes: BigInt(st.bavail) * BigInt(st.bsize),
  });
}

function capName() {
  return `${CAP_PREFIX}${fixture.quota_key}${CAP_SUFFIX}`;
}

function slotName(slot) {
  assert.ok(slot === 0 || slot === 1);
  return `datanet-${fixture.quota_key}-s${slot}.v1`;
}

function verifyCapability(rootStable, lockFd, expectedIdentity) {
  const visible = fs.lstatSync(`${rootStable}/${capName()}`, { bigint: true });
  const opened = fs.fstatSync(lockFd, { bigint: true });
  assert.equal(visible.isFile(), true);
  assert.equal(visible.isSymbolicLink(), false);
  assert.equal(opened.isFile(), true);
  assert.equal(identity(visible), expectedIdentity);
  assert.equal(identity(opened), expectedIdentity);
  assert.equal(opened.uid, currentUid());
  assert.equal(Number(opened.mode) & 0o777, 0o600);
  assert.equal(opened.nlink, 1n);
  assert.equal(opened.size, 0n);
  return Object.freeze({ name: capName(), identity: expectedIdentity });
}

function countCapabilityFds(expectedIdentity) {
  let count = 0;
  for (const text of fs.readdirSync("/proc/self/fd")) {
    if (!/^[0-9]+$/.test(text)) continue;
    const fd = Number(text);
    try {
      const st = fs.fstatSync(fd, { bigint: true });
      if (identity(st) === expectedIdentity) count += 1;
    } catch (error) {
      if (error?.code !== "EBADF" && error?.code !== "ENOENT") throw error;
    }
  }
  assert.equal(count, 1, `holder capability fd count=${count}`);
  return count;
}

function verifyExistingSlot(rootStable, slot, expectedIdentity) {
  const name = slotName(slot);
  const st = fs.lstatSync(`${rootStable}/${name}`, { bigint: true });
  assert.equal(st.isFile(), true);
  assert.equal(st.isSymbolicLink(), false);
  assert.equal(identity(st), expectedIdentity, `${name} identity drift`);
  assert.equal(st.uid, currentUid());
  assert.equal(Number(st.mode) & 0o777, 0o600);
  assert.equal(st.nlink, 1n);
  assert.equal(st.size, BigInt(fixture.payload_bytes));
  assert.ok(allocatedBytes(st) >= BigInt(fixture.payload_bytes));
  return st;
}

function assertExpectedEntries(rootStable, slot) {
  const expected = slot === 0
    ? [capName()]
    : [capName(), slotName(0)];
  assert.deepEqual(fs.readdirSync(rootStable).sort(), expected.sort());
}

function runHelper(executable, args, fds) {
  const result = spawnSync(executable, args, {
    cwd: "/",
    env: { LANG: "C", LC_ALL: "C" },
    timeout: fixture.helper_timeout_ms,
    killSignal: "SIGKILL",
    maxBuffer: fixture.helper_stderr_max_bytes,
    stdio: ["ignore", "ignore", "pipe", ...fds],
  });
  const stderr = Buffer.isBuffer(result.stderr) ? result.stderr : Buffer.from(result.stderr || "");
  assert.ok(stderr.length <= fixture.helper_stderr_max_bytes);
  assert.equal(result.error, undefined, `${executable} error=${String(result.error)}`);
  assert.equal(result.signal, null, `${executable} signal=${String(result.signal)}`);
  assert.ok(Number.isInteger(result.pid) && result.pid > 0, `${executable} missing pid`);
  return Object.freeze({ status: result.status, stderr: stderr.toString("utf8"), pid: result.pid });
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
    assert.equal(n, block.length, `short write at ${offset}`);
    hash.update(block);
  }
  const sha256 = hash.digest("hex");
  assert.equal(sha256, fixture.payload_sha256);
  return Object.freeze({ calls, requested, completed, sha256 });
}

function fullHashFd(fd, label) {
  const st = fs.fstatSync(fd, { bigint: true });
  assert.equal(st.isFile(), true);
  assert.equal(st.size, BigInt(fixture.payload_bytes));
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
  const eof = fs.readSync(fd, Buffer.alloc(1), 0, 1, fixture.payload_bytes);
  calls += 1;
  requested += 1;
  completed += eof;
  assert.equal(eof, 0, `${label}: EOF probe returned data`);
  const sha256 = hash.digest("hex");
  assert.equal(sha256, fixture.payload_sha256, `${label}: hash mismatch`);
  return Object.freeze({ calls, requested, completed, sha256, eof_probes: 1 });
}

function assertLedger(actual, prefix) {
  const expected = fixture.one_publication_ledger;
  assert.equal(actual.calls, expected[`${prefix}_calls`]);
  assert.equal(actual.requested, expected[`${prefix}_requested_bytes`]);
  assert.equal(
    actual.completed,
    expected[`${prefix}_completed_bytes`] ?? expected[`${prefix}_returned_bytes`],
  );
}

function parsePriorClassification(slot, expectedRootIdentity) {
  if (slot === 0) {
    assert.equal(process.env.VOID_DATANET_PRIOR_CLASSIFICATION_JSON, undefined);
    return null;
  }
  const raw = process.env.VOID_DATANET_PRIOR_CLASSIFICATION_JSON;
  assert.equal(typeof raw, "string");
  const value = JSON.parse(raw);
  assert.equal(value.decision, "AUTHORIZE_H1");
  assert.equal(value.root_identity, expectedRootIdentity);
  assert.equal(value.s0_name, slotName(0));
  assert.match(value.s0_identity, /^[0-9]+:[0-9]+$/);
  assert.match(value.reducer_source_sha256, /^[0-9a-f]{64}$/);
  assert.deepEqual(value.ledger, {
    read_calls: fixture.one_classifier_ledger.read_calls,
    read_requested_bytes: fixture.one_classifier_ledger.read_requested_bytes,
    read_returned_bytes: fixture.one_classifier_ledger.read_returned_bytes,
    eof_probes: 1,
  });
  return Object.freeze(value);
}

function main() {
  assert.equal(process.platform, "linux");
  const rootInput = process.env.VOID_DATANET_EXT4_ROOT;
  const expectedRootIdentity = process.env.VOID_DATANET_EXPECTED_ROOT_IDENTITY;
  const expectedCapabilityIdentity = process.env.VOID_DATANET_ADMISSION_CAPABILITY_IDENTITY;
  const expectedCapabilityName = process.env.VOID_DATANET_ADMISSION_CAPABILITY_NAME;
  const slot = Number(process.env.VOID_DATANET_PUBLICATION_SLOT);
  const lockFd = Number(process.env.VOID_DATANET_INHERITED_LOCK_FD);
  const holdFd = Number(process.env.VOID_DATANET_HOLD_FD);
  assert.equal(typeof rootInput, "string");
  assert.equal(rootInput.startsWith("/"), true);
  assert.match(expectedRootIdentity || "", /^[0-9]+:[0-9]+$/);
  assert.match(expectedCapabilityIdentity || "", /^[0-9]+:[0-9]+$/);
  assert.equal(expectedCapabilityName, capName());
  assert.ok(slot === 0 || slot === 1);
  assert.ok(Number.isInteger(lockFd) && lockFd >= 5);
  assert.ok(Number.isInteger(holdFd) && holdFd >= 3 && holdFd !== lockFd);

  const startNs = process.hrtime.bigint();
  const fallocateIdentity = helperIdentity(fixture.fallocate_path, fixture.fallocate_sha256);
  const linkIdentity = helperIdentity(fixture.link_path, fixture.link_sha256);
  const rootFd = fs.openSync(rootInput, fs.constants.O_RDONLY | O_DIRECTORY | O_NOFOLLOW | O_CLOEXEC);
  const rootStable = `/proc/self/fd/${rootFd}`;
  let payloadFd = -1;
  let readbackFd = -1;
  try {
    const rootStat = fs.fstatSync(rootFd, { bigint: true });
    assert.equal(rootStat.isDirectory(), true);
    assert.equal(identity(rootStat), expectedRootIdentity);
    const capability = verifyCapability(rootStable, lockFd, expectedCapabilityIdentity);
    countCapabilityFds(expectedCapabilityIdentity);
    assertExpectedEntries(rootStable, slot);

    const prior = parsePriorClassification(slot, expectedRootIdentity);
    if (prior !== null) verifyExistingSlot(rootStable, 0, prior.s0_identity);
    const destination = slotName(slot);
    assert.equal(fs.existsSync(`${rootStable}/${destination}`), false, "destination occupied before publication");

    const fsBefore = statfs(rootStable);
    assert.equal(fsBefore.type, BigInt(`0x${fixture.filesystem_magic_hex}`));

    payloadFd = fs.openSync(rootStable, fs.constants.O_RDWR | O_TMPFILE | O_CLOEXEC, 0o600);
    fs.fchmodSync(payloadFd, 0o600);
    const initial = fs.fstatSync(payloadFd, { bigint: true });
    assert.equal(initial.isFile(), true);
    assert.equal(initial.uid, currentUid());
    assert.equal(Number(initial.mode) & 0o777, 0o600);
    assert.equal(initial.nlink, 0n);
    assert.equal(initial.size, 0n);
    assert.equal(allocatedBytes(initial), 0n);
    const payloadIdentity = identity(initial);

    const fallocate = runHelper(
      fixture.fallocate_path,
      ["--length", String(fixture.payload_bytes), "/proc/self/fd/3"],
      [payloadFd],
    );
    assert.equal(fallocate.status, 0, fallocate.stderr.trim());
    countCapabilityFds(expectedCapabilityIdentity);

    const reserved = fs.fstatSync(payloadFd, { bigint: true });
    assert.equal(identity(reserved), payloadIdentity);
    assert.equal(reserved.nlink, 0n);
    assert.equal(reserved.size, BigInt(fixture.payload_bytes));
    const reservedBytes = allocatedBytes(reserved);
    assert.ok(reservedBytes >= BigInt(fixture.payload_bytes));
    const fsAfterReservation = statfs(rootStable);

    const write = writePayload(payloadFd);
    assertLedger(write, "write");
    fs.fsyncSync(payloadFd);
    const afterWrite = fs.fstatSync(payloadFd, { bigint: true });
    assert.equal(identity(afterWrite), payloadIdentity);
    assert.equal(afterWrite.nlink, 0n);
    assert.equal(allocatedBytes(afterWrite), reservedBytes);

    const prepublication = fullHashFd(payloadFd, "prepublication-anonymous");
    assertLedger(prepublication, "prepublication_read");
    assertExpectedEntries(rootStable, slot);
    verifyCapability(rootStable, lockFd, expectedCapabilityIdentity);
    countCapabilityFds(expectedCapabilityIdentity);
    if (prior !== null) verifyExistingSlot(rootStable, 0, prior.s0_identity);

    const link = runHelper(
      fixture.link_path,
      ["-L", "-T", "--", "/proc/self/fd/3", `/proc/self/fd/4/${destination}`],
      [payloadFd, rootFd],
    );
    assert.equal(link.status, 0, link.stderr.trim());
    countCapabilityFds(expectedCapabilityIdentity);

    const linked = fs.lstatSync(`${rootStable}/${destination}`, { bigint: true });
    assert.equal(linked.isFile(), true);
    assert.equal(linked.isSymbolicLink(), false);
    assert.equal(identity(linked), payloadIdentity);
    assert.equal(linked.uid, currentUid());
    assert.equal(Number(linked.mode) & 0o777, 0o600);
    assert.equal(linked.nlink, 1n);
    assert.equal(linked.size, BigInt(fixture.payload_bytes));
    assert.equal(allocatedBytes(linked), reservedBytes);
    fs.fsyncSync(rootFd);

    fs.closeSync(payloadFd);
    payloadFd = -1;

    readbackFd = fs.openSync(`${rootStable}/${destination}`, fs.constants.O_RDONLY | O_NOFOLLOW | O_CLOEXEC);
    const readbackStat = fs.fstatSync(readbackFd, { bigint: true });
    assert.equal(identity(readbackStat), payloadIdentity);
    assert.equal(readbackStat.nlink, 1n);
    assert.equal(allocatedBytes(readbackStat), reservedBytes);
    const postpublication = fullHashFd(readbackFd, "postpublication-readback");
    assertLedger(postpublication, "postpublication_read");
    fs.closeSync(readbackFd);
    readbackFd = -1;

    verifyCapability(rootStable, lockFd, expectedCapabilityIdentity);
    countCapabilityFds(expectedCapabilityIdentity);
    const expectedTerminal = slot === 0
      ? [capName(), slotName(0)]
      : [capName(), slotName(0), slotName(1)];
    assert.deepEqual(fs.readdirSync(rootStable).sort(), expectedTerminal.sort());
    if (prior !== null) verifyExistingSlot(rootStable, 0, prior.s0_identity);
    const terminal = fs.lstatSync(`${rootStable}/${destination}`, { bigint: true });
    assert.equal(identity(terminal), payloadIdentity);
    const fsTerminal = statfs(rootStable);

    const elapsedMs = Number((process.hrtime.bigint() - startNs) / 1_000_000n);
    const receipt = {
      marker: MARKER,
      status: "GREEN",
      pid: process.pid,
      node_version: process.version,
      slot,
      slot_name: destination,
      root_identity: expectedRootIdentity,
      quota_key: fixture.quota_key,
      capability,
      sole_holder_capability_fd_proved: true,
      inherited_lock_fd: lockFd,
      payload_identity: payloadIdentity,
      payload_bytes: fixture.payload_bytes,
      payload_sha256: fixture.payload_sha256,
      reserved_inode_bytes: String(reservedBytes),
      inode_local_full_reservation_proved: true,
      write_ledger: write,
      prepublication_anonymous_rehash: prepublication,
      postpublication_readback: postpublication,
      prior_classification: prior,
      helper_lifetimes: {
        fallocate: { count: 1, pid: fallocate.pid, identity: fallocateIdentity },
        link: { count: 1, pid: link.pid, identity: linkIdentity },
        total: 2,
      },
      helper_execution_sequential: true,
      collision_helper_executed: false,
      create_only_publication_preserved_inode: true,
      parent_directory_fsync: true,
      writable_payload_fd_closed_before_postpublication_readback: true,
      ext4_free_bytes: {
        before_candidate: String(fsBefore.free_bytes),
        after_reservation: String(fsAfterReservation.free_bytes),
        terminal: String(fsTerminal.free_bytes),
        filesystem_wide_delta_attributed_to_single_inode: false,
      },
      publication_elapsed_ms: elapsedMs,
      source_bound_injected_fault_matrix_proved: false,
      external_syscall_observer_complete: false,
      fiemap_provenance_proved: false,
      cold_remount_proved: false,
      physical_power_loss_proved: false,
      public_peer_retrieval_proved: false,
      chain_2050_authority_claimed: false,
      production_runtime_touched: false,
    };
    fs.writeSync(1, Buffer.from(`${JSON.stringify(receipt)}\n`, "utf8"));

    const release = Buffer.alloc(1);
    const n = fs.readSync(holdFd, release, 0, 1, null);
    assert.equal(n, 1, "publication hold release missing");
    assert.equal(release[0], "X".charCodeAt(0), "publication hold release token mismatch");
  } finally {
    if (readbackFd >= 0) fs.closeSync(readbackFd);
    if (payloadFd >= 0) fs.closeSync(payloadFd);
    fs.closeSync(rootFd);
    // Deliberately do not close the inherited capability FD. Process exit is the release boundary.
  }
}

main();
