#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  inspectBuyVoidAllocationCustodyWitnessLiveReadReplayInstallationEvidenceV1,
} from "./void-buy-allocation-custody-witness-live-read-replay-installation-evidence-v1.mjs";
import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_INDEPENDENCE_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_V1,
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayRollbackIndependenceV1,
} from "../dist/economic/buy_void_allocation_custody_witness_live_read_replay_rollback_independence_v1.js";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_EVIDENCE_V1 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_EVIDENCE_V1";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_EVIDENCE_AUTHORITY_V1 =
  Object.freeze({
    source_only_collector: true,
    designated_host_read_only_observation: true,
    fixed_root_owned_policy_path: true,
    root_owned_nonwritable_parent_chain_required: true,
    root_owned_read_only_policy_file_required: true,
    descriptor_bound_policy_read: true,
    canonical_policy_control_required: true,
    canonical_parent_rollback_classifier_required: true,
    live_replay_storage_reobservation_required: true,
    double_storage_census_required: true,
    policy_file_double_read_stability_required: true,
    terminal_storage_reobservation_required: true,
    terminal_policy_rebind_required: true,
    installation_storage_rebound: false,
    live_policy_observation_proven: false,
    policy_file_installation_proven: false,
    verification_clock_authority_proven: false,
    policy_generation_monotonicity_proven: false,
    live_policy_enforcement_proven: false,
    live_rollback_test_performed: false,
    live_durable_storage_proven: false,
    rollback_resistance_proven: false,
    protected_high_water_custody_proven: false,
    independent_custody_proven: false,
    external_transport_authenticated: false,
    external_witness_storage_proven: false,
    live_remote_read_performed: false,
    runtime_integration: false,
    production_gate_ready: false,
    filesystem_write: false,
    mount_mutation: false,
    storage_bootstrap: false,
    backup_mutation: false,
    snapshot_mutation: false,
    service_mutation: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    presale_activation: false,
    market_activation: false,
    funds_movement: false,
  });

const CONTROL_SCHEMA =
  "void_buy_void_allocation_custody_witness_live_read_replay_rollback_control_v1";
const CONTROL_MARKER =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_CONTROL_V1";
const RECEIPT_SCHEMA =
  "void_buy_void_allocation_custody_witness_live_read_replay_rollback_policy_evidence_receipt_v1";
const POLICY_PATH =
  "/etc/void/buy-void-allocation-custody-witness-live-read-replay-rollback-controls-v1.json";
const MAX_POLICY_BYTES = 64 * 1024;
const MAX_POLICY_TTL_MS = 5 * 60 * 1000;
const O_NOFOLLOW = fs.constants.O_NOFOLLOW;
const O_DIRECTORY = fs.constants.O_DIRECTORY;
const SAFE_ID = /^[A-Za-z0-9._:@/-]{1,200}$/u;

const CONTROL_KEYS = Object.freeze([
  "schema",
  "marker",
  "version",
  "host_id",
  "policy_generation",
  "policy_ttl_ms",
  "journal",
  "high_water",
  "hostwide_snapshot_can_revert_both",
  "hostwide_backup_can_revert_both",
  "hostwide_restore_can_revert_both",
  "shared_rollback_controller",
  "coordinated_rollback_without_second_control",
]);

const POLICY_OBSERVATION_KEYS = Object.freeze([
  "path",
  "bytes",
  "sha256",
  "uid",
  "gid",
  "mode",
  "nlink",
  "dev",
  "ino",
  "mtime_ns",
  "ctime_ns",
  "control",
]);

const CONTROL_DOMAIN_KEYS = Object.freeze([
  "role",
  "snapshot_enabled",
  "snapshot_domain_id",
  "backup_enabled",
  "backup_domain_id",
  "backup_target_id",
  "restore_domain_id",
  "rollback_controller_id",
  "restore_credential_domain_id",
  "hostwide_snapshot_member",
  "hostwide_backup_member",
  "automatic_restore_allowed",
  "restore_requires_manual_approval",
  "restore_requires_separate_credential",
  "restore_second_control_required",
]);

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
  fail("witness_replay_rollback_policy_evidence_noncanonical_value");
}

function sha256Id(value) {
  return "sha256:" + crypto.createHash("sha256").update(value).digest("hex");
}

