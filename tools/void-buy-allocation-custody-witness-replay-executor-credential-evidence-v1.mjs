#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_ENDPOINT_V1,
  classifyBuyVoidAllocationCustodyWitnessTransportPolicyV1,
} from "../dist/economic/buy_void_allocation_custody_witness_transport_v1.js";
import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_EVIDENCE_PACKAGE_V1,
} from "./void-buy-allocation-custody-witness-installation-evidence-v2.mjs";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_REPLAY_EXECUTOR_CREDENTIAL_EVIDENCE_V1 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_REPLAY_EXECUTOR_CREDENTIAL_EVIDENCE_V1";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_REPLAY_EXECUTOR_CREDENTIAL_EVIDENCE_AUTHORITY_V1 =
  Object.freeze({
    source_only_collector: true,
    fixed_production_credential_root: true,
    fixed_execution_account: true,
    descriptor_bound_root_observation: true,
    descriptor_bound_file_observation: true,
    terminal_root_and_file_revalidation: true,
    double_census_required: true,
    private_key_metadata_only: true,
    private_key_bytes_read: false,
    public_key_content_observed: true,
    public_key_policy_binding_required: true,
    known_hosts_content_observed: true,
    known_hosts_policy_binding_required: true,
    canonical_transport_policy_required: true,
    installation_package_commitment_required: true,
    installation_package_transport_binding_required: true,
    credential_bundle_ready_for_ssh: true,
    filesystem_write: false,
    network_access: false,
    ssh_execution: false,
    witness_read: false,
    witness_write: false,
    private_key_use: false,
    wallet_or_signer_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    presale_activation: false,
    market_activation: false,
    funds_movement: false,
  });

const PRODUCTION_ROOT =
  "/var/lib/void-buy-custody-witness-client-v1";
const PRODUCTION_USER = "void-buy-custody";
const PRODUCTION_UID = 994;
const PRODUCTION_GID = 981;

const PRIVATE_KEY_NAME = "id_ed25519";
const PUBLIC_KEY_NAME = "id_ed25519.pub";
const KNOWN_HOSTS_NAME = "known_hosts";
const POLICY_NAME = "transport-policy-v1.json";
const INSTALLATION_PACKAGE_NAME =
  "witness-installation-package-v1.json";

const MAX_PRIVATE_KEY_BYTES = 64 * 1024;
const MAX_PUBLIC_KEY_BYTES = 64 * 1024;
const MAX_KNOWN_HOSTS_BYTES = 64 * 1024;
const MAX_POLICY_BYTES = 256 * 1024;
const MAX_PACKAGE_BYTES = 2 * 1024 * 1024;
const O_NOFOLLOW = fs.constants.O_NOFOLLOW;
const O_DIRECTORY = fs.constants.O_DIRECTORY;
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const INSTALLATION_ID = /^voidwiq2_[0-9a-f]{64}$/u;

function fail(code) {
  throw new Error(code);
}

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (value && typeof value === "object") {
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
        .join(",") +
      "}"
    );
  }
  fail("witness_replay_executor_credential_noncanonical_value");
}

function sha256Id(value) {
  return (
    "sha256:" +
    crypto.createHash("sha256").update(value).digest("hex")
  );
}

function currentUid() {
  if (typeof process.geteuid !== "function") {
    fail("witness_replay_executor_credential_uid_unavailable");
  }
  return process.geteuid();
}

function currentGid() {
  if (typeof process.getegid !== "function") {
    fail("witness_replay_executor_credential_gid_unavailable");
  }
  return process.getegid();
}

function sameDirectoryIdentity(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.mode === right.mode &&
    left.nlink === right.nlink
  );
}

function sameFileIdentity(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.mode === right.mode &&
    left.nlink === right.nlink &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs
  );
}

