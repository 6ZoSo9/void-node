import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { keccak256 } from "ethers";
import type {
  BuyVoidNativeDeliveryBroadcasterV1,
  BuyVoidNativeDeliveryBroadcastResultV1,
} from "./buy_void_native_delivery_sign_broadcast_adapter_v1.js";

export const VOID_BUY_VOID_CHAIN2050_DURABILITY_GATE_V1 =
  "VOID_BUY_VOID_CHAIN2050_DURABILITY_GATE_V1";

export const VOID_BUY_VOID_CHAIN2050_DURABILITY_GATE_AUTHORITY_V1 = {
  server_controlled_root_dir: true,
  one_unresolved_chain_mutation_at_a_time: true,
  atomic_active_debt_claim_required: true,
  debt_armed_before_broadcast_io: true,
  unresolved_debt_blocks_later_broadcast: true,
  preclaim_crash_debt_is_non_authoritative: true,
  definitive_not_broadcast_can_resolve_debt: true,
  broadcast_unknown_keeps_debt: true,
  finalized_checkpoint_required_to_satisfy_confirmed_debt: true,
  raw_signed_transaction_persistence: false,
  wallet_access: false,
  credential_access: false,
  signing: false,
  rpc_call: false,
  automatic_retry: false,
  money_movement: false,
} as const;

const ROOT_ENV = "VOID_BUY_VOID_CHAIN2050_DURABILITY_ROOT";
const RUNTIME_ROOT_ENV = "VOID_BUY_VOID_RUNTIME_DIR";
const ACTIVE_DEBT_FILE = "active-debt-v1.json";
const HASH = /^0x[0-9a-f]{64}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const RAW_TX = /^0x[0-9a-fA-F]+$/;
const MAX_RAW_TX_BYTES = 131_072;
const MAX_RECORD_BYTES = 65_536;
const MAX_RECORDS_PER_DIR = 4_096;

export class VoidBuyVoidChain2050DurabilityHoldV1 extends Error {
  reason: string;
  detail?: Record<string, unknown>;

  constructor(reason: string, detail?: Record<string, unknown>) {
    super(reason);
    this.name = "VoidBuyVoidChain2050DurabilityHoldV1";
    this.reason = reason;
    this.detail = detail;
  }
}

export type BuyVoidChain2050DurabilityDebtV1 = {
  schema: "void_buy_void_chain2050_durability_debt_v1";
  marker: typeof VOID_BUY_VOID_CHAIN2050_DURABILITY_GATE_V1;
  version: 1;
  transaction_hash: string;
  armed_at_ms: number;
  raw_signed_transaction_persisted: false;
  automatic_retry_allowed: false;
};

export type BuyVoidChain2050DurabilityResolutionV1 = {
  schema: "void_buy_void_chain2050_durability_resolution_v1";
  marker: typeof VOID_BUY_VOID_CHAIN2050_DURABILITY_GATE_V1;
  version: 1;
  transaction_hash: string;
  resolution: "definitive_not_broadcast";
  resolved_at_ms: number;
  transaction_broadcast_performed: false;
  automatic_retry_allowed: false;
};

export type BuyVoidChain2050DurabilitySatisfactionV1 = {
  schema: "void_buy_void_chain2050_durability_satisfaction_v1";
  marker: typeof VOID_BUY_VOID_CHAIN2050_DURABILITY_GATE_V1;
  version: 1;
  transaction_hash: string;
  attempt_id: string;
  delivery_block_number: string;
  checkpoint_id_sha256: string;
  checkpoint_block_number: number;
  checkpoint_block_hash: string;
  satisfied_at_ms: number;
  finalized_checkpoint_verified: true;
  automatic_retry_allowed: false;
};

export type BuyVoidChain2050DurabilityStateV1 = {
  root_dir: string;
  debt_count: number;
  definitive_not_broadcast_resolution_count: number;
  checkpoint_satisfaction_count: number;
  active_debt_transaction_hash: string | null;
  preclaim_debt_count: number;
  unresolved_debt_count: number;
  unresolved_transaction_hashes: string[];
};

type GatePathsV1 = {
  root: string;
  debts: string;
  resolutions: string;
  satisfactions: string;
  active: string;
};

function hold(reason: string, detail?: Record<string, unknown>): never {
  throw new VoidBuyVoidChain2050DurabilityHoldV1(reason, detail);
}

function nowMs(value?: number): number {
  const candidate = value ?? Date.now();
  if (!Number.isSafeInteger(candidate) || candidate <= 0) {
    hold("chain2050_durability_timestamp_invalid");
  }
  return candidate;
}

