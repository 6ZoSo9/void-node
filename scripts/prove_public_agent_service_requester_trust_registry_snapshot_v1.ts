import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  canonicalJson,
} from "./agent_paid_work_order_envelope_v1.js";
import {
  PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_KEY_BINDING_MARKER,
  PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_SCOPE,
  requesterAcceptanceAuthenticationKeyIdV1,
  requesterAcceptanceKeyBindingIdV1,
  type RequesterAcceptanceKeyBindingDraftV1,
} from "./public_agent_service_requester_acceptance_authentication_v1.js";
import {
  PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_REGISTRY_SNAPSHOT_AUTHENTICATION_MARKER,
  PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_REGISTRY_SNAPSHOT_BODY_MARKER,
  PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_REGISTRY_SNAPSHOT_MARKER,
  PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_ROOT_MARKER,
  REQUESTER_TRUST_REGISTRY_SNAPSHOT_CANONICALIZATION,
  REQUESTER_TRUST_REGISTRY_SNAPSHOT_SIGNATURE_DOMAIN,
  REQUESTER_TRUST_REGISTRY_SNAPSHOT_SIGNATURE_SCHEME,
  materializePublicAgentServiceRequesterTrustRegistrySnapshotV1,
  requesterTrustRegistrySnapshotAuthenticationIdV1,
  requesterTrustRegistrySnapshotIdV1,
  requesterTrustRegistrySnapshotSigningBytesV1,
  requesterTrustRootIdV1,
  resolveRequesterKeyBindingFromTrustRegistrySnapshotV1,
  verifyPublicAgentServiceRequesterTrustRegistrySnapshotV1,
  type RequesterTrustRegistrySnapshotAuthenticationBodyV1,
  type RequesterTrustRegistrySnapshotBodyV1,
  type RequesterTrustRootDraftV1,
} from "./public_agent_service_requester_trust_registry_snapshot_v1.js";

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
  const resolved = path.resolve(relative);
  const fileStat = fs.lstatSync(resolved);
  assertCondition(
    !fileStat.isSymbolicLink(),
    `symlink forbidden: ${relative}`,
  );
  assertCondition(
    fileStat.isFile(),
    `regular file required: ${relative}`,
  );
  return JSON.parse(
    fs.readFileSync(resolved, "utf8"),
  ) as unknown;
}

function readText(relative: string): string {
  const resolved = path.resolve(relative);
  const fileStat = fs.lstatSync(resolved);
  assertCondition(
    !fileStat.isSymbolicLink(),
    `symlink forbidden: ${relative}`,
  );
  assertCondition(
    fileStat.isFile(),
    `regular file required: ${relative}`,
  );
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
  assertCondition(
    rejected,
    `${label} was not rejected`,
  );
}

const examplePath =
  "examples/public-agent-service-requester-trust-registry-snapshot-v1.example.json";
const schemaPath =
  "schemas/public-agent-service-requester-trust-registry-snapshot-v1.schema.json";
const docsPath =
  "docs/public-agent/public-agent-service-requester-trust-registry-snapshot-v1.md";
const adapterPath =
  "scripts/public_agent_service_requester_trust_registry_snapshot_v1.ts";
const proofPath =
  "scripts/prove_public_agent_service_requester_trust_registry_snapshot_v1.ts";
const workflowPath =
  ".github/workflows/public-agent-service-requester-trust-registry-snapshot-v1.yml";
const requesterAuthenticationDocsPath =
  "docs/public-agent/public-agent-service-requester-acceptance-authentication-v1.md";
const trustedRequesterDocsPath =
  "docs/public-agent/public-agent-service-trusted-requester-acceptance-verification-v1.md";

const input =
  readJson(examplePath) as Record<string, unknown>;
const trustRoot =
  input.trust_root as Record<string, unknown>;
const expectedTrustRootId =
  String(trustRoot.root_id);
const packet =
  materializePublicAgentServiceRequesterTrustRegistrySnapshotV1(
    input,
    expectedTrustRootId,
  );

