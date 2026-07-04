import fs from 'node:fs';

const marker = 'VOID_WELL_KNOWN_LOCAL_MULTIBOX_RUNTIME_CLOSEOUT_ROLLUP_LINK_V1';

const files = {
  indexSource: 'src/index.ts',
  closeoutJson: 'public/public-node/runtime/local-multibox-runtime-discovery-closeout-rollup-v1.json',
  closeoutHtml: 'public/public-node/runtime/local-multibox-runtime-discovery-closeout-rollup-v1.html',
  runtimeIndex: 'public/public-node/runtime/index.json',
  smokeScript: 'public/public-node/runtime/smoke-pack-v1.sh'
};

for (const p of Object.values(files)) {
  if (fs.existsSync(p) === false) throw new Error(`missing required file: ${p}`);
}

const indexSource = fs.readFileSync(files.indexSource, 'utf8');
const closeoutText = fs.readFileSync(files.closeoutJson, 'utf8');
const closeout = JSON.parse(closeoutText);
const closeoutHtml = fs.readFileSync(files.closeoutHtml, 'utf8');
const runtimeIndexText = fs.readFileSync(files.runtimeIndex, 'utf8');
const smokeScript = fs.readFileSync(files.smokeScript, 'utf8');

if (indexSource.includes(marker) === false) {
  throw new Error('well-known source missing closeout link marker');
}

if (closeout.marker !== 'VOID_LOCAL_MULTIBOX_RUNTIME_DISCOVERY_CLOSEOUT_ROLLUP_V1') {
  throw new Error('bad closeout rollup marker');
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
  'local_multibox_runtime_closeout_rollup_link_marker',
  'local_multibox_runtime_closeout_rollup',
  'local_multibox_runtime_closeout_rollup_html',
  'well_known_local_multibox_runtime_closeout_rollup_link',
  'VOID_LOCAL_MULTIBOX_RUNTIME_DISCOVERY_CLOSEOUT_ROLLUP_V1',
  '/public-node/runtime/local-multibox-runtime-discovery-closeout-rollup-v1.json',
  '/public-node/runtime/local-multibox-runtime-discovery-closeout-rollup-v1.html'
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

console.log('VOID_WELL_KNOWN_LOCAL_MULTIBOX_RUNTIME_CLOSEOUT_ROLLUP_LINK_V1_GREEN');
