import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  canonicalJson,
} from "./agent_paid_work_order_envelope_v1.js";
import {
  PUBLIC_AGENT_SERVICE_PROVIDER_KEY_BINDING_MARKER,
  providerKeyBindingIdV1,
  providerQuoteResponseAuthenticationKeyIdV1,
  type ProviderKeyBindingDraftV1,
} from "./public_agent_service_provider_quote_response_authentication_v1.js";
import {
  PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_AUTHENTICATION_MARKER,
  PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_BODY_MARKER,
  PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_MARKER,
  PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_ROOT_MARKER,
  PROVIDER_TRUST_REGISTRY_SNAPSHOT_CANONICALIZATION,
  PROVIDER_TRUST_REGISTRY_SNAPSHOT_SIGNATURE_DOMAIN,
  PROVIDER_TRUST_REGISTRY_SNAPSHOT_SIGNATURE_SCHEME,
  materializePublicAgentServiceProviderTrustRegistrySnapshotV1,
  providerTrustRegistrySnapshotAuthenticationIdV1,
  providerTrustRegistrySnapshotIdV1,
  providerTrustRegistrySnapshotSigningBytesV1,
  providerTrustRootIdV1,
  resolveProviderKeyBindingFromTrustRegistrySnapshotV1,
  verifyPublicAgentServiceProviderTrustRegistrySnapshotV1,
  type ProviderTrustRegistrySnapshotAuthenticationBodyV1,
  type ProviderTrustRegistrySnapshotBodyV1,
  type ProviderTrustRootDraftV1,
} from "./public_agent_service_provider_trust_registry_snapshot_v1.js";

function fail(message: string): never {
  throw new Error(message);
}

function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) fail(message);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function readJson(relative: string): unknown {
  const resolved = path.resolve(relative);
  const fileStat = fs.lstatSync(resolved);
  assertCondition(!fileStat.isSymbolicLink(), `symlink forbidden: ${relative}`);
  assertCondition(fileStat.isFile(), `regular file required: ${relative}`);
  return JSON.parse(fs.readFileSync(resolved, "utf8")) as unknown;
}

function readText(relative: string): string {
  const resolved = path.resolve(relative);
  const fileStat = fs.lstatSync(resolved);
  assertCondition(!fileStat.isSymbolicLink(), `symlink forbidden: ${relative}`);
  assertCondition(fileStat.isFile(), `regular file required: ${relative}`);
  return fs.readFileSync(resolved, "utf8");
}

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
  assertCondition(rejected, `${label} was not rejected`);
}

const examplePath =
  "examples/public-agent-service-provider-trust-registry-snapshot-v1.example.json";
const schemaPath =
  "schemas/public-agent-service-provider-trust-registry-snapshot-v1.schema.json";
const docsPath =
  "docs/public-agent/public-agent-service-provider-trust-registry-snapshot-v1.md";
const adapterPath =
  "scripts/public_agent_service_provider_trust_registry_snapshot_v1.ts";
const proofPath =
  "scripts/prove_public_agent_service_provider_trust_registry_snapshot_v1.ts";
const workflowPath =
  ".github/workflows/public-agent-service-provider-trust-registry-snapshot-v1.yml";
const authenticationDocsPath =
  "docs/public-agent/public-agent-service-provider-quote-response-authentication-v1.md";

const input = readJson(examplePath) as Record<string, unknown>;
const trustRoot =
  input.trust_root as Record<string, unknown>;
const expectedTrustRootId = String(trustRoot.root_id);
const packet =
  materializePublicAgentServiceProviderTrustRegistrySnapshotV1(
    input,
    expectedTrustRootId,
  );
assertCondition(
  packet.status === "example_only",
  "example trust snapshot status changed",
);
assertCondition(
  packet.provider_authentication_gate
    .eligible_for_provider_authentication === false,
  "example trust snapshot became live eligible",
);
assertCondition(
  packet.provider_authentication_gate.reason
    === "example_fixture_not_live_trust",
  "example trust snapshot reason changed",
);
assertCondition(
  packet.source.provider_count === 1,
  "example provider count changed",
);
assertCondition(
  Object.values(packet.authority).every(
    (value) => value === false,
  ),
  "trust snapshot packet granted authority",
);
verifyPublicAgentServiceProviderTrustRegistrySnapshotV1(
  input,
  expectedTrustRootId,
  packet,
);

