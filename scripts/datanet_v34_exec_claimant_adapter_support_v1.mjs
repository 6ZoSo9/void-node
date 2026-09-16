// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import assert from "node:assert/strict";
import childProcess from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";

const O_DIRECTORY = fs.constants.O_DIRECTORY || 0;
const O_NOFOLLOW = fs.constants.O_NOFOLLOW || 0;
const O_CLOEXEC = fs.constants.O_CLOEXEC || 0;
const SCHEMA_ID = "VOID_DATANET_V34_EXEC_CLAIMANT_RECORD_V1";
const ARMED_FORMAT = "VOID_DATANET_RECOVERY_ARMED_V2";
const CLAIMED_FORMAT = "VOID_DATANET_RECOVERY_CLAIMED_V2";
const CLOSED_FORMAT = "VOID_DATANET_RECOVERY_CLOSED_V2";
const CAP_FORMAT = "VOID_DATANET_RECOVERY_CLAIMANT_CAPABILITY_V1";

function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

function identityText(st) {
  return `${String(st.dev)}:${String(st.ino)}`;
}

function canonicalFlat(obj) {
  const ordered = {};
  for (const key of Object.keys(obj).sort()) ordered[key] = obj[key];
  return Buffer.from(`${JSON.stringify(ordered)}\n`, "ascii");
}

