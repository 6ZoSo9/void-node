import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  FRESH_DIRECT_FINALIZATION_INPUT_MARKER,
  FRESH_DIRECT_PROVIDER_SIGNATURE_SUBMISSION_MARKER,
  REQUIRED_PROTECTED_LINEAGE_IDENTIFIERS_V1,
  TERMINALLY_RETIRED_DIRECT_QUOTE_IDS_V1,
  finalizeAuthenticatedPaidWorkFreshDirectAuthenticationPreparationV1,
  freshDirectQuoteAuthenticationPreparationDependencyIdentityV1,
  prepareAuthenticatedPaidWorkFreshDirectProviderSigningRequestV1,
  prepareAuthenticatedPaidWorkFreshDirectRequesterSigningRequestV1,
  verifyAuthenticatedPaidWorkFreshDirectAuthenticationPreparationV1,
  verifyAuthenticatedPaidWorkFreshDirectProviderSigningRequestV1,
  verifyAuthenticatedPaidWorkFreshDirectRequesterSigningRequestV1,
  type AuthenticatedPaidWorkFreshDirectFinalizationInputV1,
  type AuthenticatedPaidWorkFreshDirectProviderSignatureSubmissionV1,
  type AuthenticatedPaidWorkFreshDirectQuotePreparationInputV1,
} from "./authenticated_paid_work_fresh_direct_quote_authentication_preparation_v1.js";

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

function expectReject(label: string, action: () => unknown): void {
  try {
    action();
  } catch {
    return;
  }
  fail(`${label} was not rejected`);
}

function mutateSignature(value: string): string {
  const first = value.startsWith("A") ? "B" : "A";
  return first + value.slice(1);
}

function allFalse(value: Record<string, unknown>, label: string): void {
  for (const [key, item] of Object.entries(value)) {
    assertCondition(item === false, `${label}.${key} exceeded authority`);
  }
}

function readJson(relative: string): unknown {
  return JSON.parse(
    fs.readFileSync(path.resolve(relative), "utf8"),
  ) as unknown;
}

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
process.chdir(repoRoot);

const examplePath =
  "examples/authenticated-paid-work-fresh-direct-quote-authentication-preparation-v1.example.json";
const schemaPath =
  "schemas/authenticated-paid-work-fresh-direct-quote-authentication-preparation-v1.schema.json";
const docsPath =
  "docs/operations/authenticated-paid-work-fresh-direct-quote-authentication-preparation-v1.md";
const workflowPath =
  ".github/workflows/authenticated-paid-work-fresh-direct-quote-authentication-preparation-v1.yml";
const sourcePath =
  "scripts/authenticated_paid_work_fresh_direct_quote_authentication_preparation_v1.ts";

for (const relative of [
  examplePath,
  schemaPath,
  docsPath,
  workflowPath,
  sourcePath,
]) {
  const metadata = fs.lstatSync(relative);
  assertCondition(
    metadata.isFile() && !metadata.isSymbolicLink(),
    `regular file required: ${relative}`,
  );
}

const example = readJson(
  examplePath,
) as AuthenticatedPaidWorkFreshDirectQuotePreparationInputV1;
const schema = readJson(schemaPath) as Record<string, unknown>;
const docs = fs
  .readFileSync(docsPath, "utf8")
  .replace(/\s+/g, " ");
const workflow = fs.readFileSync(workflowPath, "utf8");
const source = fs.readFileSync(sourcePath, "utf8");

assertCondition(
  schema.$id ===
    "https://void.network/schemas/authenticated-paid-work-fresh-direct-quote-authentication-preparation-v1.schema.json",
  "schema ID mismatch",
);
assertCondition(
  schema.additionalProperties === false,
  "schema top level is not closed",
);
const authorityBoundary = schema.x_void_authority_boundary as Record<
  string,
  unknown
>;
for (const key of [
  "private_key_input",
  "production_signing",
  "live_quote_publication",
  "atomic_persistence",
  "quote_acceptance",
  "payment_authorization",
  "payment_execution",
  "work_dispatch",
  "wallet_access",
  "work_credit_write",
  "deployment",
  "money_movement",
]) {
  assertCondition(
    authorityBoundary[key] === false,
    `schema authority boundary ${key} changed`,
  );
}

