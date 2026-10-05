import crypto from "node:crypto";
import path from "node:path";

import {
  classifyBuyVoidAllocationReservationHighWaterBindingV1,
} from "./buy_void_allocation_reservation_high_water_v1.js";
import {
  VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_WRITER_V1,
} from "./buy_void_allocation_reservation_publication_writer_v1.js";

export const VOID_BUY_VOID_ALLOCATION_HIGH_WATER_CUSTODY_QUALIFICATION_V1 =
  "VOID_BUY_VOID_ALLOCATION_HIGH_WATER_CUSTODY_QUALIFICATION_V1";

export const VOID_BUY_VOID_ALLOCATION_HIGH_WATER_CUSTODY_EVIDENCE_SCHEMA_V1 =
  "void_buy_void_allocation_high_water_custody_evidence_v1";

export const VOID_BUY_VOID_ALLOCATION_HIGH_WATER_CUSTODY_QUALIFICATION_AUTHORITY_V1 =
  Object.freeze({
    source_classifier: true,
    pure_evidence_validation: true,
    exact_current_state_binding: true,
    runtime_custody_identity_separation_required: true,
    stable_root_ancestor_policy_required: true,
    distinct_mount_identity_required: true,
    independent_rollback_domain_identity_required: true,
    af_unix_ipc_required: true,
    systemd_hardening_required: true,
    negative_probe_evidence_required: true,
    recovery_phase_evidence_required: true,
    freshness_required: true,
    synthetic_evidence_qualification: true,
    live_host_observation: false,
    live_host_qualification: false,
    host_mutation: false,
    service_installation: false,
    service_start: false,
    mount_mutation: false,
    ownership_or_permission_mutation: false,
    storage_bootstrap: false,
    runtime_integration: false,
    payment_acceptance: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    inventory_movement: false,
    market_activation: false,
    public_presale_activation: false,
    treasury_or_liquidity_movement: false,
    production_gate_ready: false,
    funds_movement: false,
  });

const REPOSITORY = "6ZoSo9/void-node";
const GIT_SHA = /^[0-9a-f]{40}$/u;
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const DEVICE = /^[0-9]+:[0-9]+$/u;
const MOUNT_ID = /^[1-9][0-9]*$/u;
const MAX_LEDGER_BYTES = 64 * 1024 * 1024;
const MAX_HIGH_WATER_BYTES = 4096;
const MAX_EVIDENCE_TTL_MS = 15 * 60 * 1000;
const MAX_EVIDENCE_AGE_MS = 5 * 60 * 1000;
const LEDGER_NAME = "allocation-reservations-v1.jsonl";
const HIGH_WATER_NAME = "allocation-reservation-high-water-v1.json";
const REQUIRED_MOUNT_OPTIONS = Object.freeze([
  "nodev",
  "noexec",
  "nosuid",
  "rw",
]);

type AncestorEvidenceV1 = {
  path: string;
  uid: number;
  gid: number;
  mode: number;
  is_symlink: false;
  runtime_can_write: false;
  runtime_can_rename: false;
  custody_can_write: false;
  custody_can_rename: false;
};

type MountEvidenceV1 = {
  mount_id: string;
  device_major_minor: string;
  mount_source: string;
  rollback_domain_sha256: string;
  fs_type: "ext4" | "xfs";
  options: string[];
  read_only: false;
};

type RootEvidenceV1 = {
  path: string;
  uid: number;
  gid: number;
  mode: number;
  is_symlink: false;
  runtime_can_write_contents: false;
  runtime_can_rename_path: false;
  custody_can_write_contents: true;
  custody_can_rename_path: false;
  ancestors: AncestorEvidenceV1[];
  mount: MountEvidenceV1;
};

type StateFileEvidenceV1 = {
  path: string;
  uid: number;
  gid: number;
  mode: number;
  is_regular_file: true;
  is_symlink: false;
  nlink: 1;
  sha256: string;
  bytes: number;
};

