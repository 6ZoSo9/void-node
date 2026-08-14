import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  MAX_NETWORK_RESPONSE_BYTES,
  NETWORK_ENDPOINT,
  NETWORK_MARKER,
  createNetworkRequestOwnerV1,
  networkViewModelV1,
  readBoundedNetworkJsonV1,
  validateNetworkSnapshotV1,
} from '../public/void-app-wave1-v1/assets/js/network-live.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const networkPath = path.join(root, 'public/void-app-wave1-v1/assets/js/network-live.js');
const walletPath = path.join(root, 'public/void-app-wave1-v1/assets/js/wallet-live.js');
const networkSource = fs.readFileSync(networkPath, 'utf8');
const walletSource = fs.readFileSync(walletPath, 'utf8');

const fixture = () => ({
  ok: true,
  marker: NETWORK_MARKER,
  generated_at: '2026-08-14T18:00:00.000Z',
  read_only: true,
  network_name: 'Mainnet-0',
  source_base: 'http://127.0.0.1:4100',
  node: {
    hostname: 'zoso-Precision-Tower-7810',
    label: 'Precision',
    role: 'precision',
  },
  network: {
    health: 'healthy',
    ready: true,
    chain_head: 1856587,
    peer_count: 2,
    expected_peer_count: 2,
  },
  account: {
    selected: false,
    label: 'No account selected',
  },
  balances: {
    available: false,
    void_display: '—',
    spendable_wc_display: '—',
    production_wc_display: '—',
  },
  sources: {
    health: { ok: true, status: 200, body: { ok: true } },
    ready: {
      ok: true,
      status: 200,
      body: {
        ready: true,
        gap: 0,
        txroot_live: 1,
        reasons: [],
        head: 1856587,
        lastmile_seen: 1856587,
      },
    },
    head: { ok: true, status: 200, body: { number: 1856587 } },
    peers: {
      ok: true,
      status: 200,
      body: [{ nodeId: 'a'.repeat(32) }, { nodeId: 'b'.repeat(32) }],
    },
  },
  boundaries: {
    wallet_send: false,
    ledger_write: false,
    fulfillment: false,
    wc_to_void: false,
    validator_mutation: false,
    operator_mutation: false,
    money_movement: false,
  },
});

const clone = (value) => structuredClone(value);
const reject = (mutator) => {
  const value = clone(fixture());
  mutator(value);
  assert.throws(() => validateNetworkSnapshotV1(value));
};

const validated = validateNetworkSnapshotV1(fixture());
const model = networkViewModelV1(validated);
assert.equal(model.ready, true);
assert.equal(model.chainAligned, true);
assert.equal(model.chainHead, 1856587);
assert.equal(model.latestNumber, 1856587);
assert.equal(model.readinessHead, 1856587);
assert.equal(model.lastmileSeen, 1856587);
assert.equal(model.gap, 0);
assert.equal(model.peerBaselineMet, true);
assert.equal(model.availableSources, 4);
assert.equal(model.totalSources, 4);
assert.deepEqual(
  model.sourceStatuses,
  { health: 200, head: 200, peers: 200, ready: 200 },
);

const degraded = fixture();
degraded.network.health = 'degraded';
degraded.network.ready = false;
degraded.network.peer_count = 1;
degraded.sources.ready = {
  ok: true,
  status: 200,
  body: {
    ready: false,
    gap: 2,
    txroot_live: 1,
    reasons: ['catching_up'],
    head: 1856585,
    lastmile_seen: 1856585,
  },
};
degraded.sources.head = { ok: true, status: 200, body: { number: 1856585 } };
degraded.network.chain_head = 1856585;
const degradedModel = networkViewModelV1(degraded);
assert.equal(degradedModel.ready, false);
assert.equal(degradedModel.chainAligned, false);
assert.equal(degradedModel.peerBaselineMet, false);

for (const wrongType of [null, false, true, '0', '1856587', '', [], {}]) {
  const wrong = fixture();
  wrong.sources.ready.body.head = wrongType;
  wrong.sources.ready.body.lastmile_seen = wrongType;
  wrong.sources.ready.body.gap = wrongType;
  wrong.sources.head.body.number = wrongType;
  const wrongModel = networkViewModelV1(wrong);
  assert.equal(wrongModel.chainHead, null);
  assert.equal(wrongModel.latestNumber, null);
  assert.equal(wrongModel.readinessHead, null);
  assert.equal(wrongModel.lastmileSeen, null);
  assert.equal(wrongModel.gap, null);
  assert.equal(wrongModel.chainAligned, false);
}

const mismatch = fixture();
mismatch.network.chain_head = 1856587;
mismatch.sources.head.body.number = 1856586;
assert.equal(networkViewModelV1(mismatch).chainHead, null);
assert.equal(networkViewModelV1(mismatch).chainAligned, false);

reject((value) => { value.unknown = true; });
reject((value) => { value.marker = 'WRONG'; });
reject((value) => { value.read_only = false; });
reject((value) => { value.network_name = 'mainnet'; });
reject((value) => { value.source_base = 'https://example.com'; });
reject((value) => { value.node.role = 'validator'; });
reject((value) => { value.network.expected_peer_count = 3; });
reject((value) => { value.network.peer_count = -1; });
reject((value) => { value.network.chain_head = '1856587'; });
reject((value) => { value.network.ready = false; });
reject((value) => { value.account.selected = true; });
reject((value) => { value.balances.available = true; });
reject((value) => { value.sources.health.extra = true; });
reject((value) => { value.sources.health.status = 700; });
reject((value) => { value.sources.peers.body = 'not-json-object-or-array'; });
reject((value) => { value.boundaries.operator_mutation = true; });
reject((value) => { value.boundaries.money_movement = true; });

