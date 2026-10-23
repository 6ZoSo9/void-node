// A synthetic, no-authority route-to-canonical-planner integration test.
// Exercises the REAL private bearer reader and the REAL allocation planner.
// No customer payment, reserve, service, RPC or protected-root access.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_BUY_VOID_VERIFIED_PAYMENT_ROUTE_V2,
} from "../src/economic/buy_void_verified_payment_transport_v2.js";
import {
  VOID_BUY_VOID_VERIFIED_PAYMENT_V2_ALLOCATION_STAGE,
  VOID_BUY_VOID_VERIFIED_PAYMENT_V2_ALLOCATION_STAGE_AUTHORITY,
  stageAuthenticatedBuyVoidVerifiedPaymentV2,
} from "../src/economic/buy_void_verified_payment_v2_allocation_stage.js";
import {
  buildBuyVoidVerifiedPaymentEventV2,
} from "../src/economic/buy_void_verified_payment_v2.js";
import {
  VOID_BUY_VOID_ALLOCATION_LEDGER_ROOT_V1,
  VOID_BUY_VOID_ALLOCATION_HIGH_WATER_ROOT_V1,
} from "../src/economic/buy_void_operator_verified_allocation_dispatch_v1.js";

const token = "voidbvo1." + "C".repeat(43);
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "void-bv-v2-alloc-stage-"));
const oldCred = process.env.CREDENTIALS_DIRECTORY;
const cred = path.join(scratch, "buy-void-operator-capability-v1");
const id = "buyvoid_stage_aaaaaaaa";
const chainTx = "0x" + "a".repeat(64);
const buyer = "0x" + "b".repeat(40);
const receiver = "0x" + "c".repeat(40);
const nativeUsdc = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const launchAuthority = Object.freeze({
  marker: "VOID_BUY_COUPLED_REQUEST_AUTHORITY_V1",
  version: 1,
  coupled_launch_id: "sha256:" + "1".repeat(64),
  source_composition_id: "sha256:" + "2".repeat(64),
  activation_generation: "0x" + "3".repeat(64),
  generation_tip_sha256: "sha256:" + "4".repeat(64),
  activation_receipt_id: "voidbclive1_" + "5".repeat(64),
  activation_receipt_sha256: "6".repeat(64),
  expires_at_ms: 1_900_000_000_000,
});
const transferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const addressTopic = (address: string) => "0x" + "0".repeat(24) + address.slice(2);
let sideEffects = 0;
let cases = 0;

const serverCallbacks = {
  with_launch_authority_mutation: async () => {
    sideEffects++;
    throw new Error("unexpected_payment_or_mutation");
  },
  read_sale_state: async () => {
    sideEffects++;
    throw new Error("unexpected_sale_state");
  },
};

