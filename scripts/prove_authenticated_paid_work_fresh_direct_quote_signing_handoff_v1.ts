import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  FRESH_DIRECT_QUOTE_EXTERNAL_SIGNATURE_MARKER,
  FRESH_DIRECT_QUOTE_FINAL_HANDOFF_MARKER,
  FRESH_DIRECT_QUOTE_PROVIDER_HANDOFF_MARKER,
  FRESH_DIRECT_QUOTE_REQUESTER_HANDOFF_MARKER,
  FRESH_DIRECT_QUOTE_SIGNING_HANDOFF_INPUT_MARKER,
  advanceAuthenticatedPaidWorkFreshDirectQuoteSigningHandoffV1,
  finalizeAuthenticatedPaidWorkFreshDirectQuoteSigningHandoffV1,
  prepareAuthenticatedPaidWorkFreshDirectQuoteSigningHandoffV1,
  verifyAuthenticatedPaidWorkFreshDirectQuoteSigningHandoffFinalV1,
} from "./authenticated_paid_work_fresh_direct_quote_signing_handoff_v1.js";
import {
  DIRECT_PROVIDER_AUTHENTICATION_SCOPE,
  DIRECT_PROVIDER_KEY_BINDING_MARKER,
  DIRECT_REQUESTER_AUTHENTICATION_SCOPE,
  DIRECT_REQUESTER_KEY_BINDING_MARKER,
  canonicalJson,
  directAuthenticationKeyIdV1,
} from "./authenticated_paid_work_direct_quote_activation_authentication_v1.js";

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

function expectReject(label: string, callback: () => unknown): void {
  try {
    callback();
  } catch {
    return;
  }
  fail(`expected rejection: ${label}`);
}

function allFalse(value: Record<string, unknown>, label: string): void {
  for (const [key, child] of Object.entries(value)) {
    assertCondition(child === false || child === null, `${label}.${key} exceeded boundary`);
  }
}

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const preparedInputPath = path.join(
  root,
  "examples/authenticated-paid-work-quote-acceptance-payment-authority-v1.example.json",
);
const sourcePaths = [
  "scripts/authenticated_paid_work_fresh_direct_quote_signing_handoff_v1.ts",
  "scripts/authenticated_paid_work_fresh_direct_quote_signing_handoff_types_v1.ts",
  "scripts/authenticated_paid_work_fresh_direct_quote_signing_handoff_base_v1.ts",
  "scripts/authenticated_paid_work_fresh_direct_quote_signing_handoff_validation_v1.ts",
  "scripts/authenticated_paid_work_fresh_direct_quote_signing_handoff_shared_v1.ts",
  "scripts/authenticated_paid_work_fresh_direct_quote_signing_handoff_stages_v1.ts",
].map((relative) => path.join(root, relative));
const docsPath = path.join(
  root,
  "docs/operations/authenticated-paid-work-fresh-direct-quote-signing-handoff-v1.md",
);
const workflowPath = path.join(
  root,
  ".github/workflows/authenticated-paid-work-fresh-direct-quote-signing-handoff-v1.yml",
);

for (const file of [preparedInputPath, ...sourcePaths, docsPath, workflowPath]) {
  const metadata = fs.lstatSync(file);
  assertCondition(
    metadata.isFile() && !metadata.isSymbolicLink(),
    `regular file required: ${file}`,
  );
}

const preparedInput = JSON.parse(
  fs.readFileSync(preparedInputPath, "utf8"),
) as Record<string, unknown>;
const workOrder = preparedInput.work_order as Record<string, unknown>;
const quote = preparedInput.quote as Record<string, unknown>;
const requester = workOrder.requester as Record<string, unknown>;
const provider = quote.provider as Record<string, unknown>;

const providerKeys = crypto.generateKeyPairSync("ed25519");
const requesterKeys = crypto.generateKeyPairSync("ed25519");
const providerPublicPem = providerKeys.publicKey
  .export({ type: "spki", format: "pem" })
  .toString();
const requesterPublicPem = requesterKeys.publicKey
  .export({ type: "spki", format: "pem" })
  .toString();

