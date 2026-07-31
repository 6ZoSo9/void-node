import assert from "node:assert/strict";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

import * as ts from "typescript";

import {
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_BUNDLE_BUILDER_CONFIRMATION,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_BUNDLE_BUILDER_MARKER,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_BUNDLE_BUILDER_RESULT_MARKER,
  buildPublicAgentServiceAcceptancePersistenceTrustedContextBundleV1,
  planPublicAgentServiceAcceptancePersistenceTrustedContextBundleV1,
  runPublicAgentServiceAcceptancePersistenceTrustedContextBundleBuilderCliV1,
  verifyPublicAgentServiceAcceptancePersistenceTrustedContextBundleV1,
  type PublicAgentServiceAcceptancePersistenceTrustedContextBundleBuilderInputV1,
  type PublicAgentServiceAcceptancePersistenceTrustedContextBundleBuilderResultV1,
} from "./public_agent_service_acceptance_persistence_trusted_context_bundle_builder_v1.js";
import {
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_BUNDLE_MARKER,
  readPublicAgentServiceAcceptancePersistenceTrustedContextBundleV1,
} from "../src/http/public_agent_service_acceptance_persistence_trusted_context_provider_binding_v1.js";

const SOURCE_BASE_COMMIT =
  "b119357c60f15a4c0150d99c5081f1e84b1ee39e";
const EXAMPLE_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_BUNDLE_BUILDER_EXAMPLE_V1";
const PROOF_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_BUNDLE_BUILDER_V1";

type JsonRecord = Record<string, unknown>;

function expectReject(
  label: string,
  action: () => unknown,
): void {
  let rejected = false;
  try {
    action();
  } catch {
    rejected = true;
  }
  assert.equal(
    rejected,
    true,
    `${label} was unexpectedly accepted`,
  );
}

function parseJsonFile(file: string): unknown {
  return JSON.parse(
    readFileSync(
      file,
      "utf8",
    ),
  ) as unknown;
}

function record(
  value: unknown,
  label: string,
): JsonRecord {
  assert.equal(
    typeof value,
    "object",
    `${label} must be an object`,
  );
  assert.notEqual(
    value,
    null,
    `${label} must not be null`,
  );
  assert.equal(
    Array.isArray(value),
    false,
    `${label} must not be an array`,
  );
  return value as JsonRecord;
}

function writePrivateJson(
  file: string,
  value: unknown,
): void {
  writeFileSync(
    file,
    `${JSON.stringify(value, null, 2)}\n`,
    {
      encoding: "utf8",
      mode: 0o600,
    },
  );
  chmodSync(file, 0o600);
}

function copyPrivateFile(
  source: string,
  target: string,
): void {
  writeFileSync(
    target,
    readFileSync(source),
    {
      mode: 0o600,
    },
  );
  chmodSync(target, 0o600);
}

function parseTypeScript(
  file: string,
): void {
  const parsed = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const diagnostics = (
    parsed as ts.SourceFile & {
      parseDiagnostics: readonly ts.Diagnostic[];
    }
  ).parseDiagnostics;
  assert.deepEqual(
    diagnostics,
    [],
    `${file} has TypeScript parse diagnostics`,
  );
}

function assertAuthority(
  result:
    PublicAgentServiceAcceptancePersistenceTrustedContextBundleBuilderResultV1,
  outputWrite: boolean,
): void {
  assert.deepEqual(
    result.authority,
    {
      input_artifact_read: true,
      output_bundle_write:
        outputWrite,
      existing_output_replace: false,
      network_listener_creation: false,
      external_http_submission: false,
      production_acceptance_persistence: false,
      production_replay_write: false,
      payment_authorization: false,
      payment_execution: false,
      execution_authorization: false,
      work_dispatch: false,
      work_credit_write: false,
      wallet_access: false,
      production_signing: false,
      transaction_broadcast: false,
      runtime_configuration_change: false,
      service_restart: false,
      deployment_performed: false,
      money_movement: false,
    },
  );
}

