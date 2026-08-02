import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DIRECT_AUTHENTICATION_CANONICALIZATION,
  DIRECT_AUTHENTICATION_INPUT_MARKER,
  DIRECT_AUTHENTICATION_PACKET_MARKER,
  DIRECT_AUTHENTICATION_SIGNATURE_SCHEME,
  DIRECT_PROVIDER_AUTHENTICATION_EVIDENCE_MARKER,
  DIRECT_PROVIDER_AUTHENTICATION_SCOPE,
  DIRECT_PROVIDER_KEY_BINDING_MARKER,
  DIRECT_PROVIDER_SIGNATURE_DOMAIN,
  DIRECT_REQUESTER_AUTHENTICATION_EVIDENCE_MARKER,
  DIRECT_REQUESTER_AUTHENTICATION_SCOPE,
  DIRECT_REQUESTER_KEY_BINDING_MARKER,
  DIRECT_REQUESTER_SIGNATURE_DOMAIN,
  canonicalJson,
  directAuthenticationKeyIdV1,
  directProviderAuthenticationIdV1,
  directProviderAuthenticationSigningBytesV1,
  directProviderKeyBindingIdV1,
  directRequesterAuthenticationIdV1,
  directRequesterAuthenticationSigningBytesV1,
  directRequesterKeyBindingIdV1,
  materializeAuthenticatedPaidWorkDirectQuoteActivationAuthenticationV1,
  sha256Hex,
  verifyAuthenticatedPaidWorkDirectQuoteActivationAuthenticationV1,
  type DirectProviderAuthenticationBodyV1,
  type DirectProviderKeyBindingDraftV1,
  type DirectRequesterAuthenticationBodyV1,
  type DirectRequesterKeyBindingDraftV1,
} from "./authenticated_paid_work_direct_quote_activation_authentication_v1.js";

function fail(message: string): never {
  throw new Error(message);
}
function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
function expectReject(label: string, callback: () => unknown): void {
  try {
    callback();
  } catch {
    return;
  }
  fail(`expected rejection: ${label}`);
}
function allFalse(value: Record<string, unknown>, label: string): void {
  for (const [key, item] of Object.entries(value)) {
    assertCondition(item === false || item === null, `${label}.${key} exceeded boundary`);
  }
}

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const examplePath = path.join(
  root,
  "examples/authenticated-paid-work-direct-quote-activation-authentication-v1.example.json",
);
const schemaPath = path.join(
  root,
  "schemas/authenticated-paid-work-direct-quote-activation-authentication-v1.schema.json",
);
const docsPath = path.join(
  root,
  "docs/operations/authenticated-paid-work-direct-quote-activation-authentication-v1.md",
);
const workflowPath = path.join(
  root,
  ".github/workflows/authenticated-paid-work-direct-quote-activation-authentication-v1.yml",
);

for (const file of [examplePath, schemaPath, docsPath, workflowPath]) {
  const metadata = fs.lstatSync(file);
  assertCondition(metadata.isFile() && !metadata.isSymbolicLink(), `regular file required: ${file}`);
}

const example = JSON.parse(fs.readFileSync(examplePath, "utf8")) as unknown;
const examplePacket =
  materializeAuthenticatedPaidWorkDirectQuoteActivationAuthenticationV1(example);
assertCondition(examplePacket.marker === DIRECT_AUTHENTICATION_PACKET_MARKER, "example packet marker mismatch");
assertCondition(examplePacket.status === "example_only", "example status mismatch");
assertCondition(
  examplePacket.activation_gate.eligible_for_atomic_activation_persistence === false,
  "example unexpectedly eligible",
);
verifyAuthenticatedPaidWorkDirectQuoteActivationAuthenticationV1(example, examplePacket);
allFalse(examplePacket.authority, "example authority");