const input = {
  marker: FRESH_DIRECT_QUOTE_SIGNING_HANDOFF_INPUT_MARKER,
  version: 1,
  prepared_input: preparedInput,
  provider_key_binding_draft: {
    marker: DIRECT_PROVIDER_KEY_BINDING_MARKER,
    version: 1,
    binding_status: "operator_approved_snapshot",
    provider_id: provider.provider_id,
    authority_scope: DIRECT_PROVIDER_AUTHENTICATION_SCOPE,
    key_id: directAuthenticationKeyIdV1(providerPublicPem),
    public_key_pem: providerPublicPem,
    valid_from_utc: "2026-07-24T00:00:00Z",
    expires_at_utc: "2026-07-27T00:00:00Z",
    revoked_at_utc: null,
    binding_nonce: "fresh-direct-provider-binding-proof-0001",
  },
  requester_key_binding_draft: {
    marker: DIRECT_REQUESTER_KEY_BINDING_MARKER,
    version: 1,
    binding_status: "operator_approved_snapshot",
    requester_agent_id: requester.agent_id,
    authority_scope: DIRECT_REQUESTER_AUTHENTICATION_SCOPE,
    key_id: directAuthenticationKeyIdV1(requesterPublicPem),
    public_key_pem: requesterPublicPem,
    valid_from_utc: "2026-07-24T00:00:00Z",
    expires_at_utc: "2026-07-27T00:00:00Z",
    revoked_at_utc: null,
    binding_nonce: "fresh-direct-requester-binding-proof-0001",
  },
  provider_authentication_plan: {
    authentication_nonce: "fresh-direct-provider-auth-proof-0001",
    created_at_utc: "2026-07-25T22:50:00Z",
    expires_at_utc: "2026-07-26T18:00:00Z",
  },
  requester_authentication_plan: {
    authentication_nonce: "fresh-direct-requester-auth-proof-0001",
    created_at_utc: "2026-07-25T22:51:00Z",
    expires_at_utc: "2026-07-26T17:00:00Z",
  },
  controls: {
    prepare_only: true,
    external_signing_required: true,
    private_key_access_forbidden: true,
    provider_signature_before_requester_required: true,
    canonical_signature_bytes_required: true,
    atomic_persistence_after_authentication_required: true,
    separate_payment_execution_authorization_required: true,
    separate_work_execution_authorization_required: true,
  },
};

const providerHandoff =
  prepareAuthenticatedPaidWorkFreshDirectQuoteSigningHandoffV1(input);
assertCondition(
  providerHandoff.marker === FRESH_DIRECT_QUOTE_PROVIDER_HANDOFF_MARKER,
  "provider handoff marker mismatch",
);
assertCondition(
  providerHandoff.status === "provider_signature_required",
  "provider handoff status mismatch",
);
assertCondition(
  providerHandoff.controls.private_key_access_forbidden === true,
  "provider handoff private-key boundary changed",
);
assertCondition(
  providerHandoff.controls.requester_signature_blocked_until_provider_signature_verified === true,
  "requester sequencing boundary changed",
);
assertCondition(
  providerHandoff.provider_signing_request.signing_bytes_sha256.length === 64,
  "provider signing digest missing",
);

const providerSignatureBase64 = crypto
  .sign(
    null,
    Buffer.from(
      providerHandoff.provider_signing_request.signing_bytes_base64,
      "base64",
    ),
    providerKeys.privateKey,
  )
  .toString("base64");
const providerSignature = {
  marker: FRESH_DIRECT_QUOTE_EXTERNAL_SIGNATURE_MARKER,
  version: 1,
  signer_role: "provider",
  key_id: providerHandoff.provider_signing_request.key_id,
  signing_bytes_sha256:
    providerHandoff.provider_signing_request.signing_bytes_sha256,
  signature_base64: providerSignatureBase64,
};

const requesterHandoff =
  advanceAuthenticatedPaidWorkFreshDirectQuoteSigningHandoffV1(
    input,
    providerHandoff,
    providerSignature,
  );
assertCondition(
  requesterHandoff.marker === FRESH_DIRECT_QUOTE_REQUESTER_HANDOFF_MARKER,
  "requester handoff marker mismatch",
);
assertCondition(
  requesterHandoff.status === "requester_signature_required",
  "requester handoff status mismatch",
);
assertCondition(
  requesterHandoff.controls.provider_signature_verified === true,
  "provider signature was not verified before requester handoff",
);
assertCondition(
  requesterHandoff.requester_authentication_body.provider_authentication_id ===
    requesterHandoff.provider_authentication_envelope.authentication_id,
  "requester body did not bind provider authentication",
);

const requesterSignatureBase64 = crypto
  .sign(
    null,
    Buffer.from(
      requesterHandoff.requester_signing_request.signing_bytes_base64,
      "base64",
    ),
    requesterKeys.privateKey,
  )
  .toString("base64");
const requesterSignature = {
  marker: FRESH_DIRECT_QUOTE_EXTERNAL_SIGNATURE_MARKER,
  version: 1,
  signer_role: "requester",
  key_id: requesterHandoff.requester_signing_request.key_id,
  signing_bytes_sha256:
    requesterHandoff.requester_signing_request.signing_bytes_sha256,
  signature_base64: requesterSignatureBase64,
};

const finalHandoff =
  finalizeAuthenticatedPaidWorkFreshDirectQuoteSigningHandoffV1(
    input,
    providerHandoff,
    providerSignature,
    requesterHandoff,
    requesterSignature,
  );
