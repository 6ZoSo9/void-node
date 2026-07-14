const HOME_ENDPOINT = '/__void/ui/wave2/home.json';
const HOME_MARKER = 'VOID_UI_WAVE2_HOME_READONLY_V1';

let requestSerial = 0;

const formatNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString('en-US') : '—';
};

const setText = (selector, value, fallback = '—') => {
  document.querySelectorAll(selector).forEach((element) => {
    element.textContent = value === null || value === undefined || value === ''
      ? fallback
      : String(value);
  });
};

const setChip = (element, variant, text) => {
  if (!element) return;
  element.className = `status-chip status-chip--${variant}`;
  element.textContent = text;
};

const currentRoute = () => {
  return location.hash.replace(/^#\/?/, '').split(/[?\/]/)[0] || 'home';
};

const setLoading = () => {
  setChip(
    document.querySelector('[data-home-state-chip]'),
    'info',
    'Loading live state'
  );
  setText('[data-home-next-title]', 'Reading local node truth');
  setText(
    '[data-home-summary]',
    'The Home view is waiting for the exact read-only adapter.'
  );
};

const setError = (message) => {
  setChip(
    document.querySelector('[data-home-state-chip]'),
    'warning',
    'Live state unavailable'
  );
  setText('[data-home-next-title]', 'The local adapter did not respond');
  setText(
    '[data-home-summary]',
    'No cached or invented values are shown. Refresh after the node is ready.'
  );
  setText('[data-home-last-updated]', message || 'Request failed');
};

const applySnapshot = (snapshot) => {
  if (!snapshot || snapshot.marker !== HOME_MARKER) {
    throw new Error('Unexpected Home adapter response');
  }

  const network = snapshot.network || {};
  const node = snapshot.node || {};
  const account = snapshot.account || {};
  const balances = snapshot.balances || {};
  const sources = snapshot.sources || {};

  const healthy = network.health === 'healthy';
  const ready = network.ready === true;
  const meshAligned = network.peer_count === network.expected_peer_count;

  setChip(
    document.querySelector('[data-home-state-chip]'),
    ready ? 'positive' : 'warning',
    ready ? 'Node ready' : 'Node degraded'
  );

  setText(
    '[data-home-next-title]',
    account.selected ? 'Review your current state' : 'Choose an account when ready'
  );
  setText(
    '[data-home-summary]',
    ready
      ? account.selected
        ? 'Live network and account context are available through read-only adapters.'
        : 'The node is ready. Wallet and Work Credit values remain hidden until an account is deliberately selected.'
      : 'The node is reachable, but operational readiness is degraded. Wallet and Work Credit values remain hidden.'
  );

  setText('[data-home-network-state]', healthy ? 'HEALTHY' : 'DEGRADED');
  setText(
    '[data-home-account-state]',
    account.selected ? account.label : 'NOT SELECTED'
  );
  setText('[data-home-node-state]', node.label || node.hostname || 'LOCAL NODE');

  setText('[data-home-void-balance]', balances.void_display);
  setText('[data-home-spendable-wc]', balances.spendable_wc_display);
  setText('[data-home-production-wc]', balances.production_wc_display);
  setText(
    '[data-home-balance-note]',
    balances.available
      ? 'Read-only balances loaded'
      : 'Select an account to load balances'
  );

  setText(
    '[data-home-health-value]',
    sources.health?.status === 200 ? 'Online' : 'Unavailable'
  );
  setText(
    '[data-home-ready-value]',
    ready ? 'Ready' : 'Not ready'
  );
  setText(
    '[data-home-peers-value]',
    `${network.peer_count ?? 0} / ${network.expected_peer_count ?? 2}`
  );
  setText('[data-home-head-value]', formatNumber(network.chain_head));
  setText('[data-home-mesh-value]', meshAligned ? 'Aligned' : 'Partial');
  setText('[data-home-node-name]', node.label || node.hostname || 'Local node');

  setText('[data-network-context-label]', snapshot.network_name || 'Mainnet-0');
  setText(
    '[data-network-context-meta]',
    `${network.peer_count ?? 0} peers · block ${formatNumber(network.chain_head)}`
  );
  setText('[data-node-footer-name]', node.label || node.hostname || 'Local node');
  setText(
    '[data-node-footer-meta]',
    `${ready ? 'Ready' : 'Not ready'} · ${network.peer_count ?? 0} peers`
  );

  const headerDot = document.querySelector('[data-network-context-dot]');
  if (headerDot) {
    headerDot.className = `status-dot ${
      healthy ? 'status-dot--positive' : 'status-dot--warning'
    }`;
  }

  setText(
    '[data-home-last-updated]',
    `Updated ${new Date(snapshot.generated_at).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })}`
  );
};

async function loadHome() {
  if (currentRoute() !== 'home') return;
  if (!document.querySelector('[data-home-view]')) return;

  const serial = ++requestSerial;
  setLoading();

  try {
    const response = await fetch(HOME_ENDPOINT, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      credentials: 'same-origin',
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Adapter returned HTTP ${response.status}`);
    }

    const snapshot = await response.json();
    if (serial !== requestSerial) return;
    applySnapshot(snapshot);
  } catch (error) {
    if (serial !== requestSerial) return;
    setError(error instanceof Error ? error.message : 'Request failed');
  }
}

document.addEventListener('click', (event) => {
  if (!event.target.closest('[data-home-refresh]')) return;
  loadHome();
});

const viewRoot = document.getElementById('view-root');
if (viewRoot) {
  const observer = new MutationObserver(() => {
    if (currentRoute() === 'home' && viewRoot.querySelector('[data-home-view]')) {
      queueMicrotask(loadHome);
    }
  });
  observer.observe(viewRoot, { childList: true });
}

window.addEventListener('hashchange', () => {
  if (currentRoute() === 'home') setTimeout(loadHome, 0);
});

setTimeout(loadHome, 0);
