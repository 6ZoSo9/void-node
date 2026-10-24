import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const viewsPath = "public/void-app-wave1-v1/assets/js/views.js";
const clientPath = "public/void-app-wave1-v1/assets/js/buy-live.js";
const canonicalPricePath = "src/index.ts";
const source = readFileSync(viewsPath, "utf8");
const client = readFileSync(clientPath, "utf8");
const canonicalSource = readFileSync(canonicalPricePath, "utf8");
const canonicalLaunchGate = readFileSync("src/economic/buy_void_coupled_launch_gate_v1.mjs", "utf8");
const checkoutContractDoc = readFileSync(
  "docs/public/buy-void-public-checkout-contract-v1.md", "utf8",
);
// Internal duplicate suppression is not an authenticated public 200/201
// recovery path. A buyer must not infer that a lost POST was unsuccessful.
assert.match(checkoutContractDoc,
  /unauthenticated public POST returns a generic HTTP 409/u,
  "public checkout contract must describe anonymous duplicate conflict");
assert.match(checkoutContractDoc,
  /REQUEST OUTCOME UNCONFIRMED — DO NOT SEND FUNDS OR RESUBMIT/u,
  "public checkout contract must forbid payment/retry after ambiguous POST");
assert.doesNotMatch(checkoutContractDoc,
  /Repeating the same\s+amount on the same payment chain is idempotent/u,
  "public checkout must not misrepresent a generic 409 as successful recovery");

assert.match(canonicalLaunchGate, /const LIVE_ACTIVATION_MAX_LEASE_MS = 5 \* 60 \* 1000;/u,
  "client checkout receipt lifetime must match canonical five-minute activation lease");

function canonicalPriceDefaultPattern() {
  return /process\.env\.VOID_BUY_PRICE_USDC_PER_VOID\s*\|\|\s*"([0-9]+(?:\.[0-9]+)?)"/g;
}
function readCanonicalPrice(sourceText) {
  const defaults = [...sourceText.matchAll(canonicalPriceDefaultPattern())].map((match) => match[1]);
  assert.ok(defaults.length > 0, "canonical Buy VOID price default must be present in src/index.ts");
  const distinct = [...new Set(defaults)];
  assert.equal(distinct.length, 1, "all canonical Buy VOID price defaults in src/index.ts must agree exactly");
  return { price: distinct[0], occurrenceCount: defaults.length };
}
function incrementLeastSignificantDecimalUnit(value) {
  const match = /^(0|[1-9][0-9]*)(?:\.([0-9]+))?$/.exec(value);
  assert.ok(match, `canonical Buy VOID price must be an exact non-negative decimal: ${value}`);
  const fraction = match[2] || "";
  const scale = fraction.length;
  const digits = `${match[1]}${fraction}`;
  const incremented = (BigInt(digits) + 1n).toString().padStart(scale + 1, "0");
  if (scale === 0) return incremented;
  return `${incremented.slice(0, -scale)}.${incremented.slice(-scale)}`;
}
function assertBuyPriceMatchesCanonical(buySource, canonicalSourceText) {
  const { price, occurrenceCount } = readCanonicalPrice(canonicalSourceText);
  const displayedDollarValues = [...buySource.matchAll(/\$([0-9]+(?:\.[0-9]+)?)/g)].map((match) => match[1]);
  assert.ok(displayedDollarValues.length > 0, "participant-visible Buy view must expose the reviewed policy price");
  for (const displayed of displayedDollarValues) {
    assert.equal(displayed, price, `participant-visible Buy price must match canonical VOID_BUY_PRICE_USDC_PER_VOID default (${price})`);
  }
  return { price, occurrenceCount, displayCount: displayedDollarValues.length };
}

assert.match(source, /buy: \(\) => buyView\(\),/);
assert.doesNotMatch(source, /buy: \(\) => placeholderView/, "the Buy route must not fall back to the generic scaffold");

const start = source.indexOf("function buyView()");
const end = source.indexOf("function marketView()", start);
assert.ok(start >= 0 && end > start, "bounded Buy view source block is required");
const buyView = source.slice(start, end);
const canonicalPrice = assertBuyPriceMatchesCanonical(buyView, canonicalSource);

for (const required of [
  "VOID_BUY_VOID_APP_LAUNCH_READY_V1",
  `$${canonicalPrice.price} / VOID`,
  "SELF-CUSTODY ONLY — EXCHANGE SENDS ARE TREATED AS LOST",
  "VOID is not listed on any exchange.",
  "data-buy-request-form",
  "data-buy-submit",
  'aria-describedby="buy-usdc-amount-help buy-usdc-amount-error"',
  'aria-describedby="buy-void-destination-help buy-void-destination-error"',
  'data-buy-amount-error role="status"',
  'data-buy-destination-error role="status"',
  'required aria-required="true"',
  "disabled",
  "The selected-rail USDC sender must be this exact same address.",
  "This page never sends funds or connects a wallet.",
  "WC / VOID market",
  "Earn Work Credits",
]) {
  assert.ok(buyView.includes(required), `missing launch-ready Buy view text: ${required}`);
}

for (const required of [
  "BUY_CONFIG_ENDPOINT = '/__void/buy-void/config.json'",
  "BUY_STATUS_ENDPOINT = '/__void/buy-void/status.json'",
  "BUY_SALE_ENDPOINT = '/__void/buy-void/sale-state.json'",
  "BUY_REQUEST_ENDPOINT = '/__void/buy-void/request'",
  "method: 'POST'",
  "config.requests_enabled === true",
  "config.payment_ready === true",
  "config.receiver_binding_green === true",
  "snapshot.status.request_intake_ready === true",
  "snapshot.sale.sold_out === false",
  "snapshot.sale.remaining_void > 0",
  "typeof sale.sold_out !== 'boolean'",
  "typeof value !== 'number'",
  "config.price_usdc_per_void !== '0.50'",
  "config.rate_void_per_usdc !== '2'",
  "readinessPending || submitBusy",
  "readinessPending = true",
  "loadingViewGeneration === buyViewGeneration",
  "activeBuyView === buyView",
  "if (!stillOwnsLoadingView()) return;",
  "currentSnapshot = null",
  "ack_self_custody",
  "ack_request_before_payment",
  "ack_sender_equals_void_destination",
  "do_not_send_from_exchange_or_pooled_custody",
  "VOID cannot recover exchange/custodial sends",
  "body.schema !== 'void_public_buy_void_checkout_request_result_v1'",
  "request.void_destination_address",
  "returned request amount mismatch",
  "returned request VOID quote mismatch",
  "quotedVoidAtoms !== submittedAtoms * 2n",
  "request.rate_void_per_usdc !== checkoutPolicyAtSubmit?.config.rate_void_per_usdc",
  "request.price_usdc_per_void !== checkoutPolicyAtSubmit?.config.price_usdc_per_void",
  "request.safety?.automatic_fulfillment !== false",
  "request.safety?.manual_review_required !== true",
  "attemptedIntentKey",
  "REQUEST OUTCOME UNCONFIRMED",
  "A request may have been recorded",
  "usdcAtoms",
  "updateFieldErrors",
  "42-character 0x VOID address",
  "MAX_BUY_JSON_BYTES = 131072",
  "response.body?.getReader?.()",
  "Buy VOID response exceeds byte limit",
  "new TextDecoder('utf-8', { fatal: true })",
  "0x17a26d4f0c51bd28fbcf5cdd4d20853bfa112ae5",
  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  "data-buy-chain",
  "config.payment_chains",
  "config.ethereum_requests_enabled",
  "ack_native_usdc",
  "source_chain: chain",
  "request.payment_instructions?.send_chain",
  "request.payment_instructions?.token_contract",
  "request.delivery_chain !== 'void'",
  "request.delivery_chain_id !== 2050",
  "request.asset_in !== 'USDC'",
  "request.usdc_decimals !== 6",
  "request.request_contract?.request_before_payment_required !== true",
  "request.request_contract?.one_active_request_per_void_destination !== true",
  "request.request_contract?.payment_sender_must_equal_void_destination !== true",
  "request.request_contract?.payment_tx_hash_bound_after_request_by_operator !== true",
  "request.payment_instructions?.send_asset !== 'USDC'",
  "request.payment_instructions?.token_decimals !== 6",
  "let buyViewGeneration = 0;",
  "submittingBuyGeneration === buyViewGeneration",
  "activeBuyView === submittingBuyView",
  "if (!stillOwnsSubmittingView()) return;",
  "request.payment_instructions?.keep_transaction_hash",
  "request.payment_instructions?.do_not_send_before_request",
  "request.payment_instructions?.amount",
  "request.payment_instructions?.request_id",
  "request.tx_hash !== ''",
  "request.status !== 'awaiting_payment_tx_hash'",
  "body.idempotent !== false",
  "response.status !== 201",
  "!/^[A-Za-z0-9_-]{1,128}$/.test(request.request_id)",
  "request.persisted.ok !== true",
  "!Object.hasOwn(request.persisted, 'ok')",
  "Object.keys(request.persisted).length !== 1",
  "request.ok !== true",
  "request.marker !== BUY_MARKER",
  "request.schema !== 'void_public_buy_void_checkout_request_v1'",
  "body.one_active_request_cap_enforced !== true",
  "body.marker !== BUY_MARKER",
  "attemptedResultReadinessSerial",
  "readinessSerialAtSubmit",
  "attemptedResultReadinessSerial === requestSerial",
  "attemptedResultExpiresAtMs",
  "REQUEST INSTRUCTIONS EXPIRED",
  "armReceiptExpiryTimer",
  "clearReceiptExpiryTimer",
  "request.launch_authority?.expires_at_ms",
  "request.created_at_ms",
  "receiptMonotonicNow",
  "BUY_RECEIPT_MAX_CLOCK_SKEW_MS = 5000",
  "BUY_RECEIPT_MAX_LIVE_LEASE_MS = 5 * 60 * 1000",
  "instructionExpiresAtMs",
  "document.addEventListener('visibilitychange'",
  "window.addEventListener('pageshow'",
  "window.addEventListener('focus'",
]) {
  assert.ok(client.includes(required), `missing launch gate/client binding: ${required}`);
}

for (const forbidden of [
  /window\.ethereum/,
  /eth_sendTransaction/,
  /personal_sign/,
  /eth_requestAccounts/,
  /wallet_requestPermissions/,
]) {
  assert.doesNotMatch(client, forbidden, "Buy request client must not acquire browser wallet/signing authority");
}

const driftedPrice = incrementLeastSignificantDecimalUnit(canonicalPrice.price);
let rewrittenDefaults = 0;
const driftedCanonicalSource = canonicalSource.replace(canonicalPriceDefaultPattern(), (full, captured) => {
  rewrittenDefaults += 1;
  return full.replace(`"${captured}"`, `"${driftedPrice}"`);
});
assert.equal(rewrittenDefaults, canonicalPrice.occurrenceCount, "falsification fixture must rewrite every canonical Buy VOID price default");
assert.throws(
  () => assertBuyPriceMatchesCanonical(buyView, driftedCanonicalSource),
  /participant-visible Buy price must match canonical/,
  "one least-significant-unit canonical policy change must fail the Buy-view price proof",
);

assert.doesNotThrow(() => {
  new Function(source.replace("export const views =", "const views ="));
});
new Function(client);

