import crypto from "node:crypto";

import {
  parseBuyVoidAllocationCustodyExternalWitnessJournalV1,
} from "./buy_void_allocation_custody_external_witness_v1.js";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_IDENTITY_CONTINUITY_V1 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_IDENTITY_CONTINUITY_V1";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_IDENTITY_CONTINUITY_ATTESTATION_V1 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_IDENTITY_CONTINUITY_ATTESTATION_V1";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_IDENTITY_CONTINUITY_AUTHORITY_V1 =
  Object.freeze({
    source_contract: true,
    pure_validation: true,
    predecessor_witness_parser_reused: true,
    v1_witness_history_rewritten: false,
    v1_witness_mutation: false,
    machine_id_only_drift_required: true,
    stable_hostname_required: true,
    stable_root_disk_serial_required: true,
    stable_root_disk_wwn_required: true,
    existing_known_hosts_match_required: true,
    ssh_hostkey_update_must_be_false: true,
    ed25519_hostkey_required: true,
    exact_predecessor_witness_required: true,
    read_only_census_required: true,
    live_evidence_origin_proven: false,
    live_continuity_attestation_proven: false,
    handler_integration: false,
    current_machine_id_runtime_admission: false,
    external_transport_authenticated: false,
    external_witness_storage_proven: false,
    protected_high_water_custody_proven: false,
    independent_custody_proven: false,
    production_gate_ready: false,
    payment_acceptance: false,
    wallet_or_signer_access: false,
    transaction_broadcast: false,
    funds_movement: false,
  });

const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const HOSTKEY_FP = /^SHA256:[A-Za-z0-9+/]{43}$/u;
const SAFE_TEXT = /^[A-Za-z0-9._:@/-]{1,256}$/u;

const EVIDENCE_KEYS = Object.freeze([
  "schema",
  "marker",
  "version",
  "census_receipt_sha256",
  "read_only_census",
  "ssh_hostkey_algorithm",
  "ssh_hostkey_fingerprint",
  "existing_known_hosts_match",
  "ssh_hostkey_update",
  "predecessor_witness_sha256",
  "predecessor_witness_bytes",
  "predecessor_witness_mode",
  "predecessor_witness_links",
  "predecessor_event_count",
  "predecessor_tip_event_sha256",
  "predecessor_hostname",
  "predecessor_machine_id_sha256",
  "predecessor_root_disk_serial",
  "predecessor_root_disk_wwn",
  "successor_hostname",
  "successor_machine_id_sha256",
  "successor_root_disk_serial",
  "successor_root_disk_wwn",
  "drift_class",
] as const);

function fail(reason: string): never {
  throw new Error(reason);
}

function exactObject(
  value: unknown,
  keys: readonly string[],
  reason: string,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(reason);
  }
  const record = value as Record<string, unknown>;
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

function exactString(
  value: unknown,
  regex: RegExp,
  reason: string,
): string {
  if (typeof value !== "string" || !regex.test(value)) {
    fail(reason);
  }
  return value;
}

function exactInteger(
  value: unknown,
  minimum: number,
  maximum: number,
  reason: string,
): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    fail(reason);
  }
  return value;
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
  fail("witness_identity_continuity_noncanonical_value");
}

function sha256Id(value: string | Buffer): string {
  return (
    "sha256:" +
    crypto.createHash("sha256").update(value).digest("hex")
  );
}

function held(reason: string) {
  return Object.freeze({
    ok: false as const,
    status: "held" as const,
    marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_IDENTITY_CONTINUITY_V1,
    version: 1 as const,
    reason,
    operation_performed: false as const,
    authority:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_IDENTITY_CONTINUITY_AUTHORITY_V1,
  });
}