function request(): any {
  return {
    route: { path: VOID_BUY_VOID_VERIFIED_PAYMENT_ROUTE_V2 },
    method: "POST",
    socket: { remoteAddress: "127.0.0.1" },
    headers: {
      host: "127.0.0.1:4100",
      authorization: "Bearer " + token,
      "x-void-operator-intent": "VOID_BUY_VOID_OPERATOR_MUTATION_V1",
      "sec-fetch-site": "same-origin",
      origin: "http://127.0.0.1:4100",
    },
    // Adversarial HTTP fields MUST NEVER be used as payment authority.
    query: { id: "buyvoid_attacker_ffffffff" },
    body: { payment_verified: true, event: "attacker-controlled" },
  };
}
function response() {
  const state: { code: number | null; body: any } = { code: null, body: null };
  const res: any = {
    status(code: number) { state.code = code; return this; },
    json(value: any) { state.body = value; return this; },
    setHeader() {},
  };
  return { res, state };
}
// Construct the event through the REAL canonical V2 USDC-log verifier,
// rather than inventing fields that no actual verification result contains.
function verifiedEventFor(original: any) {
  const amount = String(original.usdc_amount);
  const match = /^(0|[1-9][0-9]*)(?:\.([0-9]{1,6}))?$/u.exec(amount);
  assert.ok(match, "synthetic verifier fixture requires canonical USDC amount");
  const amountMicro = BigInt(match[1]) * 1_000_000n +
    BigInt((match[2] || "").padEnd(6, "0") || "0");
  assert.ok(amountMicro > 0n);
  const verified = buildBuyVoidVerifiedPaymentEventV2({
    request: original,
    receipt: {
      status: "0x1",
      transactionHash: chainTx,
      blockNumber: "0x64",
      logs: [{
        address: nativeUsdc,
        topics: [
          transferTopic,
          addressTopic(buyer),
          addressTopic(receiver),
        ],
        data: "0x" + amountMicro.toString(16),
        logIndex: "0x1",
        transactionHash: chainTx,
        blockNumber: "0x64",
      }],
    },
    policy: {
      allowed_chains: ["base"],
      usdc_contract_by_chain: { base: nativeUsdc },
      receive_address_by_chain: { base: receiver },
      current_block_number_by_chain: { base: "0x65" },
    },
  });
  if ("reason" in verified) throw new Error("synthetic_real_verifier_failed:" + verified.reason);
  assert.equal(Object.hasOwn(verified.event, "quoted_void"), false);
  assert.equal(verified.event.payment_verifier.amount_units, amountMicro.toString());
  assert.equal(verified.event.payment_verifier.requested_units, amountMicro.toString());
  return verified.event;
}
function serverInput(): any {
  const original = {
    request_id: id,
    source_chain: "base",
    payment_chain: "base",
    payment_chain_id: 8453,
    tx_hash: chainTx,
    usdc_amount: "3",
    quoted_void: "6",
    rate_void_per_usdc: "2",
    price_usdc_per_void: "0.50",
    delivery_address: buyer,
    receive_address: receiver,
    usdc_contract: nativeUsdc,
    launch_authority: launchAuthority,
    payment_instructions: {
      send_chain: "base",
      send_chain_id: 8453,
      token_contract: nativeUsdc,
      token_decimals: 6,
      send_to: receiver,
      send_from: buyer,
      amount: "3",
    },
  };
  return {
    event: verifiedEventFor(original),
    request: original,
    request_dir: scratch,
    allocation_ledger_root: VOID_BUY_VOID_ALLOCATION_LEDGER_ROOT_V1,
    allocation_high_water_root: VOID_BUY_VOID_ALLOCATION_HIGH_WATER_ROOT_V1,
    ...serverCallbacks,
  };
}
function lineageFor(requestRow: any, extraRows: any[] = []) {
  const rows = [requestRow, ...extraRows];
  return {
    requests_jsonl: Buffer.from(
      rows.map((row) => JSON.stringify(row)).join("\n") + "\n",
      "utf8",
    ),
    prior_operator_events_jsonl: Buffer.alloc(0),
    allocation_jsonl: Buffer.alloc(0),
  };
}
function canonicalLineage() {
  return lineageFor(serverInput().request);
}
function stage(
  input: any,
  http: any = request(),
  history: any = canonicalLineage(),
) {
  const { res, state } = response();
  const result = stageAuthenticatedBuyVoidVerifiedPaymentV2(
    http, res, input, history,
  );
  return { result, state };
}
function negative(
  input: any,
  marker: string,
  history: any = canonicalLineage(),
) {
  const { res } = response();
  assert.throws(
    () => stageAuthenticatedBuyVoidVerifiedPaymentV2(
      request(), res, input, history,
    ),
    new RegExp(marker, "u"),
  );
  cases++;
}

