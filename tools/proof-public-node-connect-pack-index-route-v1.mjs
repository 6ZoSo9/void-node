import fs from 'node:fs';

const marker = 'VOID_PUBLIC_NODE_CONNECT_PACK_V1';
const jsonRoute = '/public-node/connect/public-node-connect-pack-v1.json';
const htmlRoute = '/public-node/connect/public-node-connect-pack-v1.html';
const pageRoute = '/public-node/connect';

const paths = {
  rootIndex: 'public/public-node/index.json',
  packJson: 'public/public-node/connect/public-node-connect-pack-v1.json',
  packHtml: 'public/public-node/connect/public-node-connect-pack-v1.html',
  pageHtml: 'public/public-node/connect/index.html',
  src: 'src/local-multibox-runtime-route-v1.ts'
};

for (const p of Object.values(paths)) {
  if (!fs.existsSync(p)) throw new Error(`missing ${p}`);
}

const root = JSON.parse(fs.readFileSync(paths.rootIndex, 'utf8'));
const pack = JSON.parse(fs.readFileSync(paths.packJson, 'utf8'));
const packHtml = fs.readFileSync(paths.packHtml, 'utf8');
const pageHtml = fs.readFileSync(paths.pageHtml, 'utf8');
const src = fs.readFileSync(paths.src, 'utf8');

if (pack.marker !== marker) throw new Error('pack marker mismatch');

if (root.links?.public_node_connect !== pageRoute) throw new Error('root page link mismatch');
if (root.links?.public_node_connect_pack !== jsonRoute) throw new Error('root json link mismatch');
if (root.links?.public_node_connect_pack_html !== htmlRoute) throw new Error('root html link mismatch');
if (root.route_markers?.public_node_connect_pack !== marker) throw new Error('root route marker mismatch');
if (root.public_node_connect_pack?.marker !== marker) throw new Error('root summary marker mismatch');
if (root.public_node_connect_pack?.boundary?.automatic_peer_dial_enabled_by_this_pack !== false) throw new Error('root must not enable auto dial');

for (const needle of [
  'publicNodeConnectRoute',
  'publicNodeConnectJsonRoute',
  'publicNodeConnectHtmlRoute',
  'app.get(publicNodeConnectRoute',
  'app.get(publicNodeConnectJsonRoute',
  'app.get(publicNodeConnectHtmlRoute',
  jsonRoute,
  htmlRoute,
  pageRoute
]) {
  if (!src.includes(needle)) throw new Error(`route source missing ${needle}`);
}

for (const needle of [marker, 'p2p/dial', 'bootstrap/peers.json', 'public internet mesh claim']) {
  if (!packHtml.includes(needle)) throw new Error(`pack html missing ${needle}`);
  if (!pageHtml.includes(needle)) throw new Error(`page html missing ${needle}`);
}

console.log('VOID_PUBLIC_NODE_CONNECT_PACK_INDEX_ROUTE_V1_GREEN');
