import fs from 'node:fs';

const green = 'VOID_PUBLIC_NODE_OPERATOR_QUICKSTART_CLOSEOUT_V1_GREEN';

const markers = {
  quickstart: 'VOID_PUBLIC_NODE_OPERATOR_QUICKSTART_V1',
  connectPack: 'VOID_PUBLIC_NODE_CONNECT_PACK_V1',
  receiptTemplate: 'VOID_PUBLIC_NODE_CONNECT_RECEIPT_TEMPLATE_V1',
  bootstrap: 'VOID_PUBLIC_BOOTSTRAP_GATEWAY_V1'
};

const routes = {
  quickstartPage: '/public-node/operator-quickstart-v1',
  quickstartJson: '/public-node/public-node-operator-quickstart-v1.json',
  quickstartHtml: '/public-node/public-node-operator-quickstart-v1.html',
  bootstrapPublic: '/__void/public-bootstrap.json',
  bootstrapNetwork: '/bootstrap/network.json',
  bootstrapPeers: '/bootstrap/peers.json',
  connectPack: '/public-node/connect',
  connectPackJson: '/public-node/connect/public-node-connect-pack-v1.json',
  receiptTemplate: '/public-node/connect/receipt-template-v1',
  receiptTemplateJson: '/public-node/connect/public-node-connect-receipt-template-v1.json'
};

const files = {
  root: 'public/public-node/index.json',
  quickstartDoc: 'docs/public/public-node-operator-quickstart-v1.md',
  quickstartPage: 'public/public-node/operator-quickstart-v1.html',
  quickstartJson: 'public/public-node/public-node-operator-quickstart-v1.json',
  quickstartHtml: 'public/public-node/public-node-operator-quickstart-v1.html',
  connectPackJson: 'public/public-node/connect/public-node-connect-pack-v1.json',
  receiptTemplateJson: 'public/public-node/connect/public-node-connect-receipt-template-v1.json',
  bootstrapDoc: 'docs/public/public-bootstrap-gateway.md',
  routeSource: 'src/local-multibox-runtime-route-v1.ts',
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

for (const file of Object.values(files)) {
  if (!fs.existsSync(file)) throw new Error(`missing ${file}`);
}

const read = file => fs.readFileSync(file, 'utf8');

const root = JSON.parse(read(files.root));
const quickstart = JSON.parse(read(files.quickstartJson));
const connectPack = JSON.parse(read(files.connectPackJson));
const receiptTemplate = JSON.parse(read(files.receiptTemplateJson));
const routeSource = read(files.routeSource);

if (quickstart.marker !== markers.quickstart) throw new Error('quickstart marker mismatch');
if (quickstart.status !== 'operator_quickstart_ready') throw new Error('quickstart status mismatch');
if (connectPack.marker !== markers.connectPack) throw new Error('connect pack marker mismatch');
if (receiptTemplate.marker !== markers.receiptTemplate) throw new Error('receipt template marker mismatch');
if (receiptTemplate.pairs_with !== markers.connectPack) throw new Error('receipt must pair with connect pack');

for (const file of [files.quickstartDoc, files.quickstartPage, files.quickstartHtml]) {
  if (!read(file).includes(markers.quickstart)) throw new Error(`quickstart marker missing in ${file}`);
}
if (!read(files.bootstrapDoc).includes(markers.bootstrap)) throw new Error('bootstrap marker missing in bootstrap doc');

if (root.links?.public_node_operator_quickstart !== routes.quickstartPage) throw new Error('root quickstart page link mismatch');
if (root.links?.public_node_operator_quickstart_json !== routes.quickstartJson) throw new Error('root quickstart json link mismatch');
if (root.links?.public_node_operator_quickstart_html !== routes.quickstartHtml) throw new Error('root quickstart html link mismatch');
if (root.route_markers?.public_node_operator_quickstart !== markers.quickstart) throw new Error('root quickstart marker mismatch');
if (root.public_node_operator_quickstart?.marker !== markers.quickstart) throw new Error('root quickstart summary marker mismatch');

const combined = JSON.stringify(root) + JSON.stringify(quickstart) + JSON.stringify(connectPack) + JSON.stringify(receiptTemplate) + routeSource;
for (const [name, route] of Object.entries(routes)) {
  if (!combined.includes(route)) throw new Error(`missing route binding ${name}: ${route}`);
}

const falseBoundaries = [
  'mutation_route_enabled',
  'wallet_send_enabled',
  'money_movement_enabled',
  'buy_void_fulfillment_enabled',
  'wc_to_void_swap_enabled',
  'validator_mutation_enabled',
  'validator_admission_enabled',
  'public_wc_self_serve_earning_enabled',
  'public_internet_mesh_claim'
];

for (const key of falseBoundaries) {
  if (quickstart.boundary?.[key] !== false) throw new Error(`quickstart boundary ${key} must be false`);
  if (connectPack.boundary?.[key] !== false) throw new Error(`connect pack boundary ${key} must be false`);
  if (receiptTemplate.boundary?.[key] !== false) throw new Error(`receipt boundary ${key} must be false`);
}

if (quickstart.boundary?.automatic_peer_dial_enabled_by_this_quickstart !== false) throw new Error('quickstart must not enable automatic peer dial');
if (quickstart.boundary?.work_credit_claim_created !== false) throw new Error('quickstart must not create WC claim');
if (receiptTemplate.boundary?.work_credit_claim_created !== false) throw new Error('receipt template must not create WC claim');

for (const needle of [
  'publicNodeOperatorQuickstartPageRoute',
  'publicNodeOperatorQuickstartJsonRoute',
  'publicNodeOperatorQuickstartHtmlRoute',
  'app.get(publicNodeOperatorQuickstartPageRoute',
  'app.get(publicNodeOperatorQuickstartJsonRoute',
  'app.get(publicNodeOperatorQuickstartHtmlRoute',
  'publicNodeConnectRoute',
  'publicNodeConnectReceiptPageRoute'
]) {
  if (!routeSource.includes(needle)) throw new Error(`route source missing ${needle}`);
}

for (const proofFile of [
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
  if (!proofFile.startsWith('tools/proof-')) throw new Error(`unexpected proof path ${proofFile}`);
}

console.log(green);
