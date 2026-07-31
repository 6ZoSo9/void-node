import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import * as ts from "typescript";

import {
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_APPLY_ENV,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_COMMAND_MARKER,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_COMPOSITION_CONFIRMATION_ENV,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_CONFIRMATION,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_CONFIRMATION_ENV,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_DEFAULT_DEPENDENCIES_V1,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_ENABLED_ENV,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_MARKER,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_MOUNT_CONFIRMATION_ENV,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_REGISTRAR_CONFIRMATION_ENV,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_RESULT_GLOBAL,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_VERSION,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_GLOBAL,
  executePublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationFromEnvironmentV1,
  publicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationDefaultDependencyIdentityV1,
  publicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationExpectedConfirmationsV1,
  publicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationSourceTopologyV1,
  type PublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationDependenciesV1,
} from "../src/http/public_agent_service_acceptance_persistence_http_route_server_bootstrap_callsite_integration_v1.js";

const SOURCE_BASE_COMMIT =
  "13ce1a2bcc8f993e8b16bfba4baf443c61934e55";
const SEALED_COMPOSITION_MERGE =
  "85bab8415a3ae8dd48bdf3428542b956d06dd6ee";
const SOURCE_INDEX_BEFORE_SHA256 =
  "7b4997e23459c8748db05ae3c1532f03f3c678f2161a721077ff62cbf62b1ead";
const SOURCE_INDEX_BEFORE_BYTES = 3848198;
const SOURCE_INDEX_JS_SHA256 =
  "6f569d312ca4976cb68b4b4de3f38e49087bede20f608293a93c3100f7c736a8";
const SOURCE_INDEX_JS_BYTES = 1037168;
const CALLSITE_MODULE_SHA256 =
  "d2a94353d73b33742f24bc84a532430543dab7e99e09432071801b65eb51f0c5";
const CALLSITE_MODULE_BYTES = 27500;

const COMPOSITION_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_V1";
const COMPOSITION_COMMAND_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_COMMAND_V1";
const COMPOSITION_CONFIRMATION =
  "bootstrapAcceptancePersistenceHttpRouteServerCompositionV1";
const REGISTRAR_CONFIRMATION =
  "integrateAcceptancePersistenceHttpRouteServerRegistrarV1";
const MOUNT_CONFIRMATION =
  "mountAcceptancePersistenceHttpRouteServerV1";

const INDEX_IMPORT_BLOCK =
  'import { executePublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationFromEnvironmentV1 } from "./http/public_agent_service_acceptance_persistence_http_route_server_bootstrap_callsite_integration_v1.js"; // VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_V1_IMPORT\n';

const TRUSTED_CONTEXT_PROVIDER_BINDING_INDEX_IMPORT_BLOCK =
  'import { installPublicAgentServiceAcceptancePersistenceTrustedContextProviderBindingFromEnvironmentV1 } from "./http/public_agent_service_acceptance_persistence_trusted_context_provider_binding_v1.js"; // VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_V1_IMPORT\n';

const TRUSTED_CONTEXT_PROVIDER_BINDING_INDEX_INSTALL_BLOCK = `// VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_V1_BEGIN
const __voidAcceptancePersistenceTrustedContextProviderBindingResultV1 =
  installPublicAgentServiceAcceptancePersistenceTrustedContextProviderBindingFromEnvironmentV1(
    process.env,
    globalThis as any,
  );
(globalThis as any).__void_public_agent_service_acceptance_persistence_trusted_context_provider_binding_v1_result =
  __voidAcceptancePersistenceTrustedContextProviderBindingResultV1;
// VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_V1_END
`;

