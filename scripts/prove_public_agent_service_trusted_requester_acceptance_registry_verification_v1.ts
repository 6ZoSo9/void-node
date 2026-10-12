import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  type RequesterAcceptanceAuthenticationBodyV1,
  type RequesterAcceptanceKeyBindingDraftV1,
  type RequesterAcceptanceKeyBindingV1,
  PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_CANONICALIZATION,
  PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_EVIDENCE_MARKER,
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
} from "./public_agent_service_trusted_requester_acceptance_verification_v1.js";
import {
  type RequesterTrustRegistrySnapshotAuthenticationBodyV1,
  type RequesterTrustRegistrySnapshotBodyV1,
  type RequesterTrustRootDraftV1,
  type RequesterTrustRootV1,
  PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_REGISTRY_SNAPSHOT_AUTHENTICATION_MARKER,
  PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_REGISTRY_SNAPSHOT_BODY_MARKER,
  PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_REGISTRY_SNAPSHOT_MARKER,
  PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_ROOT_MARKER,
  REQUESTER_TRUST_REGISTRY_SNAPSHOT_CANONICALIZATION,
  REQUESTER_TRUST_REGISTRY_SNAPSHOT_SIGNATURE_DOMAIN,
  REQUESTER_TRUST_REGISTRY_SNAPSHOT_SIGNATURE_SCHEME,
  requesterTrustRegistrySnapshotAuthenticationIdV1,
  requesterTrustRegistrySnapshotIdV1,
  requesterTrustRegistrySnapshotSigningBytesV1,
  requesterTrustRootIdV1,
} from "./public_agent_service_requester_trust_registry_snapshot_v1.js";
import {
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_REGISTRY_VERIFICATION_MARKER,
  materializePublicAgentServiceTrustedRequesterAcceptanceRegistryVerificationV1,
  verifyPublicAgentServiceTrustedRequesterAcceptanceRegistryVerificationV1,
  type PublicAgentServiceTrustedRequesterAcceptanceRegistryVerificationV1,
} from "./public_agent_service_trusted_requester_acceptance_registry_verification_v1.js";

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
  const resolved =
    path.resolve(repoRoot, relative);
  const fileStat =
    fs.lstatSync(resolved);
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
  const resolved =
    path.resolve(repoRoot, relative);
  const fileStat =
    fs.lstatSync(resolved);
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
  operation: () => unknown,
): void {
  let rejected = false;
  try {
    operation();
  } catch {
    rejected = true;
  }
  assertCondition(
    rejected,
    `${label} was not rejected`,
  );
}

function buildRequesterRegistrySnapshot(
  trustRoot: RequesterTrustRootV1,
  trustRootPrivateKey: crypto.KeyObject,
  binding: RequesterAcceptanceKeyBindingV1,
  snapshotNonce: string,
  generatedAtUtc = "2030-01-01T00:00:00Z",
  expiresAtUtc = "2030-01-02T00:00:00Z",
): Record<string, unknown> {
  const snapshotBody:
    RequesterTrustRegistrySnapshotBodyV1 = {
      marker:
        PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_REGISTRY_SNAPSHOT_BODY_MARKER,
      version: 1,
      snapshot_status:
        "operator_approved_snapshot",
      registry_id:
        "void.public-agent.trusted-requester-acceptance-registry.v1",
      sequence: 1,
      previous_snapshot_id: null,
      generated_at_utc:
        generatedAtUtc,
      expires_at_utc:
        expiresAtUtc,
      snapshot_nonce:
        snapshotNonce,
      requester_key_bindings:
        [binding],
    };
  const snapshotId =
    requesterTrustRegistrySnapshotIdV1(
      snapshotBody,
    );
  const authenticationBody:
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
        snapshotId,
      trust_root_id:
        trustRoot.root_id,
      key_id:
        trustRoot.key_id,
      signed_at_utc:
        generatedAtUtc,
    };
  const signature =
    crypto.sign(
      null,
      requesterTrustRegistrySnapshotSigningBytesV1(
        snapshotBody,
        authenticationBody,
      ),
      trustRootPrivateKey,
    ).toString("base64");
  const withoutId = {
    ...authenticationBody,
    signature_base64:
      signature,
  };
  return {
    marker:
      PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_REGISTRY_SNAPSHOT_MARKER,
    version: 1,
    evidence_mode:
      "operator_signed_snapshot",
    trust_root:
      trustRoot,
    snapshot_body:
      snapshotBody,
    authentication_envelope: {
      ...withoutId,
      authentication_id:
        requesterTrustRegistrySnapshotAuthenticationIdV1(
          withoutId,
        ),
    },
  };
}

