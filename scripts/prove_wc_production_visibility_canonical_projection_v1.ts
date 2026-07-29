import assert from "node:assert/strict";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { createRequire } from "node:module";
import { readCanonicalWcState } from "../src/economic/wc_verified_receipt_acceptance_v1";

const toolingRoot =
  process.env.VOID_TOOLING_REPO ?? process.cwd();
const typescriptPath = path.join(
  toolingRoot,
  "node_modules/typescript/lib/typescript.js",
);
assert.equal(fs.existsSync(typescriptPath), true);
const require = createRequire(import.meta.url);
const ts = require(typescriptPath);

const sourcePath = path.resolve("src/index.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const sf = ts.createSourceFile(
  sourcePath,
  source,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
);
assert.equal(sf.parseDiagnostics.length, 0);

const nodeText = (node: any): string => node.getText(sf);
const nearest = (
  node: any,
  predicate: (value: any) => boolean,
): any => {
  for (
    let current = node.parent;
    current;
    current = current.parent
  ) {
    if (predicate(current)) return current;
  }
  return null;
};
const functionLike = (node: any): boolean =>
  ts.isFunctionDeclaration(node) ||
  ts.isFunctionExpression(node) ||
  ts.isArrowFunction(node) ||
  ts.isMethodDeclaration(node);

const locals = new Map<string, any>();
(function collect(node: any): void {
  if (
    (ts.isFunctionDeclaration(node) ||
      ts.isVariableDeclaration(node)) &&
    node.name &&
    ts.isIdentifier(node.name)
  ) {
    locals.set(node.name.text, node);
  }
  ts.forEachChild(node, collect);
})(sf);

let canonicalReaderImportCount = 0;
for (const statement of sf.statements) {
  if (
    !ts.isImportDeclaration(statement) ||
    !ts.isStringLiteral(statement.moduleSpecifier) ||
    statement.moduleSpecifier.text !==
      "./economic/wc_verified_receipt_acceptance_v1"
  ) {
    continue;
  }

  const bindings =
    statement.importClause?.namedBindings;
  if (!bindings || !ts.isNamedImports(bindings)) {
    continue;
  }

  for (const element of bindings.elements) {
    if (
      (element.propertyName?.text ?? element.name.text) ===
      "readCanonicalWcState"
    ) {
      canonicalReaderImportCount += 1;
    }
  }
}
assert.equal(canonicalReaderImportCount, 1);

function routeHandler(
  call: any,
  routeIndex: number,
): any {
  for (
    const argument of call.arguments.slice(routeIndex + 1)
  ) {
    if (functionLike(argument)) return argument;

    if (ts.isIdentifier(argument)) {
      const declaration = locals.get(argument.text);
      if (!declaration) continue;

      if (
        ts.isVariableDeclaration(declaration) &&
        declaration.initializer &&
        functionLike(declaration.initializer)
      ) {
        return declaration.initializer;
      }

      if (functionLike(declaration)) {
        return declaration;
      }
    }
  }

  throw new Error("route handler unresolved");
}

const routePaths = [
  "/wc/production/balance",
  "/wc/production/ledger",
];
const handlers = new Map<string, any>();
const registrations = new Map<string, any>();

(function locateRoutes(node: any): void {
  if (
    ts.isStringLiteralLike(node) &&
    routePaths.includes(node.text)
  ) {
    const call = nearest(node, ts.isCallExpression);
    assert.ok(call);

    const routeIndex = call.arguments.findIndex(
      (argument: any) => argument === node,
    );
    assert.notEqual(routeIndex, -1);
    assert.equal(handlers.has(node.text), false);
    assert.equal(registrations.has(node.text), false);
    registrations.set(node.text, call);
    handlers.set(
      node.text,
      routeHandler(call, routeIndex),
    );
  }

  ts.forEachChild(node, locateRoutes);
})(sf);

