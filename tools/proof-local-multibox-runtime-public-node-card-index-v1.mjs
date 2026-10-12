import fs from 'node:fs';

const marker = 'VOID_LOCAL_MULTIBOX_RUNTIME_PUBLIC_NODE_CARD_INDEX_V1';

const files = {
  rootJson: 'public/public-node/index.json',
  indexSource: 'src/index.ts',
  runtimeIndex: 'public/public-node/runtime/index.json',
  smokeJson: 'public/public-node/runtime/smoke-pack-v1.json',
  smokeScript: 'public/public-node/runtime/smoke-pack-v1.sh',
  readmeDoc: 'docs/public/local-multibox-runtime-verification-path-v1.md'
};

for (const p of Object.values(files)) {
  if (fs.existsSync(p) === false) throw new Error(`missing required file: ${p}`);
}

const rootJsonText = fs.readFileSync(files.rootJson, 'utf8');
const rootJson = JSON.parse(rootJsonText);
const indexSource = fs.readFileSync(files.indexSource, 'utf8');
const runtimeIndex = JSON.parse(fs.readFileSync(files.runtimeIndex, 'utf8'));
const smokeJson = JSON.parse(fs.readFileSync(files.smokeJson, 'utf8'));
const smokeScript = fs.readFileSync(files.smokeScript, 'utf8');
const readmeDoc = fs.readFileSync(files.readmeDoc, 'utf8');

if (rootJson.local_multibox_runtime_public_node_card_index_marker !== marker) {
  throw new Error('root index missing public-node card index marker');
}

const card = rootJson.local_multibox_runtime_public_node_card;
if (card === undefined || card === null || card.marker !== marker) {
  throw new Error('root index missing local multibox public-node card object');
}

if (indexSource.includes('VOID_LOCAL_MULTIBOX_RUNTIME_PUBLIC_NODE_CARD_V1') === false) {
  throw new Error('dynamic public-node card source marker missing');
}

if (runtimeIndex.marker !== 'VOID_LOCAL_MULTIBOX_RUNTIME_DISCOVERY_INDEX_V1') {
  throw new Error('bad runtime discovery index marker');
}

if (smokeJson.marker !== 'VOID_LOCAL_MULTIBOX_RUNTIME_SMOKE_PACK_V1') {
  throw new Error('bad smoke pack marker');
}

if (smokeScript.includes('VOID_LOCAL_MULTIBOX_RUNTIME_SMOKE_PACK_V1_GREEN') === false) {
  throw new Error('smoke script missing green marker');
}

if (readmeDoc.includes('VOID_LOCAL_MULTIBOX_RUNTIME_README_STATUS_NOTE_V1') === false) {
  throw new Error('README status doc marker missing');
}

for (const required of [
  '/public-node#publicNodeLocalMultiboxRuntimeCard',
  '/public-node/runtime',
  '/public-node/runtime#runtime-smoke-check',
  '/public-node/runtime/smoke-pack-v1.json',
  '/public-node/runtime/smoke-pack-v1.sh',
  'VOID_LOCAL_MULTIBOX_RUNTIME_PUBLIC_NODE_CARD_V1',
  'VOID_LOCAL_MULTIBOX_RUNTIME_SMOKE_PACK_V1',
  'VOID_LOCAL_MULTIBOX_RUNTIME_SMOKE_CARD_V1',
  'VOID_LOCAL_MULTIBOX_RUNTIME_SMOKE_PACK_V1_GREEN'
]) {
  if (rootJsonText.includes(required) === false) {
    throw new Error(`root index missing token: ${required}`);
  }
}

for (const required of [
  '/.well-known/void-public-node.json',
  '/public-node/index.json',
  '/public-node/runtime',
  '/public-node/runtime/index.json',
  '/public-node/runtime/local-multibox-status-v1.json',
  '/__void/diag/local-multibox-runtime-route-v1.json'
]) {
  if (JSON.stringify(card).includes(required) === false) {
    throw new Error(`card index missing verified route: ${required}`);
  }
}

const b = card.boundary || {};
for (const key of [
  'mutation_route_enabled',
  'wallet_send_enabled',
  'money_movement_enabled',
  'buy_void_fulfillment_enabled',
  'wc_to_void_swap_enabled',
  'validator_mutation_enabled',
  'validator_admission_enabled',
  'public_wc_self_serve_earning_enabled',
  'public_internet_mesh_claim'
]) {
  if (b[key] !== false) throw new Error(`boundary must remain false: ${key}`);
}

if (b.read_only !== true || b.public_routes_only !== true) {
  throw new Error('boundary must remain read-only/public-routes-only');
}

console.log('VOID_LOCAL_MULTIBOX_RUNTIME_PUBLIC_NODE_CARD_INDEX_V1_GREEN');
