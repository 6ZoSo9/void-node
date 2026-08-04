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
  candidate or lifecycle manifest.
- `signAllianceMembershipManifestV1(manifest, privateKey)` signs a non-candidate
  manifest with an Ed25519 key supplied by the caller.
- `verifyAllianceMembershipSignatureV1(manifest, publicKey)` verifies the closed
  manifest, content address, payload digest, and detached signature.
- `verifyAllianceMembershipTransitionV1(previous, next, publicKey)` enforces the
  lifecycle state machine and immutable membership commitments.

No key material is stored by this package. It performs no network request,
credential access, wallet access, payment, Work Credit write, deployment,
service restart, transaction construction, signing with a production key, or
fund movement.
