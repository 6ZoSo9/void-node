import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
  materializePublicAgentServiceProviderTrustRegistrySnapshotV1,
  providerTrustRegistrySnapshotAuthenticationIdV1,
  providerTrustRegistrySnapshotIdV1,
  providerTrustRegistrySnapshotSigningBytesV1,
  providerTrustRootIdV1,
} from "./public_agent_service_provider_trust_registry_snapshot_v1.js";
import {
  PUBLIC_AGENT_SERVICE_TRUSTED_PROVIDER_QUOTE_RESPONSE_VERIFICATION_MARKER,
  materializePublicAgentServiceTrustedProviderQuoteResponseVerificationV1,
  verifyPublicAgentServiceTrustedProviderQuoteResponseVerificationV1,
} from "./public_agent_service_trusted_provider_quote_response_verification_v1.js";

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

function changeLastHex(value: string): string {
  const last = value.at(-1);
  assertCondition(last !== undefined, "cannot mutate empty identifier");
  return `${value.slice(0, -1)}${last === "0" ? "1" : "0"}`;
}

const repoRoot =
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const examplePath =
  "examples/public-agent-service-trusted-provider-quote-response-verification-v1.example.json";
const schemaPath =
  "schemas/public-agent-service-trusted-provider-quote-response-verification-v1.schema.json";
const docsPath =
  "docs/public-agent/public-agent-service-trusted-provider-quote-response-verification-v1.md";
const adapterPath =
  "scripts/public_agent_service_trusted_provider_quote_response_verification_v1.ts";
const workflowPath =
  ".github/workflows/public-agent-service-trusted-provider-quote-response-verification-v1.yml";

const exampleBundle = readJson(examplePath) as Record<string, unknown>;
const exampleInput = exampleBundle.input;
const examplePacket = exampleBundle.packet;

const verifiedExample =
  verifyPublicAgentServiceTrustedProviderQuoteResponseVerificationV1(
    exampleInput,
    examplePacket,
  );