const reorderedInput = {
  authentication_envelope: input.authentication_envelope,
  snapshot_body: input.snapshot_body,
  trust_root: input.trust_root,
  evidence_mode: input.evidence_mode,
  version: input.version,
  marker: input.marker,
};
const reordered =
  materializePublicAgentServiceProviderTrustRegistrySnapshotV1(
    reorderedInput,
    expectedTrustRootId,
  );
assertCondition(
  canonicalJson(reordered) === canonicalJson(packet),
  "top-level key order changed trust snapshot packet",
);

expectReject("wrong expected trust root", () =>
  materializePublicAgentServiceProviderTrustRegistrySnapshotV1(
    input,
    "voidaptr1_" + "0".repeat(64),
  ),
);

const badRootId = clone(input);
(
  badRootId.trust_root as Record<string, unknown>
).root_id = "voidaptr1_" + "0".repeat(64);
expectReject("tampered trust-root ID", () =>
  materializePublicAgentServiceProviderTrustRegistrySnapshotV1(
    badRootId,
    expectedTrustRootId,
  ),
);

const badRootKeyId = clone(input);
(
  badRootKeyId.trust_root as Record<string, unknown>
).key_id = "ed25519:" + "0".repeat(64);
expectReject("tampered trust-root key ID", () =>
  materializePublicAgentServiceProviderTrustRegistrySnapshotV1(
    badRootKeyId,
    expectedTrustRootId,
  ),
);

const badSnapshotId = clone(input);
(
  badSnapshotId.authentication_envelope as Record<string, unknown>
).snapshot_id = "voidapts1_" + "0".repeat(64);
expectReject("tampered snapshot ID", () =>
  materializePublicAgentServiceProviderTrustRegistrySnapshotV1(
    badSnapshotId,
    expectedTrustRootId,
  ),
);

const badAuthenticationId = clone(input);
(
  badAuthenticationId.authentication_envelope as Record<string, unknown>
).authentication_id = "voidaptsa1_" + "0".repeat(64);
expectReject("tampered snapshot authentication ID", () =>
  materializePublicAgentServiceProviderTrustRegistrySnapshotV1(
    badAuthenticationId,
    expectedTrustRootId,
  ),
);

const badSignature = clone(input);
const badSignatureEnvelope =
  badSignature.authentication_envelope as Record<string, unknown>;
const signature = String(badSignatureEnvelope.signature_base64);
badSignatureEnvelope.signature_base64 =
  (signature.startsWith("A") ? "B" : "A") + signature.slice(1);
expectReject("tampered trust snapshot signature", () =>
  materializePublicAgentServiceProviderTrustRegistrySnapshotV1(
    badSignature,
    expectedTrustRootId,
  ),
);

const duplicateProvider = clone(input);
const duplicateSnapshot =
  duplicateProvider.snapshot_body as Record<string, unknown>;
const duplicateBindings =
  duplicateSnapshot.provider_key_bindings as unknown[];
duplicateBindings.push(clone(duplicateBindings[0]));
expectReject("duplicate provider", () =>
  materializePublicAgentServiceProviderTrustRegistrySnapshotV1(
    duplicateProvider,
    expectedTrustRootId,
  ),
);

const badBindingId = clone(input);
const badBindingSnapshot =
  badBindingId.snapshot_body as Record<string, unknown>;
const badBinding =
  (
    badBindingSnapshot.provider_key_bindings as Record<string, unknown>[]
  )[0]!;
badBinding.binding_id = "voidapkb1_" + "0".repeat(64);
expectReject("tampered provider binding ID", () =>
  materializePublicAgentServiceProviderTrustRegistrySnapshotV1(
    badBindingId,
    expectedTrustRootId,
  ),
);

const bindingExpiresEarly = clone(input);
const bindingExpiresEarlySnapshot =
  bindingExpiresEarly.snapshot_body as Record<string, unknown>;
