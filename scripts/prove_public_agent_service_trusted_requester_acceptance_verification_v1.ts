import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  type RequesterAcceptanceAuthenticationBodyV1,
  type RequesterAcceptanceKeyBindingDraftV1,
  PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_CANONICALIZATION,
  PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_EVIDENCE_MARKER,
  PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_MARKER,
  PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_KEY_BINDING_MARKER,
  PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_SCOPE,
  PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_SIGNATURE_DOMAIN,
  PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_SIGNATURE_SCHEME,
  materializePublicAgentServiceRequesterAcceptanceAuthenticationV1,
  requesterAcceptanceAuthenticationIdV1,
  requesterAcceptanceAuthenticationKeyIdV1,
  requesterAcceptanceAuthenticationSigningBytesV1,
  requesterAcceptanceKeyBindingIdV1,
} from "./public_agent_service_requester_acceptance_authentication_v1.js";
import {
  materializePublicAgentServiceAuthenticatedQuoteAcceptanceHandoffV1,
} from "./public_agent_service_authenticated_quote_acceptance_handoff_v1.js";
import {
  type ProviderKeyBindingDraftV1,
  type ProviderQuoteResponseAuthenticationBodyV1,
  PUBLIC_AGENT_SERVICE_PROVIDER_KEY_BINDING_MARKER,
  PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_EVIDENCE_MARKER,
  materializePublicAgentServiceProviderQuoteResponseAuthenticationV1,
  providerKeyBindingIdV1,
  providerQuoteResponseAuthenticationIdV1,
  providerQuoteResponseAuthenticationKeyIdV1,
  providerQuoteResponseAuthenticationSigningBytesV1,
} from "./public_agent_service_provider_quote_response_authentication_v1.js";
import {
  materializePublicAgentServiceProviderQuoteResponseV1,
} from "./public_agent_service_provider_quote_response_v1.js";
import {
  type ProviderTrustRegistrySnapshotAuthenticationBodyV1,
  type ProviderTrustRegistrySnapshotBodyV1,
  type ProviderTrustRootDraftV1,
  PROVIDER_TRUST_REGISTRY_SNAPSHOT_CANONICALIZATION,
  PROVIDER_TRUST_REGISTRY_SNAPSHOT_SIGNATURE_DOMAIN,
  PROVIDER_TRUST_REGISTRY_SNAPSHOT_SIGNATURE_SCHEME,
  PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_AUTHENTICATION_MARKER,
  PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_BODY_MARKER,
  PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_MARKER,
  PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_ROOT_MARKER,
  providerTrustRegistrySnapshotAuthenticationIdV1,
  providerTrustRegistrySnapshotIdV1,
  providerTrustRegistrySnapshotSigningBytesV1,
  providerTrustRootIdV1,
} from "./public_agent_service_provider_trust_registry_snapshot_v1.js";
import {
  PUBLIC_AGENT_SERVICE_TRUSTED_PROVIDER_QUOTE_RESPONSE_VERIFICATION_MARKER,
  materializePublicAgentServiceTrustedProviderQuoteResponseVerificationV1,
} from "./public_agent_service_trusted_provider_quote_response_verification_v1.js";
import {
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_VERIFICATION_MARKER,
  materializePublicAgentServiceTrustedRequesterAcceptanceVerificationV1,
  verifyPublicAgentServiceTrustedRequesterAcceptanceVerificationV1,
} from "./public_agent_service_trusted_requester_acceptance_verification_v1.js";

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

function clone<T>(value: T): T {
  return structuredClone(value);
}

function readJson(relative: string): unknown {
  return JSON.parse(
    fs.readFileSync(path.resolve(repoRoot, relative), "utf8"),
  );
}

function readText(relative: string): string {
  return fs.readFileSync(path.resolve(repoRoot, relative), "utf8");
}

function expectReject(
  label: string,
  operation: () => unknown,
): void {
  let rejected = false;
  try {
    operation();
  } catch {
    rejected = true;
  }
  assertCondition(rejected, `${label} was not rejected`);
}

