import fs from 'node:fs';

const marker = 'VOID_LOCAL_MULTIBOX_NIMO_REJOIN_FINAL_CLOSEOUT_AUDIT_V1';
const green = `${marker}_GREEN`;

const files = {
  root: 'public/public-node/index.json',
  runtime: 'public/public-node/runtime/index.json',
  runtimeHtml: 'public/public-node/runtime/index.html',
  route: 'src/local-multibox-runtime-route-v1.ts',
  peerCard: 'public/public-node/runtime/local-multibox-runtime-peer-rejoin-card-v1.json',
  runbook: 'public/public-node/runtime/local-multibox-nimo-rejoin-operator-runbook-v1.json',
  runbookDoc: 'docs/public/local-multibox-nimo-rejoin-operator-runbook-v1.md',
  peerProof: 'tools/proof-local-multibox-runtime-peer-rejoin-card-route-v1.mjs',
  runbookProof: 'tools/proof-local-multibox-nimo-rejoin-operator-runbook-route-v1.mjs',
  priorFinal: 'tools/proof-local-multibox-runtime-final-chain-audit-v1.mjs'
};

for (const file of Object.values(files)) {
  if (!fs.existsSync(file)) throw new Error(`missing ${file}`);
}

const root = JSON.parse(fs.readFileSync(files.root, 'utf8'));
const runtime = JSON.parse(fs.readFileSync(files.runtime, 'utf8'));
const runtimeHtml = fs.readFileSync(files.runtimeHtml, 'utf8');
const route = fs.readFileSync(files.route, 'utf8');
const peer = JSON.parse(fs.readFileSync(files.peerCard, 'utf8'));
const runbook = JSON.parse(fs.readFileSync(files.runbook, 'utf8'));
const runbookDoc = fs.readFileSync(files.runbookDoc, 'utf8');
const peerProof = fs.readFileSync(files.peerProof, 'utf8');
const runbookProof = fs.readFileSync(files.runbookProof, 'utf8');
const priorFinal = fs.readFileSync(files.priorFinal, 'utf8');

const precisionId = '9d89483769e469e0473b489dc50dba96';
const nimoId = '042c8b22f14cf343139e9bc806937bf3';
const nimoAddr = '192.168.1.99:4701';

const peerMarker = 'VOID_LOCAL_MULTIBOX_RUNTIME_PEER_REJOIN_CARD_V1';
const runbookMarker = 'VOID_LOCAL_MULTIBOX_NIMO_REJOIN_OPERATOR_RUNBOOK_V1';

const peerJson = '/public-node/runtime/local-multibox-runtime-peer-rejoin-card-v1.json';
const peerHtml = '/public-node/runtime/local-multibox-runtime-peer-rejoin-card-v1.html';
const runbookJson = '/public-node/runtime/local-multibox-nimo-rejoin-operator-runbook-v1.json';
const runbookHtml = '/public-node/runtime/local-multibox-nimo-rejoin-operator-runbook-v1.html';

function ok(v, msg) {
  if (!v) throw new Error(msg);
}

function mustFalse(obj, keys, label) {
  for (const key of keys) ok(obj?.[key] === false, `${label}.${key} must be false`);
}

ok(peer.marker === peerMarker, 'peer marker mismatch');
ok(runbook.marker === runbookMarker, 'runbook marker mismatch');

ok(peer.nodes?.precision?.node_id === precisionId, 'peer precision id mismatch');
ok(peer.nodes?.nimo?.node_id === nimoId, 'peer nimo id mismatch');
ok(peer.nodes?.nimo?.p2p === nimoAddr, 'peer nimo addr mismatch');
ok(peer.nodes?.nimo?.http_reachable_from_precision === false, 'peer must not claim nimo http');
ok(peer.nodes?.nimo?.ssh_reachable_from_precision === false, 'peer must not claim nimo ssh');

ok(runbook.topology?.precision?.node_id === precisionId, 'runbook precision id mismatch');
ok(runbook.topology?.nimo?.node_id === nimoId, 'runbook nimo id mismatch');
ok(runbook.topology?.nimo?.p2p === nimoAddr, 'runbook nimo addr mismatch');
ok(runbook.expected_after_rejoin?.peer_id === nimoId, 'runbook expected peer id mismatch');
ok(runbook.expected_after_rejoin?.peer_addr === nimoAddr, 'runbook expected peer addr mismatch');

