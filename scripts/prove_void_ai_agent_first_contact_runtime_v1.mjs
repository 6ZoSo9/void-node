#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MARKER = "VOID_AI_AGENT_FIRST_CONTACT_RUNTIME_V1";
const BEGIN = `// ${MARKER}_BEGIN`;
const END = `// ${MARKER}_END`;
const FIRST_ROUTE = "/public-node/agents/first-contact-v1.json";
const JOIN_ROUTE = "/public-node/agents/join-v1.html";
const EARLY_MINIMAL = 'process.env.VOID_EARLY_MINIMAL_BOOT === "1"';

const BOUNDARY = [
  ".github/workflows/void-ai-agent-first-contact-runtime-v1.yml",
  "docs/public/ai-agent-first-contact-runtime-v1.md",
  "scripts/prove_void_ai_agent_first_contact_runtime_v1.mjs",
  "src/index.ts",
  "fixtures/ops/guard-baselines/index-ts-size-v1.json",
];

const EXPECTED_ASSETS = {
  "public/public-node/agents/first-contact-v1.json":
    "73b2936cdb03c2028746db27159cbaa6e556e264652d8442a91fafa988dab45f",
  "public/public-node/agents/join-v1.html":
    "a5d4801c5354246e9f0fd85d36f0159bee970c6469d06b4deb0921bfd7db0450",
};

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function sha256(relativePath) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(path.join(ROOT, relativePath)))
    .digest("hex");
}

function normalize(value) {
  return value.replace(/\s+/g, " ").trim();
}

function nearestStatement(node) {
  let current = node;
  while (current) {
    if (ts.isStatement(current)) return current;
    current = current.parent;
  }
  return null;
}

function isDescendantOf(node, ancestor) {
  let current = node.parent;
  while (current) {
    if (current === ancestor) return true;
    current = current.parent;
  }
  return false;
}

function hasOrderedAssetPath(source, fileName) {
  const tokens = ["process.cwd()", "public", "public-node", "agents", fileName];
  let processOffset = source.indexOf(tokens[0]);
  while (processOffset !== -1) {
    let cursor = processOffset + tokens[0].length;
    let matched = true;
    for (const token of tokens.slice(1)) {
      const next = source.indexOf(token, cursor);
      if (next === -1 || next - processOffset > 16384) {
        matched = false;
        break;
      }
      cursor = next + token.length;
    }
    if (matched) return true;
    processOffset = source.indexOf(tokens[0], processOffset + tokens[0].length);
  }
  return false;
}

for (const [relativePath, expected] of Object.entries(EXPECTED_ASSETS)) {
  assert.equal(sha256(relativePath), expected, `${relativePath} SHA differs`);
}

const indexSizeFixture = JSON.parse(
  read("fixtures/ops/guard-baselines/index-ts-size-v1.json"),
);
assert.equal(indexSizeFixture?.baseline_bytes, 3849581, "index size ceiling changed");

const sourcePath = path.join(ROOT, "src/index.ts");
const source = fs.readFileSync(sourcePath, "utf8");
assert.ok(
  Buffer.byteLength(source) <= indexSizeFixture.baseline_bytes,
  "src/index.ts exceeds the reviewed size ceiling",
);
assert.equal(source.split(BEGIN).length - 1, 1, "runtime begin marker count");
assert.equal(source.split(END).length - 1, 1, "runtime end marker count");

const beginIndex = source.indexOf(BEGIN);
const endIndex = source.indexOf(END, beginIndex);
assert.ok(beginIndex >= 0 && endIndex > beginIndex, "runtime block ordering");
const block = source.slice(beginIndex, endIndex + END.length);

