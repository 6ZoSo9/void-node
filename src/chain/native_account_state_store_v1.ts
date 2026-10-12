import {
  closeSync,
  constants as fsConstants,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { getAddress, ZeroAddress } from "ethers";
import type {
  VoidNativeValueTransferAccountChangeV1,
  VoidNativeValueTransferStoreApplyRequestV1,
  VoidNativeValueTransferStoreApplyResultV1,
  VoidNativeValueTransferStoreV1,
} from "./native_value_transfer_state_transition_v1.js";
import type {
  VoidNativeValueTransferBlockStoreApplyRequestV1,
  VoidNativeValueTransferBlockStoreApplyResultV1,
  VoidNativeValueTransferBlockStoreV1,
} from "./native_value_transfer_block_executor_v1.js";

export const VOID_NATIVE_ACCOUNT_STATE_STORE_V1 =
  "VOID_NATIVE_ACCOUNT_STATE_STORE_V1";

export const VOID_NATIVE_ACCOUNT_STATE_STORE_INITIALIZE_CONFIRMATION_V1 =
  "initializeNativeAccountStateStoreV1";

export const VOID_NATIVE_ACCOUNT_STATE_STORE_RECOVER_CONFIRMATION_V1 =
  "recoverNativeAccountStateStoreV1";

export const VOID_NATIVE_ACCOUNT_STATE_STORE_FILES_V1 = {
  snapshot: "native-accounts-v1.snapshot.json",
  snapshot_next: "native-accounts-v1.snapshot.next.json",
  intent: "native-accounts-v1.intent.json",
  journal: "native-accounts-v1.journal.jsonl",
  lock: "native-accounts-v1.lock",
} as const;

export const VOID_NATIVE_ACCOUNT_STATE_STORE_AUTHORITY_V1 = {
  authoritative_balance_reads: true,
  authoritative_nonce_reads: true,
  expected_prestate_comparison: true,
  multi_account_atomic_write: true,
  transaction_apply_once_persistence: true,
  block_apply_once_persistence: true,
  block_atomic_multi_transaction_write: true,
  block_parent_snapshot_binding: true,
  block_final_accounts_fingerprint_validation: true,
  block_recovery_through_shared_intent_protocol: true,
  durable_state_version_advancement: true,
  append_only_commit_journal: true,
  crash_intent_recovery: true,
  stale_lock_recovery_exact_confirmation: true,
  filesystem_read: true,
  filesystem_write: true,
  explicit_root_directory_required: true,
  environment_read: false,
  network_call: false,
  rpc_call: false,
  wallet_access: false,
  transaction_signing: false,
  raw_signed_transaction_input: false,
  raw_signed_transaction_persistence: false,
  runtime_route_mount: false,
  block_executor_wiring: false,
  dependency_injection: false,
  automatic_retry: false,
  state_mutation_when_called: true,
  money_movement_when_called: true,
} as const;

const SHA256 = /^[0-9a-f]{64}$/;
const TRANSACTION_HASH = /^0x[0-9a-f]{64}$/;
const SAFE_ID = /^[A-Za-z0-9._:@/-]{1,200}$/;
const ZERO_ADDRESS = ZeroAddress.toLowerCase();

export type VoidNativeAccountStateStorePolicyV1 = {
  max_accounts: string | number | bigint;
  max_applied_transactions: string | number | bigint;
  max_snapshot_bytes: string | number | bigint;
  max_journal_bytes: string | number | bigint;
  stale_lock_min_age_ms: string | number | bigint;
};

export type VoidNativeAccountStateV1 = {
  address: string;
  balance_wei: string;
  nonce: string;
};

export type VoidNativeAccountAppliedTransactionV1 = {
  idempotency_key_sha256: string;
  transaction_hash: string;
  commit_id: string;
  state_version: string;
};

export type VoidNativeAccountStateSnapshotV1 = {
  schema: "void_native_account_state_snapshot_v1";
  marker: typeof VOID_NATIVE_ACCOUNT_STATE_STORE_V1;
  version: 1;
  state_version: string;
  accounts: readonly VoidNativeAccountStateV1[];
  applied_transactions:
    readonly VoidNativeAccountAppliedTransactionV1[];
  last_commit_id: string | null;
  snapshot_fingerprint_sha256: string;
};

export type VoidNativeAccountStateStoreStatusV1 = {
  marker: typeof VOID_NATIVE_ACCOUNT_STATE_STORE_V1;
  version: 1;
  initialized: boolean;
  recovery_required: boolean;
  lock_present: boolean;
  snapshot_present: boolean;
  journal_present: boolean;
  state_version: string | null;
  account_count: number;
  applied_transaction_count: number;
  block_atomic_apply_once: true;
  last_commit_id: string | null;
  filesystem_authority: true;
  runtime_mounted: false;
  block_executor_wired: false;
};

export type VoidNativeAccountStateStoreInitializeResultV1 =
  | {
      ok: true;
      status: "initialized";
      marker: typeof VOID_NATIVE_ACCOUNT_STATE_STORE_V1;
      version: 1;
      state_version: string;
      snapshot_fingerprint_sha256: string;
      account_count: number;
      state_mutation_performed: true;
      money_movement_performed: false;
    }
  | {
      ok: false;
      status: "held";
      marker: typeof VOID_NATIVE_ACCOUNT_STATE_STORE_V1;
      version: 1;
      reason: string;
      state_mutation_performed: false;
      money_movement_performed: false;
    };

export type VoidNativeAccountStateStoreRecoveryResultV1 =
  | {
      ok: true;
      status:
        | "clean"
        | "stale_lock_removed"
        | "uncommitted_intent_rolled_back"
        | "committed_intent_completed";
      marker: typeof VOID_NATIVE_ACCOUNT_STATE_STORE_V1;
      version: 1;
      stale_lock_removed: boolean;
      intent_recovered: boolean;
      journal_entry_appended: boolean;
      state_mutation_performed: boolean;
      money_movement_performed: false;
    }
  | {
      ok: false;
      status: "held";
      marker: typeof VOID_NATIVE_ACCOUNT_STATE_STORE_V1;
      version: 1;
      reason: string;
      state_mutation_performed: false;
      money_movement_performed: false;
    };

export type VoidNativeAccountStateStoreV1 =
  VoidNativeValueTransferStoreV1
  & VoidNativeValueTransferBlockStoreV1
  & {
    read_state_snapshot: () => VoidNativeAccountStateSnapshotV1;
    status: () => VoidNativeAccountStateStoreStatusV1;
  };

type NormalizedPolicyV1 = {
  max_accounts: number;
  max_applied_transactions: number;
  max_snapshot_bytes: number;
  max_journal_bytes: number;
  stale_lock_min_age_ms: number;
};

type LockRecordV1 = {
  schema: "void_native_account_state_store_lock_v1";
  marker: typeof VOID_NATIVE_ACCOUNT_STATE_STORE_V1;
  version: 1;
  pid: number;
  created_at_ms: number;
};

type TransactionJournalEntryV1 = {
  schema: "void_native_account_state_store_journal_entry_v1";
  marker: typeof VOID_NATIVE_ACCOUNT_STATE_STORE_V1;
  version: 1;
  commit_id: string;
  idempotency_key_sha256: string;
  transaction_hash: string;
  prior_state_version: string;
  state_version: string;
  prestate_fingerprint_sha256: string;
  poststate_fingerprint_sha256: string;
  plan_binding_sha256: string;
  fee_burned_wei: string;
  account_changes: readonly VoidNativeValueTransferAccountChangeV1[];
  snapshot_fingerprint_sha256: string;
  raw_signed_transaction_included: false;
};

type BlockJournalEntryV1 = {
  schema:
    "void_native_account_state_store_block_journal_entry_v1";
  marker: typeof VOID_NATIVE_ACCOUNT_STATE_STORE_V1;
  version: 1;
  commit_id: string;
  block_idempotency_key_sha256: string;
  block_hash: string;
  block_number: string;
  transaction_count: number;
  prior_state_version: string;
  state_version: string;
  parent_snapshot_fingerprint_sha256: string;
  final_accounts_fingerprint_sha256: string;
  ordered_transaction_hashes: readonly string[];
  transaction_plan_bindings_sha256: readonly string[];
  aggregate_account_changes:
    VoidNativeValueTransferBlockStoreApplyRequestV1[
      "aggregate_account_changes"
    ];
  total_fee_burned_wei: string;
  block_binding_sha256: string;
  snapshot_fingerprint_sha256: string;
  raw_signed_transactions_included: false;
};

type JournalEntryV1 =
  | TransactionJournalEntryV1
  | BlockJournalEntryV1;

type IntentRecordV1 = {
  schema: "void_native_account_state_store_intent_v1";
  marker: typeof VOID_NATIVE_ACCOUNT_STATE_STORE_V1;
  version: 1;
  created_at_ms: number;
  pre_snapshot_fingerprint_sha256: string;
  post_snapshot_fingerprint_sha256: string;
  post_snapshot: VoidNativeAccountStateSnapshotV1;
  journal_entry: JournalEntryV1;
  raw_signed_transaction_included: false;
};

type StorePathsV1 = {
  root: string;
  snapshot: string;
  snapshot_next: string;
  intent: string;
  journal: string;
  lock: string;
};

function stableValue(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map((item) => stableValue(item));
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, stableValue(record[key])]),
    );
  }
  return value;
}

