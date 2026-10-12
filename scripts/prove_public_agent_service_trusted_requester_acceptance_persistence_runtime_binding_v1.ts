import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
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


import {
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_DEFAULT_DEPENDENCIES_V1,
  type PublicAgentServiceTrustedRequesterAcceptancePersistenceCompositionDependenciesV1,
} from "./public_agent_service_trusted_requester_acceptance_persistence_composition_v1.js";
import {
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_COMMAND_MARKER,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_CONFIG_MARKER,
  PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_CONFIRMATION,
  executePublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeBindingV1,
  loadPublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeConfigFromEnvironmentV1,
  publicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeDefaultDependencyIdentityV1,
} from "./public_agent_service_trusted_requester_acceptance_persistence_runtime_binding_v1.js";

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
const requesterExamplePath =
  "examples/public-agent-service-requester-acceptance-authentication-v1.example.json";
const trustedRequesterExamplePath =
  "examples/public-agent-service-trusted-requester-acceptance-verification-v1.example.json";
const replayExamplePath =
  "examples/public-agent-service-acceptance-materialization-replay-consumer-v1.example.json";
const compositionExamplePath =
  "examples/public-agent-service-trusted-requester-acceptance-persistence-runtime-binding-v1.example.json";
const compositionSchemaPath =
  "schemas/public-agent-service-trusted-requester-acceptance-persistence-runtime-binding-v1.schema.json";
const compositionDocsPath =
  "docs/public-agent/public-agent-service-trusted-requester-acceptance-persistence-runtime-binding-v1.md";
const compositionAdapterPath =
  "scripts/public_agent_service_trusted_requester_acceptance_persistence_runtime_binding_v1.ts";
const compositionWorkflowPath =
  ".github/workflows/public-agent-service-trusted-requester-acceptance-persistence-runtime-binding-v1.yml";

const exampleBundle =
  readJson(examplePath) as Record<string, unknown>;
const exampleInput =
  exampleBundle.input;

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

function compositionConfig(
  enabled: boolean,
  root: string,
) {
  return {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_CONFIG_MARKER,
    version: 1,
    enabled,
    persistence_config: {
      marker:
        "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_ADAPTER_V1",
      version: 1,
      allowed_root:
        root,
      max_pointer_bytes:
        65_536,
      max_generation_file_bytes:
        4_194_304,
      max_generation_count:
        10_000,
      recover_exact_orphaned_generation:
        true,
    },
  };
}

function compositionCommand(
  apply: boolean,
  recordedAtUtc: string,
  confirmation = apply
    ? PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_CONFIRMATION
    : "",
) {
  return {
    marker:
      PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_COMMAND_MARKER,
    version: 1,
    apply,
    confirmation,
    recorded_at_utc:
      recordedAtUtc,
  };
}


const environmentDefault =
  loadPublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeConfigFromEnvironmentV1(
    {},
  );
assertCondition(
  environmentDefault.enabled === false
    && environmentDefault.persistence_config.allowed_root
      === "/disabled/trusted-requester-acceptance-persistence-runtime-root-not-accessed",
  "runtime environment configuration is not disabled by default",
);
expectReject(
  "enabled runtime environment without root",
  () =>
    loadPublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeConfigFromEnvironmentV1(
      {
        VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_ENABLED:
          "1",
      },
    ),
);

const defaultDependencyIdentity =
  publicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeDefaultDependencyIdentityV1();
assertCondition(
  Object.values(defaultDependencyIdentity)
    .every((value) => value === true),
  "persistence composition default dependencies are not exact",
);

const disabled =
  executePublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeBindingV1(
    compositionConfig(
      false,
      "/disabled/operator-root-not-accessed",
    ),
    { malformed: true },
    () => {
      fail("disabled composition invoked the trusted input provider");
    },
  );
assertCondition(
  disabled.status === "disabled"
    && disabled.enabled === false
    && disabled.trusted_input_provider_invoked === false
    && disabled.store_inspected === false
    && disabled.persistence_attempted === false
    && disabled.runtime_binding_enabled === false
    && disabled.composition_invoked === false
    && disabled.trusted_input_provider_forwarded === false,
  "disabled composition did not short-circuit",
);

let wrongConfirmationProviderCalls = 0;
expectReject(
  "wrong persistence-composition confirmation",
  () =>
    executePublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeBindingV1(
      compositionConfig(
        true,
        `/tmp/void-composition-nonexistent-${crypto.randomUUID()}`,
      ),
      compositionCommand(
        true,
        "2030-01-01T00:10:00Z",
        "wrong-confirmation",
      ),
      () => {
        wrongConfirmationProviderCalls += 1;
        return clone(finalLiveInput);
      },
    ),
);
assertCondition(
  wrongConfirmationProviderCalls === 0,
  "wrong confirmation reached the trusted input provider",
);

