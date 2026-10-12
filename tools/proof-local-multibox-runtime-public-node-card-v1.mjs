import fs from 'node:fs';

const marker = 'VOID_LOCAL_MULTIBOX_RUNTIME_PUBLIC_NODE_CARD_V1';

const files = {
  indexSource: 'src/index.ts',
  rootJson: 'public/public-node/index.json',
  runtimeIndex: 'public/public-node/runtime/index.json',
  smokeJson: 'public/public-node/runtime/smoke-pack-v1.json',
  smokeScript: 'public/public-node/runtime/smoke-pack-v1.sh',
  readmeDoc: 'docs/public/local-multibox-runtime-verification-path-v1.md'
};

for (const p of Object.values(files)) {
  if (fs.existsSync(p) === false) throw new Error(`missing required file: ${p}`);
}

const indexSource = fs.readFileSync(files.indexSource, 'utf8');
const rootJsonText = fs.readFileSync(files.rootJson, 'utf8');
const runtimeIndex = JSON.parse(fs.readFileSync(files.runtimeIndex, 'utf8'));
const smokeJson = JSON.parse(fs.readFileSync(files.smokeJson, 'utf8'));
const smokeScript = fs.readFileSync(files.smokeScript, 'utf8');
const readmeDoc = fs.readFileSync(files.readmeDoc, 'utf8');

if (indexSource.includes(marker) === false) throw new Error('src/index.ts missing public-node card marker');

if (runtimeIndex.marker !== 'VOID_LOCAL_MULTIBOX_RUNTIME_DISCOVERY_INDEX_V1') {
  throw new Error('bad runtime index marker');
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
  '/.well-known/void-public-node.json',
  '/public-node/runtime',
  '/public-node/runtime#runtime-smoke-check',
  '/public-node/runtime/smoke-pack-v1.json',
  '/public-node/runtime/smoke-pack-v1.sh',
  'VOID_LOCAL_MULTIBOX_RUNTIME_SMOKE_PACK_V1_GREEN',
  'read-only discovery and smoke visibility only'
]) {
  if (indexSource.includes(required) === false) {
    throw new Error(`public-node card source missing token: ${required}`);
  }
}

for (const required of [
  'local_multibox_runtime',
  '/public-node/runtime'
]) {
  if (rootJsonText.includes(required) === false) {
    throw new Error(`root public-node index missing runtime discovery token: ${required}`);
  }
}

for (const requiredBoundary of [
  'No mutation routes',
  'wallet send',
  'money movement',
  'buy-VOID fulfillment',
  'WC-to-VOID swap execution',
  'validator mutation/admission',
  'public WC self-serve earning',
  'completed public internet mesh claim'
]) {
  if (indexSource.includes(requiredBoundary) === false) {
    throw new Error(`public-node card source missing boundary text: ${requiredBoundary}`);
  }
}

console.log('VOID_LOCAL_MULTIBOX_RUNTIME_PUBLIC_NODE_CARD_V1_GREEN');
