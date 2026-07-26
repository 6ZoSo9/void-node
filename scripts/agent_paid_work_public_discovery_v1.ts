import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  statSync,
} from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const AGENT_PAID_WORK_PUBLIC_DISCOVERY_MARKER =
  "VOID_AGENT_PAID_WORK_PUBLIC_DISCOVERY_V1" as const;
export const AGENT_PAID_WORK_PUBLIC_DISCOVERY_ID_PREFIX =
  "voidawpd1_" as const;
export const AGENT_PAID_WORK_PUBLIC_DISCOVERY_SOURCE_COMMIT =
  "46a90fa254f84fd1e6301983112b8286ed68c533" as const;

type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

const STAGES = [
  ["work_order", "agent-paid-work-order-envelope-v1"],
  ["quote", "agent-paid-work-quote-envelope-v1"],
  ["acceptance", "agent-paid-work-acceptance-envelope-v1"],
  ["payment_intent", "agent-paid-work-payment-intent-envelope-v1"],
  [
    "payment_execution_authorization",
    "agent-paid-work-payment-execution-authorization-envelope-v1",
  ],
  ["payment_receipt", "agent-paid-work-payment-receipt-envelope-v1"],
  [
    "independent_payment_confirmation",
    "agent-paid-work-independent-payment-confirmation-envelope-v1",
  ],
  [
    "work_execution_authorization",
    "agent-paid-work-execution-authorization-envelope-v1",
  ],
  [
    "work_completion_receipt",
    "agent-paid-work-completion-receipt-envelope-v1",
  ],
  [
    "independent_completion_verification",
    "agent-paid-work-independent-completion-verification-envelope-v1",
  ],
  [
    "wc_award_authorization",
    "agent-paid-work-wc-award-authorization-envelope-v1",
  ],
  [
    "wc_ledger_write_receipt",
    "agent-paid-work-wc-ledger-write-receipt-envelope-v1",
  ],
] as const;

const ARTIFACT_ROLES = [
  "documentation",
  "example",
  "schema",
  "validator",
  "proof",
] as const;

const EXPECTED_CAPABILITIES = {
  protocol_discovery: "available",
  artifact_integrity_verification: "available",
  schema_inspection: "available",
  offline_validation: "available",
  offline_focused_proofs: "available",
  live_work_order_submission: "unavailable",
  live_quote_exchange: "unavailable",
  live_payment_execution: "unavailable",
  live_work_dispatch: "unavailable",
  live_completion_verification_service: "unavailable",
  live_wc_award_authorization: "unavailable",
  live_wc_ledger_write: "unavailable",
  wc_to_void_settlement: "unavailable",
  buy_void_auto_fulfillment: "unavailable",
} as const;

const EXPECTED_OPERATIONAL_STATUS = {
  contract_chain_complete_through_wc_ledger_receipt: true,
  repository_artifacts_available: true,
  external_agent_runtime_onboarding_available: false,
  external_agent_paid_work_execution_available: false,
  payment_execution_enabled: false,
  real_wc_ledger_write_enabled: false,
  real_wc_balance_mutation_enabled: false,
  wc_to_void_settlement_enabled: false,
  buy_void_auto_fulfillment_enabled: false,
} as const;

const EXPECTED_SAFETY_BOUNDARY = {
  manifest_grants_execution_authority: false,
  manifest_grants_payment_authority: false,
  manifest_grants_wallet_or_signer_access: false,
  manifest_grants_runtime_administration: false,
  manifest_grants_wc_ledger_write_authority: false,
  manifest_grants_wc_to_void_settlement_authority: false,
  manifest_grants_buy_void_fulfillment_authority: false,
  contains_private_keys_or_credentials: false,
  contains_live_payment_instructions: false,
} as const;

const EXPECTED_NEXT_ACTIVATION_REQUIREMENTS = [
  "read_only_runtime_discovery_route",
  "external_agent_authentication",
  "capability_negotiation",
  "bounded_paid_work_submission",
  "bounded_live_execution_policy",
  "independent_live_verification",
  "atomic_live_wc_ledger_adapter",
  "immutable_live_receipt_publication",
] as const;

