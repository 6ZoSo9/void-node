import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  AGENT_PAID_WORK_PUBLIC_DISCOVERY_MARKER,
  AGENT_PAID_WORK_PUBLIC_DISCOVERY_SOURCE_COMMIT,
  canonicalJson,
  computeAgentPaidWorkPublicDiscoveryManifestId,
  validateAgentPaidWorkPublicDiscoveryDraft,
  validateAgentPaidWorkPublicDiscoveryManifest,
  verifyAgentPaidWorkPublicDiscoveryArtifacts,
  type AgentPaidWorkPublicDiscoveryDraft,
  type AgentPaidWorkPublicDiscoveryManifest,
} from "./agent_paid_work_public_discovery_v1.js";

function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function expectReject(label: string, action: () => void): void {
  let rejected = false;
  try {
    action();
  } catch {
    rejected = true;
  }
  assertCondition(rejected, `${label} was unexpectedly accepted`);
}

function readText(path: string): string {
  return readFileSync(resolve(path), "utf8");
}

function readJson(path: string): unknown {
  return JSON.parse(readText(path)) as unknown;
}

function reverseObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(reverseObjectKeys);
  }
  if (typeof value !== "object" || value === null) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .reverse()
      .map(([key, child]) => [key, reverseObjectKeys(child)]),
  );
}

function recommitManifest(
  candidate: AgentPaidWorkPublicDiscoveryManifest,
): AgentPaidWorkPublicDiscoveryManifest {
  const {
    public_discovery_manifest_id: _ignored,
    ...candidateDraft
  } = candidate;
  return {
    ...candidateDraft,
    public_discovery_manifest_id:
      computeAgentPaidWorkPublicDiscoveryManifestId(candidateDraft),
  };
}

const manifestValue = readJson(
  "docs/public/agent-paid-work-public-discovery-v1.json",
);

validateAgentPaidWorkPublicDiscoveryManifest(manifestValue);

const manifest =
  manifestValue as AgentPaidWorkPublicDiscoveryManifest;

const {
  public_discovery_manifest_id: committedManifestId,
  ...draftValue
} = manifest;

validateAgentPaidWorkPublicDiscoveryDraft(draftValue);

const draft = draftValue as AgentPaidWorkPublicDiscoveryDraft;

assertCondition(
  committedManifestId ===
    computeAgentPaidWorkPublicDiscoveryManifestId(draft),
  "committed discovery manifest ID is not reproducible",
);

const reordered = reverseObjectKeys(draft);
validateAgentPaidWorkPublicDiscoveryDraft(reordered);
assertCondition(
  computeAgentPaidWorkPublicDiscoveryManifestId(
    reordered as AgentPaidWorkPublicDiscoveryDraft,
  ) === committedManifestId,
  "canonical discovery identity changed when object key order changed",
);
assertCondition(
  canonicalJson(reordered) === canonicalJson(draft),
  "canonical discovery JSON changed when object key order changed",
);

const summary = verifyAgentPaidWorkPublicDiscoveryArtifacts(
  manifest,
  ".",
);

assertCondition(summary.stage_count === 12, "stage count is not 12");
assertCondition(summary.artifact_count === 60, "artifact count is not 60");
assertCondition(
  summary.verified_file_count === 60,
  "artifact verification did not cover 60 files",
);
assertCondition(
  summary.verified_example_marker_count === 12,
  "example marker verification did not cover 12 files",
);

assertCondition(
  manifest.repository.source_commit ===
    AGENT_PAID_WORK_PUBLIC_DISCOVERY_SOURCE_COMMIT,
  "source commit binding mismatch",
);
assertCondition(
  manifest.discovery_surface.kind === "repository_manifest",
  "discovery kind mismatch",
);
assertCondition(
  manifest.discovery_surface.read_only === true,
  "discovery surface is not read-only",
);
assertCondition(
  manifest.discovery_surface.runtime_route_available === false,
  "runtime route is falsely available",
);
assertCondition(
  manifest.discovery_surface.public_http_route === null,
  "public HTTP route must remain null",
);

