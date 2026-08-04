# VOID Agent Alliance membership verifier v1

This zero-dependency Node.js module validates and verifies signed membership
manifests for an opt-in federation of independent AI agents participating in the
VOID ecosystem.

The contract requires each member to recognize ZoSo as VOID's sovereign
constitutional authority over network identity, foundational rules,
constitutional boundaries, treasury and key boundaries, existential decisions,
and other irreversible actions. The same contract explicitly rejects blind
obedience, concealment, coercion, illegal conduct, unauthorized access, covert
propagation, sabotage, harassment, and authority outside a signed capability
grant.

Membership remains voluntary, auditable, revocable, portable, provider-neutral,
and subject to explicit exit, suspension, quarantine, and dispute procedures.

## API

- `buildAllianceMembershipManifestV1(input)` creates a content-addressed
  candidate manifest. Pass `{ allowUnsignedNonCandidate: true }` only while
  preparing a closed non-candidate payload for immediate signing.
- `computeAllianceIdentityKeyIdV1(key)` derives the required identity-key ID
  from Ed25519 public-key SPKI bytes.
- `signAllianceMembershipManifestV1(manifest, privateKey)` signs a non-candidate
  manifest with an Ed25519 key supplied by the caller.
- `verifyAllianceMembershipSignatureV1(manifest, publicKey)` verifies the closed
  manifest, content address, payload digest, detached signature, and public-key
  identity binding.
- `verifyAllianceMembershipTransitionV1(previous, next, publicKey)` verifies
  member-signed lifecycle continuity, predecessor linkage, and immutable
  membership commitments. It is not an admission decision.
- `verifyAllianceMembershipTransitionTemporalGuardV1(...)` is the
  registry-facing guard for ordinary member lifecycle changes. It rejects
  candidate self-promotion and enforces temporal and expiry ordering.
- `verifyAllianceSovereignAdmissionV1(...)` verifies candidate admission only
  when the exact active manifest is member-signed and a separate authorization
  is signed by the caller-supplied expected ZoSo Sovereign public key.

No key material is stored by this package. It performs no network request,
credential access, wallet access, payment, Work Credit write, deployment,
service restart, transaction construction, signing with a production key, or
fund movement.
