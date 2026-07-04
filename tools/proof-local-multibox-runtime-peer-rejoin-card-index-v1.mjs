import fs from 'node:fs';

const marker = 'VOID_LOCAL_MULTIBOX_RUNTIME_PEER_REJOIN_CARD_V1';
const green = 'VOID_LOCAL_MULTIBOX_RUNTIME_PEER_REJOIN_CARD_V1_GREEN';
const jsonRoute = '/public-node/runtime/local-multibox-runtime-peer-rejoin-card-v1.json';
const htmlRoute = '/public-node/runtime/local-multibox-runtime-peer-rejoin-card-v1.html';

const paths = {
  cardJson: 'public/public-node/runtime/local-multibox-runtime-peer-rejoin-card-v1.json',
  cardHtml: 'public/public-node/runtime/local-multibox-runtime-peer-rejoin-card-v1.html',
  runtimeIndex: 'public/public-node/runtime/index.json',
  runtimeHtml: 'public/public-node/runtime/index.html',
  rootIndex: 'public/public-node/index.json'
};

for (const p of Object.values(paths)) {
  if (!fs.existsSync(p)) throw new Error(`missing ${p}`);
}

const card = JSON.parse(fs.readFileSync(paths.cardJson, 'utf8'));
const runtimeIndex = JSON.parse(fs.readFileSync(paths.runtimeIndex, 'utf8'));
const rootIndex = JSON.parse(fs.readFileSync(paths.rootIndex, 'utf8'));
const cardHtml = fs.readFileSync(paths.cardHtml, 'utf8');
const runtimeHtml = fs.readFileSync(paths.runtimeHtml, 'utf8');

if (card.marker !== marker) throw new Error('card marker mismatch');
if (card.expected_green_marker !== green) throw new Error('card green marker mismatch');

for (const [name, idx] of Object.entries({ runtimeIndex, rootIndex })) {
  if (idx.links?.local_multibox_runtime_peer_rejoin_card !== jsonRoute) throw new Error(`${name} json link mismatch`);
  if (idx.links?.local_multibox_runtime_peer_rejoin_card_html !== htmlRoute) throw new Error(`${name} html link mismatch`);
  if (idx.route_markers?.local_multibox_runtime_peer_rejoin_card !== marker) throw new Error(`${name} route marker mismatch`);
  if (idx.local_multibox_runtime_peer_rejoin_card?.marker !== marker) throw new Error(`${name} summary marker mismatch`);
  if (idx.local_multibox_runtime_peer_rejoin_card?.expected_green_marker !== green) throw new Error(`${name} summary green mismatch`);
  if (idx.local_multibox_runtime_peer_rejoin_card?.boundary?.automatic_peer_dial_enabled_by_this_card !== false) {
    throw new Error(`${name} must not enable automatic peer dial`);
  }
}

for (const needle of [marker, jsonRoute, htmlRoute]) {
  if (!cardHtml.includes(needle)) throw new Error(`card html missing ${needle}`);
  if (!runtimeHtml.includes(needle)) throw new Error(`runtime html missing ${needle}`);
}

console.log('VOID_LOCAL_MULTIBOX_RUNTIME_PEER_REJOIN_CARD_INDEX_V1_GREEN');
