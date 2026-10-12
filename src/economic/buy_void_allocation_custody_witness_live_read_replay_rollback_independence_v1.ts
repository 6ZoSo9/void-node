import crypto from "node:crypto";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_V1,
} from "./buy_void_allocation_custody_witness_live_read_replay_high_water_v1.js";
import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_WRITER_V1,
} from "./buy_void_allocation_custody_witness_live_read_replay_writer_v1.js";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_INDEPENDENCE_V1 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_INDEPENDENCE_V1";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_V1 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_V1";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_INDEPENDENCE_AUTHORITY_V1 =
  Object.freeze({
    source_only_contract: true,
    installation_evidence_input_only: true,
    exact_live_storage_qualification_required: true,
    canonical_replay_writer_marker_bound: true,
    canonical_replay_high_water_marker_bound: true,
    physical_disk_identity_rebound: true,
    snapshot_domain_separation_required: true,
    backup_domain_separation_required: true,
    restore_domain_separation_required: true,
    rollback_controller_separation_required: true,
    restore_credential_domain_separation_required: true,
    hostwide_joint_rollback_forbidden: true,
    high_water_second_control_required: true,
    automatic_restore_forbidden: true,
    bounded_policy_freshness_checked: true,
    verification_clock_input_required: true,
    verification_clock_authority_proven: false,
    policy_generation_monotonicity_proven: false,
    live_policy_observation_proven: false,
    live_rollback_test_performed: false,
    live_durable_storage_proven: false,
    rollback_resistance_proven: false,
    protected_high_water_custody_proven: false,
    independent_custody_proven: false,
    live_evidence_origin_proven: false,
    external_transport_authenticated: false,
    external_witness_storage_proven: false,
    live_remote_read_performed: false,
    runtime_integration: false,
    production_gate_ready: false,
    filesystem_read: false,
    filesystem_write: false,
    mount_mutation: false,
    storage_bootstrap: false,
    backup_mutation: false,
    snapshot_mutation: false,
    service_mutation: false,
    payment_acceptance: false,
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

const INSTALLATION_SCHEMA =
  "void_buy_void_allocation_custody_witness_live_read_replay_installation_evidence_v1";
const INSTALLATION_MARKER =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_INSTALLATION_EVIDENCE_V1";
const POLICY_SCHEMA =
  "void_buy_void_allocation_custody_witness_live_read_replay_rollback_policy_v1";
const QUALIFICATION_DOMAIN =
  "void-buy-void-witness-live-read-replay-rollback-independence-v1";

const SAFE_ID = /^[A-Za-z0-9._:@/-]{1,200}$/u;
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const INSTALLATION_ID = /^voidwlrie1_[0-9a-f]{64}$/u;
const MAX_POLICY_TTL_MS = 5 * 60 * 1000;
const MAX_GENERATION = (1n << 64n) - 1n;

const INSTALLATION_RESULT_KEYS = Object.freeze([
  "ok",
  "status",
  "marker",
  "version",
  "qualification_id",
  "normalized",
  "operation_performed",
  "storage_domain_classification_green",
  "live_storage_observation_proven",
  "distinct_local_storage_domains_proven",
  "distinct_parent_block_devices_proven",
  "canonical_journal_high_water_binding_proven",
  "no_pending_publication_intent_observed",
  "double_census_stability_proven",
  "live_durable_storage_proven",
  "rollback_resistance_proven",
  "protected_high_water_custody_proven",
  "independent_custody_proven",
  "live_evidence_origin_proven",
  "external_transport_authenticated",
  "external_witness_storage_proven",
  "live_remote_read_performed",
  "runtime_integration",
  "production_gate_ready",
  "funds_movement",
  "authority",
]);

const INSTALLATION_NORMALIZED_KEYS = Object.freeze([
  "schema",
  "marker",
  "version",
  "parent_writer_marker",
  "high_water_marker",
  "hostname",
  "journal_root",
  "high_water_root",
  "journal_file",
  "high_water_file",
  "high_water_sha256",
  "generation",
  "sequence",
  "event_count",
  "pending",
  "pending_challenge_sha256",
  "pending_challenge_id",
  "pending_expires_at_ms",
  "last_terminal_state",
  "ready_for_issue",
]);

const ROOT_KEYS = Object.freeze([
  "path",
  "dev",
  "ino",
  "uid",
  "gid",
  "mode",
  "mount_id",
  "major_minor",
  "fs_type",
  "mount_source",
  "mount_source_resolved",
  "mount_point",
  "parent_device",
  "disk_serial",
  "disk_wwn",
]);

const POLICY_KEYS = Object.freeze([
  "schema",
  "marker",
  "version",
  "host_id",
  "observed_at_ms",
  "expires_at_ms",
  "policy_generation",
  "journal",
  "high_water",
  "hostwide_snapshot_can_revert_both",
  "hostwide_backup_can_revert_both",
  "hostwide_restore_can_revert_both",
  "shared_rollback_controller",
  "coordinated_rollback_without_second_control",
]);

const DOMAIN_KEYS = Object.freeze([
  "role",
  "disk_serial",
  "disk_wwn",
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

type RollbackDomainV1 = Readonly<{
  role: "journal" | "high_water";
  disk_serial: string;
  disk_wwn: string;
  snapshot_enabled: boolean;
  snapshot_domain_id: string | null;
  backup_enabled: boolean;
  backup_domain_id: string | null;
  backup_target_id: string | null;
  restore_domain_id: string;
  rollback_controller_id: string;
  restore_credential_domain_id: string;
  hostwide_snapshot_member: false;
  hostwide_backup_member: false;
  automatic_restore_allowed: false;
  restore_requires_manual_approval: true;
  restore_requires_separate_credential: true;
  restore_second_control_required: boolean;
}>;

function fail(code: string): never {
  throw new Error(code);
}

function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      "{" +
      Object.keys(record)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonicalJson(record[key]))
        .join(",") +
      "}"
    );
  }
  fail("witness_replay_rollback_noncanonical_value");
}

