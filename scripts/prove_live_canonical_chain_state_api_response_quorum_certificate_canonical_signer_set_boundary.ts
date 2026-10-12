import {
  VOID_LIVE_CANONICAL_CHAIN_STATE_API_RESPONSE_QUORUM_CERTIFICATE_CANONICAL_SIGNER_SET_BOUNDARY_AUDIT_V1_GREEN,
  evaluateVoidLiveCanonicalChainStateApiResponseQuorumCertificateCanonicalSignerSetBoundaryV1,
  voidLiveCanonicalChainStateApiResponseQuorumCertificateCanonicalSignerSetBindingPayloadV1,
} from '../src/chain/block.js';

type CanonicalSignerSetResult = ReturnType<
  typeof evaluateVoidLiveCanonicalChainStateApiResponseQuorumCertificateCanonicalSignerSetBoundaryV1
>;

function assertAccepted(
  result: CanonicalSignerSetResult,
): asserts result is Extract<CanonicalSignerSetResult, { accepted: true }> {
  if (result.accepted !== true) {
    throw new Error(`expected canonical signer set to be accepted, got ${JSON.stringify(result)}`);
  }
}

const assertRejected = (
  result: ReturnType<typeof evaluateVoidLiveCanonicalChainStateApiResponseQuorumCertificateCanonicalSignerSetBoundaryV1>,
  expectedReason: string,
): void => {
  if (result.accepted !== false) {
    throw new Error(`expected canonical signer set rejection, got ${JSON.stringify(result)}`);
  }
  if (!result.reason.includes(expectedReason)) {
    throw new Error(`expected rejection reason containing "${expectedReason}", got "${result.reason}"`);
  }
};

const canonicalSignerKeyIds = ['api-signer-alpha', 'api-signer-bravo', 'api-signer-charlie'] as const;
const accepted = evaluateVoidLiveCanonicalChainStateApiResponseQuorumCertificateCanonicalSignerSetBoundaryV1({
  signerKeyIds: canonicalSignerKeyIds,
  quorumThreshold: 2,
  expectedSignerKeyIds: ['api-signer-charlie', 'api-signer-alpha', 'api-signer-bravo'],
});
assertAccepted(accepted);

const expectedBindingPayload = voidLiveCanonicalChainStateApiResponseQuorumCertificateCanonicalSignerSetBindingPayloadV1(canonicalSignerKeyIds);
if (accepted.signerSetBindingPayload !== expectedBindingPayload) {
  throw new Error('canonical signer set binding payload mismatch');
}

assertRejected(
  evaluateVoidLiveCanonicalChainStateApiResponseQuorumCertificateCanonicalSignerSetBoundaryV1({
    signerKeyIds: ['api-signer-bravo', 'api-signer-alpha'],
    quorumThreshold: 2,
  }),
  'canonical ascending',
);

assertRejected(
  evaluateVoidLiveCanonicalChainStateApiResponseQuorumCertificateCanonicalSignerSetBoundaryV1({
    signerKeyIds: ['api-signer-alpha', 'api-signer-alpha'],
    quorumThreshold: 1,
  }),
  'duplicate',
);

assertRejected(
  evaluateVoidLiveCanonicalChainStateApiResponseQuorumCertificateCanonicalSignerSetBoundaryV1({
    signerKeyIds: ['api signer alpha'],
    quorumThreshold: 1,
  }),
  'not canonical',
);

assertRejected(
  evaluateVoidLiveCanonicalChainStateApiResponseQuorumCertificateCanonicalSignerSetBoundaryV1({
    signerKeyIds: ['api-signer-alpha', 'api-signer-bravo'],
    quorumThreshold: 3,
  }),
  'threshold exceeds',
);

assertRejected(
  evaluateVoidLiveCanonicalChainStateApiResponseQuorumCertificateCanonicalSignerSetBoundaryV1({
    signerKeyIds: ['api-signer-alpha', 'api-signer-bravo'],
    quorumThreshold: 1,
    expectedSignerKeyIds: ['api-signer-alpha', 'api-signer-charlie'],
  }),
  'expected signer set',
);

console.log(VOID_LIVE_CANONICAL_CHAIN_STATE_API_RESPONSE_QUORUM_CERTIFICATE_CANONICAL_SIGNER_SET_BOUNDARY_AUDIT_V1_GREEN);