assert.equal(handlers.size, 2);
assert.equal(registrations.size, 2);
for (const route of routePaths) {
  assert.equal(handlers.has(route), true);
  assert.equal(registrations.has(route), true);
}

function callRows(handler: any): {
  expression: string;
  arguments: string[];
  full: string;
}[] {
  const rows: {
    expression: string;
    arguments: string[];
    full: string;
  }[] = [];

  (function walk(node: any): void {
    if (ts.isCallExpression(node)) {
      rows.push({
        expression: nodeText(node.expression),
        arguments: node.arguments.map(
          (argument: any) => nodeText(argument),
        ),
        full: nodeText(node),
      });
    }
    ts.forEachChild(node, walk);
  })(handler);

  return rows;
}

function localInitializers(
  handler: any,
): Map<string, string> {
  const values = new Map<string, string>();

  (function walk(node: any): void {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer
    ) {
      values.set(
        node.name.text,
        nodeText(node.initializer),
      );
    }
    ts.forEachChild(node, walk);
  })(handler);

  return values;
}

function successSerializer(
  handler: any,
  marker: string,
): {
  fields: Set<string>;
  properties: Map<
    string,
    { kind: "property" | "shorthand"; expression: string }
  >;
  markerCount: number;
  successCount: number;
} {
  const markerObjects: any[] = [];
  const successObjects: any[] = [];

  (function walk(node: any): void {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "json" &&
      node.arguments.length === 1 &&
      ts.isObjectLiteralExpression(node.arguments[0])
    ) {
      const object = node.arguments[0];
      const values = new Map<string, string>();

      for (const property of object.properties) {
        if (ts.isPropertyAssignment(property)) {
          values.set(
            nodeText(property.name),
            nodeText(property.initializer),
          );
        } else if (
          ts.isShorthandPropertyAssignment(property)
        ) {
          values.set(
            nodeText(property.name),
            nodeText(property.name),
          );
        }
      }

      if (
        values.get("marker") === JSON.stringify(marker)
      ) {
        markerObjects.push(object);
        if (values.get("ok") === "true") {
          successObjects.push(object);
        }
      }
    }

    ts.forEachChild(node, walk);
  })(handler);

  assert.equal(markerObjects.length, 2);
  assert.equal(successObjects.length, 1);

  const fields = new Set<string>();
  const properties = new Map<
    string,
    { kind: "property" | "shorthand"; expression: string }
  >();

  for (const property of successObjects[0].properties) {
    if (ts.isPropertyAssignment(property)) {
      const name = nodeText(property.name);
      fields.add(name);
      properties.set(name, {
        kind: "property",
        expression: nodeText(property.initializer),
      });
    } else if (
      ts.isShorthandPropertyAssignment(property)
    ) {
      const name = nodeText(property.name);
      fields.add(name);
      properties.set(name, {
        kind: "shorthand",
        expression: name,
      });
    }
  }

  return {
    fields,
    properties,
    markerCount: markerObjects.length,
    successCount: successObjects.length,
  };
}

function resolveProperty(
  serializer: ReturnType<typeof successSerializer>,
  property: string,
  initializers: Map<string, string>,
): string {
  const item = serializer.properties.get(property);
  assert.ok(item);

  if (item.kind === "property") {
    return item.expression;
  }

  const initializer = initializers.get(item.expression);
  assert.ok(initializer);
  return initializer;
}

function sorted(values: Set<string>): string[] {
  return [...values].sort();
}

const expectedBalanceFields = new Set([
  "ok",
  "marker",
  "account",
  "balance",
  "count",
  "ledger_version",
  "ledger_exists",
  "read_only",
  "spendable",
  "redeemable",
  "redeemable_wc",
  "transferable",
  "included_in_legacy_balance",
  "automatic_runner_activation",
  "wc_to_void",
  "money_movement",
]);
const expectedLedgerFields = new Set([
  "ok",
  "marker",
  "account",
  "count",
  "returned",
  "events",
  "ledger_version",
  "ledger_exists",
  "read_only",
  "mutation",
  "spendable",
  "redeemable",
  "transferable",
  "included_in_legacy_balance",
  "automatic_runner_activation",
  "wc_to_void",
  "money_movement",
]);

