import crypto from "node:crypto";
import path from "node:path";

import {
  buildCoupledNativeGasStorePayerDomainV1,
  serializeCoupledNativeGasStorePayerDomainV1,
} from "./coupled_native_gas_liability_store_v1.js";

export const VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_QUALIFICATION_V1 =
  "VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_QUALIFICATION_V1";

export const VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_V1 =
  "VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_V1";

export const VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_AUTHORITY_V1 =
  Object.freeze({
    source_only_contract: true,
    io_performed: false,
    host_evidence_input_only: true,
    dedicated_service_identity_required: true,
    exact_payer_domain_identity_required: true,
    canonical_payer_domain_binding_reused: true,
    exact_payer_domain_bytes_required: true,
    exact_namespace_identity_required: true,
    root_owned_ancestor_chain_required: true,
    root_path_stability_evidence_required: true,
    mount_instance_fingerprint_bound: true,
    remount_denial_evidence_required: true,
    bind_mount_denial_evidence_required: true,
    same_uid_root_replacement_denial_required: true,
    symlink_substitution_denial_required: true,
    hardened_service_policy_required: true,
    no_fallback_storage_required: true,
    bounded_evidence_freshness_checked: true,
    writer_generation_binding_proven: false,
    bootstrap_receipt_external_trust_proven: false,
    evidence_generation_monotonicity_proven: false,
    verification_clock_authority_proven: false,
    live_host_qualification_performed: false,
    storage_bootstrap: false,
    runtime_integration: false,
    payment_acceptance: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    gas_spend: false,
    inventory_mutation: false,
    market_activation: false,
    public_presale_activation: false,
    production_gate_ready: false,
    funds_movement: false,
  });

const RECEIPT_SCHEMA =
  "void_coupled_native_gas_reconciliation_custody_receipt_v1";
const DOMAIN =
  "void-coupled-native-gas-reconciliation-custody-qualification-v1";
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const DECIMAL = /^(0|[1-9][0-9]*)$/u;
const MODE = /^0[0-7]{3}$/u;
const SAFE_TEXT = /^[A-Za-z0-9._:@/+\-]{1,256}$/u;
const MAJOR_MINOR = /^(0|[1-9][0-9]*):(0|[1-9][0-9]*)$/u;
const MAX_ANCESTORS = 64;
const MAX_MOUNT_OPTIONS = 64;
const MAX_EVIDENCE_TTL_MS = 5 * 60 * 1000;

const INPUT_KEYS = Object.freeze([
  "verification_now_ms",
  "payer_address",
  "host_evidence",
]);
const HOST_KEYS = Object.freeze([
  "host_id",
  "evidence_snapshot",
  "public_runtime_uid",
  "public_runtime_gid",
  "service_uid",
  "service_gid",
  "payer_root",
  "payer_domain",
  "records",
  "reconciliations",
  "queue",
  "service_policy",
  "negative_mutation_tests",
  "fallback_storage_enabled",
  "missing_storage_holds",
]);
const SNAPSHOT_KEYS = Object.freeze([
  "observed_at_ms",
  "expires_at_ms",
  "evidence_generation",
  "boot_id_sha256",
]);
const ROOT_KEYS = Object.freeze([
  "resolved_path",
  "dev",
  "ino",
  "uid",
  "gid",
  "mode",
  "symlink",
  "public_runtime_write",
  "public_runtime_rename",
  "public_runtime_recreate",
  "ancestors",
  "mount",
]);
const ANCESTOR_KEYS = Object.freeze([
  "path",
  "dev",
  "ino",
  "uid",
  "gid",
  "mode",
  "symlink",
  "public_runtime_write",
  "public_runtime_rename",
  "public_runtime_recreate",
]);
const MOUNT_KEYS = Object.freeze([
  "medium_present",
  "mount_target",
  "mount_source",
  "mount_uuid",
  "major_minor",
  "filesystem_type",
  "statfs_type",
  "mount_options",
  "public_runtime_remount",
  "public_runtime_bind_mount",
]);
const DIR_KEYS = Object.freeze([
  "resolved_path",
  "dev",
  "ino",
  "uid",
  "gid",
  "mode",
  "symlink",
  "public_runtime_write",
  "public_runtime_rename",
  "public_runtime_recreate",
]);
const DOMAIN_FILE_KEYS = Object.freeze([
  "resolved_path",
  "dev",
  "ino",
  "uid",
  "gid",
  "mode",
  "symlink",
  "nlink",
  "payer_domain_id",
  "content_sha256",
]);
const SERVICE_KEYS = Object.freeze([
  "unit_name",
  "unit_sha256",
  "user_uid",
  "group_gid",
  "umask",
  "no_new_privileges",
  "private_tmp",
  "private_devices",
  "protect_system",
  "protect_home",
  "protect_kernel_tunables",
  "protect_kernel_modules",
  "protect_control_groups",
  "lock_personality",
  "restrict_suid_sgid",
  "restrict_realtime",
  "capability_bounding_set",
  "ambient_capabilities",
  "read_write_paths",
  "public_runtime_can_control_service",
]);
const NEGATIVE_KEYS = Object.freeze([
  "same_uid_root_rename_denied",
  "same_uid_root_recreate_denied",
  "symlink_substitution_denied",
  "bind_mount_substitution_denied",
  "remount_denied",
  "alternate_namespace_substitution_denied",
]);

