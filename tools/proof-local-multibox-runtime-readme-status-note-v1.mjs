import fs from 'node:fs';

const marker = 'VOID_LOCAL_MULTIBOX_RUNTIME_README_STATUS_NOTE_V1';

const files = {
  readme: 'README.md',
  doc: 'docs/public/local-multibox-runtime-verification-path-v1.md',
  smokeJson: 'public/public-node/runtime/smoke-pack-v1.json',
  smokeScript: 'public/public-node/runtime/smoke-pack-v1.sh',
  runtimeIndex: 'public/public-node/runtime/index.json'
};

for (const p of Object.values(files)) {
  if (fs.existsSync(p) === false) throw new Error(`missing required file: ${p}`);
}

const readme = fs.readFileSync(files.readme, 'utf8');
const doc = fs.readFileSync(files.doc, 'utf8');
const smokeJson = JSON.parse(fs.readFileSync(files.smokeJson, 'utf8'));
const smokeScript = fs.readFileSync(files.smokeScript, 'utf8');
const runtimeIndex = JSON.parse(fs.readFileSync(files.runtimeIndex, 'utf8'));

if (readme.includes(marker) === false) throw new Error('README missing marker');
if (doc.includes(marker) === false) throw new Error('public doc missing marker');

if (smokeJson.marker !== 'VOID_LOCAL_MULTIBOX_RUNTIME_SMOKE_PACK_V1') {
  throw new Error('bad smoke pack marker');
}

if (smokeScript.includes('VOID_LOCAL_MULTIBOX_RUNTIME_SMOKE_PACK_V1_GREEN') === false) {
  throw new Error('smoke script missing green marker');
}

if (runtimeIndex.marker !== 'VOID_LOCAL_MULTIBOX_RUNTIME_DISCOVERY_INDEX_V1') {
  throw new Error('bad runtime index marker');
}

for (const required of [
  '/.well-known/void-public-node.json',
  '/public-node/index.json',
  '/public-node/runtime',
  '/public-node/runtime#runtime-smoke-check',
  '/public-node/runtime/smoke-pack-v1.json',
  '/public-node/runtime/smoke-pack-v1.sh',
  'VOID_LOCAL_MULTIBOX_RUNTIME_SMOKE_PACK_V1_GREEN',
  'Precision',
  'Alienware',
  'Nimo/N153B'
]) {
  if (readme.includes(required) === false && doc.includes(required) === false) {
    throw new Error(`README/doc missing required token: ${required}`);
  }
}

for (const forbiddenClaim of [
  'public internet mesh completion claim',
  'wallet send enabled',
  'validator admission enabled',
  'public WC self-serve earning enabled'
]) {
  if (readme.includes(forbiddenClaim) || doc.includes(forbiddenClaim)) {
    throw new Error(`unsafe positive claim present: ${forbiddenClaim}`);
  }
}

console.log('VOID_LOCAL_MULTIBOX_RUNTIME_README_STATUS_NOTE_V1_GREEN');
