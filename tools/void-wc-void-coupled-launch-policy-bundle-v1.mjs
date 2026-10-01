#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import {
  VOID_WC_VOID_OPENING_WINDOW_SCHEMA_V1,
  wcVoidOpeningWindowIdV1,
} from "./void-wc-void-opening-window-policy-v1.mjs";
import {
  VOID_WC_VOID_OPENING_CONCENTRATION_SYBIL_POLICY_SCHEMA_V1,
  wcVoidOpeningConcentrationSybilPolicyIdV1,
} from "./void-wc-void-opening-concentration-sybil-policy-v1.mjs";
import {
  VOID_WC_VOID_OPENING_CONCENTRATION_SYBIL_POLICY_CONTRACT,
} from "./void-wc-void-opening-concentration-sybil-policy-contract-v1.mjs";
import {
  VOID_WC_VOID_OPENING_MINIMUM_REAL_WC_DEPTH_POLICY_SCHEMA_V1,
  wcVoidOpeningMinimumRealWcDepthPolicyIdV1,
} from "./void-wc-void-opening-minimum-real-wc-depth-policy-v1.mjs";
import {
  VOID_WC_VOID_OPENING_MINIMUM_REAL_WC_DEPTH_POLICY_CONTRACT,
} from "./void-wc-void-opening-minimum-real-wc-depth-policy-contract-v1.mjs";
import {
  VOID_ECONOMIC_INTENT_TTL_CAPS_POLICY_CONTRACT_V1,
  VOID_ECONOMIC_INTENT_TTL_CAPS_POLICY_SCHEMA_V1,
  economicIntentTtlCapsPolicyIdV1,
} from "./void-economic-intent-ttl-caps-policy-v1.mjs";
import {
  VOID_ECONOMIC_SYSTEM_SPONSORED_POLICY_SCHEMA_V1,
  economicSystemSponsoredPolicyIdV1,
} from "./void-economic-system-sponsored-anti-grief-policy-v1.mjs";
import {
  VOID_ECONOMIC_SYSTEM_SPONSORED_ANTI_GRIEF_POLICY_CONTRACT,
} from "./void-economic-system-sponsored-anti-grief-policy-contract-v1.mjs";

export const VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_V1 =
  "VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_V1";

export const VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_SCHEMA_V1 =
  "void.wc-void-coupled-launch-policy-bundle.v1";

export const VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_AUTHORITY_V1 =
  Object.freeze({
    source_policy_compilation_only: true,
    explicit_reviewed_values_required: true,
    create_only_private_output: true,
    production_values_selected_by_source: false,
    runtime_enforcement_verified: false,
    wall_clock_read: false,
    runtime_mutation: false,
    service_mutation: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    chain2050_write: false,
    wc_ledger_write: false,
    inventory_funding: false,
    liquidity_movement: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
  });

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..");
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const UINT = /^(0|[1-9][0-9]*)$/u;
const MAX_INPUT_BYTES = 1024 * 1024;
const MAX_TRACKED_INTENTS = 1_000_000;
const MAX_SIGNED_INTENT_GAS_LIMIT =
  BigInt(
    VOID_ECONOMIC_SYSTEM_SPONSORED_ANTI_GRIEF_POLICY_CONTRACT
      .max_signed_intent_gas_limit,
  );

const INPUT_KEYS = Object.freeze([
  "bundle_committed_at_ms",
  "bundle_generation",
  "concentration_policy",
  "coupled_launch_id",
  "intent_ttl_caps_policy",
  "minimum_depth_policy",
  "opening_window",
  "sponsored_execution_policy",
]);

const WINDOW_KEYS = Object.freeze([
  "closes_at_ms",
  "coupled_launch_id",
  "opens_at_ms",
  "policy_committed_at_ms",
  "schema",
  "window_id",
]);

const CONCENTRATION_KEYS = Object.freeze([
  "coupled_launch_id",
  "failure_action",
  "max_participant_share_bps",
  "max_related_identity_share_bps",
  "opening_window_id",
  "policy_committed_at_ms",
  "policy_generation",
  "policy_id",
  "schema",
]);

