import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  VOID_BUY_VOID_HISTORY_CARRIER_ACTIVE_SEGMENT_ID_V1,
} from "./buy_void_history_carrier_v1.js";
import {
  VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_PLAN_V1,
  planBuyVoidLegacyHistoryMigrationFromRootV1,
  planBuyVoidProductionLegacyHistoryMigrationV1,
  type BuyVoidLegacyHistoryMigrationPlanV1,
} from "./buy_void_legacy_history_migration_plan_v1.js";
import {
  projectBuyVoidPaymentHistoryV1,
} from "./buy_void_payment_history_projection_v1.js";
import {
  VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_CENSUS_POOL_ID_V1,
  VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_CENSUS_RUNTIME_ROOT_V1,
} from "./buy_void_production_history_carrier_census_v1.js";
import {
  buildSegmentedJsonlV1FromFile,
  readSegmentedJsonlManifestV1,
  reconstructSegmentedJsonlV1ToFile,
  verifySegmentedJsonlV1,
  type SegmentedJsonlManifestV1,
} from "../storage/segmented_jsonl_v1.js";
import {
  deriveSegmentedJsonlCheckpointV1,
  deriveSegmentedJsonlSnapshotAuthorityV1,
} from "../storage/segmented_jsonl_snapshot_authority_v1.js";
import {
  deriveSegmentedJsonlMaterializedAuthorityV1,
  type SegmentedJsonlMaterializedAuthorityV1,
} from "../storage/segmented_jsonl_materialized_authority_v1.js";
import {
  publishSegmentedJsonlDurableRootV1,
  readSegmentedJsonlDurableRootV1,
  verifySegmentedJsonlDurableRootMaterializedAtUseV1,
  type SegmentedJsonlDurableRootV1,
} from "../storage/segmented_jsonl_durable_root_v1.js";

export const VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_APPLY_V1 =
  "VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_APPLY_V1";

export const VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_APPLY_EXPECTED_PLAN_SHA256_V1 =
  "de939c9fcbdb9f5f39440c689912d3f637ec571913b5f4dd49c2f6d125061be6";

export const VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_STORE_ROOT_NAME_V1 =
  "buy-void-payment-history-segmented-v1";
export const VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_GENERATIONS_NAME_V1 =
  "generations";
export const VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_CURRENT_POINTER_NAME_V1 =
  "current.v1.json";
export const VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_OWNER_NAME_V1 =
  "migration-owner.v1.json";
export const VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_ROW_NAME_V1 =
  "canonical-row.v1.jsonl";
export const VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_STORE_NAME_V1 =
  "store";
export const VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_MATERIALIZED_NAME_V1 =
  "materialized.v1.jsonl";
export const VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_DURABLE_ROOT_NAME_V1 =
  "durable-root";
export const VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_EVIDENCE_NAME_V1 =
  "migration-evidence.v1.json";

export const VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_APPLY_AUTHORITY_V1 = {
  source_only_apply_gate: true,
  explicit_operator_invocation_required: true,
  production_runtime_root_fixed: true,
  production_pool_id_fixed: true,
  expected_phase_a_plan_sha256_fixed: true,
  phase_a_recomputed_at_use: true,
  canonical_current_pool_row_recomputed_at_use: true,
  dedicated_segmented_history_namespace_only: true,
  immutable_generation_directory: true,
  create_only_current_pointer: true,
  exact_successful_replay_idempotent: true,
  foreign_state_preserved_on_hold: true,
  segmented_store_write: true,
  materialized_generation_write: true,
  durable_root_publish: true,
  durable_alias_evidence_write: true,
  legacy_journal_mutation: false,
  payment_history_projection_mutation: false,
  carrier_page_publication: false,
  carrier_root_mutation: false,
  runtime_activation: false,
  public_activation: false,
  service_action: false,
  credential_content_read: false,
  wallet_or_signer_access: false,
  rpc_call: false,
  transaction_signing: false,
  transaction_broadcast: false,
  chain2050_write: false,
  inventory_mutation: false,
  treasury_or_liquidity_action: false,
  funds_movement: false,
} as const;

const SHA256 = /^[0-9a-f]{64}$/u;
const DIRECTORY_FLAGS =
  fs.constants.O_RDONLY |
  ((fs.constants as any).O_DIRECTORY || 0) |
  ((fs.constants as any).O_NOFOLLOW || 0);
const FILE_READ_FLAGS =
  fs.constants.O_RDONLY |
  ((fs.constants as any).O_NOFOLLOW || 0);
const FILE_CREATE_FLAGS =
  fs.constants.O_WRONLY |
  fs.constants.O_CREAT |
  fs.constants.O_EXCL |
  ((fs.constants as any).O_NOFOLLOW || 0);
const MAX_EVIDENCE_BYTES = 64 * 1024;

type DirectoryAuthorityV1 = {
  fd: number;
  public_path: string;
  stable_path: string;
  dev: string;
  ino: string;
};

export type BuyVoidLegacyHistoryMigrationRecordLocatorV1 = {
  segmented_durable_root_sha256: string;
  segment_id:
    typeof VOID_BUY_VOID_HISTORY_CARRIER_ACTIVE_SEGMENT_ID_V1;
  segment_sha256: string;
  byte_offset: "0";
  byte_length: number;
  record_sha256: string;
};

export type BuyVoidLegacyHistoryMigrationEvidenceV1 = {
  marker: typeof VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_APPLY_V1;
  version: 1;
  migration_plan_sha256: string;
  lineage_mode:
    BuyVoidLegacyHistoryMigrationPlanV1["lineage_mode"];
  current_pool_id: string;
  legacy_pool_id: string | null;
  payment_key_sha256: string;
  current_primary_record_id: string;
  current_primary_record_journal_sha256: string;
  current_primary_record_fingerprint_sha256: string;
  legacy_primary_record_id: string | null;
  legacy_primary_record_journal_sha256: string | null;
  legacy_primary_record_fingerprint_sha256: string | null;
  legacy_pool_alias_fingerprint_sha256: string | null;
  execution_attempt_id: string;
  execution_attempt_state_fingerprint_sha256: string;
  inventory_consumption_id: string;
  inventory_consumption_fingerprint_sha256: string;
  inventory_consumption_record_sha256: string;
  canonical_jsonl_row_bytes: number;
  canonical_jsonl_row_sha256: string;
  store_generation: 1;
  segment_target_bytes: number;
  max_record_bytes: number;
  active_segment_id:
    typeof VOID_BUY_VOID_HISTORY_CARRIER_ACTIVE_SEGMENT_ID_V1;
  manifest_sha256: string;
  snapshot_sha256: string;
  checkpoint_sha256: string;
  materialized_authority_sha256: string;
  materialized_sha256: string;
  durable_root_sha256: string;
  record_locator: BuyVoidLegacyHistoryMigrationRecordLocatorV1;
  generation_relative_path: string;
  store_relative_path: string;
  materialized_relative_path: string;
  durable_root_relative_path: string;
  evidence_id: string;
  authority:
    typeof VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_APPLY_AUTHORITY_V1;
};