export interface AgentPaidWorkPublicDiscoveryArtifact {
  path: string;
  bytes: number;
  sha256: string;
}

export interface AgentPaidWorkPublicDiscoveryStage {
  index: number;
  stage_id: string;
  protocol_marker: string;
  artifacts: {
    documentation: AgentPaidWorkPublicDiscoveryArtifact;
    example: AgentPaidWorkPublicDiscoveryArtifact;
    schema: AgentPaidWorkPublicDiscoveryArtifact;
    validator: AgentPaidWorkPublicDiscoveryArtifact;
    proof: AgentPaidWorkPublicDiscoveryArtifact;
  };
}

export interface AgentPaidWorkPublicDiscoveryDraft {
  marker: typeof AGENT_PAID_WORK_PUBLIC_DISCOVERY_MARKER;
  version: 1;
  protocol_id: "void.agent-paid-work.v1";
  title: "VOID Agent Paid Work Protocol V1";
  repository: {
    owner: "6ZoSo9";
    name: "void-node";
    canonical_branch: "main";
    source_commit: typeof AGENT_PAID_WORK_PUBLIC_DISCOVERY_SOURCE_COMMIT;
  };
  discovery_surface: {
    kind: "repository_manifest";
    path: "docs/public/agent-paid-work-public-discovery-v1.json";
    content_type: "application/json";
    read_only: true;
    runtime_route_available: false;
    public_http_route: null;
  };
  lifecycle: {
    stage_count: 12;
    artifact_count: 60;
    ordered_stages: AgentPaidWorkPublicDiscoveryStage[];
  };
  capabilities: typeof EXPECTED_CAPABILITIES;
  operational_status: typeof EXPECTED_OPERATIONAL_STATUS;
  safety_boundary: typeof EXPECTED_SAFETY_BOUNDARY;
  next_activation_requirements: string[];
}

export interface AgentPaidWorkPublicDiscoveryManifest
  extends AgentPaidWorkPublicDiscoveryDraft {
  public_discovery_manifest_id: string;
}

const ROOT_KEYS = [
  "marker",
  "version",
  "protocol_id",
  "title",
  "repository",
  "discovery_surface",
  "lifecycle",
  "capabilities",
  "operational_status",
  "safety_boundary",
  "next_activation_requirements",
] as const;

function fail(message: string): never {
  throw new Error(message);
}

function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    fail(message);
  }
}

function requireRecord(
  value: unknown,
  label: string,
): Record<string, unknown> {
  assertCondition(
    typeof value === "object" &&
      value !== null &&
      !Array.isArray(value),
    `${label} must be an object`,
  );
  return value as Record<string, unknown>;
}