export function installV34Adapter(cfg) {
  const { action, python, linkHelper, root, k, rootIdentity, lockIdentity, recordSourceSha256,
    claimantSourceSha256, generationSourceSha256, linkPath, capFd } = cfg;
  const markerName = (kind) => `.void-datanet-recovery-${k}.${kind}.v2`;

  function readCanonicalMarker(rootStable, kind) {
    const name = markerName(kind);
    const path = `${rootStable}/${name}`;
    const st = fs.lstatSync(path, { bigint: true });
    assert.equal(st.isFile(), true);
    assert.equal(st.isSymbolicLink(), false);
    assert.equal(st.uid, BigInt(process.getuid()));
    assert.equal(Number(st.mode) & 0o777, 0o600);
    assert.equal(st.nlink, 1n);
    assert.ok(st.size > 0n && st.size <= 3072n);
    const raw = fs.readFileSync(path);
    const obj = JSON.parse(raw.toString("ascii"));
    assert.deepEqual(canonicalFlat(obj), raw);
    return { name, raw, sha256: sha256(raw), record: obj };
  }

  function createMarker(rootFd, rootStable, kind, obj) {
    const raw = canonicalFlat(obj);
    assert.ok(raw.length > 0 && raw.length <= 3072);
    const fd = fs.openSync(`${rootStable}/${markerName(kind)}`, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | O_CLOEXEC | O_NOFOLLOW, 0o600);
    try {
      fs.fchmodSync(fd, 0o600);
      let off = 0;
      while (off < raw.length) {
        const n = fs.writeSync(fd, raw, off, raw.length - off, null);
        assert.ok(n > 0);
        off += n;
      }
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    fs.fsyncSync(rootFd);
    const reread = readCanonicalMarker(rootStable, kind);
    assert.deepEqual(reread.raw, raw);
    return reread;
  }

  let linkGenerationReceipt = null;
  let linkSubstitutions = 0;
  if (action !== "e0") {
    const originalSpawnSync = childProcess.spawnSync.bind(childProcess);
    childProcess.spawnSync = function patchedSpawnSync(executable, args, options) {
      const isLink = executable === linkPath && Array.isArray(args) && args.length === 5 &&
        args[0] === "-L" && args[1] === "-T" && args[2] === "--" && args[3] === "/proc/self/fd/3" &&
        typeof args[4] === "string" && args[4].startsWith("/proc/self/fd/4/");
      if (!isLink) return originalSpawnSync(executable, args, options);
      assert.equal(linkSubstitutions, 0);
      const slotName = args[4].slice("/proc/self/fd/4/".length);
      const stdio = Array.isArray(options?.stdio) ? [...options.stdio] : null;
      assert.ok(stdio && stdio.length >= 5);
      stdio[1] = "pipe";
      const result = originalSpawnSync(python, ["-I", "-B", linkHelper, "--slot-name", slotName], { ...options, stdio });
      const stdout = Buffer.isBuffer(result.stdout) ? result.stdout : Buffer.from(result.stdout || "");
      assert.equal(result.status, 0, Buffer.isBuffer(result.stderr) ? result.stderr.toString("utf8") : String(result.stderr || ""));
      const lines = stdout.toString("utf8").split("\n").filter(Boolean);
      assert.equal(lines.length, 1);
      const receipt = JSON.parse(lines[0]);
      assert.equal(receipt.marker, "VOID_DATANET_V34_LINK_GENERATION_HELPER_V1_GREEN");
      assert.equal(receipt.status, "GREEN");
      assert.equal(receipt.slot_name, slotName);
      assert.equal(receipt.ioctl_calls, 1);
      assert.equal(receipt.setversion_issued, false);
      linkGenerationReceipt = receipt;
      linkSubstitutions += 1;
      return { ...result, stdout: Buffer.alloc(0) };
    };
    syncBuiltinESMExports();
  }

  function verifyCapability(claimed, armed) {
    const rec = claimed.record;
    assert.equal(rec.format, CLAIMED_FORMAT);
    assert.equal(rec.state, "CLAIMED");
    assert.equal(rec.schema_id, SCHEMA_ID);
    assert.equal(rec.root_identity, rootIdentity);
    assert.equal(rec.quota_key, k);
    assert.equal(rec.record_source_sha256, recordSourceSha256);
    assert.equal(rec.generation_source_sha256, generationSourceSha256);
    assert.equal(rec.claimant_source_sha256, claimantSourceSha256);
    assert.equal(rec.armed_sha256, armed.sha256);
    assert.equal(rec.claimant_pid, process.pid);
    assert.equal(rec.claimant_capability_seals, 15);
    const st = fs.fstatSync(capFd, { bigint: true });
    assert.equal(st.isFile(), true);
    assert.ok(st.size > 0n && st.size <= 4096n);
    const raw = Buffer.alloc(Number(st.size));
    assert.equal(fs.readSync(capFd, raw, 0, raw.length, 0), raw.length);
    assert.equal(sha256(raw), rec.claimant_capability_sha256);
    const cap = JSON.parse(raw.toString("ascii"));
    assert.deepEqual(canonicalFlat(cap), raw);
    assert.equal(cap.format, CAP_FORMAT);
    assert.equal(cap.pid, process.pid);
    assert.equal(cap.root_identity, rootIdentity);
    assert.equal(cap.lock_identity, lockIdentity);
    assert.equal(cap.quota_key, k);
    assert.equal(cap.armed_sha256, armed.sha256);
    assert.equal(cap.record_source_sha256, recordSourceSha256);
    assert.equal(cap.claimant_source_sha256, claimantSourceSha256);
    assert.equal(cap.s0_identity, armed.record.s0_identity);
    assert.equal(cap.s0_generation, armed.record.s0_generation);
    return { bytes: raw.length, sha256: sha256(raw), pid: cap.pid, seal_value_committed: 15 };
  }

  let recoveryPreflight = null;
  if (action === "close-s1") {
    assert.ok(Number.isSafeInteger(capFd) && capFd >= 3);
    const rootFd = fs.openSync(root, fs.constants.O_RDONLY | O_DIRECTORY | O_NOFOLLOW | O_CLOEXEC);
    const rootStable = `/proc/self/fd/${rootFd}`;
    try {
      assert.equal(identityText(fs.fstatSync(rootFd, { bigint: true })), rootIdentity);
      assert.equal(fs.existsSync(`${rootStable}/datanet-${k}-s0.v1`), true);
      assert.equal(fs.existsSync(`${rootStable}/datanet-${k}-s1.v1`), false);
      assert.equal(fs.existsSync(`${rootStable}/${markerName("closed")}`), false);
      const armed = readCanonicalMarker(rootStable, "armed");
      assert.equal(armed.record.format, ARMED_FORMAT);
      assert.equal(armed.record.state, "ARMED");
      assert.equal(armed.record.schema_id, SCHEMA_ID);
      assert.equal(armed.record.root_identity, rootIdentity);
      assert.equal(armed.record.quota_key, k);
      assert.equal(armed.record.record_source_sha256, recordSourceSha256);
      assert.equal(armed.record.generation_source_sha256, generationSourceSha256);
      const claimed = readCanonicalMarker(rootStable, "claimed");
      const capability = verifyCapability(claimed, armed);
      recoveryPreflight = { armedSha256: armed.sha256, claimedSha256: claimed.sha256, capabilitySha256: capability.sha256 };
    } finally {
      fs.closeSync(rootFd);
    }
    const originalReaddirSync = fs.readdirSync.bind(fs);
    fs.readdirSync = function filteredReaddirSync(path, options) {
      const result = originalReaddirSync(path, options);
      if (!Array.isArray(result) || typeof path !== "string" || !path.startsWith("/proc/self/fd/")) return result;
      const blocked = new Set([markerName("armed"), markerName("claimed")]);
      return result.filter((entry) => !blocked.has(Buffer.isBuffer(entry) ? entry.toString("utf8") : String(entry)));
    };
    syncBuiltinESMExports();
  }

  function finalizeReceipt(receipt) {
    assert.equal(receipt.publisher_pid, process.pid);
    assert.ok(linkGenerationReceipt !== null);
    assert.equal(linkSubstitutions, 1);
    const payloadIdentity = `${receipt.payload_identity.dev}:${receipt.payload_identity.ino}`;
    assert.equal(linkGenerationReceipt.payload_identity, payloadIdentity);
    const rootFd = fs.openSync(root, fs.constants.O_RDONLY | O_DIRECTORY | O_NOFOLLOW | O_CLOEXEC);
    const rootStable = `/proc/self/fd/${rootFd}`;
    try {
      assert.equal(identityText(fs.fstatSync(rootFd, { bigint: true })), rootIdentity);
      if (action === "arm-h0") {
        assert.equal(receipt.requested_slot, 0);
        const armed = createMarker(rootFd, rootStable, "armed", {
          format: ARMED_FORMAT, state: "ARMED", root_identity: rootIdentity, quota_key: k,
          record_source_sha256: recordSourceSha256, generation_source_sha256: generationSourceSha256,
          schema_id: SCHEMA_ID, s0_identity: payloadIdentity, s0_generation: linkGenerationReceipt.generation,
          s0_length: receipt.payload_bytes, s0_sha256: receipt.payload_sha256,
        });
        return { ...receipt, v34_recovery: { action, armed_sha256: armed.sha256, same_pid_writer: true, legacy_link_helper_identity_superseded: true, link_generation_helper: linkGenerationReceipt } };
      }
      assert.equal(action, "close-s1");
      assert.equal(receipt.requested_slot, 1);
      const armed = readCanonicalMarker(rootStable, "armed");
      const claimed = readCanonicalMarker(rootStable, "claimed");
      const capability = verifyCapability(claimed, armed);
      assert.ok(recoveryPreflight !== null);
      assert.equal(armed.sha256, recoveryPreflight.armedSha256);
      assert.equal(claimed.sha256, recoveryPreflight.claimedSha256);
      assert.equal(capability.sha256, recoveryPreflight.capabilitySha256);
      const closed = createMarker(rootFd, rootStable, "closed", {
        format: CLOSED_FORMAT, state: "CLOSED", reason: "RECOVERY_H1", root_identity: rootIdentity,
        quota_key: k, record_source_sha256: recordSourceSha256, generation_source_sha256: generationSourceSha256,
        schema_id: SCHEMA_ID, armed_sha256: armed.sha256, claimed_sha256: claimed.sha256,
        claimant_capability_sha256: capability.sha256, claimant_pid: process.pid,
        s1_identity: payloadIdentity, s1_generation: linkGenerationReceipt.generation,
        s1_length: receipt.payload_bytes, s1_sha256: receipt.payload_sha256,
      });
      return { ...receipt, v34_recovery: { action, armed_sha256: armed.sha256, claimed_sha256: claimed.sha256,
        closed_sha256: closed.sha256, claimant_capability: capability, claimant_preflight_before_s1: true, same_pid_writer: true,
        legacy_link_helper_identity_superseded: true, link_generation_helper: linkGenerationReceipt } };
    } finally {
      fs.closeSync(rootFd);
    }
  }

  return { finalizeReceipt };
}
