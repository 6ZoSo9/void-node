import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  VOID_BUY_VOID_FULFILLMENT_JOURNAL_V1,
  type BuyVoidFulfillmentJournalIntentV1,
} from "./buy_void_fulfillment_journal_v1.js";

export const VOID_BUY_VOID_INVENTORY_RESERVATION_JOURNAL_V1 =
  "VOID_BUY_VOID_INVENTORY_RESERVATION_JOURNAL_V1";

export const VOID_BUY_VOID_PAID_UNRESERVABLE_OBLIGATION_V1 =
  "VOID_BUY_VOID_PAID_UNRESERVABLE_OBLIGATION_V1";

export const VOID_BUY_VOID_INVENTORY_HISTORY_EXPECTATION_V1 =
  "VOID_BUY_VOID_INVENTORY_HISTORY_EXPECTATION_V1";

type BuyVoidInventoryHistoryKindV1 =
  | "reservation"
  | "paid_unreservable_obligation";

type BuyVoidInventoryHistoryExpectationV1 = {
  schema: "void_buy_void_inventory_history_expectation_v1";
  marker: typeof VOID_BUY_VOID_INVENTORY_HISTORY_EXPECTATION_V1;
  kind: BuyVoidInventoryHistoryKindV1;
  pool_id: string;
  record_id: string;
  record_identity_fingerprint_sha256: string;
};

export const VOID_BUY_VOID_INVENTORY_HISTORY_INDEX_V1 =
  "VOID_BUY_VOID_INVENTORY_HISTORY_INDEX_V1";

type BuyVoidInventoryHistoryIndexEntryV1 = {
  schema: "void_buy_void_inventory_history_index_entry_v1";
  marker: typeof VOID_BUY_VOID_INVENTORY_HISTORY_INDEX_V1;
  sequence: number;
  kind: BuyVoidInventoryHistoryKindV1;
  pool_id: string;
  record_id: string;
  record_identity_fingerprint_sha256: string;
  previous_entry_sha256: string;
  entry_sha256: string;
};

export const VOID_BUY_VOID_INVENTORY_HISTORY_ANCHOR_V1 =
  "VOID_BUY_VOID_INVENTORY_HISTORY_ANCHOR_V1";
export const VOID_BUY_VOID_INVENTORY_HISTORY_PENDING_CREATION_V1 =
  "VOID_BUY_VOID_INVENTORY_HISTORY_PENDING_CREATION_V1";
export const VOID_BUY_VOID_INVENTORY_POOL_LOCK_V1 =
  "VOID_BUY_VOID_INVENTORY_POOL_LOCK_V1";
const VOID_BUY_VOID_INVENTORY_POOL_LOCK_RELEASE_V1 =
  "VOID_BUY_VOID_INVENTORY_POOL_LOCK_RELEASE_V1";

type BuyVoidInventoryHistoryAnchorEntryV1 = {
  schema: "void_buy_void_inventory_history_anchor_entry_v1";
  marker: typeof VOID_BUY_VOID_INVENTORY_HISTORY_ANCHOR_V1;
  sequence: number;
  kind: BuyVoidInventoryHistoryKindV1;
  pool_id: string;
  record_id: string;
  record_identity_fingerprint_sha256: string;
  history_index_entry_sha256: string;
  previous_anchor_sha256: string;
  anchor_sha256: string;
};

type BuyVoidInventoryHistoryRecordV1 =
  | BuyVoidInventoryReservationV1
  | BuyVoidPaidUnreservableObligationV1;

type BuyVoidInventoryHistoryPendingCreationV1 = {
  schema: "void_buy_void_inventory_history_pending_creation_v1";
  marker: typeof VOID_BUY_VOID_INVENTORY_HISTORY_PENDING_CREATION_V1;
  kind: BuyVoidInventoryHistoryKindV1;
  pool_id: string;
  record_id: string;
  record_identity_fingerprint_sha256: string;
  record: BuyVoidInventoryHistoryRecordV1;
  index_entry: BuyVoidInventoryHistoryIndexEntryV1;
  anchor_entry: BuyVoidInventoryHistoryAnchorEntryV1;
};

type BuyVoidInventoryPoolLockV1 = {
  schema: "void_buy_void_inventory_pool_lock_v1";
  marker: typeof VOID_BUY_VOID_INVENTORY_POOL_LOCK_V1;
  pid: number;
  acquired_at_ms: number;
  process_start_ticks: string;
  boot_id: string;
  owner_nonce: string;
};

type BuyVoidInventoryPoolLockReleaseV1 = {
  schema: "void_buy_void_inventory_pool_lock_release_v1";
  marker: typeof VOID_BUY_VOID_INVENTORY_POOL_LOCK_RELEASE_V1;
  released_at_ms: number;
  lock: BuyVoidInventoryPoolLockV1;
};

export const VOID_BUY_VOID_INVENTORY_RESERVATION_AUTHORITY_V1 = {
  filesystem_read: true,
  filesystem_write: true,
  aggregate_inventory_reservation: true,
  duplicate_safe_reservation: true,
  global_pool_lock: true,
  paid_unreservable_terminal_obligation: true,
  durable_history_expected_set_commitment: true,
  durable_history_filename_content_identity: true,
  durable_history_creation_recovery: true,
  durable_history_separate_anchor_authority: true,
  durable_history_coherent_suffix_rollback_detection: true,
  stale_pool_lock_recovery: true,
  cross_process_pool_lock_release_recovery: true,
  generation_bound_pool_lock_reclaim_fence: true,
  full_presale_domain_history_range: false,
  obligation_automatic_retry: false,
  obligation_refund_execution_authorized: false,
  inventory_decrement: false,
  reservation_release: false,
  sold_out_closeout: false,
  request_journal_write: false,
  rpc_call: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  runtime_route_mount: false,
  money_movement: false,
} as const;

const SHA256 = /^[0-9a-f]{64}$/;
const TX_HASH = /^0x[0-9a-f]{64}$/;
const SAFE_CODE = /^[A-Za-z0-9._:-]{1,160}$/;
const ADDRESS = /^0x[0-9a-f]{40}$/;
const CANONICAL_UINT = /^(0|[1-9][0-9]*)$/;
const BOOT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const MAX_DURABLE_JSON_BYTES = 1_048_576;
const MAX_DURABLE_JSONL_BYTES = 67_108_864;
const MAX_DURABLE_JSONL_LINE_BYTES = 262_144;
const DURABLE_READ_CHUNK_BYTES = 64 * 1024;

export type BuyVoidInventoryReservationPolicyV1 = {
  inventory_reservation_enabled: boolean;
  pool_id: string;
  inventory_policy_version: string;
  pool_capacity_void_units: string | number;
  max_reservation_void_units: string | number;
};

export type BuyVoidInventoryReservationJournalPathsV1 = {
  root_dir: string;
  journal_dir: string;
  pools_dir: string;
  pool_dir: string;
  reservations_dir: string;
  holds_dir: string;
  reservation_expectations_dir: string;
  obligation_expectations_dir: string;
  history_index_file: string;
  history_anchor_dir: string;
  history_anchor_pools_dir: string;
  history_anchor_pool_dir: string;
  history_anchor_file: string;
  pending_history_dir: string;
  lock_file: string;
  lock_reclaim_prefix: string;
};

export type BuyVoidInventoryAggregateV1 = {
  schema: "void_buy_void_inventory_aggregate_v1";
  marker: typeof VOID_BUY_VOID_INVENTORY_RESERVATION_JOURNAL_V1;
  pool_id: string;
  inventory_policy_version: string;
  pool_capacity_void_units: string;
  committed_void_units: string;
  available_void_units: string;
  reservation_count: number;
  sold_out: boolean;
};

export type BuyVoidInventoryReservationV1 = {
  schema: "void_buy_void_inventory_reservation_v1";
  marker: typeof VOID_BUY_VOID_INVENTORY_RESERVATION_JOURNAL_V1;
  reservation_id: string;
  reserved_at_ms: number;
  pool_id: string;
  inventory_policy_version: string;
  pool_capacity_void_units: string;
  committed_before_void_units: string;
  reserved_void_units: string;
  committed_after_void_units: string;
  available_after_void_units: string;
  payment_key_sha256: string;
  request_key_sha256: string;
  canonical_payment_identity: string;
  request_id: string;
  instruction_id: string;
  delivery_address: string;
  intent_fingerprint: string;
  reservation_status: "reserved";
  inventory_decrement_performed: false;
  reservation_release_authorized: false;
  execution_authorized_by_this_module: false;
  signing_authorized_by_this_module: false;
  transaction_broadcast_authorized_by_this_module: false;
  money_movement_authorized_by_this_module: false;
};

export type BuyVoidPaidUnreservableObligationV1 = {
  schema: "void_buy_void_paid_unreservable_obligation_v1";
  marker: typeof VOID_BUY_VOID_PAID_UNRESERVABLE_OBLIGATION_V1;
  obligation_id: string;
  recorded_at_ms: number;
  terminal_state: "operator_reconciliation_required";
  reservation_failure_reason:
    | "inventory_sold_out"
    | "insufficient_void_inventory";
  pool_id: string;
  inventory_policy_version: string;
  pool_capacity_void_units: string;
  inventory_policy_fingerprint_sha256: string;
  available_void_units: string;
  requested_void_units: string;
  source_chain: string;
  payment_transaction_hash: string;
  payment_log_index: string;
  confirmed_block_number: string;
  confirmation_count_at_claim: string;
  payment_usdc_units: string;
  payment_key_sha256: string;
  request_key_sha256: string;
  canonical_payment_identity: string;
  request_id: string;
  instruction_id: string;
  delivery_address: string;
  customer_payment_confirmed: true;
  reservation_created: false;
  automatic_retry: false;
  refund_execution_authorized: false;
  alternate_fulfillment_execution_authorized: false;
  wallet_access_authorized: false;
  signing_authorized: false;
  transaction_broadcast_authorized: false;
  money_movement_authorized: false;
};

export type BuyVoidInventoryReservationDecisionV1 =
  | {
      ok: true;
      status: "available";
      applied: false;
      duplicate: boolean;
      new_reservation: false;
      reservation: BuyVoidInventoryReservationV1;
      aggregate: BuyVoidInventoryAggregateV1;
    }
  | {
      ok: true;
      status: "reserved";
      applied: true;
      duplicate: false;
      new_reservation: true;
      reservation: BuyVoidInventoryReservationV1;
      aggregate: BuyVoidInventoryAggregateV1;
    }
  | {
      ok: true;
      status: "duplicate";
      applied: true;
      duplicate: true;
      new_reservation: false;
      reservation: BuyVoidInventoryReservationV1;
      aggregate: BuyVoidInventoryAggregateV1;
    }
  | {
      ok: false;
      status: "held";
      applied: boolean;
      duplicate: false;
      new_reservation: false;
      reason: string;
      detail?: Record<string, unknown>;
    };

export type ReserveBuyVoidInventoryInputV1 = {
  root_dir: string;
  intent: BuyVoidFulfillmentJournalIntentV1;
  policy: BuyVoidInventoryReservationPolicyV1;
  apply?: boolean;
  now_ms?: number;
};

type NormalizedPolicyV1 = {
  pool_id: string;
  inventory_policy_version: string;
  capacity: bigint;
  max_reservation: bigint;
  pool_key_sha256: string;
  policy_fingerprint: string;
};

function held(
  applied: boolean,
  reason: string,
  detail?: Record<string, unknown>,
): BuyVoidInventoryReservationDecisionV1 {
  return {
    ok: false,
    status: "held",
    applied,
    duplicate: false,
    new_reservation: false,
    reason,
    ...(detail ? { detail } : {}),
  };
}

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function stableFingerprint(parts: Record<string, string>): string {
  return sha256Hex(
    Object.keys(parts)
      .sort()
      .map((key) => `${key}=${parts[key]}`)
      .join("\n"),
  );
}

function safeNow(value: unknown): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : Date.now();
}

function parsePositiveInteger(value: unknown): bigint | null {
  if (typeof value === "bigint") return value > 0n ? value : null;
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value <= 0) return null;
    return BigInt(value);
  }
  const raw = String(value ?? "").trim();
  if (!/^[0-9]+$/.test(raw)) return null;
  try {
    const parsed = BigInt(raw);
    return parsed > 0n ? parsed : null;
  } catch {
    return null;
  }
}

function parseNonNegativeInteger(value: unknown): bigint | null {
  if (typeof value === "bigint") return value >= 0n ? value : null;
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) return null;
    return BigInt(value);
  }
  const raw = String(value ?? "").trim();
  if (!/^[0-9]+$/.test(raw)) return null;
  try {
    const parsed = BigInt(raw);
    return parsed >= 0n ? parsed : null;
  } catch {
    return null;
  }
}

function isCanonicalUnsignedString(
  value: unknown,
  positive: boolean,
): value is string {
  if (typeof value !== "string" || !CANONICAL_UINT.test(value)) return false;
  try {
    const parsed = BigInt(value);
    return positive ? parsed > 0n : parsed >= 0n;
  } catch {
    return false;
  }
}

function hasStringFields(
  raw: Record<string, unknown>,
  fields: readonly string[],
): boolean {
  return fields.every((field) => typeof raw[field] === "string");
}

function validateRoot(rootDir: unknown): string {
  const raw = String(rootDir || "").trim();
  if (!raw || raw.includes("\0")) {
    throw new Error("invalid_inventory_journal_root");
  }
  return path.resolve(raw);
}

function normalizeAddress(value: unknown): string {
  const address = String(value || "").trim().toLowerCase();
  return ADDRESS.test(address) ? address : "";
}

function validateIntent(
  intent: BuyVoidFulfillmentJournalIntentV1,
):
  | {
      ok: true;
      amount: bigint;
      intent_fingerprint: string;
    }
  | { ok: false; reason: string } {
  if (!intent || typeof intent !== "object") {
    return { ok: false, reason: "missing_fulfillment_intent" };
  }
  if (intent.marker !== VOID_BUY_VOID_FULFILLMENT_JOURNAL_V1) {
    return { ok: false, reason: "wrong_fulfillment_journal_marker" };
  }
  if (intent.claim?.status !== "claimed") {
    return { ok: false, reason: "fulfillment_intent_not_claimed" };
  }
  if (intent.signing_authorized !== false) {
    return { ok: false, reason: "intent_signing_authority_present" };
  }
  if (intent.transaction_broadcast_authorized !== false) {
    return { ok: false, reason: "intent_broadcast_authority_present" };
  }
  if (intent.money_movement_authorized !== false) {
    return { ok: false, reason: "intent_money_movement_authority_present" };
  }
  if (!SHA256.test(String(intent.payment_key_sha256 || ""))) {
    return { ok: false, reason: "invalid_payment_key" };
  }
  if (!SHA256.test(String(intent.request_key_sha256 || ""))) {
    return { ok: false, reason: "invalid_request_key" };
  }
  if (!SAFE_CODE.test(String(intent.claim?.request_id || ""))) {
    return { ok: false, reason: "invalid_request_id" };
  }
  if (!SAFE_CODE.test(String(intent.claim?.instruction_id || ""))) {
    return { ok: false, reason: "invalid_instruction_id" };
  }
  if (!String(intent.claim?.canonical_payment_identity || "").trim()) {
    return { ok: false, reason: "missing_canonical_payment_identity" };
  }
  if (!normalizeAddress(
    intent.claim?.unsigned_instruction?.delivery_address,
  )) {
    return { ok: false, reason: "invalid_delivery_address" };
  }

  const amount = parsePositiveInteger(
    intent.claim?.unsigned_instruction?.void_amount_units,
  );
  if (amount === null) {
    return { ok: false, reason: "invalid_void_amount" };
  }

  return {
    ok: true,
    amount,
    intent_fingerprint: stableFingerprint({
      marker: String(intent.marker || ""),
      payment_key_sha256: String(intent.payment_key_sha256 || ""),
      request_key_sha256: String(intent.request_key_sha256 || ""),
      canonical_payment_identity: String(
        intent.claim?.canonical_payment_identity || "",
      ),
      request_id: String(intent.claim?.request_id || ""),
      instruction_id: String(intent.claim?.instruction_id || ""),
      delivery_address: String(
        intent.claim?.unsigned_instruction?.delivery_address || "",
      ).toLowerCase(),
      void_amount_units: amount.toString(),
    }),
  };
}

