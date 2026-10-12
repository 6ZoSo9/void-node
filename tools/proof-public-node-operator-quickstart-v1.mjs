import fs from 'node:fs';

const marker = 'VOID_PUBLIC_NODE_OPERATOR_QUICKSTART_V1';
const green = 'VOID_PUBLIC_NODE_OPERATOR_QUICKSTART_V1_GREEN';

const files = {
  doc: 'docs/public/public-node-operator-quickstart-v1.md',
  json: 'public/public-node/public-node-operator-quickstart-v1.json',
  html: 'public/public-node/public-node-operator-quickstart-v1.html',
  page: 'public/public-node/operator-quickstart-v1.html',
  connectPack: 'public/public-node/connect/public-node-connect-pack-v1.json',
  receiptTemplate: 'public/public-node/connect/public-node-connect-receipt-template-v1.json'
};

for (const file of Object.values(files)) {
  if (!fs.existsSync(file)) throw new Error(`missing ${file}`);
}

const doc = fs.readFileSync(files.doc, 'utf8');
const data = JSON.parse(fs.readFileSync(files.json, 'utf8'));
const html = fs.readFileSync(files.html, 'utf8');
const page = fs.readFileSync(files.page, 'utf8');
const connectPack = JSON.parse(fs.readFileSync(files.connectPack, 'utf8'));
const receiptTemplate = JSON.parse(fs.readFileSync(files.receiptTemplate, 'utf8'));

if (data.marker !== marker) throw new Error('marker mismatch');
if (data.expected_green_marker !== green) throw new Error('green marker mismatch');
if (data.status !== 'operator_quickstart_ready') throw new Error('status mismatch');
if (connectPack.marker !== 'VOID_PUBLIC_NODE_CONNECT_PACK_V1') throw new Error('connect pack marker mismatch');
if (receiptTemplate.marker !== 'VOID_PUBLIC_NODE_CONNECT_RECEIPT_TEMPLATE_V1') throw new Error('receipt template marker mismatch');

for (const [k, want] of Object.entries({
  read_only: true,
  public_routes_only: true,
  operator_guidance_only: true,
  quickstart_only: true,
  automatic_peer_dial_enabled_by_this_quickstart: false,
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

for (const route of [
  '/public-node/operator-quickstart-v1',
  '/public-node/public-node-operator-quickstart-v1.json',
  '/public-node/public-node-operator-quickstart-v1.html',
  '/__void/public-bootstrap.json',
  '/bootstrap/peers.json',
  '/public-node/connect',
  '/public-node/connect/public-node-connect-pack-v1.json',
  '/public-node/connect/receipt-template-v1',
  '/public-node/connect/public-node-connect-receipt-template-v1.json'
]) {
  if (!JSON.stringify(data).includes(route)) throw new Error(`json missing route ${route}`);
  if (!doc.includes(route)) throw new Error(`doc missing route ${route}`);
}

const docLower = doc.toLowerCase();
const htmlLower = html.toLowerCase();
const pageLower = page.toLowerCase();

for (const needle of [
  marker.toLowerCase(),
  'do not share private keys',
  'not automatic peer dialing',
  'not work credit claim creation',
  'not a public internet mesh claim'
]) {
  if (!docLower.includes(needle)) throw new Error(`doc missing ${needle}`);
  if (!htmlLower.includes(needle)) throw new Error(`html missing ${needle}`);
  if (!pageLower.includes(needle)) throw new Error(`page missing ${needle}`);
}

console.log(green);