export type BuyVoidLegacyHistoryMigrationCurrentPointerV1 = {
  marker:
    "VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_CURRENT_POINTER_V1";
  version: 1;
  migration_plan_sha256: string;
  generation_name: string;
  evidence_id: string;
  durable_root_sha256: string;
  record_sha256: string;
  pointer_id: string;
};

export type BuyVoidLegacyHistoryMigrationApplyReceiptV1 = {
  marker: typeof VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_APPLY_V1;
  version: 1;
  status: "created" | "duplicate";
  mutation_performed: boolean;
  migration_plan_sha256: string;
  evidence: BuyVoidLegacyHistoryMigrationEvidenceV1;
  pointer: BuyVoidLegacyHistoryMigrationCurrentPointerV1;
  filesystem_write: true;
  legacy_journal_mutation: false;
  carrier_root_mutation: false;
  runtime_activation: false;
  service_action: false;
  credential_content_read: false;
  wallet_or_signer_access: false;
  rpc_call: false;
  transaction_signing: false;
  transaction_broadcast: false;
  chain2050_write: false;
  inventory_mutation: false;
  treasury_or_liquidity_action: false;
  funds_movement: false;
};

function fail(code: string, detail: string): never {
  throw new Error(
    VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_APPLY_V1 +
      ":" +
      code +
      ":" +
      detail,
  );
}

function sha256(value: Buffer | string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      fail("NON_CANONICAL_NUMBER", String(value));
    }
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
            JSON.stringify(key) +
            ":" +
            canonicalJson(record[key]),
        )
        .join(",") +
      "}"
    );
  }
  fail("NON_CANONICAL_VALUE", typeof value);
}

function currentUid(): bigint {
  if (typeof process.getuid !== "function") {
    fail("UID_UNAVAILABLE", "process.getuid");
  }
  return BigInt(process.getuid());
}

function mode(st: any): number {
  return Number(st.mode) & 0o777;
}

function assertPrivateDirectoryStat(
  st: any,
  label: string,
): void {
  const m = mode(st);
  if (
    !st.isDirectory() ||
    st.uid !== currentUid() ||
    (m & 0o022) !== 0 ||
    (m & 0o300) !== 0o300
  ) {
    fail(
      "DIRECTORY_AUTHORITY_INVALID",
      label +
        ":uid=" +
        String(st.uid) +
        ":mode=" +
        m.toString(8),
    );
  }
}

function openDirectoryAuthority(
  directoryInput: string,
): DirectoryAuthorityV1 {
  const publicPath = path.resolve(String(directoryInput || ""));
  if (
    !publicPath ||
    publicPath === path.parse(publicPath).root
  ) {
    fail("INVALID_DIRECTORY", publicPath || "empty");
  }
  const parsed = path.parse(publicPath);
  let fd = fs.openSync(parsed.root, DIRECTORY_FLAGS);
  let visible = parsed.root;
  try {
    for (const component of
      publicPath
        .slice(parsed.root.length)
        .split(path.sep)
        .filter(Boolean)) {
      const stableChild =
        path.join("/proc/self/fd/" + String(fd), component);
      let nextFd = -1;
      try {
        nextFd = fs.openSync(stableChild, DIRECTORY_FLAGS);
      } catch (error: any) {
        fail(
          "DIRECTORY_COMPONENT_OPEN_FAILED",
          component + ":" + String(error?.code || error),
        );
      }
      try {
        const opened =
          fs.fstatSync(nextFd, { bigint: true } as any);
        visible = path.join(visible, component);
        const current =
          fs.lstatSync(visible, { bigint: true } as any);
        if (
          !opened.isDirectory() ||
          !current.isDirectory() ||
          current.isSymbolicLink() ||
          opened.dev !== current.dev ||
          opened.ino !== current.ino
        ) {
          fail(
            "DIRECTORY_NAMESPACE_MISMATCH",
            visible,
          );
        }
      } catch (error) {
        fs.closeSync(nextFd);
        throw error;
      }
      fs.closeSync(fd);
      fd = nextFd;
    }
    const opened =
      fs.fstatSync(fd, { bigint: true } as any);
    const current =
      fs.lstatSync(publicPath, { bigint: true } as any);
    if (
      !opened.isDirectory() ||
      !current.isDirectory() ||
      current.isSymbolicLink() ||
      opened.dev !== current.dev ||
      opened.ino !== current.ino
    ) {
      fail("DIRECTORY_NAMESPACE_MISMATCH", publicPath);
    }
    assertPrivateDirectoryStat(opened, publicPath);
    assertPrivateDirectoryStat(current, publicPath);
    return {
      fd,
      public_path: publicPath,
      stable_path: "/proc/self/fd/" + String(fd),
      dev: String(opened.dev),
      ino: String(opened.ino),
    };
  } catch (error) {
    fs.closeSync(fd);
    throw error;
  }
}

function assertDirectoryAuthority(
  authority: DirectoryAuthorityV1,
): void {
  const opened =
    fs.fstatSync(authority.fd, { bigint: true } as any);
  const current =
    fs.lstatSync(authority.public_path, {
      bigint: true,
    } as any);
  if (
    !opened.isDirectory() ||
    !current.isDirectory() ||
    current.isSymbolicLink() ||
    String(opened.dev) !== authority.dev ||
    String(opened.ino) !== authority.ino ||
    opened.dev !== current.dev ||
    opened.ino !== current.ino
  ) {
    fail(
      "DIRECTORY_AUTHORITY_CHANGED",
      authority.public_path,
    );
  }
  assertPrivateDirectoryStat(
    opened,
    authority.public_path,
  );
  assertPrivateDirectoryStat(
    current,
    authority.public_path,
  );
}

