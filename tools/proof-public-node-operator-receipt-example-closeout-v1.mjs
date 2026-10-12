import fs from 'node:fs';

const green = 'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_EXAMPLE_CLOSEOUT_V1_GREEN';

const markers = {
  receiptExample: 'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_EXAMPLE_V1',
  receiptExampleGreen: 'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_EXAMPLE_V1_GREEN',
  receiptExampleIndexRouteGreen: 'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_EXAMPLE_INDEX_ROUTE_V1_GREEN',
  handoffPacket: 'VOID_PUBLIC_NODE_OPERATOR_HANDOFF_PACKET_V1',
  handoffPacketCloseoutGreen: 'VOID_PUBLIC_NODE_OPERATOR_HANDOFF_PACKET_CLOSEOUT_V1_GREEN',
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
  receiptExamplePage: '/public-node/operator-receipt-example-v1',
  receiptExampleJson: '/public-node/public-node-operator-receipt-example-v1.json',
  receiptExampleHtml: '/public-node/public-node-operator-receipt-example-v1.html',
  handoffPage: '/public-node/operator-handoff-packet-v1',
  handoffJson: '/public-node/public-node-operator-handoff-packet-v1.json',
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
  receiptDoc: 'docs/public/public-node-operator-receipt-example-v1.md',
  receiptPage: 'public/public-node/operator-receipt-example-v1.html',
  receiptJson: 'public/public-node/public-node-operator-receipt-example-v1.json',
  receiptHtml: 'public/public-node/public-node-operator-receipt-example-v1.html',
  handoffJson: 'public/public-node/public-node-operator-handoff-packet-v1.json',
  statusRollupJson: 'public/public-node/public-node-operator-status-rollup-v1.json',
  quickstartJson: 'public/public-node/public-node-operator-quickstart-v1.json',
  connectPackJson: 'public/public-node/connect/public-node-connect-pack-v1.json',
  receiptTemplateJson: 'public/public-node/connect/public-node-connect-receipt-template-v1.json',
  bootstrapDoc: 'docs/public/public-bootstrap-gateway.md',
  routeSource: 'src/local-multibox-runtime-route-v1.ts',

  proofReceiptExample: 'tools/proof-public-node-operator-receipt-example-v1.mjs',
  proofReceiptExampleIndexRoute: 'tools/proof-public-node-operator-receipt-example-index-route-v1.mjs',
  proofHandoffCloseout: 'tools/proof-public-node-operator-handoff-packet-closeout-v1.mjs',
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
const receiptText = read(files.receiptJson);
const receipt = JSON.parse(receiptText);
const receiptDoc = read(files.receiptDoc);
const receiptPage = read(files.receiptPage);
const receiptHtml = read(files.receiptHtml);
const handoffText = read(files.handoffJson);
const statusRollupText = read(files.statusRollupJson);
const quickstartText = read(files.quickstartJson);
const connectPackText = read(files.connectPackJson);
const receiptTemplateText = read(files.receiptTemplateJson);
const bootstrapDoc = read(files.bootstrapDoc);
const routeSource = read(files.routeSource);

if (receipt.schema !== 'void.public_node.operator_receipt_example.v1') throw new Error('bad receipt example schema');
if (receipt.marker !== markers.receiptExample) throw new Error('bad receipt example marker');
if (receipt.status !== 'operator_receipt_example_ready') throw new Error('bad receipt example status');
if (receipt.expected_green_marker !== markers.receiptExampleGreen) throw new Error('bad receipt example expected green marker');

if (receipt.example_receipt?.example_only !== true) throw new Error('example receipt is not example_only');
if (receipt.example_receipt?.private_material_included !== false) throw new Error('example includes private material');
if (receipt.example_receipt?.money_transfer_claim !== false) throw new Error('example makes money transfer claim');
if (receipt.example_receipt?.validator_admission_claim !== false) throw new Error('example makes validator admission claim');
if (receipt.example_receipt?.work_credit_claim !== false) throw new Error('example makes Work Credit claim');
if (receipt.example_receipt?.public_internet_mesh_claim !== false) throw new Error('example makes public internet mesh claim');

if (root.links?.public_node_operator_receipt_example !== routes.receiptExamplePage) throw new Error('root missing receipt example page link');
if (root.links?.public_node_operator_receipt_example_json !== routes.receiptExampleJson) throw new Error('root missing receipt example json link');
if (root.links?.public_node_operator_receipt_example_html !== routes.receiptExampleHtml) throw new Error('root missing receipt example html link');
if (root.route_markers?.public_node_operator_receipt_example !== markers.receiptExample) throw new Error('root missing receipt example route marker');
if (root.public_node_operator_receipt_example?.marker !== markers.receiptExample) throw new Error('root receipt example marker mismatch');
if (root.public_node_operator_receipt_example?.status !== 'operator_receipt_example_ready') throw new Error('root receipt example status mismatch');
if (root.public_node_operator_receipt_example?.expected_green_marker !== markers.receiptExampleIndexRouteGreen) throw new Error('root receipt example expected index-route green mismatch');

for (const route of [routes.receiptExamplePage, routes.receiptExampleJson, routes.receiptExampleHtml]) {
  if (!rootText.includes(route)) throw new Error(`root missing receipt example route ${route}`);
  if (!routeSource.includes(route)) throw new Error(`route source missing receipt example route ${route}`);
}

for (const needle of [
  'publicNodeOperatorReceiptExamplePageRoute',
  'publicNodeOperatorReceiptExampleJsonRoute',
  'publicNodeOperatorReceiptExampleHtmlRoute',
  'publicNodeOperatorReceiptExamplePagePath',
  'publicNodeOperatorReceiptExampleJsonPath',
  'publicNodeOperatorReceiptExampleHtmlPath',
  'app.get(publicNodeOperatorReceiptExamplePageRoute',
  'app.get(publicNodeOperatorReceiptExampleJsonRoute',
  'app.get(publicNodeOperatorReceiptExampleHtmlRoute'
]) {
  if (!routeSource.includes(needle)) throw new Error(`route source missing ${needle}`);
}

const surfaceText = [
  rootText,
  receiptText,
  receiptDoc,
  receiptPage,
  receiptHtml,
  handoffText,
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
  markers.receiptExample,
  markers.handoffPacket,
  markers.handoffPacketCloseoutGreen,
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
  if (receipt.boundary?.[key] !== expected) throw new Error(`bad receipt example boundary ${key}`);
  if (root.public_node_operator_receipt_example?.boundary?.[key] !== expected) throw new Error(`bad root receipt example boundary ${key}`);
}

const lower = surfaceText.toLowerCase();
for (const phrase of [
  'example creates no receipt',
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

for (const field of [
  'private_key',
  'seed_phrase',
  'wallet_secret',
  'signer_secret',
  'private_material_included',
  'money_transfer_claim',
  'validator_admission_claim',
  'work_credit_claim',
  'public_internet_mesh_claim'
]) {
  if (!surfaceText.includes(field)) throw new Error(`missing example/forbidden field binding ${field}`);
}

for (const proofFile of [
  files.proofReceiptExample,
  files.proofReceiptExampleIndexRoute,
  files.proofHandoffCloseout,
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
  read(files.proofReceiptExample),
  read(files.proofReceiptExampleIndexRoute),
  read(files.proofHandoffCloseout),
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
  markers.receiptExampleGreen,
  markers.receiptExampleIndexRouteGreen,
  markers.handoffPacketCloseoutGreen,
  markers.statusRollupCloseoutGreen,
  markers.quickstartCloseoutGreen,
  markers.connectLaneCloseoutGreen
]) {
  if (!proofText.includes(marker) && !surfaceText.includes(marker)) throw new Error(`missing proof marker binding ${marker}`);
}

console.log(green);
