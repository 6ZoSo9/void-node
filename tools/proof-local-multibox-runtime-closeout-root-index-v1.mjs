import fs from 'node:fs';

const marker = 'VOID_LOCAL_MULTIBOX_RUNTIME_CLOSEOUT_ROOT_INDEX_V1';

const files = {
  rootIndex: 'public/public-node/index.json',
  closeoutJson: 'public/public-node/runtime/local-multibox-runtime-discovery-closeout-rollup-v1.json',
  closeoutHtml: 'public/public-node/runtime/local-multibox-runtime-discovery-closeout-rollup-v1.html',
  runtimeIndex: 'public/public-node/runtime/index.json',
  smokeScript: 'public/public-node/runtime/smoke-pack-v1.sh',
  wellKnownProof: 'tools/proof-well-known-local-multibox-runtime-closeout-rollup-link-v1.mjs',
  readmeProof: 'tools/proof-local-multibox-runtime-closeout-readme-link-v1.mjs'
};

for (const p of Object.values(files)) {
  if (fs.existsSync(p) === false) throw new Error(`missing required file: ${p}`);
}

const rootText = fs.readFileSync(files.rootIndex, 'utf8');
const root = JSON.parse(rootText);
const closeoutText = fs.readFileSync(files.closeoutJson, 'utf8');
const closeout = JSON.parse(closeoutText);
const closeoutHtml = fs.readFileSync(files.closeoutHtml, 'utf8');
const runtimeIndexText = fs.readFileSync(files.runtimeIndex, 'utf8');
const smokeScript = fs.readFileSync(files.smokeScript, 'utf8');

if (root.local_multibox_runtime_closeout_root_index_marker !== marker) {
  throw new Error('root index missing closeout root index marker');
}

const obj = root.local_multibox_runtime_discovery_closeout_rollup;
if (obj === undefined || obj === null || obj.marker !== marker) {
  throw new Error('root index missing closeout object marker');
}

if (closeout.marker !== 'VOID_LOCAL_MULTIBOX_RUNTIME_DISCOVERY_CLOSEOUT_ROLLUP_V1') {
  throw new Error('bad closeout marker');
}

if (closeoutHtml.includes('VOID_LOCAL_MULTIBOX_RUNTIME_DISCOVERY_CLOSEOUT_ROLLUP_V1') === false) {
  throw new Error('closeout HTML missing marker');
}

if (runtimeIndexText.includes('VOID_LOCAL_MULTIBOX_RUNTIME_DISCOVERY_CLOSEOUT_ROLLUP_V1') === false) {
  throw new Error('runtime index missing closeout marker');
}

if (smokeScript.includes('VOID_LOCAL_MULTIBOX_RUNTIME_SMOKE_PACK_V1_GREEN') === false) {
  throw new Error('smoke script missing green marker');
}

for (const required of [
  marker,
  'VOID_LOCAL_MULTIBOX_RUNTIME_DISCOVERY_CLOSEOUT_ROLLUP_V1',
  'VOID_WELL_KNOWN_LOCAL_MULTIBOX_RUNTIME_CLOSEOUT_ROLLUP_LINK_V1',
  'VOID_LOCAL_MULTIBOX_RUNTIME_SMOKE_PACK_V1_GREEN',
  '/public-node/runtime/local-multibox-runtime-discovery-closeout-rollup-v1.json',
  '/public-node/runtime/local-multibox-runtime-discovery-closeout-rollup-v1.html',
  '/.well-known/void-public-node.json',
  '/public-node',
  '/public-node/index.json',
  '/public-node/runtime',
  '/public-node/runtime/index.json',
  '/public-node/runtime/smoke-pack-v1.sh'
]) {
  if (rootText.includes(required) === false) {
    throw new Error(`root index missing token: ${required}`);
  }
}

const b = obj.boundary || {};
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
  if (b[key] !== false) throw new Error(`root closeout boundary must remain false: ${key}`);
}

if (b.read_only !== true || b.public_routes_only !== true) {
  throw new Error('root closeout boundary must remain read-only/public-routes-only');
}

console.log('VOID_LOCAL_MULTIBOX_RUNTIME_CLOSEOUT_ROOT_INDEX_V1_GREEN');
