import fs from 'node:fs';

const marker = 'VOID_PUBLIC_NODE_OPERATOR_REVIEW_LANE_ROLLUP_V1';
const green = 'VOID_PUBLIC_NODE_OPERATOR_REVIEW_LANE_ROLLUP_V1_GREEN';

const requiredMarkers = [
  marker,
  'VOID_PUBLIC_NODE_OPERATOR_STATUS_ROLLUP_V1',
  'VOID_PUBLIC_NODE_OPERATOR_STATUS_ROLLUP_CLOSEOUT_V1_GREEN',
  'VOID_PUBLIC_NODE_OPERATOR_QUICKSTART_V1',
  'VOID_PUBLIC_NODE_OPERATOR_QUICKSTART_CLOSEOUT_V1_GREEN',
  'VOID_PUBLIC_NODE_OPERATOR_HANDOFF_PACKET_V1',
  'VOID_PUBLIC_NODE_OPERATOR_HANDOFF_PACKET_CLOSEOUT_V1_GREEN',
  'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_EXAMPLE_V1',
  'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_EXAMPLE_CLOSEOUT_V1_GREEN',
  'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_CHECKLIST_V1',
  'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_CHECKLIST_CLOSEOUT_V1_GREEN',
  'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_DECISION_TEMPLATE_V1',
  'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_DECISION_TEMPLATE_CLOSEOUT_V1_GREEN',
  'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_DECISION_EXAMPLE_V1',
  'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_DECISION_EXAMPLE_CLOSEOUT_V1_GREEN',
  'VOID_PUBLIC_NODE_CONNECT_LANE_CLOSEOUT_V1_GREEN',
  'VOID_PUBLIC_NODE_CONNECT_PACK_V1',
  'VOID_PUBLIC_NODE_CONNECT_RECEIPT_TEMPLATE_V1',
  'VOID_PUBLIC_BOOTSTRAP_GATEWAY_V1'
];

const files = {
  rollupDoc: 'docs/public/public-node-operator-review-lane-rollup-v1.md',
  rollupJson: 'public/public-node/public-node-operator-review-lane-rollup-v1.json',
  rollupHtml: 'public/public-node/public-node-operator-review-lane-rollup-v1.html',
  rollupPage: 'public/public-node/operator-review-lane-rollup-v1.html',

  statusRollupJson: 'public/public-node/public-node-operator-status-rollup-v1.json',
  quickstartJson: 'public/public-node/public-node-operator-quickstart-v1.json',
  handoffJson: 'public/public-node/public-node-operator-handoff-packet-v1.json',
  receiptExampleJson: 'public/public-node/public-node-operator-receipt-example-v1.json',
  checklistJson: 'public/public-node/public-node-operator-receipt-review-checklist-v1.json',
  decisionTemplateJson: 'public/public-node/public-node-operator-receipt-review-decision-template-v1.json',
  decisionExampleJson: 'public/public-node/public-node-operator-receipt-review-decision-example-v1.json',
  connectPackJson: 'public/public-node/connect/public-node-connect-pack-v1.json',
  receiptTemplateJson: 'public/public-node/connect/public-node-connect-receipt-template-v1.json',
  bootstrapDoc: 'docs/public/public-bootstrap-gateway.md',

  proofStatusRollupCloseout: 'tools/proof-public-node-operator-status-rollup-closeout-v1.mjs',
  proofQuickstartCloseout: 'tools/proof-public-node-operator-quickstart-closeout-v1.mjs',
  proofHandoffCloseout: 'tools/proof-public-node-operator-handoff-packet-closeout-v1.mjs',
  proofReceiptExampleCloseout: 'tools/proof-public-node-operator-receipt-example-closeout-v1.mjs',
  proofChecklistCloseout: 'tools/proof-public-node-operator-receipt-review-checklist-closeout-v1.mjs',
  proofDecisionTemplateCloseout: 'tools/proof-public-node-operator-receipt-review-decision-template-closeout-v1.mjs',
  proofDecisionExampleCloseout: 'tools/proof-public-node-operator-receipt-review-decision-example-closeout-v1.mjs',
  proofConnectLaneCloseout: 'tools/proof-public-node-connect-lane-closeout-v1.mjs',
  proofConnectPack: 'tools/proof-public-node-connect-pack-v1.mjs',
  proofReceiptTemplate: 'tools/proof-public-node-connect-receipt-template-v1.mjs',
  proofRuntimeRoute: 'tools/proof-local-multibox-runtime-route-v1.mjs'
};

