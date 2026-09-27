import { createHash } from "node:crypto";

import {
  verifyWcVoidOpeningCommitmentsV1,
} from "./void-wc-void-coupled-opening-v1.mjs";

export const VOID_WC_VOID_OPENING_WINDOW_POLICY_V1 =
  "VOID_WC_VOID_OPENING_WINDOW_POLICY_V1";

export const VOID_WC_VOID_OPENING_WINDOW_SCHEMA_V1 =
  "void.wc-void-opening-window.v1";

export const VOID_WC_VOID_OPENING_ADMISSION_SCHEMA_V1 =
  "void.wc-void-opening-admission.v1";

export const VOID_WC_VOID_OPENING_WINDOW_AUTHORITY_V1 = Object.freeze({
  source_only: true,
  explicit_input_only: true,
  wall_clock_read: false,
  ledger_write: false,
  wc_balance_mutation: false,
  wallet_or_signer_access: false,
  transaction_construction: false,
  transaction_signing: false,
  transaction_broadcast: false,
  chain2050_write: false,
  inventory_funding: false,
  liquidity_movement: false,
  market_activation: false,
  public_presale_activation: false,
  funds_movement: false,
});

const SHA256 = /^sha256:[0-9a-f]{64}$/u;
const SAFE_ACCOUNT = /^[A-Za-z0-9._:@-]{3,128}$/u;
const MAX_SET_SIZE = 1_000_000;

const REQUEST_KEYS = Object.freeze([
  "coupled_launch_id",
  "window",
  "commitments",
  "admissions",
]);

const WINDOW_KEYS = Object.freeze([
  "schema",
  "window_id",
  "coupled_launch_id",
  "policy_committed_at_ms",
  "opens_at_ms",
  "closes_at_ms",
]);

const ADMISSION_KEYS = Object.freeze([
  "schema",
  "admission_id",
  "window_id",
  "coupled_launch_id",
  "commitment_id",
  "participant_id",
  "account",
  "admitted_at_ms",
]);

function fail(code) {
  throw new Error(code);
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function exactObject(value, keys, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(code);
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) fail(code);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const ownKeys = Reflect.ownKeys(descriptors);
  if (ownKeys.some((key) => typeof key !== "string")) fail(code);
  const actual = ownKeys.sort(compareText);
  const expected = [...keys].sort(compareText);
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(code);
  }
  const snapshot = Object.create(null);
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

function exactArray(value, code) {
  if (
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype
  ) {
    fail(code);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const lengthDescriptor = descriptors.length;
  if (
    !lengthDescriptor ||
    !Object.hasOwn(lengthDescriptor, "value") ||
    !Number.isSafeInteger(lengthDescriptor.value) ||
    lengthDescriptor.value < 1 ||
    lengthDescriptor.value > MAX_SET_SIZE
  ) {
    fail(code);
  }
  const length = lengthDescriptor.value;
  if (Reflect.ownKeys(descriptors).length !== length + 1) fail(code);
  const out = [];
  for (let index = 0; index < length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value")
    ) {
      fail(code);
    }
    out.push(descriptor.value);
  }
  return out;
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
  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort(compareText);
    return "{" + keys.map((key) =>
      JSON.stringify(key) + ":" + canonicalJson(value[key])
    ).join(",") + "}";
  }
  fail("INVALID_CANONICAL_VALUE");
}

