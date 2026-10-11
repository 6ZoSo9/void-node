import { types as utilTypes } from "node:util";

import {
  VOID_BUY_VOID_CROSS_UID_CAPACITY_EXCLUSIVE_LOCK_V1,
  withBuyVoidCrossUidCapacityExclusiveLockV1,
} from "./buy_void_cross_uid_capacity_exclusive_lock_v1.mjs";
import {
  writeBuyVoidOperatorEventWithCapacityAdmissionV1,
} from "../../dist/economic/buy_void_verified_payment_capacity_admission_v1.js";

// UNMOUNTED source-only composition candidate. Do not install into a public
// route or call from a live payment process until host identity, payment
// provenance, allocation recovery and independent deployment are qualified.
export const VOID_BUY_VOID_WEB_PAYMENT_CROSS_UID_LOCK_WRITER_V1 =
  "VOID_BUY_VOID_WEB_PAYMENT_CROSS_UID_LOCK_WRITER_V1";

export const VOID_BUY_VOID_WEB_PAYMENT_CROSS_UID_LOCK_WRITER_AUTHORITY_V1 =
  Object.freeze({
    source_only_unmounted: true,
    exact_web_uid_required: true,
    canonical_cross_uid_capacity_exclusive_lock_reused: true,
    canonical_verified_payment_writer_reused: true,
    status_payment_verified_only: true,
    writer_called_only_while_lock_held: true,
    callback_failure_retains_lock: true,
    public_http_handler_installed: false,
    production_web_writer_cross_uid_participation_verified: false,
    payment_capacity_lock_verified: false,
    allocation_handoff_atomicity_proven: false,
    custody_reserve_recover_enabled: false,
    deployed_artifact_generation_verified: false,
    runtime_integration: false,
    payment_acceptance: false,
    presale_activation: false,
    wallet_or_signer_access: false,
    transaction_broadcast: false,
    funds_movement: false,
  });

const CAPACITY_KEYS = Object.freeze([
  "shared_directory",
  "custody_uid",
  "web_uid",
  "shared_gid",
  "wait_timeout_ms",
  "poll_interval_ms",
]);
const INPUT_KEYS = Object.freeze(["capacity_lock", "writer_input"]);
const WRITER_KEYS = Object.freeze([
  "event",
  "request",
  "request_dir",
  "with_launch_authority_mutation",
  "read_sale_state",
]);
const REQUEST_ID = /^buyvoid_[a-z0-9]+_[0-9a-f]{8}$/u;

function fail(code) {
  throw new Error(code);
}

function ownRecord(input, keys, code) {
  if (!input || typeof input !== "object" || Array.isArray(input) ||
      utilTypes.isProxy(input)) {
    fail(code);
  }
  const proto = Object.getPrototypeOf(input);
  if (proto !== Object.prototype && proto !== null) fail(code);
  const fields = Reflect.ownKeys(input);
  if (fields.length !== keys.length ||
      fields.some(key => typeof key !== "string" || !keys.includes(key))) {
    fail(code);
  }
  const record = Object.create(null);
  for (const key of keys) {
    const desc = Object.getOwnPropertyDescriptor(input, key);
    if (!desc || !Object.hasOwn(desc, "value")) fail(code);
    Object.defineProperty(record, key, {
      value: desc.value,
      writable: false,
      configurable: false,
      enumerable: true,
    });
  }
  return Object.freeze(record);
}

function primitiveOwn(value, name, code) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      utilTypes.isProxy(value)) {
    fail(code);
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) fail(code);
  const desc = Object.getOwnPropertyDescriptor(value, name);
  if (!desc || !Object.hasOwn(desc, "value")) fail(code);
  return desc.value;
}

function validAbsoluteNonroot(value) {
  return typeof value === "string" && value.length > 1 &&
    value.startsWith("/") && !value.includes("\0") &&
    !value.includes("//") && !value.endsWith("/") &&
    !value.split("/").includes(".") && !value.split("/").includes("..");
}

function safeNonrootUid(value) {
  return Number.isSafeInteger(value) && value >= 1 && value <= 0x7fff_ffff;
}