function fsyncDirectory(directory: string): void {
  const authority = openDirectoryAuthority(directory);
  try {
    fs.fsyncSync(authority.fd);
    assertDirectoryAuthority(authority);
  } finally {
    fs.closeSync(authority.fd);
  }
}

function createPrivateDirectory(
  parentInput: string,
  name: string,
): string {
  if (
    !name ||
    path.basename(name) !== name ||
    name === "." ||
    name === ".."
  ) {
    fail("INVALID_DIRECTORY_NAME", name);
  }
  const parent = openDirectoryAuthority(parentInput);
  try {
    assertDirectoryAuthority(parent);
    const stable =
      path.join(parent.stable_path, name);
    const publicPath =
      path.join(parent.public_path, name);
    fs.mkdirSync(stable, { mode: 0o700 });
    fs.fsyncSync(parent.fd);
    assertDirectoryAuthority(parent);
    const created =
      fs.lstatSync(stable, { bigint: true } as any);
    const visible =
      fs.lstatSync(publicPath, { bigint: true } as any);
    if (
      !created.isDirectory() ||
      created.isSymbolicLink() ||
      !visible.isDirectory() ||
      visible.isSymbolicLink() ||
      created.dev !== visible.dev ||
      created.ino !== visible.ino ||
      mode(created) !== 0o700 ||
      mode(visible) !== 0o700 ||
      created.uid !== currentUid() ||
      visible.uid !== currentUid()
    ) {
      fail(
        "CREATED_DIRECTORY_AUTHORITY_INVALID",
        publicPath,
      );
    }
    return publicPath;
  } finally {
    fs.closeSync(parent.fd);
  }
}

function ensureDirectory(
  parent: string,
  name: string,
): string {
  const value = path.join(parent, name);
  if (!fs.existsSync(value)) {
    return createPrivateDirectory(parent, name);
  }
  const authority = openDirectoryAuthority(value);
  fs.closeSync(authority.fd);
  return value;
}

function readExactPrivateFile(
  fileInput: string,
  maximumBytes: number,
): Buffer {
  const file = path.resolve(fileInput);
  let fd = -1;
  try {
    fd = fs.openSync(file, FILE_READ_FLAGS);
    const before =
      fs.fstatSync(fd, { bigint: true } as any);
    const visibleBefore =
      fs.lstatSync(file, { bigint: true } as any);
    if (
      !before.isFile() ||
      !visibleBefore.isFile() ||
      visibleBefore.isSymbolicLink() ||
      before.dev !== visibleBefore.dev ||
      before.ino !== visibleBefore.ino ||
      Number(before.nlink) !== 1 ||
      Number(visibleBefore.nlink) !== 1 ||
      mode(before) !== 0o600 ||
      mode(visibleBefore) !== 0o600 ||
      before.uid !== currentUid() ||
      visibleBefore.uid !== currentUid()
    ) {
      fail("PRIVATE_FILE_AUTHORITY_INVALID", file);
    }
    const size = Number(before.size);
    if (
      !Number.isSafeInteger(size) ||
      size < 0 ||
      size > maximumBytes
    ) {
      fail("PRIVATE_FILE_SIZE_INVALID", file);
    }
    const body = Buffer.alloc(size);
    let offset = 0;
    while (offset < size) {
      const count =
        fs.readSync(
          fd,
          body,
          offset,
          size - offset,
          offset,
        );
      if (count <= 0) {
        fail("PRIVATE_FILE_SHORT_READ", file);
      }
      offset += count;
    }
    const sentinel = Buffer.alloc(1);
    if (
      fs.readSync(fd, sentinel, 0, 1, size) > 0
    ) {
      fail("PRIVATE_FILE_GREW", file);
    }
    const after =
      fs.fstatSync(fd, { bigint: true } as any);
    const visibleAfter =
      fs.lstatSync(file, { bigint: true } as any);
    if (
      after.dev !== before.dev ||
      after.ino !== before.ino ||
      after.size !== before.size ||
      after.mtimeNs !== before.mtimeNs ||
      after.ctimeNs !== before.ctimeNs ||
      visibleAfter.dev !== after.dev ||
      visibleAfter.ino !== after.ino ||
      visibleAfter.size !== after.size
    ) {
      fail("PRIVATE_FILE_CHANGED", file);
    }
    return body;
  } finally {
    if (fd >= 0) fs.closeSync(fd);
  }
}

function createOrVerifyPrivateFile(
  parentInput: string,
  name: string,
  body: Buffer,
): "created" | "existing" {
  const parent = openDirectoryAuthority(parentInput);
  try {
    assertDirectoryAuthority(parent);
    const stable = path.join(parent.stable_path, name);
    const publicPath = path.join(parent.public_path, name);
    let fd = -1;
    try {
      fd = fs.openSync(
        stable,
        FILE_CREATE_FLAGS,
        0o600,
      );
      let offset = 0;
      while (offset < body.length) {
        const count =
          fs.writeSync(
            fd,
            body,
            offset,
            body.length - offset,
            null,
          );
        if (count <= 0) {
          fail("PRIVATE_FILE_SHORT_WRITE", publicPath);
        }
        offset += count;
      }
      fs.fchmodSync(fd, 0o600);
      fs.fsyncSync(fd);
      const observed =
        fs.fstatSync(fd, { bigint: true } as any);
      if (
        !observed.isFile() ||
        Number(observed.nlink) !== 1 ||
        mode(observed) !== 0o600 ||
        observed.uid !== currentUid() ||
        Number(observed.size) !== body.length
      ) {
        fail(
          "PRIVATE_FILE_CREATE_VERIFY_FAILED",
          publicPath,
        );
      }
      fs.fsyncSync(parent.fd);
      assertDirectoryAuthority(parent);
      const reread =
        readExactPrivateFile(
          publicPath,
          Math.max(body.length, 1),
        );
      if (!reread.equals(body)) {
        fail(
          "PRIVATE_FILE_CREATE_BYTES_MISMATCH",
          publicPath,
        );
      }
      return "created";
    } catch (error: any) {
      if (fd >= 0) {
        try { fs.closeSync(fd); } catch (closeError) { void closeError; }
        fd = -1;
      }
      if (error?.code !== "EEXIST") {
        throw error;
      }
      const existing =
        readExactPrivateFile(
          publicPath,
          Math.max(body.length, 1),
        );
      if (!existing.equals(body)) {
        fail(
          "PRIVATE_FILE_EXISTING_CONFLICT",
          publicPath,
        );
      }
      return "existing";
    } finally {
      if (fd >= 0) fs.closeSync(fd);
    }
  } finally {
    fs.closeSync(parent.fd);
  }
}

