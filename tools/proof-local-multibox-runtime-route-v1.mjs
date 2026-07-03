import fs from 'node:fs';

const indexPath = 'src/index.ts';
const routePath = 'src/local-multibox-runtime-route-v1.ts';
const statusPath = 'public/public-node/runtime/local-multibox-status-v1.json';
const htmlPath = 'public/public-node/runtime/local-multibox-status-v1.html';

for (const p of [indexPath, routePath, statusPath, htmlPath]) {
  if (!fs.existsSync(p)) throw new Error(`missing required file: ${p}`);
}

const index = fs.readFileSync(indexPath, 'utf8');
const route = fs.readFileSync(routePath, 'utf8');
const status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
const html = fs.readFileSync(htmlPath, 'utf8');

if (!index.includes('mountLocalMultiboxRuntimeRouteV1(app);')) {
  throw new Error('index.ts missing tiny route mount call');
}

if (index.includes('VOID_LOCAL_MULTIBOX_RUNTIME_ROUTE_V1')) {
  throw new Error('route marker must live outside src/index.ts to satisfy index guard hygiene');
}

if (!route.includes('VOID_LOCAL_MULTIBOX_RUNTIME_ROUTE_V1')) {
  throw new Error('route marker missing from extracted module');
}

for (const requiredRoute of [
  '/public-node/runtime/local-multibox-status-v1.json',
  '/public-node/runtime/local-multibox-status-v1.html',
  '/__void/diag/local-multibox-runtime-route-v1.json'
]) {
  if (!route.includes(requiredRoute)) throw new Error(`missing route in extracted module: ${requiredRoute}`);
}

if (status.marker !== 'VOID_LOCAL_MULTIBOX_RUNTIME_STATUS_V1') {
  throw new Error('bad status marker');
}

for (const name of ['Precision', 'Alienware', 'Nimo/N153B']) {
  if (!JSON.stringify(status).includes(name)) throw new Error(`missing machine in status JSON: ${name}`);
  if (!html.includes(name)) throw new Error(`missing machine in HTML: ${name}`);
}

const b = status.boundary || {};
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

console.log('VOID_LOCAL_MULTIBOX_RUNTIME_ROUTE_V1_GREEN');