assertCondition(
  packet.status === "example_only",
  "example requester snapshot status changed",
);
assertCondition(
  packet.requester_authentication_gate
    .eligible_for_requester_authentication
    === false,
  "example requester snapshot became live eligible",
);
assertCondition(
  packet.requester_authentication_gate.reason
    === "example_fixture_not_live_trust",
  "example requester snapshot reason changed",
);
assertCondition(
  packet.source.requester_count === 1,
  "example requester count changed",
);
assertCondition(
  Object.values(packet.authority).every(
    (value) => value === false,
  ),
  "example requester snapshot granted authority",
);
verifyPublicAgentServiceRequesterTrustRegistrySnapshotV1(
  input,
  expectedTrustRootId,
  packet,
);

const reorderedInput = {
  authentication_envelope:
    input.authentication_envelope,
  snapshot_body: input.snapshot_body,
  trust_root: input.trust_root,
  evidence_mode: input.evidence_mode,
  version: input.version,
  marker: input.marker,
};
const reordered =
  materializePublicAgentServiceRequesterTrustRegistrySnapshotV1(
    reorderedInput,
    expectedTrustRootId,
  );
assertCondition(
  canonicalJson(reordered)
    === canonicalJson(packet),
  "top-level key order changed requester snapshot packet",
);

expectReject("wrong expected trust root", () =>
  materializePublicAgentServiceRequesterTrustRegistrySnapshotV1(
    input,
    "voidartr1_" + "0".repeat(64),
  ),
);

const badRootId = clone(input);
(
  badRootId.trust_root as Record<string, unknown>
).root_id = "voidartr1_" + "0".repeat(64);
expectReject("tampered requester trust-root ID", () =>
  materializePublicAgentServiceRequesterTrustRegistrySnapshotV1(
    badRootId,
    expectedTrustRootId,
  ),
);

const badRootKeyId = clone(input);
(
  badRootKeyId.trust_root as Record<string, unknown>
).key_id = "ed25519:" + "0".repeat(64);
expectReject("tampered requester trust-root key ID", () =>
  materializePublicAgentServiceRequesterTrustRegistrySnapshotV1(
    badRootKeyId,
    expectedTrustRootId,
  ),
);

const badSnapshotId = clone(input);
const badSnapshotEnvelope =
  badSnapshotId.authentication_envelope as Record<string, unknown>;
badSnapshotEnvelope.snapshot_id =
  "voidarts1_" + "0".repeat(64);
expectReject("tampered requester snapshot ID", () =>
  materializePublicAgentServiceRequesterTrustRegistrySnapshotV1(
    badSnapshotId,
    expectedTrustRootId,
  ),
);

const badAuthenticationId = clone(input);
const badAuthenticationEnvelope =
  badAuthenticationId.authentication_envelope as Record<string, unknown>;
badAuthenticationEnvelope.authentication_id =
  "voidartsa1_" + "0".repeat(64);
expectReject(
  "tampered requester snapshot authentication ID",
  () =>
    materializePublicAgentServiceRequesterTrustRegistrySnapshotV1(
      badAuthenticationId,
      expectedTrustRootId,
    ),
);

const badSignature = clone(input);
const badSignatureEnvelope =
  badSignature.authentication_envelope as Record<string, unknown>;
const signature =
  String(badSignatureEnvelope.signature_base64);
badSignatureEnvelope.signature_base64 =
  (signature.startsWith("A") ? "B" : "A")
  + signature.slice(1);
expectReject("tampered requester snapshot signature", () =>
  materializePublicAgentServiceRequesterTrustRegistrySnapshotV1(
    badSignature,
    expectedTrustRootId,
  ),
);

const duplicateRequester = clone(input);
const duplicateSnapshot =
  duplicateRequester.snapshot_body as Record<string, unknown>;
const duplicateBindings =
  duplicateSnapshot.requester_key_bindings as unknown[];
duplicateBindings.push(
  clone(duplicateBindings[0]),
);
expectReject("duplicate requester", () =>
  materializePublicAgentServiceRequesterTrustRegistrySnapshotV1(
    duplicateRequester,
    expectedTrustRootId,
  ),
);

const badBindingId = clone(input);
const badBindingSnapshot =
  badBindingId.snapshot_body as Record<string, unknown>;
const badBindings =
  badBindingSnapshot.requester_key_bindings as Record<string, unknown>[];
