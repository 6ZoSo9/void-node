import fs from 'node:fs';

const marker = 'VOID_PUBLIC_NODE_OPERATOR_DASHBOARD_V1';
const green = 'VOID_PUBLIC_NODE_OPERATOR_DASHBOARD_V1_GREEN';
const indexGreen = 'VOID_PUBLIC_NODE_OPERATOR_DASHBOARD_INDEX_ROUTE_V1_GREEN';

const routes = {
  page: '/public-node/operator-dashboard-v1',
  json: '/public-node/public-node-operator-dashboard-v1.json',
  html: '/public-node/public-node-operator-dashboard-v1.html'
};

const files = {
  root: 'public/public-node/index.json',
  dashboardDoc: 'docs/public/public-node-operator-dashboard-v1.md',
  dashboardJson: 'public/public-node/public-node-operator-dashboard-v1.json',
  dashboardHtml: 'public/public-node/public-node-operator-dashboard-v1.html',
  dashboardPage: 'public/public-node/operator-dashboard-v1.html',
  routeSource: 'src/local-multibox-runtime-route-v1.ts',
  dashboardProof: 'tools/proof-public-node-operator-dashboard-v1.mjs',
  reviewLaneRollupJson: 'public/public-node/public-node-operator-review-lane-rollup-v1.json',
  finalSealCloseoutProof: 'tools/proof-public-node-operator-review-lane-final-seal-closeout-v1.mjs'
};

function read(path) {
  if (!fs.existsSync(path)) throw new Error(`missing file ${path}`);
  return fs.readFileSync(path, 'utf8');
}

const rootText = read(files.root);
const dashboardText = read(files.dashboardJson);
const dashboardDoc = read(files.dashboardDoc);
const dashboardHtml = read(files.dashboardHtml);
const dashboardPage = read(files.dashboardPage);
const routeSource = read(files.routeSource);
const dashboardProof = read(files.dashboardProof);

const root = JSON.parse(rootText);
const dashboard = JSON.parse(dashboardText);

if (dashboard.schema !== 'void.public_node.operator_dashboard.v1') throw new Error('bad dashboard schema');
if (dashboard.marker !== marker) throw new Error('bad dashboard marker');
if (dashboard.status !== 'operator_dashboard_ready') throw new Error('bad dashboard status');
if (dashboard.expected_green_marker !== green) throw new Error('bad dashboard base green');

if (root.links?.public_node_operator_dashboard !== routes.page) throw new Error('root missing dashboard page link');
if (root.links?.public_node_operator_dashboard_json !== routes.json) throw new Error('root missing dashboard json link');
if (root.links?.public_node_operator_dashboard_html !== routes.html) throw new Error('root missing dashboard html link');
if (root.route_markers?.public_node_operator_dashboard !== marker) throw new Error('root missing dashboard route marker');

const rootDashboard = root.public_node_operator_dashboard;
if (!rootDashboard) throw new Error('root missing dashboard object');
if (rootDashboard.marker !== marker) throw new Error('root dashboard marker mismatch');
if (rootDashboard.status !== 'operator_dashboard_ready') throw new Error('root dashboard status mismatch');
if (rootDashboard.expected_green_marker !== indexGreen) throw new Error('root dashboard expected index green mismatch');
if (rootDashboard.base_green_marker !== green) throw new Error('root dashboard base green mismatch');

if (!Array.isArray(rootDashboard.dashboard_sections) || rootDashboard.dashboard_sections.length < 8) {
  throw new Error('root dashboard sections incomplete');
}
if (!Array.isArray(rootDashboard.recommended_operator_path) || rootDashboard.recommended_operator_path.length < 8) {
  throw new Error('root dashboard operator path incomplete');
}

for (const [name, route] of Object.entries(routes)) {
  if (!rootText.includes(route)) throw new Error(`root missing route ${name}`);
  if (!dashboardText.includes(route)) throw new Error(`dashboard json missing route ${name}`);
  if (!dashboardDoc.includes(route)) throw new Error(`dashboard doc missing route ${name}`);
  if (!dashboardHtml.includes(route)) throw new Error(`dashboard html missing route ${name}`);
  if (!dashboardPage.includes(route)) throw new Error(`dashboard page missing route ${name}`);
  if (!routeSource.includes(route)) throw new Error(`runtime source missing route ${name}`);
}

for (const needle of [
  'publicNodeOperatorDashboardPageRoute',
  'publicNodeOperatorDashboardJsonRoute',
  'publicNodeOperatorDashboardHtmlRoute',
  'publicNodeOperatorDashboardPagePath',
  'publicNodeOperatorDashboardJsonPath',
  'publicNodeOperatorDashboardHtmlPath',
  'app.get(publicNodeOperatorDashboardPageRoute',
  'app.get(publicNodeOperatorDashboardJsonRoute',
  'app.get(publicNodeOperatorDashboardHtmlRoute'
]) {
  if (!routeSource.includes(needle)) throw new Error(`runtime source missing ${needle}`);
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
  if (dashboard.boundary?.[key] !== expected) throw new Error(`bad dashboard boundary ${key}`);
  if (rootDashboard.boundary?.[key] !== expected) throw new Error(`bad root dashboard boundary ${key}`);
}

const combined = [
  rootText,
  dashboardText,
  dashboardDoc,
  dashboardHtml,
  dashboardPage,
  routeSource,
  dashboardProof,
  read(files.reviewLaneRollupJson),
  read(files.finalSealCloseoutProof)
].join('\n');

for (const needle of [
  marker,
  green,
  'VOID_PUBLIC_NODE_OPERATOR_REVIEW_LANE_ROLLUP_V1',
  'VOID_PUBLIC_NODE_OPERATOR_REVIEW_LANE_FINAL_SEAL_CLOSEOUT_V1_GREEN',
  'VOID_PUBLIC_NODE_OPERATOR_STATUS_ROLLUP_V1',
  'VOID_PUBLIC_NODE_OPERATOR_QUICKSTART_V1',
  'VOID_PUBLIC_NODE_OPERATOR_HANDOFF_PACKET_V1',
  'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_EXAMPLE_V1',
  'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_CHECKLIST_V1',
  'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_DECISION_TEMPLATE_V1',
  'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_DECISION_EXAMPLE_V1',
  'VOID_PUBLIC_NODE_CONNECT_PACK_V1',
  'VOID_PUBLIC_NODE_CONNECT_RECEIPT_TEMPLATE_V1',
  'VOID_PUBLIC_BOOTSTRAP_GATEWAY_V1',
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
  'not a public internet mesh claim'
]) {
  if (!combined.toLowerCase().includes(needle.toLowerCase())) throw new Error(`missing binding ${needle}`);
}

console.log(indexGreen);