function validateAncestor(stat, uid, code) {
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    (Number(stat.uid) !== 0 && Number(stat.uid) !== uid) ||
    (
      (Number(stat.mode) & 0o022) !== 0 &&
      (Number(stat.mode) & 0o1000) === 0
    )
  ) {
    fail(code);
  }
}

function validatePrivateRoot(stat, uid, gid, code) {
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    Number(stat.uid) !== uid ||
    Number(stat.gid) !== gid ||
    (Number(stat.mode) & 0o7777) !== 0o700
  ) {
    fail(code);
  }
}

function validatePrivateFile(
  stat,
  uid,
  gid,
  maxBytes,
  code,
) {
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    Number(stat.uid) !== uid ||
    Number(stat.gid) !== gid ||
    (Number(stat.mode) & 0o7777) !== 0o600 ||
    stat.nlink !== 1n ||
    stat.size < 1n ||
    stat.size > BigInt(maxBytes)
  ) {
    fail(code);
  }
}

function requireDescriptorSafety() {
  if (
    process.platform !== "linux" ||
    typeof O_NOFOLLOW !== "number" ||
    typeof O_DIRECTORY !== "number" ||
    !fs.existsSync("/proc/self/fd")
  ) {
    fail(
      "witness_replay_executor_credential_descriptor_safety_unavailable",
    );
  }
}

function openPinnedRoot(rootPath, uid, gid) {
  requireDescriptorSafety();
  if (
    typeof rootPath !== "string" ||
    !rootPath ||
    !path.isAbsolute(rootPath) ||
    path.resolve(rootPath) !== rootPath ||
    rootPath.includes("\0")
  ) {
    fail("witness_replay_executor_credential_root_path_invalid");
  }
  if (fs.realpathSync(rootPath) !== rootPath) {
    fail("witness_replay_executor_credential_root_alias_invalid");
  }
  const visible = fs.lstatSync(rootPath, { bigint: true });
  validatePrivateRoot(
    visible,
    uid,
    gid,
    "witness_replay_executor_credential_root_invalid",
  );

  const parsed = path.parse(rootPath);
  const parts = rootPath
    .slice(parsed.root.length)
    .split(path.sep)
    .filter(Boolean);
  let fd = fs.openSync(
    parsed.root,
    fs.constants.O_RDONLY | O_DIRECTORY | O_NOFOLLOW,
  );
  try {
    for (const component of parts) {
      validateAncestor(
        fs.fstatSync(fd, { bigint: true }),
        uid,
        "witness_replay_executor_credential_ancestor_invalid",
      );
      if (
        !component ||
        component === "." ||
        component === ".."
      ) {
        fail(
          "witness_replay_executor_credential_ancestor_component_invalid",
        );
      }
      const next = fs.openSync(
        path.join("/proc/self/fd", String(fd), component),
        fs.constants.O_RDONLY | O_DIRECTORY | O_NOFOLLOW,
      );
      fs.closeSync(fd);
      fd = next;
    }
    const opened = fs.fstatSync(fd, { bigint: true });
    validatePrivateRoot(
      opened,
      uid,
      gid,
      "witness_replay_executor_credential_root_invalid",
    );
    if (!sameDirectoryIdentity(visible, opened)) {
      fail("witness_replay_executor_credential_root_path_not_bound");
    }
    const out = Object.freeze({
      path: rootPath,
      fd,
      stat: opened,
      proc_path: "/proc/self/fd/" + String(fd),
    });
    fd = -1;
    return out;
  } finally {
    if (fd >= 0) fs.closeSync(fd);
  }
}

function assertPinnedRoot(root, uid, gid) {
  const opened = fs.fstatSync(root.fd, { bigint: true });
  const visible = fs.lstatSync(root.path, { bigint: true });
  validatePrivateRoot(
    opened,
    uid,
    gid,
    "witness_replay_executor_credential_root_invalid",
  );
  validatePrivateRoot(
    visible,
    uid,
    gid,
    "witness_replay_executor_credential_root_invalid",
  );
  if (
    fs.realpathSync(root.path) !== root.path ||
    !sameDirectoryIdentity(root.stat, opened) ||
    !sameDirectoryIdentity(opened, visible)
  ) {
    fail("witness_replay_executor_credential_root_changed");
  }
}