assertCondition(
  finalHandoff.marker === FRESH_DIRECT_QUOTE_FINAL_HANDOFF_MARKER,
  "final handoff marker mismatch",
);
assertCondition(
  finalHandoff.status ===
    "direct_quote_authenticated_for_atomic_persistence",
  "final handoff status mismatch",
);
assertCondition(
  finalHandoff.direct_authentication_packet.status ===
    "direct_lineage_authenticated_for_atomic_activation",
  "direct authentication packet status mismatch",
);
assertCondition(
  finalHandoff.direct_authentication_packet.activation_gate
    .eligible_for_atomic_activation_persistence === true,
  "final handoff is not persistence-eligible",
);
assertCondition(
  finalHandoff.next_gate.persistence_adapter_mode ===
    "direct_authentication_packet",
  "persistence adapter mode mismatch",
);
assertCondition(
  !canonicalJson(finalHandoff).includes("voidawsr1_"),
  "public-service submission lineage was synthesized",
);
assertCondition(
  !canonicalJson(finalHandoff).includes("PRIVATE KEY"),
  "private key material leaked into final handoff",
);
allFalse(
  finalHandoff.authority as unknown as Record<string, unknown>,
  "final authority",
);
verifyAuthenticatedPaidWorkFreshDirectQuoteSigningHandoffFinalV1(
  input,
  providerHandoff,
  providerSignature,
  requesterHandoff,
  requesterSignature,
  finalHandoff,
);

const wrongProviderRole = clone(providerSignature);
wrongProviderRole.signer_role = "requester";
expectReject("wrong provider signer role", () =>
  advanceAuthenticatedPaidWorkFreshDirectQuoteSigningHandoffV1(
    input,
    providerHandoff,
    wrongProviderRole,
  ),
);

const tamperedProviderSignature = clone(providerSignature);
tamperedProviderSignature.signature_base64 =
  (tamperedProviderSignature.signature_base64.startsWith("A") ? "B" : "A") +
  tamperedProviderSignature.signature_base64.slice(1);
expectReject("tampered provider signature", () =>
  advanceAuthenticatedPaidWorkFreshDirectQuoteSigningHandoffV1(
    input,
    providerHandoff,
    tamperedProviderSignature,
  ),
);

const staleProviderHandoff = clone(providerHandoff);
staleProviderHandoff.source.quote_id =
  `voidawq1_${"9".repeat(64)}`;
expectReject("provider handoff source tampering", () =>
  advanceAuthenticatedPaidWorkFreshDirectQuoteSigningHandoffV1(
    input,
    staleProviderHandoff,
    providerSignature,
  ),
);

const requesterSignedByProvider = clone(requesterSignature);
requesterSignedByProvider.signature_base64 = crypto
  .sign(
    null,
    Buffer.from(
      requesterHandoff.requester_signing_request.signing_bytes_base64,
      "base64",
    ),
    providerKeys.privateKey,
  )
  .toString("base64");
expectReject("requester signed by provider key", () =>
  finalizeAuthenticatedPaidWorkFreshDirectQuoteSigningHandoffV1(
    input,
    providerHandoff,
    providerSignature,
    requesterHandoff,
    requesterSignedByProvider,
  ),
);

const secretBearingInput = clone(input) as Record<string, unknown>;
secretBearingInput.private_key = "forbidden";
expectReject("secret-bearing input", () =>
  prepareAuthenticatedPaidWorkFreshDirectQuoteSigningHandoffV1(
    secretBearingInput,
  ),
);

const tamperedFinal = clone(finalHandoff);
tamperedFinal.status = "tampered" as typeof tamperedFinal.status;
expectReject("tampered final handoff", () =>
  verifyAuthenticatedPaidWorkFreshDirectQuoteSigningHandoffFinalV1(
    input,
    providerHandoff,
    providerSignature,
    requesterHandoff,
    requesterSignature,
    tamperedFinal,
  ),
);

const sourceText = sourcePaths.map((file) => fs.readFileSync(file, "utf8")).join("\n");
assertCondition(
  sourceText.includes("private_key_access_forbidden"),
  "source omits private-key boundary",
);
assertCondition(
  sourceText.includes("provider_signature_before_requester_required"),
  "source omits provider-first sequencing",
);
assertCondition(
  sourceText.includes("fresh_operation_bound_confirmation_required"),
  "source omits confirmation boundary",
);

console.log("provider_signing_handoff_green=true");
console.log("provider_signature_verification_green=true");
console.log("requester_signing_handoff_green=true");
console.log("requester_signature_verification_green=true");
console.log("direct_authentication_packet_green=true");
console.log("atomic_persistence_eligibility_green=true");
console.log("provider_first_sequencing_green=true");
console.log("secret_material_rejection_green=true");
console.log("public_service_submission_synthesis=false");
console.log("effective_quote_acceptance=false");
console.log("effective_payment_authorization=false");
console.log("payment_execution=false");
console.log("work_dispatch=false");
console.log("wallet_access=false");
console.log("money_movement=false");
console.log(
  "VOID_AUTHENTICATED_PAID_WORK_FRESH_DIRECT_QUOTE_SIGNING_HANDOFF_V1_PROOF_GREEN=true",
);