const badBinding = badBindings[0]!;
badBinding.binding_id =
  "voidarkb1_" + "0".repeat(64);
expectReject("tampered requester binding ID", () =>
  materializePublicAgentServiceRequesterTrustRegistrySnapshotV1(
    badBindingId,
    expectedTrustRootId,
  ),
);

const bindingExpiresEarly = clone(input);
const bindingExpiresEarlySnapshot =
  bindingExpiresEarly.snapshot_body as Record<string, unknown>;
const bindingExpiresEarlyBindings =
  bindingExpiresEarlySnapshot.requester_key_bindings as Record<string, unknown>[];
bindingExpiresEarlyBindings[0]!.expires_at_utc =
  "2030-01-01T12:00:00Z";
expectReject("requester binding expires before snapshot", () =>
  materializePublicAgentServiceRequesterTrustRegistrySnapshotV1(
    bindingExpiresEarly,
    expectedTrustRootId,
  ),
);

const snapshotOutlivesRoot = clone(input);
const snapshotOutlivesRootBody =
  snapshotOutlivesRoot.snapshot_body as Record<string, unknown>;
snapshotOutlivesRootBody.expires_at_utc =
  "2031-02-01T00:00:00Z";
expectReject("requester snapshot outlives root", () =>
  materializePublicAgentServiceRequesterTrustRegistrySnapshotV1(
    snapshotOutlivesRoot,
    expectedTrustRootId,
  ),
);

const revokedRoot = clone(input);
const revokedRootBody =
  revokedRoot.trust_root as Record<string, unknown>;
revokedRootBody.revoked_at_utc =
  "2030-01-01T00:00:00Z";
expectReject("requester root revoked before signing", () =>
  materializePublicAgentServiceRequesterTrustRegistrySnapshotV1(
    revokedRoot,
    expectedTrustRootId,
  ),
);

const falseLiveClaim = clone(input);
falseLiveClaim.evidence_mode =
  "operator_signed_snapshot";
expectReject("example requester root used as live root", () =>
  materializePublicAgentServiceRequesterTrustRegistrySnapshotV1(
    falseLiveClaim,
    expectedTrustRootId,
  ),
);

const generatedRoot =
  crypto.generateKeyPairSync("ed25519");
const generatedRequester =
  crypto.generateKeyPairSync("ed25519");
const rootPublicPem =
  generatedRoot.publicKey.export({
    format: "pem",
    type: "spki",
  }).toString();
const requesterPublicPem =
  generatedRequester.publicKey.export({
    format: "pem",
    type: "spki",
  }).toString();

const liveRootDraft: RequesterTrustRootDraftV1 = {
  marker:
    PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_ROOT_MARKER,
  version: 1,
  trust_status:
    "operator_pinned_trust_root",
  authority_scope:
    "requester_trust_registry_snapshot_verify",
  key_id:
    requesterAcceptanceAuthenticationKeyIdV1(
      rootPublicPem,
    ),
  public_key_pem: rootPublicPem,
  valid_from_utc:
    "2030-01-01T00:00:00Z",
  expires_at_utc:
    "2031-01-01T00:00:00Z",
  revoked_at_utc: null,
  root_nonce:
    "requester-trust-root-live-proof-0001",
};
const liveRoot = {
  ...liveRootDraft,
  root_id:
    requesterTrustRootIdV1(
      liveRootDraft,
    ),
};

const liveBindingDraft:
  RequesterAcceptanceKeyBindingDraftV1 = {
    marker:
      PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_KEY_BINDING_MARKER,
    version: 1,
    binding_status:
      "operator_approved_snapshot",
    requester_agent_id:
      "agent.example.researcher",
    authority_scope:
      PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_SCOPE,
    key_id:
      requesterAcceptanceAuthenticationKeyIdV1(
        requesterPublicPem,
      ),
    public_key_pem:
      requesterPublicPem,
    valid_from_utc:
      "2030-01-01T00:00:00Z",
    expires_at_utc:
      "2030-03-01T00:00:00Z",
    revoked_at_utc:
      null,
    binding_nonce:
      "requester-key-binding-live-proof-0001",
  };
const liveBinding = {
  ...liveBindingDraft,
  binding_id:
    requesterAcceptanceKeyBindingIdV1(
      liveBindingDraft,
    ),
};