mustFalse(peer.boundary, [
  'automatic_peer_dial_enabled_by_this_card',
  'mutation_route_enabled',
  'wallet_send_enabled',
  'money_movement_enabled',
  'buy_void_fulfillment_enabled',
  'wc_to_void_swap_enabled',
  'validator_mutation_enabled',
  'validator_admission_enabled',
  'public_wc_self_serve_earning_enabled',
  'public_internet_mesh_claim'
], 'peer.boundary');

mustFalse(runbook.boundary, [
  'automatic_peer_dial_enabled_by_this_runbook',
  'mutation_route_enabled',
  'wallet_send_enabled',
  'money_movement_enabled',
  'buy_void_fulfillment_enabled',
  'wc_to_void_swap_enabled',
  'validator_mutation_enabled',
  'validator_admission_enabled',
  'public_wc_self_serve_earning_enabled',
  'public_internet_mesh_claim'
], 'runbook.boundary');

for (const [name, idx] of Object.entries({ root, runtime })) {
  ok(idx.links?.local_multibox_runtime_peer_rejoin_card === peerJson, `${name} peer json link mismatch`);
  ok(idx.links?.local_multibox_runtime_peer_rejoin_card_html === peerHtml, `${name} peer html link mismatch`);
  ok(idx.route_markers?.local_multibox_runtime_peer_rejoin_card === peerMarker, `${name} peer marker mismatch`);
  ok(idx.links?.local_multibox_nimo_rejoin_operator_runbook === runbookJson, `${name} runbook json link mismatch`);
  ok(idx.links?.local_multibox_nimo_rejoin_operator_runbook_html === runbookHtml, `${name} runbook html link mismatch`);
  ok(idx.route_markers?.local_multibox_nimo_rejoin_operator_runbook === runbookMarker, `${name} runbook marker mismatch`);
}

for (const needle of [peerMarker, runbookMarker, peerJson, peerHtml, runbookJson, runbookHtml]) {
  ok(runtimeHtml.includes(needle), `runtime html missing ${needle}`);
}

for (const needle of [runbookMarker, nimoId, nimoAddr, 'automatic peer dialing', 'public internet mesh claim']) {
  ok(runbookDoc.includes(needle), `runbook doc missing ${needle}`);
}

ok(peerProof.includes('VOID_LOCAL_MULTIBOX_RUNTIME_PEER_REJOIN_CARD_ROUTE_V1'), 'peer route proof marker missing');
ok(peerProof.includes(peerJson), 'peer route proof missing json route');
ok(peerProof.includes(peerHtml), 'peer route proof missing html route');

ok(runbookProof.includes('VOID_LOCAL_MULTIBOX_NIMO_REJOIN_OPERATOR_RUNBOOK_ROUTE_V1'), 'runbook route proof marker missing');
ok(runbookProof.includes(runbookJson), 'runbook route proof missing json route');
ok(runbookProof.includes(runbookHtml), 'runbook route proof missing html route');

ok(priorFinal.includes('VOID_LOCAL_MULTIBOX_RUNTIME_FINAL_CHAIN_AUDIT_V1'), 'prior final chain marker missing');

ok(route.includes('app.get(peerRejoinJsonRoute'), 'peer json route not mounted');
ok(route.includes('app.get(peerRejoinHtmlRoute'), 'peer html route not mounted');
ok(route.includes('app.get(nimoRunbookJsonRoute'), 'runbook json route not mounted');
ok(route.includes('app.get(nimoRunbookHtmlRoute'), 'runbook html route not mounted');

ok(peer.observed_peer_surface?.precision_health_peers?.includes(nimoId), 'peer health evidence missing nimo');
ok((peer.observed_peer_surface?.known_addrs || []).includes(nimoAddr), 'known addrs missing nimo');
ok(peer.operator_evidence?.assert_marker === 'VOID_PRECISION_NIMO_P2P_REJOIN_GREEN_30S_V1_ASSERT_OK', 'operator assert marker mismatch');

ok(peerProof.includes('VOID_LOCAL_MULTIBOX_RUNTIME_PEER_REJOIN_CARD_ROUTE_V1'), 'peer route proof marker missing');
ok(runbookProof.includes('VOID_LOCAL_MULTIBOX_NIMO_REJOIN_OPERATOR_RUNBOOK_ROUTE_V1'), 'runbook route proof marker missing');
ok(priorFinal.includes('VOID_LOCAL_MULTIBOX_RUNTIME_FINAL_CHAIN_AUDIT_V1'), 'prior final chain marker missing');

console.log(green);
