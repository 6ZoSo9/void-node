import {
  createNetworkRequestOwnerV1,
  readBoundedNetworkJsonV1,
} from './network-live.js';

const ACCOUNT_STORAGE_KEY = 'void.ui.wave3.wallet.account.v1';
const ACCOUNT_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
const WALLET_MARKER = 'VOID_UI_WAVE3_WALLET_READONLY_V1';
const WALLET_ENDPOINT = '/__void/ui/wave3/wallet.json';
const WALLET_REQUEST_TIMEOUT_MS = 5000;
const walletRequestOwner = createNetworkRequestOwnerV1();

let requestSerial = 0;
let walletViewPresent = false;

const plainRecord = (value) => (
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.getPrototypeOf(value) === Object.prototype
);

const exactKeys = (value, expected, label) => {
  if (!plainRecord(value)) throw new Error(`${label} must be an object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index])
  ) {
    throw new Error(`${label} shape mismatch`);
  }
};

const nonNegativeFinite = (value, label) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a nonnegative finite number`);
  }
  return value;
};

const nonNegativeSafeInteger = (value, label) => {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    throw new Error(`${label} must be a nonnegative safe integer`);
  }
  return value;
};

const currentRoute = () => {
  if (typeof window === 'undefined') return '';
  return String(window.location.hash || '')
    .replace(/^#\/?/, '')
    .split(/[/?]/, 1)[0] || 'home';
};

const validateSource = (source, route, label) => {
  exactKeys(source, ['route', 'ok', 'status'], label);
  if (source.route !== route) throw new Error(`${label} route mismatch`);
  if (typeof source.ok !== 'boolean') throw new Error(`${label}.ok must be boolean`);
  if (
    typeof source.status !== 'number' ||
    !Number.isSafeInteger(source.status) ||
    source.status < 0 ||
    source.status > 599
  ) {
    throw new Error(`${label}.status must be an integer HTTP status or zero`);
  }
};

const validateAccounting = (value, label, extraKeys = []) => {
  exactKeys(
    value,
    [
      'available',
      'balance',
      'display',
      'entries',
      'label',
      ...extraKeys,
    ],
    label,
  );
  if (typeof value.available !== 'boolean') {
    throw new Error(`${label}.available must be boolean`);
  }
  if (typeof value.display !== 'string' || typeof value.label !== 'string') {
    throw new Error(`${label} display metadata invalid`);
  }
  if (value.available) {
    nonNegativeFinite(value.balance, `${label}.balance`);
    nonNegativeSafeInteger(value.entries, `${label}.entries`);
  } else if (value.balance !== null || value.entries !== null) {
    throw new Error(`${label} unavailable evidence must remain null`);
  }
};

export const validateWalletSnapshotV1 = (snapshot, expectedAccount) => {
  exactKeys(
    snapshot,
    [
      'ok',
      'marker',
      'generated_at',
      'read_only',
      'network_name',
      'source_base',
      'node',
      'account',
      'wallet',
      'balances',
      'sources',
      'boundaries',
    ],
    'wallet snapshot',
  );
  if (snapshot.ok !== true || snapshot.marker !== WALLET_MARKER) {
    throw new Error('Unexpected Wallet adapter response');
  }
  if (snapshot.read_only !== true || snapshot.network_name !== 'Mainnet-0') {
    throw new Error('Wallet read-only/network contract mismatch');
  }
  if (
    typeof snapshot.generated_at !== 'string' ||
    !/^http:\/\/127\.0\.0\.1:[0-9]+$/.test(snapshot.source_base)
  ) {
    throw new Error('Wallet source identity mismatch');
  }

  exactKeys(snapshot.node, ['hostname', 'label', 'role'], 'wallet snapshot.node');
  if (
    typeof snapshot.node.hostname !== 'string' ||
    typeof snapshot.node.label !== 'string' ||
    !['precision', 'nimo', 'alienware', 'local'].includes(snapshot.node.role)
  ) {
    throw new Error('Wallet node identity invalid');
  }

  exactKeys(snapshot.account, ['selected', 'id', 'label'], 'wallet snapshot.account');
  if (
    snapshot.account.selected !== true ||
    snapshot.account.id !== expectedAccount ||
    snapshot.account.label !== expectedAccount ||
    !ACCOUNT_PATTERN.test(snapshot.account.id)
  ) {
    throw new Error('Wallet response account does not match request');
  }

  exactKeys(
    snapshot.wallet,
    [
      'source_available',
      'has_wallet',
      'address',
      'unlocked',
      'native_gas_available',
      'native_gas_display',
      'source',
    ],
    'wallet snapshot.wallet',
  );
  for (const key of ['source_available', 'has_wallet', 'unlocked', 'native_gas_available']) {
    if (typeof snapshot.wallet[key] !== 'boolean') {
      throw new Error(`wallet.${key} must be boolean`);
    }
  }
  if (snapshot.wallet.source !== 'participant_wallet_native_v1') {
    throw new Error('wallet source marker mismatch');
  }
  if (typeof snapshot.wallet.address !== 'string' || typeof snapshot.wallet.native_gas_display !== 'string') {
    throw new Error('wallet display fields invalid');
  }
  if (snapshot.wallet.has_wallet) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(snapshot.wallet.address)) {
      throw new Error('wallet address invalid');
    }
  } else if (snapshot.wallet.address !== '' || snapshot.wallet.unlocked !== false) {
    throw new Error('wallet absent state is contradictory');
  }
  if (snapshot.wallet.unlocked && !snapshot.wallet.has_wallet) {
    throw new Error('wallet unlocked without wallet');
  }

  exactKeys(snapshot.balances, ['void', 'ledger_wc', 'production_wc'], 'wallet snapshot.balances');
  exactKeys(
    snapshot.balances.void,
    ['available', 'display', 'reason'],
    'wallet snapshot.balances.void',
  );
  if (
    snapshot.balances.void.available !== false ||
    typeof snapshot.balances.void.display !== 'string' ||
    typeof snapshot.balances.void.reason !== 'string'
  ) {
    throw new Error('VOID balance boundary mismatch');
  }

  validateAccounting(
    snapshot.balances.ledger_wc,
    'wallet snapshot.balances.ledger_wc',
    ['spendable_claimed'],
  );
  if (snapshot.balances.ledger_wc.spendable_claimed !== false) {
    throw new Error('ledger WC spendability elevated');
  }

  validateAccounting(
    snapshot.balances.production_wc,
    'wallet snapshot.balances.production_wc',
    [
      'ledger_version',
      'spendable',
      'redeemable',
      'transferable',
      'included_in_legacy_balance',
    ],
  );
  if (
    typeof snapshot.balances.production_wc.ledger_version !== 'string' ||
    snapshot.balances.production_wc.spendable !== false ||
    snapshot.balances.production_wc.redeemable !== false ||
    snapshot.balances.production_wc.transferable !== false ||
    snapshot.balances.production_wc.included_in_legacy_balance !== false
  ) {
    throw new Error('production WC authority mismatch');
  }

  exactKeys(snapshot.sources, ['wallet_status', 'ledger_wc', 'production_wc'], 'wallet snapshot.sources');
  validateSource(
    snapshot.sources.wallet_status,
    '/__void/participant/wallet/status',
    'wallet snapshot.sources.wallet_status',
  );
  validateSource(
    snapshot.sources.ledger_wc,
    '/wc/balance',
    'wallet snapshot.sources.ledger_wc',
  );
  validateSource(
    snapshot.sources.production_wc,
    '/wc/production/balance',
    'wallet snapshot.sources.production_wc',
  );

  const boundaryKeys = [
    'browser_wallet_connection',
    'wallet_create',
    'wallet_import',
    'wallet_unlock',
    'wallet_export',
    'wallet_send',
    'wc_to_void',
    'ledger_write',
    'validator_mutation',
    'operator_mutation',
    'money_movement',
  ];
  exactKeys(snapshot.boundaries, boundaryKeys, 'wallet snapshot.boundaries');
  for (const key of boundaryKeys) {
    if (snapshot.boundaries[key] !== false) {
      throw new Error(`wallet boundary elevated: ${key}`);
    }
  }

  return snapshot;
};