const repoRoot =
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const examplePath =
  "examples/public-agent-service-trusted-requester-acceptance-verification-v1.example.json";
const schemaPath =
  "schemas/public-agent-service-trusted-requester-acceptance-verification-v1.schema.json";
const docsPath =
  "docs/public-agent/public-agent-service-trusted-requester-acceptance-verification-v1.md";
const adapterPath =
  "scripts/public_agent_service_trusted_requester_acceptance_verification_v1.ts";
const workflowPath =
  ".github/workflows/public-agent-service-trusted-requester-acceptance-verification-v1.yml";
const requesterExamplePath =
  "examples/public-agent-service-requester-acceptance-authentication-v1.example.json";

const exampleBundle = readJson(examplePath) as Record<string, unknown>;
const exampleInput = exampleBundle.input;
const examplePacket = exampleBundle.packet;
const verifiedExample =
  verifyPublicAgentServiceTrustedRequesterAcceptanceVerificationV1(
    exampleInput,
    examplePacket,
  );

assertCondition(
  verifiedExample.status === "example_only",
  "committed example became live",
);
assertCondition(
  verifiedExample.verification.requester_binding_provenance_verified
    === false,
  "committed example claimed requester binding provenance",
);
assertCondition(
  verifiedExample.acceptance_materialization_gate
    .eligible_for_acceptance_materialization === false,
  "committed example became acceptance eligible",
);
assertCondition(
  verifiedExample.acceptance_materialization_gate.reason
    === "example_fixture_not_live_trust",
  "committed example gate reason changed",
);
assertCondition(
  Object.values(verifiedExample.authority).every(
    (value) => value === false,
  ),
  "committed example granted authority",
);

const tamperedPacket = clone(examplePacket) as Record<string, unknown>;
tamperedPacket.status =
  "trusted_provider_requester_acceptance_intent_verified";
expectReject("tampered composed packet", () =>
  verifyPublicAgentServiceTrustedRequesterAcceptanceVerificationV1(
    exampleInput,
    tamperedPacket,
  ),
);

// Build a complete ephemeral external provider trust chain and requester
// acceptance-authentication chain. The requester key binding remains a
// caller-supplied approved snapshot because no requester registry contract
// exists yet; this composition must therefore remain acceptance-ineligible.
const requesterInput =
  clone(readJson(requesterExamplePath)) as Record<string, unknown>;
requesterInput.evidence_mode =
  "external_requester_evidence";
const handoffInput =
  requesterInput
    .authenticated_quote_acceptance_handoff_input as Record<string, unknown>;
const providerAuthentication =
  handoffInput.provider_authentication_input as Record<string, unknown>;
providerAuthentication.evidence_mode =
  "external_provider_evidence";
const responseInput =
  providerAuthentication
    .provider_quote_response_input as Record<string, unknown>;
(
  responseInput.quote_handoff_input as Record<string, unknown>
).evidence_mode = "external_receiver_receipt";

const exampleInputRecord =
  exampleInput as Record<string, unknown>;
const exampleTrustedProviderInput =
  exampleInputRecord
    .trusted_provider_quote_response_verification_input as Record<string, unknown>;
const catalog =
  exampleTrustedProviderInput.catalog_value;
assertCondition(
  catalog !== undefined,
  "committed composition example catalog_value missing",
);

const responsePacket =
  materializePublicAgentServiceProviderQuoteResponseV1(
    responseInput,
    catalog,
  );

const rootGenerated =
  crypto.generateKeyPairSync("ed25519");
const providerGenerated =
  crypto.generateKeyPairSync("ed25519");
const requesterGenerated =
  crypto.generateKeyPairSync("ed25519");

const rootPublicPem =
  rootGenerated.publicKey.export({
    type: "spki",
    format: "pem",
  }).toString();
const providerPublicPem =
  providerGenerated.publicKey.export({
    type: "spki",
    format: "pem",
  }).toString();
