import fs from 'node:fs';

const marker = 'VOID_PUBLIC_NODE_OPERATOR_QUICKSTART_V1';
const green = 'VOID_PUBLIC_NODE_OPERATOR_QUICKSTART_INDEX_ROUTE_V1_GREEN';

const pageRoute = '/public-node/operator-quickstart-v1';
const jsonRoute = '/public-node/public-node-operator-quickstart-v1.json';
const htmlRoute = '/public-node/public-node-operator-quickstart-v1.html';

const files = {
  root: 'public/public-node/index.json',
  json: 'public/public-node/public-node-operator-quickstart-v1.json',
  html: 'public/public-node/public-node-operator-quickstart-v1.html',
  page: 'public/public-node/operator-quickstart-v1.html',
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

if (data.marker !== marker) throw new Error('quickstart marker mismatch');

if (root.links?.public_node_operator_quickstart !== pageRoute) throw new Error('root page link mismatch');
if (root.links?.public_node_operator_quickstart_json !== jsonRoute) throw new Error('root json link mismatch');
if (root.links?.public_node_operator_quickstart_html !== htmlRoute) throw new Error('root html link mismatch');
if (root.route_markers?.public_node_operator_quickstart !== marker) throw new Error('root marker mismatch');
if (root.public_node_operator_quickstart?.marker !== marker) throw new Error('root summary marker mismatch');
if (root.public_node_operator_quickstart?.expected_green_marker !== green) throw new Error('root green marker mismatch');
if (root.public_node_operator_quickstart?.boundary?.work_credit_claim_created !== false) throw new Error('root must not create WC claim');
if (root.public_node_operator_quickstart?.boundary?.validator_admission_enabled !== false) throw new Error('root must not enable validator admission');

for (const needle of [
  'publicNodeOperatorQuickstartPageRoute',
  'publicNodeOperatorQuickstartJsonRoute',
  'publicNodeOperatorQuickstartHtmlRoute',
  'app.get(publicNodeOperatorQuickstartPageRoute',
  'app.get(publicNodeOperatorQuickstartJsonRoute',
  'app.get(publicNodeOperatorQuickstartHtmlRoute',
  pageRoute,
  jsonRoute,
  htmlRoute
]) {
  if (!route.includes(needle)) throw new Error(`route source missing ${needle}`);
}

for (const needle of [marker, 'Public Node Connect Pack', 'Receipt Template', 'public internet mesh claim']) {
  if (!html.includes(needle)) throw new Error(`html missing ${needle}`);
  if (!page.includes(needle)) throw new Error(`page missing ${needle}`);
}

console.log(green);