const preparedPacket = {
  marker:
    "VOID_AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_AUTHORITY_PACKET_V1",
  version: 1,
  status: "prepared_requires_authenticated_atomic_activation",
  source: {
    work_order_id: `voidawo1_${"1".repeat(64)}`,
    quote_id: `voidawq1_${"2".repeat(64)}`,
    requester_agent_id: "agent.direct.proof.requester",
    provider_id: `voidapwp1_${"3".repeat(64)}`,
    capability_id: "datanet.fetch_verify",
    quote_asset: "USD",
    service_total: "0.01",
    max_fee_total: "0",
    payment_rail_id: "void.external.prepaid.v1",
  },
  prepared_artifacts: {
    acceptance_envelope: {
      marker: "VOID_AGENT_PAID_WORK_ACCEPTANCE_ENVELOPE_V1",
      version: 1,
      work_order_id: `voidawo1_${"1".repeat(64)}`,
      quote_id: `voidawq1_${"2".repeat(64)}`,
      created_at_utc: "2030-01-01T00:05:00Z",
      expires_at_utc: "2030-01-02T00:00:00Z",
      requester: { agent_id: "agent.direct.proof.requester" },
      provider: {
        provider_id: `voidapwp1_${"3".repeat(64)}`,
        capability_id: "datanet.fetch_verify",
      },
      commercial: {
        quote_asset: "USD",
        total: "0.01",
        payment_rail_id: "void.external.prepaid.v1",
      },
      terms: {
        quote_terms_accepted: true,
        requester_authentication_required: true,
        provider_authentication_required: true,
        separate_payment_authorization_required: true,
        separate_execution_authorization_required: true,
        acceptance_is_not_payment_instruction: true,
        acceptance_is_not_execution_instruction: true,
        acceptance_replay_protection_required: true,
        single_active_acceptance_per_quote_required: true,
        acceptance_is_not_funds_reservation: true,
        payment_authorization_granted: false,
        execution_authorization_granted: false,
      },
      nonce: "direct-proof-acceptance-nonce-0001",
      acceptance_id: `voidawa1_${"4".repeat(64)}`,
    },
    payment_intent_envelope: {
      marker: "VOID_AGENT_PAID_WORK_PAYMENT_INTENT_ENVELOPE_V1",
      version: 1,
      work_order_id: `voidawo1_${"1".repeat(64)}`,
      quote_id: `voidawq1_${"2".repeat(64)}`,
      acceptance_id: `voidawa1_${"4".repeat(64)}`,
      created_at_utc: "2030-01-01T00:06:00Z",
      expires_at_utc: "2030-01-02T00:00:00Z",
      requester: { agent_id: "agent.direct.proof.requester" },
      provider: { provider_id: `voidapwp1_${"3".repeat(64)}` },
      commercial: {
        quote_asset: "USD",
        total: "0.01",
        max_fee_total: "0",
        payment_rail_id: "void.external.prepaid.v1",
      },
      authorization: {
        payment_authorization_requested: true,
        payment_execution_granted: false,
        work_execution_authorization_granted: false,
      },
      nonce: "direct-proof-payment-intent-nonce-0001",
      payment_intent_id: `voidawpi1_${"5".repeat(64)}`,
    },
  },
  acceptance_gate: {
    acceptance_candidate_materialized: true,
    effective_quote_acceptance: false,
  },
  payment_authority_gate: {
    payment_intent_candidate_materialized: true,
    effective_payment_authorization: false,
    payment_execution_authorized: false,
  },
  authority: {
    quote_acceptance: false,
    payment_authorization: false,
    payment_execution: false,
    work_execution_authorization: false,
    work_dispatch: false,
    wallet_access: false,
    production_signing: false,
    transaction_construction: false,
    transaction_broadcast: false,
    payment_receipt_creation: false,
    work_credit_write: false,
    void_settlement: false,
    runtime_mutation: false,
    money_movement: false,
  },
  packet_id: `voidawqapa1_${"6".repeat(64)}`,
};

const providerGenerated = crypto.generateKeyPairSync("ed25519");
const requesterGenerated = crypto.generateKeyPairSync("ed25519");
const providerPublicPem = providerGenerated.publicKey
  .export({ type: "spki", format: "pem" })
  .toString();
const requesterPublicPem = requesterGenerated.publicKey
  .export({ type: "spki", format: "pem" })
  .toString();