function sha256Id(value: string | Buffer): string {
  return (
    "sha256:" +
    crypto.createHash("sha256").update(value).digest("hex")
  );
}

function deepDataSnapshot(
  value: unknown,
  code: string,
): unknown {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isSafeInteger(value))
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const expected = [
      ...Array.from({ length: value.length }, (_unused, index) => String(index)),
      "length",
    ].sort();
    const actual = Reflect.ownKeys(descriptors);
    if (
      actual.some((key) => typeof key !== "string") ||
      (actual as string[]).sort().join("\n") !== expected.join("\n")
    ) {
      fail(code);
    }
    const out: unknown[] = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (
        !descriptor ||
        descriptor.enumerable !== true ||
        !Object.hasOwn(descriptor, "value")
      ) {
        fail(code);
      }
      out.push(deepDataSnapshot(descriptor.value, code));
    }
    return Object.freeze(out);
  }
  if (!value || typeof value !== "object") fail(code);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail(code);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const own = Reflect.ownKeys(descriptors);
  if (own.some((key) => typeof key !== "string")) fail(code);
  const out: Record<string, unknown> = Object.create(null);
  for (const key of (own as string[]).sort()) {
    const descriptor = descriptors[key];
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value")
    ) {
      fail(code);
    }
    out[key] = deepDataSnapshot(descriptor.value, code);
  }
  return Object.freeze(out);
}

function exactSnapshot(
  value: unknown,
  keys: readonly string[],
  code: string,
): Readonly<Record<string, unknown>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(code);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail(code);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const own = Reflect.ownKeys(descriptors);
  if (own.some((key) => typeof key !== "string")) fail(code);
  const actual = (own as string[]).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(code);
  }
  const out: Record<string, unknown> = Object.create(null);
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

function safeText(value: unknown, code: string): string {
  const text = String(value ?? "").trim();
  if (!SAFE_ID.test(text)) fail(code);
  return text;
}

