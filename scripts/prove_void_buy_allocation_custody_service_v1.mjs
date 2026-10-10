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
const REQUESTS_NAME = "requests.jsonl";
const OPERATOR_EVENTS_NAME = "operator-events.jsonl";

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
  "server_controlled_request_root",
  "server_controlled_ledger_root",
  "server_controlled_custody_root",
  "exact_request_schema_required",
  "exact_response_schema_required",
  "canonical_high_water_binding_reused",
  "canonical_verified_payment_replay_classifier_reused",
  "descriptor_bound_payment_history_read",
  "verified_payment_provenance_descriptor_bound",
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

function installVerifiedPaymentHistory(f) {
  const nativeUsdc =
    "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
  const receiveAddress = "0x" + "2".repeat(40);
  const request = Object.freeze({
    request_id: baseCandidate.request_id,
    source_chain: baseCandidate.source_chain,
    tx_hash: baseCandidate.payment_transaction_hash,
    quoted_void: baseCandidate.quote_void_amount,
    usdc_amount: baseCandidate.quote_usdc_amount,
    delivery_address: baseCandidate.buyer_delivery_wallet,
    receive_address: receiveAddress,
    usdc_contract: nativeUsdc,
    launch_authority: baseCandidate.launch_authority,
  });
  const event = Object.freeze({
    schema: "void_buy_void_verified_payment_event_v2",
    marker: "VOID_BUY_VOID_VERIFIED_PAYMENT_V2",
    request_id: request.request_id,
    operator_status: "payment_verified",
    payment_verified: true,
    payment_identity_input_complete: true,
    marked_at_ms: baseCandidate.created_at_ms - 1,
    tx_hash: request.tx_hash,
    quoted_void: request.quoted_void,
    payment_verifier: Object.freeze({
      chain: "base",
      transaction_hash: request.tx_hash,
      log_index: "7",
      block_number: "100",
      confirmations: "12",
      usdc_contract: nativeUsdc,
      from_address: request.delivery_address,
      receive_address: request.receive_address,
      delivery_address: request.delivery_address,
      amount_units: "3000000",
      requested_units: "3000000",
    }),
  });
  const requestLine = JSON.stringify(request) + "\n";
  const eventLine = JSON.stringify(event) + "\n";
  fs.writeFileSync(
    path.join(f.requestRoot, REQUESTS_NAME),
    requestLine,
    { mode: 0o600 },
  );
  fs.writeFileSync(
    path.join(f.requestRoot, OPERATOR_EVENTS_NAME),
    eventLine,
    { mode: 0o600 },
  );
  return Object.freeze({
    ...baseCandidate,
    payment_verified_event_sha256:
      sha256Id(Buffer.from(eventLine, "utf8")),
  });
}

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


function slowDripRequest(socketPath) {
  return new Promise((resolve, reject) => {
    // Keep the write half open and deliver bytes often enough that the
    // inactivity timeout alone could never terminate this connection.
    const socket = new net.Socket({ allowHalfOpen: true });
    socket.setEncoding("utf8");
    let response = "";
    let settled = false;
    const startMs = Date.now();
    const drip = setInterval(() => {
      if (!socket.destroyed && socket.writable) socket.write(" ");
    }, 250);
    const watchdog = setTimeout(() => {
      finish(new Error("allocation_custody_slow_drip_watchdog"));
    }, 11_000);
    function finish(error, value) {
      if (settled) return;
      settled = true;
      clearInterval(drip);
      clearTimeout(watchdog);
      socket.destroy();
      if (error) reject(error);
      else resolve(value);
    }
    socket.on("error", (error) => finish(error));
    socket.on("data", (chunk) => { response += chunk; });
    socket.on("end", () => {
      try {
        assert.equal(response.endsWith("\n"), true);
        assert.equal(response.split("\n").length, 2);
        const envelope = JSON.parse(response.slice(0, -1));
        assert.equal(envelope.decision.ok, false);
        assert.equal(
          envelope.decision.reason,
          "allocation_custody_service_request_deadline_exceeded",
        );
        assert.ok(
          Date.now() - startMs < 10_000,
          "slow drip must not extend the five-second framing deadline",
        );
        finish(null, envelope);
      } catch (error) {
        finish(error);
      }
    });
    socket.on("close", () => {
      if (!settled) finish(new Error("allocation_custody_slow_drip_closed_without_response"));
    });
    socket.connect({ path: socketPath }, () => socket.write(" "));
  });
}

