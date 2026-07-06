import { readFileSync } from "node:fs";

import {
  assertLiveCanonicalChainStateApiResponseSignerPolicyRollbackGuardV1,
  evaluateLiveCanonicalChainStateApiResponseSignerPolicyRollbackGuardV1,
  getVoidLiveCanonicalChainStateApiResponseSignerPolicyRollbackGuardBoundarySourceMarkerV1,
  type VoidLiveCanonicalChainStateApiResponseSignerPolicyRollbackGuardLastAcceptedV1,
  type VoidLiveCanonicalChainStateApiResponseSignerPolicyRollbackGuardPolicyV1,
  type VoidLiveCanonicalChainStateApiResponseSignerPolicyRollbackGuardResponseV1,
} from "../src/chain/block";

const GREEN = "VOID_LIVE_CANONICAL_CHAIN_STATE_API_RESPONSE_SIGNER_POLICY_ROLLBACK_GUARD_BOUNDARY_AUDIT_V1_GREEN";

const policy: VoidLiveCanonicalChainStateApiResponseSignerPolicyRollbackGuardPolicyV1 = {
  signerPolicyId: "void-mainnet0-live-canonical-chain-state-signer-policy-v3",
  signerAuthorityVersion: "signer-authority-v3",
  signerPolicySequence: 3,
};

const response: VoidLiveCanonicalChainStateApiResponseSignerPolicyRollbackGuardResponseV1 = {
  signerPolicyId: policy.signerPolicyId,
  signerAuthorityVersion: policy.signerAuthorityVersion,
  signerPolicySequence: policy.signerPolicySequence,
};

const olderAccepted: VoidLiveCanonicalChainStateApiResponseSignerPolicyRollbackGuardLastAcceptedV1 = {
  signerPolicyId: "void-mainnet0-live-canonical-chain-state-signer-policy-v2",
  signerAuthorityVersion: "signer-authority-v2",
  signerPolicySequence: 2,
};

const acceptedDecision = evaluateLiveCanonicalChainStateApiResponseSignerPolicyRollbackGuardV1(
  response,
  policy,
  olderAccepted,
);

if (!acceptedDecision.accepted || acceptedDecision.reason !== "signer_policy_rollback_guard_accepted") {
  throw new Error(`expected accepted signer policy rollback guard decision, got ${acceptedDecision.reason}`);
}

assertLiveCanonicalChainStateApiResponseSignerPolicyRollbackGuardV1(response, policy, olderAccepted);
assertLiveCanonicalChainStateApiResponseSignerPolicyRollbackGuardV1(response, policy, {
  signerPolicyId: policy.signerPolicyId,
  signerAuthorityVersion: policy.signerAuthorityVersion,
  signerPolicySequence: policy.signerPolicySequence,
});

const rejectCases: Array<{
  readonly name: string;
  readonly response: VoidLiveCanonicalChainStateApiResponseSignerPolicyRollbackGuardResponseV1;
  readonly policy: VoidLiveCanonicalChainStateApiResponseSignerPolicyRollbackGuardPolicyV1;
  readonly lastAccepted: VoidLiveCanonicalChainStateApiResponseSignerPolicyRollbackGuardLastAcceptedV1;
  readonly reason: string;
}> = [
  {
    name: "missing response signer policy sequence",
    response: { signerPolicyId: policy.signerPolicyId, signerAuthorityVersion: policy.signerAuthorityVersion },
    policy,
    lastAccepted: olderAccepted,
    reason: "missing_or_invalid_response_signer_policy_sequence",
  },
  {
    name: "response sequence mismatch",
    response: { ...response, signerPolicySequence: 4 },
    policy,
    lastAccepted: olderAccepted,
    reason: "response_signer_policy_sequence_mismatch",
  },
  {
    name: "invalid policy sequence",
    response,
    policy: { ...policy, signerPolicySequence: 3.5 },
    lastAccepted: olderAccepted,
    reason: "invalid_policy_signer_policy_sequence",
  },
  {
    name: "policy sequence regressed",
    response,
    policy,
    lastAccepted: { signerPolicyId: "future-policy", signerAuthorityVersion: "signer-authority-v4", signerPolicySequence: 4 },
    reason: "signer_policy_sequence_regressed",
  },
  {
    name: "same sequence policy id changed",
    response,
    policy,
    lastAccepted: { signerPolicyId: "different-policy-at-sequence-3", signerAuthorityVersion: policy.signerAuthorityVersion, signerPolicySequence: 3 },
    reason: "same_sequence_signer_policy_id_changed",
  },
  {
    name: "same sequence authority version changed",
    response,
    policy,
    lastAccepted: { signerPolicyId: policy.signerPolicyId, signerAuthorityVersion: "different-authority-v3", signerPolicySequence: 3 },
    reason: "same_sequence_signer_authority_version_changed",
  },
  {
    name: "invalid last accepted sequence",
    response,
    policy,
    lastAccepted: { signerPolicyId: policy.signerPolicyId, signerAuthorityVersion: policy.signerAuthorityVersion, signerPolicySequence: Number.NaN },
    reason: "invalid_last_accepted_signer_policy_sequence",
  },
  {
    name: "response signer policy id mismatch",
    response: { ...response, signerPolicyId: "wrong-policy" },
    policy,
    lastAccepted: olderAccepted,
    reason: "response_signer_policy_id_mismatch",
  },
  {
    name: "response signer authority version mismatch",
    response: { ...response, signerAuthorityVersion: "wrong-authority" },
    policy,
    lastAccepted: olderAccepted,
    reason: "response_signer_authority_version_mismatch",
  },
];

for (const testCase of rejectCases) {
  const decision = evaluateLiveCanonicalChainStateApiResponseSignerPolicyRollbackGuardV1(
    testCase.response,
    testCase.policy,
    testCase.lastAccepted,
  );

  if (decision.accepted || decision.reason !== testCase.reason) {
    throw new Error(`${testCase.name}: expected ${testCase.reason}, got ${decision.reason}`);
  }

  let threw = false;
  try {
    assertLiveCanonicalChainStateApiResponseSignerPolicyRollbackGuardV1(
      testCase.response,
      testCase.policy,
      testCase.lastAccepted,
    );
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
const docs = readFileSync("docs/security/live-canonical-chain-state-api-response-signer-policy-rollback-guard-boundary-v1.md", "utf8");
const proof = readFileSync("scripts/prove_live_canonical_chain_state_api_response_signer_policy_rollback_guard_boundary.ts", "utf8");

const requiredNeedles = [
  "VOID_LIVE_CANONICAL_CHAIN_STATE_API_RESPONSE_SIGNER_POLICY_ROLLBACK_GUARD_BOUNDARY_V1_SOURCE",
  "evaluateLiveCanonicalChainStateApiResponseSignerPolicyRollbackGuardV1",
  "assertLiveCanonicalChainStateApiResponseSignerPolicyRollbackGuardV1",
  "signer_policy_sequence_regressed",
  "same_sequence_signer_policy_id_changed",
  "same_sequence_signer_authority_version_changed",
];

for (const needle of requiredNeedles) {
  if (!source.includes(needle)) {
    throw new Error(`source missing ${needle}`);
  }
}

if (getVoidLiveCanonicalChainStateApiResponseSignerPolicyRollbackGuardBoundarySourceMarkerV1() !== requiredNeedles[0]) {
  throw new Error("source marker helper returned wrong marker");
}

if (!docs.includes(GREEN) || !proof.includes(GREEN)) {
  throw new Error("docs/proof missing green marker");
}

console.log(GREEN);
