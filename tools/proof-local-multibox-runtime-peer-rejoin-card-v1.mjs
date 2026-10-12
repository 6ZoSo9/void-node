import fs from 'node:fs';

const marker = 'VOID_LOCAL_MULTIBOX_RUNTIME_PEER_REJOIN_CARD_V1';
const green = 'VOID_LOCAL_MULTIBOX_RUNTIME_PEER_REJOIN_CARD_V1_GREEN';

const jsonPath = 'public/public-node/runtime/local-multibox-runtime-peer-rejoin-card-v1.json';
const htmlPath = 'public/public-node/runtime/local-multibox-runtime-peer-rejoin-card-v1.html';

if (!fs.existsSync(jsonPath)) throw new Error(`missing ${jsonPath}`);
if (!fs.existsSync(htmlPath)) throw new Error(`missing ${htmlPath}`);

const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const html = fs.readFileSync(htmlPath, 'utf8');

if (data.marker !== marker) throw new Error('marker mismatch');
if (data.expected_green_marker !== green) throw new Error('green marker mismatch');
if (data.status !== 'precision_to_nimo_p2p_rejoin_observed') throw new Error('bad status');

const boundary = data.boundary || {};
for (const [k, want] of Object.entries({
  read_only: true,
  public_routes_only: true,
  runtime_visibility_only: true,
  automatic_peer_dial_enabled_by_this_card: false,
  mutation_route_enabled: false,
  wallet_send_enabled: false,
  money_movement_enabled: false,
  buy_void_fulfillment_enabled: false,
  wc_to_void_swap_enabled: false,
  validator_mutation_enabled: false,
  validator_admission_enabled: false,
  public_wc_self_serve_earning_enabled: false,
  public_internet_mesh_claim: false
})) {
  if (boundary[k] !== want) throw new Error(`boundary ${k} expected ${want}, got ${boundary[k]}`);
}

const precision = data.nodes?.precision || {};
const nimo = data.nodes?.nimo || {};
if (precision.node_id !== '9d89483769e469e0473b489dc50dba96') throw new Error('precision node id mismatch');
if (nimo.node_id !== '042c8b22f14cf343139e9bc806937bf3') throw new Error('nimo node id mismatch');
if (nimo.p2p !== '192.168.1.99:4701') throw new Error('nimo p2p mismatch');
if (nimo.http_reachable_from_precision !== false) throw new Error('nimo http reachability must remain false');
if (nimo.ssh_reachable_from_precision !== false) throw new Error('nimo ssh reachability must remain false');

const connected = data.observed_peer_surface?.precision_peers_connected || [];
if (!connected.some((p) => p.id === nimo.node_id && p.addr === '192.168.1.99:4701' && p.outbound === true)) {
  throw new Error('connected peer evidence missing');
}

const known = data.observed_peer_surface?.known_addrs || [];
if (!known.includes('192.168.1.99:4701')) throw new Error('known addr missing nimo p2p');

const evidence = data.operator_evidence || {};
if (evidence.marker !== 'VOID_PRECISION_NIMO_P2P_REJOIN_GREEN_30S_V1') throw new Error('operator marker mismatch');
if (evidence.assert_marker !== 'VOID_PRECISION_NIMO_P2P_REJOIN_GREEN_30S_V1_ASSERT_OK') throw new Error('operator assert marker mismatch');
if (evidence.hold_seconds !== 30) throw new Error('hold seconds mismatch');

for (const needle of [
  marker,
  'precision_to_nimo_p2p_rejoin_observed',
  '042c8b22f14cf343139e9bc806937bf3',
  '192.168.1.99:4701',
  'local-multibox-runtime-peer-rejoin-card-v1.json'
]) {
  if (!html.includes(needle)) throw new Error(`html missing ${needle}`);
}

console.log(green);