type EvidenceV1 = {
  schema: typeof VOID_BUY_VOID_ALLOCATION_HIGH_WATER_CUSTODY_EVIDENCE_SCHEMA_V1;
  marker: typeof VOID_BUY_VOID_ALLOCATION_HIGH_WATER_CUSTODY_QUALIFICATION_V1;
  version: 1;
  evidence_generation: number;
  observed_at_ms: number;
  expires_at_ms: number;
  source: {
    repository: typeof REPOSITORY;
    source_head_sha: string;
    writer_marker:
      typeof VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_WRITER_V1;
  };
  host: {
    host_id_sha256: string;
    runtime_uid: number;
    runtime_gid: number;
    custody_uid: number;
    custody_gid: number;
  };
  ledger: RootEvidenceV1;
  custody: RootEvidenceV1;
  ipc: {
    socket_path: string;
    parent_path: string;
    owner_uid: number;
    owner_gid: number;
    mode: number;
    address_family: "AF_UNIX";
    runtime_can_connect: true;
    runtime_can_write_parent: false;
    runtime_can_replace_socket: false;
    custody_can_write_parent: true;
  };
  service_hardening: {
    unit_name: "void-allocation-custody-v1.service";
    unit_sha256: string;
    no_new_privileges: true;
    private_tmp: true;
    private_devices: true;
    protect_system_strict: true;
    protect_home: true;
    protect_kernel_tunables: true;
    protect_kernel_modules: true;
    protect_control_groups: true;
    lock_personality: true;
    restrict_suid_sgid: true;
    restrict_realtime: true;
    capability_bounding_set_empty: true;
    ambient_capabilities_empty: true;
    af_unix_only: true;
    read_write_paths: string[];
  };
  recovery_probes: {
    clean_restart_bound: true;
    intent_only_restart_recovers: true;
    ledger_committed_restart_recovers: true;
    high_water_committed_restart_recovers: true;
    complete_restart_recovers: true;
    forward_only_recovery: true;
    no_duplicate_allocation_obligation: true;
  };
  negative_probes: {
    runtime_rename_ledger_root_denied: true;
    runtime_rename_custody_root_denied: true;
    runtime_recreate_ledger_parent_denied: true;
    runtime_recreate_custody_parent_denied: true;
    symlink_substitution_denied: true;
    bind_mount_substitution_denied: true;
    remount_substitution_denied: true;
    custody_medium_missing_holds: true;
    stale_high_water_rejected: true;
    alternate_same_generation_high_water_rejected: true;
    both_root_rollback_rejected: true;
    reboot_mount_identity_stable: true;
  };
  state: {
    ledger_file: StateFileEvidenceV1;
    high_water_file: StateFileEvidenceV1;
  };
};

export type BuyVoidAllocationHighWaterCustodyQualificationDecisionV1 =
  | {
      ok: true;
      status: "qualified_source_evidence";
      marker:
        typeof VOID_BUY_VOID_ALLOCATION_HIGH_WATER_CUSTODY_QUALIFICATION_V1;
      version: 1;
      evidence_sha256: string;
      source_head_sha: string;
      host_id_sha256: string;
      ledger_sha256: string;
      high_water_sha256: string;
      distinct_mount_identity_evidence: true;
      independent_rollback_domain_evidence: true;
      root_path_stability_evidence: true;
      runtime_write_isolation_evidence: true;
      service_hardening_evidence: true;
      evidence_fresh: true;
      live_host_qualification: false;
      production_gate_ready: false;
      funds_movement: false;
      authority:
        typeof VOID_BUY_VOID_ALLOCATION_HIGH_WATER_CUSTODY_QUALIFICATION_AUTHORITY_V1;
    }
  | {
      ok: false;
      status: "held";
      reason: string;
      authority:
        typeof VOID_BUY_VOID_ALLOCATION_HIGH_WATER_CUSTODY_QUALIFICATION_AUTHORITY_V1;
    };

function held(
  reason: string,
): Extract<
  BuyVoidAllocationHighWaterCustodyQualificationDecisionV1,
  { ok: false }
> {
  return Object.freeze({
    ok: false,
    status: "held",
    reason,
    authority:
      VOID_BUY_VOID_ALLOCATION_HIGH_WATER_CUSTODY_QUALIFICATION_AUTHORITY_V1,
  });
}

function fail(code: string): never {
  throw new Error(code);
}

