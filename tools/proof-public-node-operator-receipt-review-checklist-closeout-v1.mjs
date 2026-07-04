import fs from 'node:fs';

const green = 'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_CHECKLIST_CLOSEOUT_V1_GREEN';

const markers = {
  checklist: 'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_CHECKLIST_V1',
  checklistGreen: 'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_CHECKLIST_V1_GREEN',
  checklistIndexRouteGreen: 'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_CHECKLIST_INDEX_ROUTE_V1_GREEN',
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
  checklistPage: '/public-node/operator-receipt-review-checklist-v1',
  checklistJson: '/public-node/public-node-operator-receipt-review-checklist-v1.json',
  checklistHtml: '/public-node/public-node-operator-receipt-review-checklist-v1.html',
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
  checklistDoc: 'docs/public/public-node-operator-receipt-review-checklist-v1.md',
  checklistPage: 'public/public-node/operator-receipt-review-checklist-v1.html',
  checklistJson: 'public/public-node/public-node-operator-receipt-review-checklist-v1.json',
  checklistHtml: 'public/public-node/public-node-operator-receipt-review-checklist-v1.html',
  receiptExampleJson: 'public/public-node/public-node-operator-receipt-example-v1.json',
  handoffJson: 'public/public-node/public-node-operator-handoff-packet-v1.json',
  statusRollupJson: 'public/public-node/public-node-operator-status-rollup-v1.json',
  quickstartJson: 'public/public-node/public-node-operator-quickstart-v1.json',
  connectPackJson: 'public/public-node/connect/public-node-connect-pack-v1.json',
  receiptTemplateJson: 'public/public-node/connect/public-node-connect-receipt-template-v1.json',
  bootstrapDoc: 'docs/public/public-bootstrap-gateway.md',
  routeSource: 'src/local-multibox-runtime-route-v1.ts',

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
const checklistText = read(files.checklistJson);
const checklist = JSON.parse(checklistText);
const checklistDoc = read(files.checklistDoc);
const checklistPage = read(files.checklistPage);
const checklistHtml = read(files.checklistHtml);
const receiptExampleText = read(files.receiptExampleJson);
const handoffText = read(files.handoffJson);
const statusRollupText = read(files.statusRollupJson);
const quickstartText = read(files.quickstartJson);
const connectPackText = read(files.connectPackJson);
const receiptTemplateText = read(files.receiptTemplateJson);
const bootstrapDoc = read(files.bootstrapDoc);
const routeSource = read(files.routeSource);

if (checklist.schema !== 'void.public_node.operator_receipt_review_checklist.v1') throw new Error('bad checklist schema');
if (checklist.marker !== markers.checklist) throw new Error('bad checklist marker');
if (checklist.status !== 'operator_receipt_review_checklist_ready') throw new Error('bad checklist status');
if (checklist.expected_green_marker !== markers.checklistGreen) throw new Error('bad checklist expected green marker');

if (!Array.isArray(checklist.review_steps) || checklist.review_steps.length < 6) throw new Error('review steps incomplete');
if (!Array.isArray(checklist.required_receipt_fields) || checklist.required_receipt_fields.length < 10) throw new Error('required fields incomplete');
if (!Array.isArray(checklist.reject_if_present) || checklist.reject_if_present.length < 10) throw new Error('reject list incomplete');

if (root.links?.public_node_operator_receipt_review_checklist !== routes.checklistPage) throw new Error('root missing checklist page link');
if (root.links?.public_node_operator_receipt_review_checklist_json !== routes.checklistJson) throw new Error('root missing checklist json link');
if (root.links?.public_node_operator_receipt_review_checklist_html !== routes.checklistHtml) throw new Error('root missing checklist html link');
if (root.route_markers?.public_node_operator_receipt_review_checklist !== markers.checklist) throw new Error('root missing checklist route marker');
if (root.public_node_operator_receipt_review_checklist?.marker !== markers.checklist) throw new Error('root checklist marker mismatch');
if (root.public_node_operator_receipt_review_checklist?.status !== 'operator_receipt_review_checklist_ready') throw new Error('root checklist status mismatch');
if (root.public_node_operator_receipt_review_checklist?.expected_green_marker !== markers.checklistIndexRouteGreen) throw new Error('root checklist expected index-route green mismatch');

for (const route of [routes.checklistPage, routes.checklistJson, routes.checklistHtml]) {
  if (!rootText.includes(route)) throw new Error(`root missing checklist route ${route}`);
  if (!routeSource.includes(route)) throw new Error(`route source missing checklist route ${route}`);
}

for (const needle of [
  'publicNodeOperatorReceiptReviewChecklistPageRoute',
  'publicNodeOperatorReceiptReviewChecklistJsonRoute',
  'publicNodeOperatorReceiptReviewChecklistHtmlRoute',
  'publicNodeOperatorReceiptReviewChecklistPagePath',
  'publicNodeOperatorReceiptReviewChecklistJsonPath',
  'publicNodeOperatorReceiptReviewChecklistHtmlPath',
  'app.get(publicNodeOperatorReceiptReviewChecklistPageRoute',
  'app.get(publicNodeOperatorReceiptReviewChecklistJsonRoute',
  'app.get(publicNodeOperatorReceiptReviewChecklistHtmlRoute'
]) {
  if (!routeSource.includes(needle)) throw new Error(`route source missing ${needle}`);
}

const surfaceText = [
  rootText,
  checklistText,
  checklistDoc,
  checklistPage,
  checklistHtml,
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
  markers.checklist,
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
  if (checklist.boundary?.[key] !== expected) throw new Error(`bad checklist boundary ${key}`);
  if (root.public_node_operator_receipt_review_checklist?.boundary?.[key] !== expected) throw new Error(`bad root checklist boundary ${key}`);
}

const lower = surfaceText.toLowerCase();
for (const phrase of [
  'checklist creates no receipt',
  'checklist creates no review decision',
  'checklist creates no work credit claim',
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
  'operator_alias',
  'operator_node_id',
  'observed_bootstrap_route',
  'observed_connect_pack_marker',
  'observed_status_rollup_marker',
  'observed_handoff_packet_marker',
  'observed_receipt_template_marker',
  'private_key',
  'seed_phrase',
  'wallet_secret',
  'signer_secret',
  'money_transfer_claim',
  'buy_void_fulfillment_claim',
  'wc_to_void_settlement_claim',
  'validator_admission_claim',
  'work_credit_claim',
  'public_internet_mesh_claim'
]) {
  if (!surfaceText.includes(field)) throw new Error(`missing review field binding ${field}`);
}

for (const proofFile of [
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
  markers.checklistGreen,
  markers.checklistIndexRouteGreen,
  markers.receiptExampleCloseoutGreen,
  markers.handoffPacketCloseoutGreen,
  markers.statusRollupCloseoutGreen,
  markers.quickstartCloseoutGreen,
  markers.connectLaneCloseoutGreen
]) {
  if (!proofText.includes(marker) && !surfaceText.includes(marker)) throw new Error(`missing proof marker binding ${marker}`);
}

console.log(green);