for (const fragment of [
  "three stages",
  "contains no private-key field",
  "never calls `crypto.sign`",
  "never generates a key pair",
  "does not import or invoke",
  "executeAuthenticatedPaidWorkActivationPersistenceV1",
  "The expired quote remains permanently retired",
]) {
  assertCondition(
    docs.includes(fragment),
    `documentation fragment missing: ${fragment}`,
  );
}

assertCondition(
  workflow.includes(
    "prove_authenticated_paid_work_fresh_direct_quote_authentication_preparation_v1.ts",
  ),
  "workflow proof command missing",
);
assertCondition(
  /uses:\s*actions\/checkout@v4\s+with:\s+fetch-depth:\s*0/.test(
    workflow,
  ),
  "workflow full-history checkout missing",
);
assertCondition(
  !/from\s+["']node:(?:http|https|net|tls|child_process)["']/.test(
    source,
  ),
  "source imports network or subprocess authority",
);
assertCondition(
  !/\bfetch\s*\(/.test(source),
  "source performs HTTP",
);
assertCondition(
  !source.includes(
    "executeAuthenticatedPaidWorkActivationPersistenceV1",
  ),
  "source invokes activation persistence",
);
assertCondition(
  !source.includes(
    "AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_CONFIRMATION",
  ),
  "source imports activation confirmation",
);
assertCondition(
  !source.includes("crypto.sign"),
  "source performs signing",
);
assertCondition(
  !source.includes("generateKeyPair"),
  "source generates key pairs",
);
assertCondition(
  !source.includes("private_key_pem"),
  "source accepts a private-key field",
);

const providerKeys = crypto.generateKeyPairSync("ed25519");
const requesterKeys = crypto.generateKeyPairSync("ed25519");
const wrongProviderKeys = crypto.generateKeyPairSync("ed25519");

const preparation = clone(example);
preparation.evidence_mode =
  "operator_approved_public_key_snapshot";
preparation.provider_key_binding_plan.public_key_pem =
  providerKeys.publicKey
    .export({ type: "spki", format: "pem" })
    .toString();
preparation.requester_key_binding_plan.public_key_pem =
  requesterKeys.publicKey
    .export({ type: "spki", format: "pem" })
    .toString();

const providerRequest =
  prepareAuthenticatedPaidWorkFreshDirectProviderSigningRequestV1(
    preparation,
  );
verifyAuthenticatedPaidWorkFreshDirectProviderSigningRequestV1(
  preparation,
  providerRequest,
);
const repeatedProviderRequest =
  prepareAuthenticatedPaidWorkFreshDirectProviderSigningRequestV1(
    preparation,
  );
assertCondition(
  JSON.stringify(repeatedProviderRequest) ===
    JSON.stringify(providerRequest),
  "provider request is not deterministic",
);
assertCondition(
  providerRequest.status ===
    "fresh_quote_prepared_provider_signature_required",
  "provider request status mismatch",
);
assertCondition(
  !preparation.lineage_guard.retired_quote_ids.includes(
    providerRequest.source.quote_id,
  ),
  "provider request reused a retired quote",
);
assertCondition(
  !JSON.stringify(providerRequest).includes("voidawsr1_"),
  "provider request synthesized public-service lineage",
);
allFalse(
  providerRequest.authority as unknown as Record<string, unknown>,
  "provider request authority",
);

const providerSigningBytes = Buffer.from(
  providerRequest.provider_signing_request.signing_bytes_base64,
  "base64",
);
assertCondition(
  crypto
    .createHash("sha256")
    .update(providerSigningBytes)
    .digest("hex") ===
    providerRequest.provider_signing_request.signing_bytes_sha256,
  "provider signing-byte SHA mismatch",
);
const providerSignature = crypto
  .sign(null, providerSigningBytes, providerKeys.privateKey)
  .toString("base64");

const providerSubmission:
  AuthenticatedPaidWorkFreshDirectProviderSignatureSubmissionV1 = {
    marker: FRESH_DIRECT_PROVIDER_SIGNATURE_SUBMISSION_MARKER,
    version: 1,
    preparation_input: preparation,
    provider_signing_request_packet: providerRequest,
    provider_signature_base64: providerSignature,
  };

const requesterRequest =
  prepareAuthenticatedPaidWorkFreshDirectRequesterSigningRequestV1(
    providerSubmission,
  );
verifyAuthenticatedPaidWorkFreshDirectRequesterSigningRequestV1(
  providerSubmission,
  requesterRequest,
);
const repeatedRequesterRequest =
  prepareAuthenticatedPaidWorkFreshDirectRequesterSigningRequestV1(
    providerSubmission,
  );
assertCondition(
  JSON.stringify(repeatedRequesterRequest) ===
    JSON.stringify(requesterRequest),
  "requester request is not deterministic",
);
assertCondition(
  requesterRequest.status ===
    "provider_authenticated_requester_signature_required",
  "requester request status mismatch",
);
assertCondition(
  requesterRequest.requester_authentication_body
    .provider_authentication_id ===
    requesterRequest.provider_authentication_envelope
      .authentication_id,
  "requester body did not bind provider authentication ID",
);
allFalse(
  requesterRequest.authority as unknown as Record<string, unknown>,
  "requester request authority",
);

const requesterSigningBytes = Buffer.from(
  requesterRequest.requester_signing_request.signing_bytes_base64,
  "base64",
);
assertCondition(
  crypto
    .createHash("sha256")
    .update(requesterSigningBytes)
    .digest("hex") ===
    requesterRequest.requester_signing_request.signing_bytes_sha256,
  "requester signing-byte SHA mismatch",
);
const requesterSignature = crypto
  .sign(null, requesterSigningBytes, requesterKeys.privateKey)
  .toString("base64");

const finalizationInput:
  AuthenticatedPaidWorkFreshDirectFinalizationInputV1 = {
    marker: FRESH_DIRECT_FINALIZATION_INPUT_MARKER,
    version: 1,
    preparation_input: preparation,
    provider_signing_request_packet: providerRequest,
    provider_signature_base64: providerSignature,
    requester_signing_request_packet: requesterRequest,
    requester_signature_base64: requesterSignature,
  };

const finalPacket =
  finalizeAuthenticatedPaidWorkFreshDirectAuthenticationPreparationV1(
    finalizationInput,
  );
verifyAuthenticatedPaidWorkFreshDirectAuthenticationPreparationV1(
  finalizationInput,
  finalPacket,
);
const repeatedFinal =
  finalizeAuthenticatedPaidWorkFreshDirectAuthenticationPreparationV1(
    finalizationInput,
  );
assertCondition(
  JSON.stringify(repeatedFinal) === JSON.stringify(finalPacket),
  "final preparation packet is not deterministic",
);
assertCondition(
  finalPacket.status ===
    "direct_authentication_prepared_requires_separate_atomic_persistence_authorization",
  "final preparation status mismatch",
);
assertCondition(
  finalPacket.preparation_gate.fresh_quote_verified === true,
  "fresh quote was not verified",
);
assertCondition(
  finalPacket.preparation_gate.provider_signature_verified === true &&
    finalPacket.preparation_gate.requester_signature_verified === true,
  "signature verification gate changed",
);
assertCondition(
  finalPacket.preparation_gate
    .direct_authentication_packet_verified === true,
  "direct authentication packet was not verified",
);
assertCondition(
  finalPacket.preparation_gate
    .eligible_for_atomic_activation_persistence === true,
  "operator-snapshot packet is not eligible for later persistence review",
);
assertCondition(
  finalPacket.preparation_gate.atomic_persistence_performed === false,
  "final preparation performed persistence",
);
assertCondition(
  finalPacket.materialized.direct_authentication_packet
    .activation_gate.public_service_submission_id_synthesized ===
    false,
  "direct packet synthesized public-service lineage",
);
assertCondition(
  finalPacket.materialized.direct_authentication_packet
    .activation_gate.effective_quote_acceptance === false &&
    finalPacket.materialized.direct_authentication_packet
      .activation_gate.effective_payment_authorization === false,
  "direct packet activated authority",
);
allFalse(
  finalPacket.authority as unknown as Record<string, unknown>,
  "final packet authority",
);
assertCondition(
  !JSON.stringify(finalPacket).includes("voidawsr1_"),
  "final packet contains public-service lineage",
);
for (const identifier of [
  ...TERMINALLY_RETIRED_DIRECT_QUOTE_IDS_V1,
  ...REQUIRED_PROTECTED_LINEAGE_IDENTIFIERS_V1,
]) {
  assertCondition(
    !JSON.stringify(finalPacket).includes(identifier),
    `final packet contains protected identifier ${identifier}`,
  );
}

const exampleProviderRequest =
  prepareAuthenticatedPaidWorkFreshDirectProviderSigningRequestV1(
    example,
  );
assertCondition(
  exampleProviderRequest.evidence_mode === "example_fixture",
  "example evidence mode changed",
);
assertCondition(
  exampleProviderRequest.authority.production_signing === false,
  "example provider request granted signing authority",
);

const missingRetired = clone(preparation);
missingRetired.lineage_guard.retired_quote_ids = [];
expectReject("missing retired quote guard", () =>
  prepareAuthenticatedPaidWorkFreshDirectProviderSigningRequestV1(
    missingRetired,
  ),
);

const missingProtected = clone(preparation);
missingProtected.lineage_guard.forbidden_identifiers =
  missingProtected.lineage_guard.forbidden_identifiers.slice(1);
expectReject("missing protected identifier guard", () =>
  prepareAuthenticatedPaidWorkFreshDirectProviderSigningRequestV1(
    missingProtected,
  ),
);

const publicLineageInjection = clone(preparation);
publicLineageInjection.work_order_draft.service.objective +=
  " voidawsr1_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
expectReject("public-service lineage injection", () =>
  prepareAuthenticatedPaidWorkFreshDirectProviderSigningRequestV1(
    publicLineageInjection,
  ),
);

const protectedLineageInjection = clone(preparation);
protectedLineageInjection.work_order_draft.service.input_refs = [
  REQUIRED_PROTECTED_LINEAGE_IDENTIFIERS_V1[0],
];
expectReject("protected lineage injection", () =>
  prepareAuthenticatedPaidWorkFreshDirectProviderSigningRequestV1(
    protectedLineageInjection,
  ),
);

const expiredPreparation = clone(preparation);
expiredPreparation.preparation_recorded_at_utc =
  "2035-01-01T19:00:00Z";
expectReject("expired fresh preparation", () =>
  prepareAuthenticatedPaidWorkFreshDirectProviderSigningRequestV1(
    expiredPreparation,
  ),
);

const revokedBinding = clone(preparation) as unknown as Record<
  string,
  unknown
>;
(
  revokedBinding.provider_key_binding_plan as Record<string, unknown>
).revoked_at_utc = "2035-01-01T00:01:00Z";
expectReject("revoked provider binding", () =>
  prepareAuthenticatedPaidWorkFreshDirectProviderSigningRequestV1(
    revokedBinding,
  ),
);

const privateKeyInjection = clone(preparation) as unknown as Record<
  string,
  unknown
>;
(
  privateKeyInjection.provider_key_binding_plan as Record<
    string,
    unknown
  >
).private_key_pem = "forbidden";
expectReject("private-key input injection", () =>
  prepareAuthenticatedPaidWorkFreshDirectProviderSigningRequestV1(
    privateKeyInjection,
  ),
);

const tamperedProviderPacket = clone(providerSubmission);
tamperedProviderPacket.provider_signing_request_packet
  .provider_authentication_body.authentication_nonce =
  "tampered-provider-authentication-nonce";
expectReject("tampered provider request packet", () =>
  prepareAuthenticatedPaidWorkFreshDirectRequesterSigningRequestV1(
    tamperedProviderPacket,
  ),
);

const wrongProviderSignature = clone(providerSubmission);
wrongProviderSignature.provider_signature_base64 = mutateSignature(
  wrongProviderSignature.provider_signature_base64,
);
expectReject("wrong provider signature", () =>
  prepareAuthenticatedPaidWorkFreshDirectRequesterSigningRequestV1(
    wrongProviderSignature,
  ),
);

const wrongProviderKeySignature = clone(providerSubmission);
wrongProviderKeySignature.provider_signature_base64 = crypto
  .sign(null, providerSigningBytes, wrongProviderKeys.privateKey)
  .toString("base64");
expectReject("wrong provider key signature", () =>
  prepareAuthenticatedPaidWorkFreshDirectRequesterSigningRequestV1(
    wrongProviderKeySignature,
  ),
);

const tamperedRequesterPacket = clone(finalizationInput);
tamperedRequesterPacket.requester_signing_request_packet
  .requester_authentication_body.authentication_nonce =
  "tampered-requester-authentication-nonce";
expectReject("tampered requester request packet", () =>
  finalizeAuthenticatedPaidWorkFreshDirectAuthenticationPreparationV1(
    tamperedRequesterPacket,
  ),
);

const wrongRequesterSignature = clone(finalizationInput);
wrongRequesterSignature.requester_signature_base64 =
  mutateSignature(wrongRequesterSignature.requester_signature_base64);
expectReject("wrong requester signature", () =>
  finalizeAuthenticatedPaidWorkFreshDirectAuthenticationPreparationV1(
    wrongRequesterSignature,
  ),
);

const dependencyIdentity =
  freshDirectQuoteAuthenticationPreparationDependencyIdentityV1();
assertCondition(
  dependencyIdentity.work_order_materializer ===
    "materializeAgentPaidWorkOrder",
  "work-order dependency identity changed",
);
assertCondition(
  dependencyIdentity.quote_materializer ===
    "materializeAgentPaidWorkQuote",
  "quote dependency identity changed",
);
assertCondition(
  dependencyIdentity
    .quote_acceptance_payment_authority_materializer ===
    "materializeAuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityV1",
  "prepared-packet dependency identity changed",
);
assertCondition(
  dependencyIdentity.direct_authentication_materializer ===
    "materializeAuthenticatedPaidWorkDirectQuoteActivationAuthenticationV1",
  "direct-auth dependency identity changed",
);
assertCondition(
  dependencyIdentity.persistence_adapter_invoked === false,
  "dependency identity reports persistence invocation",
);
assertCondition(
  dependencyIdentity.production_signing_invoked === false,
  "dependency identity reports production signing",
);

console.log(`work_order_id=${finalPacket.source.work_order_id}`);
console.log(`quote_id=${finalPacket.source.quote_id}`);
console.log(
  `prepared_packet_id=${finalPacket.source.prepared_packet_id}`,
);
console.log(`provider_request_packet_id=${finalPacket.provider_request_packet_id}`);
console.log(
  `requester_request_packet_id=${finalPacket.requester_request_packet_id}`,
);
console.log(`final_packet_id=${finalPacket.packet_id}`);
console.log("three_stage_preparation=true");
console.log("fresh_quote_verified=true");
console.log("retired_quote_reuse_rejected=true");
console.log("protected_lineage_reuse_rejected=true");
console.log("public_service_submission_id_synthesized=false");
console.log("provider_signature_verified=true");
console.log("requester_signature_verified=true");
console.log("direct_authentication_packet_verified=true");
console.log("private_key_input=false");
console.log("production_signing=false");
console.log("live_quote_publication=false");
console.log("atomic_persistence=false");
console.log("quote_acceptance=false");
console.log("payment_authorization=false");
console.log("payment_execution=false");
console.log("work_dispatch=false");
console.log("wallet_access=false");
console.log("work_credit_write=false");
console.log("runtime_mutation=false");
console.log("service_restart=false");
console.log("deployment=false");
console.log("money_movement=false");
console.log(
  "VOID_AUTHENTICATED_PAID_WORK_FRESH_DIRECT_QUOTE_AUTHENTICATION_PREPARATION_V1_PROOF_GREEN=true",
);
