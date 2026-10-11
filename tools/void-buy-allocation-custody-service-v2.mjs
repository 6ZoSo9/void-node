import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  classifyBuyVoidAllocationReservationLedgerV1,
} from "../dist/economic/buy_void_allocation_reservation_ledger_v1.js";
import {
  classifyBuyVoidAllocationReservationHighWaterBindingV1,
} from "../dist/economic/buy_void_allocation_reservation_high_water_v1.js";
import {
  classifyBuyVoidVerifiedAllocationReplayBindingV1,
} from "../dist/economic/buy_void_verified_allocation_replay_binding_v1.js";
import {
  observeBuyVoidCustodyAllocationRootsReadOnlyV1,
} from "../src/economic/buy_void_custody_allocation_roots_observed_read_v1.mjs";
import {
  observeBuyVoidCustodyPaymentLedgersReadOnlyV1,
} from "../src/economic/buy_void_custody_payment_ledgers_observed_read_v1.mjs";
import {
  withBuyVoidCrossUidCapacityExclusiveLockV1,
} from "../src/economic/buy_void_cross_uid_capacity_exclusive_lock_v1.mjs";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_V2 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_V2";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_AUTHORITY_V2 =
  Object.freeze({
    source_only_service: true,
    unix_socket_only: true,
    server_controlled_socket_path: true,
    server_controlled_request_root: true,
    server_controlled_ledger_root: true,
    server_controlled_custody_root: true,
    exact_request_schema_required: true,
    exact_response_schema_required: true,
    canonical_allocation_planner_reused: false,
    canonical_high_water_binding_reused: true,
    canonical_verified_payment_replay_classifier_reused: true,
    descriptor_bound_payment_history_read: true,
    cross_uid_capacity_lock_primitive_reused: true,
    custody_cross_uid_lock_participation_source_bound: true,
    web_payment_writer_cross_uid_lock_participation_verified: false,
    allocation_handoff_atomicity_proven: false,
    canonical_publication_writer_reused: false,
    one_allocation_transition_per_reserve: false,
    verified_payment_provenance_descriptor_bound: true,
    verified_payment_provenance_independently_bound: false,
    payment_capacity_lock_verified: false,
    reserve_method_enabled: false,
    recovery_terminal_before_new_transition: false,
    caller_selected_path: false,
    caller_selected_generation: false,
    arbitrary_path_write: false,
    arbitrary_bytes_write: false,
    automatic_retry: false,
    service_started_by_import: false,
    service_install: false,
    systemd_mutation: false,
    mount_mutation: false,
    permission_policy_mutation: false,
    runtime_integration: false,
    payment_acceptance: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    inventory_funding: false,
    market_activation: false,
    public_presale_activation: false,
    treasury_or_liquidity_movement: false,
    funds_movement: false,
  });

const REQUEST_SCHEMA =
  "void_buy_void_allocation_custody_service_request_v2";
const RESPONSE_SCHEMA =
  "void_buy_void_allocation_custody_service_response_v2";
const MAX_REQUEST_BYTES = 64 * 1024;
const MAX_RESPONSE_BYTES = 64 * 1024;
const RESPONSE_TIMEOUT_MS = 5_000;

const ENVELOPE_KEYS = Object.freeze([
  "schema",
  "marker",
  "version",
  "method",
  "request",
]);

const RESERVE_KEYS = Object.freeze([
  "request_id",
  "source_chain",
  "payment_transaction_hash",
  "payment_log_index",
  "launch_authority",
  "buyer_delivery_wallet",
  "quote_void_amount",
  "quote_usdc_amount",
  "pool_void_total",
  "verified_payment_receipt_ref",
  "payment_verified_event_sha256",
  "duplicate_payment_guard_result",
  "inventory_allocation_guard_result",
  "operator_activation_record_ref",
  "created_at_ms",
  "verified_payment_gate_green",
  "duplicate_payment_guard_green",
  "inventory_allocation_guard_green",
  "operator_activation_record_green",
]);