const DEPTH_KEYS = Object.freeze([
  "coupled_launch_id",
  "minimum_depth_failure_action",
  "minimum_real_wc_units",
  "opening_window_id",
  "policy_committed_at_ms",
  "policy_generation",
  "policy_id",
  "schema",
]);

const TTL_KEYS = Object.freeze([
  "coupled_launch_id",
  "global_max_outstanding",
  "intent_ttl_seconds",
  "late_payment_action",
  "per_identity_max_outstanding",
  "policy_committed_at_ms",
  "policy_generation",
  "policy_id",
  "schema",
]);

const SPONSOR_KEYS = Object.freeze([
  "budget_exhaustion_action",
  "coupled_launch_id",
  "global_sponsored_gas_budget",
  "intent_ttl_caps_policy_id",
  "per_identity_sponsored_gas_budget",
  "per_intent_sponsored_gas_limit",
  "policy_committed_at_ms",
  "policy_generation",
  "policy_id",
  "schema",
]);

function fail(code) {
  throw new Error(code);
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function plain(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (
      Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null
    )
  );
}

function exactObject(value, keys, code) {
  if (!plain(value)) fail(code);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actual = Reflect.ownKeys(descriptors);
  if (actual.some((key) => typeof key !== "string")) fail(code);
  actual.sort(compareText);
  const expected = [...keys].sort(compareText);
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(code);
  }
  const out = Object.create(null);
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value")
    ) {
      fail(code);
    }
    out[key] = descriptor.value;
  }
  return Object.freeze(out);
}

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (plain(value)) {
    return (
      "{" +
      Object.keys(value)
        .sort(compareText)
        .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
        .join(",") +
      "}"
    );
  }
  fail("COUPLED_LAUNCH_POLICY_CANONICAL_VALUE_INVALID");
}

function digest(value) {
  return "sha256:" +
    crypto.createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}

