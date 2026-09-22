import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  NETWORK_ENDPOINT,
  NETWORK_MARKER,
  PUBLIC_NETWORK_SHELL_TRUTH_MARKER,
  applyGlobalNetworkShellV1,
  globalNetworkShellOwnerV1,
  invalidateGlobalNetworkShellV1,
  loadGlobalNetworkShellTruthV1,
  loadNetworkViewV1,
  networkSnapshotToViewModelV1,
  publicNetworkViewModelV1,
  setGlobalNetworkShellUnavailableV1,
  validatePublicNetworkSnapshotV1,
} from '../public/void-app-wave1-v1/assets/js/network-live.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const networkPath = path.join(
  root,
  'public/void-app-wave1-v1/assets/js/network-live.js',
);
const networkSource = fs.readFileSync(networkPath, 'utf8');

const publicFixture = () => ({
  ok: true,
  marker: NETWORK_MARKER,
  generated_at: '2026-09-22T19:00:00.000Z',
  read_only: true,
  public_safe: true,
  network_name: 'Mainnet-0',
  node: {
    label: 'Precision public seed',
    role: 'public-seed',
    public: true,
  },
  account: {
    selected: false,
    id: null,
    label: 'Public-safe view',
  },
  balances: {
    available: false,
    void_display: '—',
    spendable_wc_display: '—',
    production_wc_display: '—',
    reason: 'Account-scoped balances are not public.',
  },
  network: {
    health: 'healthy',
    status: 'ready',
    status_label: 'Ready',
    status_detail: 'Strict readiness checks are green.',
    ready: true,
    strict_ready: true,
    restricted_ready: false,
    public_service_available: true,
    chain_synchronized: true,
    mesh_connected: false,
    mesh_aligned: false,
    security_mode: 'normal',
    reported_ready: true,
    chain_head: 1951058,
    gap: 0,
    txroot_live: 1,
    txroot_quarantined: false,
    reasons: [],
    peer_count: 0,
    expected_peer_count: 2,
  },
  sources: {
    health: { status: 200, available: true },
    readiness: { status: 200, available: true },
    head: { status: 200, available: true },
    peers: { status: 200, available: true },
  },
  boundaries: {
    account_enumeration: false,
    wallet_records: false,
    work_credit_balances: false,
    job_history: false,
    receipt_history: false,
    peer_ids: false,
    peer_addresses: false,
    mutation: false,
    money_movement: false,
    validator_mutation: false,
    operator_mutation: false,
  },
});

const validated = validatePublicNetworkSnapshotV1(publicFixture());
const model = publicNetworkViewModelV1(validated);
const dispatched = networkSnapshotToViewModelV1(publicFixture());

for (const candidate of [model, dispatched]) {
  assert.equal(candidate.publicSafe, true);
  assert.equal(candidate.networkName, 'Mainnet-0');
  assert.equal(candidate.nodeLabel, 'Precision public seed');
  assert.equal(candidate.ready, true);
  assert.equal(candidate.chainHead, 1951058);
  assert.equal(candidate.peerCount, 0);
  assert.equal(candidate.expectedPeerCount, 2);
  assert.equal(candidate.peerBaselineMet, false);
  assert.equal(candidate.chainAligned, false);
  assert.equal(candidate.availableSources, 4);
  assert.equal(candidate.totalSources, 4);
}

assert.equal(globalNetworkShellOwnerV1('home'), 'home');
assert.equal(globalNetworkShellOwnerV1('network'), 'network');
for (const route of ['wallet', 'earn', 'data', 'buy', 'validate', 'foundation']) {
  assert.equal(globalNetworkShellOwnerV1(route), 'background');
}

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((resolveValue, rejectValue) => {
    resolve = resolveValue;
    reject = rejectValue;
  });
  return { promise, resolve, reject };
};

const responseFor = (value) => new Response(
  JSON.stringify(value),
  {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  },
);

