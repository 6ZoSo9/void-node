import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  chmodSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import * as ts from "typescript";

import {
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_BUNDLE_MARKER,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_APPLY_ENV,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_BUNDLE_PATH_ENV,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_CONFIRMATION,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_CONFIRMATION_ENV,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_ENABLED_ENV,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_MARKER,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_RESULT_GLOBAL,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_VERSION,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_GLOBAL,
  installPublicAgentServiceAcceptancePersistenceTrustedContextProviderBindingFromEnvironmentV1,
  publicAgentServiceAcceptancePersistenceTrustedContextProviderBindingSourceTopologyV1,
  readPublicAgentServiceAcceptancePersistenceTrustedContextBundleV1,
} from "../src/http/public_agent_service_acceptance_persistence_trusted_context_provider_binding_v1.js";

const SOURCE_BASE_COMMIT =
  "9a9b9a47c4f07fdae4f2f2a765183d9f9a28d7d3";
const SOURCE_INDEX_BEFORE_SHA256 =
  "7cbfd6e3fda31de8c00be4bf863fdc064c305ee4aaff91372ceb0982c5c52c1e";
const SOURCE_INDEX_BEFORE_BYTES = 3848698;
const SOURCE_INDEX_JS_SHA256 =
  "6f569d312ca4976cb68b4b4de3f38e49087bede20f608293a93c3100f7c736a8";
const SOURCE_INDEX_JS_BYTES = 1037168;

const INDEX_IMPORT_BLOCK =
  'import { installPublicAgentServiceAcceptancePersistenceTrustedContextProviderBindingFromEnvironmentV1 } from "./http/public_agent_service_acceptance_persistence_trusted_context_provider_binding_v1.js"; // VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_V1_IMPORT\n';

const INDEX_INSTALL_BLOCK = `// VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_V1_BEGIN
const __voidAcceptancePersistenceTrustedContextProviderBindingResultV1 =
  installPublicAgentServiceAcceptancePersistenceTrustedContextProviderBindingFromEnvironmentV1(
    process.env,
    globalThis as any,
  );
(globalThis as any).__void_public_agent_service_acceptance_persistence_trusted_context_provider_binding_v1_result =
  __voidAcceptancePersistenceTrustedContextProviderBindingResultV1;
// VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_V1_END
`;