function parseJsonObject(
  bytes: Buffer,
  code: string,
): Record<string, any> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(bytes.toString("utf8"));
  } catch {
    fail(code, "invalid-json");
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    Array.isArray(parsed)
  ) {
    fail(code, "not-object");
  }
  return parsed as Record<string, any>;
}

function requireSha256(
  value: unknown,
  code: string,
): string {
  const raw = String(value || "").trim().toLowerCase();
  if (!SHA256.test(raw)) fail(code, raw || "empty");
  return raw;
}

function assertExactNamespace(
  directory: string,
  allowed: readonly string[],
): void {
  const names = fs.readdirSync(directory).sort();
  const allowedSet = new Set(allowed);
  const unexpected =
    names.filter((name) => !allowedSet.has(name));
  if (unexpected.length) {
    fail(
      "FOREIGN_NAMESPACE_ENTRY",
      directory + ":" + unexpected.join(","),
    );
  }
}

function ownerBody(
  plan: BuyVoidLegacyHistoryMigrationPlanV1,
): Buffer {
  return Buffer.from(
    canonicalJson({
      marker:
        "VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_OWNER_V1",
      version: 1,
      migration_plan_sha256:
        plan.migration_plan_sha256,
      canonical_jsonl_row_sha256:
        plan.canonical_jsonl_row_sha256,
      lineage_mode: plan.lineage_mode,
    }) + "\n",
    "utf8",
  );
}

function currentRowForPlan(
  runtimeRoot: string,
  poolId: string,
  plan: BuyVoidLegacyHistoryMigrationPlanV1,
): Buffer {
  const projection =
    projectBuyVoidPaymentHistoryV1({
      root_dir: runtimeRoot,
      pool_id: poolId,
      payment_key_sha256:
        plan.payment_key_sha256,
    });
  if (
    projection.primary_kind !== "reservation" ||
    projection.primary_record_id !==
      plan.primary_record_id ||
    projection.primary_record_sha256 !==
      plan.primary_record_journal_sha256 ||
    projection.payment_history_fingerprint_sha256 !==
      plan.payment_history_fingerprint_sha256
  ) {
    fail(
      "CURRENT_PRIMARY_PROJECTION_CHANGED",
      plan.payment_key_sha256,
    );
  }
  const payload =
    Buffer.from(
      canonicalJson(projection.primary_record),
      "utf8",
    );
  const row =
    Buffer.concat([
      payload,
      Buffer.from("\n", "utf8"),
    ]);
  if (
    payload.length !==
      plan.canonical_jsonl_payload_bytes ||
    row.length !==
      plan.canonical_jsonl_row_bytes ||
    sha256(row) !==
      plan.canonical_jsonl_row_sha256 ||
    sha256(payload) !==
      plan.primary_record_fingerprint_sha256
  ) {
    fail(
      "CANONICAL_ROW_CHANGED",
      plan.migration_plan_sha256,
    );
  }
  return row;
}

function validateManifest(
  manifest: SegmentedJsonlManifestV1,
  plan: BuyVoidLegacyHistoryMigrationPlanV1,
): void {
  if (
    manifest.v !== 1 ||
    manifest.generation !==
      plan.proposed_segment_generation ||
    manifest.segment_target_bytes !==
      plan.proposed_segment_target_bytes ||
    manifest.max_record_bytes !==
      plan.proposed_max_record_bytes ||
    manifest.total_bytes !==
      plan.canonical_jsonl_row_bytes ||
    manifest.total_records !== 1 ||
    manifest.sealed_segments.length !== 0 ||
    manifest.sealed_bytes !== 0 ||
    manifest.sealed_records !== 0 ||
    manifest.active.file !== "active.jsonl" ||
    manifest.active.bytes !==
      plan.canonical_jsonl_row_bytes ||
    manifest.active.records !== 1 ||
    manifest.active.first_record_index !== 0 ||
    manifest.active.last_record_index !== 0 ||
    manifest.active.sha256 !==
      plan.proposed_active_segment_sha256
  ) {
    fail(
      "SEGMENTED_MANIFEST_MISMATCH",
      plan.migration_plan_sha256,
    );
  }
}

function storeState(
  generationRoot: string,
  rowFile: string,
  plan: BuyVoidLegacyHistoryMigrationPlanV1,
): SegmentedJsonlManifestV1 {
  const storeRoot =
    path.join(
      generationRoot,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_STORE_NAME_V1,
    );
  if (!fs.existsSync(storeRoot)) {
    const manifest =
      buildSegmentedJsonlV1FromFile(
        rowFile,
        storeRoot,
        {
          segmentTargetBytes:
            plan.proposed_segment_target_bytes,
          maxRecordBytes:
            plan.proposed_max_record_bytes,
          generation:
            plan.proposed_segment_generation,
        },
      );
    validateManifest(manifest, plan);
    return manifest;
  }

  const storeAuthority =
    openDirectoryAuthority(storeRoot);
  fs.closeSync(storeAuthority.fd);
  const manifestPath =
    path.join(storeRoot, "manifest.v1.json");
  if (!fs.existsSync(manifestPath)) {
    fail(
      "INCOMPLETE_SEGMENTED_STORE_REQUIRES_REVIEW",
      storeRoot,
    );
  }
  const verified =
    verifySegmentedJsonlV1(storeRoot);
  const manifest =
    readSegmentedJsonlManifestV1(storeRoot);
  if (
    verified.total_records_verified !== 1 ||
    verified.total_bytes_verified !==
      plan.canonical_jsonl_row_bytes
  ) {
    fail(
      "SEGMENTED_STORE_VERIFY_MISMATCH",
      storeRoot,
    );
  }
  validateManifest(manifest, plan);
  return manifest;
}

