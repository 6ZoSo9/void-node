import fs from 'node:fs';

const jsonPath = 'public/public-node/runtime/local-multibox-status-v1.json';
const htmlPath = 'public/public-node/runtime/local-multibox-status-v1.html';
const docPath = 'docs/public-node/local-multibox-runtime-status-v1.md';

for (const p of [jsonPath, htmlPath, docPath]) {
  if (!fs.existsSync(p)) {
    throw new Error(`missing required file: ${p}`);
  }
}

const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const html = fs.readFileSync(htmlPath, 'utf8');
const doc = fs.readFileSync(docPath, 'utf8');

if (json.marker !== 'VOID_LOCAL_MULTIBOX_RUNTIME_STATUS_V1') {
  throw new Error('bad or missing JSON marker');
}

const names = json.machines.map((m) => m.name);
const active = ['Precision', 'Nimo/N153B', 'Xiphos'];
if (JSON.stringify(names) !== JSON.stringify(active)) {
  throw new Error(`active fleet mismatch: ${JSON.stringify(names)}`);
}
if (JSON.stringify(json.summary?.active_operator_fleet) !== JSON.stringify(active)) {
  throw new Error('summary active fleet mismatch');
}
if (JSON.stringify(json.summary?.retired_operator_machines) !== JSON.stringify(['Alienware'])) {
  throw new Error('retired fleet mismatch');
}
if (json.summary?.current_all_fleet_runtime_green_claim !== false) {
  throw new Error('status must not claim current all-fleet runtime green');
}
if (!json.historical_observation?.machines?.some((m) => m.name === 'Alienware')) {
  throw new Error('historical Alienware observation was not preserved');
}

const boundary = json.boundary || {};
const mustBeFalse = [
  'mutation_route_enabled',
  'wallet_send_enabled',
  'money_movement_enabled',
  'buy_void_fulfillment_enabled',
  'wc_to_void_swap_enabled',
  'validator_mutation_enabled',
  'validator_admission_enabled',
  'public_wc_self_serve_earning_enabled',
  'public_internet_mesh_claim'
];

for (const key of mustBeFalse) {
  if (boundary[key] !== false) {
    throw new Error(`boundary ${key} must be false`);
  }
}

if (boundary.read_only !== true || boundary.public_routes_only !== true) {
  throw new Error('read-only/public-routes-only boundary missing');
}

for (const content of [html, doc]) {
  if (!content.includes('VOID_LOCAL_MULTIBOX_RUNTIME_STATUS_V1')) {
    throw new Error('marker missing from HTML or doc');
  }
  if (!content.includes('Precision') || !content.includes('Nimo/N153B') || !content.includes('Xiphos')) {
    throw new Error('active fleet names missing from HTML or doc');
  }
  if (!content.includes('Alienware is retired')) {
    throw new Error('retired Alienware boundary missing from HTML or doc');
  }
}

console.log('VOID_LOCAL_MULTIBOX_RUNTIME_STATUS_V1_GREEN');