function sha256(value: Buffer | string): string {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

function countExact(
  source: string,
  value: string,
): number {
  return source.split(value).length - 1;
}

function parseSource(
  file: string,
  source: string,
): ts.SourceFile {
  const parsed = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const diagnostics = (
    parsed as ts.SourceFile & {
      parseDiagnostics: readonly ts.Diagnostic[];
    }
  ).parseDiagnostics;
  assert.equal(diagnostics.length, 0);
  return parsed;
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

function writeJson(
  file: string,
  value: unknown,
  mode = 0o600,
): void {
  writeFileSync(
    file,
    `${JSON.stringify(value, null, 2)}\n`,
    {
      encoding: "utf8",
      mode,
    },
  );
  chmodSync(file, mode);
}

const root = process.cwd();
const indexPath = path.join(root, "src/index.ts");
const indexJsPath = path.join(root, "src/index.js");
const modulePath = path.join(
  root,
  "src/http/public_agent_service_acceptance_persistence_trusted_context_provider_binding_v1.ts",
);
const proofPath = path.join(
  root,
  "scripts/prove_public_agent_service_acceptance_persistence_trusted_context_provider_binding_v1.ts",
);
const schemaPath = path.join(
  root,
  "schemas/public-agent-service-acceptance-persistence-trusted-context-provider-binding-v1.schema.json",
);
const examplePath = path.join(
  root,
  "examples/public-agent-service-acceptance-persistence-trusted-context-provider-binding-v1.example.json",
);
const docsPath = path.join(
  root,
  "docs/public-agent/public-agent-service-acceptance-persistence-trusted-context-provider-binding-v1.md",
);
const workflowPath = path.join(
  root,
  ".github/workflows/public-agent-service-acceptance-persistence-trusted-context-provider-binding-v1.yml",
);

const index = readFileSync(indexPath, "utf8");
const indexJs = readFileSync(indexJsPath);
const moduleSource = readFileSync(modulePath, "utf8");
const proofSource = readFileSync(proofPath, "utf8");
const schemaSource = readFileSync(schemaPath, "utf8");
const exampleSource = readFileSync(examplePath, "utf8");
const docs = readFileSync(docsPath, "utf8");
const workflow = readFileSync(workflowPath, "utf8");

assert.equal(indexJs.length, SOURCE_INDEX_JS_BYTES);
assert.equal(sha256(indexJs), SOURCE_INDEX_JS_SHA256);
assert.equal(countExact(index, INDEX_IMPORT_BLOCK), 1);
assert.equal(countExact(index, INDEX_INSTALL_BLOCK), 1);
const recoveredIndex = index
  .replace(INDEX_IMPORT_BLOCK, "")
  .replace(INDEX_INSTALL_BLOCK, "");
assert.equal(
  Buffer.byteLength(recoveredIndex),
  SOURCE_INDEX_BEFORE_BYTES,
);
assert.equal(
  sha256(recoveredIndex),
  SOURCE_INDEX_BEFORE_SHA256,
);

const indexAst = parseSource(indexPath, index);
parseSource(modulePath, moduleSource);
parseSource(proofPath, proofSource);

const bindingImports: ts.ImportDeclaration[] = [];
const bindingCalls: ts.CallExpression[] = [];
const providerResultAssignments: ts.BinaryExpression[] = [];
const callsiteCalls: ts.CallExpression[] = [];

function visitIndex(node: ts.Node): void {
  if (
    ts.isImportDeclaration(node)
    && ts.isStringLiteral(node.moduleSpecifier)
    && node.moduleSpecifier.text
      === "./http/public_agent_service_acceptance_persistence_trusted_context_provider_binding_v1.js"
  ) {
    bindingImports.push(node);
  }
  if (
    ts.isCallExpression(node)
    && node.expression.getText(indexAst)
      === "installPublicAgentServiceAcceptancePersistenceTrustedContextProviderBindingFromEnvironmentV1"
  ) {
    bindingCalls.push(node);
  }
  if (
    ts.isBinaryExpression(node)
    && node.operatorToken.kind === ts.SyntaxKind.EqualsToken
    && node.left.getText(indexAst)
      === "(globalThis as any).__void_public_agent_service_acceptance_persistence_trusted_context_provider_binding_v1_result"
  ) {
    providerResultAssignments.push(node);
  }
  if (
    ts.isCallExpression(node)
    && node.expression.getText(indexAst)
      === "executePublicAgentServiceAcceptancePersistenceHttpRouteServerBootstrapCallsiteIntegrationFromEnvironmentV1"
  ) {
    callsiteCalls.push(node);
  }
  ts.forEachChild(node, visitIndex);
}
visitIndex(indexAst);

assert.equal(bindingImports.length, 1);
const importClause = bindingImports[0].importClause;
assert.ok(importClause);
assert.ok(importClause.namedBindings);
assert.ok(ts.isNamedImports(importClause.namedBindings));
assert.deepEqual(
  importClause.namedBindings.elements.map(
    (entry) => entry.name.text,
  ),
  [
    "installPublicAgentServiceAcceptancePersistenceTrustedContextProviderBindingFromEnvironmentV1",
  ],
);
assert.equal(bindingCalls.length, 1);
assert.equal(bindingCalls[0].arguments.length, 2);
assert.equal(
  bindingCalls[0].arguments[0].getText(indexAst),
  "process.env",
);
assert.equal(
  bindingCalls[0].arguments[1].getText(indexAst),
  "globalThis as any",
);
assert.equal(
  enclosingFunctionName(bindingCalls[0]),
  "__main__",
);
assert.equal(providerResultAssignments.length, 1);
assert.equal(
  enclosingFunctionName(providerResultAssignments[0]),
  "__main__",
);
assert.equal(callsiteCalls.length, 1);
assert.ok(
  bindingCalls[0].getStart(indexAst)
    < callsiteCalls[0].getStart(indexAst),
);

const topology =
  publicAgentServiceAcceptancePersistenceTrustedContextProviderBindingSourceTopologyV1();
assert.deepEqual(topology, {
  live_entrypoint: "src/index.ts",
  provider_global:
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_GLOBAL,
  provider_result_global:
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_RESULT_GLOBAL,
  bundle_shape: [
    "catalog",
    "work_order",
    "quote",
  ],
  disabled_before_path_validation: true,
  install_before_bundle_read: true,
  bundle_read_deferred_until_provider_invocation: true,
  provider_global_non_replaceable: true,
});

const disabledTarget: Record<string, unknown> = {};
const disabled =
  installPublicAgentServiceAcceptancePersistenceTrustedContextProviderBindingFromEnvironmentV1(
    {
      [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_APPLY_ENV]:
        "invalid-but-ignored",
      [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_CONFIRMATION_ENV]:
        "invalid-but-ignored",
      [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_BUNDLE_PATH_ENV]:
        "relative/invalid-but-ignored.json",
    },
    disabledTarget,
  );
assert.equal(disabled.status, "disabled");
assert.equal(disabled.enabled, false);
assert.equal(disabled.apply, false);
assert.equal(disabled.bundle_path_configured, false);
assert.equal(disabled.bundle_path_fingerprint_sha256, null);
assert.equal(disabled.provider_installed, false);
assert.equal(disabled.provider_invoked, false);
assert.equal(
  Object.prototype.hasOwnProperty.call(
    disabledTarget,
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_GLOBAL,
  ),
  false,
);
assert.equal(
  disabled.authority.trusted_context_bundle_read,
  false,
);
assert.equal(
  disabled.authority.production_acceptance_persistence,
  false,
);

assert.throws(
  () =>
    installPublicAgentServiceAcceptancePersistenceTrustedContextProviderBindingFromEnvironmentV1(
      {
        [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_ENABLED_ENV]:
          "yes",
      },
      {},
    ),
  /must be empty, 0, or 1/,
);
assert.throws(
  () =>
    installPublicAgentServiceAcceptancePersistenceTrustedContextProviderBindingFromEnvironmentV1(
      {
        [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_ENABLED_ENV]:
          "1",
        [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_BUNDLE_PATH_ENV]:
          "relative/bundle.json",
      },
      {},
    ),
  /bundle_path must be absolute/,
);

const temporaryRoot = mkdtempSync(
  path.join(
    os.tmpdir(),
    "void-acceptance-context-provider-proof-",
  ),
);
try {
  const bundlePath = path.join(
    temporaryRoot,
    "trusted-context-bundle-v1.json",
  );
  const bundle = {
    marker:
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_BUNDLE_MARKER,
    version: 1,
    catalog: {
      marker: "trusted-catalog",
      nested: {
        value: 1,
      },
    },
    work_order: {
      marker: "trusted-work-order",
    },
    quote: {
      marker: "trusted-quote",
    },
  };

  const dryTarget: Record<string, unknown> = {};
  const dry =
    installPublicAgentServiceAcceptancePersistenceTrustedContextProviderBindingFromEnvironmentV1(
      {
        [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_ENABLED_ENV]:
          "1",
        [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_BUNDLE_PATH_ENV]:
          bundlePath,
      },
      dryTarget,
    );
  assert.equal(dry.status, "ready");
  assert.equal(dry.enabled, true);
  assert.equal(dry.apply, false);
  assert.equal(dry.confirmation_verified, true);
  assert.equal(dry.bundle_path_configured, true);
  assert.equal(
    dry.bundle_path_fingerprint_sha256,
    sha256(bundlePath),
  );
  assert.equal(dry.provider_installed, false);
  assert.equal(
    Object.prototype.hasOwnProperty.call(
      dryTarget,
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_GLOBAL,
    ),
    false,
  );

  assert.throws(
    () =>
      installPublicAgentServiceAcceptancePersistenceTrustedContextProviderBindingFromEnvironmentV1(
        {
          [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_ENABLED_ENV]:
            "1",
          [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_APPLY_ENV]:
            "1",
          [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_BUNDLE_PATH_ENV]:
            bundlePath,
        },
        {},
      ),
    /requires exact confirmation/,
  );

  const appliedTarget: Record<string, unknown> = {};
  const applied =
    installPublicAgentServiceAcceptancePersistenceTrustedContextProviderBindingFromEnvironmentV1(
      {
        [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_ENABLED_ENV]:
          "1",
        [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_APPLY_ENV]:
          "1",
        [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_CONFIRMATION_ENV]:
          PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_CONFIRMATION,
        [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_BUNDLE_PATH_ENV]:
          bundlePath,
      },
      appliedTarget,
    );
  assert.equal(applied.status, "installed");
  assert.equal(applied.apply, true);
  assert.equal(applied.confirmation_verified, true);
  assert.equal(applied.provider_installed, true);
  assert.equal(applied.provider_invoked, false);
  assert.equal(
    applied.authority.provider_global_install,
    true,
  );
  assert.equal(
    applied.authority.trusted_context_bundle_read,
    false,
  );
  assert.equal(
    applied.authority.trusted_context_provider_invocation,
    false,
  );
  assert.equal(
    applied.authority.production_acceptance_persistence,
    false,
  );

  const descriptor = Object.getOwnPropertyDescriptor(
    appliedTarget,
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_GLOBAL,
  );
  assert.ok(descriptor);
  assert.equal(descriptor.enumerable, false);
  assert.equal(descriptor.configurable, false);
  assert.equal(descriptor.writable, false);
  assert.equal(typeof descriptor.value, "function");

  assert.throws(
    () =>
      installPublicAgentServiceAcceptancePersistenceTrustedContextProviderBindingFromEnvironmentV1(
        {
          [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_ENABLED_ENV]:
            "1",
          [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_APPLY_ENV]:
            "1",
          [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_CONFIRMATION_ENV]:
            PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_CONFIRMATION,
          [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_BUNDLE_PATH_ENV]:
            bundlePath,
        },
        appliedTarget,
    ),
    /provider global already exists/,
  );
  const inheritedProviderTarget = Object.create({
    [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_GLOBAL]:
      (): unknown => ({}),
  }) as Record<string, unknown>;
  assert.throws(
    () =>
      installPublicAgentServiceAcceptancePersistenceTrustedContextProviderBindingFromEnvironmentV1(
        {
          [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_ENABLED_ENV]:
            "1",
          [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_APPLY_ENV]:
            "1",
          [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_CONFIRMATION_ENV]:
            PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_CONFIRMATION,
          [PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_BUNDLE_PATH_ENV]:
            bundlePath,
        },
        inheritedProviderTarget,
      ),
    /provider global already exists/,
  );

  writeJson(
    bundlePath,
    bundle,
  );
  const context = (
    descriptor.value as () => unknown
  )() as Record<string, unknown>;
  assert.deepEqual(
    Object.keys(context).sort(),
    [
      "catalog",
      "quote",
      "work_order",
    ],
  );
  assert.deepEqual(context, {
    catalog: bundle.catalog,
    work_order: bundle.work_order,
    quote: bundle.quote,
  });
  assert.equal(Object.isFrozen(context), true);
  assert.equal(Object.isFrozen(context.catalog), true);
  assert.equal(
    Object.isFrozen(
      (context.catalog as Record<string, unknown>).nested,
    ),
    true,
  );

  chmodSync(bundlePath, 0o622);
  assert.throws(
    () =>
      readPublicAgentServiceAcceptancePersistenceTrustedContextBundleV1(
        bundlePath,
      ),
    /must not be group or other writable/,
  );
  chmodSync(bundlePath, 0o600);

  const symlinkPath = path.join(
    temporaryRoot,
    "trusted-context-bundle-symlink.json",
  );
  symlinkSync(bundlePath, symlinkPath);
  assert.throws(
    () =>
      readPublicAgentServiceAcceptancePersistenceTrustedContextBundleV1(
        symlinkPath,
      ),
    /must not contain symlinks/,
  );

  writeJson(bundlePath, {
    ...bundle,
    marker: "WRONG",
  });
  assert.throws(
    () =>
      readPublicAgentServiceAcceptancePersistenceTrustedContextBundleV1(
        bundlePath,
      ),
    /bundle marker mismatch/,
  );

  writeJson(bundlePath, {
    ...bundle,
    extra: true,
  });
  assert.throws(
    () =>
      readPublicAgentServiceAcceptancePersistenceTrustedContextBundleV1(
        bundlePath,
      ),
    /bundle keys must be exact/,
  );

  writeFileSync(
    bundlePath,
    "{invalid-json",
    {
      encoding: "utf8",
      mode: 0o600,
    },
  );
  chmodSync(bundlePath, 0o600);
  assert.throws(
    () =>
      readPublicAgentServiceAcceptancePersistenceTrustedContextBundleV1(
        bundlePath,
      ),
    /must contain valid JSON/,
  );
} finally {
  rmSync(
    temporaryRoot,
    {
      recursive: true,
      force: true,
    },
  );
}

const schema = JSON.parse(schemaSource) as Record<string, unknown>;
const example = JSON.parse(exampleSource) as Record<string, unknown>;
assert.equal(
  example.marker,
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_EXAMPLE_V1",
);
assert.equal(example.version, 1);
assert.equal(
  example.source_base_commit,
  SOURCE_BASE_COMMIT,
);
assert.equal(
  (
    schema.properties as Record<
      string,
      Record<string, unknown>
    >
  ).marker.const,
  example.marker,
);

for (const required of [
  "Disabled by default",
  "single operator-owned JSON bundle",
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_ENABLED_ENV,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_APPLY_ENV,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_CONFIRMATION,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_GLOBAL,
  "src/index.ts",
]) {
  assert.ok(
    docs.includes(required),
    `documentation missing ${required}`,
  );
}

for (const required of [
  "src/index.ts",
  "src/http/public_agent_service_acceptance_persistence_trusted_context_provider_binding_v1.ts",
  "scripts/prove_public_agent_service_acceptance_persistence_trusted_context_provider_binding_v1.ts",
  "node_modules/.bin/tsc -p tsconfig.build.json --noEmit",
  "node_modules/.bin/tsx scripts/prove_public_agent_service_acceptance_persistence_trusted_context_provider_binding_v1.ts",
]) {
  assert.ok(
    workflow.includes(required),
    `workflow missing ${required}`,
  );
}

const proof = {
  marker:
    "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_V1_PROOF_GREEN",
  binding_marker:
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_MARKER,
  version:
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_VERSION,
  source_base_commit:
    SOURCE_BASE_COMMIT,
  source_index_recovery_exact:
    true,
  source_index_js_unchanged:
    true,
  source_index_import_exact:
    true,
  source_index_install_call_exact:
    true,
  provider_installed_before_route_callsite:
    true,
  disabled_before_path_validation:
    true,
  disabled_global_mutation:
    false,
  dry_run_global_mutation:
    false,
  dry_run_bundle_read:
    false,
  exact_apply_confirmation_required:
    true,
  provider_global_non_enumerable:
    true,
  provider_global_non_configurable:
    true,
  provider_global_non_writable:
    true,
  provider_global_replace:
    false,
  inherited_provider_global_replace:
    false,
  bundle_read_deferred_until_provider_invocation:
    true,
  bundle_path_absolute_normalized:
    true,
  bundle_symlink_rejected:
    true,
  bundle_group_other_write_rejected:
    true,
  bundle_top_level_keys_exact:
    true,
  bundle_marker_exact:
    true,
  bundle_json_required:
    true,
  provider_context_keys_exact:
    true,
  provider_context_deep_frozen:
    true,
  client_selected_bundle_path:
    false,
  network_listener_created:
    false,
  external_http_submission:
    false,
  production_acceptance_persistence_performed:
    false,
  production_replay_write_performed:
    false,
  payment_authorization:
    false,
  payment_execution:
    false,
  execution_authorization:
    false,
  work_dispatch:
    false,
  work_credit_write:
    false,
  wallet_access:
    false,
  production_signing:
    false,
  transaction_broadcast:
    false,
  unrelated_runtime_mutation:
    false,
  service_restart:
    false,
  deployment_performed:
    false,
  money_movement:
    false,
  proof:
    "green",
};

console.log(
  JSON.stringify(
    proof,
    null,
    2,
  ),
);
console.log(
  "acceptance_persistence_trusted_context_provider_binding_proof=green",
);