function readDurableState(input: {
  generation_root: string;
  plan: BuyVoidLegacyHistoryMigrationPlanV1;
  manifest: SegmentedJsonlManifestV1;
}): {
  materialized: SegmentedJsonlMaterializedAuthorityV1;
  durable_root: SegmentedJsonlDurableRootV1;
} {
  const storeRoot =
    path.join(
      input.generation_root,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_STORE_NAME_V1,
    );
  const materializedFile =
    path.join(
      input.generation_root,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_MATERIALIZED_NAME_V1,
    );
  const durableRootDirectory =
    path.join(
      input.generation_root,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_DURABLE_ROOT_NAME_V1,
    );
  const materialized =
    deriveSegmentedJsonlMaterializedAuthorityV1(
      storeRoot,
      materializedFile,
    );
  const durableRoot =
    readSegmentedJsonlDurableRootV1(
      durableRootDirectory,
    );
  if (
    !durableRoot ||
    durableRoot.store_generation !== 1 ||
    durableRoot.total_records !== 1 ||
    durableRoot.total_bytes !==
      input.plan.canonical_jsonl_row_bytes ||
    durableRoot.manifest_sha256 !==
      materialized.manifest_sha256 ||
    durableRoot.snapshot_sha256 !==
      materialized.snapshot_sha256 ||
    durableRoot.materialized_authority_sha256 !==
      materialized.authority_sha256 ||
    durableRoot.materialized_sha256 !==
      materialized.materialized_sha256
  ) {
    fail(
      "DURABLE_ROOT_READ_ONLY_VERIFY_MISMATCH",
      input.plan.migration_plan_sha256,
    );
  }
  verifySegmentedJsonlDurableRootMaterializedAtUseV1(
    durableRootDirectory,
    storeRoot,
    materializedFile,
    materialized,
    durableRoot.root_sha256,
    (reader) => {
      const row =
        reader.read(
          0,
          input.plan.canonical_jsonl_row_bytes,
        );
      if (
        row.length !==
          input.plan.canonical_jsonl_row_bytes ||
        sha256(row) !==
          input.plan.canonical_jsonl_row_sha256
      ) {
        fail(
          "DURABLE_ROOT_RECORD_READBACK_MISMATCH",
          input.plan.migration_plan_sha256,
        );
      }
      return true;
    },
  );
  return {
    materialized,
    durable_root: durableRoot,
  };
}

function durableState(input: {
  generation_root: string;
  plan: BuyVoidLegacyHistoryMigrationPlanV1;
  manifest: SegmentedJsonlManifestV1;
}): {
  materialized: SegmentedJsonlMaterializedAuthorityV1;
  durable_root: SegmentedJsonlDurableRootV1;
} {
  const storeRoot =
    path.join(
      input.generation_root,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_STORE_NAME_V1,
    );
  const materializedFile =
    path.join(
      input.generation_root,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_MATERIALIZED_NAME_V1,
    );
  const reconstructed =
    reconstructSegmentedJsonlV1ToFile(
      storeRoot,
      materializedFile,
    );
  if (
    reconstructed.bytes !==
      input.plan.canonical_jsonl_row_bytes ||
    reconstructed.records !== 1 ||
    reconstructed.sha256 !==
      input.plan.canonical_jsonl_row_sha256
  ) {
    fail(
      "MATERIALIZED_RECONSTRUCTION_MISMATCH",
      input.plan.migration_plan_sha256,
    );
  }

  const snapshot =
    deriveSegmentedJsonlSnapshotAuthorityV1(
      input.manifest,
    );
  const checkpoint =
    deriveSegmentedJsonlCheckpointV1(
      snapshot,
      null,
    );
  const materialized =
    deriveSegmentedJsonlMaterializedAuthorityV1(
      storeRoot,
      materializedFile,
    );

  const durableRootDirectory =
    ensureDirectory(
      input.generation_root,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_DURABLE_ROOT_NAME_V1,
    );
  const durableRoot =
    publishSegmentedJsonlDurableRootV1(
      durableRootDirectory,
      {
        checkpoint,
        snapshot,
        materialized,
      },
    );
  const reread =
    readSegmentedJsonlDurableRootV1(
      durableRootDirectory,
    );
  if (
    !reread ||
    reread.root_sha256 !==
      durableRoot.root_sha256 ||
    durableRoot.store_generation !== 1 ||
    durableRoot.total_records !== 1 ||
    durableRoot.total_bytes !==
      input.plan.canonical_jsonl_row_bytes ||
    durableRoot.manifest_sha256 !==
      snapshot.manifest_sha256 ||
    durableRoot.snapshot_sha256 !==
      snapshot.snapshot_sha256 ||
    durableRoot.checkpoint_sha256 !==
      checkpoint.checkpoint_sha256 ||
    durableRoot.materialized_authority_sha256 !==
      materialized.authority_sha256 ||
    durableRoot.materialized_sha256 !==
      materialized.materialized_sha256
  ) {
    fail(
      "DURABLE_ROOT_READBACK_MISMATCH",
      input.plan.migration_plan_sha256,
    );
  }

  verifySegmentedJsonlDurableRootMaterializedAtUseV1(
    durableRootDirectory,
    storeRoot,
    materializedFile,
    materialized,
    durableRoot.root_sha256,
    (reader) => {
      const row =
        reader.read(
          0,
          input.plan.canonical_jsonl_row_bytes,
        );
      if (
        row.length !==
          input.plan.canonical_jsonl_row_bytes ||
        sha256(row) !==
          input.plan.canonical_jsonl_row_sha256
      ) {
        fail(
          "DURABLE_ROOT_RECORD_READBACK_MISMATCH",
          input.plan.migration_plan_sha256,
        );
      }
      return true;
    },
  );

  return { materialized, durable_root: durableRoot };
}

