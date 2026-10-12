import fs from 'node:fs';

const marker = 'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_EXAMPLE_V1';
const green = 'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_EXAMPLE_INDEX_ROUTE_V1_GREEN';

const routes = {
  page: '/public-node/operator-receipt-example-v1',
  json: '/public-node/public-node-operator-receipt-example-v1.json',
  html: '/public-node/public-node-operator-receipt-example-v1.html',
  handoffPacket: '/public-node/operator-handoff-packet-v1',
  handoffPacketJson: '/public-node/public-node-operator-handoff-packet-v1.json',
  receiptTemplate: '/public-node/connect/receipt-template-v1',
  receiptTemplateJson: '/public-node/connect/public-node-connect-receipt-template-v1.json',
  statusRollup: '/public-node/operator-status-rollup-v1',
  quickstart: '/public-node/operator-quickstart-v1',
  connectPack: '/public-node/connect',
  bootstrapPublic: '/__void/public-bootstrap.json',
  bootstrapPeers: '/bootstrap/peers.json'
};

const files = {
  root: 'public/public-node/index.json',
  receiptExampleDoc: 'docs/public/public-node-operator-receipt-example-v1.md',
  receiptExampleJson: 'public/public-node/public-node-operator-receipt-example-v1.json',
  receiptExampleHtml: 'public/public-node/public-node-operator-receipt-example-v1.html',
  receiptExamplePage: 'public/public-node/operator-receipt-example-v1.html',
  routeSource: 'src/local-multibox-runtime-route-v1.ts',
  proofReceiptExample: 'tools/proof-public-node-operator-receipt-example-v1.mjs',
  proofHandoffCloseout: 'tools/proof-public-node-operator-handoff-packet-closeout-v1.mjs',
  proofHandoffPacket: 'tools/proof-public-node-operator-handoff-packet-v1.mjs',
  proofHandoffPacketIndexRoute: 'tools/proof-public-node-operator-handoff-packet-index-route-v1.mjs',
  proofReceiptTemplate: 'tools/proof-public-node-connect-receipt-template-v1.mjs',
  proofRuntimeRoute: 'tools/proof-local-multibox-runtime-route-v1.mjs'
};

function read(path) {
  if (!fs.existsSync(path)) throw new Error(`missing file ${path}`);
  return fs.readFileSync(path, 'utf8');
}

const rootText = read(files.root);
const root = JSON.parse(rootText);
const receiptText = read(files.receiptExampleJson);
const receipt = JSON.parse(receiptText);
const routeSource = read(files.routeSource);
const doc = read(files.receiptExampleDoc);
const html = read(files.receiptExampleHtml);
const page = read(files.receiptExamplePage);
const proofText = [
  read(files.proofReceiptExample),
  read(files.proofHandoffCloseout),
  read(files.proofHandoffPacket),
  read(files.proofHandoffPacketIndexRoute),
  read(files.proofReceiptTemplate),
  read(files.proofRuntimeRoute)
].join('\n');

if (receipt.marker !== marker) throw new Error('receipt example marker mismatch');
if (receipt.status !== 'operator_receipt_example_ready') throw new Error('receipt example status mismatch');

for (const route of [routes.page, routes.json, routes.html]) {
  if (!rootText.includes(route)) throw new Error(`root missing receipt example route ${route}`);
}

for (const route of Object.values(routes)) {
  if (![doc, receiptText, html, page].some((text) => text.includes(route))) {
    throw new Error(`receipt example surfaces missing route ${route}`);
  }
}

if (root.links?.public_node_operator_receipt_example !== routes.page) throw new Error('root receipt example page link mismatch');
if (root.links?.public_node_operator_receipt_example_json !== routes.json) throw new Error('root receipt example json link mismatch');
if (root.links?.public_node_operator_receipt_example_html !== routes.html) throw new Error('root receipt example html link mismatch');
if (root.route_markers?.public_node_operator_receipt_example !== marker) throw new Error('root route marker mismatch');
if (root.public_node_operator_receipt_example?.marker !== marker) throw new Error('root object marker mismatch');
if (root.public_node_operator_receipt_example?.status !== 'operator_receipt_example_ready') throw new Error('root object status mismatch');
if (root.public_node_operator_receipt_example?.expected_green_marker !== green) throw new Error('root expected green mismatch');

for (const route of [routes.page, routes.json, routes.html]) {
  if (!routeSource.includes(route)) throw new Error(`route source missing ${route}`);
}

for (const needle of [
  'publicNodeOperatorReceiptExamplePageRoute',
  'publicNodeOperatorReceiptExampleJsonRoute',
  'publicNodeOperatorReceiptExampleHtmlRoute',
  'public-node-operator-receipt-example-v1.json',
  'public-node-operator-receipt-example-v1.html',
  'operator-receipt-example-v1.html',
  'app.get(publicNodeOperatorReceiptExamplePageRoute',
  'app.get(publicNodeOperatorReceiptExampleJsonRoute',
  'app.get(publicNodeOperatorReceiptExampleHtmlRoute'
]) {
  if (!routeSource.includes(needle)) throw new Error(`route source missing ${needle}`);
}

for (const m of [
  marker,
  'VOID_PUBLIC_NODE_OPERATOR_HANDOFF_PACKET_V1',
  'VOID_PUBLIC_NODE_OPERATOR_HANDOFF_PACKET_CLOSEOUT_V1_GREEN',
  'VOID_PUBLIC_NODE_CONNECT_RECEIPT_TEMPLATE_V1',
  'VOID_PUBLIC_NODE_OPERATOR_STATUS_ROLLUP_V1',
  'VOID_PUBLIC_NODE_OPERATOR_QUICKSTART_V1',
  'VOID_PUBLIC_NODE_CONNECT_PACK_V1',
  'VOID_PUBLIC_BOOTSTRAP_GATEWAY_V1'
]) {
  if (![rootText, receiptText, doc, html, page, proofText].join('\n').includes(m)) {
    throw new Error(`missing marker binding ${m}`);
  }
}

for (const [key, expected] of Object.entries({
  read_only: true,
  public_routes_only: true,
  operator_receipt_example_only: true,
  receipt_example_only: true,
  operator_guidance_only: true,
  example_creates_no_receipt: true,
  automatic_peer_dial_enabled_by_this_example: false,
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
  if (root.public_node_operator_receipt_example.boundary[key] !== expected) throw new Error(`bad root boundary ${key}`);
  if (receipt.boundary[key] !== expected) throw new Error(`bad receipt example boundary ${key}`);
}

console.log(green);