for (const route of [FIRST_ROUTE, JOIN_ROUTE]) {
  assert.equal(
    source.split(JSON.stringify(route)).length - 1,
    1,
    `${route} source literal count`,
  );
}
assert.ok(hasOrderedAssetPath(source, "first-contact-v1.json"));
assert.ok(hasOrderedAssetPath(source, "join-v1.html"));
assert.doesNotMatch(block, /\.post\(/i);
assert.doesNotMatch(block, /\.put\(/i);
assert.doesNotMatch(block, /\.delete\(/i);
assert.doesNotMatch(block, /wallet|signer|transaction|work.?credit|paid.?work/i);

const file = ts.createSourceFile(
  sourcePath,
  source,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
);
const diagnostics = file.parseDiagnostics ?? [];
assert.equal(diagnostics.length, 0, "src/index.ts parse diagnostics");

let earlyIf = null;
let markerStatement = null;
const routeMembers = new Set([
  `${MARKER}.firstContactRoute`,
  `${MARKER}.joinRoute`,
]);
const registrations = [];

function visit(node) {
  if (
    ts.isIfStatement(node) &&
    normalize(node.expression.getText(file)) === EARLY_MINIMAL
  ) {
    assert.equal(earlyIf, null, "multiple early-minimal branches");
    earlyIf = node;
  }
  if (
    ts.isVariableDeclaration(node) &&
    ts.isIdentifier(node.name) &&
    node.name.text === MARKER
  ) {
    assert.equal(markerStatement, null, "multiple marker declarations");
    markerStatement = nearestStatement(node);
  }
  if (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.expression.getText(file) === "app" &&
    ["get", "head"].includes(node.expression.name.text) &&
    node.arguments.length > 0
  ) {
    const routeExpression = node.arguments[0].getText(file);
    if (routeMembers.has(routeExpression)) {
      registrations.push({
        method: node.expression.name.text,
        routeExpression,
        statement: nearestStatement(node),
        node,
      });
    }
  }
  ts.forEachChild(node, visit);
}
visit(file);

assert.ok(earlyIf, "early-minimal branch missing");
assert.ok(markerStatement, "runtime marker declaration missing");
assert.ok(!isDescendantOf(markerStatement, earlyIf), "runtime marker remains inside early-minimal boot");
assert.ok(markerStatement.getStart(file) < earlyIf.getStart(file), "runtime marker is not before early-minimal boot");
assert.equal(registrations.length, 4, "registration count differs");
assert.deepEqual(
  registrations.map(({ method, routeExpression }) => `${method}:${routeExpression}`).sort(),
  [
    `get:${MARKER}.firstContactRoute`,
    `get:${MARKER}.joinRoute`,
    `head:${MARKER}.firstContactRoute`,
    `head:${MARKER}.joinRoute`,
  ].sort(),
  "method/route contract differs",
);
for (const registration of registrations) {
  assert.ok(registration.statement, "registration statement missing");
  assert.ok(
    registration.statement.getStart(file) < earlyIf.getStart(file),
    "registration is not before early-minimal boot",
  );
  assert.ok(
    !isDescendantOf(registration.node, earlyIf),
    "registration remains inside early-minimal boot",
  );
}

const docs = read("docs/public/ai-agent-first-contact-runtime-v1.md");
assert.match(docs, new RegExp(MARKER));
assert.match(docs, /GET\|HEAD/);
assert.match(docs, /read-only/i);
assert.match(docs, /does\s+not\s+promise\s+paid\s+work/i);

const workflow = read(".github/workflows/void-ai-agent-first-contact-runtime-v1.yml");
for (const relativePath of BOUNDARY) {
  assert.ok(workflow.includes(relativePath), `workflow missing ${relativePath}`);
}
assert.match(workflow, /fetch-depth:\s*0/);
assert.match(workflow, /npm run build/);
assert.match(workflow, /node scripts\/prove_void_ai_agent_first_contact_runtime_v1\.mjs/);

console.log(`marker=${MARKER}`);
console.log(`boundary_file_count=${BOUNDARY.length}`);
console.log("runtime_routes_get_head_only=true");
console.log("runtime_routes_before_early_minimal=true");
console.log("runtime_source_assets_exact=true");
console.log("mutation_authority_added=false");
console.log("VOID_AI_AGENT_FIRST_CONTACT_RUNTIME_V1_PROOF_EXACT_GREEN");