function safeTransactionHash(value: unknown): string {
  const hash = String(value || "").trim().toLowerCase();
  if (!HASH.test(hash)) hold("chain2050_durability_transaction_hash_invalid");
  return hash;
}

function safeAttemptId(value: unknown): string {
  const id = String(value || "").trim().toLowerCase();
  if (!SHA256.test(id)) hold("chain2050_durability_attempt_id_invalid");
  return id;
}

function positiveBlock(value: unknown, reason: string): bigint {
  const raw = String(value ?? "").trim();
  if (!/^[1-9][0-9]*$/.test(raw)) hold(reason);
  const parsed = BigInt(raw);
  if (parsed > BigInt(Number.MAX_SAFE_INTEGER)) hold(reason);
  return parsed;
}

function exactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  reason: string,
): void {
  const observed = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(observed) !== JSON.stringify(wanted)) hold(reason);
}

function assertNoSymlinkComponents(target: string): void {
  const absolute = path.resolve(target);
  const parsed = path.parse(absolute);
  let current = parsed.root;
  for (const part of absolute.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    if (!fs.existsSync(current)) continue;
    const stat = fs.lstatSync(current);
    if (stat.isSymbolicLink()) hold("chain2050_durability_symlink_path_forbidden");
  }
}

function ensurePrivateDirectory(dir: string): void {
  assertNoSymlinkComponents(dir);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const stat = fs.lstatSync(dir);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    hold("chain2050_durability_directory_unsafe");
  }
  if (typeof process.getuid === "function" && stat.uid !== process.getuid()) {
    hold("chain2050_durability_directory_owner_invalid");
  }
  fs.chmodSync(dir, 0o700);
}

function fsyncDirectory(dir: string): void {
  const fd = fs.openSync(dir, "r");
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function gatePaths(rootDir: string): GatePathsV1 {
  const root = path.resolve(rootDir);
  return {
    root,
    debts: path.join(root, "debts"),
    resolutions: path.join(root, "resolutions"),
    satisfactions: path.join(root, "satisfactions"),
    active: path.join(root, ACTIVE_DEBT_FILE),
  };
}

function ensureGate(paths: GatePathsV1): void {
  ensurePrivateDirectory(paths.root);
  ensurePrivateDirectory(paths.debts);
  ensurePrivateDirectory(paths.resolutions);
  ensurePrivateDirectory(paths.satisfactions);
}

function basenameForHash(hash: string): string {
  return `${hash.slice(2)}.json`;
}

function exactFile(file: string): fs.Stats {
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    hold("chain2050_durability_record_unsafe");
  }
  if (typeof process.getuid === "function" && stat.uid !== process.getuid()) {
    hold("chain2050_durability_record_owner_invalid");
  }
  if ((stat.mode & 0o777) !== 0o600) {
    hold("chain2050_durability_record_mode_invalid");
  }
  if (stat.size <= 0 || stat.size > MAX_RECORD_BYTES) {
    hold("chain2050_durability_record_size_invalid");
  }
  return stat;
}

function readRecord(file: string): Record<string, unknown> {
  exactFile(file);
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    hold("chain2050_durability_record_json_invalid");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    hold("chain2050_durability_record_shape_invalid");
  }
  return parsed as Record<string, unknown>;
}

function listFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  if (entries.length > MAX_RECORDS_PER_DIR) {
    hold("chain2050_durability_record_count_exceeded");
  }
  return entries.map((entry) => {
    if (entry.isSymbolicLink() || !entry.isFile()) {
      hold("chain2050_durability_record_entry_unsafe");
    }
    if (!/^[0-9a-f]{64}\.json$/.test(entry.name)) {
      hold("chain2050_durability_record_name_invalid");
    }
    return path.join(dir, entry.name);
  }).sort();
}

function parseDebtRecord(value: Record<string, unknown>): BuyVoidChain2050DurabilityDebtV1 {
  exactKeys(
    value,
    [
      "schema",
      "marker",
      "version",
      "transaction_hash",
      "armed_at_ms",
      "raw_signed_transaction_persisted",
      "automatic_retry_allowed",
    ],
    "chain2050_durability_debt_record_schema_invalid",
  );
  if (
    value.schema !== "void_buy_void_chain2050_durability_debt_v1" ||
    value.marker !== VOID_BUY_VOID_CHAIN2050_DURABILITY_GATE_V1 ||
    value.version !== 1 ||
    value.raw_signed_transaction_persisted !== false ||
    value.automatic_retry_allowed !== false
  ) hold("chain2050_durability_debt_record_invalid");
  safeTransactionHash(value.transaction_hash);
  nowMs(Number(value.armed_at_ms));
  return value as BuyVoidChain2050DurabilityDebtV1;
}

