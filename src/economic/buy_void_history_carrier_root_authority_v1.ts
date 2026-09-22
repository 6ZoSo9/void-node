import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  VOID_BUY_VOID_HISTORY_CARRIER_MAX_PAGE_WRITES_PER_INSERT_V1,
  VOID_BUY_VOID_HISTORY_CARRIER_PAGE_BYTES_V1,
  VOID_BUY_VOID_HISTORY_CARRIER_ROOT_V1,
  VOID_BUY_VOID_HISTORY_CARRIER_TX_INTENT_V1,
  verifyBuyVoidHistoryCarrierRootV1,
  verifyBuyVoidHistoryCarrierSuccessorV1,
  verifyBuyVoidHistoryCarrierTxIntentBindingV1,
  verifyBuyVoidHistoryCarrierTxIntentV1,
  type BuyVoidHistoryCarrierRootV1,
  type BuyVoidHistoryCarrierTxIntentV1,
} from "./buy_void_history_carrier_v1.js";
import {
  projectBuyVoidPaymentHistoryTerminalFromServerPathsV1,
} from "./buy_void_payment_history_terminal_projection_v1.js";

export const VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_V1 =
  "VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_V1";
export const VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_RECORD_V1 =
  "VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_RECORD_V1";
export const VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_GENERATION_V1 =
  "VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_GENERATION_V1";

export const VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_PRODUCTION_GENESIS_ROOT_SHA256_V1 =
  "32649ce8d7edf089d4078d97fd72832d0b44da4736b5d58cdf3cde969a33ab1a";
export const VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_PRODUCTION_GENESIS_TX_INTENT_SHA256_V1 =
  "f9e5a2fb8224fb110cbe384bfccbab59e1e9646f02c2c0b751a3d2a7d1a76e93";
export const VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_PRODUCTION_ATTESTATION_ID_V1 =
  "voidbvhca1_0b7f99cbbf4dfbd8c3673d8915350b1d972bf1579d3798a52ab052eb3acb3465";
export const VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_PRODUCTION_POOL_ID_V1 =
  "buy-void-presale-v1";
export const VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_PRODUCTION_GENESIS_PAGE_SHA256_V1 =
  "07a59cfe2f0374d52e138787c80a1ec2c1d257303adea0ad8e5692800b59748e";

export const VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_MAX_GENERATIONS_V1 = 4_096;
export const VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_MAX_REFERENCED_PAGES_V1 =
  VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_MAX_GENERATIONS_V1 *
  VOID_BUY_VOID_HISTORY_CARRIER_MAX_PAGE_WRITES_PER_INSERT_V1;

export const VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_AUTHORITY_V1 = {
  accepted_production_genesis_pinned: true,
  accepted_production_attestation_pinned: true,
  proof_only_generic_initializer_mount_authority: false,
  private_server_owned_filesystem_authority_required: true,
  immutable_content_addressed_root_objects: true,
  immutable_content_addressed_page_objects: true,
  create_only_generation_slots: true,
  generation_slot_is_atomic_authority_cutover: true,
  mutable_current_pointer_required: false,
  verified_carrier_root_required: true,
  verified_successor_transition_required: true,
  verified_tx_intent_binding_required: true,
  predecessor_match_required: true,
  rollback_rejected: true,
  same_generation_alternate_root_rejected: true,
  unresolved_page_publication_rejected_before_successor: true,
  bounded_restart_recovery_scan: true,
  bounded_read_only_current_snapshot: true,
  terminal_projection_uses_server_snapshot_not_caller_root: true,
  duplicate_successor_idempotent: true,
  concurrent_successor_generation_slot_deterministic: true,
  systemd_environment_rotation_required: false,
  service_restart_per_successor_required: false,
  runtime_integration: false,
  runtime_enablement: false,
  apply_enablement: false,
  public_activation: false,
  credential_content_read: false,
  wallet_or_signer_access: false,
  rpc_call: false,
  transaction_signing: false,
  transaction_broadcast: false,
  chain2050_write: false,
  inventory_mutation: false,
  treasury_or_liquidity_action: false,
  funds_movement: false,
  automatic_retry: false,
} as const;

const AUTHORITY_FILE = "authority.v1.json";
const GENERATIONS_DIR = "generations";
const ROOTS_DIR = "roots";
const PAGES_DIR = "pages";
const SHA256 = /^[0-9a-f]{64}$/u;
const GENERATION_NAME = /^[0-9]{10}\.json$/u;
const MAX_JSON_BYTES = 256 * 1024;
const O_NOFOLLOW = (fs.constants as typeof fs.constants & { O_NOFOLLOW?: number }).O_NOFOLLOW || 0;

type AuthorityModeV1 = "production" | "proof_only";

type AuthorityRecordV1 = {
  marker: typeof VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_RECORD_V1;
  version: 1;
  mode: AuthorityModeV1;
  pool_id: string;
  genesis_root_sha256: string;
  genesis_tx_intent_sha256: string;
  production_attestation_id: string | null;
  authority_id: string;
};