function inspectFileMetadata(
  root,
  name,
  uid,
  gid,
  maxBytes,
  readBytes,
) {
  assertPinnedRoot(root, uid, gid);
  const visiblePath = path.join(root.path, name);
  const pinnedPath = path.join(root.proc_path, name);
  const before = fs.lstatSync(visiblePath, { bigint: true });
  validatePrivateFile(
    before,
    uid,
    gid,
    maxBytes,
    "witness_replay_executor_credential_file_invalid",
  );
  const fd = fs.openSync(
    pinnedPath,
    fs.constants.O_RDONLY | O_NOFOLLOW,
  );
  try {
    const opened = fs.fstatSync(fd, { bigint: true });
    validatePrivateFile(
      opened,
      uid,
      gid,
      maxBytes,
      "witness_replay_executor_credential_file_invalid",
    );
    if (!sameFileIdentity(before, opened)) {
      fail("witness_replay_executor_credential_file_path_not_bound");
    }
    let bytes = null;
    if (readBytes) {
      const size = Number(opened.size);
      if (
        !Number.isSafeInteger(size) ||
        size < 1 ||
        size > maxBytes
      ) {
        fail("witness_replay_executor_credential_file_size_invalid");
      }
      bytes = Buffer.alloc(size);
      let offset = 0;
      while (offset < size) {
        const count = fs.readSync(
          fd,
          bytes,
          offset,
          size - offset,
          offset,
        );
        if (count <= 0) {
          fail("witness_replay_executor_credential_file_short_read");
        }
        offset += count;
      }
      const probe = Buffer.alloc(1);
      if (fs.readSync(fd, probe, 0, 1, size) !== 0) {
        fail("witness_replay_executor_credential_file_grew");
      }
    }
    const after = fs.fstatSync(fd, { bigint: true });
    const visibleAfter = fs.lstatSync(visiblePath, { bigint: true });
    if (
      !sameFileIdentity(opened, after) ||
      !sameFileIdentity(after, visibleAfter)
    ) {
      fail("witness_replay_executor_credential_file_changed");
    }
    return Object.freeze({
      path: visiblePath,
      stat: after,
      bytes,
    });
  } finally {
    fs.closeSync(fd);
  }
}

function publicFileRecord(observed, includeDigest = true) {
  return Object.freeze({
    path: observed.path,
    dev: String(observed.stat.dev),
    ino: String(observed.stat.ino),
    mtime_ns: String(observed.stat.mtimeNs),
    ctime_ns: String(observed.stat.ctimeNs),
    bytes: Number(observed.stat.size),
    sha256:
      includeDigest && observed.bytes
        ? sha256Id(observed.bytes)
        : null,
    uid: Number(observed.stat.uid),
    gid: Number(observed.stat.gid),
    mode: Number(observed.stat.mode) & 0o7777,
    nlink: Number(observed.stat.nlink),
  });
}

function parseOpenSshEd25519(line, allowComment, code) {
  const text = String(line || "");
  if (!text.endsWith("\n") || text.slice(0, -1).includes("\n")) {
    fail(code);
  }
  const parts = text.trim().split(/\s+/u);
  if (
    parts.length < 2 ||
    (!allowComment && parts.length !== 3) ||
    parts[0] !== "ssh-ed25519" ||
    !/^[A-Za-z0-9+/]+={0,2}$/u.test(parts[1])
  ) {
    fail(code);
  }
  const blob = Buffer.from(parts[1], "base64");
  if (blob.length < 51 || blob.toString("base64") !== parts[1]) {
    fail(code);
  }
  let offset = 0;
  const readString = () => {
    if (offset + 4 > blob.length) fail(code);
    const length = blob.readUInt32BE(offset);
    offset += 4;
    if (length < 1 || offset + length > blob.length) fail(code);
    const out = blob.subarray(offset, offset + length);
    offset += length;
    return out;
  };
  const algorithm = readString();
  const key = readString();
  if (
    algorithm.toString("utf8") !== "ssh-ed25519" ||
    key.length !== 32 ||
    offset !== blob.length
  ) {
    fail(code);
  }
  return Object.freeze({
    blob,
    sha256: sha256Id(blob),
    base64: parts[1],
    trailing: parts.slice(2),
  });
}