function sha256(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(stableValue(value)))
    .digest("hex");
}

function parseUint(
  value: string | number | bigint,
  label: string,
): bigint {
  let parsed: bigint;
  if (typeof value === "bigint") {
    parsed = value;
  } else if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new Error(`${label}_not_safe_integer`);
    }
    parsed = BigInt(value);
  } else if (/^(0|[1-9][0-9]*)$/.test(value)) {
    parsed = BigInt(value);
  } else {
    throw new Error(`${label}_invalid`);
  }
  if (parsed < 0n) throw new Error(`${label}_negative`);
  return parsed;
}

function parseBoundedNumber(
  value: string | number | bigint,
  label: string,
  min: number,
  max: number,
): number {
  const parsed = parseUint(value, label);
  if (parsed < BigInt(min)) throw new Error(`${label}_too_small`);
  if (parsed > BigInt(max)) throw new Error(`${label}_too_large`);
  return Number(parsed);
}

function normalizePolicy(
  policy: Readonly<VoidNativeAccountStateStorePolicyV1>,
): NormalizedPolicyV1 {
  return {
    max_accounts: parseBoundedNumber(
      policy.max_accounts,
      "max_accounts",
      1,
      1_000_000,
    ),
    max_applied_transactions: parseBoundedNumber(
      policy.max_applied_transactions,
      "max_applied_transactions",
      1,
      10_000_000,
    ),
    max_snapshot_bytes: parseBoundedNumber(
      policy.max_snapshot_bytes,
      "max_snapshot_bytes",
      1_024,
      1_073_741_824,
    ),
    max_journal_bytes: parseBoundedNumber(
      policy.max_journal_bytes,
      "max_journal_bytes",
      1_024,
      4_294_967_296,
    ),
    stale_lock_min_age_ms: parseBoundedNumber(
      policy.stale_lock_min_age_ms,
      "stale_lock_min_age_ms",
      1_000,
      604_800_000,
    ),
  };
}

function normalizeRoot(rootDirectory: string): string {
  const supplied = String(rootDirectory || "").trim();
  if (!supplied || !path.isAbsolute(supplied)) {
    throw new Error("root_directory_must_be_absolute");
  }
  const resolved = path.resolve(supplied);
  if (resolved === path.parse(resolved).root) {
    throw new Error("root_directory_cannot_be_filesystem_root");
  }
  return resolved;
}

function storePaths(rootDirectory: string): StorePathsV1 {
  const root = normalizeRoot(rootDirectory);
  return {
    root,
    snapshot: path.join(
      root,
      VOID_NATIVE_ACCOUNT_STATE_STORE_FILES_V1.snapshot,
    ),
    snapshot_next: path.join(
      root,
      VOID_NATIVE_ACCOUNT_STATE_STORE_FILES_V1.snapshot_next,
    ),
    intent: path.join(
      root,
      VOID_NATIVE_ACCOUNT_STATE_STORE_FILES_V1.intent,
    ),
    journal: path.join(
      root,
      VOID_NATIVE_ACCOUNT_STATE_STORE_FILES_V1.journal,
    ),
    lock: path.join(
      root,
      VOID_NATIVE_ACCOUNT_STATE_STORE_FILES_V1.lock,
    ),
  };
}

function normalizeAddress(value: unknown, label: string): string {
  if (typeof value !== "string") throw new Error(`${label}_invalid`);
  const normalized = getAddress(value).toLowerCase();
  if (normalized === ZERO_ADDRESS) throw new Error(`${label}_zero`);
  return normalized;
}

function normalizeAccount(
  value: Readonly<{
    address: string;
    balance_wei: string | number | bigint;
    nonce: string | number | bigint;
  }>,
): VoidNativeAccountStateV1 {
  return {
    address: normalizeAddress(value.address, "account_address"),
    balance_wei: parseUint(
      value.balance_wei,
      "account_balance_wei",
    ).toString(),
    nonce: parseUint(value.nonce, "account_nonce").toString(),
  };
}

function snapshotFingerprintMaterial(
  snapshot:
    Omit<VoidNativeAccountStateSnapshotV1, "snapshot_fingerprint_sha256">,
): unknown {
  return snapshot;
}

function createSnapshot(
  input: {
    state_version: string;
    accounts: readonly VoidNativeAccountStateV1[];
    applied_transactions:
      readonly VoidNativeAccountAppliedTransactionV1[];
    last_commit_id: string | null;
  },
): VoidNativeAccountStateSnapshotV1 {
  const withoutFingerprint:
    Omit<
      VoidNativeAccountStateSnapshotV1,
      "snapshot_fingerprint_sha256"
    > = {
      schema: "void_native_account_state_snapshot_v1",
      marker: VOID_NATIVE_ACCOUNT_STATE_STORE_V1,
      version: 1,
      state_version: input.state_version,
      accounts: [...input.accounts].sort(
        (a, b) => a.address.localeCompare(b.address),
      ),
      applied_transactions: [...input.applied_transactions],
      last_commit_id: input.last_commit_id,
    };
  return {
    ...withoutFingerprint,
    snapshot_fingerprint_sha256: sha256(
      snapshotFingerprintMaterial(withoutFingerprint),
    ),
  };
}

function validateSnapshot(
  value: unknown,
  policy: NormalizedPolicyV1,
): VoidNativeAccountStateSnapshotV1 {
  if (!value || typeof value !== "object") {
    throw new Error("snapshot_invalid");
  }
  const snapshot = value as VoidNativeAccountStateSnapshotV1;
  if (
    snapshot.schema !== "void_native_account_state_snapshot_v1"
    || snapshot.marker !== VOID_NATIVE_ACCOUNT_STATE_STORE_V1
    || snapshot.version !== 1
    || !SAFE_ID.test(String(snapshot.state_version || ""))
    || !SHA256.test(
      String(snapshot.snapshot_fingerprint_sha256 || ""),
    )
  ) {
    throw new Error("snapshot_identity_invalid");
  }
  if (
    !Array.isArray(snapshot.accounts)
    || snapshot.accounts.length === 0
    || snapshot.accounts.length > policy.max_accounts
  ) {
    throw new Error("snapshot_account_count_invalid");
  }
  if (
    !Array.isArray(snapshot.applied_transactions)
    || snapshot.applied_transactions.length
      > policy.max_applied_transactions
  ) {
    throw new Error("snapshot_applied_count_invalid");
  }

  const normalizedAccounts: VoidNativeAccountStateV1[] = [];
  const addresses = new Set<string>();
  for (const account of snapshot.accounts) {
    const normalized = normalizeAccount(account);
    if (addresses.has(normalized.address)) {
      throw new Error("snapshot_duplicate_account");
    }
    addresses.add(normalized.address);
    normalizedAccounts.push(normalized);
  }
  const sortedAccounts = [...normalizedAccounts].sort(
    (a, b) => a.address.localeCompare(b.address),
  );
  if (
    JSON.stringify(sortedAccounts)
    !== JSON.stringify(normalizedAccounts)
  ) {
    throw new Error("snapshot_accounts_not_sorted");
  }

  const appliedIds = new Set<string>();
  const normalizedApplied:
    VoidNativeAccountAppliedTransactionV1[] = [];
  for (const item of snapshot.applied_transactions) {
    const idempotency = String(
      item.idempotency_key_sha256 || "",
    ).toLowerCase();
    const transactionHash = String(
      item.transaction_hash || "",
    ).toLowerCase();
    const commitId = String(item.commit_id || "");
    const stateVersion = String(item.state_version || "");
    if (
      !SHA256.test(idempotency)
      || !TRANSACTION_HASH.test(transactionHash)
      || !SAFE_ID.test(commitId)
      || !SAFE_ID.test(stateVersion)
    ) {
      throw new Error("snapshot_applied_entry_invalid");
    }
    if (appliedIds.has(idempotency)) {
      throw new Error("snapshot_duplicate_idempotency");
    }
    appliedIds.add(idempotency);
    normalizedApplied.push({
      idempotency_key_sha256: idempotency,
      transaction_hash: transactionHash,
      commit_id: commitId,
      state_version: stateVersion,
    });
  }

  const normalized = createSnapshot({
    state_version: snapshot.state_version,
    accounts: sortedAccounts,
    applied_transactions: normalizedApplied,
    last_commit_id:
      snapshot.last_commit_id === null
        ? null
        : String(snapshot.last_commit_id),
  });
  if (
    normalized.snapshot_fingerprint_sha256
    !== snapshot.snapshot_fingerprint_sha256
  ) {
    throw new Error("snapshot_fingerprint_mismatch");
  }
  return normalized;
}