function normalizePolicy(
  policy: BuyVoidInventoryReservationPolicyV1,
): { ok: true; policy: NormalizedPolicyV1 } | { ok: false; reason: string } {
  if (!policy || policy.inventory_reservation_enabled !== true) {
    return { ok: false, reason: "inventory_reservation_disabled" };
  }

  const poolId = String(policy.pool_id || "").trim();
  const policyVersion = String(
    policy.inventory_policy_version || "",
  ).trim();
  if (!SAFE_CODE.test(poolId)) {
    return { ok: false, reason: "invalid_inventory_pool_id" };
  }
  if (!SAFE_CODE.test(policyVersion)) {
    return { ok: false, reason: "invalid_inventory_policy_version" };
  }

  const capacity = parsePositiveInteger(
    policy.pool_capacity_void_units,
  );
  const maximum = parsePositiveInteger(
    policy.max_reservation_void_units,
  );
  if (capacity === null) {
    return { ok: false, reason: "invalid_inventory_capacity" };
  }
  if (maximum === null || maximum > capacity) {
    return { ok: false, reason: "invalid_inventory_reservation_cap" };
  }

  const poolKey = sha256Hex(
    `void-buy-inventory-pool-v1\n${poolId}`,
  );
  return {
    ok: true,
    policy: {
      pool_id: poolId,
      inventory_policy_version: policyVersion,
      capacity,
      max_reservation: maximum,
      pool_key_sha256: poolKey,
      policy_fingerprint: stableFingerprint({
        pool_id: poolId,
        inventory_policy_version: policyVersion,
        pool_capacity_void_units: capacity.toString(),
        max_reservation_void_units: maximum.toString(),
      }),
    },
  };
}

export function buyVoidInventoryReservationJournalPathsV1(
  rootDir: string,
  poolId: string,
): BuyVoidInventoryReservationJournalPathsV1 {
  const root = validateRoot(rootDir);
  if (!SAFE_CODE.test(String(poolId || "").trim())) {
    throw new Error("invalid_inventory_pool_id");
  }
  const journalDir = path.join(
    root,
    "buy-void-inventory-reservation-v1",
  );
  const poolsDir = path.join(journalDir, "pools");
  const poolKey = sha256Hex(
    `void-buy-inventory-pool-v1\n${String(poolId).trim()}`,
  );
  const poolDir = path.join(poolsDir, poolKey);
  const historyAnchorDir = path.join(
    root,
    "buy-void-inventory-history-anchor-v1",
  );
  const historyAnchorPoolsDir = path.join(historyAnchorDir, "pools");
  const historyAnchorPoolDir = path.join(historyAnchorPoolsDir, poolKey);
  return {
    root_dir: root,
    journal_dir: journalDir,
    pools_dir: poolsDir,
    pool_dir: poolDir,
    reservations_dir: path.join(poolDir, "reservations"),
    holds_dir: path.join(poolDir, "holds"),
    reservation_expectations_dir: path.join(
      poolDir,
      "reservation-expectations",
    ),
    obligation_expectations_dir: path.join(
      poolDir,
      "obligation-expectations",
    ),
    history_index_file: path.join(
      poolDir,
      "history-index-v1.jsonl",
    ),
    history_anchor_dir: historyAnchorDir,
    history_anchor_pools_dir: historyAnchorPoolsDir,
    history_anchor_pool_dir: historyAnchorPoolDir,
    history_anchor_file: path.join(
      historyAnchorPoolDir,
      "committed-history-v1.jsonl",
    ),
    pending_history_dir: path.join(
      historyAnchorPoolDir,
      "pending-creations",
    ),
    lock_file: path.join(
      historyAnchorPoolDir,
      ".reserve.lock.json",
    ),
    lock_reclaim_prefix: path.join(
      historyAnchorPoolDir,
      ".reserve.lock.reclaim",
    ),
  };
}

const DIRECTORY_OPEN_FLAGS = fs.constants.O_RDONLY |
  (fs.constants.O_DIRECTORY || 0) |
  (fs.constants.O_NOFOLLOW || 0);
const DESCRIPTOR_NAMESPACE = /^\/proc\/self\/fd\/([0-9]+)(?:\/(.*))?$/u;

function assertOwnedPrivateDirectoryStat(
  stat: fs.Stats | fs.BigIntStats,
  dir: string,
): void {
  const uid = process.getuid?.();
  if (
    stat.isSymbolicLink() ||
    !stat.isDirectory() ||
    uid === undefined ||
    BigInt(stat.uid) !== BigInt(uid) ||
    (BigInt(stat.mode) & 0o077n) !== 0n
  ) {
    throw new Error(`invalid_inventory_authority_directory:${dir}`);
  }
}

function descriptorNamespaceParts(target: string): {
  descriptor: number;
  descendants: string[];
} | null {
  const match = DESCRIPTOR_NAMESPACE.exec(path.resolve(target));
  if (!match) return null;
  return {
    descriptor: Number(match[1]),
    descendants: match[2] ? match[2].split("/").filter(Boolean) : [],
  };
}

function openDirectoryComponentNoFollow(
  stablePath: string,
  displayPath: string,
): number {
  try {
    return fs.openSync(stablePath, DIRECTORY_OPEN_FLAGS);
  } catch (error) {
    try {
      if (fs.lstatSync(stablePath).isSymbolicLink()) {
        throw new Error(`inventory_authority_symlink_ancestor:${displayPath}`);
      }
    } catch (inspectionError) {
      if (
        String((inspectionError as Error)?.message || inspectionError).startsWith(
          "inventory_authority_symlink_ancestor:",
        )
      ) {
        throw inspectionError;
      }
    }
    throw error;
  }
}

function traversePrivateDirectoryV1(
  dir: string,
  createMissing: boolean,
): number {
  const resolved = path.resolve(dir);
  const descriptorNamespace = descriptorNamespaceParts(resolved);
  let descriptor: number;
  let components: string[];
  let displayCurrent: string;
  if (descriptorNamespace) {
    descriptor = fs.openSync(
      `/proc/self/fd/${descriptorNamespace.descriptor}`,
      fs.constants.O_RDONLY | (fs.constants.O_DIRECTORY || 0),
    );
    components = descriptorNamespace.descendants;
    displayCurrent = `/proc/self/fd/${descriptorNamespace.descriptor}`;
  } else {
    descriptor = fs.openSync(path.parse(resolved).root, DIRECTORY_OPEN_FLAGS);
    components = resolved.slice(path.parse(resolved).root.length)
      .split(path.sep)
      .filter(Boolean);
    displayCurrent = path.parse(resolved).root;
  }

  while (true) {
    try {
      for (const component of components) {
        const stableChild = `/proc/self/fd/${descriptor}/${component}`;
        const displayChild = path.join(displayCurrent, component);
        let next: number;
        try {
          next = openDirectoryComponentNoFollow(stableChild, displayChild);
        } catch (error) {
          if (
            !createMissing ||
            (error as NodeJS.ErrnoException)?.code !== "ENOENT"
          ) {
            throw error;
          }
          fs.mkdirSync(stableChild, { mode: 0o700 });
          fs.fsyncSync(descriptor);
          next = openDirectoryComponentNoFollow(stableChild, displayChild);
          assertOwnedPrivateDirectoryStat(fs.fstatSync(next), displayChild);
        }
        fs.closeSync(descriptor);
        descriptor = next;
        displayCurrent = displayChild;
      }
      assertOwnedPrivateDirectoryStat(fs.fstatSync(descriptor), resolved);
      return descriptor;
    } catch (error) {
      fs.closeSync(descriptor);
      throw error;
    }
  }
}

function ensurePrivateDir(dir: string): void {
  withPinnedPrivateDirectoryV1(dir, true, () => undefined);
}

function assertPinnedPrivateDirectoryCurrentV1(
  dir: string,
  descriptor: number,
): void {
  try {
    const descriptorNamespace = descriptorNamespaceParts(dir);
    const current = descriptorNamespace &&
        descriptorNamespace.descendants.length === 0
      ? fs.fstatSync(descriptorNamespace.descriptor, { bigint: true })
      : fs.lstatSync(dir, { bigint: true });
    const pinned = fs.fstatSync(descriptor, { bigint: true });
    assertOwnedPrivateDirectoryStat(current, dir);
    assertOwnedPrivateDirectoryStat(pinned, dir);
    if (current.dev !== pinned.dev || current.ino !== pinned.ino) {
      throw new Error("inventory_authority_namespace_changed");
    }
  } catch (error) {
    const message = String((error as Error)?.message || error);
    if (message === "inventory_authority_namespace_changed") throw error;
    throw new Error(`inventory_authority_namespace_changed:${message}`);
  }
}

function withPinnedPrivateDirectoryV1<T>(
  dir: string,
  createMissing: boolean,
  action: (stableDir: string, descriptor: number) => T,
): T {
  const descriptor = traversePrivateDirectoryV1(dir, createMissing);
  try {
    assertPinnedPrivateDirectoryCurrentV1(dir, descriptor);
    const output = action(`/proc/self/fd/${descriptor}`, descriptor);
    assertPinnedPrivateDirectoryCurrentV1(dir, descriptor);
    return output;
  } finally {
    fs.closeSync(descriptor);
  }
}

function assertPinnedInventoryRootCurrentV1(
  rootDir: string,
  descriptor: number,
): void {
  let current: fs.BigIntStats;
  try {
    current = fs.lstatSync(rootDir, { bigint: true });
  } catch (error) {
    throw new Error(
      `inventory_authority_namespace_changed:${
        String((error as Error)?.message || error)
      }`,
    );
  }
  const pinned = fs.fstatSync(descriptor, { bigint: true });
  assertOwnedPrivateDirectoryStat(current, rootDir);
  assertOwnedPrivateDirectoryStat(pinned, rootDir);
  if (current.dev !== pinned.dev || current.ino !== pinned.ino) {
    throw new Error("inventory_authority_namespace_changed");
  }
}

function withPinnedInventoryRootV1<T>(
  rootDir: string,
  createMissing: boolean,
  action: (pinnedRootDir: string) => T,
): T {
  const root = validateRoot(rootDir);
  const descriptor = traversePrivateDirectoryV1(root, createMissing);
  try {
    assertPinnedInventoryRootCurrentV1(root, descriptor);
    const output = action(`/proc/self/fd/${descriptor}`);
    assertPinnedInventoryRootCurrentV1(root, descriptor);
    return output;
  } finally {
    fs.closeSync(descriptor);
  }
}

function fsyncDir(dir: string): void {
  withPinnedPrivateDirectoryV1(
    dir,
    false,
    (_stableDir, descriptor) => fs.fsyncSync(descriptor),
  );
}

function ensureInventoryAuthorityDirectories(
  paths: BuyVoidInventoryReservationJournalPathsV1,
): void {
  for (const dir of [
    paths.root_dir,
    paths.journal_dir,
    paths.pools_dir,
    paths.pool_dir,
    paths.reservations_dir,
    paths.holds_dir,
    paths.reservation_expectations_dir,
    paths.obligation_expectations_dir,
    paths.history_anchor_dir,
    paths.history_anchor_pools_dir,
    paths.history_anchor_pool_dir,
    paths.pending_history_dir,
  ]) {
    ensurePrivateDir(dir);
  }
}

function atomicCreateJson(
  file: string,
  value: unknown,
): "created" | "exists" {
  const parent = path.dirname(file);
  return withPinnedPrivateDirectoryV1(parent, true, (stableParent, parentFd) => {
    const stableFile = path.join(stableParent, path.basename(file));
    const temporary = path.join(
      stableParent,
      `.${path.basename(file)}.tmp-${process.pid}-` +
        crypto.randomBytes(8).toString("hex"),
    );
    const descriptor = fs.openSync(temporary, "wx", 0o600);
    try {
      fs.writeFileSync(
        descriptor,
        `${JSON.stringify(value, null, 2)}\n`,
        "utf8",
      );
      fs.fsyncSync(descriptor);
    } finally {
      fs.closeSync(descriptor);
    }

    try {
      try {
        fs.linkSync(temporary, stableFile);
        fs.fsyncSync(parentFd);
        return "created";
      } catch (error) {
        if ((error as NodeJS.ErrnoException)?.code === "EEXIST") {
          // Re-establish publication durability after an earlier uncertain link.
          fs.fsyncSync(parentFd);
          return "exists";
        }
        throw error;
      }
    } finally {
      try {
        fs.unlinkSync(temporary);
      } catch {
        // Best effort cleanup.
      }
    }
  });
}

type DurableFileIdentityV1 = {
  dev: bigint;
  ino: bigint;
  size: bigint;
  mtime_ns: bigint;
  ctime_ns: bigint;
};

function durableFileIdentity(stat: fs.BigIntStats): DurableFileIdentityV1 {
  return {
    dev: stat.dev,
    ino: stat.ino,
    size: stat.size,
    mtime_ns: stat.mtimeNs,
    ctime_ns: stat.ctimeNs,
  };
}

function sameDurableFileIdentity(
  left: DurableFileIdentityV1,
  right: DurableFileIdentityV1,
): boolean {
  return Object.keys(left).every((key) =>
    left[key as keyof DurableFileIdentityV1] ===
      right[key as keyof DurableFileIdentityV1]
  );
}

function assertAuthoritativeFileStat(
  stat: fs.BigIntStats,
  invalidReason: string,
): void {
  const uid = process.getuid?.();
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    uid === undefined ||
    stat.uid !== BigInt(uid) ||
    (stat.mode & 0o077n) !== 0n
  ) {
    throw new Error(invalidReason);
  }
}

function readBoundedAuthoritativeFile(
  file: string,
  maxBytes: number,
  invalidReason: string,
): string {
  const parent = path.dirname(file);
  return withPinnedPrivateDirectoryV1(parent, false, (stableParent) => {
    const stableFile = path.join(stableParent, path.basename(file));
    const before = fs.lstatSync(stableFile, { bigint: true });
    assertAuthoritativeFileStat(before, invalidReason);
    if (before.size > BigInt(maxBytes)) {
      throw new Error(`${invalidReason}:too_large`);
    }
    const flags = fs.constants.O_RDONLY |
      (fs.constants.O_NOFOLLOW || 0);
    const descriptor = fs.openSync(stableFile, flags);
    try {
      const opened = fs.fstatSync(descriptor, { bigint: true });
      assertAuthoritativeFileStat(opened, invalidReason);
      if (
        opened.size > BigInt(maxBytes) ||
        !sameDurableFileIdentity(
          durableFileIdentity(before),
          durableFileIdentity(opened),
        )
      ) {
        throw new Error(`${invalidReason}:unstable`);
      }
      const buffer = Buffer.alloc(Number(opened.size) + 1);
      let offset = 0;
      while (offset < buffer.length) {
        const count = fs.readSync(
          descriptor,
          buffer,
          offset,
          buffer.length - offset,
          offset,
        );
        if (count === 0) break;
        offset += count;
      }
      if (offset !== Number(opened.size)) {
        throw new Error(`${invalidReason}:unstable`);
      }
      const afterDescriptor = fs.fstatSync(descriptor, { bigint: true });
      const afterPath = fs.lstatSync(stableFile, { bigint: true });
      assertAuthoritativeFileStat(afterPath, invalidReason);
      if (
        !sameDurableFileIdentity(
          durableFileIdentity(opened),
          durableFileIdentity(afterDescriptor),
        ) ||
        !sameDurableFileIdentity(
          durableFileIdentity(opened),
          durableFileIdentity(afterPath),
        )
      ) {
        throw new Error(`${invalidReason}:unstable`);
      }
      try {
        return new TextDecoder("utf-8", { fatal: true }).decode(
          buffer.subarray(0, offset),
        );
      } catch {
        throw new Error(`${invalidReason}:invalid_utf8`);
      }
    } finally {
      fs.closeSync(descriptor);
    }
  });
}

