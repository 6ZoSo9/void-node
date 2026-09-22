import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  PUBLIC_AGENT_SERVICE_PROVIDER_KEY_BINDING_MARKER,
  providerKeyBindingIdV1,
  providerQuoteResponseAuthenticationKeyIdV1,
} from "./public_agent_service_provider_quote_response_authentication_v1.js";
import {
  PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_MARKER,
  PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_BODY_MARKER,
  PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_AUTHENTICATION_MARKER,
  PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_ROOT_MARKER,
  PROVIDER_TRUST_REGISTRY_SNAPSHOT_SIGNATURE_SCHEME,
  PROVIDER_TRUST_REGISTRY_SNAPSHOT_SIGNATURE_DOMAIN,
  PROVIDER_TRUST_REGISTRY_SNAPSHOT_CANONICALIZATION,
  providerTrustRootIdV1,
  providerTrustRegistrySnapshotIdV1,
  providerTrustRegistrySnapshotSigningBytesV1,
  providerTrustRegistrySnapshotAuthenticationIdV1,
} from "./public_agent_service_provider_trust_registry_snapshot_v1.js";
import {
  DATANET_PROMOTION_INDEPENDENT_ATTESTATION_SET_MARKER,
  DATANET_PROMOTION_INDEPENDENT_ATTESTATION_MARKER,
  DATANET_PROMOTION_INDEPENDENT_ATTESTATION_SIGNATURE_DOMAIN,
  DATANET_PROMOTION_INDEPENDENT_ATTESTATION_CANONICALIZATION,
  datanetPromotionIndependentAttestationSigningBytesV1,
  datanetPromotionIndependentAttestationIdV1,
  materializeDatanetPromotionIndependentAttestationSetV1,
  datanetPromotionCanonicalJsonV1,
} from "./datanet_promotion_independent_attestation_set_v1.js";
import {
  DATANET_PROMOTION_PUBLISHER_PROVENANCE_MARKER,
  DATANET_PROMOTION_PUBLISHER_PROVENANCE_SIGNATURE_DOMAIN,
  DATANET_PROMOTION_PUBLISHER_PROVENANCE_CANONICALIZATION,
  datanetPromotionPublisherProvenanceSigningBytesV1,
  datanetPromotionPublisherProvenanceIdV1,
  validateDatanetPromotionPublisherProvenanceV1,
  materializeDatanetPromotionPublisherSeparatedExternalEvidenceV1,
} from "./datanet_promotion_publisher_provenance_separation_v1.js";

