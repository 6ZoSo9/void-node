const BUY_CONFIG_ENDPOINT = '/__void/buy-void/config.json';
const BUY_STATUS_ENDPOINT = '/__void/buy-void/status.json';
const BUY_SALE_ENDPOINT = '/__void/buy-void/sale-state.json';
const BUY_REQUEST_ENDPOINT = '/__void/buy-void/request';
const BUY_MARKER = 'VOID_BUY_VOID_PUBLIC_CHECKOUT_CONTRACT_V1';
const CANONICAL_RECEIVER = '0x17a26d4f0c51bd28fbcf5cdd4d20853bfa112ae5';
const CANONICAL_BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const CANONICAL_ETHEREUM_USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const BUY_RAILS = {
  base: { chainId: 8453, contract: CANONICAL_BASE_USDC, label: 'Base Mainnet' },
  ethereum: { chainId: 1, contract: CANONICAL_ETHEREUM_USDC, label: 'Ethereum Mainnet' },
};
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const MAX_BUY_JSON_BYTES = 131072;
// Independent absolute body-read deadline. Fetch timeout alone is not proof
// that a hostile/stalled ReadableStream reader honors an abort signal.
const MAX_BUY_RESPONSE_BODY_MS = 7000;
let requestSerial = 0;
let currentSnapshot = null;
let readinessPending = false;
let submitBusy = false;
// A lost POST response does not prove the server failed to create a request.
// Keep every attempted intent blocked throughout this SPA document, including
// after route/view replacement. A reload still requires server-side recovery.
let attemptedIntentKey = null;
// Limit per-view history to a small fixed number of attempted POST intents.
// A-B-A (or A-B-C-A) must not forget the first possibly committed request.
const MAX_BUY_ATTEMPTS_PER_VIEW = 32;
const attemptedIntentKeys = new Set();
let attemptedResultText = null;
// Confirmed payment instructions are authority-bearing only for the exact
// readiness GET generation under which their POST began. The public edge
// intentionally exposes only bounded lease expiry, not internal launch
// generation IDs, so any later readiness GET permanently retires actionable
// instructions while preserving the no-retry intent fence.
let attemptedResultReadinessSerial = null;
let attemptedResultExpiresAtMs = null;
let attemptedResultMonoDeadlineMs = null;
let attemptedResultAcceptedMonoMs = null;
let attemptedResultAcceptedWallMs = null;
let attemptedResultExpired = false;
let receiptExpiryTimer = null;
// The server-generated request creation timestamp anchors the response to
// server time. Subtract the whole observed POST lifetime plus an explicit
// skew budget, then use performance.now() to retain a monotonic expiry.
// An untrusted/rolled-back wall clock must never revive instructions.
const BUY_RECEIPT_MAX_CLOCK_SKEW_MS = 5000;
const BUY_RECEIPT_MAX_POST_DURATION_MS = 10000;
// The canonical coupled live-activation lease is never longer than 5 minutes.
const BUY_RECEIPT_MAX_LIVE_LEASE_MS = 5 * 60 * 1000;
function receiptMonotonicNow() {
  try {
    const now = globalThis.performance?.now?.();
    return typeof now === 'number' && Number.isFinite(now) && now >= 0 ? now : null;
  } catch {
    return null;
  }
}
function clearReceiptExpiryTimer() {
  if (receiptExpiryTimer !== null) clearTimeout(receiptExpiryTimer);
  receiptExpiryTimer = null;
}
function receiptExpiredOrUntrusted() {
  if (attemptedResultMonoDeadlineMs === null) return false;
  if (attemptedResultExpired) return true;
  const monoNow = receiptMonotonicNow();
  const wallNow = Date.now();
  const monoElapsed = monoNow === null ? NaN : monoNow - attemptedResultAcceptedMonoMs;
  const wallElapsed = wallNow - attemptedResultAcceptedWallMs;
  if (
    monoNow === null ||
    !Number.isSafeInteger(wallNow) ||
    !Number.isFinite(monoElapsed) || monoElapsed < 0 ||
    !Number.isFinite(wallElapsed) ||
    Math.abs(wallElapsed - monoElapsed) > BUY_RECEIPT_MAX_CLOCK_SKEW_MS ||
    monoNow >= attemptedResultMonoDeadlineMs ||
    wallNow >= attemptedResultExpiresAtMs - BUY_RECEIPT_MAX_CLOCK_SKEW_MS
  ) {
    attemptedResultExpired = true;
    clearReceiptExpiryTimer();
    return true;
  }
  return false;
}
function armReceiptExpiryTimer(monoDeadlineMs) {
  clearReceiptExpiryTimer();
  if (monoDeadlineMs !== attemptedResultMonoDeadlineMs ||
      receiptExpiredOrUntrusted()) return;
  const monoNow = receiptMonotonicNow();
  if (monoNow === null) {
    receiptExpiredOrUntrusted();
    return;
  }
  const remaining = monoDeadlineMs - monoNow;
  if (!Number.isFinite(remaining) || remaining <= 0) {
    receiptExpiredOrUntrusted();
    return;
  }
  receiptExpiryTimer = setTimeout(() => {
    receiptExpiryTimer = null;
    updateSubmit();
    // Long timeouts are capped; only the SAME non-expired receipt can re-arm.
    if (attemptedResultMonoDeadlineMs === monoDeadlineMs &&
        !attemptedResultExpired) armReceiptExpiryTimer(monoDeadlineMs);
  }, Math.min(Math.max(1, remaining), 2147483647));
}
const touchedFields = new Set();
let activeBuyView = null;
let buyViewGeneration = 0;
const beginBuyViewInstance = (view) => {
  if (view === activeBuyView) return false;
  buyViewGeneration += 1;
  clearReceiptExpiryTimer();
  activeBuyView = view;
  touchedFields.clear();
  // Do not erase possibly committed POST intents when the SPA replaces this
  // view. Retire only the old receipt text and expiry state below: no prior
  // payment directions can be revived by navigating away and back.
  attemptedIntentKey = null;
  attemptedResultText = null;
  attemptedResultReadinessSerial = null;
  attemptedResultExpiresAtMs = null;
  attemptedResultMonoDeadlineMs = null;
  attemptedResultAcceptedMonoMs = null;
  attemptedResultAcceptedWallMs = null;
  attemptedResultExpired = false;
  return true;
};