function parseCanonicalJsonFile(bytes, code) {
  if (
    !Buffer.isBuffer(bytes) ||
    bytes.length < 3 ||
    bytes.at(-1) !== 0x0a
  ) {
    fail(code);
  }
  let parsed;
  try {
    parsed = JSON.parse(bytes.toString("utf8").slice(0, -1));
  } catch {
    fail(code);
  }
  if (
    canonicalJson(parsed) + "\n" !== bytes.toString("utf8")
  ) {
    fail(code);
  }
  return parsed;
}

function verifyPackage(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("witness_replay_executor_credential_package_invalid");
  }
  const packageValue = value;
  if (
    packageValue.schema !==
      "void_buy_void_allocation_custody_witness_installation_evidence_package_v1" ||
    packageValue.marker !==
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_EVIDENCE_PACKAGE_V1 ||
    packageValue.version !== 1 ||
    !packageValue.installation_receipt ||
    typeof packageValue.installation_receipt !== "object" ||
    !packageValue.installation_normalized_qualification ||
    typeof packageValue.installation_normalized_qualification !== "object" ||
    typeof packageValue.installation_normalized_qualification_sha256 !==
      "string" ||
    !SHA256_ID.test(
      packageValue.installation_normalized_qualification_sha256,
    ) ||
    typeof packageValue.installation_qualification_id !== "string" ||
    !INSTALLATION_ID.test(packageValue.installation_qualification_id) ||
    packageValue.operation_performed !== false ||
    packageValue.live_evidence_origin_proven !== false ||
    packageValue.external_transport_authenticated !== false ||
    packageValue.external_witness_storage_proven !== false ||
    packageValue.runtime_integration !== false ||
    packageValue.production_gate_ready !== false ||
    packageValue.funds_movement !== false ||
    typeof packageValue.package_sha256 !== "string" ||
    !SHA256_ID.test(packageValue.package_sha256)
  ) {
    fail("witness_replay_executor_credential_package_invalid");
  }

  const normalizedSha = sha256Id(
    Buffer.from(
      canonicalJson(
        packageValue.installation_normalized_qualification,
      ),
      "utf8",
    ),
  );
  const qualificationId =
    "voidwiq2_" + normalizedSha.slice("sha256:".length);
  if (
    normalizedSha !==
      packageValue.installation_normalized_qualification_sha256 ||
    qualificationId !== packageValue.installation_qualification_id ||
    packageValue.installation_receipt
      .normalized_qualification_sha256 !== normalizedSha ||
    packageValue.installation_receipt
      .installation_qualification_id !== qualificationId
  ) {
    fail(
      "witness_replay_executor_credential_package_commitment_invalid",
    );
  }
  const body = { ...packageValue };
  delete body.package_sha256;
  if (
    sha256Id(Buffer.from(canonicalJson(body), "utf8")) !==
      packageValue.package_sha256
  ) {
    fail("witness_replay_executor_credential_package_digest_invalid");
  }
  return packageValue;
}