let clientRootProviderCalls = 0;
const clientRootCommand =
  compositionCommand(
    false,
    "2030-01-01T00:10:00Z",
  ) as Record<string, unknown>;
clientRootCommand.allowed_root =
  "/client/forbidden";
expectReject(
  "client-supplied persistence root",
  () =>
    executePublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeBindingV1(
      compositionConfig(
        true,
        "/operator/root/not-accessed",
      ),
      clientRootCommand,
      () => {
        clientRootProviderCalls += 1;
        return clone(finalLiveInput);
      },
    ),
);
assertCondition(
  clientRootProviderCalls === 0,
  "client storage configuration reached the trusted input provider",
);

const committedCompositionExample =
  readJson(compositionExamplePath) as Record<string, unknown>;
assertCondition(
  committedCompositionExample.marker
    === "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_EXAMPLE_V1",
  "composition example marker changed",
);
assertCondition(
  committedCompositionExample.example_only === true,
  "composition example is not explicitly non-authoritative",
);
const recomputedExample =
  executePublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeBindingV1(
    committedCompositionExample.config,
    committedCompositionExample.command,
    () =>
      committedCompositionExample
        .trusted_replay_plan_input,
  );
assertCondition(
  JSON.stringify(recomputedExample)
    === JSON.stringify(
      committedCompositionExample.result,
    ),
  "composition example result changed",
);
assertCondition(
  recomputedExample.status === "example_only"
    && recomputedExample.store_inspected === false
    && recomputedExample.persistence_attempted === false
    && recomputedExample.acceptance_persisted === false
    && recomputedExample.quote_acceptance_recorded === false,
  "composition example crossed a persistence boundary",
);
expectReject(
  "example fixture apply",
  () =>
    executePublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeBindingV1(
      committedCompositionExample.config,
      compositionCommand(
        true,
        "2030-01-01T00:10:00Z",
      ),
      () =>
        committedCompositionExample
          .trusted_replay_plan_input,
    ),
);

const temporaryParents: string[] = [];
function temporaryRoot(): string {
  const parent =
    fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "void-trusted-requester-persistence-composition-proof-",
      ),
    );
  fs.chmodSync(
    parent,
    0o700,
  );
  const root =
    path.join(
      parent,
      "store",
    );
  fs.mkdirSync(
    root,
    {
      mode: 0o700,
    },
  );
  temporaryParents.push(
    parent,
  );
  return root;
}

let dryStatus = "";
let temporaryAcceptancePersistencePerformed = false;
let temporaryReplayWritesPerformed = false;
let directVerifiedPacketProvider = false;
let internalAdapterConfirmationVerified = false;
let duplicateStatusVerified = false;
let temporaryRootRemoved = false;
let productionAcceptancePersistencePerformed = false;

