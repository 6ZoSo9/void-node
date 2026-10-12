import fs from 'node:fs';

const green = 'VOID_PUBLIC_NODE_OPERATOR_HANDOFF_PACKET_CLOSEOUT_V1_GREEN';

const markers = {
  handoffPacket: 'VOID_PUBLIC_NODE_OPERATOR_HANDOFF_PACKET_V1',
  handoffPacketGreen: 'VOID_PUBLIC_NODE_OPERATOR_HANDOFF_PACKET_V1_GREEN',
  handoffPacketIndexRouteGreen: 'VOID_PUBLIC_NODE_OPERATOR_HANDOFF_PACKET_INDEX_ROUTE_V1_GREEN',
  statusRollup: 'VOID_PUBLIC_NODE_OPERATOR_STATUS_ROLLUP_V1',
  statusRollupCloseoutGreen: 'VOID_PUBLIC_NODE_OPERATOR_STATUS_ROLLUP_CLOSEOUT_V1_GREEN',
  quickstart: 'VOID_PUBLIC_NODE_OPERATOR_QUICKSTART_V1',
  quickstartCloseoutGreen: 'VOID_PUBLIC_NODE_OPERATOR_QUICKSTART_CLOSEOUT_V1_GREEN',
  connectLaneCloseoutGreen: 'VOID_PUBLIC_NODE_CONNECT_LANE_CLOSEOUT_V1_GREEN',
  connectPack: 'VOID_PUBLIC_NODE_CONNECT_PACK_V1',
  receiptTemplate: 'VOID_PUBLIC_NODE_CONNECT_RECEIPT_TEMPLATE_V1',
  bootstrap: 'VOID_PUBLIC_BOOTSTRAP_GATEWAY_V1'
};

const routes = {
  handoffPage: '/public-node/operator-handoff-packet-v1',
  handoffJson: '/public-node/public-node-operator-handoff-packet-v1.json',
  handoffHtml: '/public-node/public-node-operator-handoff-packet-v1.html',
  statusRollupPage: '/public-node/operator-status-rollup-v1',
  statusRollupJson: '/public-node/public-node-operator-status-rollup-v1.json',
  quickstartPage: '/public-node/operator-quickstart-v1',
  quickstartJson: '/public-node/public-node-operator-quickstart-v1.json',
  connectPack: '/public-node/connect',
  connectPackJson: '/public-node/connect/public-node-connect-pack-v1.json',
  receiptTemplate: '/public-node/connect/receipt-template-v1',
  receiptTemplateJson: '/public-node/connect/public-node-connect-receipt-template-v1.json',
  bootstrapPublic: '/__void/public-bootstrap.json',
  bootstrapPeers: '/bootstrap/peers.json'
};

const files = {
  root: 'public/public-node/index.json',
  handoffDoc: 'docs/public/public-node-operator-handoff-packet-v1.md',
  handoffPage: 'public/public-node/operator-handoff-packet-v1.html',
  handoffJson: 'public/public-node/public-node-operator-handoff-packet-v1.json',
  handoffHtml: 'public/public-node/public-node-operator-handoff-packet-v1.html',
  statusRollupJson: 'public/public-node/public-node-operator-status-rollup-v1.json',
  quickstartJson: 'public/public-node/public-node-operator-quickstart-v1.json',
  connectPackJson: 'public/public-node/connect/public-node-connect-pack-v1.json',
  receiptTemplateJson: 'public/public-node/connect/public-node-connect-receipt-template-v1.json',
  bootstrapDoc: 'docs/public/public-bootstrap-gateway.md',
  routeSource: 'src/local-multibox-runtime-route-v1.ts',

  proofHandoffPacket: 'tools/proof-public-node-operator-handoff-packet-v1.mjs',
  proofHandoffPacketIndexRoute: 'tools/proof-public-node-operator-handoff-packet-index-route-v1.mjs',
  proofStatusRollupCloseout: 'tools/proof-public-node-operator-status-rollup-closeout-v1.mjs',
  proofStatusRollup: 'tools/proof-public-node-operator-status-rollup-v1.mjs',
  proofStatusRollupIndexRoute: 'tools/proof-public-node-operator-status-rollup-index-route-v1.mjs',
  proofQuickstartCloseout: 'tools/proof-public-node-operator-quickstart-closeout-v1.mjs',
  proofQuickstart: 'tools/proof-public-node-operator-quickstart-v1.mjs',
  proofQuickstartIndexRoute: 'tools/proof-public-node-operator-quickstart-index-route-v1.mjs',
  proofConnectLaneCloseout: 'tools/proof-public-node-connect-lane-closeout-v1.mjs',
  proofReceiptTemplate: 'tools/proof-public-node-connect-receipt-template-v1.mjs',
  proofReceiptTemplateIndexRoute: 'tools/proof-public-node-connect-receipt-template-index-route-v1.mjs',
  proofConnectPackCloseout: 'tools/proof-public-node-connect-pack-closeout-v1.mjs',
  proofConnectPack: 'tools/proof-public-node-connect-pack-v1.mjs',
  proofConnectPackIndexRoute: 'tools/proof-public-node-connect-pack-index-route-v1.mjs',
  proofNimoCloseout: 'tools/proof-local-multibox-nimo-rejoin-final-closeout-audit-v1.mjs',
  proofRuntimeRoute: 'tools/proof-local-multibox-runtime-route-v1.mjs'
};

