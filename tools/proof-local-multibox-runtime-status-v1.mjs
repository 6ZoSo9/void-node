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
for (const required of ['Precision', 'Alienware', 'Nimo/N153B']) {
  if (!names.includes(required)) {
    throw new Error(`missing machine: ${required}`);
  }
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
  if (!content.includes('Precision') || !content.includes('Alienware') || !content.includes('Nimo/N153B')) {
    throw new Error('machine names missing from HTML or doc');
  }
}

console.log('VOID_LOCAL_MULTIBOX_RUNTIME_STATUS_V1_GREEN');
