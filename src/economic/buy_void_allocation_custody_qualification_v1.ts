import crypto from "node:crypto";
import path from "node:path";

import {
  VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_WRITER_AUTHORITY_V1,
  VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_WRITER_V1,
} from "./buy_void_allocation_reservation_publication_writer_v1.js";
import {
  VOID_BUY_VOID_ALLOCATION_RESERVATION_HIGH_WATER_SCHEMA_V1,
  VOID_BUY_VOID_ALLOCATION_RESERVATION_HIGH_WATER_V1,
  classifyBuyVoidAllocationReservationHighWaterBindingV1,
  planBuyVoidAllocationReservationHighWaterAdvanceV1,
  type BuyVoidAllocationReservationHighWaterV1,
} from "./buy_void_allocation_reservation_high_water_v1.js";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_QUALIFICATION_V1 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_QUALIFICATION_V1";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_RECEIPT_V1 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_RECEIPT_V1";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_REVIEWED_WRITER_HEAD_V1 =
  "62ad83462c35b404e1a4cea1e28f68664977df45";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_REVIEWED_WRITER_BLOB_SHA1_V1 =
  "2db8493d1ee84878ef5fa2b0f655070622335d0d";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_REVIEWED_WRITER_SOURCE_SHA256_V1 =
  "sha256:620ccfbdc26268b0f09e0282776ef88a9848a8f4307f71b5f7f7894558ae1cfb";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_QUALIFICATION_AUTHORITY_V1 =
  Object.freeze({
    source_only_contract: true,
    io_performed: false,
    host_evidence_input_only: true,
    writer_head_provenance_required: true,
    exact_reviewed_writer_blob_required: true,
    exact_reviewed_writer_source_sha256_required: true,
    canonical_current_high_water_binding_reused: true,
    canonical_single_append_planner_reused: true,
    exact_prior_ledger_prefix_required: true,
    single_append_continuity_only: true,
    mount_instance_fingerprint_bound: true,
    storage_failure_domain_fingerprint_bound: true,
    bind_alias_independence_forbidden: true,
    root_path_stability_evidence_required: true,
    dedicated_custody_identity_required: true,
    private_unix_socket_policy_required: true,
    hardened_service_policy_required: true,
    no_fallback_storage_required: true,
    prior_receipt_external_trust_proven: false,
    live_host_qualification_performed: false,
    host_mutation: false,
    service_install: false,
    service_start: false,
    mount_mutation: false,
    permission_mutation: false,
    runtime_integration: false,
    payment_acceptance: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    inventory_mutation: false,
    market_activation: false,
    public_presale_activation: false,
    independent_custody_proven: false,
    production_gate_ready: false,
    funds_movement: false,
  });

const RECEIPT_SCHEMA =
  "void_buy_void_allocation_custody_receipt_v1";
const QUALIFICATION_DOMAIN =
  "void-buy-allocation-custody-qualification-v1";
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const SHA1 = /^[0-9a-f]{40}$/u;
const SAFE_ID = /^[A-Za-z0-9._:@/-]{1,200}$/u;
const DECIMAL = /^(0|[1-9][0-9]*)$/u;
const MAJOR_MINOR = /^(0|[1-9][0-9]*):(0|[1-9][0-9]*)$/u;
const MODE = /^0[0-7]{3}$/u;
const MAX_LEDGER_BYTES = 64 * 1024 * 1024;
const MAX_ANCESTORS = 64;
const MAX_MOUNT_OPTIONS = 64;
const MAX_IPC_BYTES = 64 * 1024;
const MAX_IPC_TIMEOUT_MS = 10_000;
const MAX_EPOCH = (1n << 64n) - 1n;

const INPUT_KEYS = Object.freeze([
  "writer_source_head",
  "writer_source_blob_sha1",
  "writer_source_sha256",
  "host_evidence",
  "current_ledger_jsonl",
  "current_high_water_json",
  "prior_receipt",
]);
const HOST_KEYS = Object.freeze([
  "host_id",
  "runtime_uid",
  "runtime_gid",
  "custody_uid",
  "custody_gid",
  "ledger_root",
  "custody_root",
  "socket",
  "service_policy",
  "fallback_storage_enabled",
  "custody_medium_absence_holds",
]);
const ROOT_KEYS = Object.freeze([
  "resolved_path",
  "dev",
  "ino",
  "uid",
  "gid",
  "mode",
  "symlink",
  "runtime_write",
  "runtime_rename",
  "runtime_recreate",
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
  "runtime_write",
  "runtime_rename",
  "runtime_recreate",
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
]);
const SOCKET_KEYS = Object.freeze([
  "resolved_path",
  "parent_path",
  "parent_uid",
  "parent_gid",
  "parent_mode",
  "parent_symlink",
  "owner_uid",
  "group_gid",
  "mode",
  "direct_socket",
  "symlink_ancestors",
  "server_controlled_path",
  "runtime_connect_allowed",
  "runtime_replace_denied",
  "runtime_member_of_connect_group",
  "custody_member_of_connect_group",
  "exact_request_schema",
  "exact_response_schema",
  "max_request_bytes",
  "max_response_bytes",
  "response_timeout_ms",
  "arbitrary_path_write",
  "arbitrary_bytes_write",
  "caller_selected_generation",
  "automatic_retry",
]);
const SERVICE_KEYS = Object.freeze([
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
  "restrict_address_families",
  "read_write_paths",
  "runtime_can_control_service",
]);
const RECEIPT_KEYS = Object.freeze([
  "schema",
  "marker",
  "version",
  "custody_epoch",
  "previous_receipt_sha256",
  "writer_source_head",
  "writer_source_blob_sha1",
  "writer_source_sha256",
  "host_id",
  "qualification_policy_fingerprint_sha256",
  "ledger_mount_instance_fingerprint_sha256",
  "ledger_storage_failure_domain_fingerprint_sha256",
  "custody_mount_instance_fingerprint_sha256",
  "custody_storage_failure_domain_fingerprint_sha256",
  "ledger_bytes",
  "record_count",
  "tip_hash",
  "ledger_sha256",
  "high_water_sha256",
  "pool_void_total",
  "reserved_void_total",
  "remaining_void",
  "receipt_sha256",
]);

