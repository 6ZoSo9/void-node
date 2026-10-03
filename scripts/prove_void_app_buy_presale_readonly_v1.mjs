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
  "usdcAtoms",
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
const amountInput = { value: "10", disabled: false };
const destinationInput = {
  value: "0x1111111111111111111111111111111111111111",
  disabled: false,
};
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
const buyViewNode = {};
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
      if (selector === "[data-buy-chain]") return chainInput;
      if (selector === "[data-buy-view]") return buyViewNode;
      return null;
    },
    querySelectorAll(selector) {
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
  updateSubmit,
  submitBuy,
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
chainInput.value = "ethereum";
buyTest.setState(validSnapshot, false, false);
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
buyTest.updateSubmit();
assert.equal(submitButton.disabled, false, "Ethereum may enable only after its explicit gate is OPEN");
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
console.log("response_body_max_bytes=131072");
console.log("returned_request_intent_bound=1");
console.log("exchange_custody_loss_warning=1");
console.log("wallet_or_signer_access=0");
console.log("browser_fund_send=0");
console.log("transaction_broadcast=0");
console.log("money_movement_by_page=0");
