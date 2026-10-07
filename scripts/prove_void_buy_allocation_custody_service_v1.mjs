#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import net from "node:net";
import path from "node:path";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_AUTHORITY_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_CONTRACT_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_V1,
  createVoidBuyAllocationCustodyServiceV1,
  handleVoidBuyAllocationCustodyServiceEnvelopeV1,
} from "../tools/void-buy-allocation-custody-service-v1.mjs";
import {
  planBuyVoidAllocationReservationV1,
} from "../dist/economic/buy_void_allocation_reservation_ledger_v1.js";
import {
  deriveBuyVoidAllocationReservationHighWaterV1,
  classifyBuyVoidAllocationReservationHighWaterBindingV1,
} from "../dist/economic/buy_void_allocation_reservation_high_water_v1.js";
import {
  buildBuyVoidAllocationReservationPublicationIntentV1,
} from "../dist/economic/buy_void_allocation_reservation_publication_protocol_v1.js";

const CONTRACT_PATH =
  "docs/architecture/buy-void-allocation-custody-service-contract-v1.json";
const SOURCE_PATH =
  "tools/void-buy-allocation-custody-service-v1.mjs";
const LEDGER_NAME = "allocation-reservations-v1.jsonl";
const HIGH_WATER_NAME = "allocation-reservation-high-water-v1.json";
const INTENT_NAME = "allocation-reservation-publication-intent-v1.json";

const sha = (hex) => "sha256:" + hex.repeat(64);
const sha256Id = (bytes) =>
  "sha256:" + crypto.createHash("sha256").update(bytes).digest("hex");

function requireOk(value) {
  if (value?.ok !== true) {
    throw new Error(String(value?.reason || "unexpected_hold"));
  }
  return value;
}

const sourceBytes = fs.readFileSync(SOURCE_PATH);
const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, "utf8"));
assert.equal(
  contract.service_source_sha256,
  sha256Id(sourceBytes),
  "service contract must bind exact service source bytes",
);
for (const [key, value] of Object.entries(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_CONTRACT_V1,
)) {
  assert.deepEqual(contract[key], value, key);
}
assert.deepEqual(
  Object.keys(contract).sort(),
  [
    ...Object.keys(VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_CONTRACT_V1),
    "service_source_sha256",
  ].sort(),
);

const trueAuthority = new Set([
  "source_only_service",
  "unix_socket_only",
  "server_controlled_socket_path",
  "server_controlled_ledger_root",
  "server_controlled_custody_root",
  "exact_request_schema_required",
  "exact_response_schema_required",
  "canonical_allocation_planner_reused",
  "canonical_high_water_binding_reused",
  "canonical_publication_writer_reused",
  "one_allocation_transition_per_reserve",
  "recovery_terminal_before_new_transition",
]);
for (const [key, value] of Object.entries(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_AUTHORITY_V1,
)) {
  assert.equal(value, trueAuthority.has(key), key);
}

const baseCandidate = Object.freeze({
  request_id: "buyvoid_a_aaaaaaaa",
  source_chain: "base",
  payment_transaction_hash: "0x" + "a".repeat(64),
  payment_log_index: 7,
  launch_authority: Object.freeze({
    marker: "VOID_BUY_COUPLED_REQUEST_AUTHORITY_V1",
    version: 1,
    coupled_launch_id: sha("a"),
    source_composition_id: sha("b"),
    activation_generation: "0x" + "c".repeat(64),
    generation_tip_sha256: sha("d"),
    activation_receipt_id: "voidbclive1_" + "e".repeat(64),
    activation_receipt_sha256: "f".repeat(64),
    expires_at_ms: 1_800_000_300_000,
  }),
  buyer_delivery_wallet: "0x" + "1".repeat(40),
  quote_void_amount: "6",
  quote_usdc_amount: "3",
  pool_void_total: "10000000",
  verified_payment_receipt_ref: sha("1"),
  payment_verified_event_sha256: sha("0"),
  duplicate_payment_guard_result: sha("2"),
  inventory_allocation_guard_result: sha("3"),
  operator_activation_record_ref: sha("4"),
  created_at_ms: 1_800_000_000_000,
  verified_payment_gate_green: true,
  duplicate_payment_guard_green: true,
  inventory_allocation_guard_green: true,
  operator_activation_record_green: true,
});