const root = process.cwd();
const builderPath = path.join(
  root,
  "scripts/public_agent_service_acceptance_persistence_trusted_context_bundle_builder_v1.ts",
);
const proofPath = path.join(
  root,
  "scripts/prove_public_agent_service_acceptance_persistence_trusted_context_bundle_builder_v1.ts",
);
const schemaPath = path.join(
  root,
  "schemas/public-agent-service-acceptance-persistence-trusted-context-bundle-builder-v1.schema.json",
);
const examplePath = path.join(
  root,
  "examples/public-agent-service-acceptance-persistence-trusted-context-bundle-builder-v1.example.json",
);
const docsPath = path.join(
  root,
  "docs/public-agent/public-agent-service-acceptance-persistence-trusted-context-bundle-builder-v1.md",
);
const workflowPath = path.join(
  root,
  ".github/workflows/public-agent-service-acceptance-persistence-trusted-context-bundle-builder-v1.yml",
);
const catalogSourcePath = path.join(
  root,
  "ops/public/agent-services-v1/catalog.json",
);
const workOrderSourcePath = path.join(
  root,
  "examples/agent-paid-work-order-envelope-v1.example.json",
);
const quoteSourcePath = path.join(
  root,
  "examples/agent-paid-work-quote-envelope-v1.example.json",
);

parseTypeScript(builderPath);
parseTypeScript(proofPath);

const builderSource = readFileSync(
  builderPath,
  "utf8",
);
for (const token of [
  "O_NOFOLLOW",
  "O_EXCL",
  "fchmodSync(descriptor, 0o600)",
  "fsyncSync(descriptor)",
  "linkSync(",
  "refusing to overwrite an existing output",
  "readPublicAgentServiceAcceptancePersistenceTrustedContextBundleV1",
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_BUNDLE_BUILDER_CONFIRMATION,
]) {
  assert.equal(
    builderSource.includes(token),
    true,
    `builder source is missing ${token}`,
  );
}
assert.equal(
  builderSource.includes("fetch("),
  false,
);
assert.equal(
  builderSource.includes("listen("),
  false,
);

const schema = record(
  parseJsonFile(schemaPath),
  "schema",
);
assert.equal(
  schema.$schema,
  "https://json-schema.org/draft/2020-12/schema",
);
assert.equal(
  schema.additionalProperties,
  false,
);
const schemaProperties = record(
  schema.properties,
  "schema properties",
);
assert.equal(
  record(
    schemaProperties.marker,
    "schema marker",
  ).const,
  EXAMPLE_MARKER,
);
assert.equal(
  record(
    schemaProperties.source_base_commit,
    "schema source base",
  ).const,
  SOURCE_BASE_COMMIT,
);

const example = record(
  parseJsonFile(examplePath),
  "example",
);
assert.deepEqual(
  Object.keys(example),
  [
    "marker",
    "version",
    "source_base_commit",
    "status",
    "cli",
    "bundle_contract",
    "validation",
    "authority",
  ],
);
assert.equal(
  example.marker,
  EXAMPLE_MARKER,
);
assert.equal(
  example.source_base_commit,
  SOURCE_BASE_COMMIT,
);
assert.equal(
  example.status,
  "source_only_no_bundle_created",
);
assert.equal(
  record(
    example.cli,
    "example CLI",
  ).build_confirmation,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_BUNDLE_BUILDER_CONFIRMATION,
);
assert.equal(
  record(
    example.bundle_contract,
    "example bundle contract",
  ).marker,
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_BUNDLE_MARKER,
);
for (const value of Object.values(
  record(
    example.authority,
    "example authority",
  ),
)) {
  assert.equal(value, false);
}

const docs = readFileSync(
  docsPath,
  "utf8",
);
for (const token of [
  "source-only operator CLI",
  "Plan validates",
  "Build performs",
  "Verify independently",
  PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_BUNDLE_BUILDER_CONFIRMATION,
  "Existing outputs are always refused.",
  "The lane does not create a production bundle",
  SOURCE_BASE_COMMIT,
]) {
  assert.equal(
    docs.includes(token),
    true,
    `documentation is missing ${token}`,
  );
}

const workflow = readFileSync(
  workflowPath,
  "utf8",
);
for (const token of [
  "npm ci",
  "tsconfig.nonindex.json",
  "tsconfig.build.json",
  "prove_public_agent_service_acceptance_persistence_trusted_context_bundle_builder_v1.ts",
  "prove_public_agent_service_acceptance_persistence_trusted_context_provider_binding_v1.ts",
  "prove_public_agent_service_acceptance_persistence_http_route_server_bootstrap_callsite_integration_v1.ts",
  "check_index_size.sh",
  "git diff --check",
]) {
  assert.equal(
    workflow.includes(token),
    true,
    `workflow is missing ${token}`,
  );
}

