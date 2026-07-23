import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const modulePath =
  "src/chain/native_block_execution_precommit_integration_v1.ts";
const proofPath =
  "scripts/prove_native_block_execution_precommit_integration_v1.ts";
const indexPath = "src/index.ts";
const docsPath =
  "docs/operators/native-block-execution-precommit-integration-v1.md";

const moduleText = readFileSync(modulePath, "utf8");
const proofText = readFileSync(proofPath, "utf8");
const indexText = readFileSync(indexPath, "utf8");
const docsText = readFileSync(docsPath, "utf8");

assert.equal(
  moduleText.includes(
    "VOID_NATIVE_BLOCK_EXECUTION_PRECOMMIT_INTEGRATION_V1",
  ),
  true,
);
assert.equal(
  moduleText.includes("disabled_by_default: true"),
  true,
);
assert.equal(
  moduleText.includes("preparation_only: true"),
  true,
);
assert.equal(
  moduleText.includes("executor_apply_authority: false"),
  true,
);
assert.equal(
  moduleText.includes("block_store_apply_authority: false"),
  true,
);
assert.equal(
  moduleText.includes("state_mutation: false"),
  true,
);
assert.equal(
  moduleText.includes("money_movement: false"),
  true,
);
assert.equal(
  moduleText.indexOf("if (!policy.enabled)")
    < moduleText.indexOf(
      "input.candidate_transaction_count",
    ),
  true,
  "disabled return must precede candidate count access",
);
assert.equal(
  moduleText.indexOf("if (!policy.enabled)")
    < moduleText.indexOf("input.prepare_dependency"),
  true,
  "disabled return must precede dependency access",
);

for (const forbidden of [
  "node:fs",
  "process.env",
  "fetch(",
  "eth_sendRawTransaction",
  "createVoidNativeAccountStateStoreV1",
  "initializeVoidNativeAccountStateStoreV1",
  "applyVoidNativeValueTransferBlockExecutionV1",
  "apply_native_value_transfer_block_once",
  "runVoidNativeDelivery",
]) {
  assert.equal(
    moduleText.includes(forbidden),
    false,
    `precommit integration contains forbidden authority: ${forbidden}`,
  );
}

assert.equal(
  proofText.includes(
    "disabled confirmation must not be read",
  ),
  true,
);
assert.equal(
  proofText.includes(
    "candidate_transaction_count_mismatch",
  ),
  true,
);
assert.equal(
  proofText.includes("prepare_dependency_failed"),
  true,
);
assert.equal(
  proofText.includes("synthetic_transaction_rejected"),
  true,
);

const sourceFile = ts.createSourceFile(
  indexPath,
  indexText,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
);

const imports = sourceFile.statements.filter(
  ts.isImportDeclaration,
);
const integrationImports = imports.filter(
  (statement) =>
    ts.isStringLiteral(statement.moduleSpecifier)
    && statement.moduleSpecifier.text
      === "./chain/native_block_execution_precommit_integration_v1.js",
);
assert.equal(
  integrationImports.length,
  1,
  "index must contain one exact precommit integration import",
);

let sealOnce: ts.FunctionLikeDeclaration | null = null;
function findSealOnce(node: ts.Node): void {
  if (
    ts.isFunctionDeclaration(node)
    && node.name?.text === "sealOnce"
  ) {
    assert.equal(
      sealOnce,
      null,
      "index contains multiple sealOnce declarations",
    );
    sealOnce = node;
  }
  ts.forEachChild(node, findSealOnce);
}
findSealOnce(sourceFile);
assert.notEqual(sealOnce, null, "sealOnce declaration missing");

const hookCalls: ts.CallExpression[] = [];
const txrootRequireCalls: ts.CallExpression[] = [];
const executorApplyCalls: ts.CallExpression[] = [];
const storeApplyCalls: ts.CallExpression[] = [];

