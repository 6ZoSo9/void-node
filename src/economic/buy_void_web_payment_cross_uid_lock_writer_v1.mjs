import { Buffer } from "node:buffer";
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
    event_and_request_detached_before_lock_wait: true,
    admitted_json_bytes_rechecked_inside_lock: true,
    caller_owned_mutation_cannot_redirect_writer: true,
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

// The wrapper snapshots only payment/request JSON data, not arbitrary runtime
// objects. These bounds fail closed before a contended kernel-lock wait.
const SNAPSHOT_MAX_DEPTH = 32;
const SNAPSHOT_MAX_NODES = 8192;
const SNAPSHOT_MAX_KEYS = 16384;
const SNAPSHOT_MAX_ARRAY_ITEMS = 8192;
const SNAPSHOT_MAX_TEXT_CODE_UNITS = 1024 * 1024;
const SNAPSHOT_MAX_JSON_BYTES = 4 * 1024 * 1024;
const JSON_STRINGIFY = JSON.stringify;
const BUFFER_BYTE_LENGTH = Buffer.byteLength;

function fail(code) {
  throw new Error(code);
}

function ownRecord(input, keys, code) {
  if (!input || typeof input !== "object" || utilTypes.isProxy(input) ||
      Array.isArray(input)) {
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

function frozenRecord(entries) {
  const record = Object.create(null);
  for (const [key, value] of entries) {
    Object.defineProperty(record, key, {
      value,
      writable: false,
      configurable: false,
      enumerable: true,
    });
  }
  return Object.freeze(record);
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

function jsonStringByteLength(value) {
  let bytes = 2;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code === 0x22 || code === 0x5c || code === 0x08 ||
        code === 0x09 || code === 0x0a || code === 0x0c || code === 0x0d) {
      bytes += 2;
      continue;
    }
    if (code <= 0x1f) {
      bytes += 6;
      continue;
    }
    if (code <= 0x7f) {
      bytes += 1;
      continue;
    }
    if (code <= 0x7ff) {
      bytes += 2;
      continue;
    }
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = index + 1 < value.length ? value.charCodeAt(index + 1) : -1;
      if (next >= 0xdc00 && next <= 0xdfff) {
        bytes += 4;
        index += 1;
      } else {
        bytes += 6;
      }
      continue;
    }
    if (code >= 0xdc00 && code <= 0xdfff) {
      bytes += 6;
      continue;
    }
    bytes += 3;
  }
  return bytes;
}

function addSnapshotBytes(budget, bytes, code) {
  if (!Number.isSafeInteger(bytes) || bytes < 0) fail(code);
  budget.bytes += bytes;
  if (!Number.isSafeInteger(budget.bytes) ||
      budget.bytes > SNAPSHOT_MAX_JSON_BYTES) {
    fail("buy_void_web_cross_uid_writer_snapshot_size_exceeded");
  }
}

function inheritedToJsonPresent(prototype) {
  for (let current = prototype; current !== null;
       current = Object.getPrototypeOf(current)) {
    if (Object.getOwnPropertyDescriptor(current, "toJSON")) return true;
  }
  return false;
}