(
  (
    bindingExpiresEarlySnapshot
      .provider_key_bindings as Record<string, unknown>[]
  )[0]!
).expires_at_utc = "2030-01-01T12:00:00Z";
expectReject("binding expires before snapshot", () =>
  materializePublicAgentServiceProviderTrustRegistrySnapshotV1(
    bindingExpiresEarly,
    expectedTrustRootId,
  ),
);

const snapshotOutlivesRoot = clone(input);
(
  snapshotOutlivesRoot.snapshot_body as Record<string, unknown>
).expires_at_utc = "2030-04-01T00:00:00Z";
expectReject("snapshot outlives root", () =>
  materializePublicAgentServiceProviderTrustRegistrySnapshotV1(
    snapshotOutlivesRoot,
    expectedTrustRootId,
  ),
);

const revokedRoot = clone(input);
(
  revokedRoot.trust_root as Record<string, unknown>
).revoked_at_utc = "2030-01-01T00:00:00Z";
expectReject("root revoked before signing", () =>
  materializePublicAgentServiceProviderTrustRegistrySnapshotV1(
    revokedRoot,
    expectedTrustRootId,
  ),
);

const falseLiveClaim = clone(input);
falseLiveClaim.evidence_mode = "operator_signed_snapshot";
expectReject("example root used as live root", () =>
  materializePublicAgentServiceProviderTrustRegistrySnapshotV1(
    falseLiveClaim,
    expectedTrustRootId,
  ),
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
  root_nonce: "provider-trust-root-live-proof-0001",
};
const liveRoot = {
  ...liveRootDraft,
  root_id: providerTrustRootIdV1(liveRootDraft),
};

const liveBindingDraft: ProviderKeyBindingDraftV1 = {
  marker: PUBLIC_AGENT_SERVICE_PROVIDER_KEY_BINDING_MARKER,
  version: 1,
  binding_status: "operator_approved_snapshot",
  provider_id: "void.provider.datanet.verify.precision",
  authority_scope: "provider_quote_response_authenticate",
  key_id:
    providerQuoteResponseAuthenticationKeyIdV1(providerPublicPem),
  public_key_pem: providerPublicPem,
  valid_from_utc: "2030-01-01T00:00:00Z",
  expires_at_utc: "2030-03-01T00:00:00Z",
  revoked_at_utc: null,
  binding_nonce: "provider-key-binding-live-proof-0001",
};
const liveBinding = {
  ...liveBindingDraft,
  binding_id: providerKeyBindingIdV1(liveBindingDraft),
};

const liveSnapshotBody: ProviderTrustRegistrySnapshotBodyV1 = {
  marker:
    PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_BODY_MARKER,
  version: 1,
  snapshot_status: "operator_approved_snapshot",
  registry_id: "void.public-agent.provider-trust-registry.v1",
  sequence: 1,
  previous_snapshot_id: null,
  generated_at_utc: "2030-01-01T00:00:00Z",
  expires_at_utc: "2030-01-02T00:00:00Z",
  snapshot_nonce: "provider-trust-snapshot-live-proof-0001",
  provider_key_bindings: [liveBinding],
};
const liveSnapshotId =
  providerTrustRegistrySnapshotIdV1(liveSnapshotBody);
const liveAuthenticationBody:
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
const liveSignature = crypto.sign(
  null,
  providerTrustRegistrySnapshotSigningBytesV1(
    liveSnapshotBody,
    liveAuthenticationBody,
  ),
  generatedRoot.privateKey,
).toString("base64");
const liveAuthenticationWithoutId = {
  ...liveAuthenticationBody,
  signature_base64: liveSignature,
};
const liveInput = {
  marker:
    PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_MARKER,
  version: 1,
  evidence_mode: "operator_signed_snapshot",
  trust_root: liveRoot,
  snapshot_body: liveSnapshotBody,
  authentication_envelope: {
    ...liveAuthenticationWithoutId,
    authentication_id:
      providerTrustRegistrySnapshotAuthenticationIdV1(
        liveAuthenticationWithoutId,
      ),
  },
};
const livePacket =
  materializePublicAgentServiceProviderTrustRegistrySnapshotV1(
    liveInput,
    liveRoot.root_id,
  );
