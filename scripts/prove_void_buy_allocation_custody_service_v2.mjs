#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_AUTHORITY_V2,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_CONTRACT_V2,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_V2,
  handleVoidBuyAllocationCustodyServiceEnvelopeV2,
} from "../tools/void-buy-allocation-custody-service-v2.mjs";
import {
  deriveBuyVoidAllocationReservationHighWaterV1,
} from "../dist/economic/buy_void_allocation_reservation_high_water_v1.js";

const SOURCE_PATH = "tools/void-buy-allocation-custody-service-v2.mjs";
const LEDGER_NAME = "allocation-reservations-v1.jsonl";
const HIGH_WATER_NAME = "allocation-reservation-high-water-v1.json";
const REQUESTS_NAME = "requests.jsonl";
const OPERATOR_EVENTS_NAME = "operator-events.jsonl";
const LOCK_NAME =
  ".void-buy-void-cross-uid-capacity-exclusive-lock-v1.json";

const sha = (hex) => "sha256:" + hex.repeat(64);
const sha256Id = (bytes) =>
  "sha256:" + crypto.createHash("sha256").update(bytes).digest("hex");

function requireOk(value) {
  if (value?.ok !== true) {
    throw new Error(String(value?.reason || "unexpected_hold"));
  }
  return value;
}

function currentUid() {
  assert.equal(typeof process.getuid, "function");
  const uid = process.getuid();
  assert.ok(Number.isSafeInteger(uid) && uid > 0, "proof must run nonroot");
  return uid;
}

function currentGid() {
  assert.equal(typeof process.getgid, "function");
  const gid = process.getgid();
  assert.ok(Number.isSafeInteger(gid) && gid > 0);
  return gid;
}