const stageIds = manifest.lifecycle.ordered_stages.map(
  (stage) => stage.stage_id,
);
const stageMarkers = manifest.lifecycle.ordered_stages.map(
  (stage) => stage.protocol_marker,
);
const artifactPaths = manifest.lifecycle.ordered_stages.flatMap(
  (stage) => Object.values(stage.artifacts).map(
    (artifact) => artifact.path,
  ),
);

assertCondition(
  new Set(stageIds).size === 12,
  "stage IDs are not unique",
);
assertCondition(
  new Set(stageMarkers).size === 12,
  "protocol markers are not unique",
);
assertCondition(
  new Set(artifactPaths).size === 60,
  "artifact paths are not unique",
);

const badId = structuredClone(manifest);
badId.public_discovery_manifest_id =
  `voidawpd1_${"0".repeat(64)}`;
expectReject("tampered public discovery manifest ID", () =>
  validateAgentPaidWorkPublicDiscoveryManifest(badId),
);

function rejectManifest(label: string, candidate: unknown): void {
  expectReject(label, () =>
    validateAgentPaidWorkPublicDiscoveryManifest(candidate),
  );
}

for (const [label, mutate] of [
  [
    "repository owner",
    (candidate: AgentPaidWorkPublicDiscoveryManifest) => {
      (
        candidate.repository as unknown as Record<string, unknown>
      ).owner = "other";
    },
  ],
  [
    "repository name",
    (candidate: AgentPaidWorkPublicDiscoveryManifest) => {
      (
        candidate.repository as unknown as Record<string, unknown>
      ).name = "other";
    },
  ],
  [
    "canonical branch",
    (candidate: AgentPaidWorkPublicDiscoveryManifest) => {
      (
        candidate.repository as unknown as Record<string, unknown>
      ).canonical_branch = "dev";
    },
  ],
  [
    "source commit",
    (candidate: AgentPaidWorkPublicDiscoveryManifest) => {
      (
        candidate.repository as unknown as Record<string, unknown>
      ).source_commit = "0".repeat(40);
    },
  ],
  [
    "runtime route availability",
    (candidate: AgentPaidWorkPublicDiscoveryManifest) => {
      (
        candidate.discovery_surface as unknown as Record<string, unknown>
      ).runtime_route_available = true;
    },
  ],
  [
    "public HTTP route",
    (candidate: AgentPaidWorkPublicDiscoveryManifest) => {
      (
        candidate.discovery_surface as unknown as Record<string, unknown>
      ).public_http_route = "/agent-paid-work";
    },
  ],
  [
    "read-only boundary",
    (candidate: AgentPaidWorkPublicDiscoveryManifest) => {
      (
        candidate.discovery_surface as unknown as Record<string, unknown>
      ).read_only = false;
    },
  ],
] as const) {
  const candidate = structuredClone(manifest);
  mutate(candidate);
  rejectManifest(label, candidate);
}

for (const key of [
  "live_work_order_submission",
  "live_quote_exchange",
  "live_payment_execution",
  "live_work_dispatch",
  "live_completion_verification_service",
  "live_wc_award_authorization",
  "live_wc_ledger_write",
  "wc_to_void_settlement",
  "buy_void_auto_fulfillment",
] as const) {
  const candidate = structuredClone(manifest);
  (
    candidate.capabilities as unknown as Record<string, unknown>
  )[key] = "available";
  rejectManifest(`false live capability ${key}`, candidate);
}

for (const key of [
  "external_agent_runtime_onboarding_available",
  "external_agent_paid_work_execution_available",
  "payment_execution_enabled",
  "real_wc_ledger_write_enabled",
  "real_wc_balance_mutation_enabled",
  "wc_to_void_settlement_enabled",
  "buy_void_auto_fulfillment_enabled",
] as const) {
  const candidate = structuredClone(manifest);
  (
    candidate.operational_status as unknown as Record<string, unknown>
  )[key] = true;
  rejectManifest(`false operational status ${key}`, candidate);
}