export type CoupledNativeGasReconciliationCustodyDecisionV1 =
  | {
      ok: true;
      status: "source_qualified";
      marker:
        typeof VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_QUALIFICATION_V1;
      version: 1;
      qualification_id_sha256: string;
      evidence_snapshot_fingerprint_sha256: string;
      qualification_policy_fingerprint_sha256: string;
      host_id: string;
      payer_address: string;
      payer_domain_id: string;
      payer_root_path: string;
      mount_instance_fingerprint_sha256: string;
      receipt: Readonly<Record<string, unknown>>;
      root_path_stability_evidence_qualified: true;
      namespace_identity_evidence_qualified: true;
      service_policy_evidence_qualified: true;
      negative_mutation_evidence_qualified: true;
      bounded_evidence_freshness_checked: true;
      writer_generation_binding_proven: false;
      bootstrap_receipt_external_trust_proven: false;
      evidence_generation_monotonicity_proven: false;
      verification_clock_authority_proven: false;
      live_host_qualification_performed: false;
      storage_bootstrap: false;
      runtime_integration: false;
      production_gate_ready: false;
      operation_performed: false;
      authority:
        typeof VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_AUTHORITY_V1;
    }
  | {
      ok: false;
      status: "held";
      marker:
        typeof VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_QUALIFICATION_V1;
      version: 1;
      reason: string;
      qualification_id_sha256: null;
      root_path_stability_evidence_qualified: false;
      namespace_identity_evidence_qualified: false;
      service_policy_evidence_qualified: false;
      negative_mutation_evidence_qualified: false;
      bounded_evidence_freshness_checked: false;
      writer_generation_binding_proven: false;
      bootstrap_receipt_external_trust_proven: false;
      evidence_generation_monotonicity_proven: false;
      verification_clock_authority_proven: false;
      live_host_qualification_performed: false;
      storage_bootstrap: false;
      runtime_integration: false;
      production_gate_ready: false;
      operation_performed: false;
      authority:
        typeof VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_AUTHORITY_V1;
    };

function fail(code: string): never {
  throw new Error(code);
}

function held(reason: string): CoupledNativeGasReconciliationCustodyDecisionV1 {
  return Object.freeze({
    ok: false,
    status: "held",
    marker:
      VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_QUALIFICATION_V1,
    version: 1,
    reason,
    qualification_id_sha256: null,
    root_path_stability_evidence_qualified: false,
    namespace_identity_evidence_qualified: false,
    service_policy_evidence_qualified: false,
    negative_mutation_evidence_qualified: false,
    bounded_evidence_freshness_checked: false,
    writer_generation_binding_proven: false,
    bootstrap_receipt_external_trust_proven: false,
    evidence_generation_monotonicity_proven: false,
    verification_clock_authority_proven: false,
    live_host_qualification_performed: false,
    storage_bootstrap: false,
    runtime_integration: false,
    production_gate_ready: false,
    operation_performed: false,
    authority:
      VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_AUTHORITY_V1,
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
  fail("reconciliation_custody_noncanonical_value");
}

function sha256Id(value: string): string {
  return (
    "sha256:" +
    crypto.createHash("sha256").update(value, "utf8").digest("hex")
  );
}

function exactObject(
  value: unknown,
  keys: readonly string[],
  code: string,
): Readonly<Record<string, unknown>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(code);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail(code);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const ownKeys = Reflect.ownKeys(descriptors);
  if (ownKeys.some((key) => typeof key !== "string")) fail(code);
  const actual = (ownKeys as string[]).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(code);
  }
  const snapshot: Record<string, unknown> = Object.create(null);
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value")
    ) {
      fail(code);
    }
    snapshot[key] = descriptor.value;
  }
  return Object.freeze(snapshot);
}