function classifyObserved(snapshot, live) {
  const policyDecision =
    classifyBuyVoidAllocationCustodyWitnessTransportPolicyV1(
      snapshot.transport_policy,
    );
  if (policyDecision.ok !== true) {
    fail(
      "witness_replay_executor_credential_transport_" +
        String(policyDecision.reason || "invalid"),
    );
  }
  const policy = policyDecision.policy;

  const publicKey = parseOpenSshEd25519(
    snapshot.public_key_text,
    true,
    "witness_replay_executor_credential_public_key_invalid",
  );
  if (
    publicKey.sha256 !== policy.client_public_key_sha256
  ) {
    fail(
      "witness_replay_executor_credential_client_key_mismatch",
    );
  }

  const known = parseOpenSshEd25519(
    snapshot.known_hosts_text,
    false,
    "witness_replay_executor_credential_known_hosts_invalid",
  );
  if (
    known.trailing.length !== 1 ||
    known.trailing[0] !== undefined
  ) {
    void 0;
  }
  const knownParts = snapshot.known_hosts_text
    .trim()
    .split(/\s+/u);
  const expectedHost =
    policy.remote_port === 22
      ? policy.remote_host
      : "[" +
        policy.remote_host +
        "]:" +
        String(policy.remote_port);
  if (
    knownParts.length !== 3 ||
    knownParts[0] !== expectedHost ||
    known.sha256 !== policy.host_key_sha256 ||
    sha256Id(Buffer.from(snapshot.known_hosts_text, "utf8")) !==
      policy.known_hosts_sha256
  ) {
    fail(
      "witness_replay_executor_credential_known_hosts_mismatch",
    );
  }

  const installationPackage = verifyPackage(
    snapshot.installation_package,
  );
  const normalized =
    installationPackage.installation_normalized_qualification;
  if (
    normalized.transport_policy_sha256 !==
      policyDecision.policy_sha256 ||
    normalized.remote_user !== policy.remote_user ||
    normalized.host_key_sha256 !== policy.host_key_sha256 ||
    normalized.known_hosts_sha256 !== policy.known_hosts_sha256 ||
    normalized.client_public_key_sha256 !==
      policy.client_public_key_sha256
  ) {
    fail(
      "witness_replay_executor_credential_package_transport_mismatch",
    );
  }

  const normalizedSnapshot = Object.freeze({
    schema:
      "void_buy_void_allocation_custody_witness_replay_executor_credential_evidence_v1",
    marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_REPLAY_EXECUTOR_CREDENTIAL_EVIDENCE_V1,
    version: 1,
    execution_user: snapshot.execution_user,
    execution_uid: snapshot.execution_uid,
    execution_gid: snapshot.execution_gid,
    credential_root: snapshot.credential_root,
    private_key: snapshot.private_key,
    public_key: snapshot.public_key,
    known_hosts: snapshot.known_hosts,
    transport_policy_file: snapshot.transport_policy_file,
    installation_package_file: snapshot.installation_package_file,
    transport_policy_sha256: policyDecision.policy_sha256,
    remote_host: policy.remote_host,
    remote_port: policy.remote_port,
    remote_user: policy.remote_user,
    host_key_sha256: policy.host_key_sha256,
    known_hosts_sha256: policy.known_hosts_sha256,
    client_public_key_sha256: policy.client_public_key_sha256,
    installation_package_sha256:
      installationPackage.package_sha256,
    installation_qualification_id:
      installationPackage.installation_qualification_id,
    installation_normalized_qualification_sha256:
      installationPackage
        .installation_normalized_qualification_sha256,
  });

  const qualificationId =
    "voidwlrcred1_" +
    crypto
      .createHash("sha256")
      .update(canonicalJson(normalizedSnapshot), "utf8")
      .digest("hex");

  return Object.freeze({
    ok: true,
    status: live
      ? "LIVE_REPLAY_EXECUTOR_CREDENTIAL_BUNDLE_QUALIFIED"
      : "REPLAY_EXECUTOR_CREDENTIAL_BUNDLE_CLASSIFIED_TEST_ONLY",
    marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_REPLAY_EXECUTOR_CREDENTIAL_EVIDENCE_V1,
    version: 1,
    qualification_id: qualificationId,
    normalized: normalizedSnapshot,
    operation_performed: false,
    live_credential_bundle_observed: live === true,
    execution_account_bound: true,
    private_key_metadata_bound: true,
    private_key_bytes_read: false,
    public_key_policy_binding_proven: true,
    known_hosts_policy_binding_proven: true,
    installation_package_commitments_proven: true,
    installation_package_transport_binding_proven: true,
    credential_bundle_ready_for_ssh: true,
    network_access: false,
    ssh_execution: false,
    private_key_use: false,
    funds_movement: false,
    authority:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_REPLAY_EXECUTOR_CREDENTIAL_EVIDENCE_AUTHORITY_V1,
  });
}