const currentRoute = () => location.hash.replace(/^#\/?/, '').split(/[?\/]/)[0] || 'home';
const one = (selector) => document.querySelector(selector);
const all = (selector) => [...document.querySelectorAll(selector)];
const setText = (selector, value, fallback = '—') => {
  all(selector).forEach((node) => {
    node.textContent = value === null || value === undefined || value === '' ? fallback : String(value);
  });
};
const setChip = (selector, tone, label) => {
  all(selector).forEach((node) => {
    node.className = `status-chip status-chip--${tone}`;
    node.textContent = label;
  });
};
const format = (value, maximumFractionDigits = 6) => {
  const number = Number(value);
  return Number.isFinite(number)
    ? number.toLocaleString('en-US', { maximumFractionDigits })
    : '—';
};
const strictJson = async (response, bodyDeadlineMs = MAX_BUY_RESPONSE_BODY_MS) => {
  // Header/deadline refusals happen before a reader is acquired. Explicitly
  // retire the still-unlocked body so a stalled peer cannot retain the fetch.
  // Never await cancellation or replace the original fail-closed error.
  const cancelUnopenedBody = () => {
    try {
      const result = response.body?.cancel?.();
      if (result) void Promise.resolve(result).catch(() => undefined);
    } catch {
      // Best-effort transport cleanup grants no Buy request authority.
    }
  };
  let bodyStartedMonoMs;
  try {
    if (!Number.isSafeInteger(bodyDeadlineMs) || bodyDeadlineMs < 1 ||
        bodyDeadlineMs > MAX_BUY_RESPONSE_BODY_MS) {
      throw new Error('invalid Buy VOID body deadline');
    }
    const type = String(response.headers.get('content-type') || '').toLowerCase();
    if (!type.includes('application/json')) throw new Error('non-JSON Buy VOID response');
    const declared = Number(response.headers.get('content-length') || '0');
    if (Number.isFinite(declared) && declared > MAX_BUY_JSON_BYTES) {
      throw new Error('Buy VOID response exceeds byte limit');
    }
    // Establish the time budget BEFORE acquiring a stream reader. A missing
    // or invalid monotonic clock must not leave the response body locked with
    // no cancellation path (for example, after a tab loses clock access).
    // Browser timers may fire late; they are only wake-up mechanisms.
    bodyStartedMonoMs = receiptMonotonicNow();
    if (bodyStartedMonoMs === null) {
      throw new Error('Buy VOID response body monotonic clock unavailable');
    }
  } catch (error) {
    cancelUnopenedBody();
    throw error;
  }
  // A malformed/missing/throwing reader acquisition leaves the response
  // body unopened. Retire it exactly as for header-stage refusals rather
  // than retaining a possibly committed checkout connection.
  let reader;
  try {
    reader = response.body?.getReader?.();
    if (!reader) throw new Error('Buy VOID response stream unavailable');
  } catch (error) {
    cancelUnopenedBody();
    throw error;
  }
  const assertBodyWithinDeadline = () => {
    const now = receiptMonotonicNow();
    if (now === null || now < bodyStartedMonoMs ||
        now - bodyStartedMonoMs >= bodyDeadlineMs) {
      throw new Error('Buy VOID response body deadline exceeded');
    }
  };
  const chunks = [];
  let total = 0;
  let bodyDeadlineTimer = null;
  let bodyReadRetired = false;
  // The timeout is for the ENTIRE body, not per chunk. A constantly
  // trickling reader cannot extend it. Keep the underlying read promise
  // handled even if reader.cancel() ignores cancellation.
  const readWholeBody = async () => {
    while (true) {
      assertBodyWithinDeadline();
      const { done, value } = await reader.read();
      if (bodyReadRetired) return;
      // A delayed timer callback must not let a late chunk or EOF win.
      assertBodyWithinDeadline();
      if (done) break;
      if (!(value instanceof Uint8Array) || value.byteLength === 0) {
        throw new Error('invalid Buy VOID response stream');
      }
      total += value.byteLength;
      if (total > MAX_BUY_JSON_BYTES) {
        throw new Error('Buy VOID response exceeds byte limit');
      }
      chunks.push(value);
    }
  };
  try {
    await Promise.race([
      readWholeBody(),
      new Promise((_, reject) => {
        bodyDeadlineTimer = setTimeout(() => {
          reject(new Error('Buy VOID response body deadline exceeded'));
        }, bodyDeadlineMs);
      }),
    ]);
    // Also reject a complete body whose queued success continuation ran
    // before a throttled timer callback after the monotonic deadline.
    assertBodyWithinDeadline();
  } catch (error) {
    bodyReadRetired = true;
    // A broken stream may return a never-settling cancellation promise.
    // Cancellation is best-effort; never suppress or delay the original
    // response failure (or the buyer's no-retry/uncertain-outcome fence).
    try {
      Promise.resolve(reader.cancel()).catch(() => undefined);
    } catch (cancelError) {
      void cancelError;
    }
    throw error;
  } finally {
    if (bodyDeadlineTimer !== null) clearTimeout(bodyDeadlineTimer);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let body;
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    body = JSON.parse(text);
  } catch {
    throw new Error('invalid Buy VOID JSON response');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('invalid Buy VOID response');
  }
  // Decoding and parsing do not extend authority to use an expired body.
  assertBodyWithinDeadline();
  return body;
};
const fetchJson = async (path) => {
  const response = await fetch(path, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    credentials: 'same-origin',
    redirect: 'error',
    signal: AbortSignal.timeout(7000),
  });
  if (!response.ok) throw new Error(`${path} HTTP ${response.status}`);
  return strictJson(response);
};
const canonicalFiniteNumber = (value, { min = null, max = null } = {}) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (min !== null && value < min) return null;
  if (max !== null && value > max) return null;
  return value;
};
const canonicalUsdcLimitAtoms = (value) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  const raw = String(value);
  if (!/^(0|[1-9]\d*)(?:\.\d{1,6})?$/.test(raw)) return null;
  return usdcAtoms(raw);
};
const validateSnapshot = (config, status, sale) => {
  if (config.marker !== BUY_MARKER || config.schema !== 'void_public_buy_void_config_v1') {
    throw new Error('checkout config identity mismatch');
  }
  if (String(config.receive_address || '').toLowerCase() !== CANONICAL_RECEIVER) {
    throw new Error('presale receiver mismatch');
  }
  if (String(config.usdc_contract || '').toLowerCase() !== CANONICAL_BASE_USDC.toLowerCase()) {
    throw new Error('Base USDC contract mismatch');
  }
  if (
    !Array.isArray(config.payment_chains) ||
    config.payment_chains.length !== 2 ||
    config.payment_chains[0] !== 'base' ||
    config.payment_chains[1] !== 'ethereum'
  ) {
    throw new Error('presale payment-rail policy mismatch');
  }
  if (
    config.payment_chain_id !== 8453 ||
    config.delivery_chain_id !== 2050 ||
    typeof config.ethereum_requests_enabled !== 'boolean'
  ) {
    throw new Error('presale chain/readiness identity mismatch');
  }
  if (
    config.price_usdc_per_void !== '0.50' ||
    config.rate_void_per_usdc !== '2'
  ) {
    throw new Error('presale price policy mismatch');
  }
  const minUsdcAtoms = canonicalUsdcLimitAtoms(config.min_usdc);
  const maxUsdcAtoms = canonicalUsdcLimitAtoms(config.max_usdc);
  if (
    minUsdcAtoms === null ||
    maxUsdcAtoms === null ||
    minUsdcAtoms <= 0n ||
    maxUsdcAtoms < minUsdcAtoms
  ) {
    throw new Error('presale request limit policy mismatch');
  }
  if (
    config.request_method !== 'POST' ||
    config.request_route !== BUY_REQUEST_ENDPOINT ||
    config.request_before_payment_required !== true ||
    config.payment_sender_must_equal_void_destination !== true ||
    config.do_not_send_from_exchange !== true
  ) {
    throw new Error('checkout safety contract mismatch');
  }
  if (status.schema !== 'void_public_buy_void_status_v1' || status.ok !== true) {
    throw new Error('Buy VOID status identity mismatch');
  }
  if (
    sale.schema !== 'void_buy_void_sale_state_v1' ||
    sale.ok !== true ||
    typeof sale.sold_out !== 'boolean'
  ) {
    throw new Error('Buy VOID sale-state identity mismatch');
  }
  const poolVoidTotal = canonicalFiniteNumber(sale.pool_void_total, { min: 0 });
  const remainingVoid = canonicalFiniteNumber(sale.remaining_void, { min: 0 });
  const raisedUsdc = canonicalFiniteNumber(sale.raised_usdc_so_far, { min: 0 });
  const progressPct = canonicalFiniteNumber(sale.progress_pct, { min: 0, max: 100 });
  if (
    poolVoidTotal === null ||
    remainingVoid === null ||
    raisedUsdc === null ||
    progressPct === null ||
    poolVoidTotal <= 0 ||
    remainingVoid > poolVoidTotal
  ) {
    throw new Error('invalid sale-state accounting');
  }
  return {
    config: {
      ...config,
      min_usdc_atoms: minUsdcAtoms,
      max_usdc_atoms: maxUsdcAtoms,
    },
    status,
    sale,
  };
};
const isOpen = (snapshot) =>
  snapshot.config.requests_enabled === true &&
  snapshot.config.payment_ready === true &&
  snapshot.config.receiver_binding_green === true &&
  snapshot.status.request_intake_ready === true &&
  snapshot.sale.sold_out === false &&
  snapshot.sale.remaining_void > 0;