const repoRoot =
  path.resolve(
    path.dirname(
      fileURLToPath(import.meta.url),
    ),
    "..",
  );
const examplePath =
  "examples/public-agent-service-trusted-requester-acceptance-registry-verification-v1.example.json";
const schemaPath =
  "schemas/public-agent-service-trusted-requester-acceptance-registry-verification-v1.schema.json";
const docsPath =
  "docs/public-agent/public-agent-service-trusted-requester-acceptance-registry-verification-v1.md";
const adapterPath =
  "scripts/public_agent_service_trusted_requester_acceptance_registry_verification_v1.ts";
const workflowPath =
  ".github/workflows/public-agent-service-trusted-requester-acceptance-registry-verification-v1.yml";
const requesterExamplePath =
  "examples/public-agent-service-requester-acceptance-authentication-v1.example.json";
const trustedRequesterExamplePath =
  "examples/public-agent-service-trusted-requester-acceptance-verification-v1.example.json";

const exampleBundle =
  readJson(examplePath) as Record<string, unknown>;
const exampleInput =
  exampleBundle.input;
const examplePacket =
  exampleBundle.packet;
const verifiedExample =
  verifyPublicAgentServiceTrustedRequesterAcceptanceRegistryVerificationV1(
    exampleInput,
    examplePacket,
  );
assertCondition(
  verifiedExample.status
    === "example_only",
  "committed composition example became live",
);
assertCondition(
  verifiedExample.verification
    .requester_binding_provenance_verified
    === false,
  "committed composition example claimed live requester provenance",
);
assertCondition(
  verifiedExample.acceptance_materialization_gate
    .eligible_for_acceptance_materialization
    === false,
  "committed composition example became acceptance eligible",
);
assertCondition(
  verifiedExample.acceptance_materialization_gate
    .acceptance_replay_consumer_verified
    === false,
  "committed composition example claimed replay-consumer verification",
);
assertCondition(
  Object.values(
    verifiedExample.authority,
  ).every(
    (value) => value === false,
  ),
  "committed composition example granted authority",
);

const tamperedExamplePacket =
  clone(examplePacket) as Record<string, unknown>;
tamperedExamplePacket.status =
  "trusted_requester_acceptance_registry_verified";
expectReject(
  "tampered composition example packet",
  () =>
    verifyPublicAgentServiceTrustedRequesterAcceptanceRegistryVerificationV1(
      exampleInput,
      tamperedExamplePacket,
    ),
);

// Build the complete ephemeral trusted-provider and requester-signature chain.
const requesterInput =
  clone(
    readJson(requesterExamplePath),
  ) as Record<string, unknown>;
requesterInput.evidence_mode =
  "external_requester_evidence";
const handoffInput =
  requesterInput
    .authenticated_quote_acceptance_handoff_input as Record<string, unknown>;
const providerAuthentication =
  handoffInput
    .provider_authentication_input as Record<string, unknown>;
providerAuthentication.evidence_mode =
  "external_provider_evidence";
const responseInput =
  providerAuthentication
    .provider_quote_response_input as Record<string, unknown>;
const responseHandoffInput =
  responseInput.quote_handoff_input as Record<string, unknown>;