function debtFromFile(file: string): BuyVoidChain2050DurabilityDebtV1 {
  const value = parseDebtRecord(readRecord(file));
  if (path.basename(file) !== basenameForHash(value.transaction_hash)) {
    hold("chain2050_durability_debt_filename_mismatch");
  }
  return value;
}

function resolutionFromFile(file: string): BuyVoidChain2050DurabilityResolutionV1 {
  const value = readRecord(file);
  exactKeys(
    value,
    [
      "schema",
      "marker",
      "version",
      "transaction_hash",
      "resolution",
      "resolved_at_ms",
      "transaction_broadcast_performed",
      "automatic_retry_allowed",
    ],
    "chain2050_durability_resolution_record_schema_invalid",
  );
  if (
    value.schema !== "void_buy_void_chain2050_durability_resolution_v1" ||
    value.marker !== VOID_BUY_VOID_CHAIN2050_DURABILITY_GATE_V1 ||
    value.version !== 1 ||
    value.resolution !== "definitive_not_broadcast" ||
    value.transaction_broadcast_performed !== false ||
    value.automatic_retry_allowed !== false
  ) hold("chain2050_durability_resolution_record_invalid");
  const transactionHash = safeTransactionHash(value.transaction_hash);
  if (path.basename(file) !== basenameForHash(transactionHash)) {
    hold("chain2050_durability_resolution_filename_mismatch");
  }
  nowMs(Number(value.resolved_at_ms));
  return value as BuyVoidChain2050DurabilityResolutionV1;
}

function satisfactionFromFile(file: string): BuyVoidChain2050DurabilitySatisfactionV1 {
  const value = readRecord(file);
  exactKeys(
    value,
    [
      "schema",
      "marker",
      "version",
      "transaction_hash",
      "attempt_id",
      "delivery_block_number",
      "checkpoint_id_sha256",
      "checkpoint_block_number",
      "checkpoint_block_hash",
      "satisfied_at_ms",
      "finalized_checkpoint_verified",
      "automatic_retry_allowed",
    ],
    "chain2050_durability_satisfaction_record_schema_invalid",
  );
  if (
    value.schema !== "void_buy_void_chain2050_durability_satisfaction_v1" ||
    value.marker !== VOID_BUY_VOID_CHAIN2050_DURABILITY_GATE_V1 ||
    value.version !== 1 ||
    value.finalized_checkpoint_verified !== true ||
    value.automatic_retry_allowed !== false ||
    typeof value.checkpoint_id_sha256 !== "string" ||
    !SHA256.test(value.checkpoint_id_sha256) ||
    typeof value.checkpoint_block_hash !== "string" ||
    !HASH.test(value.checkpoint_block_hash)
  ) hold("chain2050_durability_satisfaction_record_invalid");
  const transactionHash = safeTransactionHash(value.transaction_hash);
  safeAttemptId(value.attempt_id);
  const deliveryBlock = positiveBlock(
    value.delivery_block_number,
    "chain2050_durability_delivery_block_invalid",
  );
  const checkpointBlock = positiveBlock(
    value.checkpoint_block_number,
    "chain2050_durability_checkpoint_block_invalid",
  );
  if (checkpointBlock < deliveryBlock) {
    hold("chain2050_durability_checkpoint_below_delivery_block");
  }
  if (path.basename(file) !== basenameForHash(transactionHash)) {
    hold("chain2050_durability_satisfaction_filename_mismatch");
  }
  nowMs(Number(value.satisfied_at_ms));
  return value as BuyVoidChain2050DurabilitySatisfactionV1;
}

function writeCreateOnly(file: string, value: unknown): void {
  const parent = path.dirname(file);
  ensurePrivateDirectory(parent);
  const text = `${JSON.stringify(value, null, 2)}\n`;
  let fd: number;
  try {
    fd = fs.openSync(file, "wx", 0o600);
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "EEXIST") {
      hold("chain2050_durability_record_already_exists");
    }
    throw error;
  }
  try {
    fs.writeFileSync(fd, text, "utf8");
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.chmodSync(file, 0o600);
  fsyncDirectory(parent);
}