function digest(value) {
  return "sha256:" +
    createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function canonicalSha(value, code) {
  if (typeof value !== "string" || !SHA256.test(value)) fail(code);
  return value;
}

function canonicalAccount(value, code) {
  if (typeof value !== "string" || !SAFE_ACCOUNT.test(value)) fail(code);
  return value;
}

function canonicalMs(value, code) {
  if (!Number.isSafeInteger(value) || value <= 0) fail(code);
  return value;
}

function windowPayload(value) {
  return Object.freeze({
    schema: value.schema,
    coupled_launch_id: value.coupled_launch_id,
    policy_committed_at_ms: value.policy_committed_at_ms,
    opens_at_ms: value.opens_at_ms,
    closes_at_ms: value.closes_at_ms,
  });
}

function admissionPayload(value) {
  return Object.freeze({
    schema: value.schema,
    window_id: value.window_id,
    coupled_launch_id: value.coupled_launch_id,
    commitment_id: value.commitment_id,
    participant_id: value.participant_id,
    account: value.account,
    admitted_at_ms: value.admitted_at_ms,
  });
}

function verifyWindow(coupledLaunchId, raw) {
  canonicalSha(coupledLaunchId, "INVALID_COUPLED_LAUNCH_ID");
  const value = exactObject(
    raw,
    WINDOW_KEYS,
    "INVALID_WC_VOID_OPENING_WINDOW_SHAPE",
  );
  if (value.schema !== VOID_WC_VOID_OPENING_WINDOW_SCHEMA_V1) {
    fail("INVALID_WC_VOID_OPENING_WINDOW_SCHEMA");
  }
  canonicalSha(value.window_id, "INVALID_WC_VOID_OPENING_WINDOW_ID");
  canonicalSha(value.coupled_launch_id, "INVALID_COUPLED_LAUNCH_ID");
  if (value.coupled_launch_id !== coupledLaunchId) {
    fail("WC_VOID_OPENING_WINDOW_LAUNCH_MISMATCH");
  }

  const committed = canonicalMs(
    value.policy_committed_at_ms,
    "INVALID_WC_VOID_OPENING_WINDOW_COMMITTED_AT_MS",
  );
  const opens = canonicalMs(
    value.opens_at_ms,
    "INVALID_WC_VOID_OPENING_WINDOW_OPENS_AT_MS",
  );
  const closes = canonicalMs(
    value.closes_at_ms,
    "INVALID_WC_VOID_OPENING_WINDOW_CLOSES_AT_MS",
  );
  if (!(committed < opens && opens < closes)) {
    fail("WC_VOID_OPENING_WINDOW_ORDER_INVALID");
  }
  if (wcVoidOpeningWindowIdV1(value) !== value.window_id) {
    fail("WC_VOID_OPENING_WINDOW_DIGEST_MISMATCH");
  }

  return Object.freeze({
    schema: value.schema,
    window_id: value.window_id,
    coupled_launch_id: value.coupled_launch_id,
    policy_committed_at_ms: committed,
    opens_at_ms: opens,
    closes_at_ms: closes,
  });
}

export function wcVoidOpeningWindowIdV1(value) {
  const window = exactObject(
    value,
    WINDOW_KEYS,
    "INVALID_WC_VOID_OPENING_WINDOW_SHAPE",
  );
  return digest(windowPayload(window));
}

export function wcVoidOpeningAdmissionIdV1(value) {
  const admission = exactObject(
    value,
    ADMISSION_KEYS,
    "INVALID_WC_VOID_OPENING_ADMISSION_SHAPE",
  );
  return digest(admissionPayload(admission));
}

export function classifyWcVoidOpeningWindowPhaseV1(window, observedAtMs) {
  const raw = exactObject(
    window,
    WINDOW_KEYS,
    "INVALID_WC_VOID_OPENING_WINDOW_SHAPE",
  );
  const verified = verifyWindow(raw.coupled_launch_id, raw);
  const observed = canonicalMs(
    observedAtMs,
    "INVALID_WC_VOID_OPENING_WINDOW_OBSERVED_AT_MS",
  );

  return Object.freeze({
    window_id: verified.window_id,
    observed_at_ms: observed,
    phase:
      observed < verified.opens_at_ms
        ? "scheduled"
        : observed < verified.closes_at_ms
          ? "open"
          : "closed",
    admission_allowed:
      observed >= verified.opens_at_ms &&
      observed < verified.closes_at_ms,
    deterministic_close_exclusive: true,
    wall_clock_read_performed: false,
  });
}

export function verifyWcVoidOpeningWindowPolicyV1(input) {
  const request = exactObject(
    input,
    REQUEST_KEYS,
    "INVALID_WC_VOID_OPENING_WINDOW_REQUEST_SHAPE",
  );
  const launchId = canonicalSha(
    request.coupled_launch_id,
    "INVALID_COUPLED_LAUNCH_ID",
  );
  const window = verifyWindow(launchId, request.window);
  const commitmentSet = verifyWcVoidOpeningCommitmentsV1(
    launchId,
    request.commitments,
  );
  const admissionValues = exactArray(
    request.admissions,
    "INVALID_WC_VOID_OPENING_ADMISSION_SET",
  );

  if (admissionValues.length !== commitmentSet.commitment_count) {
    fail("WC_VOID_OPENING_ADMISSION_COUNT_MISMATCH");
  }

  const commitmentsById = new Map(
    commitmentSet.commitments.map((value) => [
      value.commitment_id,
      value,
    ]),
  );
  const seenAdmissionIds = new Set();
  const seenCommitments = new Set();

  const canonicalAdmissions = admissionValues.map((raw) => {
    const value = exactObject(
      raw,
      ADMISSION_KEYS,
      "INVALID_WC_VOID_OPENING_ADMISSION_SHAPE",
    );
    if (value.schema !== VOID_WC_VOID_OPENING_ADMISSION_SCHEMA_V1) {
      fail("INVALID_WC_VOID_OPENING_ADMISSION_SCHEMA");
    }
    canonicalSha(value.admission_id, "INVALID_WC_VOID_OPENING_ADMISSION_ID");
    canonicalSha(value.window_id, "INVALID_WC_VOID_OPENING_WINDOW_ID");
    canonicalSha(value.coupled_launch_id, "INVALID_COUPLED_LAUNCH_ID");
    canonicalSha(value.commitment_id, "INVALID_WC_VOID_OPENING_COMMITMENT_ID");
    canonicalSha(value.participant_id, "INVALID_WC_VOID_OPENING_PARTICIPANT_ID");
    canonicalAccount(value.account, "INVALID_WC_VOID_OPENING_ACCOUNT");
    const admittedAt = canonicalMs(
      value.admitted_at_ms,
      "INVALID_WC_VOID_OPENING_ADMITTED_AT_MS",
    );

    if (value.window_id !== window.window_id) {
      fail("WC_VOID_OPENING_ADMISSION_WINDOW_MISMATCH");
    }
    if (value.coupled_launch_id !== launchId) {
      fail("WC_VOID_OPENING_ADMISSION_LAUNCH_MISMATCH");
    }
    if (
      admittedAt < window.opens_at_ms ||
      admittedAt >= window.closes_at_ms
    ) {
      fail("WC_VOID_OPENING_ADMISSION_OUTSIDE_WINDOW");
    }

    const commitment = commitmentsById.get(value.commitment_id);
    if (!commitment) {
      fail("UNKNOWN_WC_VOID_OPENING_ADMISSION_COMMITMENT");
    }
    if (
      commitment.participant_id !== value.participant_id ||
      commitment.account !== value.account
    ) {
      fail("WC_VOID_OPENING_ADMISSION_COMMITMENT_MISMATCH");
    }
    if (wcVoidOpeningAdmissionIdV1(value) !== value.admission_id) {
      fail("WC_VOID_OPENING_ADMISSION_DIGEST_MISMATCH");
    }
    if (seenAdmissionIds.has(value.admission_id)) {
      fail("DUPLICATE_WC_VOID_OPENING_ADMISSION_ID");
    }
    if (seenCommitments.has(value.commitment_id)) {
      fail("DUPLICATE_WC_VOID_OPENING_ADMITTED_COMMITMENT");
    }

    seenAdmissionIds.add(value.admission_id);
    seenCommitments.add(value.commitment_id);

    return Object.freeze({
      admission_id: value.admission_id,
      commitment_id: value.commitment_id,
      participant_id: value.participant_id,
      account: value.account,
      admitted_at_ms: admittedAt,
    });
  });

  if (seenCommitments.size !== commitmentsById.size) {
    fail("MISSING_WC_VOID_OPENING_ADMISSION");
  }

  canonicalAdmissions.sort((left, right) =>
    compareText(left.admission_id, right.admission_id)
  );
  Object.freeze(canonicalAdmissions);

  const policyPayload = Object.freeze({
    schema: "void.wc-void-opening-window-policy-state.v1",
    coupled_launch_id: launchId,
    window_id: window.window_id,
    policy_committed_at_ms: window.policy_committed_at_ms,
    opens_at_ms: window.opens_at_ms,
    closes_at_ms: window.closes_at_ms,
    commitment_set_root: commitmentSet.commitment_set_root,
    admission_count: canonicalAdmissions.length,
    admissions: canonicalAdmissions,
  });

  return Object.freeze({
    marker: VOID_WC_VOID_OPENING_WINDOW_POLICY_V1,
    ...policyPayload,
    policy_state_id: digest(policyPayload),
    opening_commitment_window_policy_ready: true,
    policy_committed_before_open: true,
    finite_window_required: true,
    deterministic_close_exclusive: true,
    close_boundary_admission_rejected: true,
    post_close_admission_forbidden: true,
    exact_commitment_admission_bijection: true,
    admission_order_independent: true,
    duration_value_hardcoded: false,
    participant_provenance_verified: false,
    live_admission_persistence_verified: false,
    live_clock_observed: false,
    ledger_write_performed: false,
    wc_balance_mutation_performed: false,
    market_activation_authority: false,
    public_presale_activation_authority: false,
    funds_movement_authority: false,
    authority: VOID_WC_VOID_OPENING_WINDOW_AUTHORITY_V1,
  });
}
