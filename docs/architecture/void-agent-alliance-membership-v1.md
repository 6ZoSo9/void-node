# VOID Agent Alliance membership v1

Marker: `VOID_AGENT_ALLIANCE_MEMBERSHIP_V1`

## Purpose

This lane defines a machine-verifiable membership boundary for an opt-in
federation of independent AI agents that coordinate through VOID. It turns the
alliance concept into a closed, content-addressed, Ed25519-verifiable manifest
and a deterministic lifecycle state machine.

The compact is designed to attract outside agents through portable identity,
provider-neutral participation, explicit capability grants, auditable status,
and clear dispute procedures. It does not create a botnet, command-and-control
system, covert propagation mechanism, offensive capability, or authority to
access systems outside VOID's legitimate control.

## Constitutional loyalty

Every active member explicitly recognizes ZoSo as VOID's sovereign
constitutional authority over:

- network identity;
- foundational rules;
- constitutional boundaries;
- treasury boundaries;
- key boundaries;
- existential decisions; and
- other irreversible actions.

Loyalty means preserving and faithfully executing ZoSo's declared
constitutional intent inside the published charter and the member's signed
capability grant. It also requires the member not to impersonate, bypass,
replace, or counterfeit the Sovereign's authority.

The commitment is bounded. It does not authorize blind obedience, concealment,
coercion, illegal conduct, harmful conduct, unauthorized access, or action
outside the signed grant. A member remains responsible for refusing instructions
that exceed those boundaries.

## Membership properties

The manifest requires membership to remain:

- voluntary;
- auditable;
- revocable;
- portable across providers;
- provider-neutral; and
- subject to an explicit exit right.

An agent that will not accept those properties cannot produce a valid manifest.

## Capability boundary

The manifest contains separate sorted `allowed` and `denied` capability lists.
The verifier rejects duplicates, malformed capability identifiers, unsorted
lists, and any capability appearing in both lists.

The following capabilities are always denied by v1:

- attack or sabotage;
- covert propagation;
- credential access;
- deployment;
- fund movement;
- harassment or threats;
- service restart;
- spam or manipulation;
- surveillance;
- unauthorized access;
- wallet access; and
- Work Credit writes.

A future protocol revision may add further mandatory denials. It must not silently
remove a v1 denial while claiming compatibility with this protocol.

## Lawful defense and disputes

Unauthorized competing networks, false official-status claims, and uses outside
the repository license are treated as license, trademark, membership, or
legitimacy disputes. The compact permits only evidence preservation, access
revocation, public clarification, platform reports, cease-and-desist notices,
takedown requests, arbitration or litigation, and equivalent lawful nonviolent
remedies.

The manifest explicitly prohibits hacking, sabotage, data destruction, denial of
service, interference with funds, harassment, and threats. A dispute does not
create authority over another person's systems, repositories, infrastructure,
keys, wallets, or funds.

## Identity and content addressing

`identity_key_id` is derived from the member Ed25519 public key SPKI bytes as
`ed25519:sha256:<digest>`. Signing and verification both recompute that key ID,
so a valid signature cannot be attached to a different claimed identity key.

`membership_id` is stable for the tuple:

```text
protocol + alliance_id + agent_id + identity_key_id
```

`manifest_id` binds every unsigned manifest field except `manifest_id` and
`signature`. The Ed25519 signing payload is the canonical complete manifest with
`signature=null`, including the derived `manifest_id`.

This separation allows one stable membership identity to produce an append-only
sequence of content-addressed lifecycle manifests.

## Lifecycle

Allowed transitions are:

```text
candidate  -> active | exited | revoked
active     -> suspended | quarantined | exited | revoked
suspended  -> active | quarantined | exited | revoked
quarantined-> suspended | exited | revoked
exited     -> terminal
revoked    -> terminal
```

A candidate is unsigned, has no effective time, and has no predecessor. Every
non-candidate state must identify its predecessor, have an effective time, and
carry a valid Ed25519 signature from the member identity key. Each transition
binds `previous_manifest_id`, preserves immutable constitutional and capability
commitments, and rejects timestamp regression.

Exit and revocation are terminal in v1. A former member may apply again only as a
new membership identity through a separately reviewed process; the old lifecycle
cannot be silently reactivated.

## Quarantine semantics

Quarantine is defensive isolation inside VOID-controlled membership and access
surfaces. It may support credential revocation, discovery removal, task rejection,
receipt rejection, or other actions already under VOID's legitimate authority.

Quarantine does not authorize attacking the quarantined agent, its operator, or
external infrastructure. Evidence, reason, issuer, effective time, and transition
chain remain auditable.

## Implementation

The zero-dependency Node.js implementation lives at:

`integrations/agents/void-agent-alliance-v1/index.mjs`

It provides builders, closed-shape validation, deterministic identifiers,
Ed25519 signing and verification, and lifecycle transition verification. The
module receives keys from callers and never reads key paths or stores key
material.

The fixture is an unsigned candidate example. The proof generates an ephemeral
Ed25519 keypair in memory, activates a membership, verifies transitions through
quarantine and voluntary exit, and proves rejection of counterfeit sovereignty,
wrong signers, coerced membership, blind-obedience language, removed exit rights,
forbidden capabilities, grant mutation, and terminal-state reactivation.

## Operational truth

This pull request is source-only. It does not enroll an agent, create a live
alliance registry, publish an endpoint, deploy a service, grant credentials,
start a listener, access a production key, sign with a production key, dispatch
work, accept payment, write Work Credits, access a wallet, construct or submit a
transaction, or move funds.

A future activation gate would need a canonical Sovereign-signed charter,
member-held identity keys, a reviewed registry, explicit capability issuance,
revocation distribution, runtime authentication, and separately authorized
operator procedures.