function canonicalWireJson(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalWireJson).join(",") + "]";
  }
  if (value && typeof value === "object") {
    return "{" + Object.keys(value).sort()
      .map((key) => JSON.stringify(key) + ":" + canonicalWireJson(value[key]))
      .join(",") + "}";
  }
  throw new Error("custody_proof_noncanonical_request");
}

function socketExchange(socketPath, firstPart, lastPart = "", expectNoEarlyReply = false) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ path: socketPath });
    socket.setEncoding("utf8");
    let text = "";
    let settled = false;
    let writeEnded = false;
    const timer = setTimeout(() => {
      socket.destroy();
      finish(new Error("allocation_custody_wire_proof_timeout"));
    }, 5_000);
    function finish(error, value) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      if (error) reject(error);
      else resolve(value);
    }
    socket.on("error", (error) => finish(error));
    socket.on("data", (chunk) => {
      if (!writeEnded && expectNoEarlyReply) {
        finish(new Error("allocation_custody_responded_before_write_eof"));
        return;
      }
      text += chunk;
    });
    socket.on("end", () => {
      try {
        const parts = text.split("\n");
        assert.equal(parts.length, 2, "exactly one response line");
        assert.equal(parts[1], "");
        finish(null, JSON.parse(parts[0]));
      } catch (error) {
        finish(error);
      }
    });
    socket.on("connect", () => {
      socket.write(firstPart);
      const closeWrite = () => {
        if (settled) return;
        writeEnded = true;
        socket.end(lastPart);
      };
      if (expectNoEarlyReply) setTimeout(closeWrite, 50);
      else closeWrite();
    });
  });
}

function fixture() {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-allocation-custody-service-v1-"),
  );
  fs.chmodSync(root, 0o700);
  const ledgerRoot = path.join(root, "ledger");
  const custodyRoot = path.join(root, "custody");
  const socketParent = path.join(root, "run");
  fs.mkdirSync(ledgerRoot, { mode: 0o700 });
  fs.mkdirSync(custodyRoot, { mode: 0o700 });
  fs.mkdirSync(socketParent, { mode: 0o700 });
  fs.writeFileSync(path.join(ledgerRoot, LEDGER_NAME), "", { mode: 0o600 });
  const genesis = requireOk(
    deriveBuyVoidAllocationReservationHighWaterV1(""),
  );
  fs.writeFileSync(
    path.join(custodyRoot, HIGH_WATER_NAME),
    genesis.high_water_json,
    { mode: 0o600 },
  );
  return {
    root,
    ledgerRoot,
    custodyRoot,
    options: Object.freeze({
      socket_path: path.join(socketParent, "custody.sock"),
      ledger_root: ledgerRoot,
      custody_root: custodyRoot,
      socket_group_gid: 12345,
    }),
    genesisHighWater: genesis.high_water_json,
  };
}

function envelope(method, request) {
  return {
    schema: "void_buy_void_allocation_custody_service_request_v1",
    marker: VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_V1,
    version: 1,
    method,
    request,
  };
}

async function decision(f, method, request) {
  const response =
    await handleVoidBuyAllocationCustodyServiceEnvelopeV1(
      f.options,
      envelope(method, request),
    );
  assert.equal(
    response.schema,
    "void_buy_void_allocation_custody_service_response_v1",
  );
  assert.equal(
    response.marker,
    VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_V1,
  );
  assert.equal(response.version, 1);
  assert.match(response.request_sha256, /^sha256:[0-9a-f]{64}$/u);
  return response.decision;
}