function requireExactKeys(
  value: Record<string, unknown>,
  label: string,
  expectedKeys: readonly string[],
): void {
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  assertCondition(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${label} keys must be exactly: ${expected.join(", ")}`,
  );
}

function requireString(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
  pattern?: RegExp,
): string {
  assertCondition(typeof value === "string", `${label} must be a string`);
  assertCondition(
    value === value.trim(),
    `${label} must not have surrounding whitespace`,
  );
  assertCondition(
    value.length >= minimum && value.length <= maximum,
    `${label} length must be ${minimum}..${maximum}`,
  );
  if (pattern) {
    assertCondition(pattern.test(value), `${label} has invalid format`);
  }
  return value;
}

function requireSafeInteger(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
): number {
  assertCondition(
    typeof value === "number" && Number.isSafeInteger(value),
    `${label} must be a safe integer`,
  );
  assertCondition(
    value >= minimum && value <= maximum,
    `${label} must be ${minimum}..${maximum}`,
  );
  return value;
}

function requireLiteral(
  value: unknown,
  expected: unknown,
  label: string,
): void {
  assertCondition(
    value === expected,
    `${label} must be ${JSON.stringify(expected)}`,
  );
}

function canonicalize(value: unknown): JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "number") {
    assertCondition(
      Number.isFinite(value) && Number.isSafeInteger(value),
      "canonical JSON numbers must be finite safe integers",
    );
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  const source = requireRecord(value, "canonical JSON value");
  const result: { [key: string]: JsonValue } = {};
  for (const key of Object.keys(source).sort()) {
    const child = source[key];
    assertCondition(
      child !== undefined,
      "canonical JSON rejects undefined",
    );
    result[key] = canonicalize(child);
  }
  return result;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function expectedArtifactPath(
  slug: string,
  role: typeof ARTIFACT_ROLES[number],
): string {
  const underscore = slug.replaceAll("-", "_");
  switch (role) {
    case "documentation":
      return `docs/public/${slug}.md`;
    case "example":
      return `examples/${slug}.example.json`;
    case "schema":
      return `schemas/${slug}.schema.json`;
    case "validator":
      return `scripts/${underscore}.ts`;
    case "proof":
      return `scripts/prove_${underscore}.ts`;
  }
}

function validateArtifact(
  value: unknown,
  expectedPath: string,
  label: string,
): AgentPaidWorkPublicDiscoveryArtifact {
  const record = requireRecord(value, label);
  requireExactKeys(record, label, ["path", "bytes", "sha256"]);

  const path = requireString(
    record.path,
    `${label}.path`,
    1,
    512,
  );
  assertCondition(
    path === expectedPath,
    `${label}.path must be ${expectedPath}`,
  );
  const bytes = requireSafeInteger(
    record.bytes,
    `${label}.bytes`,
    1,
    Number.MAX_SAFE_INTEGER,
  );
  const sha256 = requireString(
    record.sha256,
    `${label}.sha256`,
    64,
    64,
    /^[0-9a-f]{64}$/,
  );

  return { path, bytes, sha256 };
}

function validateExactMap(
  value: unknown,
  expected: Record<string, string | boolean>,
  label: string,
): Record<string, string | boolean> {
  const record = requireRecord(value, label);
  requireExactKeys(record, label, Object.keys(expected));
  for (const [key, expectedValue] of Object.entries(expected)) {
    requireLiteral(record[key], expectedValue, `${label}.${key}`);
  }
  return { ...expected };
}

function validateDraftShape(
  value: unknown,
  allowId: boolean,
): AgentPaidWorkPublicDiscoveryDraft {
  const root = requireRecord(value, "public discovery manifest");
  requireExactKeys(
    root,
    "public discovery manifest",
    [
      ...ROOT_KEYS,
      ...(allowId ? ["public_discovery_manifest_id"] : []),
    ],
  );

  requireLiteral(
    root.marker,
    AGENT_PAID_WORK_PUBLIC_DISCOVERY_MARKER,
    "marker",
  );
  requireLiteral(root.version, 1, "version");
  requireLiteral(
    root.protocol_id,
    "void.agent-paid-work.v1",
    "protocol_id",
  );
  requireLiteral(
    root.title,
    "VOID Agent Paid Work Protocol V1",
    "title",
  );

  const repository = requireRecord(root.repository, "repository");
  requireExactKeys(repository, "repository", [
    "owner",
    "name",
    "canonical_branch",
    "source_commit",
  ]);
  requireLiteral(repository.owner, "6ZoSo9", "repository.owner");
  requireLiteral(repository.name, "void-node", "repository.name");
  requireLiteral(
    repository.canonical_branch,
    "main",
    "repository.canonical_branch",
  );
  requireLiteral(
    repository.source_commit,
    AGENT_PAID_WORK_PUBLIC_DISCOVERY_SOURCE_COMMIT,
    "repository.source_commit",
  );

  const discoverySurface = requireRecord(
    root.discovery_surface,
    "discovery_surface",
  );
  requireExactKeys(discoverySurface, "discovery_surface", [
    "kind",
    "path",
    "content_type",
    "read_only",
    "runtime_route_available",
    "public_http_route",
  ]);
  requireLiteral(
    discoverySurface.kind,
    "repository_manifest",
    "discovery_surface.kind",
  );
  requireLiteral(
    discoverySurface.path,
    "docs/public/agent-paid-work-public-discovery-v1.json",
    "discovery_surface.path",
  );
  requireLiteral(
    discoverySurface.content_type,
    "application/json",
    "discovery_surface.content_type",
  );
  requireLiteral(
    discoverySurface.read_only,
    true,
    "discovery_surface.read_only",
  );
  requireLiteral(
    discoverySurface.runtime_route_available,
    false,
    "discovery_surface.runtime_route_available",
  );
  requireLiteral(
    discoverySurface.public_http_route,
    null,
    "discovery_surface.public_http_route",
  );

  const lifecycle = requireRecord(root.lifecycle, "lifecycle");
  requireExactKeys(lifecycle, "lifecycle", [
    "stage_count",
    "artifact_count",
    "ordered_stages",
  ]);
  requireLiteral(lifecycle.stage_count, 12, "lifecycle.stage_count");
  requireLiteral(
    lifecycle.artifact_count,
    60,
    "lifecycle.artifact_count",
  );
  assertCondition(
    Array.isArray(lifecycle.ordered_stages),
    "lifecycle.ordered_stages must be an array",
  );
  assertCondition(
    lifecycle.ordered_stages.length === STAGES.length,
    `lifecycle.ordered_stages must contain ${STAGES.length} stages`,
  );

  const orderedStages: AgentPaidWorkPublicDiscoveryStage[] = [];
  const seenPaths = new Set<string>();
  const seenMarkers = new Set<string>();

  for (let offset = 0; offset < STAGES.length; offset += 1) {
    const expectedIndex = offset + 1;
    const [expectedStageId, slug] = STAGES[offset];
    const stage = requireRecord(
      lifecycle.ordered_stages[offset],
      `lifecycle.ordered_stages[${offset}]`,
    );
    requireExactKeys(
      stage,
      `lifecycle.ordered_stages[${offset}]`,
      ["index", "stage_id", "protocol_marker", "artifacts"],
    );
    requireLiteral(
      stage.index,
      expectedIndex,
      `stage ${expectedIndex}.index`,
    );
    requireLiteral(
      stage.stage_id,
      expectedStageId,
      `stage ${expectedIndex}.stage_id`,
    );
    const protocolMarker = requireString(
      stage.protocol_marker,
      `stage ${expectedIndex}.protocol_marker`,
      8,
      256,
      /^VOID_AGENT_PAID_WORK_[A-Z0-9_]+_V1$/,
    );
    assertCondition(
      !seenMarkers.has(protocolMarker),
      `duplicate protocol marker: ${protocolMarker}`,
    );
    seenMarkers.add(protocolMarker);

    const artifacts = requireRecord(
      stage.artifacts,
      `stage ${expectedIndex}.artifacts`,
    );
    requireExactKeys(
      artifacts,
      `stage ${expectedIndex}.artifacts`,
      ARTIFACT_ROLES,
    );

    const validatedArtifacts = {
      documentation: validateArtifact(
        artifacts.documentation,
        expectedArtifactPath(slug, "documentation"),
        `stage ${expectedIndex}.artifacts.documentation`,
      ),
      example: validateArtifact(
        artifacts.example,
        expectedArtifactPath(slug, "example"),
        `stage ${expectedIndex}.artifacts.example`,
      ),
      schema: validateArtifact(
        artifacts.schema,
        expectedArtifactPath(slug, "schema"),
        `stage ${expectedIndex}.artifacts.schema`,
      ),
      validator: validateArtifact(
        artifacts.validator,
        expectedArtifactPath(slug, "validator"),
        `stage ${expectedIndex}.artifacts.validator`,
      ),
      proof: validateArtifact(
        artifacts.proof,
        expectedArtifactPath(slug, "proof"),
        `stage ${expectedIndex}.artifacts.proof`,
      ),
    };

    for (const artifact of Object.values(validatedArtifacts)) {
      assertCondition(
        !seenPaths.has(artifact.path),
        `duplicate artifact path: ${artifact.path}`,
      );
      seenPaths.add(artifact.path);
    }

    orderedStages.push({
      index: expectedIndex,
      stage_id: expectedStageId,
      protocol_marker: protocolMarker,
      artifacts: validatedArtifacts,
    });
  }

  assertCondition(
    seenPaths.size === 60,
    "lifecycle must contain 60 unique artifact paths",
  );

  const capabilities = validateExactMap(
    root.capabilities,
    EXPECTED_CAPABILITIES,
    "capabilities",
  ) as typeof EXPECTED_CAPABILITIES;
  const operationalStatus = validateExactMap(
    root.operational_status,
    EXPECTED_OPERATIONAL_STATUS,
    "operational_status",
  ) as typeof EXPECTED_OPERATIONAL_STATUS;
  const safetyBoundary = validateExactMap(
    root.safety_boundary,
    EXPECTED_SAFETY_BOUNDARY,
    "safety_boundary",
  ) as typeof EXPECTED_SAFETY_BOUNDARY;

  assertCondition(
    Array.isArray(root.next_activation_requirements),
    "next_activation_requirements must be an array",
  );
  assertCondition(
    root.next_activation_requirements.length ===
      EXPECTED_NEXT_ACTIVATION_REQUIREMENTS.length,
    "next_activation_requirements length mismatch",
  );
  const nextActivationRequirements: string[] = [];
  for (
    let offset = 0;
    offset < EXPECTED_NEXT_ACTIVATION_REQUIREMENTS.length;
    offset += 1
  ) {
    const expected = EXPECTED_NEXT_ACTIVATION_REQUIREMENTS[offset];
    requireLiteral(
      root.next_activation_requirements[offset],
      expected,
      `next_activation_requirements[${offset}]`,
    );
    nextActivationRequirements.push(expected);
  }

  return {
    marker: AGENT_PAID_WORK_PUBLIC_DISCOVERY_MARKER,
    version: 1,
    protocol_id: "void.agent-paid-work.v1",
    title: "VOID Agent Paid Work Protocol V1",
    repository: {
      owner: "6ZoSo9",
      name: "void-node",
      canonical_branch: "main",
      source_commit: AGENT_PAID_WORK_PUBLIC_DISCOVERY_SOURCE_COMMIT,
    },
    discovery_surface: {
      kind: "repository_manifest",
      path: "docs/public/agent-paid-work-public-discovery-v1.json",
      content_type: "application/json",
      read_only: true,
      runtime_route_available: false,
      public_http_route: null,
    },
    lifecycle: {
      stage_count: 12,
      artifact_count: 60,
      ordered_stages: orderedStages,
    },
    capabilities,
    operational_status: operationalStatus,
    safety_boundary: safetyBoundary,
    next_activation_requirements: nextActivationRequirements,
  };
}

export function computeAgentPaidWorkPublicDiscoveryManifestId(
  draft: AgentPaidWorkPublicDiscoveryDraft,
): string {
  const digest = createHash("sha256")
    .update(canonicalJson(draft))
    .digest("hex");
  return `${AGENT_PAID_WORK_PUBLIC_DISCOVERY_ID_PREFIX}${digest}`;
}

export function validateAgentPaidWorkPublicDiscoveryDraft(
  value: unknown,
): asserts value is AgentPaidWorkPublicDiscoveryDraft {
  validateDraftShape(value, false);
}

export function validateAgentPaidWorkPublicDiscoveryManifest(
  value: unknown,
): asserts value is AgentPaidWorkPublicDiscoveryManifest {
  const root = requireRecord(value, "public discovery manifest");
  const draft = validateDraftShape(value, true);
  const manifestId = requireString(
    root.public_discovery_manifest_id,
    "public_discovery_manifest_id",
    74,
    74,
    /^voidawpd1_[0-9a-f]{64}$/,
  );
  assertCondition(
    manifestId ===
      computeAgentPaidWorkPublicDiscoveryManifestId(draft),
    "public_discovery_manifest_id does not match canonical payload",
  );
}

export interface AgentPaidWorkPublicDiscoveryVerificationSummary {
  stage_count: number;
  artifact_count: number;
  verified_file_count: number;
  verified_example_marker_count: number;
}

export function verifyAgentPaidWorkPublicDiscoveryArtifacts(
  manifest: AgentPaidWorkPublicDiscoveryManifest,
  repositoryRoot: string,
): AgentPaidWorkPublicDiscoveryVerificationSummary {
  const root = resolve(repositoryRoot);
  let verifiedFileCount = 0;
  let verifiedExampleMarkerCount = 0;

  for (const stage of manifest.lifecycle.ordered_stages) {
    for (const role of ARTIFACT_ROLES) {
      const artifact = stage.artifacts[role];
      const absolute = resolve(root, artifact.path);
      assertCondition(
        absolute === resolve(root, artifact.path),
        `artifact path resolution failed: ${artifact.path}`,
      );
      assertCondition(
        existsSync(absolute),
        `artifact is missing: ${artifact.path}`,
      );
      const stat = statSync(absolute);
      assertCondition(
        stat.isFile(),
        `artifact is not a file: ${artifact.path}`,
      );
      const bytes = readFileSync(absolute);
      assertCondition(
        bytes.length === artifact.bytes,
        `artifact byte count mismatch: ${artifact.path}`,
      );
      const digest = createHash("sha256").update(bytes).digest("hex");
      assertCondition(
        digest === artifact.sha256,
        `artifact SHA-256 mismatch: ${artifact.path}`,
      );
      verifiedFileCount += 1;

      if (role === "example") {
        const parsed = JSON.parse(bytes.toString("utf8")) as unknown;
        const example = requireRecord(
          parsed,
          `example ${artifact.path}`,
        );
        requireLiteral(
          example.marker,
          stage.protocol_marker,
          `example ${artifact.path}.marker`,
        );
        verifiedExampleMarkerCount += 1;
      }
    }
  }

  assertCondition(
    verifiedFileCount === 60,
    "artifact verification did not cover 60 files",
  );
  assertCondition(
    verifiedExampleMarkerCount === 12,
    "example-marker verification did not cover 12 stages",
  );

  return {
    stage_count: manifest.lifecycle.stage_count,
    artifact_count: manifest.lifecycle.artifact_count,
    verified_file_count: verifiedFileCount,
    verified_example_marker_count: verifiedExampleMarkerCount,
  };
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}

function usage(): never {
  return fail([
    "usage:",
    "  tsx scripts/agent_paid_work_public_discovery_v1.ts verify <manifest.json> [repository-root]",
  ].join("\n"));
}

function main(): void {
  const [mode, manifestPath, repositoryRoot, ...extra] =
    process.argv.slice(2);

  assertCondition(extra.length === 0, "unexpected extra arguments");
  assertCondition(Boolean(manifestPath), "manifest path is required");

  if (mode !== "verify") {
    usage();
  }

  const manifest = readJson(resolve(manifestPath));
  validateAgentPaidWorkPublicDiscoveryManifest(manifest);

  console.log(`marker=${manifest.marker}`);
  console.log(
    `public_discovery_manifest_id=${manifest.public_discovery_manifest_id}`,
  );
  console.log(`stage_count=${manifest.lifecycle.stage_count}`);
  console.log(`artifact_count=${manifest.lifecycle.artifact_count}`);
  console.log(
    `runtime_route_available=${
      manifest.discovery_surface.runtime_route_available
    }`,
  );
  console.log(
    `live_payment_execution=${
      manifest.capabilities.live_payment_execution
    }`,
  );
  console.log(
    `live_wc_ledger_write=${
      manifest.capabilities.live_wc_ledger_write
    }`,
  );
  console.log(
    `wc_to_void_settlement=${
      manifest.capabilities.wc_to_void_settlement
    }`,
  );

  if (repositoryRoot !== undefined) {
    const summary = verifyAgentPaidWorkPublicDiscoveryArtifacts(
      manifest,
      repositoryRoot,
    );
    console.log(
      `verified_file_count=${summary.verified_file_count}`,
    );
    console.log(
      `verified_example_marker_count=${
        summary.verified_example_marker_count
      }`,
    );
  }

  console.log(
    "VOID_AGENT_PAID_WORK_PUBLIC_DISCOVERY_V1_VALID",
  );
}

const invokedUrl = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";

if (invokedUrl === import.meta.url) {
  try {
    main();
  } catch (error) {
    console.error(
      `HOLD: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  }
}