assertCondition(
  verifiedExample.status === "example_only",
  "committed example became live",
);
assertCondition(
  verifiedExample.separate_acceptance_gate
    .eligible_for_separate_requester_acceptance === false,
  "committed example became separately acceptance eligible",
);
assertCondition(
  verifiedExample.separate_acceptance_gate.reason
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
tamperedPacket.status = "trusted_provider_quote_response_verified";
expectReject("tampered output packet", () =>
  verifyPublicAgentServiceTrustedProviderQuoteResponseVerificationV1(
    exampleInput,
    tamperedPacket,
  ),
);

const wrongRoot = clone(exampleInput) as Record<string, unknown>;
wrongRoot.expected_trust_root_id =
  changeLastHex(String(wrongRoot.expected_trust_root_id));
expectReject("wrong pinned trust root", () =>
  materializePublicAgentServiceTrustedProviderQuoteResponseVerificationV1(
    wrongRoot,
  ),
);

const falseLive = clone(exampleInput) as Record<string, unknown>;
falseLive.evidence_mode = "external_provider_evidence";
expectReject("false live composition claim", () =>
  materializePublicAgentServiceTrustedProviderQuoteResponseVerificationV1(
    falseLive,
  ),
);

const exampleInputRecord =
  exampleInput as Record<string, unknown>;
const exampleAuthentication =
  exampleInputRecord
    .provider_quote_response_authentication_input as Record<string, unknown>;
const catalog =
  exampleInputRecord.catalog_value;

const liveAuthentication = clone(exampleAuthentication);
liveAuthentication.evidence_mode = "external_provider_evidence";
const liveResponseInput =
  liveAuthentication
    .provider_quote_response_input as Record<string, unknown>;
(
  liveResponseInput.quote_handoff_input as Record<string, unknown>
).evidence_mode = "external_receiver_receipt";

const liveResponsePacket =
  materializePublicAgentServiceProviderQuoteResponseV1(
    liveResponseInput,
    catalog,
  );

const generatedRoot =
  crypto.generateKeyPairSync("ed25519");
const generatedProvider =
  crypto.generateKeyPairSync("ed25519");
const rootPublicPem =
  generatedRoot.publicKey.export({
    format: "pem",
    type: "spki",
  }).toString();
const providerPublicPem =
  generatedProvider.publicKey.export({
    format: "pem",
    type: "spki",
  }).toString();

const liveBindingDraft: ProviderKeyBindingDraftV1 = {
  marker: PUBLIC_AGENT_SERVICE_PROVIDER_KEY_BINDING_MARKER,
  version: 1,
  binding_status: "operator_approved_snapshot",
  provider_id: liveResponsePacket.provider_claim.provider_id,
  authority_scope: "provider_quote_response_authenticate",
  key_id:
    providerQuoteResponseAuthenticationKeyIdV1(providerPublicPem),
  public_key_pem: providerPublicPem,
  valid_from_utc: "2030-01-01T00:00:00Z",
  expires_at_utc: "2030-03-01T00:00:00Z",
  revoked_at_utc: null,
  binding_nonce: "trusted-provider-composition-live-binding-0001",
};
const liveBinding = {
  ...liveBindingDraft,
  binding_id: providerKeyBindingIdV1(liveBindingDraft),
};
liveAuthentication.provider_key_binding = liveBinding;

const liveAuthenticationBody:
  ProviderQuoteResponseAuthenticationBodyV1 = {
    marker:
      PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_EVIDENCE_MARKER,
    version: 1,
    signature_scheme: "ed25519-spki-sha256-v1",
    signature_domain:
      "VOID_PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_V1",
    canonicalization: "void-canonical-json-v1",
    response_id: liveResponsePacket.response_id,
    quote_id: liveResponsePacket.source.quote_id,
    handoff_id: liveResponsePacket.source.handoff_id,
    work_order_id: liveResponsePacket.source.work_order_id,
    submission_id: liveResponsePacket.source.submission_id,
    request_sha256: liveResponsePacket.source.request_sha256,
    receipt_id: liveResponsePacket.source.receipt_id,
    provider_id: liveResponsePacket.provider_claim.provider_id,
    catalog_fingerprint_sha256:
      liveResponsePacket.source.catalog_fingerprint_sha256,
    provider_key_binding_id: liveBinding.binding_id,
    authentication_nonce:
      "trusted-provider-composition-live-authentication-0001",
    created_at_utc: "2030-01-01T00:04:00Z",
    expires_at_utc: "2030-01-01T21:00:00Z",
  };
const liveAuthenticationSignature =
  crypto.sign(
    null,
    providerQuoteResponseAuthenticationSigningBytesV1(
      liveAuthenticationBody,
    ),
    generatedProvider.privateKey,
  ).toString("base64");
const liveAuthenticationWithoutId = {
  ...liveAuthenticationBody,
  signature_base64: liveAuthenticationSignature,
};
liveAuthentication.authentication_envelope = {
  ...liveAuthenticationWithoutId,
  authentication_id:
    providerQuoteResponseAuthenticationIdV1(
      liveAuthenticationWithoutId,
    ),
};

const liveRootDraft: ProviderTrustRootDraftV1 = {
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
  root_nonce: "trusted-provider-composition-live-root-0001",
};
const liveRoot = {
  ...liveRootDraft,
  root_id: providerTrustRootIdV1(liveRootDraft),
};
const liveSnapshotBody:
  ProviderTrustRegistrySnapshotBodyV1 = {
    marker:
      PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_BODY_MARKER,
    version: 1,
    snapshot_status: "operator_approved_snapshot",
    registry_id:
      "void.public-agent.trusted-provider-composition-registry.v1",
    sequence: 1,
    previous_snapshot_id: null,
    generated_at_utc: "2030-01-01T00:00:00Z",
    expires_at_utc: "2030-01-02T00:00:00Z",
    snapshot_nonce:
      "trusted-provider-composition-live-snapshot-0001",
    provider_key_bindings: [liveBinding],
  };
const liveSnapshotId =
  providerTrustRegistrySnapshotIdV1(liveSnapshotBody);
const liveSnapshotAuthenticationBody:
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
    snapshot_id: liveSnapshotId,
    trust_root_id: liveRoot.root_id,
    key_id: liveRoot.key_id,
    signed_at_utc: "2030-01-01T00:00:00Z",
  };