const providerBindingDraft: DirectProviderKeyBindingDraftV1 = {
  marker: DIRECT_PROVIDER_KEY_BINDING_MARKER,
  version: 1,
  binding_status: "operator_approved_snapshot",
  provider_id: preparedPacket.source.provider_id,
  authority_scope: DIRECT_PROVIDER_AUTHENTICATION_SCOPE,
  key_id: directAuthenticationKeyIdV1(providerPublicPem),
  public_key_pem: providerPublicPem,
  valid_from_utc: "2029-12-31T00:00:00Z",
  expires_at_utc: "2030-02-01T00:00:00Z",
  revoked_at_utc: null,
  binding_nonce: "direct-provider-binding-proof-0001",
};
const providerBinding = {
  ...providerBindingDraft,
  binding_id: directProviderKeyBindingIdV1(providerBindingDraft),
};
const packetFingerprint = sha256Hex(canonicalJson(preparedPacket));
const providerBody: DirectProviderAuthenticationBodyV1 = {
  marker: DIRECT_PROVIDER_AUTHENTICATION_EVIDENCE_MARKER,
  version: 1,
  signature_scheme: DIRECT_AUTHENTICATION_SIGNATURE_SCHEME,
  signature_domain: DIRECT_PROVIDER_SIGNATURE_DOMAIN,
  canonicalization: DIRECT_AUTHENTICATION_CANONICALIZATION,
  prepared_packet_id: preparedPacket.packet_id,
  prepared_packet_fingerprint_sha256: packetFingerprint,
  quote_id: preparedPacket.source.quote_id,
  work_order_id: preparedPacket.source.work_order_id,
  acceptance_id:
    preparedPacket.prepared_artifacts.acceptance_envelope.acceptance_id,
  payment_intent_id:
    preparedPacket.prepared_artifacts.payment_intent_envelope.payment_intent_id,
  provider_id: preparedPacket.source.provider_id,
  provider_key_binding_id: providerBinding.binding_id,
  authentication_nonce: "direct-provider-auth-proof-0001",
  created_at_utc: "2030-01-01T00:10:00Z",
  expires_at_utc: "2030-01-01T12:00:00Z",
};
const providerSignature = crypto
  .sign(
    null,
    directProviderAuthenticationSigningBytesV1(providerBody),
    providerGenerated.privateKey,
  )
  .toString("base64");
const providerEnvelope = {
  ...providerBody,
  signature_base64: providerSignature,
  authentication_id: directProviderAuthenticationIdV1({
    ...providerBody,
    signature_base64: providerSignature,
  }),
};

const requesterBindingDraft: DirectRequesterKeyBindingDraftV1 = {
  marker: DIRECT_REQUESTER_KEY_BINDING_MARKER,
  version: 1,
  binding_status: "operator_approved_snapshot",
  requester_agent_id: preparedPacket.source.requester_agent_id,
  authority_scope: DIRECT_REQUESTER_AUTHENTICATION_SCOPE,
  key_id: directAuthenticationKeyIdV1(requesterPublicPem),
  public_key_pem: requesterPublicPem,
  valid_from_utc: "2029-12-31T00:00:00Z",
  expires_at_utc: "2030-02-01T00:00:00Z",
  revoked_at_utc: null,
  binding_nonce: "direct-requester-binding-proof-0001",
};
const requesterBinding = {
  ...requesterBindingDraft,
  binding_id: directRequesterKeyBindingIdV1(requesterBindingDraft),
};
const requesterBody: DirectRequesterAuthenticationBodyV1 = {
  marker: DIRECT_REQUESTER_AUTHENTICATION_EVIDENCE_MARKER,
  version: 1,
  signature_scheme: DIRECT_AUTHENTICATION_SIGNATURE_SCHEME,
  signature_domain: DIRECT_REQUESTER_SIGNATURE_DOMAIN,
  canonicalization: DIRECT_AUTHENTICATION_CANONICALIZATION,
  prepared_packet_id: preparedPacket.packet_id,
  prepared_packet_fingerprint_sha256: packetFingerprint,
  quote_id: preparedPacket.source.quote_id,
  work_order_id: preparedPacket.source.work_order_id,
  acceptance_id:
    preparedPacket.prepared_artifacts.acceptance_envelope.acceptance_id,
  payment_intent_id:
    preparedPacket.prepared_artifacts.payment_intent_envelope.payment_intent_id,
  requester_agent_id: preparedPacket.source.requester_agent_id,
  requester_key_binding_id: requesterBinding.binding_id,
  provider_authentication_id: providerEnvelope.authentication_id,
  acceptance_nonce:
    preparedPacket.prepared_artifacts.acceptance_envelope.nonce,
  authentication_nonce: "direct-requester-auth-proof-0001",
  created_at_utc: "2030-01-01T00:11:00Z",
  expires_at_utc: "2030-01-01T11:00:00Z",
};
const requesterSignature = crypto
  .sign(
    null,
    directRequesterAuthenticationSigningBytesV1(requesterBody),
    requesterGenerated.privateKey,
  )
  .toString("base64");