type GenerationRecordV1 = {
  marker: typeof VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_GENERATION_V1;
  version: 1;
  carrier_generation: number;
  carrier_root_sha256: string;
  previous_carrier_root_sha256: string | null;
  payment_index_root_sha256: string;
  previous_generation_record_id: string | null;
  tx_intent: BuyVoidHistoryCarrierTxIntentV1;
  page_digests: string[];
  page_set_sha256: string;
  generation_record_id: string;
};

export type BuyVoidHistoryCarrierAuthorityPageV1 = {
  sha256: string;
  bytes: Buffer;
};

export type BuyVoidHistoryCarrierAuthoritySnapshotV1 = {
  marker: typeof VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_V1;
  version: 1;
  mode: AuthorityModeV1;
  authority_id: string;
  pool_id: string;
  carrier_generation: number;
  current_carrier_root_sha256: string;
  current_payment_index_root_sha256: string;
  current_generation_record_id: string;
  current_root: BuyVoidHistoryCarrierRootV1;
  page_publication_complete: boolean;
  missing_page_digests: string[];
  verified_generation_count: number;
  verified_page_reference_count: number;
  runtime_activation_authorized: false;
  apply_activation_authorized: false;
  public_activation_authorized: false;
};

export type BuyVoidHistoryCarrierAuthorityPublishReceiptV1 = {
  marker: typeof VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_V1;
  version: 1;
  status: "created" | "duplicate";
  mutation_performed: boolean;
  carrier_generation: number;
  carrier_root_sha256: string;
  generation_record_id: string;
  snapshot: BuyVoidHistoryCarrierAuthoritySnapshotV1;
  runtime_activation_authorized: false;
  apply_activation_authorized: false;
  public_activation_authorized: false;
  service_action: false;
  transaction_broadcast: false;
  chain2050_write: false;
  funds_movement: false;
};

function fail(code: string, detail: string): never {
  throw new Error(
    VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_V1 +
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

function exactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  code: string,
): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index])
  ) {
    fail(code, actual.join(","));
  }
}

function assertPrivateDirectory(directoryInput: string, code: string): string {
  const directory = path.resolve(String(directoryInput || ""));
  const stat = fs.lstatSync(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    fail(code, directory);
  }
  const euid = typeof process.geteuid === "function" ? process.geteuid() : null;
  if (euid !== null && stat.uid !== euid) {
    fail(code + "_OWNER", directory);
  }
  if ((stat.mode & 0o022) !== 0) {
    fail(code + "_WRITABLE", directory);
  }
  if (fs.realpathSync(directory) !== directory) {
    fail(code + "_REALPATH", directory);
  }
  return directory;
}

function fsyncDirectory(directory: string): void {
  const fd = fs.openSync(directory, fs.constants.O_RDONLY);
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function ensurePrivateDirectory(parent: string, name: string): string {
  const directory = path.join(parent, name);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { mode: 0o700 });
    fsyncDirectory(parent);
  }
  return assertPrivateDirectory(directory, "PRIVATE_DIRECTORY_INVALID");
}

function createAuthorityRoot(authorityRootInput: string): string {
  const authorityRoot = path.resolve(String(authorityRootInput || ""));
  if (!path.isAbsolute(authorityRoot)) {
    fail("AUTHORITY_ROOT_NOT_ABSOLUTE", authorityRoot);
  }
  if (!fs.existsSync(authorityRoot)) {
    const parent = assertPrivateDirectory(
      path.dirname(authorityRoot),
      "AUTHORITY_PARENT_INVALID",
    );
    fs.mkdirSync(authorityRoot, { mode: 0o700 });
    fsyncDirectory(parent);
  }
  return assertPrivateDirectory(authorityRoot, "AUTHORITY_ROOT_INVALID");
}

function layout(authorityRootInput: string, create: boolean): {
  root: string;
  generations: string;
  roots: string;
  pages: string;
} {
  const root = create
    ? createAuthorityRoot(authorityRootInput)
    : assertPrivateDirectory(
        path.resolve(String(authorityRootInput || "")),
        "AUTHORITY_ROOT_INVALID",
      );
  const generations = create
    ? ensurePrivateDirectory(root, GENERATIONS_DIR)
    : assertPrivateDirectory(
        path.join(root, GENERATIONS_DIR),
        "GENERATIONS_DIRECTORY_INVALID",
      );
  const roots = create
    ? ensurePrivateDirectory(root, ROOTS_DIR)
    : assertPrivateDirectory(
        path.join(root, ROOTS_DIR),
        "ROOTS_DIRECTORY_INVALID",
      );
  const pages = create
    ? ensurePrivateDirectory(root, PAGES_DIR)
    : assertPrivateDirectory(
        path.join(root, PAGES_DIR),
        "PAGES_DIRECTORY_INVALID",
      );
  return { root, generations, roots, pages };
}

function readExactFile(file: string, maxBytes: number, code: string): Buffer {
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    fail(code, file);
  }
  if (stat.size <= 0 || stat.size > maxBytes) {
    fail(code + "_SIZE", file + ":" + stat.size);
  }
  const fd = fs.openSync(
    file,
    fs.constants.O_RDONLY | O_NOFOLLOW,
  );
  try {
    const before = fs.fstatSync(fd);
    const bytes = Buffer.alloc(before.size);
    let offset = 0;
    while (offset < bytes.length) {
      const read = fs.readSync(
        fd,
        bytes,
        offset,
        bytes.length - offset,
        offset,
      );
      if (read <= 0) fail(code + "_SHORT_READ", file);
      offset += read;
    }
    const after = fs.fstatSync(fd);
    if (
      before.dev !== after.dev ||
      before.ino !== after.ino ||
      before.size !== after.size
    ) {
      fail(code + "_REPLACED", file);
    }
    return bytes;
  } finally {
    fs.closeSync(fd);
  }
}