function directObject(
  value: unknown,
  code: string,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(code);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail(code);
  return value as Record<string, unknown>;
}

function exactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  code: string,
): void {
  if (
    Object.keys(value).sort().join("\n") !==
    [...expected].sort().join("\n")
  ) {
    fail(code);
  }
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") {
    const encoded = JSON.stringify(value);
    if (encoded === undefined) fail("allocation_custody_noncanonical_value");
    return encoded;
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonical).join(",") + "]";
  }
  const record = directObject(
    value,
    "allocation_custody_noncanonical_object",
  );
  return (
    "{" +
    Object.keys(record)
      .sort()
      .map((key) => JSON.stringify(key) + ":" + canonical(record[key]))
      .join(",") +
    "}"
  );
}

function sha256Id(value: Buffer | string): string {
  return (
    "sha256:" +
    crypto
      .createHash("sha256")
      .update(value)
      .digest("hex")
  );
}

function safeInteger(value: unknown, code: string): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    fail(code);
  }
  return value;
}

function serviceId(value: unknown, code: string): number {
  const parsed = safeInteger(value, code);
  if (parsed <= 0 || parsed > 0x7fffffff) fail(code);
  return parsed;
}

function modeV1(value: unknown, code: string): number {
  const parsed = safeInteger(value, code);
  if (parsed < 0 || parsed > 0o7777) fail(code);
  return parsed;
}

function absolutePath(value: unknown, code: string): string {
  const original = String(value ?? "");
  const raw = original.trim();
  if (
    original !== raw ||
    !raw ||
    raw.includes("\0") ||
    !raw.startsWith("/") ||
    path.posix.normalize(raw) !== raw ||
    (raw.length > 1 && raw.endsWith("/"))
  ) {
    fail(code);
  }
  return raw;
}

function ancestorPaths(rootPath: string): string[] {
  const out: string[] = [];
  let current = path.posix.dirname(rootPath);
  for (;;) {
    out.push(current);
    if (current === "/") break;
    const next = path.posix.dirname(current);
    if (next === current) fail("allocation_custody_ancestor_cycle");
    current = next;
  }
  return out.reverse();
}

function validateAncestorChain(
  raw: unknown,
  rootPath: string,
  code: string,
): void {
  if (!Array.isArray(raw)) fail(code + "_array_required");
  const expected = ancestorPaths(rootPath);
  if (raw.length !== expected.length) fail(code + "_cardinality_invalid");
  for (let index = 0; index < raw.length; index += 1) {
    const value = directObject(raw[index], code + "_object_invalid");
    exactKeys(
      value,
      [
        "path",
        "uid",
        "gid",
        "mode",
        "is_symlink",
        "runtime_can_write",
        "runtime_can_rename",
        "custody_can_write",
        "custody_can_rename",
      ],
      code + "_keys_invalid",
    );
    if (absolutePath(value.path, code + "_path_invalid") !== expected[index]) {
      fail(code + "_path_chain_invalid");
    }
    if (
      safeInteger(value.uid, code + "_uid_invalid") !== 0 ||
      safeInteger(value.gid, code + "_gid_invalid") !== 0
    ) {
      fail(code + "_root_ownership_required");
    }
    const mode = modeV1(value.mode, code + "_mode_invalid");
    if ((mode & 0o022) !== 0) fail(code + "_writable_ancestor");
    if (
      value.is_symlink !== false ||
      value.runtime_can_write !== false ||
      value.runtime_can_rename !== false ||
      value.custody_can_write !== false ||
      value.custody_can_rename !== false
    ) {
      fail(code + "_authority_invalid");
    }
  }
}

