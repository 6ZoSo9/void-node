import fs from 'node:fs';

const marker = 'VOID_PUBLIC_NODE_OPERATOR_STATUS_ROLLUP_V1';
const green = 'VOID_PUBLIC_NODE_OPERATOR_STATUS_ROLLUP_INDEX_ROUTE_V1_GREEN';

const pageRoute = '/public-node/operator-status-rollup-v1';
const jsonRoute = '/public-node/public-node-operator-status-rollup-v1.json';
const htmlRoute = '/public-node/public-node-operator-status-rollup-v1.html';

const files = {
  root: 'public/public-node/index.json',
  json: 'public/public-node/public-node-operator-status-rollup-v1.json',
  html: 'public/public-node/public-node-operator-status-rollup-v1.html',
  page: 'public/public-node/operator-status-rollup-v1.html',
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

if (data.marker !== marker) throw new Error('status rollup marker mismatch');

if (root.links?.public_node_operator_status_rollup !== pageRoute) throw new Error('root page link mismatch');
if (root.links?.public_node_operator_status_rollup_json !== jsonRoute) throw new Error('root json link mismatch');
if (root.links?.public_node_operator_status_rollup_html !== htmlRoute) throw new Error('root html link mismatch');
if (root.route_markers?.public_node_operator_status_rollup !== marker) throw new Error('root marker mismatch');
if (root.public_node_operator_status_rollup?.marker !== marker) throw new Error('root summary marker mismatch');
if (root.public_node_operator_status_rollup?.expected_green_marker !== green) throw new Error('root green marker mismatch');
if (root.public_node_operator_status_rollup?.boundary?.work_credit_claim_created !== false) throw new Error('root must not create WC claim');
if (root.public_node_operator_status_rollup?.boundary?.validator_admission_enabled !== false) throw new Error('root must not enable validator admission');

for (const needle of [
  'publicNodeOperatorStatusRollupPageRoute',
  'publicNodeOperatorStatusRollupJsonRoute',
  'publicNodeOperatorStatusRollupHtmlRoute',
  'app.get(publicNodeOperatorStatusRollupPageRoute',
  'app.get(publicNodeOperatorStatusRollupJsonRoute',
  'app.get(publicNodeOperatorStatusRollupHtmlRoute',
  pageRoute,
  jsonRoute,
  htmlRoute
]) {
  if (!route.includes(needle)) throw new Error(`route source missing ${needle}`);
}

for (const needle of [marker, 'operator_status_rollup_ready', 'Operator Quickstart', 'Connect Pack', 'Receipt Template']) {
  if (!html.includes(needle)) throw new Error(`html missing ${needle}`);
  if (!page.includes(needle)) throw new Error(`page missing ${needle}`);
}

console.log(green);