function createOrVerifyFile(
  file: string,
  bytes: Buffer,
): "created" | "existing" {
  let fd: number | null = null;
  try {
    fd = fs.openSync(
      file,
      fs.constants.O_WRONLY |
        fs.constants.O_CREAT |
        fs.constants.O_EXCL |
        O_NOFOLLOW,
      0o600,
    );
    let offset = 0;
    while (offset < bytes.length) {
      offset += fs.writeSync(
        fd,
        bytes,
        offset,
        bytes.length - offset,
        offset,
      );
    }
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = null;
    fsyncDirectory(path.dirname(file));
    return "created";
  } catch (error: any) {
    if (fd !== null) {
      try { fs.closeSync(fd); } catch {}
    }
    if (error?.code !== "EEXIST") throw error;
    const existing = readExactFile(
      file,
      Math.max(bytes.length, MAX_JSON_BYTES),
      "EXISTING_FILE_INVALID",
    );
    if (!existing.equals(bytes)) {
      fail("IMMUTABLE_FILE_CONFLICT", file);
    }
    return "existing";
  }
}

function jsonBytes(value: unknown): Buffer {
  return Buffer.from(canonicalJson(value) + "\n", "utf8");
}

function parseCanonicalJson(
  file: string,
  maxBytes: number,
  code: string,
): Record<string, any> {
  const bytes = readExactFile(file, maxBytes, code);
  let value: unknown;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    fail(code + "_JSON", file);
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(code + "_OBJECT", file);
  }
  if (!bytes.equals(jsonBytes(value))) {
    fail(code + "_NON_CANONICAL", file);
  }
  return value as Record<string, any>;
}

function authorityCore(input: {
  mode: AuthorityModeV1;
  pool_id: string;
  genesis_root_sha256: string;
  genesis_tx_intent_sha256: string;
  production_attestation_id: string | null;
}): Omit<AuthorityRecordV1, "authority_id"> {
  return {
    marker:
      VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_RECORD_V1,
    version: 1,
    mode: input.mode,
    pool_id: input.pool_id,
    genesis_root_sha256:
      requireSha256(
        input.genesis_root_sha256,
        "GENESIS_ROOT_INVALID",
      ),
    genesis_tx_intent_sha256:
      requireSha256(
        input.genesis_tx_intent_sha256,
        "GENESIS_INTENT_INVALID",
      ),
    production_attestation_id:
      input.production_attestation_id,
  };
}

function makeAuthorityRecord(input: {
  mode: AuthorityModeV1;
  pool_id: string;
  genesis_root_sha256: string;
  genesis_tx_intent_sha256: string;
  production_attestation_id: string | null;
}): AuthorityRecordV1 {
  const core = authorityCore(input);
  return {
    ...core,
    authority_id: sha256(canonicalJson(core)),
  };
}

function readAuthorityRecord(authorityRoot: string): AuthorityRecordV1 {
  const raw = parseCanonicalJson(
    path.join(authorityRoot, AUTHORITY_FILE),
    MAX_JSON_BYTES,
    "AUTHORITY_RECORD_INVALID",
  );
  exactKeys(
    raw,
    [
      "marker",
      "version",
      "mode",
      "pool_id",
      "genesis_root_sha256",
      "genesis_tx_intent_sha256",
      "production_attestation_id",
      "authority_id",
    ],
    "AUTHORITY_RECORD_KEYS_INVALID",
  );
  const expected = makeAuthorityRecord({
    mode: raw.mode,
    pool_id: String(raw.pool_id || ""),
    genesis_root_sha256: raw.genesis_root_sha256,
    genesis_tx_intent_sha256: raw.genesis_tx_intent_sha256,
    production_attestation_id:
      raw.production_attestation_id === null
        ? null
        : String(raw.production_attestation_id || ""),
  });
  if (canonicalJson(expected) !== canonicalJson(raw)) {
    fail("AUTHORITY_RECORD_DIGEST_MISMATCH", authorityRoot);
  }
  if (
    expected.mode !== "production" &&
    expected.mode !== "proof_only"
  ) {
    fail("AUTHORITY_MODE_INVALID", String(expected.mode));
  }
  if (
    expected.mode === "production" &&
    (
      expected.pool_id !==
        VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_PRODUCTION_POOL_ID_V1 ||
      expected.genesis_root_sha256 !==
        VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_PRODUCTION_GENESIS_ROOT_SHA256_V1 ||
      expected.genesis_tx_intent_sha256 !==
        VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_PRODUCTION_GENESIS_TX_INTENT_SHA256_V1 ||
      expected.production_attestation_id !==
        VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_PRODUCTION_ATTESTATION_ID_V1
    )
  ) {
    fail("PRODUCTION_AUTHORITY_RECORD_MISMATCH", authorityRoot);
  }
  return expected;
}

