import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  materializePublicAgentServiceRequesterAcceptanceAuthenticationV1,
  requesterAcceptanceAuthenticationIdV1,
  requesterAcceptanceAuthenticationKeyIdV1,
  requesterAcceptanceAuthenticationSigningBytesV1,
  requesterAcceptanceKeyBindingIdV1,
  verifyPublicAgentServiceRequesterAcceptanceAuthenticationV1,
  type RequesterAcceptanceAuthenticationBodyV1,
  type RequesterAcceptanceKeyBindingDraftV1,
} from "./public_agent_service_requester_acceptance_authentication_v1.js";
import {
  materializePublicAgentServiceAuthenticatedQuoteAcceptanceHandoffV1,
} from "./public_agent_service_authenticated_quote_acceptance_handoff_v1.js";
import {
  providerKeyBindingIdV1,
  providerQuoteResponseAuthenticationIdV1,
  providerQuoteResponseAuthenticationKeyIdV1,
  providerQuoteResponseAuthenticationSigningBytesV1,
  type ProviderKeyBindingDraftV1,
  type ProviderQuoteResponseAuthenticationBodyV1,
} from "./public_agent_service_provider_quote_response_authentication_v1.js";
import {
  materializePublicAgentServiceProviderQuoteResponseV1,
} from "./public_agent_service_provider_quote_response_v1.js";
import {
  canonicalJson,
} from "./agent_paid_work_order_envelope_v1.js";

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

const inputPath =
  "examples/public-agent-service-requester-acceptance-authentication-v1.example.json";
const schemaPath =
  "schemas/public-agent-service-requester-acceptance-authentication-v1.schema.json";
const docsPath =
  "docs/public-agent/public-agent-service-requester-acceptance-authentication-v1.md";
const adapterPath =
  "scripts/public_agent_service_requester_acceptance_authentication_v1.ts";
const workflowPath =
  ".github/workflows/public-agent-service-requester-acceptance-authentication-v1.yml";
const handoffDocsPath =
  "docs/public-agent/public-agent-service-authenticated-quote-acceptance-handoff-v1.md";
const acceptanceDocsPath =
  "docs/public/agent-paid-work-acceptance-envelope-v1.md";
const credentialDocsPath =
  "docs/operators/agent-paid-work-credential-registry-v1.md";
const catalogPath =
  "ops/public/agent-services-v1/catalog.json";

const input = readJson(inputPath);
const catalog = readJson(catalogPath);
const packet =
  materializePublicAgentServiceRequesterAcceptanceAuthenticationV1(
    input,
    catalog,
  );
verifyPublicAgentServiceRequesterAcceptanceAuthenticationV1(
  input,
  catalog,
  packet,
);

