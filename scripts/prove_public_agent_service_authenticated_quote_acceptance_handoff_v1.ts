import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  authenticatedQuoteAcceptanceHandoffIdV1,
  materializePublicAgentServiceAuthenticatedQuoteAcceptanceHandoffV1,
  verifyPublicAgentServiceAuthenticatedQuoteAcceptanceHandoffV1,
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
  "examples/public-agent-service-authenticated-quote-acceptance-handoff-v1.example.json";
const schemaPath =
  "schemas/public-agent-service-authenticated-quote-acceptance-handoff-v1.schema.json";
const docsPath =
  "docs/public-agent/public-agent-service-authenticated-quote-acceptance-handoff-v1.md";
const adapterPath =
  "scripts/public_agent_service_authenticated_quote_acceptance_handoff_v1.ts";
const workflowPath =
  ".github/workflows/public-agent-service-authenticated-quote-acceptance-handoff-v1.yml";
const authenticationDocsPath =
  "docs/public-agent/public-agent-service-provider-quote-response-authentication-v1.md";
const acceptanceDocsPath =
  "docs/public/agent-paid-work-acceptance-envelope-v1.md";
const credentialDocsPath =
  "docs/operators/agent-paid-work-credential-registry-v1.md";
const catalogPath =
  "ops/public/agent-services-v1/catalog.json";

const input = readJson(inputPath);
const catalog = readJson(catalogPath);
const packet =
  materializePublicAgentServiceAuthenticatedQuoteAcceptanceHandoffV1(
    input,
    catalog,
  );
verifyPublicAgentServiceAuthenticatedQuoteAcceptanceHandoffV1(
  input,
  catalog,
  packet,
);

assertCondition(
  packet.marker
    === "VOID_PUBLIC_AGENT_SERVICE_AUTHENTICATED_QUOTE_ACCEPTANCE_HANDOFF_PACKET_V1",
  "handoff packet marker mismatch",
);
assertCondition(
  packet.handoff_id === "voidawah1_372c59ebf27c315b9951167b99756980e659fc4016c8ac58922644a4c16ca0c1",
  "fixture handoff_id changed",
);
assertCondition(
  /^voidawah1_[0-9a-f]{64}$/.test(packet.handoff_id),
  "handoff_id format mismatch",
);
assertCondition(
  packet.status === "example_only",
  "fixture handoff status changed",
);
assertCondition(
  packet.source.authentication_id
    === "voidawqa1_63798b41fd72559ef02a8e95ae3d8983dc8aa5eb9ae6598acc449ae49425a6a3",
  "authentication_id changed",
);
assertCondition(
  packet.source.provider_key_binding_id
    === "voidapkb1_e08c544901a19885cfdf747f745ac8a9675724574ef306b7050c9f2d1f045153",
  "provider key binding changed",
);
assertCondition(
  packet.source.key_id === "ed25519:c757b9733573942b2838751946e1b19e2ad7bf84acd35b89b5c86e61c9605eba",
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
  packet.source.requester_agent_id
    === "agent.example.researcher",
  "requester agent changed",
);
assertCondition(
  packet.provider_authentication_gate
    .provider_authentication_verified === true,
  "provider authentication verification changed",
);
assertCondition(
  packet.provider_authentication_gate
    .external_provider_evidence_verified === false,
  "fixture became external provider evidence",
);
assertCondition(
  packet.acceptance_gate
    .eligible_for_requester_authentication === false,
  "fixture became requester-authentication eligible",
);
assertCondition(
  packet.acceptance_gate
    .requester_authentication_verified === false,
  "requester authentication became verified",
);
assertCondition(
  packet.acceptance_gate
    .requester_authentication_scope
    === "agent_paid_work_accept",
  "requester acceptance scope changed",
);
assertCondition(
  packet.acceptance_gate
    .submit_credential_reuse_forbidden === true,
  "submission credential reuse became allowed",
);
assertCondition(
  packet.acceptance_gate
    .acceptance_materialization_allowed === false,
  "acceptance materialization became allowed",
);
assertCondition(
  packet.acceptance_gate.acceptance_id === null,
  "handoff created an acceptance ID",
);
assertCondition(
  packet.acceptance_gate
    .acceptance_replay_consumer_verified === false,
  "acceptance replay consumer became verified",
);
assertCondition(
  Object.values(packet.authority).every(
    (value) => value === false,
  ),
  "fixture handoff granted authority",
);

