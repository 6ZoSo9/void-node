import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  materializePublicAgentServiceProviderQuoteResponseAuthenticationV1,
  providerKeyBindingIdV1,
  providerQuoteResponseAuthenticationIdV1,
  providerQuoteResponseAuthenticationKeyIdV1,
  providerQuoteResponseAuthenticationSigningBytesV1,
  verifyPublicAgentServiceProviderQuoteResponseAuthenticationV1,
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

const inputPath =
  "examples/public-agent-service-provider-quote-response-authentication-v1.example.json";
const schemaPath =
  "schemas/public-agent-service-provider-quote-response-authentication-v1.schema.json";
const docsPath =
  "docs/public-agent/public-agent-service-provider-quote-response-authentication-v1.md";
const adapterPath =
  "scripts/public_agent_service_provider_quote_response_authentication_v1.ts";
const workflowPath =
  ".github/workflows/public-agent-service-provider-quote-response-authentication-v1.yml";
const responseDocsPath =
  "docs/public-agent/public-agent-service-provider-quote-response-v1.md";
const quoteDocsPath =
  "docs/public/agent-paid-work-quote-envelope-v1.md";
const acceptanceDocsPath =
  "docs/public/agent-paid-work-acceptance-envelope-v1.md";
const credentialDocsPath =
  "docs/operators/agent-paid-work-credential-registry-v1.md";
const p2pDocsPath =
  "docs/architecture/p2p-signed-trust-policy-wall-v1.md";
const catalogPath =
  "ops/public/agent-services-v1/catalog.json";

const input = readJson(inputPath);
const catalog = readJson(catalogPath);
const packet =
  materializePublicAgentServiceProviderQuoteResponseAuthenticationV1(
    input,
    catalog,
  );
verifyPublicAgentServiceProviderQuoteResponseAuthenticationV1(
  input,
  catalog,
  packet,
);

assertCondition(
  packet.marker
    === "VOID_PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_PACKET_V1",
  "authentication packet marker mismatch",
);
assertCondition(
  packet.authentication_id === "voidawqa1_63798b41fd72559ef02a8e95ae3d8983dc8aa5eb9ae6598acc449ae49425a6a3",
  "fixture authentication_id changed",
);
assertCondition(
  /^voidawqa1_[0-9a-f]{64}$/.test(packet.authentication_id),
  "authentication_id format mismatch",
);
assertCondition(
  packet.status === "example_only",
  "fixture status changed",
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
  packet.source.handoff_id === "voidawqh1_3be866b0d325662b37f505dec27069e620553a6a9bc855540d3c490e2c07c3cf",
  "handoff_id changed",
);
assertCondition(
  packet.source.work_order_id === "voidawo1_a328fbbee6ea0822c8fe5212e19cba23b889c489a39235a2529243d8f19fc106",
  "work_order_id changed",
);
assertCondition(
  packet.source.submission_id === "voidawsr1_797d2e02a13f783fdfe3844d9231fd9bfa1c21b62dd850188903e2b934068e16",
  "submission_id changed",
);
assertCondition(
  packet.source.request_sha256 === "31b9590cb9802cd35449290a2663e996b90ad114180f6c207349f04ed321c8cc",
  "request_sha256 changed",
);
assertCondition(
  packet.source.receipt_id === "voidawsi1_1111111111111111111111111111111111111111111111111111111111111111",
  "receipt_id changed",
);
assertCondition(
  packet.source.provider_id === "void.provider.example.datanet.verify",
  "provider_id changed",
);
assertCondition(
  packet.source.key_id === "ed25519:c757b9733573942b2838751946e1b19e2ad7bf84acd35b89b5c86e61c9605eba",
  "fixture key_id changed",
);
assertCondition(
  packet.source.provider_key_binding_id === "voidapkb1_e08c544901a19885cfdf747f745ac8a9675724574ef306b7050c9f2d1f045153",
  "fixture binding_id changed",
);
assertCondition(
  packet.verification.provider_authentication_verified === true,
  "fixture cryptographic provider authentication failed",
);
assertCondition(
  packet.acceptance_gate.eligible_for_acceptance === false,
  "example fixture became acceptance eligible",
);
assertCondition(
  packet.acceptance_gate.reason
    === "example_fixture_not_live_trust",
  "example fixture acceptance reason changed",
);
assertCondition(
  Object.values(packet.authority).every((value) => value === false),
  "authentication packet granted authority",
);

