import fs from 'node:fs';

const marker = 'VOID_PUBLIC_NODE_OPERATOR_STATUS_ROLLUP_V1';
const green = 'VOID_PUBLIC_NODE_OPERATOR_STATUS_ROLLUP_V1_GREEN';

const files = {
  doc: 'docs/public/public-node-operator-status-rollup-v1.md',
  json: 'public/public-node/public-node-operator-status-rollup-v1.json',
  html: 'public/public-node/public-node-operator-status-rollup-v1.html',
  page: 'public/public-node/operator-status-rollup-v1.html',
  quickstart: 'public/public-node/public-node-operator-quickstart-v1.json',
  connectPack: 'public/public-node/connect/public-node-connect-pack-v1.json',
  receiptTemplate: 'public/public-node/connect/public-node-connect-receipt-template-v1.json',
  bootstrapDoc: 'docs/public/public-bootstrap-gateway.md',
  proofQuickstartCloseout: 'tools/proof-public-node-operator-quickstart-closeout-v1.mjs',
  proofConnectLaneCloseout: 'tools/proof-public-node-connect-lane-closeout-v1.mjs'
};

for (const file of Object.values(files)) {
  if (!fs.existsSync(file)) throw new Error(`missing ${file}`);
}

const read = file => fs.readFileSync(file, 'utf8');

const doc = read(files.doc);
const data = JSON.parse(read(files.json));
const html = read(files.html);
const page = read(files.page);
const quickstart = JSON.parse(read(files.quickstart));
const connectPack = JSON.parse(read(files.connectPack));
const receiptTemplate = JSON.parse(read(files.receiptTemplate));

if (data.marker !== marker) throw new Error('marker mismatch');
if (data.expected_green_marker !== green) throw new Error('green marker mismatch');
if (data.status !== 'operator_status_rollup_ready') throw new Error('status mismatch');

if (quickstart.marker !== 'VOID_PUBLIC_NODE_OPERATOR_QUICKSTART_V1') throw new Error('quickstart marker mismatch');
if (connectPack.marker !== 'VOID_PUBLIC_NODE_CONNECT_PACK_V1') throw new Error('connect pack marker mismatch');
if (receiptTemplate.marker !== 'VOID_PUBLIC_NODE_CONNECT_RECEIPT_TEMPLATE_V1') throw new Error('receipt template marker mismatch');
if (!read(files.bootstrapDoc).includes('VOID_PUBLIC_BOOTSTRAP_GATEWAY_V1')) throw new Error('bootstrap marker missing');
if (!read(files.proofQuickstartCloseout).includes('VOID_PUBLIC_NODE_OPERATOR_QUICKSTART_CLOSEOUT_V1_GREEN')) throw new Error('quickstart closeout marker missing');
if (!read(files.proofConnectLaneCloseout).includes('VOID_PUBLIC_NODE_CONNECT_LANE_CLOSEOUT_V1_GREEN')) throw new Error('connect lane closeout marker missing');

for (const name of ['operator_quickstart', 'connect_lane', 'connect_pack', 'receipt_template', 'bootstrap']) {
  const component = data.components.find(c => c.name === name);
  if (!component) throw new Error(`missing component ${name}`);
  if (component.status !== 'green') throw new Error(`component ${name} not green`);
}

for (const route of [
  '/public-node/operator-status-rollup-v1',
  '/public-node/public-node-operator-status-rollup-v1.json',
  '/public-node/public-node-operator-status-rollup-v1.html',
  '/public-node/operator-quickstart-v1',
  '/public-node/connect',
  '/public-node/connect/receipt-template-v1',
  '/__void/public-bootstrap.json',
  '/bootstrap/peers.json'
]) {
  if (!JSON.stringify(data).includes(route)) throw new Error(`json missing route ${route}`);
  if (!doc.includes(route)) throw new Error(`doc missing route ${route}`);
}

for (const [k, want] of Object.entries({
  read_only: true,
  public_routes_only: true,
  operator_status_visibility_only: true,
  automatic_peer_dial_enabled_by_this_rollup: false,
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

const docLower = doc.toLowerCase();
const htmlLower = html.toLowerCase();
const pageLower = page.toLowerCase();

for (const needle of [
  marker.toLowerCase(),
  'operator_status_rollup_ready',
  'not automatic peer dialing',
  'not work credit claim creation',
  'not a public internet mesh claim'
]) {
  if (!docLower.includes(needle)) throw new Error(`doc missing ${needle}`);
  if (!htmlLower.includes(needle)) throw new Error(`html missing ${needle}`);
  if (!pageLower.includes(needle)) throw new Error(`page missing ${needle}`);
}

console.log(green);