function safeInt(
  value: unknown,
  min: number,
  max: number,
  code: string,
): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  ) {
    fail(code);
  }
  return value;
}

function u64(value: unknown, code: string): string {
  const text = String(value ?? "").trim();
  if (!/^(0|[1-9][0-9]*)$/u.test(text)) fail(code);
  const parsed = BigInt(text);
  if (parsed < 1n || parsed > MAX_GENERATION) fail(code);
  return text;
}

function nullableId(value: unknown, code: string): string | null {
  if (value === null) return null;
  return safeText(value, code);
}

function normalizedRoot(
  value: unknown,
  code: string,
): Readonly<Record<string, unknown>> {
  const root = exactSnapshot(value, ROOT_KEYS, code);
  const serial = safeText(root.disk_serial, code);
  const wwn = safeText(root.disk_wwn, code);
  if (
    typeof root.path !== "string" ||
    !root.path.startsWith("/") ||
    typeof root.parent_device !== "string" ||
    !root.parent_device.startsWith("/dev/") ||
    !Number.isSafeInteger(root.uid) ||
    !Number.isSafeInteger(root.gid) ||
    root.mode !== 0o700
  ) {
    fail(code);
  }
  return Object.freeze({
    ...root,
    disk_serial: serial,
    disk_wwn: wwn,
  });
}

function normalizeInstallation(
  input: unknown,
) {
  const result = exactSnapshot(
    input,
    INSTALLATION_RESULT_KEYS,
    "witness_replay_rollback_installation_result_invalid",
  );
  if (
    result.ok !== true ||
    result.status !== "LIVE_REPLAY_STORAGE_DOMAINS_QUALIFIED" ||
    result.marker !== INSTALLATION_MARKER ||
    result.version !== 1 ||
    typeof result.qualification_id !== "string" ||
    !INSTALLATION_ID.test(result.qualification_id) ||
    result.operation_performed !== false ||
    result.storage_domain_classification_green !== true ||
    result.live_storage_observation_proven !== true ||
    result.distinct_local_storage_domains_proven !== true ||
    result.distinct_parent_block_devices_proven !== true ||
    result.canonical_journal_high_water_binding_proven !== true ||
    result.no_pending_publication_intent_observed !== true ||
    result.double_census_stability_proven !== true ||
    result.live_durable_storage_proven !== false ||
    result.rollback_resistance_proven !== false ||
    result.protected_high_water_custody_proven !== false ||
    result.independent_custody_proven !== false ||
    result.live_evidence_origin_proven !== false ||
    result.external_transport_authenticated !== false ||
    result.external_witness_storage_proven !== false ||
    result.live_remote_read_performed !== false ||
    result.runtime_integration !== false ||
    result.production_gate_ready !== false ||
    result.funds_movement !== false
  ) {
    fail("witness_replay_rollback_installation_result_invalid");
  }

  const normalized = deepDataSnapshot(
    exactSnapshot(
      result.normalized,
      INSTALLATION_NORMALIZED_KEYS,
      "witness_replay_rollback_installation_normalized_invalid",
    ),
    "witness_replay_rollback_installation_normalized_invalid",
  ) as Readonly<Record<string, unknown>>;
  if (
    normalized.schema !== INSTALLATION_SCHEMA ||
    normalized.marker !== INSTALLATION_MARKER ||
    normalized.version !== 1 ||
    normalized.parent_writer_marker !==
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_WRITER_V1 ||
    normalized.high_water_marker !==
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_V1 ||
    typeof normalized.hostname !== "string" ||
    !SAFE_ID.test(normalized.hostname) ||
    typeof normalized.high_water_sha256 !== "string" ||
    !SHA256_ID.test(normalized.high_water_sha256)
  ) {
    fail("witness_replay_rollback_installation_normalized_invalid");
  }

  const journalRoot = normalizedRoot(
    normalized.journal_root,
    "witness_replay_rollback_journal_root_invalid",
  );
  const highWaterRoot = normalizedRoot(
    normalized.high_water_root,
    "witness_replay_rollback_high_water_root_invalid",
  );
  if (
    journalRoot.disk_serial === highWaterRoot.disk_serial ||
    journalRoot.disk_wwn === highWaterRoot.disk_wwn ||
    journalRoot.parent_device === highWaterRoot.parent_device
  ) {
    fail("witness_replay_rollback_installation_disks_not_distinct");
  }

  const qualificationBody = normalized;
  const expectedId =
    "voidwlrie1_" +
    crypto
      .createHash("sha256")
      .update(canonicalJson(qualificationBody), "utf8")
      .digest("hex");
  if (expectedId !== result.qualification_id) {
    fail("witness_replay_rollback_installation_qualification_id_invalid");
  }

  return Object.freeze({
    qualification_id: result.qualification_id as string,
    normalized,
    hostname: normalized.hostname as string,
    journal_root: journalRoot,
    high_water_root: highWaterRoot,
    high_water_sha256: normalized.high_water_sha256 as string,
  });
}

