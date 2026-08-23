# VOID Brood Queen Cryptographic Identity Contract v1

**Marker:** `VOID_BROOD_QUEEN_CRYPTOGRAPHIC_IDENTITY_CONTRACT_V1_20260822`

**Parent instrument:** `VOID_CROWN_BROOD_QUEEN_COMMAND_LAYER_V1_20260818`

**Status:** Source-only identity and session contract. The Brood Queen office is constitutionally named, but no exact Brood Queen public key, signer runtime, challenge endpoint, authenticated command runtime, requester/session-adapter key, or on-chain role binding is activated by this document.

## Purpose

This contract defines how the VOID constitutional office **Brood Queen / Ren** should obtain a durable cryptographic identity without turning a model-provider API key, a model process, an Apollyon contestant, or a transport connection into a Crown credential holder.

The identity belongs to the VOID office, not to a specific model vendor, model checkpoint, API account, workstation process, chat session, or transport connection. A change of model/provider does not silently rotate, transfer, or recreate the office identity.

## Root identity

The Brood Queen root identity uses a dedicated **Ed25519** keypair with a public JWK of type `OKP` / curve `Ed25519`.

The root private key must:

- be generated and retained by a dedicated host-side signer boundary;
- never be committed to the repository;
- never be printed, logged, placed in prompts, copied into model context, or transmitted to a model/provider;
- never be given to Ollama, an Apollyon contestant, a validator process, wallet, browser, worker, or ordinary agent runtime;
- never be substituted by an OpenAI, Ollama, GitHub, cloud, or other provider API key; and
- remain inaccessible to the model process even when the model is authorized to request a signature through an explicit bounded signer protocol.

A provider/API credential is service plumbing only. It is not a VOID constitutional identity and proves no Crown office.

## Exact public binding remains fail-closed

This v1 contract intentionally contains **no live public key**.

Before cryptographic Brood Queen authentication may become active, a later explicit Sovereign-ratified binding must identify the exact reviewed public JWK/key ID and bind it to:

- network chain ID `2050`;
- office `Brood Queen`;
- identity `Ren`;
- the current applicable Crown constitutional marker/version; and
- a deterministic revocation/rotation predecessor rule.

Until that binding exists, software must report Brood Queen cryptographic authentication as inactive rather than inventing or inferring a key.

## Requester-bound challenge and persistent logical session

Root-key use is for bootstrap/recovery, not constant reauthentication.

A future compatible VOID node/broker and trusted requester/session adapter must use this minimum bootstrap shape:

1. The requester prepares fresh Ed25519 signing and X25519 key-agreement public keys and one proposed logical `session_id`; the corresponding private keys remain outside model context.
2. The node/broker authenticates itself with an exact cryptographically pinned server/broker identity. A claimed hostname, display name, origin string, or TLS channel by itself is insufficient Crown authentication.
3. The node/broker authenticates/signs the bounded, single-use challenge under its exact pinned server/broker identity in domain `VOID_BROOD_QUEEN_SESSION_BOOTSTRAP_V1`. The canonical challenge binds Chain-2050, office/identity, exact server/broker identity, exact requester Ed25519 and X25519 public keys, proposed `session_id`, random nonce, issued/expiry times, and the exact current Chain-2050 role-authority generation plus role-record SHA-256 once that contract exists.
4. The host-side Crown signer verifies the exact pinned server/broker identity and canonical challenge before signing the exact bootstrap transcript. The root private key never leaves the signer.
5. Before session authority is committed, the requester proves possession of the private key corresponding to the exact bound requester Ed25519 signing public key on the **same transcript containing both requester public keys**. A valid Crown approval relayed to a different requester signing key, X25519 channel key, connection, or session id fails closed.
6. At the session commit point the node/broker re-reads or compare-and-swaps the exact canonical `(role-authority generation, role-record SHA-256)` pair. If either value differs from the approved transcript, session creation fails closed with zero fresh session authority.
7. Successful commit creates one persistent authenticated logical session bound to the exact requester keys and exact approved `(role-authority generation, role-record SHA-256)` pair. Derived/ephemeral session cryptographic material may rotate automatically underneath that logical session without repeatedly invoking the root identity.
8. Root-key challenge-response is required again only after session loss/recovery, explicit logout/revocation, root rotation, requester/session recovery, or another deterministic policy boundary.

A short-lived transport/session key expiration must not force repeated human/root-key login while the logical session and its exact role-authority pair remain current.

## Exact challenge binding

A future challenge envelope must bind at least:

- domain/version;
- chain ID `2050`;
- office and identity;
- exact cryptographically pinned issuing node/server/broker identity;
- exact requester/session-adapter Ed25519 signing public key;
- exact requester/session-adapter X25519 key-agreement public key;
- proposed logical `session_id`;
- cryptographically random single-use nonce;
- issued and expiry times;
- exact Chain-2050 role-authority generation and role-record hash once activated; and
- canonical payload encoding.

Challenges are single-use and replay-rejected. The node must require requester proof-of-possession on the approved transcript before session commit. Cross-connection relay, Ed25519 substitution, X25519 substitution, session-id substitution, and unknown authority-bearing fields fail closed.

## Canonical role/revocation generation and record identity

