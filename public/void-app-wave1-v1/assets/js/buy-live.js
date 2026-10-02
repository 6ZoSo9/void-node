const BUY_CONFIG_ENDPOINT = '/__void/buy-void/config.json';
const BUY_STATUS_ENDPOINT = '/__void/buy-void/status.json';
const BUY_SALE_ENDPOINT = '/__void/buy-void/sale-state.json';
const BUY_REQUEST_ENDPOINT = '/__void/buy-void/request';
const BUY_MARKER = 'VOID_BUY_VOID_PUBLIC_CHECKOUT_CONTRACT_V1';
const CANONICAL_RECEIVER = '0x17a26d4f0c51bd28fbcf5cdd4d20853bfa112ae5';
const CANONICAL_BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
let requestSerial = 0;
let currentSnapshot = null;
let submitBusy = false;

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
const strictJson = async (response) => {
  const type = String(response.headers.get('content-type') || '').toLowerCase();
  if (!type.includes('application/json')) throw new Error('non-JSON Buy VOID response');
  const body = await response.json();
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('invalid Buy VOID response');
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
  if (config.payment_chain_id !== 8453 || config.delivery_chain_id !== 2050) {
    throw new Error('presale chain identity mismatch');
  }
  if (Number(config.price_usdc_per_void) !== 0.5 || Number(config.rate_void_per_usdc) !== 2) {
    throw new Error('presale price policy mismatch');
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
  if (sale.schema !== 'void_buy_void_sale_state_v1' || sale.ok !== true) {
    throw new Error('Buy VOID sale-state identity mismatch');
  }
  for (const key of ['pool_void_total', 'remaining_void', 'raised_usdc_so_far', 'progress_pct']) {
    if (!Number.isFinite(Number(sale[key])) || Number(sale[key]) < 0) {
      throw new Error(`invalid sale-state field: ${key}`);
    }
  }
  return { config, status, sale };
};
const isOpen = (snapshot) =>
  snapshot.config.requests_enabled === true &&
  snapshot.config.payment_ready === true &&
  snapshot.config.receiver_binding_green === true &&
  snapshot.status.request_intake_ready === true &&
  snapshot.sale.sold_out !== true;

const setFormEnabled = (enabled) => {
  all('[data-buy-amount], [data-buy-destination], [data-buy-ack]').forEach((node) => {
    node.disabled = !enabled;
  });
  updateSubmit();
};
const acknowledgements = () => Object.fromEntries(
  all('[data-buy-ack]').map((node) => [node.dataset.buyAck, Boolean(node.checked)])
);
const validAmount = () => {
  const raw = String(one('[data-buy-amount]')?.value || '').trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/.test(raw)) return false;
  const value = Number(raw);
  const cfg = currentSnapshot?.config;
  return Number.isFinite(value) && value > 0 &&
    (!cfg || (value >= Number(cfg.min_usdc) && value <= Number(cfg.max_usdc)));
};
const validDestination = () => ADDRESS_RE.test(String(one('[data-buy-destination]')?.value || '').trim());
function updateSubmit() {
  const button = one('[data-buy-submit]');
  if (!button) return;
  const acks = acknowledgements();
  const allAcknowledged = [
    'self_custody',
    'base_native_usdc',
    'request_before_payment',
    'sender_equals_void_destination',
    'no_automatic_fulfillment',
  ].every((key) => acks[key] === true);
  button.disabled = submitBusy || !currentSnapshot || !isOpen(currentSnapshot) ||
    !validAmount() || !validDestination() || !allAcknowledged;
}
const renderSnapshot = (snapshot) => {
  const { config, status, sale } = snapshot;
  const open = isOpen(snapshot);
  const soldOut = sale.sold_out === true;
  setText('[data-buy-price]', `$${Number(config.price_usdc_per_void).toFixed(2)} / VOID`);
  setText('[data-buy-pool-total]', `${format(sale.pool_void_total)} VOID`);
  setText('[data-buy-pool-remaining]', `${format(sale.remaining_void)} VOID`);
  setText('[data-buy-raised]', `$${format(sale.raised_usdc_so_far, 2)} USDC`);
  setText('[data-buy-progress]', `${format(sale.progress_pct, 2)}% of verified allocation reserved`);
  setText('[data-buy-usdc-contract]', config.usdc_contract);
  setText('[data-buy-receiver]', config.receive_address);
  setText('[data-buy-limits]', `${format(config.min_usdc)}–${format(config.max_usdc)} USDC · up to 6 decimals`);
  setText('[data-buy-fulfillment]', config.automatic_fulfillment === true ? 'AUTOMATIC' : 'GUARDED');

  if (soldOut) {
    setChip('[data-buy-state-chip]', 'warning', 'SOLD OUT');
    setChip('[data-buy-form-chip]', 'warning', 'CLOSED');
    setText('[data-buy-intake]', 'SOLD OUT');
    setText('[data-buy-message]', 'The verified presale allocation is exhausted. No new request is accepted.');
    setText('[data-buy-result]', 'SOLD OUT — do not send funds.');
    setFormEnabled(false);
    return;
  }
  if (!open) {
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
  setText('[data-buy-message]', 'Live readiness is OPEN. Create one request first, verify the returned payment instructions, then send only from the same self-custody address used as the VOID destination.');
  setText('[data-buy-result]', 'Ready to create a request. No funds are sent by this page.');
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
  if (currentRoute() !== 'buy' || !one('[data-buy-view]')) return;
  const serial = ++requestSerial;
  setChip('[data-buy-state-chip]', 'info', 'Checking presale');
  setText('[data-buy-result]', 'Checking live presale readiness. Do not send funds.');
  setFormEnabled(false);
  try {
    const [config, status, sale] = await Promise.all([
      fetchJson(BUY_CONFIG_ENDPOINT),
      fetchJson(BUY_STATUS_ENDPOINT),
      fetchJson(BUY_SALE_ENDPOINT),
    ]);
    if (serial !== requestSerial) return;
    currentSnapshot = validateSnapshot(config, status, sale);
    renderSnapshot(currentSnapshot);
  } catch (error) {
    if (serial !== requestSerial) return;
    renderError(error);
  }
}
async function submitBuy(event) {
  event.preventDefault();
  if (submitBusy || !currentSnapshot || !isOpen(currentSnapshot)) return;
  updateSubmit();
  const button = one('[data-buy-submit]');
  if (!button || button.disabled) return;

  const amount = String(one('[data-buy-amount]').value || '').trim();
  const destination = String(one('[data-buy-destination]').value || '').trim();
  const acks = acknowledgements();
  const payload = {
    requested_amount_usdc: amount,
    void_destination_address: destination,
    source_chain: 'base',
    ack_self_custody: acks.self_custody,
    ack_base_native_usdc: acks.base_native_usdc,
    ack_request_before_payment: acks.request_before_payment,
    ack_sender_equals_void_destination: acks.sender_equals_void_destination,
    ack_no_automatic_fulfillment: acks.no_automatic_fulfillment,
  };

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
    if (!response.ok || body.ok !== true) {
      throw new Error(body.error || (Array.isArray(body.errors) ? body.errors.join(', ') : `HTTP ${response.status}`));
    }
    const request = body.request;
    if (!request || String(request.receive_address || '').toLowerCase() !== CANONICAL_RECEIVER) {
      throw new Error('returned request receiver mismatch');
    }
    if (
      request.payment_instructions?.do_not_send_from_exchange_or_pooled_custody !== true ||
      String(request.payment_instructions?.send_from || '').toLowerCase() !== destination.toLowerCase()
    ) {
      throw new Error('returned request safety binding mismatch');
    }
    setText('[data-buy-result]', [
      'REQUEST CREATED — VERIFY BEFORE PAYMENT',
      `Request ID: ${request.request_id}`,
      `Send exactly: ${request.requested_amount_usdc} USDC`,
      'Network: Base Mainnet (8453)',
      `USDC contract: ${CANONICAL_BASE_USDC}`,
      `Approved receiver: ${request.receive_address}`,
      `Send from / VOID destination: ${destination}`,
      '',
      'SELF-CUSTODY ONLY. VOID is not listed on any exchange.',
      'Do not send from an exchange or custodial wallet.',
      'VOID cannot recover exchange/custodial sends. Treat them as lost.',
      '',
      'Keep the Base transaction hash. Payment observation is not itself a fulfillment receipt.',
    ].join('\n'));
  } catch (error) {
    setText('[data-buy-result]', `REQUEST NOT CREATED — DO NOT SEND FUNDS\n${String(error?.message || error)}`);
  } finally {
    submitBusy = false;
    updateSubmit();
  }
}
document.addEventListener('submit', (event) => {
  if (event.target?.matches?.('[data-buy-request-form]')) submitBuy(event);
});
document.addEventListener('input', (event) => {
  if (event.target?.matches?.('[data-buy-amount], [data-buy-destination], [data-buy-ack]')) updateSubmit();
});
document.addEventListener('change', (event) => {
  if (event.target?.matches?.('[data-buy-ack]')) updateSubmit();
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
