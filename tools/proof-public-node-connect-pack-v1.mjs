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

for (const route of [
  '/__void/public-bootstrap.json',
  '/bootstrap/network.json',
  '/bootstrap/peers.json',
  '/public-node/connect',
  '/public-node/connect/public-node-connect-pack-v1.json',
  '/public-node/connect/public-node-connect-pack-v1.html'
]) {
  if (!JSON.stringify(data).includes(route)) throw new Error(`json missing route ${route}`);
}

for (const [k, want] of Object.entries({
  read_only: true,
  public_routes_only: true,
  operator_guidance_only: true,
  automatic_peer_dial_enabled_by_this_pack: false,
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
  if (data.boundary?.[k] !== want) throw new Error(`boundary ${k} expected ${want}, got ${data.boundary?.[k]}`);
}

for (const needle of [
  marker,
  'p2p/dial',
  'bootstrap/peers.json',
  'not validator admission',
  'public internet mesh claim'
]) {
  if (!doc.includes(needle)) throw new Error(`doc missing ${needle}`);
  if (!html.includes(needle)) throw new Error(`html missing ${needle}`);
}

console.log(green);