assertCondition(
  livePacket.status === "operator_signed_snapshot_verified",
  "live trust snapshot status changed",
);
assertCondition(
  livePacket.provider_authentication_gate
    .eligible_for_provider_authentication === true,
  "live trust snapshot is not authentication eligible",
);
assertCondition(
  livePacket.provider_authentication_gate.reason
    === "operator_signed_snapshot_verified",
  "live trust snapshot gate reason changed",
);
assertCondition(
  Object.values(livePacket.authority).every(
    (value) => value === false,
  ),
  "live trust snapshot granted authority",
);
const resolved =
  resolveProviderKeyBindingFromTrustRegistrySnapshotV1(
    liveInput,
    liveRoot.root_id,
    liveBinding.provider_id,
    "2030-01-01T12:00:00Z",
  );
assertCondition(
  resolved.binding_id === liveBinding.binding_id,
  "live provider resolution changed binding identity",
);
expectReject("unknown provider resolution", () =>
  resolveProviderKeyBindingFromTrustRegistrySnapshotV1(
    liveInput,
    liveRoot.root_id,
    "void.provider.unknown",
    "2030-01-01T12:00:00Z",
  ),
);
expectReject("provider resolution after snapshot expiry", () =>
  resolveProviderKeyBindingFromTrustRegistrySnapshotV1(
    liveInput,
    liveRoot.root_id,
    liveBinding.provider_id,
    "2030-01-02T00:00:00Z",
  ),
);

const schema =
  readJson(schemaPath) as Record<string, unknown>;
assertCondition(
  schema.x_void_marker
    === "VOID_PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_SCHEMA_V1",
  "trust snapshot schema marker mismatch",
);
const docs = readText(docsPath).replace(/\s+/g, " ");
const adapter = readText(adapterPath);
const proofSource = readText(proofPath);
const workflow = readText(workflowPath);
const authenticationDocs =
  readText(authenticationDocsPath).replace(/\s+/g, " ");

for (const phrase of [
  "pinned expected trust-root ID",
  "operator-signed snapshot",
  "does not approve providers",
  "does not select a provider",
  "does not publish or accept a quote",
  "does not authorize payment or execution",
]) {
  assertCondition(
    docs.includes(phrase),
    `trust snapshot docs missing: ${phrase}`,
  );
}
assertCondition(
  authenticationDocs.includes("caller-supplied trust anchor"),
  "upstream authentication trust-anchor boundary changed",
);
assertCondition(
  authenticationDocs.includes("does not create a provider registry"),
  "upstream authentication registry boundary changed",
);
for (const marker of [
  "provider_selection: false",
  "quote_publication: false",
  "quote_acceptance: false",
  "payment_authorization: false",
  "payment_execution: false",
  "work_execution_authorization: false",
  "work_dispatch: false",
  "work_credit_write: false",
  "wallet_access: false",
  "runtime_mutation: false",
  "money_movement: false",
]) {
  assertCondition(
    adapter.includes(marker),
    `adapter authority boundary missing: ${marker}`,
  );
}
assertCondition(
  proofSource.includes("generateKeyPairSync(\"ed25519\")"),
  "ephemeral live-path proof missing",
);
assertCondition(
  workflow.includes(
    "npx tsx scripts/prove_public_agent_service_provider_trust_registry_snapshot_v1.ts",
  ),
  "trust snapshot workflow proof command missing",
);

console.log(
  "marker=VOID_PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_PROOF_V1",
);
console.log(`example_snapshot_id=${packet.snapshot_id}`);
console.log(`example_trust_root_id=${packet.source.trust_root_id}`);
console.log(`example_status=${packet.status}`);
console.log(
  `example_eligible_for_provider_authentication=${packet.provider_authentication_gate.eligible_for_provider_authentication}`,
);
console.log(`live_snapshot_id=${livePacket.snapshot_id}`);
console.log(`live_trust_root_id=${livePacket.source.trust_root_id}`);
console.log(`live_status=${livePacket.status}`);
console.log(
  `live_eligible_for_provider_authentication=${livePacket.provider_authentication_gate.eligible_for_provider_authentication}`,
);
console.log(`resolved_provider_id=${resolved.provider_id}`);
console.log(`resolved_binding_id=${resolved.binding_id}`);
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
  "VOID_PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_V1_EXACT_GREEN",
);