for (const route of routePaths) {
  const handler = handlers.get(route);
  const handlerText = nodeText(handler);
  const calls = callRows(handler);
  const canonicalCalls = calls.filter(
    (row) =>
      row.expression === "readCanonicalWcState",
  );

  assert.equal(canonicalCalls.length, 1);
  assert.deepEqual(canonicalCalls[0].arguments, [
    "account",
    "DATA_DIR",
  ]);

  assert.doesNotMatch(
    handlerText,
    /wcProductionCanary/,
  );
  assert.doesNotMatch(
    handlerText,
    /acceptPaidWorkEntitlementOnce/,
  );
  assert.match(nodeText(registrations.get(route)), /missing_account/);
  assert.match(
    handlerText,
    /ledger_version:\s*"wc-v1"/,
  );
  assert.match(
    handlerText,
    /wcProductionCanonicalLedgerFile\(\)/,
  );
}

const balanceHandler =
  handlers.get("/wc/production/balance");
const ledgerHandler =
  handlers.get("/wc/production/ledger");
const balanceSerializer = successSerializer(
  balanceHandler,
  "VOID_WC_PRODUCTION_BALANCE_V1",
);
const ledgerSerializer = successSerializer(
  ledgerHandler,
  "VOID_WC_PRODUCTION_LEDGER_V1",
);
const balanceInitializers =
  localInitializers(balanceHandler);
const ledgerInitializers =
  localInitializers(ledgerHandler);

assert.deepEqual(
  sorted(balanceSerializer.fields),
  sorted(expectedBalanceFields),
);
assert.deepEqual(
  sorted(ledgerSerializer.fields),
  sorted(expectedLedgerFields),
);

assert.equal(
  resolveProperty(
    balanceSerializer,
    "balance",
    balanceInitializers,
  ),
  "canonicalState.earned",
);
assert.equal(
  resolveProperty(
    balanceSerializer,
    "redeemable_wc",
    balanceInitializers,
  ),
  "canonicalState.redeemable",
);
assert.equal(
  resolveProperty(
    ledgerSerializer,
    "events",
    ledgerInitializers,
  ),
  "matching.slice(-limit).reverse()",
);
assert.equal(
  resolveProperty(
    ledgerSerializer,
    "count",
    ledgerInitializers,
  ),
  "matching.length",
);

for (const helper of [
  "wcProductionCanonicalLedgerFile",
  "wcProductionCanonicalEntryAccount",
  "readWcProductionCanonicalVisibilityState",
]) {
  assert.equal(locals.has(helper), true);
}

const ledgerPathHelper = nodeText(
  locals.get("wcProductionCanonicalLedgerFile"),
);
assert.match(
  ledgerPathHelper,
  /path\.join\(\s*DATA_DIR\s*,\s*"wc_v1"\s*,\s*"ledger\.jsonl"\s*\)/,
);

const visibilityReader = nodeText(
  locals.get(
    "readWcProductionCanonicalVisibilityState",
  ),
);
assert.match(visibilityReader, /fs\.readFileSync/);
assert.match(visibilityReader, /JSON\.parse/);
assert.doesNotMatch(
  visibilityReader,
  /production-canary-v1/,
);

const fixtureRoot = fs.mkdtempSync(
  path.join(
    os.tmpdir(),
    "void-wc-production-visibility-proof-",
  ),
);