const priorGlobals = {
  document: {
    had: Object.hasOwn(globalThis, 'document'),
    value: globalThis.document,
  },
  location: {
    had: Object.hasOwn(globalThis, 'location'),
    value: globalThis.location,
  },
  fetch: {
    had: Object.hasOwn(globalThis, 'fetch'),
    value: globalThis.fetch,
  },
};

const restoreGlobal = (name, prior) => {
  if (prior.had) globalThis[name] = prior.value;
  else delete globalThis[name];
};

const elements = new Map();
const elementFor = (selector) => {
  if (!elements.has(selector)) {
    elements.set(selector, {
      textContent: '',
      className: '',
      dataset: {},
      addEventListener() {},
    });
  }
  return elements.get(selector);
};

globalThis.document = {
  documentElement: { dataset: {} },
  querySelector(selector) {
    return elementFor(selector);
  },
  querySelectorAll(selector) {
    return [elementFor(selector)];
  },
};
globalThis.location = { hash: '#/data' };

try {
  let fetchCount = 0;
  globalThis.fetch = async () => {
    fetchCount += 1;
    return responseFor(publicFixture());
  };

  globalThis.location.hash = '#/home';
  await loadGlobalNetworkShellTruthV1();
  assert.equal(fetchCount, 0, 'Home must retain exclusive shell ownership');

  globalThis.location.hash = '#/data';
  await loadGlobalNetworkShellTruthV1();
  assert.equal(fetchCount, 1);
  assert.equal(
    elementFor('[data-network-context-label]').textContent,
    'Mainnet-0',
  );
  assert.equal(
    elementFor('[data-network-context-meta]').textContent,
    '0 peers · block 1,951,058',
  );
  assert.equal(
    elementFor('[data-node-footer-name]').textContent,
    'Precision public seed',
  );
  assert.equal(
    elementFor('[data-node-footer-meta]').textContent,
    'Service ready · mesh HOLD · 0 peers',
  );
  assert.equal(
    elementFor('[data-network-context-dot]').className,
    'status-dot status-dot--warning',
  );
  assert.equal(
    globalThis.document.documentElement.dataset.voidGlobalNetworkTruth,
    PUBLIC_NETWORK_SHELL_TRUTH_MARKER,
  );

  const staleSuccess = deferred();
  const staleFixture = publicFixture();
  staleFixture.node.label = 'STALE background';
  const freshFixture = publicFixture();
  freshFixture.node.label = 'Fresh Network view';

  const queue = [
    staleSuccess.promise,
    Promise.resolve(responseFor(freshFixture)),
  ];
  fetchCount = 0;
  globalThis.fetch = () => {
    fetchCount += 1;
    return queue.shift();
  };

  globalThis.location.hash = '#/wallet';
  const staleRun = loadGlobalNetworkShellTruthV1();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(fetchCount, 1);

  globalThis.location.hash = '#/network';
  await loadNetworkViewV1();
  assert.equal(fetchCount, 2);
  assert.equal(
    elementFor('[data-node-footer-name]').textContent,
    'Fresh Network view',
  );

  staleSuccess.resolve(responseFor(staleFixture));
  await staleRun;
  assert.equal(
    elementFor('[data-node-footer-name]').textContent,
    'Fresh Network view',
    'stale background success must not overwrite Network-route truth',
  );

  const staleFailure = deferred();
  const freshFailureFixture = publicFixture();
  freshFailureFixture.node.label = 'Fresh after stale failure';
  const failureQueue = [
    staleFailure.promise,
    Promise.resolve(responseFor(freshFailureFixture)),
  ];
  fetchCount = 0;
  globalThis.fetch = () => {
    fetchCount += 1;
    return failureQueue.shift();
  };

  globalThis.location.hash = '#/earn';
  const staleFailureRun = loadGlobalNetworkShellTruthV1();
  await new Promise((resolve) => setImmediate(resolve));
  globalThis.location.hash = '#/network';
  await loadNetworkViewV1();

  staleFailure.reject(new Error('synthetic stale background failure'));
  await staleFailureRun;
  assert.equal(
    elementFor('[data-node-footer-name]').textContent,
    'Fresh after stale failure',
    'stale background failure must not overwrite Network-route truth',
  );

  globalThis.fetch = async () => {
    throw new Error('synthetic Network view failure');
  };
  globalThis.location.hash = '#/network';
  await loadNetworkViewV1();
  assert.equal(
    elementFor('[data-network-context-label]').textContent,
    'Network unavailable',
  );
  assert.equal(
    Object.hasOwn(
      globalThis.document.documentElement.dataset,
      'voidGlobalNetworkTruth',
    ),
    false,
  );

  applyGlobalNetworkShellV1(model);
  assert.equal(
    globalThis.document.documentElement.dataset.voidGlobalNetworkTruth,
    PUBLIC_NETWORK_SHELL_TRUTH_MARKER,
  );
  setGlobalNetworkShellUnavailableV1();
  assert.equal(
    Object.hasOwn(
      globalThis.document.documentElement.dataset,
      'voidGlobalNetworkTruth',
    ),
    false,
  );
  invalidateGlobalNetworkShellV1('proof cleanup');
} finally {
  restoreGlobal('document', priorGlobals.document);
  restoreGlobal('location', priorGlobals.location);
  restoreGlobal('fetch', priorGlobals.fetch);
}