function visitSeal(node: ts.Node): void {
  if (
    node !== sealOnce
    && ts.isFunctionLike(node)
  ) {
    return;
  }
  if (ts.isCallExpression(node)) {
    const expression = node.expression.getText(sourceFile);
    if (
      expression
      === "runVoidNativeBlockExecutionPrecommitIntegrationV1"
    ) {
      hookCalls.push(node);
    }
    if (
      expression === "require"
      && node.arguments.length === 1
      && ts.isStringLiteral(node.arguments[0])
      && node.arguments[0].text === "./util/txroot.js"
    ) {
      txrootRequireCalls.push(node);
    }
    if (
      expression
      === "applyVoidNativeValueTransferBlockExecutionV1"
    ) {
      executorApplyCalls.push(node);
    }
    if (
      expression === "apply_native_value_transfer_block_once"
    ) {
      storeApplyCalls.push(node);
    }
  }
  ts.forEachChild(node, visitSeal);
}
visitSeal(sealOnce as ts.Node);

assert.equal(hookCalls.length, 1);
assert.equal(txrootRequireCalls.length, 1);
assert.equal(executorApplyCalls.length, 0);
assert.equal(storeApplyCalls.length, 0);

function statementAncestor(
  node: ts.Node,
): ts.Statement {
  let current: ts.Node | undefined = node;
  while (
    current
    && current.parent
    && current.parent !== sealOnce
  ) {
    if (ts.isStatement(current)) return current;
    current = current.parent;
  }
  assert.fail("statement ancestor missing");
}

const hookStatement = statementAncestor(hookCalls[0]);
const requireStatement =
  statementAncestor(txrootRequireCalls[0]);
assert.equal(
  hookStatement.getEnd() <= requireStatement.getStart(sourceFile),
  true,
  "precommit hook must occur before txroot module load",
);
assert.equal(
  ts.isAwaitExpression(hookCalls[0].parent),
  true,
  "precommit hook must be awaited",
);

assert.equal(hookCalls[0].arguments.length, 1);
const argument = hookCalls[0].arguments[0];
assert.equal(ts.isObjectLiteralExpression(argument), true);
const input = argument as ts.ObjectLiteralExpression;

function property(
  name: string,
): ts.PropertyAssignment {
  const found = input.properties.find(
    (item): item is ts.PropertyAssignment =>
      ts.isPropertyAssignment(item)
      && item.name.getText(sourceFile) === name,
  );
  assert.notEqual(found, undefined, `missing ${name}`);
  return found as ts.PropertyAssignment;
}

const policy = property("policy").initializer;
assert.equal(ts.isObjectLiteralExpression(policy), true);
const policyObject = policy as ts.ObjectLiteralExpression;
const enabled = policyObject.properties.find(
  (item): item is ts.PropertyAssignment =>
    ts.isPropertyAssignment(item)
    && item.name.getText(sourceFile) === "enabled",
);
const confirmation = policyObject.properties.find(
  (item): item is ts.PropertyAssignment =>
    ts.isPropertyAssignment(item)
    && item.name.getText(sourceFile) === "confirmation",
);
assert.equal(enabled?.initializer.kind, ts.SyntaxKind.FalseKeyword);
assert.equal(confirmation?.initializer.kind, ts.SyntaxKind.NullKeyword);
assert.equal(
  property("prepare_dependency").initializer.kind,
  ts.SyntaxKind.NullKeyword,
);
assert.equal(
  property("candidate_transaction_count")
    .initializer.getText(sourceFile)
    .includes("block.txs"),
  true,
);
assert.equal(
  property("candidate_transactions")
    .initializer.getText(sourceFile)
    .includes("block.txs"),
  true,
);

for (const forbidden of [
  "native_value_transfer_block_executor_v1",
  "native_account_state_store_v1",
  "createVoidNativeAccountStateStoreV1",
  "initializeVoidNativeAccountStateStoreV1",
  "applyVoidNativeValueTransferBlockExecutionV1",
  "apply_native_value_transfer_block_once",
]) {
  assert.equal(
    indexText.includes(forbidden),
    false,
    `index contains forbidden native execution authority: ${forbidden}`,
  );
}

for (const required of [
  "disabled-by-default",
  "prepare-only",
  "after canonical transaction selection",
  "before txroot computation and existing commit-side effects",
  "production account store is not initialized",
  "block executor apply is not wired",
  "Buy VOID automatic fulfillment is not enabled",
]) {
  assert.equal(
    docsText.includes(required),
    true,
    `operator contract missing statement: ${required}`,
  );
}

console.log(
  "VOID_NATIVE_BLOCK_EXECUTION_PRECOMMIT_INTEGRATION_GUARD_V1_GREEN",
);
