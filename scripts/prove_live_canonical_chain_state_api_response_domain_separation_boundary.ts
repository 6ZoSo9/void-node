import {
  LIVE_CANONICAL_CHAIN_STATE_API_RESPONSE_DOMAIN_SEPARATION_BOUNDARY_V1,
  assertLiveCanonicalChainStateApiResponseDomainSeparationBoundaryGreenV1,
  evaluateLiveCanonicalChainStateApiResponseDomainSeparationBoundaryV1,
  type LiveCanonicalChainStateApiResponseDomainSeparationCandidateV1,
  type LiveCanonicalChainStateApiResponseDomainSeparationPolicyV1,
} from '../src/chain/block';

const policy: LiveCanonicalChainStateApiResponseDomainSeparationPolicyV1 = {
  enabled: true,
  requireSignedResponse: true,
  requireFreshResponse: true,
  requireReplayNonceAccepted: true,
  expectedChainId: 2050,
  expectedNetworkId: 'mainnet-0',
  expectedResponsePurpose: 'live-canonical-chain-state-finality',
  expectedRoutePath: '/api/chain/live-canonical-state/finality',
  expectedAuthorityDomain: 'void:mainnet-0:live-canonical-chain-state-api',
};

const validCandidate: LiveCanonicalChainStateApiResponseDomainSeparationCandidateV1 = {
  signatureAccepted: true,
  freshnessAccepted: true,
  replayNonceAccepted: true,
  chainId: 2050,
  networkId: ' MAINNET-0 ',
  responsePurpose: 'Live-Canonical-Chain-State-Finality',
  routePath: 'api/chain/live-canonical-state/finality/',
  authorityDomain: ' VOID:MAINNET-0:LIVE-CANONICAL-CHAIN-STATE-API ',
};

const marker = assertLiveCanonicalChainStateApiResponseDomainSeparationBoundaryGreenV1(policy, validCandidate);

if (marker !== LIVE_CANONICAL_CHAIN_STATE_API_RESPONSE_DOMAIN_SEPARATION_BOUNDARY_V1) {
  throw new Error('unexpected domain separation boundary marker');
}

const normalizedDecision = evaluateLiveCanonicalChainStateApiResponseDomainSeparationBoundaryV1(policy, validCandidate);

if (normalizedDecision.normalizedNetworkId !== 'mainnet-0') {
  throw new Error('network id normalization failed');
}

if (normalizedDecision.normalizedRoutePath !== '/api/chain/live-canonical-state/finality') {
  throw new Error('route path normalization failed');
}

function expectRejected(
  label: string,
  candidate: LiveCanonicalChainStateApiResponseDomainSeparationCandidateV1,
  expectedReason: string,
): void {
  const decision = evaluateLiveCanonicalChainStateApiResponseDomainSeparationBoundaryV1(policy, candidate);

  if (decision.accepted) {
    throw new Error(`${label} unexpectedly accepted`);
  }

  if (!decision.reasons.includes(expectedReason)) {
    throw new Error(`${label} missing rejection reason ${expectedReason}; got ${decision.reasons.join(',')}`);
  }
}

expectRejected(
  'unsigned response',
  {
    ...validCandidate,
    signatureAccepted: false,
  },
  'signed_response_required',
);

expectRejected(
  'stale response',
  {
    ...validCandidate,
    freshnessAccepted: false,
  },
  'fresh_response_required',
);

expectRejected(
  'replay nonce not accepted',
  {
    ...validCandidate,
    replayNonceAccepted: false,
  },
  'replay_nonce_acceptance_required',
);

expectRejected(
  'wrong chain id',
  {
    ...validCandidate,
    chainId: 2051,
  },
  'chain_id_mismatch',
);

expectRejected(
  'wrong network id',
  {
    ...validCandidate,
    networkId: 'testnet-0',
  },
  'network_id_mismatch',
);

expectRejected(
  'wrong purpose',
  {
    ...validCandidate,
    responsePurpose: 'validator-runtime-truth',
  },
  'response_purpose_mismatch',
);

expectRejected(
  'wrong route path',
  {
    ...validCandidate,
    routePath: '/api/chain/other-finality',
  },
  'route_path_mismatch',
);

expectRejected(
  'wrong authority domain',
  {
    ...validCandidate,
    authorityDomain: 'void:testnet-0:live-canonical-chain-state-api',
  },
  'authority_domain_mismatch',
);

const disabledDecision = evaluateLiveCanonicalChainStateApiResponseDomainSeparationBoundaryV1(
  {
    ...policy,
    enabled: false,
  },
  {
    ...validCandidate,
    signatureAccepted: false,
    freshnessAccepted: false,
    replayNonceAccepted: false,
    chainId: 1,
    networkId: 'wrong-network',
    responsePurpose: 'wrong-purpose',
    routePath: '/wrong-route',
    authorityDomain: 'wrong-domain',
  },
);

if (!disabledDecision.accepted || !disabledDecision.reasons.includes('domain_separation_policy_disabled')) {
  throw new Error('disabled domain separation policy must remain explicitly bypassed');
}

console.log('VOID_LIVE_CANONICAL_CHAIN_STATE_API_RESPONSE_DOMAIN_SEPARATION_BOUNDARY_AUDIT_V1_GREEN');
