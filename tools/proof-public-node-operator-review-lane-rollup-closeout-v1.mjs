import fs from 'node:fs';

const green = 'VOID_PUBLIC_NODE_OPERATOR_REVIEW_LANE_ROLLUP_CLOSEOUT_V1_GREEN';

const markers = {
  rollup: 'VOID_PUBLIC_NODE_OPERATOR_REVIEW_LANE_ROLLUP_V1',
  rollupGreen: 'VOID_PUBLIC_NODE_OPERATOR_REVIEW_LANE_ROLLUP_V1_GREEN',
  rollupIndexRouteGreen: 'VOID_PUBLIC_NODE_OPERATOR_REVIEW_LANE_ROLLUP_INDEX_ROUTE_V1_GREEN',
  decisionExampleCloseoutGreen: 'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_DECISION_EXAMPLE_CLOSEOUT_V1_GREEN',
  decisionExample: 'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_DECISION_EXAMPLE_V1',
  decisionTemplateCloseoutGreen: 'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_DECISION_TEMPLATE_CLOSEOUT_V1_GREEN',
  decisionTemplate: 'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_DECISION_TEMPLATE_V1',
  checklistCloseoutGreen: 'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_CHECKLIST_CLOSEOUT_V1_GREEN',
  checklist: 'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_CHECKLIST_V1',
  receiptExampleCloseoutGreen: 'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_EXAMPLE_CLOSEOUT_V1_GREEN',
  receiptExample: 'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_EXAMPLE_V1',
  handoffCloseoutGreen: 'VOID_PUBLIC_NODE_OPERATOR_HANDOFF_PACKET_CLOSEOUT_V1_GREEN',
  handoff: 'VOID_PUBLIC_NODE_OPERATOR_HANDOFF_PACKET_V1',
  statusRollupCloseoutGreen: 'VOID_PUBLIC_NODE_OPERATOR_STATUS_ROLLUP_CLOSEOUT_V1_GREEN',
  statusRollup: 'VOID_PUBLIC_NODE_OPERATOR_STATUS_ROLLUP_V1',
  quickstartCloseoutGreen: 'VOID_PUBLIC_NODE_OPERATOR_QUICKSTART_CLOSEOUT_V1_GREEN',
  quickstart: 'VOID_PUBLIC_NODE_OPERATOR_QUICKSTART_V1',
  connectLaneCloseoutGreen: 'VOID_PUBLIC_NODE_CONNECT_LANE_CLOSEOUT_V1_GREEN',
  connectPack: 'VOID_PUBLIC_NODE_CONNECT_PACK_V1',
  receiptTemplate: 'VOID_PUBLIC_NODE_CONNECT_RECEIPT_TEMPLATE_V1',
  bootstrap: 'VOID_PUBLIC_BOOTSTRAP_GATEWAY_V1'
};

const routes = {
  rollupPage: '/public-node/operator-review-lane-rollup-v1',
  rollupJson: '/public-node/public-node-operator-review-lane-rollup-v1.json',
  rollupHtml: '/public-node/public-node-operator-review-lane-rollup-v1.html',
  statusRollup: '/public-node/operator-status-rollup-v1',
  quickstart: '/public-node/operator-quickstart-v1',
  handoff: '/public-node/operator-handoff-packet-v1',
  receiptExample: '/public-node/operator-receipt-example-v1',
  checklist: '/public-node/operator-receipt-review-checklist-v1',
  decisionTemplate: '/public-node/operator-receipt-review-decision-template-v1',
  decisionExample: '/public-node/operator-receipt-review-decision-example-v1',
  connectPack: '/public-node/connect',
  connectPackJson: '/public-node/connect/public-node-connect-pack-v1.json',
  receiptTemplateJson: '/public-node/connect/public-node-connect-receipt-template-v1.json',
  bootstrapPeers: '/bootstrap/peers.json',
  bootstrapPublic: '/__void/public-bootstrap.json'
};