function validateMount(
  raw: unknown,
  code: string,
): MountEvidenceV1 {
  const value = directObject(raw, code + "_object_invalid");
  exactKeys(
    value,
    [
      "mount_id",
      "device_major_minor",
      "mount_source",
      "rollback_domain_sha256",
      "fs_type",
      "options",
      "read_only",
    ],
    code + "_keys_invalid",
  );
  const mountId = String(value.mount_id ?? "");
  const device = String(value.device_major_minor ?? "");
  const sourceRaw = String(value.mount_source ?? "");
  const source = sourceRaw.trim();
  const rollbackDomainRaw = String(
    value.rollback_domain_sha256 ?? "",
  );
  const rollbackDomainSha256 = rollbackDomainRaw.trim();
  const fsType = String(value.fs_type ?? "");
  if (!MOUNT_ID.test(mountId)) fail(code + "_mount_id_invalid");
  if (!DEVICE.test(device)) fail(code + "_device_invalid");
  if (
    sourceRaw !== source ||
    !source ||
    source.length > 256 ||
    source.includes("\0")
  ) {
    fail(code + "_source_invalid");
  }
  if (
    rollbackDomainRaw !== rollbackDomainSha256 ||
    !SHA256_ID.test(rollbackDomainSha256)
  ) {
    fail(code + "_rollback_domain_invalid");
  }
  if (fsType !== "ext4" && fsType !== "xfs") {
    fail(code + "_filesystem_invalid");
  }
  if (value.read_only !== false) fail(code + "_must_be_read_write");
  if (!Array.isArray(value.options)) fail(code + "_options_invalid");
  const options = value.options.map((item) => String(item));
  if (
    options.some((item) => !item || item.includes(",") || item.includes("\0")) ||
    [...new Set(options)].length !== options.length ||
    options.join("\n") !== [...options].sort().join("\n")
  ) {
    fail(code + "_options_noncanonical");
  }
  for (const required of REQUIRED_MOUNT_OPTIONS) {
    if (!options.includes(required)) fail(code + "_required_option_missing");
  }
  for (const forbidden of [
    "bind",
    "rbind",
    "remount",
    "dev",
    "exec",
    "suid",
    "ro",
  ]) {
    if (options.includes(forbidden)) fail(code + "_forbidden_option");
  }
  return Object.freeze({
    mount_id: mountId,
    device_major_minor: device,
    mount_source: source,
    rollback_domain_sha256: rollbackDomainSha256,
    fs_type: fsType,
    options,
    read_only: false,
  }) as MountEvidenceV1;
}

function validateRoot(
  raw: unknown,
  host: EvidenceV1["host"],
  code: string,
): RootEvidenceV1 {
  const value = directObject(raw, code + "_object_invalid");
  exactKeys(
    value,
    [
      "path",
      "uid",
      "gid",
      "mode",
      "is_symlink",
      "runtime_can_write_contents",
      "runtime_can_rename_path",
      "custody_can_write_contents",
      "custody_can_rename_path",
      "ancestors",
      "mount",
    ],
    code + "_keys_invalid",
  );
  const rootPath = absolutePath(value.path, code + "_path_invalid");
  if (
    safeInteger(value.uid, code + "_uid_invalid") !== host.custody_uid ||
    safeInteger(value.gid, code + "_gid_invalid") !== host.custody_gid ||
    modeV1(value.mode, code + "_mode_invalid") !== 0o700 ||
    value.is_symlink !== false ||
    value.runtime_can_write_contents !== false ||
    value.runtime_can_rename_path !== false ||
    value.custody_can_write_contents !== true ||
    value.custody_can_rename_path !== false
  ) {
    fail(code + "_authority_invalid");
  }
  validateAncestorChain(value.ancestors, rootPath, code + "_ancestors");
  return Object.freeze({
    path: rootPath,
    uid: host.custody_uid,
    gid: host.custody_gid,
    mode: 0o700,
    is_symlink: false,
    runtime_can_write_contents: false,
    runtime_can_rename_path: false,
    custody_can_write_contents: true,
    custody_can_rename_path: false,
    ancestors: value.ancestors as AncestorEvidenceV1[],
    mount: validateMount(value.mount, code + "_mount"),
  });
}