const requesterPublicPem =
  requesterGenerated.publicKey.export({
    type: "spki",
    format: "pem",
  }).toString();

const providerBindingDraft: ProviderKeyBindingDraftV1 = {
  marker: PUBLIC_AGENT_SERVICE_PROVIDER_KEY_BINDING_MARKER,
  version: 1,
  binding_status: "operator_approved_snapshot",
  provider_id: responsePacket.provider_claim.provider_id,
  authority_scope: "provider_quote_response_authenticate",
  key_id:
    providerQuoteResponseAuthenticationKeyIdV1(providerPublicPem),
  public_key_pem: providerPublicPem,
  valid_from_utc: "2030-01-01T00:00:00Z",
  expires_at_utc: "2030-03-01T00:00:00Z",
  revoked_at_utc: null,
  binding_nonce: "trusted-requester-live-provider-binding-0001",
};
const providerBinding = {
  ...providerBindingDraft,
  binding_id: providerKeyBindingIdV1(providerBindingDraft),
};
providerAuthentication.provider_key_binding =
  providerBinding;

const providerBody: ProviderQuoteResponseAuthenticationBodyV1 = {
  marker:
    PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_EVIDENCE_MARKER,
  version: 1,
  signature_scheme: "ed25519-spki-sha256-v1",
  signature_domain:
    "VOID_PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_V1",
  canonicalization: "void-canonical-json-v1",
  response_id: responsePacket.response_id,
  quote_id: responsePacket.source.quote_id,
  handoff_id: responsePacket.source.handoff_id,
  work_order_id: responsePacket.source.work_order_id,
  submission_id: responsePacket.source.submission_id,
  request_sha256: responsePacket.source.request_sha256,
  receipt_id: responsePacket.source.receipt_id,
  provider_id: responsePacket.provider_claim.provider_id,
  catalog_fingerprint_sha256:
    responsePacket.source.catalog_fingerprint_sha256,
  provider_key_binding_id: providerBinding.binding_id,
  authentication_nonce:
    "trusted-requester-live-provider-authentication-0001",
  created_at_utc: "2030-01-01T00:04:00Z",
  expires_at_utc: "2030-01-01T21:00:00Z",
};
const providerSignature =
  crypto.sign(
    null,
    providerQuoteResponseAuthenticationSigningBytesV1(
      providerBody,
    ),
    providerGenerated.privateKey,
  ).toString("base64");
const providerWithoutId = {
  ...providerBody,
  signature_base64: providerSignature,
};
providerAuthentication.authentication_envelope = {
  ...providerWithoutId,
  authentication_id:
    providerQuoteResponseAuthenticationIdV1(
      providerWithoutId,
    ),
};
const providerAuthenticationPacket =
  materializePublicAgentServiceProviderQuoteResponseAuthenticationV1(
    providerAuthentication,
    catalog,
  );
assertCondition(
  providerAuthenticationPacket.status
    === "provider_authenticated_for_acceptance",
  "ephemeral provider authentication did not verify",
);

const handoffPacket =
  materializePublicAgentServiceAuthenticatedQuoteAcceptanceHandoffV1(
    handoffInput,
    catalog,
  );
assertCondition(
  handoffPacket.status === "requester_authentication_required",
  "ephemeral handoff is not requester-authentication ready",
);

const requesterBindingDraft: RequesterAcceptanceKeyBindingDraftV1 = {
  marker:
    PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_KEY_BINDING_MARKER,
  version: 1,
  binding_status: "operator_approved_snapshot",
  requester_agent_id:
    handoffPacket.source.requester_agent_id,
  authority_scope:
    PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_SCOPE,
  key_id:
    requesterAcceptanceAuthenticationKeyIdV1(
      requesterPublicPem,
    ),
  public_key_pem: requesterPublicPem,
  valid_from_utc: "2030-01-01T00:00:00Z",
  expires_at_utc: "2030-03-01T00:00:00Z",
  revoked_at_utc: null,
  binding_nonce: "trusted-requester-live-requester-binding-0001",
};
const requesterBinding = {
  ...requesterBindingDraft,
  binding_id:
    requesterAcceptanceKeyBindingIdV1(
      requesterBindingDraft,
    ),
};
requesterInput.requester_key_binding =
  requesterBinding;