const temporaryRoot = mkdtempSync(
  path.join(
    os.tmpdir(),
    "void-trusted-context-bundle-builder-v1-",
  ),
);
chmodSync(temporaryRoot, 0o700);
let temporaryCleanup = false;

try {
  const catalogPath = path.join(
    temporaryRoot,
    "catalog.json",
  );
  const workOrderPath = path.join(
    temporaryRoot,
    "work-order.json",
  );
  const quotePath = path.join(
    temporaryRoot,
    "quote.json",
  );
  copyPrivateFile(
    catalogSourcePath,
    catalogPath,
  );
  copyPrivateFile(
    workOrderSourcePath,
    workOrderPath,
  );
  copyPrivateFile(
    quoteSourcePath,
    quotePath,
  );

  const outputPath = path.join(
    temporaryRoot,
    "trusted-context.json",
  );
  const input:
    PublicAgentServiceAcceptancePersistenceTrustedContextBundleBuilderInputV1 = {
      catalog_path:
        catalogPath,
      work_order_path:
        workOrderPath,
      quote_path:
        quotePath,
      output_path:
        outputPath,
    };

  const planned =
    planPublicAgentServiceAcceptancePersistenceTrustedContextBundleV1(
      input,
    );
  assert.equal(
    planned.marker,
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_BUNDLE_BUILDER_RESULT_MARKER,
  );
  assert.equal(planned.status, "planned");
  assert.equal(planned.output_exists, false);
  assert.equal(planned.output_mode_0600, false);
  assert.equal(planned.confirmation_verified, false);
  assert.match(planned.bundle_sha256, /^[0-9a-f]{64}$/);
  assert.match(
    planned.bundle_path_fingerprint_sha256,
    /^[0-9a-f]{64}$/,
  );
  assert.equal(
    JSON.stringify(planned).includes(outputPath),
    false,
  );
  assertAuthority(planned, false);

  const planStdout: string[] = [];
  const planStderr: string[] = [];
  assert.equal(
    runPublicAgentServiceAcceptancePersistenceTrustedContextBundleBuilderCliV1(
      [
        "plan",
        "--catalog",
        catalogPath,
        "--work-order",
        workOrderPath,
        "--quote",
        quotePath,
        "--output",
        path.join(
          temporaryRoot,
          "cli-plan.json",
        ),
      ],
      {
        stdout:
          (line) => planStdout.push(line),
        stderr:
          (line) => planStderr.push(line),
      },
    ),
    0,
  );
  assert.equal(planStderr.length, 0);
  assert.equal(
    planStdout.at(-1),
    "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_BUNDLE_PLANNED_V1",
  );

  expectReject(
    "missing exact build confirmation",
    () =>
      buildPublicAgentServiceAcceptancePersistenceTrustedContextBundleV1(
        input,
        "wrong-confirmation",
      ),
  );
  assert.equal(
    statSync(
      temporaryRoot,
    ).isDirectory(),
    true,
  );

  const built =
    buildPublicAgentServiceAcceptancePersistenceTrustedContextBundleV1(
      input,
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_BUNDLE_BUILDER_CONFIRMATION,
    );
  assert.equal(built.status, "built");
  assert.equal(built.confirmation_verified, true);
  assert.equal(built.output_exists, true);
  assert.equal(built.output_mode_0600, true);
  assert.equal(
    statSync(outputPath).mode & 0o777,
    0o600,
  );
  assert.equal(
    built.bundle_sha256,
    planned.bundle_sha256,
  );
  assert.equal(
    built.bundle_bytes,
    planned.bundle_bytes,
  );
  assertAuthority(built, true);

  const outputSource = readFileSync(
    outputPath,
    "utf8",
  );
  assert.equal(
    Buffer.byteLength(
      outputSource,
      "utf8",
    ),
    built.bundle_bytes,
  );
  const outputDocument = record(
    JSON.parse(outputSource) as unknown,
    "built bundle",
  );
  assert.deepEqual(
    Object.keys(outputDocument),
    [
      "catalog",
      "marker",
      "quote",
      "version",
      "work_order",
    ],
  );
  assert.equal(
    outputDocument.marker,
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_BUNDLE_MARKER,
  );
  const providerContext =
    readPublicAgentServiceAcceptancePersistenceTrustedContextBundleV1(
      outputPath,
    );
  assert.deepEqual(
    providerContext.catalog,
    outputDocument.catalog,
  );
  assert.deepEqual(
    providerContext.work_order,
    outputDocument.work_order,
  );
  assert.deepEqual(
    providerContext.quote,
    outputDocument.quote,
  );

  const verified =
    verifyPublicAgentServiceAcceptancePersistenceTrustedContextBundleV1(
      outputPath,
    );
  assert.equal(verified.status, "verified");
  assert.equal(verified.output_exists, true);
  assert.equal(verified.output_mode_0600, true);
  assert.equal(
    verified.bundle_sha256,
    built.bundle_sha256,
  );
  assertAuthority(verified, false);

  expectReject(
    "existing output replacement",
    () =>
      buildPublicAgentServiceAcceptancePersistenceTrustedContextBundleV1(
        input,
        PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_BUNDLE_BUILDER_CONFIRMATION,
      ),
  );

  const secondOutputPath = path.join(
    temporaryRoot,
    "trusted-context-second.json",
  );
  const secondBuilt =
    buildPublicAgentServiceAcceptancePersistenceTrustedContextBundleV1(
      {
        ...input,
        output_path:
          secondOutputPath,
      },
      PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_BUNDLE_BUILDER_CONFIRMATION,
    );
  assert.equal(
    readFileSync(
      secondOutputPath,
      "utf8",
    ),
    outputSource,
  );
  assert.equal(
    secondBuilt.bundle_sha256,
    built.bundle_sha256,
  );

  const cliOutputPath = path.join(
    temporaryRoot,
    "cli-built.json",
  );
  const buildStdout: string[] = [];
  const buildStderr: string[] = [];
  assert.equal(
    runPublicAgentServiceAcceptancePersistenceTrustedContextBundleBuilderCliV1(
      [
        "build",
        "--catalog",
        catalogPath,
        "--work-order",
        workOrderPath,
        "--quote",
        quotePath,
        "--output",
        cliOutputPath,
        "--confirmation",
        PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_BUNDLE_BUILDER_CONFIRMATION,
      ],
      {
        stdout:
          (line) => buildStdout.push(line),
        stderr:
          (line) => buildStderr.push(line),
      },
    ),
    0,
  );
  assert.equal(buildStderr.length, 0);
  assert.equal(
    buildStdout.at(-1),
    "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_BUNDLE_BUILT_V1",
  );

  const verifyStdout: string[] = [];
  const verifyStderr: string[] = [];
  assert.equal(
    runPublicAgentServiceAcceptancePersistenceTrustedContextBundleBuilderCliV1(
      [
        "verify",
        "--bundle",
        cliOutputPath,
      ],
      {
        stdout:
          (line) => verifyStdout.push(line),
        stderr:
          (line) => verifyStderr.push(line),
      },
    ),
    0,
  );
  assert.equal(verifyStderr.length, 0);
  assert.equal(
    verifyStdout.at(-1),
    "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_BUNDLE_VERIFIED_V1",
  );

  const badCliStdout: string[] = [];
  const badCliStderr: string[] = [];
  assert.equal(
    runPublicAgentServiceAcceptancePersistenceTrustedContextBundleBuilderCliV1(
      [
        "build",
        "--catalog",
        catalogPath,
        "--work-order",
        workOrderPath,
        "--quote",
        quotePath,
        "--output",
        path.join(
          temporaryRoot,
          "bad-cli.json",
        ),
        "--confirmation",
        "wrong",
      ],
      {
        stdout:
          (line) => badCliStdout.push(line),
        stderr:
          (line) => badCliStderr.push(line),
      },
    ),
    1,
  );
  assert.equal(badCliStdout.length, 0);
  assert.match(
    badCliStderr.join("\n"),
    /^HOLD: build requires exact confirmation$/,
  );

  const tamperedCatalogPath = path.join(
    temporaryRoot,
    "tampered-catalog.json",
  );
  const tamperedCatalog = structuredClone(
    parseJsonFile(catalogPath),
  ) as JsonRecord;
  tamperedCatalog.catalog_fingerprint_sha256 =
    "0".repeat(64);
  writePrivateJson(
    tamperedCatalogPath,
    tamperedCatalog,
  );
  expectReject(
    "tampered catalog fingerprint",
    () =>
      planPublicAgentServiceAcceptancePersistenceTrustedContextBundleV1(
        {
          ...input,
          catalog_path:
            tamperedCatalogPath,
          output_path:
            path.join(
              temporaryRoot,
              "tampered-catalog-output.json",
            ),
        },
      ),
  );

  const mismatchedQuotePath = path.join(
    temporaryRoot,
    "mismatched-quote.json",
  );
  const mismatchedQuote = structuredClone(
    parseJsonFile(quotePath),
  ) as JsonRecord;
  mismatchedQuote.work_order_id =
    `voidawo1_${"0".repeat(64)}`;
  writePrivateJson(
    mismatchedQuotePath,
    mismatchedQuote,
  );
  expectReject(
    "quote not bound to the work order",
    () =>
      planPublicAgentServiceAcceptancePersistenceTrustedContextBundleV1(
        {
          ...input,
          quote_path:
            mismatchedQuotePath,
          output_path:
            path.join(
              temporaryRoot,
              "mismatched-quote-output.json",
            ),
        },
      ),
  );

  const workOrderSymlinkPath = path.join(
    temporaryRoot,
    "work-order-symlink.json",
  );
  symlinkSync(
    workOrderPath,
    workOrderSymlinkPath,
  );
  expectReject(
    "symlink input",
    () =>
      planPublicAgentServiceAcceptancePersistenceTrustedContextBundleV1(
        {
          ...input,
          work_order_path:
            workOrderSymlinkPath,
          output_path:
            path.join(
              temporaryRoot,
              "symlink-output.json",
            ),
        },
      ),
  );

  chmodSync(workOrderPath, 0o660);
  expectReject(
    "group-writable input",
    () =>
      planPublicAgentServiceAcceptancePersistenceTrustedContextBundleV1(
        {
          ...input,
          output_path:
            path.join(
              temporaryRoot,
              "unsafe-input-output.json",
            ),
        },
      ),
  );
  chmodSync(workOrderPath, 0o600);

  const unsafeParent = path.join(
    temporaryRoot,
    "unsafe-parent",
  );
  mkdirSync(
    unsafeParent,
    {
      mode: 0o700,
    },
  );
  chmodSync(unsafeParent, 0o770);
  expectReject(
    "group-writable output parent",
    () =>
      planPublicAgentServiceAcceptancePersistenceTrustedContextBundleV1(
        {
          ...input,
          output_path:
            path.join(
              unsafeParent,
              "bundle.json",
            ),
        },
      ),
  );

  const nonCanonicalPath = path.join(
    temporaryRoot,
    "noncanonical.json",
  );
  writeFileSync(
    nonCanonicalPath,
    `${JSON.stringify(outputDocument)}\n`,
    {
      encoding: "utf8",
      mode: 0o600,
    },
  );
  chmodSync(nonCanonicalPath, 0o600);
  expectReject(
    "noncanonical bundle encoding",
    () =>
      verifyPublicAgentServiceAcceptancePersistenceTrustedContextBundleV1(
        nonCanonicalPath,
      ),
  );

  chmodSync(secondOutputPath, 0o640);
  expectReject(
    "bundle mode other than 0600",
    () =>
      verifyPublicAgentServiceAcceptancePersistenceTrustedContextBundleV1(
        secondOutputPath,
      ),
  );
  chmodSync(secondOutputPath, 0o600);

  assert.equal(
    PROOF_MARKER,
    PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_BUNDLE_BUILDER_MARKER,
  );
} finally {
  rmSync(
    temporaryRoot,
    {
      recursive: true,
      force: true,
    },
  );
  temporaryCleanup = true;
}

assert.equal(
  temporaryCleanup,
  true,
);

console.log(
  JSON.stringify(
    {
      marker:
        PROOF_MARKER,
      source_base_commit:
        SOURCE_BASE_COMMIT,
      proof_count:
        18,
      deterministic_bundle_bytes:
        true,
      atomic_no_overwrite_write:
        true,
      exact_mode_0600:
        true,
      provider_reader_compatible:
        true,
      trusted_path_guards:
        true,
      adversarial_input_rejection:
        true,
      temporary_artifacts_removed:
        temporaryCleanup,
      production_bundle_created:
        false,
      runtime_activation:
        false,
      acceptance_persistence:
        false,
      replay_write:
        false,
      payment_execution:
        false,
      wallet_access:
        false,
      service_restart:
        false,
      deployment:
        false,
    },
    null,
    2,
  ),
);
console.log(
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_BUNDLE_BUILDER_V1_PROOF_EXACT_GREEN",
);
