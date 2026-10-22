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
function serverInput(): any {
  return {
    event: {
      schema: "void_buy_void_verified_payment_event_v2",
      marker: "VOID_BUY_VOID_VERIFIED_PAYMENT_V2",
      request_id: id,
      operator_status: "payment_verified",
      payment_verified: true,
      payment_identity_input_complete: true,
      marked_at_ms: 100,
      tx_hash: chainTx,
      quoted_void: "6",
      payment_verifier: {
        chain: "base",
        transaction_hash: chainTx,
        log_index: "1",
        from_address: buyer,
        delivery_address: buyer,
        receive_address: receiver,
      },
    },
    request: {
      request_id: id,
      source_chain: "base",
      tx_hash: chainTx,
      quoted_void: "6",
      delivery_address: buyer,
      receive_address: receiver,
    },
    request_dir: scratch,
    allocation_ledger_root: VOID_BUY_VOID_ALLOCATION_LEDGER_ROOT_V1,
    allocation_high_water_root: VOID_BUY_VOID_ALLOCATION_HIGH_WATER_ROOT_V1,
    ...serverCallbacks,
  };
}
function stage(input: any, http: any = request()) {
  const { res, state } = response();
  const result = stageAuthenticatedBuyVoidVerifiedPaymentV2(http, res, input);
  return { result, state };
}
function negative(input: any, marker: string) {
  const { res } = response();
  assert.throws(
    () => stageAuthenticatedBuyVoidVerifiedPaymentV2(request(), res, input),
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
  assert.equal(result.status, "staged_unmounted");
  assert.equal(result.kind, "verified_payment_allocation_handoff");
  assert.equal(result.mounted_verified_allocation_dispatch, false);
  assert.equal(result.source_only_unmounted, true);
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

  // The real public request handler stores a NUMBER; the private fixture uses
  // decimal text. Positive canonical quotes in either format must still stage.
  for (const canonicalQuote of [6, 0.000001, "0.000001"]) {
    const allowed = serverInput();
    allowed.event.quoted_void = canonicalQuote;
    allowed.request.quoted_void = canonicalQuote;
    const admitted = stage(allowed).result;
    assert.equal(admitted?.status, "staged_unmounted");
    assert.equal(admitted?.payment_acceptance, false);
    cases++;
  }

  // Plain equality was insufficient: two omitted or equal invalid values
  // must never authorize even an unmounted allocation preflight.
  const missingQuotes = serverInput();
  delete missingQuotes.event.quoted_void;
  delete missingQuotes.request.quoted_void;
  negative(missingQuotes, "event_request_original_identity_mismatch");
  const badQuotePairs: [unknown, unknown][] = [
    [null, null],
    ["", ""],
    ["0", "0"],
    [0, 0],
    ["-6", "-6"],
    ["06", "06"],
    ["6 ", "6 "],
    ["6e0", "6e0"],
    ["6.0000001", "6.0000001"],
    ["10000001", "10000001"],
    [10000001, 10000001],
    [0.0000001, 0.0000001],
    [true, true],
    ["6", 6],
    [6, "6"],
    ["6", "7"],
  ];
  for (const [eventQuote, requestQuote] of badQuotePairs) {
    const invalid = serverInput();
    invalid.event.quoted_void = eventQuote;
    invalid.request.quoted_void = requestQuote;
    negative(invalid, "event_request_original_identity_mismatch");
  }

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
  negative({ ...serverInput(), event: {
    ...serverInput().event, quoted_void: "600000",
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
  const rejected = stage(neverRead, failedBearer);
  assert.equal(rejected.result, null);
  assert.equal(rejected.state.code, 401);
  cases++;

  for (const key of [
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
console.log("equal_missing_zero_or_invalid_void_quotes_rejected=true");
console.log("auth_denial_precedes_untrusted_planning=true");
console.log("payment_only_writer_unreachable=true");
console.log("callback_and_protected_root_access=false");
console.log("source_only_unmounted=true");
console.log("payment_acceptance=false");
console.log("presale_activation=false");
console.log("funds_movement=false");