const reorderedInput = {
  authentication_envelope:
    (input as Record<string, unknown>).authentication_envelope,
  provider_key_binding:
    (input as Record<string, unknown>).provider_key_binding,
  provider_quote_response_input:
    (input as Record<string, unknown>).provider_quote_response_input,
  evidence_mode:
    (input as Record<string, unknown>).evidence_mode,
  version: (input as Record<string, unknown>).version,
  marker: (input as Record<string, unknown>).marker,
};
const reordered =
  materializePublicAgentServiceProviderQuoteResponseAuthenticationV1(
    reorderedInput,
    catalog,
  );
assertCondition(
  reordered.authentication_id === packet.authentication_id,
  "input key order changed authentication_id",
);
assertCondition(
  canonicalJson(reordered) === canonicalJson(packet),
  "input key order changed authentication packet",
);

const badSignature = clone(input) as Record<string, unknown>;
const badSignatureEnvelope =
  badSignature.authentication_envelope as Record<string, unknown>;
const signature = String(badSignatureEnvelope.signature_base64);
badSignatureEnvelope.signature_base64 =
  (signature.startsWith("A") ? "B" : "A") + signature.slice(1);
expectReject("tampered signature", () =>
  materializePublicAgentServiceProviderQuoteResponseAuthenticationV1(
    badSignature,
    catalog,
  ),
);

const wrongProvider = clone(input) as Record<string, unknown>;
(
  wrongProvider.provider_key_binding as Record<string, unknown>
).provider_id = "void.provider.other";
expectReject("mismatched provider binding", () =>
  materializePublicAgentServiceProviderQuoteResponseAuthenticationV1(
    wrongProvider,
    catalog,
  ),
);

const wrongKey = clone(input) as Record<string, unknown>;
(
  wrongKey.provider_key_binding as Record<string, unknown>
).key_id = "ed25519:" + "0".repeat(64);
expectReject("mismatched key ID", () =>
  materializePublicAgentServiceProviderQuoteResponseAuthenticationV1(
    wrongKey,
    catalog,
  ),
);

const wrongBindingId = clone(input) as Record<string, unknown>;
(
  wrongBindingId.provider_key_binding as Record<string, unknown>
).binding_id = "voidapkb1_" + "0".repeat(64);
expectReject("mismatched binding ID", () =>
  materializePublicAgentServiceProviderQuoteResponseAuthenticationV1(
    wrongBindingId,
    catalog,
  ),
);

const wrongAuthenticationId = clone(input) as Record<string, unknown>;
(
  wrongAuthenticationId.authentication_envelope as Record<string, unknown>
).authentication_id = "voidawqa1_" + "0".repeat(64);
expectReject("mismatched authentication ID", () =>
  materializePublicAgentServiceProviderQuoteResponseAuthenticationV1(
    wrongAuthenticationId,
    catalog,
  ),
);

const revoked = clone(input) as Record<string, unknown>;
(
  revoked.provider_key_binding as Record<string, unknown>
).revoked_at_utc = "2030-01-01T00:03:30Z";
expectReject("revoked provider key", () =>
  materializePublicAgentServiceProviderQuoteResponseAuthenticationV1(
    revoked,
    catalog,
  ),
);

const expired = clone(input) as Record<string, unknown>;
(
  expired.authentication_envelope as Record<string, unknown>
).expires_at_utc = "2030-01-01T23:30:00Z";
expectReject("authentication outlives quote", () =>
  materializePublicAgentServiceProviderQuoteResponseAuthenticationV1(
    expired,
    catalog,
  ),
);

const tamperedPacket = clone(packet);
tamperedPacket.acceptance_gate.eligible_for_acceptance = true;
expectReject("tampered authentication packet", () =>
  verifyPublicAgentServiceProviderQuoteResponseAuthenticationV1(
    input,
    catalog,
    tamperedPacket,
  ),
);

