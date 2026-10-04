import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  classifyBuyVoidAllocationReservationLedgerV1,
  planBuyVoidAllocationReservationV1,
} from "../dist/economic/buy_void_allocation_reservation_ledger_v1.js";
import {
  classifyBuyVoidAllocationReservationHighWaterBindingV1,
} from "../dist/economic/buy_void_allocation_reservation_high_water_v1.js";
import {
  persistBuyVoidAllocationReservationPublicationWriterV1,
  recoverBuyVoidAllocationReservationPublicationWriterV1,
} from "../dist/economic/buy_void_allocation_reservation_publication_writer_v1.js";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_V1 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_V1";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_AUTHORITY_V1 =
  Object.freeze({
    source_only_service: true,
    unix_socket_only: true,
    server_controlled_socket_path: true,
    server_controlled_ledger_root: true,
    server_controlled_custody_root: true,
    exact_request_schema_required: true,
    exact_response_schema_required: true,
    canonical_allocation_planner_reused: true,
    canonical_high_water_binding_reused: true,
    canonical_publication_writer_reused: true,
    one_allocation_transition_per_reserve: true,
    recovery_terminal_before_new_transition: true,
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
  "void_buy_void_allocation_custody_service_request_v1";
const RESPONSE_SCHEMA =
  "void_buy_void_allocation_custody_service_response_v1";
const MAX_REQUEST_BYTES = 64 * 1024;
const MAX_RESPONSE_BYTES = 64 * 1024;
const RESPONSE_TIMEOUT_MS = 5_000;
const MAX_LEDGER_BYTES = 64 * 1024 * 1024;
const MAX_HIGH_WATER_BYTES = 4096;
const LEDGER_NAME = "allocation-reservations-v1.jsonl";
const HIGH_WATER_NAME = "allocation-reservation-high-water-v1.json";
const O_NOFOLLOW = fs.constants.O_NOFOLLOW;

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

function assertDirectDirectory(directory, code) {
  assertNoSymlinkAncestors(directory, code);
  const stat = fs.lstatSync(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink()) fail(code);
  if (
    typeof process.getuid === "function" &&
    stat.uid !== process.getuid()
  ) {
    fail(code);
  }
  if ((stat.mode & 0o077) !== 0) fail(code);
}

function readBoundedFile(root, name, maximum, allowEmpty, code) {
  assertDirectDirectory(root, code + "_root");
  const file = path.join(root, name);
  const beforePath = fs.lstatSync(file, { bigint: true });
  if (
    !beforePath.isFile() ||
    beforePath.isSymbolicLink() ||
    beforePath.nlink !== 1n ||
    beforePath.size < (allowEmpty ? 0n : 1n) ||
    beforePath.size > BigInt(maximum)
  ) {
    fail(code);
  }
  const fd = fs.openSync(file, fs.constants.O_RDONLY | O_NOFOLLOW);
  try {
    const before = fs.fstatSync(fd, { bigint: true });
    if (
      !before.isFile() ||
      before.nlink !== 1n ||
      before.dev !== beforePath.dev ||
      before.ino !== beforePath.ino ||
      before.size !== beforePath.size
    ) {
      fail(code);
    }
    const size = Number(before.size);
    const bytes = Buffer.alloc(size);
    let offset = 0;
    while (offset < size) {
      const count = fs.readSync(fd, bytes, offset, size - offset, offset);
      if (count <= 0) fail(code + "_short_read");
      offset += count;
    }
    const after = fs.fstatSync(fd, { bigint: true });
    const afterPath = fs.lstatSync(file, { bigint: true });
    if (
      before.dev !== after.dev ||
      before.ino !== after.ino ||
      before.size !== after.size ||
      before.mtimeNs !== after.mtimeNs ||
      before.ctimeNs !== after.ctimeNs ||
      after.dev !== afterPath.dev ||
      after.ino !== afterPath.ino ||
      after.size !== afterPath.size
    ) {
      fail(code + "_changed_during_read");
    }
    return bytes;
  } finally {
    fs.closeSync(fd);
  }
}

function held(reason) {
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
    runtime_integration: false,
    payment_acceptance: false,
    transaction_broadcast: false,
    funds_movement: false,
  });
}

