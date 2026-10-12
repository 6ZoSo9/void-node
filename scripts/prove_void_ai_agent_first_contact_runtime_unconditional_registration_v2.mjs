#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import tsModule from "typescript";

const ts = tsModule.default ?? tsModule;
const text = fs.readFileSync(
  new URL("../src/index.ts", import.meta.url),
  "utf8",
);
const file = ts.createSourceFile(
  "src/index.ts",
  text,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
);

const markerName = "VOID_AI_AGENT_FIRST_CONTACT_RUNTIME_V1";
const routeMembers = new Set([
  `${markerName}.firstContactRoute`,
  `${markerName}.joinRoute`,
]);

let earlyIf = null;
let markerStatement = null;
const registrations = [];

function nearestStatement(node) {
  let current = node;
  while (current) {
    if (ts.isStatement(current)) return current;
    current = current.parent;
  }
  return null;
}

function nearestBlock(node) {
  let current = node.parent;
  while (current) {
    if (ts.isBlock(current)) return current;
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

function visit(node) {
  if (
    ts.isIfStatement(node) &&
    node.expression
      .getText(file)
      .includes("process.env.VOID_EARLY_MINIMAL_BOOT")
  ) {
    assert.equal(earlyIf, null, "multiple early-minimal branches");
    earlyIf = node;
  }

  if (
    ts.isVariableDeclaration(node) &&
    ts.isIdentifier(node.name) &&
    node.name.text === markerName
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
      let current = node.parent;
      let earlyMinimalAncestor = false;

      while (current) {
        if (
          ts.isIfStatement(current) &&
          current.expression
            .getText(file)
            .includes("process.env.VOID_EARLY_MINIMAL_BOOT")
        ) {
          earlyMinimalAncestor = true;
          break;
        }
        current = current.parent;
      }

      registrations.push({
        statement: nearestStatement(node),
        block: nearestBlock(node),
        method: node.expression.name.text,
        routeExpression,
        earlyMinimalAncestor,
      });
    }
  }

  ts.forEachChild(node, visit);
}

visit(file);

assert.ok(earlyIf, "early-minimal branch missing");
assert.ok(ts.isBlock(earlyIf.parent), "early-minimal parent is not a block");
assert.ok(markerStatement, "marker statement missing");
assert.ok(
  !isDescendantOf(markerStatement, earlyIf),
  "marker remains inside early-minimal boot",
);
assert.ok(
  markerStatement.getStart(file) < earlyIf.getStart(file),
  "marker is not before early-minimal boot",
);

assert.equal(registrations.length, 4, "registration count differs");
assert.deepEqual(
  registrations
    .map((value) => `${value.method}:${value.routeExpression}`)
    .sort(),
  [
    `get:${markerName}.firstContactRoute`,
    `get:${markerName}.joinRoute`,
    `head:${markerName}.firstContactRoute`,
    `head:${markerName}.joinRoute`,
  ].sort(),
  "method/route contract differs",
);
assert.deepEqual(
  registrations.filter((value) => value.earlyMinimalAncestor),
  [],
  "registration remains inside early-minimal boot",
);
assert.ok(
  registrations.every(
    (value) =>
      value.statement &&
      value.statement.getStart(file) < earlyIf.getStart(file),
  ),
  "registration is not before early-minimal boot",
);

const blocks = new Set(registrations.map((value) => value.block));
assert.equal(blocks.size, 1, "registrations do not share one block");

const registrationBlock = [...blocks][0];
assert.ok(registrationBlock, "registration block missing");
assert.equal(
  registrationBlock.parent,
  earlyIf.parent,
  "registration block is not adjacent to early-minimal boot",
);
assert.ok(
  registrationBlock.end <= earlyIf.getStart(file),
  "registration block is not before early-minimal boot",
);

let insideCount = 0;

function countInside(node) {
  if (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.expression.getText(file) === "app" &&
    ["get", "head"].includes(node.expression.name.text) &&
    node.arguments.length > 0 &&
    routeMembers.has(node.arguments[0].getText(file))
  ) {
    insideCount += 1;
  }

  ts.forEachChild(node, countInside);
}

countInside(earlyIf);
assert.equal(insideCount, 0, "early-minimal branch still contains handlers");

console.log(
  "VOID_AI_AGENT_FIRST_CONTACT_RUNTIME_UNCONDITIONAL_REGISTRATION_V2_PROOF_EXACT_GREEN",
);