function fixture() {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-allocation-custody-service-v1-"),
  );
  fs.chmodSync(root, 0o700);
  const requestRoot = path.join(root, "requests");
  const ledgerRoot = path.join(root, "ledger");
  const custodyRoot = path.join(root, "custody");
  const socketParent = path.join(root, "run");
  fs.mkdirSync(requestRoot, { mode: 0o700 });
  fs.mkdirSync(ledgerRoot, { mode: 0o700 });
  fs.mkdirSync(custodyRoot, { mode: 0o700 });
  fs.mkdirSync(socketParent, { mode: 0o700 });
  fs.writeFileSync(
    path.join(requestRoot, REQUESTS_NAME),
    "{}\n",
    { mode: 0o600 },
  );
  fs.writeFileSync(
    path.join(requestRoot, OPERATOR_EVENTS_NAME),
    "{}\n",
    { mode: 0o600 },
  );
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
    requestRoot,
    ledgerRoot,
    custodyRoot,
    options: Object.freeze({
      socket_path: path.join(socketParent, "custody.sock"),
      request_root: requestRoot,
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
    const forged = await decision(f, "reserve", { ...baseCandidate });
    assert.equal(forged.ok, false);
    assert.equal(forged.reason,
      "allocation_custody_service_verified_payment_provenance_invalid");
    assert.equal(forged.operation_performed, false);
    assert.equal(forged.record_id, null);
    assert.equal(fs.readFileSync(path.join(f.ledgerRoot, LEDGER_NAME), "utf8"), "");
    assert.equal(fs.readFileSync(path.join(f.custodyRoot, HIGH_WATER_NAME), "utf8"),
      f.genesisHighWater);
    assert.equal(fs.existsSync(path.join(f.ledgerRoot, INTENT_NAME)), false);
    assert.equal(fs.existsSync(path.join(f.custodyRoot, INTENT_NAME)), false);
    const retry = await decision(f, "reserve", { ...baseCandidate });
    assert.equal(retry.ok, false);
    assert.equal(retry.reason, forged.reason);
    assert.equal(retry.operation_performed, false);

    const verifiedCandidate = installVerifiedPaymentHistory(f);
    const verified = await decision(
      f,
      "reserve",
      { ...verifiedCandidate },
    );
    assert.equal(verified.ok, false);
    assert.equal(
      verified.reason,
      "allocation_custody_service_payment_capacity_lock_not_bound",
    );
    assert.equal(verified.operation_performed, false);
    assert.equal(verified.record_id, null);
    assert.equal(
      fs.readFileSync(path.join(f.ledgerRoot, LEDGER_NAME), "utf8"),
      "",
    );
    assert.equal(
      fs.readFileSync(path.join(f.custodyRoot, HIGH_WATER_NAME), "utf8"),
      f.genesisHighWater,
    );
    const digestMismatch = await decision(f, "reserve", {
      ...verifiedCandidate,
      payment_verified_event_sha256: sha("9"),
    });
    assert.equal(digestMismatch.ok, false);
    assert.equal(
      digestMismatch.reason,
      "allocation_custody_service_caller_payment_event_digest_mismatch",
    );
    assert.equal(digestMismatch.operation_performed, false);

    const clean = await decision(f, "recover", {});
    assert.equal(clean.ok, false);
    assert.equal(clean.reason,
      "allocation_custody_service_verified_payment_recovery_not_bound");
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

    // Caller assertions cannot even trigger recovery of a durable intent.
    const forged = await decision(f, "reserve", { ...baseCandidate });
    assert.equal(forged.ok, false);
    assert.equal(forged.reason,
      "allocation_custody_service_verified_payment_provenance_invalid");
    assert.equal(forged.operation_performed, false);
    assert.equal(fs.existsSync(path.join(f.ledgerRoot, INTENT_NAME)), true);
    assert.equal(fs.existsSync(path.join(f.custodyRoot, INTENT_NAME)), true);
    assert.equal(fs.readFileSync(path.join(f.ledgerRoot, LEDGER_NAME), "utf8"), "");
    // A legacy intent, even if publication-valid, is not payment provenance.
    // The caller cannot cause it to be committed by invoking recover.
    const recovered = await decision(f, "recover", {});
    assert.equal(recovered.ok, false);
    assert.equal(recovered.reason,
      "allocation_custody_service_verified_payment_recovery_not_bound");
    assert.equal(recovered.operation_performed, false);
    assert.equal(fs.existsSync(path.join(f.ledgerRoot, INTENT_NAME)), true);
    assert.equal(fs.existsSync(path.join(f.custodyRoot, INTENT_NAME)), true);
    assert.equal(fs.readFileSync(path.join(f.ledgerRoot, LEDGER_NAME), "utf8"), "");
    assert.equal(fs.readFileSync(path.join(f.custodyRoot, HIGH_WATER_NAME), "utf8"),
      f.genesisHighWater);
    const retry = await decision(f, "reserve", { ...baseCandidate });
    assert.equal(retry.ok, false);
    assert.equal(retry.reason, forged.reason);
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

    // The client sends bytes every 250ms but never ends its write side.
    // The absolute deadline, not the idle timeout, must reject it.
    await slowDripRequest(f.options.socket_path);
    assert.equal(
      fs.readFileSync(path.join(f.ledgerRoot, LEDGER_NAME), "utf8"),
      "",
      "slow-drip framing timeout must not reserve inventory",
    );

    const inspected = await socketExchange(
      f.options.socket_path, inspectLine,
    );
    assert.equal(inspected.decision.ok, true);
    assert.equal(inspected.decision.status, "inspected");
    assert.equal(inspected.decision.record_count, 0);

    const forged = await socketExchange(f.options.socket_path, reserveLine, "", true);
    assert.equal(forged.decision.ok, false);
    assert.equal(forged.decision.reason,
      "allocation_custody_service_verified_payment_provenance_invalid");
    assert.equal(forged.decision.operation_performed, false);
    assert.equal(forged.decision.record_id, null);
    assert.equal(fs.readFileSync(path.join(f.ledgerRoot, LEDGER_NAME), "utf8"), "");
    assert.equal(fs.readFileSync(path.join(f.custodyRoot, HIGH_WATER_NAME), "utf8"),
      f.genesisHighWater);
    assert.equal(fs.existsSync(path.join(f.ledgerRoot, INTENT_NAME)), false);
    assert.equal(fs.existsSync(path.join(f.custodyRoot, INTENT_NAME)), false);
    const repeat = await socketExchange(f.options.socket_path, reserveLine);
    assert.equal(repeat.decision.ok, false);
    assert.equal(repeat.decision.reason, forged.decision.reason);
    assert.equal(repeat.decision.operation_performed, false);

    // A legacy pending intent can be publication-valid yet originate from
    // caller-asserted payment flags rather than a durable payment_verified row.
    // Prove the real IPC path cannot advance that pre-existing obligation.
    const pendingPlan = requireOk(planBuyVoidAllocationReservationV1({
      ledger_jsonl: "",
      ...baseCandidate,
    }));
    const pending = requireOk(buildBuyVoidAllocationReservationPublicationIntentV1({
      current_ledger_jsonl: "",
      current_high_water_json: f.genesisHighWater,
      next_ledger_jsonl: pendingPlan.next_ledger_jsonl,
    }));
    for (const root of [f.ledgerRoot, f.custodyRoot]) {
      fs.writeFileSync(path.join(root, INTENT_NAME), pending.intent_json,
        { mode: 0o600 });
    }

    const recoverLine = canonicalWireJson(envelope("recover", {})) + "\n";
    const recover = await socketExchange(f.options.socket_path, recoverLine);
    assert.equal(recover.decision.ok, false);
    assert.equal(recover.decision.reason,
      "allocation_custody_service_verified_payment_recovery_not_bound");
    assert.equal(recover.decision.operation_performed, false);
    for (const root of [f.ledgerRoot, f.custodyRoot]) {
      assert.equal(fs.readFileSync(path.join(root, INTENT_NAME), "utf8"),
        pending.intent_json, "IPC recovery must preserve legacy intent bytes");
    }
    assert.equal(fs.readFileSync(path.join(f.ledgerRoot, LEDGER_NAME), "utf8"), "");
    assert.equal(fs.readFileSync(path.join(f.custodyRoot, HIGH_WATER_NAME), "utf8"),
      f.genesisHighWater);
    const forgedWithIntent = await socketExchange(f.options.socket_path, reserveLine);
    assert.equal(forgedWithIntent.decision.ok, false);
    assert.equal(forgedWithIntent.decision.reason, forged.decision.reason);
    assert.equal(forgedWithIntent.decision.operation_performed, false);
    for (const root of [f.ledgerRoot, f.custodyRoot]) {
      assert.equal(fs.readFileSync(path.join(root, INTENT_NAME), "utf8"),
        pending.intent_json, "forged reserve must not clear legacy intent");
    }
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

// Inserted into the EXISTING custody service proof, before its final source checks.
// Only private, disposable fixtures created by fixture() are inspected here.
{
  const f = fixture();
  const ledgerFile = path.join(f.ledgerRoot, LEDGER_NAME);
  const highFile = path.join(f.custodyRoot, HIGH_WATER_NAME);
  let cases = 0;
  const checkHeld = async () => {
    const result = await decision(f, "inspect", {});
    assert.equal(result.ok, false);
    assert.equal(result.reason, "allocation_custody_service_observation_unqualified");
    assert.equal(result.operation_performed, false);
    assert.equal(result.funds_movement, false);
    assert.equal(result.record_count, null);
    cases++;
  };
  try {
    // Observe the real integrated open calls: no write-capable descriptor.
    const originalOpen = fs.openSync;
    let descriptorRelativeOpens = 0;
    try {
      fs.openSync = function(target, flags, ...rest) {
        assert.equal(typeof flags, "number");
        assert.equal(flags & (fs.constants.O_WRONLY | fs.constants.O_RDWR |
          fs.constants.O_CREAT | fs.constants.O_TRUNC | fs.constants.O_APPEND), 0);
        if (String(target).startsWith("/proc/self/fd/")) descriptorRelativeOpens++;
        return originalOpen.call(fs, target, flags, ...rest);
      };
      const control = requireOk(await decision(f, "inspect", {}));
      assert.equal(control.record_count, 0);
      assert.equal(control.operation_performed, false);
      assert.equal(control.funds_movement, false);
      cases++;
    } finally {
      fs.openSync = originalOpen;
    }
    assert.ok(descriptorRelativeOpens >= 2, "canonical descriptor observer not used");

    for (const file of [ledgerFile, highFile]) {
      for (const mode of [0o400, 0o644]) {
        fs.chmodSync(file, mode);
        try { await checkHeld(); }
        finally { fs.chmodSync(file, 0o600); }
      }
      const saved = file + ".saved";
      fs.renameSync(file, saved);
      try {
        await checkHeld();
        fs.symlinkSync(saved, file);
        try { await checkHeld(); }
        finally { fs.unlinkSync(file); }
        fs.linkSync(saved, file);
        try { await checkHeld(); }
        finally { fs.unlinkSync(file); }
      } finally {
        fs.renameSync(saved, file);
      }
    }
    fs.chmodSync(f.ledgerRoot, 0o750);
    try { await checkHeld(); }
    finally { fs.chmodSync(f.ledgerRoot, 0o700); }

    for (const bytes of [Buffer.alloc(0), Buffer.alloc(4097, 32)]) {
      fs.writeFileSync(highFile, bytes);
      try { await checkHeld(); }
      finally { fs.writeFileSync(highFile, f.genesisHighWater); }
    }
    // This sparse fixture must be refused before a full 64 MiB read.
    fs.truncateSync(ledgerFile, 64 * 1024 * 1024 + 1);
    try { await checkHeld(); }
    finally { fs.truncateSync(ledgerFile, 0); }

    const nested = path.join(f.ledgerRoot, "nested-custody");
    fs.mkdirSync(nested, { mode: 0o700 });
    const nestedFixture = {
      ...f, options: { ...f.options, custody_root: nested },
    };
    const nestedResult = await decision(nestedFixture, "inspect", {});
    assert.equal(nestedResult.ok, false);
    assert.equal(nestedResult.reason, "allocation_custody_service_observation_unqualified");
    assert.equal(nestedResult.operation_performed, false);
    cases++;

    // Imports and inspect do not recover pre-existing publication intentions.
    const intent = path.join(f.ledgerRoot, INTENT_NAME);
    fs.writeFileSync(intent, "untrusted-pending-intent\n", { mode: 0o600 });
    const restored = requireOk(await decision(f, "inspect", {}));
    assert.equal(restored.status, "inspected");
    assert.equal(restored.record_count, 0);
    assert.equal(restored.operation_performed, false);
    assert.equal(fs.readFileSync(intent, "utf8"), "untrusted-pending-intent\n");
    assert.equal(fs.readFileSync(ledgerFile, "utf8"), "");
    assert.equal(fs.readFileSync(highFile, "utf8"), f.genesisHighWater);
    cases++;
    assert.equal(cases, 17);
    console.log("custody_inspection_descriptor_reader_cases=17");
    console.log("custody_inspection_reserve_recover_authority=false");
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
}

const source = sourceBytes.toString("utf8");
assert.doesNotMatch(source, /request_root\s*:\s*envelope/u);
assert.doesNotMatch(source, /ledger_root\s*:\s*envelope/u);
assert.doesNotMatch(source, /custody_root\s*:\s*envelope/u);
assert.doesNotMatch(source, /caller_selected_generation\s*:\s*true/u);
assert.match(source, /service_started_by_import:\s*false/u);
assert.doesNotMatch(source, /planBuyVoidAllocationReservationV1/u);
assert.doesNotMatch(source,
  /persistBuyVoidAllocationReservationPublicationWriterV1/u);
assert.match(source, /observeBuyVoidCustodyPaymentLedgersReadOnlyV1/u);
assert.match(source, /classifyBuyVoidVerifiedAllocationReplayBindingV1/u);
assert.match(source, /allocation_custody_service_payment_capacity_lock_not_bound/u);
assert.match(source, /allocation_custody_service_verified_payment_provenance_invalid/u);
assert.doesNotMatch(source,
  /recoverBuyVoidAllocationReservationPublicationWriterV1/u);
assert.match(source,
  /allocation_custody_service_verified_payment_recovery_not_bound/u);

console.log("VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_V1_PROOF_GREEN");
console.log("exact_service_source_bound=true");
console.log("server_controlled_roots=true");
console.log("server_controlled_request_root=true");
console.log("descriptor_bound_payment_history_read=true");
console.log("canonical_verified_payment_replay_classifier_reused=true");
console.log("durable_payment_provenance_reaches_capacity_lock_hold=true");
console.log("caller_payment_digest_mismatch_held=true");
console.log("caller_selected_path=false");
console.log("caller_selected_generation=false");
console.log("arbitrary_bytes_write=false");
console.log("caller_asserted_payment_evidence_not_trusted=true");
console.log("canonical_writer_reused=false");
console.log("reserve_ipc_default_hold=true");
console.log("unverified_intent_recovery_ipc_held=true");
console.log("no_publication_writer_imported=true");
console.log("service_started_by_import=false");
console.log("socket_parent_mode_0750_proven=true");
console.log("socket_mode_0660_proven=true");
console.log("socket_request_write_eof_required=true");
console.log("absolute_request_framing_deadline=true");
console.log("slow_drip_without_eof_hold=true");
console.log("split_second_frame_rejected_before_reserve=true");
console.log("duplicate_json_members_rejected_before_reserve=true");
console.log("runtime_integration=false");
console.log("payment_acceptance=false");
console.log("transaction_broadcast=false");
console.log("funds_movement=false");
