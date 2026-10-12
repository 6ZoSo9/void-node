import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  DIRECT_AUTHENTICATION_CANONICALIZATION,
  DIRECT_AUTHENTICATION_INPUT_MARKER,
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
  type DirectProviderAuthenticationBodyV1,
  type DirectProviderKeyBindingDraftV1,
  type DirectRequesterAuthenticationBodyV1,
  type DirectRequesterKeyBindingDraftV1,
} from "./authenticated_paid_work_direct_quote_activation_authentication_v1.js";
import {
  AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_CONFIRMATION,
  activationPersistenceDefaultDependencyIdentityV1,
  executeAuthenticatedPaidWorkActivationPersistenceV1,
} from "./authenticated_paid_work_quote_acceptance_payment_authority_activation_persistence_v1.js";

type RecordValue = Record<string, unknown>;

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
function record(value: unknown, label: string): RecordValue {
  assertCondition(
    Boolean(value && typeof value === "object" && !Array.isArray(value)),
    `${label} must be an object`,
  );
  return value as RecordValue;
}
function expectReject(label: string, callback: () => unknown): void {
  try {
    callback();
  } catch {
    return;
  }
  fail(`expected rejection: ${label}`);
}
function allFalse(value: RecordValue, label: string): void {
  for (const [key, child] of Object.entries(value)) {
    assertCondition(
      child === false || child === null,
      `${label}.${key} exceeded boundary`,
    );
  }
}
function readJson(relative: string): unknown {
  return JSON.parse(fs.readFileSync(path.resolve(relative), "utf8")) as unknown;
}

const fixture = record(
  readJson(
    "examples/authenticated-paid-work-quote-acceptance-payment-authority-activation-persistence-v1.example.json",
  ),
  "activation fixture",
);
const preparedPacket = record(fixture.prepared_packet, "prepared packet");
const preparedSource = record(preparedPacket.source, "prepared source");
const preparedArtifacts = record(
  preparedPacket.prepared_artifacts,
  "prepared artifacts",
);
const acceptance = record(
  preparedArtifacts.acceptance_envelope,
  "acceptance envelope",
);
const paymentIntent = record(
  preparedArtifacts.payment_intent_envelope,
  "payment intent",
);

interface DirectOptions {
  providerRevokedAtUtc?: string | null;
  requesterRevokedAtUtc?: string | null;
  providerAuthenticationExpiresAtUtc?: string;
  requesterAuthenticationExpiresAtUtc?: string;
}