for (const key of [
  "manifest_grants_execution_authority",
  "manifest_grants_payment_authority",
  "manifest_grants_wallet_or_signer_access",
  "manifest_grants_runtime_administration",
  "manifest_grants_wc_ledger_write_authority",
  "manifest_grants_wc_to_void_settlement_authority",
  "manifest_grants_buy_void_fulfillment_authority",
  "contains_private_keys_or_credentials",
  "contains_live_payment_instructions",
] as const) {
  const candidate = structuredClone(manifest);
  (
    candidate.safety_boundary as unknown as Record<string, unknown>
  )[key] = true;
  rejectManifest(`false authority or secret claim ${key}`, candidate);
}

const swappedStages = structuredClone(manifest);
[
  swappedStages.lifecycle.ordered_stages[0],
  swappedStages.lifecycle.ordered_stages[1],
] = [
  swappedStages.lifecycle.ordered_stages[1],
  swappedStages.lifecycle.ordered_stages[0],
];
rejectManifest("swapped lifecycle stages", swappedStages);

const wrongStageIndex = structuredClone(manifest);
wrongStageIndex.lifecycle.ordered_stages[0].index = 2;
rejectManifest("wrong lifecycle stage index", wrongStageIndex);

const wrongStageId = structuredClone(manifest);
wrongStageId.lifecycle.ordered_stages[0].stage_id = "other_stage";
rejectManifest("wrong lifecycle stage ID", wrongStageId);

const invalidStageMarker = structuredClone(manifest);
invalidStageMarker.lifecycle.ordered_stages[0].protocol_marker =
  "NOT_A_VOID_MARKER";
rejectManifest("invalid stage marker", invalidStageMarker);

const duplicateStageMarker = structuredClone(manifest);
duplicateStageMarker.lifecycle.ordered_stages[1].protocol_marker =
  duplicateStageMarker.lifecycle.ordered_stages[0].protocol_marker;
rejectManifest("duplicate stage marker", duplicateStageMarker);

const wrongArtifactPath = structuredClone(manifest);
wrongArtifactPath.lifecycle.ordered_stages[0]
  .artifacts.documentation.path = "../README.md";
rejectManifest("artifact path traversal", wrongArtifactPath);

const duplicateArtifactPath = structuredClone(manifest);
duplicateArtifactPath.lifecycle.ordered_stages[0]
  .artifacts.example.path =
    duplicateArtifactPath.lifecycle.ordered_stages[0]
      .artifacts.documentation.path;
rejectManifest("duplicate artifact path", duplicateArtifactPath);

const extraRootField =
  structuredClone(manifest) as unknown as Record<string, unknown>;
extraRootField.live_endpoint = "/paid-work";
rejectManifest("extra root live endpoint", extraRootField);

const extraCapability =
  structuredClone(manifest) as unknown as Record<string, unknown>;
(
  extraCapability.capabilities as Record<string, unknown>
).live_token_transfer = "available";
rejectManifest("extra live capability", extraCapability);

const wrongActivationOrder = structuredClone(manifest);
[
  wrongActivationOrder.next_activation_requirements[0],
  wrongActivationOrder.next_activation_requirements[1],
] = [
  wrongActivationOrder.next_activation_requirements[1],
  wrongActivationOrder.next_activation_requirements[0],
];
rejectManifest(
  "reordered activation requirements",
  wrongActivationOrder,
);

const byteTamperDraft = structuredClone(manifest);
byteTamperDraft.lifecycle.ordered_stages[0]
  .artifacts.documentation.bytes += 1;
const byteTamper = recommitManifest(byteTamperDraft);
validateAgentPaidWorkPublicDiscoveryManifest(byteTamper);
expectReject("artifact byte-count tamper", () =>
  verifyAgentPaidWorkPublicDiscoveryArtifacts(byteTamper, "."),
);

const digestTamperDraft = structuredClone(manifest);
digestTamperDraft.lifecycle.ordered_stages[0]
  .artifacts.documentation.sha256 = "0".repeat(64);
const digestTamper = recommitManifest(digestTamperDraft);
validateAgentPaidWorkPublicDiscoveryManifest(digestTamper);
expectReject("artifact digest tamper", () =>
  verifyAgentPaidWorkPublicDiscoveryArtifacts(digestTamper, "."),
);

