import fs from 'node:fs';

const marker = 'VOID_LOCAL_MULTIBOX_RUNTIME_CLOSEOUT_README_LINK_V1';

const files = {
  readme: 'README.md',
  doc: 'docs/public/local-multibox-runtime-verification-path-v1.md',
  closeoutJson: 'public/public-node/runtime/local-multibox-runtime-discovery-closeout-rollup-v1.json',
  closeoutHtml: 'public/public-node/runtime/local-multibox-runtime-discovery-closeout-rollup-v1.html',
  runtimeIndex: 'public/public-node/runtime/index.json'
};

for (const p of Object.values(files)) {
  if (fs.existsSync(p) === false) throw new Error(`missing required file: ${p}`);
}

const readme = fs.readFileSync(files.readme, 'utf8');
const doc = fs.readFileSync(files.doc, 'utf8');
const closeoutJsonText = fs.readFileSync(files.closeoutJson, 'utf8');
const closeout = JSON.parse(closeoutJsonText);
const closeoutHtml = fs.readFileSync(files.closeoutHtml, 'utf8');
const runtimeIndexText = fs.readFileSync(files.runtimeIndex, 'utf8');

if (readme.includes(marker) === false) throw new Error('README missing marker');
if (doc.includes(marker) === false) throw new Error('public doc missing marker');

if (closeout.marker !== 'VOID_LOCAL_MULTIBOX_RUNTIME_DISCOVERY_CLOSEOUT_ROLLUP_V1') {
  throw new Error('bad closeout marker');
}

for (const required of [
  '/public-node/runtime/local-multibox-runtime-discovery-closeout-rollup-v1.json',
  '/public-node/runtime/local-multibox-runtime-discovery-closeout-rollup-v1.html',
  'VOID_LOCAL_MULTIBOX_RUNTIME_DISCOVERY_CLOSEOUT_ROLLUP_V1',
  '/.well-known/void-public-node.json',
  '/public-node',
  '/public-node/index.json',
  '/public-node/runtime',
  'VOID_LOCAL_MULTIBOX_RUNTIME_SMOKE_PACK_V1_GREEN'
]) {
  if (
    readme.includes(required) === false &&
    doc.includes(required) === false &&
    closeoutJsonText.includes(required) === false &&
    closeoutHtml.includes(required) === false &&
    runtimeIndexText.includes(required) === false
  ) {
    throw new Error(`missing required closeout doc token: ${required}`);
  }
}

for (const unsafe of [
  'wallet send enabled',
  'money movement enabled',
  'validator admission enabled',
  'public WC self-serve earning enabled',
  'public internet mesh completion enabled'
]) {
  if (readme.includes(unsafe) || doc.includes(unsafe)) {
    throw new Error(`unsafe enabled phrasing present: ${unsafe}`);
  }
}

console.log('VOID_LOCAL_MULTIBOX_RUNTIME_CLOSEOUT_README_LINK_V1_GREEN');
