import fs from 'node:fs';

const marker = 'VOID_PUBLIC_NODE_CONNECT_RECEIPT_TEMPLATE_V1';
const green = 'VOID_PUBLIC_NODE_CONNECT_RECEIPT_TEMPLATE_V1_GREEN';

const files = {
  doc: 'docs/public/public-node-connect-receipt-template-v1.md',
  json: 'public/public-node/connect/public-node-connect-receipt-template-v1.json',
  html: 'public/public-node/connect/public-node-connect-receipt-template-v1.html',
  page: 'public/public-node/connect/receipt-template-v1.html',
  connectPack: 'public/public-node/connect/public-node-connect-pack-v1.json'
};

for (const file of Object.values(files)) {
  if (!fs.existsSync(file)) throw new Error(`missing ${file}`);
}

const doc = fs.readFileSync(files.doc, 'utf8');
const data = JSON.parse(fs.readFileSync(files.json, 'utf8'));
const html = fs.readFileSync(files.html, 'utf8');
const page = fs.readFileSync(files.page, 'utf8');
const connectPack = JSON.parse(fs.readFileSync(files.connectPack, 'utf8'));

if (data.marker !== marker) throw new Error('marker mismatch');
if (data.expected_green_marker !== green) throw new Error('green marker mismatch');
if (data.status !== 'receipt_template_ready') throw new Error('status mismatch');
if (data.pairs_with !== 'VOID_PUBLIC_NODE_CONNECT_PACK_V1') throw new Error('pairs_with mismatch');
if (connectPack.marker !== 'VOID_PUBLIC_NODE_CONNECT_PACK_V1') throw new Error('connect pack marker mismatch');

for (const [k, want] of Object.entries({
  read_only: true,
  public_routes_only: true,
  operator_guidance_only: true,
  receipt_template_only: true,
  automatic_peer_dial_enabled_by_this_template: false,
  mutation_route_enabled: false,
  wallet_send_enabled: false,
  money_movement_enabled: false,
  buy_void_fulfillment_enabled: false,
  wc_to_void_swap_enabled: false,
  validator_mutation_enabled: false,
  validator_admission_enabled: false,
  public_wc_self_serve_earning_enabled: false,
  work_credit_claim_created: false,
  public_internet_mesh_claim: false
})) {
  if (data.boundary?.[k] !== want) throw new Error(`boundary ${k} expected ${want}, got ${data.boundary?.[k]}`);
}

for (const needle of [
  marker,
  'node_id',
  'peer_address_dialed',
  'bootstrap_route_used',
  'Do not include',
  'not validator admission',
  'not a Work Credit claim',
  'public internet mesh claim'
]) {
  if (!doc.includes(needle)) throw new Error(`doc missing ${needle}`);
  if (!html.includes(needle)) throw new Error(`html missing ${needle}`);
  if (!page.includes(needle)) throw new Error(`page missing ${needle}`);
}

for (const route of [
  '/public-node/connect/receipt-template-v1',
  '/public-node/connect/public-node-connect-receipt-template-v1.json',
  '/public-node/connect/public-node-connect-receipt-template-v1.html',
  '/public-node/connect',
  '/public-node/connect/public-node-connect-pack-v1.json'
]) {
  if (!JSON.stringify(data).includes(route)) throw new Error(`json missing route ${route}`);
}

console.log(green);
