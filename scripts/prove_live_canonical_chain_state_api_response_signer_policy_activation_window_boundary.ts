import { readFileSync } from "node:fs";

import {
  assertLiveCanonicalChainStateApiResponseSignerPolicyActivationWindowV1,
  evaluateLiveCanonicalChainStateApiResponseSignerPolicyActivationWindowV1,
  getVoidLiveCanonicalChainStateApiResponseSignerPolicyActivationWindowBoundarySourceMarkerV1,
  type VoidLiveCanonicalChainStateApiResponseSignerPolicyActivationWindowPolicyV1,
  type VoidLiveCanonicalChainStateApiResponseSignerPolicyActivationWindowResponseV1,
} from "../src/chain/block.js";

const GREEN = "VOID_LIVE_CANONICAL_CHAIN_STATE_API_RESPONSE_SIGNER_POLICY_ACTIVATION_WINDOW_BOUNDARY_AUDIT_V1_GREEN";

const policy: VoidLiveCanonicalChainStateApiResponseSignerPolicyActivationWindowPolicyV1 = {
  signerPolicyId: "void-mainnet0-live-canonical-chain-state-signer-policy-v1",
  signerAuthorityVersion: "signer-authority-v1",
  activatedAtMs: 1_000,
  expiresAtMs: 5_000,
};

const acceptedResponse: VoidLiveCanonicalChainStateApiResponseSignerPolicyActivationWindowResponseV1 = {
  signerPolicyId: policy.signerPolicyId,
  signerAuthorityVersion: policy.signerAuthorityVersion,
};

const acceptedDecision = evaluateLiveCanonicalChainStateApiResponseSignerPolicyActivationWindowV1(
  acceptedResponse,
  policy,
  3_000,
);

if (!acceptedDecision.accepted || acceptedDecision.reason !== "signer_policy_activation_window_accepted") {
  throw new Error(`expected accepted signer policy activation window decision, got ${acceptedDecision.reason}`);
}

assertLiveCanonicalChainStateApiResponseSignerPolicyActivationWindowV1(acceptedResponse, policy, 3_000);

const rejectCases: Array<{
  readonly name: string;
  readonly response: VoidLiveCanonicalChainStateApiResponseSignerPolicyActivationWindowResponseV1;
  readonly policy: VoidLiveCanonicalChainStateApiResponseSignerPolicyActivationWindowPolicyV1;
  readonly observedAtMs: number;
  readonly reason: string;
}> = [
  {
    name: "missing response signer policy id",
    response: { signerAuthorityVersion: policy.signerAuthorityVersion },
    policy,
    observedAtMs: 3_000,
    reason: "missing_response_signer_policy_id",
  },
  {
    name: "wrong response signer policy id",
    response: { signerPolicyId: "wrong-policy", signerAuthorityVersion: policy.signerAuthorityVersion },
    policy,
    observedAtMs: 3_000,
    reason: "response_signer_policy_id_mismatch",
  },
  {
    name: "wrong response signer authority version",
    response: { signerPolicyId: policy.signerPolicyId, signerAuthorityVersion: "wrong-authority-version" },
    policy,
    observedAtMs: 3_000,
    reason: "response_signer_authority_version_mismatch",
  },
  {
    name: "invalid observation timestamp",
    response: acceptedResponse,
    policy,
    observedAtMs: Number.POSITIVE_INFINITY,
    reason: "invalid_observed_at_ms",
  },
  {
    name: "not yet active",
    response: acceptedResponse,
    policy,
    observedAtMs: 999,
    reason: "signer_policy_not_yet_active",
  },
  {
    name: "expired",
    response: acceptedResponse,
    policy,
    observedAtMs: 5_001,
    reason: "signer_policy_expired",
  },
  {
    name: "invalid expiry order",
    response: acceptedResponse,
    policy: { ...policy, expiresAtMs: 999 },
    observedAtMs: 3_000,
    reason: "policy_expiry_not_after_activation",
  },
  {
    name: "revoked",
    response: acceptedResponse,
    policy: { ...policy, revokedAtMs: 2_500 },
    observedAtMs: 3_000,
    reason: "signer_policy_revoked_at_observation_time",
  },
];

for (const testCase of rejectCases) {
  const decision = evaluateLiveCanonicalChainStateApiResponseSignerPolicyActivationWindowV1(
    testCase.response,
    testCase.policy,
    testCase.observedAtMs,
  );
  if (decision.accepted || decision.reason !== testCase.reason) {
    throw new Error(`${testCase.name}: expected ${testCase.reason}, got ${decision.reason}`);
  }

  let threw = false;
  try {
    assertLiveCanonicalChainStateApiResponseSignerPolicyActivationWindowV1(
      testCase.response,
      testCase.policy,
      testCase.observedAtMs,
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
const docs = readFileSync("docs/security/live-canonical-chain-state-api-response-signer-policy-activation-window-boundary-v1.md", "utf8");
const proof = readFileSync("scripts/prove_live_canonical_chain_state_api_response_signer_policy_activation_window_boundary.ts", "utf8");

const requiredNeedles = [
  "VOID_LIVE_CANONICAL_CHAIN_STATE_API_RESPONSE_SIGNER_POLICY_ACTIVATION_WINDOW_BOUNDARY_V1_SOURCE",
  "evaluateLiveCanonicalChainStateApiResponseSignerPolicyActivationWindowV1",
  "assertLiveCanonicalChainStateApiResponseSignerPolicyActivationWindowV1",
  "signer_policy_not_yet_active",
  "signer_policy_expired",
  "signer_policy_revoked_at_observation_time",
];

for (const needle of requiredNeedles) {
  if (!source.includes(needle)) {
    throw new Error(`source missing ${needle}`);
  }
}

if (getVoidLiveCanonicalChainStateApiResponseSignerPolicyActivationWindowBoundarySourceMarkerV1() !== requiredNeedles[0]) {
  throw new Error("source marker helper returned wrong marker");
}

if (!docs.includes(GREEN) || !proof.includes(GREEN)) {
  throw new Error("docs/proof missing green marker");
}

console.log(GREEN);
