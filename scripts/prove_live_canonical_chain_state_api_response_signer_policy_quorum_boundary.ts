import { readFileSync } from "node:fs";

import {
  assertLiveCanonicalChainStateApiResponseSignerPolicyQuorumV1,
  evaluateLiveCanonicalChainStateApiResponseSignerPolicyQuorumV1,
  getVoidLiveCanonicalChainStateApiResponseSignerPolicyQuorumBoundarySourceMarkerV1,
  type VoidLiveCanonicalChainStateApiResponseSignerPolicyQuorumPolicyV1,
  type VoidLiveCanonicalChainStateApiResponseSignerPolicyQuorumResponseV1,
} from "../src/chain/block.js";

const GREEN = "VOID_LIVE_CANONICAL_CHAIN_STATE_API_RESPONSE_SIGNER_POLICY_QUORUM_BOUNDARY_AUDIT_V1_GREEN";

const policy: VoidLiveCanonicalChainStateApiResponseSignerPolicyQuorumPolicyV1 = {
  signerPolicyId: "void-mainnet0-live-canonical-chain-state-signer-policy-v4",
  signerAuthorityVersion: "signer-authority-v4",
  signerPolicySequence: 4,
  quorumThreshold: 2,
  allowedSignerKeyIds: ["api-signer-a", "api-signer-b", "api-signer-c"],
  revokedSignerKeyIds: ["api-signer-c"],
};

const response: VoidLiveCanonicalChainStateApiResponseSignerPolicyQuorumResponseV1 = {
  signerPolicyId: policy.signerPolicyId,
  signerAuthorityVersion: policy.signerAuthorityVersion,
  signerPolicySequence: policy.signerPolicySequence,
  signerKeyIds: ["api-signer-a", "api-signer-b"],
};

const acceptedDecision = evaluateLiveCanonicalChainStateApiResponseSignerPolicyQuorumV1(response, policy);
if (!acceptedDecision.accepted || acceptedDecision.reason !== "signer_policy_quorum_accepted") {
  throw new Error(`expected signer policy quorum acceptance, got ${acceptedDecision.reason}`);
}

if (acceptedDecision.acceptedSignerKeyIds.length !== 2 || acceptedDecision.rejectedSignerKeyIds.length !== 0) {
  throw new Error("accepted quorum decision did not preserve accepted/rejected signer sets");
}

assertLiveCanonicalChainStateApiResponseSignerPolicyQuorumV1(response, policy);

const rejectCases: Array<{
  readonly name: string;
  readonly response: VoidLiveCanonicalChainStateApiResponseSignerPolicyQuorumResponseV1;
  readonly policy: VoidLiveCanonicalChainStateApiResponseSignerPolicyQuorumPolicyV1;
  readonly reason: string;
}> = [
  {
    name: "missing signer key ids",
    response: {
      signerPolicyId: policy.signerPolicyId,
      signerAuthorityVersion: policy.signerAuthorityVersion,
      signerPolicySequence: policy.signerPolicySequence,
    },
    policy,
    reason: "missing_response_signer_key_ids",
  },
  {
    name: "quorum not met",
    response: { ...response, signerKeyIds: ["api-signer-a"] },
    policy,
    reason: "signer_policy_quorum_not_met",
  },
  {
    name: "duplicate signer key id",
    response: { ...response, signerKeyIds: ["api-signer-a", "api-signer-a"] },
    policy,
    reason: "duplicate_response_signer_key_id",
  },
  {
    name: "signer key not allowed",
    response: { ...response, signerKeyIds: ["api-signer-a", "api-signer-x"] },
    policy,
    reason: "response_signer_key_id_not_allowed",
  },
  {
    name: "signer key revoked",
    response: { ...response, signerKeyIds: ["api-signer-a", "api-signer-c"] },
    policy,
    reason: "response_signer_key_id_revoked",
  },
  {
    name: "quorum threshold exceeds live signer set",
    response,
    policy: { ...policy, quorumThreshold: 3 },
    reason: "quorum_threshold_exceeds_live_allowed_signers",
  },
  {
    name: "invalid threshold",
    response,
    policy: { ...policy, quorumThreshold: 0 },
    reason: "invalid_policy_quorum_threshold",
  },
  {
    name: "response policy id mismatch",
    response: { ...response, signerPolicyId: "wrong-policy" },
    policy,
    reason: "response_signer_policy_id_mismatch",
  },
  {
    name: "response authority version mismatch",
    response: { ...response, signerAuthorityVersion: "wrong-authority" },
    policy,
    reason: "response_signer_authority_version_mismatch",
  },
  {
    name: "response policy sequence mismatch",
    response: { ...response, signerPolicySequence: 5 },
    policy,
    reason: "response_signer_policy_sequence_mismatch",
  },
  {
    name: "invalid allowed signer key",
    response,
    policy: { ...policy, allowedSignerKeyIds: ["api-signer-a", ""] },
    reason: "invalid_allowed_signer_key_id",
  },
  {
    name: "no live allowed signer keys",
    response: { ...response, signerKeyIds: ["api-signer-a"] },
    policy: {
      ...policy,
      quorumThreshold: 1,
      allowedSignerKeyIds: ["api-signer-a"],
      revokedSignerKeyIds: ["api-signer-a"],
    },
    reason: "no_live_allowed_signer_keys",
  },
];

for (const testCase of rejectCases) {
  const decision = evaluateLiveCanonicalChainStateApiResponseSignerPolicyQuorumV1(testCase.response, testCase.policy);

  if (decision.accepted || decision.reason !== testCase.reason) {
    throw new Error(`${testCase.name}: expected ${testCase.reason}, got ${decision.reason}`);
  }

  let threw = false;
  try {
    assertLiveCanonicalChainStateApiResponseSignerPolicyQuorumV1(testCase.response, testCase.policy);
  } catch (error) {
    threw = true;
    if (!(error instanceof Error) || !error.message.includes(testCase.reason)) {
      throw error;
    }
  }

  if (!threw) {
    throw new Error(`${testCase.name}: assert helper failed to reject`);
  }
}

const source = readFileSync("src/chain/block.ts", "utf8");
const docs = readFileSync("docs/security/live-canonical-chain-state-api-response-signer-policy-quorum-boundary-v1.md", "utf8");
const proof = readFileSync("scripts/prove_live_canonical_chain_state_api_response_signer_policy_quorum_boundary.ts", "utf8");

const requiredNeedles = [
  "VOID_LIVE_CANONICAL_CHAIN_STATE_API_RESPONSE_SIGNER_POLICY_QUORUM_BOUNDARY_V1_SOURCE",
  "evaluateLiveCanonicalChainStateApiResponseSignerPolicyQuorumV1",
  "assertLiveCanonicalChainStateApiResponseSignerPolicyQuorumV1",
  "signer_policy_quorum_not_met",
  "duplicate_response_signer_key_id",
  "response_signer_key_id_not_allowed",
  "response_signer_key_id_revoked",
];

for (const needle of requiredNeedles) {
  if (!source.includes(needle)) {
    throw new Error(`source missing ${needle}`);
  }
}

if (getVoidLiveCanonicalChainStateApiResponseSignerPolicyQuorumBoundarySourceMarkerV1() !== requiredNeedles[0]) {
  throw new Error("source marker helper returned wrong marker");
}

if (!docs.includes(GREEN) || !proof.includes(GREEN)) {
  throw new Error("docs/proof missing green marker");
}

console.log(GREEN);