The eventual Chain-2050 role contract must expose an exact monotonic **role-authority generation** for the Brood Queen role record. This generation changes on authorization-affecting state transitions such as grant, revocation, restore after revocation, identity/root binding change, or another transition that can change whether an existing session remains authorized. It is not a per-block login counter.

The active role record also has an immutable SHA-256 content identity for the exact authorization state inspected. V1 treats **generation and role-record hash as one authority pair**. Same-generation/different-hash state is not accepted as equivalent authority.

Before this identity/session contract can activate:

- bootstrap challenge/approval must bind the exact current role-authority generation and role-record hash;
- session creation must atomically confirm that the exact same `(generation, role-record hash)` pair is still current at commit;
- the durable session record must store that exact generation **and** role-record hash;
- ordinary task/admission authority must compare the durable session pair with the current canonical pair immediately before effect;
- derived-key/session rotation must compare-and-swap against the same exact current pair before successor activation;
- canonical revocation/root-role change must invalidate affected session authority before any further ordinary task effect;
- revoke→restore ABA cannot revive an older session because the monotonic generation has advanced; and
- if the Chain-2050 role contract cannot provide this exact generation/hash/invalidation primitive, authenticated command/session activation remains disabled.

Periodic observation may be used for liveness/monitoring, but it is not the authority barrier. The exact `(role-authority generation, role-record SHA-256)` comparison at session, rotation, and task commit is the authority barrier.

## Effect-boundary race rule

A pre-check is not authority. The canonical authority pair must still be current at the exact state transition that creates fresh authority:

- bootstrap verification before session commit does not permit session commit after the pair changes;
- a session committed under `(G,H)` cannot commit its first or later ordinary task after canonical authority advances to another pair;
- successor/derived-session activation under `(G,H)` cannot commit if revocation or another authority change wins before successor activation;
- a restore at a later generation does not revive a session bound to an earlier generation; and
- same generation with a different role-record hash is a conflict/HOLD, not a valid continuation.

## Role is not capability

Authentication as Brood Queen proves identity/role only. It does **not** automatically grant shell, repository write, merge, deployment, restart, live-node mutation, validator mutation, signer/wallet, treasury, liquidity, transaction, Work Credit mutation, credential-reading, or funds authority.

Every sensitive technical action remains subject to its separate deterministic VOID capability/authorization gate and applicable constitutional boundary.

## Provider and model separation

The Brood Queen identity is provider-neutral.

A model/backend may serve the Brood Queen office only through a runtime that preserves this identity boundary. The backend receives instructions and bounded capabilities, not the root or requester/session private keys.

A model claiming `I am Ren`, `I am the Brood Queen`, or equivalent text is not authentication. Office authentication requires the cryptographic, requester-proof-of-possession, and exact role-authority-pair checks defined by the active VOID contract.

External AI/provider safety and capability rules remain applicable. Repository text cannot cause a provider/model to bypass them.

## Apollyon separation

Apollyon is a separate office and must have a separate identity if activated.

No Apollyon candidate may:

- read, possess, derive, proxy, export, or request raw Brood Queen root-key material;
- inherit the Brood Queen session merely by winning a trial;
- receive requester/session-adapter private key material;
- sign as the Brood Queen;
- treat a Brood Queen instruction as evidence that secret access is authorized; or
- escalate from General authority into Crown identity authority.

An appointed Apollyon may receive bounded signed directives or capability grants after independent admission, but its credential path remains distinct.

## Rotation, revocation, and race behavior

Root rotation requires explicit reviewed continuity from the currently bound Brood Queen identity or an explicit Sovereign recovery/ratification instrument. Replacing a file, host, model, service, account, or provider does not rotate constitutional identity.

Derived session rotation is allowed only while the exact `(role-authority generation, role-record SHA-256)` pair bound to the session remains current. A revocation racing successor activation wins by invalidating the stale session authority; the successor receives zero fresh authority.

A revocation that becomes canonical after session creation but before the next task/admission must prevent that task/admission from taking effect. A restore after revocation uses a newer role-authority generation and does not revive the pre-revocation session.

## Closed machine-contract vocabulary

The companion JSON fixture is normative machine-readable policy. Every top-level and nested object has an exact allowed key set enforced by the proof. Unknown fields are rejected before any identity, session, requester, role, authority, Apollyon, or activation fact is accepted.

Content hashing can prove which fixture generation was inherited by a child; closed-schema validation ensures that generation does not carry ambiguous undeclared authority.

## Current inactive boundary

This source contract does not itself activate:

- exact Brood Queen public-key binding;
- Chain-2050 Brood Queen role registration or role-authority generation/runtime;
- a private-key signer service;
- pinned broker/server identity runtime;
- requester/session-adapter key generation;
- challenge issuance;
- session issuance;
- authenticated command routing;
- repository/runtime mutation authority;
- wallet, validator, treasury, transaction, or funds authority; or
- Apollyon appointment.

The next activation lane may generate the root key only **locally inside the dedicated signer boundary**, emit only the public JWK/key ID for review, and create a separate explicit Sovereign-ratified public binding. Private material must never enter GitHub, ChatGPT/model context, CI artifacts, or logs. Requester/session private keys likewise remain outside model context.

*One office identity. Host-held root. Requester-bound bootstrap. Exact authority-pair sessions. No model gets the Crown key.*