function evidenceFor(input: {
  plan: BuyVoidLegacyHistoryMigrationPlanV1;
  manifest: SegmentedJsonlManifestV1;
  materialized: SegmentedJsonlMaterializedAuthorityV1;
  durable_root: SegmentedJsonlDurableRootV1;
}): BuyVoidLegacyHistoryMigrationEvidenceV1 {
  const locator:
    BuyVoidLegacyHistoryMigrationRecordLocatorV1 = {
      segmented_durable_root_sha256:
        input.durable_root.root_sha256,
      segment_id:
        VOID_BUY_VOID_HISTORY_CARRIER_ACTIVE_SEGMENT_ID_V1,
      segment_sha256:
        input.manifest.active.sha256,
      byte_offset: "0",
      byte_length:
        input.plan.canonical_jsonl_row_bytes,
      record_sha256:
        input.plan.canonical_jsonl_row_sha256,
    };

  const core = {
    marker:
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_APPLY_V1 as
        typeof VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_APPLY_V1,
    version: 1 as const,
    migration_plan_sha256:
      input.plan.migration_plan_sha256,
    lineage_mode: input.plan.lineage_mode,
    current_pool_id: input.plan.pool_id,
    legacy_pool_id: input.plan.legacy_pool_id,
    payment_key_sha256:
      input.plan.payment_key_sha256,
    current_primary_record_id:
      input.plan.primary_record_id,
    current_primary_record_journal_sha256:
      input.plan.primary_record_journal_sha256,
    current_primary_record_fingerprint_sha256:
      input.plan.primary_record_fingerprint_sha256,
    legacy_primary_record_id:
      input.plan.legacy_primary_record_id,
    legacy_primary_record_journal_sha256:
      input.plan.legacy_primary_record_journal_sha256,
    legacy_primary_record_fingerprint_sha256:
      input.plan.legacy_primary_record_fingerprint_sha256,
    legacy_pool_alias_fingerprint_sha256:
      input.plan.legacy_pool_alias_fingerprint_sha256,
    execution_attempt_id:
      input.plan.execution_attempt_id,
    execution_attempt_state_fingerprint_sha256:
      input.plan.execution_attempt_state_fingerprint_sha256,
    inventory_consumption_id:
      input.plan.inventory_consumption_id,
    inventory_consumption_fingerprint_sha256:
      input.plan.inventory_consumption_fingerprint_sha256,
    inventory_consumption_record_sha256:
      input.plan.inventory_consumption_record_sha256,
    canonical_jsonl_row_bytes:
      input.plan.canonical_jsonl_row_bytes,
    canonical_jsonl_row_sha256:
      input.plan.canonical_jsonl_row_sha256,
    store_generation: 1 as const,
    segment_target_bytes:
      input.plan.proposed_segment_target_bytes,
    max_record_bytes:
      input.plan.proposed_max_record_bytes,
    active_segment_id:
      VOID_BUY_VOID_HISTORY_CARRIER_ACTIVE_SEGMENT_ID_V1 as
        typeof VOID_BUY_VOID_HISTORY_CARRIER_ACTIVE_SEGMENT_ID_V1,
    manifest_sha256:
      input.durable_root.manifest_sha256,
    snapshot_sha256:
      input.durable_root.snapshot_sha256,
    checkpoint_sha256:
      input.durable_root.checkpoint_sha256,
    materialized_authority_sha256:
      input.materialized.authority_sha256,
    materialized_sha256:
      input.materialized.materialized_sha256,
    durable_root_sha256:
      input.durable_root.root_sha256,
    record_locator: locator,
    generation_relative_path:
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_GENERATIONS_NAME_V1 +
      "/" +
      input.plan.migration_plan_sha256,
    store_relative_path:
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_GENERATIONS_NAME_V1 +
      "/" +
      input.plan.migration_plan_sha256 +
      "/" +
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_STORE_NAME_V1,
    materialized_relative_path:
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_GENERATIONS_NAME_V1 +
      "/" +
      input.plan.migration_plan_sha256 +
      "/" +
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_MATERIALIZED_NAME_V1,
    durable_root_relative_path:
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_GENERATIONS_NAME_V1 +
      "/" +
      input.plan.migration_plan_sha256 +
      "/" +
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_DURABLE_ROOT_NAME_V1,
    authority:
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_APPLY_AUTHORITY_V1,
  };
  return {
    ...core,
    evidence_id:
      sha256(canonicalJson(core)),
  };
}

function evidenceBytes(
  evidence: BuyVoidLegacyHistoryMigrationEvidenceV1,
): Buffer {
  return Buffer.from(
    canonicalJson(evidence) + "\n",
    "utf8",
  );
}

function pointerFor(
  evidence: BuyVoidLegacyHistoryMigrationEvidenceV1,
): BuyVoidLegacyHistoryMigrationCurrentPointerV1 {
  const core = {
    marker:
      "VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_CURRENT_POINTER_V1" as const,
    version: 1 as const,
    migration_plan_sha256:
      evidence.migration_plan_sha256,
    generation_name:
      evidence.migration_plan_sha256,
    evidence_id: evidence.evidence_id,
    durable_root_sha256:
      evidence.durable_root_sha256,
    record_sha256:
      evidence.canonical_jsonl_row_sha256,
  };
  return {
    ...core,
    pointer_id:
      sha256(canonicalJson(core)),
  };
}

function pointerBytes(
  pointer: BuyVoidLegacyHistoryMigrationCurrentPointerV1,
): Buffer {
  return Buffer.from(
    canonicalJson(pointer) + "\n",
    "utf8",
  );
}