try {
  const root =
    temporaryRoot();
  const config =
    compositionConfig(
      true,
      root,
    );
  const beforeDryEntries =
    fs.readdirSync(root);
  const dry =
    executePublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeBindingV1(
      config,
      compositionCommand(
        false,
        "2030-01-01T00:10:00Z",
      ),
      () => clone(finalLiveInput),
    );
  dryStatus = dry.status;
  assertCondition(
    dry.status === "planned"
      && dry.trusted_replay_plan_verified
      && dry.requester_binding_provenance_verified
      && dry.persistence_handoff_packet_validated
      && dry.store_inspected
      && dry.persistence_attempted === false
      && dry.acceptance_materialized_in_memory
      && dry.acceptance_persisted === false
      && dry.server_replay_state_injected
      && dry.direct_verified_packet_provider
      && dry.runtime_binding_enabled
      && dry.composition_invoked
      && dry.trusted_input_provider_forwarded
      && dry.runtime_confirmation_verified === false
      && dry.composition_confirmation_injected === false,
    "trusted requester persistence dry run changed",
  );
  assertCondition(
    Object.values(dry.authority)
      .every((value) => value === false),
    "trusted requester persistence dry run gained authority",
  );
  assertCondition(
    JSON.stringify(
      fs.readdirSync(root),
    )
      === JSON.stringify(
        beforeDryEntries,
      ),
    "dry run changed the temporary persistence root",
  );

  let capturedVerifiedOuter:
    ReturnType<
      typeof verifyPublicAgentServiceTrustedRequesterAcceptanceReplayPlanVerificationV1
    >
    | null = null;
  const defaultDependencies =
    PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_DEFAULT_DEPENDENCIES_V1;
  const directDependencies:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceCompositionDependenciesV1 = {
      ...defaultDependencies,
      verifyTrustedReplayPlan: (
        input,
        packet,
      ) => {
        capturedVerifiedOuter =
          defaultDependencies.verifyTrustedReplayPlan(
            input,
            packet,
          );
        return capturedVerifiedOuter;
      },
      persist: (
        persistenceConfig,
        request,
        packetProvider,
      ) => {
        assertCondition(
          request !== null
            && typeof request === "object"
            && !Array.isArray(request),
          "composition persistence request changed",
        );
        assertCondition(
          (request as Record<string, unknown>)
            .confirmation
            === "persistVerifiedAcceptanceReplayTransitionV1",
          "composition did not inject the sealed adapter confirmation",
        );
        internalAdapterConfirmationVerified =
          true;
        const lower =
          packetProvider();
        assertCondition(
          capturedVerifiedOuter !== null,
          "verified trusted outer packet was not captured",
        );
        assertCondition(
          lower
            === capturedVerifiedOuter
              .acceptance_replay_plan_packet,
          "persistence provider did not receive the exact verifier-returned lower packet",
        );
        directVerifiedPacketProvider =
          true;
        return defaultDependencies.persist(
          persistenceConfig,
          request,
          () => lower,
        );
      },
    };

  const applied =
    executePublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeBindingV1(
      config,
      compositionCommand(
        true,
        "2030-01-01T00:11:00Z",
      ),
      () => clone(finalLiveInput),
      directDependencies,
    );
  assertCondition(
    applied.status === "persisted"
      && applied.persistence_status === "committed"
      && applied.confirmation_verified
      && applied.persistence_attempted
      && applied.acceptance_persisted
      && applied.requester_authentication_replay_write
      && applied.provider_authentication_replay_write
      && applied.acceptance_replay_write
      && applied.quote_acceptance_recorded
      && applied.authority.acceptance_persistence
      && applied.authority.quote_acceptance_recorded
      && applied.runtime_binding_enabled
      && applied.runtime_confirmation_verified
      && applied.composition_invoked
      && applied.composition_confirmation_injected
      && applied.trusted_input_provider_forwarded,
    "temporary trusted requester persistence apply changed",
  );
  assertCondition(
    applied.authority.payment_authorization === false
      && applied.authority.payment_execution === false
      && applied.authority.execution_authorization === false
      && applied.authority.work_dispatch === false
      && applied.authority.work_credit_write === false
      && applied.authority.runtime_mutation === false
      && applied.authority.money_movement === false,
    "temporary trusted requester persistence gained unrelated authority",
  );
  assertCondition(
    directVerifiedPacketProvider
      && internalAdapterConfirmationVerified,
    "same-process persistence packet boundary was not verified",
  );

  const afterApply =
    defaultDependencies.inspectStore(
      config.persistence_config,
    );
  assertCondition(
    afterApply.current !== null
      && afterApply.current.replayState.revision === 1,
    "temporary persistence store revision changed",
  );
  assertCondition(
    applied.acceptance_id !== null
      && afterApply.current
        .replayState
        .consumed_acceptance_ids
        .includes(applied.acceptance_id),
    "temporary persistence store omitted acceptance consumption",
  );
  temporaryAcceptancePersistencePerformed =
    true;
  temporaryReplayWritesPerformed =
    true;

  const preCommitInspection = {
    root_realpath:
      root,
    current:
      null,
    generation_count:
      0,
  };
  const duplicateDependencies:
    PublicAgentServiceTrustedRequesterAcceptancePersistenceCompositionDependenciesV1 = {
      ...defaultDependencies,
      inspectStore: () =>
        preCommitInspection,
    };
  const duplicate =
    executePublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeBindingV1(
      config,
      compositionCommand(
        true,
        "2030-01-01T00:12:00Z",
      ),
      () => clone(finalLiveInput),
      duplicateDependencies,
    );
  assertCondition(
    duplicate.status === "duplicate"
      && duplicate.persistence_status === "duplicate"
      && duplicate.acceptance_persisted
      && duplicate.quote_acceptance_recorded,
    "exact duplicate persistence status was not preserved",
  );
  duplicateStatusVerified =
    true;

  assertCondition(
    fs.lstatSync(root).isDirectory()
      && (fs.lstatSync(root).mode & 0o777)
        === 0o700,
    "temporary persistence root mode changed",
  );
} finally {
  for (
    const parent
    of temporaryParents.reverse()
  ) {
    fs.rmSync(
      parent,
      {
        recursive: true,
        force: true,
      },
    );
  }
  temporaryRootRemoved =
    temporaryParents.every(
      (parent) =>
        !fs.existsSync(parent),
    );
}