export type BuyVoidAllocationCustodyReceiptV1 = {
  schema: typeof RECEIPT_SCHEMA;
  marker: typeof VOID_BUY_VOID_ALLOCATION_CUSTODY_RECEIPT_V1;
  version: 1;
  custody_epoch: string;
  previous_receipt_sha256: string | null;
  writer_source_head: string;
  writer_source_blob_sha1: string;
  writer_source_sha256: string;
  host_id: string;
  qualification_policy_fingerprint_sha256: string;
  ledger_mount_instance_fingerprint_sha256: string;
  ledger_storage_failure_domain_fingerprint_sha256: string;
  custody_mount_instance_fingerprint_sha256: string;
  custody_storage_failure_domain_fingerprint_sha256: string;
  ledger_bytes: number;
  record_count: number;
  tip_hash: string;
  ledger_sha256: string;
  high_water_sha256: string;
  pool_void_total: string;
  reserved_void_total: string;
  remaining_void: string;
  receipt_sha256: string;
};

export type BuyVoidAllocationCustodyQualificationDecisionV1 =
  | {
      ok: true;
      status: "source_qualified" | "idempotent";
      marker: typeof VOID_BUY_VOID_ALLOCATION_CUSTODY_QUALIFICATION_V1;
      version: 1;
      qualification_id_sha256: string;
      writer_source_head: string;
      writer_source_blob_sha1: string;
      writer_source_sha256: string;
      host_id: string;
      qualification_policy_fingerprint_sha256: string;
      ledger_mount_instance_fingerprint_sha256: string;
      ledger_storage_failure_domain_fingerprint_sha256: string;
      custody_mount_instance_fingerprint_sha256: string;
      custody_storage_failure_domain_fingerprint_sha256: string;
      root_path_stability_evidence_qualified: true;
      separate_storage_domain_evidence_qualified: true;
      monotonic_continuity_against_supplied_prior: true;
      prior_receipt_external_trust_proven: false;
      independent_custody_proven: false;
      production_gate_ready: false;
      receipt: Readonly<BuyVoidAllocationCustodyReceiptV1>;
      operation_performed: false;
      authority:
        typeof VOID_BUY_VOID_ALLOCATION_CUSTODY_QUALIFICATION_AUTHORITY_V1;
    }
  | {
      ok: false;
      status: "held";
      marker: typeof VOID_BUY_VOID_ALLOCATION_CUSTODY_QUALIFICATION_V1;
      version: 1;
      reason: string;
      qualification_id_sha256: null;
      root_path_stability_evidence_qualified: false;
      separate_storage_domain_evidence_qualified: false;
      monotonic_continuity_against_supplied_prior: false;
      prior_receipt_external_trust_proven: false;
      independent_custody_proven: false;
      production_gate_ready: false;
      operation_performed: false;
      authority:
        typeof VOID_BUY_VOID_ALLOCATION_CUSTODY_QUALIFICATION_AUTHORITY_V1;
    };

type MountV1 = {
  medium_present: true;
  mount_target: string;
  mount_source: string;
  mount_uuid: string;
  major_minor: string;
  filesystem_type: string;
  statfs_type: string;
  mount_options: readonly string[];
  mount_instance_fingerprint_sha256: string;
  storage_failure_domain_fingerprint_sha256: string;
};

type RootV1 = {
  resolved_path: string;
  dev: string;
  ino: string;
  uid: number;
  gid: number;
  mode: string;
  symlink: false;
  runtime_write: false;
  runtime_rename: false;
  runtime_recreate: false;
  ancestors: readonly Record<string, unknown>[];
  mount: MountV1;
};

type HostV1 = {
  host_id: string;
  runtime_uid: number;
  runtime_gid: number;
  custody_uid: number;
  custody_gid: number;
  ledger_root: RootV1;
  custody_root: RootV1;
  socket: Readonly<Record<string, unknown>>;
  service_policy: Readonly<Record<string, unknown>>;
  fallback_storage_enabled: false;
  custody_medium_absence_holds: true;
};

function fail(code: string): never {
  throw new Error(code);
}