const reorderedInput = {
  requester_intent:
    (input as Record<string, unknown>).requester_intent,
  provider_authentication_input:
    (input as Record<string, unknown>).provider_authentication_input,
  version:
    (input as Record<string, unknown>).version,
  marker:
    (input as Record<string, unknown>).marker,
};
const reordered =
  materializePublicAgentServiceAuthenticatedQuoteAcceptanceHandoffV1(
    reorderedInput,
    catalog,
  );
assertCondition(
  reordered.handoff_id === packet.handoff_id,
  "input key order changed handoff_id",
);
assertCondition(
  canonicalJson(reordered)
    === canonicalJson(packet),
  "input key order changed handoff packet",
);

const changedNonce = clone(input) as Record<string, unknown>;
(
  changedNonce.requester_intent as Record<string, unknown>
).acceptance_nonce =
  "authenticated-acceptance-handoff-example-20300101-0002";
const changedNoncePacket =
  materializePublicAgentServiceAuthenticatedQuoteAcceptanceHandoffV1(
    changedNonce,
    catalog,
  );
assertCondition(
  changedNoncePacket.handoff_id !== packet.handoff_id,
  "acceptance nonce did not change handoff_id",
);

const mismatchedRequester =
  clone(input) as Record<string, unknown>;
(
  mismatchedRequester.requester_intent as Record<string, unknown>
).requester_agent_id = "agent.example.other";
expectReject(
  "mismatched requester",
  () =>
    materializePublicAgentServiceAuthenticatedQuoteAcceptanceHandoffV1(
      mismatchedRequester,
      catalog,
    ),
);

const submitScopeReuse =
  clone(input) as Record<string, unknown>;
const submitScopeAuthentication = (
  submitScopeReuse.requester_intent as Record<string, unknown>
).requester_authentication as Record<string, unknown>;
submitScopeAuthentication.required_scope =
  "agent_paid_work_submit";
expectReject(
  "submission credential scope reuse",
  () =>
    materializePublicAgentServiceAuthenticatedQuoteAcceptanceHandoffV1(
      submitScopeReuse,
      catalog,
    ),
);

const fakeRequesterAuthentication =
  clone(input) as Record<string, unknown>;
const fakeAuthentication = (
  fakeRequesterAuthentication.requester_intent as Record<string, unknown>
).requester_authentication as Record<string, unknown>;
fakeAuthentication.verified = true;
expectReject(
  "requester authentication pre-verified",
  () =>
    materializePublicAgentServiceAuthenticatedQuoteAcceptanceHandoffV1(
      fakeRequesterAuthentication,
      catalog,
    ),
);

const outlivesProvider =
  clone(input) as Record<string, unknown>;
(
  outlivesProvider.requester_intent as Record<string, unknown>
).expires_at_utc = "2030-01-01T21:00:01Z";
expectReject(
  "requester intent outlives provider authentication",
  () =>
    materializePublicAgentServiceAuthenticatedQuoteAcceptanceHandoffV1(
      outlivesProvider,
      catalog,
    ),
);

const tamperedPacket = clone(packet);
tamperedPacket.acceptance_gate
  .acceptance_materialization_allowed = true;
expectReject(
  "tampered handoff packet",
  () =>
    verifyPublicAgentServiceAuthenticatedQuoteAcceptanceHandoffV1(
      input,
      catalog,
      tamperedPacket,
    ),
);