const EMPTY_KEYS = Object.freeze([]);
const CAPACITY_LOCK_KEYS = Object.freeze([
  "shared_directory",
  "custody_uid",
  "web_uid",
  "shared_gid",
  "wait_timeout_ms",
  "poll_interval_ms",
]);

function fail(code) {
  throw new Error(code);
}

function directObject(value, keys, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(code);
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) fail(code);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const own = Reflect.ownKeys(descriptors);
  if (own.some((key) => typeof key !== "string")) fail(code);
  const actual = [...own].sort();
  const expected = [...keys].sort();
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
  if (value && typeof value === "object") {
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
        .join(",") +
      "}"
    );
  }
  fail("allocation_custody_service_noncanonical_value");
}

function sha256Id(value) {
  return (
    "sha256:" +
    crypto.createHash("sha256").update(value).digest("hex")
  );
}

function absolutePath(value, code) {
  const raw = String(value ?? "").trim();
  if (!raw || !path.isAbsolute(raw) || raw.includes("\0")) fail(code);
  const resolved = path.resolve(raw);
  if (resolved === path.parse(resolved).root) fail(code);
  return resolved;
}

function pathsOverlap(left, right) {
  return (
    left === right ||
    left.startsWith(right + path.sep) ||
    right.startsWith(left + path.sep)
  );
}

function boundedInteger(value, minimum, maximum, code) {
  const parsed = Number(value);
  if (
    !Number.isSafeInteger(parsed) ||
    parsed < minimum ||
    parsed > maximum
  ) {
    fail(code);
  }
  return parsed;
}

function assertNoSymlinkAncestors(target, code) {
  const resolved = path.resolve(target);
  const parsed = path.parse(resolved);
  let cursor = parsed.root;
  const relative = resolved.slice(parsed.root.length);
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, segment);
    const stat = fs.lstatSync(cursor);
    if (stat.isSymbolicLink()) fail(code);
  }
}

function assertDirectDirectory(
  directory,
  code,
  expectedMode = 0o700,
  expectedGid = null,
) {
  assertNoSymlinkAncestors(directory, code);
  const stat = fs.lstatSync(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink()) fail(code);
  if (
    typeof process.getuid === "function" &&
    stat.uid !== process.getuid()
  ) {
    fail(code);
  }
  if ((stat.mode & 0o777) !== expectedMode) fail(code);
  if (expectedGid !== null && stat.gid !== expectedGid) fail(code);
}

function held(reason, custodyLockParticipated = false) {
  const raw = String(reason || "allocation_custody_service_held").trim();
  const safe =
    /^[a-z][a-z0-9_]{2,179}$/u.test(raw) &&
    !/(?:0x)?[0-9a-fA-F]{48,}/u.test(raw)
      ? raw
      : "allocation_custody_service_held";
  return Object.freeze({
    ok: false,
    status: "held",
    reason: safe,
    record_id: null,
    allocation_record_hash: null,
    record_count: null,
    tip_hash: null,
    operation_performed: false,
    custody_cross_uid_lock_participation_verified:
      custodyLockParticipated === true,
    web_payment_writer_cross_uid_lock_participation_verified: false,
    payment_capacity_lock_verified: false,
    allocation_handoff_atomicity_proven: false,
    runtime_integration: false,
    payment_acceptance: false,
    transaction_broadcast: false,
    funds_movement: false,
  });
}

function success(status, summary, operationPerformed, record = null) {
  return Object.freeze({
    ok: true,
    status,
    record_id: record?.record_id ?? null,
    allocation_record_hash:
      record?.allocation_record_hash ?? null,
    record_count: summary.record_count,
    tip_hash: summary.tip_hash,
    operation_performed: operationPerformed,
    custody_cross_uid_lock_participation_verified: false,
    web_payment_writer_cross_uid_lock_participation_verified: false,
    payment_capacity_lock_verified: false,
    allocation_handoff_atomicity_proven: false,
    runtime_integration: false,
    payment_acceptance: false,
    transaction_broadcast: false,
    funds_movement: false,
  });
}