const setFormEnabled = (enabled) => {
  all('[data-buy-chain], [data-buy-amount], [data-buy-destination], [data-buy-ack]').forEach((node) => {
    node.disabled = !enabled;
  });
  updateSubmit();
};
const acknowledgements = () => Object.fromEntries(
  all('[data-buy-ack]').map((node) => [node.dataset.buyAck, Boolean(node.checked)])
);
const usdcAtoms = (value) => {
  const raw = String(value ?? '').trim();
  const match = /^(0|[1-9]\d*)(?:\.(\d{1,6}))?$/.exec(raw);
  if (!match) return null;
  const fraction = String(match[2] || '').padEnd(6, '0');
  return BigInt(match[1]) * 1000000n + BigInt(fraction || '0');
};
const buyIntentKey = () => {
  const atoms = usdcAtoms(one('[data-buy-amount]')?.value);
  const destination = String(one('[data-buy-destination]')?.value || '').trim();
  const chain = selectedChain();
  if (atoms === null || atoms <= 0n || !ADDRESS_RE.test(destination) ||
      (chain !== 'base' && chain !== 'ethereum')) return null;
  return JSON.stringify([chain, atoms.toString(), destination.toLowerCase()]);
};
const validAmount = () => {
  const raw = String(one('[data-buy-amount]')?.value || '').trim();
  const atoms = usdcAtoms(raw);
  if (atoms === null || atoms <= 0n) return false;
  const cfg = currentSnapshot?.config;
  if (!cfg) return false;
  return (
    typeof cfg.min_usdc_atoms === 'bigint' &&
    typeof cfg.max_usdc_atoms === 'bigint' &&
    atoms >= cfg.min_usdc_atoms &&
    atoms <= cfg.max_usdc_atoms
  );
};
const validDestination = () => ADDRESS_RE.test(String(one('[data-buy-destination]')?.value || '').trim());
const markFieldTouched = (field) => {
  if (field === 'amount' || field === 'destination') touchedFields.add(field);
};
const setFieldError = (fieldSelector, errorSelector, message, touched) => {
  const field = one(fieldSelector);
  const error = one(errorSelector);
  if (field) {
    if (touched) field.setAttribute('aria-invalid', message ? 'true' : 'false');
    else field.removeAttribute('aria-invalid');
  }
  if (error) error.textContent = message;
};
const updateFieldErrors = () => {
  const amount = one('[data-buy-amount]');
  const destination = one('[data-buy-destination]');
  const cfg = currentSnapshot?.config;
  const amountRaw = String(amount?.value || '').trim();
  const destinationRaw = String(destination?.value || '').trim();
  const amountTouched = Boolean(amount && !amount.disabled && touchedFields.has('amount'));
  const destinationTouched = Boolean(destination && !destination.disabled && touchedFields.has('destination'));
  const amountMessage = amountTouched && !validAmount()
    ? (amountRaw && cfg
      ? `Enter ${format(cfg.min_usdc)}–${format(cfg.max_usdc)} USDC using at most 6 decimals.`
      : 'Enter a native USDC amount.')
    : '';
  const destinationMessage = destinationTouched && !validDestination()
    ? (destinationRaw
      ? 'Enter a complete 42-character 0x VOID address.'
      : 'Enter the native VOID destination address.')
    : '';
  setFieldError('[data-buy-amount]', '[data-buy-amount-error]', amountMessage, amountTouched);
  setFieldError('[data-buy-destination]', '[data-buy-destination-error]', destinationMessage, destinationTouched);
};
const selectedChain = () => String(one('[data-buy-chain]')?.value || '').trim().toLowerCase();
const selectedRail = () => {
  const chain = selectedChain();
  if (chain === 'ethereum' && currentSnapshot?.config.ethereum_requests_enabled !== true) return null;
  return BUY_RAILS[chain] || null;
};
function updateSubmit() {
  updateFieldErrors();
  const button = one('[data-buy-submit]');
  if (!button) return;
  const acks = acknowledgements();
  const allAcknowledged = [
    'self_custody',
    'native_usdc',
    'request_before_payment',
    'sender_equals_void_destination',
    'no_automatic_fulfillment',
  ].every((key) => acks[key] === true);
  const intentKey = buyIntentKey();
  button.disabled = readinessPending || submitBusy ||
    !currentSnapshot || !isOpen(currentSnapshot) ||
    !selectedRail() || !validAmount() || !validDestination() || !allAcknowledged ||
    (intentKey !== null && attemptedIntentKeys.has(intentKey)) ||
    attemptedIntentKeys.size >= MAX_BUY_ATTEMPTS_PER_VIEW;
  // An earlier attempt's receipt must not be shown as payment instructions
  // for a different amount, chain or destination.
  if (!submitBusy && currentSnapshot && isOpen(currentSnapshot) &&
      attemptedIntentKeys.size > 0) {
    // Global OPEN is insufficient for a receipt created on a separately
    // gated rail: Ethereum instructions remain hidden while that rail is HOLD.
    // Keep the attempted intent locked; restore the exact receipt only after
    // this same selected rail has independently returned to OPEN.
    const matchingRailOpen = selectedRail() !== null;
    const sameIntent = intentKey === attemptedIntentKey;
    // Uncertain outcomes have no actionable receipt serial and remain useful
    // warnings after refresh. Confirmed payment instructions must never be
    // resurrected after a newer readiness GET, even if it is also OPEN.
    const sameReadinessGeneration =
      attemptedResultReadinessSerial === null ||
      attemptedResultReadinessSerial === requestSerial;
    const instructionExpired = sameIntent &&
      attemptedResultExpiresAtMs !== null &&
      receiptExpiredOrUntrusted();
    setText('[data-buy-result]', instructionExpired
      ? 'REQUEST INSTRUCTIONS EXPIRED — DO NOT SEND FUNDS. Verify the original request with the operator before any further action.'
      : matchingRailOpen && sameIntent && sameReadinessGeneration &&
          attemptedResultText
        ? attemptedResultText
        : 'PRIOR REQUEST MAY EXIST — DO NOT SEND FUNDS. Reverify prior requests with the operator before another attempt.');
  }
}
const renderSnapshot = (snapshot) => {
  const { config, status, sale } = snapshot;
  const open = isOpen(snapshot);
  const soldOut = sale.sold_out === true || sale.remaining_void <= 0;
  setText('[data-buy-price]', `$${Number(config.price_usdc_per_void).toFixed(2)} / VOID`);
  setText('[data-buy-pool-total]', `${format(sale.pool_void_total)} VOID`);
  setText('[data-buy-pool-remaining]', `${format(sale.remaining_void)} VOID`);
  setText('[data-buy-raised]', `$${format(sale.raised_usdc_so_far, 2)} USDC`);
  setText('[data-buy-progress]', `${format(sale.progress_pct, 2)}% of verified allocation reserved`);
  setText('[data-buy-base-usdc-contract]', CANONICAL_BASE_USDC);
  setText('[data-buy-ethereum-usdc-contract]', CANONICAL_ETHEREUM_USDC);
  setText('[data-buy-receiver]', config.receive_address);
  setText('[data-buy-limits]', `${format(config.min_usdc)}–${format(config.max_usdc)} USDC · up to 6 decimals`);
  setText('[data-buy-fulfillment]', config.automatic_fulfillment === true ? 'AUTOMATIC' : 'GUARDED');

  if (soldOut) {
    // Do not show payment instructions while closed; keep the last result
    // for a later OPEN refresh of this exact Buy view.
    setChip('[data-buy-state-chip]', 'warning', 'SOLD OUT');
    setChip('[data-buy-form-chip]', 'warning', 'CLOSED');
    setText('[data-buy-intake]', 'SOLD OUT');
    setText('[data-buy-message]', 'The verified presale allocation is exhausted. No new request is accepted.');
    setText('[data-buy-result]', 'SOLD OUT — do not send funds.');
    setFormEnabled(false);
    return;
  }
  if (!open) {
    // Never erase a potentially committed POST outcome merely because
    // authoritative live readiness has temporarily moved to HOLD.
    setChip('[data-buy-state-chip]', 'warning', 'HOLD — NOT OPEN');
    setChip('[data-buy-form-chip]', 'warning', 'HOLD');
    setText('[data-buy-intake]', 'HOLD');
    setText('[data-buy-message]', 'Presale request intake is not activated. The receiver and policy are visible for verification, but no payment should be sent.');
    setText('[data-buy-result]', 'HOLD — presale intake is not active. Do not send funds.');
    setFormEnabled(false);
    return;
  }

  setChip('[data-buy-state-chip]', 'positive', 'OPEN — REQUEST FIRST');
  setChip('[data-buy-form-chip]', 'positive', 'OPEN');
  setText('[data-buy-intake]', 'OPEN');
  setText('[data-buy-message]', config.ethereum_requests_enabled === true
    ? 'Base and Ethereum request intake are OPEN. Create one request first, then use only its exact returned rail and payment instructions.'
    : 'Base request intake is OPEN. Ethereum native USDC is policy-approved but remains HOLD until separately activated.');
  // A different POST may now be pending. Never resurrect a prior receipt
  // while awaiting the newer attempt, even during a readiness refresh.
  // Global OPEN is not authority to display an in-flight request as
  // actionable while its selected rail has independently switched to HOLD.
  setText('[data-buy-result]', !selectedRail()
    ? 'HOLD — selected payment rail is not active. Do not send funds.'
    : submitBusy
      ? 'Creating guarded request… no funds are being sent.'
      : 'Ready to create a request. No funds are sent by this page.');
  // When not busy, updateSubmit restores only the *matching* last attempt
  // or the conservative prior-request warning. It never enables a retry.
  setFormEnabled(true);
};
const renderError = (error) => {
  currentSnapshot = null;
  setChip('[data-buy-state-chip]', 'warning', 'HOLD — LIVE STATE UNAVAILABLE');
  setChip('[data-buy-form-chip]', 'warning', 'HOLD');
  setText('[data-buy-intake]', 'HOLD');
  setText('[data-buy-message]', 'Live presale state could not be verified. The page fails closed.');
  setText('[data-buy-result]', `HOLD — do not send funds. ${String(error?.message || error)}`);
  setText('[data-buy-receiver]', 'Unavailable');
  setFormEnabled(false);
};
async function loadBuy() {
  const buyView = one('[data-buy-view]');
  if (currentRoute() !== 'buy' || !buyView) return;
  beginBuyViewInstance(buyView);
  const loadingViewGeneration = buyViewGeneration;
  const serial = ++requestSerial;
  // A late readiness GET is owned by the exact Buy DOM generation that
  // started it. Serial-only checks do not catch replacement of the view
  // before its successor requests fresh readiness.
  const stillOwnsLoadingView = () =>
    serial === requestSerial &&
    loadingViewGeneration === buyViewGeneration &&
    activeBuyView === buyView &&
    currentRoute() === 'buy' &&
    one('[data-buy-view]') === buyView;
  readinessPending = true;
  currentSnapshot = null;
  setChip('[data-buy-state-chip]', 'info', 'Checking presale');
  setText('[data-buy-result]', 'Checking live presale readiness. Do not send funds.');
  setFormEnabled(false);
  try {
    const [config, status, sale] = await Promise.all([
      fetchJson(BUY_CONFIG_ENDPOINT),
      fetchJson(BUY_STATUS_ENDPOINT),
      fetchJson(BUY_SALE_ENDPOINT),
    ]);
    if (!stillOwnsLoadingView()) return;
    currentSnapshot = validateSnapshot(config, status, sale);
    readinessPending = false;
    renderSnapshot(currentSnapshot);
  } catch (error) {
    if (!stillOwnsLoadingView()) return;
    readinessPending = false;
    renderError(error);
  }
}
async function submitBuy(event) {
  event.preventDefault();
  markFieldTouched('amount');
  markFieldTouched('destination');
  if (
    readinessPending ||
    submitBusy ||
    !currentSnapshot ||
    !isOpen(currentSnapshot)
  ) return;
  updateSubmit();
  const button = one('[data-buy-submit]');
  if (!button || button.disabled) return;

  // A POST may finish after this Buy DOM instance is replaced. Only its
  // original view generation can receive a checkout receipt or error copy.
  // The document-lifetime attemptedIntentKeys fence survives either way.
  const submittingBuyView = activeBuyView;
  const submittingBuyGeneration = buyViewGeneration;
  const stillOwnsSubmittingView = () =>
    submittingBuyView !== null &&
    submittingBuyGeneration === buyViewGeneration &&
    activeBuyView === submittingBuyView &&
    currentRoute() === 'buy' &&
    one('[data-buy-view]') === submittingBuyView;

  const amount = String(one('[data-buy-amount]').value || '').trim();
  const destination = String(one('[data-buy-destination]').value || '').trim();
  const chain = selectedChain();
  const rail = selectedRail();
  if (!rail) return;
  // Keep the qualified price and pool snapshot from this original POST.
  // An asynchronous readiness refresh must not silently rebind its quote.
  const checkoutPolicyAtSubmit = currentSnapshot;
  const readinessSerialAtSubmit = requestSerial;
  const acks = acknowledgements();
  const intentKey = buyIntentKey();
  if (intentKey === null || attemptedIntentKeys.has(intentKey) ||
      attemptedIntentKeys.size >= MAX_BUY_ATTEMPTS_PER_VIEW) return;
  const requestStartedMonoMs = receiptMonotonicNow();
  if (requestStartedMonoMs === null) {
    setText('[data-buy-result]', 'HOLD — browser monotonic timing unavailable. Do not send funds.');
    return;
  }
  const payload = {
    requested_amount_usdc: amount,
    void_destination_address: destination,
    source_chain: chain,
    ack_self_custody: acks.self_custody,
    ack_native_usdc: acks.native_usdc,
    ack_request_before_payment: acks.request_before_payment,
    ack_sender_equals_void_destination: acks.sender_equals_void_destination,
    ack_no_automatic_fulfillment: acks.no_automatic_fulfillment,
  };

  // Treat any started POST as potentially committed, even on timeout or a
  // malformed/untrusted response. Only the server can establish its outcome.
  attemptedIntentKeys.add(intentKey);
  attemptedIntentKey = intentKey;
  attemptedResultText = null;
  attemptedResultReadinessSerial = null;
  attemptedResultExpiresAtMs = null;
  attemptedResultMonoDeadlineMs = null;
  attemptedResultAcceptedMonoMs = null;
  attemptedResultAcceptedWallMs = null;
  attemptedResultExpired = false;
  clearReceiptExpiryTimer();
  submitBusy = true;
  updateSubmit();
  setText('[data-buy-result]', 'Creating guarded request… no funds are being sent.');
  try {
    const response = await fetch(BUY_REQUEST_ENDPOINT, {
      method: 'POST',
      headers: { Accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
      credentials: 'same-origin',
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
    });
    const body = await strictJson(response);
    if (!stillOwnsSubmittingView()) return;
    if (
      !response.ok ||
      response.status !== 201 ||
      body.ok !== true ||
      body.idempotent !== false ||
      body.schema !== 'void_public_buy_void_checkout_request_result_v1' ||
      body.marker !== BUY_MARKER ||
      body.one_active_request_cap_enforced !== true
    ) {
      throw new Error(body.error || (Array.isArray(body.errors) ? body.errors.join(', ') : `HTTP ${response.status}`));
    }
    const request = body.request;
    if (!request || typeof request !== 'object' || Array.isArray(request)) {
      throw new Error('returned request shape mismatch');
    }
    // A new public checkout result is not authorization to reuse another
    // buyer's request or to treat an already-submitted payment as new intake.
    if (
      request.schema !== 'void_public_buy_void_checkout_request_v1' ||
      request.marker !== BUY_MARKER ||
      request.ok !== true ||
      !request.persisted ||
      typeof request.persisted !== 'object' ||
      Array.isArray(request.persisted) ||
      !Object.hasOwn(request.persisted, 'ok') ||
      Object.keys(request.persisted).length !== 1 ||
      request.persisted.ok !== true ||
      typeof request.request_id !== 'string' ||
      !/^[A-Za-z0-9_-]{1,128}$/.test(request.request_id) ||
      request.status !== 'awaiting_payment_tx_hash' ||
      request.tx_hash !== '' ||
      request.delivery_chain !== 'void' ||
      request.delivery_chain_id !== 2050 ||
      request.asset_in !== 'USDC' ||
      request.usdc_decimals !== 6 ||
      request.request_contract?.request_before_payment_required !== true ||
      request.request_contract?.one_active_request_per_void_destination !== true ||
      request.request_contract?.payment_sender_must_equal_void_destination !== true ||
      request.request_contract?.payment_tx_hash_bound_after_request_by_operator !== true ||
      !String(request.request_id || '').trim() ||
      String(request.receive_address || '').toLowerCase() !== CANONICAL_RECEIVER ||
      String(request.void_destination_address || '').toLowerCase() !== destination.toLowerCase() ||
      String(request.source_chain || '').toLowerCase() !== chain ||
      String(request.payment_chain || '').toLowerCase() !== chain ||
      request.payment_chain_id !== rail.chainId ||
      String(request.usdc_contract || '').toLowerCase() !== rail.contract.toLowerCase()
    ) {
      throw new Error('returned request identity mismatch');
    }
    const returnedAmount = String(
      request.requested_amount_usdc ?? request.usdc_amount ?? ''
    ).trim();
    const submittedAtoms = usdcAtoms(amount);
    const returnedAtoms = usdcAtoms(returnedAmount);
    if (
      submittedAtoms === null ||
      returnedAtoms === null ||
      returnedAtoms !== submittedAtoms
    ) {
      throw new Error('returned request amount mismatch');
    }
    // A correctly addressed USDC instruction is not a verified VOID quote.
    // Bind the original server-side amount fields and the exact micro-VOID
    // obligation to the approved 2 VOID / USDC policy before payment copy.
    const originalUsdcAtoms = typeof request.usdc_amount === 'number'
      ? canonicalUsdcLimitAtoms(request.usdc_amount) : null;
    const quotedVoidAtoms = typeof request.quoted_void === 'number'
      ? canonicalUsdcLimitAtoms(request.quoted_void) : null;
    if (
      typeof request.requested_amount_usdc !== 'number' ||
      canonicalUsdcLimitAtoms(request.requested_amount_usdc) !== submittedAtoms ||
      originalUsdcAtoms !== submittedAtoms ||
      request.rate_void_per_usdc !== checkoutPolicyAtSubmit?.config.rate_void_per_usdc ||
      request.price_usdc_per_void !== checkoutPolicyAtSubmit?.config.price_usdc_per_void ||
      request.pool_void_total !== checkoutPolicyAtSubmit?.sale.pool_void_total ||
      quotedVoidAtoms !== submittedAtoms * 2n
    ) {
      throw new Error('returned request VOID quote mismatch');
    }
    // Bind the actionable instructions themselves, not merely the
    // top-level request summary. Amounts are compared as native USDC atoms.
    const instructedAmount = request.payment_instructions?.amount;
    const instructedAtoms =
      typeof instructedAmount === 'string' || typeof instructedAmount === 'number'
        ? usdcAtoms(String(instructedAmount))
        : null;
    const instructionExpiresAtMs = request.payment_instructions?.expires_at_ms;
    const createdAtMs = request.created_at_ms;
    const receiptMonoMs = receiptMonotonicNow();
    const receiptWallMs = Date.now();
    const postElapsedMs = receiptMonoMs === null
      ? NaN : receiptMonoMs - requestStartedMonoMs;
    // Source-bound server creation time plus the full in-flight POST duration
    // constrains wall-clock skew. An oversized/uncertain response is a HOLD.
    const receiptClockQualified =
      Number.isSafeInteger(createdAtMs) &&
      Number.isSafeInteger(receiptWallMs) &&
      receiptMonoMs !== null &&
      Number.isFinite(postElapsedMs) &&
      postElapsedMs >= 0 &&
      postElapsedMs <= BUY_RECEIPT_MAX_POST_DURATION_MS &&
      createdAtMs <= receiptWallMs + BUY_RECEIPT_MAX_CLOCK_SKEW_MS &&
      receiptWallMs <= createdAtMs + postElapsedMs + BUY_RECEIPT_MAX_CLOCK_SKEW_MS;
    // The server's live activation policy caps this lease at five minutes.
    // Equal matching expiry fields alone cannot authenticate a long-lived
    // payment instruction that canonical launch authority cannot issue.
    const serverLeaseDurationMs = instructionExpiresAtMs - createdAtMs;
    const conservativeRemainingMs = serverLeaseDurationMs -
      postElapsedMs - BUY_RECEIPT_MAX_CLOCK_SKEW_MS;
    if (
      !receiptClockQualified ||
      !Number.isSafeInteger(instructionExpiresAtMs) ||
      !Number.isSafeInteger(serverLeaseDurationMs) ||
      serverLeaseDurationMs <= 0 ||
      serverLeaseDurationMs > BUY_RECEIPT_MAX_LIVE_LEASE_MS ||
      !Number.isFinite(conservativeRemainingMs) ||
      conservativeRemainingMs <= 0 ||
      !Number.isSafeInteger(request.launch_authority?.expires_at_ms) ||
      instructionExpiresAtMs !== request.launch_authority.expires_at_ms ||
      instructedAtoms === null ||
      instructedAtoms !== submittedAtoms ||
      request.payment_instructions?.request_id !== request.request_id ||
      request.payment_instructions?.send_asset !== 'USDC' ||
      request.payment_instructions?.do_not_send_before_request !== true ||
      request.payment_instructions?.keep_transaction_hash !== true ||
      request.safety?.automatic_fulfillment !== false ||
      request.safety?.manual_review_required !== true ||
      request.payment_instructions?.do_not_send_from_exchange_or_pooled_custody !== true ||
      String(request.payment_instructions?.send_chain || '').toLowerCase() !== chain ||
      request.payment_instructions?.send_chain_id !== rail.chainId ||
      String(request.payment_instructions?.token_contract || '').toLowerCase() !== rail.contract.toLowerCase() ||
      request.payment_instructions?.token_decimals !== 6 ||
      String(request.payment_instructions?.send_to || '').toLowerCase() !== CANONICAL_RECEIVER ||
      String(request.payment_instructions?.send_from || '').toLowerCase() !== destination.toLowerCase()
    ) {
      throw new Error('returned request safety binding mismatch');
    }
    attemptedResultExpiresAtMs = instructionExpiresAtMs;
    attemptedResultMonoDeadlineMs = receiptMonoMs + conservativeRemainingMs;
    attemptedResultAcceptedMonoMs = receiptMonoMs;
    attemptedResultAcceptedWallMs = receiptWallMs;
    attemptedResultExpired = false;
    attemptedResultReadinessSerial = readinessSerialAtSubmit;
    attemptedResultText = [
      'REQUEST CREATED — VERIFY BEFORE PAYMENT',
      `Request ID: ${request.request_id}`,
      `Send exactly: ${returnedAmount} USDC`,
      `Network: ${rail.label} (${rail.chainId})`,
      `USDC contract: ${rail.contract}`,
      `Approved receiver: ${request.receive_address}`,
      `Send from / VOID destination: ${destination}`,
      '',
      'SELF-CUSTODY ONLY. VOID is not listed on any exchange.',
      'Do not send from an exchange or custodial wallet.',
      'VOID cannot recover exchange/custodial sends. Treat them as lost.',
      '',
      `Keep the ${rail.label} transaction hash. Payment observation is not itself a fulfillment receipt.`,
    ].join('\n');
    armReceiptExpiryTimer(attemptedResultMonoDeadlineMs);
    // A POST can resolve after live readiness switched to HOLD, SOLD OUT,
    // or became unavailable. Preserve the outcome in memory only; the
    // finally/updateSubmit path renders it solely on verified OPEN and
    // only for the matching canonical intent.
  } catch (error) {
    if (!stillOwnsSubmittingView()) return;
    attemptedResultText = [
      'REQUEST OUTCOME UNCONFIRMED — DO NOT SEND FUNDS OR RESUBMIT',
      'A request may have been recorded even though this page did not receive a valid confirmation.',
      'Verify the original request with the operator before starting another request.',
      String(error?.message || error),
    ].join('\n');
    // A POST can resolve after live readiness switched to HOLD, SOLD OUT,
    // or became unavailable. Preserve the outcome in memory only; the
    // finally/updateSubmit path renders it solely on verified OPEN and
    // only for the matching canonical intent.
  } finally {
    submitBusy = false;
    updateSubmit();
  }
}
// Background-tab timers can be suspended. On return, synchronously recheck
// the existing receipt's monotonic deadline and wall-clock skew BEFORE the
// buyer can rely on payment text. This neither fetches fresh authority nor
// creates or retries a request.
const recheckBuyInstructionLeaseOnResume = () => {
  if (currentRoute() === 'buy' && one('[data-buy-view]')) updateSubmit();
};
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') recheckBuyInstructionLeaseOnResume();
});
window.addEventListener('pageshow', recheckBuyInstructionLeaseOnResume);
window.addEventListener('focus', recheckBuyInstructionLeaseOnResume);

document.addEventListener('submit', (event) => {
  if (event.target?.matches?.('[data-buy-request-form]')) submitBuy(event);
});
document.addEventListener('input', (event) => {
  if (event.target?.matches?.('[data-buy-amount]')) markFieldTouched('amount');
  if (event.target?.matches?.('[data-buy-destination]')) markFieldTouched('destination');
  if (event.target?.matches?.('[data-buy-chain], [data-buy-amount], [data-buy-destination], [data-buy-ack]')) updateSubmit();
});
document.addEventListener('change', (event) => {
  if (event.target?.matches?.('[data-buy-chain], [data-buy-ack]')) updateSubmit();
});
document.addEventListener('click', (event) => {
  if (event.target.closest('[data-buy-refresh]')) loadBuy();
});
const viewRoot = document.getElementById('view-root');
if (viewRoot) {
  const observer = new MutationObserver(() => {
    if (currentRoute() === 'buy' && viewRoot.querySelector('[data-buy-view]')) queueMicrotask(loadBuy);
  });
  observer.observe(viewRoot, { childList: true });
}
window.addEventListener('hashchange', () => {
  if (currentRoute() === 'buy') setTimeout(loadBuy, 0);
});
setTimeout(loadBuy, 0);