const files = {
  root: 'public/public-node/index.json',
  rollupDoc: 'docs/public/public-node-operator-review-lane-rollup-v1.md',
  rollupJson: 'public/public-node/public-node-operator-review-lane-rollup-v1.json',
  rollupHtml: 'public/public-node/public-node-operator-review-lane-rollup-v1.html',
  rollupPage: 'public/public-node/operator-review-lane-rollup-v1.html',
  routeSource: 'src/local-multibox-runtime-route-v1.ts',

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

  proofRollup: 'tools/proof-public-node-operator-review-lane-rollup-v1.mjs',
  proofRollupIndexRoute: 'tools/proof-public-node-operator-review-lane-rollup-index-route-v1.mjs',
  proofDecisionExampleCloseout: 'tools/proof-public-node-operator-receipt-review-decision-example-closeout-v1.mjs',
  proofDecisionExample: 'tools/proof-public-node-operator-receipt-review-decision-example-v1.mjs',
  proofDecisionExampleIndexRoute: 'tools/proof-public-node-operator-receipt-review-decision-example-index-route-v1.mjs',
  proofDecisionTemplateCloseout: 'tools/proof-public-node-operator-receipt-review-decision-template-closeout-v1.mjs',
  proofDecisionTemplate: 'tools/proof-public-node-operator-receipt-review-decision-template-v1.mjs',
  proofDecisionTemplateIndexRoute: 'tools/proof-public-node-operator-receipt-review-decision-template-index-route-v1.mjs',
  proofChecklistCloseout: 'tools/proof-public-node-operator-receipt-review-checklist-closeout-v1.mjs',
  proofChecklist: 'tools/proof-public-node-operator-receipt-review-checklist-v1.mjs',
  proofChecklistIndexRoute: 'tools/proof-public-node-operator-receipt-review-checklist-index-route-v1.mjs',
  proofReceiptExampleCloseout: 'tools/proof-public-node-operator-receipt-example-closeout-v1.mjs',
  proofReceiptExample: 'tools/proof-public-node-operator-receipt-example-v1.mjs',
  proofReceiptExampleIndexRoute: 'tools/proof-public-node-operator-receipt-example-index-route-v1.mjs',
  proofHandoffCloseout: 'tools/proof-public-node-operator-handoff-packet-closeout-v1.mjs',
  proofHandoff: 'tools/proof-public-node-operator-handoff-packet-v1.mjs',
  proofHandoffIndexRoute: 'tools/proof-public-node-operator-handoff-packet-index-route-v1.mjs',
  proofStatusRollupCloseout: 'tools/proof-public-node-operator-status-rollup-closeout-v1.mjs',
  proofStatusRollup: 'tools/proof-public-node-operator-status-rollup-v1.mjs',
  proofStatusRollupIndexRoute: 'tools/proof-public-node-operator-status-rollup-index-route-v1.mjs',
  proofQuickstartCloseout: 'tools/proof-public-node-operator-quickstart-closeout-v1.mjs',
  proofQuickstart: 'tools/proof-public-node-operator-quickstart-v1.mjs',
  proofQuickstartIndexRoute: 'tools/proof-public-node-operator-quickstart-index-route-v1.mjs',
  proofConnectLaneCloseout: 'tools/proof-public-node-connect-lane-closeout-v1.mjs',
  proofReceiptTemplate: 'tools/proof-public-node-connect-receipt-template-v1.mjs',
  proofReceiptTemplateIndexRoute: 'tools/proof-public-node-connect-receipt-template-index-route-v1.mjs',
  proofConnectPackCloseout: 'tools/proof-public-node-connect-pack-closeout-v1.mjs',
  proofConnectPack: 'tools/proof-public-node-connect-pack-v1.mjs',
  proofConnectPackIndexRoute: 'tools/proof-public-node-connect-pack-index-route-v1.mjs',
  proofNimoCloseout: 'tools/proof-local-multibox-nimo-rejoin-final-closeout-audit-v1.mjs',
  proofRuntimeRoute: 'tools/proof-local-multibox-runtime-route-v1.mjs'
};

function read(path) {
  if (!fs.existsSync(path)) throw new Error(`missing file ${path}`);
  return fs.readFileSync(path, 'utf8');
}

const rootText = read(files.root);
const rollupText = read(files.rollupJson);
const rollupDoc = read(files.rollupDoc);
const rollupHtml = read(files.rollupHtml);
const rollupPage = read(files.rollupPage);
const routeSource = read(files.routeSource);

const root = JSON.parse(rootText);
const rollup = JSON.parse(rollupText);

if (rollup.schema !== 'void.public_node.operator_review_lane_rollup.v1') throw new Error('bad rollup schema');
if (rollup.marker !== markers.rollup) throw new Error('bad rollup marker');
if (rollup.status !== 'operator_review_lane_rollup_ready') throw new Error('bad rollup status');
if (rollup.expected_green_marker !== markers.rollupGreen) throw new Error('bad rollup green marker');

const rootRollup = root.public_node_operator_review_lane_rollup;
if (!rootRollup) throw new Error('root missing review lane rollup');
if (rootRollup.marker !== markers.rollup) throw new Error('root rollup marker mismatch');
if (rootRollup.expected_green_marker !== markers.rollupIndexRouteGreen) throw new Error('root rollup index green mismatch');
if (rootRollup.base_green_marker !== markers.rollupGreen) throw new Error('root rollup base green mismatch');

if (root.links?.public_node_operator_review_lane_rollup !== routes.rollupPage) throw new Error('root rollup page link mismatch');
if (root.links?.public_node_operator_review_lane_rollup_json !== routes.rollupJson) throw new Error('root rollup json link mismatch');
if (root.links?.public_node_operator_review_lane_rollup_html !== routes.rollupHtml) throw new Error('root rollup html link mismatch');
if (root.route_markers?.public_node_operator_review_lane_rollup !== markers.rollup) throw new Error('root rollup route marker mismatch');