function read(path) {
  if (!fs.existsSync(path)) throw new Error(`missing file ${path}`);
  return fs.readFileSync(path, 'utf8');
}

const rootText = read(files.root);
const root = JSON.parse(rootText);
const handoffText = read(files.handoffJson);
const handoff = JSON.parse(handoffText);
const handoffDoc = read(files.handoffDoc);
const handoffPage = read(files.handoffPage);
const handoffHtml = read(files.handoffHtml);
const statusRollupText = read(files.statusRollupJson);
const quickstartText = read(files.quickstartJson);
const connectPackText = read(files.connectPackJson);
const receiptTemplateText = read(files.receiptTemplateJson);
const bootstrapDoc = read(files.bootstrapDoc);
const routeSource = read(files.routeSource);

if (handoff.schema !== 'void.public_node.operator_handoff_packet.v1') throw new Error('bad handoff schema');
if (handoff.marker !== markers.handoffPacket) throw new Error('bad handoff marker');
if (handoff.status !== 'operator_handoff_packet_ready') throw new Error('bad handoff status');
if (handoff.expected_green_marker !== markers.handoffPacketGreen) throw new Error('bad handoff expected green marker');

if (root.links?.public_node_operator_handoff_packet !== routes.handoffPage) throw new Error('root missing handoff page link');
if (root.links?.public_node_operator_handoff_packet_json !== routes.handoffJson) throw new Error('root missing handoff json link');
if (root.links?.public_node_operator_handoff_packet_html !== routes.handoffHtml) throw new Error('root missing handoff html link');
if (root.route_markers?.public_node_operator_handoff_packet !== markers.handoffPacket) throw new Error('root missing handoff route marker');
if (root.public_node_operator_handoff_packet?.marker !== markers.handoffPacket) throw new Error('root handoff marker mismatch');
if (root.public_node_operator_handoff_packet?.status !== 'operator_handoff_packet_ready') throw new Error('root handoff status mismatch');
if (root.public_node_operator_handoff_packet?.expected_green_marker !== markers.handoffPacketIndexRouteGreen) throw new Error('root handoff expected index-route green mismatch');

for (const route of [routes.handoffPage, routes.handoffJson, routes.handoffHtml]) {
  if (!rootText.includes(route)) throw new Error(`root missing handoff route ${route}`);
  if (!routeSource.includes(route)) throw new Error(`route source missing handoff route ${route}`);
}

