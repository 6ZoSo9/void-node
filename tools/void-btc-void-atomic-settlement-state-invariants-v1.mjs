#!/usr/bin/env node

import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const VOID_BTC_VOID_ATOMIC_SETTLEMENT_STATE_INVARIANTS_V1 =
  "VOID_BTC_VOID_ATOMIC_SETTLEMENT_STATE_INVARIANTS_V1";

export const BITCOIN_MAX_MONEY_SATOSHIS_V1 = "2100000000000000";
export const VOID_BTC_VOID_MAX_ATOMIC_VALUE_V1 =
  ((1n << 128n) - 1n).toString();

const TRACE_SCHEMA =
  "void.btc_void.atomic_settlement_trace.current_stack.v1";
const CONTRACT_SCHEMA =
  "void.btc_void.atomic_settlement_contract.current_stack.v1";
const EVENT_SCHEMA =
  "void.btc_void.atomic_settlement_event.current_stack.v1";
const TERMINAL_BINDING_SCHEMA =
  "void.btc_void.atomic_settlement_terminal_binding.current_stack.v1";
const EVALUATION_SCHEMA =
  "void.btc_void.atomic_settlement_evaluation.current_stack.v1";
const MARKET_POLICY_SCHEMA =
  "void.btc_void.current_market_policy_binding.v1";
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const HEX64 = /^[0-9a-f]{64}$/u;
const DECIMAL = /^(0|[1-9][0-9]*)$/u;
const MAX_EVENTS = 64;
const MAX_STDIN_BYTES = 1_048_576;
const MAX_CANONICAL_CANDIDATE_BYTES = 2 * 1024 * 1024;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOOL_REL =
  "tools/void-btc-void-atomic-settlement-state-invariants-v1.mjs";
const GIT = "/usr/bin/git";
const HEX40 = /^[0-9a-f]{40}$/u;
const REVIEWED_GIT_CONFIG_ARGS = Object.freeze([
  "-c", "core.hooksPath=/dev/null",
  "-c", "core.attributesFile=/dev/null",
  "-c", "core.fsmonitor=false",
  "-c", "core.untrackedCache=false",
  "-c", "core.preloadIndex=false",
  "-c", "submodule.recurse=false",
]);
const COUPLED_CANDIDATE_REL =
  "ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json";
const SHARED_MARKET_V2_REL =
  "tools/void-shared-market-post-discovery-state-v2.mjs";
const EXPECTED_COUPLED_CANDIDATE_GIT_BLOB_SHA1 =
  "d78bc88dd26c47921a54c081a79ceefc0d5abcee";
const EXPECTED_SHARED_MARKET_V2_GIT_BLOB_SHA1 =
  "bcfff9c2981e713a7053ff51a39145eb06b7238b";
const REVIEWED_EXECUTION_SOURCE_BLOBS = Object.freeze({
  "tools/void-btc-void-quote-math-v1.mjs":
    "02be3da1718209db1603094c9654c7dc9d697c51",
  "tools/void-btc-void-market-maker-reserve-policy-v1.mjs":
    "937e1b38cab34b36297f4320cc253a8e48f5a7e1",
  "tools/void-btc-void-buyback-lot-journal-transition-v1.mjs":
    "63d347948f3dd0bded2f2f79fadafec8f0cf7838",
  "tools/void-btc-void-bounded-stdin-v1.mjs":
    "2026b9be59216b0c52cf4d978b7fc91b7f7592e1",
});
const REVIEWED_SOURCE_BLOBS = Object.freeze({
  ...REVIEWED_EXECUTION_SOURCE_BLOBS,
  [SHARED_MARKET_V2_REL]: EXPECTED_SHARED_MARKET_V2_GIT_BLOB_SHA1,
  [COUPLED_CANDIDATE_REL]: EXPECTED_COUPLED_CANDIDATE_GIT_BLOB_SHA1,
});

const EXPECTED_SHARED_MARKET_V2_MARKER =
  "VOID_SHARED_MARKET_POST_DISCOVERY_STATE_V2";
const EXPECTED_SHARED_MARKET_V2_SCHEMA =
  "void.shared-market-post-discovery-state.v2";
const EXPECTED_SHARED_MARKET_V2_PROFILE =
  "canonical_source_model_fixture_v2";
const EXPECTED_SHARED_MARKET_V2_RECONCILIATION_ID =
  "sha256:522ff84c2fff69ef477085a253b666cb450a8dbd89d372633fdfe883e58851ba";
const CANONICAL_VOID_TOKEN =
  "0x470075b85352eb86f7d089fb9ba88945f12aad94";
const TEN_MILLION_VOID_ATOMS = "10000000000000000000000000";
const TWENTY_MILLION_VOID_ATOMS = "20000000000000000000000000";
const TWENTY_FIVE_MILLION_VOID_ATOMS = "25000000000000000000000000";
const THIRTY_MILLION_VOID_ATOMS = "30000000000000000000000000";

const TERMINAL_PHASES = new Set([
  "SETTLED",
  "EXPIRED",
  "REFUNDED",
  "HELD",
  "CANCELLED_BEFORE_FUNDING",
]);

const EVENT_TYPES = new Set([
  "BIND_HASHLOCK",
  "EXPIRE_RESERVATION",
  "CANCEL_BEFORE_FUNDING",
  "HOLD",
  "OBSERVE_SOURCE_FUNDING",
  "CONFIRM_SOURCE_FUNDING",
  "OBSERVE_SOURCE_REFUND",
  "OBSERVE_COUNTERPARTY_LOCK",
  "OBSERVE_COUNTERPARTY_REFUND",
  "OBSERVE_PREIMAGE_REVEAL",
  "OBSERVE_BOTH_CLAIMS",
  "FINALIZE_SETTLEMENT",
]);

