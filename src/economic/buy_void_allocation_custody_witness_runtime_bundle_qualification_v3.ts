import crypto from "node:crypto";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_QUALIFICATION_V3 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_QUALIFICATION_V3";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_CANDIDATE_MANIFEST_ID_V3 =
  "voidwfb3_cec212bbadb4586f7d479c2284e7a2850f47bdc2205a6dccfad5274c8c7ef454";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_CANDIDATE_ARCHIVE_SHA256_V3 =
  "sha256:5063297be5469385113041da31962d465350607dafffe25784e3b4888e7f6900";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_CANDIDATE_SOURCE_MAIN_V3 =
  "851513f0d545016c28b9dd5af5975dc28535d662";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_HISTORICAL_V1_GIT_BLOB_SHA1 =
  "d2e84643c9f4d76c642c7e07d4ea2bf1634035e4";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_PROPOSED_V2_LOCK_GIT_BLOB_SHA1 =
  "73c7f88348a1d6b208336df8779940657607bd7d";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_AUTHORITY_V3 =
  Object.freeze({
    source_contract: true,
    separate_acceptance_generation: true,
    exact_candidate_manifest_binding: true,
    exact_candidate_archive_binding: true,
    exact_static_runtime_closure_binding: true,
    exact_runtime_file_path_binding: true,
    exact_runtime_file_sha256_binding: true,
    root_owned_runtime_files_required: true,
    mode_0444_runtime_files_required: true,
    single_link_runtime_files_required: true,
    symlink_runtime_files_rejected: true,
    root_owned_parent_chain_required: true,
    historical_v1_reinterpretation: false,
    proposed_v2_reinterpretation: false,
    unaccepted_candidate_record_rewritten: false,
    live_evidence_origin_proven: false,
    live_nimo_installed: false,
    live_ssh_execution_performed: false,
    authorized_keys_mutated: false,
    sshd_mutated: false,
    config_installed: false,
    ssh_key_generated: false,
    external_transport_authenticated: false,
    external_witness_storage_proven: false,
    runtime_integration: false,
    protected_high_water_custody_proven: false,
    independent_custody_proven: false,
    production_gate_ready: false,
    payment_acceptance: false,
    verified_payment_to_allocation_mounted: false,
    custody_reserve_or_recover_enabled: false,
    wallet_or_signer_access: false,
    transaction_signing: false,
    transaction_broadcast: false,
    presale_activation: false,
    funds_movement: false,
  });

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_FILES_V3 =
  Object.freeze([
    Object.freeze({
      source_path: "tools/void-buy-allocation-custody-witness-forced-command-v2.mjs",
      installed_path: "/usr/local/libexec/void/void-buy-allocation-custody-witness-forced-command-v2.mjs",
      sha256: "sha256:88f425986eff8597cdf6725e4608b3790aed2359fef6ae9fadb76292d9e5a26d",
    }),
    Object.freeze({
      source_path: "dist/economic/buy_void_allocation_custody_external_witness_v1.js",
      installed_path: "/usr/local/libexec/dist/economic/buy_void_allocation_custody_external_witness_v1.js",
      sha256: "sha256:35d80f00a9ec0ce57bb457596d27e8c86a70d76efe310372e1fff796a92d43ca",
    }),
    Object.freeze({
      source_path: "dist/economic/buy_void_allocation_custody_witness_transport_v1.js",
      installed_path: "/usr/local/libexec/dist/economic/buy_void_allocation_custody_witness_transport_v1.js",
      sha256: "sha256:8e03107d1545977a19b847bbec926543b9812b6d9c16a4d7e13e62cf5c790979",
    }),
    Object.freeze({
      source_path: "dist/economic/buy_void_allocation_reservation_high_water_v1.js",
      installed_path: "/usr/local/libexec/dist/economic/buy_void_allocation_reservation_high_water_v1.js",
      sha256: "sha256:1999015c9e0770a5a94b3b4d29f5aa6a47036406754673adb2ed5829c5e406e9",
    }),
    Object.freeze({
      source_path: "dist/economic/buy_void_allocation_reservation_ledger_v1.js",
      installed_path: "/usr/local/libexec/dist/economic/buy_void_allocation_reservation_ledger_v1.js",
      sha256: "sha256:97a1cb675fec65558aa823b94f049815345fbaed4ac69c9dfae4e1416950cec0",
    }),
    Object.freeze({
      source_path: "dist/economic/buy_void_auto_fulfillment_v1.js",
      installed_path: "/usr/local/libexec/dist/economic/buy_void_auto_fulfillment_v1.js",
      sha256: "sha256:119a08db651cb85091f66ed2c9e475c56a81f21c9084c47c7f8ee083f831a47c",
    }),
    Object.freeze({
      source_path: "dist/economic/buy_void_crash_consistent_saga_server_policy_v1.js",
      installed_path: "/usr/local/libexec/dist/economic/buy_void_crash_consistent_saga_server_policy_v1.js",
      sha256: "sha256:0b4dd188dbbf7658542b1d20c521227fa1fc01d7d79e89a713863b771380da13",
    }),
    Object.freeze({
      source_path: "dist/economic/buy_void_filesystem_bakery_lock_v1.js",
      installed_path: "/usr/local/libexec/dist/economic/buy_void_filesystem_bakery_lock_v1.js",
      sha256: "sha256:7c7a6b92c1a88b14d325d331700a2bd19a0068630ae0094c65b2dcc6a25a9994",
    }),
  ] as const);