function safeInt(
  value: unknown,
  min: number,
  max: number,
  code: string,
): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) fail(code);
  return parsed;
}

function decimal(value: unknown, code: string): string {
  const text = String(value ?? "").trim();
  if (!DECIMAL.test(text) || text.length > 30) fail(code);
  return text;
}

function safeText(value: unknown, regex: RegExp, code: string): string {
  const text = String(value ?? "").trim();
  if (!regex.test(text)) fail(code);
  return text;
}

function normalizedPath(value: unknown, allowRoot: boolean, code: string): string {
  const raw = String(value ?? "").trim();
  if (!raw || !path.isAbsolute(raw) || raw.includes("\0")) fail(code);
  const normalized = path.normalize(raw);
  if (!allowRoot && normalized === path.parse(normalized).root) fail(code);
  return normalized;
}

function mode(value: unknown, code: string): { text: string; bits: number } {
  const text = String(value ?? "").trim();
  if (!MODE.test(text)) fail(code);
  return { text, bits: Number.parseInt(text, 8) };
}

function sortedStrings(
  value: unknown,
  max: number,
  code: string,
): readonly string[] {
  if (!Array.isArray(value) || value.length > max) fail(code);
  const out = value.map((entry) => safeText(entry, SAFE_TEXT, code));
  const sorted = [...out].sort();
  if (
    new Set(out).size !== out.length ||
    out.some((entry, index) => entry !== sorted[index])
  ) {
    fail(code);
  }
  return Object.freeze(out);
}

function linuxMajorMinorFromDev(
  value: string,
  code: string,
): string {
  let dev: bigint;
  try {
    dev = BigInt(value);
  } catch {
    fail(code);
  }
  if (dev < 0n || dev > 0xffff_ffff_ffff_ffffn) fail(code);
  const major =
    ((dev & 0x0000_0000_000f_ff00n) >> 8n) |
    ((dev & 0xffff_f000_0000_0000n) >> 32n);
  const minor =
    (dev & 0x0000_0000_0000_00ffn) |
    ((dev & 0x0000_0fff_fff0_0000n) >> 12n);
  return major.toString(10) + ":" + minor.toString(10);
}

function expectedAncestorPaths(resolved: string): string[] {
  const root = path.parse(resolved).root;
  const out: string[] = [];
  let current = path.dirname(resolved);
  for (;;) {
    out.push(current);
    if (current === root) break;
    current = path.dirname(current);
    if (out.length > MAX_ANCESTORS) fail("reconciliation_custody_ancestor_chain_invalid");
  }
  return out.reverse();
}

