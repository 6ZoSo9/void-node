import fs from 'node:fs';

const marker = 'VOID_LOCAL_MULTIBOX_NIMO_REJOIN_OPERATOR_RUNBOOK_ROUTE_V1';
const runbookMarker = 'VOID_LOCAL_MULTIBOX_NIMO_REJOIN_OPERATOR_RUNBOOK_V1';
const jsonRoute = '/public-node/runtime/local-multibox-nimo-rejoin-operator-runbook-v1.json';
const htmlRoute = '/public-node/runtime/local-multibox-nimo-rejoin-operator-runbook-v1.html';

const paths = {
  routeSource: 'src/local-multibox-runtime-route-v1.ts',
  runbookJson: 'public/public-node/runtime/local-multibox-nimo-rejoin-operator-runbook-v1.json',
  runbookHtml: 'public/public-node/runtime/local-multibox-nimo-rejoin-operator-runbook-v1.html',
  runtimeIndex: 'public/public-node/runtime/index.json',
  rootIndex: 'public/public-node/index.json'
};

for (const p of Object.values(paths)) {
  if (!fs.existsSync(p)) throw new Error(`missing ${p}`);
}

const src = fs.readFileSync(paths.routeSource, 'utf8');
const data = JSON.parse(fs.readFileSync(paths.runbookJson, 'utf8'));
const html = fs.readFileSync(paths.runbookHtml, 'utf8');
const runtimeIndex = JSON.parse(fs.readFileSync(paths.runtimeIndex, 'utf8'));
const rootIndex = JSON.parse(fs.readFileSync(paths.rootIndex, 'utf8'));

for (const needle of [
  'nimoRunbookJsonRoute',
  'nimoRunbookHtmlRoute',
  'nimoRunbookJsonPath',
  'nimoRunbookHtmlPath',
  'app.get(nimoRunbookJsonRoute',
  'app.get(nimoRunbookHtmlRoute',
  jsonRoute,
  htmlRoute
]) {
  if (!src.includes(needle)) throw new Error(`route source missing ${needle}`);
}

if (data.marker !== runbookMarker) throw new Error('runbook marker mismatch');
if (!html.includes(runbookMarker)) throw new Error('runbook html missing marker');

for (const [name, idx] of Object.entries({ runtimeIndex, rootIndex })) {
  if (idx.links?.local_multibox_nimo_rejoin_operator_runbook !== jsonRoute) throw new Error(`${name} json link mismatch`);
  if (idx.links?.local_multibox_nimo_rejoin_operator_runbook_html !== htmlRoute) throw new Error(`${name} html link mismatch`);
  if (idx.route_markers?.local_multibox_nimo_rejoin_operator_runbook !== runbookMarker) throw new Error(`${name} marker mismatch`);
}

if (data.boundary?.automatic_peer_dial_enabled_by_this_runbook !== false) throw new Error('must not enable automatic peer dial');
if (data.boundary?.mutation_route_enabled !== false) throw new Error('must not enable mutation');
if (data.boundary?.money_movement_enabled !== false) throw new Error('must not enable money movement');
if (data.boundary?.public_internet_mesh_claim !== false) throw new Error('must not claim public internet mesh');

console.log(`${marker}_GREEN`);
