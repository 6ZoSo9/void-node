import fs from 'node:fs';

const marker = 'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_DECISION_TEMPLATE_V1';
const green = 'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_DECISION_TEMPLATE_V1_GREEN';

const requiredMarkers = [
  marker,
  'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_CHECKLIST_V1',
  'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_REVIEW_CHECKLIST_CLOSEOUT_V1_GREEN',
  'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_EXAMPLE_V1',
  'VOID_PUBLIC_NODE_OPERATOR_RECEIPT_EXAMPLE_CLOSEOUT_V1_GREEN',
  'VOID_PUBLIC_NODE_OPERATOR_HANDOFF_PACKET_V1',
  'VOID_PUBLIC_NODE_OPERATOR_HANDOFF_PACKET_CLOSEOUT_V1_GREEN',
  'VOID_PUBLIC_NODE_OPERATOR_STATUS_ROLLUP_V1',
  'VOID_PUBLIC_NODE_CONNECT_PACK_V1',
  'VOID_PUBLIC_NODE_CONNECT_RECEIPT_TEMPLATE_V1',
  'VOID_PUBLIC_BOOTSTRAP_GATEWAY_V1'
];

const files = {
  templateDoc: 'docs/public/public-node-operator-receipt-review-decision-template-v1.md',
  templateJson: 'public/public-node/public-node-operator-receipt-review-decision-template-v1.json',
  templateHtml: 'public/public-node/public-node-operator-receipt-review-decision-template-v1.html',
  templatePage: 'public/public-node/operator-receipt-review-decision-template-v1.html',

  checklistJson: 'public/public-node/public-node-operator-receipt-review-checklist-v1.json',
  receiptExampleJson: 'public/public-node/public-node-operator-receipt-example-v1.json',
  handoffJson: 'public/public-node/public-node-operator-handoff-packet-v1.json',
  statusRollupJson: 'public/public-node/public-node-operator-status-rollup-v1.json',
  connectPackJson: 'public/public-node/connect/public-node-connect-pack-v1.json',
  receiptTemplateJson: 'public/public-node/connect/public-node-connect-receipt-template-v1.json',
  bootstrapDoc: 'docs/public/public-bootstrap-gateway.md',

  proofChecklistCloseout: 'tools/proof-public-node-operator-receipt-review-checklist-closeout-v1.mjs',
  proofChecklist: 'tools/proof-public-node-operator-receipt-review-checklist-v1.mjs',
  proofChecklistIndexRoute: 'tools/proof-public-node-operator-receipt-review-checklist-index-route-v1.mjs',
  proofReceiptExampleCloseout: 'tools/proof-public-node-operator-receipt-example-closeout-v1.mjs',
  proofHandoffCloseout: 'tools/proof-public-node-operator-handoff-packet-closeout-v1.mjs',
  proofReceiptTemplate: 'tools/proof-public-node-connect-receipt-template-v1.mjs'
};

function read(path) {
  if (!fs.existsSync(path)) throw new Error(`missing file ${path}`);
  return fs.readFileSync(path, 'utf8');
}

const doc = read(files.templateDoc);
const jsonText = read(files.templateJson);
const html = read(files.templateHtml);
const page = read(files.templatePage);
const data = JSON.parse(jsonText);

if (data.schema !== 'void.public_node.operator_receipt_review_decision_template.v1') throw new Error('bad schema');
if (data.marker !== marker) throw new Error('bad marker');
if (data.status !== 'operator_receipt_review_decision_template_ready') throw new Error('bad status');
if (data.expected_green_marker !== green) throw new Error('bad expected green marker');

for (const key of ['routes', 'components', 'allowed_outcomes', 'decision_template_fields', 'example_decision_template', 'reject_if_present', 'boundary']) {
  if (!(key in data)) throw new Error(`missing key ${key}`);
}

if (!Array.isArray(data.allowed_outcomes) || data.allowed_outcomes.length < 5) throw new Error('allowed outcomes incomplete');
if (!Array.isArray(data.decision_template_fields) || data.decision_template_fields.length < 10) throw new Error('decision fields incomplete');
if (data.example_decision_template?.template_only !== true) throw new Error('example decision is not template_only');
if (data.example_decision_template?.review_decision_created !== false) throw new Error('example creates review decision');
if (data.example_decision_template?.receipt_created !== false) throw new Error('example creates receipt');
if (data.example_decision_template?.work_credit_claim_created !== false) throw new Error('example creates Work Credit claim');
if (data.example_decision_template?.money_transfer_claim !== false) throw new Error('example makes money claim');
if (data.example_decision_template?.validator_admission_claim !== false) throw new Error('example makes validator claim');
if (data.example_decision_template?.public_internet_mesh_claim !== false) throw new Error('example makes public mesh claim');

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
  read(files.checklistJson),
  read(files.receiptExampleJson),
  read(files.handoffJson),
  read(files.statusRollupJson),
  read(files.connectPackJson),
  read(files.receiptTemplateJson),
  read(files.bootstrapDoc),
  read(files.proofChecklistCloseout),
  read(files.proofChecklist),
  read(files.proofChecklistIndexRoute),
  read(files.proofReceiptExampleCloseout),
  read(files.proofHandoffCloseout),
  read(files.proofReceiptTemplate)
].join('\n');

for (const m of requiredMarkers) {
  if (!combined.includes(m)) throw new Error(`missing marker binding ${m}`);
}

for (const field of [
  'reviewer_alias',
  'receipt_reference',
  'review_checklist_marker',
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
  if (!combined.includes(field)) throw new Error(`missing decision template field ${field}`);
}

for (const [key, expected] of Object.entries({
  read_only: true,
  public_routes_only: true,
  operator_receipt_review_decision_template_only: true,
  manual_review_template_only: true,
  operator_guidance_only: true,
  template_creates_no_receipt: true,
  template_creates_no_review_decision: true,
  template_creates_no_work_credit_claim: true,
  template_creates_no_validator_admission: true,
  template_creates_no_money_movement: true,
  automatic_peer_dial_enabled_by_this_template: false,
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
  'template creates no receipt',
  'template creates no review decision',
  'template creates no work credit claim',
  'template creates no validator admission',
  'template creates no money movement',
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
  files.proofChecklistCloseout,
  files.proofChecklist,
  files.proofChecklistIndexRoute,
  files.proofReceiptExampleCloseout,
  files.proofHandoffCloseout,
  files.proofReceiptTemplate
]) {
  if (!fs.existsSync(proofFile)) throw new Error(`missing proof file ${proofFile}`);
  if (!proofFile.startsWith('tools/proof-')) throw new Error(`unexpected proof path ${proofFile}`);
}

console.log(green);