responseHandoffInput.evidence_mode =
  "external_receiver_receipt";

const trustedRequesterExample =
  readJson(trustedRequesterExamplePath) as Record<string, unknown>;
const trustedRequesterExampleInput =
  trustedRequesterExample.input as Record<string, unknown>;
const trustedProviderExampleInput =
  trustedRequesterExampleInput
    .trusted_provider_quote_response_verification_input as Record<string, unknown>;
const catalog =
  trustedProviderExampleInput.catalog_value;
assertCondition(
  catalog !== undefined,
  "trusted requester example catalog is missing",
);

const responsePacket =
  materializePublicAgentServiceProviderQuoteResponseV1(
    responseInput,
    catalog,
  );

const providerRootGenerated =
  crypto.generateKeyPairSync("ed25519");
const providerGenerated =
  crypto.generateKeyPairSync("ed25519");
const requesterGenerated =
  crypto.generateKeyPairSync("ed25519");
const requesterRootGenerated =
  crypto.generateKeyPairSync("ed25519");

const providerRootPublicPem =
  providerRootGenerated.publicKey.export({
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
const requesterRootPublicPem =
  requesterRootGenerated.publicKey.export({
    type: "spki",
    format: "pem",
  }).toString();

const providerBindingDraft:
  ProviderKeyBindingDraftV1 = {
    marker:
      PUBLIC_AGENT_SERVICE_PROVIDER_KEY_BINDING_MARKER,
    version: 1,
    binding_status:
      "operator_approved_snapshot",
    provider_id:
      responsePacket.provider_claim.provider_id,
    authority_scope:
      "provider_quote_response_authenticate",
    key_id:
      providerQuoteResponseAuthenticationKeyIdV1(
        providerPublicPem,
      ),
    public_key_pem:
      providerPublicPem,
    valid_from_utc:
      "2030-01-01T00:00:00Z",
    expires_at_utc:
      "2030-03-01T00:00:00Z",
    revoked_at_utc:
      null,
    binding_nonce:
      "trusted-requester-registry-live-provider-binding-0001",
  };
const providerBinding = {
  ...providerBindingDraft,
  binding_id:
    providerKeyBindingIdV1(
      providerBindingDraft,
    ),
};
providerAuthentication.provider_key_binding =
  providerBinding;

const providerBody:
  ProviderQuoteResponseAuthenticationBodyV1 = {
    marker:
      PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_EVIDENCE_MARKER,
    version: 1,
    signature_scheme:
      "ed25519-spki-sha256-v1",
    signature_domain:
      "VOID_PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_V1",
    canonicalization:
      "void-canonical-json-v1",
    response_id:
      responsePacket.response_id,
    quote_id:
      responsePacket.source.quote_id,
    handoff_id:
      responsePacket.source.handoff_id,
    work_order_id:
      responsePacket.source.work_order_id,
    submission_id:
      responsePacket.source.submission_id,
    request_sha256:
      responsePacket.source.request_sha256,
    receipt_id:
      responsePacket.source.receipt_id,
    provider_id:
      responsePacket.provider_claim.provider_id,
    catalog_fingerprint_sha256:
      responsePacket.source.catalog_fingerprint_sha256,
    provider_key_binding_id:
      providerBinding.binding_id,
    authentication_nonce:
      "trusted-requester-registry-live-provider-authentication-0001",
    created_at_utc:
      "2030-01-01T00:04:00Z",
    expires_at_utc:
      "2030-01-01T21:00:00Z",
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
  signature_base64:
    providerSignature,
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
  handoffPacket.status
    === "requester_authentication_required",
  "ephemeral handoff is not requester-authentication ready",
);

const requesterBindingDraft:
  RequesterAcceptanceKeyBindingDraftV1 = {
    marker:
      PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_KEY_BINDING_MARKER,
    version: 1,
    binding_status:
      "operator_approved_snapshot",
    requester_agent_id:
      handoffPacket.source.requester_agent_id,
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
      "trusted-requester-registry-live-requester-binding-0001",
  };
const requesterBinding:
  RequesterAcceptanceKeyBindingV1 = {
    ...requesterBindingDraft,
    binding_id:
      requesterAcceptanceKeyBindingIdV1(
        requesterBindingDraft,
      ),
  };
requesterInput.requester_key_binding =
  requesterBinding;

const requesterBody:
  RequesterAcceptanceAuthenticationBodyV1 = {
    marker:
      PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_EVIDENCE_MARKER,
    version: 1,
    signature_scheme:
      PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_SIGNATURE_SCHEME,
    signature_domain:
      PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_SIGNATURE_DOMAIN,
    canonicalization:
      PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_CANONICALIZATION,
    handoff_id:
      handoffPacket.handoff_id,
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
      "trusted-requester-registry-live-requester-authentication-0001",
    created_at_utc:
      "2030-01-01T00:06:00Z",
    expires_at_utc:
      "2030-01-01T20:00:00Z",
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
  signature_base64:
    requesterSignature,
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

const providerRootDraft:
  ProviderTrustRootDraftV1 = {
    marker:
      PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_ROOT_MARKER,
    version: 1,
    trust_status:
      "operator_pinned_trust_root",
    authority_scope:
      "provider_trust_registry_snapshot_verify",
    key_id:
      providerQuoteResponseAuthenticationKeyIdV1(
        providerRootPublicPem,
      ),
    public_key_pem:
      providerRootPublicPem,
    valid_from_utc:
      "2030-01-01T00:00:00Z",
    expires_at_utc:
      "2031-01-01T00:00:00Z",
    revoked_at_utc:
      null,
    root_nonce:
      "trusted-requester-registry-live-provider-root-0001",
  };
const providerTrustRoot = {
  ...providerRootDraft,
  root_id:
    providerTrustRootIdV1(
      providerRootDraft,
    ),
};
const providerSnapshotBody:
  ProviderTrustRegistrySnapshotBodyV1 = {
    marker:
      PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_BODY_MARKER,
    version: 1,
    snapshot_status:
      "operator_approved_snapshot",
    registry_id:
      "void.public-agent.trusted-requester-registry-provider.v1",
    sequence: 1,
    previous_snapshot_id:
      null,
    generated_at_utc:
      "2030-01-01T00:00:00Z",
    expires_at_utc:
      "2030-01-02T00:00:00Z",
    snapshot_nonce:
      "trusted-requester-registry-live-provider-snapshot-0001",
    provider_key_bindings:
      [providerBinding],
  };
const providerSnapshotId =
  providerTrustRegistrySnapshotIdV1(
    providerSnapshotBody,
  );
const providerSnapshotAuthenticationBody:
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
    snapshot_id:
      providerSnapshotId,
    trust_root_id:
      providerTrustRoot.root_id,
    key_id:
      providerTrustRoot.key_id,
    signed_at_utc:
      "2030-01-01T00:00:00Z",
  };
const providerSnapshotSignature =
  crypto.sign(
    null,
    providerTrustRegistrySnapshotSigningBytesV1(
      providerSnapshotBody,
      providerSnapshotAuthenticationBody,
    ),
    providerRootGenerated.privateKey,
  ).toString("base64");
const providerSnapshotWithoutId = {
  ...providerSnapshotAuthenticationBody,
  signature_base64:
    providerSnapshotSignature,
};
const providerSnapshotInput = {
  marker:
    PUBLIC_AGENT_SERVICE_PROVIDER_TRUST_REGISTRY_SNAPSHOT_MARKER,
  version: 1,
  evidence_mode:
    "operator_signed_snapshot",
  trust_root:
    providerTrustRoot,
  snapshot_body:
    providerSnapshotBody,
  authentication_envelope: {
    ...providerSnapshotWithoutId,
    authentication_id:
      providerTrustRegistrySnapshotAuthenticationIdV1(
        providerSnapshotWithoutId,
      ),
  },
};

const trustedProviderInput = {
  marker:
    PUBLIC_AGENT_SERVICE_TRUSTED_PROVIDER_QUOTE_RESPONSE_VERIFICATION_MARKER,
  version: 1,
  evidence_mode:
    "external_provider_evidence",
  expected_trust_root_id:
    providerTrustRoot.root_id,
  provider_trust_registry_snapshot_input:
    providerSnapshotInput,
  provider_quote_response_authentication_input:
    providerAuthentication,
  catalog_value:
    catalog,
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

const trustedRequesterInput = {
  marker:
    PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_VERIFICATION_MARKER,
  version: 1,
  evidence_mode:
    "external_requester_evidence",
  trusted_provider_quote_response_verification_input:
    trustedProviderInput,
  requester_acceptance_authentication_input:
    requesterInput,
};
const trustedRequesterPacket =
  materializePublicAgentServiceTrustedRequesterAcceptanceVerificationV1(
    trustedRequesterInput,
  );
assertCondition(
  trustedRequesterPacket.status
    === "trusted_provider_requester_acceptance_intent_verified",
  "ephemeral trusted requester chain did not verify",
);
assertCondition(
  trustedRequesterPacket.verification
    .requester_binding_provenance_verified
    === false,
  "upstream trusted requester chain unexpectedly claimed registry provenance",
);

const requesterRootDraft:
  RequesterTrustRootDraftV1 = {
    marker:
      PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_ROOT_MARKER,
    version: 1,
    trust_status:
      "operator_pinned_trust_root",
    authority_scope:
      "requester_trust_registry_snapshot_verify",
    key_id:
      requesterAcceptanceAuthenticationKeyIdV1(
        requesterRootPublicPem,
      ),
    public_key_pem:
      requesterRootPublicPem,
    valid_from_utc:
      "2030-01-01T00:00:00Z",
    expires_at_utc:
      "2031-01-01T00:00:00Z",
    revoked_at_utc:
      null,
    root_nonce:
      "trusted-requester-registry-live-requester-root-0001",
  };
const requesterTrustRoot:
  RequesterTrustRootV1 = {
    ...requesterRootDraft,
    root_id:
      requesterTrustRootIdV1(
        requesterRootDraft,
      ),
  };
const requesterSnapshotInput =
  buildRequesterRegistrySnapshot(
    requesterTrustRoot,
    requesterRootGenerated.privateKey,
    requesterBinding,
    "trusted-requester-registry-live-requester-snapshot-0001",
  );

const liveInput:
  PublicAgentServiceTrustedRequesterAcceptanceRegistryVerificationV1 = {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_REGISTRY_VERIFICATION_MARKER,
    version: 1,
    evidence_mode:
      "external_requester_evidence",
    expected_requester_trust_root_id:
      requesterTrustRoot.root_id,
    requester_trust_registry_snapshot_input:
      requesterSnapshotInput as never,
    trusted_requester_acceptance_verification_input:
      trustedRequesterInput as never,
  };
const livePacket =
  materializePublicAgentServiceTrustedRequesterAcceptanceRegistryVerificationV1(
    liveInput,
  );

assertCondition(
  livePacket.status
    === "trusted_requester_acceptance_registry_verified",
  "live registry composition status changed",
);
assertCondition(
  livePacket.verification
    .requester_binding_provenance_verified
    === true,
  "live registry composition did not verify requester binding provenance",
);
assertCondition(
  livePacket.acceptance_materialization_gate
    .eligible_for_acceptance_materialization
    === true,
  "live registry composition is not acceptance-materialization eligible",
);
assertCondition(
  livePacket.acceptance_materialization_gate
    .acceptance_replay_consumer_verified
    === false,
  "live registry composition falsely claimed replay-consumer verification",
);
assertCondition(
  livePacket.acceptance_materialization_gate
    .production_persistence_consumer_verified
    === false,
  "live registry composition falsely claimed persistence verification",
);
assertCondition(
  livePacket.acceptance_materialization_gate
    .quote_acceptance_not_performed
    === true,
  "live registry composition performed quote acceptance",
);
assertCondition(
  livePacket.source.requester_key_binding_id
    === requesterBinding.binding_id,
  "live registry composition changed requester binding identity",
);
assertCondition(
  Object.values(livePacket.authority).every(
    (value) => value === false,
  ),
  "live registry composition granted authority",
);
verifyPublicAgentServiceTrustedRequesterAcceptanceRegistryVerificationV1(
  liveInput,
  livePacket,
);

expectReject(
  "wrong expected requester trust root",
  () =>
    materializePublicAgentServiceTrustedRequesterAcceptanceRegistryVerificationV1(
      {
        ...liveInput,
        expected_requester_trust_root_id:
          "voidartr1_" + "0".repeat(64),
      },
    ),
);

const differentRequesterGenerated =
  crypto.generateKeyPairSync("ed25519");
const differentRequesterPublicPem =
  differentRequesterGenerated.publicKey.export({
    type: "spki",
    format: "pem",
  }).toString();
const differentBindingDraft:
  RequesterAcceptanceKeyBindingDraftV1 = {
    ...requesterBindingDraft,
    key_id:
      requesterAcceptanceAuthenticationKeyIdV1(
        differentRequesterPublicPem,
      ),
    public_key_pem:
      differentRequesterPublicPem,
    binding_nonce:
      "trusted-requester-registry-different-requester-binding-0001",
  };
const differentBinding:
  RequesterAcceptanceKeyBindingV1 = {
    ...differentBindingDraft,
    binding_id:
      requesterAcceptanceKeyBindingIdV1(
        differentBindingDraft,
      ),
  };
const differentBindingSnapshot =
  buildRequesterRegistrySnapshot(
    requesterTrustRoot,
    requesterRootGenerated.privateKey,
    differentBinding,
    "trusted-requester-registry-different-binding-snapshot-0001",
  );
expectReject(
  "registry binding differs from requester signature binding",
  () =>
    materializePublicAgentServiceTrustedRequesterAcceptanceRegistryVerificationV1(
      {
        ...liveInput,
        requester_trust_registry_snapshot_input:
          differentBindingSnapshot,
      },
    ),
);

const unknownBindingDraft:
  RequesterAcceptanceKeyBindingDraftV1 = {
    ...requesterBindingDraft,
    requester_agent_id:
      "agent.example.unknown",
    binding_nonce:
      "trusted-requester-registry-unknown-requester-binding-0001",
  };
const unknownBinding:
  RequesterAcceptanceKeyBindingV1 = {
    ...unknownBindingDraft,
    binding_id:
      requesterAcceptanceKeyBindingIdV1(
        unknownBindingDraft,
      ),
  };
const unknownRequesterSnapshot =
  buildRequesterRegistrySnapshot(
    requesterTrustRoot,
    requesterRootGenerated.privateKey,
    unknownBinding,
    "trusted-requester-registry-unknown-requester-snapshot-0001",
  );
expectReject(
  "requester absent from registry snapshot",
  () =>
    materializePublicAgentServiceTrustedRequesterAcceptanceRegistryVerificationV1(
      {
        ...liveInput,
        requester_trust_registry_snapshot_input:
          unknownRequesterSnapshot,
      },
    ),
);

const lateRequesterSnapshot =
  buildRequesterRegistrySnapshot(
    requesterTrustRoot,
    requesterRootGenerated.privateKey,
    requesterBinding,
    "trusted-requester-registry-late-snapshot-0001",
    "2030-01-01T00:07:00Z",
    "2030-01-02T00:00:00Z",
  );
expectReject(
  "requester authentication predates registry snapshot",
  () =>
    materializePublicAgentServiceTrustedRequesterAcceptanceRegistryVerificationV1(
      {
        ...liveInput,
        requester_trust_registry_snapshot_input:
          lateRequesterSnapshot,
      },
    ),
);

const exampleInputRecord =
  exampleInput as Record<string, unknown>;
const exampleRegistryInput =
  exampleInputRecord
    .requester_trust_registry_snapshot_input as Record<string, unknown>;
const exampleRegistryTrustRoot =
  exampleRegistryInput.trust_root as Record<string, unknown>;
const exampleRegistryTrustRootId =
  String(exampleRegistryTrustRoot.root_id);
expectReject(
  "external composition with example requester registry",
  () =>
    materializePublicAgentServiceTrustedRequesterAcceptanceRegistryVerificationV1(
      {
        ...liveInput,
        requester_trust_registry_snapshot_input:
          exampleRegistryInput,
        expected_requester_trust_root_id:
          exampleRegistryTrustRootId,
      },
    ),
);

const schema =
  readJson(schemaPath) as Record<string, unknown>;
assertCondition(
  schema.x_void_marker
    === "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_REGISTRY_VERIFICATION_SCHEMA_V1",
  "composition schema marker mismatch",
);
const required =
  schema.required as unknown[];
for (const key of ["input", "packet"]) {
  assertCondition(
    required.includes(key),
    `composition schema no longer requires ${key}`,
  );
}

const docs =
  readText(docsPath)
    .replace(/\s+/g, " ");
const adapterSource =
  readText(adapterPath);
const workflow =
  readText(workflowPath);
for (const phrase of [
  "exact requester binding used for requester signature verification",
  "pinned expected requester trust-root ID",
  "requester_binding_provenance_verified=true",
  "eligible_for_acceptance_materialization=true",
  "acceptance_replay_consumer_verified=false",
  "does not consume authentication IDs",
  "does not accept a quote",
  "no payment authority",
  "no work dispatch authority",
  "no Work Credit authority",
]) {
  assertCondition(
    docs.includes(phrase),
    `composition documentation omitted boundary phrase: ${phrase}`,
  );
}
for (const forbidden of [
  "quote_acceptance: true",
  "authentication_id_consumption: true",
  "acceptance_id_consumption: true",
  "acceptance_creation: true",
  "payment_authorization: true",
  "payment_execution: true",
  "work_dispatch: true",
  "work_credit_write: true",
  "runtime_mutation: true",
]) {
  assertCondition(
    !adapterSource.includes(forbidden),
    `composition adapter contains forbidden authority: ${forbidden}`,
  );
}
assertCondition(
  !adapterSource.includes(
    "planPublicAgentServiceAcceptanceMaterializationReplayConsumerV1",
  ),
  "composition adapter invoked replay-consumer planning",
);
assertCondition(
  workflow.includes(
    "npx tsx scripts/prove_public_agent_service_trusted_requester_acceptance_registry_verification_v1.ts",
  ),
  "composition workflow does not run the exact proof",
);

console.log(
  "marker=VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_REGISTRY_VERIFICATION_PROOF_V1",
);
console.log(
  `example_status=${verifiedExample.status}`,
);
console.log(
  `example_requester_binding_provenance_verified=${verifiedExample.verification.requester_binding_provenance_verified}`,
);
console.log(
  `example_eligible_for_acceptance_materialization=${verifiedExample.acceptance_materialization_gate.eligible_for_acceptance_materialization}`,
);
console.log(
  `live_status=${livePacket.status}`,
);
console.log(
  `live_requester_snapshot_id=${livePacket.source.requester_snapshot_id}`,
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
console.log("acceptance_replay_consumer_verified=false");
console.log("production_persistence_consumer_verified=false");
console.log("requester_authentication_replay_write=false");
console.log("provider_authentication_replay_write=false");
console.log("acceptance_replay_write=false");
console.log("authentication_id_consumption=false");
console.log("acceptance_id_consumption=false");
console.log("acceptance_creation=false");
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
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_REGISTRY_VERIFICATION_V1_EXACT_GREEN",
);
