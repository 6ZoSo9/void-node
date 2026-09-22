import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  createEmptyBuyVoidHistoryIndexV1,
  planBuyVoidHistoryCarrierCommitFromVerifiedBytesV1,
  type BuyVoidHistoryCarrierRootV1,
  type BuyVoidHistoryCarrierTxIntentV1,
} from "./buy_void_history_carrier_v1.js";
import {
  VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_APPLY_AUTHORITY_V1,
  VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_APPLY_V1,
  VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_CURRENT_POINTER_NAME_V1,
  VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_DURABLE_ROOT_NAME_V1,
  VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_EVIDENCE_NAME_V1,
  VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_GENERATIONS_NAME_V1,
  VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_MATERIALIZED_NAME_V1,
  VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_STORE_NAME_V1,
  VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_STORE_ROOT_NAME_V1,
  type BuyVoidLegacyHistoryMigrationCurrentPointerV1,
  type BuyVoidLegacyHistoryMigrationEvidenceV1,
} from "./buy_void_legacy_history_migration_apply_v1.js";
import {
  VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_PREDECESSOR_POOL_ID_V1,
  planBuyVoidLegacyHistoryMigrationFromRootV1,
} from "./buy_void_legacy_history_migration_plan_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_HISTORY_PROJECTION_V1,
  projectBuyVoidPaymentHistoryV1,
  type BuyVoidPaymentHistoryProjectionV1,
} from "./buy_void_payment_history_projection_v1.js";
import {
  VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_CENSUS_POOL_ID_V1,
  VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_CENSUS_RUNTIME_ROOT_V1,
} from "./buy_void_production_history_carrier_census_v1.js";
import {
  readSegmentedJsonlManifestV1,
} from "../storage/segmented_jsonl_v1.js";
import {
  deriveSegmentedJsonlMaterializedAuthorityV1,
} from "../storage/segmented_jsonl_materialized_authority_v1.js";
import {
  readSegmentedJsonlDurableRootV1,
  verifySegmentedJsonlDurableRootMaterializedAtUseV1,
} from "../storage/segmented_jsonl_durable_root_v1.js";

export const VOID_BUY_VOID_LEGACY_ALIAS_CARRIER_GENESIS_V1 =
  "VOID_BUY_VOID_LEGACY_ALIAS_CARRIER_GENESIS_V1";

export const VOID_BUY_VOID_LEGACY_ALIAS_CARRIER_GENESIS_EXPECTED_PLAN_SHA256_V1 =
  "de939c9fcbdb9f5f39440c689912d3f637ec571913b5f4dd49c2f6d125061be6";
export const VOID_BUY_VOID_LEGACY_ALIAS_CARRIER_GENESIS_EXPECTED_EVIDENCE_ID_V1 =
  "ac7989d8200282092fdbcae7fab2fbb439b6aadfc37938eb3afa18b512b080a1";
export const VOID_BUY_VOID_LEGACY_ALIAS_CARRIER_GENESIS_EXPECTED_DURABLE_ROOT_SHA256_V1 =
  "eca28c154b89f2c93e2f56b3cb6d74e1305fb23122e0f2f73daeffee681685ac";
export const VOID_BUY_VOID_LEGACY_ALIAS_CARRIER_GENESIS_EXPECTED_POINTER_ID_V1 =
  "9729716b11e23e87a804ba07fb1b70bdc4f0d917b6b00f99dbb538e31a622167";
export const VOID_BUY_VOID_LEGACY_ALIAS_CARRIER_GENESIS_EXPECTED_ROW_SHA256_V1 =
  "5bef498d6e14b1c716e14e5472e668ae4d4308d2595d5148e22cf11563131338";