function scanBoundedAuthoritativeLines(
  file: string,
  invalidReason: string,
  onLine: (line: string, index: number) => void,
): { line_count: number; trailing_bytes: Buffer; complete_bytes: number } {
  const parent = path.dirname(file);
  return withPinnedPrivateDirectoryV1(parent, false, (stableParent) => {
    const stableFile = path.join(stableParent, path.basename(file));
    const before = fs.lstatSync(stableFile, { bigint: true });
    assertAuthoritativeFileStat(before, invalidReason);
    if (before.size > BigInt(MAX_DURABLE_JSONL_BYTES)) {
      throw new Error(`${invalidReason}:too_large`);
    }
    const descriptor = fs.openSync(
      stableFile,
      fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0),
    );
    try {
    const opened = fs.fstatSync(descriptor, { bigint: true });
    assertAuthoritativeFileStat(opened, invalidReason);
    if (
      opened.size > BigInt(MAX_DURABLE_JSONL_BYTES) ||
      !sameDurableFileIdentity(
        durableFileIdentity(before),
        durableFileIdentity(opened),
      )
    ) {
      throw new Error(`${invalidReason}:unstable`);
    }

    const chunk = Buffer.allocUnsafe(DURABLE_READ_CHUNK_BYTES);
    let carry = Buffer.alloc(0);
    let offset = 0;
    let lineCount = 0;
    while (offset <= Number(opened.size)) {
      const count = fs.readSync(
        descriptor,
        chunk,
        0,
        Math.min(chunk.length, Number(opened.size) - offset + 1),
        offset,
      );
      if (count === 0) break;
      offset += count;
      const combined = carry.length === 0
        ? Buffer.from(chunk.subarray(0, count))
        : Buffer.concat([carry, chunk.subarray(0, count)]);
      let start = 0;
      while (true) {
        const newline = combined.indexOf(0x0a, start);
        if (newline < 0) break;
        const lineBytes = combined.subarray(start, newline);
        if (lineBytes.length > MAX_DURABLE_JSONL_LINE_BYTES) {
          throw new Error(`${invalidReason}:line_too_large`);
        }
        let line: string;
        try {
          line = new TextDecoder("utf-8", { fatal: true }).decode(lineBytes);
        } catch {
          throw new Error(`${invalidReason}:invalid_utf8`);
        }
        onLine(line, lineCount);
        lineCount += 1;
        start = newline + 1;
      }
      carry = Buffer.from(combined.subarray(start));
      if (carry.length > MAX_DURABLE_JSONL_LINE_BYTES) {
        throw new Error(`${invalidReason}:line_too_large`);
      }
    }
    if (offset !== Number(opened.size)) {
      throw new Error(`${invalidReason}:unstable`);
    }

    const afterDescriptor = fs.fstatSync(descriptor, { bigint: true });
    const afterPath = fs.lstatSync(stableFile, { bigint: true });
    assertAuthoritativeFileStat(afterPath, invalidReason);
    if (
      !sameDurableFileIdentity(
        durableFileIdentity(opened),
        durableFileIdentity(afterDescriptor),
      ) ||
      !sameDurableFileIdentity(
        durableFileIdentity(opened),
        durableFileIdentity(afterPath),
      )
    ) {
      throw new Error(`${invalidReason}:unstable`);
    }
      return {
        line_count: lineCount,
        trailing_bytes: carry,
        complete_bytes: Number(opened.size) - carry.length,
      };
    } finally {
      fs.closeSync(descriptor);
    }
  });
}

const RESERVATION_RECORD_KEYS = [
  "schema",
  "marker",
  "reservation_id",
  "reserved_at_ms",
  "pool_id",
  "inventory_policy_version",
  "pool_capacity_void_units",
  "committed_before_void_units",
  "reserved_void_units",
  "committed_after_void_units",
  "available_after_void_units",
  "payment_key_sha256",
  "request_key_sha256",
  "canonical_payment_identity",
  "request_id",
  "instruction_id",
  "delivery_address",
  "intent_fingerprint",
  "reservation_status",
  "inventory_decrement_performed",
  "reservation_release_authorized",
  "execution_authorized_by_this_module",
  "signing_authorized_by_this_module",
  "transaction_broadcast_authorized_by_this_module",
  "money_movement_authorized_by_this_module",
] as const;

const PAID_UNRESERVABLE_OBLIGATION_RECORD_KEYS = [
  "schema",
  "marker",
  "obligation_id",
  "recorded_at_ms",
  "terminal_state",
  "reservation_failure_reason",
  "pool_id",
  "inventory_policy_version",
  "pool_capacity_void_units",
  "inventory_policy_fingerprint_sha256",
  "available_void_units",
  "requested_void_units",
  "source_chain",
  "payment_transaction_hash",
  "payment_log_index",
  "confirmed_block_number",
  "confirmation_count_at_claim",
  "payment_usdc_units",
  "payment_key_sha256",
  "request_key_sha256",
  "canonical_payment_identity",
  "request_id",
  "instruction_id",
  "delivery_address",
  "customer_payment_confirmed",
  "reservation_created",
  "automatic_retry",
  "refund_execution_authorized",
  "alternate_fulfillment_execution_authorized",
  "wallet_access_authorized",
  "signing_authorized",
  "transaction_broadcast_authorized",
  "money_movement_authorized",
] as const;

const HISTORY_EXPECTATION_KEYS = [
  "schema",
  "marker",
  "kind",
  "pool_id",
  "record_id",
  "record_identity_fingerprint_sha256",
] as const;

const HISTORY_INDEX_ENTRY_KEYS = [
  "schema",
  "marker",
  "sequence",
  "kind",
  "pool_id",
  "record_id",
  "record_identity_fingerprint_sha256",
  "previous_entry_sha256",
  "entry_sha256",
] as const;

const HISTORY_ANCHOR_ENTRY_KEYS = [
  "schema",
  "marker",
  "sequence",
  "kind",
  "pool_id",
  "record_id",
  "record_identity_fingerprint_sha256",
  "history_index_entry_sha256",
  "previous_anchor_sha256",
  "anchor_sha256",
] as const;

const HISTORY_PENDING_CREATION_KEYS = [
  "schema",
  "marker",
  "kind",
  "pool_id",
  "record_id",
  "record_identity_fingerprint_sha256",
  "record",
  "index_entry",
  "anchor_entry",
] as const;

const POOL_LOCK_KEYS = [
  "schema",
  "marker",
  "pid",
  "acquired_at_ms",
  "process_start_ticks",
  "boot_id",
  "owner_nonce",
] as const;

const POOL_LOCK_RELEASE_KEYS = [
  "schema",
  "marker",
  "released_at_ms",
  "lock",
] as const;

const HISTORY_INDEX_GENESIS_SHA256 = "0".repeat(64);
const HISTORY_ANCHOR_GENESIS_SHA256 = "0".repeat(64);
const LOCK_NONCE = /^[0-9a-f]{32}$/;

const CANONICAL_HISTORY_FILE = /^[0-9a-f]{64}\.json$/;
const TEMP_HISTORY_FILE =
  /^\.[0-9a-f]{64}\.json\.tmp-[0-9]+-[0-9a-f]+$/;

function hasExactKeys(
  raw: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(raw).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length &&
    actual.every((key, index) => key === wanted[index]);
}

function readRequiredHistoryJsonObject(
  file: string,
  missingReason: string,
  invalidReason: string,
): Record<string, unknown> {
  try {
    const parsed = JSON.parse(readBoundedAuthoritativeFile(
      file,
      MAX_DURABLE_JSON_BYTES,
      invalidReason,
    ));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(invalidReason);
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      throw new Error(missingReason);
    }
    const message = String((error as Error)?.message || error);
    if (message === missingReason || message === invalidReason) {
      throw error;
    }
    throw new Error(`${invalidReason}:${message}`);
  }
}

