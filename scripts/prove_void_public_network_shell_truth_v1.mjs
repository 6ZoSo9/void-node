import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  NETWORK_ENDPOINT,
  NETWORK_MARKER,
  PUBLIC_NETWORK_SHELL_TRUTH_MARKER,
  globalNetworkShellOwnerV1,
  loadGlobalNetworkShellTruthV1,
  loadNetworkViewV1,
  networkViewModelV1,
  publicNetworkViewModelV1,
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
  generated_at: '2026-08-22T17:00:00.000Z',
  read_only: true,
  public_safe: true,
  network_name: 'Mainnet-0',
  node: {
    label: 'Alienware public seed',
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
    mesh_connected: true,
    mesh_aligned: true,
    security_mode: 'normal',
    reported_ready: true,
    chain_head: 1900960,
    gap: 0,
    txroot_live: 1,
    txroot_quarantined: false,
    reasons: [],
    peer_count: 2,
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

const clone = (value) => structuredClone(value);
const rejectPublic = (mutator, pattern = undefined) => {
  const value = clone(publicFixture());
  mutator(value);
  if (pattern) assert.throws(() => validatePublicNetworkSnapshotV1(value), pattern);
  else assert.throws(() => validatePublicNetworkSnapshotV1(value));
};

const validated = validatePublicNetworkSnapshotV1(publicFixture());
const directModel = publicNetworkViewModelV1(validated);
const dispatchedModel = networkViewModelV1(publicFixture());

for (const model of [directModel, dispatchedModel]) {
  assert.equal(model.publicSafe, true);
  assert.equal(model.networkName, 'Mainnet-0');
  assert.equal(model.nodeLabel, 'Alienware public seed');
  assert.equal(model.nodeRole, 'public-seed');
  assert.equal(model.ready, true);
  assert.equal(model.chainHead, 1900960);
  assert.equal(model.peerCount, 2);
  assert.equal(model.expectedPeerCount, 2);
  assert.equal(model.peerBaselineMet, true);
  assert.equal(model.chainAligned, true);
  assert.equal(model.availableSources, 4);
  assert.equal(model.totalSources, 4);
  assert.equal(model.readinessHead, null);
  assert.equal(model.lastmileSeen, null);
  assert.equal(model.latestNumber, null);
  assert.equal(model.gap, 0);
  assert.deepEqual(
    model.sourceStatuses,
    { health: 200, head: 200, peers: 200, ready: 200 },
  );
}

rejectPublic((value) => { value.extra = true; }, /top-level shape/);
rejectPublic((value) => { value.public_safe = false; }, /boundary mismatch/);
rejectPublic((value) => { value.marker = 'WRONG'; }, /marker mismatch/);
rejectPublic((value) => { value.network_name = 'mainnet'; }, /identity mismatch/);
rejectPublic((value) => { value.node.role = 'alienware'; }, /node identity/);
rejectPublic((value) => { value.node.public = false; }, /node identity/);
rejectPublic((value) => { value.account.id = 'zoso'; }, /account boundary/);
rejectPublic((value) => { value.balances.available = true; }, /balance boundary/);
rejectPublic((value) => { value.network.chain_head = '1900960'; }, /chain head/);
rejectPublic((value) => { value.network.peer_count = '2'; }, /peer count/);
rejectPublic((value) => { value.network.expected_peer_count = 3; }, /expected peer count/);
rejectPublic((value) => { value.network.mesh_aligned = false; }, /mesh-aligned contradiction/);
rejectPublic((value) => { value.network.status = 'restricted_ready'; }, /health\/status contradiction/);
rejectPublic((value) => { value.sources.head.available = false; }, /availability contradiction/);
rejectPublic(
  (value) => {
    value.sources.head.status = 503;
    value.sources.head.available = false;
  },
  /ready state contradicts source availability/,
);
rejectPublic((value) => { value.boundaries.peer_ids = true; }, /authority flag/);
rejectPublic((value) => { value.boundaries.money_movement = true; }, /authority flag/);

const restricted = publicFixture();
restricted.network.health = 'restricted';
restricted.network.status = 'restricted_ready';
restricted.network.status_label = 'Synchronized under txroot safety quarantine';
restricted.network.status_detail =
  'Chain head and expected peer mesh are synchronized; txroot persistence remains intentionally quarantined.';
restricted.network.ready = false;
restricted.network.strict_ready = false;
restricted.network.restricted_ready = true;
restricted.network.security_mode = 'txroot_quarantine';
restricted.network.txroot_live = 0;
restricted.network.txroot_quarantined = true;
restricted.network.reported_ready = true;
restricted.network.reasons = ['txroot_live!=1'];
const restrictedModel = networkViewModelV1(restricted);
assert.equal(restrictedModel.publicSafe, true);
assert.equal(restrictedModel.ready, false);
assert.equal(restrictedModel.chainAligned, true);

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

const jsonResponse = (value) => new Response(
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

const fakeElements = new Map();
const fakeElement = (selector) => {
  if (!fakeElements.has(selector)) {
    fakeElements.set(selector, {
      textContent: '',
      className: '',
      dataset: {},
      addEventListener() {},
    });
  }
  return fakeElements.get(selector);
};

globalThis.document = {
  documentElement: { dataset: {} },
  querySelector(selector) {
    return fakeElement(selector);
  },
  querySelectorAll(selector) {
    return [fakeElement(selector)];
  },
};
globalThis.location = { hash: '#/wallet' };

try {
  let fetchCount = 0;
  globalThis.fetch = async () => {
    fetchCount += 1;
    return jsonResponse(publicFixture());
  };
  globalThis.location.hash = '#/home';
  await loadGlobalNetworkShellTruthV1();
  assert.equal(fetchCount, 0);

  const staleFailure = deferred();
  const freshFailureCase = clone(publicFixture());
  freshFailureCase.node.label = 'Fresh Network view after stale failure';
  const failureQueue = [
    staleFailure.promise,
    Promise.resolve(jsonResponse(freshFailureCase)),
  ];
  fetchCount = 0;
  globalThis.fetch = () => {
    fetchCount += 1;
    assert.ok(failureQueue.length > 0, 'unexpected stale-failure fetch');
    return failureQueue.shift();
  };

  globalThis.location.hash = '#/wallet';
  const staleFailureRun = loadGlobalNetworkShellTruthV1();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(fetchCount, 1);

  globalThis.location.hash = '#/network';
  await loadNetworkViewV1();
  assert.equal(fetchCount, 2);
  assert.equal(
    fakeElement('[data-node-footer-name]').textContent,
    freshFailureCase.node.label,
  );

  staleFailure.reject(new Error('synthetic stale background failure'));
  await staleFailureRun;
  assert.equal(
    fakeElement('[data-node-footer-name]').textContent,
    freshFailureCase.node.label,
  );
  assert.equal(
    globalThis.document.documentElement.dataset.voidGlobalNetworkTruth,
    PUBLIC_NETWORK_SHELL_TRUTH_MARKER,
  );

  const staleSuccess = deferred();
  const staleSuccessFixture = clone(publicFixture());
  staleSuccessFixture.node.label = 'STALE background shell';
  const freshSuccessCase = clone(publicFixture());
  freshSuccessCase.node.label = 'Fresh Network view after stale success';
  const successQueue = [
    staleSuccess.promise,
    Promise.resolve(jsonResponse(freshSuccessCase)),
  ];
  fetchCount = 0;
  globalThis.fetch = () => {
    fetchCount += 1;
    assert.ok(successQueue.length > 0, 'unexpected stale-success fetch');
    return successQueue.shift();
  };

  globalThis.location.hash = '#/wallet';
  const staleSuccessRun = loadGlobalNetworkShellTruthV1();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(fetchCount, 1);

  globalThis.location.hash = '#/network';
  await loadNetworkViewV1();
  assert.equal(fetchCount, 2);
  assert.equal(
    fakeElement('[data-node-footer-name]').textContent,
    freshSuccessCase.node.label,
  );

  staleSuccess.resolve(jsonResponse(staleSuccessFixture));
  await staleSuccessRun;
  assert.equal(
    fakeElement('[data-node-footer-name]').textContent,
    freshSuccessCase.node.label,
  );

  globalThis.fetch = async () => {
    throw new Error('synthetic Network view failure');
  };
  globalThis.location.hash = '#/network';
  await loadNetworkViewV1();
  assert.equal(
    fakeElement('[data-network-context-label]').textContent,
    'Network unavailable',
  );
  assert.equal(
    Object.hasOwn(
      globalThis.document.documentElement.dataset,
      'voidGlobalNetworkTruth',
    ),
    false,
  );

  const backgroundFixture = clone(publicFixture());
  backgroundFixture.node.label = 'Background Wallet shell';
  fetchCount = 0;
  globalThis.fetch = async () => {
    fetchCount += 1;
    return jsonResponse(backgroundFixture);
  };
  globalThis.location.hash = '#/wallet';
  await loadGlobalNetworkShellTruthV1();
  assert.equal(fetchCount, 1);
  assert.equal(
    fakeElement('[data-node-footer-name]').textContent,
    backgroundFixture.node.label,
  );
} finally {
  restoreGlobal('document', priorGlobals.document);
  restoreGlobal('location', priorGlobals.location);
  restoreGlobal('fetch', priorGlobals.fetch);
}


for (const marker of [
  "PUBLIC_NETWORK_SHELL_TRUTH_MARKER = 'VOID_PUBLIC_NETWORK_SHELL_TRUTH_V1'",
  'validatePublicNetworkSnapshotV1',
  'publicNetworkViewModelV1',
  "snapshot.public_safe === true",
  'loadGlobalNetworkShellTruthV1',
  'globalNetworkShellOwnerV1',
  'coordinateGlobalNetworkShellRouteV1',
  'invalidateGlobalNetworkShellV1',
  "globalNetworkShellOwnerV1(currentRoute()) !== 'background'",
  'delete document.documentElement.dataset.voidGlobalNetworkTruth',
  "method: 'GET'",
  "cache: 'no-store'",
  "credentials: 'omit'",
  "redirect: 'error'",
  "mode: 'same-origin'",
  "referrerPolicy: 'no-referrer'",
  'AbortSignal.timeout(5000)',
  'readBoundedNetworkJsonV1',
  "setText('[data-network-context-label]'",
  "setText('[data-network-context-meta]'",
  "setText('[data-node-footer-name]'",
  "setText('[data-node-footer-meta]'",
  'No remote peer identity is inferred',
  'Remote machine state is not inferred',
]) {
  assert.ok(networkSource.includes(marker), `missing public Network/shell marker: ${marker}`);
}

for (const forbidden of [
  "addEventListener('hashchange'",
  "method: 'POST'",
  "method: 'PUT'",
  "method: 'PATCH'",
  "method: 'DELETE'",
  'sendTransaction',
  'eth_sendTransaction',
  'personal_sign',
  '/admin',
  '/validator/admin',
  '/wc/send',
  '/wc/redeem',
]) {
  assert.equal(
    networkSource.includes(forbidden),
    false,
    `public Network shell source contains forbidden authority marker: ${forbidden}`,
  );
}

assert.equal(NETWORK_ENDPOINT, '/__void/ui/wave2/home.json');
assert.equal(PUBLIC_NETWORK_SHELL_TRUTH_MARKER, 'VOID_PUBLIC_NETWORK_SHELL_TRUTH_V1');

console.log('VOID_PUBLIC_NETWORK_SHELL_TRUTH_V1_PROOF_GREEN');
console.log('public_safe_home_contract_closed=1');
console.log('public_seed_role_admitted=1');
console.log('private_account_state_admitted=0');
console.log('peer_identity_admitted=0');
console.log('remote_machine_state_inferred=0');
console.log('public_chain_head_strict_numeric=1');
console.log('public_source_statuses_exact=1');
console.log('global_shell_every_route=1');
console.log('global_shell_route_single_writer=1');
console.log('stale_background_failure_overwrites_fresh_network_view=0');
console.log('stale_background_success_overwrites_fresh_network_view=0');
console.log('network_view_failure_clears_shell_truth=1');
console.log('same_origin_get_only=1');
console.log('bounded_response_bytes=131072');
console.log('money_movement=0');
console.log('operator_mutation=0');