function validatePublishedGeneration(input: {
  store_root: string;
  generation_root: string;
  plan: BuyVoidLegacyHistoryMigrationPlanV1;
  row: Buffer;
}): {
  evidence: BuyVoidLegacyHistoryMigrationEvidenceV1;
  pointer: BuyVoidLegacyHistoryMigrationCurrentPointerV1;
} {
  const ownerFile =
    path.join(
      input.generation_root,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_OWNER_NAME_V1,
    );
  const owner =
    readExactPrivateFile(
      ownerFile,
      MAX_EVIDENCE_BYTES,
    );
  if (!owner.equals(ownerBody(input.plan))) {
    fail(
      "GENERATION_OWNER_MISMATCH",
      input.generation_root,
    );
  }

  const rowFile =
    path.join(
      input.generation_root,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_ROW_NAME_V1,
    );
  const row =
    readExactPrivateFile(
      rowFile,
      input.row.length,
    );
  if (!row.equals(input.row)) {
    fail(
      "GENERATION_ROW_MISMATCH",
      input.generation_root,
    );
  }

  const manifest =
    readSegmentedJsonlManifestV1(
      path.join(
        input.generation_root,
        VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_STORE_NAME_V1,
      ),
    );
  validateManifest(manifest, input.plan);
  const verifiedStore =
    verifySegmentedJsonlV1(
      path.join(
        input.generation_root,
        VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_STORE_NAME_V1,
      ),
    );
  if (
    verifiedStore.total_records_verified !== 1 ||
    verifiedStore.total_bytes_verified !==
      input.plan.canonical_jsonl_row_bytes
  ) {
    fail(
      "GENERATION_STORE_VERIFY_MISMATCH",
      input.generation_root,
    );
  }
  const state =
    readDurableState({
      generation_root:
        input.generation_root,
      plan: input.plan,
      manifest,
    });
  const expectedEvidence =
    evidenceFor({
      plan: input.plan,
      manifest,
      materialized: state.materialized,
      durable_root: state.durable_root,
    });
  const evidenceFile =
    path.join(
      input.generation_root,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_EVIDENCE_NAME_V1,
    );
  const evidenceBody =
    readExactPrivateFile(
      evidenceFile,
      MAX_EVIDENCE_BYTES,
    );
  if (
    !evidenceBody.equals(
      evidenceBytes(expectedEvidence),
    )
  ) {
    fail(
      "GENERATION_EVIDENCE_MISMATCH",
      input.generation_root,
    );
  }
  const pointer =
    pointerFor(expectedEvidence);
  const pointerFile =
    path.join(
      input.store_root,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_CURRENT_POINTER_NAME_V1,
    );
  const pointerBody =
    readExactPrivateFile(
      pointerFile,
      MAX_EVIDENCE_BYTES,
    );
  if (!pointerBody.equals(pointerBytes(pointer))) {
    fail(
      "CURRENT_POINTER_MISMATCH",
      pointerFile,
    );
  }

  assertExactNamespace(
    input.generation_root,
    [
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_OWNER_NAME_V1,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_ROW_NAME_V1,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_STORE_NAME_V1,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_MATERIALIZED_NAME_V1,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_DURABLE_ROOT_NAME_V1,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_EVIDENCE_NAME_V1,
    ],
  );
  return {
    evidence: expectedEvidence,
    pointer,
  };
}

