import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  VOID_BUY_VOID_HISTORY_CARRIER_ACTIVE_SEGMENT_ID_V1,
} from "./buy_void_history_carrier_v1.js";
import {
  projectBuyVoidPaymentHistoryV1,
  type BuyVoidPaymentHistoryProjectionV1,
} from "./buy_void_payment_history_projection_v1.js";
import {
  VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_CENSUS_MAX_RECORD_BYTES_V1,
  VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_CENSUS_POOL_ID_V1,
  VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_CENSUS_RUNTIME_ROOT_V1,
  observeBuyVoidProductionHistoryCarrierCensusFromRootV1,
} from "./buy_void_production_history_carrier_census_v1.js";
import {
  VOID_SEGMENTED_JSONL_DEFAULT_TARGET_BYTES_V1,
  VOID_SEGMENTED_JSONL_DEFAULT_MAX_RECORD_BYTES_V1,
} from "../storage/segmented_jsonl_v1.js";

export const VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_PLAN_V1 =
  "VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_PLAN_V1";

export const VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_PREDECESSOR_POOL_ID_V1 =
  "void-presale-mainnet0-v1";

export const VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_ALIAS_ALLOWED_DIFFERENCES_V1 =
  [
    "reservation_id",
    "pool_id",
    "inventory_policy_version",
  ] as const;