function publishPageObject(
  pagesDirectory: string,
  pageInput: BuyVoidHistoryCarrierAuthorityPageV1,
): boolean {
  const digest = requireSha256(
    pageInput?.sha256,
    "PAGE_DIGEST_INVALID",
  );
  const bytes = Buffer.from(pageInput?.bytes || Buffer.alloc(0));
  if (
    bytes.length <= 0 ||
    bytes.length > VOID_BUY_VOID_HISTORY_CARRIER_PAGE_BYTES_V1
  ) {
    fail("PAGE_SIZE_INVALID", digest + ":" + bytes.length);
  }
  if (sha256(bytes) !== digest) {
    fail("PAGE_DIGEST_MISMATCH", digest);
  }
  return (
    createOrVerifyFile(
      path.join(pagesDirectory, digest + ".bin"),
      bytes,
    ) === "created"
  );
}

function readPageObject(
  pagesDirectory: string,
  digestInput: string,
): Buffer {
  const digest = requireSha256(
    digestInput,
    "PAGE_DIGEST_INVALID",
  );
  const bytes = readExactFile(
    path.join(pagesDirectory, digest + ".bin"),
    VOID_BUY_VOID_HISTORY_CARRIER_PAGE_BYTES_V1,
    "PAGE_OBJECT_INVALID",
  );
  if (sha256(bytes) !== digest) {
    fail("PAGE_OBJECT_DIGEST_MISMATCH", digest);
  }
  return bytes;
}

function publishRootObject(
  rootsDirectory: string,
  rootInput: BuyVoidHistoryCarrierRootV1,
): boolean {
  const root = verifyBuyVoidHistoryCarrierRootV1(rootInput);
  return (
    createOrVerifyFile(
      path.join(
        rootsDirectory,
        root.carrier_root_sha256 + ".json",
      ),
      jsonBytes(root),
    ) === "created"
  );
}

function readRootObject(
  rootsDirectory: string,
  digestInput: string,
): BuyVoidHistoryCarrierRootV1 {
  const digest = requireSha256(
    digestInput,
    "ROOT_DIGEST_INVALID",
  );
  const raw = parseCanonicalJson(
    path.join(rootsDirectory, digest + ".json"),
    MAX_JSON_BYTES,
    "ROOT_OBJECT_INVALID",
  );
  const root = verifyBuyVoidHistoryCarrierRootV1(
    raw as BuyVoidHistoryCarrierRootV1,
  );
  if (root.carrier_root_sha256 !== digest) {
    fail("ROOT_OBJECT_NAME_MISMATCH", digest);
  }
  return root;
}

function pageSetSha256(digestsInput: string[]): string {
  const digests = [...digestsInput]
    .map((value) =>
      requireSha256(value, "PAGE_DIGEST_INVALID"))
    .sort();
  if (
    digests.length >
    VOID_BUY_VOID_HISTORY_CARRIER_MAX_PAGE_WRITES_PER_INSERT_V1
  ) {
    fail("PAGE_SET_TOO_LARGE", String(digests.length));
  }
  if (
    digests.some(
      (value, index) =>
        index > 0 && value === digests[index - 1],
    )
  ) {
    fail("PAGE_SET_DUPLICATE", "duplicate");
  }
  return sha256(canonicalJson(digests));
}

function generationCore(input: {
  root: BuyVoidHistoryCarrierRootV1;
  previous_generation_record_id: string | null;
  tx_intent: BuyVoidHistoryCarrierTxIntentV1;
}): Omit<GenerationRecordV1, "generation_record_id"> {
  const root = verifyBuyVoidHistoryCarrierRootV1(input.root);
  const intent =
    verifyBuyVoidHistoryCarrierTxIntentV1(input.tx_intent);
  verifyBuyVoidHistoryCarrierTxIntentBindingV1(intent, root);
  const pageDigests = [...intent.new_page_digests].sort();
  return {
    marker:
      VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_GENERATION_V1,
    version: 1,
    carrier_generation: root.carrier_generation,
    carrier_root_sha256: root.carrier_root_sha256,
    previous_carrier_root_sha256:
      root.previous_carrier_root_sha256,
    payment_index_root_sha256:
      root.payment_index_root_sha256,
    previous_generation_record_id:
      input.previous_generation_record_id === null
        ? null
        : requireSha256(
            input.previous_generation_record_id,
            "PREVIOUS_GENERATION_RECORD_ID_INVALID",
          ),
    tx_intent: intent,
    page_digests: pageDigests,
    page_set_sha256: pageSetSha256(pageDigests),
  };
}

function makeGenerationRecord(input: {
  root: BuyVoidHistoryCarrierRootV1;
  previous_generation_record_id: string | null;
  tx_intent: BuyVoidHistoryCarrierTxIntentV1;
}): GenerationRecordV1 {
  const core = generationCore(input);
  return {
    ...core,
    generation_record_id:
      sha256(canonicalJson(core)),
  };
}

function generationName(generation: number): string {
  if (
    !Number.isSafeInteger(generation) ||
    generation <= 0 ||
    generation >
      VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_MAX_GENERATIONS_V1
  ) {
    fail("GENERATION_INVALID", String(generation));
  }
  return String(generation).padStart(10, "0") + ".json";
}