function held(reason: string): BuyVoidAllocationCustodyQualificationDecisionV1 {
  return Object.freeze({
    ok: false,
    status: "held",
    marker: VOID_BUY_VOID_ALLOCATION_CUSTODY_QUALIFICATION_V1,
    version: 1,
    reason,
    qualification_id_sha256: null,
    root_path_stability_evidence_qualified: false,
    separate_storage_domain_evidence_qualified: false,
    monotonic_continuity_against_supplied_prior: false,
    prior_receipt_external_trust_proven: false,
    independent_custody_proven: false,
    production_gate_ready: false,
    operation_performed: false,
    authority:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_QUALIFICATION_AUTHORITY_V1,
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
  fail("custody_noncanonical_value");
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
  code: string,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(code);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail(code);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const ownKeys = Reflect.ownKeys(descriptors);
  if (ownKeys.some((key) => typeof key !== "string")) {
    fail(code);
  }
  const actual = (ownKeys as string[]).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(code);
  }
  const snapshot: Record<string, unknown> =
    Object.create(null);
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

function safeText(
  value: unknown,
  regex: RegExp,
  code: string,
): string {
  const text = String(value ?? "").trim();
  if (!regex.test(text)) fail(code);
  return text;
}

function safeInt(
  value: unknown,
  minimum: number,
  maximum: number,
  code: string,
): number {
  const parsed = Number(value);
  if (
    !Number.isSafeInteger(parsed) ||
    parsed < minimum ||
    parsed > maximum
  ) {
    fail(code);
  }
  return parsed;
}

function decimal(value: unknown, code: string): string {
  const text = String(value ?? "").trim();
  if (!DECIMAL.test(text) || text.length > 30) fail(code);
  return text;
}

function sha(value: unknown, code: string): string {
  return safeText(value, SHA256_ID, code);
}

function normalizedAbsolutePath(value: unknown, code: string): string {
  const raw = String(value ?? "").trim();
  if (!raw || !path.isAbsolute(raw) || raw.includes("\0")) fail(code);
  const normalized = path.normalize(raw);
  if (normalized === path.parse(normalized).root) fail(code);
  return normalized;
}

function modeBits(value: unknown, code: string): {
  text: string;
  bits: number;
} {
  const text = String(value ?? "").trim();
  if (!MODE.test(text)) fail(code);
  return { text, bits: Number.parseInt(text, 8) };
}

function frozenStringArray(
  value: unknown,
  maximum: number,
  code: string,
): readonly string[] {
  if (!Array.isArray(value) || value.length > maximum) fail(code);
  const out = value.map((entry) =>
    safeText(entry, SAFE_ID, code),
  );
  const sorted = [...out].sort();
  if (
    new Set(sorted).size !== sorted.length ||
    out.some((entry, index) => entry !== sorted[index])
  ) {
    fail(code);
  }
  return Object.freeze(out);
}

function expectedAncestorPaths(resolved: string): string[] {
  const root = path.parse(resolved).root;
  const values: string[] = [];
  let current = path.dirname(resolved);
  for (;;) {
    values.push(current);
    if (current === root) break;
    const parent = path.dirname(current);
    if (parent === current || values.length >= MAX_ANCESTORS) {
      fail("custody_ancestor_chain_invalid");
    }
    current = parent;
  }
  return values.reverse();
}

function normalizeAncestors(
  value: unknown,
  resolved: string,
  runtimeUid: number,
): readonly Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    fail("custody_ancestor_authority_invalid");
  }
  const expectedPaths = expectedAncestorPaths(resolved);
  if (
    value.length !== expectedPaths.length ||
    value.length > MAX_ANCESTORS
  ) {
    fail("custody_ancestor_authority_invalid");
  }

  const out = value.map((raw, index) => {
    const entry = exactObject(
      raw,
      ANCESTOR_KEYS,
      "custody_ancestor_authority_invalid",
    );
    const ancestorPath = normalizedAbsolutePathAllowRoot(
      entry.path,
      "custody_ancestor_authority_invalid",
    );
    const mode = modeBits(
      entry.mode,
      "custody_ancestor_authority_invalid",
    );
    const uid = safeInt(
      entry.uid,
      0,
      0x7fff_ffff,
      "custody_ancestor_authority_invalid",
    );
    if (
      ancestorPath !== expectedPaths[index] ||
      uid !== 0 ||
      entry.symlink !== false ||
      entry.runtime_write !== false ||
      entry.runtime_rename !== false ||
      entry.runtime_recreate !== false ||
      (mode.bits & 0o022) !== 0
    ) {
      fail("custody_ancestor_authority_invalid");
    }
    const gid = safeInt(
      entry.gid,
      0,
      0x7fff_ffff,
      "custody_ancestor_authority_invalid",
    );
    if (uid === runtimeUid) {
      fail("custody_ancestor_authority_invalid");
    }
    return Object.freeze({
      path: ancestorPath,
      dev: decimal(
        entry.dev,
        "custody_ancestor_authority_invalid",
      ),
      ino: decimal(
        entry.ino,
        "custody_ancestor_authority_invalid",
      ),
      uid,
      gid,
      mode: mode.text,
      symlink: false,
      runtime_write: false,
      runtime_rename: false,
      runtime_recreate: false,
    });
  });
  return Object.freeze(out);
}

function normalizedAbsolutePathAllowRoot(
  value: unknown,
  code: string,
): string {
  const raw = String(value ?? "").trim();
  if (!raw || !path.isAbsolute(raw) || raw.includes("\0")) fail(code);
  return path.normalize(raw);
}

function normalizeMount(
  value: unknown,
  rootPath: string,
  code: string,
): MountV1 {
  const mount = exactObject(value, MOUNT_KEYS, code);
  if (mount.medium_present !== true) fail("custody_medium_missing");
  const target = normalizedAbsolutePathAllowRoot(
    mount.mount_target,
    code,
  );
  const relative = path.relative(target, rootPath);
  if (
    relative === ".." ||
    relative.startsWith(".." + path.sep) ||
    path.isAbsolute(relative)
  ) {
    fail(code);
  }
  const source = safeText(mount.mount_source, SAFE_ID, code);
  const uuid = safeText(mount.mount_uuid, SAFE_ID, code);
  const majorMinor = safeText(mount.major_minor, MAJOR_MINOR, code);
  const filesystemType = safeText(
    mount.filesystem_type,
    /^[A-Za-z0-9._-]{1,64}$/u,
    code,
  );
  const statfsType = safeText(
    mount.statfs_type,
    /^[A-Za-z0-9x._:-]{1,80}$/u,
    code,
  );
  const options = frozenStringArray(
    mount.mount_options,
    MAX_MOUNT_OPTIONS,
    code,
  );
  const instance = Object.freeze({
    mount_target: target,
    mount_source: source,
    mount_uuid: uuid,
    major_minor: majorMinor,
    filesystem_type: filesystemType,
    statfs_type: statfsType,
    mount_options: options,
  });
  const failureDomain = Object.freeze({
    mount_source: source,
    mount_uuid: uuid,
    major_minor: majorMinor,
    filesystem_type: filesystemType,
    statfs_type: statfsType,
  });
  return Object.freeze({
    medium_present: true,
    ...instance,
    mount_instance_fingerprint_sha256:
      sha256Id(canonicalJson(instance)),
    storage_failure_domain_fingerprint_sha256:
      sha256Id(canonicalJson(failureDomain)),
  });
}

