import {
  LIVE_CANONICAL_CHAIN_STATE_API_RESPONSE_REPLAY_NONCE_BOUNDARY_V1,
  assertLiveCanonicalChainStateApiResponseReplayNonceBoundaryGreenV1,
  evaluateLiveCanonicalChainStateApiResponseReplayNonceBoundaryV1,
  type LiveCanonicalChainStateApiResponseReplayNonceCandidateV1,
  type LiveCanonicalChainStateApiResponseReplayNoncePolicyV1,
  type LiveCanonicalChainStateApiResponseReplayNonceStateV1,
} from '../src/chain/block.js';

const policy: LiveCanonicalChainStateApiResponseReplayNoncePolicyV1 = {
  enabled: true,
  requireSignedResponse: true,
  requireFreshResponse: true,
  requireMonotonicObservedAtMs: true,
  requireNonRegressingFinalizedHeight: true,
  requireDistinctResponseNonce: true,
};

const state: LiveCanonicalChainStateApiResponseReplayNonceStateV1 = {
  lastAcceptedObservedAtMs: 1_000_000,
  lastAcceptedFinalizedHeight: 44,
  seenResponseNonces: ['accepted-response-nonce-0001'],
};

const validCandidate: LiveCanonicalChainStateApiResponseReplayNonceCandidateV1 = {
  signatureAccepted: true,
  freshnessAccepted: true,
  observedAtMs: 1_000_001,
  finalizedHeight: 44,
  responseNonce: 'accepted-response-nonce-0002',
};

const marker = assertLiveCanonicalChainStateApiResponseReplayNonceBoundaryGreenV1(policy, state, validCandidate);

if (marker !== LIVE_CANONICAL_CHAIN_STATE_API_RESPONSE_REPLAY_NONCE_BOUNDARY_V1) {
  throw new Error('unexpected replay nonce boundary marker');
}

function expectRejected(
  label: string,
  candidate: LiveCanonicalChainStateApiResponseReplayNonceCandidateV1,
  expectedReason: string,
): void {
  const decision = evaluateLiveCanonicalChainStateApiResponseReplayNonceBoundaryV1(policy, state, candidate);

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
    responseNonce: 'accepted-response-nonce-0003',
  },
  'signed_response_required',
);

expectRejected(
  'stale response',
  {
    ...validCandidate,
    freshnessAccepted: false,
    responseNonce: 'accepted-response-nonce-0004',
  },
  'fresh_response_required',
);

expectRejected(
  'non-monotonic observation time',
  {
    ...validCandidate,
    observedAtMs: 1_000_000,
    responseNonce: 'accepted-response-nonce-0005',
  },
  'observed_at_ms_not_monotonic',
);

expectRejected(
  'regressed finalized height',
  {
    ...validCandidate,
    finalizedHeight: 43,
    responseNonce: 'accepted-response-nonce-0006',
  },
  'finalized_height_regressed',
);

expectRejected(
  'replayed nonce',
  {
    ...validCandidate,
    responseNonce: ' accepted-response-nonce-0001 ',
  },
  'response_nonce_replayed',
);

expectRejected(
  'missing nonce',
  {
    ...validCandidate,
    responseNonce: 'short',
  },
  'response_nonce_required',
);

const disabledDecision = evaluateLiveCanonicalChainStateApiResponseReplayNonceBoundaryV1(
  {
    ...policy,
    enabled: false,
  },
  state,
  {
    ...validCandidate,
    signatureAccepted: false,
    freshnessAccepted: false,
    observedAtMs: 1,
    responseNonce: 'short',
  },
);

if (!disabledDecision.accepted || !disabledDecision.reasons.includes('replay_nonce_policy_disabled')) {
  throw new Error('disabled replay nonce policy must remain explicitly bypassed');
}

console.log('VOID_LIVE_CANONICAL_CHAIN_STATE_API_RESPONSE_REPLAY_NONCE_BOUNDARY_AUDIT_V1_GREEN');