const submitButton = { disabled: true };
const buyMessageNode = { textContent: "" };
const buyIntakeNode = { textContent: "" };
const buyResultNode = { textContent: "" };
const fieldNode = (value) => {
  const attributes = new Map();
  return {
    value,
    disabled: false,
    setAttribute(name, nextValue) {
      attributes.set(name, String(nextValue));
    },
    removeAttribute(name) {
      attributes.delete(name);
    },
    getAttribute(name) {
      return attributes.get(name) ?? null;
    },
  };
};
let amountInput = fieldNode("10");
let destinationInput = fieldNode("0x1111111111111111111111111111111111111111");
let amountError = { textContent: "" };
let destinationError = { textContent: "" };
const chainInput = { value: "base", disabled: false };
const ackNames = [
  "self_custody",
  "native_usdc",
  "request_before_payment",
  "sender_equals_void_destination",
  "no_automatic_fulfillment",
];
const ackNodes = ackNames.map((name) => ({
  dataset: { buyAck: name },
  checked: true,
  disabled: false,
}));
let buyViewNode = {};
const replaceBuyView = () => {
  amountInput = fieldNode("");
  destinationInput = fieldNode("");
  amountError = { textContent: "" };
  destinationError = { textContent: "" };
  buyViewNode = {};
};
const fetchCalls = [];
const windowEventHandlers = new Map();
const documentEventHandlers = new Map();
let syntheticMonoMs = 100000;
const sandbox = {
  performance: { now: () => syntheticMonoMs },
  console,
  location: { hash: "#/buy" },
  window: {
    addEventListener(name, handler) {
      windowEventHandlers.set(name, handler);
    },
  },
  document: {
    visibilityState: "visible",
    querySelector(selector) {
      if (selector === "[data-buy-submit]") return submitButton;
      if (selector === "[data-buy-amount]") return amountInput;
      if (selector === "[data-buy-destination]") return destinationInput;
      if (selector === "[data-buy-amount-error]") return amountError;
      if (selector === "[data-buy-destination-error]") return destinationError;
      if (selector === "[data-buy-chain]") return chainInput;
      if (selector === "[data-buy-view]") return buyViewNode;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === "[data-buy-message]") return [buyMessageNode];
      if (selector === "[data-buy-intake]") return [buyIntakeNode];
      if (selector === "[data-buy-result]") return [buyResultNode];
      if (selector === "[data-buy-ack]") return ackNodes;
      if (
        selector ===
        "[data-buy-chain], [data-buy-amount], [data-buy-destination], [data-buy-ack]"
      ) {
        return [chainInput, amountInput, destinationInput, ...ackNodes];
      }
      return [];
    },
    addEventListener(name, handler) {
      documentEventHandlers.set(name, handler);
    },
    getElementById() { return null; },
  },
  MutationObserver: class {
    observe() {}
  },
  setTimeout() { return 0; },
  clearTimeout() {},
  queueMicrotask() {},
  fetch: async (...args) => {
    fetchCalls.push(args);
    throw new Error("unexpected_fetch");
  },
  AbortSignal: globalThis.AbortSignal,
  TextDecoder: globalThis.TextDecoder,
  Uint8Array: globalThis.Uint8Array,
};
const instrumentedClient = client + `
;globalThis.__voidBuyTestV1 = {
  strictJson,
  validateSnapshot,
  isOpen,
  renderSnapshot,
  renderError,
  updateSubmit,
  loadBuy,
  submitBuy,
  markFieldTouched,
  beginBuyViewInstance,
  setState(snapshot, pending, busy) {
    currentSnapshot = snapshot;
    readinessPending = pending;
    submitBusy = busy;
  },
  setReadinessPending(value) {
    readinessPending = value;
  },
  // Test harness only: each independent malformed receipt gets a fresh
  // synthetic document state after all existing no-retry proofs complete.
  resetForIndependentReceiptFixtures() {
    attemptedIntentKeys.clear();
    attemptedIntentKey = null;
    attemptedResultText = null;
    attemptedResultReadinessSerial = null;
    attemptedResultExpiresAtMs = null;
    attemptedResultMonoDeadlineMs = null;
    attemptedResultAcceptedMonoMs = null;
    attemptedResultAcceptedWallMs = null;
    attemptedResultExpired = false;
    clearReceiptExpiryTimer();
  },
};
`;
vm.runInNewContext(instrumentedClient, sandbox, {
  filename: clientPath,
});
const buyTest = sandbox.__voidBuyTestV1;
assert.ok(buyTest);

// Header/deadline fast refusal must release an UNLOCKED upstream body.
// HTTP 201 may have been committed before these bytes arrived, so rejecting
// the body must preserve the original uncertain-outcome/no-retry contract.
// Cancellation may hang, reject or throw; never acquire a reader or await it.
for (const fixture of [
  {
    label: "precheck_invalid_deadline",
    deadline: 0,
    contentType: "application/json",
    length: null,
    expected: /invalid Buy VOID body deadline/u,
    cancel: () => new Promise(() => undefined),
  },
  {
    label: "precheck_non_json_body",
    deadline: 100,
    contentType: "text/plain",
    length: null,
    expected: /non-JSON Buy VOID response/u,
    cancel: () => Promise.reject(new Error("synthetic_header_cancel_rejected")),
  },
  {
    label: "precheck_declared_oversize",
    deadline: 100,
    contentType: "application/json",
    length: "131073",
    expected: /Buy VOID response exceeds byte limit/u,
    cancel: () => { throw new Error("synthetic_header_cancel_threw"); },
  },
  {
    label: "precheck_throwing_headers",
    deadline: 100,
    contentType: "throw",
    length: null,
    expected: /synthetic_header_get_failed/u,
    cancel: () => new Promise(() => undefined),
  },
]) {
  let readersAcquired = 0;
  let cancellationCalls = 0;
  const response = {
    headers: {
      get(name) {
        if (fixture.contentType === "throw") {
          throw new Error("synthetic_header_get_failed");
        }
        return name === "content-type" ? fixture.contentType : fixture.length;
      },
    },
    body: {
      getReader() {
        readersAcquired += 1;
        throw new Error("header_rejection_must_not_lock_reader");
      },
      cancel() {
        cancellationCalls += 1;
        return fixture.cancel();
      },
    },
  };
  let clockTimeout = null;
  const outcome = await Promise.race([
    buyTest.strictJson(response, fixture.deadline).then(
      () => ({ kind: "incorrect_accept" }),
      (error) => ({ kind: "held", message: String(error?.message || error) }),
    ),
    new Promise((resolve) => {
      clockTimeout = setTimeout(
        () => resolve({ kind: "cancel_blocked" }), 250);
    }),
  ]);
  clearTimeout(clockTimeout);
  assert.equal(outcome.kind, "held",
    fixture.label + ": nonsettling cancel must never delay refusal");
  assert.match(outcome.message, fixture.expected,
    fixture.label + ": cancellation must not replace original error");
  assert.equal(readersAcquired, 0,
    fixture.label + ": early failure must not acquire a stream reader");
  assert.equal(cancellationCalls, 1,
    fixture.label + ": one best-effort unlocked-body cancellation");
}

// After valid headers and clock admission, getReader() itself can be
// absent, return no reader, or throw (including while reading the method
// property). These bodies remain UNLOCKED; the actual client must cancel
// without waiting, then preserve the original refusal. A thrown cancellation
// must not mask the reader-acquisition failure.
for (const fixture of [
  {
    label: "reader_method_missing",
    mode: "missing",
    expected: /Buy VOID response stream unavailable/u,
    cancel: () => new Promise(() => undefined),
  },
  {
    label: "reader_method_returns_null",
    mode: "null",
    expected: /Buy VOID response stream unavailable/u,
    cancel: () => Promise.reject(new Error("synthetic_acquire_cancel_rejected")),
  },
  {
    label: "reader_method_throws",
    mode: "throw",
    expected: /synthetic_reader_acquisition_failed/u,
    cancel: () => { throw new Error("synthetic_acquire_cancel_threw"); },
  },
  {
    label: "reader_getter_denied_unlocked_cleanup",
    mode: "getter",
    expected: /synthetic_reader_getter_failed/u,
    cancel: () => new Promise(() => undefined),
  },
]) {
  let acquisitions = 0;
  let cancellationCalls = 0;
  const body = {
    cancel() {
      cancellationCalls += 1;
      return fixture.cancel();
    },
  };
  if (fixture.mode === "getter") {
    Object.defineProperty(body, "getReader", {
      get() {
        acquisitions += 1;
        throw new Error("synthetic_reader_getter_failed");
      },
    });
  } else if (fixture.mode !== "missing") {
    body.getReader = () => {
      acquisitions += 1;
      if (fixture.mode === "throw") {
        throw new Error("synthetic_reader_acquisition_failed");
      }
      return null;
    };
  }
  const response = {
    headers: {
      get(name) { return name === "content-type" ? "application/json" : null; },
    },
    body,
  };
  let timeout = null;
  const outcome = await Promise.race([
    buyTest.strictJson(response).then(
      () => ({ kind: "incorrect_accept" }),
      (error) => ({ kind: "held", message: String(error?.message || error) }),
    ),
    new Promise((resolve) => {
      timeout = setTimeout(() => resolve({ kind: "stalled_on_cancel" }), 250);
    }),
  ]);
  clearTimeout(timeout);
  assert.equal(outcome.kind, "held",
    fixture.label + ": unlocked-body cancellation must never stall refusal");
  assert.match(outcome.message, fixture.expected,
    fixture.label + ": preserve reader-acquisition failure, not cancel error");
  assert.equal(acquisitions, fixture.mode === "missing" ? 0 : 1,
    fixture.label + ": acquisition invocation count must be exact");
  assert.equal(cancellationCalls, 1,
    fixture.label + ": cancel the unopened body exactly once");
}

// An unavailable clock must reject BEFORE getReader() acquires a stream.
// An earlier implementation acquired and then threw, retaining a locked
// response body without any cancellation path. Use the actual Buy client.
{
  const originalClockValue = syntheticMonoMs;
  const originalPerformance = sandbox.performance;
  try {
    for (const scenario of ["nan", "negative", "missing", "throwing"]) {
      sandbox.performance = originalPerformance;
      syntheticMonoMs = scenario === "nan" ? Number.NaN
        : scenario === "negative" ? -1 : 100000;
      if (scenario === "missing") sandbox.performance = undefined;
      if (scenario === "throwing") sandbox.performance = {
        now() { throw new Error("synthetic_performance_access_denied"); },
      };
      let readersAcquired = 0;
      let reads = 0;
      const response = {
        headers: { get(name) {
          return name === "content-type" ? "application/json" : null;
        } },
        body: { getReader() {
          readersAcquired += 1;
          return {
            read() { reads += 1; return Promise.resolve({ done: true }); },
            cancel() { throw new Error("unowned_stream_must_not_be_canceled"); },
          };
        } },
      };
      await assert.rejects(
        () => buyTest.strictJson(response),
        /Buy VOID response body monotonic clock unavailable/u,
        scenario + ": no acquired reader when clock is unqualified",
      );
      assert.equal(readersAcquired, 0,
        scenario + ": fail before acquiring any stream reader");
      assert.equal(reads, 0,
        scenario + ": no read attempted without a monotonic clock");
    }
  } finally {
    syntheticMonoMs = originalClockValue;
    sandbox.performance = originalPerformance;
  }
}