function normalizeRoot(
  value: unknown,
  custodyUid: number,
  custodyGid: number,
  runtimeUid: number,
  code: string,
): RootV1 {
  const root = exactObject(value, ROOT_KEYS, code);
  const resolved = normalizedAbsolutePath(root.resolved_path, code);
  const mode = modeBits(root.mode, code);
  const uid = safeInt(root.uid, 0, 0x7fff_ffff, code);
  const gid = safeInt(root.gid, 0, 0x7fff_ffff, code);
  if (
    uid !== custodyUid ||
    gid !== custodyGid ||
    mode.text !== "0700" ||
    root.symlink !== false ||
    root.runtime_write !== false ||
    root.runtime_rename !== false ||
    root.runtime_recreate !== false
  ) {
    fail("custody_runtime_can_replace_root");
  }
  const ancestors = normalizeAncestors(
    root.ancestors,
    resolved,
    runtimeUid,
  );
  const mount = normalizeMount(root.mount, resolved, code);
  return Object.freeze({
    resolved_path: resolved,
    dev: decimal(root.dev, code),
    ino: decimal(root.ino, code),
    uid,
    gid,
    mode: mode.text,
    symlink: false,
    runtime_write: false,
    runtime_rename: false,
    runtime_recreate: false,
    ancestors,
    mount,
  });
}

function pathsOverlap(left: string, right: string): boolean {
  const relativeLeft = path.relative(left, right);
  const relativeRight = path.relative(right, left);
  return (
    relativeLeft === "" ||
    (
      relativeLeft !== ".." &&
      !relativeLeft.startsWith(".." + path.sep) &&
      !path.isAbsolute(relativeLeft)
    ) ||
    (
      relativeRight !== ".." &&
      !relativeRight.startsWith(".." + path.sep) &&
      !path.isAbsolute(relativeRight)
    )
  );
}

function normalizeSocket(
  value: unknown,
  runtimeUid: number,
  custodyUid: number,
  runtimeGid: number,
  custodyGid: number,
): Readonly<Record<string, unknown>> {
  const socket = exactObject(
    value,
    SOCKET_KEYS,
    "custody_socket_authority_invalid",
  );
  const resolved = normalizedAbsolutePath(
    socket.resolved_path,
    "custody_socket_authority_invalid",
  );
  const parent = normalizedAbsolutePathAllowRoot(
    socket.parent_path,
    "custody_socket_authority_invalid",
  );
  const parentMode = modeBits(
    socket.parent_mode,
    "custody_socket_authority_invalid",
  );
  const parentUid = safeInt(
    socket.parent_uid,
    0,
    0x7fff_ffff,
    "custody_socket_authority_invalid",
  );
  const parentGid = safeInt(
    socket.parent_gid,
    0,
    0x7fff_ffff,
    "custody_socket_authority_invalid",
  );
  const ownerUid = safeInt(
    socket.owner_uid,
    0,
    0x7fff_ffff,
    "custody_socket_authority_invalid",
  );
  const groupGid = safeInt(
    socket.group_gid,
    0,
    0x7fff_ffff,
    "custody_socket_authority_invalid",
  );
  if (
    path.dirname(resolved) !== parent ||
    parentUid !== custodyUid ||
    parentGid !== groupGid ||
    parentMode.text !== "0750" ||
    socket.parent_symlink !== false ||
    ownerUid !== custodyUid ||
    groupGid === runtimeGid ||
    groupGid === custodyGid ||
    String(socket.mode) !== "0660" ||
    socket.direct_socket !== true ||
    socket.symlink_ancestors !== false ||
    socket.server_controlled_path !== true ||
    socket.runtime_connect_allowed !== true ||
    socket.runtime_replace_denied !== true ||
    socket.runtime_member_of_connect_group !== true ||
    socket.custody_member_of_connect_group !== true ||
    socket.exact_request_schema !== true ||
    socket.exact_response_schema !== true ||
    socket.arbitrary_path_write !== false ||
    socket.arbitrary_bytes_write !== false ||
    socket.caller_selected_generation !== false ||
    socket.automatic_retry !== false ||
    runtimeUid === custodyUid
  ) {
    fail("custody_socket_authority_invalid");
  }
  const maxRequest = safeInt(
    socket.max_request_bytes,
    1,
    MAX_IPC_BYTES,
    "custody_socket_authority_invalid",
  );
  const maxResponse = safeInt(
    socket.max_response_bytes,
    1,
    MAX_IPC_BYTES,
    "custody_socket_authority_invalid",
  );
  const timeout = safeInt(
    socket.response_timeout_ms,
    1,
    MAX_IPC_TIMEOUT_MS,
    "custody_socket_authority_invalid",
  );
  return Object.freeze({
    resolved_path: resolved,
    parent_path: parent,
    parent_uid: parentUid,
    parent_gid: parentGid,
    parent_mode: parentMode.text,
    parent_symlink: false,
    owner_uid: ownerUid,
    group_gid: groupGid,
    mode: "0660",
    direct_socket: true,
    symlink_ancestors: false,
    server_controlled_path: true,
    runtime_connect_allowed: true,
    runtime_replace_denied: true,
    runtime_member_of_connect_group: true,
    custody_member_of_connect_group: true,
    exact_request_schema: true,
    exact_response_schema: true,
    max_request_bytes: maxRequest,
    max_response_bytes: maxResponse,
    response_timeout_ms: timeout,
    arbitrary_path_write: false,
    arbitrary_bytes_write: false,
    caller_selected_generation: false,
    automatic_retry: false,
  });
}