function exactDataObject(value, keys, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(code);
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) fail(code);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const own = Reflect.ownKeys(descriptors);
  if (own.some((key) => typeof key !== "string")) fail(code);
  const actual = own.slice().sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(code);
  }
  const out = Object.create(null);
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value")
    ) {
      fail(code);
    }
    out[key] = descriptor.value;
  }
  return Object.freeze(out);
}

function safeId(value, code) {
  const text = String(value ?? "").trim();
  if (!SAFE_ID.test(text)) fail(code);
  return text;
}

function nullableId(value, code) {
  if (value === null) return null;
  return safeId(value, code);
}

function positiveGeneration(value) {
  const text = String(value ?? "").trim();
  if (!/^[1-9][0-9]*$/u.test(text)) {
    fail("witness_replay_rollback_policy_evidence_generation_invalid");
  }
  const parsed = BigInt(text);
  if (parsed > ((1n << 64n) - 1n)) {
    fail("witness_replay_rollback_policy_evidence_generation_invalid");
  }
  return text;
}

function normalizeControlDomain(value, role) {
  const raw = exactDataObject(
    value,
    CONTROL_DOMAIN_KEYS,
    "witness_replay_rollback_policy_evidence_domain_invalid",
  );
  if (
    raw.role !== role ||
    typeof raw.snapshot_enabled !== "boolean" ||
    typeof raw.backup_enabled !== "boolean" ||
    raw.hostwide_snapshot_member !== false ||
    raw.hostwide_backup_member !== false ||
    raw.automatic_restore_allowed !== false ||
    raw.restore_requires_manual_approval !== true ||
    raw.restore_requires_separate_credential !== true ||
    typeof raw.restore_second_control_required !== "boolean"
  ) {
    fail("witness_replay_rollback_policy_evidence_domain_invalid");
  }
  const snapshotDomain = nullableId(
    raw.snapshot_domain_id,
    "witness_replay_rollback_policy_evidence_snapshot_domain_invalid",
  );
  if (
    (raw.snapshot_enabled && snapshotDomain === null) ||
    (!raw.snapshot_enabled && snapshotDomain !== null)
  ) {
    fail("witness_replay_rollback_policy_evidence_snapshot_domain_invalid");
  }
  const backupDomain = nullableId(
    raw.backup_domain_id,
    "witness_replay_rollback_policy_evidence_backup_domain_invalid",
  );
  const backupTarget = nullableId(
    raw.backup_target_id,
    "witness_replay_rollback_policy_evidence_backup_target_invalid",
  );
  if (
    (raw.backup_enabled && (backupDomain === null || backupTarget === null)) ||
    (!raw.backup_enabled && (backupDomain !== null || backupTarget !== null))
  ) {
    fail("witness_replay_rollback_policy_evidence_backup_domain_invalid");
  }
  if (role === "high_water" && raw.restore_second_control_required !== true) {
    fail("witness_replay_rollback_policy_evidence_high_water_second_control_required");
  }
  return Object.freeze({
    role,
    snapshot_enabled: raw.snapshot_enabled,
    snapshot_domain_id: snapshotDomain,
    backup_enabled: raw.backup_enabled,
    backup_domain_id: backupDomain,
    backup_target_id: backupTarget,
    restore_domain_id: safeId(
      raw.restore_domain_id,
      "witness_replay_rollback_policy_evidence_restore_domain_invalid",
    ),
    rollback_controller_id: safeId(
      raw.rollback_controller_id,
      "witness_replay_rollback_policy_evidence_controller_invalid",
    ),
    restore_credential_domain_id: safeId(
      raw.restore_credential_domain_id,
      "witness_replay_rollback_policy_evidence_credential_domain_invalid",
    ),
    hostwide_snapshot_member: false,
    hostwide_backup_member: false,
    automatic_restore_allowed: false,
    restore_requires_manual_approval: true,
    restore_requires_separate_credential: true,
    restore_second_control_required: raw.restore_second_control_required,
  });
}

