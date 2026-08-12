# VOID P2P UDP swarm signed observer authorization v1

Status: source-only security gate and deterministic proof. No collector activation,
deployment, service restart, release-root publication, observer-set publication,
wallet action, transaction, or funds movement is included.

## Problem

Normal VOID peer authentication proves possession of the Ed25519 private key for
a node identity. It does not prove that the identity is authorized to contribute
network-topology evidence.

The merged verified-discovery composition correctly verifies signed relay
observations, source identity binding, per-route source quorum, relay failure
domains, N-1 coverage, discovery freshness, and the threshold-signed bootstrap
record/manifest chain. However, its caller supplies the set of normally
authenticated source identities. A public collector must not treat arbitrary
fresh authenticated identities as topology-authorized observers, because a
colluding set of self-generated peers could otherwise satisfy a numeric source
quorum.

## Outcome

This lane adds a mandatory security wrapper for any public relay-introduction
transport:

`composeVoidP2pUdpSwarmRoutesFromAuthorizedDiscoveryV1`

Before the existing verified-discovery composition can run, the wrapper requires
a current `void_p2p_udp_swarm_observer_authorization_v1` envelope. The envelope:

- is content-addressed as `voidpua1_<sha256>`;
- is bound to one exact active bootstrap release-root ID;
- authorizes the exact node ID and exact canonical Ed25519 public key of each
  observer;
- is valid for a bounded time window of 30 seconds through 24 hours;
- is signed to the active release root's existing threshold by distinct release
  keys; and
- carries the same closed zero-authority object used by verified discovery.

The live eligible source set is the intersection of:

1. normally authenticated VOID peers supplied by the caller; and
2. exact identities in the current threshold-signed observer authorization.

At least two live authorized observers are required before the existing
composition is invoked. The existing composition then independently retains its
own two-source-per-route signature quorum, relay/target rules, failure-domain
coverage, bootstrap binding, freshness, and route limits.

The authorization also bounds time-of-authority: discovery `generated_at` and
every relay observation must fall inside the signed observer-authorization
window, and discovery `expires_at` may not exceed authorization `expires_at`.
Therefore the runtime route lease produced by the existing composition cannot
outlive the observer authority that admitted its sources.

Raising the route quorum alone is deliberately not treated as a Sybil defense.
Identity admission and route quorum remain separate controls.

## Compatibility boundary

The already-merged
`composeVoidP2pUdpSwarmRoutesFromVerifiedDiscoveryV1` function remains unchanged
as the lower-level verified-discovery primitive. This avoids silently changing
its contract underneath other branches.

Any public or automatically collected discovery path must use the signed-observer
wrapper instead. Draft #1231 remains held until it is reconciled to this wrapper;
calling the lower-level primitive directly from a public collector does not
satisfy this hardening.

The wrapper returns the existing composition result unchanged so the merged
runtime activation contract does not gain new fields or a second route format.

## Fail-closed rules

Authorization rejects:

- a hold/inactive or mismatched release root;
- malformed or non-content-addressed authorization IDs;
- fewer than two or more than 32 observers;
- duplicate, unsorted, malformed, non-Ed25519, noncanonical, or key-mismatched
  observer identities;
- expired, future, or overlong authorization windows;
- signatures from keys outside the release root;
- duplicate, malformed, incorrectly ordered, invalid, or sub-threshold
  signatures;
- discovery creation or relay observations outside the authorization window;
- a discovery lease that extends beyond observer authorization; and
- any authority object that differs from the compiled zero-authority contract.

Normally authenticated but unauthorized peers are ignored for discovery quorum.
If fewer than two authorized observers are currently live, the wrapper holds
before bootstrap-record or manifest fetches occur. Window violations also hold
before downstream bootstrap fetches.

## Proof

Run:

```bash
node scripts/prove_void_p2p_udp_swarm_signed_observer_authorization_v1.mjs
```

The proof creates a two-of-two active release root, three authorized observer
identities, two arbitrary attacker identities, and one local identity. It proves:

- exact threshold-signed observer authorization validates;
- a mixed live peer set yields only the three explicitly authorized identities;
- the two arbitrary authenticated attackers cannot satisfy the authorization
  gate and cause zero downstream bootstrap fetches;
- a discovery lease cannot outlive observer authorization;
- an observation made before observer authorization cannot contribute;
- a sub-threshold authorization fails;
- attacker-generated signatures pretending to be release-root signatures fail;
- node-ID/public-key substitution fails;
- expired authorization fails;
- authority escalation fails; and
- changing the signed observer set without changing its content ID fails.

The workflow also reruns the existing verified-discovery composition proof and
repository type/build checks on Node.js 22, 24, and 26.

Green marker:

```text
VOID_P2P_UDP_SWARM_SIGNED_OBSERVER_AUTHORIZATION_V1_PROOF_GREEN
```

## Remaining gates

This lane does not modify #1231's collector/runtime-mount paths. After this
hardening is exact-green and separately merged, #1231 must be reconciled so the
collector supplies a reviewed signed observer authorization and calls the
hardened wrapper. Ready-for-review, merge, publication of a real observer set,
active release-root publication, deployment, restart, and outside-network N-1
acceptance remain separate ZoSo-authorized gates.