function normalizeServicePolicy(
  value: unknown,
  runtimeUid: number,
  custodyUid: number,
  custodyGid: number,
  ledgerRoot: string,
  custodyRoot: string,
): Readonly<Record<string, unknown>> {
  const policy = exactObject(
    value,
    SERVICE_KEYS,
    "custody_service_policy_invalid",
  );
  const readWrite = frozenStringArray(
    policy.read_write_paths,
    8,
    "custody_service_policy_invalid",
  );
  const expectedReadWrite = [custodyRoot, ledgerRoot].sort();
  if (
    safeInt(
      policy.user_uid,
      0,
      0x7fff_ffff,
      "custody_service_policy_invalid",
    ) !== custodyUid ||
    safeInt(
      policy.group_gid,
      0,
      0x7fff_ffff,
      "custody_service_policy_invalid",
    ) !== custodyGid ||
    runtimeUid === custodyUid ||
    policy.umask !== "0077" ||
    policy.no_new_privileges !== true ||
    policy.private_tmp !== true ||
    policy.private_devices !== true ||
    policy.protect_system !== "strict" ||
    policy.protect_home !== "true" ||
    policy.protect_kernel_tunables !== true ||
    policy.protect_kernel_modules !== true ||
    policy.protect_control_groups !== true ||
    policy.lock_personality !== true ||
    policy.restrict_suid_sgid !== true ||
    policy.restrict_realtime !== true ||
    policy.runtime_can_control_service !== false ||
    !Array.isArray(policy.capability_bounding_set) ||
    policy.capability_bounding_set.length !== 0 ||
    !Array.isArray(policy.ambient_capabilities) ||
    policy.ambient_capabilities.length !== 0 ||
    !Array.isArray(policy.restrict_address_families) ||
    policy.restrict_address_families.length !== 1 ||
    policy.restrict_address_families[0] !== "AF_UNIX" ||
    readWrite.length !== expectedReadWrite.length ||
    readWrite.some(
      (entry, index) => entry !== expectedReadWrite[index],
    )
  ) {
    fail("custody_service_policy_invalid");
  }
  return Object.freeze({
    user_uid: custodyUid,
    group_gid: custodyGid,
    umask: "0077",
    no_new_privileges: true,
    private_tmp: true,
    private_devices: true,
    protect_system: "strict",
    protect_home: "true",
    protect_kernel_tunables: true,
    protect_kernel_modules: true,
    protect_control_groups: true,
    lock_personality: true,
    restrict_suid_sgid: true,
    restrict_realtime: true,
    capability_bounding_set: Object.freeze([]),
    ambient_capabilities: Object.freeze([]),
    restrict_address_families: Object.freeze(["AF_UNIX"]),
    read_write_paths: readWrite,
    runtime_can_control_service: false,
  });
}

function normalizeHost(value: unknown): HostV1 {
  const host = exactObject(
    value,
    HOST_KEYS,
    "custody_host_evidence_invalid",
  );
  const hostId = safeText(
    host.host_id,
    /^[A-Za-z0-9._:-]{1,160}$/u,
    "custody_host_evidence_invalid",
  );
  const runtimeUid = safeInt(
    host.runtime_uid,
    1,
    0x7fff_ffff,
    "custody_runtime_identity_invalid",
  );
  const runtimeGid = safeInt(
    host.runtime_gid,
    1,
    0x7fff_ffff,
    "custody_runtime_identity_invalid",
  );
  const custodyUid = safeInt(
    host.custody_uid,
    1,
    0x7fff_ffff,
    "custody_runtime_identity_not_separated",
  );
  const custodyGid = safeInt(
    host.custody_gid,
    1,
    0x7fff_ffff,
    "custody_runtime_identity_not_separated",
  );
  if (
    runtimeUid === custodyUid ||
    runtimeGid === custodyGid
  ) {
    fail("custody_runtime_identity_not_separated");
  }

  const ledgerRoot = normalizeRoot(
    host.ledger_root,
    custodyUid,
    custodyGid,
    runtimeUid,
    "custody_ledger_root_invalid",
  );
  const custodyRoot = normalizeRoot(
    host.custody_root,
    custodyUid,
    custodyGid,
    runtimeUid,
    "custody_protected_root_invalid",
  );
  if (
    pathsOverlap(
      ledgerRoot.resolved_path,
      custodyRoot.resolved_path,
    )
  ) {
    fail("custody_root_paths_not_disjoint");
  }

  if (
    ledgerRoot.mount.mount_source ===
      custodyRoot.mount.mount_source ||
    ledgerRoot.mount.mount_uuid ===
      custodyRoot.mount.mount_uuid ||
    ledgerRoot.mount.major_minor ===
      custodyRoot.mount.major_minor
  ) {
    fail("custody_failure_domain_not_independent");
  }

  const socket = normalizeSocket(
    host.socket,
    runtimeUid,
    custodyUid,
    runtimeGid,
    custodyGid,
  );
  const servicePolicy = normalizeServicePolicy(
    host.service_policy,
    runtimeUid,
    custodyUid,
    custodyGid,
    ledgerRoot.resolved_path,
    custodyRoot.resolved_path,
  );
  if (
    host.fallback_storage_enabled !== false ||
    host.custody_medium_absence_holds !== true
  ) {
    fail("custody_fallback_storage_invalid");
  }
  return Object.freeze({
    host_id: hostId,
    runtime_uid: runtimeUid,
    runtime_gid: runtimeGid,
    custody_uid: custodyUid,
    custody_gid: custodyGid,
    ledger_root: ledgerRoot,
    custody_root: custodyRoot,
    socket,
    service_policy: servicePolicy,
    fallback_storage_enabled: false,
    custody_medium_absence_holds: true,
  });
}

function assertReviewedWriterBoundary(): void {
  if (
    VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_WRITER_V1 !==
      "VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_WRITER_V1" ||
    VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_WRITER_AUTHORITY_V1
      .source_contract !== true ||
    VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_WRITER_AUTHORITY_V1
      .single_root_mid_publication_recovery !== true ||
    VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_WRITER_AUTHORITY_V1
      .post_admission_root_path_stability_proven !== false ||
    VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_WRITER_AUTHORITY_V1
      .single_root_post_publication_recovery !== false ||
    VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_WRITER_AUTHORITY_V1
      .protected_high_water_custody_proven !== false ||
    VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_WRITER_AUTHORITY_V1
      .independent_custody_proven !== false ||
    VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_WRITER_AUTHORITY_V1
      .runtime_integration !== false ||
    VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_WRITER_AUTHORITY_V1
      .production_gate_ready !== false ||
    VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_WRITER_AUTHORITY_V1
      .funds_movement !== false
  ) {
    fail("custody_source_binding_invalid");
  }
}