function normalizeCapacityLock(raw, socketGroupGid) {
  const value = directObject(
    raw,
    CAPACITY_LOCK_KEYS,
    "allocation_custody_service_capacity_lock_invalid",
  );
  const sharedDirectory = absolutePath(
    value.shared_directory,
    "allocation_custody_service_capacity_lock_path_invalid",
  );
  const custodyUid = boundedInteger(
    value.custody_uid,
    1,
    0x7fff_ffff,
    "allocation_custody_service_capacity_lock_custody_uid_invalid",
  );
  const webUid = boundedInteger(
    value.web_uid,
    1,
    0x7fff_ffff,
    "allocation_custody_service_capacity_lock_web_uid_invalid",
  );
  if (custodyUid === webUid) {
    fail("allocation_custody_service_capacity_lock_uids_not_distinct");
  }
  const sharedGid = boundedInteger(
    value.shared_gid,
    1,
    0x7fff_ffff,
    "allocation_custody_service_capacity_lock_gid_invalid",
  );
  if (sharedGid !== socketGroupGid) {
    fail("allocation_custody_service_capacity_lock_group_mismatch");
  }
  if (
    typeof process.getuid !== "function" ||
    process.getuid() !== custodyUid
  ) {
    fail("allocation_custody_service_capacity_lock_service_uid_mismatch");
  }
  const waitTimeoutMs = boundedInteger(
    value.wait_timeout_ms,
    50,
    120_000,
    "allocation_custody_service_capacity_lock_wait_timeout_invalid",
  );
  const pollIntervalMs = boundedInteger(
    value.poll_interval_ms,
    5,
    1_000,
    "allocation_custody_service_capacity_lock_poll_interval_invalid",
  );
  if (pollIntervalMs >= waitTimeoutMs) {
    fail("allocation_custody_service_capacity_lock_poll_not_bounded");
  }
  return Object.freeze({
    shared_directory: sharedDirectory,
    custody_uid: custodyUid,
    web_uid: webUid,
    shared_gid: sharedGid,
    wait_timeout_ms: waitTimeoutMs,
    poll_interval_ms: pollIntervalMs,
  });
}

function normalizeOptions(raw) {
  const value = directObject(
    raw,
    [
      "socket_path",
      "request_root",
      "ledger_root",
      "custody_root",
      "socket_group_gid",
      "capacity_lock",
    ],
    "allocation_custody_service_options_invalid",
  );
  const socketPath = absolutePath(
    value.socket_path,
    "allocation_custody_service_socket_path_invalid",
  );
  const requestRoot = absolutePath(
    value.request_root,
    "allocation_custody_service_request_root_invalid",
  );
  const ledgerRoot = absolutePath(
    value.ledger_root,
    "allocation_custody_service_ledger_root_invalid",
  );
  const custodyRoot = absolutePath(
    value.custody_root,
    "allocation_custody_service_custody_root_invalid",
  );
  const socketParent = path.dirname(socketPath);
  const socketGroupGid = boundedInteger(
    value.socket_group_gid,
    1,
    0x7fff_ffff,
    "allocation_custody_service_socket_group_invalid",
  );
  const capacityLock = normalizeCapacityLock(
    value.capacity_lock,
    socketGroupGid,
  );
  if (
    pathsOverlap(requestRoot, ledgerRoot) ||
    pathsOverlap(requestRoot, custodyRoot) ||
    pathsOverlap(ledgerRoot, custodyRoot) ||
    pathsOverlap(socketParent, requestRoot) ||
    pathsOverlap(socketParent, ledgerRoot) ||
    pathsOverlap(socketParent, custodyRoot) ||
    pathsOverlap(capacityLock.shared_directory, requestRoot) ||
    pathsOverlap(capacityLock.shared_directory, ledgerRoot) ||
    pathsOverlap(capacityLock.shared_directory, custodyRoot) ||
    pathsOverlap(capacityLock.shared_directory, socketParent)
  ) {
    fail("allocation_custody_service_paths_not_separated");
  }
  return Object.freeze({
    socket_path: socketPath,
    request_root: requestRoot,
    ledger_root: ledgerRoot,
    custody_root: custodyRoot,
    socket_group_gid: socketGroupGid,
    capacity_lock: capacityLock,
  });
}

