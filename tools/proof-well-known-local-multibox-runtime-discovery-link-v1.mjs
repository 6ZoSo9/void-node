import fs from 'node:fs';

const indexPath = 'src/index.ts';
const runtimeIndexPath = 'public/public-node/runtime/index.json';
const statusPath = 'public/public-node/runtime/local-multibox-status-v1.json';

for (const p of [indexPath, runtimeIndexPath, statusPath]) {
  if (!fs.existsSync(p)) throw new Error(`missing required file: ${p}`);
}

const index = fs.readFileSync(indexPath, 'utf8');
const runtime = JSON.parse(fs.readFileSync(runtimeIndexPath, 'utf8'));
const status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));

if (runtime.marker !== 'VOID_LOCAL_MULTIBOX_RUNTIME_DISCOVERY_INDEX_V1') {
  throw new Error('runtime discovery marker mismatch');
}

if (status.marker !== 'VOID_LOCAL_MULTIBOX_RUNTIME_STATUS_V1') {
  throw new Error('runtime status marker mismatch');
}

for (const required of [
  'VOID_WELL_KNOWN_LOCAL_MULTIBOX_RUNTIME_DISCOVERY_LINK_V1',
  '/.well-known/void-public-node.json',
  '/public-node/index.json',
  '/public-node/runtime',
  '/public-node/runtime/index.json',
  '/public-node/runtime/local-multibox-status-v1.json',
  '/public-node/runtime/local-multibox-status-v1.html',
  '/__void/diag/local-multibox-runtime-route-v1.json',
  'local_multibox_runtime_discovery_link_marker',
  'well_known_local_multibox_runtime_discovery_link',
  'local_multibox_runtime_discovery_index',
  'local_multibox_runtime_status'
]) {
  if (!index.includes(required)) {
    throw new Error(`well-known discovery route missing required token: ${required}`);
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

console.log('VOID_WELL_KNOWN_LOCAL_MULTIBOX_RUNTIME_DISCOVERY_LINK_V1_GREEN');