function read(path) {
  if (!fs.existsSync(path)) throw new Error(`missing file ${path}`);
  return fs.readFileSync(path, 'utf8');
}

const doc = read(files.rollupDoc);
const jsonText = read(files.rollupJson);
const html = read(files.rollupHtml);
const page = read(files.rollupPage);
const data = JSON.parse(jsonText);

if (data.schema !== 'void.public_node.operator_review_lane_rollup.v1') throw new Error('bad schema');
if (data.marker !== marker) throw new Error('bad marker');
if (data.status !== 'operator_review_lane_rollup_ready') throw new Error('bad status');
if (data.expected_green_marker !== green) throw new Error('bad expected green marker');

for (const key of ['routes', 'review_sequence', 'review_lane_components', 'boundary']) {
  if (!(key in data)) throw new Error(`missing key ${key}`);
}

if (!Array.isArray(data.review_sequence) || data.review_sequence.length < 6) throw new Error('review sequence incomplete');
if (!Array.isArray(data.review_lane_components) || data.review_lane_components.length < 10) throw new Error('review lane components incomplete');

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
  read(files.handoffJson),
  read(files.receiptExampleJson),
  read(files.checklistJson),
  read(files.decisionTemplateJson),
  read(files.decisionExampleJson),
  read(files.connectPackJson),
  read(files.receiptTemplateJson),
  read(files.bootstrapDoc),
  read(files.proofStatusRollupCloseout),
  read(files.proofQuickstartCloseout),
  read(files.proofHandoffCloseout),
  read(files.proofReceiptExampleCloseout),
  read(files.proofChecklistCloseout),
  read(files.proofDecisionTemplateCloseout),
  read(files.proofDecisionExampleCloseout),
  read(files.proofConnectLaneCloseout),
  read(files.proofConnectPack),
  read(files.proofReceiptTemplate),
  read(files.proofRuntimeRoute)
].join('\n');

for (const m of requiredMarkers) {
  if (!combined.includes(m)) throw new Error(`missing marker binding ${m}`);
}

for (const [key, expected] of Object.entries({
  read_only: true,
  public_routes_only: true,
  operator_review_lane_rollup_only: true,
  operator_status_visibility_only: true,
  operator_guidance_only: true,
  rollup_creates_no_receipt: true,
  rollup_creates_no_review_decision: true,
  rollup_creates_no_work_credit_claim: true,
  rollup_creates_no_validator_admission: true,
  rollup_creates_no_money_movement: true,
  automatic_peer_dial_enabled_by_this_rollup: false,
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
  'rollup creates no receipt',
  'rollup creates no review decision',
  'rollup creates no work credit claim',
  'rollup creates no validator admission',
  'rollup creates no money movement',
  'not automatic peer dialing',
  'not mutation route enablement',
  'not wallet send enablement',
  'not money movement',
  'not buy void fulfillment',
  'not wc to void settlement',
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
  files.proofQuickstartCloseout,
  files.proofHandoffCloseout,
  files.proofReceiptExampleCloseout,
  files.proofChecklistCloseout,
  files.proofDecisionTemplateCloseout,
  files.proofDecisionExampleCloseout,
  files.proofConnectLaneCloseout,
  files.proofConnectPack,
  files.proofReceiptTemplate,
  files.proofRuntimeRoute
]) {
  if (!fs.existsSync(proofFile)) throw new Error(`missing proof file ${proofFile}`);
  if (!proofFile.startsWith('tools/proof-')) throw new Error(`unexpected proof path ${proofFile}`);
}

console.log(green);