const setText = (selector, value) => {
  const node = document.querySelector(selector);
  if (node) node.textContent = String(value ?? '—');
};

const setChip = (node, tone, label) => {
  if (!node) return;
  node.className = `status-chip status-chip--${tone}`;
  node.textContent = label;
};

const setSourceState = (selector, source) => {
  const status = (
    typeof source?.status === 'number' &&
    Number.isSafeInteger(source.status) &&
    source.status >= 0 &&
    source.status <= 599
  ) ? source.status : null;
  const label = status === 200
    ? 'Available'
    : status && status > 0
      ? `HTTP ${status}`
      : 'Unavailable';
  setText(selector, label);
};

const resetWalletView = (message = 'Enter an account ID to load read-only context.') => {
  setChip(
    document.querySelector('[data-wallet-state-chip]'),
    'info',
    'No account loaded'
  );
  setText('[data-wallet-message]', message);
  setText('[data-wallet-account-id]', '—');
  setText('[data-wallet-address]', '—');
  setText('[data-wallet-local-status]', 'Not checked');
  setText('[data-wallet-lock-state]', 'Not checked');
  setText('[data-wallet-native-gas]', '—');
  setText('[data-wallet-void-balance]', '—');
  setText('[data-wallet-ledger-wc]', '—');
  setText('[data-wallet-production-wc]', '—');
  setText('[data-wallet-ledger-meta]', 'No account loaded');
  setText('[data-wallet-production-meta]', 'No account loaded');
  setText('[data-wallet-source-status]', 'Not checked');
  setText('[data-wallet-source-ledger]', 'Not checked');
  setText('[data-wallet-source-production]', 'Not checked');
};