export function classifyBuyVoidAllocationCustodyWitnessIdentityContinuityV1(
  input: {
    predecessor_witness_jsonl: string | Buffer;
    evidence: unknown;
  },
) {
  try {
    const witnessBytes = Buffer.isBuffer(input?.predecessor_witness_jsonl)
      ? Buffer.from(input.predecessor_witness_jsonl)
      : Buffer.from(String(input?.predecessor_witness_jsonl ?? ""), "utf8");

    const witness =
      parseBuyVoidAllocationCustodyExternalWitnessJournalV1(
        witnessBytes,
      );

    const raw = exactObject(
      input?.evidence,
      EVIDENCE_KEYS,
      "witness_identity_continuity_evidence_shape_invalid",
    );

    if (
      raw.schema !==
        "void_buy_void_allocation_custody_witness_identity_continuity_evidence_v1" ||
      raw.marker !==
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_IDENTITY_CONTINUITY_V1 ||
      raw.version !== 1 ||
      raw.read_only_census !== true ||
      raw.ssh_hostkey_algorithm !== "ssh-ed25519" ||
      raw.existing_known_hosts_match !== true ||
      raw.ssh_hostkey_update !== false ||
      raw.predecessor_witness_mode !== "0600" ||
      raw.drift_class !== "machine_id_only"
    ) {
      fail("witness_identity_continuity_evidence_invalid");
    }

    const censusReceiptSha256 = exactString(
      raw.census_receipt_sha256,
      SHA256_ID,
      "witness_identity_continuity_evidence_invalid",
    );
    const hostkeyFingerprint = exactString(
      raw.ssh_hostkey_fingerprint,
      HOSTKEY_FP,
      "witness_identity_continuity_evidence_invalid",
    );
    const predecessorWitnessSha256 = exactString(
      raw.predecessor_witness_sha256,
      SHA256_ID,
      "witness_identity_continuity_evidence_invalid",
    );
    const predecessorWitnessBytes = exactInteger(
      raw.predecessor_witness_bytes,
      2,
      16 * 1024 * 1024,
      "witness_identity_continuity_evidence_invalid",
    );
    const predecessorWitnessLinks = exactInteger(
      raw.predecessor_witness_links,
      1,
      1,
      "witness_identity_continuity_evidence_invalid",
    );
    const predecessorEventCount = exactInteger(
      raw.predecessor_event_count,
      1,
      100_001,
      "witness_identity_continuity_evidence_invalid",
    );
    const predecessorTipEventSha256 = exactString(
      raw.predecessor_tip_event_sha256,
      SHA256_ID,
      "witness_identity_continuity_evidence_invalid",
    );

    const predecessorHostname = exactString(
      raw.predecessor_hostname,
      SAFE_TEXT,
      "witness_identity_continuity_evidence_invalid",
    );
    const predecessorMachineIdSha256 = exactString(
      raw.predecessor_machine_id_sha256,
      SHA256_ID,
      "witness_identity_continuity_evidence_invalid",
    );
    const predecessorRootDiskSerial = exactString(
      raw.predecessor_root_disk_serial,
      SAFE_TEXT,
      "witness_identity_continuity_evidence_invalid",
    );
    const predecessorRootDiskWwn = exactString(
      raw.predecessor_root_disk_wwn,
      SAFE_TEXT,
      "witness_identity_continuity_evidence_invalid",
    );

    const successorHostname = exactString(
      raw.successor_hostname,
      SAFE_TEXT,
      "witness_identity_continuity_evidence_invalid",
    );
    const successorMachineIdSha256 = exactString(
      raw.successor_machine_id_sha256,
      SHA256_ID,
      "witness_identity_continuity_evidence_invalid",
    );
    const successorRootDiskSerial = exactString(
      raw.successor_root_disk_serial,
      SAFE_TEXT,
      "witness_identity_continuity_evidence_invalid",
    );
    const successorRootDiskWwn = exactString(
      raw.successor_root_disk_wwn,
      SAFE_TEXT,
      "witness_identity_continuity_evidence_invalid",
    );

    if (
      predecessorWitnessSha256 !== sha256Id(witnessBytes) ||
      predecessorWitnessBytes !== witnessBytes.length ||
      predecessorEventCount !== witness.event_count ||
      predecessorTipEventSha256 !== witness.tip.event_sha256
    ) {
      fail("witness_identity_continuity_predecessor_witness_mismatch");
    }

    if (
      predecessorHostname !== witness.tip.witness_hostname ||
      predecessorMachineIdSha256 !==
        witness.tip.witness_machine_id_sha256 ||
      predecessorRootDiskSerial !==
        witness.tip.witness_root_disk_serial ||
      predecessorRootDiskWwn !==
        witness.tip.witness_root_disk_wwn
    ) {
      fail("witness_identity_continuity_predecessor_identity_mismatch");
    }

    if (
      successorHostname !== predecessorHostname ||
      successorRootDiskSerial !== predecessorRootDiskSerial ||
      successorRootDiskWwn !== predecessorRootDiskWwn
    ) {
      fail("witness_identity_continuity_multi_field_drift_rejected");
    }

    if (successorMachineIdSha256 === predecessorMachineIdSha256) {
      fail("witness_identity_continuity_machine_id_not_rotated");
    }

    const attestationBody = Object.freeze({
      schema:
        "void_buy_void_allocation_custody_witness_identity_continuity_attestation_v1",
      marker:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_IDENTITY_CONTINUITY_ATTESTATION_V1,
      version: 1 as const,
      continuity_scope: "machine_id_rotation_only" as const,
      census_receipt_sha256: censusReceiptSha256,
      predecessor_witness_sha256: predecessorWitnessSha256,
      predecessor_witness_bytes: predecessorWitnessBytes,
      predecessor_event_count: predecessorEventCount,
      predecessor_tip_event_sha256: predecessorTipEventSha256,
      predecessor_machine_id_sha256: predecessorMachineIdSha256,
      successor_machine_id_sha256: successorMachineIdSha256,
      stable_hostname: predecessorHostname,
      stable_root_disk_serial: predecessorRootDiskSerial,
      stable_root_disk_wwn: predecessorRootDiskWwn,
      stable_ssh_hostkey_algorithm: "ssh-ed25519" as const,
      stable_ssh_hostkey_fingerprint: hostkeyFingerprint,
      existing_known_hosts_match: true as const,
      ssh_hostkey_update: false as const,
      v1_witness_retained_exact: true as const,
      v1_witness_history_rewritten: false as const,
      handler_integration_required: true as const,
      current_machine_id_runtime_admission_authorized: false as const,
      production_gate_ready: false as const,
    });

    const attestationId =
      "voidwica1_" +
      crypto
        .createHash("sha256")
        .update(canonicalJson(attestationBody))
        .digest("hex");

    const attestation = Object.freeze({
      ...attestationBody,
      attestation_id: attestationId,
    });

    return Object.freeze({
      ok: true as const,
      status: "continuity_candidate_valid" as const,
      marker:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_IDENTITY_CONTINUITY_V1,
      version: 1 as const,
      attestation,
      attestation_json: canonicalJson(attestation) + "\n",
      operation_performed: false as const,
      live_evidence_origin_proven: false as const,
      live_continuity_attestation_proven: false as const,
      handler_integration: false as const,
      current_machine_id_runtime_admission: false as const,
      production_gate_ready: false as const,
      authority:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_IDENTITY_CONTINUITY_AUTHORITY_V1,
    });
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "witness_identity_continuity_validation_failed",
    );
  }
}