function normalizeDomain(
  value: unknown,
  expectedRole: "journal" | "high_water",
  expectedRoot: Readonly<Record<string, unknown>>,
): RollbackDomainV1 {
  const raw = exactSnapshot(
    value,
    DOMAIN_KEYS,
    "witness_replay_rollback_domain_invalid",
  );
  if (
    raw.role !== expectedRole ||
    raw.disk_serial !== expectedRoot.disk_serial ||
    raw.disk_wwn !== expectedRoot.disk_wwn ||
    typeof raw.snapshot_enabled !== "boolean" ||
    typeof raw.backup_enabled !== "boolean" ||
    raw.hostwide_snapshot_member !== false ||
    raw.hostwide_backup_member !== false ||
    raw.automatic_restore_allowed !== false ||
    raw.restore_requires_manual_approval !== true ||
    raw.restore_requires_separate_credential !== true ||
    typeof raw.restore_second_control_required !== "boolean"
  ) {
    fail("witness_replay_rollback_domain_invalid");
  }

  const snapshotId = nullableId(
    raw.snapshot_domain_id,
    "witness_replay_rollback_snapshot_domain_invalid",
  );
  if (
    (raw.snapshot_enabled === true && snapshotId === null) ||
    (raw.snapshot_enabled === false && snapshotId !== null)
  ) {
    fail("witness_replay_rollback_snapshot_domain_invalid");
  }

  const backupDomainId = nullableId(
    raw.backup_domain_id,
    "witness_replay_rollback_backup_domain_invalid",
  );
  const backupTargetId = nullableId(
    raw.backup_target_id,
    "witness_replay_rollback_backup_target_invalid",
  );
  if (
    (
      raw.backup_enabled === true &&
      (backupDomainId === null || backupTargetId === null)
    ) ||
    (
      raw.backup_enabled === false &&
      (backupDomainId !== null || backupTargetId !== null)
    )
  ) {
    fail("witness_replay_rollback_backup_domain_invalid");
  }

  const restoreDomainId = safeText(
    raw.restore_domain_id,
    "witness_replay_rollback_restore_domain_invalid",
  );
  const controllerId = safeText(
    raw.rollback_controller_id,
    "witness_replay_rollback_controller_invalid",
  );
  const credentialDomainId = safeText(
    raw.restore_credential_domain_id,
    "witness_replay_rollback_credential_domain_invalid",
  );

  if (
    expectedRole === "high_water" &&
    raw.restore_second_control_required !== true
  ) {
    fail("witness_replay_rollback_high_water_second_control_required");
  }

  return Object.freeze({
    role: expectedRole,
    disk_serial: String(expectedRoot.disk_serial),
    disk_wwn: String(expectedRoot.disk_wwn),
    snapshot_enabled: raw.snapshot_enabled as boolean,
    snapshot_domain_id: snapshotId,
    backup_enabled: raw.backup_enabled as boolean,
    backup_domain_id: backupDomainId,
    backup_target_id: backupTargetId,
    restore_domain_id: restoreDomainId,
    rollback_controller_id: controllerId,
    restore_credential_domain_id: credentialDomainId,
    hostwide_snapshot_member: false,
    hostwide_backup_member: false,
    automatic_restore_allowed: false,
    restore_requires_manual_approval: true,
    restore_requires_separate_credential: true,
    restore_second_control_required:
      raw.restore_second_control_required as boolean,
  });
}