function recordDefinitiveNotBroadcast(input: {
  paths: GatePathsV1;
  transaction_hash: string;
  now_ms?: number;
}): BuyVoidChain2050DurabilityResolutionV1 {
  const record: BuyVoidChain2050DurabilityResolutionV1 = {
    schema: "void_buy_void_chain2050_durability_resolution_v1",
    marker: VOID_BUY_VOID_CHAIN2050_DURABILITY_GATE_V1,
    version: 1,
    transaction_hash: input.transaction_hash,
    resolution: "definitive_not_broadcast",
    resolved_at_ms: nowMs(input.now_ms),
    transaction_broadcast_performed: false,
    automatic_retry_allowed: false,
  };
  writeCreateOnly(
    path.join(input.paths.resolutions, basenameForHash(input.transaction_hash)),
    record,
  );
  return record;
}

function activeDebt(paths: GatePathsV1): BuyVoidChain2050DurabilityDebtV1 | null {
  if (!fs.existsSync(paths.active)) return null;
  const activeStat = exactFile(paths.active);
  const debt = parseDebtRecord(readRecord(paths.active));
  const debtFile = path.join(paths.debts, basenameForHash(debt.transaction_hash));
  if (!fs.existsSync(debtFile)) hold("chain2050_durability_active_debt_history_missing");
  const debtStat = exactFile(debtFile);
  if (activeStat.dev !== debtStat.dev || activeStat.ino !== debtStat.ino) {
    hold("chain2050_durability_active_debt_not_hardlinked");
  }
  const historic = debtFromFile(debtFile);
  if (JSON.stringify(historic) !== JSON.stringify(debt)) {
    hold("chain2050_durability_active_debt_content_mismatch");
  }
  return debt;
}

function releaseActiveSlotBestEffort(paths: GatePathsV1, transactionHash: string): void {
  try {
    const active = activeDebt(paths);
    if (!active || active.transaction_hash !== transactionHash) return;
    fs.unlinkSync(paths.active);
    try {
      fsyncDirectory(paths.root);
    } catch {
      // A stale active hard link is safe because resolution/satisfaction is authoritative.
    }
  } catch {
    // A stale active hard link is fail-closed and cleaned before any future claim.
  }
}

function prepareActiveSlotForNewDebt(paths: GatePathsV1): void {
  const active = activeDebt(paths);
  if (!active) return;
  const resolutionFile = path.join(
    paths.resolutions,
    basenameForHash(active.transaction_hash),
  );
  const satisfactionFile = path.join(
    paths.satisfactions,
    basenameForHash(active.transaction_hash),
  );
  if (!fs.existsSync(resolutionFile) && !fs.existsSync(satisfactionFile)) {
    hold("chain2050_checkpoint_debt_active", {
      unresolved_debt_count: 1,
      unresolved_transaction_hashes: [active.transaction_hash],
    });
  }
  if (fs.existsSync(resolutionFile)) resolutionFromFile(resolutionFile);
  if (fs.existsSync(satisfactionFile)) satisfactionFromFile(satisfactionFile);
  fs.unlinkSync(paths.active);
  fsyncDirectory(paths.root);
}

export function buyVoidChain2050DurabilityRootDirV1(): string {
  const configured = String(process.env[ROOT_ENV] || "").trim();
  if (configured) return path.resolve(configured);
  const runtimeRoot = String(process.env[RUNTIME_ROOT_ENV] || "").trim();
  if (runtimeRoot) {
    return path.join(path.resolve(runtimeRoot), "chain2050-durability-v1");
  }
  const dataDir = String(
    process.env.VOID_DATA_DIR || process.env.DATA_DIR || "data_a",
  ).trim();
  return path.resolve(
    process.cwd(),
    dataDir,
    "buy_void_v1",
    "runtime-integration-v1",
    "chain2050-durability-v1",
  );
}