function readAuthorityState(options) {
  // Reuse the existing paired descriptor observer rather than reopening
  // independent paths. These are server options, never request fields.
  // A stable read window is NOT a cross-root atomic snapshot or write lease.
  const observed = observeBuyVoidCustodyAllocationRootsReadOnlyV1({
    ledger_root: options.ledger_root,
    high_water_root: options.custody_root,
  });
  if (
    observed?.observed !== true ||
    observed.status !== "observed" ||
    observed.operation_performed !== false ||
    observed.filesystem_write !== false ||
    observed.cross_root_atomic_snapshot_proven !== false ||
    !Buffer.isBuffer(observed.allocation_jsonl) ||
    !Buffer.isBuffer(observed.allocation_high_water_bytes)
  ) {
    fail("allocation_custody_service_observation_unqualified");
  }
  const ledger = observed.allocation_jsonl;
  const highWater = observed.allocation_high_water_bytes;
  const ledgerDecision =
    classifyBuyVoidAllocationReservationLedgerV1(ledger);
  if (ledgerDecision.ok !== true) {
    fail(
      "allocation_custody_service_ledger_" +
        String(ledgerDecision.reason || "invalid"),
    );
  }
  const binding =
    classifyBuyVoidAllocationReservationHighWaterBindingV1({
      ledger_jsonl: ledger,
      high_water_json: highWater,
    });
  if (binding.ok !== true) {
    fail(
      "allocation_custody_service_high_water_" +
        String(binding.reason || "invalid"),
    );
  }
  return Object.freeze({
    ledger,
    high_water: highWater,
    record_count: ledgerDecision.record_count,
    tip_hash: ledgerDecision.tip_hash,
  });
}

function normalizeReserveRequest(raw) {
  return directObject(
    raw,
    RESERVE_KEYS,
    "allocation_custody_service_reserve_request_invalid",
  );
}

function normalizeEmptyRequest(raw) {
  return directObject(
    raw,
    EMPTY_KEYS,
    "allocation_custody_service_empty_request_invalid",
  );
}

function normalizeEnvelope(raw) {
  const envelope = directObject(
    raw,
    ENVELOPE_KEYS,
    "allocation_custody_service_request_invalid",
  );
  if (
    envelope.schema !== REQUEST_SCHEMA ||
    envelope.marker !== VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_V2 ||
    envelope.version !== 2 ||
    !["reserve", "recover", "inspect"].includes(envelope.method)
  ) {
    fail("allocation_custody_service_request_invalid");
  }
  const request =
    envelope.method === "reserve"
      ? normalizeReserveRequest(envelope.request)
      : normalizeEmptyRequest(envelope.request);
  return Object.freeze({
    schema: REQUEST_SCHEMA,
    marker: VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_V2,
    version: 2,
    method: envelope.method,
    request,
  });
}

function responseEnvelope(requestSha256, decision) {
  return Object.freeze({
    schema: RESPONSE_SCHEMA,
    marker: VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_V2,
    version: 2,
    request_sha256: requestSha256,
    decision,
  });
}

