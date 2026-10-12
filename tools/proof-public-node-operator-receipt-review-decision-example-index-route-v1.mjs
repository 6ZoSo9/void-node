import fs from 'node:fs';

const marker = 'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_DECISION_EXAMPLE_V1';
const green = 'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_DECISION_EXAMPLE_INDEX_ROUTE_V1_GREEN';

const routes = {
  page: '/public-node/operator-receipt-review-decision-example-v1',
  json: '/public-node/public-node-operator-receipt-review-decision-example-v1.json',
  html: '/public-node/public-node-operator-receipt-review-decision-example-v1.html',
  decisionTemplate: '/public-node/operator-receipt-review-decision-template-v1',
  decisionTemplateJson: '/public-node/public-node-operator-receipt-review-decision-template-v1.json',
  reviewChecklist: '/public-node/operator-receipt-review-checklist-v1',
  reviewChecklistJson: '/public-node/public-node-operator-receipt-review-checklist-v1.json',
  receiptExample: '/public-node/operator-receipt-example-v1',
  receiptExampleJson: '/public-node/public-node-operator-receipt-example-v1.json',
  handoffPacket: '/public-node/operator-handoff-packet-v1',
  handoffPacketJson: '/public-node/public-node-operator-handoff-packet-v1.json',
  receiptTemplate: '/public-node/connect/receipt-template-v1',
  receiptTemplateJson: '/public-node/connect/public-node-connect-receipt-template-v1.json',
  statusRollup: '/public-node/operator-status-rollup-v1',
  connectPack: '/public-node/connect',
  bootstrapPublic: '/__void/public-bootstrap.json',
  bootstrapPeers: '/bootstrap/peers.json'
};

const files = {
  root: 'public/public-node/index.json',
  exampleDoc: 'docs/public/public-node-operator-receipt-review-decision-example-v1.md',
  exampleJson: 'public/public-node/public-node-operator-receipt-review-decision-example-v1.json',
  exampleHtml: 'public/public-node/public-node-operator-receipt-review-decision-example-v1.html',
  examplePage: 'public/public-node/operator-receipt-review-decision-example-v1.html',
  routeSource: 'src/local-multibox-runtime-route-v1.ts',
  proofExample: 'tools/proof-public-node-operator-receipt-review-decision-example-v1.mjs',
  proofDecisionTemplateCloseout: 'tools/proof-public-node-operator-receipt-review-decision-template-closeout-v1.mjs',
  proofDecisionTemplate: 'tools/proof-public-node-operator-receipt-review-decision-template-v1.mjs',
  proofDecisionTemplateIndexRoute: 'tools/proof-public-node-operator-receipt-review-decision-template-index-route-v1.mjs',
  proofChecklistCloseout: 'tools/proof-public-node-operator-receipt-review-checklist-closeout-v1.mjs',
  proofReceiptExampleCloseout: 'tools/proof-public-node-operator-receipt-example-closeout-v1.mjs',
  proofHandoffCloseout: 'tools/proof-public-node-operator-handoff-packet-closeout-v1.mjs',
  proofReceiptTemplate: 'tools/proof-public-node-connect-receipt-template-v1.mjs',
  proofRuntimeRoute: 'tools/proof-local-multibox-runtime-route-v1.mjs'
};

function read(path) {
  if (!fs.existsSync(path)) throw new Error(`missing file ${path}`);
  return fs.readFileSync(path, 'utf8');
}

const rootText = read(files.root);
const root = JSON.parse(rootText);
const exampleText = read(files.exampleJson);
const example = JSON.parse(exampleText);
const routeSource = read(files.routeSource);
const doc = read(files.exampleDoc);
const html = read(files.exampleHtml);
const page = read(files.examplePage);
const proofText = [
  read(files.proofExample),
  read(files.proofDecisionTemplateCloseout),
  read(files.proofDecisionTemplate),
  read(files.proofDecisionTemplateIndexRoute),
  read(files.proofChecklistCloseout),
  read(files.proofReceiptExampleCloseout),
  read(files.proofHandoffCloseout),
  read(files.proofReceiptTemplate),
  read(files.proofRuntimeRoute)
].join('\n');