function sha256Bytes(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function prettyBytes(value) {
  return Buffer.from(JSON.stringify(value, null, 2) + "\n", "utf8");
}

function canonicalSha(value, code) {
  if (typeof value !== "string" || !SHA256_ID.test(value)) fail(code);
  return value;
}

function canonicalGeneration(value, code) {
  if (
    typeof value !== "string" ||
    !UINT.test(value) ||
    BigInt(value) <= 0n
  ) {
    fail(code);
  }
  return value;
}

function canonicalMs(value, code) {
  if (!Number.isSafeInteger(value) || value <= 0) fail(code);
  return value;
}

function positiveUintString(value, code) {
  if (typeof value !== "string" || !UINT.test(value)) fail(code);
  const parsed = BigInt(value);
  if (parsed <= 0n) fail(code);
  return parsed;
}

function positiveSafeInteger(value, code) {
  if (!Number.isSafeInteger(value) || value <= 0) fail(code);
  return value;
}

function positiveBps(value, code) {
  const parsed = positiveUintString(value, code);
  if (parsed >= 10_000n) fail(code);
  return parsed;
}

function deepFreeze(value) {
  if (
    value === null ||
    typeof value !== "object" ||
    Object.isFrozen(value)
  ) {
    return value;
  }
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function validateWindow(raw, launchId) {
  const value = exactObject(
    raw,
    WINDOW_KEYS,
    "COUPLED_LAUNCH_WINDOW_SHAPE_INVALID",
  );
  if (value.schema !== VOID_WC_VOID_OPENING_WINDOW_SCHEMA_V1) {
    fail("COUPLED_LAUNCH_WINDOW_SCHEMA_INVALID");
  }
  canonicalSha(value.window_id, "COUPLED_LAUNCH_WINDOW_ID_INVALID");
  canonicalSha(
    value.coupled_launch_id,
    "COUPLED_LAUNCH_WINDOW_LAUNCH_ID_INVALID",
  );
  if (value.coupled_launch_id !== launchId) {
    fail("COUPLED_LAUNCH_WINDOW_LAUNCH_ID_MISMATCH");
  }
  const committed = canonicalMs(
    value.policy_committed_at_ms,
    "COUPLED_LAUNCH_WINDOW_COMMITTED_AT_INVALID",
  );
  const opens = canonicalMs(
    value.opens_at_ms,
    "COUPLED_LAUNCH_WINDOW_OPENS_AT_INVALID",
  );
  const closes = canonicalMs(
    value.closes_at_ms,
    "COUPLED_LAUNCH_WINDOW_CLOSES_AT_INVALID",
  );
  if (!(committed < opens && opens < closes)) {
    fail("COUPLED_LAUNCH_WINDOW_ORDER_INVALID");
  }
  if (wcVoidOpeningWindowIdV1(value) !== value.window_id) {
    fail("COUPLED_LAUNCH_WINDOW_ID_MISMATCH");
  }
  return Object.freeze({
    ...value,
    policy_committed_at_ms: committed,
    opens_at_ms: opens,
    closes_at_ms: closes,
  });
}

function validateConcentration(raw, launchId, window) {
  const value = exactObject(
    raw,
    CONCENTRATION_KEYS,
    "COUPLED_LAUNCH_CONCENTRATION_SHAPE_INVALID",
  );
  if (
    value.schema !==
    VOID_WC_VOID_OPENING_CONCENTRATION_SYBIL_POLICY_SCHEMA_V1
  ) {
    fail("COUPLED_LAUNCH_CONCENTRATION_SCHEMA_INVALID");
  }
  canonicalSha(value.policy_id, "COUPLED_LAUNCH_CONCENTRATION_ID_INVALID");
  canonicalGeneration(
    value.policy_generation,
    "COUPLED_LAUNCH_CONCENTRATION_GENERATION_INVALID",
  );
  if (
    value.coupled_launch_id !== launchId ||
    value.opening_window_id !== window.window_id
  ) {
    fail("COUPLED_LAUNCH_CONCENTRATION_BINDING_MISMATCH");
  }
  const committed = canonicalMs(
    value.policy_committed_at_ms,
    "COUPLED_LAUNCH_CONCENTRATION_COMMITTED_AT_INVALID",
  );
  if (
    committed < window.policy_committed_at_ms ||
    committed >= window.opens_at_ms
  ) {
    fail("COUPLED_LAUNCH_CONCENTRATION_COMMIT_ORDER_INVALID");
  }
  const participant = positiveBps(
    value.max_participant_share_bps,
    "COUPLED_LAUNCH_PARTICIPANT_CAP_INVALID",
  );
  const cluster = positiveBps(
    value.max_related_identity_share_bps,
    "COUPLED_LAUNCH_CLUSTER_CAP_INVALID",
  );
  if (cluster < participant) {
    fail("COUPLED_LAUNCH_CLUSTER_CAP_BELOW_PARTICIPANT_CAP");
  }
  if (
    value.failure_action !==
    VOID_WC_VOID_OPENING_CONCENTRATION_SYBIL_POLICY_CONTRACT.failure_action
  ) {
    fail("COUPLED_LAUNCH_CONCENTRATION_FAILURE_ACTION_INVALID");
  }
  if (wcVoidOpeningConcentrationSybilPolicyIdV1(value) !== value.policy_id) {
    fail("COUPLED_LAUNCH_CONCENTRATION_ID_MISMATCH");
  }
  return Object.freeze({ ...value, policy_committed_at_ms: committed });
}

function validateDepth(raw, launchId, window) {
  const value = exactObject(
    raw,
    DEPTH_KEYS,
    "COUPLED_LAUNCH_DEPTH_SHAPE_INVALID",
  );
  if (
    value.schema !==
    VOID_WC_VOID_OPENING_MINIMUM_REAL_WC_DEPTH_POLICY_SCHEMA_V1
  ) {
    fail("COUPLED_LAUNCH_DEPTH_SCHEMA_INVALID");
  }
  canonicalSha(value.policy_id, "COUPLED_LAUNCH_DEPTH_ID_INVALID");
  canonicalGeneration(
    value.policy_generation,
    "COUPLED_LAUNCH_DEPTH_GENERATION_INVALID",
  );
  if (
    value.coupled_launch_id !== launchId ||
    value.opening_window_id !== window.window_id
  ) {
    fail("COUPLED_LAUNCH_DEPTH_BINDING_MISMATCH");
  }
  const committed = canonicalMs(
    value.policy_committed_at_ms,
    "COUPLED_LAUNCH_DEPTH_COMMITTED_AT_INVALID",
  );
  if (
    committed < window.policy_committed_at_ms ||
    committed >= window.opens_at_ms
  ) {
    fail("COUPLED_LAUNCH_DEPTH_COMMIT_ORDER_INVALID");
  }
  const minimum = positiveUintString(
    value.minimum_real_wc_units,
    "COUPLED_LAUNCH_MINIMUM_DEPTH_INVALID",
  );
  if (minimum > BigInt(Number.MAX_SAFE_INTEGER)) {
    fail("COUPLED_LAUNCH_MINIMUM_DEPTH_ABOVE_SAFE_INTEGER");
  }
  if (
    value.minimum_depth_failure_action !==
    VOID_WC_VOID_OPENING_MINIMUM_REAL_WC_DEPTH_POLICY_CONTRACT
      .minimum_depth_exhaustion_action
  ) {
    fail("COUPLED_LAUNCH_DEPTH_FAILURE_ACTION_INVALID");
  }
  if (wcVoidOpeningMinimumRealWcDepthPolicyIdV1(value) !== value.policy_id) {
    fail("COUPLED_LAUNCH_DEPTH_ID_MISMATCH");
  }
  return Object.freeze({ ...value, policy_committed_at_ms: committed });
}

function validateTtl(raw, launchId, window) {
  const value = exactObject(
    raw,
    TTL_KEYS,
    "COUPLED_LAUNCH_TTL_SHAPE_INVALID",
  );
  if (value.schema !== VOID_ECONOMIC_INTENT_TTL_CAPS_POLICY_SCHEMA_V1) {
    fail("COUPLED_LAUNCH_TTL_SCHEMA_INVALID");
  }
  canonicalSha(value.policy_id, "COUPLED_LAUNCH_TTL_ID_INVALID");
  canonicalGeneration(
    value.policy_generation,
    "COUPLED_LAUNCH_TTL_GENERATION_INVALID",
  );
  if (value.coupled_launch_id !== launchId) {
    fail("COUPLED_LAUNCH_TTL_LAUNCH_ID_MISMATCH");
  }
  const committed = canonicalMs(
    value.policy_committed_at_ms,
    "COUPLED_LAUNCH_TTL_COMMITTED_AT_INVALID",
  );
  if (
    committed < window.policy_committed_at_ms ||
    committed >= window.opens_at_ms
  ) {
    fail("COUPLED_LAUNCH_TTL_COMMIT_ORDER_INVALID");
  }
  const ttl = positiveSafeInteger(
    value.intent_ttl_seconds,
    "COUPLED_LAUNCH_TTL_SECONDS_INVALID",
  );
  if (
    ttl >
    Number(VOID_ECONOMIC_INTENT_TTL_CAPS_POLICY_CONTRACT_V1.max_ttl_seconds)
  ) {
    fail("COUPLED_LAUNCH_TTL_ABOVE_MAXIMUM");
  }
  const perIdentity = positiveSafeInteger(
    value.per_identity_max_outstanding,
    "COUPLED_LAUNCH_TTL_IDENTITY_CAP_INVALID",
  );
  const global = positiveSafeInteger(
    value.global_max_outstanding,
    "COUPLED_LAUNCH_TTL_GLOBAL_CAP_INVALID",
  );
  if (global < perIdentity || global > MAX_TRACKED_INTENTS) {
    fail("COUPLED_LAUNCH_TTL_CAP_RELATION_INVALID");
  }
  if (
    value.late_payment_action !==
    VOID_ECONOMIC_INTENT_TTL_CAPS_POLICY_CONTRACT_V1.late_payment_action
  ) {
    fail("COUPLED_LAUNCH_TTL_LATE_PAYMENT_ACTION_INVALID");
  }
  if (economicIntentTtlCapsPolicyIdV1(value) !== value.policy_id) {
    fail("COUPLED_LAUNCH_TTL_ID_MISMATCH");
  }
  return Object.freeze({ ...value, policy_committed_at_ms: committed });
}

function validateSponsor(raw, launchId, window, ttl) {
  const value = exactObject(
    raw,
    SPONSOR_KEYS,
    "COUPLED_LAUNCH_SPONSOR_SHAPE_INVALID",
  );
  if (value.schema !== VOID_ECONOMIC_SYSTEM_SPONSORED_POLICY_SCHEMA_V1) {
    fail("COUPLED_LAUNCH_SPONSOR_SCHEMA_INVALID");
  }
  canonicalSha(value.policy_id, "COUPLED_LAUNCH_SPONSOR_ID_INVALID");
  canonicalGeneration(
    value.policy_generation,
    "COUPLED_LAUNCH_SPONSOR_GENERATION_INVALID",
  );
  if (
    value.coupled_launch_id !== launchId ||
    value.intent_ttl_caps_policy_id !== ttl.policy_id
  ) {
    fail("COUPLED_LAUNCH_SPONSOR_BINDING_MISMATCH");
  }
  const committed = canonicalMs(
    value.policy_committed_at_ms,
    "COUPLED_LAUNCH_SPONSOR_COMMITTED_AT_INVALID",
  );
  if (
    committed <= ttl.policy_committed_at_ms ||
    committed >= window.opens_at_ms
  ) {
    fail("COUPLED_LAUNCH_SPONSOR_COMMIT_ORDER_INVALID");
  }
  const perIntent = positiveUintString(
    value.per_intent_sponsored_gas_limit,
    "COUPLED_LAUNCH_SPONSOR_INTENT_LIMIT_INVALID",
  );
  const perIdentity = positiveUintString(
    value.per_identity_sponsored_gas_budget,
    "COUPLED_LAUNCH_SPONSOR_IDENTITY_BUDGET_INVALID",
  );
  const global = positiveUintString(
    value.global_sponsored_gas_budget,
    "COUPLED_LAUNCH_SPONSOR_GLOBAL_BUDGET_INVALID",
  );
  if (
    perIntent > MAX_SIGNED_INTENT_GAS_LIMIT ||
    perIdentity < perIntent ||
    global < perIdentity
  ) {
    fail("COUPLED_LAUNCH_SPONSOR_BUDGET_RELATION_INVALID");
  }
  if (
    value.budget_exhaustion_action !==
    VOID_ECONOMIC_SYSTEM_SPONSORED_ANTI_GRIEF_POLICY_CONTRACT
      .budget_exhaustion_action
  ) {
    fail("COUPLED_LAUNCH_SPONSOR_EXHAUSTION_ACTION_INVALID");
  }
  if (economicSystemSponsoredPolicyIdV1(value) !== value.policy_id) {
    fail("COUPLED_LAUNCH_SPONSOR_ID_MISMATCH");
  }
  return Object.freeze({ ...value, policy_committed_at_ms: committed });
}

export function compileVoidWcVoidCoupledLaunchPolicyBundleV1(raw) {
  const input = exactObject(
    raw,
    INPUT_KEYS,
    "COUPLED_LAUNCH_POLICY_BUNDLE_INPUT_SHAPE_INVALID",
  );
  const launchId = canonicalSha(
    input.coupled_launch_id,
    "COUPLED_LAUNCH_POLICY_BUNDLE_LAUNCH_ID_INVALID",
  );
  const generation = canonicalGeneration(
    input.bundle_generation,
    "COUPLED_LAUNCH_POLICY_BUNDLE_GENERATION_INVALID",
  );
  const window = validateWindow(input.opening_window, launchId);
  const concentration = validateConcentration(
    input.concentration_policy,
    launchId,
    window,
  );
  const depth = validateDepth(
    input.minimum_depth_policy,
    launchId,
    window,
  );
  const ttl = validateTtl(
    input.intent_ttl_caps_policy,
    launchId,
    window,
  );
  const sponsor = validateSponsor(
    input.sponsored_execution_policy,
    launchId,
    window,
    ttl,
  );
  const bundleCommittedAt = canonicalMs(
    input.bundle_committed_at_ms,
    "COUPLED_LAUNCH_POLICY_BUNDLE_COMMITTED_AT_INVALID",
  );
  const latestDependencyCommit = Math.max(
    window.policy_committed_at_ms,
    concentration.policy_committed_at_ms,
    depth.policy_committed_at_ms,
    ttl.policy_committed_at_ms,
    sponsor.policy_committed_at_ms,
  );
  if (
    bundleCommittedAt < latestDependencyCommit ||
    bundleCommittedAt >= window.opens_at_ms
  ) {
    fail("COUPLED_LAUNCH_POLICY_BUNDLE_COMMIT_ORDER_INVALID");
  }

  const body = Object.freeze({
    marker: VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_V1,
    schema: VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_SCHEMA_V1,
    version: 1,
    coupled_launch_id: launchId,
    bundle_generation: generation,
    bundle_committed_at_ms: bundleCommittedAt,
    opening_window: window,
    concentration_policy: concentration,
    minimum_depth_policy: depth,
    intent_ttl_caps_policy: ttl,
    sponsored_execution_policy: sponsor,
    source_contract_ids: Object.freeze({
      concentration_sybil:
        VOID_WC_VOID_OPENING_CONCENTRATION_SYBIL_POLICY_CONTRACT
          .policy_contract_id,
      minimum_real_wc_depth:
        VOID_WC_VOID_OPENING_MINIMUM_REAL_WC_DEPTH_POLICY_CONTRACT
          .policy_contract_id,
      intent_ttl_caps:
        VOID_ECONOMIC_INTENT_TTL_CAPS_POLICY_CONTRACT_V1.policy_contract_id,
      system_sponsored_anti_grief:
        VOID_ECONOMIC_SYSTEM_SPONSORED_ANTI_GRIEF_POLICY_CONTRACT
          .policy_contract_id,
    }),
    exact_values_supplied_explicitly: true,
    values_selected_by_source: false,
    all_policy_commitments_precede_open: true,
    hidden_minimum_trade_amount_applied: false,
    runtime_enforcement_verified: false,
    launch_authority: false,
    market_activation_authorized: false,
    public_presale_activation_authorized: false,
    funds_movement_authorized: false,
    authority: VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_AUTHORITY_V1,
  });

  return deepFreeze({
    ...body,
    bundle_id: digest(body),
  });
}

function outsideRepository(file) {
  const relative = path.relative(REPO_ROOT, file);
  return (
    relative === ".." ||
    relative.startsWith(".." + path.sep) ||
    path.isAbsolute(relative)
  );
}

function readPrivateJson(file, label) {
  if (
    typeof file !== "string" ||
    !path.isAbsolute(file) ||
    path.resolve(file) !== file ||
    !outsideRepository(file)
  ) {
    fail(label + "_PATH_INVALID");
  }
  const real = fs.realpathSync.native(file);
  if (real !== file) fail(label + "_PATH_ALIAS_FORBIDDEN");
  const stat = fs.lstatSync(file);
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.size < 2 ||
    stat.size > MAX_INPUT_BYTES
  ) {
    fail(label + "_NOT_DIRECT_BOUNDED_REGULAR");
  }
  if (
    typeof process.getuid === "function" &&
    stat.uid !== process.getuid()
  ) {
    fail(label + "_OWNER_MISMATCH");
  }
  if ((stat.mode & 0o077) !== 0) fail(label + "_PERMISSIONS_TOO_BROAD");
  const bytes = fs.readFileSync(file);
  let value;
  try {
    value = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    );
  } catch {
    fail(label + "_JSON_INVALID");
  }
  return Object.freeze({ bytes, value });
}