const index = fs.readFileSync("src/index.ts", "utf8");
assert.equal(index.includes("buy_void_verified_payment_v2_allocation_stage"), false);
assert.equal(index.includes("buy_void_verified_payment_transport_v2"), false);
assert.equal(
  fs.readFileSync("src/economic/buy_void_verified_payment_v2_allocation_stage.ts", "utf8")
    .includes("writeBuyVoidVerifiedPaymentAllocationHandoffV1"),
  false,
  "the in-memory stage must not import the durable writer",
);
const originalOpen = fs.openSync;
try {
  fs.chmodSync(scratch, 0o700);
  fs.writeFileSync(cred, token + "\n", { mode: 0o600, flag: "wx" });
  process.env.CREDENTIALS_DIRECTORY = scratch;
  (fs as any).openSync = function (...args: any[]) {
    const pathname = String(args[0] ?? "");
    assert.equal(
      pathname.startsWith("/var/lib/void-allocation-"),
      false,
      "staging must never access protected allocation roots",
    );
    return (originalOpen as any).apply(fs, args);
  };

  const mutable = serverInput();
  const { result, state } = stage(mutable);
  assert.ok(result);
  assert.equal(state.code, null);
  assert.equal(result.marker, VOID_BUY_VOID_VERIFIED_PAYMENT_V2_ALLOCATION_STAGE);
  assert.equal(Object.hasOwn(result.event, "quoted_void"), false,
    "real canonical event has no quote property");
  assert.equal(result.event.payment_verifier.usdc_contract, nativeUsdc);
  assert.equal(result.status, "staged_unmounted");
  assert.equal(result.kind, "verified_payment_allocation_handoff");
  assert.equal(result.mounted_verified_allocation_dispatch, false);
  assert.equal(result.source_only_unmounted, true);
  assert.equal(result.payment_instruction_amount_bound, true);
  assert.equal(result.canonical_first_request_lineage_preflight_verified, true);
  assert.equal(result.request_history_source_authenticated, false);
  assert.equal(result.event.request_id, id);
  assert.equal(result.request.request_id, id);
  assert.equal(result.event_snapshot_sha256.length, 64);
  assert.equal(result.request_snapshot_sha256.length, 64);
  assert.equal(result.allocation_ledger_root, VOID_BUY_VOID_ALLOCATION_LEDGER_ROOT_V1);
  assert.equal(result.allocation_high_water_root, VOID_BUY_VOID_ALLOCATION_HIGH_WATER_ROOT_V1);
  assert.equal(result.with_launch_authority_mutation, serverCallbacks.with_launch_authority_mutation);
  assert.equal(result.read_sale_state, serverCallbacks.read_sale_state);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.event), true);
  assert.equal(Object.isFrozen(result.request), true);
  assert.equal(Object.isFrozen(result.event.payment_verifier), true);
  cases++;

  // The returned plan is a detached pre-lock identity snapshot.
  mutable.event.request_id = "buyvoid_attacker_ffffffff";
  mutable.event.payment_verifier.transaction_hash = "0x" + "d".repeat(64);
  mutable.request.delivery_address = "0x" + "d".repeat(40);
  assert.equal(result.event.request_id, id);
  assert.equal(result.event.payment_verifier.transaction_hash, chainTx);
  assert.equal(result.request.delivery_address, buyer);
  assert.equal(result.event_snapshot_sha256, stage(serverInput()).result?.event_snapshot_sha256);
  cases++;

  // Both production numeric and historical canonical decimal-text requests
  // must work with a REAL verifier-generated event (which has no VOID quote).
  for (const [canonicalQuote, usdcAmount] of [
    [6, 3],
    ["6", 3],
    ["0.000002", "0.000001"],
    [0.000002, 0.000001],
  ] as const) {
    const allowed = serverInput();
    allowed.request.quoted_void = canonicalQuote;
    allowed.request.usdc_amount = usdcAmount;
    allowed.request.payment_instructions.amount = usdcAmount;
    allowed.event = verifiedEventFor(allowed.request);
    const admitted = stage(
      allowed, request(), lineageFor(allowed.request),
    ).result;
    assert.equal(admitted?.status, "staged_unmounted");
    assert.equal(admitted?.payment_acceptance, false);
    assert.equal(Object.hasOwn(admitted?.event || {}, "quoted_void"), false);
    cases++;
  }

  const wrongInstructionAmount = serverInput();
  wrongInstructionAmount.request.payment_instructions.amount = "30";
  negative(wrongInstructionAmount, "event_request_original_identity_mismatch");

  const missingInstructionAmount = serverInput();
  delete missingInstructionAmount.request.payment_instructions.amount;
  negative(missingInstructionAmount, "event_request_original_identity_mismatch");

  // A later full snapshot cannot backfill launch provenance omitted from the
  // first request row. The current request remains well-formed, but the
  // canonical chronology classifier must keep first-row absence negative.
  const currentWithLaunch = serverInput();
  const firstWithoutLaunch = structuredClone(currentWithLaunch.request);
  delete firstWithoutLaunch.launch_authority;
  negative(
    currentWithLaunch,
    "original_request_lineage_unqualified",
    lineageFor(firstWithoutLaunch, [currentWithLaunch.request]),
  );

  const firstWithoutToken = structuredClone(currentWithLaunch.request);
  delete firstWithoutToken.usdc_contract;
  negative(
    currentWithLaunch,
    "original_request_lineage_unqualified",
    lineageFor(firstWithoutToken, [currentWithLaunch.request]),
  );

  const missingQuote = serverInput();
  delete missingQuote.request.quoted_void;
  negative(missingQuote, "event_request_original_identity_mismatch");

  const oversizedHistory = canonicalLineage();
  oversizedHistory.requests_jsonl = Buffer.alloc(64 * 1024 * 1024 + 1);
  negative(
    serverInput(),
    "lineage_history_requests_jsonl_bytes_invalid",
    oversizedHistory,
  );

  let lengthGetterCalls = 0;
  const accessorHistory = canonicalLineage();
  const accessorBuffer = Buffer.from(accessorHistory.requests_jsonl);
  Object.defineProperty(accessorBuffer, "length", {
    configurable: true,
    get() {
      lengthGetterCalls++;
      throw new Error("lineage_history_length_getter_executed");
    },
  });
  accessorHistory.requests_jsonl = accessorBuffer;
  negative(
    serverInput(),
    "lineage_history_requests_jsonl_bytes_invalid",
    accessorHistory,
  );
  assert.equal(lengthGetterCalls, 0,
    "lineage history length accessor must never execute");

  let historyProxyTraps = 0;
  const proxyHistory = canonicalLineage();
  proxyHistory.requests_jsonl = new Proxy(Buffer.alloc(0), {
    get() {
      historyProxyTraps++;
      throw new Error("lineage_history_proxy_trap_executed");
    },
  }) as any;
  negative(
    serverInput(),
    "lineage_history_requests_jsonl_bytes_invalid",
    proxyHistory,
  );
  assert.equal(historyProxyTraps, 0,
    "lineage history proxy traps must never execute");

  const constructorHistory = canonicalLineage();
  const originalHistoryBytes = constructorHistory.requests_jsonl;
  const customBacking = new ArrayBuffer(originalHistoryBytes.length);
  const customBackingBuffer = Buffer.from(customBacking);
  originalHistoryBytes.copy(customBackingBuffer);
  let backingConstructorCalls = 0;
  Object.defineProperty(customBacking, "constructor", {
    configurable: true,
    get() {
      backingConstructorCalls++;
      throw new Error("lineage_backing_constructor_getter_executed");
    },
  });
  constructorHistory.requests_jsonl = customBackingBuffer;
  const customBackingResult = stage(
    serverInput(), request(), constructorHistory,
  ).result;
  assert.equal(customBackingResult?.status, "staged_unmounted");
  assert.equal(backingConstructorCalls, 0,
    "lineage copy must not consult backing ArrayBuffer constructor");

  const detachedHistory = canonicalLineage();
  const detachedBacking = new ArrayBuffer(0);
  const detachedBuffer = Buffer.from(detachedBacking);
  structuredClone(detachedBacking, { transfer: [detachedBacking] });
  detachedHistory.prior_operator_events_jsonl = detachedBuffer;
  negative(
    serverInput(),
    "lineage_history_prior_operator_events_jsonl_bytes_invalid",
    detachedHistory,
  );
  for (const badQuote of [
    null, "", "0", 0, "-6", "06", "6 ", "6e0", "6.0000001",
    "10000001", 10000001, 0.0000001, true, {}, [],
  ]) {
    const bad = serverInput();
    bad.request.quoted_void = badQuote;
    negative(bad, "event_request_original_identity_mismatch");
  }
  for (const [field, value] of [
    ["usdc_amount", "2.5"],
    ["usdc_amount", ""],
    ["usdc_amount", "0"],
    ["rate_void_per_usdc", "3"],
    ["rate_void_per_usdc", null],
    ["price_usdc_per_void", "0.40"],
    ["price_usdc_per_void", null],
    ["quoted_void", "7"],
    ["quoted_void", 6.000001],
    ["usdc_contract", "0x" + "f".repeat(40)],
  ] as const) {
    const bad = serverInput();
    bad.request[field] = value;
    negative(bad, "event_request_original_identity_mismatch");
  }
  for (const [field, value] of [
    ["amount_units", "3000001"],
    ["requested_units", "2999999"],
    ["usdc_contract", "0x" + "f".repeat(40)],
  ] as const) {
    const bad = serverInput();
    bad.event.payment_verifier[field] = value;
    negative(bad, "event_request_original_identity_mismatch");
  }
  const fabricatedQuote = serverInput();
  fabricatedQuote.event.quoted_void = "6";
  negative(fabricatedQuote, "event_request_original_identity_mismatch");

  negative({ ...serverInput(), event: { ...serverInput().event, request_id: "buyvoid_forged_ffffffff" } },
    "request_event_identity_status_or_server_callbacks_invalid");
  negative({ ...serverInput(), event: { ...serverInput().event, operator_status: "reviewed" } },
    "legacy_payment_only_writer_forbidden");
  negative({ ...serverInput(), event: { ...serverInput().event, operator_status: "payment_verified " } },
    "request_event_identity_status_or_server_callbacks_invalid");
  negative({ ...serverInput(), event: { ...serverInput().event, payment_verified: false } },
    "event_request_original_identity_mismatch");
  negative({ ...serverInput(), request: { ...serverInput().request, source_chain: "ethereum" } },
    "event_request_original_identity_mismatch");
  negative({ ...serverInput(), request: { ...serverInput().request, tx_hash: "0x" + "e".repeat(64) } },
    "event_request_original_identity_mismatch");
  negative({ ...serverInput(), request: { ...serverInput().request, delivery_address: "0x" + "e".repeat(40) } },
    "event_request_original_identity_mismatch");
  negative({ ...serverInput(), allocation_ledger_root: "/tmp/attacker" },
    "allocation_roots_not_canonical");
  negative({ ...serverInput(), request_dir: "relative/attacker" },
    "request_root_not_absolute_normalized_private");
  negative({ ...serverInput(), request_dir: "/" },
    "request_root_not_absolute_normalized_private");
  negative({ ...serverInput(), event: {
    ...serverInput().event,
    payment_verifier: {
      ...serverInput().event.payment_verifier, log_index: "-1",
    },
  } }, "event_request_original_identity_mismatch");
  negative({ ...serverInput(), request: {
    ...serverInput().request, quoted_void: "600000",
  } }, "event_request_original_identity_mismatch");

  let invokedGetter = 0;
  const attacker = serverInput();
  Object.defineProperty(attacker.event, "operator_status", {
    enumerable: true,
    get() { invokedGetter++; throw new Error("untrusted_getter_executed"); },
  });
  negative(attacker, "accessor_or_nondata_property");
  assert.equal(invokedGetter, 0);

  const adversarial = serverInput();
  let proxyTraps = 0;
  adversarial.event = new Proxy(adversarial.event, {
    get() { proxyTraps++; throw new Error("untrusted_proxy_executed"); },
  });
  negative(adversarial, "proxy_forbidden");
  assert.equal(proxyTraps, 0);

  // Identity must be checked before evaluating any untrusted dispatch input.
  const failedBearer = request();
  failedBearer.headers.authorization = "Bearer voidbvo1." + "X".repeat(43);
  const neverRead = serverInput();
  Object.defineProperty(neverRead, "event", {
    enumerable: true,
    get() { throw new Error("untrusted_input_read_before_auth"); },
  });
  const poisonHistory: any = {};
  Object.defineProperty(poisonHistory, "requests_jsonl", {
    enumerable: true,
    get() { throw new Error("history_read_before_auth"); },
  });
  const rejected = stage(neverRead, failedBearer, poisonHistory);
  assert.equal(rejected.result, null);
  assert.equal(rejected.state.code, 401);
  cases++;

  for (const key of [
    "request_history_source_authenticated",
    "source_finality_authentication_verified",
    "cross_uid_service_authenticated",
    "mounted_verified_allocation_dispatch",
    "payment_capacity_lock_verified",
    "payment_acceptance",
    "presale_activation",
    "funds_movement",
  ]) {
    assert.equal((result as any)[key], false, key);
    assert.equal((VOID_BUY_VOID_VERIFIED_PAYMENT_V2_ALLOCATION_STAGE_AUTHORITY as any)[key], false, key);
  }
  assert.equal(Object.isFrozen(VOID_BUY_VOID_VERIFIED_PAYMENT_V2_ALLOCATION_STAGE_AUTHORITY), true);
  assert.equal(sideEffects, 0, "no payment, sale, RPC or allocation callback may run");
  assert.equal(fs.existsSync(path.join(scratch, "operator-events.jsonl")), false);
  assert.equal(fs.existsSync(path.join(scratch, "allocation-reservations-v1.jsonl")), false);
  cases++;
} finally {
  (fs as any).openSync = originalOpen;
  if (oldCred === undefined) delete process.env.CREDENTIALS_DIRECTORY;
  else process.env.CREDENTIALS_DIRECTORY = oldCred;
  fs.rmSync(scratch, { recursive: true, force: true });
}