const responseFor = (chunks) => new Response(
  new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  }),
  { headers: { 'content-type': 'application/json' } },
);

const encoded = new TextEncoder().encode(JSON.stringify(fixture()));
const parsed = await readBoundedNetworkJsonV1(responseFor([encoded]));
assert.equal(parsed.marker, NETWORK_MARKER);

const half = Math.ceil((MAX_NETWORK_RESPONSE_BYTES + 1) / 2);
await assert.rejects(
  () => readBoundedNetworkJsonV1(
    responseFor([new Uint8Array(half), new Uint8Array(half)])
  ),
  /exceeds byte limit/,
);
await assert.rejects(
  () => readBoundedNetworkJsonV1(new Response(null)),
  /not stream-readable/,
);
await assert.rejects(
  () => readBoundedNetworkJsonV1(
    responseFor([new TextEncoder().encode('{bad json')])
  ),
  SyntaxError,
);

let firstAborted = false;
const observedSignals = [];
const fetchImpl = async (_input, init) => {
  if (observedSignals.length > 0) {
    assert.equal(
      observedSignals[observedSignals.length - 1].aborted,
      true,
      'previous owned request must be aborted before replacement fetch starts',
    );
  }
  observedSignals.push(init.signal);
  return new Response('{}', {
    headers: { 'content-type': 'application/json' },
  });
};
const owner = createNetworkRequestOwnerV1(fetchImpl);

const waitForAbort = async (_response, signal) => {
  await new Promise((resolve, rejectPromise) => {
    if (signal.aborted) {
      rejectPromise(new Error(String(signal.reason || 'aborted')));
      return;
    }
    signal.addEventListener('abort', () => {
      firstAborted = true;
      rejectPromise(new Error(String(signal.reason || 'aborted')));
    }, { once: true });
  });
};

const first = owner.run(
  NETWORK_ENDPOINT,
  { method: 'GET' },
  waitForAbort,
);
await new Promise((resolve) => setTimeout(resolve, 0));
const second = owner.run(
  NETWORK_ENDPOINT,
  { method: 'GET' },
  async () => 'second',
);
await assert.rejects(first);
assert.equal(await second, 'second');
assert.equal(firstAborted, true);
assert.equal(observedSignals.length, 2);
assert.equal(observedSignals[0].aborted, true);
assert.equal(owner.isActive(), false);

const simpleFetch = async (_input, init) => new Response('{}', { headers: { 'content-type': 'application/json' } });
const deadlineOwner = createNetworkRequestOwnerV1(simpleFetch);
const deadline = new AbortController();
const deadlineRun = deadlineOwner.run(
  NETWORK_ENDPOINT,
  { method: 'GET', signal: deadline.signal },
  waitForAbort,
);
await new Promise((resolve) => setTimeout(resolve, 0));
deadline.abort('deadline');
await assert.rejects(deadlineRun);
assert.equal(deadlineOwner.isActive(), false);

const unmountOwner = createNetworkRequestOwnerV1(simpleFetch);
const unmountRun = unmountOwner.run(
  NETWORK_ENDPOINT,
  { method: 'GET' },
  waitForAbort,
);
await new Promise((resolve) => setTimeout(resolve, 0));
unmountOwner.cancel('network route left');
await assert.rejects(unmountRun);
assert.equal(unmountOwner.isActive(), false);

assert.equal(walletSource.split("import './network-live.js';").length - 1, 1);
assert.equal(NETWORK_ENDPOINT, '/__void/ui/wave2/home.json');

for (const marker of [
  "method: 'GET'",
  "cache: 'no-store'",
  "credentials: 'omit'",
  "redirect: 'error'",
  "mode: 'same-origin'",
  "referrerPolicy: 'no-referrer'",
  'AbortSignal.timeout(5000)',
  'MAX_NETWORK_RESPONSE_BYTES = 128 * 1024',
  'createNetworkRequestOwnerV1',
  "clearNetworkEvidence('HOLD')",
  "networkRequestOwner.cancel('network route left')",
  'No cached or inferred topology is shown while fresh evidence is loading.',
  'Remote machine state is not inferred',
  'No remote peer identity is inferred',
  'new MutationObserver',
]) {
  assert.ok(networkSource.includes(marker), `missing network boundary marker: ${marker}`);
}

for (const forbidden of [
  'const number = Number(value)',
  "addEventListener('hashchange'",
  'method: \'POST\'',
  'method: "POST"',
  'window.ethereum',
  'eth_sendTransaction',
  'eth_sendRawTransaction',
  'personal_sign',
  'wallet_requestPermissions',
  '/p2p/connect',
  '/p2p/dial',
  '/p2p/disconnect',
  '/validator/submit',
  '/stake/lock',
  '/wallet/send',
  '1,856,587',
  '1856587',
]) {
  assert.ok(!networkSource.includes(forbidden), `forbidden network marker remains: ${forbidden}`);
}

console.log('VOID_APP_NETWORK_READONLY_V1_PROOF_GREEN');
console.log('same_origin_get_only=1');
console.log('bounded_response_bytes=131072');
console.log('one_active_request=1');
console.log('superseded_request_aborted=1');
console.log('unmount_request_aborted=1');
console.log('stale_evidence_withheld_while_loading=1');
console.log('strict_nested_numeric_evidence=1');
console.log('source_adapter=wave2_home_readonly_v1');
console.log('remote_machine_state_inferred=0');
console.log('peer_identity_inferred=0');
console.log('operator_mutation=0');
console.log('money_movement=0');