function normalizeOptions(raw) {
  const value = directObject(
    raw,
    [
      "socket_path",
      "ledger_root",
      "custody_root",
      "socket_group_gid",
    ],
    "allocation_custody_service_options_invalid",
  );
  const socketPath = absolutePath(
    value.socket_path,
    "allocation_custody_service_socket_path_invalid",
  );
  const ledgerRoot = absolutePath(
    value.ledger_root,
    "allocation_custody_service_ledger_root_invalid",
  );
  const custodyRoot = absolutePath(
    value.custody_root,
    "allocation_custody_service_custody_root_invalid",
  );
  if (
    ledgerRoot === custodyRoot ||
    path.dirname(socketPath) === ledgerRoot ||
    path.dirname(socketPath) === custodyRoot
  ) {
    fail("allocation_custody_service_paths_not_separated");
  }
  return Object.freeze({
    socket_path: socketPath,
    ledger_root: ledgerRoot,
    custody_root: custodyRoot,
    socket_group_gid: boundedInteger(
      value.socket_group_gid,
      1,
      0x7fff_ffff,
      "allocation_custody_service_socket_group_invalid",
    ),
  });
}

function readAuthorityState(options) {
  const ledger = readBoundedFile(
    options.ledger_root,
    LEDGER_NAME,
    MAX_LEDGER_BYTES,
    true,
    "allocation_custody_service_ledger_invalid",
  );
  const highWater = readBoundedFile(
    options.custody_root,
    HIGH_WATER_NAME,
    MAX_HIGH_WATER_BYTES,
    false,
    "allocation_custody_service_high_water_invalid",
  );
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
    envelope.marker !== VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_V1 ||
    envelope.version !== 1 ||
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
    marker: VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_V1,
    version: 1,
    method: envelope.method,
    request,
  });
}

function responseEnvelope(requestSha256, decision) {
  return Object.freeze({
    schema: RESPONSE_SCHEMA,
    marker: VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_V1,
    version: 1,
    request_sha256: requestSha256,
    decision,
  });
}

function writerRoots(options) {
  return {
    ledger_root: options.ledger_root,
    high_water_root: options.custody_root,
  };
}

function recoverCore(options) {
  const recovered =
    recoverBuyVoidAllocationReservationPublicationWriterV1(
      writerRoots(options),
    );
  if (recovered.ok !== true) {
    return held(
      "allocation_custody_service_recovery_" +
        String(recovered.reason || "held"),
    );
  }
  const state = readAuthorityState(options);
  return success(
    recovered.status === "recovered" ? "recovered" : "clean",
    state,
    recovered.operation_performed === true,
  );
}

function reserveCore(options, request) {
  const recovery =
    recoverBuyVoidAllocationReservationPublicationWriterV1(
      writerRoots(options),
    );
  if (recovery.ok !== true) {
    return held(
      "allocation_custody_service_recovery_" +
        String(recovery.reason || "held"),
    );
  }
  if (recovery.status === "recovered") {
    const state = readAuthorityState(options);
    return success(
      "recovered_retry_required",
      state,
      true,
    );
  }

  const state = readAuthorityState(options);
  const plan = planBuyVoidAllocationReservationV1({
    ledger_jsonl: state.ledger,
    ...request,
  });
  if (plan.ok !== true) {
    return held(
      "allocation_custody_service_plan_" +
        String(plan.reason || "held"),
    );
  }

  const persisted =
    persistBuyVoidAllocationReservationPublicationWriterV1({
      ...writerRoots(options),
      next_ledger_jsonl: plan.next_ledger_jsonl,
    });
  if (persisted.ok !== true) {
    return held(
      "allocation_custody_service_persist_" +
        String(persisted.reason || "held"),
    );
  }
  if (persisted.status === "recovered") {
    const afterRecovery = readAuthorityState(options);
    return success(
      "recovered_retry_required",
      afterRecovery,
      true,
    );
  }

  const after = readAuthorityState(options);
  if (
    after.record_count !== plan.next_record_count ||
    after.tip_hash !== plan.record.allocation_record_hash
  ) {
    return held("allocation_custody_service_postcheck_mismatch");
  }
  return success(
    plan.status === "idempotent" ? "duplicate" : "reserved",
    after,
    persisted.operation_performed === true,
    plan.record,
  );
}