function validateStateFile(
  raw: unknown,
  root: RootEvidenceV1,
  expectedName: string,
  host: EvidenceV1["host"],
  expectedBytes: Buffer,
  code: string,
): StateFileEvidenceV1 {
  const value = directObject(raw, code + "_object_invalid");
  exactKeys(
    value,
    [
      "path",
      "uid",
      "gid",
      "mode",
      "is_regular_file",
      "is_symlink",
      "nlink",
      "sha256",
      "bytes",
    ],
    code + "_keys_invalid",
  );
  const expectedPath = path.posix.join(root.path, expectedName);
  const filePath = absolutePath(value.path, code + "_path_invalid");
  if (filePath !== expectedPath) fail(code + "_path_binding_invalid");
  if (
    safeInteger(value.uid, code + "_uid_invalid") !== host.custody_uid ||
    safeInteger(value.gid, code + "_gid_invalid") !== host.custody_gid ||
    modeV1(value.mode, code + "_mode_invalid") !== 0o600 ||
    value.is_regular_file !== true ||
    value.is_symlink !== false ||
    safeInteger(value.nlink, code + "_nlink_invalid") !== 1
  ) {
    fail(code + "_custody_invalid");
  }
  const digest = String(value.sha256 ?? "");
  const size = safeInteger(value.bytes, code + "_bytes_invalid");
  if (
    !SHA256_ID.test(digest) ||
    digest !== sha256Id(expectedBytes) ||
    size !== expectedBytes.length
  ) {
    fail(code + "_content_binding_invalid");
  }
  return Object.freeze({
    path: filePath,
    uid: host.custody_uid,
    gid: host.custody_gid,
    mode: 0o600,
    is_regular_file: true,
    is_symlink: false,
    nlink: 1,
    sha256: digest,
    bytes: size,
  });
}