const requesterEnvelope = {
  ...requesterBody,
  signature_base64: requesterSignature,
  authentication_id: directRequesterAuthenticationIdV1({
    ...requesterBody,
    signature_base64: requesterSignature,
  }),
};

const liveInput = {
  marker: DIRECT_AUTHENTICATION_INPUT_MARKER,
  version: 1,
  evidence_mode: "operator_signed_direct_lineage",
  prepared_packet: preparedPacket,
  provider_key_binding: providerBinding,
  provider_authentication_envelope: providerEnvelope,
  requester_key_binding: requesterBinding,
  requester_authentication_envelope: requesterEnvelope,
};
const livePacket =
  materializeAuthenticatedPaidWorkDirectQuoteActivationAuthenticationV1(
    liveInput,
  );
assertCondition(
  livePacket.status === "direct_lineage_authenticated_for_atomic_activation",
  "live status mismatch",
);
assertCondition(
  livePacket.activation_gate.eligible_for_atomic_activation_persistence === true,
  "live packet was not eligible",
);
assertCondition(
  livePacket.activation_gate.public_service_submission_id_required === false,
  "public submission ID unexpectedly required",
);
assertCondition(
  livePacket.activation_gate.public_service_submission_id_synthesized === false,
  "public submission ID was synthesized",
);
assertCondition(
  !canonicalJson(livePacket).includes("voidawsr1_"),
  "public-service submission ID leaked into direct packet",
);
assertCondition(
  livePacket.provider_authentication.authentication_id ===
    providerEnvelope.authentication_id,
  "provider authentication binding mismatch",
);
assertCondition(
  livePacket.requester_authentication.authentication_id ===
    requesterEnvelope.authentication_id,
  "requester authentication binding mismatch",
);
assertCondition(
  livePacket.requester_authentication.provider_authentication_id_bound === true,
  "requester did not bind provider authentication",
);
allFalse(livePacket.authority, "live authority");
verifyAuthenticatedPaidWorkDirectQuoteActivationAuthenticationV1(
  liveInput,
  livePacket,
);

const wrongPacket = clone(liveInput);
(wrongPacket.prepared_packet as Record<string, unknown>).packet_id =
  `voidawqapa1_${"9".repeat(64)}`;
expectReject("prepared packet tampering", () =>
  materializeAuthenticatedPaidWorkDirectQuoteActivationAuthenticationV1(
    wrongPacket,
  ),
);

const badProviderSignature = clone(liveInput);
const badProviderEnvelope =
  badProviderSignature.provider_authentication_envelope as Record<
    string,
    unknown
  >;
const providerSignatureText = String(badProviderEnvelope.signature_base64);
badProviderEnvelope.signature_base64 =
  (providerSignatureText.startsWith("A") ? "B" : "A") +
  providerSignatureText.slice(1);
expectReject("provider signature tampering", () =>
  materializeAuthenticatedPaidWorkDirectQuoteActivationAuthenticationV1(
    badProviderSignature,
  ),
);

const badRequesterSignature = clone(liveInput);
const badRequesterEnvelope =
  badRequesterSignature.requester_authentication_envelope as Record<
    string,
    unknown
  >;
const requesterSignatureText = String(badRequesterEnvelope.signature_base64);
badRequesterEnvelope.signature_base64 =
  (requesterSignatureText.startsWith("A") ? "B" : "A") +
  requesterSignatureText.slice(1);
expectReject("requester signature tampering", () =>
  materializeAuthenticatedPaidWorkDirectQuoteActivationAuthenticationV1(
    badRequesterSignature,
  ),
);

