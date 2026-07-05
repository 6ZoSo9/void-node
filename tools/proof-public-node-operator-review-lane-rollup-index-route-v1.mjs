import fs from 'node:fs';

const marker = 'VOID_PUBLIC_NODE_OPERATOR_REVIEW_LANE_ROLLUP_V1';
const green = 'VOID_PUBLIC_NODE_OPERATOR_REVIEW_LANE_ROLLUP_V1_GREEN';
const indexGreen = 'VOID_PUBLIC_NODE_OPERATOR_REVIEW_LANE_ROLLUP_INDEX_ROUTE_V1_GREEN';

const routes = {
  page: '/public-node/operator-review-lane-rollup-v1',
  json: '/public-node/public-node-operator-review-lane-rollup-v1.json',
  html: '/public-node/public-node-operator-review-lane-rollup-v1.html'
};

const files = {
  root: 'public/public-node/index.json',
  rollupJson: 'public/public-node/public-node-operator-review-lane-rollup-v1.json',
  rollupHtml: 'public/public-node/public-node-operator-review-lane-rollup-v1.html',
  rollupPage: 'public/public-node/operator-review-lane-rollup-v1.html',
  rollupDoc: 'docs/public/public-node-operator-review-lane-rollup-v1.md',
  routeSource: 'src/local-multibox-runtime-route-v1.ts',
  baseProof: 'tools/proof-public-node-operator-review-lane-rollup-v1.mjs'
};

function read(path) {
  if (!fs.existsSync(path)) throw new Error(`missing file ${path}`);
  return fs.readFileSync(path, 'utf8');
}

const rootText = read(files.root);
const rollupText = read(files.rollupJson);
const rollupHtml = read(files.rollupHtml);
const rollupPage = read(files.rollupPage);
const rollupDoc = read(files.rollupDoc);
const routeSource = read(files.routeSource);
const baseProof = read(files.baseProof);

const root = JSON.parse(rootText);
const rollup = JSON.parse(rollupText);

if (rollup.schema !== 'void.public_node.operator_review_lane_rollup.v1') throw new Error('bad rollup schema');
if (rollup.marker !== marker) throw new Error('bad rollup marker');
if (rollup.status !== 'operator_review_lane_rollup_ready') throw new Error('bad rollup status');
if (rollup.expected_green_marker !== green) throw new Error('bad base green marker');

if (root.links?.public_node_operator_review_lane_rollup !== routes.page) throw new Error('root missing rollup page link');
if (root.links?.public_node_operator_review_lane_rollup_json !== routes.json) throw new Error('root missing rollup json link');
if (root.links?.public_node_operator_review_lane_rollup_html !== routes.html) throw new Error('root missing rollup html link');
if (root.route_markers?.public_node_operator_review_lane_rollup !== marker) throw new Error('root missing rollup route marker');

const rootRollup = root.public_node_operator_review_lane_rollup;
if (!rootRollup) throw new Error('root missing rollup object');
if (rootRollup.marker !== marker) throw new Error('root rollup marker mismatch');
if (rootRollup.status !== 'operator_review_lane_rollup_ready') throw new Error('root rollup status mismatch');
if (rootRollup.expected_green_marker !== indexGreen) throw new Error('root rollup expected index green mismatch');
if (rootRollup.base_green_marker !== green) throw new Error('root rollup base green mismatch');

for (const [name, route] of Object.entries(routes)) {
  if (!rootText.includes(route)) throw new Error(`root missing route ${name}`);
  if (!rollupText.includes(route)) throw new Error(`rollup json missing route ${name}`);
  if (!rollupHtml.includes(route)) throw new Error(`rollup html missing route ${name}`);
  if (!rollupPage.includes(route)) throw new Error(`rollup page missing route ${name}`);
  if (!rollupDoc.includes(route)) throw new Error(`rollup doc missing route ${name}`);
  if (!routeSource.includes(route)) throw new Error(`runtime source missing route ${name}`);
}

for (const needle of [
  'publicNodeOperatorReviewLaneRollupPageRoute',
  'publicNodeOperatorReviewLaneRollupJsonRoute',
  'publicNodeOperatorReviewLaneRollupHtmlRoute',
  'publicNodeOperatorReviewLaneRollupPagePath',
  'publicNodeOperatorReviewLaneRollupJsonPath',
  'publicNodeOperatorReviewLaneRollupHtmlPath',
  'app.get(publicNodeOperatorReviewLaneRollupPageRoute',
  'app.get(publicNodeOperatorReviewLaneRollupJsonRoute',
  'app.get(publicNodeOperatorReviewLaneRollupHtmlRoute'
]) {
  if (!routeSource.includes(needle)) throw new Error(`runtime source missing ${needle}`);
}

for (const key of [
  'routes',
  'review_sequence',
  'review_lane_components',
  'boundary'
]) {
  if (!(key in rootRollup)) throw new Error(`root rollup missing ${key}`);
}

if (!Array.isArray(rootRollup.review_sequence) || rootRollup.review_sequence.length < 6) throw new Error('root review sequence incomplete');
if (!Array.isArray(rootRollup.review_lane_components) || rootRollup.review_lane_components.length < 10) throw new Error('root components incomplete');

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
  if (rollup.boundary?.[key] !== expected) throw new Error(`bad rollup boundary ${key}`);
  if (rootRollup.boundary?.[key] !== expected) throw new Error(`bad root rollup boundary ${key}`);
}

const combined = [
  rootText,
  rollupText,
  rollupHtml,
  rollupPage,
  rollupDoc,
  routeSource,
  baseProof
].join('\n');

for (const needle of [
  marker,
  green,
  'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_DECISION_EXAMPLE_CLOSEOUT_V1_GREEN',
  'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_DECISION_TEMPLATE_CLOSEOUT_V1_GREEN',
  'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_CHECKLIST_CLOSEOUT_V1_GREEN',
  'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_EXAMPLE_CLOSEOUT_V1_GREEN',
  'VOID_PUBLIC_NODE_OPERATOR_HANDOFF_PACKET_CLOSEOUT_V1_GREEN',
  'VOID_PUBLIC_NODE_OPERATOR_STATUS_ROLLUP_CLOSEOUT_V1_GREEN',
  'VOID_PUBLIC_NODE_OPERATOR_QUICKSTART_CLOSEOUT_V1_GREEN',
  'VOID_PUBLIC_NODE_CONNECT_LANE_CLOSEOUT_V1_GREEN',
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
  'not a public internet mesh claim'
]) {
  if (!combined.toLowerCase().includes(needle.toLowerCase())) throw new Error(`missing binding ${needle}`);
}

console.log(indexGreen);
