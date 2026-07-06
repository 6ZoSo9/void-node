import { readFileSync } from "node:fs";

import {
  assertLiveCanonicalChainStateApiResponseQuorumCertificateBindingV1,
  buildLiveCanonicalChainStateApiResponseQuorumCertificateBindingV1,
  evaluateLiveCanonicalChainStateApiResponseQuorumCertificateBindingV1,
  getVoidLiveCanonicalChainStateApiResponseQuorumCertificateBindingBoundarySourceMarkerV1,
  type VoidLiveCanonicalChainStateApiResponseQuorumCertificateBindingCertificateV1,
  type VoidLiveCanonicalChainStateApiResponseQuorumCertificateBindingResponseV1,
  type VoidLiveCanonicalChainStateApiResponseSignerPolicyQuorumPolicyV1,
} from "../src/chain/block";

const GREEN = "VOID_LIVE_CANONICAL_CHAIN_STATE_API_RESPONSE_QUORUM_CERTIFICATE_BINDING_BOUNDARY_AUDIT_V1_GREEN";

const policy: VoidLiveCanonicalChainStateApiResponseSignerPolicyQuorumPolicyV1 = {
  signerPolicyId: "void-mainnet0-live-canonical-chain-state-signer-policy-v6",
  signerAuthorityVersion: "signer-authority-v6",
  signerPolicySequence: 6,
  quorumThreshold: 2,
  allowedSignerKeyIds: ["api-signer-a", "api-signer-b", "api-signer-c"],
  revokedSignerKeyIds: ["api-signer-c"],
};

const response: VoidLiveCanonicalChainStateApiResponseQuorumCertificateBindingResponseV1 = {
  domain: "void-mainnet0:live-canonical-chain-state-api",
  responseNonce: "response-nonce-0006",
  finalizedHeight: 888,
  finalizedBlockHash: "0xfinalized-block-888",
  epochRoot: "0xepoch-root-888",
  signerPolicyId: policy.signerPolicyId,
  signerAuthorityVersion: policy.signerAuthorityVersion,
  signerPolicySequence: policy.signerPolicySequence,
  signerKeyIds: ["api-signer-b", "api-signer-a"],
};

const certificate = buildLiveCanonicalChainStateApiResponseQuorumCertificateBindingV1(response, policy);

if (certificate.certificatePurpose !== "void-live-canonical-chain-state-api-response-quorum-certificate-v1") {
  throw new Error("certificate purpose was not bound");
}

if (certificate.quorumSignerKeyIds.join(",") !== "api-signer-a,api-signer-b") {
  throw new Error(`certificate signer set was not canonicalized: ${certificate.quorumSignerKeyIds.join(",")}`);
}

if (!certificate.bindingPayload.includes("responseNonce=response-nonce-0006")) {
  throw new Error("certificate binding payload did not include response nonce");
}

const acceptedDecision = evaluateLiveCanonicalChainStateApiResponseQuorumCertificateBindingV1(response, policy, certificate);
if (!acceptedDecision.accepted || acceptedDecision.reason !== "quorum_certificate_binding_accepted") {
  throw new Error(`expected quorum certificate binding acceptance, got ${acceptedDecision.reason}`);
}

if (acceptedDecision.expectedBindingPayload !== certificate.bindingPayload || acceptedDecision.actualBindingPayload !== certificate.bindingPayload) {
  throw new Error("accepted decision did not preserve binding payloads");
}

assertLiveCanonicalChainStateApiResponseQuorumCertificateBindingV1(response, policy, certificate);

const expectReject = (
  name: string,
  candidateResponse: VoidLiveCanonicalChainStateApiResponseQuorumCertificateBindingResponseV1,
  candidatePolicy: VoidLiveCanonicalChainStateApiResponseSignerPolicyQuorumPolicyV1,
  candidateCertificate: VoidLiveCanonicalChainStateApiResponseQuorumCertificateBindingCertificateV1,
  reason: string,
): void => {
  const decision = evaluateLiveCanonicalChainStateApiResponseQuorumCertificateBindingV1(candidateResponse, candidatePolicy, candidateCertificate);

  if (decision.accepted || decision.reason !== reason) {
    throw new Error(`${name}: expected ${reason}, got ${decision.reason}`);
  }

  let rejected = false;
  try {
    assertLiveCanonicalChainStateApiResponseQuorumCertificateBindingV1(candidateResponse, candidatePolicy, candidateCertificate);
  } catch (error) {
    rejected = true;
    if (!(error instanceof Error) || !error.message.includes(reason)) {
      throw error;
    }
  }

  if (!rejected) {
    throw new Error(`${name}: assert helper failed to reject`);
  }
};