// A malformed or over-budget source may return a cancel() promise that
// never settles, rejects, or throws. None may hold the original exception,
// or leave a potentially committed POST in a spinner instead of a HOLD.
for (const fixture of [
  {
    label: "never_settling_cancel",
    value: new Uint8Array(0),
    expected: /invalid Buy VOID response stream/u,
    cancel: () => new Promise(() => undefined),
  },
  {
    label: "rejecting_cancel_after_oversize",
    value: new Uint8Array(131073),
    expected: /Buy VOID response exceeds byte limit/u,
    cancel: () => Promise.reject(new Error("synthetic_cancel_rejected")),
  },
  {
    label: "throwing_cancel_after_invalid_chunk",
    value: null,
    expected: /invalid Buy VOID response stream/u,
    cancel: () => { throw new Error("synthetic_cancel_threw"); },
  },
]) {
  let cancelCalls = 0;
  const response = {
    headers: {
      get(name) { return name === "content-type" ? "application/json" : null; },
    },
    body: {
      getReader() {
        return {
          async read() { return { done: false, value: fixture.value }; },
          cancel() { cancelCalls += 1; return fixture.cancel(); },
        };
      },
    },
  };
  let timeout = null;
  const observed = await Promise.race([
    buyTest.strictJson(response).then(
      () => ({ result: "wrongly_accepted" }),
      (error) => ({ result: "rejected", message: String(error?.message || error) }),
    ),
    new Promise((resolve) => {
      timeout = setTimeout(() => resolve({ result: "cancellation_blocked" }), 300);
    }),
  ]);
  clearTimeout(timeout);
  assert.equal(observed.result, "rejected", fixture.label + ": cancellation must never stall HOLD");
  assert.match(observed.message, fixture.expected,
    fixture.label + ": preserve original response failure, not cancel failure");
  assert.equal(cancelCalls, 1, fixture.label + ": cancellation attempted only once");
}


 // A POST may already have committed before an HTTP response-body read
 // stalls. The buyer must receive a bounded uncertain outcome even if the
 // body reader and its cancellation ignore AbortSignal and never settle.
 {
   const oldTimeout = sandbox.setTimeout;
   const oldClearTimeout = sandbox.clearTimeout;
   sandbox.setTimeout = setTimeout;
   sandbox.clearTimeout = clearTimeout;
   try {
     for (const fixture of [
       {
         name: "nonsettling_read_and_cancel",
         bodyRead: () => new Promise(() => undefined),
         cancel: () => new Promise(() => undefined),
         deadline: 25,
       },
       {
         name: "indefinite_trickle_cannot_extend_absolute_deadline",
         bodyRead: () => new Promise((resolve) =>
           setTimeout(() => resolve({ done: false, value: new Uint8Array([123]) }), 4)),
         cancel: () => Promise.resolve(),
         deadline: 30,
       },
     ]) {
       let readCount = 0;
       let cancelCount = 0;
       const response = {
         headers: { get(name) {
           return name === "content-type" ? "application/json" : null;
         } },
         body: { getReader() {
           return {
             read() { readCount += 1; return fixture.bodyRead(); },
             cancel() { cancelCount += 1; return fixture.cancel(); },
           };
         } },
       };
       const started = Date.now();
       await assert.rejects(
         () => buyTest.strictJson(response, fixture.deadline),
         /Buy VOID response body deadline exceeded/u,
         fixture.name + ": absolute body deadline must fail closed",
       );
       const elapsed = Date.now() - started;
       assert.ok(elapsed < 1500, fixture.name + ": must not await read or cancel");
       assert.equal(cancelCount, 1, fixture.name + ": one best-effort cancellation");
       const completedReads = readCount;
       await new Promise((resolve) => setTimeout(resolve, 25));
       assert.equal(readCount, completedReads,
         fixture.name + ": retired reader must not request another chunk");
     }
     const goodBody = '{"ok":true}';
     let delivered = false;
     const good = {
       headers: { get(name) {
         return name === "content-type" ? "application/json" : null;
       } },
       body: { getReader() {
         return {
           async read() {
             if (delivered) return { done: true, value: undefined };
             delivered = true;
             return { done: false, value: new TextEncoder().encode(goodBody) };
           },
           cancel() { throw new Error("valid response must not be cancelled"); },
         };
       } },
     };
     assert.equal((await buyTest.strictJson(good, 50)).ok, true,
       "valid complete bounded JSON must still parse");
     await assert.rejects(() => buyTest.strictJson(good, 0),
       /invalid Buy VOID body deadline/u);
     // Simulate a throttled/background tab: deadline callbacks are queued
     // but never invoked. A reader continuation which completes after the
     // monotonic budget MUST NOT win the Promise.race or return payment data.
     const savedTimers = [sandbox.setTimeout, sandbox.clearTimeout];
     const initialMono = syntheticMonoMs;
     let queuedDeadlineCallbacks = 0;
     sandbox.setTimeout = (_callback, _duration) => {
       queuedDeadlineCallbacks += 1;
       return queuedDeadlineCallbacks;
     };
     sandbox.clearTimeout = (_id) => undefined;
     try {
       const jsonBytes = new TextEncoder().encode('{"ok":true}');
       for (const scenario of [
         "late_first_chunk",
         "late_eof",
         "monotonic_rollback",
         "monotonic_unavailable",
       ]) {
         syntheticMonoMs = 250000;
         let reads = 0;
         let cancels = 0;
         const simulatedResponse = {
           headers: { get(name) {
             return name === "content-type" ? "application/json" : null;
           } },
           body: { getReader() {
             return {
               read() {
                 reads += 1;
                 if (scenario === "late_first_chunk") {
                   syntheticMonoMs += 11;
                   return Promise.resolve({ done: false, value: jsonBytes });
                 }
                 if (scenario === "monotonic_rollback") {
                   syntheticMonoMs -= 1;
                   return Promise.resolve({ done: false, value: jsonBytes });
                 }
                 if (scenario === "monotonic_unavailable") {
                   syntheticMonoMs = Number.NaN;
                   return Promise.resolve({ done: false, value: jsonBytes });
                 }
                 // A complete, legitimate-looking JSON chunk arrived in time,
                 // but the *EOF* arrives after the clock has passed the limit.
                 if (reads === 1) {
                   return Promise.resolve({ done: false, value: jsonBytes });
                 }
                 syntheticMonoMs += 11;
                 return Promise.resolve({ done: true });
               },
               cancel() { cancels += 1; return Promise.resolve(); },
             };
           } },
         };
         const queuedBefore = queuedDeadlineCallbacks;
         await assert.rejects(
           () => buyTest.strictJson(simulatedResponse, 10),
           /Buy VOID response body deadline exceeded/u,
           scenario + ": monotonic time, not a delayed timer, must reject the body",
         );
         assert.equal(cancels, 1, scenario + ": cancelled without awaiting");
         assert.equal(reads, scenario === "late_eof" ? 2 : 1);
         assert.equal(queuedDeadlineCallbacks, queuedBefore + 1,
           scenario + ": watchdog was queued but never executed");
       }
       // An ordinary complete response inside the monotonic window remains
       // usable even though the timer scheduler is deliberately frozen.
       syntheticMonoMs = 350000;
       let positiveReads = 0;
       let positiveCancels = 0;
       const positiveResponse = {
         headers: { get(name) {
           return name === "content-type" ? "application/json" : null;
         } },
         body: { getReader() {
           return {
             read() {
               positiveReads += 1;
               syntheticMonoMs += 3;
               return Promise.resolve(positiveReads === 1
                 ? { done: false, value: jsonBytes }
                 : { done: true });
             },
             cancel() { positiveCancels += 1; throw new Error("no cancellation"); },
           };
         } },
       };
       assert.equal((await buyTest.strictJson(positiveResponse, 10)).ok, true,
         "within-budget monotonic JSON must remain accepted");
       assert.equal(positiveReads, 2);
       assert.equal(positiveCancels, 0);
     } finally {
       syntheticMonoMs = initialMono;
       [sandbox.setTimeout, sandbox.clearTimeout] = savedTimers;
     }
   } finally {
     sandbox.setTimeout = oldTimeout;
     sandbox.clearTimeout = oldClearTimeout;
   }
 }

const validConfig = {
  marker: "VOID_BUY_VOID_PUBLIC_CHECKOUT_CONTRACT_V1",
  schema: "void_public_buy_void_config_v1",
  receive_address: "0x17a26d4f0c51bd28fbcf5cdd4d20853bfa112ae5",
  usdc_contract: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  payment_chains: ["base", "ethereum"],
  payment_chain_id: 8453,
  delivery_chain_id: 2050,
  price_usdc_per_void: "0.50",
  rate_void_per_usdc: "2",
  min_usdc: 1,
  max_usdc: 500,
  request_method: "POST",
  request_route: "/__void/buy-void/request",
  request_before_payment_required: true,
  payment_sender_must_equal_void_destination: true,
  do_not_send_from_exchange: true,
  requests_enabled: true,
  ethereum_requests_enabled: false,
  payment_ready: true,
  receiver_binding_green: true,
  automatic_fulfillment: false,
};
const validStatus = {
  schema: "void_public_buy_void_status_v1",
  ok: true,
  request_intake_ready: true,
};
const validSale = {
  schema: "void_buy_void_sale_state_v1",
  ok: true,
  sold_out: false,
  pool_void_total: 10000000,
  remaining_void: 9999998,
  raised_usdc_so_far: 1,
  progress_pct: 0.00002,
};

const validSnapshot = buyTest.validateSnapshot(
  structuredClone(validConfig),
  structuredClone(validStatus),
  structuredClone(validSale),
);
assert.equal(buyTest.isOpen(validSnapshot), true);
buyTest.setState(validSnapshot, false, false);
buyTest.renderSnapshot(validSnapshot);
assert.equal(buyIntakeNode.textContent, "OPEN");
assert.equal(
  buyMessageNode.textContent,
  "Base request intake is OPEN. Ethereum native USDC is policy-approved but remains HOLD until separately activated.",
);
assert.doesNotMatch(
  buyMessageNode.textContent,
  /Base and Ethereum request intake are OPEN/u,
  "Base-only state must not render a dual-rail OPEN claim",
);

const heldSnapshot = buyTest.validateSnapshot(
  { ...validConfig, requests_enabled: false },
  { ...validStatus, request_intake_ready: false },
  structuredClone(validSale),
);
buyTest.setState(heldSnapshot, false, false);
buyTest.renderSnapshot(heldSnapshot);
assert.equal(buyIntakeNode.textContent, "HOLD");
assert.equal(
  buyMessageNode.textContent,
  "Presale request intake is not activated. The receiver and policy are visible for verification, but no payment should be sent.",
);
assert.doesNotMatch(
  buyMessageNode.textContent,
  /request intake (?:is|are) OPEN/u,
  "global HOLD state must not render any OPEN rail claim",
);

buyTest.setState(validSnapshot, false, false);
buyTest.renderSnapshot(validSnapshot);
assert.equal(buyTest.beginBuyViewInstance(buyViewNode), true);
buyTest.setState(validSnapshot, false, false);
buyTest.updateSubmit();
assert.equal(amountInput.getAttribute("aria-invalid"), null);
assert.equal(destinationInput.getAttribute("aria-invalid"), null);
assert.equal(amountError.textContent, "");
assert.equal(destinationError.textContent, "");

buyTest.markFieldTouched("amount");
amountInput.value = "10.1234567";
buyTest.updateSubmit();
assert.equal(submitButton.disabled, true, "over-precision amount must keep submit disabled");
assert.equal(amountInput.getAttribute("aria-invalid"), "true");
assert.match(amountError.textContent, /at most 6 decimals/);

amountInput.value = "";
buyTest.updateSubmit();
assert.equal(submitButton.disabled, true, "cleared required amount must keep submit disabled");
assert.equal(amountInput.getAttribute("aria-invalid"), "true");
assert.match(amountError.textContent, /Enter a native USDC amount/);

amountInput.value = "10";
buyTest.markFieldTouched("destination");
destinationInput.value = "0x1234";
buyTest.updateSubmit();
assert.equal(submitButton.disabled, true, "incomplete destination must keep submit disabled");
assert.equal(destinationInput.getAttribute("aria-invalid"), "true");
assert.match(destinationError.textContent, /42-character/);

destinationInput.value = "";
buyTest.updateSubmit();
assert.equal(submitButton.disabled, true, "cleared required destination must keep submit disabled");
assert.equal(destinationInput.getAttribute("aria-invalid"), "true");
assert.match(destinationError.textContent, /Enter the native VOID destination address/);

destinationInput.value = "0x1111111111111111111111111111111111111111";
buyTest.updateSubmit();
assert.equal(submitButton.disabled, false, "corrected fields must clear errors and enable eligible submit");
assert.equal(amountInput.getAttribute("aria-invalid"), "false");
assert.equal(destinationInput.getAttribute("aria-invalid"), "false");
assert.equal(amountError.textContent, "");
assert.equal(destinationError.textContent, "");

chainInput.value = "ethereum";
buyTest.updateSubmit();
assert.equal(submitButton.disabled, true, "Ethereum must stay disabled while its separate request gate is HOLD");
const heldFetchCount = fetchCalls.length;
await buyTest.submitBuy({ preventDefault() {} });
assert.equal(fetchCalls.length, heldFetchCount, "Ethereum HOLD must not POST");
const ethereumSnapshot = buyTest.validateSnapshot(
  { ...validConfig, ethereum_requests_enabled: true },
  structuredClone(validStatus),
  structuredClone(validSale),
);
buyTest.setState(ethereumSnapshot, false, false);
buyTest.renderSnapshot(ethereumSnapshot);
assert.equal(buyIntakeNode.textContent, "OPEN");
assert.equal(
  buyMessageNode.textContent,
  "Base and Ethereum request intake are OPEN. Create one request first, then use only its exact returned rail and payment instructions.",
);
assert.doesNotMatch(
  buyMessageNode.textContent,
  /Ethereum native USDC is policy-approved but remains HOLD/u,
  "dual-rail OPEN state must not retain the Ethereum-HOLD claim",
);
buyTest.updateSubmit();
assert.equal(submitButton.disabled, false, "Ethereum may enable only after its explicit gate is OPEN");
// The real launch lease caps requests at five minutes; never use a synthetic
// ten-minute positive receipt as if the backend could lawfully issue it.
const receiptExpiryAtMs = Date.now() + 4 * 60 * 1000;
let verifiedEthereumNewRequestBody = null;
sandbox.fetch = async (...args) => {
  fetchCalls.push(args);
  const requestBody = {
    ok: true,
    schema: "void_public_buy_void_checkout_request_result_v1",
    marker: "VOID_BUY_VOID_PUBLIC_CHECKOUT_CONTRACT_V1",
    one_active_request_cap_enforced: true,
    idempotent: false,
    request: {
      schema: "void_public_buy_void_checkout_request_v1",
      marker: "VOID_BUY_VOID_PUBLIC_CHECKOUT_CONTRACT_V1",
      ok: true,
      persisted: { ok: true },
      delivery_chain: "void",
      delivery_chain_id: 2050,
      asset_in: "USDC",
      usdc_decimals: 6,
      request_contract: {
        request_before_payment_required: true,
        one_active_request_per_void_destination: true,
        payment_sender_must_equal_void_destination: true,
        payment_tx_hash_bound_after_request_by_operator: true,
      },
      request_id: "buyvoid_ethereum_open_v1",
      status: "awaiting_payment_tx_hash",
      tx_hash: "",
      launch_authority: { expires_at_ms: receiptExpiryAtMs },
      created_at_ms: Date.now(),
      receive_address: validConfig.receive_address,
      void_destination_address: destinationInput.value,
      source_chain: "ethereum",
      payment_chain: "ethereum",
      payment_chain_id: 1,
      usdc_contract: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      usdc_amount: 10,
      requested_amount_usdc: 10,
      rate_void_per_usdc: "2",
      price_usdc_per_void: "0.50",
      pool_void_total: validSale.pool_void_total,
      quoted_void: 20,
      safety: { automatic_fulfillment: false, manual_review_required: true },
      payment_instructions: {
        send_asset: "USDC",
        expires_at_ms: receiptExpiryAtMs,
        request_id: "buyvoid_ethereum_open_v1",
        amount: 10,
        do_not_send_before_request: true,
        keep_transaction_hash: true,
        send_chain: "ethereum",
        send_chain_id: 1,
        token_contract: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        token_decimals: 6,
        send_to: validConfig.receive_address,
        send_from: destinationInput.value,
        do_not_send_from_exchange_or_pooled_custody: true,
      },
    },
  };
  verifiedEthereumNewRequestBody = structuredClone(requestBody);
  return new Response(JSON.stringify(requestBody), {
    status: 201,
    headers: { "content-type": "application/json" },
  });
};
await buyTest.submitBuy({ preventDefault() {} });
assert.equal(fetchCalls.length, 1, "explicit Ethereum OPEN must issue exactly one POST");
assert.equal(fetchCalls[0][0], "/__void/buy-void/request");
assert.equal(fetchCalls[0][1]?.method, "POST");
assert.equal(JSON.parse(fetchCalls[0][1]?.body || "{}").source_chain, "ethereum");
// Successfully returned request instructions must not permit a second
// identical submission. A same-readiness-generation re-render may retain
// them; only a real readiness GET advances the authority generation.
assert.equal(submitButton.disabled, true, "same receipt intent must stay disabled");
assert.match(buyResultNode.textContent, /buyvoid_ethereum_open_v1/u);
await buyTest.submitBuy({ preventDefault() {} });
assert.equal(fetchCalls.length, 1, "same-intent success retry must not POST");
buyTest.renderSnapshot(ethereumSnapshot);
assert.match(buyResultNode.textContent, /buyvoid_ethereum_open_v1/u);
assert.equal(submitButton.disabled, true, "same-generation render retains successful intent lock");
// Re-rendering the same already-validated snapshot does not create a new
// readiness generation.
buyTest.updateSubmit();
assert.match(buyResultNode.textContent, /buyvoid_ethereum_open_v1/u);