function normalizeAncestors(
  value: unknown,
  resolvedRoot: string,
  publicRuntimeUid: number,
): readonly Record<string, unknown>[] {
  if (!Array.isArray(value)) fail("reconciliation_custody_ancestor_chain_invalid");
  const expected = expectedAncestorPaths(resolvedRoot);
  if (value.length !== expected.length) {
    fail("reconciliation_custody_ancestor_chain_invalid");
  }
  return Object.freeze(value.map((raw, index) => {
    const entry = exactObject(
      raw,
      ANCESTOR_KEYS,
      "reconciliation_custody_ancestor_invalid",
    );
    const entryPath = normalizedPath(
      entry.path,
      true,
      "reconciliation_custody_ancestor_invalid",
    );
    const uid = safeInt(entry.uid, 0, 0x7fff_ffff, "reconciliation_custody_ancestor_invalid");
    const gid = safeInt(entry.gid, 0, 0x7fff_ffff, "reconciliation_custody_ancestor_invalid");
    const entryMode = mode(entry.mode, "reconciliation_custody_ancestor_invalid");
    if (
      entryPath !== expected[index] ||
      uid !== 0 ||
      uid === publicRuntimeUid ||
      entry.symlink !== false ||
      entry.public_runtime_write !== false ||
      entry.public_runtime_rename !== false ||
      entry.public_runtime_recreate !== false ||
      (entryMode.bits & 0o022) !== 0
    ) {
      fail("reconciliation_custody_ancestor_invalid");
    }
    return Object.freeze({
      path: entryPath,
      dev: decimal(entry.dev, "reconciliation_custody_ancestor_invalid"),
      ino: decimal(entry.ino, "reconciliation_custody_ancestor_invalid"),
      uid,
      gid,
      mode: entryMode.text,
      symlink: false,
      public_runtime_write: false,
      public_runtime_rename: false,
      public_runtime_recreate: false,
    });
  }));
}

function normalizeMount(
  value: unknown,
  rootPath: string,
  rootDev: string,
): Readonly<Record<string, unknown>> {
  const mount = exactObject(
    value,
    MOUNT_KEYS,
    "reconciliation_custody_mount_invalid",
  );
  if (
    mount.medium_present !== true ||
    mount.public_runtime_remount !== false ||
    mount.public_runtime_bind_mount !== false
  ) {
    fail("reconciliation_custody_mount_invalid");
  }
  const target = normalizedPath(
    mount.mount_target,
    true,
    "reconciliation_custody_mount_invalid",
  );
  const relative = path.relative(target, rootPath);
  if (
    relative === ".." ||
    relative.startsWith(".." + path.sep) ||
    path.isAbsolute(relative)
  ) {
    fail("reconciliation_custody_mount_invalid");
  }
  const options = sortedStrings(
    mount.mount_options,
    MAX_MOUNT_OPTIONS,
    "reconciliation_custody_mount_invalid",
  );
  if (!options.includes("rw")) fail("reconciliation_custody_mount_read_only");
  const majorMinor = safeText(
    mount.major_minor,
    MAJOR_MINOR,
    "reconciliation_custody_mount_invalid",
  );
  if (
    linuxMajorMinorFromDev(
      rootDev,
      "reconciliation_custody_mount_invalid",
    ) !== majorMinor
  ) {
    fail("reconciliation_custody_mount_invalid");
  }
  const body = Object.freeze({
    mount_target: target,
    mount_source: safeText(
      mount.mount_source,
      SAFE_TEXT,
      "reconciliation_custody_mount_invalid",
    ),
    mount_uuid: safeText(
      mount.mount_uuid,
      SAFE_TEXT,
      "reconciliation_custody_mount_invalid",
    ),
    major_minor: majorMinor,
    filesystem_type: safeText(
      mount.filesystem_type,
      /^[A-Za-z0-9._-]{1,64}$/u,
      "reconciliation_custody_mount_invalid",
    ),
    statfs_type: safeText(
      mount.statfs_type,
      /^[A-Za-z0-9x._:-]{1,80}$/u,
      "reconciliation_custody_mount_invalid",
    ),
    mount_options: options,
  });
  return Object.freeze({
    medium_present: true,
    ...body,
    public_runtime_remount: false,
    public_runtime_bind_mount: false,
    mount_instance_fingerprint_sha256: sha256Id(canonicalJson(body)),
  });
}

