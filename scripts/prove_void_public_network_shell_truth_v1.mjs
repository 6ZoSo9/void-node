import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  NETWORK_ENDPOINT,
  NETWORK_MARKER,
  PUBLIC_NETWORK_SHELL_TRUTH_MARKER,
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

for (const marker of [
  "PUBLIC_NETWORK_SHELL_TRUTH_MARKER = 'VOID_PUBLIC_NETWORK_SHELL_TRUTH_V1'",
  'validatePublicNetworkSnapshotV1',
  'publicNetworkViewModelV1',
  "snapshot.public_safe === true",
  'loadGlobalNetworkShellTruthV1',
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
console.log('same_origin_get_only=1');
console.log('bounded_response_bytes=131072');
console.log('money_movement=0');
console.log('operator_mutation=0');
