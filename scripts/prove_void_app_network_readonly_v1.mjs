import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  MAX_NETWORK_RESPONSE_BYTES,
  NETWORK_ENDPOINT,
  NETWORK_MARKER,
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
  generated_at: '2026-08-13T12:00:00.000Z',
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
    peers: { ok: true, status: 200, body: [{ nodeId: 'a'.repeat(32) }, { nodeId: 'b'.repeat(32) }] },
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
assert.equal(validated.marker, NETWORK_MARKER);
assert.equal(validated.network_name, 'Mainnet-0');
assert.equal(validated.network.chain_head, 1856587);
assert.equal(validated.network.peer_count, 2);
assert.equal(validated.network.expected_peer_count, 2);
assert.equal(validated.boundaries.operator_mutation, false);
assert.equal(validated.boundaries.money_movement, false);

const model = networkViewModelV1(validated);
assert.equal(model.ready, true);
assert.equal(model.chainAligned, true);
assert.equal(model.peerBaselineMet, true);
assert.equal(model.availableSources, 4);
assert.equal(model.totalSources, 4);
assert.equal(model.readinessHead, 1856587);
assert.equal(model.lastmileSeen, 1856587);
assert.equal(model.gap, 0);
assert.deepEqual(model.sourceStatuses, { health: 200, head: 200, peers: 200, ready: 200 });

const degraded = fixture();
degraded.network.health = 'degraded';
degraded.network.ready = false;
degraded.network.peer_count = 1;
degraded.sources.ready = { ok: true, status: 200, body: { ready: false, gap: 2, txroot_live: 1, reasons: ['catching_up'], head: 1856585, lastmile_seen: 1856585 } };
const degradedModel = networkViewModelV1(degraded);
assert.equal(degradedModel.ready, false);
assert.equal(degradedModel.chainAligned, false);
assert.equal(degradedModel.peerBaselineMet, false);

reject((value) => { value.unknown = true; });
reject((value) => { value.marker = 'WRONG'; });
reject((value) => { value.read_only = false; });
reject((value) => { value.network_name = 'mainnet'; });
reject((value) => { value.source_base = 'https://example.com'; });
reject((value) => { value.node.role = 'validator'; });
reject((value) => { value.network.expected_peer_count = 3; });
reject((value) => { value.network.peer_count = -1; });
reject((value) => { value.network.ready = false; });
reject((value) => { value.account.selected = true; });
reject((value) => { value.balances.available = true; });
reject((value) => { value.sources.health.extra = true; });
reject((value) => { value.sources.health.status = 700; });
reject((value) => { value.sources.peers.body = 'not-json-object-or-array'; });
reject((value) => { value.boundaries.operator_mutation = true; });
reject((value) => { value.boundaries.money_movement = true; });

const responseFor = (bytes) => new Response(
  new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  }),
  { headers: { 'content-type': 'application/json' } },
);

const encoded = new TextEncoder().encode(JSON.stringify(fixture()));
const parsed = await readBoundedNetworkJsonV1(responseFor(encoded));
assert.equal(parsed.marker, NETWORK_MARKER);
const tooLarge = new Uint8Array(MAX_NETWORK_RESPONSE_BYTES + 1);
await assert.rejects(() => readBoundedNetworkJsonV1(responseFor(tooLarge)), /exceeds byte limit/);
await assert.rejects(() => readBoundedNetworkJsonV1(new Response(null)), /not stream-readable/);
await assert.rejects(() => readBoundedNetworkJsonV1(responseFor(new TextEncoder().encode('{bad json'))), SyntaxError);

assert.equal(walletSource.split("import './network-live.js';").length - 1, 1);
assert.equal(NETWORK_ENDPOINT, '/__void/ui/wave2/home.json');
assert.match(networkSource, /method:\s*'GET'/);
assert.match(networkSource, /cache:\s*'no-store'/);
assert.match(networkSource, /credentials:\s*'omit'/);
assert.match(networkSource, /redirect:\s*'error'/);
assert.match(networkSource, /mode:\s*'same-origin'/);
assert.match(networkSource, /referrerPolicy:\s*'no-referrer'/);
assert.match(networkSource, /MAX_NETWORK_RESPONSE_BYTES\s*=\s*128\s*\*\s*1024/);
assert.match(networkSource, /data-network-live-view/);
assert.match(networkSource, /data-network-refresh/);
assert.match(networkSource, /Remote machine state is not inferred/);
assert.match(networkSource, /No remote peer identity is inferred/);
assert.match(networkSource, /new MutationObserver/);
assert.doesNotMatch(networkSource, /addEventListener\(['"]hashchange['"]/);
assert.doesNotMatch(networkSource, /method:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/);
assert.doesNotMatch(networkSource, /window\.ethereum|eth_sendTransaction|eth_sendRawTransaction|personal_sign|wallet_requestPermissions/);
assert.doesNotMatch(networkSource, /\/p2p\/(?:connect|dial|disconnect)|\/validator\/submit|\/stake\/lock|\/wallet\/send/);
assert.doesNotMatch(networkSource, /catch\s*(?:\([^)]*\))?\s*\{\s*\}/);
assert.doesNotMatch(networkSource, /1,856,587|1856587/);

console.log('VOID_APP_NETWORK_READONLY_V1_PROOF_GREEN');
console.log('same_origin_get_only=1');
console.log('bounded_response_bytes=131072');
console.log('source_adapter=wave2_home_readonly_v1');
console.log('live_source_count=4');
console.log('remote_machine_state_inferred=0');
console.log('peer_identity_inferred=0');
console.log('operator_mutation=0');
console.log('money_movement=0');