const certWith = (
  patch: Partial<VoidLiveCanonicalChainStateApiResponseQuorumCertificateBindingCertificateV1>,
): VoidLiveCanonicalChainStateApiResponseQuorumCertificateBindingCertificateV1 => ({
  ...certificate,
  ...patch,
});

expectReject(
  "source quorum not met",
  { ...response, signerKeyIds: ["api-signer-a"] },
  policy,
  certificate,
  "source_signer_policy_quorum_rejected:signer_policy_quorum_not_met",
);

expectReject("missing response nonce", { ...response, responseNonce: "" }, policy, certificate, "missing_response_nonce");
expectReject("invalid response finalized height", { ...response, finalizedHeight: -1 }, policy, certificate, "missing_or_invalid_response_finalized_height");
expectReject("certificate purpose mismatch", response, policy, certWith({ certificatePurpose: "wrong-purpose" }), "quorum_certificate_purpose_mismatch");
expectReject("certificate domain mismatch", response, policy, certWith({ domain: "wrong-domain" }), "quorum_certificate_domain_mismatch");
expectReject("certificate response nonce mismatch", response, policy, certWith({ responseNonce: "wrong-nonce" }), "quorum_certificate_response_nonce_mismatch");
expectReject("certificate signer set not canonical", response, policy, certWith({ quorumSignerKeyIds: ["api-signer-b", "api-signer-a"] }), "quorum_certificate_signer_set_not_canonical");
expectReject("certificate signer set mismatch", response, policy, certWith({ quorumSignerKeyIds: ["api-signer-a", "api-signer-c"] }), "quorum_certificate_signer_set_mismatch");
expectReject("certificate binding payload mismatch", response, policy, certWith({ bindingPayload: `${certificate.bindingPayload}|tampered=true` }), "quorum_certificate_binding_payload_mismatch");
expectReject("certificate policy sequence mismatch", response, policy, certWith({ signerPolicySequence: certificate.signerPolicySequence + 1 }), "quorum_certificate_signer_policy_sequence_mismatch");

const source = readFileSync("src/chain/block.ts", "utf8");
const docs = readFileSync("docs/security/live-canonical-chain-state-api-response-quorum-certificate-binding-boundary-v1.md", "utf8");
const proof = readFileSync("scripts/prove_live_canonical_chain_state_api_response_quorum_certificate_binding_boundary.ts", "utf8");

const requiredNeedles = [
  "VOID_LIVE_CANONICAL_CHAIN_STATE_API_RESPONSE_QUORUM_CERTIFICATE_BINDING_BOUNDARY_V1_SOURCE",
  "buildLiveCanonicalChainStateApiResponseQuorumCertificateBindingV1",
  "evaluateLiveCanonicalChainStateApiResponseQuorumCertificateBindingV1",
  "assertLiveCanonicalChainStateApiResponseQuorumCertificateBindingV1",
  "quorum_certificate_binding_payload_mismatch",
  "quorum_certificate_signer_set_not_canonical",
  "source_signer_policy_quorum_rejected",
];

for (const needle of requiredNeedles) {
  if (!source.includes(needle)) {
    throw new Error(`source missing ${needle}`);
  }
}

if (getVoidLiveCanonicalChainStateApiResponseQuorumCertificateBindingBoundarySourceMarkerV1() !== requiredNeedles[0]) {
  throw new Error("source marker helper returned wrong marker");
}

if (!docs.includes(GREEN) || !proof.includes(GREEN)) {
  throw new Error("docs/proof missing green marker");
}

console.log(GREEN);
