import fs from 'node:fs';

const marker = 'VOID_PUBLIC_NODE_CONNECT_RECEIPT_TEMPLATE_V1';
const green = 'VOID_PUBLIC_NODE_CONNECT_RECEIPT_TEMPLATE_INDEX_ROUTE_V1_GREEN';

const pageRoute = '/public-node/connect/receipt-template-v1';
const jsonRoute = '/public-node/connect/public-node-connect-receipt-template-v1.json';
const htmlRoute = '/public-node/connect/public-node-connect-receipt-template-v1.html';

const files = {
  root: 'public/public-node/index.json',
  json: 'public/public-node/connect/public-node-connect-receipt-template-v1.json',
  html: 'public/public-node/connect/public-node-connect-receipt-template-v1.html',
  page: 'public/public-node/connect/receipt-template-v1.html',
  route: 'src/local-multibox-runtime-route-v1.ts'
};

for (const file of Object.values(files)) {
  if (!fs.existsSync(file)) throw new Error(`missing ${file}`);
}

const root = JSON.parse(fs.readFileSync(files.root, 'utf8'));
const data = JSON.parse(fs.readFileSync(files.json, 'utf8'));
const html = fs.readFileSync(files.html, 'utf8');
const page = fs.readFileSync(files.page, 'utf8');
const route = fs.readFileSync(files.route, 'utf8');

if (data.marker !== marker) throw new Error('template marker mismatch');

if (root.links?.public_node_connect_receipt_template !== pageRoute) throw new Error('root page link mismatch');
if (root.links?.public_node_connect_receipt_template_json !== jsonRoute) throw new Error('root json link mismatch');
if (root.links?.public_node_connect_receipt_template_html !== htmlRoute) throw new Error('root html link mismatch');
if (root.route_markers?.public_node_connect_receipt_template !== marker) throw new Error('root marker mismatch');
if (root.public_node_connect_receipt_template?.marker !== marker) throw new Error('root summary marker mismatch');
if (root.public_node_connect_receipt_template?.boundary?.work_credit_claim_created !== false) throw new Error('root must not create WC claim');
if (root.public_node_connect_receipt_template?.boundary?.validator_admission_enabled !== false) throw new Error('root must not enable validator admission');

for (const needle of [
  'publicNodeConnectReceiptPageRoute',
  'publicNodeConnectReceiptJsonRoute',
  'publicNodeConnectReceiptHtmlRoute',
  'app.get(publicNodeConnectReceiptPageRoute',
  'app.get(publicNodeConnectReceiptJsonRoute',
  'app.get(publicNodeConnectReceiptHtmlRoute',
  pageRoute,
  jsonRoute,
  htmlRoute
]) {
  if (!route.includes(needle)) throw new Error(`route source missing ${needle}`);
}

for (const needle of [marker, 'node_id', 'peer_address_dialed', 'public internet mesh claim']) {
  if (!html.includes(needle)) throw new Error(`html missing ${needle}`);
  if (!page.includes(needle)) throw new Error(`page missing ${needle}`);
}

console.log(green);