function detachedJsonValue(value, budget, ancestors, depth) {
  if (depth > SNAPSHOT_MAX_DEPTH) {
    fail("buy_void_web_cross_uid_writer_snapshot_depth_exceeded");
  }
  budget.nodes += 1;
  if (budget.nodes > SNAPSHOT_MAX_NODES) {
    fail("buy_void_web_cross_uid_writer_snapshot_node_count_exceeded");
  }

  if (value === null) {
    addSnapshotBytes(budget, 4, "buy_void_web_cross_uid_writer_snapshot_invalid");
    return null;
  }
  if (typeof value === "boolean") {
    addSnapshotBytes(
      budget,
      value ? 4 : 5,
      "buy_void_web_cross_uid_writer_snapshot_invalid",
    );
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      fail("buy_void_web_cross_uid_writer_snapshot_number_invalid");
    }
    const encoded = Object.is(value, -0) ? "0" : String(value);
    addSnapshotBytes(
      budget,
      encoded.length,
      "buy_void_web_cross_uid_writer_snapshot_invalid",
    );
    return value;
  }
  if (typeof value === "string") {
    if (value.length > SNAPSHOT_MAX_TEXT_CODE_UNITS) {
      fail("buy_void_web_cross_uid_writer_snapshot_text_size_exceeded");
    }
    addSnapshotBytes(
      budget,
      jsonStringByteLength(value),
      "buy_void_web_cross_uid_writer_snapshot_invalid",
    );
    return value;
  }
  if (!value || typeof value !== "object") {
    fail("buy_void_web_cross_uid_writer_snapshot_value_unsupported");
  }
  if (utilTypes.isProxy(value)) {
    fail("buy_void_web_cross_uid_writer_snapshot_proxy_forbidden");
  }
  if (ancestors.has(value)) {
    fail("buy_void_web_cross_uid_writer_snapshot_cycle_forbidden");
  }

  const prototype = Object.getPrototypeOf(value);
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      if (prototype !== Array.prototype || inheritedToJsonPresent(prototype)) {
        fail("buy_void_web_cross_uid_writer_snapshot_array_invalid");
      }
      const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
      const length = lengthDescriptor?.value;
      if (!lengthDescriptor || !Object.hasOwn(lengthDescriptor, "value") ||
          !Number.isSafeInteger(length) || length < 0 ||
          length > SNAPSHOT_MAX_ARRAY_ITEMS) {
        fail("buy_void_web_cross_uid_writer_snapshot_array_invalid");
      }
      const ownKeys = Reflect.ownKeys(value);
      if (ownKeys.length !== length + 1) {
        fail("buy_void_web_cross_uid_writer_snapshot_array_shape_invalid");
      }
      addSnapshotBytes(
        budget,
        2 + Math.max(0, length - 1),
        "buy_void_web_cross_uid_writer_snapshot_invalid",
      );
      const clone = [];
      Object.defineProperty(clone, "toJSON", {
        value: undefined,
        enumerable: false,
        writable: false,
        configurable: false,
      });
      for (let index = 0; index < length; index += 1) {
        const key = String(index);
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor || !Object.hasOwn(descriptor, "value") ||
            descriptor.enumerable !== true) {
          fail("buy_void_web_cross_uid_writer_snapshot_accessor_forbidden");
        }
        Object.defineProperty(clone, key, {
          value: detachedJsonValue(
            descriptor.value,
            budget,
            ancestors,
            depth + 1,
          ),
          enumerable: true,
          writable: false,
          configurable: false,
        });
      }
      return Object.freeze(clone);
    }

    if ((prototype !== Object.prototype && prototype !== null) ||
        inheritedToJsonPresent(prototype)) {
      fail("buy_void_web_cross_uid_writer_snapshot_nonplain_object");
    }
    const ownKeys = Reflect.ownKeys(value);
    const clone = Object.create(null);
    let localKeys = 0;
    addSnapshotBytes(
      budget,
      2,
      "buy_void_web_cross_uid_writer_snapshot_invalid",
    );
    for (const key of ownKeys) {
      if (typeof key !== "string" || key === "toJSON") {
        fail("buy_void_web_cross_uid_writer_snapshot_key_invalid");
      }
      if (key.length > SNAPSHOT_MAX_TEXT_CODE_UNITS) {
        fail("buy_void_web_cross_uid_writer_snapshot_text_size_exceeded");
      }
      localKeys += 1;
      budget.keys += 1;
      if (localKeys > SNAPSHOT_MAX_KEYS || budget.keys > SNAPSHOT_MAX_KEYS) {
        fail("buy_void_web_cross_uid_writer_snapshot_key_count_exceeded");
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !Object.hasOwn(descriptor, "value") ||
          descriptor.enumerable !== true) {
        fail("buy_void_web_cross_uid_writer_snapshot_accessor_forbidden");
      }
      if (localKeys > 1) {
        addSnapshotBytes(
          budget,
          1,
          "buy_void_web_cross_uid_writer_snapshot_invalid",
        );
      }
      addSnapshotBytes(
        budget,
        jsonStringByteLength(key) + 1,
        "buy_void_web_cross_uid_writer_snapshot_invalid",
      );
      Object.defineProperty(clone, key, {
        value: detachedJsonValue(
          descriptor.value,
          budget,
          ancestors,
          depth + 1,
        ),
        enumerable: true,
        writable: false,
        configurable: false,
      });
    }
    return Object.freeze(clone);
  } finally {
    ancestors.delete(value);
  }
}