export async function handleVoidBuyAllocationCustodyServiceEnvelopeV1(
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
      decision = reserveCore(options, envelope.request);
    } else if (envelope.method === "recover") {
      decision = recoverCore(options);
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

function writeResponse(socket, response) {
  const line = JSON.stringify(response) + "\n";
  if (Buffer.byteLength(line, "utf8") > MAX_RESPONSE_BYTES) {
    socket.end(
      JSON.stringify(
        responseEnvelope(
          sha256Id(Buffer.from("oversize", "utf8")),
          held("allocation_custody_service_response_too_large"),
        ),
      ) + "\n",
    );
    return;
  }
  socket.end(line);
}

export function createVoidBuyAllocationCustodyServiceV1(rawOptions) {
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
    );
    assertDirectDirectory(
      options.ledger_root,
      "allocation_custody_service_ledger_root_invalid",
    );
    assertDirectDirectory(
      options.custody_root,
      "allocation_custody_service_custody_root_invalid",
    );
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

    server = net.createServer((socket) => {
      socket.setEncoding("utf8");
      socket.setTimeout(RESPONSE_TIMEOUT_MS);
      let input = "";
      let handled = false;
      const finishHeld = (reason) => {
        if (handled || socket.destroyed) return;
        handled = true;
        writeResponse(
          socket,
          responseEnvelope(
            sha256Id(Buffer.from("invalid", "utf8")),
            held(reason),
          ),
        );
      };
      socket.on("timeout", () => {
        finishHeld("allocation_custody_service_request_timeout");
      });
      socket.on("error", () => {});
      socket.on("data", (chunk) => {
        if (handled) return;
        input += chunk;
        if (Buffer.byteLength(input, "utf8") > MAX_REQUEST_BYTES) {
          finishHeld("allocation_custody_service_request_too_large");
          return;
        }
        const newline = input.indexOf("\n");
        if (newline < 0) return;
        if (input.slice(newline + 1).trim()) {
          finishHeld("allocation_custody_service_multiple_requests_rejected");
          return;
        }
        handled = true;
        enqueue(async () => {
          let parsed;
          try {
            parsed = JSON.parse(input.slice(0, newline));
          } catch {
            return responseEnvelope(
              sha256Id(Buffer.from("invalid", "utf8")),
              held("allocation_custody_service_request_json_invalid"),
            );
          }
          return handleVoidBuyAllocationCustodyServiceEnvelopeV1(
            options,
            parsed,
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
      ledger_root: options.ledger_root,
      custody_root: options.custody_root,
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
    authority: VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_AUTHORITY_V1,
  });
}

async function main() {
  const raw = process.env.VOID_ALLOCATION_CUSTODY_SERVICE_CONFIG_JSON;
  if (!raw) fail("allocation_custody_service_config_env_required");
  let config;
  try {
    config = JSON.parse(raw);
  } catch {
    fail("allocation_custody_service_config_json_invalid");
  }
  const service = createVoidBuyAllocationCustodyServiceV1(config);
  await service.start();
  process.stdout.write(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_V1 + "_STARTED\n",
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
      VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_V1 +
        ": " +
        String(error?.message || error),
    );
    process.exitCode = 1;
  });
}

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_CONTRACT_V1 =
  Object.freeze({
    schema: "void_buy_void_allocation_custody_service_contract_v1",
    marker: "VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_CONTRACT_V1",
    version: 1,
    exact_request_schema: true,
    exact_response_schema: true,
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
