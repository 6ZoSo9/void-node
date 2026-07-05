import fs from 'node:fs';

const green = 'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_DECISION_EXAMPLE_CLOSEOUT_V1_GREEN';

const markers = {
  decisionExample: 'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_DECISION_EXAMPLE_V1',
  decisionExampleGreen: 'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_DECISION_EXAMPLE_V1_GREEN',
  decisionExampleIndexRouteGreen: 'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_DECISION_EXAMPLE_INDEX_ROUTE_V1_GREEN',
  decisionTemplate: 'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_DECISION_TEMPLATE_V1',
  decisionTemplateCloseoutGreen: 'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_DECISION_TEMPLATE_CLOSEOUT_V1_GREEN',
  checklist: 'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_CHECKLIST_V1',
  checklistCloseoutGreen: 'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_CHECKLIST_CLOSEOUT_V1_GREEN',
  receiptExample: 'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_EXAMPLE_V1',
  receiptExampleCloseoutGreen: 'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_EXAMPLE_CLOSEOUT_V1_GREEN',
  handoffPacket: 'VOID_PUBLIC_NODE_OPERATOR_HANDOFF_PACKET_V1',
  handoffPacketCloseoutGreen: 'VOID_PUBLIC_NODE_OPERATOR_HANDOFF_PACKET_CLOSEOUT_V1_GREEN',
  statusRollup: 'VOID_PUBLIC_NODE_OPERATOR_STATUS_ROLLUP_V1',
  statusRollupCloseoutGreen: 'VOID_PUBLIC_NODE_OPERATOR_STATUS_ROLLUP_CLOSEOUT_V1_GREEN',
  quickstart: 'VOID_PUBLIC_NODE_OPERATOR_QUICKSTART_V1',
  quickstartCloseoutGreen: 'VOID_PUBLIC_NODE_OPERATOR_QUICKSTART_CLOSEOUT_V1_GREEN',
  connectLaneCloseoutGreen: 'VOID_PUBLIC_NODE_CONNECT_LANE_CLOSEOUT_V1_GREEN',
  connectPack: 'VOID_PUBLIC_NODE_CONNECT_PACK_V1',
  receiptTemplate: 'VOID_PUBLIC_NODE_CONNECT_RECEIPT_TEMPLATE_V1',
  bootstrap: 'VOID_PUBLIC_BOOTSTRAP_GATEWAY_V1'
};

const routes = {
  decisionExamplePage: '/public-node/operator-receipt-review-decision-example-v1',
  decisionExampleJson: '/public-node/public-node-operator-receipt-review-decision-example-v1.json',
  decisionExampleHtml: '/public-node/public-node-operator-receipt-review-decision-example-v1.html',
  decisionTemplatePage: '/public-node/operator-receipt-review-decision-template-v1',
  decisionTemplateJson: '/public-node/public-node-operator-receipt-review-decision-template-v1.json',
  checklistPage: '/public-node/operator-receipt-review-checklist-v1',
  checklistJson: '/public-node/public-node-operator-receipt-review-checklist-v1.json',
  receiptExamplePage: '/public-node/operator-receipt-example-v1',
  receiptExampleJson: '/public-node/public-node-operator-receipt-example-v1.json',
  handoffPage: '/public-node/operator-handoff-packet-v1',
  handoffJson: '/public-node/public-node-operator-handoff-packet-v1.json',
  statusRollupPage: '/public-node/operator-status-rollup-v1',
  statusRollupJson: '/public-node/public-node-operator-status-rollup-v1.json',
  quickstartPage: '/public-node/operator-quickstart-v1',
  quickstartJson: '/public-node/public-node-operator-quickstart-v1.json',
  connectPack: '/public-node/connect',
  connectPackJson: '/public-node/connect/public-node-connect-pack-v1.json',
  receiptTemplate: '/public-node/connect/receipt-template-v1',
  receiptTemplateJson: '/public-node/connect/public-node-connect-receipt-template-v1.json',
  bootstrapPublic: '/__void/public-bootstrap.json',
  bootstrapPeers: '/bootstrap/peers.json'
};