function readGenerationRecord(
  generationsDirectory: string,
  generation: number,
): GenerationRecordV1 {
  const raw = parseCanonicalJson(
    path.join(
      generationsDirectory,
      generationName(generation),
    ),
    MAX_JSON_BYTES,
    "GENERATION_RECORD_INVALID",
  );
  exactKeys(
    raw,
    [
      "marker",
      "version",
      "carrier_generation",
      "carrier_root_sha256",
      "previous_carrier_root_sha256",
      "payment_index_root_sha256",
      "previous_generation_record_id",
      "tx_intent",
      "page_digests",
      "page_set_sha256",
      "generation_record_id",
    ],
    "GENERATION_RECORD_KEYS_INVALID",
  );
  const rootDigest = requireSha256(
    raw.carrier_root_sha256,
    "GENERATION_ROOT_DIGEST_INVALID",
  );
  const core = {
    marker:
      VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_GENERATION_V1,
    version: 1 as const,
    carrier_generation: Number(raw.carrier_generation),
    carrier_root_sha256: rootDigest,
    previous_carrier_root_sha256:
      raw.previous_carrier_root_sha256 === null
        ? null
        : requireSha256(
            raw.previous_carrier_root_sha256,
            "GENERATION_PREDECESSOR_INVALID",
          ),
    payment_index_root_sha256:
      requireSha256(
        raw.payment_index_root_sha256,
        "GENERATION_INDEX_ROOT_INVALID",
      ),
    previous_generation_record_id:
      raw.previous_generation_record_id === null
        ? null
        : requireSha256(
            raw.previous_generation_record_id,
            "GENERATION_PREVIOUS_RECORD_INVALID",
          ),
    tx_intent:
      verifyBuyVoidHistoryCarrierTxIntentV1(
        raw.tx_intent as BuyVoidHistoryCarrierTxIntentV1,
      ),
    page_digests:
      Array.isArray(raw.page_digests)
        ? raw.page_digests.map((value: unknown) =>
            requireSha256(value, "GENERATION_PAGE_DIGEST_INVALID")).sort()
        : fail("GENERATION_PAGE_DIGESTS_INVALID", String(generation)),
    page_set_sha256:
      requireSha256(
        raw.page_set_sha256,
        "GENERATION_PAGE_SET_INVALID",
      ),
  };
  if (
    !Number.isSafeInteger(core.carrier_generation) ||
    core.carrier_generation !== generation
  ) {
    fail("GENERATION_NUMBER_MISMATCH", String(generation));
  }
  if (
    core.page_set_sha256 !==
      pageSetSha256(core.page_digests)
  ) {
    fail("GENERATION_PAGE_SET_MISMATCH", String(generation));
  }
  const expected = {
    ...core,
    generation_record_id:
      sha256(canonicalJson(core)),
  };
  if (canonicalJson(expected) !== canonicalJson(raw)) {
    fail("GENERATION_RECORD_DIGEST_MISMATCH", String(generation));
  }
  return expected;
}

function initializeAuthority(input: {
  authority_root: string;
  mode: AuthorityModeV1;
  pool_id: string;
  genesis_root: BuyVoidHistoryCarrierRootV1;
  genesis_tx_intent: BuyVoidHistoryCarrierTxIntentV1;
  genesis_pages?: BuyVoidHistoryCarrierAuthorityPageV1[];
  production_attestation_id: string | null;
}): BuyVoidHistoryCarrierAuthoritySnapshotV1 {
  const root = verifyBuyVoidHistoryCarrierRootV1(
    input.genesis_root,
  );
  const intent =
    verifyBuyVoidHistoryCarrierTxIntentV1(
      input.genesis_tx_intent,
    );
  verifyBuyVoidHistoryCarrierTxIntentBindingV1(
    intent,
    root,
  );
  if (
    root.carrier_generation !== 1 ||
    root.previous_carrier_root_sha256 !== null ||
    intent.predecessor_carrier_root_sha256 !== null ||
    root.pool_id !== input.pool_id ||
    intent.pool_id !== input.pool_id
  ) {
    fail("GENESIS_BINDING_INVALID", root.carrier_root_sha256);
  }

  const paths = layout(input.authority_root, true);
  const authority = makeAuthorityRecord({
    mode: input.mode,
    pool_id: input.pool_id,
    genesis_root_sha256: root.carrier_root_sha256,
    genesis_tx_intent_sha256: intent.tx_intent_sha256,
    production_attestation_id:
      input.production_attestation_id,
  });
  createOrVerifyFile(
    path.join(paths.root, AUTHORITY_FILE),
    jsonBytes(authority),
  );

  let pageMutation = false;
  for (const page of input.genesis_pages || []) {
    pageMutation =
      publishPageObject(paths.pages, page) ||
      pageMutation;
  }
  void pageMutation;

  publishRootObject(paths.roots, root);
  const generation = makeGenerationRecord({
    root,
    previous_generation_record_id: null,
    tx_intent: intent,
  });
  createOrVerifyFile(
    path.join(
      paths.generations,
      generationName(1),
    ),
    jsonBytes(generation),
  );
  fsyncDirectory(paths.generations);
  fsyncDirectory(paths.root);
  return readBuyVoidHistoryCarrierRootAuthoritySnapshotV1({
    authority_root: paths.root,
  });
}