export function inspectBuyVoidChain2050DurabilityV1(
  rootDir = buyVoidChain2050DurabilityRootDirV1(),
): BuyVoidChain2050DurabilityStateV1 {
  const paths = gatePaths(rootDir);
  ensureGate(paths);
  const debts = listFiles(paths.debts).map(debtFromFile);
  const resolutions = listFiles(paths.resolutions).map(resolutionFromFile);
  const satisfactions = listFiles(paths.satisfactions).map(satisfactionFromFile);
  const debtHashes = new Set(debts.map((item) => item.transaction_hash));
  const resolved = new Set(resolutions.map((item) => item.transaction_hash));
  const satisfied = new Set(satisfactions.map((item) => item.transaction_hash));
  for (const hash of resolved) {
    if (!debtHashes.has(hash)) hold("chain2050_durability_resolution_without_debt");
  }
  for (const hash of satisfied) {
    if (!debtHashes.has(hash)) hold("chain2050_durability_satisfaction_without_debt");
    if (resolved.has(hash)) hold("chain2050_durability_conflicting_resolution");
  }
  const active = activeDebt(paths);
  const activeHash = active?.transaction_hash ?? null;
  const unresolved =
    activeHash && !resolved.has(activeHash) && !satisfied.has(activeHash)
      ? [activeHash]
      : [];
  const preclaimDebtCount = debts.filter(
    (item) =>
      item.transaction_hash !== activeHash &&
      !resolved.has(item.transaction_hash) &&
      !satisfied.has(item.transaction_hash),
  ).length;
  return {
    root_dir: paths.root,
    debt_count: debts.length,
    definitive_not_broadcast_resolution_count: resolutions.length,
    checkpoint_satisfaction_count: satisfactions.length,
    active_debt_transaction_hash: activeHash,
    preclaim_debt_count: preclaimDebtCount,
    unresolved_debt_count: unresolved.length,
    unresolved_transaction_hashes: unresolved,
  };
}

export function armBuyVoidChain2050DurabilityDebtV1(input: {
  root_dir?: string;
  transaction_hash: unknown;
  now_ms?: number;
}): BuyVoidChain2050DurabilityDebtV1 {
  const root = input.root_dir || buyVoidChain2050DurabilityRootDirV1();
  const paths = gatePaths(root);
  ensureGate(paths);
  prepareActiveSlotForNewDebt(paths);
  const transactionHash = safeTransactionHash(input.transaction_hash);
  const debtFile = path.join(paths.debts, basenameForHash(transactionHash));
  if (fs.existsSync(debtFile)) {
    debtFromFile(debtFile);
    hold("chain2050_durability_transaction_already_claimed");
  }
  const record: BuyVoidChain2050DurabilityDebtV1 = {
    schema: "void_buy_void_chain2050_durability_debt_v1",
    marker: VOID_BUY_VOID_CHAIN2050_DURABILITY_GATE_V1,
    version: 1,
    transaction_hash: transactionHash,
    armed_at_ms: nowMs(input.now_ms),
    raw_signed_transaction_persisted: false,
    automatic_retry_allowed: false,
  };
  writeCreateOnly(debtFile, record);
  try {
    fs.linkSync(debtFile, paths.active);
    fsyncDirectory(paths.root);
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "EEXIST") {
      recordDefinitiveNotBroadcast({
        paths,
        transaction_hash: transactionHash,
        now_ms: input.now_ms,
      });
      hold("chain2050_durability_active_claim_conflict");
    }
    throw error;
  }
  const active = activeDebt(paths);
  if (!active || active.transaction_hash !== transactionHash) {
    hold("chain2050_durability_active_claim_verification_failed");
  }
  return record;
}

export function resolveBuyVoidChain2050DefinitiveNotBroadcastV1(input: {
  root_dir?: string;
  transaction_hash: unknown;
  now_ms?: number;
}): BuyVoidChain2050DurabilityResolutionV1 {
  const root = input.root_dir || buyVoidChain2050DurabilityRootDirV1();
  const paths = gatePaths(root);
  const transactionHash = safeTransactionHash(input.transaction_hash);
  const state = inspectBuyVoidChain2050DurabilityV1(root);
  if (!state.unresolved_transaction_hashes.includes(transactionHash)) {
    hold("chain2050_durability_unresolved_debt_not_found");
  }
  const record = recordDefinitiveNotBroadcast({
    paths,
    transaction_hash: transactionHash,
    now_ms: input.now_ms,
  });
  releaseActiveSlotBestEffort(paths, transactionHash);
  return record;
}