for (const marker of [
  "PUBLIC_NETWORK_SHELL_TRUTH_MARKER = 'VOID_PUBLIC_NETWORK_SHELL_TRUTH_V1'",
  'networkSnapshotToViewModelV1',
  'globalNetworkShellOwnerV1',
  'loadGlobalNetworkShellTruthV1',
  'invalidateGlobalNetworkShellV1',
  'coordinateGlobalNetworkShellRouteV1',
  "globalNetworkShellOwnerV1(currentRoute()) !== 'background'",
  'Service ready · mesh HOLD',
  'HTTPS synchronization and native P2P peers are separate signals.',
  'delete document.documentElement.dataset.voidGlobalNetworkTruth',
  "method: 'GET'",
  "cache: 'no-store'",
  "credentials: 'omit'",
  "redirect: 'error'",
  "mode: 'same-origin'",
  "referrerPolicy: 'no-referrer'",
  'AbortSignal.timeout(5000)',
  'readBoundedNetworkJsonV1',
]) {
  assert.ok(networkSource.includes(marker), `missing shell-truth marker: ${marker}`);
}

for (const forbidden of [
  "addEventListener('hashchange'",
  "method: 'POST'",
  "method: 'PUT'",
  "method: 'PATCH'",
  "method: 'DELETE'",
  'window.ethereum',
  'eth_sendTransaction',
  'personal_sign',
  '/p2p/connect',
  '/p2p/dial',
  '/p2p/disconnect',
  '/validator/submit',
  '/wallet/send',
]) {
  assert.equal(
    networkSource.includes(forbidden),
    false,
    `forbidden shell authority marker: ${forbidden}`,
  );
}

assert.equal(NETWORK_ENDPOINT, '/__void/ui/wave2/home.json');
assert.equal(
  PUBLIC_NETWORK_SHELL_TRUTH_MARKER,
  'VOID_PUBLIC_NETWORK_SHELL_TRUTH_V1',
);

console.log('VOID_PUBLIC_NETWORK_SHELL_TRUTH_V1_PROOF_GREEN');
console.log('home_shell_owner=exclusive');
console.log('network_shell_owner=exclusive');
console.log('background_shell_owner=non_home_non_network');
console.log('stale_background_success_overwrite=false');
console.log('stale_background_failure_overwrite=false');
console.log('network_failure_clears_shell_truth=true');
console.log('service_ready_mesh_hold_distinguished=true');
console.log('same_origin_get_only=true');
console.log('money_movement=false');
console.log('operator_mutation=false');