export function initializeBuyVoidProductionHistoryCarrierRootAuthorityV1(input: {
  authority_root: string;
  genesis_root: BuyVoidHistoryCarrierRootV1;
  genesis_tx_intent: BuyVoidHistoryCarrierTxIntentV1;
  genesis_pages?: BuyVoidHistoryCarrierAuthorityPageV1[];
}): BuyVoidHistoryCarrierAuthoritySnapshotV1 {
  const root =
    verifyBuyVoidHistoryCarrierRootV1(
      input.genesis_root,
    );
  const intent =
    verifyBuyVoidHistoryCarrierTxIntentV1(
      input.genesis_tx_intent,
    );
  if (
    root.carrier_root_sha256 !==
      VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_PRODUCTION_GENESIS_ROOT_SHA256_V1 ||
    root.pool_id !==
      VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_PRODUCTION_POOL_ID_V1 ||
    intent.tx_intent_sha256 !==
      VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_PRODUCTION_GENESIS_TX_INTENT_SHA256_V1 ||
    intent.new_page_digests.length !== 1 ||
    intent.new_page_digests[0] !==
      VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_PRODUCTION_GENESIS_PAGE_SHA256_V1
  ) {
    fail(
      "PRODUCTION_GENESIS_NOT_ACCEPTED_ATTESTATION",
      root.carrier_root_sha256,
    );
  }
  return initializeAuthority({
    authority_root: input.authority_root,
    mode: "production",
    pool_id:
      VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_PRODUCTION_POOL_ID_V1,
    genesis_root: root,
    genesis_tx_intent: intent,
    genesis_pages: input.genesis_pages,
    production_attestation_id:
      VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_PRODUCTION_ATTESTATION_ID_V1,
  });
}

export function initializeBuyVoidHistoryCarrierRootAuthorityForProofV1(input: {
  authority_root: string;
  genesis_root: BuyVoidHistoryCarrierRootV1;
  genesis_tx_intent: BuyVoidHistoryCarrierTxIntentV1;
  genesis_pages: BuyVoidHistoryCarrierAuthorityPageV1[];
}): BuyVoidHistoryCarrierAuthoritySnapshotV1 {
  return initializeAuthority({
    authority_root: input.authority_root,
    mode: "proof_only",
    pool_id:
      verifyBuyVoidHistoryCarrierRootV1(
        input.genesis_root,
      ).pool_id,
    genesis_root: input.genesis_root,
    genesis_tx_intent: input.genesis_tx_intent,
    genesis_pages: input.genesis_pages,
    production_attestation_id: null,
  });
}

export function publishBuyVoidHistoryCarrierAuthorityPageV1(input: {
  authority_root: string;
  page: BuyVoidHistoryCarrierAuthorityPageV1;
}): { created: boolean; sha256: string } {
  const paths = layout(input.authority_root, false);
  readAuthorityRecord(paths.root);
  const digest = requireSha256(
    input.page.sha256,
    "PAGE_DIGEST_INVALID",
  );
  return {
    created:
      publishPageObject(
        paths.pages,
        input.page,
      ),
    sha256: digest,
  };
}

export function readBuyVoidHistoryCarrierRootAuthorityPageV1(input: {
  authority_root: string;
  sha256: string;
}): Buffer {
  const paths = layout(input.authority_root, false);
  readAuthorityRecord(paths.root);
  return readPageObject(paths.pages, input.sha256);
}