const wrongProvider = clone(liveInput);
(
  wrongProvider.provider_key_binding as Record<string, unknown>
).provider_id = "void.provider.other";
expectReject("wrong provider identity", () =>
  materializeAuthenticatedPaidWorkDirectQuoteActivationAuthenticationV1(
    wrongProvider,
  ),
);

const wrongRequester = clone(liveInput);
(
  wrongRequester.requester_key_binding as Record<string, unknown>
).requester_agent_id = "agent.other.requester";
expectReject("wrong requester identity", () =>
  materializeAuthenticatedPaidWorkDirectQuoteActivationAuthenticationV1(
    wrongRequester,
  ),
);

const wrongProviderAuth = clone(liveInput);
(
  wrongProviderAuth.requester_authentication_envelope as Record<
    string,
    unknown
  >
).provider_authentication_id = `voidadpa1_${"a".repeat(64)}`;
expectReject("requester/provider authentication mismatch", () =>
  materializeAuthenticatedPaidWorkDirectQuoteActivationAuthenticationV1(
    wrongProviderAuth,
  ),
);

const outlivesLineage = clone(liveInput);
(
  outlivesLineage.provider_authentication_envelope as Record<
    string,
    unknown
  >
).expires_at_utc = "2030-01-03T00:00:00Z";
expectReject("provider authentication outlives prepared lineage", () =>
  materializeAuthenticatedPaidWorkDirectQuoteActivationAuthenticationV1(
    outlivesLineage,
  ),
);

const wrongModeStatus = clone(liveInput);
wrongModeStatus.evidence_mode = "example_fixture";
expectReject("live bindings used as example fixture", () =>
  materializeAuthenticatedPaidWorkDirectQuoteActivationAuthenticationV1(
    wrongModeStatus,
  ),
);

const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8")) as Record<
  string,
  unknown
>;
assertCondition(
  schema.$id ===
    "https://void.network/schemas/authenticated-paid-work-direct-quote-activation-authentication-v1.schema.json",
  "schema ID mismatch",
);
assertCondition(schema.additionalProperties === false, "schema must be closed");
const docs = fs.readFileSync(docsPath, "utf8");
for (const required of [
  DIRECT_AUTHENTICATION_INPUT_MARKER,
  DIRECT_AUTHENTICATION_PACKET_MARKER,
  DIRECT_PROVIDER_AUTHENTICATION_SCOPE,
  DIRECT_REQUESTER_AUTHENTICATION_SCOPE,
  "voidawsr1_",
  "source-only",
]) {
  assertCondition(docs.includes(required), `docs missing: ${required}`);
}
const workflow = fs.readFileSync(workflowPath, "utf8");
assertCondition(
  workflow.includes(
    "scripts/prove_authenticated_paid_work_direct_quote_activation_authentication_v1.ts",
  ),
  "workflow proof scope missing",
);
assertCondition(!workflow.includes("push:"), "workflow must not add a push trigger");

console.log(`example_packet_id=${examplePacket.packet_id}`);
console.log(`live_packet_id=${livePacket.packet_id}`);
console.log(
  `live_provider_authentication_id=${livePacket.provider_authentication.authentication_id}`,
);
console.log(
  `live_requester_authentication_id=${livePacket.requester_authentication.authentication_id}`,
);
console.log("direct_prepared_packet_fingerprint_verified=true");
console.log("provider_ed25519_signature_verified=true");
console.log("requester_ed25519_signature_verified=true");
console.log("requester_binds_provider_authentication=true");
console.log("public_service_submission_id_required=false");
console.log("public_service_submission_id_synthesized=false");
console.log("direct_lineage_eligible_for_atomic_persistence=true");
console.log("replay_identifiers_consumed=false");
console.log("effective_quote_acceptance=false");
console.log("effective_payment_authorization=false");
console.log("payment_execution=false");
console.log("work_dispatch=false");
console.log("wallet_access=false");
console.log("production_signing=false");
console.log("money_movement=false");
console.log(
  "VOID_AUTHENTICATED_PAID_WORK_DIRECT_QUOTE_ACTIVATION_AUTHENTICATION_V1_PROOF_GREEN=true",
);
