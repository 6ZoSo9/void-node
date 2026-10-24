import fs from 'node:fs';

const marker = 'VOID_PUBLIC_NODE_CONNECT_PACK_V1';
const green = 'VOID_PUBLIC_NODE_CONNECT_PACK_V1_GREEN';

const paths = {
  doc: 'docs/public/public-node-connect-pack-v1.md',
  json: 'public/public-node/connect/public-node-connect-pack-v1.json',
  html: 'public/public-node/connect/public-node-connect-pack-v1.html'
};

for (const p of Object.values(paths)) {
  if (!fs.existsSync(p)) throw new Error(`missing ${p}`);
}

const doc = fs.readFileSync(paths.doc, 'utf8');
const data = JSON.parse(fs.readFileSync(paths.json, 'utf8'));
const html = fs.readFileSync(paths.html, 'utf8');

if (data.marker !== marker) throw new Error('marker mismatch');
if (data.expected_green_marker !== green) throw new Error('green marker mismatch');
if (data.status !== 'connect_pack_ready') throw new Error('status mismatch');
if (data.chain_id !== 2050) throw new Error('chain id mismatch');
if (data.example_commands?.dial_peer !== "curl --fail-with-body --silent --show-error -X POST -H 'content-type: application/json' --data '{\"addr\":\"<PEER_HOST>:<PEER_P2P_PORT>\"}' http://127.0.0.1:4100/p2p/dial | jq .") throw new Error('dial command mismatch');
if (data.example_commands?.verify_peers !== "curl -fsS http://127.0.0.1:4100/p2p/peers | jq .") throw new Error('peer command mismatch');
if (!data.operator_flow?.includes('Verify local /p2p/peers.')) throw new Error('operator flow peer route mismatch');
if (!data.operator_flow?.some(step => step.includes('may update local peer state'))) throw new Error('operator flow dial side effect missing');
if (!data.operator_flow?.some(step => step.includes('not proof that the peer connected'))) throw new Error('operator flow acceptance semantics missing');
if (!data.operator_flow?.some(step => step.includes('do not retry blindly'))) throw new Error('operator flow rejection guidance missing');
if (!data.dial_outcomes?.accepted?.includes('does not prove')) throw new Error('accepted outcome mismatch');
if (!data.dial_outcomes?.rejected?.includes('before retrying')) throw new Error('rejected outcome mismatch');
if (!data.dial_outcomes?.connection_verification?.includes('/p2p/peers')) throw new Error('connection verification mismatch');
if (!data.safe_evidence?.includes('local /p2p/peers output')) throw new Error('safe evidence peer route mismatch');

for (const route of [
  '/__void/public-bootstrap.json',
  '/bootstrap/network.json',
  '/bootstrap/peers.json',
  '/p2p/peers',
  '/public-node/connect',
  '/public-node/connect/public-node-connect-pack-v1.json',
  '/public-node/connect/public-node-connect-pack-v1.html'
]) {
  if (!JSON.stringify(data).includes(route)) throw new Error(`json missing route ${route}`);
}

for (const [k, want] of Object.entries({
  read_only: false,
  public_routes_only: true,
  operator_guidance_only: true,
  automatic_peer_dial_enabled_by_this_pack: false,
  mutation_route_enabled: true,
  wallet_send_enabled: false,
  money_movement_enabled: false,
  buy_void_fulfillment_enabled: false,
  wc_to_void_swap_enabled: false,
  validator_mutation_enabled: false,
  validator_admission_enabled: false,
  public_wc_self_serve_earning_enabled: false,
  public_internet_mesh_claim: false
})) {
  if (data.boundary?.[k] !== want) throw new Error(`boundary ${k} expected ${want}, got ${data.boundary?.[k]}`);
}

for (const [surfaceName, surface] of Object.entries({ doc, html, json: JSON.stringify(data) })) {
  if (surface.includes('127.0.0.1:4100/peers')) throw new Error(`${surfaceName} retains obsolete peer command`);
}

for (const needle of [
  marker,
  'p2p/dial',
  'bootstrap/peers.json',
  '/p2p/peers',
  'not validator admission',
  'public internet mesh claim'
]) {
  if (!doc.includes(needle)) throw new Error(`doc missing ${needle}`);
  if (!html.includes(needle)) throw new Error(`html missing ${needle}`);
}

console.log(green);