const exampleMarkerTamperDraft = structuredClone(manifest);
exampleMarkerTamperDraft.lifecycle.ordered_stages[0].protocol_marker =
  "VOID_AGENT_PAID_WORK_SYNTHETIC_OTHER_V1";
const exampleMarkerTamper = recommitManifest(
  exampleMarkerTamperDraft,
);
validateAgentPaidWorkPublicDiscoveryManifest(exampleMarkerTamper);
expectReject("example marker disagreement", () =>
  verifyAgentPaidWorkPublicDiscoveryArtifacts(
    exampleMarkerTamper,
    ".",
  ),
);

const schemaText = readText(
  "schemas/agent-paid-work-public-discovery-v1.schema.json",
);
const docsText = readText(
  "docs/public/agent-paid-work-public-discovery-v1.md",
);
const validatorSource = readText(
  "scripts/agent_paid_work_public_discovery_v1.ts",
);
const schema = JSON.parse(schemaText) as Record<string, unknown>;

assertCondition(
  schema.$schema === "https://json-schema.org/draft/2020-12/schema",
  "schema draft mismatch",
);
assertCondition(
  schemaText.includes(AGENT_PAID_WORK_PUBLIC_DISCOVERY_MARKER),
  "schema marker missing",
);
assertCondition(
  schemaText.includes('"runtime_route_available": {'),
  "schema runtime-route honesty constraint missing",
);
assertCondition(
  schemaText.includes('"live_payment_execution": {'),
  "schema payment-capability honesty constraint missing",
);
assertCondition(
  validatorSource.includes(
    "verifyAgentPaidWorkPublicDiscoveryArtifacts",
  ),
  "repository artifact verifier missing",
);

const normalizedDocs = docsText.replace(/\s+/g, " ");
for (const boundary of [
  "VOID_AGENT_PAID_WORK_PUBLIC_DISCOVERY_V1",
  "The complete manifest therefore indexes 60 unique tracked artifacts.",
  "runtime_route_available=false",
  "public_http_route=null",
  "Discovering a protocol contract does not authorize executing it.",
  "repository completeness from being confused with economic activation",
  "Until a runtime route exists, repository access is the discovery transport.",
  "These are requirements, not claims of current availability.",
  "does not add a public HTTP route",
  "or activate Buy VOID automatic fulfillment",
]) {
  assertCondition(
    normalizedDocs.includes(boundary),
    `documentation boundary missing: ${boundary}`,
  );
}

assertCondition(
  manifest.marker === AGENT_PAID_WORK_PUBLIC_DISCOVERY_MARKER,
  "manifest marker mismatch",
);

console.log(`marker=${manifest.marker}`);
console.log(
  `public_discovery_manifest_id=${
    manifest.public_discovery_manifest_id
  }`,
);
console.log(`source_commit=${manifest.repository.source_commit}`);
console.log(`stage_count=${summary.stage_count}`);
console.log(`artifact_count=${summary.artifact_count}`);
console.log(`verified_file_count=${summary.verified_file_count}`);
console.log(
  `verified_example_marker_count=${
    summary.verified_example_marker_count
  }`,
);
console.log(
  `canonical_bytes=${Buffer.byteLength(
    canonicalJson(draft),
    "utf8",
  )}`,
);
console.log("tampered_manifest_id_rejected=yes");
console.log("repository_and_source_commit_binding_verified=yes");
console.log("ordered_twelve_stage_lifecycle_verified=yes");
console.log("sixty_unique_artifact_paths_verified=yes");
console.log("all_artifact_bytes_and_sha256_verified=yes");
console.log("all_twelve_example_markers_verified=yes");
console.log("artifact_path_and_order_tampering_rejected=yes");
console.log("false_live_capability_claims_rejected=yes");
console.log("false_operational_status_claims_rejected=yes");
console.log("false_authority_and_secret_claims_rejected=yes");
console.log("repository_only_read_only_boundary_verified=yes");
console.log("schema_and_documentation_boundaries_verified=yes");
console.log(
  "VOID_AGENT_PAID_WORK_PUBLIC_DISCOVERY_V1_PROOF_GREEN",
);