const INDEX_CALL_BLOCK = `// VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_V1_BEGIN
const __voidAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationResultV1 =
  await executePublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationFromEnvironmentV1(
    process.env,
    () => app,
    () => {
      const provider =
        (globalThis as any).__void_public_agent_service_acceptance_persistence_trusted_context_provider_v1;
      if (typeof provider !== "function") {
        throw new Error(
          "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_V1 is unavailable",
        );
      }
      return provider();
    },
  );
(globalThis as any).__void_public_agent_service_acceptance_persistence_http_route_server_bootstrap_callsite_integration_v1_result =
  __voidAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationResultV1;
// VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_V1_END
`;

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function countExact(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

function assertRejectsMessage(
  action: () => Promise<unknown>,
  pattern: RegExp,
): Promise<void> {
  return assert.rejects(action, pattern).then(() => undefined);
}

function parseSource(file: string, source: string): ts.SourceFile {
  const parsed = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  assert.equal(parsed.parseDiagnostics.length, 0);
  return parsed;
}

function lineOf(sourceFile: ts.SourceFile, node: ts.Node): number {
  return sourceFile.getLineAndCharacterOfPosition(
    node.getStart(sourceFile),
  ).line + 1;
}

function enclosingFunctionName(node: ts.Node): string {
  let current = node.parent;
  while (current) {
    if (ts.isFunctionDeclaration(current)) {
      return current.name?.text ?? "<anonymous>";
    }
    current = current.parent;
  }
  return "<module>";
}

const root = process.cwd();
const indexPath = path.join(root, "src/index.ts");
const indexJsPath = path.join(root, "src/index.js");
const modulePath = path.join(
  root,
  "src/http/public_agent_service_acceptance_persistence_http_route_server_bootstrap_callsite_integration_v1.ts",
);
const proofPath = path.join(
  root,
  "scripts/prove_public_agent_service_acceptance_persistence_http_route_server_bootstrap_callsite_integration_v1.ts",
);
const schemaPath = path.join(
  root,
  "schemas/public-agent-service-acceptance-persistence-http-route-server-bootstrap-callsite-integration-v1.schema.json",
);
const examplePath = path.join(
  root,
  "examples/public-agent-service-acceptance-persistence-http-route-server-bootstrap-callsite-integration-v1.example.json",
);
const docsPath = path.join(
  root,
  "docs/public-agent/public-agent-service-acceptance-persistence-http-route-server-bootstrap-callsite-integration-v1.md",
);
const workflowPath = path.join(
  root,
  ".github/workflows/public-agent-service-acceptance-persistence-http-route-server-bootstrap-callsite-integration-v1.yml",
);

const index = readFileSync(indexPath, "utf8");
const indexJs = readFileSync(indexJsPath);
const moduleSource = readFileSync(modulePath, "utf8");
const proofSource = readFileSync(proofPath, "utf8");
const schemaSource = readFileSync(schemaPath, "utf8");
const exampleSource = readFileSync(examplePath, "utf8");
const docs = readFileSync(docsPath, "utf8");
const workflow = readFileSync(workflowPath, "utf8");

assert.equal(Buffer.byteLength(moduleSource), CALLSITE_MODULE_BYTES);
assert.equal(sha256(moduleSource), CALLSITE_MODULE_SHA256);
assert.equal(indexJs.length, SOURCE_INDEX_JS_BYTES);
assert.equal(sha256(indexJs), SOURCE_INDEX_JS_SHA256);

assert.equal(countExact(index, INDEX_IMPORT_BLOCK), 1);
assert.equal(countExact(index, INDEX_CALL_BLOCK), 1);
const recoveredIndex = index
  .replace(TRUSTED_CONTEXT_PROVIDER_BINDING_INDEX_IMPORT_BLOCK, "")
  .replace(TRUSTED_CONTEXT_PROVIDER_BINDING_INDEX_INSTALL_BLOCK, "")
  .replace(INDEX_IMPORT_BLOCK, "")
  .replace(INDEX_CALL_BLOCK, "");
assert.equal(Buffer.byteLength(recoveredIndex), 3846844);
assert.equal(sha256(recoveredIndex), "dd8c131c818ab9227ec9b0c95d1513325dbe1c682d45ed547360bd2529752407");

const indexAst = parseSource(indexPath, index);
const moduleAst = parseSource(modulePath, moduleSource);
parseSource(proofPath, proofSource);

const importDeclarations: ts.ImportDeclaration[] = [];
const callExpressions: ts.CallExpression[] = [];
const appDeclarations: ts.VariableDeclaration[] = [];
const appExports: ts.BinaryExpression[] = [];
const appListens: ts.CallExpression[] = [];
const resultGlobalAssignments: ts.BinaryExpression[] = [];

function visitIndex(node: ts.Node): void {
  if (
    ts.isImportDeclaration(node)
    && ts.isStringLiteral(node.moduleSpecifier)
    && node.moduleSpecifier.text
      === "./http/public_agent_service_acceptance_persistence_http_route_server_bootstrap_callsite_integration_v1.js"
  ) {
    importDeclarations.push(node);
  }

  if (
    ts.isCallExpression(node)
    && node.expression.getText(indexAst)
      === "executePublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationFromEnvironmentV1"
  ) {
    callExpressions.push(node);
  }

  if (
    ts.isVariableDeclaration(node)
    && node.name.getText(indexAst) === "app"
    && node.initializer
    && ts.isCallExpression(node.initializer)
    && node.initializer.expression.getText(indexAst) === "express"
    && node.initializer.arguments.length === 0
  ) {
    appDeclarations.push(node);
  }

  if (
    ts.isBinaryExpression(node)
    && node.operatorToken.kind === ts.SyntaxKind.EqualsToken
    && node.left.getText(indexAst)
      === "(globalThis as any).__void_http_app"
    && node.right.getText(indexAst) === "app"
  ) {
    appExports.push(node);
  }

  if (
    ts.isCallExpression(node)
    && ts.isPropertyAccessExpression(node.expression)
    && node.expression.expression.getText(indexAst) === "app"
    && node.expression.name.text === "listen"
  ) {
    appListens.push(node);
  }

  if (
    ts.isBinaryExpression(node)
    && node.operatorToken.kind === ts.SyntaxKind.EqualsToken
    && node.left.getText(indexAst)
      === "(globalThis as any).__void_public_agent_service_acceptance_persistence_http_route_server_bootstrap_callsite_integration_v1_result"
  ) {
    resultGlobalAssignments.push(node);
  }

  ts.forEachChild(node, visitIndex);
}

visitIndex(indexAst);

assert.equal(importDeclarations.length, 1);
const importClause = importDeclarations[0].importClause;
assert.ok(importClause);
assert.ok(importClause.namedBindings);
assert.ok(ts.isNamedImports(importClause.namedBindings));
assert.deepEqual(
  importClause.namedBindings.elements.map((entry) => entry.name.text),
  [
    "executePublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationFromEnvironmentV1",
  ],
);

assert.equal(callExpressions.length, 1);
const call = callExpressions[0];
assert.ok(ts.isAwaitExpression(call.parent));
assert.equal(enclosingFunctionName(call), "__main__");
assert.equal(call.arguments.length, 3);
assert.equal(call.arguments[0].getText(indexAst), "process.env");
assert.equal(call.arguments[1].getText(indexAst), "() => app");
assert.ok(ts.isArrowFunction(call.arguments[2]));

assert.equal(appDeclarations.length, 1);
assert.equal(appExports.length, 2);
assert.equal(appListens.length, 3);
assert.equal(resultGlobalAssignments.length, 1);

const appDeclarationLine = lineOf(indexAst, appDeclarations[0]);
const appExportLines = appExports
  .map((entry) => lineOf(indexAst, entry))
  .sort((left, right) => left - right);
const appListenLines = appListens
  .map((entry) => lineOf(indexAst, entry))
  .sort((left, right) => left - right);
const callLine = lineOf(indexAst, call);
const firstListenerLine = appListenLines[0];

const preListenerExports = appExportLines.filter(
  (line) => appDeclarationLine < line && line < firstListenerLine,
);
assert.equal(preListenerExports.length, 1);
assert.ok(callLine > preListenerExports[0]);
assert.ok(callLine < firstListenerLine);
assert.equal(enclosingFunctionName(resultGlobalAssignments[0]), "__main__");

const moduleDynamicImports: ts.CallExpression[] = [];
function visitModule(node: ts.Node): void {
  if (
    ts.isCallExpression(node)
    && node.expression.kind === ts.SyntaxKind.ImportKeyword
  ) {
    moduleDynamicImports.push(node);
  }
  ts.forEachChild(node, visitModule);
}
visitModule(moduleAst);
assert.equal(moduleDynamicImports.length, 1);
assert.equal(
  moduleDynamicImports[0].arguments[0].getText(moduleAst),
  "compositionModuleUrlV1()",
);

const confirmations =
  publicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationExpectedConfirmationsV1();
assert.deepEqual(confirmations, {
  callsite_confirmation:
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_CONFIRMATION,
  composition_confirmation: COMPOSITION_CONFIRMATION,
  registrar_confirmation: REGISTRAR_CONFIRMATION,
  mount_confirmation: MOUNT_CONFIRMATION,
});

const topology =
  publicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationSourceTopologyV1();
assert.deepEqual(topology, {
  live_entrypoint: "src/index.ts",
  app_export_anchor:
    "(globalThis as any).__void_http_app = app;",
  first_listener_owner: "src/index.ts",
  composition_source_relative_url:
    "../../scripts/public_agent_service_acceptance_persistence_http_route_server_bootstrap_composition_v1.ts",
  modifies_index_ts: true,
  modifies_index_js: false,
  disabled_before_composition_import: true,
});

const defaultIdentity =
  publicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationDefaultDependencyIdentityV1();
assert.equal(defaultIdentity.import_composition_module_exact, true);
assert.match(
  defaultIdentity.composition_module_url,
  /\/scripts\/public_agent_service_acceptance_persistence_http_route_server_bootstrap_composition_v1\.ts$/,
);
assert.equal(
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_DEFAULT_DEPENDENCIES_V1
    .importCompositionModule
    instanceof Function,
  true,
);

let importerCount = 0;
let appProviderCount = 0;
let trustedProviderCount = 0;
const appObject = Object.freeze({ app: true });
const appProvider = (): unknown => {
  appProviderCount += 1;
  return appObject;
};
const trustedProvider = (): unknown => {
  trustedProviderCount += 1;
  return {
    catalog: {},
    work_order: {},
    quote: {},
  };
};

const disabledDependencies:
  PublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationDependenciesV1 = {
    importCompositionModule: async () => {
      importerCount += 1;
      throw new Error("disabled path imported composition");
    },
  };

const disabled = await executePublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationFromEnvironmentV1(
  {
    [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_APPLY_ENV]:
      "invalid-but-ignored-while-disabled",
  },
  appProvider,
  trustedProvider,
  disabledDependencies,
);
assert.equal(disabled.status, "disabled");
assert.equal(disabled.enabled, false);
assert.equal(disabled.apply, false);
assert.equal(disabled.composition_module_imported, false);
assert.equal(disabled.composition_invoked, false);
assert.equal(importerCount, 0);
assert.equal(appProviderCount, 0);
assert.equal(trustedProviderCount, 0);
assert.equal(disabled.authority.network_listener_creation, false);
assert.equal(disabled.authority.trusted_context_provider_invocation, false);

await assertRejectsMessage(
  () => executePublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationFromEnvironmentV1(
    {
      [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_ENABLED_ENV]:
        "yes",
    },
    appProvider,
    trustedProvider,
    disabledDependencies,
  ),
  /must be empty, 0, or 1/,
);
assert.equal(importerCount, 0);

let capturedEnvironment: NodeJS.ProcessEnv | null = null;
let capturedCommand: Record<string, unknown> | null = null;
let capturedAppProvider: (() => unknown) | null = null;
let capturedTrustedProvider: (() => unknown) | null = null;
let mockStatus = "planned";
let mockAppProviderInvoked = false;

const mockModule = {
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_MARKER:
    COMPOSITION_MARKER,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_COMMAND_MARKER:
    COMPOSITION_COMMAND_MARKER,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_VERSION:
    1,
  executePublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCompositionFromEnvironmentV1: (
    environment: NodeJS.ProcessEnv,
    command: unknown,
    forwardedAppProvider: () => unknown,
    forwardedTrustedProvider: () => unknown,
  ): unknown => {
    capturedEnvironment = environment;
    capturedCommand = command as Record<string, unknown>;
    capturedAppProvider = forwardedAppProvider;
    capturedTrustedProvider = forwardedTrustedProvider;
    if (mockAppProviderInvoked) {
      assert.equal(forwardedAppProvider(), appObject);
    }
    return {
      marker:
        "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_RESULT_V1",
      version: 1,
      status: mockStatus,
      app_provider_invoked: mockAppProviderInvoked,
      authority: {
        network_listener_creation: false,
      },
    };
  },
};

const mockDependencies:
  PublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationDependenciesV1 = {
    importCompositionModule: async () => {
      importerCount += 1;
      return mockModule;
    },
  };

const dryEnvironment: NodeJS.ProcessEnv = {
  [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_ENABLED_ENV]:
    "1",
};
const dryRun = await executePublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationFromEnvironmentV1(
  dryEnvironment,
  appProvider,
  trustedProvider,
  mockDependencies,
);
assert.equal(dryRun.status, "planned");
assert.equal(dryRun.enabled, true);
assert.equal(dryRun.apply, false);
assert.equal(dryRun.confirmation_verified, true);
assert.equal(dryRun.composition_module_imported, true);
assert.equal(dryRun.composition_invoked, true);
assert.equal(dryRun.app_provider_invoked, false);
assert.equal(importerCount, 1);
assert.equal(appProviderCount, 0);
assert.equal(trustedProviderCount, 0);
assert.equal(capturedEnvironment, dryEnvironment);
assert.deepEqual(capturedCommand, {
  marker: COMPOSITION_COMMAND_MARKER,
  version: 1,
  apply: false,
  confirmation: "",
  integration_confirmation: "",
  mount_confirmation: "",
});
assert.equal(capturedAppProvider, appProvider);
assert.equal(capturedTrustedProvider, trustedProvider);

await assertRejectsMessage(
  () => executePublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationFromEnvironmentV1(
    {
      [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_ENABLED_ENV]:
        "1",
      [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_APPLY_ENV]:
        "1",
    },
    appProvider,
    trustedProvider,
    mockDependencies,
  ),
  /requires exact confirmation/,
);
assert.equal(importerCount, 1);

mockStatus = "mounted";
mockAppProviderInvoked = true;
const applyEnvironment: NodeJS.ProcessEnv = {
  [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_ENABLED_ENV]:
    "1",
  [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_APPLY_ENV]:
    "1",
  [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_CONFIRMATION_ENV]:
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_CONFIRMATION,
  [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_COMPOSITION_CONFIRMATION_ENV]:
    COMPOSITION_CONFIRMATION,
  [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_REGISTRAR_CONFIRMATION_ENV]:
    REGISTRAR_CONFIRMATION,
  [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_MOUNT_CONFIRMATION_ENV]:
    MOUNT_CONFIRMATION,
};
const applied = await executePublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationFromEnvironmentV1(
  applyEnvironment,
  appProvider,
  trustedProvider,
  mockDependencies,
);
assert.equal(applied.status, "mounted");
assert.equal(applied.apply, true);
assert.equal(applied.confirmation_verified, true);
assert.equal(applied.app_provider_invoked, true);
assert.equal(importerCount, 2);
assert.equal(appProviderCount, 1);
assert.equal(trustedProviderCount, 0);
assert.deepEqual(capturedCommand, {
  marker: COMPOSITION_COMMAND_MARKER,
  version: 1,
  apply: true,
  confirmation: COMPOSITION_CONFIRMATION,
  integration_confirmation: REGISTRAR_CONFIRMATION,
  mount_confirmation: MOUNT_CONFIRMATION,
});

const wrongModuleDependencies:
  PublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationDependenciesV1 = {
    importCompositionModule: async () => ({
      ...mockModule,
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_MARKER:
        "WRONG",
    }),
  };
await assertRejectsMessage(
  () => executePublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationFromEnvironmentV1(
    dryEnvironment,
    appProvider,
    trustedProvider,
    wrongModuleDependencies,
  ),
  /module marker mismatch/,
);

const schema = JSON.parse(schemaSource) as Record<string, unknown>;
const example = JSON.parse(exampleSource) as Record<string, unknown>;
assert.equal(
  example.marker,
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_EXAMPLE_V1",
);
assert.equal(example.version, 1);
assert.equal(example.source_base_commit, SOURCE_BASE_COMMIT);
assert.equal(example.sealed_bootstrap_composition_merge, SEALED_COMPOSITION_MERGE);
assert.equal(
  (schema.properties as Record<string, Record<string, unknown>>).marker.const,
  example.marker,
);
assert.equal(
  (
    schema.properties as Record<string, Record<string, unknown>>
  ).source_base_commit.const,
  SOURCE_BASE_COMMIT,
);

for (const required of [
  "Disabled by default",
  "src/index.ts",
  "src/index.js",
  "line 4593",
  "before the first listener",
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_ENABLED_ENV,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_GLOBAL,
]) {
  assert.ok(
    docs.includes(required),
    `documentation missing ${required}`,
  );
}

for (const required of [
  "src/index.ts",
  "src/http/public_agent_service_acceptance_persistence_http_route_server_bootstrap_callsite_integration_v1.ts",
  "scripts/prove_public_agent_service_acceptance_persistence_http_route_server_bootstrap_callsite_integration_v1.ts",
  "node_modules/.bin/tsx scripts/prove_public_agent_service_acceptance_persistence_http_route_server_bootstrap_callsite_integration_v1.ts",
]) {
  assert.ok(
    workflow.includes(required),
    `workflow missing ${required}`,
  );
}

const proof = {
  marker:
    "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_V1_PROOF_GREEN",
  binding_marker:
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_MARKER,
  version:
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_VERSION,
  source_base_commit: SOURCE_BASE_COMMIT,
  sealed_bootstrap_composition_merge: SEALED_COMPOSITION_MERGE,
  source_index_recovery_exact: true,
  source_index_js_unchanged: true,
  source_index_import_exact: true,
  source_index_callsite_exact: true,
  source_index_primary_callsite_anchor_unique: true,
  source_index_call_after_primary_export: true,
  source_index_call_before_first_listener: true,
  source_index_composition_result_global_exact:
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_RESULT_GLOBAL,
  source_index_trusted_context_provider_global_exact:
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_GLOBAL,
  environment_disabled_by_default: true,
  disabled_short_circuit_before_command_validation: true,
  disabled_short_circuit_before_composition_import: true,
  invalid_enable_flag_rejected: true,
  dry_run_confirmations_empty: true,
  apply_confirmation_required: true,
  exact_four_confirmations_forwarded: true,
  composition_module_identity_enforced: true,
  composition_module_import_deferred_until_enabled: true,
  app_provider_forwarded_once: true,
  trusted_context_provider_deferred: true,
  src_index_ts_modified: true,
  src_index_js_modified: false,
  production_http_route_mounted: false,
  network_listener_created: false,
  external_http_submission: false,
  production_acceptance_persistence_performed: false,
  production_replay_write_performed: false,
  payment_authorization: false,
  payment_execution: false,
  execution_authorization: false,
  work_dispatch: false,
  production_signing: false,
  transaction_broadcast: false,
  work_credit_write: false,
  runtime_mutation: false,
  service_change: false,
  service_restart: false,
  deployment_performed: false,
  money_movement: false,
  proof: "green",
};

console.log(JSON.stringify(proof, null, 2));
console.log(
  "acceptance_persistence_http_route_server_bootstrap_callsite_integration_proof=green",
);
