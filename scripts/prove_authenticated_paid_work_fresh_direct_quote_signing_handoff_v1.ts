import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  FRESH_DIRECT_QUOTE_EXTERNAL_SIGNATURE_MARKER,
  advanceAuthenticatedPaidWorkFreshDirectQuoteSigningHandoffV1,
  finalizeAuthenticatedPaidWorkFreshDirectQuoteSigningHandoffV1,
  prepareAuthenticatedPaidWorkFreshDirectQuoteSigningHandoffV1,
  verifyAuthenticatedPaidWorkFreshDirectQuoteSigningHandoffFinalV1,
} from "./authenticated_paid_work_fresh_direct_quote_signing_handoff_v1.js";
import {
  FRESH_DIRECT_AUTHENTICATION_PREPARATION_PACKET_MARKER,
  FRESH_DIRECT_PROVIDER_SIGNING_REQUEST_PACKET_MARKER,
  FRESH_DIRECT_REQUESTER_SIGNING_REQUEST_PACKET_MARKER,
} from "./authenticated_paid_work_fresh_direct_quote_authentication_preparation_v1.js";
import {
  directAuthenticationKeyIdV1,
} from "./authenticated_paid_work_direct_quote_activation_authentication_v1.js";

function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) throw new Error(message);
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
  throw new Error(`expected rejection: ${label}`);
}

function assertAllFalse(value: Record<string, unknown>, label: string): void {
  for (const [key, child] of Object.entries(value)) {
    assertCondition(child === false, `${label}.${key} exceeded boundary`);
  }
}

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const examplePath = path.join(
  root,
  "examples/authenticated-paid-work-fresh-direct-quote-authentication-preparation-v1.example.json",
);
const wrapperPath = path.join(
  root,
  "scripts/authenticated_paid_work_fresh_direct_quote_signing_handoff_v1.ts",
);
const docsPath = path.join(
  root,
  "docs/operations/authenticated-paid-work-fresh-direct-quote-signing-handoff-v1.md",
);
const workflowPath = path.join(
  root,
  ".github/workflows/authenticated-paid-work-fresh-direct-quote-signing-handoff-v1.yml",
);

for (const file of [examplePath, wrapperPath, docsPath, workflowPath]) {
  const metadata = fs.lstatSync(file);
  assertCondition(
    metadata.isFile() && !metadata.isSymbolicLink(),
    `regular file required: ${file}`,
  );
}

const input = JSON.parse(fs.readFileSync(examplePath, "utf8")) as Record<
  string,
  unknown
>;
input.evidence_mode = "operator_approved_public_key_snapshot";

const providerKeys = crypto.generateKeyPairSync("ed25519");
const requesterKeys = crypto.generateKeyPairSync("ed25519");
const providerPublicPem = providerKeys.publicKey
  .export({ type: "spki", format: "pem" })
  .toString();
const requesterPublicPem = requesterKeys.publicKey
  .export({ type: "spki", format: "pem" })
  .toString();

const providerBinding = input.provider_key_binding_plan as Record<string, unknown>;
providerBinding.public_key_pem = providerPublicPem;
const requesterBinding = input.requester_key_binding_plan as Record<string, unknown>;
requesterBinding.public_key_pem = requesterPublicPem;

const providerPacket =
  prepareAuthenticatedPaidWorkFreshDirectQuoteSigningHandoffV1(input);
assertCondition(
  providerPacket.marker === FRESH_DIRECT_PROVIDER_SIGNING_REQUEST_PACKET_MARKER,
  "provider packet marker mismatch",
);
assertCondition(
  providerPacket.status === "fresh_quote_prepared_provider_signature_required",
  "provider packet status mismatch",
);
assertCondition(
  providerPacket.key_bindings.provider.key_id ===
    directAuthenticationKeyIdV1(providerPublicPem),
  "provider key binding mismatch",
);

const providerSignatureBase64 = crypto
  .sign(
    null,
    Buffer.from(
      providerPacket.provider_signing_request.signing_bytes_base64,
      "base64",
    ),
    providerKeys.privateKey,
  )
  .toString("base64");
const providerSignature = {
  marker: FRESH_DIRECT_QUOTE_EXTERNAL_SIGNATURE_MARKER,
  version: 1,
  signer_role: "provider",
  key_id: providerPacket.key_bindings.provider.key_id,
  signing_bytes_sha256:
    providerPacket.provider_signing_request.signing_bytes_sha256,
  signature_base64: providerSignatureBase64,
};

const requesterPacket =
  advanceAuthenticatedPaidWorkFreshDirectQuoteSigningHandoffV1(
    input,
    providerPacket,
    providerSignature,
  );
assertCondition(
  requesterPacket.marker === FRESH_DIRECT_REQUESTER_SIGNING_REQUEST_PACKET_MARKER,
  "requester packet marker mismatch",
);
assertCondition(
  requesterPacket.status ===
    "provider_authenticated_requester_signature_required",
  "requester packet status mismatch",
);
assertCondition(
  requesterPacket.provider_authentication_envelope.authentication_id ===
    requesterPacket.requester_authentication_body.provider_authentication_id,
  "requester packet is not bound to provider authentication",
);

const requesterSignatureBase64 = crypto
  .sign(
    null,
    Buffer.from(
      requesterPacket.requester_signing_request.signing_bytes_base64,
      "base64",
    ),
    requesterKeys.privateKey,
  )
  .toString("base64");