// External provider evidence: generate an ephemeral provider key, authenticate
// the existing deterministic quote response, then prove the handoff advances
// only to requester authentication. No acceptance is created.
const externalInput = clone(input) as Record<string, unknown>;
const externalProviderAuthentication = (
  externalInput.provider_authentication_input
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

const generated =
  crypto.generateKeyPairSync("ed25519");
const generatedPublicPem =
  generated.publicKey
    .export({
      type: "spki",
      format: "pem",
    })
    .toString();
const generatedKeyId =
  providerQuoteResponseAuthenticationKeyIdV1(
    generatedPublicPem,
  );
const externalBindingDraft:
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
    key_id: generatedKeyId,
    public_key_pem: generatedPublicPem,
    valid_from_utc:
      "2030-01-01T00:00:00Z",
    expires_at_utc:
      "2030-02-01T00:00:00Z",
    revoked_at_utc: null,
    binding_nonce:
      "acceptance-handoff-external-key-binding-0001",
  };
const externalBinding = {
  ...externalBindingDraft,
  binding_id:
    providerKeyBindingIdV1(
      externalBindingDraft,
    ),
};
externalProviderAuthentication.provider_key_binding =
  externalBinding;

const externalBody:
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
      externalBinding.binding_id,
    authentication_nonce:
      "acceptance-handoff-external-provider-auth-0001",
    created_at_utc:
      "2030-01-01T00:04:00Z",
    expires_at_utc:
      "2030-01-01T21:00:00Z",
  };
const externalSignature =
  crypto.sign(
    null,
    providerQuoteResponseAuthenticationSigningBytesV1(
      externalBody,
    ),
    generated.privateKey,
  ).toString("base64");
const externalEnvelopeWithoutId = {
  ...externalBody,
  signature_base64:
    externalSignature,
};
externalProviderAuthentication.authentication_envelope = {
  ...externalEnvelopeWithoutId,
  authentication_id:
    providerQuoteResponseAuthenticationIdV1(
      externalEnvelopeWithoutId,
    ),
};

const externalRequesterIntent = (
  externalInput.requester_intent
) as Record<string, unknown>;
externalRequesterIntent.acceptance_nonce =
  "acceptance-handoff-external-requester-0001";

const externalPacket =
  materializePublicAgentServiceAuthenticatedQuoteAcceptanceHandoffV1(
    externalInput,
    catalog,
  );
assertCondition(
  externalPacket.status
    === "requester_authentication_required",
  "external handoff status changed",
);
assertCondition(
  externalPacket.provider_authentication_gate
    .provider_authentication_verified === true,
  "external provider authentication did not verify",
);
assertCondition(
  externalPacket.provider_authentication_gate
    .external_provider_evidence_verified === true,
  "external evidence was not recognized",
);
assertCondition(
  externalPacket.acceptance_gate
    .eligible_for_requester_authentication === true,
  "external packet is not requester-authentication eligible",
);
assertCondition(
  externalPacket.acceptance_gate
    .requester_authentication_verified === false,
  "external handoff authenticated requester unexpectedly",
);
assertCondition(
  externalPacket.acceptance_gate
    .acceptance_materialization_allowed === false,
  "external handoff materialized acceptance",
);
assertCondition(
  externalPacket.acceptance_gate.acceptance_id
    === null,
  "external handoff created acceptance ID",
);
assertCondition(
  externalPacket.acceptance_gate
    .acceptance_replay_consumer_verified === false,
  "external handoff claimed replay consumer verification",
);
assertCondition(
  Object.values(externalPacket.authority).every(
    (value) => value === false,
  ),
  "external handoff granted authority",
);

const schema =
  readJson(schemaPath) as Record<string, unknown>;
assertCondition(
  schema.x_void_marker
    === "VOID_PUBLIC_AGENT_SERVICE_AUTHENTICATED_QUOTE_ACCEPTANCE_HANDOFF_SCHEMA_V1",
  "handoff schema marker mismatch",
);

const docs =
  readText(docsPath).replace(/\s+/g, " ");