function publicPem(key: crypto.KeyObject): string {
  return key.export({ type: "spki", format: "pem" }).toString();
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function makeProviderBinding(
  providerId: string,
  publicKey: crypto.KeyObject,
  nonce: string,
) {
  const draft = {
    marker: PUBLIC_AGENT_SERVICE_PROVIDER_KEY_BINDING_MARKER,
    version: 1 as const,
    binding_status: "operator_approved_snapshot" as const,
    provider_id: providerId,
    authority_scope: "provider_quote_response_authenticate" as const,
    key_id: providerQuoteResponseAuthenticationKeyIdV1(publicPem(publicKey)),
    public_key_pem: publicPem(publicKey),
    valid_from_utc: "2026-09-21T22:00:00Z",
    expires_at_utc: "2026-09-22T22:00:00Z",
    revoked_at_utc: null,
    binding_nonce: nonce,
  };
  return { ...draft, binding_id: providerKeyBindingIdV1(draft) };
}

function makeTrustSnapshot(
  rootKeys: crypto.KeyPairKeyObjectResult,
  bindings: ReturnType<typeof makeProviderBinding>[],
) {
  const rootDraft = {
    marker: PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_ROOT_MARKER,
    version: 1 as const,
    trust_status: "operator_pinned_trust_root" as const,
    authority_scope: "provider_trust_registry_snapshot_verify" as const,
    key_id: providerQuoteResponseAuthenticationKeyIdV1(publicPem(rootKeys.publicKey)),
    public_key_pem: publicPem(rootKeys.publicKey),
    valid_from_utc: "2026-09-21T21:00:00Z",
    expires_at_utc: "2026-09-23T00:00:00Z",
    revoked_at_utc: null,
    root_nonce: "datanet-publisher-separation-root-20260921",
  };
  const trustRoot = { ...rootDraft, root_id: providerTrustRootIdV1(rootDraft) };
  const snapshotBody = {
    marker: PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_BODY_MARKER,
    version: 1 as const,
    snapshot_status: "operator_approved_snapshot" as const,
    registry_id: "void.provider.registry.publisher-separation.v1",
    sequence: 1,
    previous_snapshot_id: null,
    generated_at_utc: "2026-09-21T22:00:00Z",
    expires_at_utc: "2026-09-22T22:00:00Z",
    snapshot_nonce: "datanet-publisher-separation-snapshot-20260921",
    provider_key_bindings: [...bindings].sort((a,b)=>a.provider_id.localeCompare(b.provider_id)),
  };
  const snapshotId = providerTrustRegistrySnapshotIdV1(snapshotBody);
  const authBody = {
    marker: PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_AUTHENTICATION_MARKER,
    version: 1 as const,
    signature_scheme: PROVIDER_TRUST_REGISTRY_SNAPSHOT_SIGNATURE_SCHEME,
    signature_domain: PROVIDER_TRUST_REGISTRY_SNAPSHOT_SIGNATURE_DOMAIN,
    canonicalization: PROVIDER_TRUST_REGISTRY_SNAPSHOT_CANONICALIZATION,
    snapshot_id: snapshotId,
    trust_root_id: trustRoot.root_id,
    key_id: trustRoot.key_id,
    signed_at_utc: "2026-09-21T22:01:00Z",
  };
  const signatureBase64 = crypto.sign(
    null,
    providerTrustRegistrySnapshotSigningBytesV1(snapshotBody, authBody),
    rootKeys.privateKey,
  ).toString("base64");
  return {
    marker: PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_MARKER,
    version: 1 as const,
    evidence_mode: "operator_signed_snapshot" as const,
    trust_root: trustRoot,
    snapshot_body: snapshotBody,
    authentication_envelope: {
      ...authBody,
      signature_base64: signatureBase64,
      authentication_id: providerTrustRegistrySnapshotAuthenticationIdV1({
        ...authBody,
        signature_base64: signatureBase64,
      }),
    },
  };
}

function makeAttestation(
  kind: "corroboration" | "reproducibility",
  providerId: string,
  binding: ReturnType<typeof makeProviderBinding>,
  privateKey: crypto.KeyObject,
  index: number,
  objectId: string,
  contentSha256: string,
  byteLength: number,
) {
  const body = {
    marker: DATANET_PROMOTION_INDEPENDENT_ATTESTATION_MARKER,
    version: 1 as const,
    kind,
    provider_id: providerId,
    provider_key_binding_id: binding.binding_id,
    signing_key_id: binding.key_id,
    object_id: objectId,
    content_sha256: contentSha256,
    byte_length: byteLength,
    attested_at_utc: `2026-09-21T22:2${index}:00Z`,
    verification_run_id: `void.datanet.publisher-separation.verify.${index}`,
    evidence_sha256: sha256(`publisher-separation-evidence-${index}`),
    exact_bytes_verified: true,
    conflict_detected: false,
    replay_verified: kind === "reproducibility",
    signature_scheme: "ed25519" as const,
    signature_domain: DATANET_PROMOTION_INDEPENDENT_ATTESTATION_SIGNATURE_DOMAIN,
    canonicalization: DATANET_PROMOTION_INDEPENDENT_ATTESTATION_CANONICALIZATION,
    nonce: `publisher-separation-attestation-${index}-20260921`,
  };
  const signatureBase64 = crypto.sign(
    null,
    datanetPromotionIndependentAttestationSigningBytesV1(body),
    privateKey,
  ).toString("base64");
  const withoutId = { ...body, signature_base64: signatureBase64 };
  return {
    ...withoutId,
    attestation_id: datanetPromotionIndependentAttestationIdV1(withoutId),
  };
}

function makeProvenance(
  publisherKeys: crypto.KeyPairKeyObjectResult,
  localReceipt: Record<string, unknown>,
) {
  const publicKeyPem = publicPem(publisherKeys.publicKey);
  const keyId = providerQuoteResponseAuthenticationKeyIdV1(publicKeyPem);
  const body = {
    marker: DATANET_PROMOTION_PUBLISHER_PROVENANCE_MARKER,
    version: 1 as const,
    publisher_subject_id: "void.publisher.local-data-drop.precision",
    publisher_key_id: keyId,
    publisher_public_key_pem: publicKeyPem,
    object_id: localReceipt.object_id,
    content_sha256: localReceipt.sha256,
    byte_length: localReceipt.bytes,
    imported_at_utc: localReceipt.imported_at,
    local_receipt_sha256: sha256(datanetPromotionCanonicalJsonV1(localReceipt)),
    signature_scheme: "ed25519" as const,
    signature_domain: DATANET_PROMOTION_PUBLISHER_PROVENANCE_SIGNATURE_DOMAIN,
    canonicalization: DATANET_PROMOTION_PUBLISHER_PROVENANCE_CANONICALIZATION,
    signed_at_utc: "2026-09-21T22:20:00Z",
    nonce: "publisher-provenance-precision-20260921-0001",
    authority: {
      evidence_only: true,
      chain2050_write_authorized: false,
      datanet_mutation_authorized: false,
      validator_authority_granted: false,
      governance_mutation_authorized: false,
      signer_or_wallet_access: false,
      work_credit_award_authorized: false,
      runtime_service_action: false,
      funds_action: false,
    },
  };
  const signatureBase64 = crypto.sign(
    null,
    datanetPromotionPublisherProvenanceSigningBytesV1(body),
    publisherKeys.privateKey,
  ).toString("base64");
  const withoutId = { ...body, signature_base64: signatureBase64 };
  return {
    ...withoutId,
    publisher_provenance_id:
      datanetPromotionPublisherProvenanceIdV1(withoutId),
  };
}

function makeSet(
  trustInput: ReturnType<typeof makeTrustSnapshot>,
  providerKeys: crypto.KeyPairKeyObjectResult[],
  bindings: ReturnType<typeof makeProviderBinding>[],
  providerIds: string[],
  objectId: string,
  contentSha256: string,
  byteLength: number,
) {
  return {
    marker: DATANET_PROMOTION_INDEPENDENT_ATTESTATION_SET_MARKER,
    version: 1,
    object: {
      object_id: objectId,
      content_sha256: contentSha256,
      byte_length: byteLength,
    },
    trust_snapshot_id: trustInput.authentication_envelope.snapshot_id,
    attestations: [
      makeAttestation("corroboration", providerIds[0]!, bindings[0]!, providerKeys[0]!.privateKey, 1, objectId, contentSha256, byteLength),
      makeAttestation("corroboration", providerIds[1]!, bindings[1]!, providerKeys[1]!.privateKey, 2, objectId, contentSha256, byteLength),
      makeAttestation("reproducibility", providerIds[2]!, bindings[2]!, providerKeys[2]!.privateKey, 3, objectId, contentSha256, byteLength),
    ],
    authority: {
      evidence_only: true,
      chain2050_write_authorized: false,
      validator_authority_granted: false,
      governance_mutation_authorized: false,
      signer_or_wallet_access: false,
      work_credit_award_authorized: false,
      runtime_service_action: false,
      funds_action: false,
    },
  };
}

function expectReject(label: string, fn: () => unknown, pattern: RegExp): void {
  assert.throws(fn, pattern, label);
}

const localReceipt = {
  marker: "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_RECEIPT_LEDGER_V1",
  object_id: "publisher-separation-demo.bin",
  bytes: 2048,
  sha256: "c".repeat(64),
  imported_at: "2026-09-21T22:10:00Z",
  storage_class: "operator_local_public_read_only",
  public_upload: false,
  operator_local_import_only: true,
  trusted_as_network_truth: false,
};

const publisherKeys = crypto.generateKeyPairSync("ed25519");
const provenance = makeProvenance(publisherKeys, localReceipt);
const expectedPublisherKeyId = provenance.publisher_key_id;

const publisherVerified = validateDatanetPromotionPublisherProvenanceV1(
  localReceipt,
  expectedPublisherKeyId,
  provenance,
);
assert.equal(publisherVerified.object_id, localReceipt.object_id);
assert.equal(publisherVerified.content_sha256, localReceipt.sha256);

const rootKeys = crypto.generateKeyPairSync("ed25519");
const providerKeys = [
  crypto.generateKeyPairSync("ed25519"),
  crypto.generateKeyPairSync("ed25519"),
  crypto.generateKeyPairSync("ed25519"),
];
const providerIds = [
  "void.provider.publisher-separation.alpha",
  "void.provider.publisher-separation.beta",
  "void.provider.publisher-separation.gamma",
];
const bindings = providerKeys.map((keys, index) =>
  makeProviderBinding(
    providerIds[index]!,
    keys.publicKey,
    `publisher-separation-provider-${index + 1}-20260921`,
  )
);
const trustInput = makeTrustSnapshot(rootKeys, bindings);
const setInput = makeSet(
  trustInput,
  providerKeys,
  bindings,
  providerIds,
  localReceipt.object_id,
  localReceipt.sha256,
  localReceipt.bytes,
);

const green = materializeDatanetPromotionPublisherSeparatedExternalEvidenceV1(
  localReceipt,
  expectedPublisherKeyId,
  provenance,
  trustInput,
  trustInput.trust_root.root_id,
  setInput,
);
assert.match(green.publisher_provenance_id, /^voiddppp1_[0-9a-f]{64}$/);
assert.match(green.attestation_set_id, /^voiddpias1_[0-9a-f]{64}$/);
assert.equal(
  (green.external_evidence.authority as Record<string, unknown>).chain2050_write_authorized,
  false,
);

const badSignature = clone(provenance);
badSignature.signature_base64 =
  crypto.sign(
    null,
    datanetPromotionPublisherProvenanceSigningBytesV1(badSignature),
    providerKeys[0]!.privateKey,
  ).toString("base64");
badSignature.publisher_provenance_id =
  datanetPromotionPublisherProvenanceIdV1(
    Object.fromEntries(
      Object.entries(badSignature).filter(
        ([key]) => key !== "publisher_provenance_id",
      ),
    ),
  );
expectReject(
  "publisher signature",
  () => validateDatanetPromotionPublisherProvenanceV1(
    localReceipt,
    expectedPublisherKeyId,
    badSignature,
  ),
  /signature invalid/,
);

expectReject(
  "publisher pin",
  () => validateDatanetPromotionPublisherProvenanceV1(
    localReceipt,
    "ed25519:" + "f".repeat(64),
    provenance,
  ),
  /separately pinned expected key/,
);

const wrongObjectReceipt = clone(localReceipt);
wrongObjectReceipt.sha256 = "d".repeat(64);
expectReject(
  "publisher receipt mismatch",
  () => validateDatanetPromotionPublisherProvenanceV1(
    wrongObjectReceipt,
    expectedPublisherKeyId,
    provenance,
  ),
  /content_sha256 mismatch|local_receipt_sha256 mismatch/,
);

const authorityEscalation = clone(provenance);
authorityEscalation.authority.chain2050_write_authorized = true;
const authorityBody = Object.fromEntries(
  Object.entries(authorityEscalation).filter(
    ([key]) => key !== "signature_base64" && key !== "publisher_provenance_id",
  ),
);
authorityEscalation.signature_base64 = crypto.sign(
  null,
  datanetPromotionPublisherProvenanceSigningBytesV1(authorityBody),
  publisherKeys.privateKey,
).toString("base64");
authorityEscalation.publisher_provenance_id =
  datanetPromotionPublisherProvenanceIdV1(
    Object.fromEntries(
      Object.entries(authorityEscalation).filter(
        ([key]) => key !== "publisher_provenance_id",
      ),
    ),
  );
expectReject(
  "publisher authority escalation",
  () => validateDatanetPromotionPublisherProvenanceV1(
    localReceipt,
    expectedPublisherKeyId,
    authorityEscalation,
  ),
  /chain2050_write_authorized must be false/,
);

const collidingProviderKeys = [
  { publicKey: publisherKeys.publicKey, privateKey: publisherKeys.privateKey },
  crypto.generateKeyPairSync("ed25519"),
  crypto.generateKeyPairSync("ed25519"),
] as crypto.KeyPairKeyObjectResult[];
const collidingProviderIds = [
  "void.provider.publisher-separation.colliding",
  "void.provider.publisher-separation.delta",
  "void.provider.publisher-separation.epsilon",
];
const collidingBindings = collidingProviderKeys.map((keys, index) =>
  makeProviderBinding(
    collidingProviderIds[index]!,
    keys.publicKey,
    `publisher-collision-provider-${index + 1}-20260921`,
  )
);
const collidingTrust = makeTrustSnapshot(
  crypto.generateKeyPairSync("ed25519"),
  collidingBindings,
);
const collidingSet = makeSet(
  collidingTrust,
  collidingProviderKeys,
  collidingBindings,
  collidingProviderIds,
  localReceipt.object_id,
  localReceipt.sha256,
  localReceipt.bytes,
);
const standalone = materializeDatanetPromotionIndependentAttestationSetV1(
  collidingTrust,
  collidingTrust.trust_root.root_id,
  collidingSet,
);
assert.ok(standalone.provider_key_ids.includes(expectedPublisherKeyId));

expectReject(
  "publisher/attester key collision",
  () => materializeDatanetPromotionPublisherSeparatedExternalEvidenceV1(
    localReceipt,
    expectedPublisherKeyId,
    provenance,
    collidingTrust,
    collidingTrust.trust_root.root_id,
    collidingSet,
  ),
  /collides with publisher signing key/,
);

console.log("VOID_DATANET_PROMOTION_PUBLISHER_SEPARATION_V1_PROOF_GREEN");
console.log("publisher_signature_verified=true");
console.log("publisher_key_pin_verified=true");
console.log("local_receipt_identity_bound=true");
console.log("publisher_object_identity_bound=true");
console.log("publisher_attester_key_separation_verified=true");
console.log("bad_publisher_signature_rejected=true");
console.log("wrong_publisher_pin_rejected=true");
console.log("publisher_receipt_mismatch_rejected=true");
console.log("publisher_authority_escalation_rejected=true");
console.log("publisher_attester_key_collision_rejected=true");
console.log("publisher_private_key_access=false");
console.log("chain2050_write_authorized=false");
console.log("datanet_mutation_authorized=false");
console.log("validator_authority_granted=false");
console.log("automatic_promotion=false");
