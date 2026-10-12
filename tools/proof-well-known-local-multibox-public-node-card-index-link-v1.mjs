import fs from 'node:fs';

const marker = 'VOID_WELL_KNOWN_LOCAL_MULTIBOX_PUBLIC_NODE_CARD_INDEX_LINK_V1';

const files = {
  indexSource: 'src/index.ts',
  rootJson: 'public/public-node/index.json',
  smokeScript: 'public/public-node/runtime/smoke-pack-v1.sh'
};

for (const p of Object.values(files)) {
  if (fs.existsSync(p) === false) throw new Error(`missing required file: ${p}`);
}

const indexSource = fs.readFileSync(files.indexSource, 'utf8');
const rootJsonText = fs.readFileSync(files.rootJson, 'utf8');
const rootJson = JSON.parse(rootJsonText);
const smokeScript = fs.readFileSync(files.smokeScript, 'utf8');

if (indexSource.includes(marker) === false) {
  throw new Error('well-known source missing marker');
}

if (rootJson.local_multibox_runtime_public_node_card_index_marker !== 'VOID_LOCAL_MULTIBOX_RUNTIME_PUBLIC_NODE_CARD_INDEX_V1') {
  throw new Error('root public-node index missing card index marker');
}

if (rootJsonText.includes('VOID_LOCAL_MULTIBOX_RUNTIME_PUBLIC_NODE_CARD_V1') === false) {
  throw new Error('root index missing public-node card marker');
}

if (smokeScript.includes('VOID_LOCAL_MULTIBOX_RUNTIME_SMOKE_PACK_V1_GREEN') === false) {
  throw new Error('smoke script missing green marker');
}

for (const required of [
  'local_multibox_runtime_public_node_card_index_link_marker',
  'local_multibox_runtime_public_node_card',
  'local_multibox_runtime_public_node_card_index',
  'well_known_local_multibox_public_node_card_index_link',
  'VOID_LOCAL_MULTIBOX_RUNTIME_PUBLIC_NODE_CARD_INDEX_V1',
  'VOID_LOCAL_MULTIBOX_RUNTIME_PUBLIC_NODE_CARD_V1',
  '/public-node#publicNodeLocalMultiboxRuntimeCard',
  '/public-node/index.json'
]) {
  if (indexSource.includes(required) === false) {
    throw new Error(`well-known source missing token: ${required}`);
  }
}

for (const requiredFalse of [
  'mutation: false',
  'money_movement: false',
  'wallet_send: false',
  'wc_to_void_swap: false',
  'buy_void_fulfillment: false',
  'validator_mutation: false',
  'validator_admission: false',
  'public_wc_self_serve_earning: false',
  'public_internet_mesh_claim: false'
]) {
  if (indexSource.includes(requiredFalse) === false) {
    throw new Error(`well-known policy missing false boundary: ${requiredFalse}`);
  }
}

console.log('VOID_WELL_KNOWN_LOCAL_MULTIBOX_PUBLIC_NODE_CARD_INDEX_LINK_V1_GREEN');
