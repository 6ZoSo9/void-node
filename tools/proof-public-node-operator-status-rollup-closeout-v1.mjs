import fs from 'node:fs';

const green = 'VOID_PUBLIC_NODE_OPERATOR_STATUS_ROLLUP_CLOSEOUT_V1_GREEN';

const markers = {
  statusRollup: 'VOID_PUBLIC_NODE_OPERATOR_STATUS_ROLLUP_V1',
  statusRollupGreen: 'VOID_PUBLIC_NODE_OPERATOR_STATUS_ROLLUP_V1_GREEN',
  statusRollupIndexRouteGreen: 'VOID_PUBLIC_NODE_OPERATOR_STATUS_ROLLUP_INDEX_ROUTE_V1_GREEN',
  quickstart: 'VOID_PUBLIC_NODE_OPERATOR_QUICKSTART_V1',
  quickstartCloseoutGreen: 'VOID_PUBLIC_NODE_OPERATOR_QUICKSTART_CLOSEOUT_V1_GREEN',
  connectLaneCloseoutGreen: 'VOID_PUBLIC_NODE_CONNECT_LANE_CLOSEOUT_V1_GREEN',
  connectPack: 'VOID_PUBLIC_NODE_CONNECT_PACK_V1',
  receiptTemplate: 'VOID_PUBLIC_NODE_CONNECT_RECEIPT_TEMPLATE_V1',
  bootstrap: 'VOID_PUBLIC_BOOTSTRAP_GATEWAY_V1',
  nimoCloseoutGreen: 'VOID_LOCAL_MULTIBOX_NIMO_REJOIN_FINAL_CLOSEOUT_AUDIT_V1_GREEN',
  runtimeRouteGreen: 'VOID_LOCAL_MULTIBOX_RUNTIME_ROUTE_V1_GREEN'
};

const routes = {
  statusRollupPage: '/public-node/operator-status-rollup-v1',
  statusRollupJson: '/public-node/public-node-operator-status-rollup-v1.json',
  statusRollupHtml: '/public-node/public-node-operator-status-rollup-v1.html',
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
  statusDoc: 'docs/public/public-node-operator-status-rollup-v1.md',
  statusPage: 'public/public-node/operator-status-rollup-v1.html',
  statusJson: 'public/public-node/public-node-operator-status-rollup-v1.json',
  statusHtml: 'public/public-node/public-node-operator-status-rollup-v1.html',
  quickstartJson: 'public/public-node/public-node-operator-quickstart-v1.json',
  connectPackJson: 'public/public-node/connect/public-node-connect-pack-v1.json',
  receiptTemplateJson: 'public/public-node/connect/public-node-connect-receipt-template-v1.json',
  bootstrapDoc: 'docs/public/public-bootstrap-gateway.md',
  routeSource: 'src/local-multibox-runtime-route-v1.ts',
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

for (const file of Object.values(files)) {
  if (!fs.existsSync(file)) throw new Error(`missing ${file}`);
}

const read = file => fs.readFileSync(file, 'utf8');

const root = JSON.parse(read(files.root));
const status = JSON.parse(read(files.statusJson));
const quickstart = JSON.parse(read(files.quickstartJson));
const connectPack = JSON.parse(read(files.connectPackJson));
const receiptTemplate = JSON.parse(read(files.receiptTemplateJson));
const routeSource = read(files.routeSource);

if (status.marker !== markers.statusRollup) throw new Error('status rollup marker mismatch');
if (status.status !== 'operator_status_rollup_ready') throw new Error('status rollup status mismatch');
if (quickstart.marker !== markers.quickstart) throw new Error('quickstart marker mismatch');
if (connectPack.marker !== markers.connectPack) throw new Error('connect pack marker mismatch');
if (receiptTemplate.marker !== markers.receiptTemplate) throw new Error('receipt template marker mismatch');

for (const file of [files.statusDoc, files.statusPage, files.statusHtml]) {
  if (!read(file).includes(markers.statusRollup)) throw new Error(`status rollup marker missing in ${file}`);
}
if (!read(files.bootstrapDoc).includes(markers.bootstrap)) throw new Error('bootstrap marker missing in bootstrap doc');

if (root.links?.public_node_operator_status_rollup !== routes.statusRollupPage) throw new Error('root status rollup page link mismatch');
if (root.links?.public_node_operator_status_rollup_json !== routes.statusRollupJson) throw new Error('root status rollup json link mismatch');
if (root.links?.public_node_operator_status_rollup_html !== routes.statusRollupHtml) throw new Error('root status rollup html link mismatch');
if (root.route_markers?.public_node_operator_status_rollup !== markers.statusRollup) throw new Error('root status rollup marker mismatch');
if (root.public_node_operator_status_rollup?.marker !== markers.statusRollup) throw new Error('root status rollup summary marker mismatch');

const componentNames = ['operator_quickstart', 'connect_lane', 'connect_pack', 'receipt_template', 'bootstrap'];
for (const name of componentNames) {
  const component = status.components.find(c => c.name === name);
  if (!component) throw new Error(`missing status component ${name}`);
  if (component.status !== 'green') throw new Error(`status component ${name} not green`);
}

const combined = JSON.stringify(root) + JSON.stringify(status) + JSON.stringify(quickstart) + JSON.stringify(connectPack) + JSON.stringify(receiptTemplate) + routeSource;
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
  if (status.boundary?.[key] !== false) throw new Error(`status rollup boundary ${key} must be false`);
  if (quickstart.boundary?.[key] !== false) throw new Error(`quickstart boundary ${key} must be false`);
  if (connectPack.boundary?.[key] !== false) throw new Error(`connect pack boundary ${key} must be false`);
  if (receiptTemplate.boundary?.[key] !== false) throw new Error(`receipt boundary ${key} must be false`);
}

if (status.boundary?.automatic_peer_dial_enabled_by_this_rollup !== false) throw new Error('status rollup must not enable automatic peer dial');
if (status.boundary?.work_credit_claim_created !== false) throw new Error('status rollup must not create WC claim');
if (quickstart.boundary?.work_credit_claim_created !== false) throw new Error('quickstart must not create WC claim');
if (receiptTemplate.boundary?.work_credit_claim_created !== false) throw new Error('receipt template must not create WC claim');

for (const needle of [
  'publicNodeOperatorStatusRollupPageRoute',
  'publicNodeOperatorStatusRollupJsonRoute',
  'publicNodeOperatorStatusRollupHtmlRoute',
  'app.get(publicNodeOperatorStatusRollupPageRoute',
  'app.get(publicNodeOperatorStatusRollupJsonRoute',
  'app.get(publicNodeOperatorStatusRollupHtmlRoute',
  'publicNodeOperatorQuickstartPageRoute',
  'publicNodeConnectRoute',
  'publicNodeConnectReceiptPageRoute'
]) {
  if (!routeSource.includes(needle)) throw new Error(`route source missing ${needle}`);
}

for (const proofFile of [
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



console.log(green);