function observeCredentialRoot(
  rootPath,
  expectedUser,
  expectedUid,
  expectedGid,
) {
  if (
    currentUid() !== expectedUid ||
    currentGid() !== expectedGid
  ) {
    fail(
      "witness_replay_executor_credential_execution_identity_mismatch",
    );
  }
  const root = openPinnedRoot(
    rootPath,
    expectedUid,
    expectedGid,
  );
  try {
    const privateKey = inspectFileMetadata(
      root,
      PRIVATE_KEY_NAME,
      expectedUid,
      expectedGid,
      MAX_PRIVATE_KEY_BYTES,
      false,
    );
    const publicKey = inspectFileMetadata(
      root,
      PUBLIC_KEY_NAME,
      expectedUid,
      expectedGid,
      MAX_PUBLIC_KEY_BYTES,
      true,
    );
    const knownHosts = inspectFileMetadata(
      root,
      KNOWN_HOSTS_NAME,
      expectedUid,
      expectedGid,
      MAX_KNOWN_HOSTS_BYTES,
      true,
    );
    const policyFile = inspectFileMetadata(
      root,
      POLICY_NAME,
      expectedUid,
      expectedGid,
      MAX_POLICY_BYTES,
      true,
    );
    const packageFile = inspectFileMetadata(
      root,
      INSTALLATION_PACKAGE_NAME,
      expectedUid,
      expectedGid,
      MAX_PACKAGE_BYTES,
      true,
    );
    assertPinnedRoot(root, expectedUid, expectedGid);

    const policy = parseCanonicalJsonFile(
      policyFile.bytes,
      "witness_replay_executor_credential_policy_file_invalid",
    );
    const installationPackage = parseCanonicalJsonFile(
      packageFile.bytes,
      "witness_replay_executor_credential_package_file_invalid",
    );
    const publicKeyText = publicKey.bytes.toString("utf8");
    const knownHostsText = knownHosts.bytes.toString("utf8");

    return Object.freeze({
      execution_user: expectedUser,
      execution_uid: expectedUid,
      execution_gid: expectedGid,
      credential_root: Object.freeze({
        path: root.path,
        dev: String(root.stat.dev),
        ino: String(root.stat.ino),
        mode: Number(root.stat.mode) & 0o7777,
      }),
      private_key: publicFileRecord(privateKey, false),
      public_key: publicFileRecord(publicKey, true),
      known_hosts: publicFileRecord(knownHosts, true),
      transport_policy_file: publicFileRecord(policyFile, true),
      installation_package_file: publicFileRecord(packageFile, true),
      public_key_text: publicKeyText,
      known_hosts_text: knownHostsText,
      transport_policy: policy,
      installation_package: installationPackage,
    });
  } finally {
    fs.closeSync(root.fd);
  }
}

function stableSnapshot(value) {
  return Object.freeze({
    execution_user: value.execution_user,
    execution_uid: value.execution_uid,
    execution_gid: value.execution_gid,
    credential_root: value.credential_root,
    private_key: value.private_key,
    public_key: value.public_key,
    known_hosts: value.known_hosts,
    transport_policy_file: value.transport_policy_file,
    installation_package_file: value.installation_package_file,
    public_key_text: value.public_key_text,
    known_hosts_text: value.known_hosts_text,
    transport_policy: value.transport_policy,
    installation_package: value.installation_package,
  });
}