function syntheticWebUid(custodyUid) {
  const candidate = custodyUid + 10000;
  assert.ok(candidate <= 0x7fff_ffff);
  return candidate;
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

function createFixture({
  root = null,
  sharedDirectory = null,
  webUid = null,
  sharedGid = null,
} = {}) {
  const custodyUid = currentUid();
  const gid = sharedGid ?? currentGid();
  const web = webUid ?? syntheticWebUid(custodyUid);
  assert.notEqual(web, custodyUid);

  const ownedRoot = root === null;
  const fixtureRoot = root ?? fs.mkdtempSync(
    path.join(os.tmpdir(), "void-allocation-custody-service-v2-"),
  );
  fs.mkdirSync(fixtureRoot, { recursive: true, mode: 0o700 });
  fs.chmodSync(fixtureRoot, 0o700);

  const requestRoot = path.join(fixtureRoot, "requests");
  const ledgerRoot = path.join(fixtureRoot, "ledger");
  const custodyRoot = path.join(fixtureRoot, "custody");
  const socketParent = path.join(fixtureRoot, "run");
  for (const directory of [requestRoot, ledgerRoot, custodyRoot, socketParent]) {
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    fs.chmodSync(directory, 0o700);
  }

  const lockRoot = sharedDirectory ?? path.join(fixtureRoot, "capacity-lock");
  if (sharedDirectory === null) {
    fs.mkdirSync(lockRoot, { mode: 0o3770 });
    fs.chmodSync(lockRoot, 0o3770);
  } else {
    const stat = fs.lstatSync(lockRoot);
    assert.equal(stat.isDirectory(), true);
    assert.equal(stat.isSymbolicLink(), false);
    assert.equal(stat.uid, custodyUid);
    assert.equal(stat.gid, gid);
    assert.equal(stat.mode & 0o7777, 0o3770);
  }

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
  fs.writeFileSync(
    path.join(ledgerRoot, LEDGER_NAME),
    "",
    { mode: 0o600 },
  );
  const genesis = requireOk(
    deriveBuyVoidAllocationReservationHighWaterV1(""),
  );
  fs.writeFileSync(
    path.join(custodyRoot, HIGH_WATER_NAME),
    genesis.high_water_json,
    { mode: 0o600 },
  );

  return Object.freeze({
    ownedRoot,
    root: fixtureRoot,
    requestRoot,
    ledgerRoot,
    custodyRoot,
    lockRoot,
    genesisHighWater: genesis.high_water_json,
    options: Object.freeze({
      socket_path: path.join(socketParent, "custody-v2.sock"),
      request_root: requestRoot,
      ledger_root: ledgerRoot,
      custody_root: custodyRoot,
      socket_group_gid: gid,
      capacity_lock: Object.freeze({
        shared_directory: lockRoot,
        custody_uid: custodyUid,
        web_uid: web,
        shared_gid: gid,
        wait_timeout_ms: 5_000,
        poll_interval_ms: 10,
      }),
    }),
  });
}

function cleanupFixture(f) {
  if (f.ownedRoot) {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
}

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

function envelope(method, request) {
  return Object.freeze({
    schema: "void_buy_void_allocation_custody_service_request_v2",
    marker: VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_V2,
    version: 2,
    method,
    request,
  });
}

async function decision(f, method, request) {
  const response =
    await handleVoidBuyAllocationCustodyServiceEnvelopeV2(
      f.options,
      envelope(method, request),
    );
  assert.equal(
    response.schema,
    "void_buy_void_allocation_custody_service_response_v2",
  );
  assert.equal(response.marker, VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_V2);
  assert.equal(response.version, 2);
  assert.match(response.request_sha256, /^sha256:[0-9a-f]{64}$/u);
  assert.equal(response.decision.payment_capacity_lock_verified, false);
  assert.equal(response.decision.allocation_handoff_atomicity_proven, false);
  assert.equal(
    response.decision.web_payment_writer_cross_uid_lock_participation_verified,
    false,
  );
  assert.equal(response.decision.operation_performed, false);
  assert.equal(response.decision.runtime_integration, false);
  assert.equal(response.decision.payment_acceptance, false);
  assert.equal(response.decision.transaction_broadcast, false);
  assert.equal(response.decision.funds_movement, false);
  return response.decision;
}

function assertLockReleased(f) {
  assert.equal(
    fs.existsSync(path.join(f.lockRoot, LOCK_NAME)),
    false,
    "read-only HOLD must release cross-UID lock",
  );
}

async function ordinaryProof() {
  assert.equal(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_CONTRACT_V2.marker,
    "VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_CONTRACT_V2",
  );
  assert.equal(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_CONTRACT_V2.version,
    2,
  );
  assert.equal(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_CONTRACT_V2
      .cross_uid_capacity_lock_primitive_reused,
    true,
  );
  assert.equal(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_CONTRACT_V2
      .custody_cross_uid_lock_participation_source_bound,
    true,
  );
  assert.equal(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_CONTRACT_V2
      .web_payment_writer_cross_uid_lock_participation_verified,
    false,
  );
  assert.equal(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_CONTRACT_V2
      .payment_capacity_lock_verified,
    false,
  );
  assert.equal(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_CONTRACT_V2
      .allocation_handoff_atomicity_proven,
    false,
  );

  for (const key of [
    "source_only_service",
    "unix_socket_only",
    "server_controlled_socket_path",
    "server_controlled_request_root",
    "server_controlled_ledger_root",
    "server_controlled_custody_root",
    "descriptor_bound_payment_history_read",
    "cross_uid_capacity_lock_primitive_reused",
    "custody_cross_uid_lock_participation_source_bound",
  ]) {
    assert.equal(
      VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_AUTHORITY_V2[key],
      true,
      key,
    );
  }
  for (const key of [
    "web_payment_writer_cross_uid_lock_participation_verified",
    "allocation_handoff_atomicity_proven",
    "canonical_publication_writer_reused",
    "one_allocation_transition_per_reserve",
    "verified_payment_provenance_independently_bound",
    "payment_capacity_lock_verified",
    "reserve_method_enabled",
    "recovery_terminal_before_new_transition",
    "runtime_integration",
    "payment_acceptance",
    "public_presale_activation",
    "funds_movement",
  ]) {
    assert.equal(
      VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_AUTHORITY_V2[key],
      false,
      key,
    );
  }

  const f = createFixture();
  try {
    const inspected = requireOk(await decision(f, "inspect", {}));
    assert.equal(inspected.status, "inspected");
    assert.equal(inspected.record_count, 0);
    assert.equal(
      inspected.custody_cross_uid_lock_participation_verified,
      false,
    );
    assertLockReleased(f);

    const forged = await decision(f, "reserve", { ...baseCandidate });
    assert.equal(forged.ok, false);
    assert.equal(
      forged.reason,
      "allocation_custody_service_verified_payment_provenance_invalid",
    );
    assert.equal(
      forged.custody_cross_uid_lock_participation_verified,
      true,
    );
    assertLockReleased(f);

    // A read/validation HOLD happens inside the lock callback but must not
    // retain the lock. This immediate second reserve proves reacquisition.
    const verifiedCandidate = installVerifiedPaymentHistory(f);
    const verified = await decision(
      f,
      "reserve",
      { ...verifiedCandidate },
    );
    assert.equal(verified.ok, false);
    assert.equal(
      verified.reason,
      "allocation_custody_service_web_payment_writer_cross_uid_lock_not_bound",
    );
    assert.equal(
      verified.custody_cross_uid_lock_participation_verified,
      true,
    );
    assertLockReleased(f);

    const digestMismatch = await decision(f, "reserve", {
      ...verifiedCandidate,
      payment_verified_event_sha256: sha("9"),
    });
    assert.equal(digestMismatch.ok, false);
    assert.equal(
      digestMismatch.reason,
      "allocation_custody_service_caller_payment_event_digest_mismatch",
    );
    assert.equal(
      digestMismatch.custody_cross_uid_lock_participation_verified,
      true,
    );
    assertLockReleased(f);

    const recovered = await decision(f, "recover", {});
    assert.equal(recovered.ok, false);
    assert.equal(
      recovered.reason,
      "allocation_custody_service_verified_payment_recovery_not_bound",
    );
    assert.equal(
      recovered.custody_cross_uid_lock_participation_verified,
      true,
    );
    assertLockReleased(f);

    assert.equal(
      fs.readFileSync(path.join(f.ledgerRoot, LEDGER_NAME), "utf8"),
      "",
    );
    assert.equal(
      fs.readFileSync(path.join(f.custodyRoot, HIGH_WATER_NAME), "utf8"),
      f.genesisHighWater,
    );
  } finally {
    cleanupFixture(f);
  }

  const source = fs.readFileSync(SOURCE_PATH, "utf8");
  assert.match(source, /withBuyVoidCrossUidCapacityExclusiveLockV1/u);
  assert.match(
    source,
    /allocation_custody_service_web_payment_writer_cross_uid_lock_not_bound/u,
  );
  assert.doesNotMatch(
    source,
    /allocation_custody_service_payment_capacity_lock_not_bound/u,
  );
  assert.doesNotMatch(
    source,
    /persistBuyVoidAllocationReservationPublicationWriterV1/u,
  );
  assert.doesNotMatch(
    source,
    /recoverBuyVoidAllocationReservationPublicationWriterV1/u,
  );
  assert.doesNotMatch(
    source,
    /VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_V1/u,
  );
  assert.match(source, /reserve_method_enabled:\s*false/u);
  assert.match(source, /payment_capacity_lock_verified:\s*false/u);
  assert.match(source, /allocation_handoff_atomicity_proven:\s*false/u);

  console.log("VOID_BUY_VOID_ALLOCATION_CUSTODY_SERVICE_V2_PROOF_GREEN");
  console.log("v1_service_untouched=true");
  console.log("custody_cross_uid_lock_participation_source_bound=true");
  console.log("read_validation_hold_releases_lock=true");
  console.log("durable_payment_provenance_reaches_web_writer_lock_hold=true");
  console.log("web_payment_writer_cross_uid_lock_participation_verified=false");
  console.log("payment_capacity_lock_verified=false");
  console.log("allocation_handoff_atomicity_proven=false");
  console.log("reserve_method_enabled=false");
  console.log("recovery_terminal_before_new_transition=false");
  console.log("allocation_write=false");
  console.log("runtime_integration=false");
  console.log("payment_acceptance=false");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
}

async function custodyReserveWorker(args) {
  assert.equal(args.length, 5);
  const [root, sharedDirectory, webUidRaw, sharedGidRaw, logPath] = args;
  const webUid = Number(webUidRaw);
  const sharedGid = Number(sharedGidRaw);
  assert.equal(Number.isSafeInteger(webUid), true);
  assert.equal(Number.isSafeInteger(sharedGid), true);

  const f = createFixture({
    root,
    sharedDirectory,
    webUid,
    sharedGid,
  });
  const candidate = installVerifiedPaymentHistory(f);
  const result = await decision(f, "reserve", { ...candidate });
  assert.equal(result.ok, false);
  assert.equal(
    result.reason,
    "allocation_custody_service_web_payment_writer_cross_uid_lock_not_bound",
  );
  assert.equal(
    result.custody_cross_uid_lock_participation_verified,
    true,
  );
  assertLockReleased(f);
  fs.appendFileSync(logPath, "custody-done\n");
  console.log("VOID_BUY_VOID_CUSTODY_V2_TWO_UID_RESERVE_GREEN");
  console.log("custody_waited_for_foreign_web_lock=true");
  console.log("payment_capacity_lock_verified=false");
  console.log("allocation_write=false");
  console.log("funds_movement=false");
}

function verifyContentionLog(args) {
  assert.equal(args.length, 1);
  const rows = fs.readFileSync(args[0], "utf8")
    .trim()
    .split("\n")
    .filter(Boolean);
  assert.deepEqual(rows, [
    "enter:web-holder",
    "exit:web-holder",
    "custody-done",
  ]);
  console.log("VOID_BUY_VOID_CUSTODY_V2_CROSS_UID_CONTENTION_GREEN");
  console.log("web_exit_precedes_custody_completion=true");
}

const [mode, ...rest] = process.argv.slice(2);
if (mode === "--custody-reserve-worker") {
  await custodyReserveWorker(rest);
} else if (mode === "--verify-contention-log") {
  verifyContentionLog(rest);
} else if (mode === undefined) {
  await ordinaryProof();
} else {
  throw new Error("unknown_mode");
}
