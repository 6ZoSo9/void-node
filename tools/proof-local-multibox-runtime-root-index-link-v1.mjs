import fs from 'node:fs';

const rootPath = 'public/public-node/index.json';
const runtimeIndexPath = 'public/public-node/runtime/index.json';
const statusPath = 'public/public-node/runtime/local-multibox-status-v1.json';
const routeModulePath = 'src/local-multibox-runtime-route-v1.ts';

for (const p of [rootPath, runtimeIndexPath, statusPath, routeModulePath]) {
  if (!fs.existsSync(p)) throw new Error(`missing required file: ${p}`);
}

const root = JSON.parse(fs.readFileSync(rootPath, 'utf8'));
const runtime = JSON.parse(fs.readFileSync(runtimeIndexPath, 'utf8'));
const status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
const routeModule = fs.readFileSync(routeModulePath, 'utf8');

if (runtime.marker !== 'VOID_LOCAL_MULTIBOX_RUNTIME_DISCOVERY_INDEX_V1') {
  throw new Error('runtime discovery marker mismatch');
}

if (status.marker !== 'VOID_LOCAL_MULTIBOX_RUNTIME_STATUS_V1') {
  throw new Error('runtime status marker mismatch');
}


if (!routeModule.includes('VOID_LOCAL_MULTIBOX_RUNTIME_ROOT_INDEX_ROUTE_V1')) {
  throw new Error('route module missing public node root index route marker');
}

if (!routeModule.includes('/public-node/index.json')) {
  throw new Error('route module missing /public-node/index.json route');
}

const entry = root.local_multibox_runtime_discovery_index_link;
if (!entry || entry.marker !== 'VOID_LOCAL_MULTIBOX_RUNTIME_ROOT_INDEX_LINK_V1') {
  throw new Error('missing root index runtime discovery link marker');
}

for (const required of [
  '/public-node/runtime',
  '/public-node/runtime/index.html',
  '/public-node/runtime/index.json',
  '/public-node/runtime/local-multibox-status-v1.html',
  '/public-node/runtime/local-multibox-status-v1.json',
  '/__void/diag/local-multibox-runtime-route-v1.json'
]) {
  if (!JSON.stringify(entry).includes(required)) {
    throw new Error(`root link entry missing route: ${required}`);
  }
}

const routes = Array.isArray(root.routes) ? root.routes : [];
for (const required of [
  '/public-node/runtime',
  '/public-node/runtime/index.html',
  '/public-node/runtime/index.json',
  '/public-node/runtime/local-multibox-status-v1.html',
  '/public-node/runtime/local-multibox-status-v1.json'
]) {
  const found = routes.some((r) => (typeof r === 'string' ? r : r?.path) === required);
  if (!found) throw new Error(`root routes missing path: ${required}`);
}

const active = ['Precision', 'Nimo/N153B', 'Xiphos'];
if (JSON.stringify(entry.active_operator_fleet) !== JSON.stringify(active)) {
  throw new Error('root link active fleet mismatch');
}
for (const name of active) {
  if (!JSON.stringify(entry).includes(name)) throw new Error(`root link missing active machine: ${name}`);
}
if (JSON.stringify(entry.retired_operator_machines) !== JSON.stringify(['Alienware'])) {
  throw new Error('root link retired fleet mismatch');
}
if (entry.current_all_fleet_runtime_green_claim !== false) {
  throw new Error('root link must not claim current all-fleet runtime green');
}

const b = entry.boundary || {};
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

if (b.read_only !== true || b.public_routes_only !== true) {
  throw new Error('boundary must remain read-only/public-routes-only');
}

console.log('VOID_LOCAL_MULTIBOX_RUNTIME_ROOT_INDEX_LINK_V1_GREEN');
