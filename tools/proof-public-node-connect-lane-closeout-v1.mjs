import fs from 'node:fs';

const green = 'VOID_PUBLIC_NODE_CONNECT_LANE_CLOSEOUT_V1_GREEN';

const connectMarker = 'VOID_PUBLIC_NODE_CONNECT_PACK_V1';
const receiptMarker = 'VOID_PUBLIC_NODE_CONNECT_RECEIPT_TEMPLATE_V1';
const bootstrapMarker = 'VOID_PUBLIC_BOOTSTRAP_GATEWAY_V1';

const routes = {
  connectPage: '/public-node/connect',
  connectJson: '/public-node/connect/public-node-connect-pack-v1.json',
  connectHtml: '/public-node/connect/public-node-connect-pack-v1.html',
  receiptPage: '/public-node/connect/receipt-template-v1',
  receiptJson: '/public-node/connect/public-node-connect-receipt-template-v1.json',
  receiptHtml: '/public-node/connect/public-node-connect-receipt-template-v1.html',
  bootstrapPublic: '/__void/public-bootstrap.json',
  bootstrapNetwork: '/bootstrap/network.json',
  bootstrapPeers: '/bootstrap/peers.json'
};

const files = {
  root: 'public/public-node/index.json',
  connectDoc: 'docs/public/public-node-connect-pack-v1.md',
  connectPage: 'public/public-node/connect/index.html',
  connectJson: 'public/public-node/connect/public-node-connect-pack-v1.json',
  connectHtml: 'public/public-node/connect/public-node-connect-pack-v1.html',
  receiptDoc: 'docs/public/public-node-connect-receipt-template-v1.md',
  receiptPage: 'public/public-node/connect/receipt-template-v1.html',
  receiptJson: 'public/public-node/connect/public-node-connect-receipt-template-v1.json',
  receiptHtml: 'public/public-node/connect/public-node-connect-receipt-template-v1.html',
  bootstrapDoc: 'docs/public/public-bootstrap-gateway.md',
  routeSource: 'src/local-multibox-runtime-route-v1.ts',
  proofConnectPack: 'tools/proof-public-node-connect-pack-v1.mjs',
  proofConnectPackIndexRoute: 'tools/proof-public-node-connect-pack-index-route-v1.mjs',
  proofConnectPackCloseout: 'tools/proof-public-node-connect-pack-closeout-v1.mjs',
  proofReceiptTemplate: 'tools/proof-public-node-connect-receipt-template-v1.mjs',
  proofReceiptTemplateIndexRoute: 'tools/proof-public-node-connect-receipt-template-index-route-v1.mjs',
  proofNimoCloseout: 'tools/proof-local-multibox-nimo-rejoin-final-closeout-audit-v1.mjs',
  proofRuntimeRoute: 'tools/proof-local-multibox-runtime-route-v1.mjs'
};

for (const file of Object.values(files)) {
  if (!fs.existsSync(file)) throw new Error(`missing ${file}`);
}

const read = file => fs.readFileSync(file, 'utf8');

const root = JSON.parse(read(files.root));
const connect = JSON.parse(read(files.connectJson));
const receipt = JSON.parse(read(files.receiptJson));
const routeSource = read(files.routeSource);

if (connect.marker !== connectMarker) throw new Error('connect pack marker mismatch');
if (receipt.marker !== receiptMarker) throw new Error('receipt template marker mismatch');
if (receipt.pairs_with !== connectMarker) throw new Error('receipt template must pair with connect pack');

if (!read(files.connectDoc).includes(connectMarker)) throw new Error('connect doc marker missing');
if (!read(files.connectPage).includes(connectMarker)) throw new Error('connect page marker missing');
if (!read(files.connectHtml).includes(connectMarker)) throw new Error('connect html marker missing');
if (!read(files.receiptDoc).includes(receiptMarker)) throw new Error('receipt doc marker missing');
if (!read(files.receiptPage).includes(receiptMarker)) throw new Error('receipt page marker missing');
if (!read(files.receiptHtml).includes(receiptMarker)) throw new Error('receipt html marker missing');
if (!read(files.bootstrapDoc).includes(bootstrapMarker)) throw new Error('bootstrap doc marker missing');

if (root.links?.public_node_connect !== routes.connectPage) throw new Error('root connect page link mismatch');
if (root.links?.public_node_connect_pack !== routes.connectJson) throw new Error('root connect pack link mismatch');
if (root.links?.public_node_connect_receipt_template !== routes.receiptPage) throw new Error('root receipt page link mismatch');
if (root.links?.public_node_connect_receipt_template_json !== routes.receiptJson) throw new Error('root receipt json link mismatch');
if (root.route_markers?.public_node_connect_pack !== connectMarker) throw new Error('root connect marker mismatch');
if (root.route_markers?.public_node_connect_receipt_template !== receiptMarker) throw new Error('root receipt marker mismatch');

const combined = JSON.stringify(root) + JSON.stringify(connect) + JSON.stringify(receipt) + routeSource;
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
  if (connect.boundary?.[key] !== false) throw new Error(`connect boundary ${key} must be false`);
  if (receipt.boundary?.[key] !== false) throw new Error(`receipt boundary ${key} must be false`);
}

if (connect.boundary?.automatic_peer_dial_enabled_by_this_pack !== false) throw new Error('connect pack must not enable automatic peer dial');
if (receipt.boundary?.automatic_peer_dial_enabled_by_this_template !== false) throw new Error('receipt template must not enable automatic peer dial');
if (receipt.boundary?.work_credit_claim_created !== false) throw new Error('receipt template must not create WC claim');

for (const needle of [
  'publicNodeConnectRoute',
  'publicNodeConnectJsonRoute',
  'publicNodeConnectHtmlRoute',
  'publicNodeConnectReceiptPageRoute',
  'publicNodeConnectReceiptJsonRoute',
  'publicNodeConnectReceiptHtmlRoute',
  'app.get(publicNodeConnectRoute',
  'app.get(publicNodeConnectReceiptPageRoute',
  'app.get(publicNodeConnectReceiptJsonRoute',
  'app.get(publicNodeConnectReceiptHtmlRoute'
]) {
  if (!routeSource.includes(needle)) throw new Error(`route source missing ${needle}`);
}

for (const proofFile of [
  files.proofConnectPack,
  files.proofConnectPackIndexRoute,
  files.proofConnectPackCloseout,
  files.proofReceiptTemplate,
  files.proofReceiptTemplateIndexRoute,
  files.proofNimoCloseout,
  files.proofRuntimeRoute
]) {
  if (!proofFile.startsWith('tools/proof-')) throw new Error(`unexpected proof path ${proofFile}`);
}

console.log(green);
