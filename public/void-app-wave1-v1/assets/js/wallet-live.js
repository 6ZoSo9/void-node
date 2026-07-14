const ACCOUNT_STORAGE_KEY = 'void.ui.wave3.wallet.account.v1';
const ACCOUNT_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

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
  const status = Number(source?.status ?? 0);
  const label = status === 200 ? 'Available' : status ? `HTTP ${status}` : 'Unavailable';

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

const renderWallet = (snapshot) => {
  if (!snapshot || snapshot.marker !== 'VOID_UI_WAVE3_WALLET_READONLY_V1') {
    throw new Error('Unexpected Wallet adapter response');
  }

  const account = snapshot.account || {};
  const wallet = snapshot.wallet || {};
  const balances = snapshot.balances || {};
  const sources = snapshot.sources || {};

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

  setText('[data-wallet-account-id]', account.id || '—');
  setText('[data-wallet-address]', wallet.address || 'No local wallet address');
  setText(
    '[data-wallet-local-status]',
    wallet.has_wallet ? 'Configured' : 'Not configured'
  );
  setText(
    '[data-wallet-lock-state]',
    wallet.has_wallet ? (wallet.unlocked ? 'Unlocked' : 'Locked') : 'Not applicable'
  );
  setText('[data-wallet-native-gas]', wallet.native_gas_display || '—');

  setText('[data-wallet-void-balance]', balances.void?.display ?? '—');
  setText('[data-wallet-ledger-wc]', balances.ledger_wc?.display ?? '—');
  setText(
    '[data-wallet-production-wc]',
    balances.production_wc?.display ?? '—'
  );

  setText(
    '[data-wallet-ledger-meta]',
    balances.ledger_wc?.available
      ? `${balances.ledger_wc.entries ?? 0} ledger entries · no spendability claim`
      : 'Ledger balance unavailable'
  );

  setText(
    '[data-wallet-production-meta]',
    balances.production_wc?.available
      ? `${balances.production_wc.entries ?? 0} entries · non-spendable canary`
      : 'Production balance unavailable'
  );

  setSourceState('[data-wallet-source-status]', sources.wallet_status);
  setSourceState('[data-wallet-source-ledger]', sources.ledger_wc);
  setSourceState('[data-wallet-source-production]', sources.production_wc);
};

const loadAccount = async (account, button) => {
  const value = String(account || '').trim();

  if (!ACCOUNT_PATTERN.test(value)) {
    renderError('Use 1–128 letters, numbers, periods, underscores, colons, or hyphens.');
    return;
  }

  if (button) button.disabled = true;

  setChip(
    document.querySelector('[data-wallet-state-chip]'),
    'info',
    'Loading account'
  );

  setText('[data-wallet-message]', 'Reading three fixed local sources.');

  try {
    const response = await fetch(
      `/__void/ui/wave3/wallet.json?account=${encodeURIComponent(value)}`,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      }
    );

    const body = await response.json();

    if (!response.ok || !body?.ok) {
      throw new Error(body?.error || `Wallet adapter returned HTTP ${response.status}`);
    }

    sessionStorage.setItem(ACCOUNT_STORAGE_KEY, value);
    renderWallet(body);
  } catch (error) {
    renderError(error instanceof Error ? error.message : String(error));
  } finally {
    if (button) button.disabled = false;
  }
};

const bindWalletView = () => {
  const form = document.querySelector('[data-wallet-account-form]');

  if (!form || form.dataset.walletBound === 'true') return;

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
    sessionStorage.removeItem(ACCOUNT_STORAGE_KEY);

    if (input) input.value = '';

    resetWalletView();
    input?.focus();
  });
};

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