export function applyBuyVoidLegacyHistoryMigrationArtifactsForProofV1(input: {
  runtime_root: string;
  plan: BuyVoidLegacyHistoryMigrationPlanV1;
  canonical_row: Buffer;
}): BuyVoidLegacyHistoryMigrationApplyReceiptV1 {
  const runtimeRoot =
    path.resolve(String(input.runtime_root || ""));
  const runtimeAuthority =
    openDirectoryAuthority(runtimeRoot);
  fs.closeSync(runtimeAuthority.fd);

  const plan = input.plan;
  if (
    !plan ||
    plan.marker !==
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_PLAN_V1 ||
    plan.version !== 1 ||
    !SHA256.test(plan.migration_plan_sha256)
  ) {
    fail("INVALID_PHASE_A_PLAN", "shape");
  }
  const row = Buffer.from(input.canonical_row);
  if (
    row.length !==
      plan.canonical_jsonl_row_bytes ||
    sha256(row) !==
      plan.canonical_jsonl_row_sha256 ||
    plan.proposed_segment_generation !== 1 ||
    plan.proposed_record_byte_offset !== "0" ||
    plan.proposed_record_byte_length !==
      row.length ||
    plan.proposed_record_sha256 !==
      sha256(row) ||
    plan.proposed_active_segment_sha256 !==
      sha256(row) ||
    plan.proposed_active_segment_id !==
      VOID_BUY_VOID_HISTORY_CARRIER_ACTIVE_SEGMENT_ID_V1
  ) {
    fail(
      "PHASE_A_ROW_BINDING_INVALID",
      plan.migration_plan_sha256,
    );
  }

  const storeRootPath =
    path.join(
      runtimeRoot,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_STORE_ROOT_NAME_V1,
    );
  const storeRootExisted =
    fs.existsSync(storeRootPath);
  const storeRoot =
    storeRootExisted
      ? storeRootPath
      : createPrivateDirectory(
          runtimeRoot,
          VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_STORE_ROOT_NAME_V1,
        );
  const storeAuthority =
    openDirectoryAuthority(storeRoot);
  fs.closeSync(storeAuthority.fd);
  assertExactNamespace(
    storeRoot,
    [
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_GENERATIONS_NAME_V1,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_CURRENT_POINTER_NAME_V1,
    ],
  );

  const pointerFile =
    path.join(
      storeRoot,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_CURRENT_POINTER_NAME_V1,
    );
  if (fs.existsSync(pointerFile)) {
    const pointerRaw =
      parseJsonObject(
        readExactPrivateFile(
          pointerFile,
          MAX_EVIDENCE_BYTES,
        ),
        "CURRENT_POINTER_INVALID",
      );
    if (
      pointerRaw.marker !==
        "VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_CURRENT_POINTER_V1" ||
      pointerRaw.version !== 1 ||
      pointerRaw.migration_plan_sha256 !==
        plan.migration_plan_sha256 ||
      pointerRaw.generation_name !==
        plan.migration_plan_sha256
    ) {
      fail(
        "CURRENT_POINTER_FOREIGN",
        pointerFile,
      );
    }
    const generationsRoot =
      path.join(
        storeRoot,
        VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_GENERATIONS_NAME_V1,
      );
    if (!fs.existsSync(generationsRoot)) {
      fail(
        "CURRENT_POINTER_GENERATIONS_MISSING",
        pointerFile,
      );
    }
    const generationsAuthority =
      openDirectoryAuthority(generationsRoot);
    fs.closeSync(generationsAuthority.fd);
    assertExactNamespace(
      generationsRoot,
      [plan.migration_plan_sha256],
    );
    const generationRoot =
      path.join(
        generationsRoot,
        plan.migration_plan_sha256,
      );
    if (!fs.existsSync(generationRoot)) {
      fail(
        "CURRENT_POINTER_GENERATION_MISSING",
        pointerFile,
      );
    }
    const validated =
      validatePublishedGeneration({
        store_root: storeRoot,
        generation_root: generationRoot,
        plan,
        row,
      });
    return {
      marker:
        VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_APPLY_V1,
      version: 1,
      status: "duplicate",
      mutation_performed: false,
      migration_plan_sha256:
        plan.migration_plan_sha256,
      evidence: validated.evidence,
      pointer: validated.pointer,
      filesystem_write: true,
      legacy_journal_mutation: false,
      carrier_root_mutation: false,
      runtime_activation: false,
      service_action: false,
      credential_content_read: false,
      wallet_or_signer_access: false,
      rpc_call: false,
      transaction_signing: false,
      transaction_broadcast: false,
      chain2050_write: false,
      inventory_mutation: false,
      treasury_or_liquidity_action: false,
      funds_movement: false,
    };
  }

  const generationsRootPath =
    path.join(
      storeRoot,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_GENERATIONS_NAME_V1,
    );
  const generationsRoot =
    fs.existsSync(generationsRootPath)
      ? generationsRootPath
      : createPrivateDirectory(
          storeRoot,
          VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_GENERATIONS_NAME_V1,
        );
  const generationsAuthority =
    openDirectoryAuthority(generationsRoot);
  fs.closeSync(generationsAuthority.fd);
  const generationNames =
    fs.readdirSync(generationsRoot).sort();
  const foreignGenerationNames =
    generationNames.filter(
      (name) =>
        name !== plan.migration_plan_sha256,
    );
  if (foreignGenerationNames.length) {
    fail(
      "FOREIGN_GENERATION_PRESENT",
      foreignGenerationNames.join(","),
    );
  }
  const generationRoot =
    generationNames.includes(
      plan.migration_plan_sha256,
    )
      ? path.join(
          generationsRoot,
          plan.migration_plan_sha256,
        )
      : createPrivateDirectory(
          generationsRoot,
          plan.migration_plan_sha256,
        );
  assertExactNamespace(
    generationsRoot,
    [plan.migration_plan_sha256],
  );

  assertExactNamespace(
    generationRoot,
    [
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_OWNER_NAME_V1,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_ROW_NAME_V1,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_STORE_NAME_V1,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_MATERIALIZED_NAME_V1,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_DURABLE_ROOT_NAME_V1,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_EVIDENCE_NAME_V1,
    ],
  );

  createOrVerifyPrivateFile(
    generationRoot,
    VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_OWNER_NAME_V1,
    ownerBody(plan),
  );
  const rowFile =
    path.join(
      generationRoot,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_ROW_NAME_V1,
    );
  createOrVerifyPrivateFile(
    generationRoot,
    VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_ROW_NAME_V1,
    row,
  );

  const manifest =
    storeState(
      generationRoot,
      rowFile,
      plan,
    );
  const state =
    durableState({
      generation_root: generationRoot,
      plan,
      manifest,
    });
  const evidence =
    evidenceFor({
      plan,
      manifest,
      materialized: state.materialized,
      durable_root: state.durable_root,
    });
  createOrVerifyPrivateFile(
    generationRoot,
    VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_EVIDENCE_NAME_V1,
    evidenceBytes(evidence),
  );

  assertExactNamespace(
    generationRoot,
    [
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_OWNER_NAME_V1,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_ROW_NAME_V1,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_STORE_NAME_V1,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_MATERIALIZED_NAME_V1,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_DURABLE_ROOT_NAME_V1,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_EVIDENCE_NAME_V1,
    ],
  );

  const pointer =
    pointerFor(evidence);
  const pointerStatus =
    createOrVerifyPrivateFile(
      storeRoot,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_CURRENT_POINTER_NAME_V1,
      pointerBytes(pointer),
    );
  if (pointerStatus !== "created") {
    fail(
      "CURRENT_POINTER_PREEXISTED_DURING_APPLY",
      pointerFile,
    );
  }
  fsyncDirectory(storeRoot);
  fsyncDirectory(runtimeRoot);

  const validated =
    validatePublishedGeneration({
      store_root: storeRoot,
      generation_root: generationRoot,
      plan,
      row,
    });

  return {
    marker:
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_APPLY_V1,
    version: 1,
    status: "created",
    mutation_performed: true,
    migration_plan_sha256:
      plan.migration_plan_sha256,
    evidence: validated.evidence,
    pointer: validated.pointer,
    filesystem_write: true,
    legacy_journal_mutation: false,
    carrier_root_mutation: false,
    runtime_activation: false,
    service_action: false,
    credential_content_read: false,
    wallet_or_signer_access: false,
    rpc_call: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    inventory_mutation: false,
    treasury_or_liquidity_action: false,
    funds_movement: false,
  };
}

export function applyBuyVoidLegacyHistoryMigrationFromRootV1(input: {
  runtime_root: string;
  pool_id: string;
  expected_migration_plan_sha256: string;
}): BuyVoidLegacyHistoryMigrationApplyReceiptV1 {
  const expected =
    requireSha256(
      input.expected_migration_plan_sha256,
      "EXPECTED_PLAN_SHA256_INVALID",
    );
  const plan =
    planBuyVoidLegacyHistoryMigrationFromRootV1({
      runtime_root: input.runtime_root,
      pool_id: input.pool_id,
    });
  if (
    plan.migration_plan_sha256 !== expected
  ) {
    fail(
      "PHASE_A_PLAN_CHANGED",
      plan.migration_plan_sha256 + ":" + expected,
    );
  }
  const row =
    currentRowForPlan(
      path.resolve(input.runtime_root),
      input.pool_id,
      plan,
    );
  return applyBuyVoidLegacyHistoryMigrationArtifactsForProofV1({
    runtime_root: input.runtime_root,
    plan,
    canonical_row: row,
  });
}

export function applyBuyVoidProductionLegacyHistoryMigrationV1():
  BuyVoidLegacyHistoryMigrationApplyReceiptV1 {
  const plan =
    planBuyVoidProductionLegacyHistoryMigrationV1();
  if (
    plan.migration_plan_sha256 !==
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_APPLY_EXPECTED_PLAN_SHA256_V1
  ) {
    fail(
      "PRODUCTION_PHASE_A_PLAN_CHANGED",
      plan.migration_plan_sha256,
    );
  }
  return applyBuyVoidLegacyHistoryMigrationFromRootV1({
    runtime_root:
      VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_CENSUS_RUNTIME_ROOT_V1,
    pool_id:
      VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_CENSUS_POOL_ID_V1,
    expected_migration_plan_sha256:
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_APPLY_EXPECTED_PLAN_SHA256_V1,
  });
}
