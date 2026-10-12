import fs from 'node:fs';

const marker = 'VOID_LOCAL_MULTIBOX_NIMO_REJOIN_OPERATOR_RUNBOOK_V1';
const green = 'VOID_LOCAL_MULTIBOX_NIMO_REJOIN_OPERATOR_RUNBOOK_V1_GREEN';
const jsonRoute = '/public-node/runtime/local-multibox-nimo-rejoin-operator-runbook-v1.json';
const htmlRoute = '/public-node/runtime/local-multibox-nimo-rejoin-operator-runbook-v1.html';

const paths = {
  runbook: 'public/public-node/runtime/local-multibox-nimo-rejoin-operator-runbook-v1.json',
  runbookHtml: 'public/public-node/runtime/local-multibox-nimo-rejoin-operator-runbook-v1.html',
  runtimeIndex: 'public/public-node/runtime/index.json',
  runtimeHtml: 'public/public-node/runtime/index.html',
  rootIndex: 'public/public-node/index.json'
};

for (const p of Object.values(paths)) {
  if (!fs.existsSync(p)) throw new Error(`missing ${p}`);
}

const runbook = JSON.parse(fs.readFileSync(paths.runbook, 'utf8'));
const runbookHtml = fs.readFileSync(paths.runbookHtml, 'utf8');
const runtimeIndex = JSON.parse(fs.readFileSync(paths.runtimeIndex, 'utf8'));
const runtimeHtml = fs.readFileSync(paths.runtimeHtml, 'utf8');
const rootIndex = JSON.parse(fs.readFileSync(paths.rootIndex, 'utf8'));

if (runbook.marker !== marker) throw new Error('runbook marker mismatch');
if (runbook.expected_green_marker !== green) throw new Error('runbook green marker mismatch');

for (const [name, idx] of Object.entries({ runtimeIndex, rootIndex })) {
  if (idx.links?.local_multibox_nimo_rejoin_operator_runbook !== jsonRoute) throw new Error(`${name} json link mismatch`);
  if (idx.links?.local_multibox_nimo_rejoin_operator_runbook_html !== htmlRoute) throw new Error(`${name} html link mismatch`);
  if (idx.route_markers?.local_multibox_nimo_rejoin_operator_runbook !== marker) throw new Error(`${name} route marker mismatch`);
  if (idx.local_multibox_nimo_rejoin_operator_runbook?.marker !== marker) throw new Error(`${name} summary marker mismatch`);
  if (idx.local_multibox_nimo_rejoin_operator_runbook?.expected_green_marker !== green) throw new Error(`${name} summary green mismatch`);
  if (idx.local_multibox_nimo_rejoin_operator_runbook?.boundary?.automatic_peer_dial_enabled_by_this_runbook !== false) {
    throw new Error(`${name} must not enable automatic peer dial`);
  }
}

for (const needle of [marker, jsonRoute, htmlRoute]) {
  if (!runbookHtml.includes(needle)) throw new Error(`runbook html missing ${needle}`);
  if (!runtimeHtml.includes(needle)) throw new Error(`runtime html missing ${needle}`);
}

console.log('VOID_LOCAL_MULTIBOX_NIMO_REJOIN_OPERATOR_RUNBOOK_INDEX_V1_GREEN');