const liveSnapshotBody:
  RequesterTrustRegistrySnapshotBodyV1 = {
    marker:
      PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_REGISTRY_SNAPSHOT_BODY_MARKER,
    version: 1,
    snapshot_status:
      "operator_approved_snapshot",
    registry_id:
      "void.public-agent.requester-trust-registry.v1",
    sequence: 1,
    previous_snapshot_id: null,
    generated_at_utc:
      "2030-01-01T00:00:00Z",
    expires_at_utc:
      "2030-01-02T00:00:00Z",
    snapshot_nonce:
      "requester-trust-snapshot-live-proof-0001",
    requester_key_bindings:
      [liveBinding],
  };
const liveSnapshotId =
  requesterTrustRegistrySnapshotIdV1(
    liveSnapshotBody,
  );
const liveAuthenticationBody:
  RequesterTrustRegistrySnapshotAuthenticationBodyV1 = {
    marker:
      PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_REGISTRY_SNAPSHOT_AUTHENTICATION_MARKER,
    version: 1,
    signature_scheme:
      REQUESTER_TRUST_REGISTRY_SNAPSHOT_SIGNATURE_SCHEME,
    signature_domain:
      REQUESTER_TRUST_REGISTRY_SNAPSHOT_SIGNATURE_DOMAIN,
    canonicalization:
      REQUESTER_TRUST_REGISTRY_SNAPSHOT_CANONICALIZATION,
    snapshot_id:
      liveSnapshotId,
    trust_root_id:
      liveRoot.root_id,
    key_id:
      liveRoot.key_id,
    signed_at_utc:
      "2030-01-01T00:00:00Z",
  };
const liveSignature =
  crypto.sign(
    null,
    requesterTrustRegistrySnapshotSigningBytesV1(
      liveSnapshotBody,
      liveAuthenticationBody,
    ),
    generatedRoot.privateKey,
  ).toString("base64");
const liveAuthenticationWithoutId = {
  ...liveAuthenticationBody,
  signature_base64:
    liveSignature,
};
const liveInput = {
  marker:
    PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_REGISTRY_SNAPSHOT_MARKER,
  version: 1,
  evidence_mode:
    "operator_signed_snapshot",
  trust_root:
    liveRoot,
  snapshot_body:
    liveSnapshotBody,
  authentication_envelope: {
    ...liveAuthenticationWithoutId,
    authentication_id:
      requesterTrustRegistrySnapshotAuthenticationIdV1(
        liveAuthenticationWithoutId,
      ),
  },
};
const livePacket =
  materializePublicAgentServiceRequesterTrustRegistrySnapshotV1(
    liveInput,
    liveRoot.root_id,
  );

assertCondition(
  livePacket.status
    === "operator_signed_snapshot_verified",
  "live requester snapshot status changed",
);
assertCondition(
  livePacket.requester_authentication_gate
    .eligible_for_requester_authentication
    === true,
  "live requester snapshot is not authentication eligible",
);
assertCondition(
  livePacket.requester_authentication_gate.reason
    === "operator_signed_snapshot_verified",
  "live requester snapshot gate reason changed",
);
assertCondition(
  Object.values(livePacket.authority).every(
    (value) => value === false,
  ),
  "live requester snapshot granted authority",
);

const resolved =
  resolveRequesterKeyBindingFromTrustRegistrySnapshotV1(
    liveInput,
    liveRoot.root_id,
    liveBinding.requester_agent_id,
    "2030-01-01T12:00:00Z",
  );
assertCondition(
  resolved.binding_id
    === liveBinding.binding_id,
  "live requester resolution changed binding identity",
);
expectReject("unknown requester resolution", () =>
  resolveRequesterKeyBindingFromTrustRegistrySnapshotV1(
    liveInput,
    liveRoot.root_id,
    "agent.example.unknown",
    "2030-01-01T12:00:00Z",
  ),
);
expectReject(
  "requester resolution after snapshot expiry",
  () =>
    resolveRequesterKeyBindingFromTrustRegistrySnapshotV1(
      liveInput,
      liveRoot.root_id,
      liveBinding.requester_agent_id,
      "2030-01-02T00:00:00Z",
    ),
);