const TRANSITIONS = Object.freeze({
  RESERVED: Object.freeze({
    BIND_HASHLOCK: "HASH_BOUND",
    EXPIRE_RESERVATION: "EXPIRED",
    CANCEL_BEFORE_FUNDING: "CANCELLED_BEFORE_FUNDING",
    HOLD: "HELD",
  }),
  HASH_BOUND: Object.freeze({
    OBSERVE_SOURCE_FUNDING: "SOURCE_FUNDED",
    EXPIRE_RESERVATION: "EXPIRED",
    CANCEL_BEFORE_FUNDING: "CANCELLED_BEFORE_FUNDING",
    HOLD: "HELD",
  }),
  SOURCE_FUNDED: Object.freeze({
    CONFIRM_SOURCE_FUNDING: "SOURCE_CONFIRMED",
    OBSERVE_SOURCE_REFUND: "REFUNDED",
    HOLD: "HELD",
  }),
  SOURCE_CONFIRMED: Object.freeze({
    OBSERVE_COUNTERPARTY_LOCK: "COUNTERPARTY_LOCKED",
    OBSERVE_SOURCE_REFUND: "REFUNDED",
    HOLD: "HELD",
  }),
  COUNTERPARTY_LOCKED: Object.freeze({
    OBSERVE_PREIMAGE_REVEAL: "PREIMAGE_REVEALED",
    OBSERVE_COUNTERPARTY_REFUND: "REFUND_PENDING_SOURCE",
    HOLD: "HELD",
  }),
  REFUND_PENDING_SOURCE: Object.freeze({
    OBSERVE_SOURCE_REFUND: "REFUNDED",
    HOLD: "HELD",
  }),
  PREIMAGE_REVEALED: Object.freeze({
    OBSERVE_BOTH_CLAIMS: "BOTH_CLAIMS_OBSERVED",
    HOLD: "HELD",
  }),
  BOTH_CLAIMS_OBSERVED: Object.freeze({
    FINALIZE_SETTLEMENT: "SETTLED",
    HOLD: "HELD",
  }),
});

function fail(message) {
  throw new Error(message);
}

function plainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be an object`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail(`${label} must be a plain object`);
  }
  return value;
}

function exactKeys(value, keys, label) {
  const object = plainObject(value, label);
  const actual = Object.keys(object).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(`${label} keys mismatch`);
  }
  return object;
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) fail("canonical JSON requires safe integers");
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  fail("canonical JSON value is unsupported");
}

function contentId(value) {
  return `sha256:${crypto
    .createHash("sha256")
    .update(canonicalJson(value))
    .digest("hex")}`;
}

function sha256Id(value, label) {
  if (typeof value !== "string" || !SHA256_ID.test(value)) {
    fail(`${label} must be a canonical sha256 identity`);
  }
  return value;
}

function positiveDecimal(value, label, maximum) {
  if (typeof value !== "string" || !DECIMAL.test(value) || value === "0") {
    fail(`${label} must be a positive canonical decimal string`);
  }
  const parsed = BigInt(value);
  if (parsed > maximum) fail(`${label} exceeds the v1 maximum`);
  return parsed;
}

function gitBlobSha1(bytes) {
  if (!Buffer.isBuffer(bytes)) fail("canonical candidate bytes required");
  const header = Buffer.from(`blob ${bytes.length}\0`, "utf8");
  return crypto.createHash("sha1").update(header).update(bytes).digest("hex");
}

function sha256Bytes(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function inspectedGitExecutableV1() {
  let canonicalPath;
  let stat;
  let bytes;
  try {
    canonicalPath = fs.realpathSync(GIT);
    stat = fs.statSync(canonicalPath);
    bytes = fs.readFileSync(canonicalPath);
  } catch {
    fail("reviewed git executable unavailable");
  }
  if (
    !path.isAbsolute(canonicalPath)
    || !stat.isFile()
    || (stat.mode & 0o111) === 0
  ) {
    fail("reviewed git executable invalid");
  }
  return Object.freeze({
    path: canonicalPath,
    sha256: sha256Bytes(bytes),
    identity: [
      canonicalPath,
      String(stat.dev),
      String(stat.ino),
      String(stat.size),
      String(stat.mode & 0o7777),
    ].join("\0"),
  });
}

function sameGitExecutableV1(left, right) {
  return (
    left.path === right.path
    && left.sha256 === right.sha256
    && left.identity === right.identity
  );
}

function sanitizedGitEnvV1() {
  return {
    PATH: "/usr/bin:/bin",
    HOME: "/nonexistent",
    XDG_CONFIG_HOME: "/nonexistent",
    LANG: "C",
    LC_ALL: "C",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_SYSTEM: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_ATTR_NOSYSTEM: "1",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_NO_LAZY_FETCH: "1",
    GIT_TERMINAL_PROMPT: "0",
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_ASKPASS: "/bin/false",
  };
}

function gitRunV1(args, { encoding = "utf8", allowFail = false } = {}) {
  const result = spawnSync(
    GIT,
    ["--no-replace-objects", ...REVIEWED_GIT_CONFIG_ARGS, "-C", ROOT, ...args],
    {
      encoding,
      stdio: ["ignore", "pipe", "pipe"],
      env: sanitizedGitEnvV1(),
      maxBuffer: 32 * 1024 * 1024,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0 && !allowFail) {
    fail("reviewed git read failed:" + args.join("_"));
  }
  return result;
}

function gitTextV1(args, label, { allowEmpty = false } = {}) {
  const text = String(gitRunV1(args).stdout || "").trim();
  if (!allowEmpty && !text) fail(label);
  return text;
}

function gitObjectBytesV1(head, relativePath, expectedBlob) {
  const result = gitRunV1(
    ["show", head + ":" + relativePath],
    { encoding: null },
  );
  const bytes = Buffer.from(result.stdout || Buffer.alloc(0));
  if (
    bytes.length < 1
    || gitBlobSha1(bytes) !== expectedBlob
  ) {
    fail("reviewed git object source mismatch:" + relativePath);
  }
  return bytes;
}

function worktreeBytesV1(relativePath, expectedBlob) {
  const file = path.resolve(ROOT, relativePath);
  const relative = path.relative(ROOT, file);
  if (
    relative === ""
    || relative === ".."
    || relative.startsWith(".." + path.sep)
    || path.isAbsolute(relative)
  ) {
    fail("reviewed source path escape:" + relativePath);
  }
  let stat;
  let bytes;
  try {
    stat = fs.lstatSync(file);
    bytes = fs.readFileSync(file);
  } catch {
    fail("reviewed worktree source unavailable:" + relativePath);
  }
  if (
    stat.isSymbolicLink()
    || !stat.isFile()
    || bytes.length < 1
    || bytes.length > 16 * 1024 * 1024
    || gitBlobSha1(bytes) !== expectedBlob
  ) {
    fail("reviewed worktree source mismatch:" + relativePath);
  }
  return bytes;
}

function bindReviewedSourceGenerationV1() {
  const gitBefore = inspectedGitExecutableV1();
  const status = gitTextV1(
    ["status", "--porcelain=v1", "--untracked-files=all"],
    "reviewed repository status unavailable",
    { allowEmpty: true },
  );
  if (status !== "") fail("reviewed source repository must be clean");

  const head = gitTextV1(["rev-parse", "HEAD"], "reviewed HEAD unavailable");
  const tree = gitTextV1(
    ["rev-parse", "HEAD^{tree}"],
    "reviewed tree unavailable",
  );
  if (!HEX40.test(head) || !HEX40.test(tree)) {
    fail("reviewed source repository identity invalid");
  }

  const sourceBlobs = Object.create(null);
  const sourceSha256 = Object.create(null);
  const sourceBytes = new Map();
  for (const [relativePath, expectedBlob] of
    Object.entries(REVIEWED_SOURCE_BLOBS)) {
    const objectBytes = gitObjectBytesV1(head, relativePath, expectedBlob);
    const fileBytes = worktreeBytesV1(relativePath, expectedBlob);
    if (!objectBytes.equals(fileBytes)) {
      fail("reviewed HEAD/worktree bytes mismatch:" + relativePath);
    }
    sourceBlobs[relativePath] = expectedBlob;
    sourceSha256[relativePath] = sha256Bytes(objectBytes);
    sourceBytes.set(relativePath, objectBytes);
  }

  const toolBlob = gitTextV1(
    ["rev-parse", head + ":" + TOOL_REL],
    "settlement tool HEAD blob unavailable",
  );
  if (!HEX40.test(toolBlob)) fail("settlement tool HEAD blob invalid");
  worktreeBytesV1(TOOL_REL, toolBlob);

  const statusAfter = gitTextV1(
    ["status", "--porcelain=v1", "--untracked-files=all"],
    "reviewed repository status recheck unavailable",
    { allowEmpty: true },
  );
  const headAfter = gitTextV1(
    ["rev-parse", "HEAD"],
    "reviewed HEAD recheck unavailable",
  );
  const treeAfter = gitTextV1(
    ["rev-parse", "HEAD^{tree}"],
    "reviewed tree recheck unavailable",
  );
  const gitAfter = inspectedGitExecutableV1();
  if (
    statusAfter !== ""
    || headAfter !== head
    || treeAfter !== tree
    || !sameGitExecutableV1(gitBefore, gitAfter)
  ) {
    fail("reviewed source generation changed during binding");
  }

  return Object.freeze({
    head,
    tree,
    tool_blob_sha1: toolBlob,
    source_blobs: Object.freeze({ ...sourceBlobs }),
    source_sha256: Object.freeze({ ...sourceSha256 }),
    source_bytes: sourceBytes,
    git_executable_sha256: gitBefore.sha256,
  });
}

function materializeReviewedExecutionBundleV1(source) {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-btc-void-atomic-reviewed-"),
  );
  fs.chmodSync(root, 0o700);
  const written = [];
  try {
    for (const [relativePath, expectedBlob] of
      Object.entries(REVIEWED_EXECUTION_SOURCE_BLOBS)) {
      const bytes = source.source_bytes.get(relativePath);
      if (!Buffer.isBuffer(bytes) || gitBlobSha1(bytes) !== expectedBlob) {
        fail("reviewed execution bytes unavailable:" + relativePath);
      }
      const destination = path.join(root, relativePath);
      fs.mkdirSync(path.dirname(destination), {
        recursive: true,
        mode: 0o700,
      });
      fs.writeFileSync(destination, bytes, {
        flag: "wx",
        mode: 0o400,
      });
      const verify = fs.readFileSync(destination);
      if (
        gitBlobSha1(verify) !== expectedBlob
        || sha256Bytes(verify) !== sha256Bytes(bytes)
      ) {
        fail("reviewed execution bundle write mismatch:" + relativePath);
      }
      written.push(relativePath);
    }
    const directories = new Set([root]);
    for (const relativePath of written) {
      let dir = path.dirname(path.join(root, relativePath));
      while (dir.startsWith(root) && dir !== root) {
        directories.add(dir);
        dir = path.dirname(dir);
      }
    }
    for (const dir of [...directories].sort((a, b) => b.length - a.length)) {
      fs.chmodSync(dir, 0o500);
    }
    return Object.freeze({ root });
  } catch (error) {
    try {
      for (const candidate of [root, path.join(root, "tools")]) {
        if (fs.existsSync(candidate)) fs.chmodSync(candidate, 0o700);
      }
      fs.rmSync(root, { recursive: true, force: true });
    } catch {
      // Best-effort cleanup only.
    }
    throw error;
  }
}

function cleanupReviewedExecutionBundleV1(bundle) {
  if (!bundle?.root) return;
  const directories = [];
  const stack = [bundle.root];
  while (stack.length) {
    const dir = stack.pop();
    directories.push(dir);
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) stack.push(path.join(dir, entry.name));
    }
  }
  for (const dir of directories.sort((a, b) => a.length - b.length)) {
    try {
      fs.chmodSync(dir, 0o700);
    } catch {
      // Best-effort cleanup only.
    }
  }
  fs.rmSync(bundle.root, { recursive: true, force: true });
}

async function loadReviewedExecutionModulesV1(source) {
  const bundle = materializeReviewedExecutionBundleV1(source);
  try {
    const quoteModule = await import(
      pathToFileURL(
        path.join(bundle.root, "tools/void-btc-void-quote-math-v1.mjs"),
      ).href,
    );
    const reserveModule = await import(
      pathToFileURL(
        path.join(
          bundle.root,
          "tools/void-btc-void-market-maker-reserve-policy-v1.mjs",
        ),
      ).href,
    );
    const journalModule = await import(
      pathToFileURL(
        path.join(
          bundle.root,
          "tools/void-btc-void-buyback-lot-journal-transition-v1.mjs",
        ),
      ).href,
    );
    const stdinModule = await import(
      pathToFileURL(
        path.join(bundle.root, "tools/void-btc-void-bounded-stdin-v1.mjs"),
      ).href,
    );
    if (
      typeof quoteModule.quoteBtcVoidV1 !== "function"
      || typeof reserveModule.deriveBtcVoidBuybackLotV1 !== "function"
      || typeof journalModule.evaluateBtcVoidBuybackLotJournalTransitionV1
        !== "function"
      || typeof stdinModule.readBtcVoidBoundedStdinV1 !== "function"
    ) {
      fail("reviewed execution module exports invalid");
    }
    return Object.freeze({
      quoteBtcVoidV1: quoteModule.quoteBtcVoidV1,
      deriveBtcVoidBuybackLotV1:
        reserveModule.deriveBtcVoidBuybackLotV1,
      evaluateBtcVoidBuybackLotJournalTransitionV1:
        journalModule.evaluateBtcVoidBuybackLotJournalTransitionV1,
      readBtcVoidBoundedStdinV1: stdinModule.readBtcVoidBoundedStdinV1,
    });
  } finally {
    cleanupReviewedExecutionBundleV1(bundle);
  }
}

const REVIEWED_SOURCE_GENERATION = bindReviewedSourceGenerationV1();
const REVIEWED_EXECUTION = await loadReviewedExecutionModulesV1(
  REVIEWED_SOURCE_GENERATION,
);
const {
  quoteBtcVoidV1,
  deriveBtcVoidBuybackLotV1,
  evaluateBtcVoidBuybackLotJournalTransitionV1,
  readBtcVoidBoundedStdinV1,
} = REVIEWED_EXECUTION;

function readCanonicalSharedMarketV2Binding() {
  const sharedSource =
    REVIEWED_SOURCE_GENERATION.source_bytes.get(SHARED_MARKET_V2_REL);
  if (
    !Buffer.isBuffer(sharedSource)
    || gitBlobSha1(sharedSource) !== EXPECTED_SHARED_MARKET_V2_GIT_BLOB_SHA1
  ) {
    fail("shared-market v2 source generation mismatch");
  }
  const bytes =
    REVIEWED_SOURCE_GENERATION.source_bytes.get(COUPLED_CANDIDATE_REL);
  if (
    !Buffer.isBuffer(bytes) ||
    bytes.length < 2 ||
    bytes.length > MAX_CANONICAL_CANDIDATE_BYTES ||
    gitBlobSha1(bytes) !== EXPECTED_COUPLED_CANDIDATE_GIT_BLOB_SHA1
  ) {
    fail("canonical coupled candidate source generation mismatch");
  }

  let candidate;
  try {
    candidate = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    fail("canonical coupled candidate JSON invalid");
  }
  const shared = candidate?.shared_post_discovery_reconciliation;
  if (
    candidate?.marker !== "VOID_COUPLED_ECONOMIC_SUCCESSOR_GATE_V1" ||
    candidate?.version !== 1 ||
    shared?.profile !== "canonical_source_model_fixture_v2" ||
    shared?.source_model_fixture !== true ||
    shared?.runtime_or_launch_evidence !== false ||
    shared?.marker !== EXPECTED_SHARED_MARKET_V2_MARKER ||
    shared?.schema !== EXPECTED_SHARED_MARKET_V2_SCHEMA ||
    shared?.profile !== EXPECTED_SHARED_MARKET_V2_PROFILE ||
    shared?.reconciliation_id !==
      EXPECTED_SHARED_MARKET_V2_RECONCILIATION_ID ||
    shared?.chain_id !== 2050 ||
    shared?.network_identity !== "mainnet0" ||
    shared?.execution_epoch !== 2 ||
    shared?.void_token !== CANONICAL_VOID_TOKEN ||
    shared?.void_token_decimals !== 18 ||
    shared?.btc_void_phase !== "post_presale_unopened" ||
    shared?.btc_void_remains_post_presale !== true ||
    shared?.shared_post_discovery_model_reconciled !== true ||
    shared?.legacy_v1_six_decimal_void_atoms_authoritative !== false ||
    shared?.all_markets_share_one_presale_closeout !== false ||
    shared?.total_planned_void_inventory_atoms !== THIRTY_MILLION_VOID_ATOMS ||
    shared?.unopened_post_presale_planned_void_inventory_atoms !==
      TWENTY_MILLION_VOID_ATOMS ||
    shared?.modeled_protocol_side_void_after_wc_opening_before_post_presale_markets_atoms !==
      TWENTY_FIVE_MILLION_VOID_ATOMS ||
    shared?.quote_reserve_custody_verified !== false ||
    shared?.void_reserve_custody_verified !== false ||
    shared?.market_activation_authority !== false ||
    shared?.public_presale_activation_authority !== false ||
    shared?.inventory_funding_authority !== false ||
    shared?.funds_movement_authority !== false
  ) {
    fail("canonical shared-market v2 BTC_VOID policy mismatch");
  }
  sha256Id(shared.reconciliation_id, "shared reconciliation_id");

  return Object.freeze({
    source_path: COUPLED_CANDIDATE_REL,
    source_git_blob_sha1: EXPECTED_COUPLED_CANDIDATE_GIT_BLOB_SHA1,
    profile: shared.profile,
    reconciliation_id: shared.reconciliation_id,
    marker: shared.marker,
    schema: shared.schema,
    chain_id: shared.chain_id,
    network_identity: shared.network_identity,
    execution_epoch: shared.execution_epoch,
    void_token: shared.void_token,
    void_token_decimals: shared.void_token_decimals,
    btc_void_phase: shared.btc_void_phase,
    btc_void_remains_post_presale: shared.btc_void_remains_post_presale,
    total_planned_void_inventory_atoms:
      shared.total_planned_void_inventory_atoms,
    unopened_post_presale_planned_void_inventory_atoms:
      shared.unopened_post_presale_planned_void_inventory_atoms,
    modeled_protocol_side_void_after_wc_opening_before_post_presale_markets_atoms:
      shared.modeled_protocol_side_void_after_wc_opening_before_post_presale_markets_atoms,
    quote_reserve_custody_verified: shared.quote_reserve_custody_verified,
    void_reserve_custody_verified: shared.void_reserve_custody_verified,
    inventory_funding_authority: shared.inventory_funding_authority,
    market_activation_authority: shared.market_activation_authority,
    public_presale_activation_authority:
      shared.public_presale_activation_authority,
    funds_movement_authority: shared.funds_movement_authority,
  });
}

function currentMarketPolicyPayload() {
  const shared = readCanonicalSharedMarketV2Binding();
  return {
    schema: MARKET_POLICY_SCHEMA,
    pair: "BTC_VOID",
    shared_market_marker: shared.marker,
    shared_market_schema: shared.schema,
    shared_market_profile: shared.profile,
    shared_market_source_path: shared.source_path,
    shared_market_source_git_blob_sha1: shared.source_git_blob_sha1,
    shared_market_v2_source_path: SHARED_MARKET_V2_REL,
    shared_market_v2_source_git_blob_sha1:
      EXPECTED_SHARED_MARKET_V2_GIT_BLOB_SHA1,
    shared_market_reconciliation_id: shared.reconciliation_id,
    chain_id: shared.chain_id,
    network_identity: shared.network_identity,
    execution_epoch: shared.execution_epoch,
    void_token: shared.void_token,
    void_token_decimals: shared.void_token_decimals,
    btc_void_phase: shared.btc_void_phase,
    btc_void_remains_post_presale: shared.btc_void_remains_post_presale,
    quote_asset: "BTC",
    base_asset: "VOID",
    settlement_source_domain: "bitcoin-mainnet",
    quote_asset_form: "native",
    quote_unit: "satoshi",
    quote_decimals: 8,
    protocol_quote_seed_units: "0",
    planned_btc_void_inventory_atoms: TEN_MILLION_VOID_ATOMS,
    unopened_post_presale_planned_void_inventory_atoms:
      shared.unopened_post_presale_planned_void_inventory_atoms,
    quote_reserve_custody_verified: shared.quote_reserve_custody_verified,
    void_reserve_custody_verified: shared.void_reserve_custody_verified,
    inventory_funding_authority: shared.inventory_funding_authority,
    market_activation_authority: shared.market_activation_authority,
    public_presale_activation_authority:
      shared.public_presale_activation_authority,
    funds_movement_authority: shared.funds_movement_authority,
    legacy_v1_shared_market_production_authority: false,
    wc_void_fixed_redemption_claim_created: false,
    wc_void_pricing_remains_market_determined: true,
  };
}

export function currentBtcVoidMarketPolicyBindingV1() {
  const payload = currentMarketPolicyPayload();
  return deepFreeze({
    ...payload,
    market_policy_id: contentId(payload),
  });
}

function validateContract(raw) {
  const contract = exactKeys(
    structuredClone(raw),
    [
      "schema",
      "pair",
      "direction",
      "market_policy_id",
      "quote_request",
      "indicative_quote_id",
      "bitcoin_amount_satoshis",
      "void_amount_atomic",
      "hashlock_sha256",
      "bitcoin_refund_horizon_seconds",
      "void_refund_horizon_seconds",
      "minimum_refund_safety_margin_seconds",
      "contract_id",
    ],
    "contract",
  );
  if (contract.schema !== CONTRACT_SCHEMA) fail("contract schema mismatch");
  if (contract.pair !== "BTC_VOID") fail("official pair must be BTC_VOID");
  if (!["btc_to_void", "void_to_btc"].includes(contract.direction)) {
    fail("contract direction mismatch");
  }

  const marketPolicy = currentBtcVoidMarketPolicyBindingV1();
  if (contract.market_policy_id !== marketPolicy.market_policy_id) {
    fail("contract market_policy_id does not match current shared market policy");
  }

  const quote = quoteBtcVoidV1(contract.quote_request);
  if (contract.indicative_quote_id !== quote.indicative_quote_id) {
    fail("contract indicative_quote_id does not match current quote derivation");
  }
  if (quote.request.direction !== contract.direction) {
    fail("contract direction does not match current quote direction");
  }
  if (
    quote.authority?.indicative_only !== true
    || quote.authority?.execution_authorized !== false
    || quote.authority?.transaction_broadcast !== false
  ) {
    fail("current quote authority boundary mismatch");
  }

  const bitcoinAmount = positiveDecimal(
    contract.bitcoin_amount_satoshis,
    "contract.bitcoin_amount_satoshis",
    BigInt(BITCOIN_MAX_MONEY_SATOSHIS_V1),
  );
  const voidAmount = positiveDecimal(
    contract.void_amount_atomic,
    "contract.void_amount_atomic",
    BigInt(VOID_BTC_VOID_MAX_ATOMIC_VALUE_V1),
  );
  const expectedBitcoin =
    contract.direction === "btc_to_void"
      ? quote.request.amount_in
      : quote.result.amount_out;
  const expectedVoid =
    contract.direction === "btc_to_void"
      ? quote.result.amount_out
      : quote.request.amount_in;
  if (bitcoinAmount.toString() !== expectedBitcoin) {
    fail("contract Bitcoin amount does not match current quote");
  }
  if (voidAmount.toString() !== expectedVoid) {
    fail("contract VOID amount does not match current quote");
  }

  if (
    typeof contract.hashlock_sha256 !== "string"
    || !HEX64.test(contract.hashlock_sha256)
  ) {
    fail("contract.hashlock_sha256 must be lowercase hex64");
  }
  const btcHorizon = positiveDecimal(
    contract.bitcoin_refund_horizon_seconds,
    "contract.bitcoin_refund_horizon_seconds",
    (1n << 63n) - 1n,
  );
  const voidHorizon = positiveDecimal(
    contract.void_refund_horizon_seconds,
    "contract.void_refund_horizon_seconds",
    (1n << 63n) - 1n,
  );
  const margin = positiveDecimal(
    contract.minimum_refund_safety_margin_seconds,
    "contract.minimum_refund_safety_margin_seconds",
    (1n << 63n) - 1n,
  );
  if (
    contract.direction === "btc_to_void"
    && btcHorizon < voidHorizon + margin
  ) {
    fail("btc_to_void requires the Bitcoin refund horizon to be safely longer");
  }
  if (
    contract.direction === "void_to_btc"
    && voidHorizon < btcHorizon + margin
  ) {
    fail("void_to_btc requires the VOID refund horizon to be safely longer");
  }

  const { contract_id: suppliedId, ...payload } = contract;
  if (suppliedId !== contentId(payload)) fail("contract_id content mismatch");
  return { contract, quote, marketPolicy };
}

function validateEvent(raw, index, contract) {
  const label = `events[${index}]`;
  const event = exactKeys(
    structuredClone(raw),
    [
      "schema",
      "contract_id",
      "event_type",
      "from_phase",
      "to_phase",
      "refund_asset_role",
      "evidence_id",
      "event_id",
    ],
    label,
  );
  if (event.schema !== EVENT_SCHEMA) fail(`${label}.schema mismatch`);
  if (event.contract_id !== contract.contract_id) {
    fail(`${label}.contract_id mismatch`);
  }
  if (typeof event.event_type !== "string" || !EVENT_TYPES.has(event.event_type)) {
    fail(`${label}.event_type must be a supported v1 event name`);
  }

  const sourceRefundRole =
    contract.direction === "btc_to_void"
      ? "SOURCE_NATIVE_BTC"
      : "SOURCE_NATIVE_VOID";
  const counterpartyRefundRole =
    contract.direction === "btc_to_void"
      ? "COUNTERPARTY_NATIVE_VOID"
      : "COUNTERPARTY_NATIVE_BTC";
  const expectedRefundRole =
    event.event_type === "OBSERVE_SOURCE_REFUND"
      ? sourceRefundRole
      : event.event_type === "OBSERVE_COUNTERPARTY_REFUND"
        ? counterpartyRefundRole
        : "NOT_A_REFUND";
  if (event.refund_asset_role !== expectedRefundRole) {
    fail(`${label}.refund_asset_role mismatch`);
  }

  sha256Id(event.evidence_id, `${label}.evidence_id`);
  const { event_id: suppliedId, ...payload } = event;
  if (suppliedId !== contentId(payload)) {
    fail(`${label}.event_id content mismatch`);
  }
  return event;
}

function validateTerminalBinding(raw, contract) {
  if (raw === null) return null;
  const binding = exactKeys(
    structuredClone(raw),
    [
      "schema",
      "reserve_recycling_request",
      "journal_entries",
      "expected_buyback_lot_plan_id",
      "expected_journal_decision_id",
      "binding_id",
    ],
    "terminal_binding",
  );
  if (binding.schema !== TERMINAL_BINDING_SCHEMA) {
    fail("terminal_binding schema mismatch");
  }
  sha256Id(
    binding.expected_buyback_lot_plan_id,
    "terminal_binding.expected_buyback_lot_plan_id",
  );
  sha256Id(
    binding.expected_journal_decision_id,
    "terminal_binding.expected_journal_decision_id",
  );
  if (!Array.isArray(binding.journal_entries)) {
    fail("terminal_binding.journal_entries must be an array");
  }

  const plan = deriveBtcVoidBuybackLotV1(binding.reserve_recycling_request);
  if (
    plan.buyback_lot_plan_id !== binding.expected_buyback_lot_plan_id
  ) {
    fail("terminal_binding buyback lot plan identity mismatch");
  }
  const settlement = plan.source.settlement;
  if (settlement.direction !== "btc_to_void" || settlement.status !== "settled") {
    fail("terminal_binding must describe a settled BTC-to-VOID sale");
  }
  if (settlement.btc_received_sats !== contract.bitcoin_amount_satoshis) {
    fail("terminal_binding BTC amount does not match settlement contract");
  }
  if (settlement.void_sold_atomic !== contract.void_amount_atomic) {
    fail("terminal_binding VOID amount does not match settlement contract");
  }

  const journalDecision =
    evaluateBtcVoidBuybackLotJournalTransitionV1({
      schema: "void.btc_void.buyback_lot_journal_transition_request.v1",
      journal_entries: binding.journal_entries,
      candidate_plan: plan,
    });
  if (journalDecision.decision_id !== binding.expected_journal_decision_id) {
    fail("terminal_binding journal decision identity mismatch");
  }
  if (!["CREATE", "IDEMPOTENT"].includes(journalDecision.status)) {
    fail("terminal_binding current buyback journal requires HOLD");
  }

  const { binding_id: suppliedId, ...payload } = binding;
  if (suppliedId !== contentId(payload)) {
    fail("terminal_binding binding_id content mismatch");
  }
  return { binding, plan, journalDecision };
}

export function evaluateBtcVoidAtomicSettlementTraceV1(raw) {
  const request = exactKeys(
    structuredClone(raw),
    ["schema", "contract", "initial_phase", "events", "terminal_binding"],
    "trace",
  );
  if (request.schema !== TRACE_SCHEMA) fail("trace schema mismatch");
  if (request.initial_phase !== "RESERVED") {
    fail("trace must start at RESERVED");
  }
  if (!Array.isArray(request.events)) fail("events must be an array");
  if (request.events.length > MAX_EVENTS) fail("events exceeds the v1 limit");

  const { contract, quote, marketPolicy } = validateContract(request.contract);
  const events = request.events.map((event, index) =>
    validateEvent(event, index, contract),
  );

  let phase = request.initial_phase;
  const appliedEventIds = [];
  const seenEvents = new Map();
  const evidenceOwners = new Map();
  let lastAppliedEvent = null;

  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    const prior = seenEvents.get(event.event_id);
    if (prior) {
      if (canonicalJson(prior) !== canonicalJson(event)) {
        fail(`events[${index}] reuses an event_id with changed content`);
      }
      continue;
    }
    if (evidenceOwners.has(event.evidence_id)) {
      fail(`events[${index}] reuses evidence_id from a different event`);
    }
    if (TERMINAL_PHASES.has(phase)) {
      fail(`events[${index}] attempts to reopen terminal phase ${phase}`);
    }
    if (event.from_phase !== phase) {
      fail(`events[${index}].from_phase does not match current phase`);
    }
    const expected = TRANSITIONS[phase]?.[event.event_type];
    if (!expected || expected !== event.to_phase) {
      fail(`events[${index}] transition is not allowed`);
    }
    seenEvents.set(event.event_id, event);
    evidenceOwners.set(event.evidence_id, event.event_id);
    appliedEventIds.push(event.event_id);
    lastAppliedEvent = event;
    phase = event.to_phase;
  }

  let terminal = null;
  if (phase === "SETTLED" && contract.direction === "btc_to_void") {
    terminal = validateTerminalBinding(request.terminal_binding, contract);
    if (!terminal) {
      fail("settled btc_to_void trace requires terminal_binding");
    }
    if (
      lastAppliedEvent?.event_type !== "FINALIZE_SETTLEMENT"
      || lastAppliedEvent.evidence_id
        !== terminal.plan.source.settlement.source_sale_id
    ) {
      fail("FINALIZE_SETTLEMENT evidence must bind the current source_sale_id");
    }
  } else if (request.terminal_binding !== null) {
    fail("terminal_binding is allowed only for settled btc_to_void traces");
  }

  const evaluation = {
    schema: EVALUATION_SCHEMA,
    marker: VOID_BTC_VOID_ATOMIC_SETTLEMENT_STATE_INVARIANTS_V1,
    contract_id: contract.contract_id,
    direction: contract.direction,
    indicative_quote_id: quote.indicative_quote_id,
    market_policy_id: marketPolicy.market_policy_id,
    final_phase: phase,
    terminal: TERMINAL_PHASES.has(phase),
    applied_event_ids: appliedEventIds,
    execution_source_binding: {
      source_head_sha: REVIEWED_SOURCE_GENERATION.head,
      source_tree_sha: REVIEWED_SOURCE_GENERATION.tree,
      settlement_tool_git_blob_sha1:
        REVIEWED_SOURCE_GENERATION.tool_blob_sha1,
      git_executable_sha256:
        REVIEWED_SOURCE_GENERATION.git_executable_sha256,
      dependency_git_blobs: {
        ...REVIEWED_SOURCE_GENERATION.source_blobs,
      },
      exact_reviewed_git_object_execution: true,
      private_readonly_execution_bundle: true,
      git_replacement_objects_disabled: true,
    },
    current_market_binding: {
      pair: marketPolicy.pair,
      shared_market_marker: marketPolicy.shared_market_marker,
      shared_market_schema: marketPolicy.shared_market_schema,
      shared_market_source_git_blob_sha1:
        marketPolicy.shared_market_source_git_blob_sha1,
      shared_market_v2_source_git_blob_sha1:
        marketPolicy.shared_market_v2_source_git_blob_sha1,
      shared_market_reconciliation_id:
        marketPolicy.shared_market_reconciliation_id,
      chain_id: marketPolicy.chain_id,
      network_identity: marketPolicy.network_identity,
      execution_epoch: marketPolicy.execution_epoch,
      void_token: marketPolicy.void_token,
      void_token_decimals: marketPolicy.void_token_decimals,
      btc_void_phase: marketPolicy.btc_void_phase,
      btc_void_remains_post_presale:
        marketPolicy.btc_void_remains_post_presale,
      settlement_source_domain: marketPolicy.settlement_source_domain,
      quote_asset_form: marketPolicy.quote_asset_form,
      quote_unit: marketPolicy.quote_unit,
      quote_decimals: marketPolicy.quote_decimals,
      protocol_quote_seed_units: marketPolicy.protocol_quote_seed_units,
      planned_btc_void_inventory_atoms:
        marketPolicy.planned_btc_void_inventory_atoms,
      quote_reserve_custody_verified:
        marketPolicy.quote_reserve_custody_verified,
      void_reserve_custody_verified:
        marketPolicy.void_reserve_custody_verified,
      inventory_funding_authority:
        marketPolicy.inventory_funding_authority,
      market_activation_authority:
        marketPolicy.market_activation_authority,
      public_presale_activation_authority:
        marketPolicy.public_presale_activation_authority,
      funds_movement_authority:
        marketPolicy.funds_movement_authority,
      legacy_v1_shared_market_production_authority: false,
      wc_void_fixed_redemption_claim_created: false,
      wc_void_pricing_remains_market_determined: true,
    },
    terminal_market_follow_on:
      terminal === null
        ? null
        : {
            source_sale_id: terminal.plan.source.settlement.source_sale_id,
            buyback_lot_id: terminal.plan.buyback_lot_id,
            buyback_lot_plan_id: terminal.plan.buyback_lot_plan_id,
            journal_decision_id: terminal.journalDecision.decision_id,
            journal_status: terminal.journalDecision.status,
          },
    invariants: {
      official_pair_btc_void_only: true,
      current_quote_rederived_and_bound: true,
      exact_reviewed_execution_git_objects_bound: true,
      reviewed_execution_loaded_before_authority_evaluation: true,
      native_integer_amounts_bound: true,
      bitcoin_amount_within_max_money: true,
      current_shared_market_policy_bound: true,
      current_shared_market_v2_canonical_source_bound: true,
      historical_v1_shared_market_authority_rejected: true,
      btc_void_post_presale_unopened_required: true,
      btc_void_inventory_funding_and_activation_authority_false: true,
      current_reserve_policy_rederived_on_btc_sale_settlement:
        contract.direction !== "btc_to_void" || phase !== "SETTLED" || terminal !== null,
      current_buyback_journal_decision_rederived_on_btc_sale_settlement:
        contract.direction !== "btc_to_void" || phase !== "SETTLED" || terminal !== null,
      asymmetric_refund_safety_margin_proven: true,
      transitions_fail_closed: true,
      exact_event_replay_idempotent: true,
      terminal_states_cannot_reopen: true,
      every_transition_evidence_backed: true,
      distinct_transitions_require_distinct_evidence: true,
      refund_evidence_binds_explicit_native_asset_roles: true,
      both_locked_refund_requires_both_asset_resolutions: true,
      no_automatic_retry: true,
      fixed_wc_void_redemption_introduced: false,
    },
    authority: {
      source_only_evaluation: true,
      bitcoin_regtest_executed: false,
      chain2050_execution_performed: false,
      live_market_observed: false,
      executable_inventory_reserved: false,
      liquidity_seeded: false,
      wallet_or_signer_accessed: false,
      transaction_constructed: false,
      transaction_broadcast: false,
      treasury_action_authorized: false,
      market_activation_authorized: false,
      funds_moved: false,
    },
  };

  return deepFreeze({
    ...evaluation,
    evaluation_id: contentId(evaluation),
  });
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--pretty") || args.length > 1) {
    fail(
      "usage: void-btc-void-atomic-settlement-state-invariants-v1.mjs [--pretty] < trace.json",
    );
  }
  const text = await readBtcVoidBoundedStdinV1({
    stream: process.stdin,
    maxBytes: MAX_STDIN_BYTES,
  });
  const result = evaluateBtcVoidAtomicSettlementTraceV1(JSON.parse(text));
  process.stdout.write(
    JSON.stringify(result, null, args[0] === "--pretty" ? 2 : 0) + "\n",
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(
      `${VOID_BTC_VOID_ATOMIC_SETTLEMENT_STATE_INVARIANTS_V1}_HOLD: ${error.message}\n`,
    );
    process.exitCode = 1;
  });
}