const renderError = (message) => {
  setChip(
    document.querySelector('[data-wallet-state-chip]'),
    'warning',
    'Account unavailable'
  );
  setText('[data-wallet-message]', message || 'The read-only adapter did not respond.');
};

const renderWallet = (snapshot, expectedAccount) => {
  const checked = validateWalletSnapshotV1(snapshot, expectedAccount);
  const account = checked.account;
  const wallet = checked.wallet;
  const balances = checked.balances;
  const sources = checked.sources;

  setChip(
    document.querySelector('[data-wallet-state-chip]'),
    wallet.has_wallet ? 'positive' : 'info',
    wallet.has_wallet ? 'Local wallet found' : 'Account loaded'
  );
  setText(
    '[data-wallet-message]',
    wallet.has_wallet
      ? 'Local wallet identity and accounting balances are shown read-only.'
      : 'No local managed wallet is attached to this account ID. Accounting balances remain read-only.'
  );
  setText('[data-wallet-account-id]', account.id);
  setText('[data-wallet-address]', wallet.address || 'No local wallet address');
  setText('[data-wallet-local-status]', wallet.has_wallet ? 'Configured' : 'Not configured');
  setText(
    '[data-wallet-lock-state]',
    wallet.has_wallet ? (wallet.unlocked ? 'Unlocked' : 'Locked') : 'Not applicable'
  );
  setText('[data-wallet-native-gas]', wallet.native_gas_display);
  setText('[data-wallet-void-balance]', balances.void.display);
  setText('[data-wallet-ledger-wc]', balances.ledger_wc.display);
  setText('[data-wallet-production-wc]', balances.production_wc.display);
  setText(
    '[data-wallet-ledger-meta]',
    balances.ledger_wc.available
      ? `${balances.ledger_wc.entries} ledger entries · no spendability claim`
      : 'Ledger balance unavailable'
  );
  setText(
    '[data-wallet-production-meta]',
    balances.production_wc.available
      ? `${balances.production_wc.entries} entries · non-spendable canary`
      : 'Production balance unavailable'
  );
  setSourceState('[data-wallet-source-status]', sources.wallet_status);
  setSourceState('[data-wallet-source-ledger]', sources.ledger_wc);
  setSourceState('[data-wallet-source-production]', sources.production_wc);
};