function policyFingerprint(
  writerSourceSha256: string,
  host: HostV1,
): string {
  return sha256Id(
    canonicalJson({
      domain: QUALIFICATION_DOMAIN,
      writer_source_sha256: writerSourceSha256,
      host,
    }),
  );
}

function highWaterJsonFromReceipt(
  receipt: BuyVoidAllocationCustodyReceiptV1,
): string {
  return (
    JSON.stringify({
      schema:
        VOID_BUY_VOID_ALLOCATION_RESERVATION_HIGH_WATER_SCHEMA_V1,
      marker:
        VOID_BUY_VOID_ALLOCATION_RESERVATION_HIGH_WATER_V1,
      version: 1,
      record_count: receipt.record_count,
      tip_hash: receipt.tip_hash,
      ledger_sha256: receipt.ledger_sha256,
      ledger_bytes: receipt.ledger_bytes,
      pool_void_total: receipt.pool_void_total,
      reserved_void_total: receipt.reserved_void_total,
      remaining_void: receipt.remaining_void,
    }) + "\n"
  );
}

function receiptBody(
  receipt: Omit<
    BuyVoidAllocationCustodyReceiptV1,
    "receipt_sha256"
  >,
): Omit<BuyVoidAllocationCustodyReceiptV1, "receipt_sha256"> {
  return receipt;
}

function buildReceipt(input: {
  custody_epoch: string;
  previous_receipt_sha256: string | null;
  writer_source_head: string;
  writer_source_blob_sha1: string;
  writer_source_sha256: string;
  host: HostV1;
  qualification_policy_fingerprint_sha256: string;
  ledger_bytes: number;
  high_water: Readonly<BuyVoidAllocationReservationHighWaterV1>;
  high_water_json: string;
}): Readonly<BuyVoidAllocationCustodyReceiptV1> {
  const body = receiptBody({
    schema: RECEIPT_SCHEMA,
    marker: VOID_BUY_VOID_ALLOCATION_CUSTODY_RECEIPT_V1,
    version: 1,
    custody_epoch: input.custody_epoch,
    previous_receipt_sha256: input.previous_receipt_sha256,
    writer_source_head: input.writer_source_head,
    writer_source_blob_sha1: input.writer_source_blob_sha1,
    writer_source_sha256: input.writer_source_sha256,
    host_id: input.host.host_id,
    qualification_policy_fingerprint_sha256:
      input.qualification_policy_fingerprint_sha256,
    ledger_mount_instance_fingerprint_sha256:
      input.host.ledger_root.mount
        .mount_instance_fingerprint_sha256,
    ledger_storage_failure_domain_fingerprint_sha256:
      input.host.ledger_root.mount
        .storage_failure_domain_fingerprint_sha256,
    custody_mount_instance_fingerprint_sha256:
      input.host.custody_root.mount
        .mount_instance_fingerprint_sha256,
    custody_storage_failure_domain_fingerprint_sha256:
      input.host.custody_root.mount
        .storage_failure_domain_fingerprint_sha256,
    ledger_bytes: input.ledger_bytes,
    record_count: input.high_water.record_count,
    tip_hash: input.high_water.tip_hash,
    ledger_sha256: input.high_water.ledger_sha256,
    high_water_sha256:
      sha256Id(Buffer.from(input.high_water_json, "utf8")),
    pool_void_total: input.high_water.pool_void_total,
    reserved_void_total: input.high_water.reserved_void_total,
    remaining_void: input.high_water.remaining_void,
  });
  return Object.freeze({
    ...body,
    receipt_sha256: sha256Id(canonicalJson(body)),
  });
}