function normalizeRoot(
  value: unknown,
  publicRuntimeUid: number,
  serviceUid: number,
  serviceGid: number,
): Readonly<Record<string, unknown>> {
  const root = exactObject(value, ROOT_KEYS, "reconciliation_custody_root_invalid");
  const resolved = normalizedPath(
    root.resolved_path,
    false,
    "reconciliation_custody_root_invalid",
  );
  const rootMode = mode(root.mode, "reconciliation_custody_root_invalid");
  if (
    safeInt(root.uid, 0, 0x7fff_ffff, "reconciliation_custody_root_invalid") !== serviceUid ||
    safeInt(root.gid, 0, 0x7fff_ffff, "reconciliation_custody_root_invalid") !== serviceGid ||
    rootMode.bits !== 0o700 ||
    root.symlink !== false ||
    root.public_runtime_write !== false ||
    root.public_runtime_rename !== false ||
    root.public_runtime_recreate !== false
  ) {
    fail("reconciliation_custody_root_invalid");
  }
  const rootDev = decimal(
    root.dev,
    "reconciliation_custody_root_invalid",
  );
  const ancestors = normalizeAncestors(
    root.ancestors,
    resolved,
    publicRuntimeUid,
  );
  const mount = normalizeMount(root.mount, resolved, rootDev);
  const mountTarget = String(
    (mount as Record<string, unknown>).mount_target,
  );
  if (mountTarget !== resolved) {
    const targetAncestor = ancestors.find(
      (entry) => entry.path === mountTarget,
    );
    if (
      !targetAncestor ||
      String(targetAncestor.dev) !== rootDev
    ) {
      fail("reconciliation_custody_mount_invalid");
    }
  }
  return Object.freeze({
    resolved_path: resolved,
    dev: rootDev,
    ino: decimal(root.ino, "reconciliation_custody_root_invalid"),
    uid: serviceUid,
    gid: serviceGid,
    mode: rootMode.text,
    symlink: false,
    public_runtime_write: false,
    public_runtime_rename: false,
    public_runtime_recreate: false,
    ancestors,
    mount,
  });
}

function normalizeDirectory(
  value: unknown,
  expectedPath: string,
  rootDev: string,
  serviceUid: number,
  serviceGid: number,
): Readonly<Record<string, unknown>> {
  const directory = exactObject(
    value,
    DIR_KEYS,
    "reconciliation_custody_namespace_invalid",
  );
  const resolved = normalizedPath(
    directory.resolved_path,
    false,
    "reconciliation_custody_namespace_invalid",
  );
  const directoryMode = mode(
    directory.mode,
    "reconciliation_custody_namespace_invalid",
  );
  if (
    resolved !== expectedPath ||
    decimal(directory.dev, "reconciliation_custody_namespace_invalid") !== rootDev ||
    safeInt(directory.uid, 0, 0x7fff_ffff, "reconciliation_custody_namespace_invalid") !== serviceUid ||
    safeInt(directory.gid, 0, 0x7fff_ffff, "reconciliation_custody_namespace_invalid") !== serviceGid ||
    directoryMode.bits !== 0o700 ||
    directory.symlink !== false ||
    directory.public_runtime_write !== false ||
    directory.public_runtime_rename !== false ||
    directory.public_runtime_recreate !== false
  ) {
    fail("reconciliation_custody_namespace_invalid");
  }
  return Object.freeze({
    resolved_path: resolved,
    dev: rootDev,
    ino: decimal(directory.ino, "reconciliation_custody_namespace_invalid"),
    uid: serviceUid,
    gid: serviceGid,
    mode: directoryMode.text,
    symlink: false,
    public_runtime_write: false,
    public_runtime_rename: false,
    public_runtime_recreate: false,
  });
}

function normalizePayerDomain(
  value: unknown,
  expectedPath: string,
  rootDev: string,
  serviceUid: number,
  serviceGid: number,
  expectedPayerDomainId: string,
  expectedContentSha256: string,
): Readonly<Record<string, unknown>> {
  const file = exactObject(
    value,
    DOMAIN_FILE_KEYS,
    "reconciliation_custody_payer_domain_invalid",
  );
  const fileMode = mode(file.mode, "reconciliation_custody_payer_domain_invalid");
  if (
    normalizedPath(
      file.resolved_path,
      false,
      "reconciliation_custody_payer_domain_invalid",
    ) !== expectedPath ||
    decimal(file.dev, "reconciliation_custody_payer_domain_invalid") !== rootDev ||
    safeInt(file.uid, 0, 0x7fff_ffff, "reconciliation_custody_payer_domain_invalid") !== serviceUid ||
    safeInt(file.gid, 0, 0x7fff_ffff, "reconciliation_custody_payer_domain_invalid") !== serviceGid ||
    fileMode.bits !== 0o600 ||
    file.symlink !== false ||
    safeInt(file.nlink, 1, 1, "reconciliation_custody_payer_domain_invalid") !== 1 ||
    String(file.payer_domain_id ?? "") !== expectedPayerDomainId ||
    String(file.content_sha256 ?? "") !== expectedContentSha256
  ) {
    fail("reconciliation_custody_payer_domain_invalid");
  }
  return Object.freeze({
    resolved_path: expectedPath,
    dev: rootDev,
    ino: decimal(file.ino, "reconciliation_custody_payer_domain_invalid"),
    uid: serviceUid,
    gid: serviceGid,
    mode: fileMode.text,
    symlink: false,
    nlink: 1,
    payer_domain_id: expectedPayerDomainId,
    content_sha256: expectedContentSha256,
  });
}