function writePrivateJson(file, value) {
  if (
    typeof file !== "string" ||
    !path.isAbsolute(file) ||
    path.resolve(file) !== file ||
    !outsideRepository(file)
  ) {
    fail("COUPLED_LAUNCH_POLICY_OUTPUT_PATH_INVALID");
  }
  const parent = path.dirname(file);
  const realParent = fs.realpathSync.native(parent);
  if (realParent !== parent) {
    fail("COUPLED_LAUNCH_POLICY_OUTPUT_PARENT_ALIAS_FORBIDDEN");
  }
  const parentStat = fs.lstatSync(parent);
  if (
    !parentStat.isDirectory() ||
    parentStat.isSymbolicLink() ||
    (
      typeof process.getuid === "function" &&
      parentStat.uid !== process.getuid()
    ) ||
    (parentStat.mode & 0o022) !== 0
  ) {
    fail("COUPLED_LAUNCH_POLICY_OUTPUT_PARENT_UNSAFE");
  }
  const bytes = prettyBytes(value);
  let fd;
  try {
    fd = fs.openSync(
      file,
      fs.constants.O_WRONLY |
        fs.constants.O_CREAT |
        fs.constants.O_EXCL |
        Number(fs.constants.O_NOFOLLOW || 0),
      0o600,
    );
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
    fs.fchmodSync(fd, 0o600);
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
  const stat = fs.lstatSync(file);
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    (stat.mode & 0o777) !== 0o600
  ) {
    fail("COUPLED_LAUNCH_POLICY_OUTPUT_IDENTITY_INVALID");
  }
  const persisted = fs.readFileSync(file);
  if (!persisted.equals(bytes)) {
    fail("COUPLED_LAUNCH_POLICY_OUTPUT_BYTES_MISMATCH");
  }
  return Object.freeze({
    output_path: file,
    output_sha256: sha256Bytes(bytes),
    output_bytes: bytes.length,
  });
}