function parseReceipt(
  value: unknown,
): Readonly<BuyVoidAllocationCustodyReceiptV1> {
  const raw = exactObject(
    value,
    RECEIPT_KEYS,
    "custody_prior_receipt_invalid",
  );
  if (
    raw.schema !== RECEIPT_SCHEMA ||
    raw.marker !== VOID_BUY_VOID_ALLOCATION_CUSTODY_RECEIPT_V1 ||
    raw.version !== 1
  ) {
    fail("custody_prior_receipt_invalid");
  }
  const epochText = String(raw.custody_epoch ?? "");
  if (!DECIMAL.test(epochText)) {
    fail("custody_prior_receipt_invalid");
  }
  const epoch = BigInt(epochText);
  if (epoch < 0n || epoch > MAX_EPOCH) {
    fail("custody_prior_receipt_invalid");
  }
  const previous =
    raw.previous_receipt_sha256 === null
      ? null
      : sha(
          raw.previous_receipt_sha256,
          "custody_prior_receipt_invalid",
        );
  if (
    (epoch === 0n && previous !== null) ||
    (epoch > 0n && previous === null)
  ) {
    fail("custody_prior_receipt_invalid");
  }
  const receipt: BuyVoidAllocationCustodyReceiptV1 = {
    schema: RECEIPT_SCHEMA,
    marker: VOID_BUY_VOID_ALLOCATION_CUSTODY_RECEIPT_V1,
    version: 1,
    custody_epoch: epoch.toString(),
    previous_receipt_sha256: previous,
    writer_source_head: safeText(
      raw.writer_source_head,
      SHA1,
      "custody_prior_receipt_invalid",
    ),
    writer_source_blob_sha1: safeText(
      raw.writer_source_blob_sha1,
      SHA1,
      "custody_prior_receipt_invalid",
    ),
    writer_source_sha256: sha(
      raw.writer_source_sha256,
      "custody_prior_receipt_invalid",
    ),
    host_id: safeText(
      raw.host_id,
      /^[A-Za-z0-9._:-]{1,160}$/u,
      "custody_prior_receipt_invalid",
    ),
    qualification_policy_fingerprint_sha256: sha(
      raw.qualification_policy_fingerprint_sha256,
      "custody_prior_receipt_invalid",
    ),
    ledger_mount_instance_fingerprint_sha256: sha(
      raw.ledger_mount_instance_fingerprint_sha256,
      "custody_prior_receipt_invalid",
    ),
    ledger_storage_failure_domain_fingerprint_sha256: sha(
      raw.ledger_storage_failure_domain_fingerprint_sha256,
      "custody_prior_receipt_invalid",
    ),
    custody_mount_instance_fingerprint_sha256: sha(
      raw.custody_mount_instance_fingerprint_sha256,
      "custody_prior_receipt_invalid",
    ),
    custody_storage_failure_domain_fingerprint_sha256: sha(
      raw.custody_storage_failure_domain_fingerprint_sha256,
      "custody_prior_receipt_invalid",
    ),
    ledger_bytes: safeInt(
      raw.ledger_bytes,
      0,
      MAX_LEDGER_BYTES,
      "custody_prior_receipt_invalid",
    ),
    record_count: safeInt(
      raw.record_count,
      0,
      100_000,
      "custody_prior_receipt_invalid",
    ),
    tip_hash: sha(
      raw.tip_hash,
      "custody_prior_receipt_invalid",
    ),
    ledger_sha256: sha(
      raw.ledger_sha256,
      "custody_prior_receipt_invalid",
    ),
    high_water_sha256: sha(
      raw.high_water_sha256,
      "custody_prior_receipt_invalid",
    ),
    pool_void_total: decimal(
      raw.pool_void_total,
      "custody_prior_receipt_invalid",
    ),
    reserved_void_total: decimal(
      raw.reserved_void_total,
      "custody_prior_receipt_invalid",
    ),
    remaining_void: decimal(
      raw.remaining_void,
      "custody_prior_receipt_invalid",
    ),
    receipt_sha256: sha(
      raw.receipt_sha256,
      "custody_prior_receipt_invalid",
    ),
  };
  const body = { ...receipt };
  delete (body as Partial<BuyVoidAllocationCustodyReceiptV1>)
    .receipt_sha256;
  if (
    receipt.receipt_sha256 !==
    sha256Id(canonicalJson(body))
  ) {
    fail("custody_prior_receipt_invalid");
  }
  if (
    receipt.high_water_sha256 !==
    sha256Id(
      Buffer.from(
        highWaterJsonFromReceipt(receipt),
        "utf8",
      ),
    )
  ) {
    fail("custody_prior_receipt_invalid");
  }
  return Object.freeze(receipt);
}

function bytes(value: string | Buffer): Buffer {
  const out = Buffer.isBuffer(value)
    ? Buffer.from(value)
    : Buffer.from(String(value ?? ""), "utf8");
  if (out.length > MAX_LEDGER_BYTES) {
    fail("custody_high_water_binding_invalid");
  }
  return out;
}

function qualificationId(
  policyFingerprintValue: string,
  receiptSha: string,
): string {
  return sha256Id(
    QUALIFICATION_DOMAIN +
      "\n" +
      policyFingerprintValue +
      "\n" +
      receiptSha,
  );
}

function success(input: {
  status: "source_qualified" | "idempotent";
  writer_head: string;
  writer_blob_sha1: string;
  writer_source_sha256: string;
  host: HostV1;
  policy_fingerprint: string;
  receipt: Readonly<BuyVoidAllocationCustodyReceiptV1>;
}): BuyVoidAllocationCustodyQualificationDecisionV1 {
  return Object.freeze({
    ok: true,
    status: input.status,
    marker: VOID_BUY_VOID_ALLOCATION_CUSTODY_QUALIFICATION_V1,
    version: 1,
    qualification_id_sha256: qualificationId(
      input.policy_fingerprint,
      input.receipt.receipt_sha256,
    ),
    writer_source_head: input.writer_head,
    writer_source_blob_sha1: input.writer_blob_sha1,
    writer_source_sha256: input.writer_source_sha256,
    host_id: input.host.host_id,
    qualification_policy_fingerprint_sha256:
      input.policy_fingerprint,
    ledger_mount_instance_fingerprint_sha256:
      input.host.ledger_root.mount
        .mount_instance_fingerprint_sha256,
    ledger_storage_failure_domain_fingerprint_sha256:
      input.host.ledger_root.mount
        .storage_failure_domain_fingerprint_sha256,
    custody_mount_instance_fingerprint_sha256:
      input.host.custody_root.mount
        .mount_instance_fingerprint_sha256,
    custody_storage_failure_domain_fingerprint_sha256:
      input.host.custody_root.mount
        .storage_failure_domain_fingerprint_sha256,
    root_path_stability_evidence_qualified: true,
    separate_storage_domain_evidence_qualified: true,
    monotonic_continuity_against_supplied_prior: true,
    prior_receipt_external_trust_proven: false,
    independent_custody_proven: false,
    production_gate_ready: false,
    receipt: input.receipt,
    operation_performed: false,
    authority:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_QUALIFICATION_AUTHORITY_V1,
  });
}