const requesterSignature = {
  marker: FRESH_DIRECT_QUOTE_EXTERNAL_SIGNATURE_MARKER,
  version: 1,
  signer_role: "requester",
  key_id: providerPacket.key_bindings.requester.key_id,
  signing_bytes_sha256:
    requesterPacket.requester_signing_request.signing_bytes_sha256,
  signature_base64: requesterSignatureBase64,
};

const finalPacket =
  finalizeAuthenticatedPaidWorkFreshDirectQuoteSigningHandoffV1(
    input,
    providerPacket,
    providerSignature,
    requesterPacket,
    requesterSignature,
  );
assertCondition(
  finalPacket.marker === FRESH_DIRECT_AUTHENTICATION_PREPARATION_PACKET_MARKER,
  "final packet marker mismatch",
);
assertCondition(
  finalPacket.status ===
    "direct_authentication_prepared_requires_separate_atomic_persistence_authorization",
  "final packet status mismatch",
);
assertCondition(
  finalPacket.preparation_gate.fresh_quote_verified === true,
  "fresh quote was not verified",
);
assertCondition(
  finalPacket.preparation_gate.provider_signature_verified === true &&
    finalPacket.preparation_gate.requester_signature_verified === true,
  "external signatures were not verified",
);
assertCondition(
  finalPacket.preparation_gate.eligible_for_atomic_activation_persistence ===
    true,
  "final packet is not eligible for separately authorized persistence",
);
assertCondition(
  finalPacket.preparation_gate.atomic_persistence_performed === false,
  "wrapper performed atomic persistence",
);
assertAllFalse(
  finalPacket.authority as unknown as Record<string, unknown>,
  "authority",
);
verifyAuthenticatedPaidWorkFreshDirectQuoteSigningHandoffFinalV1(
  input,
  providerPacket,
  providerSignature,
  requesterPacket,
  requesterSignature,
  finalPacket,
);

const wrongProviderRole = clone(providerSignature);
wrongProviderRole.signer_role = "requester";
expectReject("wrong provider role", () =>
  advanceAuthenticatedPaidWorkFreshDirectQuoteSigningHandoffV1(
    input,
    providerPacket,
    wrongProviderRole,
  ),
);

const wrongProviderDigest = clone(providerSignature);
wrongProviderDigest.signing_bytes_sha256 = "0".repeat(64);
expectReject("wrong provider digest", () =>
  advanceAuthenticatedPaidWorkFreshDirectQuoteSigningHandoffV1(
    input,
    providerPacket,
    wrongProviderDigest,
  ),
);

const requesterSignedByProvider = clone(requesterSignature);
requesterSignedByProvider.signature_base64 = crypto
  .sign(
    null,
    Buffer.from(
      requesterPacket.requester_signing_request.signing_bytes_base64,
      "base64",
    ),
    providerKeys.privateKey,
  )
  .toString("base64");
expectReject("requester signed by provider key", () =>
  finalizeAuthenticatedPaidWorkFreshDirectQuoteSigningHandoffV1(
    input,
    providerPacket,
    providerSignature,
    requesterPacket,
    requesterSignedByProvider,
  ),
);

const tamperedFinal = clone(finalPacket);
tamperedFinal.packet_id = `${tamperedFinal.packet_id.slice(0, -1)}0`;
expectReject("tampered final packet", () =>
  verifyAuthenticatedPaidWorkFreshDirectQuoteSigningHandoffFinalV1(
    input,
    providerPacket,
    providerSignature,
    requesterPacket,
    requesterSignature,
    tamperedFinal,
  ),
);

const wrapperSource = fs.readFileSync(wrapperPath, "utf8");
assertCondition(
  wrapperSource.includes(
    "authenticated_paid_work_fresh_direct_quote_authentication_preparation_v1.js",
  ),
  "wrapper does not use the canonical preparation implementation",
);
for (const obsoleteModule of [
  "fresh_direct_quote_signing_handoff_base_v1",
  "fresh_direct_quote_signing_handoff_shared_v1",
  "fresh_direct_quote_signing_handoff_stages_v1",
  "fresh_direct_quote_signing_handoff_types_v1",
  "fresh_direct_quote_signing_handoff_validation_v1",
]) {
  assertCondition(
    !wrapperSource.includes(obsoleteModule),
    `wrapper still imports duplicate core: ${obsoleteModule}`,
  );
}
assertCondition(
  !wrapperSource.includes("crypto.sign"),
  "operator wrapper performs signing",
);

const docs = fs.readFileSync(docsPath, "utf8");
for (const fragment of [
  "canonical preparation implementation",
  "O_NOFOLLOW",
  "create-only",
  "separate atomic persistence",
]) {
  assertCondition(docs.includes(fragment), `docs missing: ${fragment}`);
}

const workflow = fs.readFileSync(workflowPath, "utf8");
assertCondition(
  workflow.includes(
    "prove_authenticated_paid_work_fresh_direct_quote_file_io_hardening_v1.ts",
  ),
  "workflow omits file-I/O proof",
);

console.log("canonical_preparation_wrapper=true");
console.log("fresh_quote_materialization_green=true");
console.log("provider_signing_request_green=true");
console.log("provider_signature_verification_green=true");
console.log("requester_signing_request_green=true");
console.log("requester_signature_verification_green=true");
console.log("direct_authentication_preparation_green=true");
console.log("atomic_persistence_performed=false");
console.log("payment_execution=false");
console.log("work_dispatch=false");
console.log("wallet_access=false");
console.log("money_movement=false");
console.log(
  "VOID_AUTHENTICATED_PAID_WORK_FRESH_DIRECT_QUOTE_SIGNING_HANDOFF_V1_PROOF_GREEN=true",
);
