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
  datanetPromotionCanonicalJsonV1,
  materializeDatanetPromotionIndependentAttestationSetV1,
} from "./datanet_promotion_independent_attestation_set_v1.js";

function publicPem(key: crypto.KeyObject): string {
  return key.export({ type: "spki", format: "pem" }).toString();
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
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
  return {
    ...draft,
    binding_id: providerKeyBindingIdV1(draft),
  };
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
    key_id: providerQuoteResponseAuthenticationKeyIdV1(
      publicPem(rootKeys.publicKey),
    ),
    public_key_pem: publicPem(rootKeys.publicKey),
    valid_from_utc: "2026-09-21T21:00:00Z",
    expires_at_utc: "2026-09-23T00:00:00Z",
    revoked_at_utc: null,
    root_nonce: "datanet-promotion-trust-root-20260921-0001",
  };
  const trustRoot = {
    ...rootDraft,
    root_id: providerTrustRootIdV1(rootDraft),
  };
  const snapshotBody = {
    marker: PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_BODY_MARKER,
    version: 1 as const,
    snapshot_status: "operator_approved_snapshot" as const,
    registry_id: "void.provider.registry.datanet-promotion.v1",
    sequence: 1,
    previous_snapshot_id: null,
    generated_at_utc: "2026-09-21T22:00:00Z",
    expires_at_utc: "2026-09-22T22:00:00Z",
    snapshot_nonce: "datanet-promotion-trust-snapshot-20260921-0001",
    provider_key_bindings: [...bindings].sort((a, b) =>
      a.provider_id.localeCompare(b.provider_id)
    ),
  };
  const snapshotId = providerTrustRegistrySnapshotIdV1(snapshotBody);
  const authBody = {
    marker:
      PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_AUTHENTICATION_MARKER,
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
  const authenticationEnvelope = {
    ...authBody,
    signature_base64: signatureBase64,
    authentication_id:
      providerTrustRegistrySnapshotAuthenticationIdV1({
        ...authBody,
        signature_base64: signatureBase64,
      }),
  };
  return {
    marker: PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_MARKER,
    version: 1 as const,
    evidence_mode: "operator_signed_snapshot" as const,
    trust_root: trustRoot,
    snapshot_body: snapshotBody,
    authentication_envelope: authenticationEnvelope,
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
    attested_at_utc: `2026-09-21T22:1${index}:00Z`,
    verification_run_id: `void.datanet.promotion.verify.${index}.20260921`,
    evidence_sha256: sha256(`evidence-${providerId}-${kind}`),
    exact_bytes_verified: true,
    conflict_detected: false,
    replay_verified: kind === "reproducibility",
    signature_scheme: "ed25519" as const,
    signature_domain:
      DATANET_PROMOTION_INDEPENDENT_ATTESTATION_SIGNATURE_DOMAIN,
    canonicalization:
      DATANET_PROMOTION_INDEPENDENT_ATTESTATION_CANONICALIZATION,
    nonce: `datanet-promotion-attestation-${index}-20260921`,
  };
  const signatureBase64 = crypto.sign(
    null,
    datanetPromotionIndependentAttestationSigningBytesV1(body),
    privateKey,
  ).toString("base64");
  const withoutId = {
    ...body,
    signature_base64: signatureBase64,
  };
  return {
    ...withoutId,
    attestation_id:
      datanetPromotionIndependentAttestationIdV1(withoutId),
  };
}

function evidenceMaterialHash(record: Record<string, unknown>): string {
  const { evidence_sha256: _ignored, ...material } = record;
  return sha256(datanetPromotionCanonicalJsonV1(material));
}

function expectReject(
  label: string,
  fn: () => unknown,
  pattern: RegExp,
): void {
  assert.throws(fn, pattern, label);
}