function readVerifiedPaymentAuthority(options, request, allocationState) {
  const observed = observeBuyVoidCustodyPaymentLedgersReadOnlyV1({
    request_dir: options.request_root,
  });
  if (
    observed?.observed !== true ||
    observed.cross_file_read_window_unchanged_proven !== true ||
    observed.filesystem_write !== false ||
    !Buffer.isBuffer(observed.requests_jsonl) ||
    !Buffer.isBuffer(observed.operator_events_jsonl)
  ) {
    fail("allocation_custody_service_payment_history_observation_unqualified");
  }

  const replay = classifyBuyVoidVerifiedAllocationReplayBindingV1({
    request_id: request.request_id,
    requests_jsonl: observed.requests_jsonl,
    operator_events_jsonl: observed.operator_events_jsonl,
    allocation_jsonl: allocationState.ledger,
  });
  const missing =
    replay?.status === "verified_allocation_missing" &&
    replay.reason === "verified_allocation_requires_protected_recovery";
  const present =
    replay?.ok === true &&
    replay.status === "allocation_present" &&
    replay.reason === null;
  if (
    (!missing && !present) ||
    replay.request_id !== request.request_id ||
    typeof replay.canonical_payment_identity !== "string" ||
    !/^sha256:[0-9a-f]{64}$/u.test(
      String(replay.payment_verified_event_sha256 || ""),
    )
  ) {
    fail("allocation_custody_service_verified_payment_provenance_invalid");
  }
  if (
    request.payment_verified_event_sha256 !==
    replay.payment_verified_event_sha256
  ) {
    fail("allocation_custody_service_caller_payment_event_digest_mismatch");
  }

  return Object.freeze({
    request_id: replay.request_id,
    canonical_payment_identity: replay.canonical_payment_identity,
    payment_verified_event_sha256: replay.payment_verified_event_sha256,
    allocation_present: present,
    descriptor_bound_payment_history_read: true,
    payment_capacity_lock_verified: false,
  });
}

async function withCustodyCrossUidCapacityLock(options, operation) {
  let locked;
  try {
    locked = await withBuyVoidCrossUidCapacityExclusiveLockV1(
      options.capacity_lock,
      async () => {
        // This V2 stage is strictly read-only. Convert all expected authority
        // read/validation failures to an explicit HOLD *inside* the callback
        // so the reviewed lock can release cleanly. Callback exceptions retain
        // the lock by design and are reserved for uncertain write-side failure.
        try {
          return await operation();
        } catch (error) {
          return held(
            error instanceof Error
              ? error.message
              : "allocation_custody_service_authority_read_held",
            true,
          );
        }
      },
    );
  } catch (error) {
    return held(
      error instanceof Error
        ? error.message
        : "allocation_custody_service_cross_uid_lock_held",
      false,
    );
  }

  if (
    locked?.ok !== true ||
    locked.status !== "completed" ||
    locked.participant_role !== "custody" ||
    locked.participant_uid !== options.capacity_lock.custody_uid ||
    locked.custody_uid !== options.capacity_lock.custody_uid ||
    locked.web_uid !== options.capacity_lock.web_uid ||
    locked.shared_gid !== options.capacity_lock.shared_gid ||
    locked.exclusive_critical_section_completed !== true ||
    locked.payment_event_write !== false ||
    locked.allocation_write !== false ||
    locked.production_runtime_mounted !== false ||
    locked.production_gate_ready !== false ||
    locked.presale_activation !== false ||
    locked.funds_movement !== false
  ) {
    return held(
      "allocation_custody_service_cross_uid_lock_result_unqualified",
      false,
    );
  }
  const decision = locked.result;
  if (
    !decision ||
    typeof decision !== "object" ||
    decision.custody_cross_uid_lock_participation_verified !== true ||
    decision.web_payment_writer_cross_uid_lock_participation_verified !== false ||
    decision.payment_capacity_lock_verified !== false ||
    decision.allocation_handoff_atomicity_proven !== false ||
    decision.operation_performed !== false
  ) {
    return held(
      "allocation_custody_service_cross_uid_lock_decision_unqualified",
      false,
    );
  }
  return decision;
}

