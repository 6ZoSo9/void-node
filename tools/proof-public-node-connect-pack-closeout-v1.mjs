import fs from 'node:fs';

const marker = 'VOID_PUBLIC_NODE_CONNECT_PACK_CLOSEOUT_V1';
const green = `${marker}_GREEN`;

const files = {
  rootIndex: 'public/public-node/index.json',
  connectDoc: 'docs/public/public-node-connect-pack-v1.md',
  connectJson: 'public/public-node/connect/public-node-connect-pack-v1.json',
  connectHtml: 'public/public-node/connect/public-node-connect-pack-v1.html',
  connectPage: 'public/public-node/connect/index.html',
  routeSource: 'src/local-multibox-runtime-route-v1.ts',
  connectProof: 'tools/proof-public-node-connect-pack-v1.mjs',
  connectIndexRouteProof: 'tools/proof-public-node-connect-pack-index-route-v1.mjs',
  bootstrapDoc: 'docs/public/public-bootstrap-gateway.md',
  nimoCloseoutProof: 'tools/proof-local-multibox-nimo-rejoin-final-closeout-audit-v1.mjs',
  runtimeRouteProof: 'tools/proof-local-multibox-runtime-route-v1.mjs'
};

for (const file of Object.values(files)) {
  if (!fs.existsSync(file)) throw new Error(`missing required file: ${file}`);
}

const root = JSON.parse(fs.readFileSync(files.rootIndex, 'utf8'));
const pack = JSON.parse(fs.readFileSync(files.connectJson, 'utf8'));
const doc = fs.readFileSync(files.connectDoc, 'utf8');
const html = fs.readFileSync(files.connectHtml, 'utf8');
const page = fs.readFileSync(files.connectPage, 'utf8');
const routeSource = fs.readFileSync(files.routeSource, 'utf8');
const connectProof = fs.readFileSync(files.connectProof, 'utf8');
const connectIndexRouteProof = fs.readFileSync(files.connectIndexRouteProof, 'utf8');
const bootstrapDoc = fs.readFileSync(files.bootstrapDoc, 'utf8');
const nimoCloseoutProof = fs.readFileSync(files.nimoCloseoutProof, 'utf8');
const runtimeRouteProof = fs.readFileSync(files.runtimeRouteProof, 'utf8');

const packMarker = 'VOID_PUBLIC_NODE_CONNECT_PACK_V1';
const bootstrapMarker = 'VOID_PUBLIC_BOOTSTRAP_GATEWAY_V1';

const routes = {
  page: '/public-node/connect',
  json: '/public-node/connect/public-node-connect-pack-v1.json',
  html: '/public-node/connect/public-node-connect-pack-v1.html',
  publicBootstrap: '/__void/public-bootstrap.json',
  bootstrapNetwork: '/bootstrap/network.json',
  bootstrapPeers: '/bootstrap/peers.json'
};

function ok(value, message) {
  if (!value) throw new Error(message);
}

function mustFalse(obj, keys, label) {
  for (const key of keys) {
    ok(obj?.[key] === false, `${label}.${key} must be false`);
  }
}

function mustTrue(obj, keys, label) {
  for (const key of keys) {
    ok(obj?.[key] === true, `${label}.${key} must be true`);
  }
}

ok(pack.marker === packMarker, 'connect pack marker mismatch');
ok(pack.expected_green_marker === 'VOID_PUBLIC_NODE_CONNECT_PACK_V1_GREEN', 'connect pack expected green mismatch');
ok(pack.status === 'connect_pack_ready', 'connect pack status mismatch');
ok(pack.chain_id === 2050, 'chain id mismatch');

ok(pack.routes?.connect_page === routes.page, 'connect page route mismatch');
ok(pack.routes?.connect_json === routes.json, 'connect json route mismatch');
ok(pack.routes?.connect_html === routes.html, 'connect html route mismatch');
ok(pack.routes?.public_bootstrap === routes.publicBootstrap, 'public bootstrap route mismatch');
ok(pack.routes?.bootstrap_network === routes.bootstrapNetwork, 'bootstrap network route mismatch');
ok(pack.routes?.bootstrap_peers === routes.bootstrapPeers, 'bootstrap peers route mismatch');