export function readBuyVoidHistoryCarrierRootAuthoritySnapshotV1(input: {
  authority_root: string;
}): BuyVoidHistoryCarrierAuthoritySnapshotV1 {
  const paths = layout(input.authority_root, false);
  const authority = readAuthorityRecord(paths.root);
  const entries = fs.readdirSync(paths.generations).sort();
  if (
    entries.length <= 0 ||
    entries.length >
      VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_MAX_GENERATIONS_V1 ||
    entries.some((name) => !GENERATION_NAME.test(name))
  ) {
    fail("GENERATION_NAMESPACE_INVALID", entries.join(","));
  }

  let previousRoot: BuyVoidHistoryCarrierRootV1 | null = null;
  let previousRecord: GenerationRecordV1 | null = null;
  let currentRoot: BuyVoidHistoryCarrierRootV1 | null = null;
  let currentRecord: GenerationRecordV1 | null = null;
  const referencedPages = new Set<string>();

  for (
    let generation = 1;
    generation <= entries.length;
    generation += 1
  ) {
    if (entries[generation - 1] !== generationName(generation)) {
      fail(
        "GENERATION_SEQUENCE_GAP",
        entries[generation - 1] || "missing",
      );
    }
    const record =
      readGenerationRecord(
        paths.generations,
        generation,
      );
    const root =
      readRootObject(
        paths.roots,
        record.carrier_root_sha256,
      );
    verifyBuyVoidHistoryCarrierTxIntentBindingV1(
      record.tx_intent,
      root,
    );
    if (
      root.carrier_generation !== generation ||
      root.carrier_root_sha256 !==
        record.carrier_root_sha256 ||
      root.previous_carrier_root_sha256 !==
        record.previous_carrier_root_sha256 ||
      root.payment_index_root_sha256 !==
        record.payment_index_root_sha256
    ) {
      fail(
        "GENERATION_ROOT_BINDING_MISMATCH",
        String(generation),
      );
    }

    if (generation === 1) {
      if (
        root.carrier_root_sha256 !==
          authority.genesis_root_sha256 ||
        root.pool_id !== authority.pool_id ||
        record.tx_intent.tx_intent_sha256 !==
          authority.genesis_tx_intent_sha256 ||
        record.previous_generation_record_id !== null
      ) {
        fail("GENESIS_AUTHORITY_MISMATCH", root.carrier_root_sha256);
      }
    } else {
      if (!previousRoot || !previousRecord) {
        fail("GENERATION_PREDECESSOR_MISSING", String(generation));
      }
      verifyBuyVoidHistoryCarrierSuccessorV1(
        previousRoot,
        root,
      );
      if (
        record.previous_generation_record_id !==
          previousRecord.generation_record_id
      ) {
        fail(
          "GENERATION_RECORD_CHAIN_MISMATCH",
          String(generation),
        );
      }
    }

    for (const digest of record.page_digests) {
      referencedPages.add(digest);
      if (
        referencedPages.size >
          VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_MAX_REFERENCED_PAGES_V1
      ) {
        fail(
          "REFERENCED_PAGE_BUDGET_EXCEEDED",
          String(referencedPages.size),
        );
      }
    }
    previousRoot = root;
    previousRecord = record;
    currentRoot = root;
    currentRecord = record;
  }

  if (!currentRoot || !currentRecord) {
    fail("CURRENT_ROOT_MISSING", paths.root);
  }

  const missing: string[] = [];
  for (const digest of [...referencedPages].sort()) {
    const file = path.join(paths.pages, digest + ".bin");
    if (!fs.existsSync(file)) {
      missing.push(digest);
      continue;
    }
    readPageObject(paths.pages, digest);
  }

  return {
    marker:
      VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_V1,
    version: 1,
    mode: authority.mode,
    authority_id: authority.authority_id,
    pool_id: authority.pool_id,
    carrier_generation:
      currentRoot.carrier_generation,
    current_carrier_root_sha256:
      currentRoot.carrier_root_sha256,
    current_payment_index_root_sha256:
      currentRoot.payment_index_root_sha256,
    current_generation_record_id:
      currentRecord.generation_record_id,
    current_root: currentRoot,
    page_publication_complete:
      missing.length === 0,
    missing_page_digests: missing,
    verified_generation_count:
      entries.length,
    verified_page_reference_count:
      referencedPages.size,
    runtime_activation_authorized: false,
    apply_activation_authorized: false,
    public_activation_authorized: false,
  };
}