try {
  const canonicalDir = path.join(
    fixtureRoot,
    "wc_v1",
  );
  const legacyDir = path.join(
    fixtureRoot,
    "production-canary-v1",
  );
  fs.mkdirSync(canonicalDir, { recursive: true });
  fs.mkdirSync(legacyDir, { recursive: true });

  const canonicalEntry = {"account":"void-second-task-quote-canary-v1-20260729T000512Z-e37627dda9eb","agent_key_fingerprint_sha256":"e1152ec8aafe7949b2bcad02b5f4d432900278e7c99de9c0e019e9b3208a7f86","delta":3,"entitlement_sha256":"8b7200fee6986bc49a6d7557a577284fd6bb5c54d24d7501cf98508f0373a80d","idempotency_key":"paid-work-entitlement:voids_67af3558ec849c9e2dadfa72aa2549eb:8b7200fee6986bc49a6d7557a577284fd6bb5c54d24d7501cf98508f0373a80d:award-3","kind":"credit","reason":"paid_work_entitlement_acceptance_v1","review_sha256":"1b60caba88173073074312359bb90cd863d4cd2ab50eb18f3fb47b7e176ae982","reward_meta":{"accepted_at_ms":1785340983490,"caller":"void-second-task-live-entitlement-apply-v1","canonical_wc_ledger_credit_automatic":false,"duplicate_guard":["submission_id","entitlement_sha256","idempotency_key"],"entitlement_service_signature_verified":true,"fixed_award_wc":3,"operator_approval_verified":true,"policy":"approved_signed_pilot_entitlement_only","review_service_signature_verified":true,"server_controlled_award":true,"service_key_fingerprint_sha256":"c6e6ce9f6eb0541b3fdbf6e69ad4484950ca45f25ec79c05879806e769eff1fb","source":"void_agent_paid_work_intake_v1","void_settlement_performed":false,"wallet_transaction_payment_performed":false},"submission_id":"voids_67af3558ec849c9e2dadfa72aa2549eb","task_id":"void-public-selector-independent-verification-v1","ts_ms":1785340983490};
  const canonicalPath = path.join(
    canonicalDir,
    "ledger.jsonl",
  );
  const legacyPath = path.join(
    legacyDir,
    "ledger.jsonl",
  );

  fs.writeFileSync(
    canonicalPath,
    JSON.stringify(canonicalEntry) + "\n",
  );
  fs.writeFileSync(
    legacyPath,
    JSON.stringify({
      account: "void-second-task-quote-canary-v1-20260729T000512Z-e37627dda9eb",
      delta: 99,
      marker:
        "LEGACY_PRODUCTION_CANARY_SENTINEL",
    }) + "\n",
  );

  const canonicalBefore = crypto
    .createHash("sha256")
    .update(fs.readFileSync(canonicalPath))
    .digest("hex");
  const legacyBefore = crypto
    .createHash("sha256")
    .update(fs.readFileSync(legacyPath))
    .digest("hex");

  const canonicalState = await readCanonicalWcState(
    "void-second-task-quote-canary-v1-20260729T000512Z-e37627dda9eb",
    fixtureRoot,
  );
  assert.equal(canonicalState.earned, 3);
  assert.equal(canonicalState.redeemable, 3);

  const canonicalAfter = crypto
    .createHash("sha256")
    .update(fs.readFileSync(canonicalPath))
    .digest("hex");
  const legacyAfter = crypto
    .createHash("sha256")
    .update(fs.readFileSync(legacyPath))
    .digest("hex");

  assert.equal(canonicalAfter, canonicalBefore);
  assert.equal(legacyAfter, legacyBefore);
  assert.match(
    fs.readFileSync(legacyPath, "utf8"),
    /LEGACY_PRODUCTION_CANARY_SENTINEL/,
  );
  assert.match(
    fs.readFileSync(legacyPath, "utf8"),
    /99/,
  );
} finally {
  fs.rmSync(fixtureRoot, {
    recursive: true,
    force: true,
  });
}

console.log("VOID_WC_PRODUCTION_VISIBILITY_CANONICAL_PROJECTION_V1_PROOF_GREEN");