assertCondition(
  temporaryAcceptancePersistencePerformed,
  "temporary acceptance persistence was not proved",
);
assertCondition(
  temporaryReplayWritesPerformed,
  "temporary replay writes were not proved",
);
assertCondition(
  duplicateStatusVerified,
  "duplicate status mapping was not proved",
);
assertCondition(
  temporaryRootRemoved,
  "temporary proof roots were not removed",
);
assertCondition(
  productionAcceptancePersistencePerformed === false,
  "production acceptance persistence occurred",
);

const schema =
  readJson(compositionSchemaPath) as Record<string, unknown>;
assertCondition(
  schema.x_void_marker
    === "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_SCHEMA_V1",
  "composition schema marker changed",
);
const schemaRequired =
  schema.required as unknown[];
for (const key of [
  "config",
  "command",
  "trusted_replay_plan_input",
  "result",
]) {
  assertCondition(
    schemaRequired.includes(key),
    `composition schema no longer requires ${key}`,
  );
}

const compositionSource =
  readText(compositionAdapterPath);
const docs =
  readText(compositionDocsPath)
    .replace(/\s+/g, " ");
const workflow =
  readText(compositionWorkflowPath);
for (const token of [
  "executePublicAgentServiceTrustedRequesterAcceptancePersistenceCompositionV1",
  "PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_CONFIRMATION",
  "PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_CONFIRMATION",
  "trustedReplayPlanInputProvider",
  "runtime_binding_enabled",
  "composition_confirmation_injected",
  "loadPublicAgentServiceTrustedRequesterAcceptancePersistenceRuntimeConfigFromEnvironmentV1",
]) {
  assertCondition(
    compositionSource.includes(token),
    `composition source omitted required boundary token: ${token}`,
  );
}
for (const forbidden of [
  "node:http",
  "node:https",
  "node:net",
  "node:tls",
  "child_process",
  "fetch(",
]) {
  assertCondition(
    !compositionSource.includes(forbidden),
    `composition source gained forbidden runtime dependency: ${forbidden}`,
  );
}
for (const phrase of [
  "disabled-by-default runtime gate",
  "server-owned trusted replay-plan input provider",
  "persistTrustedRequesterAcceptanceRuntimeV1",
  "persistTrustedRequesterAcceptanceReplayPlanV1",
  "persistVerifiedAcceptanceReplayTransitionV1",
  "Every temporary root is removed before exit",
  "production persistence",
  "no payment authorization",
]) {
  assertCondition(
    docs.includes(phrase),
    `composition documentation omitted boundary phrase: ${phrase}`,
  );
}
assertCondition(
  workflow.includes(
    "npx tsx scripts/prove_public_agent_service_trusted_requester_acceptance_persistence_runtime_binding_v1.ts",
  ),
  "composition workflow does not run the exact proof",
);

console.log(
  "marker=VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_BINDING_PROOF_V1",
);
console.log(
  `example_status=${recomputedExample.status}`,
);
console.log(
  `dry_status=${dryStatus}`,
);
console.log(
  "runtime_binding_disabled_by_default_verified=true",
);
console.log(
  "runtime_confirmation_wall_verified=true",
);
console.log(
  "composition_confirmation_injected=true",
);
console.log(
  "trusted_input_provider_forwarded=true",
);
console.log(
  "http_route_mounted=false",
);
console.log(
  "src_index_modified=false",
);
console.log(
  "runtime_configuration_installed=false",
);
console.log(
  "trusted_requester_replay_plan_verification_composed=true",
);
console.log(
  "persistence_adapter_same_process_composition_verified=true",
);
console.log(
  `direct_verified_packet_provider=${directVerifiedPacketProvider}`,
);
console.log(
  `internal_adapter_confirmation_verified=${internalAdapterConfirmationVerified}`,
);
console.log(
  `temporary_acceptance_persistence_performed=${temporaryAcceptancePersistencePerformed}`,
);
console.log(
  `temporary_replay_writes_performed=${temporaryReplayWritesPerformed}`,
);
console.log(
  `exact_duplicate_status_verified=${duplicateStatusVerified}`,
);
console.log(
  `temporary_proof_roots_removed=${temporaryRootRemoved}`,
);
console.log(
  "production_acceptance_persistence_performed=false",
);
console.log(
  "production_replay_write_performed=false",
);
console.log("payment_authorization=false");
console.log("payment_execution=false");
console.log("work_execution_authorization=false");
console.log("work_dispatch=false");
console.log("work_credit_write=false");
console.log("wallet_access=false");
console.log("runtime_mutation=false");
console.log("service_restart=no");
console.log("deployment=no");
console.log("money_movement=false");
console.log(
  "VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_RUNTIME_BINDING_V1_EXACT_GREEN",
);
