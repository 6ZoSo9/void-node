import fs from 'node:fs';

const marker = 'VOID_LOCAL_MULTIBOX_RUNTIME_FINAL_CHAIN_AUDIT_V1';

const files = {
  wellKnownSource: 'src/index.ts',
  routeModule: 'src/local-multibox-runtime-route-v1.ts',
  publicNodeIndex: 'public/public-node/index.json',
  runtimeIndex: 'public/public-node/runtime/index.json',
  closeoutJson: 'public/public-node/runtime/local-multibox-runtime-discovery-closeout-rollup-v1.json',
  closeoutHtml: 'public/public-node/runtime/local-multibox-runtime-discovery-closeout-rollup-v1.html',
  smokeScript: 'public/public-node/runtime/smoke-pack-v1.sh',
  readme: 'README.md',
  runtimeDoc: 'docs/public/local-multibox-runtime-verification-path-v1.md'
};

for (const p of Object.values(files)) {
  if (fs.existsSync(p) === false) throw new Error(`missing required file: ${p}`);
}

const wellKnownSource = fs.readFileSync(files.wellKnownSource, 'utf8');
const routeModule = fs.readFileSync(files.routeModule, 'utf8');
const publicNodeIndexText = fs.readFileSync(files.publicNodeIndex, 'utf8');
const publicNodeIndex = JSON.parse(publicNodeIndexText);
const runtimeIndexText = fs.readFileSync(files.runtimeIndex, 'utf8');
const runtimeIndex = JSON.parse(runtimeIndexText);
const closeoutText = fs.readFileSync(files.closeoutJson, 'utf8');
const closeout = JSON.parse(closeoutText);
const closeoutHtml = fs.readFileSync(files.closeoutHtml, 'utf8');
const smokeScript = fs.readFileSync(files.smokeScript, 'utf8');
const readme = fs.readFileSync(files.readme, 'utf8');
const runtimeDoc = fs.readFileSync(files.runtimeDoc, 'utf8');

const closeoutMarker = 'VOID_LOCAL_MULTIBOX_RUNTIME_DISCOVERY_CLOSEOUT_ROLLUP_V1';
const closeoutJsonRoute = '/public-node/runtime/local-multibox-runtime-discovery-closeout-rollup-v1.json';
const closeoutHtmlRoute = '/public-node/runtime/local-multibox-runtime-discovery-closeout-rollup-v1.html';
const smokeGreen = 'VOID_LOCAL_MULTIBOX_RUNTIME_SMOKE_PACK_V1_GREEN';

if (closeout.marker !== closeoutMarker) throw new Error('closeout JSON marker mismatch');

for (const requiredMarker of [
  marker,
  closeoutMarker,
  'VOID_WELL_KNOWN_LOCAL_MULTIBOX_RUNTIME_CLOSEOUT_ROLLUP_LINK_V1',
  'VOID_LOCAL_MULTIBOX_RUNTIME_CLOSEOUT_ROOT_INDEX_V1',
  'VOID_LOCAL_MULTIBOX_RUNTIME_CLOSEOUT_README_LINK_V1',
  'VOID_LOCAL_MULTIBOX_RUNTIME_PUBLIC_NODE_CARD_V1',
  'VOID_LOCAL_MULTIBOX_RUNTIME_PUBLIC_NODE_CARD_INDEX_V1',
  'VOID_LOCAL_MULTIBOX_RUNTIME_SMOKE_CARD_V1',
  'VOID_LOCAL_MULTIBOX_RUNTIME_SMOKE_PACK_V1',
  smokeGreen
]) {
  const found = [
    wellKnownSource,
    routeModule,
    publicNodeIndexText,
    runtimeIndexText,
    closeoutText,
    closeoutHtml,
    smokeScript,
    readme,
    runtimeDoc,
    marker
  ].some((text) => String(text).includes(requiredMarker));

  if (found === false) throw new Error(`final chain missing marker/token: ${requiredMarker}`);
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
  closeoutJsonRoute,
  closeoutHtmlRoute,
  '/public-node/runtime/smoke-pack-v1.json',
  '/public-node/runtime/smoke-pack-v1.sh',
  '/__void/diag/local-multibox-runtime-route-v1.json'
]) {
  const found = [
    wellKnownSource,
    routeModule,
    publicNodeIndexText,
    runtimeIndexText,
    closeoutText,
    closeoutHtml,
    smokeScript,
    readme,
    runtimeDoc
  ].some((text) => text.includes(route));

  if (found === false) throw new Error(`final chain missing route: ${route}`);
}

if (publicNodeIndex.local_multibox_runtime_closeout_root_index_marker !== 'VOID_LOCAL_MULTIBOX_RUNTIME_CLOSEOUT_ROOT_INDEX_V1') {
  throw new Error('root public-node index missing closeout root index marker');
}

if (runtimeIndex.local_multibox_runtime_discovery_closeout_rollup?.marker !== closeoutMarker) {
  throw new Error('runtime index missing closeout marker');
}

if (publicNodeIndex.local_multibox_runtime_discovery_closeout_rollup?.closeout_marker !== closeoutMarker) {
  throw new Error('root public-node index closeout marker mismatch');
}

if (wellKnownSource.includes('local_multibox_runtime_closeout_rollup') === false) {
  throw new Error('well-known source missing closeout rollup link key');
}

if (routeModule.includes('VOID_LOCAL_MULTIBOX_RUNTIME_DISCOVERY_CLOSEOUT_ROLLUP_ROUTE_V1') === false) {
  throw new Error('runtime route module missing closeout route marker');
}

if (smokeScript.includes(smokeGreen) === false) {
  throw new Error('smoke script missing expected green marker');
}

for (const b of [
  closeout.boundary,
  publicNodeIndex.local_multibox_runtime_discovery_closeout_rollup?.boundary
]) {
  if (!b) throw new Error('missing boundary object');
  if (b.read_only !== true || b.public_routes_only !== true) {
    throw new Error('boundary must remain read-only/public-routes-only');
  }
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
  if (wellKnownSource.includes(requiredFalse) === false) {
    throw new Error(`well-known policy missing false boundary: ${requiredFalse}`);
  }
}

console.log('VOID_LOCAL_MULTIBOX_RUNTIME_FINAL_CHAIN_AUDIT_V1_GREEN');
