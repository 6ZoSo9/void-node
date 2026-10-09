import crypto from "node:crypto";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_QUALIFICATION_V1 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_QUALIFICATION_V1";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_MANIFEST_ID_V1 =
  "voidwfb1_2a729229f63c10a1562050924ddc279d8255a35603542967431a584977f1f6b7";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_MANIFEST_SHA256_V1 =
  "sha256:2190e7ab944436200b03e46285fa5ba4cda1b90d915cfda05b320d1b1dc7ebe2";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_CENSUS_SOURCE_COMMIT_V1 =
  "e390424c1d31cd87dcf3551cc0d2d610a24e12f8";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_AUTHORITY_V1 =
  Object.freeze({
    source_contract: true,
    pure_runtime_bundle_evidence_classification: true,
    exact_static_runtime_closure_binding: true,
    exact_runtime_file_path_binding: true,
    exact_runtime_file_sha256_binding: true,
    root_owned_runtime_files_required: true,
    mode_0444_runtime_files_required: true,
    single_link_runtime_files_required: true,
    symlink_runtime_files_rejected: true,
    root_owned_parent_chain_required: true,
    reviewed_dynamic_import_count_zero: true,
    reviewed_require_call_count_zero: true,
    v2_installation_qualification_still_required: true,
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
    wallet_or_signer_access: false,
    transaction_signing: false,
    transaction_broadcast: false,
    funds_movement: false,
  });

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_FILES_V1 =
  Object.freeze([
    Object.freeze({ source_path: "tools/void-buy-allocation-custody-witness-forced-command-v2.mjs", installed_path: "/usr/local/libexec/void/void-buy-allocation-custody-witness-forced-command-v2.mjs", sha256: "sha256:88f425986eff8597cdf6725e4608b3790aed2359fef6ae9fadb76292d9e5a26d" }),
    Object.freeze({ source_path: "dist/economic/buy_void_allocation_custody_external_witness_v1.js", installed_path: "/usr/local/libexec/dist/economic/buy_void_allocation_custody_external_witness_v1.js", sha256: "sha256:35d80f00a9ec0ce57bb457596d27e8c86a70d76efe310372e1fff796a92d43ca" }),
    Object.freeze({ source_path: "dist/economic/buy_void_allocation_custody_witness_transport_v1.js", installed_path: "/usr/local/libexec/dist/economic/buy_void_allocation_custody_witness_transport_v1.js", sha256: "sha256:8e03107d1545977a19b847bbec926543b9812b6d9c16a4d7e13e62cf5c790979" }),
    Object.freeze({ source_path: "dist/economic/buy_void_allocation_reservation_high_water_v1.js", installed_path: "/usr/local/libexec/dist/economic/buy_void_allocation_reservation_high_water_v1.js", sha256: "sha256:1999015c9e0770a5a94b3b4d29f5aa6a47036406754673adb2ed5829c5e406e9" }),
    Object.freeze({ source_path: "dist/economic/buy_void_allocation_reservation_ledger_v1.js", installed_path: "/usr/local/libexec/dist/economic/buy_void_allocation_reservation_ledger_v1.js", sha256: "sha256:af497a5b7f62b08b60e90a527ae3365540fd2a13fcd99f6dd4e8253423869c0f" }),
    Object.freeze({ source_path: "dist/economic/buy_void_auto_fulfillment_v1.js", installed_path: "/usr/local/libexec/dist/economic/buy_void_auto_fulfillment_v1.js", sha256: "sha256:ae15c56f1aa7009955058ca1d454da5e0d55a3e6c2011c54e7316374e33a5cf6" }),
    Object.freeze({ source_path: "dist/economic/buy_void_crash_consistent_saga_server_policy_v1.js", installed_path: "/usr/local/libexec/dist/economic/buy_void_crash_consistent_saga_server_policy_v1.js", sha256: "sha256:0b4dd188dbbf7658542b1d20c521227fa1fc01d7d79e89a713863b771380da13" }),
    Object.freeze({ source_path: "dist/economic/buy_void_filesystem_bakery_lock_v1.js", installed_path: "/usr/local/libexec/dist/economic/buy_void_filesystem_bakery_lock_v1.js", sha256: "sha256:7c7a6b92c1a88b14d325d331700a2bd19a0068630ae0094c65b2dcc6a25a9994" }),
  ] as const);