const files = {
  root: 'public/public-node/index.json',
  decisionExampleDoc: 'docs/public/public-node-operator-receipt-review-decision-example-v1.md',
  decisionExamplePage: 'public/public-node/operator-receipt-review-decision-example-v1.html',
  decisionExampleJson: 'public/public-node/public-node-operator-receipt-review-decision-example-v1.json',
  decisionExampleHtml: 'public/public-node/public-node-operator-receipt-review-decision-example-v1.html',
  decisionTemplateJson: 'public/public-node/public-node-operator-receipt-review-decision-template-v1.json',
  checklistJson: 'public/public-node/public-node-operator-receipt-review-checklist-v1.json',
  receiptExampleJson: 'public/public-node/public-node-operator-receipt-example-v1.json',
  handoffJson: 'public/public-node/public-node-operator-handoff-packet-v1.json',
  statusRollupJson: 'public/public-node/public-node-operator-status-rollup-v1.json',
  quickstartJson: 'public/public-node/public-node-operator-quickstart-v1.json',
  connectPackJson: 'public/public-node/connect/public-node-connect-pack-v1.json',
  receiptTemplateJson: 'public/public-node/connect/public-node-connect-receipt-template-v1.json',
  bootstrapDoc: 'docs/public/public-bootstrap-gateway.md',
  routeSource: 'src/local-multibox-runtime-route-v1.ts',

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
  proofHandoffPacket: 'tools/proof-public-node-operator-handoff-packet-v1.mjs',
  proofHandoffPacketIndexRoute: 'tools/proof-public-node-operator-handoff-packet-index-route-v1.mjs',
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
const root = JSON.parse(rootText);
const exampleText = read(files.decisionExampleJson);
const example = JSON.parse(exampleText);
const exampleDoc = read(files.decisionExampleDoc);
const examplePage = read(files.decisionExamplePage);
const exampleHtml = read(files.decisionExampleHtml);
const decisionTemplateText = read(files.decisionTemplateJson);
const checklistText = read(files.checklistJson);
const receiptExampleText = read(files.receiptExampleJson);
const handoffText = read(files.handoffJson);
const statusRollupText = read(files.statusRollupJson);
const quickstartText = read(files.quickstartJson);
const connectPackText = read(files.connectPackJson);
const receiptTemplateText = read(files.receiptTemplateJson);
const bootstrapDoc = read(files.bootstrapDoc);
const routeSource = read(files.routeSource);

if (example.schema !== 'void.public_node.operator_receipt_review_decision_example.v1') throw new Error('bad decision example schema');
if (example.marker !== markers.decisionExample) throw new Error('bad decision example marker');
if (example.status !== 'operator_receipt_review_decision_example_ready') throw new Error('bad decision example status');
if (example.expected_green_marker !== markers.decisionExampleGreen) throw new Error('bad decision example expected green marker');

if (!Array.isArray(example.allowed_outcomes) || example.allowed_outcomes.length < 5) throw new Error('allowed outcomes incomplete');
if (!Array.isArray(example.reject_if_present) || example.reject_if_present.length < 10) throw new Error('reject list incomplete');

if (example.example_decision?.example_only !== true) throw new Error('example decision is not example_only');
if (example.example_decision?.private_material_included !== false) throw new Error('example includes private material');
if (example.example_decision?.review_decision_created !== false) throw new Error('example creates review decision');
if (example.example_decision?.receipt_created !== false) throw new Error('example creates receipt');
if (example.example_decision?.work_credit_claim_created !== false) throw new Error('example creates Work Credit claim');
if (example.example_decision?.money_transfer_claim !== false) throw new Error('example makes money transfer claim');
if (example.example_decision?.validator_admission_claim !== false) throw new Error('example makes validator admission claim');
if (example.example_decision?.public_internet_mesh_claim !== false) throw new Error('example makes public internet mesh claim');

if (root.links?.public_node_operator_receipt_review_decision_example !== routes.decisionExamplePage) throw new Error('root missing decision example page link');
if (root.links?.public_node_operator_receipt_review_decision_example_json !== routes.decisionExampleJson) throw new Error('root missing decision example json link');
if (root.links?.public_node_operator_receipt_review_decision_example_html !== routes.decisionExampleHtml) throw new Error('root missing decision example html link');
if (root.route_markers?.public_node_operator_receipt_review_decision_example !== markers.decisionExample) throw new Error('root missing decision example route marker');
if (root.public_node_operator_receipt_review_decision_example?.marker !== markers.decisionExample) throw new Error('root decision example marker mismatch');
if (root.public_node_operator_receipt_review_decision_example?.status !== 'operator_receipt_review_decision_example_ready') throw new Error('root decision example status mismatch');
if (root.public_node_operator_receipt_review_decision_example?.expected_green_marker !== markers.decisionExampleIndexRouteGreen) {
  throw new Error('root decision example expected index-route green mismatch');
}

for (const route of [routes.decisionExamplePage, routes.decisionExampleJson, routes.decisionExampleHtml]) {
  if (!rootText.includes(route)) throw new Error(`root missing decision example route ${route}`);
  if (!routeSource.includes(route)) throw new Error(`route source missing decision example route ${route}`);
}

for (const needle of [
  'publicNodeOperatorReceiptReviewDecisionExamplePageRoute',
  'publicNodeOperatorReceiptReviewDecisionExampleJsonRoute',
  'publicNodeOperatorReceiptReviewDecisionExampleHtmlRoute',
  'publicNodeOperatorReceiptReviewDecisionExamplePagePath',
  'publicNodeOperatorReceiptReviewDecisionExampleJsonPath',
  'publicNodeOperatorReceiptReviewDecisionExampleHtmlPath',
  'app.get(publicNodeOperatorReceiptReviewDecisionExamplePageRoute',
  'app.get(publicNodeOperatorReceiptReviewDecisionExampleJsonRoute',
  'app.get(publicNodeOperatorReceiptReviewDecisionExampleHtmlRoute'
]) {
  if (!routeSource.includes(needle)) throw new Error(`route source missing ${needle}`);
}

const surfaceText = [
  rootText,
  exampleText,
  exampleDoc,
  examplePage,
  exampleHtml,
  decisionTemplateText,
  checklistText,
  receiptExampleText,
  handoffText,
  statusRollupText,
  quickstartText,
  connectPackText,
  receiptTemplateText,
  bootstrapDoc,
  routeSource
].join('\n');

for (const route of Object.values(routes)) {
  if (!surfaceText.includes(route)) throw new Error(`missing route binding ${route}`);
}

for (const marker of [
  markers.decisionExample,
  markers.decisionTemplate,
  markers.decisionTemplateCloseoutGreen,
  markers.checklist,
  markers.checklistCloseoutGreen,
  markers.receiptExample,
  markers.receiptExampleCloseoutGreen,
  markers.handoffPacket,
  markers.handoffPacketCloseoutGreen,
  markers.statusRollup,
  markers.statusRollupCloseoutGreen,
  markers.quickstart,
  markers.quickstartCloseoutGreen,
  markers.connectLaneCloseoutGreen,
  markers.connectPack,
  markers.receiptTemplate,
  markers.bootstrap
]) {
  if (!surfaceText.includes(marker)) throw new Error(`missing surface marker binding ${marker}`);
}

for (const [key, expected] of Object.entries({
  read_only: true,
  public_routes_only: true,
  operator_receipt_review_decision_example_only: true,
  manual_review_example_only: true,
  operator_guidance_only: true,
  example_creates_no_receipt: true,
  example_creates_no_review_decision: true,
  example_creates_no_work_credit_claim: true,
  example_creates_no_validator_admission: true,
  example_creates_no_money_movement: true,
  automatic_peer_dial_enabled_by_this_example: false,
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
  if (example.boundary?.[key] !== expected) throw new Error(`bad decision example boundary ${key}`);
  if (root.public_node_operator_receipt_review_decision_example?.boundary?.[key] !== expected) {
    throw new Error(`bad root decision example boundary ${key}`);
  }
}

const lower = surfaceText.toLowerCase();
for (const phrase of [
  'example creates no receipt',
  'example creates no review decision',
  'example creates no work credit claim',
  'example creates no validator admission',
  'example creates no money movement',
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

for (const field of [
  'based_on_template_marker',
  'reviewer_alias',
  'receipt_reference',
  'review_checklist_marker',
  'observed_receipt_example_marker',
  'observed_handoff_packet_marker',
  'observed_receipt_template_marker',
  'review_outcome',
  'review_reason',
  'public_safe_notes',
  'private_key',
  'seed_phrase',
  'wallet_secret',
  'signer_secret',
  'money_transfer_claim',
  'validator_admission_claim',
  'work_credit_claim',
  'public_internet_mesh_claim'
]) {
  if (!surfaceText.includes(field)) throw new Error(`missing decision example field binding ${field}`);
}

for (const proofFile of [
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
  files.proofHandoffPacket,
  files.proofHandoffPacketIndexRoute,
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

const proofText = [
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
  read(files.proofHandoffPacket),
  read(files.proofHandoffPacketIndexRoute),
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
  read(files.proofRuntimeRoute)
].join('\n');

for (const marker of [
  markers.decisionExampleGreen,
  markers.decisionExampleIndexRouteGreen,
  markers.decisionTemplateCloseoutGreen,
  markers.checklistCloseoutGreen,
  markers.receiptExampleCloseoutGreen,
  markers.handoffPacketCloseoutGreen,
  markers.statusRollupCloseoutGreen,
  markers.quickstartCloseoutGreen,
  markers.connectLaneCloseoutGreen
]) {
  if (!proofText.includes(marker) && !surfaceText.includes(marker)) throw new Error(`missing proof marker binding ${marker}`);
}

console.log(green);