function normalizeServicePolicy(
  value: unknown,
  rootPath: string,
  publicRuntimeUid: number,
  serviceUid: number,
  serviceGid: number,
): Readonly<Record<string, unknown>> {
  const service = exactObject(
    value,
    SERVICE_KEYS,
    "reconciliation_custody_service_policy_invalid",
  );
  const writePaths = sortedStrings(
    service.read_write_paths,
    8,
    "reconciliation_custody_service_policy_invalid",
  );
  const caps = sortedStrings(
    service.capability_bounding_set,
    32,
    "reconciliation_custody_service_policy_invalid",
  );
  const ambient = sortedStrings(
    service.ambient_capabilities,
    32,
    "reconciliation_custody_service_policy_invalid",
  );
  if (
    safeInt(service.user_uid, 0, 0x7fff_ffff, "reconciliation_custody_service_policy_invalid") !== serviceUid ||
    safeInt(service.group_gid, 0, 0x7fff_ffff, "reconciliation_custody_service_policy_invalid") !== serviceGid ||
    serviceUid === publicRuntimeUid ||
    String(service.umask ?? "") !== "0077" ||
    service.no_new_privileges !== true ||
    service.private_tmp !== true ||
    service.private_devices !== true ||
    service.protect_system !== "strict" ||
    service.protect_home !== true ||
    service.protect_kernel_tunables !== true ||
    service.protect_kernel_modules !== true ||
    service.protect_control_groups !== true ||
    service.lock_personality !== true ||
    service.restrict_suid_sgid !== true ||
    service.restrict_realtime !== true ||
    caps.length !== 0 ||
    ambient.length !== 0 ||
    writePaths.length !== 1 ||
    writePaths[0] !== rootPath ||
    service.public_runtime_can_control_service !== false
  ) {
    fail("reconciliation_custody_service_policy_invalid");
  }
  return Object.freeze({
    unit_name: safeText(
      service.unit_name,
      /^[A-Za-z0-9@_.-]{1,128}$/u,
      "reconciliation_custody_service_policy_invalid",
    ),
    unit_sha256: safeText(
      service.unit_sha256,
      SHA256_ID,
      "reconciliation_custody_service_policy_invalid",
    ),
    user_uid: serviceUid,
    group_gid: serviceGid,
    umask: "0077",
    no_new_privileges: true,
    private_tmp: true,
    private_devices: true,
    protect_system: "strict",
    protect_home: true,
    protect_kernel_tunables: true,
    protect_kernel_modules: true,
    protect_control_groups: true,
    lock_personality: true,
    restrict_suid_sgid: true,
    restrict_realtime: true,
    capability_bounding_set: caps,
    ambient_capabilities: ambient,
    read_write_paths: writePaths,
    public_runtime_can_control_service: false,
  });
}

function normalizeNegativeTests(value: unknown): Readonly<Record<string, true>> {
  const tests = exactObject(
    value,
    NEGATIVE_KEYS,
    "reconciliation_custody_negative_tests_invalid",
  );
  for (const key of NEGATIVE_KEYS) {
    if (tests[key] !== true) {
      fail("reconciliation_custody_negative_tests_invalid");
    }
  }
  return Object.freeze(Object.fromEntries(
    NEGATIVE_KEYS.map((key) => [key, true]),
  )) as Readonly<Record<string, true>>;
}