function buildDirectInput(options: DirectOptions = {}): RecordValue {
  const providerKeys = crypto.generateKeyPairSync("ed25519");
  const requesterKeys = crypto.generateKeyPairSync("ed25519");
  const providerPublicPem = providerKeys.publicKey
    .export({ type: "spki", format: "pem" })
    .toString();
  const requesterPublicPem = requesterKeys.publicKey
    .export({ type: "spki", format: "pem" })
    .toString();

  const providerBindingDraft: DirectProviderKeyBindingDraftV1 = {
    marker: DIRECT_PROVIDER_KEY_BINDING_MARKER,
    version: 1,
    binding_status: "operator_approved_snapshot",
    provider_id: String(preparedSource.provider_id),
    authority_scope: DIRECT_PROVIDER_AUTHENTICATION_SCOPE,
    key_id: directAuthenticationKeyIdV1(providerPublicPem),
    public_key_pem: providerPublicPem,
    valid_from_utc: "2026-07-25T21:00:00Z",
    expires_at_utc: "2026-07-26T19:00:00Z",
    revoked_at_utc: options.providerRevokedAtUtc ?? null,
    binding_nonce: "direct-persistence-provider-binding-proof-0001",
  };
  const providerBinding = {
    ...providerBindingDraft,
    binding_id: directProviderKeyBindingIdV1(providerBindingDraft),
  };

  const preparedFingerprint = sha256Hex(canonicalJson(preparedPacket));
  const providerBody: DirectProviderAuthenticationBodyV1 = {
    marker: DIRECT_PROVIDER_AUTHENTICATION_EVIDENCE_MARKER,
    version: 1,
    signature_scheme: DIRECT_AUTHENTICATION_SIGNATURE_SCHEME,
    signature_domain: DIRECT_PROVIDER_SIGNATURE_DOMAIN,
    canonicalization: DIRECT_AUTHENTICATION_CANONICALIZATION,
    prepared_packet_id: String(preparedPacket.packet_id),
    prepared_packet_fingerprint_sha256: preparedFingerprint,
    quote_id: String(preparedSource.quote_id),
    work_order_id: String(preparedSource.work_order_id),
    acceptance_id: String(acceptance.acceptance_id),
    payment_intent_id: String(paymentIntent.payment_intent_id),
    provider_id: String(preparedSource.provider_id),
    provider_key_binding_id: providerBinding.binding_id,
    authentication_nonce: "direct-persistence-provider-auth-proof-0001",
    created_at_utc: "2026-07-25T22:46:00Z",
    expires_at_utc:
      options.providerAuthenticationExpiresAtUtc ??
      "2026-07-25T23:30:00Z",
  };
  const providerSignature = crypto
    .sign(
      null,
      directProviderAuthenticationSigningBytesV1(providerBody),
      providerKeys.privateKey,
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
    requester_agent_id: String(preparedSource.requester_agent_id),
    authority_scope: DIRECT_REQUESTER_AUTHENTICATION_SCOPE,
    key_id: directAuthenticationKeyIdV1(requesterPublicPem),
    public_key_pem: requesterPublicPem,
    valid_from_utc: "2026-07-25T21:00:00Z",
    expires_at_utc: "2026-07-26T19:00:00Z",
    revoked_at_utc: options.requesterRevokedAtUtc ?? null,
    binding_nonce: "direct-persistence-requester-binding-proof-0001",
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
    prepared_packet_id: String(preparedPacket.packet_id),
    prepared_packet_fingerprint_sha256: preparedFingerprint,
    quote_id: String(preparedSource.quote_id),
    work_order_id: String(preparedSource.work_order_id),
    acceptance_id: String(acceptance.acceptance_id),
    payment_intent_id: String(paymentIntent.payment_intent_id),
    requester_agent_id: String(preparedSource.requester_agent_id),
    requester_key_binding_id: requesterBinding.binding_id,
    provider_authentication_id: providerEnvelope.authentication_id,
    acceptance_nonce: String(acceptance.nonce),
    authentication_nonce: "direct-persistence-requester-auth-proof-0001",
    created_at_utc: "2026-07-25T22:47:00Z",
    expires_at_utc:
      options.requesterAuthenticationExpiresAtUtc ??
      "2026-07-25T23:20:00Z",
  };
  const requesterSignature = crypto
    .sign(
      null,
      directRequesterAuthenticationSigningBytesV1(requesterBody),
      requesterKeys.privateKey,
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

  return {
    marker: DIRECT_AUTHENTICATION_INPUT_MARKER,
    version: 1,
    evidence_mode: "operator_signed_direct_lineage",
    prepared_packet: preparedPacket,
    provider_key_binding: providerBinding,
    provider_authentication_envelope: providerEnvelope,
    requester_key_binding: requesterBinding,
    requester_authentication_envelope: requesterEnvelope,
  };
}

function activationInput(
  directInput: RecordValue,
  root: string,
  enabled: boolean,
  apply: boolean,
  confirmation: string,
  recordedAtUtc: string,
): RecordValue {
  const value = clone(fixture);
  value.mode = "direct_authentication_packet";
  value.requester_authentication_input = directInput;
  const config = record(value.persistence_config, "persistence config");
  config.enabled = enabled;
  config.allowed_root = root;
  const command = record(value.command, "command");
  command.apply = apply;
  command.confirmation = confirmation;
  command.recorded_at_utc = recordedAtUtc;
  return value;
}

const directInput = buildDirectInput();
const directPacket =
  materializeAuthenticatedPaidWorkDirectQuoteActivationAuthenticationV1(
    directInput,
  );
assertCondition(
  directPacket.status ===
    "direct_lineage_authenticated_for_atomic_activation",
  "direct packet status mismatch",
);
assertCondition(
  directPacket.activation_gate.eligible_for_atomic_activation_persistence ===
    true,
  "direct packet not eligible",
);
assertCondition(
  directPacket.activation_gate.public_service_submission_id_synthesized ===
    false,
  "public submission lineage was synthesized",
);
assertCondition(
  !canonicalJson(directPacket).includes("voidawsr1_"),
  "public submission namespace leaked into direct packet",
);
allFalse(directPacket.authority as unknown as RecordValue, "direct packet authority");

const disabledRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-direct-persistence-disabled-"),
);
fs.chmodSync(disabledRoot, 0o700);
const disabled = executeAuthenticatedPaidWorkActivationPersistenceV1(
  activationInput(
    directInput,
    disabledRoot,
    false,
    true,
    AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_CONFIRMATION,
    "2026-07-25T22:50:00Z",
  ),
  {},
);
assertCondition(disabled.status === "disabled", "direct disabled status mismatch");
assertCondition(
  !fs.existsSync(path.join(disabledRoot, "current.json")),
  "disabled direct mode wrote state",
);
allFalse(disabled.authority as unknown as RecordValue, "disabled authority");

const plannedRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-direct-persistence-planned-"),
);
fs.chmodSync(plannedRoot, 0o700);
const planned = executeAuthenticatedPaidWorkActivationPersistenceV1(
  activationInput(
    directInput,
    plannedRoot,
    true,
    false,
    "",
    "2026-07-25T22:50:00Z",
  ),
  {},
);
assertCondition(planned.status === "planned", "direct planned status mismatch");
assertCondition(
  planned.requester_authentication_id?.startsWith("voidadra1_") === true,
  "direct requester ID namespace mismatch",
);
assertCondition(
  planned.provider_authentication_id?.startsWith("voidadpa1_") === true,
  "direct provider ID namespace mismatch",
);
assertCondition(
  !fs.existsSync(path.join(plannedRoot, "current.json")),
  "planned direct mode wrote state",
);
allFalse(planned.authority as unknown as RecordValue, "planned authority");

const committedRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-direct-persistence-committed-"),
);
fs.chmodSync(committedRoot, 0o700);
const committedInput = activationInput(
  directInput,
  committedRoot,
  true,
  true,
  AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_CONFIRMATION,
  "2026-07-25T22:50:00Z",
);
const committed = executeAuthenticatedPaidWorkActivationPersistenceV1(
  committedInput,
  {},
);
assertCondition(committed.status === "committed", "direct apply did not commit");
assertCondition(
  committed.authority.quote_acceptance === true,
  "direct quote acceptance not activated",
);
assertCondition(
  committed.authority.payment_authorization === true,
  "direct payment authority not activated",
);
assertCondition(
  committed.authority.payment_execution === false,
  "direct payment execution activated",
);
assertCondition(
  committed.authority.work_dispatch === false,
  "direct work dispatch activated",
);
assertCondition(
  committed.persistence_receipt?.atomic_consumption_count === 5,
  "direct atomic consumption count changed",
);
assertCondition(
  committed.persistence_receipt?.requester_authentication_id.startsWith(
    "voidadra1_",
  ) === true,
  "receipt requester namespace mismatch",
);
assertCondition(
  committed.persistence_receipt?.provider_authentication_id.startsWith(
    "voidadpa1_",
  ) === true,
  "receipt provider namespace mismatch",
);

const current = record(
  JSON.parse(
    fs.readFileSync(path.join(committedRoot, "current.json"), "utf8"),
  ) as unknown,
  "current pointer",
);
const generation = path.join(
  committedRoot,
  "generations",
  String(current.generation_id),
);
const storedAuthentication = record(
  JSON.parse(
    fs.readFileSync(
      path.join(generation, "requester-authentication.json"),
      "utf8",
    ),
  ) as unknown,
  "stored direct authentication",
);
assertCondition(
  storedAuthentication.marker ===
    "VOID_AUTHENTICATED_PAID_WORK_DIRECT_QUOTE_ACTIVATION_AUTHENTICATION_PACKET_V1",
  "stored direct authentication marker mismatch",
);
assertCondition(
  !canonicalJson(storedAuthentication).includes("voidawsr1_"),
  "stored direct packet contains public submission namespace",
);
const acceptanceState = record(
  JSON.parse(
    fs.readFileSync(
      path.join(generation, "acceptance-replay-state.json"),
      "utf8",
    ),
  ) as unknown,
  "acceptance replay state",
);
assertCondition(
  (acceptanceState.consumed_requester_authentication_ids as string[]).includes(
    String(committed.requester_authentication_id),
  ),
  "direct requester ID not consumed",
);
assertCondition(
  (acceptanceState.consumed_provider_authentication_ids as string[]).includes(
    String(committed.provider_authentication_id),
  ),
  "direct provider ID not consumed",
);

const duplicateInput = clone(committedInput);
record(duplicateInput.command, "duplicate command").recorded_at_utc =
  "2026-07-25T22:51:00Z";
const duplicate = executeAuthenticatedPaidWorkActivationPersistenceV1(
  duplicateInput,
  {},
);
assertCondition(
  duplicate.status === "duplicate",
  "exact direct duplicate was not reused",
);
assertCondition(
  duplicate.persistence_receipt?.generation_id ===
    committed.persistence_receipt?.generation_id,
  "direct duplicate generation changed",
);

const wrongConfirmationRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-direct-persistence-confirmation-"),
);
fs.chmodSync(wrongConfirmationRoot, 0o700);
expectReject("direct wrong confirmation", () =>
  executeAuthenticatedPaidWorkActivationPersistenceV1(
    activationInput(
      directInput,
      wrongConfirmationRoot,
      true,
      true,
      "wrong",
      "2026-07-25T22:50:00Z",
    ),
    {},
  ),
);

const expiredDirect = buildDirectInput({
  requesterAuthenticationExpiresAtUtc: "2026-07-25T22:49:00Z",
});
const expiredRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-direct-persistence-expired-"),
);
fs.chmodSync(expiredRoot, 0o700);
expectReject("expired direct authentication at activation", () =>
  executeAuthenticatedPaidWorkActivationPersistenceV1(
    activationInput(
      expiredDirect,
      expiredRoot,
      true,
      false,
      "",
      "2026-07-25T22:50:00Z",
    ),
    {},
  ),
);

const revokedDirect = buildDirectInput({
  requesterRevokedAtUtc: "2026-07-25T22:49:00Z",
});
const revokedRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-direct-persistence-revoked-"),
);
fs.chmodSync(revokedRoot, 0o700);
expectReject("revoked direct requester binding at activation", () =>
  executeAuthenticatedPaidWorkActivationPersistenceV1(
    activationInput(
      revokedDirect,
      revokedRoot,
      true,
      false,
      "",
      "2026-07-25T22:50:00Z",
    ),
    {},
  ),
);

const tamperedDirect = clone(directInput);
record(tamperedDirect.prepared_packet, "tampered prepared packet").packet_id =
  `voidawqapa1_${"f".repeat(64)}`;
const tamperedRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-direct-persistence-tampered-"),
);
fs.chmodSync(tamperedRoot, 0o700);
expectReject("direct embedded prepared packet tampering", () =>
  executeAuthenticatedPaidWorkActivationPersistenceV1(
    activationInput(
      tamperedDirect,
      tamperedRoot,
      true,
      false,
      "",
      "2026-07-25T22:50:00Z",
    ),
    {},
  ),
);

const schemaText = fs.readFileSync(
  path.resolve(
    "schemas/authenticated-paid-work-quote-acceptance-payment-authority-activation-persistence-v1.schema.json",
  ),
  "utf8",
);
const docsText = fs.readFileSync(
  path.resolve(
    "docs/operations/authenticated-paid-work-quote-acceptance-payment-authority-activation-persistence-v1.md",
  ),
  "utf8",
);
const workflowText = fs.readFileSync(
  path.resolve(
    ".github/workflows/authenticated-paid-work-quote-acceptance-payment-authority-activation-persistence-v1.yml",
  ),
  "utf8",
);
for (const required of [
  "direct_authentication_packet",
  "voidadra1_",
  "voidadpa1_",
]) {
  assertCondition(schemaText.includes(required), `schema missing ${required}`);
  assertCondition(docsText.includes(required), `docs missing ${required}`);
}
assertCondition(
  workflowText.includes(
    "prove_authenticated_paid_work_direct_quote_activation_persistence_integration_v1.ts",
  ),
  "workflow direct integration proof missing",
);

const identity = activationPersistenceDefaultDependencyIdentityV1();
assertCondition(
  identity.direct_authenticator ===
    "materializeAuthenticatedPaidWorkDirectQuoteActivationAuthenticationV1",
  "direct dependency identity mismatch",
);

console.log(`direct_packet_id=${directPacket.packet_id}`);
console.log(
  `direct_requester_authentication_id=${committed.requester_authentication_id}`,
);
console.log(
  `direct_provider_authentication_id=${committed.provider_authentication_id}`,
);
console.log(`direct_transaction_id=${committed.transaction_id}`);
console.log(
  `direct_generation_id=${committed.persistence_receipt?.generation_id}`,
);
console.log("direct_mode_supported=true");
console.log("public_service_submission_id_synthesized=false");
console.log("direct_authentication_expiry_checked_at_activation=true");
console.log("direct_authentication_revocation_checked_at_activation=true");
console.log("atomic_consumption_count=5");
console.log("exact_duplicate_reused=true");
console.log("legacy_mode_preserved_by_separate_proof=true");
console.log("payment_execution=false");
console.log("work_dispatch=false");
console.log("wallet_access=false");
console.log("production_signing=false");
console.log("money_movement=false");
console.log(
  "VOID_AUTHENTICATED_PAID_WORK_DIRECT_QUOTE_ACTIVATION_PERSISTENCE_INTEGRATION_V1_PROOF_GREEN=true",
);
