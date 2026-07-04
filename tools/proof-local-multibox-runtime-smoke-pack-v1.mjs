import fs from 'node:fs';

const files = {
  route: 'src/local-multibox-runtime-route-v1.ts',
  indexJson: 'public/public-node/runtime/index.json',
  indexHtml: 'public/public-node/runtime/index.html',
  smokeJson: 'public/public-node/runtime/smoke-pack-v1.json',
  smokeScript: 'public/public-node/runtime/smoke-pack-v1.sh',
  wellKnownProof: 'tools/proof-well-known-local-multibox-runtime-discovery-link-v1.mjs'
};

for (const p of Object.values(files)) {
  if (!fs.existsSync(p)) throw new Error(`missing required file: ${p}`);
}

const route = fs.readFileSync(files.route, 'utf8');
const indexJson = JSON.parse(fs.readFileSync(files.indexJson, 'utf8'));
const indexHtml = fs.readFileSync(files.indexHtml, 'utf8');
const smokeJson = JSON.parse(fs.readFileSync(files.smokeJson, 'utf8'));
const smokeScript = fs.readFileSync(files.smokeScript, 'utf8');

if (smokeJson.marker !== 'VOID_LOCAL_MULTIBOX_RUNTIME_SMOKE_PACK_V1') throw new Error('bad smoke pack marker');

for (const required of ['VOID_LOCAL_MULTIBOX_RUNTIME_SMOKE_PACK_ROUTE_V1','/public-node/runtime/smoke-pack-v1.json','/public-node/runtime/smoke-pack-v1.sh']) {
  if (!route.includes(required)) throw new Error(`route module missing: ${required}`);
}

for (const required of ['VOID_LOCAL_MULTIBOX_RUNTIME_SMOKE_PACK_V1','VOID_LOCAL_MULTIBOX_RUNTIME_SMOKE_PACK_V1_GREEN','/.well-known/void-public-node.json','/public-node/index.json','/public-node/runtime','/public-node/runtime/index.json','/public-node/runtime/local-multibox-status-v1.json','/__void/diag/local-multibox-runtime-route-v1.json']) {
  if (!JSON.stringify(smokeJson).includes(required) && !smokeScript.includes(required)) throw new Error(`smoke pack/script missing required token: ${required}`);
}

for (const required of ['/public-node/runtime/smoke-pack-v1.json','/public-node/runtime/smoke-pack-v1.sh']) {
  if (!JSON.stringify(indexJson).includes(required)) throw new Error(`runtime index JSON missing: ${required}`);
  if (!indexHtml.includes(required.replace('/public-node/runtime/', './'))) throw new Error(`runtime index HTML missing relative link for: ${required}`);
}

const b = smokeJson.boundary || {};
for (const key of ['mutation_route_enabled','wallet_send_enabled','money_movement_enabled','buy_void_fulfillment_enabled','wc_to_void_swap_enabled','validator_mutation_enabled','validator_admission_enabled','public_wc_self_serve_earning_enabled','public_internet_mesh_claim']) {
  if (b[key] !== false) throw new Error(`smoke boundary must remain false: ${key}`);
}

if (b.read_only !== true || b.public_routes_only !== true) throw new Error('smoke boundary must remain read-only/public-routes-only');

console.log('VOID_LOCAL_MULTIBOX_RUNTIME_SMOKE_PACK_V1_GREEN');