assertCondition(
  packet.marker
    === "VOID_PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_PACKET_V1",
  "requester authentication packet marker mismatch",
);
assertCondition(
  packet.requester_authentication_id
    === "voidawra1_d566ba5e3fea270705277320c73659cabd1bbaf1313ca8527d80baadcb0e2125",
  "fixture requester_authentication_id changed",
);
assertCondition(
  packet.status === "example_only",
  "fixture requester authentication status changed",
);
assertCondition(
  packet.source.handoff_id === "voidawah1_372c59ebf27c315b9951167b99756980e659fc4016c8ac58922644a4c16ca0c1",
  "handoff_id changed",
);
assertCondition(
  packet.source.provider_authentication_id
    === "voidawqa1_63798b41fd72559ef02a8e95ae3d8983dc8aa5eb9ae6598acc449ae49425a6a3",
  "provider authentication ID changed",
);
assertCondition(
  packet.source.provider_key_binding_id
    === "voidapkb1_e08c544901a19885cfdf747f745ac8a9675724574ef306b7050c9f2d1f045153",
  "provider key binding changed",
);
assertCondition(
  packet.source.provider_key_id
    === "ed25519:c757b9733573942b2838751946e1b19e2ad7bf84acd35b89b5c86e61c9605eba",
  "provider key ID changed",
);
assertCondition(
  packet.source.response_id === "voidawqr1_00e4cb3c90ac2de2016aee3b13cd87bd7b2d52bb6cfbad018bc379b829868f9c",
  "response_id changed",
);
assertCondition(
  packet.source.quote_id === "voidawq1_c3ccb95c186dbd39557a0356bd77cabf3949a6544e93653e738074e69d9b701f",
  "quote_id changed",
);
assertCondition(
  packet.source.quote_handoff_id
    === "voidawqh1_3be866b0d325662b37f505dec27069e620553a6a9bc855540d3c490e2c07c3cf",
  "quote handoff ID changed",
);
assertCondition(
  packet.source.work_order_id
    === "voidawo1_a328fbbee6ea0822c8fe5212e19cba23b889c489a39235a2529243d8f19fc106",
  "work-order ID changed",
);
assertCondition(
  packet.source.requester_agent_id
    === "agent.example.researcher",
  "requester agent changed",
);
assertCondition(
  packet.source.requester_key_binding_id
    === "voidarkb1_8facf1e0d2d79381de3d6203a1f292e1ca7ca56860da560296194cf2634bb769",
  "requester key binding changed",
);
assertCondition(
  packet.source.requester_key_id
    === "ed25519:e8ba0912271f3e8158e501c136a5ba7e53b055620f3b31eab021b5e9317e8361",
  "requester key ID changed",
);
assertCondition(
  packet.verification.requester_authentication_verified
    === true,
  "fixture requester authentication did not verify",
);
assertCondition(
  packet.acceptance_gate
    .eligible_for_acceptance_materialization
    === false,
  "fixture became acceptance-materialization eligible",
);
assertCondition(
  packet.acceptance_gate
    .acceptance_replay_consumer_verified
    === false,
  "fixture claimed replay consumer verification",
);
assertCondition(
  Object.values(packet.authority).every(
    (value) => value === false,
  ),
  "fixture requester authentication granted authority",
);

const reorderedInput = {
  requester_authentication_envelope:
    (input as Record<string, unknown>)
      .requester_authentication_envelope,
  requester_key_binding:
    (input as Record<string, unknown>)
      .requester_key_binding,
  authenticated_quote_acceptance_handoff_input:
    (input as Record<string, unknown>)
      .authenticated_quote_acceptance_handoff_input,
  evidence_mode:
    (input as Record<string, unknown>)
      .evidence_mode,
  version:
    (input as Record<string, unknown>).version,
  marker:
    (input as Record<string, unknown>).marker,
};
const reordered =
  materializePublicAgentServiceRequesterAcceptanceAuthenticationV1(
    reorderedInput,
    catalog,
  );
assertCondition(
  reordered.requester_authentication_id
    === packet.requester_authentication_id,
  "input key order changed requester authentication ID",
);
assertCondition(
  canonicalJson(reordered)
    === canonicalJson(packet),
  "input key order changed requester authentication packet",
);

const tamperedSignature = clone(input) as Record<string, unknown>;
const tamperedSignatureEnvelope = (
  tamperedSignature.requester_authentication_envelope
) as Record<string, unknown>;
const originalSignature = String(
  tamperedSignatureEnvelope.signature_base64,
);
tamperedSignatureEnvelope.signature_base64 =
  (originalSignature.startsWith("A") ? "B" : "A")
  + originalSignature.slice(1);
expectReject(
  "tampered requester signature",
  () =>
    materializePublicAgentServiceRequesterAcceptanceAuthenticationV1(
      tamperedSignature,
      catalog,
    ),
);

const submitScopeReuse = clone(input) as Record<string, unknown>;
const submitBinding = (
  submitScopeReuse.requester_key_binding
) as Record<string, unknown>;
submitBinding.authority_scope =
  "agent_paid_work_submit";