function normalizeControl(value) {
  const raw = exactDataObject(
    value,
    CONTROL_KEYS,
    "witness_replay_rollback_policy_evidence_control_invalid",
  );
  if (
    raw.schema !== CONTROL_SCHEMA ||
    raw.marker !== CONTROL_MARKER ||
    raw.version !== 1 ||
    raw.hostwide_snapshot_can_revert_both !== false ||
    raw.hostwide_backup_can_revert_both !== false ||
    raw.hostwide_restore_can_revert_both !== false ||
    raw.shared_rollback_controller !== false ||
    raw.coordinated_rollback_without_second_control !== false
  ) {
    fail("witness_replay_rollback_policy_evidence_control_invalid");
  }
  const ttl = Number(raw.policy_ttl_ms);
  if (
    !Number.isSafeInteger(ttl) ||
    ttl < 1_000 ||
    ttl > MAX_POLICY_TTL_MS
  ) {
    fail("witness_replay_rollback_policy_evidence_ttl_invalid");
  }
  return Object.freeze({
    schema: CONTROL_SCHEMA,
    marker: CONTROL_MARKER,
    version: 1,
    host_id: safeId(
      raw.host_id,
      "witness_replay_rollback_policy_evidence_host_invalid",
    ),
    policy_generation: positiveGeneration(raw.policy_generation),
    policy_ttl_ms: ttl,
    journal: normalizeControlDomain(raw.journal, "journal"),
    high_water: normalizeControlDomain(raw.high_water, "high_water"),
    hostwide_snapshot_can_revert_both: false,
    hostwide_backup_can_revert_both: false,
    hostwide_restore_can_revert_both: false,
    shared_rollback_controller: false,
    coordinated_rollback_without_second_control: false,
  });
}

function normalizePolicyObservation(value) {
  const raw = exactDataObject(
    value,
    POLICY_OBSERVATION_KEYS,
    "witness_replay_rollback_policy_evidence_policy_observation_invalid",
  );
  if (
    raw.path !== POLICY_PATH ||
    !Buffer.isBuffer(raw.bytes) ||
    typeof raw.sha256 !== "string" ||
    !/^sha256:[0-9a-f]{64}$/u.test(raw.sha256) ||
    raw.sha256 !== sha256Id(raw.bytes) ||
    raw.uid !== 0 ||
    raw.gid !== 0 ||
    raw.mode !== 0o444 ||
    raw.nlink !== 1 ||
    typeof raw.dev !== "string" ||
    !/^[0-9]+$/u.test(raw.dev) ||
    typeof raw.ino !== "string" ||
    !/^[1-9][0-9]*$/u.test(raw.ino) ||
    typeof raw.mtime_ns !== "string" ||
    !/^[0-9]+$/u.test(raw.mtime_ns) ||
    typeof raw.ctime_ns !== "string" ||
    !/^[0-9]+$/u.test(raw.ctime_ns)
  ) {
    fail("witness_replay_rollback_policy_evidence_policy_observation_invalid");
  }
  const control = normalizeControl(raw.control);
  if (
    raw.bytes.at(-1) !== 0x0a ||
    canonicalJson(control) + "\n" !== raw.bytes.toString("utf8")
  ) {
    fail("witness_replay_rollback_policy_evidence_policy_noncanonical");
  }
  return Object.freeze({
    path: raw.path,
    bytes: Buffer.from(raw.bytes),
    sha256: raw.sha256,
    uid: raw.uid,
    gid: raw.gid,
    mode: raw.mode,
    nlink: raw.nlink,
    dev: raw.dev,
    ino: raw.ino,
    mtime_ns: raw.mtime_ns,
    ctime_ns: raw.ctime_ns,
    control,
  });
}

function buildPolicy(control, installation, nowMs) {
  if (
    !installation ||
    installation.ok !== true ||
    installation.status !== "LIVE_REPLAY_STORAGE_DOMAINS_QUALIFIED"
  ) {
    fail("witness_replay_rollback_policy_evidence_installation_invalid");
  }
  if (
    !installation.normalized ||
    installation.normalized.hostname !== control.host_id
  ) {
    fail("witness_replay_rollback_policy_evidence_host_mismatch");
  }
  const journalRoot = installation.normalized.journal_root;
  const highWaterRoot = installation.normalized.high_water_root;
  return Object.freeze({
    schema:
      "void_buy_void_allocation_custody_witness_live_read_replay_rollback_policy_v1",
    marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_V1,
    version: 1,
    host_id: control.host_id,
    observed_at_ms: nowMs,
    expires_at_ms: nowMs + control.policy_ttl_ms,
    policy_generation: control.policy_generation,
    journal: Object.freeze({
      ...control.journal,
      disk_serial: journalRoot.disk_serial,
      disk_wwn: journalRoot.disk_wwn,
    }),
    high_water: Object.freeze({
      ...control.high_water,
      disk_serial: highWaterRoot.disk_serial,
      disk_wwn: highWaterRoot.disk_wwn,
    }),
    hostwide_snapshot_can_revert_both: false,
    hostwide_backup_can_revert_both: false,
    hostwide_restore_can_revert_both: false,
    shared_rollback_controller: false,
    coordinated_rollback_without_second_control: false,
  });
}

