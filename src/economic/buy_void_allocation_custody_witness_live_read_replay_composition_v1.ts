import crypto from "node:crypto";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_AUTHORITY_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_QUALIFICATION_V1,
} from "./buy_void_allocation_custody_witness_live_read_qualification_v1.js";
import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_V1,
} from "./buy_void_allocation_custody_witness_live_read_replay_high_water_v1.js";
import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_WRITER_AUTHORITY_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_WRITER_V1,
} from "./buy_void_allocation_custody_witness_live_read_replay_writer_v1.js";
import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_V1,
  buildBuyVoidAllocationCustodyWitnessTransportReadRequestV1,
  classifyBuyVoidAllocationCustodyWitnessTransportPolicyV1,
  validateBuyVoidAllocationCustodyWitnessTransportResponseV1,
} from "./buy_void_allocation_custody_witness_transport_v1.js";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_COMPOSITION_V1 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_COMPOSITION_V1";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_COMPOSITION_AUTHORITY_V1 =
  Object.freeze({
    source_contract: true,
    pure_composition: true,
    live_replay_storage_parent_required: true,
    canonical_replay_writer_parent_required: true,
    qualified_live_read_parent_required: true,
    canonical_transport_policy_required: true,
    canonical_transport_request_rebuilt: true,
    canonical_transport_response_revalidated: true,
    exact_replay_generation_sequence_binding: true,
    exact_storage_issue_prestate_digest_binding: true,
    exact_issue_consume_prestate_digest_binding: true,
    exact_replay_challenge_binding: true,
    exact_replay_challenge_time_binding: true,
    exact_terminal_request_binding: true,
    exact_terminal_response_sha256_binding: true,
    validated_packet_binding_proven: true,
    durable_consume_packet_binding_proven: true,
    live_durable_storage_proven: false,
    rollback_resistance_proven: false,
    protected_high_water_custody_proven: false,
    independent_custody_proven: false,
    trusted_verification_clock_proven: false,
    evidence_generation_monotonicity_proven: false,
    challenge_entropy_proven: false,
    challenge_unpredictability_proven: false,
    challenge_freshness_proven: false,
    response_replay_resistance_proven: false,
    live_evidence_origin_proven: false,
    live_sshd_connection_context_proven: false,
    external_transport_authenticated: false,
    external_witness_storage_proven: false,
    live_remote_read_performed: false,
    runtime_integration: false,
    production_gate_ready: false,
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

const REPLAY_INSTALLATION_MARKER =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_INSTALLATION_EVIDENCE_V1";
const REPLAY_INSTALLATION_AUTHORITY = Object.freeze({
  source_only_collector: true,
  designated_host_read_only_observation: true,
  canonical_replay_writer_required: true,
  canonical_replay_high_water_required: true,
  descriptor_bound_root_observation: true,
  descriptor_bound_file_reads: true,
  terminal_root_and_file_revalidation: true,
  double_census_required: true,
  proc_mountinfo_read: true,
  mountinfo_stability_required: true,
  local_block_filesystem_required: true,
  distinct_mount_domains_required: true,
  distinct_parent_block_devices_required: true,
  mount_source_device_number_bound: true,
  single_parent_block_topology_required: true,
  parent_disk_serial_and_wwn_required: true,
  no_pending_publication_intent_required: true,
  caller_supplied_snapshot_authority: false,
  synthetic_storage_authority: false,
  filesystem_write: false,
  mount_mutation: false,
  storage_bootstrap: false,
  replay_journal_write: false,
  high_water_write: false,
  writer_intent_write: false,
  live_durable_storage_proven: false,
  rollback_resistance_proven: false,
  protected_high_water_custody_proven: false,
  independent_custody_proven: false,
  trusted_verification_clock_proven: false,
  challenge_entropy_proven: false,
  challenge_unpredictability_proven: false,
  live_evidence_origin_proven: false,
  external_transport_authenticated: false,
  external_witness_storage_proven: false,
  live_remote_read_performed: false,
  runtime_integration: false,
  production_gate_ready: false,
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
const REPLAY_INSTALLATION_ID = /^voidwlrie1_[0-9a-f]{64}$/u;
const LIVE_READ_ID = /^voidwlrq1_[0-9a-f]{64}$/u;
const REQUEST_ID = /^voidwreq1_[0-9a-f]{64}$/u;
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const CHALLENGE_ID = /^voidwlrc1_[0-9a-f]{64}$/u;

const STORAGE_KEYS = Object.freeze([
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

const STORAGE_NORMALIZED_KEYS = Object.freeze([
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

const STORAGE_FILE_KEYS = Object.freeze([
  "path",
  "dev",
  "ino",
  "mtime_ns",
  "ctime_ns",
  "sha256",
  "bytes",
  "uid",
  "gid",
  "mode",
  "nlink",
  "regular_file",
  "symlink",
]);

const WRITER_SUCCESS_KEYS = Object.freeze([
  "ok",
  "status",
  "marker",
  "version",
  "operation_performed",
  "recovery_performed",
  "generation",
  "sequence",
  "event_count",
  "pending",
  "pending_challenge_sha256",
  "pending_challenge_id",
  "pending_expires_at_ms",
  "tip_event_sha256",
  "last_terminal_state",
  "ready_for_issue",
  "journal_sha256",
  "journal_bytes",
  "high_water_sha256",
  "transition_challenge_sha256",
  "transition_challenge_id",
  "transition_issued_at_ms",
  "transition_expires_at_ms",
  "terminal_request_id",
  "terminal_response_sha256",
  "transition_before_journal_sha256",
  "transition_before_journal_bytes",
  "transition_before_high_water_sha256",
  "durable_journal_publication_semantics",
  "durable_high_water_publication_semantics",
  "cross_root_rollback_detection_semantics",
  "validated_packet_binding_proven",
  "live_durable_storage_proven",
  "rollback_resistance_proven",
  "protected_high_water_custody_proven",
  "external_transport_authenticated",
  "external_witness_storage_proven",
  "live_remote_read_performed",
  "runtime_integration",
  "independent_custody_proven",
  "production_gate_ready",
  "funds_movement",
  "authority",
]);

const LIVE_READ_KEYS = Object.freeze([
  "ok",
  "status",
  "marker",
  "version",
  "qualification_id",
  "normalized",
  "operation_performed",
  "known_hosts_content_qualified",
  "transport_read_packet_qualified",
  "bounded_time_order_qualified",
  "monotonic_generation_order_qualified",
  "installation_network_context_qualified",
  "live_evidence_origin_proven",
  "trusted_verification_clock_proven",
  "evidence_generation_monotonicity_proven",
  "live_sshd_connection_context_proven",
  "challenge_freshness_proven",
  "response_replay_resistance_proven",
  "external_transport_authenticated",
  "external_witness_storage_proven",
  "live_remote_read_performed",
  "runtime_integration",
  "protected_high_water_custody_proven",
  "independent_custody_proven",
  "production_gate_ready",
  "funds_movement",
  "authority",
]);

const LIVE_NORMALIZED_KEYS = Object.freeze([
  "schema",
  "marker",
  "version",
  "installation_collector_receipt_sha256",
  "installation_qualification_id",
  "installation_normalized_qualification_sha256",
  "runtime_bundle_collector_receipt_sha256",
  "transport_marker",
  "transport_policy_sha256",
  "remote_host",
  "installation_hostname",
  "installation_machine_id_sha256",
  "witness_hostname",
  "witness_machine_id_sha256",
  "witness_identity_path",
  "continuity_attestation_consumed",
  "remote_port",
  "remote_user",
  "known_hosts_sha256",
  "host_key_sha256",
  "client_public_key_sha256",
  "challenge_sha256",
  "request_id",
  "challenge_issued_at_ms",
  "response_observed_at_ms",
  "challenge_age_ms",
  "prior_evidence_generation",
  "evidence_generation",
  "observed_client_address",
  "observed_remote_address",
  "witness_sha256",
  "event_count",
  "tip_event_sha256",
]);

function fail(reason: string): never {
  throw new Error(reason);
}

function held(reason: string) {
  return Object.freeze({
    ok: false as const,
    status: "held" as const,
    marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_COMPOSITION_V1,
    version: 1 as const,
    reason,
    operation_performed: false as const,
    authority:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_COMPOSITION_AUTHORITY_V1,
  });
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
        .map(
          (key) =>
            JSON.stringify(key) + ":" + canonicalJson(record[key]),
        )
        .join(",") +
      "}"
    );
  }
  fail("witness_live_read_replay_composition_noncanonical_value");
}

function sha256Id(value: string | Buffer): string {
  return (
    "sha256:" +
    crypto.createHash("sha256").update(value).digest("hex")
  );
}

function exactObject(
  value: unknown,
  keys: readonly string[],
  reason: string,
): Record<string, any> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(reason);
  }
  const record = value as Record<string, any>;
  const actual = Object.keys(record).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(reason);
  }
  return record;
}

function safeInt(
  value: unknown,
  min: number,
  max: number,
  reason: string,
): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  ) {
    fail(reason);
  }
  return value;
}

function sha(value: unknown, reason: string): string {
  if (typeof value !== "string" || !SHA256_ID.test(value)) fail(reason);
  return value;
}

function storageParent(input: unknown) {
  const value = exactObject(
    input,
    STORAGE_KEYS,
    "witness_live_read_replay_composition_storage_shape_invalid",
  );
  const normalized = exactObject(
    value.normalized,
    STORAGE_NORMALIZED_KEYS,
    "witness_live_read_replay_composition_storage_normalized_invalid",
  );
  if (
    value.ok !== true ||
    value.status !== "LIVE_REPLAY_STORAGE_DOMAINS_QUALIFIED" ||
    value.marker !== REPLAY_INSTALLATION_MARKER ||
    value.version !== 1 ||
    typeof value.qualification_id !== "string" ||
    !REPLAY_INSTALLATION_ID.test(value.qualification_id) ||
    value.operation_performed !== false ||
    value.storage_domain_classification_green !== true ||
    value.live_storage_observation_proven !== true ||
    value.distinct_local_storage_domains_proven !== true ||
    value.distinct_parent_block_devices_proven !== true ||
    value.canonical_journal_high_water_binding_proven !== true ||
    value.no_pending_publication_intent_observed !== true ||
    value.double_census_stability_proven !== true ||
    value.live_durable_storage_proven !== false ||
    value.rollback_resistance_proven !== false ||
    value.protected_high_water_custody_proven !== false ||
    value.independent_custody_proven !== false ||
    value.live_evidence_origin_proven !== false ||
    value.external_transport_authenticated !== false ||
    value.external_witness_storage_proven !== false ||
    value.live_remote_read_performed !== false ||
    value.runtime_integration !== false ||
    value.production_gate_ready !== false ||
    value.funds_movement !== false ||
    canonicalJson(value.authority) !==
      canonicalJson(REPLAY_INSTALLATION_AUTHORITY) ||
    normalized.schema !==
      "void_buy_void_allocation_custody_witness_live_read_replay_installation_evidence_v1" ||
    normalized.marker !== REPLAY_INSTALLATION_MARKER ||
    normalized.version !== 1 ||
    normalized.parent_writer_marker !==
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_WRITER_V1 ||
    normalized.high_water_marker !==
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_V1 ||
    normalized.pending !== false ||
    normalized.pending_challenge_sha256 !== null ||
    normalized.pending_challenge_id !== null ||
    normalized.pending_expires_at_ms !== null ||
    normalized.ready_for_issue !== true
  ) {
    fail("witness_live_read_replay_composition_storage_invalid");
  }
  const generation = safeInt(
    normalized.generation,
    0,
    Number.MAX_SAFE_INTEGER - 1,
    "witness_live_read_replay_composition_storage_generation_invalid",
  );
  const sequence = safeInt(
    normalized.sequence,
    0,
    8191,
    "witness_live_read_replay_composition_storage_sequence_invalid",
  );
  const eventCount = safeInt(
    normalized.event_count,
    0,
    8191,
    "witness_live_read_replay_composition_storage_event_count_invalid",
  );
  if (sequence !== eventCount) {
    fail("witness_live_read_replay_composition_storage_sequence_invalid");
  }
  const journalFile = exactObject(
    normalized.journal_file,
    STORAGE_FILE_KEYS,
    "witness_live_read_replay_composition_storage_journal_file_invalid",
  );
  const highWaterFile = exactObject(
    normalized.high_water_file,
    STORAGE_FILE_KEYS,
    "witness_live_read_replay_composition_storage_high_water_file_invalid",
  );
  const validateStorageFile = (
    file: Record<string, any>,
    allowEmpty: boolean,
    reason: string,
  ) => {
    if (
      typeof file.path !== "string" ||
      file.path.length < 1 ||
      typeof file.dev !== "string" ||
      !/^[0-9]+$/u.test(file.dev) ||
      typeof file.ino !== "string" ||
      !/^[0-9]+$/u.test(file.ino) ||
      typeof file.mtime_ns !== "string" ||
      !/^[0-9]+$/u.test(file.mtime_ns) ||
      typeof file.ctime_ns !== "string" ||
      !/^[0-9]+$/u.test(file.ctime_ns) ||
      typeof file.sha256 !== "string" ||
      !SHA256_ID.test(file.sha256) ||
      !Number.isSafeInteger(file.bytes) ||
      file.bytes < (allowEmpty ? 0 : 1) ||
      !Number.isSafeInteger(file.uid) ||
      file.uid < 0 ||
      !Number.isSafeInteger(file.gid) ||
      file.gid < 0 ||
      file.mode !== 0o600 ||
      file.nlink !== 1 ||
      file.regular_file !== true ||
      file.symlink !== false
    ) {
      fail(reason);
    }
    return Object.freeze({
      sha256: file.sha256 as string,
      bytes: file.bytes as number,
    });
  };
  const journalIdentity = validateStorageFile(
    journalFile,
    true,
    "witness_live_read_replay_composition_storage_journal_file_invalid",
  );
  const highWaterIdentity = validateStorageFile(
    highWaterFile,
    false,
    "witness_live_read_replay_composition_storage_high_water_file_invalid",
  );
  if (
    typeof normalized.high_water_sha256 !== "string" ||
    !SHA256_ID.test(normalized.high_water_sha256) ||
    highWaterIdentity.sha256 !== normalized.high_water_sha256
  ) {
    fail(
      "witness_live_read_replay_composition_storage_high_water_digest_invalid",
    );
  }

  const expectedId =
    "voidwlrie1_" +
    crypto
      .createHash("sha256")
      .update(canonicalJson(normalized), "utf8")
      .digest("hex");
  if (expectedId !== value.qualification_id) {
    fail("witness_live_read_replay_composition_storage_id_mismatch");
  }
  return Object.freeze({
    receipt: value,
    normalized,
    generation,
    sequence,
    event_count: eventCount,
    journal_sha256: journalIdentity.sha256,
    journal_bytes: journalIdentity.bytes,
    high_water_sha256: normalized.high_water_sha256 as string,
  });
}

function writerResult(
  input: unknown,
  expectedStatus: "persisted_issue" | "persisted_consumed",
) {
  const value = exactObject(
    input,
    WRITER_SUCCESS_KEYS,
    "witness_live_read_replay_composition_writer_shape_invalid",
  );
  if (
    value.ok !== true ||
    value.status !== expectedStatus ||
    value.marker !==
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_WRITER_V1 ||
    value.version !== 1 ||
    value.operation_performed !== true ||
    value.recovery_performed !== false ||
    value.durable_journal_publication_semantics !== true ||
    value.durable_high_water_publication_semantics !== true ||
    value.cross_root_rollback_detection_semantics !== true ||
    value.validated_packet_binding_proven !== false ||
    value.live_durable_storage_proven !== false ||
    value.rollback_resistance_proven !== false ||
    value.protected_high_water_custody_proven !== false ||
    value.external_transport_authenticated !== false ||
    value.external_witness_storage_proven !== false ||
    value.live_remote_read_performed !== false ||
    value.runtime_integration !== false ||
    value.independent_custody_proven !== false ||
    value.production_gate_ready !== false ||
    value.funds_movement !== false ||
    canonicalJson(value.authority) !==
      canonicalJson(
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_WRITER_AUTHORITY_V1,
      )
  ) {
    fail("witness_live_read_replay_composition_writer_invalid");
  }
  const generation = safeInt(
    value.generation,
    1,
    Number.MAX_SAFE_INTEGER,
    "witness_live_read_replay_composition_writer_generation_invalid",
  );
  const sequence = safeInt(
    value.sequence,
    1,
    8192,
    "witness_live_read_replay_composition_writer_sequence_invalid",
  );
  const eventCount = safeInt(
    value.event_count,
    1,
    8192,
    "witness_live_read_replay_composition_writer_event_count_invalid",
  );
  if (
    sequence !== eventCount ||
    typeof value.transition_challenge_sha256 !== "string" ||
    !SHA256_ID.test(value.transition_challenge_sha256) ||
    typeof value.transition_challenge_id !== "string" ||
    !CHALLENGE_ID.test(value.transition_challenge_id)
  ) {
    fail("witness_live_read_replay_composition_writer_transition_invalid");
  }
  const issuedAt = safeInt(
    value.transition_issued_at_ms,
    1,
    Number.MAX_SAFE_INTEGER - 1,
    "witness_live_read_replay_composition_writer_time_invalid",
  );
  const expiresAt = safeInt(
    value.transition_expires_at_ms,
    issuedAt + 1,
    Number.MAX_SAFE_INTEGER,
    "witness_live_read_replay_composition_writer_time_invalid",
  );
  if (expiresAt - issuedAt > 38_000) {
    fail("witness_live_read_replay_composition_writer_ttl_invalid");
  }
  const transitionBeforeJournalSha256 = sha(
    value.transition_before_journal_sha256,
    "witness_live_read_replay_composition_writer_prestate_invalid",
  );
  const transitionBeforeJournalBytes = safeInt(
    value.transition_before_journal_bytes,
    0,
    8 * 1024 * 1024,
    "witness_live_read_replay_composition_writer_prestate_invalid",
  );
  const transitionBeforeHighWaterSha256 = sha(
    value.transition_before_high_water_sha256,
    "witness_live_read_replay_composition_writer_prestate_invalid",
  );
  if (expectedStatus === "persisted_issue") {
    if (
      value.pending !== true ||
      value.ready_for_issue !== false ||
      value.pending_challenge_sha256 !==
        value.transition_challenge_sha256 ||
      value.pending_challenge_id !== value.transition_challenge_id ||
      value.pending_expires_at_ms !== expiresAt ||
      value.terminal_request_id !== null ||
      value.terminal_response_sha256 !== null
    ) {
      fail("witness_live_read_replay_composition_issue_invalid");
    }
  } else {
    if (
      value.pending !== false ||
      value.ready_for_issue !== true ||
      value.pending_challenge_sha256 !== null ||
      value.pending_challenge_id !== null ||
      value.pending_expires_at_ms !== null ||
      value.last_terminal_state !== "consumed" ||
      typeof value.terminal_request_id !== "string" ||
      !REQUEST_ID.test(value.terminal_request_id) ||
      typeof value.terminal_response_sha256 !== "string" ||
      !SHA256_ID.test(value.terminal_response_sha256)
    ) {
      fail("witness_live_read_replay_composition_consume_invalid");
    }
  }
  return Object.freeze({
    value,
    generation,
    sequence,
    event_count: eventCount,
    challenge_sha256: value.transition_challenge_sha256 as string,
    challenge_id: value.transition_challenge_id as string,
    issued_at_ms: issuedAt,
    expires_at_ms: expiresAt,
    transition_before_journal_sha256: transitionBeforeJournalSha256,
    transition_before_journal_bytes: transitionBeforeJournalBytes,
    transition_before_high_water_sha256: transitionBeforeHighWaterSha256,
  });
}

function liveReadParent(input: unknown) {
  const value = exactObject(
    input,
    LIVE_READ_KEYS,
    "witness_live_read_replay_composition_live_read_shape_invalid",
  );
  const normalized = exactObject(
    value.normalized,
    LIVE_NORMALIZED_KEYS,
    "witness_live_read_replay_composition_live_read_normalized_invalid",
  );
  if (
    value.ok !== true ||
    value.status !== "live_read_packet_qualified" ||
    value.marker !==
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_QUALIFICATION_V1 ||
    value.version !== 1 ||
    typeof value.qualification_id !== "string" ||
    !LIVE_READ_ID.test(value.qualification_id) ||
    value.operation_performed !== false ||
    value.known_hosts_content_qualified !== true ||
    value.transport_read_packet_qualified !== true ||
    value.bounded_time_order_qualified !== true ||
    value.monotonic_generation_order_qualified !== true ||
    value.installation_network_context_qualified !== true ||
    value.live_evidence_origin_proven !== false ||
    value.trusted_verification_clock_proven !== false ||
    value.evidence_generation_monotonicity_proven !== false ||
    value.live_sshd_connection_context_proven !== false ||
    value.challenge_freshness_proven !== false ||
    value.response_replay_resistance_proven !== false ||
    value.external_transport_authenticated !== false ||
    value.external_witness_storage_proven !== false ||
    value.live_remote_read_performed !== false ||
    value.runtime_integration !== false ||
    value.protected_high_water_custody_proven !== false ||
    value.independent_custody_proven !== false ||
    value.production_gate_ready !== false ||
    value.funds_movement !== false ||
    canonicalJson(value.authority) !==
      canonicalJson(
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_AUTHORITY_V1,
      ) ||
    normalized.schema !==
      "void_buy_void_allocation_custody_witness_live_read_qualification_v1" ||
    normalized.marker !==
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_QUALIFICATION_V1 ||
    normalized.version !== 1 ||
    normalized.transport_marker !==
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_V1 ||
    typeof normalized.request_id !== "string" ||
    !REQUEST_ID.test(normalized.request_id) ||
    typeof normalized.challenge_sha256 !== "string" ||
    !SHA256_ID.test(normalized.challenge_sha256)
  ) {
    fail("witness_live_read_replay_composition_live_read_invalid");
  }
  const expectedId =
    "voidwlrq1_" +
    crypto
      .createHash("sha256")
      .update(canonicalJson(normalized), "utf8")
      .digest("hex");
  if (expectedId !== value.qualification_id) {
    fail("witness_live_read_replay_composition_live_read_id_mismatch");
  }
  return Object.freeze({ value, normalized });
}

export function classifyBuyVoidAllocationCustodyWitnessLiveReadReplayCompositionV1(
  input: {
    replay_storage_evidence: unknown;
    issue_result: unknown;
    live_read_qualification: unknown;
    consume_result: unknown;
    transport_policy: unknown;
    read_request_json: string | Buffer;
    read_response_json: string | Buffer;
  },
) {
  try {
    const storage = storageParent(input?.replay_storage_evidence);
    const issue = writerResult(input?.issue_result, "persisted_issue");
    const liveRead = liveReadParent(input?.live_read_qualification);
    const consume = writerResult(
      input?.consume_result,
      "persisted_consumed",
    );

    if (
      issue.generation !== storage.generation + 1 ||
      issue.sequence !== storage.sequence + 1 ||
      issue.event_count !== storage.event_count + 1
    ) {
      fail("witness_live_read_replay_composition_issue_progression_invalid");
    }
    if (
      issue.transition_before_journal_sha256 !== storage.journal_sha256 ||
      issue.transition_before_journal_bytes !== storage.journal_bytes ||
      issue.transition_before_high_water_sha256 !==
        storage.high_water_sha256
    ) {
      fail(
        "witness_live_read_replay_composition_storage_prestate_digest_mismatch",
      );
    }
    if (
      consume.generation !== issue.generation ||
      consume.sequence !== issue.sequence + 1 ||
      consume.event_count !== issue.event_count + 1
    ) {
      fail("witness_live_read_replay_composition_consume_progression_invalid");
    }
    if (
      consume.transition_before_journal_sha256 !==
        issue.value.journal_sha256 ||
      consume.transition_before_journal_bytes !==
        issue.value.journal_bytes ||
      consume.transition_before_high_water_sha256 !==
        issue.value.high_water_sha256
    ) {
      fail(
        "witness_live_read_replay_composition_consume_prestate_digest_mismatch",
      );
    }
    if (
      consume.challenge_sha256 !== issue.challenge_sha256 ||
      consume.challenge_id !== issue.challenge_id ||
      consume.issued_at_ms !== issue.issued_at_ms ||
      consume.expires_at_ms !== issue.expires_at_ms
    ) {
      fail("witness_live_read_replay_composition_terminal_challenge_mismatch");
    }

    const policyDecision =
      classifyBuyVoidAllocationCustodyWitnessTransportPolicyV1(
        input?.transport_policy,
      );
    if (policyDecision.ok !== true) {
      fail(
        "witness_live_read_replay_composition_transport_" +
          String(policyDecision.reason || "invalid"),
      );
    }
    if (
      liveRead.normalized.transport_policy_sha256 !==
        policyDecision.policy_sha256 ||
      liveRead.normalized.challenge_sha256 !== issue.challenge_sha256 ||
      liveRead.normalized.challenge_issued_at_ms !== issue.issued_at_ms ||
      liveRead.normalized.prior_evidence_generation !== storage.generation ||
      liveRead.normalized.evidence_generation !== issue.generation ||
      liveRead.normalized.response_observed_at_ms < issue.issued_at_ms ||
      liveRead.normalized.response_observed_at_ms > issue.expires_at_ms ||
      liveRead.normalized.challenge_age_ms !==
        liveRead.normalized.response_observed_at_ms - issue.issued_at_ms
    ) {
      fail("witness_live_read_replay_composition_live_read_binding_invalid");
    }

    const built =
      buildBuyVoidAllocationCustodyWitnessTransportReadRequestV1({
        policy: policyDecision.policy,
        challenge_sha256: issue.challenge_sha256,
      });
    if (built.ok !== true) {
      fail(
        "witness_live_read_replay_composition_request_" +
          String(built.reason || "invalid"),
      );
    }
    const requestBytes = Buffer.isBuffer(input?.read_request_json)
      ? Buffer.from(input.read_request_json)
      : Buffer.from(String(input?.read_request_json ?? ""), "utf8");
    if (
      !requestBytes.equals(Buffer.from(built.request_json, "utf8")) ||
      built.request_id !== liveRead.normalized.request_id ||
      consume.value.terminal_request_id !== built.request_id
    ) {
      fail("witness_live_read_replay_composition_request_binding_invalid");
    }

    const responseBytes = Buffer.isBuffer(input?.read_response_json)
      ? Buffer.from(input.read_response_json)
      : Buffer.from(String(input?.read_response_json ?? ""), "utf8");
    const validated =
      validateBuyVoidAllocationCustodyWitnessTransportResponseV1({
        policy: policyDecision.policy,
        request_json: built.request_json,
        response_json: responseBytes,
      });
    if (
      validated.ok !== true ||
      validated.status !== "read_response_verified" ||
      validated.witness_sha256 !== liveRead.normalized.witness_sha256 ||
      validated.event_count !== liveRead.normalized.event_count ||
      validated.tip_event_sha256 !== liveRead.normalized.tip_event_sha256
    ) {
      fail("witness_live_read_replay_composition_response_binding_invalid");
    }
    const responseSha256 = sha256Id(responseBytes);
    if (consume.value.terminal_response_sha256 !== responseSha256) {
      fail(
        "witness_live_read_replay_composition_terminal_response_digest_mismatch",
      );
    }

    const normalized = Object.freeze({
      schema:
        "void_buy_void_allocation_custody_witness_live_read_replay_composition_v1",
      marker:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_COMPOSITION_V1,
      version: 1,
      replay_storage_qualification_id:
        storage.receipt.qualification_id,
      replay_storage_high_water_sha256:
        storage.high_water_sha256,
      replay_storage_journal_sha256:
        storage.journal_sha256,
      replay_storage_journal_bytes:
        storage.journal_bytes,
      issue_before_journal_sha256:
        issue.transition_before_journal_sha256,
      issue_before_journal_bytes:
        issue.transition_before_journal_bytes,
      issue_before_high_water_sha256:
        issue.transition_before_high_water_sha256,
      prior_generation: storage.generation,
      prior_sequence: storage.sequence,
      issue_generation: issue.generation,
      issue_sequence: issue.sequence,
      challenge_sha256: issue.challenge_sha256,
      challenge_id: issue.challenge_id,
      challenge_issued_at_ms: issue.issued_at_ms,
      challenge_expires_at_ms: issue.expires_at_ms,
      live_read_qualification_id:
        liveRead.value.qualification_id,
      transport_policy_sha256:
        policyDecision.policy_sha256,
      request_id: built.request_id,
      response_sha256: responseSha256,
      response_observed_at_ms:
        liveRead.normalized.response_observed_at_ms,
      witness_sha256: validated.witness_sha256,
      witness_event_count: validated.event_count,
      witness_tip_event_sha256: validated.tip_event_sha256,
      consume_generation: consume.generation,
      consume_sequence: consume.sequence,
      consume_before_journal_sha256:
        consume.transition_before_journal_sha256,
      consume_before_journal_bytes:
        consume.transition_before_journal_bytes,
      consume_before_high_water_sha256:
        consume.transition_before_high_water_sha256,
      consume_high_water_sha256:
        consume.value.high_water_sha256,
      consume_journal_sha256:
        consume.value.journal_sha256,
    });
    const qualificationId =
      "voidwlrcmp1_" +
      crypto
        .createHash("sha256")
        .update(canonicalJson(normalized), "utf8")
        .digest("hex");

    return Object.freeze({
      ok: true as const,
      status: "replay_live_read_composed" as const,
      marker:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_COMPOSITION_V1,
      version: 1 as const,
      qualification_id: qualificationId,
      normalized,
      operation_performed: false as const,
      storage_prestate_bound: true as const,
      storage_issue_digest_lineage_bound: true as const,
      issue_consume_digest_lineage_bound: true as const,
      issue_transition_bound: true as const,
      live_read_parent_bound: true as const,
      canonical_request_rebuilt: true as const,
      canonical_response_revalidated: true as const,
      consume_transition_bound: true as const,
      validated_packet_binding_proven: true as const,
      durable_consume_packet_binding_proven: true as const,
      live_durable_storage_proven: false as const,
      rollback_resistance_proven: false as const,
      protected_high_water_custody_proven: false as const,
      independent_custody_proven: false as const,
      trusted_verification_clock_proven: false as const,
      evidence_generation_monotonicity_proven: false as const,
      challenge_entropy_proven: false as const,
      challenge_unpredictability_proven: false as const,
      challenge_freshness_proven: false as const,
      response_replay_resistance_proven: false as const,
      live_evidence_origin_proven: false as const,
      live_sshd_connection_context_proven: false as const,
      external_transport_authenticated: false as const,
      external_witness_storage_proven: false as const,
      live_remote_read_performed: false as const,
      runtime_integration: false as const,
      production_gate_ready: false as const,
      funds_movement: false as const,
      authority:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_COMPOSITION_AUTHORITY_V1,
    });
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "witness_live_read_replay_composition_failed",
    );
  }
}