export const VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_PLAN_AUTHORITY_V1 = {
  source_only_plan: true,
  canonical_production_runtime_root_fixed: true,
  canonical_pool_id_fixed: true,
  census_shape_required: true,
  stable_census_before_after_required: true,
  bounded_payment_projection_required: true,
  exactly_one_reservation_required: true,
  direct_inventory_consumed_or_exact_legacy_pool_alias_required: true,
  predecessor_pool_id_fixed: true,
  cross_pool_alias_primary_equivalence_required: true,
  cross_pool_alias_consumption_revalidated: true,
  global_payment_history_projection_mutation: false,
  exact_one_attempt_required: true,
  confirmed_attempt_required: true,
  primary_record_canonicalized: true,
  proposed_segment_generation: 1,
  proposed_segment_target_bytes:
    VOID_SEGMENTED_JSONL_DEFAULT_TARGET_BYTES_V1,
  proposed_max_record_bytes:
    VOID_SEGMENTED_JSONL_DEFAULT_MAX_RECORD_BYTES_V1,
  proposed_active_segment_id:
    VOID_BUY_VOID_HISTORY_CARRIER_ACTIVE_SEGMENT_ID_V1,
  filesystem_content_read: true,
  filesystem_write: false,
  segmented_store_write: false,
  segmented_durable_root_claimed: false,
  carrier_root_claimed: false,
  legacy_journal_mutation: false,
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

const HEX_JSON = /^([0-9a-f]{64})\.json$/u;

export type BuyVoidLegacyHistoryMigrationPlanV1 = {
  marker: typeof VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_PLAN_V1;
  version: 1;
  runtime_root: string;
  pool_id: string;
  lineage_mode:
    | "direct_current_pool_consumption"
    | "legacy_pool_consumed_current_pool_alias";
  legacy_pool_id: string | null;
  payment_key_sha256: string;
  primary_record_id: string;
  primary_record_journal_sha256: string;
  primary_record_fingerprint_sha256: string;
  payment_history_fingerprint_sha256: string;
  legacy_primary_record_id: string | null;
  legacy_primary_record_journal_sha256: string | null;
  legacy_primary_record_fingerprint_sha256: string | null;
  legacy_payment_history_fingerprint_sha256: string | null;
  legacy_pool_alias_fingerprint_sha256: string | null;
  lifecycle_state:
    | "inventory_consumed"
    | "legacy_pool_consumed_alias";
  execution_attempt_id: string;
  execution_attempt_state_fingerprint_sha256: string;
  inventory_consumption_id: string;
  inventory_consumption_fingerprint_sha256: string;
  inventory_consumption_record_sha256: string;
  void_delivery_tx_hash: string;
  void_amount_units: string;
  canonical_jsonl_payload_bytes: number;
  canonical_jsonl_row_bytes: number;
  canonical_jsonl_row_sha256: string;
  proposed_segment_generation: 1;
  proposed_segment_target_bytes: number;
  proposed_max_record_bytes: number;
  proposed_active_segment_id:
    typeof VOID_BUY_VOID_HISTORY_CARRIER_ACTIVE_SEGMENT_ID_V1;
  proposed_active_segment_sha256: string;
  proposed_record_byte_offset: "0";
  proposed_record_byte_length: number;
  proposed_record_sha256: string;
  segmented_durable_root_sha256: null;
  carrier_root_sha256: null;
  migration_plan_sha256: string;
  authority:
    typeof VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_PLAN_AUTHORITY_V1;
};

function fail(code: string, detail: string): never {
  throw new Error(
    VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_PLAN_V1 +
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

function canonicalPlanSha256(
  value: Omit<
    BuyVoidLegacyHistoryMigrationPlanV1,
    "migration_plan_sha256" | "authority"
  >,
): string {
  return sha256(canonicalJson(value));
}

function requirePrivateDirectFile(
  file: string,
  label: string,
): fs.Stats {
  const metadata = fs.lstatSync(file);
  if (
    !metadata.isFile() ||
    metadata.isSymbolicLink() ||
    metadata.nlink !== 1 ||
    metadata.size < 1 ||
    metadata.size >
      VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_CENSUS_MAX_RECORD_BYTES_V1 ||
    (metadata.mode & 0o077) !== 0 ||
    (
      typeof process.getuid === "function" &&
      metadata.uid !== process.getuid()
    )
  ) {
    fail(label + "_FILE_AUTHORITY_INVALID", path.basename(file));
  }
  return metadata;
}

function exactSolePaymentKey(runtimeRoot: string): string {
  const directory = path.join(
    runtimeRoot,
    "buy-void-auto-fulfillment-v1",
    "payments",
  );
  const metadata = fs.lstatSync(directory);
  if (
    !metadata.isDirectory() ||
    metadata.isSymbolicLink() ||
    (metadata.mode & 0o077) !== 0 ||
    (
      typeof process.getuid === "function" &&
      metadata.uid !== process.getuid()
    )
  ) {
    fail("PAYMENTS_DIRECTORY_AUTHORITY_INVALID", directory);
  }

  let count = 0;
  let paymentKey = "";
  const handle = fs.opendirSync(directory);
  try {
    for (;;) {
      const entry = handle.readSync();
      if (!entry) break;
      count += 1;
      if (count > 1) {
        fail("PAYMENT_COUNT_NOT_ONE", String(count));
      }
      const match = HEX_JSON.exec(entry.name);
      if (
        !match ||
        !entry.isFile() ||
        entry.isSymbolicLink()
      ) {
        fail("PAYMENT_ENTRY_INVALID", entry.name);
      }
      requirePrivateDirectFile(
        path.join(directory, entry.name),
        "PAYMENT",
      );
      paymentKey = match[1];
    }
  } finally {
    handle.closeSync();
  }
  if (count !== 1 || !paymentKey) {
    fail("PAYMENT_COUNT_NOT_ONE", String(count));
  }
  return paymentKey;
}

function primaryAliasComparableCanonical(
  record: BuyVoidPaymentHistoryProjectionV1["primary_record"],
): string {
  const comparable = {
    ...(record as Record<string, unknown>),
  };
  for (const key of
    VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_ALIAS_ALLOWED_DIFFERENCES_V1) {
    delete comparable[key];
  }
  return canonicalJson(comparable);
}

function legacyAliasFingerprint(input: {
  current_projection: BuyVoidPaymentHistoryProjectionV1;
  legacy_projection: BuyVoidPaymentHistoryProjectionV1;
}): string {
  const current = input.current_projection;
  const legacy = input.legacy_projection;
  const attempt = current.attempts[0];
  const closeout = legacy.closeout!;
  return sha256(
    canonicalJson({
      marker:
        "VOID_BUY_VOID_LEGACY_HISTORY_POOL_ALIAS_V1",
      current_pool_id: current.pool_id,
      legacy_pool_id: legacy.pool_id,
      payment_key_sha256: current.payment_key_sha256,
      current_primary_record_id: current.primary_record_id,
      current_primary_record_sha256:
        current.primary_record_sha256,
      legacy_primary_record_id: legacy.primary_record_id,
      legacy_primary_record_sha256:
        legacy.primary_record_sha256,
      execution_attempt_id: attempt.attempt_id,
      execution_attempt_state_fingerprint_sha256:
        attempt.attempt_state_fingerprint_sha256,
      legacy_inventory_consumption_id:
        closeout.consumption_id,
      legacy_inventory_consumption_fingerprint_sha256:
        closeout.consumption_fingerprint_sha256,
      legacy_inventory_consumption_record_sha256:
        closeout.closeout_record_sha256,
    }),
  );
}

function derivePlanFromProjection(
  runtimeRoot: string,
  poolId: string,
  projection: BuyVoidPaymentHistoryProjectionV1,
): BuyVoidLegacyHistoryMigrationPlanV1 {
  if (
    projection.pool_id !== poolId ||
    projection.primary_kind !== "reservation" ||
    projection.attempt_count !== 1 ||
    projection.attempts.length !== 1 ||
    projection.attempts[0].status !== "confirmed"
  ) {
    fail(
      "PRODUCTION_LIFECYCLE_NOT_SINGLE_CONFIRMED_RESERVATION",
      projection.payment_key_sha256,
    );
  }

  const currentAttempt = projection.attempts[0];
  let lineageMode:
    BuyVoidLegacyHistoryMigrationPlanV1["lineage_mode"];
  let lifecycleState:
    BuyVoidLegacyHistoryMigrationPlanV1["lifecycle_state"];
  let closeout = projection.closeout;
  let legacyProjection:
    BuyVoidPaymentHistoryProjectionV1 | null = null;
  let legacyAliasSha: string | null = null;

  if (
    projection.lifecycle_state === "inventory_consumed" &&
    projection.closeout
  ) {
    lineageMode = "direct_current_pool_consumption";
    lifecycleState = "inventory_consumed";
  } else {
    if (
      projection.lifecycle_state !==
        "confirmed_pending_closeout" ||
      projection.closeout !== null
    ) {
      fail(
        "CURRENT_POOL_ALIAS_SHAPE_INVALID",
        projection.payment_key_sha256,
      );
    }

    try {
      legacyProjection =
        projectBuyVoidPaymentHistoryV1({
          root_dir: runtimeRoot,
          pool_id:
            VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_PREDECESSOR_POOL_ID_V1,
          payment_key_sha256:
            projection.payment_key_sha256,
        });
    } catch (error) {
      fail(
        "LEGACY_POOL_ALIAS_PROJECTION_INVALID",
        String((error as Error)?.message || error).slice(0, 240),
      );
    }

    if (
      legacyProjection.pool_id !==
        VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_PREDECESSOR_POOL_ID_V1 ||
      legacyProjection.payment_key_sha256 !==
        projection.payment_key_sha256 ||
      legacyProjection.primary_kind !== "reservation" ||
      legacyProjection.lifecycle_state !== "inventory_consumed" ||
      legacyProjection.attempt_count !== 1 ||
      legacyProjection.attempts.length !== 1 ||
      legacyProjection.attempts[0].status !== "confirmed" ||
      !legacyProjection.closeout
    ) {
      fail(
        "LEGACY_POOL_ALIAS_LIFECYCLE_INVALID",
        projection.payment_key_sha256,
      );
    }

    const legacyAttempt = legacyProjection.attempts[0];
    if (
      legacyAttempt.attempt_id !== currentAttempt.attempt_id ||
      legacyAttempt.attempt_number !==
        currentAttempt.attempt_number ||
      legacyAttempt.attempt_state_fingerprint_sha256 !==
        currentAttempt.attempt_state_fingerprint_sha256 ||
      legacyAttempt.confirmation_transaction_hash !==
        currentAttempt.confirmation_transaction_hash ||
      primaryAliasComparableCanonical(
        legacyProjection.primary_record,
      ) !==
        primaryAliasComparableCanonical(
          projection.primary_record,
        )
    ) {
      fail(
        "LEGACY_POOL_ALIAS_PRIMARY_MISMATCH",
        projection.payment_key_sha256,
      );
    }

    const currentPrimary =
      projection.primary_record as Record<string, unknown>;
    const legacyPrimary =
      legacyProjection.primary_record as Record<string, unknown>;
    if (
      String(currentPrimary.pool_id || "") !== poolId ||
      String(legacyPrimary.pool_id || "") !==
        VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_PREDECESSOR_POOL_ID_V1 ||
      projection.primary_record_id ===
        legacyProjection.primary_record_id
    ) {
      fail(
        "LEGACY_POOL_ALIAS_IDENTITY_INVALID",
        projection.payment_key_sha256,
      );
    }

    closeout = legacyProjection.closeout;
    if (
      closeout.execution_attempt_id !==
        currentAttempt.attempt_id ||
      closeout.void_delivery_tx_hash !==
        currentAttempt.confirmation_transaction_hash ||
      closeout.consumed_void_units !==
        projection.void_amount_units
    ) {
      fail(
        "LEGACY_POOL_ALIAS_CONSUMPTION_INVALID",
        projection.payment_key_sha256,
      );
    }

    lineageMode =
      "legacy_pool_consumed_current_pool_alias";
    lifecycleState = "legacy_pool_consumed_alias";
    legacyAliasSha = legacyAliasFingerprint({
      current_projection: projection,
      legacy_projection: legacyProjection,
    });
  }

  if (!closeout) {
    fail(
      "PRODUCTION_CLOSEOUT_REQUIRED",
      projection.payment_key_sha256,
    );
  }
  if (
    currentAttempt.attempt_number !== 1 ||
    currentAttempt.attempt_id !==
      closeout.execution_attempt_id ||
    currentAttempt.confirmation_transaction_hash !==
      closeout.void_delivery_tx_hash ||
    closeout.consumed_void_units !==
      projection.void_amount_units
  ) {
    fail(
      "PRODUCTION_LIFECYCLE_BINDING_INVALID",
      projection.payment_key_sha256,
    );
  }

  const payload = Buffer.from(
    canonicalJson(projection.primary_record),
    "utf8",
  );
  if (
    payload.length < 1 ||
    payload.length >
      VOID_SEGMENTED_JSONL_DEFAULT_MAX_RECORD_BYTES_V1
  ) {
    fail(
      "CANONICAL_PRIMARY_RECORD_SIZE_INVALID",
      String(payload.length),
    );
  }
  const row = Buffer.concat([payload, Buffer.from("\n", "utf8")]);
  const primaryCanonicalSha = sha256(payload);
  const rowSha = sha256(row);
  const legacyPrimaryCanonicalSha =
    legacyProjection
      ? sha256(canonicalJson(legacyProjection.primary_record))
      : null;

  const core = {
    marker:
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_PLAN_V1 as
        typeof VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_PLAN_V1,
    version: 1 as const,
    runtime_root: runtimeRoot,
    pool_id: poolId,
    lineage_mode: lineageMode,
    legacy_pool_id:
      legacyProjection
        ? VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_PREDECESSOR_POOL_ID_V1
        : null,
    payment_key_sha256: projection.payment_key_sha256,
    primary_record_id: projection.primary_record_id,
    primary_record_journal_sha256:
      projection.primary_record_sha256,
    primary_record_fingerprint_sha256:
      primaryCanonicalSha,
    payment_history_fingerprint_sha256:
      projection.payment_history_fingerprint_sha256,
    legacy_primary_record_id:
      legacyProjection?.primary_record_id ?? null,
    legacy_primary_record_journal_sha256:
      legacyProjection?.primary_record_sha256 ?? null,
    legacy_primary_record_fingerprint_sha256:
      legacyPrimaryCanonicalSha,
    legacy_payment_history_fingerprint_sha256:
      legacyProjection?.payment_history_fingerprint_sha256 ??
      null,
    legacy_pool_alias_fingerprint_sha256:
      legacyAliasSha,
    lifecycle_state: lifecycleState,
    execution_attempt_id: currentAttempt.attempt_id,
    execution_attempt_state_fingerprint_sha256:
      currentAttempt.attempt_state_fingerprint_sha256,
    inventory_consumption_id: closeout.consumption_id,
    inventory_consumption_fingerprint_sha256:
      closeout.consumption_fingerprint_sha256,
    inventory_consumption_record_sha256:
      closeout.closeout_record_sha256,
    void_delivery_tx_hash: closeout.void_delivery_tx_hash,
    void_amount_units: projection.void_amount_units,
    canonical_jsonl_payload_bytes: payload.length,
    canonical_jsonl_row_bytes: row.length,
    canonical_jsonl_row_sha256: rowSha,
    proposed_segment_generation: 1 as const,
    proposed_segment_target_bytes:
      VOID_SEGMENTED_JSONL_DEFAULT_TARGET_BYTES_V1,
    proposed_max_record_bytes:
      VOID_SEGMENTED_JSONL_DEFAULT_MAX_RECORD_BYTES_V1,
    proposed_active_segment_id:
      VOID_BUY_VOID_HISTORY_CARRIER_ACTIVE_SEGMENT_ID_V1 as
        typeof VOID_BUY_VOID_HISTORY_CARRIER_ACTIVE_SEGMENT_ID_V1,
    proposed_active_segment_sha256: rowSha,
    proposed_record_byte_offset: "0" as const,
    proposed_record_byte_length: row.length,
    proposed_record_sha256: rowSha,
    segmented_durable_root_sha256: null,
    carrier_root_sha256: null,
  };
  return {
    ...core,
    migration_plan_sha256:
      canonicalPlanSha256(core),
    authority:
      VOID_BUY_VOID_LEGACY_HISTORY_MIGRATION_PLAN_AUTHORITY_V1,
  };
}

export function planBuyVoidLegacyHistoryMigrationFromRootV1(input: {
  runtime_root: string;
  pool_id: string;
}): BuyVoidLegacyHistoryMigrationPlanV1 {
  const runtimeRoot = path.resolve(String(input.runtime_root || ""));
  const poolId = String(input.pool_id || "").trim();
  const census =
    observeBuyVoidProductionHistoryCarrierCensusFromRootV1({
      runtime_root: runtimeRoot,
      pool_id: poolId,
    });
  const counts = new Map(
    census.directories.map((entry) => [
      entry.label,
      entry.entry_count,
    ]),
  );
  const exactShape =
    census.history_state === "materialization_required" &&
    census.carrier_root_sha256 === null &&
    census.total_history_entries === 4 &&
    counts.get("PAYMENTS") === 1 &&
    counts.get("RESERVATIONS") === 1 &&
    counts.get("OBLIGATIONS") === 0 &&
    counts.get("EXECUTION_ATTEMPTS") === 1 &&
    counts.get("INVENTORY_CONSUMPTIONS") === 1 &&
    counts.get("TERMINAL_CLOSEOUT_PLANS") === 0 &&
    counts.get("FULFILLMENT_SAGAS") === 0;
  if (!exactShape) {
    fail(
      "CENSUS_SHAPE_MISMATCH",
      census.history_state + ":" + String(census.total_history_entries),
    );
  }

  const paymentKey = exactSolePaymentKey(runtimeRoot);
  const projection =
    projectBuyVoidPaymentHistoryV1({
      root_dir: runtimeRoot,
      pool_id: poolId,
      payment_key_sha256: paymentKey,
    });
  if (projection.payment_key_sha256 !== paymentKey) {
    fail("PAYMENT_KEY_PROJECTION_MISMATCH", paymentKey);
  }
  const censusAfter =
    observeBuyVoidProductionHistoryCarrierCensusFromRootV1({
      runtime_root: runtimeRoot,
      pool_id: poolId,
    });
  if (canonicalJson(census) !== canonicalJson(censusAfter)) {
    fail(
      "CENSUS_CHANGED_DURING_PLAN",
      paymentKey,
    );
  }
  return derivePlanFromProjection(
    runtimeRoot,
    poolId,
    projection,
  );
}

export function planBuyVoidProductionLegacyHistoryMigrationV1():
  BuyVoidLegacyHistoryMigrationPlanV1 {
  return planBuyVoidLegacyHistoryMigrationFromRootV1({
    runtime_root:
      VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_CENSUS_RUNTIME_ROOT_V1,
    pool_id:
      VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_CENSUS_POOL_ID_V1,
  });
}