function detachedJsonRecord(value, budget, code) {
  const before = budget.bytes;
  const detached = detachedJsonValue(
    value,
    budget,
    new WeakSet(),
    0,
  );
  if (!detached || typeof detached !== "object" || Array.isArray(detached)) {
    fail(code);
  }
  let json;
  try {
    json = JSON_STRINGIFY(detached);
  } catch {
    fail(code);
  }
  if (typeof json !== "string" ||
      BUFFER_BYTE_LENGTH(json, "utf8") !== budget.bytes - before ||
      JSON_STRINGIFY(detached) !== json) {
    fail("buy_void_web_cross_uid_writer_snapshot_serialization_mismatch");
  }
  return Object.freeze({ value: detached, json });
}

function checkedPaymentWriterInput(input) {
  const value = ownRecord(
    input,
    WRITER_KEYS,
    "buy_void_web_cross_uid_writer_input_invalid",
  );
  const budget = { bytes: 0, nodes: 0, keys: 0 };
  const eventSnapshot = detachedJsonRecord(
    value.event,
    budget,
    "buy_void_web_cross_uid_writer_event_invalid",
  );
  const requestSnapshot = detachedJsonRecord(
    value.request,
    budget,
    "buy_void_web_cross_uid_writer_request_invalid",
  );

  // These checks run synchronously against the detached immutable snapshots.
  // No caller-owned object survives into the awaited lock acquisition.
  const status = eventSnapshot.value.operator_status;
  const eventRequestId = eventSnapshot.value.request_id;
  const requestId = requestSnapshot.value.request_id;
  if (status !== "payment_verified") {
    fail("buy_void_web_cross_uid_only_verified_payment_allowed");
  }
  if (typeof eventRequestId !== "string" ||
      !REQUEST_ID.test(eventRequestId) || eventRequestId !== requestId ||
      !validAbsoluteNonroot(value.request_dir) ||
      typeof value.with_launch_authority_mutation !== "function" ||
      utilTypes.isProxy(value.with_launch_authority_mutation) ||
      typeof value.read_sale_state !== "function" ||
      utilTypes.isProxy(value.read_sale_state)) {
    fail("buy_void_web_cross_uid_writer_request_unqualified");
  }

  const writerInput = frozenRecord([
    ["event", eventSnapshot.value],
    ["request", requestSnapshot.value],
    ["request_dir", value.request_dir],
    ["with_launch_authority_mutation", value.with_launch_authority_mutation],
    ["read_sale_state", value.read_sale_state],
  ]);
  return Object.freeze({
    writer_input: writerInput,
    event_json: eventSnapshot.json,
    request_json: requestSnapshot.json,
  });
}

export async function writeBuyVoidPaymentUnderCrossUidLockCandidateV1(raw) {
  const input = ownRecord(
    raw,
    INPUT_KEYS,
    "buy_void_web_cross_uid_input_invalid",
  );
  // All caller-selected object checks and immutable snapshots precede waiting
  // for the kernel lock. Mutating the original event/request afterward cannot
  // change the exact values delivered to the canonical writer.
  const config = checkedCapacityLock(input.capacity_lock);
  const checkedWriter = checkedPaymentWriterInput(input.writer_input);
  const writerInput = checkedWriter.writer_input;

  // Lock order: cross-UID kernel capacity lock OUTERMOST, followed inside
  // by the existing bakery/launch/request locks and durable payment writer.
  // An exception or uncertain append causes the lock primitive to retain
  // its claim; do not catch and replace callback errors with benign HOLDs.
  const locked = await withBuyVoidCrossUidCapacityExclusiveLockV1(
    config,
    async () => {
      if (JSON_STRINGIFY(writerInput.event) !== checkedWriter.event_json ||
          JSON_STRINGIFY(writerInput.request) !== checkedWriter.request_json) {
        fail("buy_void_web_cross_uid_writer_snapshot_changed");
      }
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
    immutable_writer_input_snapshot: true,
    caller_owned_mutation_after_admission_blocked: true,
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