const requesterBody: RequesterAcceptanceAuthenticationBodyV1 = {
  marker:
    PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_EVIDENCE_MARKER,
  version: 1,
  signature_scheme:
    PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_SIGNATURE_SCHEME,
  signature_domain:
    PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_SIGNATURE_DOMAIN,
  canonicalization:
    PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_CANONICALIZATION,
  handoff_id: handoffPacket.handoff_id,
  provider_authentication_id:
    handoffPacket.source.authentication_id,
  provider_key_binding_id:
    handoffPacket.source.provider_key_binding_id,
  provider_key_id:
    handoffPacket.source.key_id,
  response_id:
    handoffPacket.source.response_id,
  quote_id:
    handoffPacket.source.quote_id,
  quote_handoff_id:
    handoffPacket.source.quote_handoff_id,
  work_order_id:
    handoffPacket.source.work_order_id,
  requester_agent_id:
    handoffPacket.source.requester_agent_id,
  provider_id:
    handoffPacket.source.provider_id,
  catalog_fingerprint_sha256:
    handoffPacket.source.catalog_fingerprint_sha256,
  requester_key_binding_id:
    requesterBinding.binding_id,
  acceptance_nonce:
    handoffPacket.requester_intent.acceptance_nonce,
  authentication_nonce:
    "trusted-requester-live-requester-authentication-0001",
  created_at_utc: "2030-01-01T00:06:00Z",
  expires_at_utc: "2030-01-01T20:00:00Z",
};
const requesterSignature =
  crypto.sign(
    null,
    requesterAcceptanceAuthenticationSigningBytesV1(
      requesterBody,
    ),
    requesterGenerated.privateKey,
  ).toString("base64");
const requesterWithoutId = {
  ...requesterBody,
  signature_base64: requesterSignature,
};
requesterInput.requester_authentication_envelope = {
  ...requesterWithoutId,
  requester_authentication_id:
    requesterAcceptanceAuthenticationIdV1(
      requesterWithoutId,
    ),
};
const requesterPacket =
  materializePublicAgentServiceRequesterAcceptanceAuthenticationV1(
    requesterInput,
    catalog,
  );
assertCondition(
  requesterPacket.status
    === "requester_authenticated_for_acceptance",
  "ephemeral requester authentication did not verify",
);

const rootDraft: ProviderTrustRootDraftV1 = {
  marker: PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_ROOT_MARKER,
  version: 1,
  trust_status: "operator_pinned_trust_root",
  authority_scope: "provider_trust_registry_snapshot_verify",
  key_id:
    providerQuoteResponseAuthenticationKeyIdV1(rootPublicPem),
  public_key_pem: rootPublicPem,
  valid_from_utc: "2030-01-01T00:00:00Z",
  expires_at_utc: "2031-01-01T00:00:00Z",
  revoked_at_utc: null,
  root_nonce: "trusted-requester-live-root-0001",
};
const trustRoot = {
  ...rootDraft,
  root_id: providerTrustRootIdV1(rootDraft),
};
const snapshotBody: ProviderTrustRegistrySnapshotBodyV1 = {
  marker:
    PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_BODY_MARKER,
  version: 1,
  snapshot_status: "operator_approved_snapshot",
  registry_id:
    "void.public-agent.trusted-requester-provider-registry.v1",
  sequence: 1,
  previous_snapshot_id: null,
  generated_at_utc: "2030-01-01T00:00:00Z",
  expires_at_utc: "2030-01-02T00:00:00Z",
  snapshot_nonce: "trusted-requester-live-snapshot-0001",
  provider_key_bindings: [providerBinding],
};
const snapshotId =
  providerTrustRegistrySnapshotIdV1(snapshotBody);