function rootOwnedNonWritableDirectory(stat, code) {
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    stat.uid !== 0n ||
    (Number(stat.mode) & 0o022) !== 0
  ) {
    fail(code);
  }
}

function sameDirectoryIdentity(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.mode === right.mode
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

function readRootOwnedPolicyFile() {
  if (
    process.platform !== "linux" ||
    typeof O_NOFOLLOW !== "number" ||
    typeof O_DIRECTORY !== "number" ||
    !fs.existsSync("/proc/self/fd")
  ) {
    fail("witness_replay_rollback_policy_evidence_descriptor_safety_unavailable");
  }

  const resolved = path.resolve(POLICY_PATH);
  if (resolved !== POLICY_PATH) {
    fail("witness_replay_rollback_policy_evidence_policy_path_invalid");
  }
  const parsed = path.parse(resolved);
  const parts = resolved
    .slice(parsed.root.length)
    .split(path.sep)
    .filter(Boolean);
  let dirFd = fs.openSync(
    parsed.root,
    fs.constants.O_RDONLY | O_DIRECTORY | O_NOFOLLOW,
  );
  let fd = -1;
  try {
    let current = parsed.root;
    rootOwnedNonWritableDirectory(
      fs.fstatSync(dirFd, { bigint: true }),
      "witness_replay_rollback_policy_evidence_policy_parent_invalid",
    );
    for (const component of parts.slice(0, -1)) {
      if (!component || component === "." || component === "..") {
        fail("witness_replay_rollback_policy_evidence_policy_parent_invalid");
      }
      current = path.join(current, component);
      const visible = fs.lstatSync(current, { bigint: true });
      const next = fs.openSync(
        path.join("/proc/self/fd", String(dirFd), component),
        fs.constants.O_RDONLY | O_DIRECTORY | O_NOFOLLOW,
      );
      const opened = fs.fstatSync(next, { bigint: true });
      rootOwnedNonWritableDirectory(
        visible,
        "witness_replay_rollback_policy_evidence_policy_parent_invalid",
      );
      rootOwnedNonWritableDirectory(
        opened,
        "witness_replay_rollback_policy_evidence_policy_parent_invalid",
      );
      if (!sameDirectoryIdentity(visible, opened)) {
        fs.closeSync(next);
        fail("witness_replay_rollback_policy_evidence_policy_parent_changed");
      }
      fs.closeSync(dirFd);
      dirFd = next;
    }

    const visibleBefore = fs.lstatSync(resolved, { bigint: true });
    if (
      !visibleBefore.isFile() ||
      visibleBefore.isSymbolicLink() ||
      visibleBefore.uid !== 0n ||
      visibleBefore.gid !== 0n ||
      (Number(visibleBefore.mode) & 0o7777) !== 0o444 ||
      visibleBefore.nlink !== 1n ||
      visibleBefore.size < 2n ||
      visibleBefore.size > BigInt(MAX_POLICY_BYTES)
    ) {
      fail("witness_replay_rollback_policy_evidence_policy_file_invalid");
    }

    const basename = parts.at(-1);
    fd = fs.openSync(
      path.join("/proc/self/fd", String(dirFd), basename),
      fs.constants.O_RDONLY | O_NOFOLLOW,
    );
    const opened = fs.fstatSync(fd, { bigint: true });
    if (!sameFileIdentity(visibleBefore, opened)) {
      fail("witness_replay_rollback_policy_evidence_policy_file_changed");
    }
    const size = Number(opened.size);
    const bytes = Buffer.alloc(size);
    let offset = 0;
    while (offset < size) {
      const count = fs.readSync(fd, bytes, offset, size - offset, offset);
      if (count <= 0) {
        fail("witness_replay_rollback_policy_evidence_policy_short_read");
      }
      offset += count;
    }
    const probe = Buffer.alloc(1);
    if (fs.readSync(fd, probe, 0, 1, size) !== 0) {
      fail("witness_replay_rollback_policy_evidence_policy_grew");
    }
    const after = fs.fstatSync(fd, { bigint: true });
    const visibleAfter = fs.lstatSync(resolved, { bigint: true });
    if (
      !sameFileIdentity(opened, after) ||
      !sameFileIdentity(after, visibleAfter)
    ) {
      fail("witness_replay_rollback_policy_evidence_policy_file_changed");
    }
    if (bytes.at(-1) !== 0x0a) {
      fail("witness_replay_rollback_policy_evidence_policy_noncanonical");
    }
    let parsedJson;
    try {
      parsedJson = JSON.parse(bytes.toString("utf8").slice(0, -1));
    } catch {
      fail("witness_replay_rollback_policy_evidence_policy_json_invalid");
    }
    const control = normalizeControl(parsedJson);
    if (canonicalJson(control) + "\n" !== bytes.toString("utf8")) {
      fail("witness_replay_rollback_policy_evidence_policy_noncanonical");
    }
    return Object.freeze({
      path: POLICY_PATH,
      bytes,
      sha256: sha256Id(bytes),
      uid: Number(after.uid),
      gid: Number(after.gid),
      mode: Number(after.mode) & 0o7777,
      nlink: Number(after.nlink),
      dev: String(after.dev),
      ino: String(after.ino),
      mtime_ns: String(after.mtimeNs),
      ctime_ns: String(after.ctimeNs),
      control,
    });
  } finally {
    if (fd >= 0) fs.closeSync(fd);
    fs.closeSync(dirFd);
  }
}

function samePolicyObservation(left, right) {
  return (
    left.path === right.path &&
    left.sha256 === right.sha256 &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.mode === right.mode &&
    left.nlink === right.nlink &&
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.mtime_ns === right.mtime_ns &&
    left.ctime_ns === right.ctime_ns &&
    left.bytes.equals(right.bytes) &&
    canonicalJson(left.control) === canonicalJson(right.control)
  );
}

function assertPolicyObservationWindowFresh(
  observedAtMs,
  expiresAtMs,
  terminalNowMs,
) {
  if (
    !Number.isSafeInteger(observedAtMs) ||
    !Number.isSafeInteger(expiresAtMs) ||
    !Number.isSafeInteger(terminalNowMs) ||
    observedAtMs < 1 ||
    expiresAtMs <= observedAtMs ||
    terminalNowMs < observedAtMs ||
    terminalNowMs > expiresAtMs
  ) {
    fail(
      "witness_replay_rollback_policy_evidence_observation_window_expired",
    );
  }
}

export function testOnlyAssertBuyVoidAllocationCustodyWitnessLiveReadReplayRollbackPolicyObservationWindowV1(
  input,
) {
  assertPolicyObservationWindowFresh(
    input?.observed_at_ms,
    input?.expires_at_ms,
    input?.terminal_now_ms,
  );
  return true;
}

function installationCommitment(value) {
  if (!value || value.ok !== true) {
    fail("witness_replay_rollback_policy_evidence_installation_invalid");
  }
  return canonicalJson({
    qualification_id: value.qualification_id,
    normalized: value.normalized,
    storage_domain_classification_green:
      value.storage_domain_classification_green,
    live_storage_observation_proven: value.live_storage_observation_proven,
    distinct_local_storage_domains_proven:
      value.distinct_local_storage_domains_proven,
    distinct_parent_block_devices_proven:
      value.distinct_parent_block_devices_proven,
    canonical_journal_high_water_binding_proven:
      value.canonical_journal_high_water_binding_proven,
    no_pending_publication_intent_observed:
      value.no_pending_publication_intent_observed,
    double_census_stability_proven:
      value.double_census_stability_proven,
  });
}

function assertObservationSequenceStable({
  first_installation,
  second_installation,
  terminal_installation,
  first_policy,
  second_policy,
  terminal_policy,
}) {
  const firstCommitment = installationCommitment(first_installation);
  if (
    firstCommitment !== installationCommitment(second_installation) ||
    firstCommitment !== installationCommitment(terminal_installation) ||
    !samePolicyObservation(
      normalizePolicyObservation(first_policy),
      normalizePolicyObservation(second_policy),
    ) ||
    !samePolicyObservation(
      normalizePolicyObservation(first_policy),
      normalizePolicyObservation(terminal_policy),
    )
  ) {
    fail(
      "witness_replay_rollback_policy_evidence_changed_during_observation",
    );
  }
  return true;
}

export function testOnlyAssertBuyVoidAllocationCustodyWitnessLiveReadReplayRollbackPolicyObservationSequenceV1(
  input,
) {
  return assertObservationSequenceStable({
    first_installation: input?.first_installation,
    second_installation: input?.second_installation,
    terminal_installation: input?.terminal_installation,
    first_policy: input?.first_policy,
    second_policy: input?.second_policy,
    terminal_policy: input?.terminal_policy,
  });
}

function classifyObserved({
  installation_evidence,
  policy_file,
  verification_now_ms,
  live,
}) {
  const observedPolicy = normalizePolicyObservation(policy_file);
  const policy = buildPolicy(
    observedPolicy.control,
    installation_evidence,
    verification_now_ms,
  );
  const parent =
    classifyBuyVoidAllocationCustodyWitnessLiveReadReplayRollbackIndependenceV1({
      verification_now_ms,
      installation_evidence,
      rollback_policy: policy,
    });
  if (parent.ok !== true) {
    fail(
      "witness_replay_rollback_policy_evidence_parent_" +
        String(parent.reason || "held"),
    );
  }

  const normalized = Object.freeze({
    schema: RECEIPT_SCHEMA,
    marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_EVIDENCE_V1,
    version: 1,
    parent_marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_INDEPENDENCE_V1,
    policy_path: observedPolicy.path,
    policy_file_sha256: observedPolicy.sha256,
    policy_file_uid: observedPolicy.uid,
    policy_file_gid: observedPolicy.gid,
    policy_file_mode: observedPolicy.mode,
    policy_file_nlink: observedPolicy.nlink,
    installation_qualification_id:
      parent.installation_qualification_id,
    installation_high_water_sha256:
      parent.installation_high_water_sha256,
    parent_policy_qualification_id:
      parent.qualification_id,
    policy_fingerprint_sha256:
      parent.policy_fingerprint_sha256,
    policy_generation: parent.policy_generation,
    host_id: parent.host_id,
    verification_now_ms: parent.verification_now_ms,
  });
  const receiptSha = sha256Id(
    Buffer.from(canonicalJson(normalized), "utf8"),
  );

  return Object.freeze({
    ok: true,
    status: live
      ? "LIVE_ROLLBACK_POLICY_OBSERVED"
      : "ROLLBACK_POLICY_CLASSIFIED_TEST_ONLY",
    marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_EVIDENCE_V1,
    version: 1,
    receipt_sha256: receiptSha,
    normalized,
    parent_qualification: parent,
    operation_performed: false,
    root_owned_policy_file_observed: live === true,
    rollback_independence_policy_qualified: true,
    installation_storage_rebound: true,
    bounded_policy_freshness_checked: true,
    policy_file_installation_proven: live === true,
    live_policy_observation_proven: live === true,
    verification_clock_authority_proven: false,
    policy_generation_monotonicity_proven: false,
    live_policy_enforcement_proven: false,
    live_rollback_test_performed: false,
    live_durable_storage_proven: false,
    rollback_resistance_proven: false,
    protected_high_water_custody_proven: false,
    independent_custody_proven: false,
    external_transport_authenticated: false,
    external_witness_storage_proven: false,
    live_remote_read_performed: false,
    runtime_integration: false,
    production_gate_ready: false,
    funds_movement: false,
    authority:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_EVIDENCE_AUTHORITY_V1,
  });
}

export function testOnlyClassifyBuyVoidAllocationCustodyWitnessLiveReadReplayRollbackPolicyEvidenceV1(
  input,
) {
  try {
    return classifyObserved({
      installation_evidence: input?.installation_evidence,
      policy_file: input?.policy_file,
      verification_now_ms: input?.verification_now_ms,
      live: false,
    });
  } catch (error) {
    return Object.freeze({
      ok: false,
      status: "HOLD",
      marker:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_EVIDENCE_V1,
      version: 1,
      reason: String(error?.message || error || "classification_failed"),
      policy_file_installation_proven: false,
      live_policy_observation_proven: false,
      live_policy_enforcement_proven: false,
      rollback_resistance_proven: false,
      protected_high_water_custody_proven: false,
      independent_custody_proven: false,
      production_gate_ready: false,
      funds_movement: false,
      authority:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_EVIDENCE_AUTHORITY_V1,
    });
  }
}

export function inspectBuyVoidAllocationCustodyWitnessLiveReadReplayRollbackPolicyEvidenceV1(
  input = {},
) {
  try {
    const firstInstallation =
      inspectBuyVoidAllocationCustodyWitnessLiveReadReplayInstallationEvidenceV1({
        journal_root: input.journal_root,
        high_water_root: input.high_water_root,
        expected_hostname: input.expected_hostname,
      });
    if (firstInstallation.ok !== true) {
      fail(
        "witness_replay_rollback_policy_evidence_installation_" +
          String(firstInstallation.reason || "held"),
      );
    }

    const firstPolicy = readRootOwnedPolicyFile();
    const nowMs = Date.now();
    const classified = classifyObserved({
      installation_evidence: firstInstallation,
      policy_file: firstPolicy,
      verification_now_ms: nowMs,
      live: true,
    });

    const secondInstallation =
      inspectBuyVoidAllocationCustodyWitnessLiveReadReplayInstallationEvidenceV1({
        journal_root: input.journal_root,
        high_water_root: input.high_water_root,
        expected_hostname: input.expected_hostname,
      });
    if (secondInstallation.ok !== true) {
      fail(
        "witness_replay_rollback_policy_evidence_installation_" +
          String(secondInstallation.reason || "held"),
      );
    }
    const secondPolicy = readRootOwnedPolicyFile();

    const terminalInstallation =
      inspectBuyVoidAllocationCustodyWitnessLiveReadReplayInstallationEvidenceV1({
        journal_root: input.journal_root,
        high_water_root: input.high_water_root,
        expected_hostname: input.expected_hostname,
      });
    if (terminalInstallation.ok !== true) {
      fail(
        "witness_replay_rollback_policy_evidence_installation_" +
          String(terminalInstallation.reason || "held"),
      );
    }

    const terminalPolicy = readRootOwnedPolicyFile();
    assertObservationSequenceStable({
      first_installation: firstInstallation,
      second_installation: secondInstallation,
      terminal_installation: terminalInstallation,
      first_policy: firstPolicy,
      second_policy: secondPolicy,
      terminal_policy: terminalPolicy,
    });

    assertPolicyObservationWindowFresh(
      nowMs,
      classified.parent_qualification.policy_expires_at_ms,
      Date.now(),
    );

    return classified;
  } catch (error) {
    return Object.freeze({
      ok: false,
      status: "HOLD",
      marker:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_EVIDENCE_V1,
      version: 1,
      reason: String(error?.message || error || "live_observation_failed"),
      policy_file_installation_proven: false,
      live_policy_observation_proven: false,
      live_policy_enforcement_proven: false,
      rollback_resistance_proven: false,
      protected_high_water_custody_proven: false,
      independent_custody_proven: false,
      production_gate_ready: false,
      funds_movement: false,
      authority:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_EVIDENCE_AUTHORITY_V1,
    });
  }
}

function arg(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || index + 1 >= process.argv.length) return "";
  return String(process.argv[index + 1] || "").trim();
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(fileURLToPath(import.meta.url))
) {
  if (process.argv.includes("--help")) {
    process.stdout.write([
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_EVIDENCE_V1,
      "read_only=true",
      "policy_path=" + POLICY_PATH,
      "live_policy_enforcement_proven=false",
      "rollback_resistance_proven=false",
      "",
      "Usage:",
      "  node tools/void-buy-allocation-custody-witness-live-read-replay-rollback-policy-evidence-v1.mjs \\",
      "    --journal-root /absolute/private/journal-root \\",
      "    --high-water-root /absolute/private/high-water-root \\",
      "    --expected-hostname HOST",
      "",
    ].join("\n"));
  } else {
    const result =
      inspectBuyVoidAllocationCustodyWitnessLiveReadReplayRollbackPolicyEvidenceV1({
        journal_root: arg("--journal-root"),
        high_water_root: arg("--high-water-root"),
        expected_hostname: arg("--expected-hostname"),
      });
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    if (!result.ok) process.exitCode = 2;
  }
}