export function classifyBuyVoidAllocationCustodyQualificationV1(
  input: {
    writer_source_head: unknown;
    writer_source_blob_sha1: unknown;
    writer_source_sha256: unknown;
    host_evidence: unknown;
    current_ledger_jsonl: string | Buffer;
    current_high_water_json: string | Buffer;
    prior_receipt: unknown | null;
  },
): BuyVoidAllocationCustodyQualificationDecisionV1 {
  try {
    exactObject(
      input,
      INPUT_KEYS,
      "custody_input_shape_invalid",
    );
    assertReviewedWriterBoundary();
    const writerHead = safeText(
      input.writer_source_head,
      SHA1,
      "custody_source_binding_invalid",
    );
    const writerBlobSha1 = safeText(
      input.writer_source_blob_sha1,
      SHA1,
      "custody_source_binding_invalid",
    );
    if (
      writerBlobSha1 !==
      VOID_BUY_VOID_ALLOCATION_CUSTODY_REVIEWED_WRITER_BLOB_SHA1_V1
    ) {
      fail("custody_source_binding_invalid");
    }

    const writerSourceSha256 = sha(
      input.writer_source_sha256,
      "custody_source_binding_invalid",
    );
    if (
      writerSourceSha256 !==
      VOID_BUY_VOID_ALLOCATION_CUSTODY_REVIEWED_WRITER_SOURCE_SHA256_V1
    ) {
      fail("custody_source_binding_invalid");
    }

    const host = normalizeHost(input.host_evidence);
    const policy = policyFingerprint(writerSourceSha256, host);
    const currentLedger = bytes(input.current_ledger_jsonl);
    const currentBinding =
      classifyBuyVoidAllocationReservationHighWaterBindingV1({
        ledger_jsonl: currentLedger,
        high_water_json: input.current_high_water_json,
      });
    if (currentBinding.ok === false) {
      fail("custody_high_water_binding_invalid");
    }

    const currentHighWaterJson = currentBinding.high_water_json;
    const prior =
      input.prior_receipt === null
        ? null
        : parseReceipt(input.prior_receipt);

    if (prior === null) {
      if (
        currentBinding.high_water.record_count !== 0 ||
        currentLedger.length !== 0
      ) {
        fail("custody_prior_receipt_required");
      }
      const receipt = buildReceipt({
        custody_epoch: "0",
        previous_receipt_sha256: null,
        writer_source_head: writerHead,
        writer_source_blob_sha1: writerBlobSha1,
        writer_source_sha256: writerSourceSha256,
        host,
        qualification_policy_fingerprint_sha256: policy,
        ledger_bytes: currentLedger.length,
        high_water: currentBinding.high_water,
        high_water_json: currentHighWaterJson,
      });
      return success({
        status: "source_qualified",
        writer_head: writerHead,
        writer_blob_sha1: writerBlobSha1,
        writer_source_sha256: writerSourceSha256,
        host,
        policy_fingerprint: policy,
        receipt,
      });
    }

    if (
      prior.writer_source_blob_sha1 !== writerBlobSha1 ||
      prior.writer_source_sha256 !== writerSourceSha256 ||
      prior.host_id !== host.host_id ||
      prior.qualification_policy_fingerprint_sha256 !== policy ||
      prior.ledger_mount_instance_fingerprint_sha256 !==
        host.ledger_root.mount.mount_instance_fingerprint_sha256 ||
      prior.ledger_storage_failure_domain_fingerprint_sha256 !==
        host.ledger_root.mount
          .storage_failure_domain_fingerprint_sha256 ||
      prior.custody_mount_instance_fingerprint_sha256 !==
        host.custody_root.mount.mount_instance_fingerprint_sha256 ||
      prior.custody_storage_failure_domain_fingerprint_sha256 !==
        host.custody_root.mount
          .storage_failure_domain_fingerprint_sha256
    ) {
      fail("custody_prior_receipt_policy_mismatch");
    }

    const current = currentBinding.high_water;
    if (current.record_count === prior.record_count) {
      if (
        currentLedger.length !== prior.ledger_bytes ||
        current.tip_hash !== prior.tip_hash ||
        current.ledger_sha256 !== prior.ledger_sha256 ||
        sha256Id(
          Buffer.from(currentHighWaterJson, "utf8"),
        ) !== prior.high_water_sha256 ||
        current.pool_void_total !== prior.pool_void_total ||
        current.reserved_void_total !==
          prior.reserved_void_total ||
        current.remaining_void !== prior.remaining_void
      ) {
        fail("custody_same_epoch_state_conflict");
      }
      return success({
        status: "idempotent",
        writer_head: writerHead,
        writer_blob_sha1: writerBlobSha1,
        writer_source_sha256: writerSourceSha256,
        host,
        policy_fingerprint: policy,
        receipt: prior,
      });
    }

    if (current.record_count !== prior.record_count + 1) {
      fail("custody_multi_record_jump_forbidden");
    }
    if (
      prior.ledger_bytes < 0 ||
      prior.ledger_bytes >= currentLedger.length
    ) {
      fail("custody_prior_ledger_prefix_invalid");
    }
    const priorLedger = currentLedger.subarray(
      0,
      prior.ledger_bytes,
    );
    const priorHighWaterJson =
      highWaterJsonFromReceipt(prior);
    const priorBinding =
      classifyBuyVoidAllocationReservationHighWaterBindingV1({
        ledger_jsonl: priorLedger,
        high_water_json: priorHighWaterJson,
      });
    if (priorBinding.ok === false) {
      fail("custody_prior_ledger_prefix_invalid");
    }
    const advance =
      planBuyVoidAllocationReservationHighWaterAdvanceV1({
        current_ledger_jsonl: priorLedger,
        current_high_water_json: priorHighWaterJson,
        next_ledger_jsonl: currentLedger,
      });
    if (
      advance.ok === false ||
      advance.status !== "planned" ||
      advance.idempotent !== false ||
      advance.next_high_water_json !== currentHighWaterJson
    ) {
      fail("custody_exact_single_append_invalid");
    }

    const priorEpoch = BigInt(prior.custody_epoch);
    if (priorEpoch >= MAX_EPOCH) {
      fail("custody_epoch_exhausted");
    }
    const receipt = buildReceipt({
      custody_epoch: (priorEpoch + 1n).toString(),
      previous_receipt_sha256: prior.receipt_sha256,
      writer_source_head: writerHead,
      writer_source_blob_sha1: writerBlobSha1,
      writer_source_sha256: writerSourceSha256,
      host,
      qualification_policy_fingerprint_sha256: policy,
      ledger_bytes: currentLedger.length,
      high_water: current,
      high_water_json: currentHighWaterJson,
    });
    return success({
      status: "source_qualified",
      writer_head: writerHead,
      writer_blob_sha1: writerBlobSha1,
      writer_source_sha256: writerSourceSha256,
      host,
      policy_fingerprint: policy,
      receipt,
    });
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "custody_qualification_failed",
    );
  }
}
