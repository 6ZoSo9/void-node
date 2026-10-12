import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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

import {
  acceptanceReplayStateIdV1,
  type AcceptanceReplayStateV1,
} from "./public_agent_service_acceptance_materialization_replay_consumer_v1.js";
import {
  validateAgentPaidWorkOrderEnvelope,
} from "./agent_paid_work_order_envelope_v1.js";
import {
  validateAgentPaidWorkQuoteEnvelope,
} from "./agent_paid_work_quote_envelope_v1.js";
import {
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_REPLAY_PLAN_VERIFICATION_MARKER,
  materializePublicAgentServiceTrustedRequesterAcceptanceReplayPlanVerificationV1,
  verifyPublicAgentServiceTrustedRequesterAcceptanceReplayPlanVerificationV1,
  type PublicAgentServiceTrustedRequesterAcceptanceReplayPlanVerificationV1,
} from "./public_agent_service_trusted_requester_acceptance_replay_plan_verification_v1.js";

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

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return Boolean(
    value
      && typeof value === "object"
      && !Array.isArray(value),
  );
}

function findWorkOrderEnvelope(
  value: unknown,
  expectedWorkOrderId: string,
  depth = 0,
): unknown | null {
  if (depth > 6) return null;
  if (isRecord(value)) {
    if (
      value.work_order_id === expectedWorkOrderId
      && value.marker
        === "VOID_AGENT_PAID_WORK_ORDER_ENVELOPE_V1"
    ) {
      try {
        validateAgentPaidWorkOrderEnvelope(
          value,
        );
        return value;
      } catch {
        // Continue looking for a nested valid envelope.
      }
    }
    for (const child of Object.values(value)) {
      const found = findWorkOrderEnvelope(
        child,
        expectedWorkOrderId,
        depth + 1,
      );
      if (found !== null) return found;
    }
  } else if (Array.isArray(value)) {
    for (const child of value) {
      const found = findWorkOrderEnvelope(
        child,
        expectedWorkOrderId,
        depth + 1,
      );
      if (found !== null) return found;
    }
  }
  return null;
}

