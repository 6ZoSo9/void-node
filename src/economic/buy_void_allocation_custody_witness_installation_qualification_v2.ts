import crypto from "node:crypto";
import path from "node:path";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_FORCED_COMMAND_SOURCE_GIT_BLOB_SHA1_V1,
  classifyBuyVoidAllocationCustodyWitnessInstallationQualificationV1,
} from "./buy_void_allocation_custody_witness_installation_qualification_v1.js";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_V2 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_V2";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_AUTHORITY_V2 =
  Object.freeze({
    source_contract: true,
    pure_installation_evidence_classification: true,
    v1_qualification_reused: true,
    transport_policy_binding: true,
    reviewed_handler_blob_binding: true,
    v2_handler_blob_binding: true,
    v2_forced_command_binding: true,
    continuity_attestation_binding: true,
    dedicated_account_required: true,
    protected_config_required: true,
    restrictive_authorized_key_required: true,
    root_owned_authorized_keys_required: true,
    effective_authorized_keys_path_binding: true,
    sshd_environment_restrictions_required: true,
    preexec_original_command_rejection_required: true,
    preexec_binary_identity_binding: true,
    root_owned_execution_chain_required: true,
    sanitized_node_environment_required: true,
    pinned_host_key_required: true,
    pinned_client_key_required: true,
    live_evidence_origin_proven: false,
    trusted_verification_clock_proven: false,
    evidence_generation_monotonicity_proven: false,
    live_continuity_attestation_installed: false,
    live_nimo_installed: false,
    live_ssh_execution_performed: false,
    authorized_keys_mutated: false,
    sshd_mutated: false,
    config_installed: false,
    ssh_key_generated: false,
    external_transport_authenticated: false,
    external_witness_storage_proven: false,
    live_remote_read_performed: false,
    live_remote_append_performed: false,
    runtime_integration: false,
    protected_high_water_custody_proven: false,
    independent_custody_proven: false,
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

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_FORCED_COMMAND_SOURCE_GIT_BLOB_SHA1_V2 =
  "94dd160bc15ffb5ce75f6f1638df4f074e8d1cc8";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_CONTINUITY_ATTESTATION_SHA256_V1 =
  "sha256:12a6f037d1297c89f017f4d4ed3ca96c2ffadae820dd6d1b170f3966183481eb";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_CONTINUITY_ATTESTATION_ID_V1 =
  "voidwica1_49191c526f27da78075973403bc7e98238eedcdd2442fd1339311cf4c45e3eee";

const REVIEWED_CENSUS_RECEIPT_SHA256 =
  "sha256:17bdb840978606db5145696a7b5085cabbcf27dee76b35a1b57324c1021241ef";

const SCHEMA_V2 =
  "void_buy_void_allocation_custody_witness_installation_qualification_v2";
const SCHEMA_V1 =
  "void_buy_void_allocation_custody_witness_installation_qualification_v1";
const MARKER_V1 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_V1";

const HANDLER_PATH_V2 =
  "/usr/local/libexec/void/void-buy-allocation-custody-witness-forced-command-v2.mjs";
const HANDLER_PATH_V1 =
  "/usr/local/libexec/void/void-buy-allocation-custody-witness-forced-command-v1.mjs";
const CONFIG_PATH_V2 =
  "/etc/void/buy-void-allocation-custody-witness-forced-command-v2.json";
const CONFIG_PATH_V1 =
  "/etc/void/buy-void-allocation-custody-witness-forced-command-v1.json";
const AUTHORITY_ROOT =
  "/var/lib/void-allocation-custody-witness-v1";
const CONTINUITY_ATTESTATION_PATH =
  AUTHORITY_ROOT +
  "/buy-void-allocation-custody-witness-identity-continuity-attestation-v1.json";

const FORCED_COMMAND_V2 =
  'test -z "$SSH_ORIGINAL_COMMAND" || exit 3; exec /usr/bin/env -i PATH=/usr/bin:/bin LANG=C LC_ALL=C VOID_BUY_VOID_WITNESS_FORCED_COMMAND_V2=1 /usr/bin/node /usr/local/libexec/void/void-buy-allocation-custody-witness-forced-command-v2.mjs --config=/etc/void/buy-void-allocation-custody-witness-forced-command-v2.json';
const FORCED_COMMAND_V1 =
  'test -z "$SSH_ORIGINAL_COMMAND" || exit 3; exec /usr/bin/env -i PATH=/usr/bin:/bin LANG=C LC_ALL=C VOID_BUY_VOID_WITNESS_FORCED_COMMAND_V1=1 /usr/bin/node /usr/local/libexec/void/void-buy-allocation-custody-witness-forced-command-v1.mjs --config=/etc/void/buy-void-allocation-custody-witness-forced-command-v1.json';

const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const GIT_SHA1 = /^[0-9a-f]{40}$/u;
const ATTESTATION_ID = /^voidwica1_[0-9a-f]{64}$/u;
const SAFE_ABSOLUTE =
  /^\/(?:[A-Za-z0-9._+-]+\/)*[A-Za-z0-9._+-]+$/u;

const TOP_KEYS = Object.freeze([
  "account",
  "authorized_key",
  "collected_at_ms",
  "config",
  "continuity_attestation",
  "evidence_generation",
  "handler",
  "host_binding",
  "marker",
  "node",
  "preexec",
  "schema",
  "sshd",
  "transport_policy",
  "version",
]);

const CONTINUITY_KEYS = Object.freeze([
  "attestation_id",
  "census_receipt_sha256",
  "gid",
  "mode",
  "nlink",
  "path",
  "regular_file",
  "sha256",
  "symlink",
  "uid",
]);

const NODE_ENV_V2_KEYS = Object.freeze([
  "LANG",
  "LC_ALL",
  "PATH",
  "VOID_BUY_VOID_WITNESS_FORCED_COMMAND_V2",
]);

type RecordV2 = Record<string, any>;

function held(reason: string) {
  return Object.freeze({
    ok: false as const,
    status: "held" as const,
    marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_V2,
    version: 2 as const,
    reason,
    operation_performed: false as const,
    authority:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_AUTHORITY_V2,
  });
}

function fail(reason: string): never {
  throw new Error(reason);
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
  fail("witness_installation_v2_noncanonical_value");
}

function sha256Id(value: string): string {
  return (
    "sha256:" +
    crypto.createHash("sha256").update(value, "utf8").digest("hex")
  );
}

function exactObject(
  value: unknown,
  keys: readonly string[] | null,
  reason: string,
): RecordV2 {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(reason);
  }
  const record = value as RecordV2;
  if (keys !== null) {
    const actual = Object.keys(record).sort();
    const expected = [...keys].sort();
    if (
      actual.length !== expected.length ||
      actual.some((key, index) => key !== expected[index])
    ) {
      fail(reason);
    }
  }
  return record;
}

function exactString(value: unknown, reason: string): string {
  if (typeof value !== "string") fail(reason);
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

function exactPath(
  value: unknown,
  expected: string,
  reason: string,
): string {
  const text = exactString(value, reason);
  if (
    !SAFE_ABSOLUTE.test(text) ||
    path.resolve(text) !== text ||
    text !== expected
  ) {
    fail(reason);
  }
  return text;
}

function exactSha256(value: unknown, reason: string): string {
  const text = exactString(value, reason);
  if (!SHA256_ID.test(text)) fail(reason);
  return text;
}

function exactGitSha1(value: unknown, reason: string): string {
  const text = exactString(value, reason);
  if (!GIT_SHA1.test(text)) fail(reason);
  return text;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function classifyBuyVoidAllocationCustodyWitnessInstallationQualificationV2(
  input: unknown,
) {
  try {
    const raw = exactObject(
      input,
      TOP_KEYS,
      "witness_installation_v2_shape_invalid",
    );
    if (
      raw.schema !== SCHEMA_V2 ||
      raw.marker !==
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_V2 ||
      raw.version !== 2
    ) {
      fail("witness_installation_v2_identity_invalid");
    }

    const account = exactObject(
      raw.account,
      null,
      "witness_installation_v2_account_invalid",
    );
    const accountUid = exactInteger(
      account.uid,
      1,
      4_294_967_294,
      "witness_installation_v2_account_invalid",
    );
    const accountGid = exactInteger(
      account.gid,
      1,
      4_294_967_294,
      "witness_installation_v2_account_invalid",
    );

    const handler = exactObject(
      raw.handler,
      null,
      "witness_installation_v2_handler_invalid",
    );
    if (
      exactGitSha1(
        handler.source_git_blob_sha1,
        "witness_installation_v2_handler_invalid",
      ) !==
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_FORCED_COMMAND_SOURCE_GIT_BLOB_SHA1_V2 ||
      exactGitSha1(
        handler.installed_git_blob_sha1,
        "witness_installation_v2_handler_invalid",
      ) !==
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_FORCED_COMMAND_SOURCE_GIT_BLOB_SHA1_V2 ||
      exactPath(
        handler.path,
        HANDLER_PATH_V2,
        "witness_installation_v2_handler_invalid",
      ) !== HANDLER_PATH_V2
    ) {
      fail("witness_installation_v2_handler_invalid");
    }

    const config = exactObject(
      raw.config,
      null,
      "witness_installation_v2_config_invalid",
    );
    if (
      exactPath(
        config.path,
        CONFIG_PATH_V2,
        "witness_installation_v2_config_invalid",
      ) !== CONFIG_PATH_V2
    ) {
      fail("witness_installation_v2_config_invalid");
    }

    const authorizedKey = exactObject(
      raw.authorized_key,
      null,
      "witness_installation_v2_authorized_key_invalid",
    );
    if (
      authorizedKey.forced_command !== FORCED_COMMAND_V2 ||
      exactSha256(
        authorizedKey.forced_command_sha256,
        "witness_installation_v2_authorized_key_invalid",
      ) !== sha256Id(FORCED_COMMAND_V2)
    ) {
      fail("witness_installation_v2_authorized_key_invalid");
    }

    const preexec = exactObject(
      raw.preexec,
      null,
      "witness_installation_v2_preexec_invalid",
    );
    const nodeEnvironment = exactObject(
      preexec.node_environment,
      NODE_ENV_V2_KEYS,
      "witness_installation_v2_preexec_invalid",
    );
    if (
      nodeEnvironment.PATH !== "/usr/bin:/bin" ||
      nodeEnvironment.LANG !== "C" ||
      nodeEnvironment.LC_ALL !== "C" ||
      nodeEnvironment.VOID_BUY_VOID_WITNESS_FORCED_COMMAND_V2 !== "1"
    ) {
      fail("witness_installation_v2_preexec_invalid");
    }

    const continuity = exactObject(
      raw.continuity_attestation,
      CONTINUITY_KEYS,
      "witness_installation_v2_continuity_attestation_invalid",
    );
    if (
      exactPath(
        continuity.path,
        CONTINUITY_ATTESTATION_PATH,
        "witness_installation_v2_continuity_attestation_invalid",
      ) !== CONTINUITY_ATTESTATION_PATH ||
      exactSha256(
        continuity.sha256,
        "witness_installation_v2_continuity_attestation_invalid",
      ) !==
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_CONTINUITY_ATTESTATION_SHA256_V1 ||
      !ATTESTATION_ID.test(
        exactString(
          continuity.attestation_id,
          "witness_installation_v2_continuity_attestation_invalid",
        ),
      ) ||
      continuity.attestation_id !==
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_CONTINUITY_ATTESTATION_ID_V1 ||
      exactSha256(
        continuity.census_receipt_sha256,
        "witness_installation_v2_continuity_attestation_invalid",
      ) !== REVIEWED_CENSUS_RECEIPT_SHA256 ||
      continuity.uid !== accountUid ||
      continuity.gid !== accountGid ||
      continuity.mode !== 0o600 ||
      continuity.nlink !== 1 ||
      continuity.regular_file !== true ||
      continuity.symlink !== false
    ) {
      fail("witness_installation_v2_continuity_attestation_invalid");
    }

    const mapped = clone(raw);
    delete mapped.continuity_attestation;
    mapped.schema = SCHEMA_V1;
    mapped.marker = MARKER_V1;
    mapped.version = 1;
    mapped.handler.path = HANDLER_PATH_V1;
    mapped.handler.source_git_blob_sha1 =
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_FORCED_COMMAND_SOURCE_GIT_BLOB_SHA1_V1;
    mapped.handler.installed_git_blob_sha1 =
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_FORCED_COMMAND_SOURCE_GIT_BLOB_SHA1_V1;
    mapped.config.path = CONFIG_PATH_V1;
    mapped.authorized_key.forced_command = FORCED_COMMAND_V1;
    mapped.authorized_key.forced_command_sha256 =
      sha256Id(FORCED_COMMAND_V1);
    mapped.preexec.node_environment = {
      PATH: "/usr/bin:/bin",
      LANG: "C",
      LC_ALL: "C",
      VOID_BUY_VOID_WITNESS_FORCED_COMMAND_V1: "1",
    };

    const parent =
      classifyBuyVoidAllocationCustodyWitnessInstallationQualificationV1(
        mapped,
      );
    if (parent.ok !== true) {
      fail("witness_installation_v2_parent_" + parent.reason);
    }

    const normalized = Object.freeze({
      ...parent.normalized,
      schema: SCHEMA_V2,
      marker:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_V2,
      version: 2 as const,
      parent_qualification_id: parent.qualification_id,
      handler_path: HANDLER_PATH_V2,
      handler_git_blob_sha1:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_FORCED_COMMAND_SOURCE_GIT_BLOB_SHA1_V2,
      config_path: CONFIG_PATH_V2,
      forced_command_sha256: sha256Id(FORCED_COMMAND_V2),
      node_environment: Object.freeze({
        PATH: "/usr/bin:/bin",
        LANG: "C",
        LC_ALL: "C",
        VOID_BUY_VOID_WITNESS_FORCED_COMMAND_V2: "1",
      }),
      continuity_attestation_path: CONTINUITY_ATTESTATION_PATH,
      continuity_attestation_sha256:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_CONTINUITY_ATTESTATION_SHA256_V1,
      continuity_attestation_id:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_CONTINUITY_ATTESTATION_ID_V1,
      continuity_census_receipt_sha256:
        REVIEWED_CENSUS_RECEIPT_SHA256,
    });

    const qualificationId =
      "voidwiq2_" +
      crypto
        .createHash("sha256")
        .update(canonicalJson(normalized), "utf8")
        .digest("hex");

    return Object.freeze({
      ok: true as const,
      status: "source_installation_evidence_qualified_v2" as const,
      marker:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_V2,
      version: 2 as const,
      qualification_id: qualificationId,
      parent_qualification_id: parent.qualification_id,
      normalized,
      operation_performed: false as const,
      live_evidence_origin_proven: false as const,
      trusted_verification_clock_proven: false as const,
      evidence_generation_monotonicity_proven: false as const,
      live_continuity_attestation_installed: false as const,
      live_nimo_installed: false as const,
      external_transport_authenticated: false as const,
      external_witness_storage_proven: false as const,
      runtime_integration: false as const,
      protected_high_water_custody_proven: false as const,
      independent_custody_proven: false as const,
      production_gate_ready: false as const,
      funds_movement: false as const,
      authority:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_AUTHORITY_V2,
    });
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "witness_installation_v2_qualification_failed",
    );
  }
}
