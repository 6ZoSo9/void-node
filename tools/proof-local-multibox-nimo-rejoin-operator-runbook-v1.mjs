import fs from 'node:fs';

const marker = 'VOID_LOCAL_MULTIBOX_NIMO_REJOIN_OPERATOR_RUNBOOK_V1';
const green = 'VOID_LOCAL_MULTIBOX_NIMO_REJOIN_OPERATOR_RUNBOOK_V1_GREEN';

const paths = {
  doc: 'docs/public/local-multibox-nimo-rejoin-operator-runbook-v1.md',
  json: 'public/public-node/runtime/local-multibox-nimo-rejoin-operator-runbook-v1.json',
  html: 'public/public-node/runtime/local-multibox-nimo-rejoin-operator-runbook-v1.html',
  peerCard: 'public/public-node/runtime/local-multibox-runtime-peer-rejoin-card-v1.json'
};

for (const p of Object.values(paths)) {
  if (!fs.existsSync(p)) throw new Error(`missing ${p}`);
}

const doc = fs.readFileSync(paths.doc, 'utf8');
const data = JSON.parse(fs.readFileSync(paths.json, 'utf8'));
const html = fs.readFileSync(paths.html, 'utf8');
const peerCard = JSON.parse(fs.readFileSync(paths.peerCard, 'utf8'));

if (data.marker !== marker) throw new Error('marker mismatch');
if (data.expected_green_marker !== green) throw new Error('green marker mismatch');
if (data.status !== 'operator_runbook_ready') throw new Error('status mismatch');

if (peerCard.marker !== 'VOID_LOCAL_MULTIBOX_RUNTIME_PEER_REJOIN_CARD_V1') throw new Error('peer card marker mismatch');
if (peerCard.nodes?.nimo?.node_id !== '042c8b22f14cf343139e9bc806937bf3') throw new Error('peer card nimo id mismatch');
if (peerCard.nodes?.nimo?.p2p !== '192.168.1.99:4701') throw new Error('peer card nimo p2p mismatch');

for (const [k, want] of Object.entries({
  read_only: true,
  public_routes_only: true,
  operator_guidance_only: true,
  automatic_peer_dial_enabled_by_this_runbook: false,
  mutation_route_enabled: false,
  wallet_send_enabled: false,
  money_movement_enabled: false,
  buy_void_fulfillment_enabled: false,
  wc_to_void_swap_enabled: false,
  validator_mutation_enabled: false,
  validator_admission_enabled: false,
  public_wc_self_serve_earning_enabled: false,
  public_internet_mesh_claim: false
})) {
  if (data.boundary?.[k] !== want) throw new Error(`boundary ${k} expected ${want}, got ${data.boundary?.[k]}`);
}

for (const needle of [
  marker,
  '192.168.1.99:4701',
  '042c8b22f14cf343139e9bc806937bf3',
  'automatic peer dialing',
  'public internet mesh claim'
]) {
  if (!doc.includes(needle)) throw new Error(`doc missing ${needle}`);
  if (!html.includes(needle)) throw new Error(`html missing ${needle}`);
}

console.log(green);