function normalizePolicy(
  input: unknown,
  installation: ReturnType<typeof normalizeInstallation>,
  verificationNowMs: number,
) {
  const raw = exactSnapshot(
    input,
    POLICY_KEYS,
    "witness_replay_rollback_policy_invalid",
  );
  if (
    raw.schema !== POLICY_SCHEMA ||
    raw.marker !==
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_V1 ||
    raw.version !== 1 ||
    raw.host_id !== installation.hostname ||
    raw.hostwide_snapshot_can_revert_both !== false ||
    raw.hostwide_backup_can_revert_both !== false ||
    raw.hostwide_restore_can_revert_both !== false ||
    raw.shared_rollback_controller !== false ||
    raw.coordinated_rollback_without_second_control !== false
  ) {
    fail("witness_replay_rollback_policy_invalid");
  }

  const observedAt = safeInt(
    raw.observed_at_ms,
    1,
    Number.MAX_SAFE_INTEGER,
    "witness_replay_rollback_policy_time_invalid",
  );
  const expiresAt = safeInt(
    raw.expires_at_ms,
    observedAt + 1,
    Number.MAX_SAFE_INTEGER,
    "witness_replay_rollback_policy_time_invalid",
  );
  if (
    observedAt > verificationNowMs ||
    expiresAt < verificationNowMs ||
    expiresAt - observedAt > MAX_POLICY_TTL_MS
  ) {
    fail("witness_replay_rollback_policy_freshness_invalid");
  }
  const policyGeneration = u64(
    raw.policy_generation,
    "witness_replay_rollback_policy_generation_invalid",
  );

  const journal = normalizeDomain(
    raw.journal,
    "journal",
    installation.journal_root,
  );
  const highWater = normalizeDomain(
    raw.high_water,
    "high_water",
    installation.high_water_root,
  );

  if (
    journal.restore_domain_id === highWater.restore_domain_id ||
    journal.rollback_controller_id === highWater.rollback_controller_id ||
    journal.restore_credential_domain_id ===
      highWater.restore_credential_domain_id
  ) {
    fail("witness_replay_rollback_restore_authority_not_independent");
  }

  if (
    journal.snapshot_enabled &&
    highWater.snapshot_enabled &&
    journal.snapshot_domain_id === highWater.snapshot_domain_id
  ) {
    fail("witness_replay_rollback_snapshot_domains_not_independent");
  }

  if (
    journal.backup_enabled &&
    highWater.backup_enabled &&
    (
      journal.backup_domain_id === highWater.backup_domain_id ||
      journal.backup_target_id === highWater.backup_target_id
    )
  ) {
    fail("witness_replay_rollback_backup_domains_not_independent");
  }

  const normalized = Object.freeze({
    schema: POLICY_SCHEMA,
    marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_V1,
    version: 1 as const,
    host_id: installation.hostname,
    observed_at_ms: observedAt,
    expires_at_ms: expiresAt,
    policy_generation: policyGeneration,
    journal,
    high_water: highWater,
    hostwide_snapshot_can_revert_both: false as const,
    hostwide_backup_can_revert_both: false as const,
    hostwide_restore_can_revert_both: false as const,
    shared_rollback_controller: false as const,
    coordinated_rollback_without_second_control: false as const,
  });

  return Object.freeze({
    normalized,
    policy_fingerprint_sha256:
      sha256Id(canonicalJson(normalized)),
    observed_at_ms: observedAt,
    expires_at_ms: expiresAt,
    policy_generation: policyGeneration,
  });
}