function checkedCapacityLock(input) {
  const value = ownRecord(
    input,
    CAPACITY_KEYS,
    "buy_void_web_cross_uid_lock_server_config_invalid",
  );
  if (!validAbsoluteNonroot(value.shared_directory) ||
      !safeNonrootUid(value.custody_uid) ||
      !safeNonrootUid(value.web_uid) ||
      value.web_uid === value.custody_uid ||
      !safeNonrootUid(value.shared_gid) ||
      !Number.isSafeInteger(value.wait_timeout_ms) ||
      value.wait_timeout_ms < 50 || value.wait_timeout_ms > 120000 ||
      !Number.isSafeInteger(value.poll_interval_ms) ||
      value.poll_interval_ms < 5 || value.poll_interval_ms >= value.wait_timeout_ms ||
      value.poll_interval_ms > 1000) {
    fail("buy_void_web_cross_uid_lock_config_unqualified");
  }
  // This function executes in the WEB principal only, never custody UID or
  // an unrelated account. The underlying lock independently verifies group,
  // directory inode, kernel file ownership and process incarnation.
  if (process.platform !== "linux" ||
      typeof process.getuid !== "function" ||
      process.getuid() !== value.web_uid) {
    fail("buy_void_web_cross_uid_lock_web_principal_required");
  }
  return value;
}

function checkedPaymentWriterInput(input) {
  const value = ownRecord(
    input,
    WRITER_KEYS,
    "buy_void_web_cross_uid_writer_input_invalid",
  );
  const status = primitiveOwn(
    value.event,
    "operator_status",
    "buy_void_web_cross_uid_writer_event_invalid",
  );
  const eventRequestId = primitiveOwn(
    value.event,
    "request_id",
    "buy_void_web_cross_uid_writer_request_id_invalid",
  );
  const requestId = primitiveOwn(
    value.request,
    "request_id",
    "buy_void_web_cross_uid_writer_request_id_invalid",
  );
  if (status !== "payment_verified") {
    fail("buy_void_web_cross_uid_only_verified_payment_allowed");
  }
  if (typeof eventRequestId !== "string" ||
      !REQUEST_ID.test(eventRequestId) || eventRequestId !== requestId ||
      !validAbsoluteNonroot(value.request_dir) ||
      typeof value.with_launch_authority_mutation !== "function" ||
      typeof value.read_sale_state !== "function") {
    fail("buy_void_web_cross_uid_writer_request_unqualified");
  }
  // The existing canonical writer still independently proves original
  // request/payment identity, finite capacity and real durable append/fsync.
  return value;
}

export async function writeBuyVoidPaymentUnderCrossUidLockCandidateV1(raw) {
  const input = ownRecord(
    raw,
    INPUT_KEYS,
    "buy_void_web_cross_uid_input_invalid",
  );
  // All caller-selected object checks precede acquiring a kernel lock.
  const config = checkedCapacityLock(input.capacity_lock);
  const writerInput = checkedPaymentWriterInput(input.writer_input);

  // Lock order: cross-UID kernel capacity lock OUTERMOST, followed inside
  // by the existing bakery/launch/request locks and durable payment writer.
  // An exception or uncertain append causes the lock primitive to retain
  // its claim; do not catch and replace callback errors with benign HOLDs.
  const locked = await withBuyVoidCrossUidCapacityExclusiveLockV1(
    config,
    async () => {
      const result = await writeBuyVoidOperatorEventWithCapacityAdmissionV1(
        writerInput,
      );
      if (!result || result.ok !== true) {
        fail("buy_void_web_cross_uid_writer_result_unqualified");
      }
      return result;
    },
  );
  if (!locked || locked.ok !== true ||
      locked.marker !== VOID_BUY_VOID_CROSS_UID_CAPACITY_EXCLUSIVE_LOCK_V1 ||
      locked.status !== "completed" ||
      locked.participant_role !== "web" ||
      locked.participant_uid !== config.web_uid ||
      locked.web_uid !== config.web_uid ||
      locked.custody_uid !== config.custody_uid ||
      locked.shared_gid !== config.shared_gid ||
      locked.exclusive_critical_section_completed !== true ||
      locked.lock_release_fsynced !== true ||
      locked.callback_failure_retains_lock !== true ||
      locked.result?.ok !== true) {
    fail("buy_void_web_cross_uid_writer_lock_result_unqualified");
  }
  return Object.freeze({
    marker: VOID_BUY_VOID_WEB_PAYMENT_CROSS_UID_LOCK_WRITER_V1,
    status: "source_candidate_only",
    writer_result: locked.result,
    web_writer_cross_uid_lock_source_bound: true,
    canonical_verified_payment_writer_source_bound: true,
    custody_service_joint_handoff_proven: false,
    payment_capacity_lock_verified: false,
    allocation_handoff_atomicity_proven: false,
    deployed_artifact_generation_verified: false,
    runtime_integration: false,
    payment_acceptance: false,
    presale_activation: false,
    funds_movement: false,
  });
}