async function recoverCore(options) {
  return withCustodyCrossUidCapacityLock(options, async () => {
    // Recovery still has no payment selector in this V2 source gate. The
    // protected allocation state is nevertheless read under the same kernel
    // serialization primitive that future web admission must join.
    readAuthorityState(options);
    return held(
      "allocation_custody_service_verified_payment_recovery_not_bound",
      true,
    );
  });
}

async function reserveCore(options, request) {
  return withCustodyCrossUidCapacityLock(options, async () => {
    // The caller supplies an identifier and claimed event digest, but neither
    // is payment authority. Observe and bind all durable authority while the
    // custody principal actually holds the reviewed cross-UID lock.
    const allocationState = readAuthorityState(options);
    readVerifiedPaymentAuthority(options, request, allocationState);

    // Custody participation is now source-bound, but the web payment writer
    // has not yet been composed into this kernel serialization domain. Keep
    // overall capacity verification and allocation mutation false.
    return held(
      "allocation_custody_service_web_payment_writer_cross_uid_lock_not_bound",
      true,
    );
  });
}

export async function handleVoidBuyAllocationCustodyServiceEnvelopeV2(
  rawOptions,
  rawEnvelope,
) {
  const options = normalizeOptions(rawOptions);
  let envelope;
  try {
    envelope = normalizeEnvelope(rawEnvelope);
  } catch (error) {
    const decision = held(
      error instanceof Error
        ? error.message
        : "allocation_custody_service_request_invalid",
    );
    return responseEnvelope(
      sha256Id(Buffer.from("invalid", "utf8")),
      decision,
    );
  }
  const requestSha256 = sha256Id(
    Buffer.from(canonicalJson(envelope), "utf8"),
  );
  try {
    let decision;
    if (envelope.method === "reserve") {
      decision = await reserveCore(options, envelope.request);
    } else if (envelope.method === "recover") {
      decision = await recoverCore(options);
    } else {
      const state = readAuthorityState(options);
      decision = success("inspected", state, false);
    }
    return responseEnvelope(requestSha256, decision);
  } catch (error) {
    return responseEnvelope(
      requestSha256,
      held(
        error instanceof Error
          ? error.message
          : "allocation_custody_service_held",
      ),
    );
  }
}

function writeResponse(socket, response, forceClose = false) {
  const line = JSON.stringify(response) + "\n";
  const afterFlush = forceClose ? () => socket.destroy() : undefined;
  if (Buffer.byteLength(line, "utf8") > MAX_RESPONSE_BYTES) {
    socket.end(
      JSON.stringify(
        responseEnvelope(
          sha256Id(Buffer.from("oversize", "utf8")),
          held("allocation_custody_service_response_too_large"),
        ),
      ) + "\n",
      afterFlush,
    );
    return;
  }
  socket.end(line, afterFlush);
}