const SCHEMA =
  "void_buy_void_allocation_custody_witness_runtime_bundle_qualification_v1";
const TOP_KEYS = Object.freeze([
  "files", "manifest_id", "manifest_sha256", "marker", "schema", "source_commit", "version",
]);
const FILE_KEYS = Object.freeze([
  "gid", "mode", "nlink", "path", "regular_file", "root_owned_parent_chain", "sha256", "symlink", "uid",
]);
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
type RuntimeRecord = Record<string, unknown>;

function held(reason: string) {
  return Object.freeze({
    ok: false as const,
    status: "held" as const,
    marker: VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_QUALIFICATION_V1,
    version: 1 as const,
    reason,
    operation_performed: false as const,
    authority: VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_AUTHORITY_V1,
  });
}

function fail(reason: string): never { throw new Error(reason); }

function exactObject(value: unknown, keys: readonly string[], reason: string): RuntimeRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(reason);
  const record = value as RuntimeRecord;
  const actual = Object.keys(record).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) fail(reason);
  return record;
}

function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) return String(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return "{" + Object.keys(record).sort().map((key) => JSON.stringify(key) + ":" + canonicalJson(record[key])).join(",") + "}";
  }
  fail("witness_runtime_bundle_noncanonical_value");
}

export function classifyBuyVoidAllocationCustodyWitnessRuntimeBundleQualificationV1(input: unknown) {
  try {
    const raw = exactObject(input, TOP_KEYS, "witness_runtime_bundle_shape_invalid");
    if (
      raw.schema !== SCHEMA ||
      raw.marker !== VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_QUALIFICATION_V1 ||
      raw.version !== 1 ||
      raw.manifest_id !== VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_MANIFEST_ID_V1 ||
      raw.manifest_sha256 !== VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_MANIFEST_SHA256_V1 ||
      raw.source_commit !== VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_CENSUS_SOURCE_COMMIT_V1
    ) fail("witness_runtime_bundle_identity_invalid");

    if (!Array.isArray(raw.files) || raw.files.length !== VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_FILES_V1.length) {
      fail("witness_runtime_bundle_files_invalid");
    }

    const normalizedFiles = VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_FILES_V1.map((expected, index) => {
      const file = exactObject((raw.files as readonly unknown[])[index], FILE_KEYS, "witness_runtime_bundle_file_invalid");
      if (
        file.path !== expected.installed_path ||
        file.sha256 !== expected.sha256 ||
        typeof file.sha256 !== "string" || !SHA256_ID.test(file.sha256) ||
        file.uid !== 0 || file.gid !== 0 || file.mode !== 0o444 || file.nlink !== 1 ||
        file.regular_file !== true || file.symlink !== false || file.root_owned_parent_chain !== true
      ) fail("witness_runtime_bundle_file_invalid");
      return Object.freeze({ path: expected.installed_path, sha256: expected.sha256 });
    });

    const normalized = Object.freeze({
      marker: VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_QUALIFICATION_V1,
      version: 1 as const,
      manifest_id: VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_MANIFEST_ID_V1,
      manifest_sha256: VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_MANIFEST_SHA256_V1,
      census_source_commit: VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_CENSUS_SOURCE_COMMIT_V1,
      files: Object.freeze(normalizedFiles),
    });

    const qualificationId = "voidwfbq1_" + crypto.createHash("sha256").update(canonicalJson(normalized), "utf8").digest("hex");
    return Object.freeze({
      ok: true as const,
      status: "runtime_bundle_evidence_qualified" as const,
      marker: VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_QUALIFICATION_V1,
      version: 1 as const,
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
      funds_movement: false as const,
      authority: VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_AUTHORITY_V1,
    });
  } catch (error) {
    return held(error instanceof Error ? error.message : "witness_runtime_bundle_qualification_failed");
  }
}
