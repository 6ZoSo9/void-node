import assert from 'node:assert/strict';

import {
  VOID_LIVE_CANONICAL_CHAIN_STATE_API_RESPONSE_SIGNER_AUTHORITY_BOUNDARY_AUDIT_V1_GREEN,
  VOID_LIVE_CANONICAL_CHAIN_STATE_API_RESPONSE_SIGNER_AUTHORITY_BOUNDARY_V1,
  evaluateLiveCanonicalChainStateApiResponseSignerAuthorityBoundaryV1,
  type VoidLiveCanonicalChainStateApiResponseSignerAuthorityEnvelopeV1,
  type VoidLiveCanonicalChainStateApiResponseSignerAuthorityPolicyV1,
} from '../src/chain/block';

const policy: VoidLiveCanonicalChainStateApiResponseSignerAuthorityPolicyV1 = {
  boundary: VOID_LIVE_CANONICAL_CHAIN_STATE_API_RESPONSE_SIGNER_AUTHORITY_BOUNDARY_V1,
  enabled: true,
  requiredDomain: 'void-mainnet-0/live-canonical-chain-state/finality-api/v1',
  allowedSignerKeyIds: ['void-mainnet-0-api-finality-signer-a'],
  revokedSignerKeyIds: ['void-mainnet-0-api-finality-signer-revoked'],
  requireSignatureBoundaryGreen: true,
  requireDomainSeparationBoundaryGreen: true,
};

const acceptedEnvelope: VoidLiveCanonicalChainStateApiResponseSignerAuthorityEnvelopeV1 = {
  boundary: VOID_LIVE_CANONICAL_CHAIN_STATE_API_RESPONSE_SIGNER_AUTHORITY_BOUNDARY_V1,
  domain: 'void-mainnet-0/live-canonical-chain-state/finality-api/v1',
  signerKeyId: 'void-mainnet-0-api-finality-signer-a',
  signerPublicKey: 'ed25519:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  signatureBoundaryGreen: true,
  domainSeparationBoundaryGreen: true,
};

const accepted = evaluateLiveCanonicalChainStateApiResponseSignerAuthorityBoundaryV1(policy, acceptedEnvelope);
assert.equal(accepted.accepted, true);
assert.equal(accepted.reason, 'signer_authority_accepted');
assert.equal(accepted.signerKeyId, 'void-mainnet-0-api-finality-signer-a');
assert.equal(accepted.marker, VOID_LIVE_CANONICAL_CHAIN_STATE_API_RESPONSE_SIGNER_AUTHORITY_BOUNDARY_AUDIT_V1_GREEN);

const unsignedPrereq = evaluateLiveCanonicalChainStateApiResponseSignerAuthorityBoundaryV1(policy, {
  ...acceptedEnvelope,
  signatureBoundaryGreen: false,
});
assert.equal(unsignedPrereq.accepted, false);
assert.equal(unsignedPrereq.reason, 'signature_boundary_not_green');

const domainPrereq = evaluateLiveCanonicalChainStateApiResponseSignerAuthorityBoundaryV1(policy, {
  ...acceptedEnvelope,
  domainSeparationBoundaryGreen: false,
});
assert.equal(domainPrereq.accepted, false);
assert.equal(domainPrereq.reason, 'domain_separation_boundary_not_green');

const wrongDomain = evaluateLiveCanonicalChainStateApiResponseSignerAuthorityBoundaryV1(policy, {
  ...acceptedEnvelope,
  domain: 'void-mainnet-0/other-route/v1',
});
assert.equal(wrongDomain.accepted, false);
assert.equal(wrongDomain.reason, 'domain_mismatch');

const untrustedSigner = evaluateLiveCanonicalChainStateApiResponseSignerAuthorityBoundaryV1(policy, {
  ...acceptedEnvelope,
  signerKeyId: 'unknown-signer',
});
assert.equal(untrustedSigner.accepted, false);
assert.equal(untrustedSigner.reason, 'signer_key_not_allowlisted');

const revokedSigner = evaluateLiveCanonicalChainStateApiResponseSignerAuthorityBoundaryV1(policy, {
  ...acceptedEnvelope,
  signerKeyId: 'void-mainnet-0-api-finality-signer-revoked',
});
assert.equal(revokedSigner.accepted, false);
assert.equal(revokedSigner.reason, 'signer_key_revoked');

const missingPublicKey = evaluateLiveCanonicalChainStateApiResponseSignerAuthorityBoundaryV1(policy, {
  ...acceptedEnvelope,
  signerPublicKey: '',
});
assert.equal(missingPublicKey.accepted, false);
assert.equal(missingPublicKey.reason, 'missing_signer_public_key');

const duplicateAllowedPolicy = evaluateLiveCanonicalChainStateApiResponseSignerAuthorityBoundaryV1({
  ...policy,
  allowedSignerKeyIds: ['void-mainnet-0-api-finality-signer-a', 'void-mainnet-0-api-finality-signer-a'],
}, acceptedEnvelope);
assert.equal(duplicateAllowedPolicy.accepted, false);
assert.equal(duplicateAllowedPolicy.reason, 'allowed_signer_key_ids_must_be_non_empty_and_unique');

console.log(VOID_LIVE_CANONICAL_CHAIN_STATE_API_RESPONSE_SIGNER_AUTHORITY_BOUNDARY_AUDIT_V1_GREEN);