const snapshotAuthenticationBody:
  ProviderTrustRegistrySnapshotAuthenticationBodyV1 = {
    marker:
      PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_AUTHENTICATION_MARKER,
    version: 1,
    signature_scheme:
      PROVIDER_TRUST_REGISTRY_SNAPSHOT_SIGNATURE_SCHEME,
    signature_domain:
      PROVIDER_TRUST_REGISTRY_SNAPSHOT_SIGNATURE_DOMAIN,
    canonicalization:
      PROVIDER_TRUST_REGISTRY_SNAPSHOT_CANONICALIZATION,
    snapshot_id: snapshotId,
    trust_root_id: trustRoot.root_id,
    key_id: trustRoot.key_id,
    signed_at_utc: "2030-01-01T00:00:00Z",
  };
const snapshotSignature =
  crypto.sign(
    null,
    providerTrustRegistrySnapshotSigningBytesV1(
      snapshotBody,
      snapshotAuthenticationBody,
    ),
    rootGenerated.privateKey,
  ).toString("base64");
const snapshotWithoutId = {
  ...snapshotAuthenticationBody,
  signature_base64: snapshotSignature,
};
const snapshotInput = {
  marker:
    PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_MARKER,
  version: 1,
  evidence_mode: "operator_signed_snapshot",
  trust_root: trustRoot,
  snapshot_body: snapshotBody,
  authentication_envelope: {
    ...snapshotWithoutId,
    authentication_id:
      providerTrustRegistrySnapshotAuthenticationIdV1(
        snapshotWithoutId,
      ),
  },
};

const trustedProviderInput = {
  marker:
    PUBLIC_AGENT_SERVICE_TRUSTED_PROVIDER_QUOTE_RESPONSE_VERIFICATION_MARKER,
  version: 1,
  evidence_mode: "external_provider_evidence",
  expected_trust_root_id: trustRoot.root_id,
  provider_trust_registry_snapshot_input: snapshotInput,
  provider_quote_response_authentication_input:
    providerAuthentication,
  catalog_value: catalog,
};
const trustedProviderPacket =
  materializePublicAgentServiceTrustedProviderQuoteResponseVerificationV1(
    trustedProviderInput,
  );
assertCondition(
  trustedProviderPacket.status
    === "trusted_provider_quote_response_verified",
  "ephemeral trusted-provider chain did not verify",
);

const liveInput = {
  marker:
    PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_VERIFICATION_MARKER,
  version: 1,
  evidence_mode: "external_requester_evidence",
  trusted_provider_quote_response_verification_input:
    trustedProviderInput,
  requester_acceptance_authentication_input:
    requesterInput,
};
const livePacket =
  materializePublicAgentServiceTrustedRequesterAcceptanceVerificationV1(
    liveInput,
  );

assertCondition(
  livePacket.status
    === "trusted_provider_requester_acceptance_intent_verified",
  "live composition status changed",
);
assertCondition(
  livePacket.verification.composed_acceptance_intent_verified
    === true,
  "live requester intent did not compose with trusted provider evidence",
);
assertCondition(
  livePacket.verification.requester_binding_provenance_verified
    === false,
  "live composition falsely claimed requester binding provenance",
);
assertCondition(
  livePacket.acceptance_materialization_gate
    .eligible_for_acceptance_materialization === false,
  "live composition bypassed requester binding provenance",
);
assertCondition(
  livePacket.acceptance_materialization_gate.reason
    === "requester_binding_provenance_not_verified",
  "live composition gate reason changed",
);
assertCondition(
  livePacket.acceptance_materialization_gate
    .quote_acceptance_not_performed === true,
  "live composition performed quote acceptance",
);
assertCondition(
  Object.values(livePacket.authority).every(
    (value) => value === false,
  ),
  "live composition granted authority",
);
verifyPublicAgentServiceTrustedRequesterAcceptanceVerificationV1(
  liveInput,
  livePacket,
);