function validateEvidence(
  raw: unknown,
  expectedSourceHead: string,
  expectedHostId: string,
  expectedEvidenceGeneration: number,
  expectedServiceUnitSha256: string,
  expectedLedgerRollbackDomainSha256: string,
  expectedCustodyRollbackDomainSha256: string,
  nowMs: number,
  ledgerBytes: Buffer,
  highWaterBytes: Buffer,
): EvidenceV1 {
  const value = directObject(raw, "allocation_custody_evidence_object_invalid");
  exactKeys(
    value,
    [
      "schema",
      "marker",
      "version",
      "evidence_generation",
      "observed_at_ms",
      "expires_at_ms",
      "source",
      "host",
      "ledger",
      "custody",
      "ipc",
      "service_hardening",
      "recovery_probes",
      "negative_probes",
      "state",
    ],
    "allocation_custody_evidence_keys_invalid",
  );
  if (
    value.schema !==
      VOID_BUY_VOID_ALLOCATION_HIGH_WATER_CUSTODY_EVIDENCE_SCHEMA_V1 ||
    value.marker !==
      VOID_BUY_VOID_ALLOCATION_HIGH_WATER_CUSTODY_QUALIFICATION_V1 ||
    value.version !== 1
  ) {
    fail("allocation_custody_evidence_identity_invalid");
  }
  const generation = safeInteger(
    value.evidence_generation,
    "allocation_custody_evidence_generation_invalid",
  );
  if (
    generation < 1 ||
    generation !== expectedEvidenceGeneration
  ) {
    fail("allocation_custody_evidence_generation_mismatch");
  }
  const observedAt = safeInteger(
    value.observed_at_ms,
    "allocation_custody_evidence_observed_at_invalid",
  );
  const expiresAt = safeInteger(
    value.expires_at_ms,
    "allocation_custody_evidence_expires_at_invalid",
  );
  if (
    observedAt > nowMs ||
    nowMs >= expiresAt ||
    expiresAt <= observedAt ||
    expiresAt - observedAt > MAX_EVIDENCE_TTL_MS ||
    nowMs - observedAt > MAX_EVIDENCE_AGE_MS
  ) {
    fail("allocation_custody_evidence_stale");
  }

  const source = directObject(
    value.source,
    "allocation_custody_source_object_invalid",
  );
  exactKeys(
    source,
    ["repository", "source_head_sha", "writer_marker"],
    "allocation_custody_source_keys_invalid",
  );
  if (
    source.repository !== REPOSITORY ||
    !GIT_SHA.test(String(source.source_head_sha ?? "")) ||
    source.source_head_sha !== expectedSourceHead ||
    source.writer_marker !==
      VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_WRITER_V1
  ) {
    fail("allocation_custody_source_binding_invalid");
  }

  const hostRaw = directObject(
    value.host,
    "allocation_custody_host_object_invalid",
  );
  exactKeys(
    hostRaw,
    [
      "host_id_sha256",
      "runtime_uid",
      "runtime_gid",
      "custody_uid",
      "custody_gid",
    ],
    "allocation_custody_host_keys_invalid",
  );
  const host: EvidenceV1["host"] = {
    host_id_sha256: String(hostRaw.host_id_sha256 ?? ""),
    runtime_uid: serviceId(
      hostRaw.runtime_uid,
      "allocation_custody_runtime_uid_invalid",
    ),
    runtime_gid: serviceId(
      hostRaw.runtime_gid,
      "allocation_custody_runtime_gid_invalid",
    ),
    custody_uid: serviceId(
      hostRaw.custody_uid,
      "allocation_custody_service_uid_invalid",
    ),
    custody_gid: serviceId(
      hostRaw.custody_gid,
      "allocation_custody_service_gid_invalid",
    ),
  };
  if (
    !SHA256_ID.test(host.host_id_sha256) ||
    host.host_id_sha256 !== expectedHostId ||
    host.runtime_uid === host.custody_uid
  ) {
    fail("allocation_custody_host_identity_invalid");
  }

  const ledger = validateRoot(value.ledger, host, "allocation_custody_ledger");
  const custody = validateRoot(
    value.custody,
    host,
    "allocation_custody_high_water",
  );
  if (
    ledger.path === custody.path ||
    ledger.mount.mount_id === custody.mount.mount_id ||
    ledger.mount.device_major_minor === custody.mount.device_major_minor ||
    ledger.mount.mount_source === custody.mount.mount_source
  ) {
    fail("allocation_custody_distinct_mount_identity_required");
  }
  if (
    ledger.mount.rollback_domain_sha256 !==
      expectedLedgerRollbackDomainSha256 ||
    custody.mount.rollback_domain_sha256 !==
      expectedCustodyRollbackDomainSha256 ||
    ledger.mount.rollback_domain_sha256 ===
      custody.mount.rollback_domain_sha256
  ) {
    fail("allocation_custody_independent_rollback_domain_required");
  }

  const ipc = directObject(value.ipc, "allocation_custody_ipc_object_invalid");
  exactKeys(
    ipc,
    [
      "socket_path",
      "parent_path",
      "owner_uid",
      "owner_gid",
      "mode",
      "address_family",
      "runtime_can_connect",
      "runtime_can_write_parent",
      "runtime_can_replace_socket",
      "custody_can_write_parent",
    ],
    "allocation_custody_ipc_keys_invalid",
  );
  const socketPath = absolutePath(
    ipc.socket_path,
    "allocation_custody_socket_path_invalid",
  );
  const parentPath = absolutePath(
    ipc.parent_path,
    "allocation_custody_socket_parent_invalid",
  );
  if (
    path.posix.dirname(socketPath) !== parentPath ||
    safeInteger(ipc.owner_uid, "allocation_custody_socket_uid_invalid") !==
      host.custody_uid ||
    safeInteger(ipc.owner_gid, "allocation_custody_socket_gid_invalid") !==
      host.runtime_gid ||
    modeV1(ipc.mode, "allocation_custody_socket_mode_invalid") !== 0o660 ||
    ipc.address_family !== "AF_UNIX" ||
    ipc.runtime_can_connect !== true ||
    ipc.runtime_can_write_parent !== false ||
    ipc.runtime_can_replace_socket !== false ||
    ipc.custody_can_write_parent !== true
  ) {
    fail("allocation_custody_ipc_authority_invalid");
  }

  const hardening = directObject(
    value.service_hardening,
    "allocation_custody_hardening_object_invalid",
  );
  const hardeningKeys = [
    "unit_name",
    "unit_sha256",
    "no_new_privileges",
    "private_tmp",
    "private_devices",
    "protect_system_strict",
    "protect_home",
    "protect_kernel_tunables",
    "protect_kernel_modules",
    "protect_control_groups",
    "lock_personality",
    "restrict_suid_sgid",
    "restrict_realtime",
    "capability_bounding_set_empty",
    "ambient_capabilities_empty",
    "af_unix_only",
    "read_write_paths",
  ] as const;
  exactKeys(hardening, hardeningKeys, "allocation_custody_hardening_keys_invalid");
  if (
    hardening.unit_name !== "void-allocation-custody-v1.service" ||
    hardening.unit_sha256 !== expectedServiceUnitSha256 ||
    !SHA256_ID.test(String(hardening.unit_sha256 ?? ""))
  ) {
    fail("allocation_custody_service_unit_binding_invalid");
  }
  for (const key of hardeningKeys.slice(2, -1)) {
    if (hardening[key] !== true) fail("allocation_custody_hardening_incomplete");
  }
  if (!Array.isArray(hardening.read_write_paths)) {
    fail("allocation_custody_hardening_paths_invalid");
  }
  const writePaths = hardening.read_write_paths.map((item) =>
    absolutePath(item, "allocation_custody_hardening_path_invalid"),
  );
  const expectedWritePaths = [ledger.path, custody.path].sort();
  if (
    writePaths.join("\n") !== [...writePaths].sort().join("\n") ||
    writePaths.join("\n") !== expectedWritePaths.join("\n")
  ) {
    fail("allocation_custody_hardening_paths_invalid");
  }

  const recoveryProbes = directObject(
    value.recovery_probes,
    "allocation_custody_recovery_probes_object_invalid",
  );
  const recoveryProbeKeys = [
    "clean_restart_bound",
    "intent_only_restart_recovers",
    "ledger_committed_restart_recovers",
    "high_water_committed_restart_recovers",
    "complete_restart_recovers",
    "forward_only_recovery",
    "no_duplicate_allocation_obligation",
  ] as const;
  exactKeys(
    recoveryProbes,
    recoveryProbeKeys,
    "allocation_custody_recovery_probes_keys_invalid",
  );
  for (const key of recoveryProbeKeys) {
    if (recoveryProbes[key] !== true) {
      fail("allocation_custody_recovery_probe_failed");
    }
  }

  const probes = directObject(
    value.negative_probes,
    "allocation_custody_negative_probes_object_invalid",
  );
  const probeKeys = [
    "runtime_rename_ledger_root_denied",
    "runtime_rename_custody_root_denied",
    "runtime_recreate_ledger_parent_denied",
    "runtime_recreate_custody_parent_denied",
    "symlink_substitution_denied",
    "bind_mount_substitution_denied",
    "remount_substitution_denied",
    "custody_medium_missing_holds",
    "stale_high_water_rejected",
    "alternate_same_generation_high_water_rejected",
    "both_root_rollback_rejected",
    "reboot_mount_identity_stable",
  ] as const;
  exactKeys(probes, probeKeys, "allocation_custody_negative_probes_keys_invalid");
  for (const key of probeKeys) {
    if (probes[key] !== true) fail("allocation_custody_negative_probe_failed");
  }

  const state = directObject(
    value.state,
    "allocation_custody_state_object_invalid",
  );
  exactKeys(
    state,
    ["ledger_file", "high_water_file"],
    "allocation_custody_state_keys_invalid",
  );
  validateStateFile(
    state.ledger_file,
    ledger,
    LEDGER_NAME,
    host,
    ledgerBytes,
    "allocation_custody_state_ledger_file",
  );
  validateStateFile(
    state.high_water_file,
    custody,
    HIGH_WATER_NAME,
    host,
    highWaterBytes,
    "allocation_custody_state_high_water_file",
  );

  return value as unknown as EvidenceV1;
}