export function classifyBuyVoidAllocationCustodyWitnessLiveReadReplayRollbackIndependenceV1(
  input: {
    verification_now_ms: unknown;
    installation_evidence: unknown;
    rollback_policy: unknown;
  },
) {
  try {
    const verificationNowMs = safeInt(
      input?.verification_now_ms,
      1,
      Number.MAX_SAFE_INTEGER,
      "witness_replay_rollback_verification_time_invalid",
    );
    const installation = normalizeInstallation(
      input?.installation_evidence,
    );
    const policy = normalizePolicy(
      input?.rollback_policy,
      installation,
      verificationNowMs,
    );

    const qualificationBody = Object.freeze({
      domain: QUALIFICATION_DOMAIN,
      installation_qualification_id:
        installation.qualification_id,
      installation_high_water_sha256:
        installation.high_water_sha256,
      journal_disk_serial:
        String(installation.journal_root.disk_serial),
      journal_disk_wwn:
        String(installation.journal_root.disk_wwn),
      high_water_disk_serial:
        String(installation.high_water_root.disk_serial),
      high_water_disk_wwn:
        String(installation.high_water_root.disk_wwn),
      policy_fingerprint_sha256:
        policy.policy_fingerprint_sha256,
    });
    const qualificationId =
      "voidwlrrq1_" +
      crypto
        .createHash("sha256")
        .update(canonicalJson(qualificationBody), "utf8")
        .digest("hex");

    return Object.freeze({
      ok: true as const,
      status: "source_policy_qualified" as const,
      marker:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_INDEPENDENCE_V1,
      version: 1 as const,
      qualification_id: qualificationId,
      installation_qualification_id:
        installation.qualification_id,
      installation_high_water_sha256:
        installation.high_water_sha256,
      host_id: installation.hostname,
      verification_now_ms: verificationNowMs,
      policy_observed_at_ms: policy.observed_at_ms,
      policy_expires_at_ms: policy.expires_at_ms,
      policy_generation: policy.policy_generation,
      policy_fingerprint_sha256:
        policy.policy_fingerprint_sha256,
      rollback_independence_policy_qualified: true as const,
      installation_storage_rebound: true as const,
      bounded_policy_freshness_checked: true as const,
      verification_clock_authority_proven: false as const,
      policy_generation_monotonicity_proven: false as const,
      live_policy_observation_proven: false as const,
      live_rollback_test_performed: false as const,
      live_durable_storage_proven: false as const,
      rollback_resistance_proven: false as const,
      protected_high_water_custody_proven: false as const,
      independent_custody_proven: false as const,
      external_transport_authenticated: false as const,
      external_witness_storage_proven: false as const,
      live_remote_read_performed: false as const,
      runtime_integration: false as const,
      production_gate_ready: false as const,
      funds_movement: false as const,
      normalized_policy: policy.normalized,
      authority:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_INDEPENDENCE_AUTHORITY_V1,
    });
  } catch (error) {
    return Object.freeze({
      ok: false as const,
      status: "held" as const,
      marker:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_INDEPENDENCE_V1,
      version: 1 as const,
      reason:
        error instanceof Error
          ? error.message
          : "witness_replay_rollback_qualification_failed",
      rollback_independence_policy_qualified: false as const,
      installation_storage_rebound: false as const,
      bounded_policy_freshness_checked: false as const,
      verification_clock_authority_proven: false as const,
      policy_generation_monotonicity_proven: false as const,
      live_policy_observation_proven: false as const,
      live_rollback_test_performed: false as const,
      live_durable_storage_proven: false as const,
      rollback_resistance_proven: false as const,
      protected_high_water_custody_proven: false as const,
      independent_custody_proven: false as const,
      external_transport_authenticated: false as const,
      external_witness_storage_proven: false as const,
      live_remote_read_performed: false as const,
      runtime_integration: false as const,
      production_gate_ready: false as const,
      funds_movement: false as const,
      authority:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_INDEPENDENCE_AUTHORITY_V1,
    });
  }
}