export function publishBuyVoidHistoryCarrierRootSuccessorV1(input: {
  authority_root: string;
  expected_current_carrier_root_sha256: string;
  next_root: BuyVoidHistoryCarrierRootV1;
  tx_intent: BuyVoidHistoryCarrierTxIntentV1;
  new_pages: BuyVoidHistoryCarrierAuthorityPageV1[];
}): BuyVoidHistoryCarrierAuthorityPublishReceiptV1 {
  const paths = layout(input.authority_root, false);
  const before =
    readBuyVoidHistoryCarrierRootAuthoritySnapshotV1({
      authority_root: paths.root,
    });
  const expectedCurrent =
    requireSha256(
      input.expected_current_carrier_root_sha256,
      "EXPECTED_CURRENT_ROOT_INVALID",
    );
  const next =
    verifyBuyVoidHistoryCarrierRootV1(
      input.next_root,
    );
  const intent =
    verifyBuyVoidHistoryCarrierTxIntentV1(
      input.tx_intent,
    );
  verifyBuyVoidHistoryCarrierTxIntentBindingV1(
    intent,
    next,
  );

  const wantedDigests =
    [...intent.new_page_digests].sort();
  const supplied = input.new_pages.map((page) => ({
    sha256:
      requireSha256(
        page.sha256,
        "SUCCESSOR_PAGE_DIGEST_INVALID",
      ),
    bytes: Buffer.from(page.bytes),
  }));
  const suppliedDigests =
    supplied.map((page) => page.sha256).sort();
  if (
    canonicalJson(wantedDigests) !==
      canonicalJson(suppliedDigests)
  ) {
    fail(
      "SUCCESSOR_PAGE_SET_MISMATCH",
      intent.tx_intent_sha256,
    );
  }

  if (
    next.carrier_root_sha256 ===
      before.current_carrier_root_sha256
  ) {
    const committed =
      readGenerationRecord(
        paths.generations,
        before.carrier_generation,
      );
    if (
      committed.tx_intent.tx_intent_sha256 !==
        intent.tx_intent_sha256 ||
      committed.generation_record_id !==
        before.current_generation_record_id
    ) {
      fail(
        "DUPLICATE_SUCCESSOR_INTENT_MISMATCH",
        intent.tx_intent_sha256,
      );
    }
    if (!before.page_publication_complete) {
      fail(
        "DUPLICATE_SUCCESSOR_PAGE_PUBLICATION_UNRESOLVED",
        before.missing_page_digests.join(","),
      );
    }
    for (const page of supplied) {
      const existing =
        readPageObject(paths.pages, page.sha256);
      if (!existing.equals(page.bytes)) {
        fail(
          "DUPLICATE_SUCCESSOR_PAGE_BYTES_MISMATCH",
          page.sha256,
        );
      }
    }
    return {
      marker:
        VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_V1,
      version: 1,
      status: "duplicate",
      mutation_performed: false,
      carrier_generation:
        next.carrier_generation,
      carrier_root_sha256:
        next.carrier_root_sha256,
      generation_record_id:
        committed.generation_record_id,
      snapshot: before,
      runtime_activation_authorized: false,
      apply_activation_authorized: false,
      public_activation_authorized: false,
      service_action: false,
      transaction_broadcast: false,
      chain2050_write: false,
      funds_movement: false,
    };
  }

  if (
    before.current_carrier_root_sha256 !==
      expectedCurrent
  ) {
    fail(
      "CURRENT_ROOT_CHANGED",
      before.current_carrier_root_sha256 +
        ":" + expectedCurrent,
    );
  }
  if (!before.page_publication_complete) {
    fail(
      "PREDECESSOR_PAGE_PUBLICATION_UNRESOLVED",
      before.missing_page_digests.join(","),
    );
  }

  verifyBuyVoidHistoryCarrierSuccessorV1(
    before.current_root,
    next,
  );
  if (
    intent.predecessor_carrier_root_sha256 !==
      before.current_carrier_root_sha256
  ) {
    fail(
      "SUCCESSOR_INTENT_PREDECESSOR_MISMATCH",
      intent.tx_intent_sha256,
    );
  }

  let mutation = false;
  for (const page of supplied) {
    mutation =
      publishPageObject(paths.pages, page) ||
      mutation;
  }
  for (const digest of wantedDigests) {
    readPageObject(paths.pages, digest);
  }

  mutation =
    publishRootObject(paths.roots, next) ||
    mutation;

  const record =
    makeGenerationRecord({
      root: next,
      previous_generation_record_id:
        before.current_generation_record_id,
      tx_intent: intent,
    });
  const generationFile =
    path.join(
      paths.generations,
      generationName(next.carrier_generation),
    );
  const status =
    createOrVerifyFile(
      generationFile,
      jsonBytes(record),
    );
  mutation = status === "created" || mutation;
  fsyncDirectory(paths.generations);
  fsyncDirectory(paths.root);

  const after =
    readBuyVoidHistoryCarrierRootAuthoritySnapshotV1({
      authority_root: paths.root,
    });
  if (
    after.current_carrier_root_sha256 !==
      next.carrier_root_sha256 ||
    after.current_generation_record_id !==
      record.generation_record_id ||
    !after.page_publication_complete
  ) {
    fail(
      "SUCCESSOR_POST_COMMIT_REVALIDATION_FAILED",
      next.carrier_root_sha256,
    );
  }

  return {
    marker:
      VOID_BUY_VOID_HISTORY_CARRIER_ROOT_AUTHORITY_V1,
    version: 1,
    status:
      status === "created" ? "created" : "duplicate",
    mutation_performed: mutation,
    carrier_generation:
      next.carrier_generation,
    carrier_root_sha256:
      next.carrier_root_sha256,
    generation_record_id:
      record.generation_record_id,
    snapshot: after,
    runtime_activation_authorized: false,
    apply_activation_authorized: false,
    public_activation_authorized: false,
    service_action: false,
    transaction_broadcast: false,
    chain2050_write: false,
    funds_movement: false,
  };
}

export async function projectBuyVoidPaymentHistoryTerminalFromCarrierAuthorityV1(
  input: {
    authority_root: string;
    root_dir: string;
    request_dir: string;
    pool_id: string;
    payment_key_sha256: string;
  },
) {
  const snapshot =
    readBuyVoidHistoryCarrierRootAuthoritySnapshotV1({
      authority_root: input.authority_root,
    });
  if (snapshot.mode !== "production") {
    fail(
      "PROOF_AUTHORITY_HAS_NO_TERMINAL_MOUNT_AUTHORITY",
      snapshot.authority_id,
    );
  }
  if (!snapshot.page_publication_complete) {
    fail(
      "CURRENT_PAGE_PUBLICATION_UNRESOLVED",
      snapshot.missing_page_digests.join(","),
    );
  }
  if (snapshot.pool_id !== input.pool_id) {
    fail(
      "TERMINAL_POOL_MISMATCH",
      input.pool_id,
    );
  }
  return await projectBuyVoidPaymentHistoryTerminalFromServerPathsV1({
    root_dir: input.root_dir,
    request_dir: input.request_dir,
    pool_id: input.pool_id,
    payment_key_sha256:
      input.payment_key_sha256,
    carrier_root:
      snapshot.current_root,
    trusted_carrier_root_sha256:
      snapshot.current_carrier_root_sha256,
    read_page: (digest) =>
      readBuyVoidHistoryCarrierRootAuthorityPageV1({
        authority_root: input.authority_root,
        sha256: digest,
      }),
  });
}