const direct =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (direct) {
  try {
    const { values } = parseArgs({
      options: {
        input: { type: "string" },
        output: { type: "string" },
      },
      strict: true,
    });
    if (!values.input || !values.output) {
      fail(
        "usage: --input /absolute/private/launch-policy-input.json " +
        "--output /absolute/private/launch-policy-bundle.json",
      );
    }
    const source = readPrivateJson(
      values.input,
      "COUPLED_LAUNCH_POLICY_INPUT",
    );
    const result = compileVoidWcVoidCoupledLaunchPolicyBundleV1(source.value);
    const persisted = writePrivateJson(values.output, result);

    console.log(VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_V1);
    console.log("bundle_id=" + result.bundle_id);
    console.log("coupled_launch_id=" + result.coupled_launch_id);
    console.log("opening_window_id=" + result.opening_window.window_id);
    console.log(
      "concentration_policy_id=" + result.concentration_policy.policy_id,
    );
    console.log(
      "minimum_depth_policy_id=" + result.minimum_depth_policy.policy_id,
    );
    console.log(
      "intent_ttl_caps_policy_id=" +
        result.intent_ttl_caps_policy.policy_id,
    );
    console.log(
      "sponsored_execution_policy_id=" +
        result.sponsored_execution_policy.policy_id,
    );
    console.log("output_path=" + persisted.output_path);
    console.log("output_sha256=" + persisted.output_sha256);
    console.log("output_bytes=" + String(persisted.output_bytes));
    console.log("values_selected_by_source=false");
    console.log("runtime_enforcement_verified=false");
    console.log("market_activation_authorized=false");
    console.log("public_presale_activation_authorized=false");
    console.log("funds_movement_authorized=false");
    console.log(
      "VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_V1_GREEN_NOT_ACTIVATED",
    );
  } catch (error) {
    console.error("VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_V1_HOLD");
    console.error(
      "reason=" +
        (error instanceof Error ? error.message : String(error)),
    );
    process.exitCode = 2;
  }
}