export function testOnlyClassifyBuyVoidAllocationCustodyWitnessReplayExecutorCredentialSnapshotV1(
  snapshot,
) {
  try {
    return classifyObserved(snapshot, false);
  } catch (error) {
    return Object.freeze({
      ok: false,
      status: "HOLD",
      marker:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_REPLAY_EXECUTOR_CREDENTIAL_EVIDENCE_V1,
      version: 1,
      reason: String(error?.message || error || "snapshot_invalid"),
      operation_performed: false,
      live_credential_bundle_observed: false,
      credential_bundle_ready_for_ssh: false,
      network_access: false,
      ssh_execution: false,
      private_key_use: false,
      funds_movement: false,
      authority:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_REPLAY_EXECUTOR_CREDENTIAL_EVIDENCE_AUTHORITY_V1,
    });
  }
}

export function testOnlyInspectBuyVoidAllocationCustodyWitnessReplayExecutorCredentialEvidenceV1(
  input,
) {
  try {
    const first = observeCredentialRoot(
      input.root,
      input.user,
      input.uid,
      input.gid,
    );
    const second = observeCredentialRoot(
      input.root,
      input.user,
      input.uid,
      input.gid,
    );
    if (
      canonicalJson(stableSnapshot(first)) !==
      canonicalJson(stableSnapshot(second))
    ) {
      fail(
        "witness_replay_executor_credential_changed_between_censuses",
      );
    }
    return classifyObserved(second, false);
  } catch (error) {
    return Object.freeze({
      ok: false,
      status: "HOLD",
      marker:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_REPLAY_EXECUTOR_CREDENTIAL_EVIDENCE_V1,
      version: 1,
      reason: String(error?.message || error || "test_inspection_failed"),
      operation_performed: false,
      live_credential_bundle_observed: false,
      credential_bundle_ready_for_ssh: false,
      network_access: false,
      ssh_execution: false,
      private_key_use: false,
      funds_movement: false,
      authority:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_REPLAY_EXECUTOR_CREDENTIAL_EVIDENCE_AUTHORITY_V1,
    });
  }
}

export function inspectBuyVoidAllocationCustodyWitnessReplayExecutorCredentialEvidenceV1() {
  try {
    const first = observeCredentialRoot(
      PRODUCTION_ROOT,
      PRODUCTION_USER,
      PRODUCTION_UID,
      PRODUCTION_GID,
    );
    const second = observeCredentialRoot(
      PRODUCTION_ROOT,
      PRODUCTION_USER,
      PRODUCTION_UID,
      PRODUCTION_GID,
    );
    if (
      canonicalJson(stableSnapshot(first)) !==
      canonicalJson(stableSnapshot(second))
    ) {
      fail(
        "witness_replay_executor_credential_changed_between_censuses",
      );
    }
    return classifyObserved(second, true);
  } catch (error) {
    return Object.freeze({
      ok: false,
      status: "HOLD",
      marker:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_REPLAY_EXECUTOR_CREDENTIAL_EVIDENCE_V1,
      version: 1,
      reason: String(error?.message || error || "inspection_failed"),
      operation_performed: false,
      live_credential_bundle_observed: false,
      credential_bundle_ready_for_ssh: false,
      network_access: false,
      ssh_execution: false,
      private_key_use: false,
      funds_movement: false,
      authority:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_REPLAY_EXECUTOR_CREDENTIAL_EVIDENCE_AUTHORITY_V1,
    });
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(fileURLToPath(import.meta.url))
) {
  const result =
    inspectBuyVoidAllocationCustodyWitnessReplayExecutorCredentialEvidenceV1();
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  if (!result.ok) process.exitCode = 2;
}