// Prove external evidence can become eligible without embedding a private key
// or live provider registry in the repository. The proof generates an
// ephemeral Ed25519 key and signs only a temporary fixture.
const externalInput = clone(input) as Record<string, unknown>;
externalInput.evidence_mode = "external_provider_evidence";
const externalResponseInput =
  externalInput.provider_quote_response_input as Record<string, unknown>;
(
  externalResponseInput.quote_handoff_input as Record<string, unknown>
).evidence_mode = "external_receiver_receipt";

const externalResponsePacket =
  materializePublicAgentServiceProviderQuoteResponseV1(
    externalResponseInput,
    catalog,
  );
assertCondition(
  externalResponsePacket.status === "provider_authentication_required",
  "external response did not require provider authentication",
);

const generated = crypto.generateKeyPairSync("ed25519");
const generatedPublicPem = generated.publicKey
  .export({ type: "spki", format: "pem" })
  .toString();
const generatedKeyId =
  providerQuoteResponseAuthenticationKeyIdV1(
    generatedPublicPem,
  );
const externalBindingDraft: ProviderKeyBindingDraftV1 = {
  marker: "VOID_PUBLIC_AGENT_SERVICE_PROVIDER_KEY_BINDING_V1",
  version: 1,
  binding_status: "operator_approved_snapshot",
  provider_id: externalResponsePacket.provider_claim.provider_id,
  authority_scope: "provider_quote_response_authenticate",
  key_id: generatedKeyId,
  public_key_pem: generatedPublicPem,
  valid_from_utc: "2030-01-01T00:00:00Z",
  expires_at_utc: "2030-02-01T00:00:00Z",
  revoked_at_utc: null,
  binding_nonce: "provider-key-binding-external-proof-0001",
};
const externalBinding = {
  ...externalBindingDraft,
  binding_id: providerKeyBindingIdV1(externalBindingDraft),
};
externalInput.provider_key_binding = externalBinding;

const externalBody: ProviderQuoteResponseAuthenticationBodyV1 = {
  marker:
    "VOID_PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_EVIDENCE_V1",
  version: 1,
  signature_scheme: "ed25519-spki-sha256-v1",
  signature_domain:
    "VOID_PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_V1",
  canonicalization: "void-canonical-json-v1",
  response_id: externalResponsePacket.response_id,
  quote_id: externalResponsePacket.source.quote_id,
  handoff_id: externalResponsePacket.source.handoff_id,
  work_order_id: externalResponsePacket.source.work_order_id,
  submission_id: externalResponsePacket.source.submission_id,
  request_sha256: externalResponsePacket.source.request_sha256,
  receipt_id: externalResponsePacket.source.receipt_id,
  provider_id: externalResponsePacket.provider_claim.provider_id,
  catalog_fingerprint_sha256:
    externalResponsePacket.source.catalog_fingerprint_sha256,
  provider_key_binding_id: externalBinding.binding_id,
  authentication_nonce:
    "provider-authentication-external-proof-0001",
  created_at_utc: "2030-01-01T00:04:00Z",
  expires_at_utc: "2030-01-01T21:00:00Z",
};
const externalSignature = crypto.sign(
  null,
  providerQuoteResponseAuthenticationSigningBytesV1(externalBody),
  generated.privateKey,
).toString("base64");
const externalEnvelopeWithoutId = {
  ...externalBody,
  signature_base64: externalSignature,
};
externalInput.authentication_envelope = {
  ...externalEnvelopeWithoutId,
  authentication_id:
    providerQuoteResponseAuthenticationIdV1(
      externalEnvelopeWithoutId,
    ),
};

const externalPacket =
  materializePublicAgentServiceProviderQuoteResponseAuthenticationV1(
    externalInput,
    catalog,
  );
assertCondition(
  externalPacket.status
    === "provider_authenticated_for_acceptance",
  "external provider authentication status changed",
);
assertCondition(
  externalPacket.verification.provider_authentication_verified === true,
  "external provider authentication did not verify",
);
assertCondition(
  externalPacket.acceptance_gate.eligible_for_acceptance === true,
  "external authenticated response is not acceptance eligible",
);
assertCondition(
  externalPacket.acceptance_gate.reason
    === "provider_authentication_verified",
  "external acceptance reason changed",
);
assertCondition(
  Object.values(externalPacket.authority).every(
    (value) => value === false,
  ),
  "external authentication packet granted authority",
);