export const VOID_BUY_VOID_LEGACY_ALIAS_CARRIER_GENESIS_AUTHORITY_V1 = {
  source_only_plan: true,
  phase_b_pointer_required: true,
  phase_b_evidence_required: true,
  phase_b_durable_root_verified_at_use: true,
  current_projection_required: true,
  predecessor_projection_required: true,
  global_payment_history_projection_mutation: false,
  effective_projection_is_read_only_composition: true,
  predecessor_consumption_required: true,
  canonical_current_pool_row_required: true,
  carrier_verified_bytes_helper_used: true,
  carrier_verified_bytes_helper_mount_authority: false,
  genesis_only: true,
  previous_carrier_root_required_null: true,
  empty_index_root_required: true,
  page_set_planned_not_published: true,
  carrier_root_planned_not_published: true,
  filesystem_read: true,
  filesystem_write: false,
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
const MAX_JSON_BYTES = 128 * 1024;
const READ_FLAGS =
  fs.constants.O_RDONLY |
  ((fs.constants as any).O_NOFOLLOW || 0);

export type BuyVoidLegacyAliasCarrierGenesisPlanV1 = {
  marker: typeof VOID_BUY_VOID_LEGACY_ALIAS_CARRIER_GENESIS_V1;
  version: 1;
  migration_plan_sha256: string;
  migration_evidence_id: string;
  migration_pointer_id: string;
  segmented_durable_root_sha256: string;
  payment_key_sha256: string;
  current_projection_fingerprint_sha256: string;
  predecessor_projection_fingerprint_sha256: string;
  effective_payment_history_fingerprint_sha256: string;
  effective_lifecycle_state: "inventory_consumed";
  empty_index_root_sha256: string;
  payment_index_root_sha256: string;
  carrier_root: BuyVoidHistoryCarrierRootV1;
  tx_intent: BuyVoidHistoryCarrierTxIntentV1;
  new_page_count: number;
  new_pages: Array<{
    sha256: string;
    bytes: number;
  }>;
  page_set_sha256: string;
  attestation_plan_sha256: string;
  authority:
    typeof VOID_BUY_VOID_LEGACY_ALIAS_CARRIER_GENESIS_AUTHORITY_V1;
};

function fail(code: string, detail: string): never {
  throw new Error(
    VOID_BUY_VOID_LEGACY_ALIAS_CARRIER_GENESIS_V1 +
      ":" + code + ":" + detail,
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

function requireSha256(value: unknown, code: string): string {
  const text = String(value ?? "").trim().toLowerCase();
  if (!SHA256.test(text)) fail(code, text || "empty");
  return text;
}

function readPrivateJson(
  file: string,
  code: string,
): Record<string, any> {
  let fd: number | null = null;
  try {
    fd = fs.openSync(file, READ_FLAGS);
    const before = fs.fstatSync(fd, { bigint: true });
    if (
      !before.isFile() ||
      before.size <= 0n ||
      before.size > BigInt(MAX_JSON_BYTES) ||
      before.nlink !== 1n ||
      (before.mode & 0o077n) !== 0n ||
      (
        typeof process.getuid === "function" &&
        before.uid !== BigInt(process.getuid())
      )
    ) {
      fail(code + "_AUTHORITY_INVALID", file);
    }
    const bytes = fs.readFileSync(fd);
    const after = fs.fstatSync(fd, { bigint: true });
    if (
      before.dev !== after.dev ||
      before.ino !== after.ino ||
      before.size !== after.size ||
      before.mtimeNs !== after.mtimeNs ||
      before.ctimeNs !== after.ctimeNs ||
      BigInt(bytes.length) !== before.size
    ) {
      fail(code + "_CHANGED_DURING_READ", file);
    }
    const parsed = JSON.parse(bytes.toString("utf8"));
    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      fail(code + "_OBJECT_REQUIRED", file);
    }
    return parsed as Record<string, any>;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith(
        VOID_BUY_VOID_LEGACY_ALIAS_CARRIER_GENESIS_V1,
      )
    ) {
      throw error;
    }
    fail(
      code + "_READ_FAILED",
      String((error as Error)?.message || error).slice(0, 200),
    );
  } finally {
    if (fd !== null) fs.closeSync(fd);
  }
}

function verifyPointer(
  raw: Record<string, any>,
  expected: {
    plan_sha256: string;
    evidence_id: string;
    durable_root_sha256: string;
    pointer_id: string;
    record_sha256: string;
  },
): BuyVoidLegacyHistoryMigrationCurrentPointerV1 {
  const core = {
    marker:
      "VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_CURRENT_POINTER_V1" as const,
    version: 1 as const,
    migration_plan_sha256:
      requireSha256(
        raw.migration_plan_sha256,
        "POINTER_PLAN_SHA_INVALID",
      ),
    generation_name:
      String(raw.generation_name || ""),
    evidence_id:
      requireSha256(
        raw.evidence_id,
        "POINTER_EVIDENCE_ID_INVALID",
      ),
    durable_root_sha256:
      requireSha256(
        raw.durable_root_sha256,
        "POINTER_DURABLE_ROOT_INVALID",
      ),
    record_sha256:
      requireSha256(
        raw.record_sha256,
        "POINTER_RECORD_SHA_INVALID",
      ),
  };
  const pointerId =
    requireSha256(
      raw.pointer_id,
      "POINTER_ID_INVALID",
    );
  if (
    core.marker !== raw.marker ||
    raw.version !== 1 ||
    core.generation_name !== core.migration_plan_sha256 ||
    sha256(canonicalJson(core)) !== pointerId ||
    core.migration_plan_sha256 !== expected.plan_sha256 ||
    core.evidence_id !== expected.evidence_id ||
    core.durable_root_sha256 !==
      expected.durable_root_sha256 ||
    core.record_sha256 !== expected.record_sha256 ||
    pointerId !== expected.pointer_id
  ) {
    fail("POINTER_BINDING_INVALID", pointerId);
  }
  return {
    ...core,
    pointer_id: pointerId,
  };
}

function verifyEvidence(
  raw: Record<string, any>,
  expected: {
    plan_sha256: string;
    evidence_id: string;
    durable_root_sha256: string;
    record_sha256: string;
  },
): BuyVoidLegacyHistoryMigrationEvidenceV1 {
  const evidenceId =
    requireSha256(
      raw.evidence_id,
      "EVIDENCE_ID_INVALID",
    );
  const core = { ...raw };
  delete core.evidence_id;
  if (
    raw.marker !==
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_APPLY_V1 ||
    raw.version !== 1 ||
    raw.migration_plan_sha256 !== expected.plan_sha256 ||
    raw.evidence_id !== expected.evidence_id ||
    raw.durable_root_sha256 !==
      expected.durable_root_sha256 ||
    raw.canonical_jsonl_row_sha256 !==
      expected.record_sha256 ||
    raw.lineage_mode !==
      "legacy_pool_consumed_current_pool_alias" ||
    raw.legacy_pool_id !==
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_PREDECESSOR_POOL_ID_V1 ||
    canonicalJson(raw.authority) !==
      canonicalJson(
        VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_APPLY_AUTHORITY_V1,
      ) ||
    sha256(canonicalJson(core)) !== evidenceId
  ) {
    fail("EVIDENCE_BINDING_INVALID", evidenceId);
  }
  return raw as BuyVoidLegacyHistoryMigrationEvidenceV1;
}

function effectiveFingerprint(
  current: BuyVoidPaymentHistoryProjectionV1,
  predecessor: BuyVoidPaymentHistoryProjectionV1,
): string {
  if (
    current.marker !==
      VOID_BUY_VOID_PAYMENT_HISTORY_PROJECTION_V1 ||
    current.lifecycle_state !==
      "confirmed_pending_closeout" ||
    current.closeout !== null ||
    predecessor.lifecycle_state !== "inventory_consumed" ||
    !predecessor.closeout ||
    current.payment_key_sha256 !==
      predecessor.payment_key_sha256 ||
    current.attempt_count !== 1 ||
    predecessor.attempt_count !== 1 ||
    canonicalJson(current.attempts) !==
      canonicalJson(predecessor.attempts)
  ) {
    fail(
      "EFFECTIVE_PROJECTION_INPUT_INVALID",
      current.payment_key_sha256,
    );
  }

  const core = {
    marker: current.marker,
    version: current.version,
    pool_id: current.pool_id,
    payment_key_sha256:
      current.payment_key_sha256,
    request_key_sha256:
      current.request_key_sha256,
    canonical_payment_identity:
      current.canonical_payment_identity,
    request_id: current.request_id,
    instruction_id: current.instruction_id,
    delivery_address: current.delivery_address,
    void_amount_units: current.void_amount_units,
    intent_record_sha256:
      current.intent_record_sha256,
    primary_kind: current.primary_kind,
    primary_record_id:
      current.primary_record_id,
    primary_record_sha256:
      current.primary_record_sha256,
    attempt_slots_checked:
      current.attempt_slots_checked,
    attempt_count: current.attempt_count,
    attempts: current.attempts,
    closeout: predecessor.closeout,
    lifecycle_state: "inventory_consumed" as const,
  };
  return sha256(canonicalJson(core));
}

export function planBuyVoidLegacyAliasCarrierGenesisFromRootV1(
  input: {
    runtime_root: string;
    pool_id: string;
    expected_migration_plan_sha256: string;
    expected_migration_evidence_id: string;
    expected_segmented_durable_root_sha256: string;
    expected_current_pointer_id: string;
    expected_record_sha256: string;
  },
): BuyVoidLegacyAliasCarrierGenesisPlanV1 {
  const runtimeRoot =
    path.resolve(String(input.runtime_root || ""));
  const poolId = String(input.pool_id || "").trim();
  const expectedPlan =
    requireSha256(
      input.expected_migration_plan_sha256,
      "EXPECTED_PLAN_SHA_INVALID",
    );
  const expectedEvidence =
    requireSha256(
      input.expected_migration_evidence_id,
      "EXPECTED_EVIDENCE_ID_INVALID",
    );
  const expectedDurable =
    requireSha256(
      input.expected_segmented_durable_root_sha256,
      "EXPECTED_DURABLE_ROOT_INVALID",
    );
  const expectedPointer =
    requireSha256(
      input.expected_current_pointer_id,
      "EXPECTED_POINTER_ID_INVALID",
    );
  const expectedRecord =
    requireSha256(
      input.expected_record_sha256,
      "EXPECTED_RECORD_SHA_INVALID",
    );

  const phaseA =
    planBuyVoidLegacyHistoryMigrationFromRootV1({
      runtime_root: runtimeRoot,
      pool_id: poolId,
    });
  if (
    phaseA.migration_plan_sha256 !== expectedPlan ||
    phaseA.lineage_mode !==
      "legacy_pool_consumed_current_pool_alias" ||
    phaseA.lifecycle_state !==
      "legacy_pool_consumed_alias" ||
    phaseA.legacy_pool_id !==
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_PREDECESSOR_POOL_ID_V1 ||
    phaseA.canonical_jsonl_row_sha256 !==
      expectedRecord
  ) {
    fail(
      "PHASE_A_REVALIDATION_MISMATCH",
      phaseA.migration_plan_sha256,
    );
  }

  const historyRoot =
    path.join(
      runtimeRoot,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_STORE_ROOT_NAME_V1,
    );
  const pointer =
    verifyPointer(
      readPrivateJson(
        path.join(
          historyRoot,
          VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_CURRENT_POINTER_NAME_V1,
        ),
        "CURRENT_POINTER",
      ),
      {
        plan_sha256: expectedPlan,
        evidence_id: expectedEvidence,
        durable_root_sha256: expectedDurable,
        pointer_id: expectedPointer,
        record_sha256: expectedRecord,
      },
    );

  const generationRoot =
    path.join(
      historyRoot,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_GENERATIONS_NAME_V1,
      expectedPlan,
    );
  const evidence =
    verifyEvidence(
      readPrivateJson(
        path.join(
          generationRoot,
          VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_EVIDENCE_NAME_V1,
        ),
        "MIGRATION_EVIDENCE",
      ),
      {
        plan_sha256: expectedPlan,
        evidence_id: expectedEvidence,
        durable_root_sha256: expectedDurable,
        record_sha256: expectedRecord,
      },
    );

  if (
    evidence.current_pool_id !== poolId ||
    evidence.payment_key_sha256 !==
      phaseA.payment_key_sha256 ||
    evidence.current_primary_record_id !==
      phaseA.primary_record_id ||
    evidence.current_primary_record_journal_sha256 !==
      phaseA.primary_record_journal_sha256 ||
    evidence.current_primary_record_fingerprint_sha256 !==
      phaseA.primary_record_fingerprint_sha256 ||
    evidence.legacy_primary_record_id !==
      phaseA.legacy_primary_record_id ||
    evidence.legacy_primary_record_journal_sha256 !==
      phaseA.legacy_primary_record_journal_sha256 ||
    evidence.legacy_primary_record_fingerprint_sha256 !==
      phaseA.legacy_primary_record_fingerprint_sha256 ||
    evidence.legacy_pool_alias_fingerprint_sha256 !==
      phaseA.legacy_pool_alias_fingerprint_sha256 ||
    evidence.execution_attempt_id !==
      phaseA.execution_attempt_id ||
    evidence.execution_attempt_state_fingerprint_sha256 !==
      phaseA.execution_attempt_state_fingerprint_sha256 ||
    evidence.inventory_consumption_id !==
      phaseA.inventory_consumption_id ||
    evidence.inventory_consumption_fingerprint_sha256 !==
      phaseA.inventory_consumption_fingerprint_sha256 ||
    evidence.inventory_consumption_record_sha256 !==
      phaseA.inventory_consumption_record_sha256 ||
    evidence.canonical_jsonl_row_bytes !==
      phaseA.canonical_jsonl_row_bytes ||
    evidence.record_locator.record_sha256 !== expectedRecord ||
    pointer.evidence_id !== evidence.evidence_id
  ) {
    fail("PHASE_B_EVIDENCE_PHASE_A_MISMATCH", expectedEvidence);
  }

  const current =
    projectBuyVoidPaymentHistoryV1({
      root_dir: runtimeRoot,
      pool_id: poolId,
      payment_key_sha256:
        phaseA.payment_key_sha256,
    });
  const predecessor =
    projectBuyVoidPaymentHistoryV1({
      root_dir: runtimeRoot,
      pool_id:
        VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_PREDECESSOR_POOL_ID_V1,
      payment_key_sha256:
        phaseA.payment_key_sha256,
    });
  if (
    current.payment_history_fingerprint_sha256 !==
      phaseA.payment_history_fingerprint_sha256 ||
    predecessor.payment_history_fingerprint_sha256 !==
      phaseA.legacy_payment_history_fingerprint_sha256 ||
    current.primary_record_id !==
      phaseA.primary_record_id ||
    predecessor.primary_record_id !==
      phaseA.legacy_primary_record_id ||
    !predecessor.closeout ||
    predecessor.closeout.consumption_id !==
      phaseA.inventory_consumption_id
  ) {
    fail(
      "PROJECTION_PHASE_A_MISMATCH",
      phaseA.payment_key_sha256,
    );
  }

  const effectiveHistoryFingerprint =
    effectiveFingerprint(current, predecessor);

  const storeRoot =
    path.join(
      generationRoot,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_STORE_NAME_V1,
    );
  const materializedFile =
    path.join(
      generationRoot,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_MATERIALIZED_NAME_V1,
    );
  const durableRootDirectory =
    path.join(
      generationRoot,
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_DURABLE_ROOT_NAME_V1,
    );

  const manifest =
    readSegmentedJsonlManifestV1(storeRoot);
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
    durableRoot.root_sha256 !== expectedDurable ||
    durableRoot.root_sha256 !==
      evidence.durable_root_sha256 ||
    durableRoot.store_generation !== 1 ||
    durableRoot.manifest_sha256 !==
      evidence.manifest_sha256 ||
    durableRoot.snapshot_sha256 !==
      evidence.snapshot_sha256 ||
    durableRoot.checkpoint_sha256 !==
      evidence.checkpoint_sha256 ||
    durableRoot.materialized_authority_sha256 !==
      evidence.materialized_authority_sha256 ||
    durableRoot.materialized_sha256 !==
      evidence.materialized_sha256 ||
    materialized.authority_sha256 !==
      evidence.materialized_authority_sha256
  ) {
    fail("DURABLE_ROOT_EVIDENCE_MISMATCH", expectedDurable);
  }

  const offset =
    Number(BigInt(evidence.record_locator.byte_offset));
  if (
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    evidence.record_locator.byte_length <= 0
  ) {
    fail(
      "RECORD_LOCATOR_RANGE_INVALID",
      String(evidence.record_locator.byte_offset),
    );
  }
  const recordBytes =
    verifySegmentedJsonlDurableRootMaterializedAtUseV1(
      durableRootDirectory,
      storeRoot,
      materializedFile,
      materialized,
      expectedDurable,
      (reader) =>
        reader.read(
          offset,
          evidence.record_locator.byte_length,
        ),
    );
  if (
    sha256(recordBytes) !== expectedRecord ||
    recordBytes.length !==
      phaseA.canonical_jsonl_row_bytes
  ) {
    fail("CURRENT_ROW_READBACK_MISMATCH", expectedRecord);
  }

  const parsed =
    JSON.parse(
      recordBytes
        .subarray(0, recordBytes.length - 1)
        .toString("utf8"),
    ) as Record<string, unknown>;
  if (
    canonicalJson(parsed) !==
      canonicalJson(current.primary_record)
  ) {
    fail(
      "CURRENT_ROW_PRIMARY_RECORD_MISMATCH",
      phaseA.primary_record_id,
    );
  }

  const empty =
    createEmptyBuyVoidHistoryIndexV1();
  const carrier =
    planBuyVoidHistoryCarrierCommitFromVerifiedBytesV1({
      previous_carrier_root: null,
      current_index_root_sha256:
        empty.root_sha256,
      segmented_durable_root: durableRoot,
      pool_id: poolId,
      payment_history_fingerprint_sha256:
        effectiveHistoryFingerprint,
      record: current.primary_record,
      record_locator: evidence.record_locator,
      record_bytes: recordBytes,
      read_page: (digest) => {
        if (digest !== empty.root_sha256) {
          fail("UNEXPECTED_GENESIS_PAGE_READ", digest);
        }
        return empty.page;
      },
    });
  if (carrier.status !== "planned") {
    fail(
      "GENESIS_CARRIER_PLAN_REQUIRED",
      carrier.status,
    );
  }

  const newPages =
    carrier.new_pages
      .map((page) => ({
        sha256: page.sha256,
        bytes: page.bytes.length,
      }))
      .sort((left, right) =>
        left.sha256.localeCompare(right.sha256),
      );
  const pageSetSha =
    sha256(canonicalJson(newPages));

  const core = {
    marker:
      VOID_BUY_VOID_LEGACY_ALIAS_CARRIER_GENESIS_V1 as
        typeof VOID_BUY_VOID_LEGACY_ALIAS_CARRIER_GENESIS_V1,
    version: 1 as const,
    migration_plan_sha256: expectedPlan,
    migration_evidence_id: expectedEvidence,
    migration_pointer_id: expectedPointer,
    segmented_durable_root_sha256: expectedDurable,
    payment_key_sha256:
      phaseA.payment_key_sha256,
    current_projection_fingerprint_sha256:
      current.payment_history_fingerprint_sha256,
    predecessor_projection_fingerprint_sha256:
      predecessor.payment_history_fingerprint_sha256,
    effective_payment_history_fingerprint_sha256:
      effectiveHistoryFingerprint,
    effective_lifecycle_state:
      "inventory_consumed" as const,
    empty_index_root_sha256:
      empty.root_sha256,
    payment_index_root_sha256:
      carrier.index_root_sha256,
    carrier_root:
      carrier.carrier_root,
    tx_intent:
      carrier.tx_intent,
    new_page_count:
      newPages.length,
    new_pages: newPages,
    page_set_sha256:
      pageSetSha,
  };
  return {
    ...core,
    attestation_plan_sha256:
      sha256(canonicalJson(core)),
    authority:
      VOID_BUY_VOID_LEGACY_ALIAS_CARRIER_GENESIS_AUTHORITY_V1,
  };
}