{
  const f = fixture();
  try {
    const inspected = requireOk(await decision(f, "inspect", {}));
    assert.equal(inspected.status, "inspected");
    assert.equal(inspected.record_count, 0);
    assert.equal(inspected.operation_performed, false);

    const reserved = requireOk(
      await decision(f, "reserve", { ...baseCandidate }),
    );
    assert.equal(reserved.status, "reserved");
    assert.equal(reserved.record_count, 1);
    assert.equal(reserved.operation_performed, true);
    assert.match(reserved.record_id, /^voidalloc1_[0-9a-f]{64}$/u);
    assert.match(
      reserved.allocation_record_hash,
      /^sha256:[0-9a-f]{64}$/u,
    );

    const ledger = fs.readFileSync(
      path.join(f.ledgerRoot, LEDGER_NAME),
      "utf8",
    );
    const highWater = fs.readFileSync(
      path.join(f.custodyRoot, HIGH_WATER_NAME),
      "utf8",
    );
    const binding =
      classifyBuyVoidAllocationReservationHighWaterBindingV1({
        ledger_jsonl: ledger,
        high_water_json: highWater,
      });
    assert.equal(binding.ok, true);

    const replay = requireOk(
      await decision(f, "reserve", { ...baseCandidate }),
    );
    assert.equal(replay.status, "duplicate");
    assert.equal(replay.operation_performed, false);
    assert.equal(replay.record_id, reserved.record_id);
    assert.equal(
      replay.allocation_record_hash,
      reserved.allocation_record_hash,
    );

    const clean = requireOk(await decision(f, "recover", {}));
    assert.equal(clean.status, "clean");
    assert.equal(clean.operation_performed, false);
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
}

{
  const f = fixture();
  try {
    const plan = requireOk(
      planBuyVoidAllocationReservationV1({
        ledger_jsonl: "",
        ...baseCandidate,
      }),
    );
    const built = requireOk(
      buildBuyVoidAllocationReservationPublicationIntentV1({
        current_ledger_jsonl: "",
        current_high_water_json: f.genesisHighWater,
        next_ledger_jsonl: plan.next_ledger_jsonl,
      }),
    );
    const intentBytes = built.intent_json;
    fs.writeFileSync(
      path.join(f.ledgerRoot, INTENT_NAME),
      intentBytes,
      { mode: 0o600 },
    );
    fs.writeFileSync(
      path.join(f.custodyRoot, INTENT_NAME),
      intentBytes,
      { mode: 0o600 },
    );

    const recovered = requireOk(
      await decision(f, "reserve", { ...baseCandidate }),
    );
    assert.equal(recovered.status, "recovered_retry_required");
    assert.equal(recovered.operation_performed, true);
    assert.equal(
      fs.existsSync(path.join(f.ledgerRoot, INTENT_NAME)),
      false,
    );
    assert.equal(
      fs.existsSync(path.join(f.custodyRoot, INTENT_NAME)),
      false,
    );

    const retry = requireOk(
      await decision(f, "reserve", { ...baseCandidate }),
    );
    assert.equal(retry.status, "duplicate");
    assert.equal(retry.operation_performed, false);
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
}

{
  const f = fixture();
  try {
    const gid =
      typeof process.getgid === "function"
        ? process.getgid()
        : process.getgroups().find((value) => value > 0);
    assert.ok(Number.isInteger(gid) && gid > 0);
    fs.chmodSync(path.dirname(f.options.socket_path), 0o750);
    const service = createVoidBuyAllocationCustodyServiceV1({
      ...f.options,
      socket_group_gid: gid,
    });
    const started = await service.start();
    assert.equal(started.runtime_integration, false);
    assert.equal(started.payment_acceptance, false);
    assert.equal(started.transaction_broadcast, false);
    assert.equal(started.funds_movement, false);
    const socket = fs.lstatSync(f.options.socket_path);
    assert.equal(socket.isSocket(), true);
    assert.equal(socket.mode & 0o777, 0o660);
    assert.equal(socket.gid, gid);
    const reserveLine =
      canonicalWireJson(envelope("reserve", { ...baseCandidate })) + "\n";
    const inspectLine = canonicalWireJson(envelope("inspect", {})) + "\n";
    const beforeAnyReserve = fs.readFileSync(
      path.join(f.ledgerRoot, LEDGER_NAME),
      "utf8",
    );
    assert.equal(beforeAnyReserve, "");

    // The first chunk holds a valid reservation, but a second chunk
    // introduces another frame. No reservation may happen before EOF.
    const split = await socketExchange(
      f.options.socket_path, reserveLine, inspectLine, true,
    );
    assert.equal(split.decision.ok, false);
    assert.equal(
      split.decision.reason,
      "allocation_custody_service_multiple_requests_rejected",
    );
    assert.equal(
      fs.readFileSync(path.join(f.ledgerRoot, LEDGER_NAME), "utf8"),
      "",
      "split second frame must never create a reservation",
    );

    // Duplicate JSON member values must not be normalized by JSON.parse
    // before the IPC contract's exact-byte validation.
    const ambiguousLine = reserveLine.replace(
      '"method":"reserve"',
      '"method":"inspect","method":"reserve"',
    );
    assert.notEqual(ambiguousLine, reserveLine);
    const ambiguous = await socketExchange(
      f.options.socket_path, ambiguousLine,
    );
    assert.equal(ambiguous.decision.ok, false);
    assert.equal(
      ambiguous.decision.reason,
      "allocation_custody_service_request_noncanonical",
    );
    assert.equal(
      fs.readFileSync(path.join(f.ledgerRoot, LEDGER_NAME), "utf8"),
      "",
    );

    const unterminated = await socketExchange(
      f.options.socket_path, reserveLine.slice(0, -1),
    );
    assert.equal(unterminated.decision.ok, false);
    assert.equal(
      unterminated.decision.reason,
      "allocation_custody_service_request_unterminated",
    );

    const inspected = await socketExchange(
      f.options.socket_path, inspectLine,
    );
    assert.equal(inspected.decision.ok, true);
    assert.equal(inspected.decision.status, "inspected");
    assert.equal(inspected.decision.record_count, 0);

    const reserved = await socketExchange(
      f.options.socket_path, reserveLine, "", true,
    );
    assert.equal(reserved.decision.ok, true);
    assert.equal(reserved.decision.status, "reserved");
    assert.equal(reserved.decision.record_count, 1);

    const duplicate = await socketExchange(
      f.options.socket_path, reserveLine,
    );
    assert.equal(duplicate.decision.ok, true);
    assert.equal(duplicate.decision.status, "duplicate");
    assert.equal(duplicate.decision.operation_performed, false);
    await service.stop();
    assert.equal(fs.existsSync(f.options.socket_path), false);
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
}

{
  const f = fixture();
  try {
    const invalid = await decision(f, "reserve", {
      ...baseCandidate,
      ledger_root: "/tmp/attacker",
    });
    assert.equal(invalid.ok, false);
    assert.equal(
      invalid.reason,
      "allocation_custody_service_reserve_request_invalid",
    );

    const invalidRecover = await decision(f, "recover", {
      custody_generation: "999",
    });
    assert.equal(invalidRecover.ok, false);
    assert.equal(
      invalidRecover.reason,
      "allocation_custody_service_empty_request_invalid",
    );
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
}

const source = sourceBytes.toString("utf8");
assert.doesNotMatch(source, /ledger_root\s*:\s*envelope/u);
assert.doesNotMatch(source, /custody_root\s*:\s*envelope/u);
assert.doesNotMatch(source, /caller_selected_generation\s*:\s*true/u);
assert.match(source, /service_started_by_import:\s*false/u);
assert.match(source, /planBuyVoidAllocationReservationV1/u);
assert.match(
  source,
  /persistBuyVoidAllocationReservationPublicationWriterV1/u,
);
assert.match(
  source,
  /recoverBuyVoidAllocationReservationPublicationWriterV1/u,
);

console.log("VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_V1_PROOF_GREEN");
console.log("exact_service_source_bound=true");
console.log("server_controlled_roots=true");
console.log("caller_selected_path=false");
console.log("caller_selected_generation=false");
console.log("arbitrary_bytes_write=false");
console.log("canonical_planner_reused=true");
console.log("canonical_writer_reused=true");
console.log("idempotent_replay=true");
console.log("recovery_terminal_before_new_transition=true");
console.log("service_started_by_import=false");
console.log("socket_parent_mode_0750_proven=true");
console.log("socket_mode_0660_proven=true");
console.log("socket_request_write_eof_required=true");
console.log("split_second_frame_rejected_before_reserve=true");
console.log("duplicate_json_members_rejected_before_reserve=true");
console.log("runtime_integration=false");
console.log("payment_acceptance=false");
console.log("transaction_broadcast=false");
console.log("funds_movement=false");