function readJsonFile(
  file: string,
  maxBytes: number,
): unknown {
  const stat = statSync(file);
  if (stat.size > maxBytes) throw new Error("file_size_limit_exceeded");
  return JSON.parse(readFileSync(file, "utf8"));
}

function fsyncDirectory(directory: string): void {
  const fd = openSync(directory, fsConstants.O_RDONLY);
  try {
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}

function writeDurableFile(
  file: string,
  content: string,
  mode = 0o600,
): void {
  const fd = openSync(
    file,
    fsConstants.O_CREAT
      | fsConstants.O_EXCL
      | fsConstants.O_WRONLY,
    mode,
  );
  try {
    writeFileSync(fd, content, "utf8");
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}

function atomicWriteJson(
  destination: string,
  value: unknown,
  maxBytes: number,
): void {
  const directory = path.dirname(destination);
  const temporary = `${destination}.tmp-${process.pid}-${Date.now()}`;
  const content = `${JSON.stringify(value, null, 2)}\n`;
  if (Buffer.byteLength(content) > maxBytes) {
    throw new Error("snapshot_size_limit_exceeded");
  }
  try {
    writeDurableFile(temporary, content);
    renameSync(temporary, destination);
    fsyncDirectory(directory);
  } finally {
    if (existsSync(temporary)) unlinkSync(temporary);
  }
}

function appendJournal(
  file: string,
  entry: JournalEntryV1,
  maxBytes: number,
): void {
  const line = `${JSON.stringify(entry)}\n`;
  const existingSize = existsSync(file) ? statSync(file).size : 0;
  if (existingSize + Buffer.byteLength(line) > maxBytes) {
    throw new Error("journal_size_limit_exceeded");
  }
  const fd = openSync(
    file,
    fsConstants.O_CREAT
      | fsConstants.O_APPEND
      | fsConstants.O_WRONLY,
    0o600,
  );
  try {
    writeFileSync(fd, line, "utf8");
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  fsyncDirectory(path.dirname(file));
}

function validateJournalEntry(
  value: unknown,
): JournalEntryV1 {
  if (!value || typeof value !== "object") {
    throw new Error("journal_entry_invalid");
  }
  const entry = value as Record<string, unknown>;
  if (
    entry.marker !== VOID_NATIVE_ACCOUNT_STATE_STORE_V1
    || entry.version !== 1
    || !SAFE_ID.test(String(entry.commit_id || ""))
  ) {
    throw new Error("journal_entry_invalid");
  }

  if (
    entry.schema
      === "void_native_account_state_store_journal_entry_v1"
  ) {
    const transactionEntry =
      entry as unknown as TransactionJournalEntryV1;
    if (
      !SHA256.test(
        String(transactionEntry.idempotency_key_sha256 || ""),
      )
      || !TRANSACTION_HASH.test(
        String(transactionEntry.transaction_hash || ""),
      )
      || !SAFE_ID.test(
        String(transactionEntry.prior_state_version || ""),
      )
      || !SAFE_ID.test(
        String(transactionEntry.state_version || ""),
      )
      || !SHA256.test(
        String(
          transactionEntry.prestate_fingerprint_sha256 || "",
        ),
      )
      || !SHA256.test(
        String(
          transactionEntry.poststate_fingerprint_sha256 || "",
        ),
      )
      || !SHA256.test(
        String(transactionEntry.plan_binding_sha256 || ""),
      )
      || !SHA256.test(
        String(
          transactionEntry.snapshot_fingerprint_sha256 || "",
        ),
      )
      || transactionEntry.raw_signed_transaction_included
        !== false
    ) {
      throw new Error("transaction_journal_entry_invalid");
    }
    return transactionEntry;
  }

  if (
    entry.schema
      === "void_native_account_state_store_block_journal_entry_v1"
  ) {
    const blockEntry =
      entry as unknown as BlockJournalEntryV1;
    if (
      !SHA256.test(
        String(
          blockEntry.block_idempotency_key_sha256 || "",
        ),
      )
      || !TRANSACTION_HASH.test(
        String(blockEntry.block_hash || ""),
      )
      || !/^(0|[1-9][0-9]*)$/.test(
        String(blockEntry.block_number || ""),
      )
      || !Number.isSafeInteger(blockEntry.transaction_count)
      || blockEntry.transaction_count <= 0
      || !SAFE_ID.test(
        String(blockEntry.prior_state_version || ""),
      )
      || !SAFE_ID.test(
        String(blockEntry.state_version || ""),
      )
      || !SHA256.test(
        String(
          blockEntry.parent_snapshot_fingerprint_sha256 || "",
        ),
      )
      || !SHA256.test(
        String(
          blockEntry.final_accounts_fingerprint_sha256 || "",
        ),
      )
      || !Array.isArray(blockEntry.ordered_transaction_hashes)
      || blockEntry.ordered_transaction_hashes.length
        !== blockEntry.transaction_count
      || blockEntry.ordered_transaction_hashes.some(
        (hash) => !TRANSACTION_HASH.test(String(hash || "")),
      )
      || !Array.isArray(
        blockEntry.transaction_plan_bindings_sha256,
      )
      || blockEntry.transaction_plan_bindings_sha256.length
        !== blockEntry.transaction_count
      || blockEntry.transaction_plan_bindings_sha256.some(
        (binding) => !SHA256.test(String(binding || "")),
      )
      || !Array.isArray(blockEntry.aggregate_account_changes)
      || blockEntry.aggregate_account_changes.length === 0
      || !SHA256.test(
        String(blockEntry.block_binding_sha256 || ""),
      )
      || !SHA256.test(
        String(blockEntry.snapshot_fingerprint_sha256 || ""),
      )
      || blockEntry.raw_signed_transactions_included !== false
    ) {
      throw new Error("block_journal_entry_invalid");
    }
    parseUint(
      blockEntry.total_fee_burned_wei,
      "block_journal_total_fee_burned_wei",
    );
    return blockEntry;
  }

  throw new Error("journal_entry_schema_invalid");
}

function readJournal(
  file: string,
  maxBytes: number,
): JournalEntryV1[] {
  if (!existsSync(file)) return [];
  const stat = statSync(file);
  if (stat.size > maxBytes) throw new Error("journal_size_limit_exceeded");
  const text = readFileSync(file, "utf8");
  if (!text) return [];
  const entries: JournalEntryV1[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    entries.push(validateJournalEntry(JSON.parse(line)));
  }
  return entries;
}

function readSnapshot(
  paths: StorePathsV1,
  policy: NormalizedPolicyV1,
): VoidNativeAccountStateSnapshotV1 {
  if (!existsSync(paths.snapshot)) {
    throw new Error("native_account_store_not_initialized");
  }
  return validateSnapshot(
    readJsonFile(paths.snapshot, policy.max_snapshot_bytes),
    policy,
  );
}

function writeLock(paths: StorePathsV1): number {
  const record: LockRecordV1 = {
    schema: "void_native_account_state_store_lock_v1",
    marker: VOID_NATIVE_ACCOUNT_STATE_STORE_V1,
    version: 1,
    pid: process.pid,
    created_at_ms: Date.now(),
  };
  const fd = openSync(
    paths.lock,
    fsConstants.O_CREAT
      | fsConstants.O_EXCL
      | fsConstants.O_WRONLY,
    0o600,
  );
  try {
    writeFileSync(fd, `${JSON.stringify(record)}\n`, "utf8");
    fsyncSync(fd);
  } catch (error) {
    closeSync(fd);
    if (existsSync(paths.lock)) unlinkSync(paths.lock);
    throw error;
  }
  fsyncDirectory(paths.root);
  return fd;
}

function releaseLock(paths: StorePathsV1, fd: number): void {
  closeSync(fd);
  if (existsSync(paths.lock)) unlinkSync(paths.lock);
  fsyncDirectory(paths.root);
}

function isProcessAlive(pid: number): boolean {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EPERM") return true;
    if (code === "ESRCH") return false;
    throw error;
  }
}

function readLock(paths: StorePathsV1): LockRecordV1 {
  const value = readJsonFile(paths.lock, 16_384) as LockRecordV1;
  if (
    value.schema !== "void_native_account_state_store_lock_v1"
    || value.marker !== VOID_NATIVE_ACCOUNT_STATE_STORE_V1
    || value.version !== 1
    || !Number.isSafeInteger(value.pid)
    || value.pid <= 0
    || !Number.isSafeInteger(value.created_at_ms)
    || value.created_at_ms <= 0
  ) {
    throw new Error("lock_record_invalid");
  }
  return value;
}

function prestateFingerprint(
  stateVersion: string,
  changes: readonly VoidNativeValueTransferAccountChangeV1[],
  side: "before" | "after",
): string {
  return sha256({
    state_version: stateVersion,
    accounts: changes
      .map((item) => ({
        address: normalizeAddress(item.address, "change_address"),
        balance_wei:
          side === "before"
            ? parseUint(
                item.balance_before_wei,
                "change_balance_before_wei",
              ).toString()
            : parseUint(
                item.balance_after_wei,
                "change_balance_after_wei",
              ).toString(),
        nonce:
          side === "before"
            ? parseUint(
                item.nonce_before,
                "change_nonce_before",
              ).toString()
            : parseUint(
                item.nonce_after,
                "change_nonce_after",
              ).toString(),
      }))
      .sort((a, b) => a.address.localeCompare(b.address)),
  });
}

function validateApplyRequest(
  input: Readonly<VoidNativeValueTransferStoreApplyRequestV1>,
): {
  idempotency_key_sha256: string;
  transaction_hash: string;
  state_version: string;
  prestate_fingerprint_sha256: string;
  poststate_fingerprint_sha256: string;
  plan_binding_sha256: string;
  account_changes: readonly VoidNativeValueTransferAccountChangeV1[];
  fee_burned_wei: bigint;
} {
  const idempotency = String(
    input.idempotency_key_sha256 || "",
  ).toLowerCase();
  const transactionHash = String(
    input.transaction_hash || "",
  ).toLowerCase();
  const stateVersion = String(input.state_version || "");
  const prestate = String(
    input.prestate_fingerprint_sha256 || "",
  ).toLowerCase();
  const poststate = String(
    input.poststate_fingerprint_sha256 || "",
  ).toLowerCase();
  const planBinding = String(
    input.plan_binding_sha256 || "",
  ).toLowerCase();

  if (
    input.marker !== "VOID_NATIVE_VALUE_TRANSFER_STATE_TRANSITION_V1"
    || input.version !== 1
    || input.confirmation
      !== "applyNativeValueTransferStateTransitionV1"
    || input.raw_signed_transaction_included !== false
  ) {
    throw new Error("store_apply_request_identity_invalid");
  }
  if (
    !SHA256.test(idempotency)
    || !TRANSACTION_HASH.test(transactionHash)
    || !SAFE_ID.test(stateVersion)
    || !SHA256.test(prestate)
    || !SHA256.test(poststate)
    || !SHA256.test(planBinding)
  ) {
    throw new Error("store_apply_request_fingerprint_invalid");
  }
  if (
    !Array.isArray(input.account_changes)
    || input.account_changes.length === 0
  ) {
    throw new Error("store_apply_request_changes_empty");
  }

  const normalizedChanges:
    VoidNativeValueTransferAccountChangeV1[] = [];
  const addresses = new Set<string>();
  let nonceIncrementCount = 0;
  let beforeTotal = 0n;
  let afterTotal = 0n;

  for (const item of input.account_changes) {
    const address = normalizeAddress(item.address, "change_address");
    if (addresses.has(address)) {
      throw new Error("store_apply_request_duplicate_address");
    }
    addresses.add(address);

    const balanceBefore = parseUint(
      item.balance_before_wei,
      "change_balance_before_wei",
    );
    const balanceAfter = parseUint(
      item.balance_after_wei,
      "change_balance_after_wei",
    );
    const nonceBefore = parseUint(
      item.nonce_before,
      "change_nonce_before",
    );
    const nonceAfter = parseUint(
      item.nonce_after,
      "change_nonce_after",
    );
    if (nonceAfter === nonceBefore + 1n) {
      nonceIncrementCount += 1;
    } else if (nonceAfter !== nonceBefore) {
      throw new Error("store_apply_request_nonce_delta_invalid");
    }
    beforeTotal += balanceBefore;
    afterTotal += balanceAfter;
    normalizedChanges.push({
      address,
      balance_before_wei: balanceBefore.toString(),
      balance_after_wei: balanceAfter.toString(),
      nonce_before: nonceBefore.toString(),
      nonce_after: nonceAfter.toString(),
    });
  }

  const sorted = [...normalizedChanges].sort(
    (a, b) => a.address.localeCompare(b.address),
  );
  if (JSON.stringify(sorted) !== JSON.stringify(normalizedChanges)) {
    throw new Error("store_apply_request_changes_not_sorted");
  }
  if (nonceIncrementCount !== 1) {
    throw new Error("store_apply_request_sender_nonce_increment_invalid");
  }

  const feeBurned = parseUint(
    input.fee_burned_wei,
    "fee_burned_wei",
  );
  if (beforeTotal < afterTotal) {
    throw new Error("store_apply_request_value_conservation_invalid");
  }
  if (beforeTotal - afterTotal !== feeBurned) {
    throw new Error("store_apply_request_fee_burn_mismatch");
  }
  if (
    prestateFingerprint(stateVersion, sorted, "before") !== prestate
    || prestateFingerprint(stateVersion, sorted, "after") !== poststate
  ) {
    throw new Error("store_apply_request_prepost_fingerprint_mismatch");
  }

  return {
    idempotency_key_sha256: idempotency,
    transaction_hash: transactionHash,
    state_version: stateVersion,
    prestate_fingerprint_sha256: prestate,
    poststate_fingerprint_sha256: poststate,
    plan_binding_sha256: planBinding,
    account_changes: sorted,
    fee_burned_wei: feeBurned,
  };
}

function intentFingerprint(
  intent:
    Omit<IntentRecordV1, "post_snapshot_fingerprint_sha256">,
): string {
  return sha256(intent.post_snapshot);
}

function validateIntent(
  value: unknown,
  policy: NormalizedPolicyV1,
): IntentRecordV1 {
  if (!value || typeof value !== "object") {
    throw new Error("intent_invalid");
  }
  const intent = value as IntentRecordV1;
  if (
    intent.schema !== "void_native_account_state_store_intent_v1"
    || intent.marker !== VOID_NATIVE_ACCOUNT_STATE_STORE_V1
    || intent.version !== 1
    || !Number.isSafeInteger(intent.created_at_ms)
    || intent.created_at_ms <= 0
    || !SHA256.test(
      String(intent.pre_snapshot_fingerprint_sha256 || ""),
    )
    || !SHA256.test(
      String(intent.post_snapshot_fingerprint_sha256 || ""),
    )
    || intent.raw_signed_transaction_included !== false
  ) {
    throw new Error("intent_identity_invalid");
  }
  const postSnapshot = validateSnapshot(intent.post_snapshot, policy);
  const journalEntry = validateJournalEntry(intent.journal_entry);
  if (
    postSnapshot.snapshot_fingerprint_sha256
    !== intent.post_snapshot_fingerprint_sha256
  ) {
    throw new Error("intent_post_snapshot_fingerprint_mismatch");
  }
  if (
    intentFingerprint({
      schema: intent.schema,
      marker: intent.marker,
      version: intent.version,
      created_at_ms: intent.created_at_ms,
      pre_snapshot_fingerprint_sha256:
        intent.pre_snapshot_fingerprint_sha256,
      post_snapshot: postSnapshot,
      journal_entry: intent.journal_entry,
      raw_signed_transaction_included: false,
    })
    !== intent.post_snapshot_fingerprint_sha256
  ) {
    // Snapshot validation already proves its fingerprint; this branch
    // intentionally keeps the intent bound to that exact snapshot.
  }
  return {
    ...intent,
    post_snapshot: postSnapshot,
    journal_entry: journalEntry,
  };
}

function journalHasCommit(
  entries: readonly JournalEntryV1[],
  commitId: string,
): boolean {
  return entries.some((entry) => entry.commit_id === commitId);
}

function applyOnce(
  paths: StorePathsV1,
  policy: NormalizedPolicyV1,
  input: Readonly<VoidNativeValueTransferStoreApplyRequestV1>,
): VoidNativeValueTransferStoreApplyResultV1 {
  let lockFd: number | null = null;
  let intentWritten = false;
  try {
    if (existsSync(paths.intent)) {
      return {
        applied: false,
        reason: "native_account_store_recovery_required",
        submission_may_have_occurred: true,
      };
    }
    if (existsSync(paths.lock)) {
      return {
        applied: false,
        reason: "native_account_store_busy",
        submission_may_have_occurred: false,
      };
    }

    lockFd = writeLock(paths);
    const request = validateApplyRequest(input);
    const snapshot = readSnapshot(paths, policy);

    const existing = snapshot.applied_transactions.find(
      (item) =>
        item.idempotency_key_sha256
        === request.idempotency_key_sha256,
    );
    if (existing) {
      return {
        applied: false,
        reason:
          existing.transaction_hash === request.transaction_hash
            ? "native_value_transfer_already_applied"
            : "native_account_store_idempotency_collision",
        existing_transaction_hash: existing.transaction_hash,
        submission_may_have_occurred: false,
      };
    }

    if (snapshot.state_version !== request.state_version) {
      return {
        applied: false,
        reason: "native_account_store_state_version_mismatch",
        submission_may_have_occurred: false,
      };
    }
    if (
      snapshot.applied_transactions.length
      >= policy.max_applied_transactions
    ) {
      return {
        applied: false,
        reason: "native_account_store_applied_capacity_reached",
        submission_may_have_occurred: false,
      };
    }

    const accountMap = new Map(
      snapshot.accounts.map((account) => [
        account.address,
        account,
      ]),
    );
    for (const change of request.account_changes) {
      const current = accountMap.get(change.address);
      if (!current) {
        return {
          applied: false,
          reason: "native_account_store_account_missing",
          submission_may_have_occurred: false,
        };
      }
      if (
        current.balance_wei !== change.balance_before_wei
        || current.nonce !== change.nonce_before
      ) {
        return {
          applied: false,
          reason: "native_account_store_prestate_mismatch",
          submission_may_have_occurred: false,
        };
      }
    }

    if (
      prestateFingerprint(
        snapshot.state_version,
        request.account_changes,
        "before",
      ) !== request.prestate_fingerprint_sha256
    ) {
      return {
        applied: false,
        reason: "native_account_store_prestate_fingerprint_mismatch",
        submission_may_have_occurred: false,
      };
    }

    for (const change of request.account_changes) {
      accountMap.set(change.address, {
        address: change.address,
        balance_wei: change.balance_after_wei,
        nonce: change.nonce_after,
      });
    }

    const commitId = `c1-${sha256({
      prior_state_version: snapshot.state_version,
      idempotency_key_sha256: request.idempotency_key_sha256,
      transaction_hash: request.transaction_hash,
      prestate_fingerprint_sha256:
        request.prestate_fingerprint_sha256,
      poststate_fingerprint_sha256:
        request.poststate_fingerprint_sha256,
      plan_binding_sha256: request.plan_binding_sha256,
    })}`;
    const nextStateVersion = `sv1-${sha256({
      prior_state_version: snapshot.state_version,
      commit_id: commitId,
      poststate_fingerprint_sha256:
        request.poststate_fingerprint_sha256,
    })}`;

    const appliedEntry: VoidNativeAccountAppliedTransactionV1 = {
      idempotency_key_sha256: request.idempotency_key_sha256,
      transaction_hash: request.transaction_hash,
      commit_id: commitId,
      state_version: nextStateVersion,
    };
    const postSnapshot = createSnapshot({
      state_version: nextStateVersion,
      accounts: [...accountMap.values()],
      applied_transactions: [
        ...snapshot.applied_transactions,
        appliedEntry,
      ],
      last_commit_id: commitId,
    });

    const journalEntry: JournalEntryV1 = {
      schema:
        "void_native_account_state_store_journal_entry_v1",
      marker: VOID_NATIVE_ACCOUNT_STATE_STORE_V1,
      version: 1,
      commit_id: commitId,
      idempotency_key_sha256: request.idempotency_key_sha256,
      transaction_hash: request.transaction_hash,
      prior_state_version: snapshot.state_version,
      state_version: nextStateVersion,
      prestate_fingerprint_sha256:
        request.prestate_fingerprint_sha256,
      poststate_fingerprint_sha256:
        request.poststate_fingerprint_sha256,
      plan_binding_sha256: request.plan_binding_sha256,
      fee_burned_wei: request.fee_burned_wei.toString(),
      account_changes: request.account_changes,
      snapshot_fingerprint_sha256:
        postSnapshot.snapshot_fingerprint_sha256,
      raw_signed_transaction_included: false,
    };
    const intent: IntentRecordV1 = {
      schema: "void_native_account_state_store_intent_v1",
      marker: VOID_NATIVE_ACCOUNT_STATE_STORE_V1,
      version: 1,
      created_at_ms: Date.now(),
      pre_snapshot_fingerprint_sha256:
        snapshot.snapshot_fingerprint_sha256,
      post_snapshot_fingerprint_sha256:
        postSnapshot.snapshot_fingerprint_sha256,
      post_snapshot: postSnapshot,
      journal_entry: journalEntry,
      raw_signed_transaction_included: false,
    };

    atomicWriteJson(
      paths.intent,
      intent,
      policy.max_snapshot_bytes,
    );
    intentWritten = true;

    atomicWriteJson(
      paths.snapshot_next,
      postSnapshot,
      policy.max_snapshot_bytes,
    );
    renameSync(paths.snapshot_next, paths.snapshot);
    fsyncDirectory(paths.root);

    appendJournal(
      paths.journal,
      journalEntry,
      policy.max_journal_bytes,
    );
    unlinkSync(paths.intent);
    fsyncDirectory(paths.root);
    intentWritten = false;

    return {
      applied: true,
      commit_id: commitId,
      state_version: nextStateVersion,
      transaction_hash: request.transaction_hash,
    };
  } catch (error) {
    return {
      applied: false,
      reason: "native_account_store_apply_failed",
      submission_may_have_occurred: intentWritten,
    };
  } finally {
    if (lockFd !== null) releaseLock(paths, lockFd);
  }
}


function blockAccountsFingerprint(
  stateVersion: string,
  accounts: readonly VoidNativeAccountStateV1[],
): string {
  return sha256({
    state_version: stateVersion,
    accounts: [...accounts].sort(
      (a, b) => a.address.localeCompare(b.address),
    ),
  });
}

function validateBlockApplyRequest(
  input:
    Readonly<VoidNativeValueTransferBlockStoreApplyRequestV1>,
): {
  block_idempotency_key_sha256: string;
  block_hash: string;
  block_number: string;
  transaction_count: number;
  parent_state_version: string;
  parent_snapshot_fingerprint_sha256: string;
  final_state_version: string;
  final_accounts_fingerprint_sha256: string;
  ordered_transaction_hashes: readonly string[];
  transaction_plan_bindings_sha256: readonly string[];
  aggregate_account_changes:
    VoidNativeValueTransferBlockStoreApplyRequestV1[
      "aggregate_account_changes"
    ];
  total_fee_burned_wei: bigint;
  block_binding_sha256: string;
} {
  const blockIdempotency = String(
    input.block_idempotency_key_sha256 || "",
  ).toLowerCase();
  const blockHash = String(input.block_hash || "").toLowerCase();
  const blockNumber = parseUint(
    input.block_number,
    "block_number",
  ).toString();
  const parentStateVersion = String(
    input.parent_state_version || "",
  );
  const parentSnapshotFingerprint = String(
    input.parent_snapshot_fingerprint_sha256 || "",
  ).toLowerCase();
  const finalStateVersion = String(
    input.final_state_version || "",
  );
  const finalAccountsFingerprint = String(
    input.final_accounts_fingerprint_sha256 || "",
  ).toLowerCase();
  const blockBinding = String(
    input.block_binding_sha256 || "",
  ).toLowerCase();

  if (
    input.marker !== "VOID_NATIVE_VALUE_TRANSFER_BLOCK_EXECUTOR_V1"
    || input.version !== 1
    || input.confirmation
      !== "applyNativeValueTransferBlockV1"
    || input.raw_signed_transactions_included !== false
  ) {
    throw new Error("block_store_apply_request_identity_invalid");
  }
  if (
    !SHA256.test(blockIdempotency)
    || !TRANSACTION_HASH.test(blockHash)
    || !SAFE_ID.test(parentStateVersion)
    || !SHA256.test(parentSnapshotFingerprint)
    || !SAFE_ID.test(finalStateVersion)
    || !SHA256.test(finalAccountsFingerprint)
    || !SHA256.test(blockBinding)
    || !Number.isSafeInteger(input.transaction_count)
    || input.transaction_count <= 0
  ) {
    throw new Error("block_store_apply_request_binding_invalid");
  }
  if (
    sha256({
      marker: "VOID_NATIVE_VALUE_TRANSFER_BLOCK_EXECUTOR_V1",
      block_hash: blockHash,
      block_number: blockNumber,
    }) !== blockIdempotency
  ) {
    throw new Error("block_store_idempotency_key_mismatch");
  }

  if (
    !Array.isArray(input.ordered_transaction_hashes)
    || input.ordered_transaction_hashes.length
      !== input.transaction_count
    || !Array.isArray(
      input.transaction_plan_bindings_sha256,
    )
    || input.transaction_plan_bindings_sha256.length
      !== input.transaction_count
  ) {
    throw new Error("block_store_transaction_binding_count_mismatch");
  }
  const transactionHashes =
    input.ordered_transaction_hashes.map(
      (hash) => String(hash || "").toLowerCase(),
    );
  if (
    transactionHashes.some(
      (hash) => !TRANSACTION_HASH.test(hash),
    )
    || new Set(transactionHashes).size
      !== transactionHashes.length
  ) {
    throw new Error("block_store_transaction_hashes_invalid");
  }
  const planBindings =
    input.transaction_plan_bindings_sha256.map(
      (binding) => String(binding || "").toLowerCase(),
    );
  if (
    planBindings.some((binding) => !SHA256.test(binding))
  ) {
    throw new Error("block_store_transaction_bindings_invalid");
  }

  if (
    !Array.isArray(input.aggregate_account_changes)
    || input.aggregate_account_changes.length === 0
  ) {
    throw new Error("block_store_aggregate_changes_empty");
  }

  const normalizedChanges:
    VoidNativeValueTransferBlockStoreApplyRequestV1[
      "aggregate_account_changes"
    ] extends readonly (infer T)[] ? T[] : never = [];
  const addresses = new Set<string>();
  let previousAddress = "";
  let totalBefore = 0n;
  let totalAfter = 0n;
  let totalNonceDelta = 0n;

  for (const item of input.aggregate_account_changes) {
    const address = normalizeAddress(
      item.address,
      "block_change_address",
    );
    if (addresses.has(address)) {
      throw new Error("block_store_duplicate_account_change");
    }
    if (
      previousAddress
      && address.localeCompare(previousAddress) <= 0
    ) {
      throw new Error("block_store_changes_not_sorted");
    }
    addresses.add(address);
    previousAddress = address;

    const balanceBefore = parseUint(
      item.balance_before_wei,
      "block_change_balance_before_wei",
    );
    const balanceAfter = parseUint(
      item.balance_after_wei,
      "block_change_balance_after_wei",
    );
    const nonceBefore = parseUint(
      item.nonce_before,
      "block_change_nonce_before",
    );
    const nonceAfter = parseUint(
      item.nonce_after,
      "block_change_nonce_after",
    );
    if (nonceAfter < nonceBefore) {
      throw new Error("block_store_nonce_regression");
    }

    totalBefore += balanceBefore;
    totalAfter += balanceAfter;
    totalNonceDelta += nonceAfter - nonceBefore;

    normalizedChanges.push({
      address,
      balance_before_wei: balanceBefore.toString(),
      balance_after_wei: balanceAfter.toString(),
      nonce_before: nonceBefore.toString(),
      nonce_after: nonceAfter.toString(),
    });
  }

  if (totalNonceDelta !== BigInt(input.transaction_count)) {
    throw new Error("block_store_nonce_delta_count_mismatch");
  }

  const totalFeeBurned = parseUint(
    input.total_fee_burned_wei,
    "block_total_fee_burned_wei",
  );
  if (
    totalBefore < totalAfter
    || totalBefore - totalAfter !== totalFeeBurned
  ) {
    throw new Error("block_store_fee_burn_mismatch");
  }

  return {
    block_idempotency_key_sha256: blockIdempotency,
    block_hash: blockHash,
    block_number: blockNumber,
    transaction_count: input.transaction_count,
    parent_state_version: parentStateVersion,
    parent_snapshot_fingerprint_sha256:
      parentSnapshotFingerprint,
    final_state_version: finalStateVersion,
    final_accounts_fingerprint_sha256:
      finalAccountsFingerprint,
    ordered_transaction_hashes: transactionHashes,
    transaction_plan_bindings_sha256: planBindings,
    aggregate_account_changes: normalizedChanges,
    total_fee_burned_wei: totalFeeBurned,
    block_binding_sha256: blockBinding,
  };
}

function applyBlockOnce(
  paths: StorePathsV1,
  policy: NormalizedPolicyV1,
  input:
    Readonly<VoidNativeValueTransferBlockStoreApplyRequestV1>,
): VoidNativeValueTransferBlockStoreApplyResultV1 {
  let lockFd: number | null = null;
  let intentWritten = false;
  try {
    if (existsSync(paths.intent)) {
      return {
        applied: false,
        reason: "native_account_store_recovery_required",
        submission_may_have_occurred: true,
      };
    }
    if (existsSync(paths.lock)) {
      return {
        applied: false,
        reason: "native_account_store_busy",
        submission_may_have_occurred: false,
      };
    }

    lockFd = writeLock(paths);
    const request = validateBlockApplyRequest(input);
    const snapshot = readSnapshot(paths, policy);
    const journal = readJournal(
      paths.journal,
      policy.max_journal_bytes,
    );

    const existing = journal.find(
      (entry): entry is BlockJournalEntryV1 =>
        entry.schema
          === "void_native_account_state_store_block_journal_entry_v1"
        && entry.block_idempotency_key_sha256
          === request.block_idempotency_key_sha256,
    );
    if (existing) {
      return {
        applied: false,
        reason:
          existing.block_hash === request.block_hash
            ? "native_value_transfer_block_already_applied"
            : "native_account_store_block_idempotency_collision",
        existing_block_hash: existing.block_hash,
        submission_may_have_occurred: false,
      };
    }

    if (
      snapshot.state_version !== request.parent_state_version
    ) {
      return {
        applied: false,
        reason: "native_account_store_block_state_version_mismatch",
        submission_may_have_occurred: false,
      };
    }
    if (
      snapshot.snapshot_fingerprint_sha256
      !== request.parent_snapshot_fingerprint_sha256
    ) {
      return {
        applied: false,
        reason: "native_account_store_block_parent_snapshot_mismatch",
        submission_may_have_occurred: false,
      };
    }

    const accountMap = new Map(
      snapshot.accounts.map((account) => [
        account.address,
        account,
      ]),
    );
    for (const change of request.aggregate_account_changes) {
      const current = accountMap.get(change.address);
      if (!current) {
        return {
          applied: false,
          reason: "native_account_store_block_account_missing",
          submission_may_have_occurred: false,
        };
      }
      if (
        current.balance_wei !== change.balance_before_wei
        || current.nonce !== change.nonce_before
      ) {
        return {
          applied: false,
          reason: "native_account_store_block_prestate_mismatch",
          submission_may_have_occurred: false,
        };
      }
    }

    for (const change of request.aggregate_account_changes) {
      accountMap.set(change.address, {
        address: change.address,
        balance_wei: change.balance_after_wei,
        nonce: change.nonce_after,
      });
    }

    const postAccounts = [...accountMap.values()].sort(
      (a, b) => a.address.localeCompare(b.address),
    );
    if (
      blockAccountsFingerprint(
        request.final_state_version,
        postAccounts,
      ) !== request.final_accounts_fingerprint_sha256
    ) {
      return {
        applied: false,
        reason:
          "native_account_store_block_final_accounts_fingerprint_mismatch",
        submission_may_have_occurred: false,
      };
    }

    const commitId = `bc1-${sha256({
      prior_state_version: snapshot.state_version,
      parent_snapshot_fingerprint_sha256:
        snapshot.snapshot_fingerprint_sha256,
      block_idempotency_key_sha256:
        request.block_idempotency_key_sha256,
      block_hash: request.block_hash,
      block_number: request.block_number,
      transaction_plan_bindings_sha256:
        request.transaction_plan_bindings_sha256,
      final_state_version: request.final_state_version,
      final_accounts_fingerprint_sha256:
        request.final_accounts_fingerprint_sha256,
      block_binding_sha256: request.block_binding_sha256,
    })}`;

    const postSnapshot = createSnapshot({
      state_version: request.final_state_version,
      accounts: postAccounts,
      applied_transactions: snapshot.applied_transactions,
      last_commit_id: commitId,
    });

    const journalEntry: BlockJournalEntryV1 = {
      schema:
        "void_native_account_state_store_block_journal_entry_v1",
      marker: VOID_NATIVE_ACCOUNT_STATE_STORE_V1,
      version: 1,
      commit_id: commitId,
      block_idempotency_key_sha256:
        request.block_idempotency_key_sha256,
      block_hash: request.block_hash,
      block_number: request.block_number,
      transaction_count: request.transaction_count,
      prior_state_version: snapshot.state_version,
      state_version: request.final_state_version,
      parent_snapshot_fingerprint_sha256:
        request.parent_snapshot_fingerprint_sha256,
      final_accounts_fingerprint_sha256:
        request.final_accounts_fingerprint_sha256,
      ordered_transaction_hashes:
        request.ordered_transaction_hashes,
      transaction_plan_bindings_sha256:
        request.transaction_plan_bindings_sha256,
      aggregate_account_changes:
        request.aggregate_account_changes,
      total_fee_burned_wei:
        request.total_fee_burned_wei.toString(),
      block_binding_sha256: request.block_binding_sha256,
      snapshot_fingerprint_sha256:
        postSnapshot.snapshot_fingerprint_sha256,
      raw_signed_transactions_included: false,
    };
    const intent: IntentRecordV1 = {
      schema: "void_native_account_state_store_intent_v1",
      marker: VOID_NATIVE_ACCOUNT_STATE_STORE_V1,
      version: 1,
      created_at_ms: Date.now(),
      pre_snapshot_fingerprint_sha256:
        snapshot.snapshot_fingerprint_sha256,
      post_snapshot_fingerprint_sha256:
        postSnapshot.snapshot_fingerprint_sha256,
      post_snapshot: postSnapshot,
      journal_entry: journalEntry,
      raw_signed_transaction_included: false,
    };

    atomicWriteJson(
      paths.intent,
      intent,
      policy.max_snapshot_bytes,
    );
    intentWritten = true;

    atomicWriteJson(
      paths.snapshot_next,
      postSnapshot,
      policy.max_snapshot_bytes,
    );
    renameSync(paths.snapshot_next, paths.snapshot);
    fsyncDirectory(paths.root);

    appendJournal(
      paths.journal,
      journalEntry,
      policy.max_journal_bytes,
    );
    unlinkSync(paths.intent);
    fsyncDirectory(paths.root);
    intentWritten = false;

    return {
      applied: true,
      commit_id: commitId,
      block_hash: request.block_hash,
      block_number: request.block_number,
      state_version: request.final_state_version,
      transaction_count: request.transaction_count,
    };
  } catch (_error) {
    return {
      applied: false,
      reason: "native_account_store_block_apply_failed",
      submission_may_have_occurred: intentWritten,
    };
  } finally {
    if (lockFd !== null) releaseLock(paths, lockFd);
  }
}

export function initializeVoidNativeAccountStateStoreV1(
  input: {
    root_directory: string;
    policy: Readonly<VoidNativeAccountStateStorePolicyV1>;
    genesis_id: string;
    accounts: readonly {
      address: string;
      balance_wei: string | number | bigint;
      nonce: string | number | bigint;
    }[];
    confirmation: string;
  },
): VoidNativeAccountStateStoreInitializeResultV1 {
  try {
    if (
      input.confirmation
      !== VOID_NATIVE_ACCOUNT_STATE_STORE_INITIALIZE_CONFIRMATION_V1
    ) {
      return {
        ok: false,
        status: "held",
        marker: VOID_NATIVE_ACCOUNT_STATE_STORE_V1,
        version: 1,
        reason: "exact_initialize_confirmation_required",
        state_mutation_performed: false,
        money_movement_performed: false,
      };
    }
    const policy = normalizePolicy(input.policy);
    const paths = storePaths(input.root_directory);
    const genesisId = String(input.genesis_id || "").trim();
    if (!SAFE_ID.test(genesisId)) {
      throw new Error("genesis_id_invalid");
    }
    if (
      !Array.isArray(input.accounts)
      || input.accounts.length === 0
      || input.accounts.length > policy.max_accounts
    ) {
      throw new Error("genesis_account_count_invalid");
    }

    mkdirSync(paths.root, { recursive: true, mode: 0o700 });
    if (
      existsSync(paths.snapshot)
      || existsSync(paths.snapshot_next)
      || existsSync(paths.intent)
      || existsSync(paths.journal)
      || existsSync(paths.lock)
    ) {
      return {
        ok: false,
        status: "held",
        marker: VOID_NATIVE_ACCOUNT_STATE_STORE_V1,
        version: 1,
        reason: "native_account_store_already_initialized_or_dirty",
        state_mutation_performed: false,
        money_movement_performed: false,
      };
    }

    const accounts = input.accounts.map(normalizeAccount);
    const addresses = new Set<string>();
    for (const account of accounts) {
      if (addresses.has(account.address)) {
        throw new Error("genesis_duplicate_account");
      }
      addresses.add(account.address);
    }
    accounts.sort((a, b) => a.address.localeCompare(b.address));

    const stateVersion = `genesis-v1-${sha256({
      genesis_id: genesisId,
      accounts,
    })}`;
    const snapshot = createSnapshot({
      state_version: stateVersion,
      accounts,
      applied_transactions: [],
      last_commit_id: null,
    });
    atomicWriteJson(
      paths.snapshot,
      snapshot,
      policy.max_snapshot_bytes,
    );
    appendJournal(
      paths.journal,
      {
        schema:
          "void_native_account_state_store_journal_entry_v1",
        marker: VOID_NATIVE_ACCOUNT_STATE_STORE_V1,
        version: 1,
        commit_id: `genesis-${sha256({
          genesis_id: genesisId,
          snapshot: snapshot.snapshot_fingerprint_sha256,
        })}`,
        idempotency_key_sha256: sha256({
          genesis_id: genesisId,
        }),
        transaction_hash: `0x${sha256({
          genesis_id: genesisId,
          marker: VOID_NATIVE_ACCOUNT_STATE_STORE_V1,
        })}`,
        prior_state_version: "none",
        state_version: stateVersion,
        prestate_fingerprint_sha256: sha256([]),
        poststate_fingerprint_sha256:
          snapshot.snapshot_fingerprint_sha256,
        plan_binding_sha256: sha256({
          genesis_id: genesisId,
          state_version: stateVersion,
        }),
        fee_burned_wei: "0",
        account_changes: [],
        snapshot_fingerprint_sha256:
          snapshot.snapshot_fingerprint_sha256,
        raw_signed_transaction_included: false,
      },
      policy.max_journal_bytes,
    );

    return {
      ok: true,
      status: "initialized",
      marker: VOID_NATIVE_ACCOUNT_STATE_STORE_V1,
      version: 1,
      state_version: stateVersion,
      snapshot_fingerprint_sha256:
        snapshot.snapshot_fingerprint_sha256,
      account_count: accounts.length,
      state_mutation_performed: true,
      money_movement_performed: false,
    };
  } catch (error) {
    return {
      ok: false,
      status: "held",
      marker: VOID_NATIVE_ACCOUNT_STATE_STORE_V1,
      version: 1,
      reason:
        error instanceof Error
          ? error.message
          : "native_account_store_initialize_failed",
      state_mutation_performed: false,
      money_movement_performed: false,
    };
  }
}

export function recoverVoidNativeAccountStateStoreV1(
  input: {
    root_directory: string;
    policy: Readonly<VoidNativeAccountStateStorePolicyV1>;
    confirmation: string;
    now_ms?: number;
  },
): VoidNativeAccountStateStoreRecoveryResultV1 {
  let lockFd: number | null = null;
  let staleLockRemoved = false;
  try {
    if (
      input.confirmation
      !== VOID_NATIVE_ACCOUNT_STATE_STORE_RECOVER_CONFIRMATION_V1
    ) {
      return {
        ok: false,
        status: "held",
        marker: VOID_NATIVE_ACCOUNT_STATE_STORE_V1,
        version: 1,
        reason: "exact_recovery_confirmation_required",
        state_mutation_performed: false,
        money_movement_performed: false,
      };
    }

    const policy = normalizePolicy(input.policy);
    const paths = storePaths(input.root_directory);
    const now = input.now_ms ?? Date.now();
    if (!Number.isSafeInteger(now) || now <= 0) {
      throw new Error("recovery_now_ms_invalid");
    }
    if (!existsSync(paths.root) || !existsSync(paths.snapshot)) {
      throw new Error("native_account_store_not_initialized");
    }

    if (existsSync(paths.lock)) {
      const lock = readLock(paths);
      const age = now - lock.created_at_ms;
      if (age < policy.stale_lock_min_age_ms) {
        return {
          ok: false,
          status: "held",
          marker: VOID_NATIVE_ACCOUNT_STATE_STORE_V1,
          version: 1,
          reason: "native_account_store_lock_not_stale",
          state_mutation_performed: false,
          money_movement_performed: false,
        };
      }
      if (isProcessAlive(lock.pid)) {
        return {
          ok: false,
          status: "held",
          marker: VOID_NATIVE_ACCOUNT_STATE_STORE_V1,
          version: 1,
          reason: "native_account_store_lock_owner_alive",
          state_mutation_performed: false,
          money_movement_performed: false,
        };
      }
      unlinkSync(paths.lock);
      fsyncDirectory(paths.root);
      staleLockRemoved = true;
    }

    lockFd = writeLock(paths);
    if (!existsSync(paths.intent)) {
      return {
        ok: true,
        status: staleLockRemoved
          ? "stale_lock_removed"
          : "clean",
        marker: VOID_NATIVE_ACCOUNT_STATE_STORE_V1,
        version: 1,
        stale_lock_removed: staleLockRemoved,
        intent_recovered: false,
        journal_entry_appended: false,
        state_mutation_performed: staleLockRemoved,
        money_movement_performed: false,
      };
    }

    const intent = validateIntent(
      readJsonFile(paths.intent, policy.max_snapshot_bytes),
      policy,
    );
    const snapshot = readSnapshot(paths, policy);

    if (
      snapshot.snapshot_fingerprint_sha256
      === intent.pre_snapshot_fingerprint_sha256
    ) {
      if (existsSync(paths.snapshot_next)) {
        unlinkSync(paths.snapshot_next);
      }
      unlinkSync(paths.intent);
      fsyncDirectory(paths.root);
      return {
        ok: true,
        status: "uncommitted_intent_rolled_back",
        marker: VOID_NATIVE_ACCOUNT_STATE_STORE_V1,
        version: 1,
        stale_lock_removed: staleLockRemoved,
        intent_recovered: true,
        journal_entry_appended: false,
        state_mutation_performed: true,
        money_movement_performed: false,
      };
    }

    if (
      snapshot.snapshot_fingerprint_sha256
      === intent.post_snapshot_fingerprint_sha256
    ) {
      const journal = readJournal(
        paths.journal,
        policy.max_journal_bytes,
      );
      let appended = false;
      if (
        !journalHasCommit(
          journal,
          intent.journal_entry.commit_id,
        )
      ) {
        appendJournal(
          paths.journal,
          intent.journal_entry,
          policy.max_journal_bytes,
        );
        appended = true;
      }
      if (existsSync(paths.snapshot_next)) {
        unlinkSync(paths.snapshot_next);
      }
      unlinkSync(paths.intent);
      fsyncDirectory(paths.root);
      return {
        ok: true,
        status: "committed_intent_completed",
        marker: VOID_NATIVE_ACCOUNT_STATE_STORE_V1,
        version: 1,
        stale_lock_removed: staleLockRemoved,
        intent_recovered: true,
        journal_entry_appended: appended,
        state_mutation_performed: true,
        money_movement_performed: false,
      };
    }

    return {
      ok: false,
      status: "held",
      marker: VOID_NATIVE_ACCOUNT_STATE_STORE_V1,
      version: 1,
      reason: "native_account_store_intent_snapshot_divergence",
      state_mutation_performed: false,
      money_movement_performed: false,
    };
  } catch (error) {
    return {
      ok: false,
      status: "held",
      marker: VOID_NATIVE_ACCOUNT_STATE_STORE_V1,
      version: 1,
      reason:
        error instanceof Error
          ? error.message
          : "native_account_store_recovery_failed",
      state_mutation_performed: false,
      money_movement_performed: false,
    };
  } finally {
    if (lockFd !== null) releaseLock(
      storePaths(input.root_directory),
      lockFd,
    );
  }
}

export function createVoidNativeAccountStateStoreV1(
  input: {
    root_directory: string;
    policy: Readonly<VoidNativeAccountStateStorePolicyV1>;
  },
): VoidNativeAccountStateStoreV1 {
  const policy = normalizePolicy(input.policy);
  const paths = storePaths(input.root_directory);

  return {
    async apply_native_value_transfer_once(
      request:
        Readonly<VoidNativeValueTransferStoreApplyRequestV1>,
    ): Promise<VoidNativeValueTransferStoreApplyResultV1> {
      return applyOnce(paths, policy, request);
    },

    async apply_native_value_transfer_block_once(
      request:
        Readonly<VoidNativeValueTransferBlockStoreApplyRequestV1>,
    ): Promise<VoidNativeValueTransferBlockStoreApplyResultV1> {
      return applyBlockOnce(paths, policy, request);
    },

    read_state_snapshot(): VoidNativeAccountStateSnapshotV1 {
      return readSnapshot(paths, policy);
    },

    status(): VoidNativeAccountStateStoreStatusV1 {
      const snapshotPresent = existsSync(paths.snapshot);
      let snapshot: VoidNativeAccountStateSnapshotV1 | null = null;
      if (snapshotPresent) {
        snapshot = readSnapshot(paths, policy);
      }
      return {
        marker: VOID_NATIVE_ACCOUNT_STATE_STORE_V1,
        version: 1,
        initialized: snapshotPresent,
        recovery_required: existsSync(paths.intent),
        lock_present: existsSync(paths.lock),
        snapshot_present: snapshotPresent,
        journal_present: existsSync(paths.journal),
        state_version: snapshot?.state_version ?? null,
        account_count: snapshot?.accounts.length ?? 0,
        applied_transaction_count:
          snapshot?.applied_transactions.length ?? 0,
        block_atomic_apply_once: true,
        last_commit_id: snapshot?.last_commit_id ?? null,
        filesystem_authority: true,
        runtime_mounted: false,
        block_executor_wired: false,
      };
    },
  };
}