const rootKeys = crypto.generateKeyPairSync("ed25519");
const providerKeys = [
  crypto.generateKeyPairSync("ed25519"),
  crypto.generateKeyPairSync("ed25519"),
  crypto.generateKeyPairSync("ed25519"),
];
const providerIds = [
  "void.provider.datanet.corroborator.alpha",
  "void.provider.datanet.corroborator.beta",
  "void.provider.datanet.reproducer.gamma",
];
const bindings = providerKeys.map((keys, index) =>
  makeProviderBinding(
    providerIds[index]!,
    keys.publicKey,
    `datanet-promotion-provider-binding-${index + 1}-20260921`,
  )
);
const trustInput = makeTrustSnapshot(rootKeys, bindings);

const objectId = "promotion-attestation-object-v1.bin";
const contentSha256 =
  "a".repeat(64);
const byteLength = 4096;

const attestations = [
  makeAttestation(
    "corroboration",
    providerIds[0]!,
    bindings[0]!,
    providerKeys[0]!.privateKey,
    1,
    objectId,
    contentSha256,
    byteLength,
  ),
  makeAttestation(
    "corroboration",
    providerIds[1]!,
    bindings[1]!,
    providerKeys[1]!.privateKey,
    2,
    objectId,
    contentSha256,
    byteLength,
  ),
  makeAttestation(
    "reproducibility",
    providerIds[2]!,
    bindings[2]!,
    providerKeys[2]!.privateKey,
    3,
    objectId,
    contentSha256,
    byteLength,
  ),
];