const liveSnapshotSignature =
  crypto.sign(
    null,
    providerTrustRegistrySnapshotSigningBytesV1(
      liveSnapshotBody,
      liveSnapshotAuthenticationBody,
    ),
    generatedRoot.privateKey,
  ).toString("base64");
const liveSnapshotAuthenticationWithoutId = {
  ...liveSnapshotAuthenticationBody,
  signature_base64: liveSnapshotSignature,
};
const liveSnapshotInput = {
  marker:
    PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_MARKER,
  version: 1,
  evidence_mode: "operator_signed_snapshot",
  trust_root: liveRoot,
  snapshot_body: liveSnapshotBody,
  authentication_envelope: {
    ...liveSnapshotAuthenticationWithoutId,
    authentication_id:
      providerTrustRegistrySnapshotAuthenticationIdV1(
        liveSnapshotAuthenticationWithoutId,
      ),
  },
};

const liveInput = {
  marker:
    PUBLIC_AGENT_SERVICE_TRUSTED_PROVIDER_QUOTE_RESPONSE_VERIFICATION_MARKER,
  version: 1,
  evidence_mode: "external_provider_evidence",
  expected_trust_root_id: liveRoot.root_id,
  provider_trust_registry_snapshot_input: liveSnapshotInput,
  provider_quote_response_authentication_input:
    liveAuthentication,
  catalog_value: catalog,
};
const livePacket =
  materializePublicAgentServiceTrustedProviderQuoteResponseVerificationV1(
    liveInput,
  );
assertCondition(
  livePacket.status
    === "trusted_provider_quote_response_verified",
  "live composition status changed",
);
assertCondition(
  livePacket.verification.composed_trust_chain_verified === true,
  "live composed trust chain did not verify",
);
assertCondition(
  livePacket.source.provider_key_binding_id
    === liveBinding.binding_id,
  "live composition changed binding identity",
);
assertCondition(
  livePacket.separate_acceptance_gate
    .eligible_for_separate_requester_acceptance === true,
  "live composition is not separately acceptance eligible",
);
assertCondition(
  livePacket.separate_acceptance_gate
    .requester_authentication_required === true,
  "live composition bypassed requester authentication",
);
assertCondition(
  livePacket.separate_acceptance_gate
    .quote_acceptance_not_performed === true,
  "live composition performed quote acceptance",
);
assertCondition(
  Object.values(livePacket.authority).every(
    (value) => value === false,
  ),
  "live composition granted authority",
);
verifyPublicAgentServiceTrustedProviderQuoteResponseVerificationV1(
  liveInput,
  livePacket,
);

// Prove the composition rejects an authentication binding that is valid on
// its own but is not the exact binding resolved from the signed snapshot.
const alternateProvider =
  crypto.generateKeyPairSync("ed25519");
const alternatePublicPem =
  alternateProvider.publicKey.export({
    format: "pem",
    type: "spki",
  }).toString();
const alternateBindingDraft: ProviderKeyBindingDraftV1 = {
  ...liveBindingDraft,
  key_id:
    providerQuoteResponseAuthenticationKeyIdV1(
      alternatePublicPem,
    ),
  public_key_pem: alternatePublicPem,
  binding_nonce:
    "trusted-provider-composition-alternate-binding-0001",
};
const alternateBinding = {
  ...alternateBindingDraft,
  binding_id:
    providerKeyBindingIdV1(alternateBindingDraft),
};
const alternateAuthentication = clone(liveAuthentication);
alternateAuthentication.provider_key_binding =
  alternateBinding;
