import fs from 'node:fs';

const marker = 'VOID_LOCAL_MULTIBOX_RUNTIME_PEER_REJOIN_CARD_ROUTE_V1';
const cardMarker = 'VOID_LOCAL_MULTIBOX_RUNTIME_PEER_REJOIN_CARD_V1';
const jsonRoute = '/public-node/runtime/local-multibox-runtime-peer-rejoin-card-v1.json';
const htmlRoute = '/public-node/runtime/local-multibox-runtime-peer-rejoin-card-v1.html';

const routeSourcePath = 'src/local-multibox-runtime-route-v1.ts';
const jsonPath = 'public/public-node/runtime/local-multibox-runtime-peer-rejoin-card-v1.json';
const htmlPath = 'public/public-node/runtime/local-multibox-runtime-peer-rejoin-card-v1.html';
const runtimeIndexPath = 'public/public-node/runtime/index.json';
const rootIndexPath = 'public/public-node/index.json';

for (const p of [routeSourcePath, jsonPath, htmlPath, runtimeIndexPath, rootIndexPath]) {
  if (!fs.existsSync(p)) throw new Error(`missing ${p}`);
}

const src = fs.readFileSync(routeSourcePath, 'utf8');
const card = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const html = fs.readFileSync(htmlPath, 'utf8');
const runtimeIndex = JSON.parse(fs.readFileSync(runtimeIndexPath, 'utf8'));
const rootIndex = JSON.parse(fs.readFileSync(rootIndexPath, 'utf8'));

for (const needle of [
  'peerRejoinJsonRoute',
  'peerRejoinHtmlRoute',
  'peerRejoinJsonPath',
  'peerRejoinHtmlPath',
  'app.get(peerRejoinJsonRoute',
  'app.get(peerRejoinHtmlRoute',
  jsonRoute,
  htmlRoute
]) {
  if (!src.includes(needle)) throw new Error(`route source missing ${needle}`);
}

if (card.marker !== cardMarker) throw new Error('card marker mismatch');
if (!html.includes(cardMarker)) throw new Error('card html missing marker');
if (!html.includes(jsonRoute)) throw new Error('card html missing json route');
if (!html.includes(htmlRoute)) throw new Error('card html missing html route');

for (const [name, idx] of Object.entries({ runtimeIndex, rootIndex })) {
  if (idx.links?.local_multibox_runtime_peer_rejoin_card !== jsonRoute) throw new Error(`${name} json link mismatch`);
  if (idx.links?.local_multibox_runtime_peer_rejoin_card_html !== htmlRoute) throw new Error(`${name} html link mismatch`);
  if (idx.route_markers?.local_multibox_runtime_peer_rejoin_card !== cardMarker) throw new Error(`${name} route marker mismatch`);
}

const boundary = card.boundary || {};
if (boundary.automatic_peer_dial_enabled_by_this_card !== false) throw new Error('card must not enable automatic peer dial');
if (boundary.mutation_route_enabled !== false) throw new Error('card must not enable mutation routes');
if (boundary.wallet_send_enabled !== false) throw new Error('card must not enable wallet send');
if (boundary.money_movement_enabled !== false) throw new Error('card must not enable money movement');
if (boundary.validator_admission_enabled !== false) throw new Error('card must not enable validator admission');
if (boundary.public_internet_mesh_claim !== false) throw new Error('card must not claim public internet mesh');

console.log(`${marker}_GREEN`);
