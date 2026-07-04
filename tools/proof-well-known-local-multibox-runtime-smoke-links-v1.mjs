import fs from 'node:fs';

const indexPath = 'src/index.ts';
const runtimeIndexPath = 'public/public-node/runtime/index.json';
const smokeJsonPath = 'public/public-node/runtime/smoke-pack-v1.json';
const smokeScriptPath = 'public/public-node/runtime/smoke-pack-v1.sh';

for (const p of [indexPath, runtimeIndexPath, smokeJsonPath, smokeScriptPath]) {
  if (!fs.existsSync(p)) throw new Error(`missing required file: ${p}`);
}

const index = fs.readFileSync(indexPath, 'utf8');
const runtimeIndex = JSON.parse(fs.readFileSync(runtimeIndexPath, 'utf8'));
const smokeJson = JSON.parse(fs.readFileSync(smokeJsonPath, 'utf8'));
const smokeScript = fs.readFileSync(smokeScriptPath, 'utf8');

if (runtimeIndex.marker !== 'VOID_LOCAL_MULTIBOX_RUNTIME_DISCOVERY_INDEX_V1') {
  throw new Error('bad runtime discovery index marker');
}

if (smokeJson.marker !== 'VOID_LOCAL_MULTIBOX_RUNTIME_SMOKE_PACK_V1') {
  throw new Error('bad smoke pack marker');
}

if (!smokeScript.includes('VOID_LOCAL_MULTIBOX_RUNTIME_SMOKE_PACK_V1_GREEN')) {
  throw new Error('smoke script missing green marker');
}

for (const required of [
  'VOID_WELL_KNOWN_LOCAL_MULTIBOX_RUNTIME_SMOKE_LINKS_V1',
  'local_multibox_runtime_smoke_links_marker',
  'local_multibox_runtime_smoke_card',
  'local_multibox_runtime_smoke_pack',
  'local_multibox_runtime_smoke_script',
  'well_known_local_multibox_runtime_smoke_links',
  'VOID_LOCAL_MULTIBOX_RUNTIME_SMOKE_PACK_V1',
  'VOID_LOCAL_MULTIBOX_RUNTIME_SMOKE_CARD_V1',
  '/public-node/runtime#runtime-smoke-check',
  '/public-node/runtime/smoke-pack-v1.json',
  '/public-node/runtime/smoke-pack-v1.sh'
]) {
  if (!index.includes(required)) {
    throw new Error(`well-known smoke link missing token: ${required}`);
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
  if (!index.includes(requiredFalse)) {
    throw new Error(`well-known policy missing false boundary: ${requiredFalse}`);
  }
}

console.log('VOID_WELL_KNOWN_LOCAL_MULTIBOX_RUNTIME_SMOKE_LINKS_V1_GREEN');