// Wallet-app return and browser history restoration must preserve a *valid*
// same-generation checkout receipt. The expiry fix must not invent a fresh
// readiness GET, retry the request POST, or discard still-valid instructions.
// Earlier expiry fixtures prove the opposite (expired receipt) behavior.
const onBuyVisibilityChange = documentEventHandlers.get("visibilitychange");
const onBuyPageshow = windowEventHandlers.get("pageshow");
const onBuyFocus = windowEventHandlers.get("focus");
for (const handler of [onBuyVisibilityChange, onBuyPageshow, onBuyFocus]) {
  assert.equal(typeof handler, "function", "resume handler must be installed");
}
const validReceiptBeforeResume = buyResultNode.textContent;
const networkCallsBeforeResume = fetchCalls.length;
assert.match(validReceiptBeforeResume,
  /REQUEST CREATED — VERIFY BEFORE PAYMENT[\s\S]*buyvoid_ethereum_open_v1/u);
sandbox.document.visibilityState = "hidden";
onBuyVisibilityChange();
assert.equal(buyResultNode.textContent, validReceiptBeforeResume,
  "background visibility event must preserve valid instructions");
sandbox.document.visibilityState = "visible";
onBuyVisibilityChange();
assert.equal(buyResultNode.textContent, validReceiptBeforeResume,
  "wallet-app return within unchanged live lease must preserve receipt");
onBuyPageshow({ persisted: true });
assert.equal(buyResultNode.textContent, validReceiptBeforeResume,
  "bfcache pageshow within valid lease must preserve receipt");
onBuyFocus();
assert.equal(buyResultNode.textContent, validReceiptBeforeResume,
  "focus within valid lease must preserve receipt");
assert.equal(fetchCalls.length, networkCallsBeforeResume,
  "resume events must issue neither readiness GET nor checkout POST");
assert.equal(submitButton.disabled, true,
  "same valid Buy intent remains no-retry after resume");

// A browser event fired outside the Buy route must not touch any stale Buy
// content. Also refuse to render against an absent Buy DOM on the Buy route.
sandbox.location.hash = "#/home";
const inactiveRouteSentinel = "non_buy_route_receipt_must_not_be_rewritten";
buyResultNode.textContent = inactiveRouteSentinel;
onBuyVisibilityChange();
onBuyPageshow({ persisted: true });
onBuyFocus();
assert.equal(buyResultNode.textContent, inactiveRouteSentinel,
  "resume signals cannot render Buy content on non-Buy routes");
sandbox.location.hash = "#/buy";
const activeBuyNodeBeforeNoDom = buyViewNode;
buyViewNode = null;
const absentBuyDomSentinel = "missing_buy_view_must_not_be_rewritten";
buyResultNode.textContent = absentBuyDomSentinel;
onBuyVisibilityChange();
onBuyPageshow({ persisted: true });
onBuyFocus();
assert.equal(buyResultNode.textContent, absentBuyDomSentinel,
  "resume signals cannot render into a missing Buy view");
buyViewNode = activeBuyNodeBeforeNoDom;
buyTest.updateSubmit();
assert.equal(buyResultNode.textContent, validReceiptBeforeResume,
  "returning to unchanged Buy DOM still restores the matching valid receipt");
await buyTest.submitBuy({ preventDefault() {} });
assert.equal(fetchCalls.length, networkCallsBeforeResume,
  "resume/reentry events and same-intent submit must never repeat POST");
assert.equal(submitButton.disabled, true,
  "same-intent receipt remains fenced after all resume events");

// A confirmed request must not vanish when readiness briefly changes to
// HOLD or SOLD OUT. Never display payment instructions while closed.
const soldOutSnapshot = buyTest.validateSnapshot(
  { ...validConfig, ethereum_requests_enabled: true },
  structuredClone(validStatus),
  { ...validSale, sold_out: true, remaining_void: 0, progress_pct: 100 },
);
// Sale-wide OPEN does not open Ethereum if its separate request gate closes.
const ethereumRailHoldSnapshot = buyTest.validateSnapshot(
  { ...validConfig, ethereum_requests_enabled: false },
  structuredClone(validStatus),
  structuredClone(validSale),
);
buyTest.setState(ethereumRailHoldSnapshot, false, false);
buyTest.renderSnapshot(ethereumRailHoldSnapshot);
assert.equal(buyIntakeNode.textContent, "OPEN",
  "the global intake remains OPEN when only Ethereum is disabled");
assert.match(buyMessageNode.textContent,
  /Ethereum native USDC is policy-approved but remains HOLD/u);
assert.match(buyResultNode.textContent, /DO NOT SEND FUNDS/iu,
  "a settled Ethereum receipt must be concealed while its rail is disabled");
assert.doesNotMatch(buyResultNode.textContent, /Send exactly:|buyvoid_ethereum_open_v1/u);
assert.equal(submitButton.disabled, true, "Ethereum HOLD must block retry");
await buyTest.submitBuy({ preventDefault() {} });
assert.equal(fetchCalls.length, 1, "Ethereum rail HOLD must not repeat a POST");
buyTest.setState(ethereumSnapshot, false, false);
buyTest.renderSnapshot(ethereumSnapshot);
assert.match(buyResultNode.textContent, /buyvoid_ethereum_open_v1/u,
  "matching receipt may return only after Ethereum is OPEN again");
for (const closedSnapshot of [heldSnapshot, soldOutSnapshot]) {
  buyTest.setState(closedSnapshot, false, false);
  buyTest.renderSnapshot(closedSnapshot);
  assert.equal(submitButton.disabled, true, "closed request intake must block POST");
  assert.doesNotMatch(buyResultNode.textContent, /Send exactly: 10 USDC/u,
    "closed view must not show prior payment instructions");
  await buyTest.submitBuy({ preventDefault() {} });
  assert.equal(fetchCalls.length, 1, "closed state must not submit another request");
  buyTest.setState(ethereumSnapshot, false, false);
  buyTest.renderSnapshot(ethereumSnapshot);
  assert.match(buyResultNode.textContent, /buyvoid_ethereum_open_v1/u,
    "a re-opened view must restore its exact previous confirmed request");
  assert.equal(submitButton.disabled, true, "reopened confirmed request stays guarded");
}