if (!Array.isArray(rollup.review_sequence) || rollup.review_sequence.length < 6) throw new Error('rollup review sequence incomplete');
if (!Array.isArray(rollup.review_lane_components) || rollup.review_lane_components.length < 10) throw new Error('rollup components incomplete');
if (!Array.isArray(rootRollup.review_sequence) || rootRollup.review_sequence.length < 6) throw new Error('root rollup review sequence incomplete');
if (!Array.isArray(rootRollup.review_lane_components) || rootRollup.review_lane_components.length < 10) throw new Error('root rollup components incomplete');

for (const route of Object.values(routes)) {
  const surface = [rootText, rollupText, rollupDoc, rollupHtml, rollupPage, routeSource].join('\n');
  if (!surface.includes(route)) throw new Error(`missing route binding ${route}`);
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
  if (!routeSource.includes(needle)) throw new Error(`missing runtime mount ${needle}`);
}

const inheritedText = [
  read(files.statusRollupJson),
  read(files.quickstartJson),
  read(files.handoffJson),
  read(files.receiptExampleJson),
  read(files.checklistJson),
  read(files.decisionTemplateJson),
  read(files.decisionExampleJson),
  read(files.connectPackJson),
  read(files.receiptTemplateJson),
  read(files.bootstrapDoc)
].join('\n');

const proofText = [
  read(files.proofRollup),
  read(files.proofRollupIndexRoute),
  read(files.proofDecisionExampleCloseout),
  read(files.proofDecisionExample),
  read(files.proofDecisionExampleIndexRoute),
  read(files.proofDecisionTemplateCloseout),
  read(files.proofDecisionTemplate),
  read(files.proofDecisionTemplateIndexRoute),
  read(files.proofChecklistCloseout),
  read(files.proofChecklist),
  read(files.proofChecklistIndexRoute),
  read(files.proofReceiptExampleCloseout),
  read(files.proofReceiptExample),
  read(files.proofReceiptExampleIndexRoute),
  read(files.proofHandoffCloseout),
  read(files.proofHandoff),
  read(files.proofHandoffIndexRoute),
  read(files.proofStatusRollupCloseout),
  read(files.proofStatusRollup),
  read(files.proofStatusRollupIndexRoute),
  read(files.proofQuickstartCloseout),
  read(files.proofQuickstart),
  read(files.proofQuickstartIndexRoute),
  read(files.proofConnectLaneCloseout),
  read(files.proofReceiptTemplate),
  read(files.proofReceiptTemplateIndexRoute),
  read(files.proofConnectPackCloseout),
  read(files.proofConnectPack),
  read(files.proofConnectPackIndexRoute),
  read(files.proofNimoCloseout),
  read(files.proofRuntimeRoute)
].join('\n');

const combined = [
  rootText,
  rollupText,
  rollupDoc,
  rollupHtml,
  rollupPage,
  routeSource,
  inheritedText,
  proofText
].join('\n');

for (const marker of Object.values(markers)) {
  if (!combined.includes(marker)) throw new Error(`missing marker binding ${marker}`);
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
  if (rollup.boundary?.[key] !== expected) throw new Error(`bad rollup boundary ${key}`);
  if (rootRollup.boundary?.[key] !== expected) throw new Error(`bad root rollup boundary ${key}`);
}

const lower = combined.toLowerCase();
for (const phrase of [
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
  if (!lower.includes(phrase)) throw new Error(`missing safety phrase ${phrase}`);
}

for (const proofFile of [
  files.proofRollup,
  files.proofRollupIndexRoute,
  files.proofDecisionExampleCloseout,
  files.proofDecisionExample,
  files.proofDecisionExampleIndexRoute,
  files.proofDecisionTemplateCloseout,
  files.proofDecisionTemplate,
  files.proofDecisionTemplateIndexRoute,
  files.proofChecklistCloseout,
  files.proofChecklist,
  files.proofChecklistIndexRoute,
  files.proofReceiptExampleCloseout,
  files.proofReceiptExample,
  files.proofReceiptExampleIndexRoute,
  files.proofHandoffCloseout,
  files.proofHandoff,
  files.proofHandoffIndexRoute,
  files.proofStatusRollupCloseout,
  files.proofStatusRollup,
  files.proofStatusRollupIndexRoute,
  files.proofQuickstartCloseout,
  files.proofQuickstart,
  files.proofQuickstartIndexRoute,
  files.proofConnectLaneCloseout,
  files.proofReceiptTemplate,
  files.proofReceiptTemplateIndexRoute,
  files.proofConnectPackCloseout,
  files.proofConnectPack,
  files.proofConnectPackIndexRoute,
  files.proofNimoCloseout,
  files.proofRuntimeRoute
]) {
  if (!fs.existsSync(proofFile)) throw new Error(`missing proof file ${proofFile}`);
  if (!proofFile.startsWith('tools/proof-')) throw new Error(`unexpected proof path ${proofFile}`);
}

console.log(green);