export function createVoidBuyAllocationCustodyServiceV2(rawOptions) {
  const options = normalizeOptions(rawOptions);
  let server = null;
  let started = false;
  let queue = Promise.resolve();

  const enqueue = (operation) => {
    const run = queue.then(operation, operation);
    queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };

  async function start() {
    if (started) fail("allocation_custody_service_already_started");
    assertDirectDirectory(
      path.dirname(options.socket_path),
      "allocation_custody_service_socket_parent_invalid",
      0o750,
      options.socket_group_gid,
    );
    assertDirectDirectory(
      options.ledger_root,
      "allocation_custody_service_ledger_root_invalid",
      0o700,
    );
    assertDirectDirectory(
      options.custody_root,
      "allocation_custody_service_custody_root_invalid",
      0o700,
    );
    if (
      typeof process.getgroups === "function" &&
      !process.getgroups().includes(options.socket_group_gid)
    ) {
      fail("allocation_custody_service_socket_group_not_granted");
    }
    try {
      fs.lstatSync(options.socket_path);
      fail("allocation_custody_service_socket_path_exists");
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "allocation_custody_service_socket_path_exists"
      ) {
        throw error;
      }
      if (error?.code !== "ENOENT") throw error;
    }

    server = net.createServer({ allowHalfOpen: true }, (socket) => {
      socket.setEncoding("utf8");
      socket.setTimeout(RESPONSE_TIMEOUT_MS);
      let input = "";
      let handled = false;
      const finishHeld = (reason) => {
        if (handled || socket.destroyed) return;
        handled = true;
        clearTimeout(totalFramingDeadline);
        writeResponse(
          socket,
          responseEnvelope(
            sha256Id(Buffer.from("invalid", "utf8")),
            held(reason),
          ),
          // A client that has not sent EOF must not retain a half-open
          // server connection indefinitely after receiving a HOLD.
          !socket.readableEnded,
        );
      };
      // Socket#setTimeout is inactivity-only. A peer can otherwise drip
      // bytes forever without finishing a request or triggering it.
      const totalFramingDeadline = setTimeout(
        () => finishHeld("allocation_custody_service_request_deadline_exceeded"),
        RESPONSE_TIMEOUT_MS,
      );
      totalFramingDeadline.unref?.();
      socket.once("close", () => clearTimeout(totalFramingDeadline));
      socket.on("timeout", () => {
        finishHeld("allocation_custody_service_request_timeout");
      });
      socket.on("error", () => {});
      socket.on("data", (chunk) => {
        if (handled) return;
        input += chunk;
        if (Buffer.byteLength(input, "utf8") > MAX_REQUEST_BYTES) {
          finishHeld("allocation_custody_service_request_too_large");
        }
      });
      socket.on("end", () => {
        if (handled) return;
        clearTimeout(totalFramingDeadline);
        const newline = input.indexOf("\n");
        if (newline < 0) {
          finishHeld("allocation_custody_service_request_unterminated");
          return;
        }
        if (newline !== input.length - 1) {
          finishHeld("allocation_custody_service_multiple_requests_rejected");
          return;
        }
        const wireJson = input.slice(0, newline);
        handled = true;
        // A stream's first newline is not proof that a later chunk cannot
        // contain a second request. Admit nothing until peer write EOF.
        enqueue(async () => {
          let parsed;
          try {
            parsed = JSON.parse(wireJson);
          } catch {
            return responseEnvelope(
              sha256Id(Buffer.from("invalid", "utf8")),
              held("allocation_custody_service_request_json_invalid"),
            );
          }
          let envelope;
          try {
            envelope = normalizeEnvelope(parsed);
          } catch {
            // Retain the existing exact-schema HOLD codes.
            return handleVoidBuyAllocationCustodyServiceEnvelopeV2(
              options,
              parsed,
            );
          }
          // JSON.parse silently accepts duplicate object keys. Require
          // the exact canonical byte representation before any reserve.
          if (wireJson !== canonicalJson(envelope)) {
            return responseEnvelope(
              sha256Id(Buffer.from("invalid", "utf8")),
              held("allocation_custody_service_request_noncanonical"),
            );
          }
          return handleVoidBuyAllocationCustodyServiceEnvelopeV2(
            options,
            envelope,
          );
        }).then(
          (response) => {
            if (!socket.destroyed) writeResponse(socket, response);
          },
          () => {
            if (!socket.destroyed) {
              writeResponse(
                socket,
                responseEnvelope(
                  sha256Id(Buffer.from("invalid", "utf8")),
                  held("allocation_custody_service_request_failed"),
                ),
              );
            }
          },
        );
      });
    });

    await new Promise((resolve, reject) => {
      const onError = (error) => {
        server?.off("listening", onListening);
        reject(error);
      };
      const onListening = () => {
        server?.off("error", onError);
        resolve();
      };
      server.once("error", onError);
      server.once("listening", onListening);
      server.listen(options.socket_path);
    });

    try {
      fs.chmodSync(options.socket_path, 0o660);
      if (typeof process.getuid === "function") {
        fs.chownSync(
          options.socket_path,
          process.getuid(),
          options.socket_group_gid,
        );
      }
      const stat = fs.lstatSync(options.socket_path);
      if (
        !stat.isSocket() ||
        stat.isSymbolicLink() ||
        (stat.mode & 0o777) !== 0o660 ||
        stat.gid !== options.socket_group_gid
      ) {
        fail("allocation_custody_service_socket_postcheck_failed");
      }
    } catch (error) {
      await new Promise((resolve) => server?.close(() => resolve()));
      server = null;
      try {
        fs.unlinkSync(options.socket_path);
      } catch (cleanupError) {
        if (cleanupError?.code !== "ENOENT") throw cleanupError;
      }
      throw error;
    }

    started = true;
    return Object.freeze({
      socket_path: options.socket_path,
      request_root: options.request_root,
      ledger_root: options.ledger_root,
      custody_root: options.custody_root,
      capacity_lock_shared_directory:
        options.capacity_lock.shared_directory,
      custody_cross_uid_lock_participation_source_bound: true,
      web_payment_writer_cross_uid_lock_participation_verified: false,
      payment_capacity_lock_verified: false,
      allocation_handoff_atomicity_proven: false,
      runtime_integration: false,
      payment_acceptance: false,
      transaction_broadcast: false,
      funds_movement: false,
    });
  }

  async function stop() {
    if (!server) return;
    await new Promise((resolve) => server.close(() => resolve()));
    server = null;
    started = false;
    try {
      const stat = fs.lstatSync(options.socket_path);
      if (!stat.isSocket() || stat.isSymbolicLink()) {
        fail("allocation_custody_service_stop_socket_invalid");
      }
      fs.unlinkSync(options.socket_path);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }

  return Object.freeze({
    start,
    stop,
    authority: VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_AUTHORITY_V2,
  });
}