const SCHEMA =
  "void_buy_void_allocation_custody_witness_runtime_bundle_qualification_v3";
const TOP_KEYS = Object.freeze([
  "candidate_archive_sha256",
  "candidate_manifest_id",
  "files",
  "marker",
  "schema",
  "version",
]);
const FILE_KEYS = Object.freeze([
  "gid",
  "mode",
  "nlink",
  "path",
  "regular_file",
  "root_owned_parent_chain",
  "sha256",
  "symlink",
  "uid",
]);
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
type RuntimeRecord = Record<string, unknown>;

function held(reason: string) {
  return Object.freeze({
    ok: false as const,
    status: "held" as const,
    marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_QUALIFICATION_V3,
    version: 3 as const,
    reason,
    operation_performed: false as const,
    authority:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_AUTHORITY_V3,
  });
}

function fail(reason: string): never {
  throw new Error(reason);
}

function exactObject(
  value: unknown,
  keys: readonly string[],
  reason: string,
): RuntimeRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(reason);
  const record = value as RuntimeRecord;
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
  fail("witness_runtime_bundle_v3_noncanonical_value");
}

export function classifyBuyVoidAllocationCustodyWitnessRuntimeBundleQualificationV3(
  input: unknown,
) {
  try {
    const raw = exactObject(
      input,
      TOP_KEYS,
      "witness_runtime_bundle_v3_shape_invalid",
    );
    if (
      raw.schema !== SCHEMA ||
      raw.marker !==
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_QUALIFICATION_V3 ||
      raw.version !== 3 ||
      raw.candidate_manifest_id !==
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_CANDIDATE_MANIFEST_ID_V3 ||
      raw.candidate_archive_sha256 !==
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_CANDIDATE_ARCHIVE_SHA256_V3
    ) {
      fail("witness_runtime_bundle_v3_identity_invalid");
    }

    if (
      !Array.isArray(raw.files) ||
      raw.files.length !==
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_FILES_V3.length
    ) {
      fail("witness_runtime_bundle_v3_files_invalid");
    }

    const normalizedFiles =
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_FILES_V3.map(
        (expected, index) => {
          const file = exactObject(
            (raw.files as readonly unknown[])[index],
            FILE_KEYS,
            "witness_runtime_bundle_v3_file_invalid",
          );
          if (
            file.path !== expected.installed_path ||
            file.sha256 !== expected.sha256 ||
            typeof file.sha256 !== "string" ||
            !SHA256_ID.test(file.sha256) ||
            file.uid !== 0 ||
            file.gid !== 0 ||
            file.mode !== 0o444 ||
            file.nlink !== 1 ||
            file.regular_file !== true ||
            file.symlink !== false ||
            file.root_owned_parent_chain !== true
          ) {
            fail("witness_runtime_bundle_v3_file_invalid");
          }
          return Object.freeze({
            path: expected.installed_path,
            sha256: expected.sha256,
          });
        },
      );

    const normalized = Object.freeze({
      marker:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_QUALIFICATION_V3,
      version: 3 as const,
      candidate_manifest_id:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_CANDIDATE_MANIFEST_ID_V3,
      candidate_archive_sha256:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_CANDIDATE_ARCHIVE_SHA256_V3,
      candidate_source_main:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_CANDIDATE_SOURCE_MAIN_V3,
      historical_v1_git_blob_sha1:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_HISTORICAL_V1_GIT_BLOB_SHA1,
      proposed_v2_lock_git_blob_sha1:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_PROPOSED_V2_LOCK_GIT_BLOB_SHA1,
      files: Object.freeze(normalizedFiles),
    });

    const qualificationId =
      "voidwfbq3_" +
      crypto
        .createHash("sha256")
        .update(canonicalJson(normalized), "utf8")
        .digest("hex");

    return Object.freeze({
      ok: true as const,
      status: "runtime_bundle_v3_candidate_bytes_qualified" as const,
      marker:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_QUALIFICATION_V3,
      version: 3 as const,
      qualification_id: qualificationId,
      normalized,
      operation_performed: false as const,
      live_evidence_origin_proven: false as const,
      live_nimo_installed: false as const,
      external_transport_authenticated: false as const,
      external_witness_storage_proven: false as const,
      runtime_integration: false as const,
      protected_high_water_custody_proven: false as const,
      independent_custody_proven: false as const,
      production_gate_ready: false as const,
      verified_payment_to_allocation_mounted: false as const,
      custody_reserve_or_recover_enabled: false as const,
      presale_activation: false as const,
      funds_movement: false as const,
      authority:
        VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_AUTHORITY_V3,
    });
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "witness_runtime_bundle_v3_qualification_failed",
    );
  }
}