export function classifyCoupledNativeGasReconciliationCustodyQualificationV1(
  input: unknown,
): CoupledNativeGasReconciliationCustodyDecisionV1 {
  try {
    const top = exactObject(
      input,
      INPUT_KEYS,
      "reconciliation_custody_input_invalid",
    );
    const now = safeInt(
      top.verification_now_ms,
      1,
      Number.MAX_SAFE_INTEGER,
      "reconciliation_custody_verification_time_invalid",
    );
    const canonicalPayerDomain =
      buildCoupledNativeGasStorePayerDomainV1(top.payer_address);
    const payerAddress = canonicalPayerDomain.payer_address;
    const expectedPayerDomainId =
      canonicalPayerDomain.payer_domain_id;
    const expectedPayerDomainContentSha256 = sha256Id(
      serializeCoupledNativeGasStorePayerDomainV1(payerAddress),
    );
    const host = exactObject(
      top.host_evidence,
      HOST_KEYS,
      "reconciliation_custody_host_evidence_invalid",
    );
    const snapshot = exactObject(
      host.evidence_snapshot,
      SNAPSHOT_KEYS,
      "reconciliation_custody_snapshot_invalid",
    );
    const observed = safeInt(
      snapshot.observed_at_ms,
      1,
      Number.MAX_SAFE_INTEGER,
      "reconciliation_custody_snapshot_invalid",
    );
    const expires = safeInt(
      snapshot.expires_at_ms,
      1,
      Number.MAX_SAFE_INTEGER,
      "reconciliation_custody_snapshot_invalid",
    );
    const generation = decimal(
      snapshot.evidence_generation,
      "reconciliation_custody_snapshot_invalid",
    );
    if (
      generation === "0" ||
      observed > now ||
      expires <= now ||
      expires <= observed ||
      expires - observed > MAX_EVIDENCE_TTL_MS
    ) {
      fail("reconciliation_custody_snapshot_not_fresh");
    }
    const bootId = safeText(
      snapshot.boot_id_sha256,
      SHA256_ID,
      "reconciliation_custody_snapshot_invalid",
    );
    const publicRuntimeUid = safeInt(
      host.public_runtime_uid,
      1,
      0x7fff_ffff,
      "reconciliation_custody_identity_invalid",
    );
    const publicRuntimeGid = safeInt(
      host.public_runtime_gid,
      1,
      0x7fff_ffff,
      "reconciliation_custody_identity_invalid",
    );
    const serviceUid = safeInt(
      host.service_uid,
      1,
      0x7fff_ffff,
      "reconciliation_custody_identity_invalid",
    );
    const serviceGid = safeInt(
      host.service_gid,
      1,
      0x7fff_ffff,
      "reconciliation_custody_identity_invalid",
    );
    if (
      serviceUid === publicRuntimeUid ||
      serviceGid === publicRuntimeGid
    ) {
      fail("reconciliation_custody_identity_not_separated");
    }
    if (
      host.fallback_storage_enabled !== false ||
      host.missing_storage_holds !== true
    ) {
      fail("reconciliation_custody_fallback_policy_invalid");
    }

    const root = normalizeRoot(
      host.payer_root,
      publicRuntimeUid,
      serviceUid,
      serviceGid,
    );
    const rootPath = String(root.resolved_path);
    const rootDev = String(root.dev);
    const payerDomain = normalizePayerDomain(
      host.payer_domain,
      path.join(rootPath, "payer-domain-v1.json"),
      rootDev,
      serviceUid,
      serviceGid,
      expectedPayerDomainId,
      expectedPayerDomainContentSha256,
    );
    const records = normalizeDirectory(
      host.records,
      path.join(rootPath, "records"),
      rootDev,
      serviceUid,
      serviceGid,
    );
    const reconciliations = normalizeDirectory(
      host.reconciliations,
      path.join(rootPath, "reconciliations"),
      rootDev,
      serviceUid,
      serviceGid,
    );
    const queue = normalizeDirectory(
      host.queue,
      path.join(rootPath, "gas-liability-admission-v1.queue"),
      rootDev,
      serviceUid,
      serviceGid,
    );
    const inodeSet = new Set([
      String(root.ino),
      String(payerDomain.ino),
      String(records.ino),
      String(reconciliations.ino),
      String(queue.ino),
    ]);
    if (inodeSet.size !== 5) {
      fail("reconciliation_custody_identity_alias_invalid");
    }

    const servicePolicy = normalizeServicePolicy(
      host.service_policy,
      rootPath,
      publicRuntimeUid,
      serviceUid,
      serviceGid,
    );
    const negativeTests = normalizeNegativeTests(
      host.negative_mutation_tests,
    );
    const hostId = safeText(
      host.host_id,
      SAFE_TEXT,
      "reconciliation_custody_host_id_invalid",
    );

    const snapshotBody = Object.freeze({
      observed_at_ms: observed,
      expires_at_ms: expires,
      evidence_generation: generation,
      boot_id_sha256: bootId,
    });
    const evidenceSnapshotFingerprint = sha256Id(
      canonicalJson(snapshotBody),
    );
    const policyBody = Object.freeze({
      host_id: hostId,
      payer_address: payerAddress,
      public_runtime_uid: publicRuntimeUid,
      public_runtime_gid: publicRuntimeGid,
      service_uid: serviceUid,
      service_gid: serviceGid,
      payer_root: root,
      payer_domain: payerDomain,
      records,
      reconciliations,
      queue,
      service_policy: servicePolicy,
      negative_mutation_tests: negativeTests,
      fallback_storage_enabled: false,
      missing_storage_holds: true,
    });
    const policyFingerprint = sha256Id(canonicalJson(policyBody));
    const receiptBody = Object.freeze({
      schema: RECEIPT_SCHEMA,
      marker:
        VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_RECEIPT_V1,
      version: 1,
      host_id: hostId,
      payer_address: payerAddress,
      evidence_generation: generation,
      observed_at_ms: observed,
      expires_at_ms: expires,
      boot_id_sha256: bootId,
      payer_domain_id: expectedPayerDomainId,
      payer_root_path: rootPath,
      payer_root_dev: rootDev,
      payer_root_ino: String(root.ino),
      records_ino: String(records.ino),
      reconciliations_ino: String(reconciliations.ino),
      queue_ino: String(queue.ino),
      mount_instance_fingerprint_sha256: String(
        (root.mount as Record<string, unknown>)
          .mount_instance_fingerprint_sha256,
      ),
      service_unit_sha256: String(
        (servicePolicy as Record<string, unknown>).unit_sha256,
      ),
      qualification_policy_fingerprint_sha256: policyFingerprint,
      evidence_snapshot_fingerprint_sha256:
        evidenceSnapshotFingerprint,
    });
    const receipt = Object.freeze({
      ...receiptBody,
      receipt_sha256: sha256Id(canonicalJson(receiptBody)),
    });
    const qualificationId = sha256Id(
      canonicalJson({
        domain: DOMAIN,
        qualification_policy_fingerprint_sha256: policyFingerprint,
        evidence_snapshot_fingerprint_sha256:
          evidenceSnapshotFingerprint,
        receipt_sha256: receipt.receipt_sha256,
      }),
    );

    return Object.freeze({
      ok: true,
      status: "source_qualified",
      marker:
        VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_QUALIFICATION_V1,
      version: 1,
      qualification_id_sha256: qualificationId,
      evidence_snapshot_fingerprint_sha256:
        evidenceSnapshotFingerprint,
      qualification_policy_fingerprint_sha256: policyFingerprint,
      host_id: hostId,
      payer_address: payerAddress,
      payer_domain_id: expectedPayerDomainId,
      payer_root_path: rootPath,
      mount_instance_fingerprint_sha256: String(
        (root.mount as Record<string, unknown>)
          .mount_instance_fingerprint_sha256,
      ),
      receipt,
      root_path_stability_evidence_qualified: true,
      namespace_identity_evidence_qualified: true,
      service_policy_evidence_qualified: true,
      negative_mutation_evidence_qualified: true,
      bounded_evidence_freshness_checked: true,
      writer_generation_binding_proven: false,
      bootstrap_receipt_external_trust_proven: false,
      evidence_generation_monotonicity_proven: false,
      verification_clock_authority_proven: false,
      live_host_qualification_performed: false,
      storage_bootstrap: false,
      runtime_integration: false,
      production_gate_ready: false,
      operation_performed: false,
      authority:
        VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_AUTHORITY_V1,
    });
  } catch (error) {
    return held(String((error as Error)?.message || error));
  }
}
