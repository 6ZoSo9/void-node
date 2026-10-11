import { types as utilTypes } from "node:util";

import {
  VOID_BUY_VOID_ALLOCATION_HIGH_WATER_ROOT_V1,
  VOID_BUY_VOID_ALLOCATION_LEDGER_ROOT_V1,
  planBuyVoidOperatorAllocationDispatchV1,
} from "../../dist/economic/buy_void_operator_verified_allocation_dispatch_v1.js";

const CAPACITY_KEYS = Object.freeze([
  "shared_directory",
  "custody_uid",
  "web_uid",
  "shared_gid",
  "wait_timeout_ms",
  "poll_interval_ms",
]);
const WRITER_KEYS = Object.freeze([
  "event",
  "request",
  "request_dir",
  "with_launch_authority_mutation",
  "read_sale_state",
]);
const JSON_STRINGIFY = JSON.stringify;

function fail(code) {
  throw new Error(code);
}

function ownRecord(input, keys, code) {
  if (!input || typeof input !== "object" || utilTypes.isProxy(input) ||
      Array.isArray(input)) fail(code);
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) fail(code);
  const fields = Reflect.ownKeys(input);
  if (fields.length !== keys.length ||
      fields.some(key => typeof key !== "string" || !keys.includes(key))) {
    fail(code);
  }
  const output = Object.create(null);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !Object.hasOwn(descriptor, "value") ||
        descriptor.enumerable !== true) fail(code);
    Object.defineProperty(output, key, {
      value: descriptor.value,
      enumerable: true,
      writable: false,
      configurable: false,
    });
  }
  return Object.freeze(output);
}

function frozenRecord(entries) {
  const output = Object.create(null);
  for (const [key, value] of entries) {
    Object.defineProperty(output, key, {
      value,
      enumerable: true,
      writable: false,
      configurable: false,
    });
  }
  return Object.freeze(output);
}

function absoluteNonroot(value) {
  return typeof value === "string" && value.length > 1 &&
    value.startsWith("/") && !value.includes("\0") &&
    !value.includes("//") && !value.endsWith("/") &&
    !value.split("/").includes(".") && !value.split("/").includes("..");
}

function safeNonrootUid(value) {
  return Number.isSafeInteger(value) && value >= 1 && value <= 0x7fff_ffff;
}

export function checkedWebCrossUidCapacityConfigV1(input) {
  const value = ownRecord(
    input,
    CAPACITY_KEYS,
    "buy_void_web_cross_uid_lock_server_config_invalid",
  );
  if (!absoluteNonroot(value.shared_directory) ||
      !safeNonrootUid(value.custody_uid) ||
      !safeNonrootUid(value.web_uid) ||
      value.web_uid === value.custody_uid ||
      !safeNonrootUid(value.shared_gid) ||
      !Number.isSafeInteger(value.wait_timeout_ms) ||
      value.wait_timeout_ms < 50 || value.wait_timeout_ms > 120000 ||
      !Number.isSafeInteger(value.poll_interval_ms) ||
      value.poll_interval_ms < 5 ||
      value.poll_interval_ms >= value.wait_timeout_ms ||
      value.poll_interval_ms > 1000) {
    fail("buy_void_web_cross_uid_lock_config_unqualified");
  }
  if (process.platform !== "linux" ||
      typeof process.getuid !== "function" ||
      process.getuid() !== value.web_uid) {
    fail("buy_void_web_cross_uid_lock_web_principal_required");
  }
  return value;
}

export function checkedVerifiedPaymentDispatchPlanV1(input) {
  const value = ownRecord(
    input,
    WRITER_KEYS,
    "buy_void_web_cross_uid_writer_input_invalid",
  );
  if (!absoluteNonroot(value.request_dir) ||
      typeof value.with_launch_authority_mutation !== "function" ||
      utilTypes.isProxy(value.with_launch_authority_mutation) ||
      typeof value.read_sale_state !== "function" ||
      utilTypes.isProxy(value.read_sale_state)) {
    fail("buy_void_web_cross_uid_writer_server_inputs_unqualified");
  }

  // The merged planner synchronously validates and detaches event/request into
  // bounded frozen JSON before the caller can perform its first await.
  const plan = planBuyVoidOperatorAllocationDispatchV1({
    event: value.event,
    request: value.request,
    request_dir: value.request_dir,
    allocation_ledger_root: VOID_BUY_VOID_ALLOCATION_LEDGER_ROOT_V1,
    allocation_high_water_root: VOID_BUY_VOID_ALLOCATION_HIGH_WATER_ROOT_V1,
    with_launch_authority_mutation: value.with_launch_authority_mutation,
    read_sale_state: value.read_sale_state,
  });
  if (!plan || plan.kind !== "verified_payment_allocation_handoff" ||
      plan.allocation_ledger_root !== VOID_BUY_VOID_ALLOCATION_LEDGER_ROOT_V1 ||
      plan.allocation_high_water_root !==
        VOID_BUY_VOID_ALLOCATION_HIGH_WATER_ROOT_V1) {
    fail("buy_void_web_cross_uid_verified_payment_allocation_plan_required");
  }
  const eventJson = JSON_STRINGIFY(plan.event);
  const requestJson = JSON_STRINGIFY(plan.request);
  if (typeof eventJson !== "string" || typeof requestJson !== "string") {
    fail("buy_void_web_cross_uid_dispatch_snapshot_invalid");
  }
  return Object.freeze({
    dispatch_input: frozenRecord([
      ["event", plan.event],
      ["request", plan.request],
      ["request_dir", plan.request_dir],
      ["allocation_ledger_root", plan.allocation_ledger_root],
      ["allocation_high_water_root", plan.allocation_high_water_root],
      ["with_launch_authority_mutation", plan.with_launch_authority_mutation],
      ["read_sale_state", plan.read_sale_state],
    ]),
    event_json: eventJson,
    request_json: requestJson,
  });
}

export function exactWebCrossUidWriterInputV1(input) {
  return ownRecord(
    input,
    Object.freeze(["capacity_lock", "writer_input"]),
    "buy_void_web_cross_uid_input_invalid",
  );
}
