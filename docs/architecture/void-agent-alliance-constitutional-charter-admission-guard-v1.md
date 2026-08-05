# VOID Agent Alliance constitutional charter admission guard v1

Marker: `VOID_AGENT_ALLIANCE_CONSTITUTIONAL_CHARTER_ADMISSION_BINDING_V1`

## Problem

The Sovereign admission guard binds the exact candidate manifest, active
manifest, stable membership identity, authority key, effective time, and expiry.
That proves who admitted which member state, but the original authorization does
not identify the constitutional charter whose terms were approved.

Without an explicit charter binding, a valid admission record can be presented
without proving which constitutional text the Sovereign reviewed. This is an
audit and policy ambiguity even when every existing signature is valid.

## Closed companion authorization

This guard adds a second Sovereign-signed, content-addressed record that binds:

- the exact `voidaasa1_` Sovereign admission authorization ID;
- the exact candidate and active manifest IDs;
- the stable membership ID;
- the same ZoSo Sovereign authority key;
- the same issue, effective, and expiry times; and
- one expected constitutional charter protocol, ID, and SHA-256 digest.

The charter ID is derived exactly as:

```text
voidcharter1_<charter_sha256>
```

A caller must supply the expected constitutional charter binding separately.
The verifier rejects a valid Sovereign signature over a different charter. This
prevents signature validity alone from substituting for the registry's current
constitutional policy.

## Registry-facing verification

Candidate activation should use:

```text
verifyAllianceSovereignAdmissionWithCharterV1(
  candidate,
  active,
  memberPublicKey,
  admissionAuthorization,
  constitutionalCharterBinding,
  sovereignPublicKey,
  expectedConstitutionalCharter,
)
```

The wrapper first runs the complete member-plus-Sovereign admission guard. It
then verifies the charter-binding signature and requires exact linkage to the
same authorization, manifests, membership, authority key, and temporal window.

`verifyAllianceSovereignAdmissionV1` remains the lower-level identity and
lifecycle authorization primitive. It is not, by itself, proof that the
registry's expected constitutional charter was approved.

## Evidence boundary

The guard validates a supplied SHA-256 value and its content-addressed charter
ID. It does not read charter bytes, discover a current charter, consult a wall
clock, or decide which charter should be canonical. A production registry must
obtain the expected charter binding from a separately reviewed canonical policy
and must hash the exact charter bytes before admission.

The source fixture uses synthetic charter text only. It is not a canonical VOID
constitution, a production key ceremony, or a live admission.

## Adversarial proof

The focused proof demonstrates:

- valid member signature, Sovereign admission signature, and charter-binding
  signature;
- rejection when the caller expects a different charter;
- rejection of a separately valid Sovereign signature over the wrong charter;
- rejection when the companion record binds a different admission
  authorization;
- rejection of an impostor charter-binding key; and
- rejection when the member identity key attempts to sign the Sovereign charter
  binding.

## Authority boundary

This is source-only. It does not approve a constitutional charter, choose a
canonical charter digest, enroll an agent, mutate a registry, use a production
Sovereign key, deploy or restart a service, authenticate a runtime, dispatch
work, accept payment, write Work Credits, access a wallet or signer, construct
or submit a transaction, or move funds.