// Prove the composition rejects a requester chain whose nested provider
// authentication does not exactly match the trusted-provider input.
const mismatchedComposition = clone(liveInput) as Record<string, unknown>;
const mismatchedRequester =
  mismatchedComposition
    .requester_acceptance_authentication_input as Record<string, unknown>;
const mismatchedHandoff =
  mismatchedRequester
    .authenticated_quote_acceptance_handoff_input as Record<string, unknown>;
const mismatchedProvider =
  mismatchedHandoff.provider_authentication_input as Record<string, unknown>;
mismatchedProvider.authentication_envelope =
  clone(
    providerAuthentication.authentication_envelope,
  );
(
  mismatchedProvider.authentication_envelope as Record<string, unknown>
).authentication_nonce =
  "trusted-requester-mismatched-provider-authentication-0001";
expectReject("mismatched provider authentication composition", () =>
  materializePublicAgentServiceTrustedRequesterAcceptanceVerificationV1(
    mismatchedComposition,
  ),
);

const schema =
  readJson(schemaPath) as Record<string, unknown>;
assertCondition(
  schema.$id
    === "https://voidchain.io/schemas/public-agent-service-trusted-requester-acceptance-verification-v1.schema.json",
  "schema ID changed",
);
const required = schema.required as unknown[];
for (const key of ["input", "packet"]) {
  assertCondition(
    required.includes(key),
    `schema no longer requires ${key}`,
  );
}

const docs = readText(docsPath).replace(/\s+/g, " ");
const adapterSource = readText(adapterPath);
const workflow = readText(workflowPath);
for (const phrase of [
  "exact trusted provider chain",
  "requester binding provenance",
  "does not accept a quote",
  "authentication IDs are not consumed",
  "no payment authority",
  "no work dispatch authority",
  "no Work Credit authority",
]) {
  assertCondition(
    docs.includes(phrase),
    `documentation omitted boundary phrase: ${phrase}`,
  );
}
for (const forbidden of [
  "quote_acceptance: true",
  "authentication_id_consumption: true",
  "payment_authorization: true",
  "payment_execution: true",
  "work_dispatch: true",
  "work_credit_write: true",
  "runtime_mutation: true",
]) {
  assertCondition(
    !adapterSource.includes(forbidden),
    `adapter contains forbidden authority: ${forbidden}`,
  );
}
assertCondition(
  workflow.includes(
    "npx tsx scripts/prove_public_agent_service_trusted_requester_acceptance_verification_v1.ts",
  ),
  "workflow does not run the exact proof",
);

console.log(
  "marker=VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_VERIFICATION_PROOF_V1",
);
console.log(`example_status=${verifiedExample.status}`);
console.log(
  `example_eligible_for_acceptance_materialization=${verifiedExample.acceptance_materialization_gate.eligible_for_acceptance_materialization}`,
);
console.log(`live_status=${livePacket.status}`);
console.log(
  `live_provider_authentication_id=${livePacket.source.provider_authentication_id}`,
);
console.log(
  `live_requester_authentication_id=${livePacket.source.requester_authentication_id}`,
);
console.log(
  `live_requester_binding_provenance_verified=${livePacket.verification.requester_binding_provenance_verified}`,
);
console.log(
  `live_eligible_for_acceptance_materialization=${livePacket.acceptance_materialization_gate.eligible_for_acceptance_materialization}`,
);
console.log("requester_authentication_replay_write=false");
console.log("provider_authentication_replay_write=false");
console.log("authentication_id_consumption=false");
console.log("acceptance_id_consumption=false");
console.log("quote_acceptance=false");
console.log("payment_authorization=false");
console.log("payment_execution=false");
console.log("work_execution_authorization=false");
console.log("work_dispatch=false");
console.log("work_credit_write=false");
console.log("wallet_access=false");
console.log("runtime_mutation=false");
console.log("money_movement=false");
console.log(
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_VERIFICATION_V1_EXACT_GREEN",
);
