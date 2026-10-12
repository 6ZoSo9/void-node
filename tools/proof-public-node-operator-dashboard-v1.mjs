import fs from 'node:fs';

const marker = 'VOID_PUBLIC_NODE_OPERATOR_DASHBOARD_V1';
const green = 'VOID_PUBLIC_NODE_OPERATOR_DASHBOARD_V1_GREEN';

const requiredMarkers = [
  marker,
  'VOID_PUBLIC_NODE_OPERATOR_STATUS_ROLLUP_V1',
  'VOID_PUBLIC_NODE_OPERATOR_QUICKSTART_V1',
  'VOID_PUBLIC_NODE_CONNECT_PACK_V1',
  'VOID_PUBLIC_NODE_CONNECT_RECEIPT_TEMPLATE_V1',
  'VOID_PUBLIC_NODE_OPERATOR_HANDOFF_PACKET_V1',
  'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_EXAMPLE_V1',
  'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_CHECKLIST_V1',
  'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_DECISION_TEMPLATE_V1',
  'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_DECISION_EXAMPLE_V1',
  'VOID_PUBLIC_NODE_OPERATOR_REVIEW_LANE_ROLLUP_V1',
  'VOID_PUBLIC_NODE_OPERATOR_REVIEW_LANE_ROLLUP_CLOSEOUT_V1_GREEN',
  'VOID_PUBLIC_NODE_OPERATOR_REVIEW_LANE_FINAL_SEAL_V1_GREEN',
  'VOID_PUBLIC_NODE_OPERATOR_REVIEW_LANE_FINAL_SEAL_CLOSEOUT_V1_GREEN',
  'VOID_PUBLIC_NODE_CONNECT_LANE_CLOSEOUT_V1_GREEN',
  'VOID_PUBLIC_NODE_CONNECT_PACK_CLOSEOUT_V1_GREEN',
  'VOID_PUBLIC_BOOTSTRAP_GATEWAY_V1',
  'VOID_LOCAL_MULTIBOX_RUNTIME_SMOKE_PACK_V1_GREEN',
  'VOID_LOCAL_MULTIBOX_RUNTIME_ROUTE_V1_GREEN'
];

const files = {
  dashboardDoc: 'docs/public/public-node-operator-dashboard-v1.md',
  dashboardJson: 'public/public-node/public-node-operator-dashboard-v1.json',
  dashboardHtml: 'public/public-node/public-node-operator-dashboard-v1.html',
  dashboardPage: 'public/public-node/operator-dashboard-v1.html',

  statusRollupJson: 'public/public-node/public-node-operator-status-rollup-v1.json',
  quickstartJson: 'public/public-node/public-node-operator-quickstart-v1.json',
  connectPackJson: 'public/public-node/connect/public-node-connect-pack-v1.json',
  receiptTemplateJson: 'public/public-node/connect/public-node-connect-receipt-template-v1.json',
  handoffJson: 'public/public-node/public-node-operator-handoff-packet-v1.json',
  receiptExampleJson: 'public/public-node/public-node-operator-receipt-example-v1.json',
  checklistJson: 'public/public-node/public-node-operator-receipt-review-checklist-v1.json',
  decisionTemplateJson: 'public/public-node/public-node-operator-receipt-review-decision-template-v1.json',
  decisionExampleJson: 'public/public-node/public-node-operator-receipt-review-decision-example-v1.json',
  reviewLaneRollupJson: 'public/public-node/public-node-operator-review-lane-rollup-v1.json',
  bootstrapDoc: 'docs/public/public-bootstrap-gateway.md',
  runtimeSmokePack: 'public/public-node/runtime/smoke-pack-v1.sh',

  proofFinalSealCloseout: 'tools/proof-public-node-operator-review-lane-final-seal-closeout-v1.mjs',
  proofFinalSeal: 'tools/proof-public-node-operator-review-lane-final-seal-v1.mjs',
  proofReviewLaneRollupCloseout: 'tools/proof-public-node-operator-review-lane-rollup-closeout-v1.mjs',
  proofReviewLaneRollup: 'tools/proof-public-node-operator-review-lane-rollup-v1.mjs',
  proofConnectLaneCloseout: 'tools/proof-public-node-connect-lane-closeout-v1.mjs',
  proofConnectPackCloseout: 'tools/proof-public-node-connect-pack-closeout-v1.mjs',
  proofRuntimeRoute: 'tools/proof-local-multibox-runtime-route-v1.mjs'
};

function read(path) {
  if (!fs.existsSync(path)) throw new Error(`missing file ${path}`);
  return fs.readFileSync(path, 'utf8');
}

const doc = read(files.dashboardDoc);
const jsonText = read(files.dashboardJson);
const html = read(files.dashboardHtml);
const page = read(files.dashboardPage);
const data = JSON.parse(jsonText);

if (data.schema !== 'void.public_node.operator_dashboard.v1') throw new Error('bad dashboard schema');
if (data.marker !== marker) throw new Error('bad dashboard marker');
if (data.status !== 'operator_dashboard_ready') throw new Error('bad dashboard status');
if (data.expected_green_marker !== green) throw new Error('bad expected green marker');

for (const key of ['routes', 'dashboard_sections', 'recommended_operator_path', 'boundary']) {
  if (!(key in data)) throw new Error(`missing dashboard key ${key}`);
}

if (!Array.isArray(data.dashboard_sections) || data.dashboard_sections.length < 8) throw new Error('dashboard sections incomplete');
if (!Array.isArray(data.recommended_operator_path) || data.recommended_operator_path.length < 8) throw new Error('operator path incomplete');

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
  read(files.handoffJson),
  read(files.receiptExampleJson),
  read(files.checklistJson),
  read(files.decisionTemplateJson),
  read(files.decisionExampleJson),
  read(files.reviewLaneRollupJson),
  read(files.bootstrapDoc),
  read(files.runtimeSmokePack),
  read(files.proofFinalSealCloseout),
  read(files.proofFinalSeal),
  read(files.proofReviewLaneRollupCloseout),
  read(files.proofReviewLaneRollup),
  read(files.proofConnectLaneCloseout),
  read(files.proofConnectPackCloseout),
  read(files.proofRuntimeRoute)
].join('\n');

for (const m of requiredMarkers) {
  if (!combined.includes(m)) throw new Error(`missing marker binding ${m}`);
}

for (const [key, expected] of Object.entries({
  read_only: true,
  public_routes_only: true,
  operator_dashboard_only: true,
  human_facing_navigation_only: true,
  operator_guidance_only: true,
  dashboard_creates_no_receipt: true,
  dashboard_creates_no_review_decision: true,
  dashboard_creates_no_work_credit_claim: true,
  dashboard_creates_no_validator_admission: true,
  dashboard_creates_no_money_movement: true,
  automatic_peer_dial_enabled_by_this_dashboard: false,
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
  'dashboard creates no receipt',
  'dashboard creates no review decision',
  'dashboard creates no work credit claim',
  'dashboard creates no validator admission',
  'dashboard creates no money movement',
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

console.log(green);
