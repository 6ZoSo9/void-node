#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const sourcePath = path.join(root, "src", "index.ts");
const sourceText = fs.readFileSync(sourcePath, "utf8");
const sourceFile = ts.createSourceFile(
  sourcePath,
  sourceText,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
);

const routes = new Set([
  "/public-node/agents/first-contact-v1.json",
  "/public-node/agents/join-v1.html",
]);
const earlyCondition =
  'process.env.VOID_EARLY_MINIMAL_BOOT === "1"';

function normalize(value) {
  return value.replace(/\s+/g, " ").trim();
}

function nearestStatement(node) {
  let current = node;
  while (current && current.parent) {
    if (
      ts.isBlock(current.parent) &&
      current.parent.statements.includes(current)
    ) return current;
    current = current.parent;
  }
  return null;
}

const occurrences = [];
let earlyIf = null;

function visit(node) {
  if (ts.isStringLiteralLike(node) && routes.has(node.text)) {
    occurrences.push(node);
  }
  if (
    ts.isIfStatement(node) &&
    normalize(node.expression.getText(sourceFile)) === earlyCondition
  ) {
    earlyIf = node;
  }
  ts.forEachChild(node, visit);
}
visit(sourceFile);

assert.equal(occurrences.length, 2);
assert.ok(earlyIf);

const routeStatement = nearestStatement(occurrences[0]);
assert.ok(routeStatement);
assert.ok(
  occurrences.every(
    (occurrence) => nearestStatement(occurrence) === routeStatement,
  ),
);

for (const occurrence of occurrences) {
  let current = occurrence.parent;
  while (current) {
    assert.notEqual(
      current,
      earlyIf,
      "First Contact route remains inside early-minimal boot",
    );
    current = current.parent;
  }
}

assert.ok(
  routeStatement.getStart(sourceFile) < earlyIf.getStart(sourceFile),
  "First Contact route must execute before early-minimal boot",
);

const statementText = routeStatement.getText(sourceFile);
const statementSha = crypto
  .createHash("sha256")
  .update(statementText)
  .digest("hex");
assert.equal(
  statementSha,
  "1cc39ccf1ed76d00d01136242383d25068634adc61ec515885676826a43a8000",
  "First Contact route statement identity changed",
);

const assets = new Map([
  [
    "public/public-node/agents/first-contact-v1.json",
    "202fe8a100be97c7601fa4bc1b04d9364e113b31f2435ab98809065de17de89e",
  ],
  [
    "public/public-node/agents/join-v1.html",
    "a5d4801c5354246e9f0fd85d36f0159bee970c6469d06b4deb0921bfd7db0450",
  ],
]);

for (const [relative, expected] of assets) {
  const value = fs.readFileSync(path.join(root, relative));
  const actual = crypto.createHash("sha256").update(value).digest("hex");
  assert.equal(actual, expected);
}

console.log("marker=VOID_AI_AGENT_FIRST_CONTACT_RUNTIME_CONTROL_FLOW_REPAIR_V1");
console.log("route_statement_before_early_minimal=true");
console.log("route_statement_outside_early_minimal=true");
console.log("route_statement_identity_preserved=true");
console.log("method_contract_revalidated_by_existing_runtime_proof=true");
console.log("runtime_source_assets_exact=true");
console.log(
  "VOID_AI_AGENT_FIRST_CONTACT_RUNTIME_CONTROL_FLOW_REPAIR_V1_PROOF_EXACT_GREEN",
);
