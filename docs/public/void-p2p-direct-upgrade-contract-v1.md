# VOID P2P direct connection upgrade contract v1

Status: source-contract / proof lane only. Runtime integration is intentionally deferred until the relay reservation lane is merged and independently reviewed.

## Purpose

This contract defines the next bounded step after relay reservations: attempt to upgrade an already authenticated relayed peer relationship to a direct TCP peer relationship without allowing a relay, observed endpoint, NAT guess, or failed punch to redefine peer identity or network truth.

The v1 contract is intentionally narrower than a claim of universal TCP NAT traversal.

## Precision feasibility observation

An operator-only loopback probe on Precision (`Node v22.22.2`, Linux x64) established:

- an active outbound TCP connection's explicit local source port could be reused for a second outbound connection to a different destination;
- the active P2P listening port could not simultaneously be used as the outbound source port (`EADDRINUSE`);
- the explicit outbound source port could be reused immediately after the first connection closed; and
- a bare loopback active/active simultaneous-open attempt without a listener did not establish.

Those observations are feasibility evidence, not a claim that public NAT traversal is already proven. Public-NAT success still requires external failure-domain testing.

## Candidate model

A direct-upgrade candidate is an ephemeral transport hint observed through an already authenticated relay connection.

Each candidate binds:

- subject VOID node ID;
- authenticated observer relay node ID;
- exact active relay connection ID;
- exact local TCP source port of that active relay connection;
- relay-observed canonical public IP:port;
- short observation/expiry window; and
- zero application/economic authority.

The candidate is not node identity, reachability authority, NAT classification, a durable verified-peer-cache record, or permission to replace the relayed path.

A malicious or mistaken relay may provide an unusable endpoint. That can cause a bounded direct-upgrade failure/DoS, but the normal end-to-end VOID peer authentication gate prevents the relay from substituting another node identity.

## Same-relay v1 scope

v1 pairs candidate observations from the same authenticated relay.

That relay already has direct outer TCP connections to both endpoints of the relayed stream and can observe both transport endpoints. Multiple relays remain independent: failure or disappearance of one relay invalidates only candidates bound to that relay connection.

Cross-relay candidate mixing is rejected in v1. It can be reconsidered only with a separately specified coordination protocol.

## Attempt plan

For each endpoint:

1. keep the healthy relay connection and relayed peer stream alive;
2. bind the direct-upgrade outbound socket to the exact local source port of the active relay connection that produced the candidate;
3. target the other endpoint's fresh relay-observed public IP:port;
4. coordinate a bounded start delay through the relay;
5. attempt the direct TCP connection for a bounded window;
6. run the normal VOID HELLO/AUTH protocol on the resulting socket with the expected remote node ID pinned; and
7. promote only if the direct socket completes that expected-node authentication within the attempt deadline.

The P2P listening port is not required as an outbound source port.

The contract does not assume that a bare Node/Linux simultaneous-open test succeeds. Public NAT traversal remains an empirical capability to prove across real external networks.

## Promotion and fallback truth

A direct connection is promotable only when the normal VOID authenticated peer identity matches the expected remote node ID.

On direct success:

- direct transport may supersede the relayed peer stream;
- the relayed peer stream may close;
- the relay reservation may remain as fallback;
- the ephemeral observed punch endpoint is not promoted into durable verified-direct cache evidence.

On direct failure, timeout, wrong identity, stale candidate, relay disappearance, or unusable NAT behavior:

- a healthy relayed path remains usable;
- no NAT type is inferred;
- no "relay required" state is inferred;
- no "unreachable" state is inferred;
- no public bootstrap or network-authority claim changes.

## Retry bounds

Retries are candidate-scoped, cooldown-bounded, attempt-count-bounded, and must finish before candidate expiry. A fresh relay observation is required after candidate expiry or relay-connection replacement.

## Non-claims

v1 does not claim:

- universal TCP hole punching;
- endpoint-independent NAT mapping;
- successful TCP simultaneous open on every supported OS/runtime;
- public-NAT traversal proof;
- STUN/TURN compatibility;
- router configuration changes;
- relay confidentiality or malicious-relay transport integrity;
- runtime activation.

## Authority boundary

This contract/proof lane performs no live network probing, deployment, service restart, firewall/router/interface mutation, credential access, wallet/signer/validator/treasury/Work Credit action, transaction broadcast, or fund movement.

Refs #1005 and the relay reservation v1 lane.