expectReject(
  "submission credential scope reuse",
  () =>
    materializePublicAgentServiceRequesterAcceptanceAuthenticationV1(
      submitScopeReuse,
      catalog,
    ),
);

const mismatchedRequester = clone(input) as Record<string, unknown>;
const mismatchEnvelope = (
  mismatchedRequester.requester_authentication_envelope
) as Record<string, unknown>;
mismatchEnvelope.requester_agent_id =
  "agent.example.other";
expectReject(
  "mismatched requester",
  () =>
    materializePublicAgentServiceRequesterAcceptanceAuthenticationV1(
      mismatchedRequester,
      catalog,
    ),
);

const revokedRequesterKey = clone(input) as Record<string, unknown>;
const revokedBinding = (
  revokedRequesterKey.requester_key_binding
) as Record<string, unknown>;
revokedBinding.revoked_at_utc =
  "2030-01-01T00:05:30Z";
expectReject(
  "revoked requester key",
  () =>
    materializePublicAgentServiceRequesterAcceptanceAuthenticationV1(
      revokedRequesterKey,
      catalog,
    ),
);

const outlivesHandoff = clone(input) as Record<string, unknown>;
const outlivesEnvelope = (
  outlivesHandoff.requester_authentication_envelope
) as Record<string, unknown>;
outlivesEnvelope.expires_at_utc =
  "2030-01-01T20:00:01Z";
expectReject(
  "requester authentication outlives handoff",
  () =>
    materializePublicAgentServiceRequesterAcceptanceAuthenticationV1(
      outlivesHandoff,
      catalog,
    ),
);

const tamperedPacket = clone(packet);
tamperedPacket.acceptance_gate
  .eligible_for_acceptance_materialization = true;
expectReject(
  "tampered requester authentication packet",
  () =>
    verifyPublicAgentServiceRequesterAcceptanceAuthenticationV1(
      input,
      catalog,
      tamperedPacket,
    ),
);

// Build a complete ephemeral external provider-authenticated handoff.
const externalInput = clone(input) as Record<string, unknown>;
externalInput.evidence_mode =
  "external_requester_evidence";
const externalHandoffInput = (
  externalInput.authenticated_quote_acceptance_handoff_input
) as Record<string, unknown>;
const externalProviderAuthentication = (
  externalHandoffInput.provider_authentication_input
) as Record<string, unknown>;
externalProviderAuthentication.evidence_mode =
  "external_provider_evidence";
const externalResponseInput = (
  externalProviderAuthentication.provider_quote_response_input
) as Record<string, unknown>;
const externalQuoteHandoff = (
  externalResponseInput.quote_handoff_input
) as Record<string, unknown>;
externalQuoteHandoff.evidence_mode =
  "external_receiver_receipt";

const externalResponsePacket =
  materializePublicAgentServiceProviderQuoteResponseV1(
    externalResponseInput,
    catalog,
  );
assertCondition(
  externalResponsePacket.status
    === "provider_authentication_required",
  "external response did not require provider authentication",
);

const providerGenerated =
  crypto.generateKeyPairSync("ed25519");
const providerPublicPem =
  providerGenerated.publicKey
    .export({
      type: "spki",
      format: "pem",
    })
    .toString();
const providerGeneratedKeyId =
  providerQuoteResponseAuthenticationKeyIdV1(
    providerPublicPem,
  );
const providerBindingDraft:
  ProviderKeyBindingDraftV1 = {
    marker:
      "VOID_PUBLIC_AGENT_SERVICE_PROVIDER_KEY_BINDING_V1",
    version: 1,
    binding_status:
      "operator_approved_snapshot",
    provider_id:
      externalResponsePacket.provider_claim.provider_id,
    authority_scope:
      "provider_quote_response_authenticate",
    key_id:
      providerGeneratedKeyId,
    public_key_pem:
      providerPublicPem,
    valid_from_utc:
      "2030-01-01T00:00:00Z",
    expires_at_utc:
      "2030-02-01T00:00:00Z",
    revoked_at_utc:
      null,
    binding_nonce:
      "requester-auth-external-provider-binding-0001",
  };
