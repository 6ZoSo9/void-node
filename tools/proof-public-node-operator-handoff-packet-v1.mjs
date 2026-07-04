import fs from 'node:fs';

const marker = 'VOID_PUBLIC_NODE_OPERATOR_HANDOFF_PACKET_V1';
const green = 'VOID_PUBLIC_NODE_OPERATOR_HANDOFF_PACKET_V1_GREEN';

const requiredMarkers = [
  marker,
  'VOID_PUBLIC_NODE_OPERATOR_STATUS_ROLLUP_V1',
  'VOID_PUBLIC_NODE_OPERATOR_STATUS_ROLLUP_CLOSEOUT_V1_GREEN',
  'VOID_PUBLIC_NODE_OPERATOR_QUICKSTART_V1',
  'VOID_PUBLIC_NODE_OPERATOR_QUICKSTART_CLOSEOUT_V1_GREEN',
  'VOID_PUBLIC_NODE_CONNECT_LANE_CLOSEOUT_V1_GREEN',
  'VOID_PUBLIC_NODE_CONNECT_PACK_V1',
  'VOID_PUBLIC_NODE_CONNECT_RECEIPT_TEMPLATE_V1',
  'VOID_PUBLIC_BOOTSTRAP_GATEWAY_V1'
];

const files = {
  packetDoc: 'docs/public/public-node-operator-handoff-packet-v1.md',
  packetJson: 'public/public-node/public-node-operator-handoff-packet-v1.json',
  packetHtml: 'public/public-node/public-node-operator-handoff-packet-v1.html',
  packetPage: 'public/public-node/operator-handoff-packet-v1.html',

  statusRollupJson: 'public/public-node/public-node-operator-status-rollup-v1.json',
  quickstartJson: 'public/public-node/public-node-operator-quickstart-v1.json',
  connectPackJson: 'public/public-node/connect/public-node-connect-pack-v1.json',
  receiptTemplateJson: 'public/public-node/connect/public-node-connect-receipt-template-v1.json',
  bootstrapDoc: 'docs/public/public-bootstrap-gateway.md',

  proofStatusRollupCloseout: 'tools/proof-public-node-operator-status-rollup-closeout-v1.mjs',
  proofStatusRollup: 'tools/proof-public-node-operator-status-rollup-v1.mjs',
  proofStatusRollupIndexRoute: 'tools/proof-public-node-operator-status-rollup-index-route-v1.mjs',
  proofQuickstartCloseout: 'tools/proof-public-node-operator-quickstart-closeout-v1.mjs',
  proofQuickstart: 'tools/proof-public-node-operator-quickstart-v1.mjs',
  proofQuickstartIndexRoute: 'tools/proof-public-node-operator-quickstart-index-route-v1.mjs',
  proofConnectLaneCloseout: 'tools/proof-public-node-connect-lane-closeout-v1.mjs',
  proofConnectPack: 'tools/proof-public-node-connect-pack-v1.mjs',
  proofReceiptTemplate: 'tools/proof-public-node-connect-receipt-template-v1.mjs'
};

function read(path) {
  if (!fs.existsSync(path)) throw new Error(`missing file ${path}`);
  return fs.readFileSync(path, 'utf8');
}

const doc = read(files.packetDoc);
const jsonText = read(files.packetJson);
const html = read(files.packetHtml);
const page = read(files.packetPage);
const data = JSON.parse(jsonText);

if (data.schema !== 'void.public_node.operator_handoff_packet.v1') throw new Error('bad schema');
if (data.marker !== marker) throw new Error('bad marker');
if (data.status !== 'operator_handoff_packet_ready') throw new Error('bad status');
if (data.expected_green_marker !== green) throw new Error('bad expected green marker');

for (const key of ['routes', 'components', 'recipient_steps', 'required_public_receipt_fields', 'forbidden_receipt_fields', 'boundary']) {
  if (!(key in data)) throw new Error(`missing key ${key}`);
}

for (const route of Object.values(data.routes)) {
  for (const [name, text] of [['doc', doc], ['json', jsonText], ['html', html], ['page', page]]) {
    if (!text.includes(route)) throw new Error(`${name} missing route ${route}`);
  }
}

const combined = [
  doc,
  jsonText,
  html,
  page,
  read(files.statusRollupJson),
  read(files.quickstartJson),
  read(files.connectPackJson),
  read(files.receiptTemplateJson),
  read(files.bootstrapDoc),
  read(files.proofStatusRollupCloseout),
  read(files.proofQuickstartCloseout),
  read(files.proofConnectLaneCloseout)
].join('\n');

for (const m of requiredMarkers) {
  if (!combined.includes(m)) throw new Error(`missing marker binding ${m}`);
}

for (const [key, expected] of Object.entries({
  read_only: true,
  public_routes_only: true,
  operator_handoff_packet_only: true,
  operator_guidance_only: true,
  automatic_peer_dial_enabled_by_this_packet: false,
  mutation_route_enabled: false,
  wallet_send_enabled: false,
  money_movement_enabled: false,
  buy_void_fulfillment_enabled: false,
  wc_to_void_swap_enabled: false,
  validator_mutation_enabled: false,
  validator_admission_enabled: false,
  public_wc_self_serve_earning_enabled: false,
  work_credit_claim_created: false,
  public_internet_mesh_claim: false
})) {
  if (data.boundary[key] !== expected) throw new Error(`bad boundary ${key}`);
}

const lower = combined.toLowerCase();
for (const needle of [
  'not automatic peer dialing',
  'not mutation route enablement',
  'not wallet send enablement',
  'not money movement',
  'not validator mutation',
  'not public work credit self-serve earning',
  'not work credit claim creation',
  'not a public internet mesh claim',
  'do not share private keys'
]) {
  if (!lower.includes(needle)) throw new Error(`missing safety phrase ${needle}`);
}

for (const proofFile of [
  files.proofStatusRollupCloseout,
  files.proofStatusRollup,
  files.proofStatusRollupIndexRoute,
  files.proofQuickstartCloseout,
  files.proofQuickstart,
  files.proofQuickstartIndexRoute,
  files.proofConnectLaneCloseout,
  files.proofConnectPack,
  files.proofReceiptTemplate
]) {
  if (!fs.existsSync(proofFile)) throw new Error(`missing proof file ${proofFile}`);
  if (!proofFile.startsWith('tools/proof-')) throw new Error(`unexpected proof path ${proofFile}`);
}

console.log(green);