function canonicalHistoryNames(
  dir: string,
  invalidNameReason: string,
): string[] {
  try {
    return withPinnedPrivateDirectoryV1(dir, false, (stableDir) => {
      const output: string[] = [];
      for (const name of fs.readdirSync(stableDir)) {
        if (TEMP_HISTORY_FILE.test(name)) continue;
        if (!CANONICAL_HISTORY_FILE.test(name)) {
          throw new Error(invalidNameReason);
        }
        output.push(name);
      }
      return output.sort();
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

function historyRecordFingerprint(
  raw: Record<string, unknown>,
): string {
  const parts: Record<string, string> = {};
  for (const key of Object.keys(raw).sort()) {
    const value = raw[key];
    if (
      typeof value !== "string" &&
      typeof value !== "number" &&
      typeof value !== "boolean"
    ) {
      throw new Error("invalid_inventory_history_fingerprint_value");
    }
    parts[key] = `${typeof value}:${String(value)}`;
  }
  return stableFingerprint(parts);
}

function historyIndexEntrySha256(input: {
  sequence: number;
  kind: BuyVoidInventoryHistoryKindV1;
  pool_id: string;
  record_id: string;
  record_identity_fingerprint_sha256: string;
  previous_entry_sha256: string;
}): string {
  return stableFingerprint({
    schema: "void_buy_void_inventory_history_index_entry_v1",
    marker: VOID_BUY_VOID_INVENTORY_HISTORY_INDEX_V1,
    sequence: String(input.sequence),
    kind: input.kind,
    pool_id: input.pool_id,
    record_id: input.record_id,
    record_identity_fingerprint_sha256:
      input.record_identity_fingerprint_sha256,
    previous_entry_sha256: input.previous_entry_sha256,
  });
}

function parseHistoryIndexEntry(
  paths: BuyVoidInventoryReservationJournalPathsV1,
  raw: Record<string, unknown>,
  expectedSequence: number,
  expectedPreviousSha256: string,
): BuyVoidInventoryHistoryIndexEntryV1 {
  const sequence = raw.sequence;
  const kind = raw.kind as BuyVoidInventoryHistoryKindV1;
  const poolId = raw.pool_id;
  const recordId = raw.record_id;
  const recordFingerprint = raw.record_identity_fingerprint_sha256;
  const previousEntrySha256 = raw.previous_entry_sha256;
  const entrySha256 = raw.entry_sha256;
  if (
    typeof sequence !== "number" ||
    typeof kind !== "string" ||
    typeof poolId !== "string" ||
    typeof recordId !== "string" ||
    typeof recordFingerprint !== "string" ||
    typeof previousEntrySha256 !== "string" ||
    typeof entrySha256 !== "string"
  ) {
    throw new Error("invalid_inventory_history_index_entry");
  }
  const expectedPoolKey = SAFE_CODE.test(poolId)
    ? sha256Hex(`void-buy-inventory-pool-v1\n${poolId}`)
    : "";
  const expectedEntrySha256 = historyIndexEntrySha256({
    sequence,
    kind,
    pool_id: poolId,
    record_id: recordId,
    record_identity_fingerprint_sha256: recordFingerprint,
    previous_entry_sha256: previousEntrySha256,
  });

  if (
    !hasExactKeys(raw, HISTORY_INDEX_ENTRY_KEYS) ||
    raw.schema !== "void_buy_void_inventory_history_index_entry_v1" ||
    raw.marker !== VOID_BUY_VOID_INVENTORY_HISTORY_INDEX_V1 ||
    !Number.isSafeInteger(sequence) ||
    sequence !== expectedSequence ||
    !["reservation", "paid_unreservable_obligation"].includes(kind) ||
    !SAFE_CODE.test(poolId) ||
    expectedPoolKey !== path.basename(paths.pool_dir) ||
    !SHA256.test(recordId) ||
    !SHA256.test(recordFingerprint) ||
    previousEntrySha256 !== expectedPreviousSha256 ||
    !SHA256.test(entrySha256) ||
    entrySha256 !== expectedEntrySha256
  ) {
    throw new Error("invalid_inventory_history_index_entry");
  }

  return {
    schema: "void_buy_void_inventory_history_index_entry_v1",
    marker: VOID_BUY_VOID_INVENTORY_HISTORY_INDEX_V1,
    sequence,
    kind,
    pool_id: poolId,
    record_id: recordId,
    record_identity_fingerprint_sha256: recordFingerprint,
    previous_entry_sha256: previousEntrySha256,
    entry_sha256: entrySha256,
  };
}

function historyAnchorEntrySha256(input: {
  sequence: number;
  kind: BuyVoidInventoryHistoryKindV1;
  pool_id: string;
  record_id: string;
  record_identity_fingerprint_sha256: string;
  history_index_entry_sha256: string;
  previous_anchor_sha256: string;
}): string {
  return stableFingerprint({
    schema: "void_buy_void_inventory_history_anchor_entry_v1",
    marker: VOID_BUY_VOID_INVENTORY_HISTORY_ANCHOR_V1,
    sequence: String(input.sequence),
    kind: input.kind,
    pool_id: input.pool_id,
    record_id: input.record_id,
    record_identity_fingerprint_sha256:
      input.record_identity_fingerprint_sha256,
    history_index_entry_sha256: input.history_index_entry_sha256,
    previous_anchor_sha256: input.previous_anchor_sha256,
  });
}

function parseHistoryAnchorEntry(
  paths: BuyVoidInventoryReservationJournalPathsV1,
  raw: Record<string, unknown>,
  expectedSequence: number,
  expectedPreviousSha256: string,
): BuyVoidInventoryHistoryAnchorEntryV1 {
  const sequence = raw.sequence;
  const kind = raw.kind as BuyVoidInventoryHistoryKindV1;
  const poolId = raw.pool_id;
  const recordId = raw.record_id;
  const recordFingerprint = raw.record_identity_fingerprint_sha256;
  const historyIndexEntrySha256 = raw.history_index_entry_sha256;
  const previousAnchorSha256 = raw.previous_anchor_sha256;
  const anchorSha256 = raw.anchor_sha256;
  if (
    typeof sequence !== "number" ||
    typeof kind !== "string" ||
    typeof poolId !== "string" ||
    typeof recordId !== "string" ||
    typeof recordFingerprint !== "string" ||
    typeof historyIndexEntrySha256 !== "string" ||
    typeof previousAnchorSha256 !== "string" ||
    typeof anchorSha256 !== "string"
  ) {
    throw new Error("invalid_inventory_history_anchor_entry");
  }
  const expectedPoolKey = SAFE_CODE.test(poolId)
    ? sha256Hex(`void-buy-inventory-pool-v1\n${poolId}`)
    : "";
  const expectedAnchorSha256 = historyAnchorEntrySha256({
    sequence,
    kind,
    pool_id: poolId,
    record_id: recordId,
    record_identity_fingerprint_sha256: recordFingerprint,
    history_index_entry_sha256: historyIndexEntrySha256,
    previous_anchor_sha256: previousAnchorSha256,
  });
  if (
    !hasExactKeys(raw, HISTORY_ANCHOR_ENTRY_KEYS) ||
    raw.schema !== "void_buy_void_inventory_history_anchor_entry_v1" ||
    raw.marker !== VOID_BUY_VOID_INVENTORY_HISTORY_ANCHOR_V1 ||
    !Number.isSafeInteger(sequence) ||
    sequence !== expectedSequence ||
    !["reservation", "paid_unreservable_obligation"].includes(kind) ||
    !SAFE_CODE.test(poolId) ||
    expectedPoolKey !== path.basename(paths.history_anchor_pool_dir) ||
    !SHA256.test(recordId) ||
    !SHA256.test(recordFingerprint) ||
    !SHA256.test(historyIndexEntrySha256) ||
    previousAnchorSha256 !== expectedPreviousSha256 ||
    !SHA256.test(anchorSha256) ||
    anchorSha256 !== expectedAnchorSha256
  ) {
    throw new Error("invalid_inventory_history_anchor_entry");
  }
  return {
    schema: "void_buy_void_inventory_history_anchor_entry_v1",
    marker: VOID_BUY_VOID_INVENTORY_HISTORY_ANCHOR_V1,
    sequence,
    kind,
    pool_id: poolId,
    record_id: recordId,
    record_identity_fingerprint_sha256: recordFingerprint,
    history_index_entry_sha256: historyIndexEntrySha256,
    previous_anchor_sha256: previousAnchorSha256,
    anchor_sha256: anchorSha256,
  };
}

function readHistoryAnchor(
  paths: BuyVoidInventoryReservationJournalPathsV1,
): BuyVoidInventoryHistoryAnchorEntryV1[] {
  const output: BuyVoidInventoryHistoryAnchorEntryV1[] = [];
  const seen = new Set<string>();
  let previousAnchorSha256 = HISTORY_ANCHOR_GENESIS_SHA256;
  let scan: ReturnType<typeof scanBoundedAuthoritativeLines>;
  try {
    scan = scanBoundedAuthoritativeLines(
      paths.history_anchor_file,
      "invalid_inventory_history_anchor_file",
      (line, index) => {
    if (!line) throw new Error("invalid_inventory_history_anchor_blank_line");
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      throw new Error("invalid_inventory_history_anchor_entry_json");
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("invalid_inventory_history_anchor_entry");
    }
    const entry = parseHistoryAnchorEntry(
      paths,
      parsed as Record<string, unknown>,
      index + 1,
      previousAnchorSha256,
    );
    const key = `${entry.kind}:${entry.record_id}`;
    if (seen.has(key)) {
      throw new Error("inventory_history_anchor_duplicate_record");
    }
    seen.add(key);
    output.push(entry);
    previousAnchorSha256 = entry.anchor_sha256;
      },
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return [];
    throw error;
  }
  if (scan.line_count === 0 && scan.trailing_bytes.length === 0) {
    throw new Error("inventory_history_anchor_empty");
  }
  if (scan.trailing_bytes.length !== 0) {
    throw new Error("inventory_history_anchor_truncated_tail");
  }
  return output;
}

function appendHistoryAnchorEntry(
  paths: BuyVoidInventoryReservationJournalPathsV1,
  entry: BuyVoidInventoryHistoryAnchorEntryV1,
): void {
  withPinnedPrivateDirectoryV1(
    paths.history_anchor_pool_dir,
    true,
    (stableParent, parentFd) => {
      const stableFile = path.join(
        stableParent,
        path.basename(paths.history_anchor_file),
      );
      let exists = false;
      try {
        const stat = fs.lstatSync(stableFile, { bigint: true });
        assertAuthoritativeFileStat(
          stat,
          "invalid_inventory_history_anchor_file",
        );
        exists = true;
      } catch (error) {
        if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") throw error;
      }
      const descriptor = fs.openSync(
        stableFile,
        fs.constants.O_WRONLY |
          fs.constants.O_APPEND |
          (exists ? 0 : fs.constants.O_CREAT | fs.constants.O_EXCL) |
          (fs.constants.O_NOFOLLOW || 0),
        0o600,
      );
      try {
        assertAuthoritativeFileStat(
          fs.fstatSync(descriptor, { bigint: true }),
          "invalid_inventory_history_anchor_file",
        );
        fs.writeFileSync(descriptor, `${JSON.stringify(entry)}\n`, "utf8");
        fs.fsyncSync(descriptor);
      } finally {
        fs.closeSync(descriptor);
      }
      fs.fsyncSync(parentFd);
    },
  );
}

function anchorMatchesIndexEntry(
  anchor: BuyVoidInventoryHistoryAnchorEntryV1,
  entry: BuyVoidInventoryHistoryIndexEntryV1,
): boolean {
  return (
    anchor.sequence === entry.sequence &&
    anchor.kind === entry.kind &&
    anchor.pool_id === entry.pool_id &&
    anchor.record_id === entry.record_id &&
    anchor.record_identity_fingerprint_sha256 ===
      entry.record_identity_fingerprint_sha256 &&
    anchor.history_index_entry_sha256 === entry.entry_sha256
  );
}

function assertHistoryAnchorIndexConsistency(
  anchors: readonly BuyVoidInventoryHistoryAnchorEntryV1[],
  entries: readonly BuyVoidInventoryHistoryIndexEntryV1[],
): void {
  if (anchors.length !== entries.length) {
    throw new Error("inventory_history_anchor_index_mismatch");
  }
  for (let index = 0; index < anchors.length; index += 1) {
    if (!anchorMatchesIndexEntry(anchors[index], entries[index])) {
      throw new Error("inventory_history_anchor_index_mismatch");
    }
  }
}

function historyRecordId(
  kind: BuyVoidInventoryHistoryKindV1,
  record: BuyVoidInventoryHistoryRecordV1,
): string {
  return kind === "reservation"
    ? (record as BuyVoidInventoryReservationV1).reservation_id
    : (record as BuyVoidPaidUnreservableObligationV1).obligation_id;
}

function pendingHistoryNames(
  paths: BuyVoidInventoryReservationJournalPathsV1,
): string[] {
  return canonicalHistoryNames(
    paths.pending_history_dir,
    "invalid_inventory_history_pending_creation_filename",
  );
}

function parsePendingHistoryCreation(
  paths: BuyVoidInventoryReservationJournalPathsV1,
  file: string,
): BuyVoidInventoryHistoryPendingCreationV1 {
  const raw = readRequiredHistoryJsonObject(
    file,
    "inventory_history_pending_creation_disappeared",
    "invalid_inventory_history_pending_creation",
  );
  if (
    !hasExactKeys(raw, HISTORY_PENDING_CREATION_KEYS) ||
    raw.schema !== "void_buy_void_inventory_history_pending_creation_v1" ||
    raw.marker !== VOID_BUY_VOID_INVENTORY_HISTORY_PENDING_CREATION_V1
  ) {
    throw new Error("invalid_inventory_history_pending_creation");
  }
  const kind = raw.kind as BuyVoidInventoryHistoryKindV1;
  const poolId = raw.pool_id;
  const recordId = raw.record_id;
  const fingerprint = raw.record_identity_fingerprint_sha256;
  if (
    typeof kind !== "string" ||
    !["reservation", "paid_unreservable_obligation"].includes(kind) ||
    typeof poolId !== "string" ||
    !SAFE_CODE.test(poolId) ||
    typeof recordId !== "string" ||
    !SHA256.test(recordId) ||
    typeof fingerprint !== "string" ||
    !SHA256.test(fingerprint) ||
    !raw.record ||
    typeof raw.record !== "object" ||
    Array.isArray(raw.record) ||
    !raw.index_entry ||
    typeof raw.index_entry !== "object" ||
    Array.isArray(raw.index_entry) ||
    !raw.anchor_entry ||
    typeof raw.anchor_entry !== "object" ||
    Array.isArray(raw.anchor_entry)
  ) {
    throw new Error("invalid_inventory_history_pending_creation");
  }

  const record = kind === "reservation"
    ? parseReservation(raw.record as Record<string, unknown>)
    : parsePaidUnreservableObligation(
        raw.record as Record<string, unknown>,
      );
  if (
    record.pool_id !== poolId ||
    historyRecordId(kind, record) !== recordId ||
    historyRecordFingerprint(
      record as unknown as Record<string, unknown>,
    ) !== fingerprint ||
    path.basename(file) !== `${recordId}.json`
  ) {
    throw new Error("invalid_inventory_history_pending_creation");
  }

  const indexRaw = raw.index_entry as Record<string, unknown>;
  const anchorRaw = raw.anchor_entry as Record<string, unknown>;
  if (
    typeof indexRaw.sequence !== "number" ||
    typeof indexRaw.previous_entry_sha256 !== "string" ||
    typeof anchorRaw.sequence !== "number" ||
    typeof anchorRaw.previous_anchor_sha256 !== "string"
  ) {
    throw new Error("invalid_inventory_history_pending_creation");
  }
  const indexEntry = parseHistoryIndexEntry(
    paths,
    indexRaw,
    indexRaw.sequence,
    indexRaw.previous_entry_sha256,
  );
  const anchorEntry = parseHistoryAnchorEntry(
    paths,
    anchorRaw,
    anchorRaw.sequence,
    anchorRaw.previous_anchor_sha256,
  );

  if (
    indexEntry.sequence !== anchorEntry.sequence ||
    indexEntry.kind !== kind ||
    anchorEntry.kind !== kind ||
    indexEntry.pool_id !== poolId ||
    anchorEntry.pool_id !== poolId ||
    indexEntry.record_id !== recordId ||
    anchorEntry.record_id !== recordId ||
    indexEntry.record_identity_fingerprint_sha256 !== fingerprint ||
    anchorEntry.record_identity_fingerprint_sha256 !== fingerprint ||
    anchorEntry.history_index_entry_sha256 !== indexEntry.entry_sha256
  ) {
    throw new Error("invalid_inventory_history_pending_creation");
  }

  return {
    schema: "void_buy_void_inventory_history_pending_creation_v1",
    marker: VOID_BUY_VOID_INVENTORY_HISTORY_PENDING_CREATION_V1,
    kind,
    pool_id: poolId,
    record_id: recordId,
    record_identity_fingerprint_sha256: fingerprint,
    record,
    index_entry: indexEntry,
    anchor_entry: anchorEntry,
  };
}

function readPendingHistoryCreation(
  paths: BuyVoidInventoryReservationJournalPathsV1,
): BuyVoidInventoryHistoryPendingCreationV1 | null {
  const names = pendingHistoryNames(paths);
  if (names.length === 0) return null;
  if (names.length !== 1) {
    throw new Error("inventory_history_multiple_pending_creations");
  }
  return parsePendingHistoryCreation(
    paths,
    path.join(paths.pending_history_dir, names[0]),
  );
}

function anyHistoryDirectoryEntries(
  paths: BuyVoidInventoryReservationJournalPathsV1,
): boolean {
  return [
    canonicalHistoryNames(
      paths.reservation_expectations_dir,
      "invalid_inventory_reservation_expectation_filename",
    ),
    canonicalHistoryNames(
      paths.reservations_dir,
      "invalid_inventory_reservation_history_filename",
    ),
    canonicalHistoryNames(
      paths.obligation_expectations_dir,
      "invalid_paid_unreservable_expectation_filename",
    ),
    canonicalHistoryNames(
      paths.holds_dir,
      "invalid_paid_unreservable_history_filename",
    ),
  ].some((names) => names.length > 0);
}

function readHistoryIndex(
  paths: BuyVoidInventoryReservationJournalPathsV1,
): BuyVoidInventoryHistoryIndexEntryV1[] {
  const output: BuyVoidInventoryHistoryIndexEntryV1[] = [];
  const seen = new Set<string>();
  let previousEntrySha256 = HISTORY_INDEX_GENESIS_SHA256;
  let scan: ReturnType<typeof scanBoundedAuthoritativeLines>;
  try {
    scan = scanBoundedAuthoritativeLines(
      paths.history_index_file,
      "invalid_inventory_history_index_file",
      (line, index) => {
    if (!line) {
      throw new Error("invalid_inventory_history_index_blank_line");
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      throw new Error("invalid_inventory_history_index_entry_json");
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("invalid_inventory_history_index_entry");
    }
    const entry = parseHistoryIndexEntry(
      paths,
      parsed as Record<string, unknown>,
      index + 1,
      previousEntrySha256,
    );
    const key = `${entry.kind}:${entry.record_id}`;
    if (seen.has(key)) {
      throw new Error("inventory_history_index_duplicate_record");
    }
    seen.add(key);
    output.push(entry);
    previousEntrySha256 = entry.entry_sha256;
      },
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      if (anyHistoryDirectoryEntries(paths)) {
        throw new Error(
          "inventory_history_index_missing_for_existing_history",
        );
      }
      return [];
    }
    throw error;
  }
  if (scan.line_count === 0 && scan.trailing_bytes.length === 0) {
    throw new Error("inventory_history_index_empty");
  }
  if (scan.trailing_bytes.length !== 0) {
    throw new Error("inventory_history_index_truncated_tail");
  }

  return output;
}

function readConsistentHistoryState(
  paths: BuyVoidInventoryReservationJournalPathsV1,
): {
  anchors: BuyVoidInventoryHistoryAnchorEntryV1[];
  entries: BuyVoidInventoryHistoryIndexEntryV1[];
} {
  if (readPendingHistoryCreation(paths)) {
    throw new Error("inventory_history_pending_creation_requires_recovery");
  }
  const anchors = readHistoryAnchor(paths);
  const entries = readHistoryIndex(paths);
  assertHistoryAnchorIndexConsistency(anchors, entries);
  assertHistoryIndexDirectorySets(paths, entries);
  return { anchors, entries };
}

function historyNamesFromIndex(
  entries: readonly BuyVoidInventoryHistoryIndexEntryV1[],
  kind: BuyVoidInventoryHistoryKindV1,
): string[] {
  return entries
    .filter((entry) => entry.kind === kind)
    .map((entry) => `${entry.record_id}.json`)
    .sort();
}

function assertHistoryIndexDirectorySets(
  paths: BuyVoidInventoryReservationJournalPathsV1,
  entries: readonly BuyVoidInventoryHistoryIndexEntryV1[],
): void {
  const reservationNames = historyNamesFromIndex(entries, "reservation");
  const reservationExpectations = canonicalHistoryNames(
    paths.reservation_expectations_dir,
    "invalid_inventory_reservation_expectation_filename",
  );
  const reservations = canonicalHistoryNames(
    paths.reservations_dir,
    "invalid_inventory_reservation_history_filename",
  );
  if (
    !historySetsMatch(reservationNames, reservationExpectations) ||
    !historySetsMatch(reservationNames, reservations)
  ) {
    throw new Error(
      "inventory_reservation_history_expected_set_mismatch",
    );
  }

  const obligationNames = historyNamesFromIndex(
    entries,
    "paid_unreservable_obligation",
  );
  const obligationExpectations = canonicalHistoryNames(
    paths.obligation_expectations_dir,
    "invalid_paid_unreservable_expectation_filename",
  );
  const obligations = canonicalHistoryNames(
    paths.holds_dir,
    "invalid_paid_unreservable_history_filename",
  );
  if (
    !historySetsMatch(obligationNames, obligationExpectations) ||
    !historySetsMatch(obligationNames, obligations)
  ) {
    throw new Error(
      "paid_unreservable_history_expected_set_mismatch",
    );
  }
}

function appendHistoryIndexEntry(
  paths: BuyVoidInventoryReservationJournalPathsV1,
  entry: BuyVoidInventoryHistoryIndexEntryV1,
): void {
  withPinnedPrivateDirectoryV1(
    paths.pool_dir,
    true,
    (stableParent, parentFd) => {
      const stableFile = path.join(
        stableParent,
        path.basename(paths.history_index_file),
      );
      let exists = false;
      try {
        const stat = fs.lstatSync(stableFile, { bigint: true });
        assertAuthoritativeFileStat(
          stat,
          "invalid_inventory_history_index_file",
        );
        exists = true;
      } catch (error) {
        if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") {
          throw error;
        }
      }

      const descriptor = fs.openSync(
        stableFile,
        fs.constants.O_WRONLY |
          fs.constants.O_APPEND |
          (exists ? 0 : fs.constants.O_CREAT | fs.constants.O_EXCL) |
          (fs.constants.O_NOFOLLOW || 0),
        0o600,
      );
      try {
        assertAuthoritativeFileStat(
          fs.fstatSync(descriptor, { bigint: true }),
          "invalid_inventory_history_index_file",
        );
        fs.writeFileSync(
          descriptor,
          `${JSON.stringify(entry)}\n`,
          "utf8",
        );
        fs.fsyncSync(descriptor);
      } finally {
        fs.closeSync(descriptor);
      }
      fs.fsyncSync(parentFd);
    },
  );
}

function buildHistoryIndexEntry(
  kind: BuyVoidInventoryHistoryKindV1,
  record: BuyVoidInventoryHistoryRecordV1,
  entries: readonly BuyVoidInventoryHistoryIndexEntryV1[],
): BuyVoidInventoryHistoryIndexEntryV1 {
  const sequence = entries.length + 1;
  const previousEntrySha256 = entries.length > 0
    ? entries[entries.length - 1].entry_sha256
    : HISTORY_INDEX_GENESIS_SHA256;
  const recordFingerprint = historyRecordFingerprint(
    record as unknown as Record<string, unknown>,
  );
  const entryBase = {
    sequence,
    kind,
    pool_id: record.pool_id,
    record_id: historyRecordId(kind, record),
    record_identity_fingerprint_sha256: recordFingerprint,
    previous_entry_sha256: previousEntrySha256,
  };
  return {
    schema: "void_buy_void_inventory_history_index_entry_v1",
    marker: VOID_BUY_VOID_INVENTORY_HISTORY_INDEX_V1,
    ...entryBase,
    entry_sha256: historyIndexEntrySha256(entryBase),
  };
}

function historyExpectationDir(
  paths: BuyVoidInventoryReservationJournalPathsV1,
  kind: BuyVoidInventoryHistoryKindV1,
): string {
  return kind === "reservation"
    ? paths.reservation_expectations_dir
    : paths.obligation_expectations_dir;
}

function historyRecordFile(
  paths: BuyVoidInventoryReservationJournalPathsV1,
  kind: BuyVoidInventoryHistoryKindV1,
  recordId: string,
): string {
  return kind === "reservation"
    ? reservationFile(paths, recordId)
    : obligationFile(paths, recordId);
}

function parseHistoryExpectation(
  raw: Record<string, unknown>,
  kind: BuyVoidInventoryHistoryKindV1,
  poolId: string,
  recordId: string,
): BuyVoidInventoryHistoryExpectationV1 {
  if (
    !hasExactKeys(raw, HISTORY_EXPECTATION_KEYS) ||
    raw.schema !== "void_buy_void_inventory_history_expectation_v1" ||
    raw.marker !== VOID_BUY_VOID_INVENTORY_HISTORY_EXPECTATION_V1 ||
    raw.kind !== kind ||
    raw.pool_id !== poolId ||
    raw.record_id !== recordId ||
    typeof raw.record_identity_fingerprint_sha256 !== "string" ||
    !SHA256.test(raw.record_identity_fingerprint_sha256)
  ) {
    throw new Error("invalid_inventory_history_expectation_record");
  }
  return raw as BuyVoidInventoryHistoryExpectationV1;
}

function ensureHistoryExpectation(
  paths: BuyVoidInventoryReservationJournalPathsV1,
  kind: BuyVoidInventoryHistoryKindV1,
  record: BuyVoidInventoryReservationV1 | BuyVoidPaidUnreservableObligationV1,
): void {
  const recordId = kind === "reservation"
    ? (record as BuyVoidInventoryReservationV1).reservation_id
    : (record as BuyVoidPaidUnreservableObligationV1).obligation_id;
  const poolId = record.pool_id;
  const expectationDir = historyExpectationDir(paths, kind);
  const expectationFile = path.join(expectationDir, `${recordId}.json`);
  const durableRecordFile = historyRecordFile(paths, kind, recordId);

  if (
    pinnedFileExists(durableRecordFile) &&
    !pinnedFileExists(expectationFile)
  ) {
    throw new Error(
      kind === "reservation"
        ? "inventory_reservation_history_expectation_missing_for_existing_record"
        : "paid_unreservable_history_expectation_missing_for_existing_record",
    );
  }

  const recordFingerprint = historyRecordFingerprint(
    record as unknown as Record<string, unknown>,
  );
  const indexEntry = readHistoryIndex(paths).find(
    (entry) => entry.kind === kind && entry.record_id === recordId,
  );
  if (
    !indexEntry ||
    indexEntry.pool_id !== poolId ||
    indexEntry.record_identity_fingerprint_sha256 !== recordFingerprint
  ) {
    throw new Error(
      "inventory_history_expectation_missing_index_commitment",
    );
  }

  const expectation: BuyVoidInventoryHistoryExpectationV1 = {
    schema: "void_buy_void_inventory_history_expectation_v1",
    marker: VOID_BUY_VOID_INVENTORY_HISTORY_EXPECTATION_V1,
    kind,
    pool_id: poolId,
    record_id: recordId,
    record_identity_fingerprint_sha256: recordFingerprint,
  };

  ensurePrivateDir(expectationDir);
  const created = atomicCreateJson(expectationFile, expectation);
  if (created === "created") return;

  const existingRaw = readRequiredHistoryJsonObject(
    expectationFile,
    "inventory_history_expectation_disappeared",
    "invalid_inventory_history_expectation_record",
  );
  const existing = parseHistoryExpectation(
    existingRaw,
    kind,
    poolId,
    recordId,
  );
  if (
    existing.record_identity_fingerprint_sha256 !==
      expectation.record_identity_fingerprint_sha256
  ) {
    throw new Error("inventory_history_expectation_identity_conflict");
  }
}

function historySetsMatch(
  expectedNames: readonly string[],
  recordNames: readonly string[],
): boolean {
  return expectedNames.length === recordNames.length &&
    expectedNames.every((name, index) => name === recordNames[index]);
}

function buildHistoryAnchorEntry(
  kind: BuyVoidInventoryHistoryKindV1,
  record: BuyVoidInventoryHistoryRecordV1,
  indexEntry: BuyVoidInventoryHistoryIndexEntryV1,
  anchors: readonly BuyVoidInventoryHistoryAnchorEntryV1[],
): BuyVoidInventoryHistoryAnchorEntryV1 {
  const sequence = anchors.length + 1;
  if (sequence !== indexEntry.sequence) {
    throw new Error("inventory_history_anchor_sequence_mismatch");
  }
  const previousAnchorSha256 = anchors.length > 0
    ? anchors[anchors.length - 1].anchor_sha256
    : HISTORY_ANCHOR_GENESIS_SHA256;
  const base = {
    sequence,
    kind,
    pool_id: record.pool_id,
    record_id: historyRecordId(kind, record),
    record_identity_fingerprint_sha256:
      historyRecordFingerprint(
        record as unknown as Record<string, unknown>,
      ),
    history_index_entry_sha256: indexEntry.entry_sha256,
    previous_anchor_sha256: previousAnchorSha256,
  };
  return {
    schema: "void_buy_void_inventory_history_anchor_entry_v1",
    marker: VOID_BUY_VOID_INVENTORY_HISTORY_ANCHOR_V1,
    ...base,
    anchor_sha256: historyAnchorEntrySha256(base),
  };
}

function pendingHistoryFile(
  paths: BuyVoidInventoryReservationJournalPathsV1,
  recordId: string,
): string {
  if (!SHA256.test(recordId)) {
    throw new Error("invalid_inventory_history_pending_record_id");
  }
  return path.join(paths.pending_history_dir, `${recordId}.json`);
}

function exactIndexEntryMatch(
  left: BuyVoidInventoryHistoryIndexEntryV1,
  right: BuyVoidInventoryHistoryIndexEntryV1,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function exactAnchorEntryMatch(
  left: BuyVoidInventoryHistoryAnchorEntryV1,
  right: BuyVoidInventoryHistoryAnchorEntryV1,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function syncRegularFile(file: string): void {
  withPinnedPrivateDirectoryV1(path.dirname(file), false, (stableParent) => {
    const descriptor = fs.openSync(
      path.join(stableParent, path.basename(file)),
      fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0),
    );
    try {
      assertAuthoritativeFileStat(
        fs.fstatSync(descriptor, { bigint: true }),
        "invalid_inventory_authoritative_file",
      );
      fs.fsyncSync(descriptor);
    } finally {
      fs.closeSync(descriptor);
    }
  });
}

function repairTornAppendFromPending(
  file: string,
  expectedLine: string,
  expectedCompleteLineCount: number,
  parentDir: string,
  invalidReason: string,
): void {
  withPinnedPrivateDirectoryV1(parentDir, false, (stableParent, parentFd) => {
    const stableFile = path.join(stableParent, path.basename(file));
    let stat: ReturnType<typeof fs.lstatSync>;
    try {
      stat = fs.lstatSync(stableFile);
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return;
      throw error;
    }
    if (!stat.isFile() || stat.isSymbolicLink()) {
      throw new Error(invalidReason);
    }
    const scan = scanBoundedAuthoritativeLines(
      stableFile,
      invalidReason,
      () => undefined,
    );
    if (scan.trailing_bytes.length === 0) {
      // A complete visible line after a prior fsync failure is not committed
      // until this recovery attempt re-establishes file and directory durability.
      syncRegularFile(stableFile);
      fs.fsyncSync(parentFd);
      return;
    }

    let tornTail: string;
    try {
      tornTail = new TextDecoder("utf-8", { fatal: true }).decode(
        scan.trailing_bytes,
      );
    } catch {
      throw new Error(invalidReason);
    }

    if (
      scan.line_count !== expectedCompleteLineCount ||
      !expectedLine.startsWith(tornTail)
    ) {
      throw new Error(invalidReason);
    }

    if (scan.complete_bytes === 0) {
      fs.unlinkSync(stableFile);
    } else {
      fs.truncateSync(stableFile, scan.complete_bytes);
      syncRegularFile(stableFile);
    }
    fs.fsyncSync(parentFd);
  });
}

function assertHistoryProjectionMatchesPending(
  paths: BuyVoidInventoryReservationJournalPathsV1,
  pending: BuyVoidInventoryHistoryPendingCreationV1,
): void {
  const recordFile = historyRecordFile(
    paths,
    pending.kind,
    pending.record_id,
  );
  const recordRaw = readRequiredHistoryJsonObject(
    recordFile,
    pending.kind === "reservation"
      ? "inventory_reservation_history_record_disappeared"
      : "paid_unreservable_history_record_disappeared",
    pending.kind === "reservation"
      ? "invalid_inventory_reservation_history_record"
      : "invalid_paid_unreservable_history_record",
  );
  const record = pending.kind === "reservation"
    ? parseReservation(recordRaw)
    : parsePaidUnreservableObligation(recordRaw);
  if (
    historyRecordId(pending.kind, record) !== pending.record_id ||
    historyRecordFingerprint(
      record as unknown as Record<string, unknown>,
    ) !== pending.record_identity_fingerprint_sha256
  ) {
    throw new Error("inventory_history_pending_record_identity_conflict");
  }

  const expectationRaw = readRequiredHistoryJsonObject(
    path.join(
      historyExpectationDir(paths, pending.kind),
      `${pending.record_id}.json`,
    ),
    "inventory_history_expectation_disappeared",
    "invalid_inventory_history_expectation_record",
  );
  const expectation = parseHistoryExpectation(
    expectationRaw,
    pending.kind,
    pending.pool_id,
    pending.record_id,
  );
  if (
    expectation.record_identity_fingerprint_sha256 !==
      pending.record_identity_fingerprint_sha256
  ) {
    throw new Error("inventory_history_pending_expectation_identity_conflict");
  }
}

function ensurePendingHistoryIndexEntry(
  paths: BuyVoidInventoryReservationJournalPathsV1,
  anchors: readonly BuyVoidInventoryHistoryAnchorEntryV1[],
  pending: BuyVoidInventoryHistoryPendingCreationV1,
): BuyVoidInventoryHistoryIndexEntryV1[] {
  repairTornAppendFromPending(
    paths.history_index_file,
    JSON.stringify(pending.index_entry),
    pending.index_entry.sequence - 1,
    paths.pool_dir,
    "inventory_history_index_truncated_tail",
  );
  const entries = readHistoryIndex(paths);
  const committedCount = pending.index_entry.sequence - 1;
  if (anchors.length !== committedCount) {
    throw new Error("inventory_history_pending_anchor_sequence_conflict");
  }
  assertHistoryAnchorIndexConsistency(
    anchors,
    entries.slice(0, committedCount),
  );

  if (entries.length === committedCount) {
    appendHistoryIndexEntry(paths, pending.index_entry);
  } else if (
    entries.length !== pending.index_entry.sequence ||
    !exactIndexEntryMatch(
      entries[entries.length - 1],
      pending.index_entry,
    )
  ) {
    throw new Error("inventory_history_pending_index_conflict");
  }

  const verified = readHistoryIndex(paths);
  if (
    verified.length !== pending.index_entry.sequence ||
    !exactIndexEntryMatch(
      verified[verified.length - 1],
      pending.index_entry,
    )
  ) {
    throw new Error("inventory_history_pending_index_verification_failed");
  }
  return verified;
}

function ensurePendingHistoryProjection(
  paths: BuyVoidInventoryReservationJournalPathsV1,
  pending: BuyVoidInventoryHistoryPendingCreationV1,
): void {
  ensureHistoryExpectation(paths, pending.kind, pending.record);
  const file = historyRecordFile(
    paths,
    pending.kind,
    pending.record_id,
  );
  const created = atomicCreateJson(file, pending.record);
  if (created === "exists") {
    const raw = readRequiredHistoryJsonObject(
      file,
      pending.kind === "reservation"
        ? "inventory_reservation_history_record_disappeared"
        : "paid_unreservable_history_record_disappeared",
      pending.kind === "reservation"
        ? "invalid_inventory_reservation_history_record"
        : "invalid_paid_unreservable_history_record",
    );
    const existing = pending.kind === "reservation"
      ? parseReservation(raw)
      : parsePaidUnreservableObligation(raw);
    if (
      historyRecordId(pending.kind, existing) !== pending.record_id ||
      historyRecordFingerprint(
        existing as unknown as Record<string, unknown>,
      ) !== pending.record_identity_fingerprint_sha256
    ) {
      throw new Error("inventory_history_pending_record_identity_conflict");
    }
  }
  assertHistoryProjectionMatchesPending(paths, pending);
}

function deletePendingHistoryCreation(
  paths: BuyVoidInventoryReservationJournalPathsV1,
  pending: BuyVoidInventoryHistoryPendingCreationV1,
): void {
  withPinnedPrivateDirectoryV1(
    paths.pending_history_dir,
    false,
    (stableParent, parentFd) => {
      fs.unlinkSync(path.join(stableParent, `${pending.record_id}.json`));
      fs.fsyncSync(parentFd);
    },
  );
}

function recoverPendingHistoryCreation(
  paths: BuyVoidInventoryReservationJournalPathsV1,
): void {
  const pending = readPendingHistoryCreation(paths);
  if (!pending) return;

  repairTornAppendFromPending(
    paths.history_anchor_file,
    JSON.stringify(pending.anchor_entry),
    pending.anchor_entry.sequence - 1,
    paths.history_anchor_pool_dir,
    "inventory_history_anchor_truncated_tail",
  );
  let anchors = readHistoryAnchor(paths);

  if (
    anchors.length === pending.anchor_entry.sequence &&
    exactAnchorEntryMatch(
      anchors[anchors.length - 1],
      pending.anchor_entry,
    )
  ) {
    const entries = readHistoryIndex(paths);
    assertHistoryAnchorIndexConsistency(anchors, entries);
    assertHistoryIndexDirectorySets(paths, entries);
    assertHistoryProjectionMatchesPending(paths, pending);
    deletePendingHistoryCreation(paths, pending);
    return;
  }

  if (anchors.length !== pending.anchor_entry.sequence - 1) {
    throw new Error("inventory_history_pending_anchor_conflict");
  }
  const expectedPreviousAnchor = anchors.length > 0
    ? anchors[anchors.length - 1].anchor_sha256
    : HISTORY_ANCHOR_GENESIS_SHA256;
  if (
    pending.anchor_entry.previous_anchor_sha256 !== expectedPreviousAnchor
  ) {
    throw new Error("inventory_history_pending_anchor_predecessor_conflict");
  }

  const entries = ensurePendingHistoryIndexEntry(paths, anchors, pending);
  ensurePendingHistoryProjection(paths, pending);
  assertHistoryIndexDirectorySets(paths, entries);

  appendHistoryAnchorEntry(paths, pending.anchor_entry);
  anchors = readHistoryAnchor(paths);
  if (
    anchors.length !== pending.anchor_entry.sequence ||
    !exactAnchorEntryMatch(
      anchors[anchors.length - 1],
      pending.anchor_entry,
    )
  ) {
    throw new Error("inventory_history_anchor_append_verification_failed");
  }
  assertHistoryAnchorIndexConsistency(anchors, entries);
  assertHistoryProjectionMatchesPending(paths, pending);
  deletePendingHistoryCreation(paths, pending);
}

function commitHistoryRecordCrashConsistent(
  paths: BuyVoidInventoryReservationJournalPathsV1,
  kind: BuyVoidInventoryHistoryKindV1,
  record: BuyVoidInventoryHistoryRecordV1,
): void {
  const state = readConsistentHistoryState(paths);
  const indexEntry = buildHistoryIndexEntry(
    kind,
    record,
    state.entries,
  );
  const anchorEntry = buildHistoryAnchorEntry(
    kind,
    record,
    indexEntry,
    state.anchors,
  );
  const recordId = historyRecordId(kind, record);
  const fingerprint = historyRecordFingerprint(
    record as unknown as Record<string, unknown>,
  );
  const pending: BuyVoidInventoryHistoryPendingCreationV1 = {
    schema: "void_buy_void_inventory_history_pending_creation_v1",
    marker: VOID_BUY_VOID_INVENTORY_HISTORY_PENDING_CREATION_V1,
    kind,
    pool_id: record.pool_id,
    record_id: recordId,
    record_identity_fingerprint_sha256: fingerprint,
    record,
    index_entry: indexEntry,
    anchor_entry: anchorEntry,
  };

  ensurePrivateDir(paths.pending_history_dir);
  const created = atomicCreateJson(
    pendingHistoryFile(paths, recordId),
    pending,
  );
  if (created !== "created") {
    throw new Error("inventory_history_pending_creation_conflict");
  }
  recoverPendingHistoryCreation(paths);
}

function reservationIdFor(
  policy: NormalizedPolicyV1,
  intent: BuyVoidFulfillmentJournalIntentV1,
): string {
  return sha256Hex(
    [
      "void-buy-inventory-reservation-v1",
      policy.pool_key_sha256,
      intent.payment_key_sha256,
      intent.claim.instruction_id,
    ].join("\n"),
  );
}

function reservationFile(
  paths: BuyVoidInventoryReservationJournalPathsV1,
  reservationId: string,
): string {
  if (!SHA256.test(reservationId)) {
    throw new Error("invalid_inventory_reservation_id");
  }
  return path.join(
    paths.reservations_dir,
    `${reservationId}.json`,
  );
}

function obligationIdFor(
  policy: NormalizedPolicyV1,
  intent: BuyVoidFulfillmentJournalIntentV1,
): string {
  return sha256Hex(
    [
      "void-buy-paid-unreservable-obligation-v1",
      policy.pool_key_sha256,
      intent.payment_key_sha256,
      intent.request_key_sha256,
      intent.claim.instruction_id,
    ].join("\n"),
  );
}

function obligationFile(
  paths: BuyVoidInventoryReservationJournalPathsV1,
  obligationId: string,
): string {
  if (!SHA256.test(obligationId)) {
    throw new Error("invalid_paid_unreservable_obligation_id");
  }
  return path.join(paths.holds_dir, `${obligationId}.json`);
}

function parsePaidUnreservableObligation(
  raw: Record<string, unknown>,
): BuyVoidPaidUnreservableObligationV1 {
  const poolId = String(raw.pool_id || "");
  const paymentKey = String(raw.payment_key_sha256 || "");
  const requestKey = String(raw.request_key_sha256 || "");
  const instructionId = String(raw.instruction_id || "");
  const expectedPoolKey = SAFE_CODE.test(poolId)
    ? sha256Hex(`void-buy-inventory-pool-v1\n${poolId}`)
    : "";
  const expectedObligationId =
    expectedPoolKey &&
    SHA256.test(paymentKey) &&
    SHA256.test(requestKey) &&
    SAFE_CODE.test(instructionId)
      ? sha256Hex(
          [
            "void-buy-paid-unreservable-obligation-v1",
            expectedPoolKey,
            paymentKey,
            requestKey,
            instructionId,
          ].join("\n"),
        )
      : "";
  const exactStringFields = [
    "schema", "marker", "obligation_id", "terminal_state",
    "reservation_failure_reason", "pool_id", "inventory_policy_version",
    "pool_capacity_void_units", "inventory_policy_fingerprint_sha256",
    "available_void_units", "requested_void_units", "source_chain",
    "payment_transaction_hash", "payment_log_index", "confirmed_block_number",
    "confirmation_count_at_claim", "payment_usdc_units", "payment_key_sha256",
    "request_key_sha256", "canonical_payment_identity", "request_id",
    "instruction_id", "delivery_address",
  ] as const;
  if (
    !hasExactKeys(raw, PAID_UNRESERVABLE_OBLIGATION_RECORD_KEYS) ||
    !hasStringFields(raw, exactStringFields) ||
    raw.schema !== "void_buy_void_paid_unreservable_obligation_v1" ||
    raw.marker !== VOID_BUY_VOID_PAID_UNRESERVABLE_OBLIGATION_V1 ||
    String(raw.obligation_id || "") !== expectedObligationId ||
    !Number.isSafeInteger(raw.recorded_at_ms) ||
    Number(raw.recorded_at_ms) <= 0 ||
    raw.terminal_state !== "operator_reconciliation_required" ||
    !["inventory_sold_out", "insufficient_void_inventory"].includes(
      String(raw.reservation_failure_reason || ""),
    ) ||
    !SAFE_CODE.test(poolId) ||
    !SAFE_CODE.test(String(raw.inventory_policy_version || "")) ||
    !isCanonicalUnsignedString(raw.pool_capacity_void_units, true) ||
    !SHA256.test(String(raw.inventory_policy_fingerprint_sha256 || "")) ||
    !isCanonicalUnsignedString(raw.available_void_units, false) ||
    !isCanonicalUnsignedString(raw.requested_void_units, true) ||
    !SAFE_CODE.test(String(raw.source_chain || "")) ||
    !TX_HASH.test(String(raw.payment_transaction_hash || "")) ||
    !isCanonicalUnsignedString(raw.payment_log_index, false) ||
    !isCanonicalUnsignedString(raw.confirmed_block_number, true) ||
    !isCanonicalUnsignedString(raw.confirmation_count_at_claim, true) ||
    !isCanonicalUnsignedString(raw.payment_usdc_units, true) ||
    !SHA256.test(paymentKey) ||
    !SHA256.test(requestKey) ||
    !String(raw.canonical_payment_identity || "").trim() ||
    !SAFE_CODE.test(String(raw.request_id || "")) ||
    !SAFE_CODE.test(instructionId) ||
    !normalizeAddress(raw.delivery_address) ||
    raw.customer_payment_confirmed !== true ||
    raw.reservation_created !== false ||
    raw.automatic_retry !== false ||
    raw.refund_execution_authorized !== false ||
    raw.alternate_fulfillment_execution_authorized !== false ||
    raw.wallet_access_authorized !== false ||
    raw.signing_authorized !== false ||
    raw.transaction_broadcast_authorized !== false ||
    raw.money_movement_authorized !== false
  ) {
    throw new Error("invalid_paid_unreservable_obligation_record");
  }
  return raw as BuyVoidPaidUnreservableObligationV1;
}

function assertExistingPaidObligationIdentity(
  existing: BuyVoidPaidUnreservableObligationV1,
  policy: NormalizedPolicyV1,
  intent: BuyVoidFulfillmentJournalIntentV1,
  requestedVoidUnits: string,
): void {
  const binding = intent.verification_binding;
  const expected: Record<string, string> = {
    pool_id: policy.pool_id,
    inventory_policy_version: policy.inventory_policy_version,
    pool_capacity_void_units: policy.capacity.toString(),
    inventory_policy_fingerprint_sha256: policy.policy_fingerprint,
    requested_void_units: requestedVoidUnits,
    source_chain: binding.source_chain,
    payment_transaction_hash: binding.payment_transaction_hash,
    payment_log_index: binding.payment_log_index,
    confirmed_block_number: binding.confirmed_block_number,
    confirmation_count_at_claim: binding.confirmation_count_at_claim,
    payment_usdc_units: binding.payment_usdc_units,
    payment_key_sha256: intent.payment_key_sha256,
    request_key_sha256: intent.request_key_sha256,
    canonical_payment_identity: intent.claim.canonical_payment_identity,
    request_id: intent.claim.request_id,
    instruction_id: intent.claim.instruction_id,
    delivery_address: String(
      intent.claim.unsigned_instruction.delivery_address,
    ).toLowerCase(),
  };
  for (const [key, value] of Object.entries(expected)) {
    if (String((existing as any)[key] ?? "") !== value) {
      throw new Error("paid_unreservable_obligation_identity_conflict");
    }
  }
}

function recordPaidUnreservableObligation(
  paths: BuyVoidInventoryReservationJournalPathsV1,
  intent: BuyVoidFulfillmentJournalIntentV1,
  policy: NormalizedPolicyV1,
  reason: "inventory_sold_out" | "insufficient_void_inventory",
  availableVoidUnits: string,
  requestedVoidUnits: string,
  nowMs: number,
): BuyVoidPaidUnreservableObligationV1 {
  ensurePrivateDir(paths.holds_dir);
  const obligationId = obligationIdFor(policy, intent);
  const existing = listPaidUnreservableObligationsFromPaths(paths).find(
    (item) => item.obligation_id === obligationId,
  );
  if (existing) {
    assertExistingPaidObligationIdentity(
      existing,
      policy,
      intent,
      requestedVoidUnits,
    );
    return existing;
  }

  const binding = intent.verification_binding;
  const record: BuyVoidPaidUnreservableObligationV1 = {
    schema: "void_buy_void_paid_unreservable_obligation_v1",
    marker: VOID_BUY_VOID_PAID_UNRESERVABLE_OBLIGATION_V1,
    obligation_id: obligationId,
    recorded_at_ms: nowMs,
    terminal_state: "operator_reconciliation_required",
    reservation_failure_reason: reason,
    pool_id: policy.pool_id,
    inventory_policy_version: policy.inventory_policy_version,
    pool_capacity_void_units: policy.capacity.toString(),
    inventory_policy_fingerprint_sha256: policy.policy_fingerprint,
    available_void_units: availableVoidUnits,
    requested_void_units: requestedVoidUnits,
    source_chain: binding.source_chain,
    payment_transaction_hash: binding.payment_transaction_hash,
    payment_log_index: binding.payment_log_index,
    confirmed_block_number: binding.confirmed_block_number,
    confirmation_count_at_claim: binding.confirmation_count_at_claim,
    payment_usdc_units: binding.payment_usdc_units,
    payment_key_sha256: intent.payment_key_sha256,
    request_key_sha256: intent.request_key_sha256,
    canonical_payment_identity: intent.claim.canonical_payment_identity,
    request_id: intent.claim.request_id,
    instruction_id: intent.claim.instruction_id,
    delivery_address: String(
      intent.claim.unsigned_instruction.delivery_address,
    ).toLowerCase(),
    customer_payment_confirmed: true,
    reservation_created: false,
    automatic_retry: false,
    refund_execution_authorized: false,
    alternate_fulfillment_execution_authorized: false,
    wallet_access_authorized: false,
    signing_authorized: false,
    transaction_broadcast_authorized: false,
    money_movement_authorized: false,
  };

  commitHistoryRecordCrashConsistent(
    paths,
    "paid_unreservable_obligation",
    record,
  );
  return record;
}

function parseReservation(
  raw: Record<string, unknown>,
): BuyVoidInventoryReservationV1 {
  const reservationId = String(raw.reservation_id || "");
  const poolId = String(raw.pool_id || "");
  const paymentKey = String(raw.payment_key_sha256 || "");
  const instructionId = String(raw.instruction_id || "");
  const capacity = parsePositiveInteger(
    raw.pool_capacity_void_units,
  );
  const committedBefore = parseNonNegativeInteger(
    raw.committed_before_void_units,
  );
  const reserved = parsePositiveInteger(raw.reserved_void_units);
  const committedAfter = parsePositiveInteger(
    raw.committed_after_void_units,
  );
  const availableAfter = parseNonNegativeInteger(
    raw.available_after_void_units,
  );
  const expectedPoolKey = SAFE_CODE.test(poolId)
    ? sha256Hex(`void-buy-inventory-pool-v1\n${poolId}`)
    : "";
  const expectedReservationId =
    expectedPoolKey &&
    SHA256.test(paymentKey) &&
    SAFE_CODE.test(instructionId)
      ? sha256Hex(
          [
            "void-buy-inventory-reservation-v1",
            expectedPoolKey,
            paymentKey,
            instructionId,
          ].join("\n"),
        )
      : "";
  const exactStringFields = [
    "schema", "marker", "reservation_id", "pool_id",
    "inventory_policy_version", "pool_capacity_void_units",
    "committed_before_void_units", "reserved_void_units",
    "committed_after_void_units", "available_after_void_units",
    "payment_key_sha256", "request_key_sha256",
    "canonical_payment_identity", "request_id", "instruction_id",
    "delivery_address", "intent_fingerprint", "reservation_status",
  ] as const;

  if (
    !hasExactKeys(raw, RESERVATION_RECORD_KEYS) ||
    !hasStringFields(raw, exactStringFields) ||
    raw.schema !== "void_buy_void_inventory_reservation_v1" ||
    raw.marker !== VOID_BUY_VOID_INVENTORY_RESERVATION_JOURNAL_V1 ||
    !SHA256.test(reservationId) ||
    reservationId !== expectedReservationId ||
    !SAFE_CODE.test(poolId) ||
    !SAFE_CODE.test(String(raw.inventory_policy_version || "")) ||
    !isCanonicalUnsignedString(raw.pool_capacity_void_units, true) ||
    !isCanonicalUnsignedString(raw.committed_before_void_units, false) ||
    !isCanonicalUnsignedString(raw.reserved_void_units, true) ||
    !isCanonicalUnsignedString(raw.committed_after_void_units, true) ||
    !isCanonicalUnsignedString(raw.available_after_void_units, false) ||
    capacity === null || committedBefore === null || reserved === null ||
    committedAfter === null || availableAfter === null ||
    committedBefore + reserved !== committedAfter ||
    committedAfter > capacity ||
    capacity - committedAfter !== availableAfter ||
    !Number.isSafeInteger(raw.reserved_at_ms) ||
    Number(raw.reserved_at_ms) <= 0 ||
    !SHA256.test(paymentKey) ||
    !SHA256.test(String(raw.request_key_sha256 || "")) ||
    !String(raw.canonical_payment_identity || "").trim() ||
    !SAFE_CODE.test(String(raw.request_id || "")) ||
    !SAFE_CODE.test(instructionId) ||
    !normalizeAddress(raw.delivery_address) ||
    !SHA256.test(String(raw.intent_fingerprint || "")) ||
    raw.reservation_status !== "reserved" ||
    raw.inventory_decrement_performed !== false ||
    raw.reservation_release_authorized !== false ||
    raw.execution_authorized_by_this_module !== false ||
    raw.signing_authorized_by_this_module !== false ||
    raw.transaction_broadcast_authorized_by_this_module !== false ||
    raw.money_movement_authorized_by_this_module !== false
  ) {
    throw new Error("invalid_inventory_reservation_record");
  }
  return raw as BuyVoidInventoryReservationV1;
}

function listReservationsFromPaths(
  paths: BuyVoidInventoryReservationJournalPathsV1,
): BuyVoidInventoryReservationV1[] {
  const historyIndex = readConsistentHistoryState(paths).entries;
  const expectedNames = historyNamesFromIndex(
    historyIndex,
    "reservation",
  );
  const expectationNames = canonicalHistoryNames(
    paths.reservation_expectations_dir,
    "invalid_inventory_reservation_expectation_filename",
  );
  const recordNames = canonicalHistoryNames(
    paths.reservations_dir,
    "invalid_inventory_reservation_history_filename",
  );
  if (
    !historySetsMatch(expectedNames, expectationNames) ||
    !historySetsMatch(expectedNames, recordNames)
  ) {
    throw new Error(
      "inventory_reservation_history_expected_set_mismatch",
    );
  }

  const output: BuyVoidInventoryReservationV1[] = [];
  for (const name of expectedNames) {
    const recordId = name.slice(0, -5);
    const raw = readRequiredHistoryJsonObject(
      path.join(paths.reservations_dir, name),
      "inventory_reservation_history_record_disappeared",
      "invalid_inventory_reservation_history_record",
    );
    const record = parseReservation(raw);
    if (record.reservation_id !== recordId) {
      throw new Error(
        "inventory_reservation_filename_content_identity_mismatch",
      );
    }

    const expectationRaw = readRequiredHistoryJsonObject(
      path.join(paths.reservation_expectations_dir, name),
      "inventory_reservation_history_expectation_disappeared",
      "invalid_inventory_reservation_history_expectation",
    );
    const expectation = parseHistoryExpectation(
      expectationRaw,
      "reservation",
      record.pool_id,
      recordId,
    );
    if (
      expectation.record_identity_fingerprint_sha256 !==
        historyRecordFingerprint(
          record as unknown as Record<string, unknown>,
        )
    ) {
      throw new Error(
        "inventory_reservation_history_fingerprint_mismatch",
      );
    }
    output.push(record);
  }

  output.sort((left, right) =>
    left.reservation_id.localeCompare(right.reservation_id),
  );
  return output;
}

export function listBuyVoidInventoryReservationsV1(input: {
  root_dir: string;
  pool_id: string;
}): BuyVoidInventoryReservationV1[] {
  return withPinnedInventoryRootV1(
    input.root_dir,
    false,
    (pinnedRootDir) =>
      listReservationsFromPaths(
        buyVoidInventoryReservationJournalPathsV1(
          pinnedRootDir,
          input.pool_id,
        ),
      ),
  );
}

function listPaidUnreservableObligationsFromPaths(
  paths: BuyVoidInventoryReservationJournalPathsV1,
): BuyVoidPaidUnreservableObligationV1[] {
  const historyIndex = readConsistentHistoryState(paths).entries;
  const expectedNames = historyNamesFromIndex(
    historyIndex,
    "paid_unreservable_obligation",
  );
  const expectationNames = canonicalHistoryNames(
    paths.obligation_expectations_dir,
    "invalid_paid_unreservable_expectation_filename",
  );
  const recordNames = canonicalHistoryNames(
    paths.holds_dir,
    "invalid_paid_unreservable_history_filename",
  );
  if (
    !historySetsMatch(expectedNames, expectationNames) ||
    !historySetsMatch(expectedNames, recordNames)
  ) {
    throw new Error(
      "paid_unreservable_history_expected_set_mismatch",
    );
  }

  const output: BuyVoidPaidUnreservableObligationV1[] = [];
  for (const name of expectedNames) {
    const recordId = name.slice(0, -5);
    const raw = readRequiredHistoryJsonObject(
      path.join(paths.holds_dir, name),
      "paid_unreservable_history_record_disappeared",
      "invalid_paid_unreservable_history_record",
    );
    const record = parsePaidUnreservableObligation(raw);
    if (record.obligation_id !== recordId) {
      throw new Error(
        "paid_unreservable_filename_content_identity_mismatch",
      );
    }

    const expectationRaw = readRequiredHistoryJsonObject(
      path.join(paths.obligation_expectations_dir, name),
      "paid_unreservable_history_expectation_disappeared",
      "invalid_paid_unreservable_history_expectation",
    );
    const expectation = parseHistoryExpectation(
      expectationRaw,
      "paid_unreservable_obligation",
      record.pool_id,
      recordId,
    );
    if (
      expectation.record_identity_fingerprint_sha256 !==
        historyRecordFingerprint(
          record as unknown as Record<string, unknown>,
        )
    ) {
      throw new Error(
        "paid_unreservable_history_fingerprint_mismatch",
      );
    }
    output.push(record);
  }

  output.sort((left, right) =>
    left.obligation_id.localeCompare(right.obligation_id),
  );
  return output;
}

export function listBuyVoidPaidUnreservableObligationsV1(input: {
  root_dir: string;
  pool_id: string;
}): BuyVoidPaidUnreservableObligationV1[] {
  return withPinnedInventoryRootV1(
    input.root_dir,
    false,
    (pinnedRootDir) =>
      listPaidUnreservableObligationsFromPaths(
        buyVoidInventoryReservationJournalPathsV1(
          pinnedRootDir,
          input.pool_id,
        ),
      ),
  );
}

function aggregateFor(
  policy: NormalizedPolicyV1,
  reservations: BuyVoidInventoryReservationV1[],
): BuyVoidInventoryAggregateV1 {
  let committed = 0n;
  for (const reservation of reservations) {
    if (
      reservation.pool_id !== policy.pool_id ||
      reservation.inventory_policy_version !==
        policy.inventory_policy_version ||
      reservation.pool_capacity_void_units !==
        policy.capacity.toString()
    ) {
      throw new Error("inventory_policy_changed");
    }
    committed += BigInt(reservation.reserved_void_units);
  }
  if (committed > policy.capacity) {
    throw new Error("inventory_underflow");
  }

  const available = policy.capacity - committed;
  return {
    schema: "void_buy_void_inventory_aggregate_v1",
    marker: VOID_BUY_VOID_INVENTORY_RESERVATION_JOURNAL_V1,
    pool_id: policy.pool_id,
    inventory_policy_version: policy.inventory_policy_version,
    pool_capacity_void_units: policy.capacity.toString(),
    committed_void_units: committed.toString(),
    available_void_units: available.toString(),
    reservation_count: reservations.length,
    sold_out: available === 0n,
  };
}

function parsePoolLock(
  raw: Record<string, unknown>,
): BuyVoidInventoryPoolLockV1 {
  const pid = raw.pid;
  const acquiredAtMs = raw.acquired_at_ms;
  const processStartTicks = raw.process_start_ticks;
  const bootId = raw.boot_id;
  const ownerNonce = raw.owner_nonce;
  if (
    !hasExactKeys(raw, POOL_LOCK_KEYS) ||
    raw.schema !== "void_buy_void_inventory_pool_lock_v1" ||
    raw.marker !== VOID_BUY_VOID_INVENTORY_POOL_LOCK_V1 ||
    typeof pid !== "number" ||
    !Number.isSafeInteger(pid) ||
    pid <= 0 ||
    typeof acquiredAtMs !== "number" ||
    !Number.isSafeInteger(acquiredAtMs) ||
    acquiredAtMs <= 0 ||
    typeof processStartTicks !== "string" ||
    !CANONICAL_UINT.test(processStartTicks) ||
    processStartTicks === "0" ||
    typeof bootId !== "string" ||
    !BOOT_ID.test(bootId) ||
    typeof ownerNonce !== "string" ||
    !LOCK_NONCE.test(ownerNonce)
  ) {
    throw new Error("invalid_inventory_reservation_lock");
  }
  return {
    schema: "void_buy_void_inventory_pool_lock_v1",
    marker: VOID_BUY_VOID_INVENTORY_POOL_LOCK_V1,
    pid,
    acquired_at_ms: acquiredAtMs,
    process_start_ticks: processStartTicks,
    boot_id: bootId,
    owner_nonce: ownerNonce,
  };
}

function processPidIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    if (code === "ESRCH") return false;
    if (code === "EPERM") return true;
    throw error;
  }
}

function readSmallKernelText(file: string): string {
  const value = fs.readFileSync(file, "utf8").trim();
  if (Buffer.byteLength(value, "utf8") > 4096) {
    throw new Error("process_identity_evidence_too_large");
  }
  return value;
}

function readProcessInstanceIdentity(pid: number): {
  process_start_ticks: string;
  boot_id: string;
} {
  const bootId = readSmallKernelText("/proc/sys/kernel/random/boot_id");
  const stat = readSmallKernelText(
    pid === process.pid ? "/proc/self/stat" : `/proc/${pid}/stat`,
  );
  const commandEnd = stat.lastIndexOf(")");
  if (commandEnd < 0) throw new Error("invalid_process_identity_stat");
  const fieldsFromState = stat.slice(commandEnd + 1).trim().split(/\s+/u);
  const processStartTicks = fieldsFromState[19];
  if (!BOOT_ID.test(bootId) || !CANONICAL_UINT.test(processStartTicks || "")) {
    throw new Error("invalid_process_instance_identity");
  }
  return { process_start_ticks: processStartTicks, boot_id: bootId };
}

function processInstanceStatus(
  lock: BuyVoidInventoryPoolLockV1,
): "matching" | "stale" | "unknown" {
  if (!processPidIsAlive(lock.pid)) return "stale";
  try {
    const current = readProcessInstanceIdentity(lock.pid);
    return current.boot_id === lock.boot_id &&
        current.process_start_ticks === lock.process_start_ticks
      ? "matching"
      : "stale";
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return "stale";
    return "unknown";
  }
}

const ACTIVE_POOL_LOCK_NONCES = new Set<string>();

function readPoolLock(
  paths: BuyVoidInventoryReservationJournalPathsV1,
): BuyVoidInventoryPoolLockV1 | null {
  return readPoolLockFile(paths.lock_file);
}

function readPoolLockFile(file: string): BuyVoidInventoryPoolLockV1 | null {
  try {
    return parsePoolLock(
      readRequiredHistoryJsonObject(
        file,
        "inventory_reservation_lock_disappeared",
        "invalid_inventory_reservation_lock",
      ),
    );
  } catch (error) {
    if (
      String((error as Error)?.message || error) ===
        "inventory_reservation_lock_disappeared"
    ) {
      return null;
    }
    throw error;
  }
}

function sameInode(left: string, right: string): boolean {
  const parent = path.dirname(left);
  if (path.resolve(parent) !== path.resolve(path.dirname(right))) {
    throw new Error("inventory_authority_cross_directory_identity_check");
  }
  return withPinnedPrivateDirectoryV1(parent, false, (stableParent) => {
    try {
      const leftStat = fs.lstatSync(
        path.join(stableParent, path.basename(left)),
        { bigint: true },
      );
      const rightStat = fs.lstatSync(
        path.join(stableParent, path.basename(right)),
        { bigint: true },
      );
      return leftStat.dev === rightStat.dev && leftStat.ino === rightStat.ino;
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return false;
      throw error;
    }
  });
}

function exactPoolLockMatch(
  left: BuyVoidInventoryPoolLockV1,
  right: BuyVoidInventoryPoolLockV1,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function poolLockReleaseFile(
  paths: BuyVoidInventoryReservationJournalPathsV1,
  ownerNonce: string,
): string {
  if (!LOCK_NONCE.test(ownerNonce)) {
    throw new Error("invalid_inventory_reservation_lock_release_nonce");
  }
  return path.join(
    paths.history_anchor_pool_dir,
    `.reserve.lock.release-${ownerNonce}.json`,
  );
}

function parsePoolLockRelease(
  raw: Record<string, unknown>,
): BuyVoidInventoryPoolLockReleaseV1 {
  const releasedAtMs = raw.released_at_ms;
  if (
    !hasExactKeys(raw, POOL_LOCK_RELEASE_KEYS) ||
    raw.schema !== "void_buy_void_inventory_pool_lock_release_v1" ||
    raw.marker !== VOID_BUY_VOID_INVENTORY_POOL_LOCK_RELEASE_V1 ||
    typeof releasedAtMs !== "number" ||
    !Number.isSafeInteger(releasedAtMs) ||
    releasedAtMs <= 0 ||
    !raw.lock ||
    typeof raw.lock !== "object" ||
    Array.isArray(raw.lock)
  ) {
    throw new Error("invalid_inventory_reservation_lock_release");
  }
  return {
    schema: "void_buy_void_inventory_pool_lock_release_v1",
    marker: VOID_BUY_VOID_INVENTORY_POOL_LOCK_RELEASE_V1,
    released_at_ms: releasedAtMs,
    lock: parsePoolLock(raw.lock as Record<string, unknown>),
  };
}

function readPoolLockRelease(
  paths: BuyVoidInventoryReservationJournalPathsV1,
  lock: BuyVoidInventoryPoolLockV1,
): BuyVoidInventoryPoolLockReleaseV1 | null {
  const file = poolLockReleaseFile(paths, lock.owner_nonce);
  let release: BuyVoidInventoryPoolLockReleaseV1;
  try {
    release = parsePoolLockRelease(
      readRequiredHistoryJsonObject(
        file,
        "inventory_reservation_lock_release_disappeared",
        "invalid_inventory_reservation_lock_release",
      ),
    );
  } catch (error) {
    if (
      String((error as Error)?.message || error) ===
        "inventory_reservation_lock_release_disappeared"
    ) {
      return null;
    }
    throw error;
  }
  if (!exactPoolLockMatch(release.lock, lock)) {
    throw new Error("inventory_reservation_lock_release_identity_mismatch");
  }
  return release;
}

function publishPoolLockRelease(
  paths: BuyVoidInventoryReservationJournalPathsV1,
  lock: BuyVoidInventoryPoolLockV1,
): string {
  const file = poolLockReleaseFile(paths, lock.owner_nonce);
  const release: BuyVoidInventoryPoolLockReleaseV1 = {
    schema: "void_buy_void_inventory_pool_lock_release_v1",
    marker: VOID_BUY_VOID_INVENTORY_POOL_LOCK_RELEASE_V1,
    released_at_ms: Date.now(),
    lock,
  };
  try {
    const created = atomicCreateJson(file, release);
    if (created === "exists") {
      const existing = readPoolLockRelease(paths, lock);
      if (!existing) {
        throw new Error("inventory_reservation_lock_release_disappeared");
      }
    }
  } catch (error) {
    const existing = readPoolLockRelease(paths, lock);
    if (!existing) throw error;
    fsyncDir(paths.history_anchor_pool_dir);
  }
  return file;
}

function clearPoolLockRelease(file: string): void {
  try {
    deleteAndSync(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") throw error;
  }
}

function deleteAndSync(file: string): void {
  const parent = path.dirname(file);
  withPinnedPrivateDirectoryV1(parent, false, (stableParent, parentFd) => {
    fs.unlinkSync(path.join(stableParent, path.basename(file)));
    fs.fsyncSync(parentFd);
  });
}

function pinnedFileExists(file: string): boolean {
  const parent = path.dirname(file);
  return withPinnedPrivateDirectoryV1(parent, false, (stableParent) => {
    try {
      fs.lstatSync(path.join(stableParent, path.basename(file)));
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return false;
      throw error;
    }
  });
}

function poolLockReclaimFile(
  paths: BuyVoidInventoryReservationJournalPathsV1,
  ownerNonce: string,
): string {
  if (!LOCK_NONCE.test(ownerNonce)) {
    throw new Error("invalid_inventory_reservation_lock_reclaim_nonce");
  }
  return `${paths.lock_reclaim_prefix}-${ownerNonce}.json`;
}

function poolLockReclaimOwnerFile(
  paths: BuyVoidInventoryReservationJournalPathsV1,
  ownerNonce: string,
): string {
  return `${poolLockReclaimFile(paths, ownerNonce)}.owner`;
}

function clearReclaimFence(file: string): void {
  try {
    deleteAndSync(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") throw error;
  }
}

function acquireStaleReclaimFence(
  paths: BuyVoidInventoryReservationJournalPathsV1,
  observed: BuyVoidInventoryPoolLockV1,
): "acquired" | "busy" | "retry" {
  const reclaimFile = poolLockReclaimFile(paths, observed.owner_nonce);
  let claim = readPoolLockFile(reclaimFile);
  if (claim) {
    if (!exactPoolLockMatch(claim, observed)) {
      throw new Error("inventory_reservation_lock_reclaim_identity_mismatch");
    }
    const status = processInstanceStatus(claim);
    if (
      (status === "matching" || status === "unknown") &&
      !readPoolLockRelease(paths, observed)
    ) {
      return "busy";
    }
  } else {
    try {
      withPinnedPrivateDirectoryV1(
        paths.history_anchor_pool_dir,
        false,
        (stableParent, parentFd) => {
          fs.linkSync(
            path.join(stableParent, path.basename(paths.lock_file)),
            path.join(stableParent, path.basename(reclaimFile)),
          );
          fs.fsyncSync(parentFd);
        },
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === "EEXIST") return "retry";
      if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return "retry";
      throw error;
    }
    claim = readPoolLockFile(reclaimFile);
    if (!claim || !exactPoolLockMatch(claim, observed)) {
      clearReclaimFence(reclaimFile);
      return "retry";
    }
  }

  // The generation hardlink proves which lock was observed, but it cannot by
  // itself make a later pathname unlink conditional on that inode. Serialize
  // the compare/delete window with a separate generation-specific ownership
  // object. An abandoned owner fails closed: it is never auto-reclaimed by a
  // second process, because doing so would recreate the same compare/delete
  // race recursively.
  const reclaimOwnerFile = poolLockReclaimOwnerFile(
    paths,
    observed.owner_nonce,
  );
  const ownerCreated = atomicCreateJson(reclaimOwnerFile, {
    schema: "void_buy_void_inventory_pool_lock_reclaim_owner_v1",
    marker: VOID_BUY_VOID_INVENTORY_POOL_LOCK_V1,
    observed_owner_nonce: observed.owner_nonce,
    reclaimer_nonce: crypto.randomBytes(16).toString("hex"),
  });
  if (ownerCreated === "exists") return "busy";

  try {
    if (sameInode(paths.lock_file, reclaimFile)) {
      try {
        deleteAndSync(paths.lock_file);
      } catch (error) {
        clearReclaimFence(reclaimFile);
        throw error;
      }
    } else if (pinnedFileExists(paths.lock_file)) {
      clearReclaimFence(reclaimFile);
      return "retry";
    }
    return "acquired";
  } finally {
    clearReclaimFence(reclaimOwnerFile);
  }
}

function acquirePoolLock(
  paths: BuyVoidInventoryReservationJournalPathsV1,
):
  | { ok: true; owner_nonce: string }
  | { ok: false; reason: string } {
  try {
    ensureInventoryAuthorityDirectories(paths);
    const processIdentity = readProcessInstanceIdentity(process.pid);
    let ownedReclaimFenceFile: string | null = null;
    let releasedWitnessFile: string | null = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const owner: BuyVoidInventoryPoolLockV1 = {
        schema: "void_buy_void_inventory_pool_lock_v1",
        marker: VOID_BUY_VOID_INVENTORY_POOL_LOCK_V1,
        pid: process.pid,
        acquired_at_ms: Date.now(),
        ...processIdentity,
        owner_nonce: crypto.randomBytes(16).toString("hex"),
      };
      try {
        const created = atomicCreateJson(paths.lock_file, owner);
        if (created === "created") {
          if (ownedReclaimFenceFile) {
            clearReclaimFence(ownedReclaimFenceFile);
          }
          if (releasedWitnessFile) {
            try {
              clearPoolLockRelease(releasedWitnessFile);
            } catch {
              // A nonce-specific stale witness cannot release this new lock.
            }
          }
          ACTIVE_POOL_LOCK_NONCES.add(owner.owner_nonce);
          return { ok: true, owner_nonce: owner.owner_nonce };
        }
      } catch (error) {
        const readback = readPoolLock(paths);
        if (readback && exactPoolLockMatch(readback, owner)) {
          fsyncDir(paths.history_anchor_pool_dir);
          if (ownedReclaimFenceFile) {
            clearReclaimFence(ownedReclaimFenceFile);
          }
          if (releasedWitnessFile) {
            try {
              clearPoolLockRelease(releasedWitnessFile);
            } catch {
              // A nonce-specific stale witness cannot release this new lock.
            }
          }
          ACTIVE_POOL_LOCK_NONCES.add(owner.owner_nonce);
          return { ok: true, owner_nonce: owner.owner_nonce };
        }
        throw error;
      }

      const existing = readPoolLock(paths);
      if (!existing) continue;
      const status = processInstanceStatus(existing);
      const activeInThisProcess = existing.pid === process.pid &&
        ACTIVE_POOL_LOCK_NONCES.has(existing.owner_nonce);
      const released = status === "matching"
        ? readPoolLockRelease(paths, existing)
        : null;
      if (
        status === "unknown" ||
        (status === "matching" &&
          (activeInThisProcess ||
            (existing.pid !== process.pid && !released)))
      ) {
        return { ok: false, reason: "inventory_reservation_busy" };
      }
      const fence = acquireStaleReclaimFence(paths, existing);
      if (fence === "busy") {
        return { ok: false, reason: "inventory_reservation_busy" };
      }
      if (fence === "retry") continue;
      ownedReclaimFenceFile = poolLockReclaimFile(
        paths,
        existing.owner_nonce,
      );
      if (released) {
        releasedWitnessFile = poolLockReleaseFile(
          paths,
          existing.owner_nonce,
        );
      }
    }
    return { ok: false, reason: "inventory_reservation_busy" };
  } catch (error) {
    return {
      ok: false,
      reason: `inventory_reservation_lock_failed:${
        String((error as Error)?.message || error)
      }`,
    };
  }
}

function releasePoolLock(
  paths: BuyVoidInventoryReservationJournalPathsV1,
  lock: { ok: true; owner_nonce: string },
): void {
  let releaseFile: string | null = null;
  try {
    const existing = readPoolLock(paths);
    if (
      !existing ||
      existing.pid !== process.pid ||
      existing.owner_nonce !== lock.owner_nonce
    ) {
      return;
    }
    releaseFile = publishPoolLockRelease(paths, existing);
    ACTIVE_POOL_LOCK_NONCES.delete(lock.owner_nonce);
    try {
      const fence = acquireStaleReclaimFence(paths, existing);
      if (fence === "acquired") {
        clearReclaimFence(
          poolLockReclaimFile(paths, existing.owner_nonce),
        );
        clearPoolLockRelease(releaseFile);
      }
    } catch {
      // The durable release witness lets another process reclaim this lock.
    }
  } catch (error) {
    if (!releaseFile) {
      // Do not claim logical release when cross-process evidence is unavailable.
      throw error;
    }
  }
}

function evaluateReservation(
  intent: BuyVoidFulfillmentJournalIntentV1,
  intentCheck: {
    amount: bigint;
    intent_fingerprint: string;
  },
  policy: NormalizedPolicyV1,
  reservations: BuyVoidInventoryReservationV1[],
  nowMs: number,
):
  | {
      ok: true;
      duplicate: boolean;
      reservation: BuyVoidInventoryReservationV1;
      aggregate_before: BuyVoidInventoryAggregateV1;
      aggregate_after: BuyVoidInventoryAggregateV1;
    }
  | {
      ok: false;
      reason: string;
      detail?: Record<string, unknown>;
    } {
  let aggregateBefore: BuyVoidInventoryAggregateV1;
  try {
    aggregateBefore = aggregateFor(policy, reservations);
  } catch (error) {
    return {
      ok: false,
      reason: String((error as Error)?.message || error),
    };
  }

  const reservationId = reservationIdFor(policy, intent);
  const sameId = reservations.find(
    (item) => item.reservation_id === reservationId,
  );
  if (sameId) {
    if (
      sameId.payment_key_sha256 !== intent.payment_key_sha256 ||
      sameId.request_key_sha256 !== intent.request_key_sha256 ||
      sameId.canonical_payment_identity !==
        intent.claim.canonical_payment_identity ||
      sameId.request_id !== intent.claim.request_id ||
      sameId.instruction_id !== intent.claim.instruction_id ||
      sameId.delivery_address !==
        String(
          intent.claim.unsigned_instruction.delivery_address,
        ).toLowerCase() ||
      sameId.reserved_void_units !== intentCheck.amount.toString() ||
      sameId.intent_fingerprint !==
        intentCheck.intent_fingerprint
    ) {
      return {
        ok: false,
        reason: "inventory_reservation_identity_conflict",
      };
    }

    return {
      ok: true,
      duplicate: true,
      reservation: sameId,
      aggregate_before: aggregateBefore,
      aggregate_after: aggregateBefore,
    };
  }

  const conflict = reservations.find((item) =>
    item.payment_key_sha256 === intent.payment_key_sha256 ||
    item.request_key_sha256 === intent.request_key_sha256 ||
    item.canonical_payment_identity ===
      intent.claim.canonical_payment_identity ||
    item.request_id === intent.claim.request_id ||
    item.instruction_id === intent.claim.instruction_id
  );
  if (conflict) {
    return {
      ok: false,
      reason: "inventory_reservation_claim_conflict",
      detail: {
        existing_reservation_id: conflict.reservation_id,
      },
    };
  }

  if (intentCheck.amount > policy.max_reservation) {
    return {
      ok: false,
      reason: "inventory_reservation_amount_exceeds_policy",
      detail: {
        requested_void_units: intentCheck.amount.toString(),
        max_reservation_void_units:
          policy.max_reservation.toString(),
      },
    };
  }

  const committedBefore = BigInt(
    aggregateBefore.committed_void_units,
  );
  const committedAfter = committedBefore + intentCheck.amount;
  if (committedAfter > policy.capacity) {
    return {
      ok: false,
      reason: aggregateBefore.sold_out
        ? "inventory_sold_out"
        : "insufficient_void_inventory",
      detail: {
        requested_void_units: intentCheck.amount.toString(),
        available_void_units:
          aggregateBefore.available_void_units,
      },
    };
  }

  const availableAfter = policy.capacity - committedAfter;
  const reservation: BuyVoidInventoryReservationV1 = {
    schema: "void_buy_void_inventory_reservation_v1",
    marker: VOID_BUY_VOID_INVENTORY_RESERVATION_JOURNAL_V1,
    reservation_id: reservationId,
    reserved_at_ms: nowMs,
    pool_id: policy.pool_id,
    inventory_policy_version:
      policy.inventory_policy_version,
    pool_capacity_void_units: policy.capacity.toString(),
    committed_before_void_units: committedBefore.toString(),
    reserved_void_units: intentCheck.amount.toString(),
    committed_after_void_units: committedAfter.toString(),
    available_after_void_units: availableAfter.toString(),
    payment_key_sha256: intent.payment_key_sha256,
    request_key_sha256: intent.request_key_sha256,
    canonical_payment_identity:
      intent.claim.canonical_payment_identity,
    request_id: intent.claim.request_id,
    instruction_id: intent.claim.instruction_id,
    delivery_address: String(
      intent.claim.unsigned_instruction.delivery_address,
    ).toLowerCase(),
    intent_fingerprint: intentCheck.intent_fingerprint,
    reservation_status: "reserved",
    inventory_decrement_performed: false,
    reservation_release_authorized: false,
    execution_authorized_by_this_module: false,
    signing_authorized_by_this_module: false,
    transaction_broadcast_authorized_by_this_module: false,
    money_movement_authorized_by_this_module: false,
  };

  const aggregateAfter: BuyVoidInventoryAggregateV1 = {
    ...aggregateBefore,
    committed_void_units: committedAfter.toString(),
    available_void_units: availableAfter.toString(),
    reservation_count: aggregateBefore.reservation_count + 1,
    sold_out: availableAfter === 0n,
  };

  return {
    ok: true,
    duplicate: false,
    reservation,
    aggregate_before: aggregateBefore,
    aggregate_after: aggregateAfter,
  };
}

function reserveBuyVoidInventoryWithinPinnedRootV1(
  input: ReserveBuyVoidInventoryInputV1,
): BuyVoidInventoryReservationDecisionV1 {
  let paths: BuyVoidInventoryReservationJournalPathsV1;
  try {
    paths = buyVoidInventoryReservationJournalPathsV1(
      input?.root_dir,
      input?.policy?.pool_id,
    );
  } catch (error) {
    return held(
      input?.apply === true,
      String((error as Error)?.message || error),
    );
  }

  const intentCheck = validateIntent(input?.intent);
  if ("reason" in intentCheck) {
    return held(
      input?.apply === true,
      intentCheck.reason,
    );
  }

  const policyCheck = normalizePolicy(input?.policy);
  if ("reason" in policyCheck) {
    return held(
      input?.apply === true,
      policyCheck.reason,
    );
  }
  const policy = policyCheck.policy;
  const nowMs = safeNow(input?.now_ms);

  if (input?.apply !== true) {
    try {
      const reservations = listReservationsFromPaths(paths);
      listPaidUnreservableObligationsFromPaths(paths);
      const evaluated = evaluateReservation(
        input.intent,
        intentCheck,
        policy,
        reservations,
        nowMs,
      );
      if ("reason" in evaluated) {
        return held(false, evaluated.reason, evaluated.detail);
      }
      return {
        ok: true,
        status: "available",
        applied: false,
        duplicate: evaluated.duplicate,
        new_reservation: false,
        reservation: evaluated.reservation,
        aggregate: evaluated.aggregate_after,
      };
    } catch (error) {
      return held(
        false,
        "inventory_reservation_preview_failed",
        {
          message: String((error as Error)?.message || error),
        },
      );
    }
  }

  const lock = acquirePoolLock(paths);
  if ("reason" in lock) return held(true, lock.reason);

  try {
    ensurePrivateDir(paths.reservations_dir);
    ensurePrivateDir(paths.holds_dir);
    ensurePrivateDir(paths.history_anchor_pool_dir);
    ensurePrivateDir(paths.pending_history_dir);

    recoverPendingHistoryCreation(paths);

    const reservations = listReservationsFromPaths(paths);
    listPaidUnreservableObligationsFromPaths(paths);
    const evaluated = evaluateReservation(
      input.intent,
      intentCheck,
      policy,
      reservations,
      nowMs,
    );
    if ("reason" in evaluated) {
      if (
        evaluated.reason === "inventory_sold_out" ||
        evaluated.reason === "insufficient_void_inventory"
      ) {
        try {
          const obligation = recordPaidUnreservableObligation(
            paths,
            input.intent,
            policy,
            evaluated.reason,
            String(evaluated.detail?.available_void_units || "0"),
            intentCheck.amount.toString(),
            nowMs,
          );
          return held(true, evaluated.reason, {
            ...(evaluated.detail || {}),
            terminal_recovery_obligation_recorded: true,
            terminal_recovery_obligation_id: obligation.obligation_id,
            terminal_recovery_state: obligation.terminal_state,
            confirmed_payment_stranded: false,
            automatic_retry: false,
          });
        } catch (error) {
          return held(true, "paid_unreservable_obligation_write_failed", {
            reservation_failure_reason: evaluated.reason,
            message: String((error as Error)?.message || error),
          });
        }
      }
      return held(true, evaluated.reason, evaluated.detail);
    }
    if (evaluated.duplicate) {
      return {
        ok: true,
        status: "duplicate",
        applied: true,
        duplicate: true,
        new_reservation: false,
        reservation: evaluated.reservation,
        aggregate: evaluated.aggregate_after,
      };
    }

    commitHistoryRecordCrashConsistent(
      paths,
      "reservation",
      evaluated.reservation,
    );

    const current = aggregateFor(
      policy,
      listReservationsFromPaths(paths),
    );
    return {
      ok: true,
      status: "reserved",
      applied: true,
      duplicate: false,
      new_reservation: true,
      reservation: evaluated.reservation,
      aggregate: current,
    };
  } catch (error) {
    return held(
      true,
      "inventory_reservation_write_failed",
      {
        message: String((error as Error)?.message || error),
      },
    );
  } finally {
    if ("owner_nonce" in lock) {
      releasePoolLock(paths, lock);
    }
  }
}

export function reserveBuyVoidInventoryV1(
  input: ReserveBuyVoidInventoryInputV1,
): BuyVoidInventoryReservationDecisionV1 {
  try {
    return withPinnedInventoryRootV1(
      input?.root_dir,
      input?.apply === true,
      (pinnedRootDir) =>
        reserveBuyVoidInventoryWithinPinnedRootV1({
          ...input,
          root_dir: pinnedRootDir,
        }),
    );
  } catch (error) {
    return held(
      input?.apply === true,
      String((error as Error)?.message || error),
    );
  }
}