async function main() {
  const raw = process.env.VOID_ALLOCATION_CUSTODY_SERVICE_V2_CONFIG_JSON;
  if (!raw) fail("allocation_custody_service_config_env_required");
  let config;
  try {
    config = JSON.parse(raw);
  } catch {
    fail("allocation_custody_service_config_json_invalid");
  }
  const service = createVoidBuyAllocationCustodyServiceV2(config);
  await service.start();
  process.stdout.write(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_V2 + "_STARTED\n",
  );
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    await service.stop();
    process.exitCode = 0;
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}

const invokedAsScript =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (invokedAsScript) {
  main().catch((error) => {
    console.error(
      VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_V2 +
        ": " +
        String(error?.message || error),
    );
    process.exitCode = 1;
  });
}

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_CONTRACT_V2 =
  Object.freeze({
    schema: "void_buy_void_allocation_custody_service_contract_v2",
    marker: "VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_CONTRACT_V2",
    version: 2,
    exact_request_schema: true,
    exact_response_schema: true,
    server_controlled_request_root: true,
    descriptor_bound_payment_provenance: true,
    cross_uid_capacity_lock_primitive_reused: true,
    custody_cross_uid_lock_participation_source_bound: true,
    web_payment_writer_cross_uid_lock_participation_verified: false,
    payment_capacity_lock_verified: false,
    allocation_handoff_atomicity_proven: false,
    max_request_bytes: MAX_REQUEST_BYTES,
    max_response_bytes: MAX_RESPONSE_BYTES,
    response_timeout_ms: RESPONSE_TIMEOUT_MS,
    arbitrary_path_write: false,
    arbitrary_bytes_write: false,
    caller_selected_generation: false,
    automatic_retry: false,
    runtime_integration: false,
    payment_acceptance: false,
    wallet_or_signer_access: false,
    transaction_broadcast: false,
    chain2050_write: false,
    funds_movement: false,
  });
