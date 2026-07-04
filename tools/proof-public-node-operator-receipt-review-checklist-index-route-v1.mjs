import fs from 'node:fs';

const marker = 'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_CHECKLIST_V1';
const green = 'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_CHECKLIST_INDEX_ROUTE_V1_GREEN';

const routes = {
  page: '/public-node/operator-receipt-review-checklist-v1',
  json: '/public-node/public-node-operator-receipt-review-checklist-v1.json',
  html: '/public-node/public-node-operator-receipt-review-checklist-v1.html',
  receiptExample: '/public-node/operator-receipt-example-v1',
  receiptExampleJson: '/public-node/public-node-operator-receipt-example-v1.json',
  handoffPacket: '/public-node/operator-handoff-packet-v1',
  handoffPacketJson: '/public-node/public-node-operator-handoff-packet-v1.json',
  receiptTemplate: '/public-node/connect/receipt-template-v1',
  receiptTemplateJson: '/public-node/connect/public-node-connect-receipt-template-v1.json',
  statusRollup: '/public-node/operator-status-rollup-v1',
  quickstart: '/public-node/operator-quickstart-v1',
  connectPack: '/public-node/connect',
  bootstrapPublic: '/__void/public-bootstrap.json',
  bootstrapPeers: '/bootstrap/peers.json'
};

const files = {
  root: 'public/public-node/index.json',
  checklistDoc: 'docs/public/public-node-operator-receipt-review-checklist-v1.md',
  checklistJson: 'public/public-node/public-node-operator-receipt-review-checklist-v1.json',
  checklistHtml: 'public/public-node/public-node-operator-receipt-review-checklist-v1.html',
  checklistPage: 'public/public-node/operator-receipt-review-checklist-v1.html',
  routeSource: 'src/local-multibox-runtime-route-v1.ts',
  proofChecklist: 'tools/proof-public-node-operator-receipt-review-checklist-v1.mjs',
  proofReceiptExampleCloseout: 'tools/proof-public-node-operator-receipt-example-closeout-v1.mjs',
  proofReceiptExample: 'tools/proof-public-node-operator-receipt-example-v1.mjs',
  proofReceiptExampleIndexRoute: 'tools/proof-public-node-operator-receipt-example-index-route-v1.mjs',
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
const checklistText = read(files.checklistJson);
const checklist = JSON.parse(checklistText);
const routeSource = read(files.routeSource);
const doc = read(files.checklistDoc);
const html = read(files.checklistHtml);
const page = read(files.checklistPage);
const proofText = [
  read(files.proofChecklist),
  read(files.proofReceiptExampleCloseout),
  read(files.proofReceiptExample),
  read(files.proofReceiptExampleIndexRoute),
  read(files.proofHandoffCloseout),
  read(files.proofReceiptTemplate),
  read(files.proofRuntimeRoute)
].join('\n');

if (checklist.marker !== marker) throw new Error('checklist marker mismatch');
if (checklist.status !== 'operator_receipt_review_checklist_ready') throw new Error('checklist status mismatch');

for (const route of [routes.page, routes.json, routes.html]) {
  if (!rootText.includes(route)) throw new Error(`root missing checklist route ${route}`);
}

for (const route of Object.values(routes)) {
  if (![doc, checklistText, html, page].some((text) => text.includes(route))) {
    throw new Error(`checklist surfaces missing route ${route}`);
  }
}

if (root.links?.public_node_operator_receipt_review_checklist !== routes.page) throw new Error('root checklist page link mismatch');
if (root.links?.public_node_operator_receipt_review_checklist_json !== routes.json) throw new Error('root checklist json link mismatch');
if (root.links?.public_node_operator_receipt_review_checklist_html !== routes.html) throw new Error('root checklist html link mismatch');
if (root.route_markers?.public_node_operator_receipt_review_checklist !== marker) throw new Error('root route marker mismatch');
if (root.public_node_operator_receipt_review_checklist?.marker !== marker) throw new Error('root object marker mismatch');
if (root.public_node_operator_receipt_review_checklist?.status !== 'operator_receipt_review_checklist_ready') throw new Error('root object status mismatch');
if (root.public_node_operator_receipt_review_checklist?.expected_green_marker !== green) throw new Error('root expected green mismatch');

for (const route of [routes.page, routes.json, routes.html]) {
  if (!routeSource.includes(route)) throw new Error(`route source missing ${route}`);
}

for (const needle of [
  'publicNodeOperatorReceiptReviewChecklistPageRoute',
  'publicNodeOperatorReceiptReviewChecklistJsonRoute',
  'publicNodeOperatorReceiptReviewChecklistHtmlRoute',
  'public-node-operator-receipt-review-checklist-v1.json',
  'public-node-operator-receipt-review-checklist-v1.html',
  'operator-receipt-review-checklist-v1.html',
  'app.get(publicNodeOperatorReceiptReviewChecklistPageRoute',
  'app.get(publicNodeOperatorReceiptReviewChecklistJsonRoute',
  'app.get(publicNodeOperatorReceiptReviewChecklistHtmlRoute'
]) {
  if (!routeSource.includes(needle)) throw new Error(`route source missing ${needle}`);
}

for (const m of [
  marker,
  'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_EXAMPLE_V1',
  'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_EXAMPLE_CLOSEOUT_V1_GREEN',
  'VOID_PUBLIC_NODE_OPERATOR_HANDOFF_PACKET_V1',
  'VOID_PUBLIC_NODE_OPERATOR_HANDOFF_PACKET_CLOSEOUT_V1_GREEN',
  'VOID_PUBLIC_NODE_CONNECT_RECEIPT_TEMPLATE_V1',
  'VOID_PUBLIC_NODE_OPERATOR_STATUS_ROLLUP_V1',
  'VOID_PUBLIC_NODE_CONNECT_PACK_V1',
  'VOID_PUBLIC_BOOTSTRAP_GATEWAY_V1'
]) {
  if (![rootText, checklistText, doc, html, page, proofText].join('\n').includes(m)) {
    throw new Error(`missing marker binding ${m}`);
  }
}

for (const [key, expected] of Object.entries({
  read_only: true,
  public_routes_only: true,
  operator_receipt_review_checklist_only: true,
  manual_review_checklist_only: true,
  operator_guidance_only: true,
  checklist_creates_no_receipt: true,
  checklist_creates_no_review_decision: true,
  checklist_creates_no_work_credit_claim: true,
  automatic_peer_dial_enabled_by_this_checklist: false,
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
  if (root.public_node_operator_receipt_review_checklist.boundary[key] !== expected) throw new Error(`bad root boundary ${key}`);
  if (checklist.boundary[key] !== expected) throw new Error(`bad checklist boundary ${key}`);
}

console.log(green);