const greenInput = {
  marker: DATANET_PROMOTION_INDEPENDENT_ATTESTATION_SET_MARKER,
  version: 1,
  object: {
    object_id: objectId,
    content_sha256: contentSha256,
    byte_length: byteLength,
  },
  trust_snapshot_id:
    trustInput.authentication_envelope.snapshot_id,
  attestations,
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

const green = materializeDatanetPromotionIndependentAttestationSetV1(
  trustInput,
  trustInput.trust_root.root_id,
  greenInput,
);

assert.match(green.set_id, /^voiddpias1_[0-9a-f]{64}$/);
assert.deepEqual(green.providers.sort(), [...providerIds].sort());
assert.equal(new Set(green.provider_key_ids).size, 3);

const external = green.external_evidence;
assert.equal(
  external.marker,
  "VOID_DATANET_PROMOTION_EXTERNAL_EVIDENCE_V1",
);
const corr = external.corroboration_evidence as Record<string, unknown>;
const repro = external.reproducibility_evidence as Record<string, unknown>;
assert.equal(corr.independent_source_count, 2);
assert.equal(corr.conflict_detected, false);
assert.equal(repro.independent_verifier_count, 1);
assert.equal(repro.replay_verified, true);
assert.equal(
  corr.evidence_sha256,
  evidenceMaterialHash(corr),
);
assert.equal(
  repro.evidence_sha256,
  evidenceMaterialHash(repro),
);
assert.equal(
  (external.authority as Record<string, unknown>).chain2050_write_authorized,
  false,
);

const badSignature = clone(greenInput);
badSignature.attestations[0].signature_base64 =
  badSignature.attestations[1].signature_base64;
badSignature.attestations[0].attestation_id =
  datanetPromotionIndependentAttestationIdV1(
    Object.fromEntries(
      Object.entries(badSignature.attestations[0]).filter(
        ([key]) => key !== "attestation_id",
      ),
    ),
  );
expectReject(
  "bad signature",
  () => materializeDatanetPromotionIndependentAttestationSetV1(
    trustInput,
    trustInput.trust_root.root_id,
    badSignature,
  ),
  /signature invalid/,
);

const sameProvider = clone(greenInput);
sameProvider.attestations[1] = clone(sameProvider.attestations[0]);
sameProvider.attestations[1].nonce =
  "datanet-promotion-attestation-duplicate-provider-20260921";
sameProvider.attestations[1].verification_run_id =
  "void.datanet.promotion.verify.duplicate-provider.20260921";
const duplicateBody = Object.fromEntries(
  Object.entries(sameProvider.attestations[1]).filter(
    ([key]) => key !== "signature_base64" && key !== "attestation_id",
  ),
);
sameProvider.attestations[1].signature_base64 = crypto.sign(
  null,
  datanetPromotionIndependentAttestationSigningBytesV1(duplicateBody),
  providerKeys[0]!.privateKey,
).toString("base64");
sameProvider.attestations[1].attestation_id =
  datanetPromotionIndependentAttestationIdV1(
    Object.fromEntries(
      Object.entries(sameProvider.attestations[1]).filter(
        ([key]) => key !== "attestation_id",
      ),
    ),
  );
expectReject(
  "provider independence",
  () => materializeDatanetPromotionIndependentAttestationSetV1(
    trustInput,
    trustInput.trust_root.root_id,
    sameProvider,
  ),
  /provider identities must be unique/,
);

const wrongObject = clone(greenInput);
wrongObject.attestations[2].content_sha256 = "b".repeat(64);
const wrongObjectBody = Object.fromEntries(
  Object.entries(wrongObject.attestations[2]).filter(
    ([key]) => key !== "signature_base64" && key !== "attestation_id",
  ),
);
wrongObject.attestations[2].signature_base64 = crypto.sign(
  null,
  datanetPromotionIndependentAttestationSigningBytesV1(wrongObjectBody),
  providerKeys[2]!.privateKey,
).toString("base64");
wrongObject.attestations[2].attestation_id =
  datanetPromotionIndependentAttestationIdV1(
    Object.fromEntries(
      Object.entries(wrongObject.attestations[2]).filter(
        ([key]) => key !== "attestation_id",
      ),
    ),
  );
expectReject(
  "object mismatch",
  () => materializeDatanetPromotionIndependentAttestationSetV1(
    trustInput,
    trustInput.trust_root.root_id,
    wrongObject,
  ),
  /content_sha256 mismatch/,
);

const noReplay = clone(greenInput);
noReplay.attestations[2].replay_verified = false;
const noReplayBody = Object.fromEntries(
  Object.entries(noReplay.attestations[2]).filter(
    ([key]) => key !== "signature_base64" && key !== "attestation_id",
  ),
);
noReplay.attestations[2].signature_base64 = crypto.sign(
  null,
  datanetPromotionIndependentAttestationSigningBytesV1(noReplayBody),
  providerKeys[2]!.privateKey,
).toString("base64");
noReplay.attestations[2].attestation_id =
  datanetPromotionIndependentAttestationIdV1(
    Object.fromEntries(
      Object.entries(noReplay.attestations[2]).filter(
        ([key]) => key !== "attestation_id",
      ),
    ),
  );
expectReject(
  "replay required",
  () => materializeDatanetPromotionIndependentAttestationSetV1(
    trustInput,
    trustInput.trust_root.root_id,
    noReplay,
  ),
  /replay_verified/,
);

expectReject(
  "wrong trust root",
  () => materializeDatanetPromotionIndependentAttestationSetV1(
    trustInput,
    "voidaptr1_" + "f".repeat(64),
    greenInput,
  ),
  /expected trust-root ID/,
);

const authorityEscalation = clone(greenInput);
authorityEscalation.authority.chain2050_write_authorized = true;
expectReject(
  "authority escalation",
  () => materializeDatanetPromotionIndependentAttestationSetV1(
    trustInput,
    trustInput.trust_root.root_id,
    authorityEscalation,
  ),
  /chain2050_write_authorized must be false/,
);

console.log("VOID_DATANET_PROMOTION_INDEPENDENT_ATTESTATION_SET_V1_PROOF_GREEN");
console.log("operator_signed_provider_snapshot_verified=true");
console.log("provider_registry_used_for_identity_provenance_only=true");
console.log("provider_quote_authority_expanded=false");
console.log("distinct_corroborators=2");
console.log("distinct_reproducer=1");
console.log("all_three_provider_ids_distinct=true");
console.log("all_three_signing_key_ids_distinct=true");
console.log("ed25519_signatures_verified=true");
console.log("object_identity_bound=true");
console.log("byte_length_bound=true");
console.log("bad_signature_rejected=true");
console.log("duplicate_provider_rejected=true");
console.log("object_mismatch_rejected=true");
console.log("missing_replay_rejected=true");
console.log("wrong_trust_root_rejected=true");
console.log("chain2050_write_authorized=false");
console.log("validator_authority_granted=false");
console.log("automatic_promotion=false");