const schema = readJson(schemaPath) as Record<string, unknown>;
assertCondition(
  schema.x_void_marker
    === "VOID_PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_SCHEMA_V1",
  "authentication schema marker mismatch",
);

const docs = readText(docsPath).replace(/\s+/g, " ");
const adapter = readText(adapterPath);
const workflow = readText(workflowPath);
const responseDocs =
  readText(responseDocsPath).replace(/\s+/g, " ");
const quoteDocs =
  readText(quoteDocsPath).replace(/\s+/g, " ");
const acceptanceDocs =
  readText(acceptanceDocsPath).replace(/\s+/g, " ");
const credentialDocs =
  readText(credentialDocsPath).replace(/\s+/g, " ");
const p2pDocs =
  readText(p2pDocsPath).replace(/\s+/g, " ");

assertCondition(
  docs.includes(
    "VOID_PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_V1",
  ),
  "authentication docs marker missing",
);
assertCondition(
  docs.includes("Ed25519"),
  "authentication docs scheme missing",
);
assertCondition(
  docs.includes("caller-supplied trust anchor"),
  "authentication docs trust-anchor boundary missing",
);
assertCondition(
  docs.includes("does not create a provider registry"),
  "authentication docs registry boundary missing",
);
assertCondition(
  docs.includes("example fixture remains ineligible"),
  "authentication docs fixture boundary missing",
);
assertCondition(
  responseDocs.includes(
    "provider authentication remains unverified",
  ),
  "sealed response authentication boundary changed",
);
assertCondition(
  quoteDocs.includes("provider_id") && quoteDocs.includes("declarative"),
  "quote provider identity boundary changed",
);
assertCondition(
  acceptanceDocs.includes(
    "acceptance_replay_protection_required=true",
  ),
  "acceptance replay boundary changed",
);
assertCondition(
  credentialDocs.includes("agent_paid_work_submit"),
  "requester credential scope changed",
);
assertCondition(
  p2pDocs.includes("domain separator")
    && p2pDocs.includes("Ed25519")
    && p2pDocs.includes("key_id"),
  "existing signed-envelope primitives changed",
);
assertCondition(
  workflow.includes(
    "prove_public_agent_service_provider_quote_response_authentication_v1.ts",
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
  "authentication adapter imports network or subprocess authority",
);
assertCondition(
  !/\bfetch\s*\(/.test(adapter),
  "authentication adapter performs an HTTP request",
);

console.log(
  JSON.stringify(
    {
      marker:
        "VOID_PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_ADAPTER_V1",
      input_marker:
        "VOID_PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_V1",
      output_marker:
        "VOID_PUBLIC_AGENT_SERVICE_PROVIDER_QUOTE_RESPONSE_AUTHENTICATION_PACKET_V1",
      signature_scheme: "ed25519-spki-sha256-v1",
      authentication_id: packet.authentication_id,
      status: packet.status,
      catalog_fingerprint_sha256:
        packet.source.catalog_fingerprint_sha256,
      response_id: packet.source.response_id,
      quote_id: packet.source.quote_id,
      handoff_id: packet.source.handoff_id,
      work_order_id: packet.source.work_order_id,
      submission_id: packet.source.submission_id,
      request_sha256: packet.source.request_sha256,
      receipt_id: packet.source.receipt_id,
      provider_id: packet.source.provider_id,
      key_id: packet.source.key_id,
      provider_key_binding_id:
        packet.source.provider_key_binding_id,
      provider_authentication_verified: true,
      eligible_for_acceptance: false,
      external_mode_provider_authentication_verified:
        externalPacket.verification.provider_authentication_verified,
      external_mode_eligible_for_acceptance:
        externalPacket.acceptance_gate.eligible_for_acceptance,
      provider_selection: false,
      provider_key_binding_creation: false,
      provider_key_registry_write: false,
      quote_generation: false,
      quote_submission: false,
      quote_acceptance: false,
      payment_authorization: false,
      payment_execution: false,
      work_dispatch: false,
      production_signing: false,
      http_submission: false,
      credential_change: false,
      runtime_mutation: false,
      money_movement: false,
      ephemeral_test_signing_performed: true,
      proof: "green",
    },
    null,
    2,
  ),
);
