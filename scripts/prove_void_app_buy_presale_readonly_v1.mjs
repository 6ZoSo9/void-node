import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const viewsPath = "public/void-app-wave1-v1/assets/js/views.js";
const clientPath = "public/void-app-wave1-v1/assets/js/buy-live.js";
const canonicalPricePath = "src/index.ts";
const source = readFileSync(viewsPath, "utf8");
const client = readFileSync(clientPath, "utf8");
const canonicalSource = readFileSync(canonicalPricePath, "utf8");

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
  "currentSnapshot = null",
  "ack_self_custody",
  "ack_request_before_payment",
  "ack_sender_equals_void_destination",
  "do_not_send_from_exchange_or_pooled_custody",
  "VOID cannot recover exchange/custodial sends",
  "body.schema !== 'void_public_buy_void_checkout_request_result_v1'",
  "request.void_destination_address",
  "returned request amount mismatch",
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
  "request.payment_instructions?.keep_transaction_hash",
  "request.payment_instructions?.do_not_send_before_request",
  "request.payment_instructions?.amount",
  "request.payment_instructions?.request_id",
  "request.tx_hash !== ''",
  "request.status !== 'awaiting_payment_tx_hash'",
  "body.idempotent !== false",
  "response.status !== 201",
  "attemptedResultExpiresAtMs",
  "REQUEST INSTRUCTIONS EXPIRED",
  "armReceiptExpiryTimer",
  "clearReceiptExpiryTimer",
  "request.launch_authority?.expires_at_ms",
  "instructionExpiresAtMs",
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
const sandbox = {
  console,
  location: { hash: "#/buy" },
  window: { addEventListener() {} },
  document: {
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
    addEventListener() {},
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
  validateSnapshot,
  isOpen,
  renderSnapshot,
  renderError,
  updateSubmit,
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
};
`;
vm.runInNewContext(instrumentedClient, sandbox, {
  filename: clientPath,
});
const buyTest = sandbox.__voidBuyTestV1;
assert.ok(buyTest);

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
const receiptExpiryAtMs = Date.now() + 10 * 60 * 1000;
let verifiedEthereumNewRequestBody = null;
sandbox.fetch = async (...args) => {
  fetchCalls.push(args);
  const requestBody = {
    ok: true,
    schema: "void_public_buy_void_checkout_request_result_v1",
    idempotent: false,
    request: {
      request_id: "buyvoid_ethereum_open_v1",
      status: "awaiting_payment_tx_hash",
      tx_hash: "",
      launch_authority: { expires_at_ms: receiptExpiryAtMs },
      receive_address: validConfig.receive_address,
      void_destination_address: destinationInput.value,
      source_chain: "ethereum",
      payment_chain: "ethereum",
      payment_chain_id: 1,
      usdc_contract: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      requested_amount_usdc: "10",
      safety: { automatic_fulfillment: false, manual_review_required: true },
      payment_instructions: {
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
// identical submission and must survive OPEN readiness refresh.
assert.equal(submitButton.disabled, true, "same receipt intent must stay disabled");
assert.match(buyResultNode.textContent, /buyvoid_ethereum_open_v1/u);
await buyTest.submitBuy({ preventDefault() {} });
assert.equal(fetchCalls.length, 1, "same-intent success retry must not POST");
buyTest.renderSnapshot(ethereumSnapshot);
assert.match(buyResultNode.textContent, /buyvoid_ethereum_open_v1/u);
assert.equal(submitButton.disabled, true, "refresh must retain successful intent lock");
// A fresh 201 receipt is actionably valid only until its exact instruction
// expiry. An independently OPEN refreshed presale cannot revive old payment
// instructions or permit a new POST for the previously committed intent.
const nativeBrowserDateNow = vm.runInNewContext("Date.now", sandbox);
sandbox.__syntheticBuyNowMs = receiptExpiryAtMs + 1;
vm.runInNewContext("Date.now = () => globalThis.__syntheticBuyNowMs", sandbox);
try {
  assert.equal(vm.runInNewContext("Date.now()", sandbox), receiptExpiryAtMs + 1,
    "synthetic browser time must cross the original instruction deadline");
  buyTest.updateSubmit();
  assert.match(buyResultNode.textContent,
    /REQUEST INSTRUCTIONS EXPIRED — DO NOT SEND FUNDS/u);
  assert.doesNotMatch(buyResultNode.textContent,
    /REQUEST CREATED|Send exactly:|buyvoid_ethereum_open_v1/u,
    "expired receipt must expose no actionable payment instructions");
  assert.equal(submitButton.disabled, true);
  const beforeExpiryRetry = fetchCalls.length;
  await buyTest.submitBuy({ preventDefault() {} });
  assert.equal(fetchCalls.length, beforeExpiryRetry,
    "expired-but-committed intent must not silently POST again");
  buyTest.renderSnapshot(ethereumSnapshot);
  assert.match(buyResultNode.textContent,
    /REQUEST INSTRUCTIONS EXPIRED — DO NOT SEND FUNDS/u,
    "fresh OPEN cannot revive expired request instructions");
} finally {
  sandbox.__nativeBrowserDateNow = nativeBrowserDateNow;
  vm.runInNewContext("Date.now = globalThis.__nativeBrowserDateNow", sandbox);
  delete sandbox.__nativeBrowserDateNow;
  delete sandbox.__syntheticBuyNowMs;
}
buyTest.updateSubmit();
assert.match(buyResultNode.textContent, /buyvoid_ethereum_open_v1/u,
  "restored synthetic pre-expiry time still shows independently bound receipt");

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
    idempotent: false,
    request: {
      request_id: requestId,
      status: "awaiting_payment_tx_hash",
      tx_hash: "",
      launch_authority: { expires_at_ms: receiptExpiryAtMs },
      receive_address: validConfig.receive_address,
      void_destination_address: destinationInput.value,
      source_chain: "ethereum",
      payment_chain: "ethereum",
      payment_chain_id: 1,
      usdc_contract: "0xA0b86991c6218b36c1d19D4a2e9Eb0ce3606eB48",
      requested_amount_usdc: amount,
      safety: { automatic_fulfillment: false, manual_review_required: true },
      payment_instructions: {
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
];
for (let i = 0; i < bogusReceipts.length; i += 1) {
  const [label, httpStatus, mutate] = bogusReceipts[i];
  const amount = String(21 + i);
  const id = "buyvoid_synthetic_adversary_" + i;
  const responseBody = structuredClone(verifiedEthereumNewRequestBody);
  responseBody.request.request_id = id;
  responseBody.request.requested_amount_usdc = amount;
  responseBody.request.payment_instructions.request_id = id;
  responseBody.request.payment_instructions.amount = Number(amount);
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
console.log("refresh_pending_post_count=0");
console.log("request_creation_activation_gated=1");
console.log("dual_rail_selection_bound=true");
console.log("base_open_ethereum_hold_message_bound=true");
console.log("dual_rail_open_message_bound=true");
console.log("global_hold_message_bound=true");
console.log("rail_state_contradiction_adversary_green=true");
console.log("response_body_max_bytes=131072");
console.log("returned_request_intent_bound=1");
console.log("browser_rejects_reused_or_non201_buy_receipts=true");
console.log("browser_rejects_nonnew_or_prepaid_buy_receipts=true");
console.log("buyer_payment_instruction_amount_and_id_exactly_bound=true");
console.log("buy_receipt_deadline_bound_to_launch_authority=true");
console.log("expired_payment_instructions_never_restored=true");
console.log("same_intent_repost_after_receipt_blocked=1");
console.log("same_intent_repost_after_timeout_blocked=1");
console.log("first_intent_preserved_after_second_post=1");
console.log("multi_intent_guard_memory_bounded=32");
console.log("prior_receipt_not_misbound_to_different_intent=1");
console.log("equivalent_usdc_atoms_retry_blocked=1");
console.log("ambiguous_server_commit_not_declared_not_created=1");
console.log("request_outcome_survives_readiness_refresh=1");
console.log("ethereum_rail_hold_hides_settled_and_late_receipts=1");
console.log("ethereum_receipt_restored_only_after_rail_reopen=1");
console.log("exchange_custody_loss_warning=1");
console.log("wallet_or_signer_access=0");
console.log("browser_fund_send=0");
console.log("transaction_broadcast=0");
console.log("money_movement_by_page=0");
console.log("invalid_buy_fields_announced=1");