const schema =
  readJson(schemaPath) as Record<string, unknown>;
assertCondition(
  schema.x_void_marker
    === "VOID_PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_REGISTRY_SNAPSHOT_SCHEMA_V1",
  "requester trust snapshot schema marker mismatch",
);
const docs =
  readText(docsPath).replace(/\s+/g, " ");
const adapter =
  readText(adapterPath);
const proofSource =
  readText(proofPath);
const workflow =
  readText(workflowPath);
const requesterAuthenticationDocs =
  readText(
    requesterAuthenticationDocsPath,
  ).replace(/\s+/g, " ");
const trustedRequesterDocs =
  readText(
    trustedRequesterDocsPath,
  ).replace(/\s+/g, " ");

for (const phrase of [
  "pinned expected requester trust-root ID",
  "operator-signed requester snapshot",
  "does not approve requesters",
  "does not authenticate a requester",
  "does not consume authentication IDs",
  "does not accept a quote",
  "does not authorize payment or execution",
]) {
  assertCondition(
    docs.includes(phrase),
    `requester trust snapshot docs missing: ${phrase}`,
  );
}
const requesterAuthenticationSource =
  readText(
    "scripts/public_agent_service_requester_acceptance_authentication_v1.ts",
  );
assertCondition(
  requesterAuthenticationSource.includes(
    "binding.binding_status",
  )
    && requesterAuthenticationSource.includes(
      "\"operator_approved_snapshot\"",
    )
    && requesterAuthenticationSource.includes(
      "external requester evidence requires approved key binding snapshot",
    ),
  "requester authentication approved-binding boundary changed",
);
assertCondition(
  trustedRequesterDocs.includes(
    "requester binding provenance",
  ),
  "trusted requester provenance boundary changed",
);
for (const marker of [
  "requester_authentication: false",
  "requester_authentication_replay_write: false",
  "authentication_id_consumption: false",
  "acceptance_id_consumption: false",
  "acceptance_creation: false",
  "quote_acceptance: false",
  "payment_authorization: false",
  "payment_execution: false",
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
  proofSource.includes(
    'generateKeyPairSync("ed25519")',
  ),
  "ephemeral live requester proof missing",
);
assertCondition(
  workflow.includes(
    "npx tsx scripts/prove_public_agent_service_requester_trust_registry_snapshot_v1.ts",
  ),
  "requester trust snapshot workflow proof command missing",
);

console.log(
  "marker=VOID_PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_REGISTRY_SNAPSHOT_PROOF_V1",
);
console.log(
  `example_snapshot_id=${packet.snapshot_id}`,
);
console.log(
  `example_trust_root_id=${packet.source.trust_root_id}`,
);
console.log(
  `example_status=${packet.status}`,
);
console.log(
  `example_eligible_for_requester_authentication=${packet.requester_authentication_gate.eligible_for_requester_authentication}`,
);
console.log(
  `live_snapshot_id=${livePacket.snapshot_id}`,
);
console.log(
  `live_trust_root_id=${livePacket.source.trust_root_id}`,
);
console.log(
  `live_status=${livePacket.status}`,
);
console.log(
  `live_eligible_for_requester_authentication=${livePacket.requester_authentication_gate.eligible_for_requester_authentication}`,
);
console.log(
  `resolved_requester_agent_id=${resolved.requester_agent_id}`,
);
console.log(
  `resolved_binding_id=${resolved.binding_id}`,
);
console.log("requester_authentication=false");
console.log(
  "requester_authentication_replay_write=false",
);
console.log(
  "provider_authentication_replay_write=false",
);
console.log(
  "authentication_id_consumption=false",
);
console.log("acceptance_id_consumption=false");
console.log("acceptance_creation=false");
console.log("quote_acceptance=false");
console.log("payment_authorization=false");
console.log("payment_execution=false");
console.log(
  "work_execution_authorization=false",
);
console.log("work_dispatch=false");
console.log("work_credit_write=false");
console.log("wallet_access=false");
console.log("runtime_mutation=false");
console.log("money_movement=false");
console.log(
  "VOID_PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_REGISTRY_SNAPSHOT_V1_EXACT_GREEN",
);