const alternateBody: ProviderQuoteResponseAuthenticationBodyV1 = {
  ...liveAuthenticationBody,
  provider_key_binding_id: alternateBinding.binding_id,
  authentication_nonce:
    "trusted-provider-composition-alternate-authentication-0001",
};
const alternateSignature =
  crypto.sign(
    null,
    providerQuoteResponseAuthenticationSigningBytesV1(
      alternateBody,
    ),
    alternateProvider.privateKey,
  ).toString("base64");
const alternateWithoutId = {
  ...alternateBody,
  signature_base64: alternateSignature,
};
alternateAuthentication.authentication_envelope = {
  ...alternateWithoutId,
  authentication_id:
    providerQuoteResponseAuthenticationIdV1(
      alternateWithoutId,
    ),
};
const individuallyValidAuthentication =
  materializePublicAgentServiceProviderQuoteResponseAuthenticationV1(
    alternateAuthentication,
    catalog,
  );
assertCondition(
  individuallyValidAuthentication.status
    === "provider_authenticated_for_acceptance",
  "alternate provider authentication was not independently valid",
);
materializePublicAgentServiceProviderTrustRegistrySnapshotV1(
  liveSnapshotInput,
  liveRoot.root_id,
);
expectReject("independently valid but untrusted binding", () =>
  materializePublicAgentServiceTrustedProviderQuoteResponseVerificationV1(
    {
      ...liveInput,
      provider_quote_response_authentication_input:
        alternateAuthentication,
    },
  ),
);

const schema =
  readJson(schemaPath) as Record<string, unknown>;
assertCondition(
  schema.$id
    === "https://voidchain.io/schemas/public-agent-service-trusted-provider-quote-response-verification-v1.schema.json",
  "schema ID changed",
);
const required =
  schema.required as unknown[];
for (const key of [
  "input",
  "packet",
]) {
  assertCondition(
    required.includes(key),
    `schema no longer requires ${key}`,
  );
}

const docs = readText(docsPath).replace(/\s+/g, " ");
const adapterSource = readText(adapterPath);
const workflow = readText(workflowPath);
for (const phrase of [
  "exact active provider binding",
  "separate requester authentication",
  "does not accept a quote",
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
  "payment_authorization: true",
  "payment_execution: true",
  "quote_acceptance: true",
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
    "npx tsx scripts/prove_public_agent_service_trusted_provider_quote_response_verification_v1.ts",
  ),
  "workflow does not run the exact proof",
);

console.log(
  "marker=VOID_PUBLIC_AGENT_SERVICE_TRUSTED_PROVIDER_QUOTE_RESPONSE_VERIFICATION_PROOF_V1",
);
console.log(`example_status=${verifiedExample.status}`);
console.log(
  `example_eligible_for_separate_requester_acceptance=${verifiedExample.separate_acceptance_gate.eligible_for_separate_requester_acceptance}`,
);
console.log(`live_status=${livePacket.status}`);
console.log(
  `live_trust_root_id=${livePacket.source.expected_trust_root_id}`,
);
console.log(
  `live_snapshot_id=${livePacket.source.snapshot_id}`,
);
console.log(
  `live_provider_id=${livePacket.source.provider_id}`,
);
console.log(
  `live_binding_id=${livePacket.source.provider_key_binding_id}`,
);
console.log(
  `live_authentication_id=${livePacket.source.provider_authentication_id}`,
);
console.log(
  `live_eligible_for_separate_requester_acceptance=${livePacket.separate_acceptance_gate.eligible_for_separate_requester_acceptance}`,
);
console.log("provider_selection=false");
console.log("quote_publication=false");
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
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_PROVIDER_QUOTE_RESPONSE_VERIFICATION_V1_EXACT_GREEN",
);