export function classifyBuyVoidAllocationHighWaterCustodyQualificationV1(
  input: {
    now_ms: unknown;
    expected_source_head_sha: unknown;
    expected_host_id_sha256: unknown;
    expected_evidence_generation: unknown;
    expected_service_unit_sha256: unknown;
    expected_ledger_rollback_domain_sha256: unknown;
    expected_custody_rollback_domain_sha256: unknown;
    ledger_jsonl: string | Buffer;
    high_water_json: string | Buffer;
    evidence: unknown;
  },
): BuyVoidAllocationHighWaterCustodyQualificationDecisionV1 {
  try {
    const nowMs = safeInteger(
      input?.now_ms,
      "allocation_custody_now_invalid",
    );
    if (nowMs <= 0) fail("allocation_custody_now_invalid");
    const expectedSourceHead = String(
      input?.expected_source_head_sha ?? "",
    ).trim();
    const expectedHostId = String(
      input?.expected_host_id_sha256 ?? "",
    ).trim();
    const expectedEvidenceGeneration = safeInteger(
      input?.expected_evidence_generation,
      "allocation_custody_expected_evidence_generation_invalid",
    );
    const expectedServiceUnitSha256 = String(
      input?.expected_service_unit_sha256 ?? "",
    ).trim();
    const expectedLedgerRollbackDomainSha256 = String(
      input?.expected_ledger_rollback_domain_sha256 ?? "",
    ).trim();
    const expectedCustodyRollbackDomainSha256 = String(
      input?.expected_custody_rollback_domain_sha256 ?? "",
    ).trim();
    if (!GIT_SHA.test(expectedSourceHead)) {
      fail("allocation_custody_expected_source_head_invalid");
    }
    if (!SHA256_ID.test(expectedHostId)) {
      fail("allocation_custody_expected_host_id_invalid");
    }
    if (expectedEvidenceGeneration < 1) {
      fail("allocation_custody_expected_evidence_generation_invalid");
    }
    if (!SHA256_ID.test(expectedServiceUnitSha256)) {
      fail("allocation_custody_expected_service_unit_sha256_invalid");
    }
    if (
      !SHA256_ID.test(expectedLedgerRollbackDomainSha256) ||
      !SHA256_ID.test(expectedCustodyRollbackDomainSha256) ||
      expectedLedgerRollbackDomainSha256 ===
        expectedCustodyRollbackDomainSha256
    ) {
      fail("allocation_custody_expected_rollback_domain_invalid");
    }

    const ledgerBytes = Buffer.isBuffer(input?.ledger_jsonl)
      ? Buffer.from(input.ledger_jsonl)
      : Buffer.from(String(input?.ledger_jsonl ?? ""), "utf8");
    const highWaterBytes = Buffer.isBuffer(input?.high_water_json)
      ? Buffer.from(input.high_water_json)
      : Buffer.from(String(input?.high_water_json ?? ""), "utf8");
    if (ledgerBytes.length > MAX_LEDGER_BYTES) {
      fail("allocation_custody_ledger_too_large");
    }
    if (
      highWaterBytes.length < 2 ||
      highWaterBytes.length > MAX_HIGH_WATER_BYTES
    ) {
      fail("allocation_custody_high_water_size_invalid");
    }

    const binding =
      classifyBuyVoidAllocationReservationHighWaterBindingV1({
        ledger_jsonl: ledgerBytes,
        high_water_json: highWaterBytes,
      });
    if (binding.ok === false) {
      fail(
        "allocation_custody_current_state_" + binding.reason,
      );
    }

    const evidence = validateEvidence(
      input?.evidence,
      expectedSourceHead,
      expectedHostId,
      expectedEvidenceGeneration,
      expectedServiceUnitSha256,
      expectedLedgerRollbackDomainSha256,
      expectedCustodyRollbackDomainSha256,
      nowMs,
      ledgerBytes,
      highWaterBytes,
    );

    return Object.freeze({
      ok: true,
      status: "qualified_source_evidence",
      marker:
        VOID_BUY_VOID_ALLOCATION_HIGH_WATER_CUSTODY_QUALIFICATION_V1,
      version: 1,
      evidence_sha256: sha256Id(canonical(evidence)),
      source_head_sha: evidence.source.source_head_sha,
      host_id_sha256: evidence.host.host_id_sha256,
      ledger_sha256: evidence.state.ledger_file.sha256,
      high_water_sha256: evidence.state.high_water_file.sha256,
      distinct_mount_identity_evidence: true,
      independent_rollback_domain_evidence: true,
      root_path_stability_evidence: true,
      runtime_write_isolation_evidence: true,
      service_hardening_evidence: true,
      evidence_fresh: true,
      live_host_qualification: false,
      production_gate_ready: false,
      funds_movement: false,
      authority:
        VOID_BUY_VOID_ALLOCATION_HIGH_WATER_CUSTODY_QUALIFICATION_AUTHORITY_V1,
    });
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "allocation_custody_qualification_failed",
    );
  }
}
