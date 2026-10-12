import fs from 'node:fs';

const marker = 'VOID_PUBLIC_NODE_OPERATOR_HANDOFF_PACKET_V1';
const green = 'VOID_PUBLIC_NODE_OPERATOR_HANDOFF_PACKET_INDEX_ROUTE_V1_GREEN';

const routes = {
  page: '/public-node/operator-handoff-packet-v1',
  json: '/public-node/public-node-operator-handoff-packet-v1.json',
  html: '/public-node/public-node-operator-handoff-packet-v1.html',
  statusRollup: '/public-node/operator-status-rollup-v1',
  quickstart: '/public-node/operator-quickstart-v1',
  connectPack: '/public-node/connect',
  receiptTemplate: '/public-node/connect/receipt-template-v1',
  bootstrapPublic: '/__void/public-bootstrap.json',
  bootstrapPeers: '/bootstrap/peers.json'
};

const files = {
  root: 'public/public-node/index.json',
  packetDoc: 'docs/public/public-node-operator-handoff-packet-v1.md',
  packetJson: 'public/public-node/public-node-operator-handoff-packet-v1.json',
  packetHtml: 'public/public-node/public-node-operator-handoff-packet-v1.html',
  packetPage: 'public/public-node/operator-handoff-packet-v1.html',
  routeSource: 'src/local-multibox-runtime-route-v1.ts',
  proofPacket: 'tools/proof-public-node-operator-handoff-packet-v1.mjs',
  proofStatusRollupCloseout: 'tools/proof-public-node-operator-status-rollup-closeout-v1.mjs',
  proofStatusRollup: 'tools/proof-public-node-operator-status-rollup-v1.mjs',
  proofStatusRollupIndexRoute: 'tools/proof-public-node-operator-status-rollup-index-route-v1.mjs',
  proofRuntimeRoute: 'tools/proof-local-multibox-runtime-route-v1.mjs'
};

function read(path) {
  if (!fs.existsSync(path)) throw new Error(`missing file ${path}`);
  return fs.readFileSync(path, 'utf8');
}

const rootText = read(files.root);
const root = JSON.parse(rootText);
const packetText = read(files.packetJson);
const packet = JSON.parse(packetText);
const routeSource = read(files.routeSource);
const doc = read(files.packetDoc);
const html = read(files.packetHtml);
const page = read(files.packetPage);
const proofText = [
  read(files.proofPacket),
  read(files.proofStatusRollupCloseout),
  read(files.proofStatusRollup),
  read(files.proofStatusRollupIndexRoute),
  read(files.proofRuntimeRoute)
].join('\n');

if (packet.marker !== marker) throw new Error('packet marker mismatch');
if (packet.status !== 'operator_handoff_packet_ready') throw new Error('packet status mismatch');

for (const route of [routes.page, routes.json, routes.html]) {
  if (!rootText.includes(route)) throw new Error(`root missing handoff route ${route}`);
}

for (const route of Object.values(routes)) {
  if (![doc, packetText, html, page].some((text) => text.includes(route))) {
    throw new Error(`packet surfaces missing route ${route}`);
  }
}

if (root.links?.public_node_operator_handoff_packet !== routes.page) throw new Error('root handoff page link mismatch');
if (root.links?.public_node_operator_handoff_packet_json !== routes.json) throw new Error('root handoff json link mismatch');
if (root.links?.public_node_operator_handoff_packet_html !== routes.html) throw new Error('root handoff html link mismatch');
if (root.route_markers?.public_node_operator_handoff_packet !== marker) throw new Error('root route marker mismatch');
if (root.public_node_operator_handoff_packet?.marker !== marker) throw new Error('root object marker mismatch');
if (root.public_node_operator_handoff_packet?.status !== 'operator_handoff_packet_ready') throw new Error('root object status mismatch');
if (root.public_node_operator_handoff_packet?.expected_green_marker !== green) throw new Error('root expected green mismatch');

for (const route of [routes.page, routes.json, routes.html]) {
  if (!routeSource.includes(route)) throw new Error(`route source missing ${route}`);
}

for (const needle of [
  'publicNodeOperatorHandoffPacketPageRoute',
  'publicNodeOperatorHandoffPacketJsonRoute',
  'publicNodeOperatorHandoffPacketHtmlRoute',
  'public-node-operator-handoff-packet-v1.json',
  'public-node-operator-handoff-packet-v1.html',
  'operator-handoff-packet-v1.html'
]) {
  if (!routeSource.includes(needle)) throw new Error(`route source missing ${needle}`);
}

for (const m of [
  marker,
  'VOID_PUBLIC_NODE_OPERATOR_STATUS_ROLLUP_V1',
  'VOID_PUBLIC_NODE_OPERATOR_STATUS_ROLLUP_CLOSEOUT_V1_GREEN',
  'VOID_PUBLIC_NODE_OPERATOR_QUICKSTART_V1',
  'VOID_PUBLIC_NODE_CONNECT_LANE_CLOSEOUT_V1_GREEN',
  'VOID_PUBLIC_NODE_CONNECT_PACK_V1',
  'VOID_PUBLIC_NODE_CONNECT_RECEIPT_TEMPLATE_V1',
  'VOID_PUBLIC_BOOTSTRAP_GATEWAY_V1'
]) {
  if (![rootText, packetText, doc, html, page, proofText].join('\n').includes(m)) {
    throw new Error(`missing marker binding ${m}`);
  }
}

for (const [key, expected] of Object.entries({
  read_only: true,
  public_routes_only: true,
  operator_handoff_packet_only: true,
  operator_guidance_only: true,
  automatic_peer_dial_enabled_by_this_packet: false,
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
  if (root.public_node_operator_handoff_packet.boundary[key] !== expected) throw new Error(`bad root boundary ${key}`);
  if (packet.boundary[key] !== expected) throw new Error(`bad packet boundary ${key}`);
}

console.log(green);