for (const needle of [
  'publicNodeOperatorHandoffPacketPageRoute',
  'publicNodeOperatorHandoffPacketJsonRoute',
  'publicNodeOperatorHandoffPacketHtmlRoute',
  'publicNodeOperatorHandoffPacketPagePath',
  'publicNodeOperatorHandoffPacketJsonPath',
  'publicNodeOperatorHandoffPacketHtmlPath',
  'app.get(publicNodeOperatorHandoffPacketPageRoute',
  'app.get(publicNodeOperatorHandoffPacketJsonRoute',
  'app.get(publicNodeOperatorHandoffPacketHtmlRoute'
]) {
  if (!routeSource.includes(needle)) throw new Error(`route source missing ${needle}`);
}

const surfaceText = [
  rootText,
  handoffText,
  handoffDoc,
  handoffPage,
  handoffHtml,
  statusRollupText,
  quickstartText,
  connectPackText,
  receiptTemplateText,
  bootstrapDoc,
  routeSource
].join('\n');

for (const route of Object.values(routes)) {
  if (!surfaceText.includes(route)) throw new Error(`missing route binding ${route}`);
}

for (const marker of [
  markers.handoffPacket,
  markers.statusRollup,
  markers.statusRollupCloseoutGreen,
  markers.quickstart,
  markers.quickstartCloseoutGreen,
  markers.connectLaneCloseoutGreen,
  markers.connectPack,
  markers.receiptTemplate,
  markers.bootstrap
]) {
  if (!surfaceText.includes(marker)) throw new Error(`missing surface marker binding ${marker}`);
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
  if (handoff.boundary?.[key] !== expected) throw new Error(`bad handoff boundary ${key}`);
  if (root.public_node_operator_handoff_packet?.boundary?.[key] !== expected) throw new Error(`bad root handoff boundary ${key}`);
}

const lower = surfaceText.toLowerCase();
for (const phrase of [
  'not automatic peer dialing',
  'not mutation route enablement',
  'not wallet send enablement',
  'not money movement',
  'not buy void fulfillment',
  'not wc to void settlement',
  'not validator mutation',
  'not public work credit self-serve earning',
  'not work credit claim creation',
  'not a public internet mesh claim',
  'do not share private keys'
]) {
  if (!lower.includes(phrase)) throw new Error(`missing safety phrase ${phrase}`);
}

for (const proofFile of [
  files.proofHandoffPacket,
  files.proofHandoffPacketIndexRoute,
  files.proofStatusRollupCloseout,
  files.proofStatusRollup,
  files.proofStatusRollupIndexRoute,
  files.proofQuickstartCloseout,
  files.proofQuickstart,
  files.proofQuickstartIndexRoute,
  files.proofConnectLaneCloseout,
  files.proofReceiptTemplate,
  files.proofReceiptTemplateIndexRoute,
  files.proofConnectPackCloseout,
  files.proofConnectPack,
  files.proofConnectPackIndexRoute,
  files.proofNimoCloseout,
  files.proofRuntimeRoute
]) {
  if (!fs.existsSync(proofFile)) throw new Error(`missing proof file ${proofFile}`);
  if (!proofFile.startsWith('tools/proof-')) throw new Error(`unexpected proof path ${proofFile}`);
}

const proofText = [
  read(files.proofHandoffPacket),
  read(files.proofHandoffPacketIndexRoute),
  read(files.proofStatusRollupCloseout),
  read(files.proofStatusRollup),
  read(files.proofStatusRollupIndexRoute),
  read(files.proofQuickstartCloseout),
  read(files.proofQuickstart),
  read(files.proofQuickstartIndexRoute),
  read(files.proofConnectLaneCloseout),
  read(files.proofReceiptTemplate),
  read(files.proofReceiptTemplateIndexRoute),
  read(files.proofConnectPackCloseout),
  read(files.proofConnectPack),
  read(files.proofConnectPackIndexRoute),
  read(files.proofRuntimeRoute)
].join('\n');

for (const marker of [
  markers.handoffPacketGreen,
  markers.handoffPacketIndexRouteGreen,
  markers.statusRollupCloseoutGreen,
  markers.quickstartCloseoutGreen,
  markers.connectLaneCloseoutGreen
]) {
  if (!proofText.includes(marker) && !surfaceText.includes(marker)) throw new Error(`missing proof marker binding ${marker}`);
}

console.log(green);
