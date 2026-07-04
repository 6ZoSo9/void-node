import fs from 'node:fs';

const routePath = 'src/local-multibox-runtime-route-v1.ts';
const indexJsonPath = 'public/public-node/runtime/index.json';
const indexHtmlPath = 'public/public-node/runtime/index.html';
const statusJsonPath = 'public/public-node/runtime/local-multibox-status-v1.json';
const statusHtmlPath = 'public/public-node/runtime/local-multibox-status-v1.html';

for (const p of [routePath, indexJsonPath, indexHtmlPath, statusJsonPath, statusHtmlPath]) {
  if (!fs.existsSync(p)) throw new Error(`missing required file: ${p}`);
}

const route = fs.readFileSync(routePath, 'utf8');
const indexJson = JSON.parse(fs.readFileSync(indexJsonPath, 'utf8'));
const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
const statusJson = JSON.parse(fs.readFileSync(statusJsonPath, 'utf8'));
const statusHtml = fs.readFileSync(statusHtmlPath, 'utf8');

if (indexJson.marker !== 'VOID_LOCAL_MULTIBOX_RUNTIME_DISCOVERY_INDEX_V1') {
  throw new Error('bad discovery index JSON marker');
}

if (!indexHtml.includes('VOID_LOCAL_MULTIBOX_RUNTIME_DISCOVERY_INDEX_V1')) {
  throw new Error('discovery index HTML marker missing');
}

if (statusJson.marker !== 'VOID_LOCAL_MULTIBOX_RUNTIME_STATUS_V1') {
  throw new Error('bad status JSON marker');
}

if (!statusHtml.includes('VOID_LOCAL_MULTIBOX_RUNTIME_STATUS_V1')) {
  throw new Error('status HTML marker missing');
}

for (const routeLiteral of [
  '/public-node/runtime',
  '/public-node/runtime/index.json',
  '/public-node/runtime/index.html',
  '/public-node/runtime/local-multibox-status-v1.json',
  '/public-node/runtime/local-multibox-status-v1.html',
  '/__void/diag/local-multibox-runtime-route-v1.json'
]) {
  if (!route.includes(routeLiteral)) throw new Error(`route module missing route literal: ${routeLiteral}`);
  if (routeLiteral !== '/public-node/runtime' && routeLiteral !== '/public-node/runtime/index.html') {
    if (!JSON.stringify(indexJson).includes(routeLiteral)) throw new Error(`index JSON missing link: ${routeLiteral}`);
  }
}

for (const name of ['Precision', 'Alienware', 'Nimo/N153B']) {
  if (!JSON.stringify(indexJson).includes(name)) throw new Error(`index JSON missing machine: ${name}`);
  if (!indexHtml.includes(name)) throw new Error(`index HTML missing machine: ${name}`);
}

const b = indexJson.boundary || {};
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
  if (b[key] !== false) throw new Error(`discovery boundary must remain false: ${key}`);
}

if (b.read_only !== true || b.public_routes_only !== true) {
  throw new Error('discovery index must remain read-only/public-routes-only');
}

console.log('VOID_LOCAL_MULTIBOX_RUNTIME_DISCOVERY_INDEX_V1_GREEN');