const providerBinding = {
  ...providerBindingDraft,
  binding_id:
    providerKeyBindingIdV1(
      providerBindingDraft,
    ),
};
externalProviderAuthentication.provider_key_binding =
  providerBinding;

const providerBody:
  ProviderQuoteResponseAuthenticationBodyV1 = {
    marker:
      "VOID_PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_EVIDENCE_V1",
    version: 1,
    signature_scheme:
      "ed25519-spki-sha256-v1",
    signature_domain:
      "VOID_PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_V1",
    canonicalization:
      "void-canonical-json-v1",
    response_id:
      externalResponsePacket.response_id,
    quote_id:
      externalResponsePacket.source.quote_id,
    handoff_id:
      externalResponsePacket.source.handoff_id,
    work_order_id:
      externalResponsePacket.source.work_order_id,
    submission_id:
      externalResponsePacket.source.submission_id,
    request_sha256:
      externalResponsePacket.source.request_sha256,
    receipt_id:
      externalResponsePacket.source.receipt_id,
    provider_id:
      externalResponsePacket.provider_claim.provider_id,
    catalog_fingerprint_sha256:
      externalResponsePacket.source
        .catalog_fingerprint_sha256,
    provider_key_binding_id:
      providerBinding.binding_id,
    authentication_nonce:
      "requester-auth-external-provider-auth-0001",
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
const providerEnvelopeWithoutId = {
  ...providerBody,
  signature_base64:
    providerSignature,
};
externalProviderAuthentication.authentication_envelope = {
  ...providerEnvelopeWithoutId,
  authentication_id:
    providerQuoteResponseAuthenticationIdV1(
      providerEnvelopeWithoutId,
    ),
};

const externalHandoffPacket =
  materializePublicAgentServiceAuthenticatedQuoteAcceptanceHandoffV1(
    externalHandoffInput,
    catalog,
  );
assertCondition(
  externalHandoffPacket.status
    === "requester_authentication_required",
  "external handoff status changed",
);
assertCondition(
  externalHandoffPacket.acceptance_gate
    .eligible_for_requester_authentication
    === true,
  "external handoff is not requester-authentication eligible",
);

// Generate ephemeral requester acceptance-authentication evidence.
const requesterGenerated =
  crypto.generateKeyPairSync("ed25519");
const requesterPublicPem =
  requesterGenerated.publicKey
    .export({
      type: "spki",
      format: "pem",
    })
    .toString();
const requesterGeneratedKeyId =
  requesterAcceptanceAuthenticationKeyIdV1(
    requesterPublicPem,
  );
const requesterBindingDraft:
  RequesterAcceptanceKeyBindingDraftV1 = {
    marker:
      "VOID_PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_KEY_BINDING_V1",
    version: 1,
    binding_status:
      "operator_approved_snapshot",
    requester_agent_id:
      externalHandoffPacket.source.requester_agent_id,
    authority_scope:
      "agent_paid_work_accept",
    key_id:
      requesterGeneratedKeyId,
    public_key_pem:
      requesterPublicPem,
    valid_from_utc:
      "2030-01-01T00:00:00Z",
    expires_at_utc:
      "2030-02-01T00:00:00Z",
    revoked_at_utc:
      null,
    binding_nonce:
      "requester-auth-external-requester-binding-0001",
  };
const requesterBinding = {
  ...requesterBindingDraft,
  binding_id:
    requesterAcceptanceKeyBindingIdV1(
      requesterBindingDraft,
    ),
};
externalInput.requester_key_binding =
  requesterBinding;

const requesterBody:
  RequesterAcceptanceAuthenticationBodyV1 = {
    marker:
      "VOID_PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_EVIDENCE_V1",
    version: 1,
    signature_scheme:
      "ed25519-spki-sha256-v1",
    signature_domain:
      "VOID_PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_V1",
    canonicalization:
      "void-canonical-json-v1",
    handoff_id:
      externalHandoffPacket.handoff_id,
    provider_authentication_id:
      externalHandoffPacket.source.authentication_id,
    provider_key_binding_id:
      externalHandoffPacket.source.provider_key_binding_id,
    provider_key_id:
      externalHandoffPacket.source.key_id,
    response_id:
      externalHandoffPacket.source.response_id,
    quote_id:
      externalHandoffPacket.source.quote_id,
    quote_handoff_id:
      externalHandoffPacket.source.quote_handoff_id,
    work_order_id:
      externalHandoffPacket.source.work_order_id,
    requester_agent_id:
      externalHandoffPacket.source.requester_agent_id,
    provider_id:
      externalHandoffPacket.source.provider_id,
    catalog_fingerprint_sha256:
      externalHandoffPacket.source.catalog_fingerprint_sha256,
    requester_key_binding_id:
      requesterBinding.binding_id,
    acceptance_nonce:
      externalHandoffPacket.requester_intent.acceptance_nonce,
    authentication_nonce:
      "requester-auth-external-requester-auth-0001",
    created_at_utc:
      "2030-01-01T00:06:00Z",
    expires_at_utc:
      "2030-01-01T19:30:00Z",
  };
const requesterSignature =
  crypto.sign(
    null,
    requesterAcceptanceAuthenticationSigningBytesV1(
      requesterBody,
    ),
    requesterGenerated.privateKey,
  ).toString("base64");
const requesterEnvelopeWithoutId = {
  ...requesterBody,
  signature_base64:
    requesterSignature,
};
externalInput.requester_authentication_envelope = {
  ...requesterEnvelopeWithoutId,
  requester_authentication_id:
    requesterAcceptanceAuthenticationIdV1(
      requesterEnvelopeWithoutId,
    ),
};

const externalPacket =
  materializePublicAgentServiceRequesterAcceptanceAuthenticationV1(
    externalInput,
    catalog,
  );
assertCondition(
  externalPacket.status
    === "requester_authenticated_for_acceptance",
  "external requester authentication status changed",
);
assertCondition(
  externalPacket.verification
    .requester_authentication_verified === true,
  "external requester authentication did not verify",
);
assertCondition(
  externalPacket.acceptance_gate
    .eligible_for_acceptance_materialization
    === true,
  "external requester authentication is not acceptance-materialization eligible",
);
assertCondition(
  externalPacket.acceptance_gate
    .acceptance_replay_consumer_verified
    === false,
  "external requester authentication claimed replay consumer verification",
);
assertCondition(
  Object.values(externalPacket.authority).every(
    (value) => value === false,
  ),
  "external requester authentication granted authority",
);

const schema =
  readJson(schemaPath) as Record<string, unknown>;
assertCondition(
  schema.x_void_marker
    === "VOID_PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_SCHEMA_V1",
  "requester authentication schema marker mismatch",
);

const docs =
  readText(docsPath).replace(/\s+/g, " ");
const adapter = readText(adapterPath);
const workflow = readText(workflowPath);
const handoffDocs =
  readText(handoffDocsPath).replace(/\s+/g, " ");
const acceptanceDocs =
  readText(acceptanceDocsPath).replace(/\s+/g, " ");
const credentialDocs =
  readText(credentialDocsPath).replace(/\s+/g, " ");

assertCondition(
  docs.includes("VOID_PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_V1"),
  "requester authentication docs marker missing",
);
assertCondition(
  docs.includes("agent_paid_work_accept"),
  "requester acceptance scope missing",
);
assertCondition(
  docs.includes(
    "does not create or materialize an acceptance envelope",
  ),
  "acceptance boundary missing",
);
assertCondition(
  docs.includes(
    "does not write requester, provider, or acceptance replay state",
  ),
  "replay-write boundary missing",
);
assertCondition(
  handoffDocs.includes(
    "requester authentication for the dedicated acceptance scope",
  ),
  "upstream requester-authentication boundary changed",
);
assertCondition(
  acceptanceDocs.includes(
    "requester_authentication_required=true",
  ),
  "acceptance requester-authentication requirement changed",
);
assertCondition(
  credentialDocs.includes(
    "exactly one scope: `agent_paid_work_submit`",
  ),
  "submission credential scope boundary changed",
);
assertCondition(
  workflow.includes(
    "prove_public_agent_service_requester_acceptance_authentication_v1.ts",
  ),
  "workflow proof command missing",
);
assertCondition(
  /uses:\s*actions\/checkout@v4\s+with:\s+fetch-depth:\s*0/.test(
    workflow,
  ),
  "workflow must use full-history checkout",
);
assertCondition(
  !/from\s+["']node:(?:http|https|net|tls|child_process)["']/.test(
    adapter,
  ),
  "requester authentication adapter imports network or subprocess authority",
);
assertCondition(
  !/\bfetch\s*\(/.test(adapter),
  "requester authentication adapter performs HTTP",
);
assertCondition(
  !adapter.includes("crypto.sign("),
  "requester authentication adapter performs production signing",
);
assertCondition(
  !adapter.includes(
    "materializeAgentPaidWorkAcceptance",
  ),
  "requester authentication adapter imports acceptance materialization",
);

console.log(
  JSON.stringify(
    {
      marker:
        "VOID_PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_ADAPTER_V1",
      input_marker:
        "VOID_PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_V1",
      output_marker:
        "VOID_PUBLIC_AGENT_SERVICE_REQUESTER_ACCEPTANCE_AUTHENTICATION_PACKET_V1",
      requester_authentication_id:
        packet.requester_authentication_id,
      status:
        packet.status,
      catalog_fingerprint_sha256:
        packet.source.catalog_fingerprint_sha256,
      handoff_id:
        packet.source.handoff_id,
      provider_authentication_id:
        packet.source.provider_authentication_id,
      provider_key_binding_id:
        packet.source.provider_key_binding_id,
      provider_key_id:
        packet.source.provider_key_id,
      response_id:
        packet.source.response_id,
      quote_id:
        packet.source.quote_id,
      quote_handoff_id:
        packet.source.quote_handoff_id,
      work_order_id:
        packet.source.work_order_id,
      requester_agent_id:
        packet.source.requester_agent_id,
      requester_key_binding_id:
        packet.source.requester_key_binding_id,
      requester_key_id:
        packet.source.requester_key_id,
      acceptance_nonce:
        packet.source.acceptance_nonce,
      provider_authentication_verified:
        true,
      requester_authentication_verified:
        true,
      eligible_for_acceptance_materialization:
        false,
      acceptance_replay_consumer_verified:
        false,
      external_mode_provider_authentication_verified:
        externalPacket.verification
          .provider_authentication_verified,
      external_mode_requester_authentication_verified:
        externalPacket.verification
          .requester_authentication_verified,
      external_mode_eligible_for_acceptance_materialization:
        externalPacket.acceptance_gate
          .eligible_for_acceptance_materialization,
      external_mode_acceptance_replay_consumer_verified:
        externalPacket.acceptance_gate
          .acceptance_replay_consumer_verified,
      submit_credential_reuse_forbidden:
        true,
      acceptance_created:
        false,
      acceptance_id:
        null,
      requester_authentication_replay_write:
        false,
      provider_authentication_replay_write:
        false,
      acceptance_replay_write:
        false,
      quote_acceptance:
        false,
      payment_authorization:
        false,
      execution_authorization:
        false,
      work_dispatch:
        false,
      production_signing:
        false,
      http_submission:
        false,
      credential_change:
        false,
      runtime_mutation:
        false,
      money_movement:
        false,
      ephemeral_provider_test_signing_performed:
        true,
      ephemeral_requester_test_signing_performed:
        true,
      proof:
        "green",
    },
    null,
    2,
  ),
);