export function satisfyBuyVoidChain2050DurabilityDebtV1(input: {
  root_dir?: string;
  transaction_hash: unknown;
  attempt_id: unknown;
  delivery_block_number: unknown;
  checkpoint: {
    checkpoint_id_sha256: unknown;
    chain_id: unknown;
    block_number: unknown;
    block_hash: unknown;
  };
  now_ms?: number;
}): BuyVoidChain2050DurabilitySatisfactionV1 {
  const root = input.root_dir || buyVoidChain2050DurabilityRootDirV1();
  const paths = gatePaths(root);
  const transactionHash = safeTransactionHash(input.transaction_hash);
  const attemptId = safeAttemptId(input.attempt_id);
  const deliveryBlock = positiveBlock(
    input.delivery_block_number,
    "chain2050_durability_delivery_block_invalid",
  );
  const checkpointId = String(input.checkpoint?.checkpoint_id_sha256 || "");
  if (!SHA256.test(checkpointId)) hold("chain2050_durability_checkpoint_id_invalid");
  if (Number(input.checkpoint?.chain_id) !== 2050) {
    hold("chain2050_durability_checkpoint_chain_mismatch");
  }
  const checkpointBlock = positiveBlock(
    input.checkpoint?.block_number,
    "chain2050_durability_checkpoint_block_invalid",
  );
  if (checkpointBlock < deliveryBlock) {
    hold("chain2050_durability_checkpoint_below_delivery_block");
  }
  const checkpointHash = safeTransactionHash(input.checkpoint?.block_hash);
  const state = inspectBuyVoidChain2050DurabilityV1(root);
  if (!state.unresolved_transaction_hashes.includes(transactionHash)) {
    hold("chain2050_durability_unresolved_debt_not_found");
  }
  const record: BuyVoidChain2050DurabilitySatisfactionV1 = {
    schema: "void_buy_void_chain2050_durability_satisfaction_v1",
    marker: VOID_BUY_VOID_CHAIN2050_DURABILITY_GATE_V1,
    version: 1,
    transaction_hash: transactionHash,
    attempt_id: attemptId,
    delivery_block_number: deliveryBlock.toString(),
    checkpoint_id_sha256: checkpointId,
    checkpoint_block_number: Number(checkpointBlock),
    checkpoint_block_hash: checkpointHash,
    satisfied_at_ms: nowMs(input.now_ms),
    finalized_checkpoint_verified: true,
    automatic_retry_allowed: false,
  };
  writeCreateOnly(
    path.join(paths.satisfactions, basenameForHash(transactionHash)),
    record,
  );
  releaseActiveSlotBestEffort(paths, transactionHash);
  return record;
}

export function wrapBuyVoidChain2050DurabilityBroadcasterV1(input: {
  broadcaster: BuyVoidNativeDeliveryBroadcasterV1;
  root_dir?: string;
  now_ms?: () => number;
}): BuyVoidNativeDeliveryBroadcasterV1 {
  if (typeof input?.broadcaster?.broadcast_signed_transaction !== "function") {
    hold("chain2050_durability_broadcaster_missing");
  }
  const root = input.root_dir || buyVoidChain2050DurabilityRootDirV1();
  return Object.freeze({
    broadcast_signed_transaction: async (
      rawSignedTransaction: string,
    ): Promise<BuyVoidNativeDeliveryBroadcastResultV1> => {
      if (
        typeof rawSignedTransaction !== "string" ||
        !RAW_TX.test(rawSignedTransaction) ||
        rawSignedTransaction.length % 2 !== 0 ||
        Buffer.byteLength(rawSignedTransaction, "utf8") > MAX_RAW_TX_BYTES
      ) {
        hold("chain2050_durability_raw_transaction_invalid");
      }
      const transactionHash = keccak256(rawSignedTransaction).toLowerCase();
      armBuyVoidChain2050DurabilityDebtV1({
        root_dir: root,
        transaction_hash: transactionHash,
        now_ms: input.now_ms?.(),
      });
      const result = await input.broadcaster.broadcast_signed_transaction(
        rawSignedTransaction,
      );
      if (
        result?.accepted === false &&
        result.submission_may_have_occurred === false
      ) {
        resolveBuyVoidChain2050DefinitiveNotBroadcastV1({
          root_dir: root,
          transaction_hash: transactionHash,
          now_ms: input.now_ms?.(),
        });
      }
      return result;
    },
  });
}

export function buyVoidChain2050DurabilityFingerprintV1(
  state: BuyVoidChain2050DurabilityStateV1,
): string {
  return crypto.createHash("sha256").update(
    JSON.stringify({
      debt_count: state.debt_count,
      definitive_not_broadcast_resolution_count:
        state.definitive_not_broadcast_resolution_count,
      checkpoint_satisfaction_count: state.checkpoint_satisfaction_count,
      active_debt_transaction_hash: state.active_debt_transaction_hash,
      preclaim_debt_count: state.preclaim_debt_count,
      unresolved_transaction_hashes: state.unresolved_transaction_hashes,
    }),
    "utf8",
  ).digest("hex");
}