export function planBuyVoidProductionLegacyAliasCarrierGenesisV1():
  BuyVoidLegacyAliasCarrierGenesisPlanV1 {
  return planBuyVoidLegacyAliasCarrierGenesisFromRootV1({
    runtime_root:
      VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_CENSUS_RUNTIME_ROOT_V1,
    pool_id:
      VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_CENSUS_POOL_ID_V1,
    expected_migration_plan_sha256:
      VOID_BUY_VOID_LEGACY_ALIAS_CARRIER_GENESIS_EXPECTED_PLAN_SHA256_V1,
    expected_migration_evidence_id:
      VOID_BUY_VOID_LEGACY_ALIAS_CARRIER_GENESIS_EXPECTED_EVIDENCE_ID_V1,
    expected_segmented_durable_root_sha256:
      VOID_BUY_VOID_LEGACY_ALIAS_CARRIER_GENESIS_EXPECTED_DURABLE_ROOT_SHA256_V1,
    expected_current_pointer_id:
      VOID_BUY_VOID_LEGACY_ALIAS_CARRIER_GENESIS_EXPECTED_POINTER_ID_V1,
    expected_record_sha256:
      VOID_BUY_VOID_LEGACY_ALIAS_CARRIER_GENESIS_EXPECTED_ROW_SHA256_V1,
  });
}