const adapter = readText(adapterPath);
const workflow = readText(workflowPath);
const authenticationDocs =
  readText(authenticationDocsPath)
    .replace(/\s+/g, " ");
const acceptanceDocs =
  readText(acceptanceDocsPath)
    .replace(/\s+/g, " ");
const credentialDocs =
  readText(credentialDocsPath)
    .replace(/\s+/g, " ");

assertCondition(
  docs.includes(
    "VOID_PUBLIC_AGENT_SERVICE_AUTHENTICATED_QUOTE_ACCEPTANCE_HANDOFF_V1",
  ),
  "handoff documentation marker missing",
);
assertCondition(
  docs.includes("agent_paid_work_accept"),
  "requester acceptance scope missing",
);
assertCondition(
  docs.includes(
    "does not materialize an acceptance envelope",
  ),
  "acceptance materialization boundary missing",
);
assertCondition(
  docs.includes(
    "does not claim that an acceptance-specific replay consumer exists",
  ),
  "replay-consumer honesty boundary missing",
);
assertCondition(
  authenticationDocs.includes(
    "authentication_id_consumption_required=true",
  ),
  "provider authentication consumption boundary changed",
);
assertCondition(
  acceptanceDocs.includes(
    "requester_authentication_required=true",
  ),
  "acceptance requester-authentication boundary changed",
);
assertCondition(
  acceptanceDocs.includes(
    "single_active_acceptance_per_quote_required=true",
  ),
  "acceptance single-active boundary changed",
);
assertCondition(
  credentialDocs.includes(
    "exactly one scope: `agent_paid_work_submit`",
  ),
  "submission credential scope boundary changed",
);
assertCondition(
  workflow.includes(
    "prove_public_agent_service_authenticated_quote_acceptance_handoff_v1.ts",
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
  "handoff adapter imports network or subprocess authority",
);
assertCondition(
  !/\bfetch\s*\(/.test(adapter),
  "handoff adapter performs HTTP",
);
assertCondition(
  !adapter.includes("materializeAgentPaidWorkAcceptance"),
  "handoff adapter imports acceptance materialization",
);

console.log(
  JSON.stringify(
    {
      marker:
        "VOID_PUBLIC_AGENT_SERVICE_AUTHENTICATED_QUOTE_ACCEPTANCE_HANDOFF_ADAPTER_V1",
      input_marker:
        "VOID_PUBLIC_AGENT_SERVICE_AUTHENTICATED_QUOTE_ACCEPTANCE_HANDOFF_V1",
      output_marker:
        "VOID_PUBLIC_AGENT_SERVICE_AUTHENTICATED_QUOTE_ACCEPTANCE_HANDOFF_PACKET_V1",
      handoff_id:
        packet.handoff_id,
      status:
        packet.status,
      catalog_fingerprint_sha256:
        packet.source.catalog_fingerprint_sha256,
      authentication_id:
        packet.source.authentication_id,
      provider_key_binding_id:
        packet.source.provider_key_binding_id,
      key_id:
        packet.source.key_id,
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
      provider_authentication_verified:
        true,
      eligible_for_requester_authentication:
        false,
      requester_authentication_scope:
        "agent_paid_work_accept",
      requester_authentication_verified:
        false,
      acceptance_materialization_allowed:
        false,
      acceptance_created:
        false,
      acceptance_id:
        null,
      acceptance_replay_consumer_verified:
        false,
      external_mode_provider_authentication_verified:
        externalPacket.provider_authentication_gate
          .provider_authentication_verified,
      external_mode_eligible_for_requester_authentication:
        externalPacket.acceptance_gate
          .eligible_for_requester_authentication,
      external_mode_requester_authentication_verified:
        externalPacket.acceptance_gate
          .requester_authentication_verified,
      external_mode_acceptance_created:
        false,
      submit_credential_reuse_forbidden:
        true,
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
      ephemeral_test_signing_performed:
        true,
      proof:
        "green",
    },
    null,
    2,
  ),
);