ok(root.links?.public_node_connect === routes.page, 'root connect page link mismatch');
ok(root.links?.public_node_connect_pack === routes.json, 'root connect json link mismatch');
ok(root.links?.public_node_connect_pack_html === routes.html, 'root connect html link mismatch');
ok(root.route_markers?.public_node_connect_pack === packMarker, 'root connect marker mismatch');
ok(root.public_node_connect_pack?.marker === packMarker, 'root connect summary marker mismatch');
ok(root.public_node_connect_pack?.expected_green_marker === 'VOID_PUBLIC_NODE_CONNECT_PACK_V1_GREEN', 'root connect expected green mismatch');

mustTrue(pack.boundary, [
  'read_only',
  'public_routes_only',
  'operator_guidance_only'
], 'pack.boundary');

mustFalse(pack.boundary, [
  'automatic_peer_dial_enabled_by_this_pack',
  'mutation_route_enabled',
  'wallet_send_enabled',
  'money_movement_enabled',
  'buy_void_fulfillment_enabled',
  'wc_to_void_swap_enabled',
  'validator_mutation_enabled',
  'validator_admission_enabled',
  'public_wc_self_serve_earning_enabled',
  'public_internet_mesh_claim'
], 'pack.boundary');

mustFalse(root.public_node_connect_pack?.boundary, [
  'automatic_peer_dial_enabled_by_this_pack',
  'mutation_route_enabled',
  'wallet_send_enabled',
  'money_movement_enabled',
  'validator_admission_enabled',
  'public_wc_self_serve_earning_enabled',
  'public_internet_mesh_claim'
], 'root.public_node_connect_pack.boundary');

for (const text of [doc, html, page]) {
  for (const needle of [
    packMarker,
    'p2p/dial',
    'bootstrap/peers.json',
    'not validator admission',
    'public internet mesh claim'
  ]) {
    ok(text.includes(needle), `connect surface missing ${needle}`);
  }
}

for (const needle of [
  'publicNodeConnectRoute',
  'publicNodeConnectJsonRoute',
  'publicNodeConnectHtmlRoute',
  'app.get(publicNodeConnectRoute',
  'app.get(publicNodeConnectJsonRoute',
  'app.get(publicNodeConnectHtmlRoute',
  routes.page,
  routes.json,
  routes.html
]) {
  ok(routeSource.includes(needle), `route source missing ${needle}`);
}

ok(bootstrapDoc.includes(bootstrapMarker), 'bootstrap doc marker missing');
ok(pack.routes?.public_bootstrap === routes.publicBootstrap, 'connect pack public bootstrap route mismatch');
ok(JSON.stringify(pack).includes(routes.publicBootstrap), 'connect pack missing public bootstrap route');
ok(bootstrapDoc.includes('/bootstrap/network.json'), 'bootstrap doc missing network route');
ok(bootstrapDoc.includes('/bootstrap/peers.json'), 'bootstrap doc missing peers route');

ok(connectProof.includes('VOID_PUBLIC_NODE_CONNECT_PACK_V1_GREEN'), 'connect proof green marker missing');
ok(connectIndexRouteProof.includes('VOID_PUBLIC_NODE_CONNECT_PACK_INDEX_ROUTE_V1_GREEN'), 'connect index route proof green marker missing');
ok(nimoCloseoutProof.includes('VOID_LOCAL_MULTIBOX_NIMO_REJOIN_FINAL_CLOSEOUT_AUDIT_V1'), 'nimo closeout proof marker missing');
ok(runtimeRouteProof.includes('VOID_LOCAL_MULTIBOX_RUNTIME_ROUTE_V1'), 'runtime route proof marker missing');

for (const value of Object.values(pack.example_commands || {})) {
  ok(!String(value).includes('PRIVATE_KEY'), 'example command must not mention private key');
  ok(!String(value).includes('SEED_PHRASE'), 'example command must not mention seed phrase');
}

console.log(green);