async function discoverCanonicalWorkOrder(
  requesterInput: Record<string, unknown>,
  catalog: unknown,
): Promise<unknown> {
  const handoffInput = requesterInput
    .authenticated_quote_acceptance_handoff_input as Record<string, unknown>;
  const providerAuthenticationInput = handoffInput
    .provider_authentication_input as Record<string, unknown>;
  const responseInput = providerAuthenticationInput
    .provider_quote_response_input as Record<string, unknown>;
  const quoteHandoffInput = responseInput
    .quote_handoff_input as Record<string, unknown>;
  const submissionInput = quoteHandoffInput
    .submission_input as Record<string, unknown>;
  const orderRequest = submissionInput
    .order_request as Record<string, unknown>;
  const requesterAuthenticationEnvelope =
    requesterInput.requester_authentication_envelope as Record<string, unknown>;
  const expectedWorkOrderId =
    requesterAuthenticationEnvelope.work_order_id as string;

  const scriptsDir =
    path.resolve(repoRoot, "scripts");
  const files = fs
    .readdirSync(scriptsDir)
    .filter(
      (name) =>
        name.endsWith(".ts")
        && !name.startsWith("prove_")
        && /public_agent_service.*order/i.test(name),
    )
    .sort();

  const attempted: string[] = [];
  for (const name of files) {
    const file =
      path.join(scriptsDir, name);
    const source =
      fs.readFileSync(file, "utf8");
    if (
      !source.includes("VOID_PUBLIC_AGENT_SERVICE_ORDER")
      && !source.includes("work_order_id")
    ) {
      continue;
    }
    if (
      /node:(?:http|https|net|tls|child_process)/.test(
        source,
      )
      || /\bfetch\s*\(/.test(source)
    ) {
      continue;
    }

    const module = await import(
      `${pathToFileURL(file).href}?void-replay-plan-proof=1`
    );
    const candidates = Object.entries(module)
      .filter(
        ([exportName, exported]) =>
          typeof exported === "function"
          && /(?:adapt|materialize|build|create).*(?:order|work)/i.test(
            exportName,
          ),
      )
      .sort(([left], [right]) =>
        left.localeCompare(right),
      );

    for (const [exportName, exported] of candidates) {
      const fn =
        exported as (...args: unknown[]) => unknown;
      const argumentSets: unknown[][] = [
        [orderRequest, catalog],
        [orderRequest],
        [submissionInput, catalog],
        [submissionInput],
        [catalog, orderRequest],
      ];
      for (const args of argumentSets) {
        attempted.push(
          `${name}:${exportName}/${args.length}`,
        );
        try {
          const result =
            await fn(...args);
          const found =
            findWorkOrderEnvelope(
              result,
              expectedWorkOrderId,
            );
          if (found !== null) return found;
        } catch {
          // A pure candidate with a different signature is not authoritative.
        }
      }
    }
  }

  fail(
    "canonical public-agent service work-order adapter was not discovered: "
      + attempted.join(","),
  );
}

function emptyReplayState(): AcceptanceReplayStateV1 {
  const draft = {
    marker:
      "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_REPLAY_STATE_V1" as const,
    version: 1 as const,
    revision: 0,
    consumed_requester_authentication_ids:
      [] as string[],
    consumed_provider_authentication_ids:
      [] as string[],
    consumed_acceptance_ids:
      [] as string[],
    active_acceptance_by_quote:
      {} as Record<string, string>,
  };
  return {
    ...draft,
    state_id:
      acceptanceReplayStateIdV1(
        draft,
      ),
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
  "examples/public-agent-service-trusted-requester-acceptance-replay-plan-verification-v1.example.json";
const schemaPath =
  "schemas/public-agent-service-trusted-requester-acceptance-replay-plan-verification-v1.schema.json";
const docsPath =
  "docs/public-agent/public-agent-service-trusted-requester-acceptance-replay-plan-verification-v1.md";
const adapterPath =
  "scripts/public_agent_service_trusted_requester_acceptance_replay_plan_verification_v1.ts";
const workflowPath =
  ".github/workflows/public-agent-service-trusted-requester-acceptance-replay-plan-verification-v1.yml";
const requesterExamplePath =
  "examples/public-agent-service-requester-acceptance-authentication-v1.example.json";
const trustedRequesterExamplePath =
  "examples/public-agent-service-trusted-requester-acceptance-verification-v1.example.json";
const replayExamplePath =
  "examples/public-agent-service-acceptance-materialization-replay-consumer-v1.example.json";

const exampleBundle =
  readJson(examplePath) as Record<string, unknown>;
const exampleInput =
  exampleBundle.input;
const examplePacket =
  exampleBundle.packet;
const verifiedExample =
  verifyPublicAgentServiceTrustedRequesterAcceptanceReplayPlanVerificationV1(
    exampleInput,
    examplePacket,
  );
assertCondition(
  verifiedExample.status
    === "example_only",
  "committed replay-plan composition example became live",
);
assertCondition(
  verifiedExample.verification
    .requester_binding_provenance_verified
    === false,
  "committed replay-plan example claimed live requester provenance",
);
assertCondition(
  verifiedExample.verification
    .acceptance_replay_plan_verified
    === false,
  "committed replay-plan example claimed a live transition",
);
assertCondition(
  verifiedExample.verification
    .persistence_handoff_packet_validated
    === false,
  "committed replay-plan example claimed persistence handoff validation",
);
assertCondition(
  verifiedExample.persistence_handoff_gate
    .eligible_for_operator_confirmed_persistence
    === false,
  "committed replay-plan example became persistence eligible",
);
assertCondition(
  Object.values(
    verifiedExample.authority,
  ).every(
    (value) => value === false,
  ),
  "committed replay-plan example granted authority",
);

const tamperedExamplePacket =
  clone(examplePacket) as Record<string, unknown>;
tamperedExamplePacket.status =
  "trusted_requester_acceptance_replay_plan_verified";
expectReject(
  "tampered replay-plan composition example packet",
  () =>
    verifyPublicAgentServiceTrustedRequesterAcceptanceReplayPlanVerificationV1(
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

const registryLiveInput:
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
const registryLivePacket =
  materializePublicAgentServiceTrustedRequesterAcceptanceRegistryVerificationV1(
    registryLiveInput,
  );

assertCondition(
  registryLivePacket.status
    === "trusted_requester_acceptance_registry_verified",
  "live registry composition status changed",
);
assertCondition(
  registryLivePacket.verification
    .requester_binding_provenance_verified
    === true,
  "live registry composition did not verify requester binding provenance",
);
assertCondition(
  registryLivePacket.acceptance_materialization_gate
    .eligible_for_acceptance_materialization
    === true,
  "live registry composition is not acceptance-materialization eligible",
);
assertCondition(
  registryLivePacket.acceptance_materialization_gate
    .acceptance_replay_consumer_verified
    === false,
  "live registry composition falsely claimed replay-consumer verification",
);
assertCondition(
  registryLivePacket.acceptance_materialization_gate
    .production_persistence_consumer_verified
    === false,
  "live registry composition falsely claimed persistence verification",
);
assertCondition(
  registryLivePacket.acceptance_materialization_gate
    .quote_acceptance_not_performed
    === true,
  "live registry composition performed quote acceptance",
);
assertCondition(
  registryLivePacket.source.requester_key_binding_id
    === requesterBinding.binding_id,
  "live registry composition changed requester binding identity",
);
assertCondition(
  Object.values(registryLivePacket.authority).every(
    (value) => value === false,
  ),
  "live registry composition granted authority",
);
verifyPublicAgentServiceTrustedRequesterAcceptanceRegistryVerificationV1(
  registryLiveInput,
  registryLivePacket,
);

expectReject(
  "wrong expected requester trust root",
  () =>
    materializePublicAgentServiceTrustedRequesterAcceptanceRegistryVerificationV1(
      {
        ...registryLiveInput,
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
        ...registryLiveInput,
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
        ...registryLiveInput,
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
        ...registryLiveInput,
        requester_trust_registry_snapshot_input:
          lateRequesterSnapshot,
      },
    ),
);

const exampleInputRecord =
  exampleInput as Record<string, unknown>;
const exampleTrustedRegistryInput =
  exampleInputRecord
    .trusted_requester_acceptance_registry_verification_input as Record<string, unknown>;
const exampleRegistryInput =
  exampleTrustedRegistryInput
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
        ...registryLiveInput,
        requester_trust_registry_snapshot_input:
          exampleRegistryInput,
        expected_requester_trust_root_id:
          exampleRegistryTrustRootId,
      },
    ),
);

const replayExample =
  readJson(replayExamplePath) as Record<string, unknown>;
// The replay-consumer example is the input object itself, unlike the
// trusted-requester registry example, which is an { input, packet } bundle.
const replayInput =
  clone(
    replayExample,
  ) as Record<string, unknown>;
replayInput.mode =
  "external_requester_evidence";
replayInput.requester_authentication_input =
  clone(requesterInput);
replayInput.replay_state_snapshot =
  emptyReplayState();
replayInput.expected_state_revision =
  0;

const workOrder =
  await discoverCanonicalWorkOrder(
    requesterInput,
    catalog,
  );
validateAgentPaidWorkOrderEnvelope(
  workOrder,
);
const quote =
  responseInput.quote_envelope;
validateAgentPaidWorkQuoteEnvelope(
  workOrder,
  quote,
);

const finalLiveInput:
  PublicAgentServiceTrustedRequesterAcceptanceReplayPlanVerificationV1 = {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_REPLAY_PLAN_VERIFICATION_MARKER,
    version: 1,
    evidence_mode:
      "external_requester_evidence",
    trusted_requester_acceptance_registry_verification_input:
      registryLiveInput,
    acceptance_materialization_replay_consumer_input:
      replayInput as never,
    catalog_value:
      catalog,
    work_order_value:
      workOrder,
    quote_value:
      quote,
  };
const finalLivePacket =
  materializePublicAgentServiceTrustedRequesterAcceptanceReplayPlanVerificationV1(
    finalLiveInput,
  );

assertCondition(
  finalLivePacket.status
    === "trusted_requester_acceptance_replay_plan_verified",
  "live replay-plan composition status changed",
);
assertCondition(
  finalLivePacket.verification
    .requester_binding_provenance_verified
    === true,
  "live replay-plan composition lost requester provenance",
);
assertCondition(
  finalLivePacket.verification
    .acceptance_materialization_eligibility_verified
    === true,
  "live replay-plan composition lost materialization eligibility",
);
assertCondition(
  finalLivePacket.verification
    .acceptance_replay_plan_verified
    === true,
  "live replay plan was not verified",
);
assertCondition(
  finalLivePacket.verification
    .acceptance_materialized_in_memory
    === true,
  "live replay plan did not materialize an in-memory acceptance",
);
assertCondition(
  finalLivePacket.verification
    .atomic_three_id_transition_verified
    === true,
  "live replay plan did not verify the atomic three-ID transition",
);
assertCondition(
  finalLivePacket.verification
    .single_active_acceptance_per_quote_verified
    === true,
  "live replay plan did not verify the single-active-acceptance rule",
);
assertCondition(
  finalLivePacket.verification
    .persistence_handoff_packet_validated
    === true,
  "live replay plan is not structurally accepted by the persistence validator",
);
assertCondition(
  finalLivePacket.persistence_handoff_gate
    .eligible_for_operator_confirmed_persistence
    === true,
  "live replay plan is not eligible for separate operator-confirmed persistence",
);
assertCondition(
  finalLivePacket.persistence_handoff_gate
    .persistence_adapter_invoked
    === false,
  "live replay-plan composition invoked persistence",
);
assertCondition(
  finalLivePacket.persistence_handoff_gate
    .production_persistence_performed
    === false,
  "live replay-plan composition performed production persistence",
);
assertCondition(
  finalLivePacket.persistence_handoff_gate
    .persistence_confirmation_not_supplied
    === true,
  "live replay-plan composition supplied persistence confirmation",
);
assertCondition(
  finalLivePacket.acceptance_replay_plan_packet
    .replay.transaction?.atomic_consumption_count
    === 3,
  "live replay-plan packet changed the atomic consumption count",
);
assertCondition(
  finalLivePacket.acceptance_replay_plan_packet
    .acceptance.acceptance_created_in_durable_state
    === false,
  "live replay-plan packet claimed durable acceptance",
);
assertCondition(
  Object.values(
    finalLivePacket.authority,
  ).every(
    (value) => value === false,
  ),
  "live replay-plan composition granted authority",
);
verifyPublicAgentServiceTrustedRequesterAcceptanceReplayPlanVerificationV1(
  finalLiveInput,
  finalLivePacket,
);

const mismatchedReplayInput =
  clone(
    finalLiveInput,
  ) as Record<string, unknown>;
const mismatchedReplayConsumerInput =
  mismatchedReplayInput
    .acceptance_materialization_replay_consumer_input as Record<string, unknown>;
const mismatchedRequesterAuthentication =
  clone(
    requesterInput,
  ) as Record<string, unknown>;
const mismatchedRequesterEnvelope =
  mismatchedRequesterAuthentication
    .requester_authentication_envelope as Record<string, unknown>;
mismatchedRequesterEnvelope.authentication_nonce =
  "trusted-requester-replay-plan-mismatched-requester-0001";
mismatchedReplayConsumerInput.requester_authentication_input =
  mismatchedRequesterAuthentication;
expectReject(
  "mismatched replay requester authentication",
  () =>
    materializePublicAgentServiceTrustedRequesterAcceptanceReplayPlanVerificationV1(
      mismatchedReplayInput,
    ),
);

const staleRevisionInput =
  clone(
    finalLiveInput,
  ) as Record<string, unknown>;
const staleReplayInput =
  staleRevisionInput
    .acceptance_materialization_replay_consumer_input as Record<string, unknown>;
staleReplayInput.expected_state_revision =
  1;
expectReject(
  "stale replay-plan revision",
  () =>
    materializePublicAgentServiceTrustedRequesterAcceptanceReplayPlanVerificationV1(
      staleRevisionInput,
    ),
);

const falseExternalInput =
  clone(
    exampleInput,
  ) as Record<string, unknown>;
falseExternalInput.evidence_mode =
  "external_requester_evidence";
expectReject(
  "example replay-plan composition presented as external evidence",
  () =>
    materializePublicAgentServiceTrustedRequesterAcceptanceReplayPlanVerificationV1(
      falseExternalInput,
    ),
);

const tamperedFinalPacket =
  clone(
    finalLivePacket,
  ) as Record<string, unknown>;
const tamperedGate =
  tamperedFinalPacket
    .persistence_handoff_gate as Record<string, unknown>;
tamperedGate.production_persistence_performed =
  true;
expectReject(
  "tampered live replay-plan packet",
  () =>
    verifyPublicAgentServiceTrustedRequesterAcceptanceReplayPlanVerificationV1(
      finalLiveInput,
      tamperedFinalPacket,
    ),
);

const schema =
  readJson(schemaPath) as Record<string, unknown>;
assertCondition(
  schema.x_void_marker
    === "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_REPLAY_PLAN_VERIFICATION_SCHEMA_V1",
  "replay-plan composition schema marker mismatch",
);
const required =
  schema.required as unknown[];
for (const key of ["input", "packet"]) {
  assertCondition(
    required.includes(key),
    `replay-plan composition schema no longer requires ${key}`,
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
  "provenance-verified trusted requester packet",
  "atomic three-ID transition",
  "one active acceptance per quote",
  "read-only persistence handoff validation",
  "does not call the persistence function",
  "does not construct a persistence request",
  "does not supply persistence confirmation",
  "planned consumption is not durable consumption",
  "does not accept a quote",
  "no payment authority",
  "no work dispatch authority",
  "no Work Credit authority",
]) {
  assertCondition(
    docs.includes(phrase),
    `replay-plan documentation omitted boundary phrase: ${phrase}`,
  );
}
for (const forbidden of [
  "acceptance_persistence: true",
  "quote_acceptance: true",
  "requester_authentication_replay_write: true",
  "provider_authentication_replay_write: true",
  "acceptance_replay_write: true",
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
    `replay-plan adapter contains forbidden authority: ${forbidden}`,
  );
}
assertCondition(
  adapterSource.includes(
    "validateVerifiedAcceptanceReplayConsumerPacketV1",
  ),
  "replay-plan adapter omitted read-only persistence packet validation",
);
assertCondition(
  !adapterSource.includes(
    "persistVerifiedPublicAgentServiceAcceptanceV1",
  ),
  "replay-plan adapter imports the persistence write function",
);
assertCondition(
  !adapterSource.includes(
    "persistVerifiedAcceptanceReplayTransitionV1",
  ),
  "replay-plan adapter embeds the persistence confirmation",
);
assertCondition(
  workflow.includes(
    "npx tsx scripts/prove_public_agent_service_trusted_requester_acceptance_replay_plan_verification_v1.ts",
  ),
  "replay-plan workflow does not run the exact proof",
);

console.log(
  "marker=VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_REPLAY_PLAN_VERIFICATION_PROOF_V1",
);
console.log(
  `example_status=${verifiedExample.status}`,
);
console.log(
  `example_acceptance_replay_plan_verified=${verifiedExample.verification.acceptance_replay_plan_verified}`,
);
console.log(
  `example_persistence_handoff_packet_validated=${verifiedExample.verification.persistence_handoff_packet_validated}`,
);
console.log(
  `live_status=${finalLivePacket.status}`,
);
console.log(
  `live_plan_id=${finalLivePacket.source.plan_id}`,
);
console.log(
  `live_acceptance_id=${finalLivePacket.source.acceptance_id}`,
);
console.log(
  `live_replay_transaction_id=${finalLivePacket.source.replay_transaction_id}`,
);
console.log(
  `live_requester_binding_provenance_verified=${finalLivePacket.verification.requester_binding_provenance_verified}`,
);
console.log(
  `live_acceptance_replay_plan_verified=${finalLivePacket.verification.acceptance_replay_plan_verified}`,
);
console.log(
  `live_acceptance_materialized_in_memory=${finalLivePacket.verification.acceptance_materialized_in_memory}`,
);
console.log(
  `live_atomic_three_id_transition_verified=${finalLivePacket.verification.atomic_three_id_transition_verified}`,
);
console.log(
  `live_single_active_acceptance_per_quote_verified=${finalLivePacket.verification.single_active_acceptance_per_quote_verified}`,
);
console.log(
  `live_persistence_handoff_packet_validated=${finalLivePacket.verification.persistence_handoff_packet_validated}`,
);
console.log(
  `live_eligible_for_operator_confirmed_persistence=${finalLivePacket.persistence_handoff_gate.eligible_for_operator_confirmed_persistence}`,
);
console.log("production_persistence_consumer_invoked=false");
console.log("production_persistence_performed=false");
console.log("durable_acceptance_created=false");
console.log("requester_authentication_replay_write_performed=false");
console.log("provider_authentication_replay_write_performed=false");
console.log("acceptance_replay_write_performed=false");
console.log("authentication_id_consumption_performed=false");
console.log("acceptance_id_consumption_performed=false");
console.log("quote_acceptance_recorded=false");
console.log("payment_authorization=false");
console.log("payment_execution=false");
console.log("work_execution_authorization=false");
console.log("work_dispatch=false");
console.log("work_credit_write=false");
console.log("wallet_access=false");
console.log("runtime_mutation=false");
console.log("money_movement=false");
console.log(
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_REPLAY_PLAN_VERIFICATION_V1_EXACT_GREEN",
);