const invalidateWalletRequest = (reason) => {
  requestSerial += 1;
  walletRequestOwner.cancel(reason);
};

const loadAccount = async (account, button) => {
  const value = String(account || '').trim();
  if (!ACCOUNT_PATTERN.test(value)) {
    renderError('Use 1–128 letters, numbers, periods, underscores, colons, or hyphens.');
    return;
  }

  const serial = ++requestSerial;
  walletRequestOwner.cancel('wallet request replaced');
  if (button) button.disabled = true;

  setChip(
    document.querySelector('[data-wallet-state-chip]'),
    'info',
    'Loading account'
  );
  setText('[data-wallet-message]', 'Reading three fixed local sources.');

  const route = `${WALLET_ENDPOINT}?account=${encodeURIComponent(value)}`;
  const expectedUrl = new URL(route, window.location.origin).href;

  try {
    const body = await walletRequestOwner.run(
      route,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        credentials: 'omit',
        redirect: 'error',
        mode: 'same-origin',
        referrerPolicy: 'no-referrer',
        signal: AbortSignal.timeout(WALLET_REQUEST_TIMEOUT_MS),
      },
      async (response, signal, lifetime) => {
        if (response.url !== expectedUrl) {
          throw new Error('Wallet adapter final URL mismatch');
        }
        if (!response.ok) {
          throw new Error(`Wallet adapter returned HTTP ${response.status}`);
        }
        const contentType = String(response.headers.get('content-type') || '').toLowerCase();
        if (!contentType.includes('application/json')) {
          throw new Error('Wallet adapter content type mismatch');
        }
        return validateWalletSnapshotV1(
          await readBoundedNetworkJsonV1(response, signal, lifetime),
          value,
        );
      },
    );

    if (serial !== requestSerial || currentRoute() !== 'wallet') return;
    sessionStorage.setItem(ACCOUNT_STORAGE_KEY, value);
    renderWallet(body, value);
  } catch (error) {
    if (serial !== requestSerial || currentRoute() !== 'wallet') return;
    renderError(error instanceof Error ? error.message : String(error));
  } finally {
    if (serial === requestSerial && currentRoute() === 'wallet' && button) {
      button.disabled = false;
    }
  }
};

const bindWalletView = () => {
  if (currentRoute() !== 'wallet') {
    if (walletViewPresent || walletRequestOwner.isActive()) {
      invalidateWalletRequest('wallet route left');
    }
    walletViewPresent = false;
    return;
  }

  const form = document.querySelector('[data-wallet-account-form]');
  if (!form) {
    if (walletViewPresent || walletRequestOwner.isActive()) {
      invalidateWalletRequest('wallet view removed');
    }
    walletViewPresent = false;
    return;
  }
  walletViewPresent = true;

  if (form.dataset.walletBound === 'true') return;
  form.dataset.walletBound = 'true';

  const input = form.querySelector('[data-wallet-account-input]');
  const button = form.querySelector('[data-wallet-load]');
  const saved = sessionStorage.getItem(ACCOUNT_STORAGE_KEY) || '';
  if (input && saved) input.value = saved;

  resetWalletView(
    saved
      ? 'Saved locally for this browser session. Press Load account to refresh.'
      : undefined
  );

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    loadAccount(input?.value, button);
  });

  const clear = form.querySelector('[data-wallet-clear]');
  clear?.addEventListener('click', () => {
    invalidateWalletRequest('wallet cleared');
    sessionStorage.removeItem(ACCOUNT_STORAGE_KEY);
    if (input) input.value = '';
    resetWalletView();
    input?.focus();
  });
};

if (
  typeof document !== 'undefined' &&
  typeof MutationObserver !== 'undefined'
) {
  const observer = new MutationObserver(() => bindWalletView());
  const start = () => {
    bindWalletView();
    observer.observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
}
