import { readFileSync } from "node:fs";

import {
  assertLiveCanonicalChainStateApiResponseSignerPolicyBindingV1,
  evaluateLiveCanonicalChainStateApiResponseSignerPolicyBindingV1,
  getVoidLiveCanonicalChainStateApiResponseSignerPolicyBindingBoundarySourceMarkerV1,
  type VoidLiveCanonicalChainStateApiResponseSignerPolicyBindingPolicyV1,
  type VoidLiveCanonicalChainStateApiResponseSignerPolicyBindingResponseV1,
} from "../src/chain/block.js";

const GREEN = "VOID_LIVE_CANONICAL_CHAIN_STATE_API_RESPONSE_SIGNER_POLICY_BINDING_BOUNDARY_AUDIT_V1_GREEN";

const policy: VoidLiveCanonicalChainStateApiResponseSignerPolicyBindingPolicyV1 = {
  requiredSignerPolicyId: "void-mainnet0-live-canonical-chain-state-signer-policy-v1",
  requiredSignerAuthorityVersion: "signer-authority-v1",
  allowedSignerKeyIds: ["void-live-chain-state-api-signer-001", "void-live-chain-state-api-signer-002"],
  revokedSignerKeyIds: ["void-live-chain-state-api-signer-revoked"],
};

const acceptedResponse: VoidLiveCanonicalChainStateApiResponseSignerPolicyBindingResponseV1 = {
  signerKeyId: "void-live-chain-state-api-signer-001",
  signerPolicyId: policy.requiredSignerPolicyId,
  signerAuthorityVersion: policy.requiredSignerAuthorityVersion,
};

const rejectCases: Array<{
  readonly name: string;
  readonly response: VoidLiveCanonicalChainStateApiResponseSignerPolicyBindingResponseV1;
  readonly reason: string;
}> = [
  {
    name: "missing signer key id",
    response: {
      signerPolicyId: policy.requiredSignerPolicyId,
      signerAuthorityVersion: policy.requiredSignerAuthorityVersion,
    },
    reason: "missing_response_signer_key_id",
  },
  {
    name: "wrong signer policy id",
    response: {
      signerKeyId: "void-live-chain-state-api-signer-001",
      signerPolicyId: "wrong-policy",
      signerAuthorityVersion: policy.requiredSignerAuthorityVersion,
    },
    reason: "response_signer_policy_id_mismatch",
  },
  {
    name: "wrong signer authority version",
    response: {
      signerKeyId: "void-live-chain-state-api-signer-001",
      signerPolicyId: policy.requiredSignerPolicyId,
      signerAuthorityVersion: "wrong-version",
    },
    reason: "response_signer_authority_version_mismatch",
  },
  {
    name: "unallowed signer",
    response: {
      signerKeyId: "void-live-chain-state-api-signer-999",
      signerPolicyId: policy.requiredSignerPolicyId,
      signerAuthorityVersion: policy.requiredSignerAuthorityVersion,
    },
    reason: "response_signer_key_id_not_allowed_by_bound_policy",
  },
  {
    name: "revoked signer",
    response: {
      signerKeyId: "void-live-chain-state-api-signer-revoked",
      signerPolicyId: policy.requiredSignerPolicyId,
      signerAuthorityVersion: policy.requiredSignerAuthorityVersion,
    },
    reason: "response_signer_key_id_not_allowed_by_bound_policy",
  },
];

const acceptedDecision = evaluateLiveCanonicalChainStateApiResponseSignerPolicyBindingV1(acceptedResponse, policy);
if (!acceptedDecision.accepted || acceptedDecision.reason !== "signer_policy_binding_accepted") {
  throw new Error(`expected accepted signer policy binding, got ${JSON.stringify(acceptedDecision)}`);
}

assertLiveCanonicalChainStateApiResponseSignerPolicyBindingV1(acceptedResponse, policy);

for (const testCase of rejectCases) {
  const decision = evaluateLiveCanonicalChainStateApiResponseSignerPolicyBindingV1(testCase.response, policy);
  if (decision.accepted) {
    throw new Error(`expected rejection for ${testCase.name}`);
  }
  if (decision.reason !== testCase.reason) {
    throw new Error(`expected ${testCase.reason} for ${testCase.name}, got ${decision.reason}`);
  }
}

const explicitlyRevokedButAllowedPolicy: VoidLiveCanonicalChainStateApiResponseSignerPolicyBindingPolicyV1 = {
  ...policy,
  allowedSignerKeyIds: [...policy.allowedSignerKeyIds, "void-live-chain-state-api-signer-revoked"],
};

const revokedDecision = evaluateLiveCanonicalChainStateApiResponseSignerPolicyBindingV1(
  {
    signerKeyId: "void-live-chain-state-api-signer-revoked",
    signerPolicyId: explicitlyRevokedButAllowedPolicy.requiredSignerPolicyId,
    signerAuthorityVersion: explicitlyRevokedButAllowedPolicy.requiredSignerAuthorityVersion,
  },
  explicitlyRevokedButAllowedPolicy,
);

if (revokedDecision.accepted || revokedDecision.reason !== "response_signer_key_id_revoked_by_bound_policy") {
  throw new Error(`expected revoked signer rejection, got ${JSON.stringify(revokedDecision)}`);
}

const emptyPolicyDecision = evaluateLiveCanonicalChainStateApiResponseSignerPolicyBindingV1(acceptedResponse, {
  ...policy,
  requiredSignerPolicyId: "",
});
if (emptyPolicyDecision.accepted || emptyPolicyDecision.reason !== "missing_required_signer_policy_id") {
  throw new Error(`expected missing required policy rejection, got ${JSON.stringify(emptyPolicyDecision)}`);
}

const marker = getVoidLiveCanonicalChainStateApiResponseSignerPolicyBindingBoundarySourceMarkerV1();
if (marker !== "VOID_LIVE_CANONICAL_CHAIN_STATE_API_RESPONSE_SIGNER_POLICY_BINDING_BOUNDARY_V1_SOURCE") {
  throw new Error(`unexpected source marker: ${marker}`);
}

const source = readFileSync("src/chain/block.ts", "utf8");
for (const needle of [
  "evaluateLiveCanonicalChainStateApiResponseSignerPolicyBindingV1",
  "assertLiveCanonicalChainStateApiResponseSignerPolicyBindingV1",
  "response_signer_policy_id_mismatch",
  "response_signer_authority_version_mismatch",
  "response_signer_key_id_not_allowed_by_bound_policy",
  "response_signer_key_id_revoked_by_bound_policy",
]) {
  if (!source.includes(needle)) {
    throw new Error(`missing source needle: ${needle}`);
  }
}

console.log(GREEN);