if (example.marker !== marker) throw new Error('decision example marker mismatch');
if (example.status !== 'operator_receipt_review_decision_example_ready') throw new Error('decision example status mismatch');

for (const route of [routes.page, routes.json, routes.html]) {
  if (!rootText.includes(route)) throw new Error(`root missing decision example route ${route}`);
}

for (const route of Object.values(routes)) {
  if (![doc, exampleText, html, page].some((text) => text.includes(route))) {
    throw new Error(`decision example surfaces missing route ${route}`);
  }
}

if (root.links?.public_node_operator_receipt_review_decision_example !== routes.page) throw new Error('root decision example page link mismatch');
if (root.links?.public_node_operator_receipt_review_decision_example_json !== routes.json) throw new Error('root decision example json link mismatch');
if (root.links?.public_node_operator_receipt_review_decision_example_html !== routes.html) throw new Error('root decision example html link mismatch');
if (root.route_markers?.public_node_operator_receipt_review_decision_example !== marker) throw new Error('root route marker mismatch');
if (root.public_node_operator_receipt_review_decision_example?.marker !== marker) throw new Error('root object marker mismatch');
if (root.public_node_operator_receipt_review_decision_example?.status !== 'operator_receipt_review_decision_example_ready') throw new Error('root object status mismatch');
if (root.public_node_operator_receipt_review_decision_example?.expected_green_marker !== green) throw new Error('root expected green mismatch');

for (const route of [routes.page, routes.json, routes.html]) {
  if (!routeSource.includes(route)) throw new Error(`route source missing ${route}`);
}

for (const needle of [
  'publicNodeOperatorReceiptReviewDecisionExamplePageRoute',
  'publicNodeOperatorReceiptReviewDecisionExampleJsonRoute',
  'publicNodeOperatorReceiptReviewDecisionExampleHtmlRoute',
  'public-node-operator-receipt-review-decision-example-v1.json',
  'public-node-operator-receipt-review-decision-example-v1.html',
  'operator-receipt-review-decision-example-v1.html',
  'app.get(publicNodeOperatorReceiptReviewDecisionExamplePageRoute',
  'app.get(publicNodeOperatorReceiptReviewDecisionExampleJsonRoute',
  'app.get(publicNodeOperatorReceiptReviewDecisionExampleHtmlRoute'
]) {
  if (!routeSource.includes(needle)) throw new Error(`route source missing ${needle}`);
}

for (const m of [
  marker,
  'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_DECISION_TEMPLATE_V1',
  'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_DECISION_TEMPLATE_CLOSEOUT_V1_GREEN',
  'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_CHECKLIST_V1',
  'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_CHECKLIST_CLOSEOUT_V1_GREEN',
  'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_EXAMPLE_V1',
  'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_EXAMPLE_CLOSEOUT_V1_GREEN',
  'VOID_PUBLIC_NODE_OPERATOR_HANDOFF_PACKET_V1',
  'VOID_PUBLIC_NODE_OPERATOR_HANDOFF_PACKET_CLOSEOUT_V1_GREEN',
  'VOID_PUBLIC_NODE_CONNECT_RECEIPT_TEMPLATE_V1',
  'VOID_PUBLIC_NODE_OPERATOR_STATUS_ROLLUP_V1',
  'VOID_PUBLIC_NODE_CONNECT_PACK_V1',
  'VOID_PUBLIC_BOOTSTRAP_GATEWAY_V1'
]) {
  if (![rootText, exampleText, doc, html, page, proofText].join('\n').includes(m)) {
    throw new Error(`missing marker binding ${m}`);
  }
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
  if (root.public_node_operator_receipt_review_decision_example.boundary[key] !== expected) throw new Error(`bad root boundary ${key}`);
  if (example.boundary[key] !== expected) throw new Error(`bad example boundary ${key}`);
}

console.log(green);