// A real readiness GET in the SAME Buy DOM advances requestSerial. The public
// edge deliberately withholds internal launch-generation identities, so even
// a byte-equivalent OPEN refresh cannot re-authorize old payment instructions.
// The original intent remains blocked as potentially committed.
const postReceiptReadinessPaths = [];
const postReceiptReadiness = new Map([
  ["/__void/buy-void/config.json",
    { ...validConfig, ethereum_requests_enabled: true }],
  ["/__void/buy-void/status.json", structuredClone(validStatus)],
  ["/__void/buy-void/sale-state.json", structuredClone(validSale)],
]);
sandbox.fetch = async (url) => {
  postReceiptReadinessPaths.push(String(url));
  assert.ok(postReceiptReadiness.has(String(url)),
    "post-receipt refresh uses only fixed readiness endpoints");
  return new Response(JSON.stringify(postReceiptReadiness.get(String(url))), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
await buyTest.loadBuy();
assert.equal(postReceiptReadinessPaths.length, 3,
  "same-view refresh must acquire all three fresh readiness documents");
assert.equal(submitButton.disabled, true,
  "refresh never unlocks the already-attempted intent");
assert.match(buyResultNode.textContent, /PRIOR REQUEST MAY EXIST/u,
  "new readiness generation retires old actionable receipt");
assert.doesNotMatch(buyResultNode.textContent,
  /buyvoid_ethereum_open_v1|Send exactly:/u,
  "old payment instructions cannot survive a newer readiness GET");
// Even restoring the old synthetic snapshot object cannot move the monotonic
// readiness serial backward or revive those instructions.
buyTest.setState(ethereumSnapshot, false, false);
buyTest.renderSnapshot(ethereumSnapshot);
assert.match(buyResultNode.textContent, /PRIOR REQUEST MAY EXIST/u);
assert.doesNotMatch(buyResultNode.textContent,
  /buyvoid_ethereum_open_v1|Send exactly:/u);

// Compare exact six-decimal USDC atoms rather than input formatting.
amountInput.value = "10.000000";
buyTest.updateSubmit();
assert.equal(submitButton.disabled, true, "equivalent USDC atoms must not bypass guard");
amountInput.value = "11";
buyTest.updateSubmit();
assert.equal(submitButton.disabled, false, "new amount is new purchase intent");
// Network timeout does not prove the server did not create the request.
fetchCalls.length = 0;
sandbox.fetch = async (...args) => {
  fetchCalls.push(args);
  throw new Error("network_disconnected_after_server_receive");
};
await buyTest.submitBuy({ preventDefault() {} });
assert.equal(fetchCalls.length, 1, "uncertain POST attempted once");
assert.match(buyResultNode.textContent, /REQUEST OUTCOME UNCONFIRMED/u);
assert.doesNotMatch(buyResultNode.textContent, /REQUEST NOT CREATED/u);
assert.equal(submitButton.disabled, true, "uncertain intent must not be retried");
await buyTest.submitBuy({ preventDefault() {} });
assert.equal(fetchCalls.length, 1, "ambiguous POST must not be duplicated");
// A succeeded, B had a lost response: B must not evict A's guard.
// The prior implementation remembered only B and permitted A a second POST.
amountInput.value = "10.000000";
buyTest.updateSubmit();
assert.equal(submitButton.disabled, true, "A-B-A replay of first intent must HOLD");
assert.match(buyResultNode.textContent, /PRIOR REQUEST MAY EXIST/u);
await buyTest.submitBuy({ preventDefault() {} });
assert.equal(fetchCalls.length, 1, "A-B-A first intent must not POST again");
amountInput.value = "11.000000";
buyTest.updateSubmit();
assert.equal(submitButton.disabled, true, "B remains blocked after selecting A");
assert.match(buyResultNode.textContent, /REQUEST OUTCOME UNCONFIRMED/u);
buyTest.renderSnapshot(ethereumSnapshot);
assert.match(buyResultNode.textContent, /REQUEST OUTCOME UNCONFIRMED/u);
assert.equal(submitButton.disabled, true, "refresh must preserve uncertain intent lock");
// An ambiguous POST cannot be forgotten by a HOLD/SOLD OUT -> OPEN cycle.
for (const closedSnapshot of [heldSnapshot, soldOutSnapshot]) {
  buyTest.setState(closedSnapshot, false, false);
  buyTest.renderSnapshot(closedSnapshot);
  assert.equal(submitButton.disabled, true, "closed ambiguous intent must stay guarded");
  assert.match(buyResultNode.textContent, /do not send funds/iu);
  await buyTest.submitBuy({ preventDefault() {} });
  assert.equal(fetchCalls.length, 1, "closed uncertain request must never re-POST");
  buyTest.setState(ethereumSnapshot, false, false);
  buyTest.renderSnapshot(ethereumSnapshot);
  assert.match(buyResultNode.textContent, /REQUEST OUTCOME UNCONFIRMED/u,
    "OPEN must restore the ambiguity warning rather than saying Ready");
  assert.equal(submitButton.disabled, true, "reopened uncertain request remains guarded");
}
amountInput.value = "12";
buyTest.updateSubmit();
assert.equal(submitButton.disabled, false, "distinct intent may still be created");
// A different C POST in flight must not display A's payment instructions
// or B's uncertain-result warning during an OPEN readiness refresh.
let rejectPendingC = null;
sandbox.fetch = async (...args) => {
  fetchCalls.push(args);
  return new Promise((_, reject) => { rejectPendingC = reject; });
};
const pendingC = buyTest.submitBuy({ preventDefault() {} });
assert.equal(fetchCalls.length, 2, "C should start one independent POST");
assert.equal(typeof rejectPendingC, "function");
buyTest.renderSnapshot(ethereumSnapshot);
assert.equal(submitButton.disabled, true, "pending request cannot resubmit");
assert.match(buyResultNode.textContent, /Creating guarded request/u);
assert.doesNotMatch(buyResultNode.textContent,
  /buyvoid_ethereum_open_v1|Send exactly:|REQUEST OUTCOME UNCONFIRMED/u,
  "pending C cannot resurrect old A receipt or B outcome");
for (const closedSnapshot of [heldSnapshot, soldOutSnapshot]) {
  buyTest.setState(closedSnapshot, false, true);
  buyTest.renderSnapshot(closedSnapshot);
  assert.equal(submitButton.disabled, true);
  assert.match(buyResultNode.textContent, /do not send funds/iu);
  buyTest.setState(ethereumSnapshot, false, true);
  buyTest.renderSnapshot(ethereumSnapshot);
  assert.match(buyResultNode.textContent, /Creating guarded request/u);
  assert.doesNotMatch(buyResultNode.textContent,
    /buyvoid_ethereum_open_v1|Send exactly:|REQUEST OUTCOME UNCONFIRMED/u);
}
assert.equal(fetchCalls.length, 2, "refreshes must not repeat pending C");
rejectPendingC(new Error("synthetic_pending_request_network_loss"));
await pendingC;
assert.match(buyResultNode.textContent, /REQUEST OUTCOME UNCONFIRMED/u);
assert.equal(submitButton.disabled, true, "pending C uncertainty still blocks retry");
// A distinct POST can finish AFTER readiness has become HOLD, SOLD OUT,
// or unavailable. Its late success must not overwrite DO NOT SEND copy.
for (const [caseLabel, closedSnapshot] of [
  ["HOLD", heldSnapshot],
  ["SOLD_OUT", soldOutSnapshot],
  ["READINESS_ERROR", null],
  ["ETHEREUM_RAIL_HOLD", ethereumRailHoldSnapshot],
]) {
  buyTest.setState(ethereumSnapshot, false, false);
  buyTest.renderSnapshot(ethereumSnapshot);
  const amount = String(caseLabel === "HOLD" ? 13 :
    caseLabel === "SOLD_OUT" ? 14 :
    caseLabel === "READINESS_ERROR" ? 15 : 16);
  amountInput.value = amount;
  buyTest.updateSubmit();
  assert.equal(submitButton.disabled, false,
    "distinct late-success fixture must start with a valid intent");
  let resolveLateSuccess = null;
  sandbox.fetch = async (...args) => {
    fetchCalls.push(args);
    return new Promise((resolve) => { resolveLateSuccess = resolve; });
  };
  const beforeLate = fetchCalls.length;
  const pendingLateSuccess = buyTest.submitBuy({ preventDefault() {} });
  assert.equal(fetchCalls.length, beforeLate + 1);
  assert.equal(typeof resolveLateSuccess, "function");
  if (closedSnapshot !== null) {
    buyTest.setState(closedSnapshot, false, true);
    buyTest.renderSnapshot(closedSnapshot);
  } else {
    buyTest.renderError(new Error("synthetic_readiness_temporarily_unavailable"));
  }
  assert.match(buyResultNode.textContent, /do not send funds/iu);
  assert.equal(submitButton.disabled, true);
  const requestId = "buyvoid_ethereum_late_" + amount;
  const responseBody = {
    ok: true,
    schema: "void_public_buy_void_checkout_request_result_v1",
    marker: "VOID_BUY_VOID_PUBLIC_CHECKOUT_CONTRACT_V1",
    one_active_request_cap_enforced: true,
    idempotent: false,
    request: {
      schema: "void_public_buy_void_checkout_request_v1",
      marker: "VOID_BUY_VOID_PUBLIC_CHECKOUT_CONTRACT_V1",
      ok: true,
      persisted: { ok: true },
      delivery_chain: "void",
      delivery_chain_id: 2050,
      asset_in: "USDC",
      usdc_decimals: 6,
      request_contract: {
        request_before_payment_required: true,
        one_active_request_per_void_destination: true,
        payment_sender_must_equal_void_destination: true,
        payment_tx_hash_bound_after_request_by_operator: true,
      },
      request_id: requestId,
      status: "awaiting_payment_tx_hash",
      tx_hash: "",
      launch_authority: { expires_at_ms: receiptExpiryAtMs },
      created_at_ms: Date.now(),
      receive_address: validConfig.receive_address,
      void_destination_address: destinationInput.value,
      source_chain: "ethereum",
      payment_chain: "ethereum",
      payment_chain_id: 1,
      usdc_contract: "0xA0b86991c6218b36c1d19D4a2e9Eb0ce3606eB48",
      usdc_amount: Number(amount),
      requested_amount_usdc: Number(amount),
      rate_void_per_usdc: "2",
      price_usdc_per_void: "0.50",
      pool_void_total: validSale.pool_void_total,
      quoted_void: Number(amount) * 2,
      safety: { automatic_fulfillment: false, manual_review_required: true },
      payment_instructions: {
        send_asset: "USDC",
        expires_at_ms: receiptExpiryAtMs,
        request_id: requestId,
        amount: Number(amount),
        do_not_send_before_request: true,
        keep_transaction_hash: true,
        send_chain: "ethereum", send_chain_id: 1,
        token_contract: "0xA0b86991c6218b36c1d19D4a2e9Eb0ce3606eB48",
        token_decimals: 6,
        send_to: validConfig.receive_address,
        send_from: destinationInput.value,
        do_not_send_from_exchange_or_pooled_custody: true,
      },
    },
  };
  resolveLateSuccess(new Response(JSON.stringify(responseBody), {
    status: 201,
    headers: { "content-type": "application/json" },
  }));
  await pendingLateSuccess;
  assert.match(buyResultNode.textContent, /do not send funds/iu,
    caseLabel + ": late successful POST must not hide HOLD/SOLD OUT/rail HOLD/error");
  assert.doesNotMatch(buyResultNode.textContent, /REQUEST CREATED|Send exactly:/u,
    caseLabel + ": no payment instructions while CLOSED/unverified");
  assert.equal(submitButton.disabled, true);
  await buyTest.submitBuy({ preventDefault() {} });
  assert.equal(fetchCalls.length, beforeLate + 1,
    caseLabel + ": no retry while intake is closed");
  buyTest.setState(ethereumSnapshot, false, false);
  buyTest.renderSnapshot(ethereumSnapshot);
  assert.match(buyResultNode.textContent, new RegExp(requestId, "u"),
    caseLabel + ": verified OPEN must restore matching request receipt");
  assert.match(buyResultNode.textContent, new RegExp("Send exactly: " + amount + " USDC", "u"));
  assert.equal(submitButton.disabled, true, "re-opened committed intent must be guarded");
  await buyTest.submitBuy({ preventDefault() {} });
  assert.equal(fetchCalls.length, beforeLate + 1,
    caseLabel + ": verified OPEN must not repeat a committed POST");
}
// A successful-looking server body must never become actionable payment
// instructions unless it is an HTTP-201, non-reused, pre-payment request
// whose exact native-USDC amount and instruction/request identity agree.
// All fixtures are inert HTTP responses; no customer data or funds exist here.
assert.ok(verifiedEthereumNewRequestBody, "valid receipt fixture required");
const bogusReceipts = [
  ["legacy_http_200_reused_request", 200, (body) => { body.idempotent = true; }],
  ["http_200_claims_fresh_request", 200, (_body) => {}],
  ["http_201_reused_request", 201, (body) => { body.idempotent = true; }],
  ["http_201_missing_freshness_flag", 201, (body) => { delete body.idempotent; }],
  ["already_payment_verified", 201, (body) => { body.request.status = "payment_verified"; }],
  ["already_has_tx_hash", 201, (body) => { body.request.tx_hash = "0x" + "a".repeat(64); }],
  ["instructions_amount_mismatch", 201, (body) => { body.request.payment_instructions.amount = 999; }],
  ["instructions_request_id_mismatch", 201, (body) => {
    body.request.payment_instructions.request_id = "buyvoid_others_original";
  }],
  ["instructions_allow_payment_before_request", 201, (body) => {
    body.request.payment_instructions.do_not_send_before_request = false;
  }],
  ["instructions_do_not_require_transaction_hash", 201, (body) => {
    body.request.payment_instructions.keep_transaction_hash = false;
  }],
  ["instructions_missing_expiry", 201, (body) => {
    delete body.request.payment_instructions.expires_at_ms;
  }],
  ["instructions_mismatched_authority_expiry", 201, (body) => {
    body.request.payment_instructions.expires_at_ms += 1;
  }],
  ["instructions_already_expired", 201, (body) => {
    const old = Date.now() - 1;
    body.request.payment_instructions.expires_at_ms = old;
    body.request.launch_authority.expires_at_ms = old;
  }],
  ["instructions_string_expiry", 201, (body) => {
    const value = String(body.request.payment_instructions.expires_at_ms);
    body.request.payment_instructions.expires_at_ms = value;
    body.request.launch_authority.expires_at_ms = value;
  }],
  ["missing_server_created_at", 201, (body) => {
    delete body.request.created_at_ms;
  }],
  ["wrong_type_server_created_at", 201, (body) => {
    body.request.created_at_ms = String(body.request.created_at_ms);
  }],
  ["future_server_created_at", 201, (body) => {
    body.request.created_at_ms += 60000;
  }],
  ["stale_server_created_at", 201, (body) => {
    body.request.created_at_ms -= 60000;
  }],
  ["lease_exceeds_canonical_five_minute_max", 201, (body) => {
    // Keep authority and instruction expiry mutually equal; an otherwise
    // plausible HTTP-201 body must not exceed the real activation policy.
    const impossibleExpiry = body.request.created_at_ms + 300001;
    body.request.launch_authority.expires_at_ms = impossibleExpiry;
    body.request.payment_instructions.expires_at_ms = impossibleExpiry;
  }],
];
for (let i = 0; i < bogusReceipts.length; i += 1) {
  const [label, httpStatus, mutate] = bogusReceipts[i];
  const amount = String(21 + i);
  const id = "buyvoid_synthetic_adversary_" + i;
  const responseBody = structuredClone(verifiedEthereumNewRequestBody);
  responseBody.request.request_id = id;
  responseBody.request.requested_amount_usdc = Number(amount);
  responseBody.request.usdc_amount = Number(amount);
  responseBody.request.quoted_void = Number(amount) * 2;
  responseBody.request.payment_instructions.request_id = id;
  responseBody.request.payment_instructions.amount = Number(amount);
  responseBody.request.created_at_ms = Date.now();
  mutate(responseBody);
  amountInput.value = amount;
  chainInput.value = "ethereum";
  buyTest.setState(ethereumSnapshot, false, false);
  buyTest.renderSnapshot(ethereumSnapshot);
  buyTest.updateSubmit();
  assert.equal(submitButton.disabled, false, label + ": independent intent can be attempted");
  const before = fetchCalls.length;
  sandbox.fetch = async (...args) => {
    fetchCalls.push(args);
    return new Response(JSON.stringify(responseBody), {
      status: httpStatus,
      headers: { "content-type": "application/json" },
    });
  };
  await buyTest.submitBuy({ preventDefault() {} });
  assert.equal(fetchCalls.length, before + 1, label + ": one inert POST attempted");
  assert.match(buyResultNode.textContent, /REQUEST OUTCOME UNCONFIRMED/u,
    label + ": unusable receipt must not be presented as confirmed");
  assert.doesNotMatch(buyResultNode.textContent, /REQUEST CREATED|Send exactly:/u,
    label + ": forged/reused/unsafe instructions must never be actionable");
  assert.equal(submitButton.disabled, true, label + ": uncertain intent cannot be retried");
}

// Resume original Base fixture expectations without another HTTP call.
amountInput.value = "10";
fetchCalls.length = 0;
sandbox.fetch = async (...args) => {
  fetchCalls.push(args);
  throw new Error("unexpected_fetch");
};
chainInput.value = "base";

for (const malformed of [
  true,
  [1],
  null,
  "1",
  " 1",
  "1e0",
]) {
  const sale = structuredClone(validSale);
  sale.remaining_void = malformed;
  assert.throws(
    () => buyTest.validateSnapshot(
      structuredClone(validConfig),
      structuredClone(validStatus),
      sale,
    ),
    /invalid sale-state accounting/u,
    `remaining_void must reject ${JSON.stringify(malformed)}`,
  );
}
for (const [key, malformed] of [
  ["price_usdc_per_void", 0.5],
  ["price_usdc_per_void", "5e-1"],
  ["price_usdc_per_void", " 0.50"],
  ["rate_void_per_usdc", 2],
  ["rate_void_per_usdc", "2.0"],
]) {
  const config = structuredClone(validConfig);
  config[key] = malformed;
  assert.throws(
    () => buyTest.validateSnapshot(
      config,
      structuredClone(validStatus),
      structuredClone(validSale),
    ),
    /presale price policy mismatch/u,
    `${key} must reject ${JSON.stringify(malformed)}`,
  );
}
for (const [key, malformed] of [
  ["min_usdc", "1"],
  ["min_usdc", true],
  ["max_usdc", [500]],
  ["max_usdc", null],
  ["max_usdc", 1e-7],
]) {
  const config = structuredClone(validConfig);
  config[key] = malformed;
  assert.throws(
    () => buyTest.validateSnapshot(
      config,
      structuredClone(validStatus),
      structuredClone(validSale),
    ),
    /presale request limit policy mismatch/u,
    `${key} must reject ${JSON.stringify(malformed)}`,
  );
}

buyTest.setState(validSnapshot, false, false);
buyTest.updateSubmit();
assert.equal(submitButton.disabled, false, "fresh OPEN snapshot may enable submit");

buyTest.setReadinessPending(true);
buyTest.updateSubmit();
assert.equal(
  submitButton.disabled,
  true,
  "refresh/readiness pending must disable submit even with stale OPEN snapshot",
);
await buyTest.submitBuy({ preventDefault() {} });
assert.equal(
  fetchCalls.length,
  0,
  "readiness-pending submit must not POST a Buy request",
);

buyTest.setReadinessPending(false);
buyTest.updateSubmit();
assert.equal(
  submitButton.disabled,
  false,
  "submit may re-enable only after readiness pending is cleared",
);

// A server-generated creation time gives the absolute clock anchor. The
// browser's performance.now() then owns the deadline so that changing the
// wall clock cannot make expired instructions actionable again.
const browserDateNow = vm.runInNewContext("Date.now", sandbox);
const savedMonoMs = syntheticMonoMs;
sandbox.__buyTestWallMs = Date.now();
vm.runInNewContext("Date.now = () => globalThis.__buyTestWallMs", sandbox);
try {
  for (const [name, amount, change] of [
    ["monotonic_expired", 111, "deadline"],
    ["clock_rolled_back", 112, "rollback"],
    ["sleep_without_monotonic_progress", 113, "suspend"],
  ]) {
    const id = "buyvoid_clock_" + name;
    const created = sandbox.__buyTestWallMs;
    const expires = created + 30000;
    const body = structuredClone(verifiedEthereumNewRequestBody);
    body.request.request_id = id;
    body.request.created_at_ms = created;
    body.request.launch_authority.expires_at_ms = expires;
    body.request.payment_instructions.expires_at_ms = expires;
    body.request.payment_instructions.request_id = id;
    body.request.requested_amount_usdc = amount;
    body.request.usdc_amount = amount;
    body.request.quoted_void = amount * 2;
    body.request.payment_instructions.amount = amount;
    amountInput.value = String(amount);
    chainInput.value = "ethereum";
    buyTest.setState(ethereumSnapshot, false, false);
    buyTest.renderSnapshot(ethereumSnapshot);
    buyTest.updateSubmit();
    assert.equal(submitButton.disabled, false, name + ": distinct request");
    const before = fetchCalls.length;
    sandbox.fetch = async (...args) => {
      fetchCalls.push(args);
      return new Response(JSON.stringify(body), {
        status: 201,
        headers: { "content-type": "application/json" },
      });
    };
    await buyTest.submitBuy({ preventDefault() {} });
    assert.equal(fetchCalls.length, before + 1, name + ": one POST");
    assert.match(buyResultNode.textContent, new RegExp(id, "u"),
      name + ": valid server-bounded initial lease");

    if (change === "deadline") {
      syntheticMonoMs += 26000;
      sandbox.__buyTestWallMs += 26000;
    } else if (change === "rollback") {
      syntheticMonoMs += 1000;
      sandbox.__buyTestWallMs -= 15000;
    } else {
      // A system sleep can advance the wall clock without advancing
      // performance.now(): this is untrusted, never extended validity.
      sandbox.__buyTestWallMs += 20000;
    }
    // Synthetic timers never fire. A suspended tab can retain the previous
    // text until a page-visible, bfcache pageshow, or focus event rechecks it.
    assert.match(buyResultNode.textContent, new RegExp(id, "u"),
      name + ": old instructions remain before the resume signal");
    if (change === "deadline") {
      const onVisibilityChange = documentEventHandlers.get("visibilitychange");
      assert.equal(typeof onVisibilityChange, "function");
      sandbox.document.visibilityState = "hidden";
      onVisibilityChange();
      assert.match(buyResultNode.textContent, new RegExp(id, "u"),
        name + ": hidden event must not revive or rewrite receipt");
      sandbox.document.visibilityState = "visible";
      onVisibilityChange();
    } else if (change === "rollback") {
      const onPageShow = windowEventHandlers.get("pageshow");
      assert.equal(typeof onPageShow, "function");
      onPageShow({ persisted: true });
    } else {
      const onFocus = windowEventHandlers.get("focus");
      assert.equal(typeof onFocus, "function");
      onFocus();
    }
    assert.match(buyResultNode.textContent,
      /REQUEST INSTRUCTIONS EXPIRED — DO NOT SEND FUNDS/u, name);
    assert.doesNotMatch(buyResultNode.textContent,
      /REQUEST CREATED|Send exactly:|buyvoid_clock_/u, name);
    assert.equal(submitButton.disabled, true);
    await buyTest.submitBuy({ preventDefault() {} });
    assert.equal(fetchCalls.length, before + 1, name + ": no retry");
    // The expired/uncertain state is irrevocable even if time is moved
    // back to an apparently valid value and the presale gate is OPEN.
    sandbox.__buyTestWallMs -= 30000;
    buyTest.renderSnapshot(ethereumSnapshot);
    assert.match(buyResultNode.textContent,
      /REQUEST INSTRUCTIONS EXPIRED — DO NOT SEND FUNDS/u);
    sandbox.__buyTestWallMs += 35000;
    buyTest.renderSnapshot(ethereumSnapshot);
    assert.match(buyResultNode.textContent,
      /REQUEST INSTRUCTIONS EXPIRED — DO NOT SEND FUNDS/u);
  }
} finally {
  sandbox.__originalBrowserNow = browserDateNow;
  vm.runInNewContext("Date.now = globalThis.__originalBrowserNow", sandbox);
  delete sandbox.__originalBrowserNow;
  delete sandbox.__buyTestWallMs;
  syntheticMonoMs = savedMonoMs;
}

replaceBuyView();
assert.equal(
  buyTest.beginBuyViewInstance(buyViewNode),
  true,
  "replacement Buy view must begin a new validation-state lifetime",
);
buyTest.setState(validSnapshot, false, false);
buyTest.updateSubmit();
assert.equal(submitButton.disabled, true, "replacement empty required fields must keep submit disabled");
assert.equal(amountInput.getAttribute("aria-invalid"), null);
assert.equal(destinationInput.getAttribute("aria-invalid"), null);
assert.equal(amountError.textContent, "");
assert.equal(destinationError.textContent, "");

buyTest.markFieldTouched("amount");
buyTest.updateSubmit();
assert.equal(amountInput.getAttribute("aria-invalid"), "true");
assert.match(amountError.textContent, /Enter a native USDC amount/);
assert.equal(
  buyTest.beginBuyViewInstance(buyViewNode),
  false,
  "refreshing the same Buy view must preserve its touched state",
);
buyTest.updateSubmit();
assert.equal(amountInput.getAttribute("aria-invalid"), "true");

// A single-page-app route change creates a NEW Buy DOM view but does NOT
// reload buy-live.js. After one potentially committed POST, navigating away
// and back must not erase that intent's no-retry guard. A restored view has
// no actionable old payment receipt; operator recovery is still required.
const fetchesBeforeRouteReentry = fetchCalls.length;
chainInput.value = "ethereum";
destinationInput.value = "0x1111111111111111111111111111111111111111";
buyTest.setState(ethereumSnapshot, false, false);
buyTest.renderSnapshot(ethereumSnapshot);
for (const [amount, meaning] of [
  ["10.000000", "earlier confirmed HTTP-201 request"],
  ["11", "earlier network-uncertain POST"],
  ["21", "earlier synthetically reused receipt"],
  ["111", "earlier expired instruction"],
]) {
  amountInput.value = amount;
  buyTest.updateSubmit();
  assert.equal(submitButton.disabled, true,
    meaning + " must remain no-retry after a Buy SPA view replacement");
  assert.match(buyResultNode.textContent, /PRIOR REQUEST MAY EXIST — DO NOT SEND FUNDS/u,
    meaning + ": no payment directions or new-request claim after navigation");
  assert.doesNotMatch(buyResultNode.textContent, /REQUEST CREATED|Send exactly:/u);
  await buyTest.submitBuy({ preventDefault() {} });
  assert.equal(fetchCalls.length, fetchesBeforeRouteReentry,
    meaning + ": SPA navigation must never trigger a second POST");
}
// A genuinely new intent still remains available, avoiding a permanent
// global purchase HOLD from a single earlier uncertain submission.
amountInput.value = "209";
buyTest.updateSubmit();
assert.equal(submitButton.disabled, false,
  "previous attempts must not block a distinct bounded new intent");
assert.doesNotMatch(buyResultNode.textContent, /REQUEST CREATED|Send exactly:/u);

// An old POST may settle AFTER a new Buy view has replaced its DOM. Its
// continuation must never bind a valid HTTP-201 receipt (or error text) into
// that later view, even when the browser restores the identical Buy intent.
// Keep the document-lifetime attempted-intent fence and decline all retries.
for (const [label, amount, outcome] of [
  ["deferred_valid_201", "210", "success"],
  ["deferred_fetch_rejection", "211", "failure"],
]) {
  chainInput.value = "ethereum";
  amountInput.value = amount;
  destinationInput.value = "0x1111111111111111111111111111111111111111";
  buyTest.setState(ethereumSnapshot, false, false);
  buyTest.renderSnapshot(ethereumSnapshot);
  buyTest.updateSubmit();
  assert.equal(submitButton.disabled, false,
    label + ": distinct source-view request may begin");

  let settleStale;
  sandbox.fetch = async (...args) => {
    fetchCalls.push(args);
    return new Promise((resolve, reject) => {
      settleStale = { resolve, reject };
    });
  };
  const before = fetchCalls.length;
  const pendingOldViewPost = buyTest.submitBuy({ preventDefault() {} });
  assert.equal(fetchCalls.length, before + 1);
  assert.ok(settleStale, label + ": old view POST must be pending");

  // Simulate route-away/route-back while the original POST is unresolved.
  // The new DOM restores the exact same destination, chain and USDC amount.
  replaceBuyView();
  assert.equal(buyTest.beginBuyViewInstance(buyViewNode), true);
  chainInput.value = "ethereum";
  amountInput.value = amount;
  destinationInput.value = "0x1111111111111111111111111111111111111111";
  buyTest.setState(ethereumSnapshot, false, true);
  buyTest.renderSnapshot(ethereumSnapshot);
  assert.equal(submitButton.disabled, true);
  assert.doesNotMatch(buyResultNode.textContent,
    /REQUEST CREATED|Send exactly:|buyvoid_stale_post_/u);

  if (outcome === "success") {
    const restoredReceipt = structuredClone(verifiedEthereumNewRequestBody);
    const id = "buyvoid_stale_post_" + amount;
    const expires = Date.now() + 60_000;
    restoredReceipt.request.request_id = id;
    restoredReceipt.request.created_at_ms = Date.now();
    restoredReceipt.request.requested_amount_usdc = Number(amount);
    restoredReceipt.request.usdc_amount = Number(amount);
    restoredReceipt.request.quoted_void = Number(amount) * 2;
    restoredReceipt.request.void_destination_address = destinationInput.value;
    restoredReceipt.request.payment_instructions.request_id = id;
    restoredReceipt.request.payment_instructions.amount = Number(amount);
    restoredReceipt.request.payment_instructions.send_from = destinationInput.value;
    restoredReceipt.request.launch_authority.expires_at_ms = expires;
    restoredReceipt.request.payment_instructions.expires_at_ms = expires;
    settleStale.resolve(new Response(JSON.stringify(restoredReceipt), {
      status: 201,
      headers: { "content-type": "application/json" },
    }));
  } else {
    settleStale.reject(new Error("synthetic_old_view_network_disconnected"));
  }

  await pendingOldViewPost;
  buyTest.renderSnapshot(ethereumSnapshot);
  buyTest.updateSubmit();
  assert.match(buyResultNode.textContent,
    /PRIOR REQUEST MAY EXIST — DO NOT SEND FUNDS/u,
    label + ": only conservative outcome may be shown in replacement view");
  assert.doesNotMatch(buyResultNode.textContent,
    /REQUEST CREATED|Send exactly:|Request ID:|buyvoid_stale_post_|synthetic_old_view_network_disconnected/u,
    label + ": old continuation must not disclose receipt or error");
  assert.equal(submitButton.disabled, true,
    label + ": same intent must remain no-retry across view replacement");
  await buyTest.submitBuy({ preventDefault() {} });
  assert.equal(fetchCalls.length, before + 1,
    label + ": stale settlement must not allow a second POST");
}

// Independent malformed receipt-body tests begin only AFTER the original
// document-lifetime 32-intent replay and SPA lifetime proofs above. Resetting
// a synthetic VM's Set here is test-only; the shipping browser has no reset.
buyTest.resetForIndependentReceiptFixtures();
const badDeliveryReceipts = [
  // The browser must not trust the edge proxy (still a separate Draft).
  // Absent durability proof or wrong canonical creation envelope: HOLD.
  ["missing_persistence_evidence", (body) => { delete body.request.persisted; }],
  ["false_persistence_evidence", (body) => { body.request.persisted.ok = false; }],
  ["string_persistence_evidence", (body) => { body.request.persisted.ok = "true"; }],
  ["boolean_persistence_evidence", (body) => { body.request.persisted = true; }],
  ["array_persistence_evidence", (body) => { body.request.persisted = [{ ok: true }]; }],
  ["persistence_receipt_private_file_path", (body) => {
    body.request.persisted.file = "/synthetic/private/request.json";
  }],
  ["persistence_receipt_unreviewed_extra_field", (body) => {
    body.request.persisted.debug = "synthetic-untrusted-operator-data";
  }],
  ["missing_outer_marker", (body) => { delete body.marker; }],
  ["wrong_outer_marker", (body) => { body.marker = "UNTRUSTED_CHECKOUT"; }],
  ["missing_active_request_cap", (body) => { delete body.one_active_request_cap_enforced; }],
  ["false_active_request_cap", (body) => { body.one_active_request_cap_enforced = false; }],
  ["missing_request_schema", (body) => { delete body.request.schema; }],
  ["wrong_request_schema", (body) => { body.request.schema = "legacy_request_v0"; }],
  ["missing_request_marker", (body) => { delete body.request.marker; }],
  ["wrong_request_marker", (body) => { body.request.marker = "UNTRUSTED_REQUEST"; }],
  ["false_request_ok", (body) => { body.request.ok = false; }],
  ["request_id_contains_path_separator", (body) => { body.request.request_id = "buyvoid_/not-a-request"; }],
  ["request_id_over_128_bytes", (body) => { body.request.request_id = "x".repeat(129); }],
  ["request_id_wrong_type", (body) => { body.request.request_id = 123; }],
  ["wrong_delivery_chain", (body) => { body.request.delivery_chain = "ethereum"; }],
  ["wrong_delivery_chain_id", (body) => { body.request.delivery_chain_id = 1; }],
  ["coerced_delivery_chain_id", (body) => { body.request.delivery_chain_id = "2050"; }],
  ["wrong_asset_in", (body) => { body.request.asset_in = "USDbC"; }],
  ["coerced_usdc_decimals", (body) => { body.request.usdc_decimals = "6"; }],
  ["request_first_flag_false", (body) => {
    body.request.request_contract.request_before_payment_required = false;
  }],
  ["active_destination_cap_false", (body) => {
    body.request.request_contract.one_active_request_per_void_destination = false;
  }],
  ["sender_destination_binding_false", (body) => {
    body.request.request_contract.payment_sender_must_equal_void_destination = false;
  }],
  ["operator_tx_hash_binding_false", (body) => {
    body.request.request_contract.payment_tx_hash_bound_after_request_by_operator = false;
  }],
  ["instructions_wrong_send_asset", (body) => {
    body.request.payment_instructions.send_asset = "USDbC";
  }],
  ["coerced_payment_chain_id", (body) => { body.request.payment_chain_id = "1"; }],
  ["coerced_instructions_chain_id", (body) => {
    body.request.payment_instructions.send_chain_id = "1";
  }],
  ["coerced_instructions_decimals", (body) => {
    body.request.payment_instructions.token_decimals = "6";
  }],
];
for (let i = 0; i < badDeliveryReceipts.length; i += 1) {
  const [label, corrupt] = badDeliveryReceipts[i];
  const amount = String(301 + i);
  const id = "buyvoid_malformed_delivery_" + i;
  const responseBody = structuredClone(verifiedEthereumNewRequestBody);
  responseBody.request.request_id = id;
  responseBody.request.created_at_ms = Date.now();
  const expiry = Date.now() + 60_000;
  responseBody.request.launch_authority.expires_at_ms = expiry;
  responseBody.request.payment_instructions.expires_at_ms = expiry;
  responseBody.request.requested_amount_usdc = Number(amount);
  responseBody.request.usdc_amount = Number(amount);
  responseBody.request.quoted_void = Number(amount) * 2;
  responseBody.request.payment_instructions.request_id = id;
  responseBody.request.payment_instructions.amount = Number(amount);
  corrupt(responseBody);
  amountInput.value = amount;
  chainInput.value = "ethereum";
  destinationInput.value = "0x1111111111111111111111111111111111111111";
  buyTest.setState(ethereumSnapshot, false, false);
  buyTest.renderSnapshot(ethereumSnapshot);
  buyTest.updateSubmit();
  assert.equal(submitButton.disabled, false, label + ": independent attempt must be eligible");
  const countBefore = fetchCalls.length;
  sandbox.fetch = async (...args) => {
    fetchCalls.push(args);
    return new Response(JSON.stringify(responseBody), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  };
  await buyTest.submitBuy({ preventDefault() {} });
  assert.equal(fetchCalls.length, countBefore + 1, label + ": one inert POST");
  assert.match(buyResultNode.textContent, /REQUEST OUTCOME UNCONFIRMED/u,
    label + ": a malformed checkout receipt cannot authorize payment");
  assert.doesNotMatch(buyResultNode.textContent, /REQUEST CREATED|Send exactly:|buyvoid_malformed_delivery_/u,
    label + ": no actionable private checkout instructions or returned ID");
  assert.equal(submitButton.disabled, true, label + ": ambiguous attempt remains no-retry");
  await buyTest.submitBuy({ preventDefault() {} });
  assert.equal(fetchCalls.length, countBefore + 1, label + ": same intent cannot POST twice");
}


 // Actual 3-endpoint readiness GET must never bind an obsolete response to a
 // replaced Buy DOM or a route that is no longer the Buy page. The existing
 // serial guard only covers a *new* GET; these adversaries do not start one.
 for (const [label, settleKind, replaceDom, leaveRoute] of [
   ["replaced_view_late_success", "success", true, false],
   ["replaced_view_late_failure", "failure", true, false],
   ["departed_route_late_success", "success", false, true],
 ]) {
   sandbox.location.hash = "#/buy";
   replaceBuyView();
   buyTest.beginBuyViewInstance(buyViewNode);
   chainInput.value = "base";
   buyTest.setState(validSnapshot, false, false);
   const waiting = [];
   sandbox.fetch = (url) => new Promise((resolve, reject) => {
     waiting.push({ url: String(url), resolve, reject });
   });
   const pendingOldReadiness = buyTest.loadBuy();
   assert.equal(waiting.length, 3,
     label + ": current real readiness loader must initiate all three GETs");
   assert.deepEqual(waiting.map(x => x.url), [
     "/__void/buy-void/config.json",
     "/__void/buy-void/status.json",
     "/__void/buy-void/sale-state.json",
   ], label + ": only exact fixed readiness sources are queried");

   if (replaceDom) {
     replaceBuyView();
     assert.equal(buyTest.beginBuyViewInstance(buyViewNode), true);
   }
   if (leaveRoute) sandbox.location.hash = "#/home";
   buyTest.setState(null, true, false);
   buyMessageNode.textContent = "NEW_VIEW_NOT_YET_QUALIFIED";
   buyIntakeNode.textContent = "HOLD";
   buyResultNode.textContent = "NO_PAYMENT_INSTRUCTIONS";
   const fixture = [validConfig, validStatus, validSale];
   for (let i = 0; i < waiting.length; i += 1) {
     if (settleKind === "failure" && i === 0) {
       waiting[i].reject(new Error("synthetic_old_readiness_failure"));
     } else {
       waiting[i].resolve(new Response(JSON.stringify(fixture[i]), {
         status: 200,
         headers: { "content-type": "application/json" },
       }));
     }
   }
   await pendingOldReadiness;
   assert.equal(buyMessageNode.textContent, "NEW_VIEW_NOT_YET_QUALIFIED",
     label + ": stale readiness must never mark new or departed view OPEN");
   assert.equal(buyIntakeNode.textContent, "HOLD",
     label + ": no stale BUY intake state promotion");
   assert.equal(buyResultNode.textContent, "NO_PAYMENT_INSTRUCTIONS",
     label + ": no stale payment/readiness or error copy");
   assert.equal(submitButton.disabled, true,
     label + ": never enable Buy submit from a stale readiness response");
 }
 // A genuinely new GET owned by the current Buy DOM still renders correctly.
 sandbox.location.hash = "#/buy";
 replaceBuyView();
 buyTest.beginBuyViewInstance(buyViewNode);
 chainInput.value = "base";
 const acceptedReadiness = new Map([
   ["/__void/buy-void/config.json", validConfig],
   ["/__void/buy-void/status.json", validStatus],
   ["/__void/buy-void/sale-state.json", validSale],
 ]);
 const positiveReadinessPaths = [];
 sandbox.fetch = async (url) => {
   positiveReadinessPaths.push(String(url));
   assert.ok(acceptedReadiness.has(String(url)),
     "only fixed Buy VOID readiness sources are allowed");
   return new Response(JSON.stringify(acceptedReadiness.get(String(url))), {
     status: 200,
     headers: { "content-type": "application/json" },
   });
 };
 await buyTest.loadBuy();
 assert.equal(positiveReadinessPaths.length, 3);
 assert.equal(buyIntakeNode.textContent, "OPEN",
   "fresh view-owned validated readiness may render OPEN");
 assert.match(buyMessageNode.textContent, /Base request intake is OPEN/u);
 assert.equal(submitButton.disabled, true,
   "OPEN readiness without new-view required fields never enables purchase");


// Cross-PR synthetically matched, FULL original-buyer Base native-USDC 201.
// Exact fixture fields are mirrored from Draft #2823's source-only gateway
// proof at head 7b360e70 (not a merged or installed source composition).
// This is browser acceptance of the same wire shape, not a gateway test or
// permission to take a payment. The earlier Ethereum proof remains intact.
buyTest.resetForIndependentReceiptFixtures();
replaceBuyView();
assert.equal(buyTest.beginBuyViewInstance(buyViewNode), true);
chainInput.value = "base";
amountInput.value = "10";
destinationInput.value = "0x1111111111111111111111111111111111111111";
buyTest.setState(validSnapshot, false, false);
buyTest.renderSnapshot(validSnapshot);
buyTest.updateSubmit();
assert.equal(submitButton.disabled, false,
  "new Base original-buyer synthetic intent must be eligible");
const fullCreatedAtMs = Date.now();
const fullExpiresAtMs = fullCreatedAtMs + 4 * 60 * 1000;
const full201RequestId = "buyvoid_edge_full_base_aaaaaaaa";
const full201Destination = "0x1111111111111111111111111111111111111111";
const full201Receiver = "0x17a26d4f0c51bd28fbcf5cdd4d20853bfa112ae5";
const full201BaseUsdc = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const fullAccepted201Receipt = {
  schema: "void_public_buy_void_checkout_request_result_v1",
  marker: "VOID_BUY_VOID_PUBLIC_CHECKOUT_CONTRACT_V1",
  ok: true,
  idempotent: false,
  one_active_request_cap_enforced: true,
  request: {
    schema: "void_public_buy_void_checkout_request_v1",
    marker: "VOID_BUY_VOID_PUBLIC_CHECKOUT_CONTRACT_V1",
    ok: true,
    persisted: { ok: true },
    request_id: full201RequestId,
    created_at_ms: fullCreatedAtMs,
    launch_authority: { expires_at_ms: fullExpiresAtMs },
    status: "awaiting_payment_tx_hash",
    tx_hash: "",
    source_chain: "base",
    payment_chain: "base",
    payment_chain_id: 8453,
    asset_in: "USDC",
    usdc_decimals: 6,
    usdc_contract: full201BaseUsdc,
    usdc_amount: 10,
    requested_amount_usdc: 10,
    rate_void_per_usdc: "2",
    price_usdc_per_void: "0.50",
    pool_void_total: validSale.pool_void_total,
    quoted_void: 20,
    receive_address: full201Receiver,
    void_destination_address: full201Destination,
    delivery_address: full201Destination,
    delivery_wallet: full201Destination,
    delivery_chain: "void",
    delivery_chain_id: 2050,
    request_contract: {
      request_before_payment_required: true,
      one_active_request_per_void_destination: true,
      payment_sender_must_equal_void_destination: true,
      payment_tx_hash_bound_after_request_by_operator: true,
    },
    safety: {
      automatic_fulfillment: false,
      manual_review_required: true,
    },
    payment_instructions: {
      request_id: full201RequestId,
      amount: 10,
      expires_at_ms: fullExpiresAtMs,
      send_asset: "USDC",
      send_chain: "base",
      send_chain_id: 8453,
      token_contract: full201BaseUsdc,
      token_decimals: 6,
      send_to: full201Receiver,
      send_from: full201Destination,
      do_not_send_before_request: true,
      keep_transaction_hash: true,
      do_not_send_from_exchange_or_pooled_custody: true,
    },
  },
};

assert.equal(fullAccepted201Receipt.request.payment_instructions.send_chain, "base");
assert.equal(fullAccepted201Receipt.request.payment_instructions.send_chain_id, 8453);
assert.equal(fullAccepted201Receipt.request.delivery_chain_id, 2050);
assert.deepEqual(fullAccepted201Receipt.request.persisted, {ok: true});
const fullBaseSourceWire = JSON.stringify(fullAccepted201Receipt, null, 3) + "\n";
// Verify the ORIGINAL BUYER POST, not just the canned 201 response. Otherwise
// an accidentally wrong chain, amount, destination or missing acknowledgement
// could be hidden by this mocked downstream receipt.
const assertExactBaseOriginalBuyerPost = (args, expectedAmount) => {
  assert.equal(args[0], "/__void/buy-void/request");
  assert.equal(args[1]?.method, "POST");
  assert.deepEqual(JSON.parse(String(args[1]?.body || "")), {
    requested_amount_usdc: expectedAmount,
    void_destination_address: full201Destination,
    source_chain: "base",
    ack_self_custody: true,
    ack_native_usdc: true,
    ack_request_before_payment: true,
    ack_sender_equals_void_destination: true,
    ack_no_automatic_fulfillment: true,
  }, "Base original-buyer POST must match exact canonical receipt intent and acknowledgements");
};
const basePostBefore = fetchCalls.length;
sandbox.fetch = async (...args) => {
  fetchCalls.push(args);
  assertExactBaseOriginalBuyerPost(args, "10");
  return new Response(fullBaseSourceWire, {
    status: 201,
    headers: { "content-type": "application/json" },
  });
};
await buyTest.submitBuy({ preventDefault() {} });
assert.equal(fetchCalls.length, basePostBefore + 1,
  "full Base 201 creates exactly one simulated browser POST");
assert.match(buyResultNode.textContent, /REQUEST CREATED — VERIFY BEFORE PAYMENT/u);
assert.match(buyResultNode.textContent, /Send exactly: 10 USDC/u);
assert.match(buyResultNode.textContent, /Base Mainnet \(8453\)/u);
assert.match(buyResultNode.textContent, /buyvoid_edge_full_base_aaaaaaaa/u);
assert.equal(submitButton.disabled, true,
  "successful full-Base 201 must fence identical intent");
await buyTest.submitBuy({ preventDefault() {} });
assert.equal(fetchCalls.length, basePostBefore + 1,
  "full-Base 201 may not post twice for the same intent");

// Corrupt one *instruction* while leaving the outer and embedded schemas,
// created request, rail and durable ack intact. The browser independently
// refuses directions without treating the uncertain outcome as safe retry.
const corruptBaseReceipt = structuredClone(fullAccepted201Receipt);
corruptBaseReceipt.request.request_id = "buyvoid_edge_full_base_corrupt_aaaaaaaa";
corruptBaseReceipt.request.requested_amount_usdc = 11;
corruptBaseReceipt.request.usdc_amount = 11;
corruptBaseReceipt.request.quoted_void = 22;
corruptBaseReceipt.request.payment_instructions.request_id =
  corruptBaseReceipt.request.request_id;
corruptBaseReceipt.request.payment_instructions.amount = 11;
corruptBaseReceipt.request.payment_instructions.send_to =
  "0x2222222222222222222222222222222222222222";
const corruptBasePostBefore = fetchCalls.length;
amountInput.value = "11";
buyTest.updateSubmit();
assert.equal(submitButton.disabled, false,
  "different Base synthetic intent may be attempted independently");
sandbox.fetch = async (...args) => {
  fetchCalls.push(args);
  assertExactBaseOriginalBuyerPost(args, "11");
  return new Response(JSON.stringify(corruptBaseReceipt), {
    status: 201,
    headers: { "content-type": "application/json" },
  });
};
await buyTest.submitBuy({ preventDefault() {} });
assert.equal(fetchCalls.length, corruptBasePostBefore + 1);
assert.match(buyResultNode.textContent, /REQUEST OUTCOME UNCONFIRMED/u,
  "corrupt full-Base native-USDC instruction must fail closed");
assert.doesNotMatch(buyResultNode.textContent, /REQUEST CREATED|Send exactly:/u);
assert.equal(submitButton.disabled, true,
  "corrupt full-Base receipt preserves no-repeat POST");
await buyTest.submitBuy({ preventDefault() {} });
assert.equal(fetchCalls.length, corruptBasePostBefore + 1);

// Bind native USDC and VOID using exact integer micro-units, independent of
// the top-level 201/receipt schema and individually trusted USDC instructions.
buyTest.resetForIndependentReceiptFixtures();
replaceBuyView();
assert.equal(buyTest.beginBuyViewInstance(buyViewNode), true);
chainInput.value = "base";
destinationInput.value = full201Destination;
buyTest.setState(validSnapshot, false, false);
const freshQuoteReceipt = (rawAmount, quotedAmount, id) => {
  const receipt = structuredClone(fullAccepted201Receipt);
  const amount = Number(rawAmount);
  receipt.request.request_id = id;
  receipt.request.usdc_amount = amount;
  receipt.request.requested_amount_usdc = amount;
  receipt.request.quoted_void = quotedAmount;
  receipt.request.payment_instructions.request_id = id;
  receipt.request.payment_instructions.amount = amount;
  receipt.request.created_at_ms = Date.now();
  const expiry = receipt.request.created_at_ms + 240000;
  receipt.request.launch_authority.expires_at_ms = expiry;
  receipt.request.payment_instructions.expires_at_ms = expiry;
  return receipt;
};
// Positive fractional quote: 12.000001 USDC = 24.000002 VOID exactly.
{
  const receipt = freshQuoteReceipt("12.000001", 24.000002,
    "buyvoid_exact_fractional_quote");
  amountInput.value = "12.000001";
  buyTest.renderSnapshot(validSnapshot);
  buyTest.updateSubmit();
  assert.equal(submitButton.disabled, false);
  const before = fetchCalls.length;
  sandbox.fetch = async (...args) => {
    fetchCalls.push(args);
    return new Response(JSON.stringify(receipt), {
      status: 201, headers: { "content-type": "application/json" },
    });
  };
  await buyTest.submitBuy({ preventDefault() {} });
  assert.equal(fetchCalls.length, before + 1);
  assert.match(buyResultNode.textContent,
    /REQUEST CREATED — VERIFY BEFORE PAYMENT/u,
    "exact six-decimal quote remains accepted");
}
const badEconomicQuoteReceipts = [
  ["VOID_quote_under", (x) => { x.request.quoted_void -= 1; }],
  ["VOID_quote_over", (x) => { x.request.quoted_void += 1; }],
  ["VOID_quote_string", (x) => { x.request.quoted_void = String(x.request.quoted_void); }],
  ["VOID_quote_sub_micro", (x) => { x.request.quoted_void += 0.0000001; }],
  ["VOID_quote_missing", (x) => { delete x.request.quoted_void; }],
  ["VOID_rate_changed", (x) => { x.request.rate_void_per_usdc = "3"; }],
  ["VOID_price_changed", (x) => { x.request.price_usdc_per_void = "0.75"; }],
  ["VOID_pool_changed", (x) => { x.request.pool_void_total += 1; }],
  ["original_USDC_changed", (x) => { x.request.usdc_amount += 1; }],
  ["public_USDC_changed", (x) => { x.request.requested_amount_usdc += 1; }],
];
for (let i = 0; i < badEconomicQuoteReceipts.length; i += 1) {
  const [label, corrupt] = badEconomicQuoteReceipts[i];
  const amt = String(30 + i);
  const receipt = freshQuoteReceipt(amt, Number(amt) * 2,
    "buyvoid_bad_quote_" + i);
  corrupt(receipt);
  amountInput.value = amt;
  buyTest.renderSnapshot(validSnapshot);
  buyTest.updateSubmit();
  assert.equal(submitButton.disabled, false, label + ": unique valid attempt");
  const before = fetchCalls.length;
  sandbox.fetch = async (...args) => {
    fetchCalls.push(args);
    return new Response(JSON.stringify(receipt), {
      status: 201, headers: { "content-type": "application/json" },
    });
  };
  await buyTest.submitBuy({ preventDefault() {} });
  assert.equal(fetchCalls.length, before + 1, label + ": one synthetic POST");
  assert.match(buyResultNode.textContent, /REQUEST OUTCOME UNCONFIRMED/u,
    label + ": economic mismatch cannot be called successful");
  assert.doesNotMatch(buyResultNode.textContent, /REQUEST CREATED|Send exactly:/u,
    label + ": no actionable instructions on economic mismatch");
  assert.equal(submitButton.disabled, true, label + ": never auto retry");
}

console.log("VOID_BUY_VOID_APP_LAUNCH_READY_V1_GREEN");
console.log(`canonical_price_usdc_per_void=${canonicalPrice.price}`);
console.log(`canonical_price_occurrences=${canonicalPrice.occurrenceCount}`);
console.log(`participant_price_occurrences=${canonicalPrice.displayCount}`);
console.log(`price_policy_one_unit_falsification=${driftedPrice}`);
console.log("live_readiness_required=1");
console.log("sale_snapshot_strict_numeric_types=1");
console.log("canonical_price_rate_strings_required=1");
console.log("usdc_limits_bigint_atom_bound=1");
console.log("refresh_pending_submit_disabled=1");
console.log("stale_buy_readiness_get_cannot_rebind_replaced_view=true");
console.log("stale_buy_readiness_get_cannot_promote_departed_route=true");
console.log("fresh_owned_buy_readiness_get_can_render=true");
console.log("full_cross_pr_base_201_browser_receipt_accepted=true");
console.log("full_cross_pr_base_request_body_and_acknowledgements_exact=true");
console.log("full_cross_pr_base_201_bad_payment_instruction_refused=true");
console.log("refresh_pending_post_count=0");
console.log("request_creation_activation_gated=1");
console.log("dual_rail_selection_bound=true");
console.log("base_open_ethereum_hold_message_bound=true");
console.log("dual_rail_open_message_bound=true");
console.log("global_hold_message_bound=true");
console.log("rail_state_contradiction_adversary_green=true");
console.log("response_body_max_bytes=131072");
console.log("buy_header_refusal_unlocked_body_cancellation_bounded=true");
console.log("buy_reader_acquisition_failure_unlocked_body_cancelled=true");
console.log("buy_response_cancel_never_blocks_checkout_hold=true");
console.log("buy_response_body_absolute_read_deadline=true");
console.log("buy_response_infinite_trickle_deadline_cannot_reset=true");
console.log("buy_response_delayed_timer_monotonic_deadline_bound=true");
console.log("buy_response_monotonic_clock_rollback_or_absence_holds=true");
console.log("buy_response_clock_unavailable_never_acquires_stream=true");
console.log("returned_request_intent_bound=1");
console.log("receipt_live_activation_lease_max_300000ms_bound=true");
console.log("impossible_five_minute_plus_one_receipt_refused=true");
console.log("browser_rejects_reused_or_non201_buy_receipts=true");
console.log("browser_rejects_nonnew_or_prepaid_buy_receipts=true");
console.log("buyer_payment_instruction_amount_and_id_exactly_bound=true");
console.log("buyer_quoted_VOID_micro_units_exactly_bound=true");
console.log("buyer_rejects_mismatched_void_quote_price_and_original_usdc=true");
console.log("buy_receipt_native_usdc_chain2050_delivery_bound=true");
console.log("buy_receipt_request_first_and_operator_bind_flags_required=true");
console.log("buy_receipt_numeric_chain_fields_type_strict=true");
console.log("buy_receipt_requires_durable_new_request_ack=true");
console.log("buy_receipt_rejects_extra_private_persistence_fields=true");
console.log("buy_receipt_canonical_creation_envelope_bound=true");
console.log("buy_receipt_request_id_bounded_and_safe=true");
console.log("buy_receipt_deadline_bound_to_launch_authority=true");
console.log("expired_payment_instructions_never_restored=true");
console.log("resume_visibility_pageshow_focus_recheck_expiry_without_post=true");
console.log("resume_still_valid_wallet_app_bfcache_focus_preserves_receipt_no_network=true");
console.log("resume_non_buy_route_and_missing_dom_no_render=true");
console.log("server_timestamp_and_monotonic_instruction_deadline_bound=true");
console.log("wall_rollback_suspension_and_skew_fail_closed=true");
console.log("same_intent_repost_after_receipt_blocked=1");
console.log("same_intent_repost_after_timeout_blocked=1");
console.log("same_intent_repost_after_spa_navigation_blocked=1");
console.log("spa_navigation_never_revives_old_payment_receipt=1");
console.log("stale_spa_post_success_and_failure_cannot_rebind_receipt=true");
console.log("first_intent_preserved_after_second_post=1");
console.log("multi_intent_guard_memory_bounded=32");
console.log("prior_receipt_not_misbound_to_different_intent=1");
console.log("equivalent_usdc_atoms_retry_blocked=1");
console.log("ambiguous_server_commit_not_declared_not_created=1");
console.log("anonymous_duplicate_checkout_409_no_resubmit_documented=true");
console.log("request_outcome_survives_readiness_refresh=1");
console.log("confirmed_receipt_bound_to_readiness_serial=1");
console.log("open_to_open_readiness_refresh_retires_payment_instructions=1");
console.log("uncertain_outcome_warning_survives_without_payment_authority=1");
console.log("ethereum_rail_hold_hides_settled_and_late_receipts=1");
console.log("same_readiness_generation_receipt_may_restore_after_rail_reopen=1");
console.log("exchange_custody_loss_warning=1");
console.log("wallet_or_signer_access=0");
console.log("browser_fund_send=0");
console.log("transaction_broadcast=0");
console.log("money_movement_by_page=0");
console.log("invalid_buy_fields_announced=1");
