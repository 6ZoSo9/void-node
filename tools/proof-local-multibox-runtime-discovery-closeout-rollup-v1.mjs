import fs from 'node:fs';

const marker = 'VOID_LOCAL_MULTIBOX_RUNTIME_DISCOVERY_CLOSEOUT_ROLLUP_V1';
const routeMarker = 'VOID_LOCAL_MULTIBOX_RUNTIME_DISCOVERY_CLOSEOUT_ROLLUP_ROUTE_V1';

const files = {
  closeoutJson: 'public/public-node/runtime/local-multibox-runtime-discovery-closeout-rollup-v1.json',
  closeoutHtml: 'public/public-node/runtime/local-multibox-runtime-discovery-closeout-rollup-v1.html',
  runtimeIndexJson: 'public/public-node/runtime/index.json',
  runtimeIndexHtml: 'public/public-node/runtime/index.html',
  routeModule: 'src/local-multibox-runtime-route-v1.ts',
  smokeScript: 'public/public-node/runtime/smoke-pack-v1.sh',
  publicNodeIndex: 'public/public-node/index.json'
};

for (const p of Object.values(files)) {
  if (fs.existsSync(p) === false) throw new Error(`missing required file: ${p}`);
}

const closeoutText = fs.readFileSync(files.closeoutJson, 'utf8');
const closeout = JSON.parse(closeoutText);
const closeoutHtml = fs.readFileSync(files.closeoutHtml, 'utf8');
const runtimeIndexText = fs.readFileSync(files.runtimeIndexJson, 'utf8');
const runtimeIndex = JSON.parse(runtimeIndexText);
const runtimeIndexHtml = fs.readFileSync(files.runtimeIndexHtml, 'utf8');
const routeModule = fs.readFileSync(files.routeModule, 'utf8');
const smokeScript = fs.readFileSync(files.smokeScript, 'utf8');
const publicNodeIndexText = fs.readFileSync(files.publicNodeIndex, 'utf8');

if (closeout.marker !== marker) throw new Error('bad closeout marker');
if (runtimeIndex.local_multibox_runtime_discovery_closeout_rollup?.marker !== marker) {
  throw new Error('runtime index missing closeout rollup marker');
}

for (const required of [
  marker,
  'VOID_PUBLIC_NODE_AGENT_DISCOVERY_V1',
  'VOID_WELL_KNOWN_LOCAL_MULTIBOX_RUNTIME_DISCOVERY_LINK_V1',
  'VOID_WELL_KNOWN_LOCAL_MULTIBOX_RUNTIME_SMOKE_LINKS_V1',
  'VOID_WELL_KNOWN_LOCAL_MULTIBOX_PUBLIC_NODE_CARD_INDEX_LINK_V1',
  'VOID_LOCAL_MULTIBOX_RUNTIME_PUBLIC_NODE_CARD_V1',
  'VOID_LOCAL_MULTIBOX_RUNTIME_PUBLIC_NODE_CARD_INDEX_V1',
  'VOID_LOCAL_MULTIBOX_RUNTIME_DISCOVERY_INDEX_V1',
  'VOID_LOCAL_MULTIBOX_RUNTIME_STATUS_V1',
  'VOID_LOCAL_MULTIBOX_RUNTIME_SMOKE_CARD_V1',
  'VOID_LOCAL_MULTIBOX_RUNTIME_SMOKE_PACK_V1',
  'VOID_LOCAL_MULTIBOX_RUNTIME_SMOKE_PACK_V1_GREEN'
]) {
  if (closeoutText.includes(required) === false) {
    throw new Error(`closeout JSON missing marker/token: ${required}`);
  }
}

for (const route of [
  '/.well-known/void-public-node.json',
  '/public-node',
  '/public-node#publicNodeLocalMultiboxRuntimeCard',
  '/public-node/index.json',
  '/public-node/runtime',
  '/public-node/runtime#runtime-smoke-check',
  '/public-node/runtime/index.json',
  '/public-node/runtime/local-multibox-status-v1.json',
  '/public-node/runtime/smoke-pack-v1.json',
  '/public-node/runtime/smoke-pack-v1.sh',
  '/__void/diag/local-multibox-runtime-route-v1.json',
  '/public-node/runtime/local-multibox-runtime-discovery-closeout-rollup-v1.json',
  '/public-node/runtime/local-multibox-runtime-discovery-closeout-rollup-v1.html'
]) {
  if (
    closeoutText.includes(route) === false &&
    runtimeIndexText.includes(route) === false &&
    closeoutHtml.includes(route) === false &&
    runtimeIndexHtml.includes(route) === false
  ) {
    throw new Error(`missing route in closeout surfaces: ${route}`);
  }
}

for (const required of [
  routeMarker,
  'closeoutJsonRoute',
  'closeoutHtmlRoute',
  'closeoutJsonPath',
  'closeoutHtmlPath',
  'local-multibox-runtime-discovery-closeout-rollup-v1.json',
  'local-multibox-runtime-discovery-closeout-rollup-v1.html'
]) {
  if (routeModule.includes(required) === false) {
    throw new Error(`route module missing token: ${required}`);
  }
}

if (smokeScript.includes('VOID_LOCAL_MULTIBOX_RUNTIME_SMOKE_PACK_V1_GREEN') === false) {
  throw new Error('smoke script missing green marker');
}

if (publicNodeIndexText.includes('VOID_LOCAL_MULTIBOX_RUNTIME_PUBLIC_NODE_CARD_INDEX_V1') === false) {
  throw new Error('public-node index missing card index marker');
}

const b = closeout.boundary || {};
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
  if (b[key] !== false) throw new Error(`closeout boundary must remain false: ${key}`);
}

if (b.read_only !== true || b.public_routes_only !== true) {
  throw new Error('closeout boundary must remain read-only/public-routes-only');
}

console.log('VOID_LOCAL_MULTIBOX_RUNTIME_DISCOVERY_CLOSEOUT_ROLLUP_V1_GREEN');