console.log("VOID_BUY_VOID_VERIFIED_PAYMENT_V2_ALLOCATION_STAGE_PROOF_GREEN");
console.log("adversarial_cases=" + String(cases));
console.log("real_private_bearer_and_canonical_allocation_planner_used=true");
console.log("server_only_event_and_request_snapshotted=true");
console.log("numeric_and_text_canonical_void_quotes_supported=true");
console.log("real_canonical_verifier_event_without_quote_stages=true");
console.log("request_quote_bound_to_verified_usdc_micro_units_and_rate=true");
console.log("payment_instruction_amount_bound_to_verified_usdc=true");
console.log("first_request_launch_and_native_usdc_backfill_rejected=true");
console.log("canonical_first_request_lineage_preflight_verified=true");
console.log("lineage_history_bounded_before_copy=true");
console.log("lineage_history_accessor_and_proxy_traps_not_executed=true");
console.log("lineage_history_backing_constructor_not_consulted=true");
console.log("lineage_history_detached_buffer_rejected=true");
console.log("request_history_source_authenticated=false");
console.log("equal_missing_zero_or_invalid_void_quotes_rejected=true");
console.log("auth_denial_precedes_untrusted_planning=true");
console.log("payment_only_writer_unreachable=true");
console.log("callback_and_protected_root_access=false");
console.log("source_only_unmounted=true");
console.log("payment_acceptance=false");
console.log("presale_activation=false");
console.log("funds_movement=false");
