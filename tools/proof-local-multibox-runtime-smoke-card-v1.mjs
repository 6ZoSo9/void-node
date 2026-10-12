import fs from 'node:fs';

const htmlPath = 'public/public-node/runtime/index.html';
const jsonPath = 'public/public-node/runtime/index.json';
const smokeJsonPath = 'public/public-node/runtime/smoke-pack-v1.json';
const smokeScriptPath = 'public/public-node/runtime/smoke-pack-v1.sh';

for (const p of [htmlPath, jsonPath, smokeJsonPath, smokeScriptPath]) {
  if (!fs.existsSync(p)) throw new Error(`missing required file: ${p}`);
}

const html = fs.readFileSync(htmlPath, 'utf8');
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const smokeJson = JSON.parse(fs.readFileSync(smokeJsonPath, 'utf8'));
const smokeScript = fs.readFileSync(smokeScriptPath, 'utf8');

if (json.marker !== 'VOID_LOCAL_MULTIBOX_RUNTIME_DISCOVERY_INDEX_V1') {
  throw new Error('bad runtime index marker');
}

if (smokeJson.marker !== 'VOID_LOCAL_MULTIBOX_RUNTIME_SMOKE_PACK_V1') {
  throw new Error('bad smoke pack marker');
}

if (!smokeScript.includes('VOID_LOCAL_MULTIBOX_RUNTIME_SMOKE_PACK_V1_GREEN')) {
  throw new Error('smoke script missing green marker');
}

const card = json.smoke_card;
if (!card || card.marker !== 'VOID_LOCAL_MULTIBOX_RUNTIME_SMOKE_CARD_V1') {
  throw new Error('missing smoke card JSON marker');
}

for (const required of [
  'VOID_LOCAL_MULTIBOX_RUNTIME_SMOKE_CARD_V1',
  'Runtime Smoke Check',
  'smoke-pack-v1.json',
  'smoke-pack-v1.sh',
  'VOID_LOCAL_MULTIBOX_RUNTIME_SMOKE_PACK_V1_GREEN',
  'PUBLIC_NODE_BASE'
]) {
  if (!html.includes(required) && !JSON.stringify(json).includes(required)) {
    throw new Error(`runtime smoke card missing token: ${required}`);
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
  if (!JSON.stringify(card).includes(required)) {
    throw new Error(`smoke card missing verified route: ${required}`);
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
  if (b[key] !== false) throw new Error(`smoke card boundary must remain false: ${key}`);
}

if (b.read_only !== true || b.public_routes_only !== true) {
  throw new Error('smoke card boundary must remain read-only/public-routes-only');
}

console.log('VOID_LOCAL_MULTIBOX_RUNTIME_SMOKE_CARD_V1_GREEN');
