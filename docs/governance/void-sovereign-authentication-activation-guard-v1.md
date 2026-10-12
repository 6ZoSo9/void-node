# VOID Sovereign Authentication Activation Guard v1

**Marker:** `VOID_SOVEREIGN_AUTHENTICATION_ACTIVATION_GUARD_V1_20260818`

**Parent instrument:** `VOID_CROWN_BROOD_QUEEN_COMMAND_LAYER_V1_20260818`

**Parent constitution:** `VOID_CONSTITUTIONAL_AUTHORITY_BOUNDARY_V1_PHASE0_DRAFT`

**Status:** Phase 0 fail-closed authentication doctrine — the intended Sovereign authentication role is preserved, but no node key or node-identity signature is presently sufficient by itself to establish cryptographically authenticated constitutional authority under this instrument.

## Purpose

This guard resolves ambiguity in the parent Crown instrument's Sovereign-authentication language without reading, exposing, rotating, or otherwise handling live key material.

The parent instrument identifies the **main VOID node identity key** as the intended ordinary cryptographic anchor for Sovereign constitutional acts. In Phase 0, that statement is a role designation and architectural intent. It is **not yet a content-bound cryptographic activation** because the constitutional layer does not yet bind the role to an exact reviewed public identity and does not yet define a complete constitutional signature envelope.

Accordingly, constitutional cryptographic authentication is **fail-closed and inactive** until a later explicit Sovereign activation instrument satisfies every requirement below.

This guard is the later and more specific rule for interpreting whether the parent instrument's authentication clause is presently active.

## Constitutional Validity Versus Cryptographic Proof

This guard distinguishes the Sovereign's constitutional authority from the status of a particular cryptographic proof mechanism.

The absence of an activated constitutional signature contract does not create a second Sovereign, transfer authority, or allow another person, key holder, validator, AI system, repository controller, or institution to act as the Sovereign.

An explicit Sovereign ratification may still be preserved as constitutional evidence under the applicable constitutional process. Until activation, however, no node-identity signature may be represented as satisfying a **cryptographic constitutional authentication** requirement merely because it verifies under an ordinary node-identity scheme.

Any constitutional act whose operative rule specifically requires cryptographic authentication, including a future Sovereign relinquishment if that requirement remains in force, must remain unexecuted until the activation contract is validly established.

## Intended Anchor, Not Active Anchor

The **main VOID node identity key remains the intended ordinary Sovereign authentication anchor**.

The parent fixture's `main_void_node_identity_key_designated=true` records that intended constitutional role. It does not mean that an exact public key, fingerprint, key ID, algorithm version, or immutable designation artifact has already been bound by the constitutional layer.

Therefore:

- possession of any key does not prove sovereignty;
- an ordinary valid node signature is not automatically a constitutional signature;
- no current node key may independently satisfy a cryptographic constitutional-authentication precondition;
- a replacement or newly generated key cannot silently inherit the intended role; and
- key loss, theft, compromise, copying, or infrastructure control does not activate, transfer, or rotate constitutional authority.

## Requirements for Future Activation

A future explicit Sovereign constitutional instrument may activate cryptographic constitutional authentication only if it binds all authority-bearing details necessary for deterministic verification.

The activation instrument must define, at minimum:

1. **Exact public identity binding.** The exact public key identity must be fixed by algorithm and version plus an exact key identifier, fingerprint, public-key digest, or immutable reviewed designation artifact whose content identity is explicit.
2. **Versioned constitutional envelope.** The signed message format must have an explicit envelope version and a constitutional domain separator that cannot be confused with an ordinary node, wallet, transaction, validator, or service signature.
3. **Exact network and constitutional binding.** The envelope must bind the exact intended VOID network/chain identity and the constitutional marker or version to which the act applies.
4. **Action binding.** The envelope must identify the constitutional action type, such as amendment, ratification, relinquishment, rotation, or revocation.
5. **Canonical payload identity.** The exact constitutional payload must be deterministically canonicalized or represented by an exact reviewed content digest whose algorithm is specified.
6. **Replay protection.** The contract must define an exact monotonic sequence, nonce discipline, predecessor reference, or equivalent deterministic rule that rejects stale or replayed constitutional acts.
7. **Rotation continuity.** Rotation or revocation must explicitly identify the predecessor anchor and the successor or revoked identity, and must satisfy an explicit authorization/recovery rule rather than relying on possession of the new key.
8. **Closed authority schema.** Authority-bearing objects must reject unknown fields rather than allowing a future parser to silently interpret an unreviewed field as granting authority.
9. **Adversarial proof.** Focused tests must reject at least a wrong key, wrong signature domain, wrong network/constitution binding, stale or replayed sequence, unauthorized rotation, malformed canonical payload identity, and unknown authority-bearing fields.
10. **Dependency-bound verification.** The focused workflow must rerun when the parent Crown authentication doctrine or the activation contract it depends on changes.

An activation instrument that omits any required element above does not activate cryptographic constitutional authentication.

## Fail-Closed Rule

Until a valid activation instrument exists, a claimed cryptographically authenticated constitutional act must be rejected as **not cryptographically authenticated** if it depends on the parent main-node-key clause.

The following claims are specifically rejected in the inactive state:

- a signature from the wrong key;
- a generic node signature presented in the wrong domain;
- a signature bound to the wrong network or constitutional version;
- a replayed or stale constitutional message;
- a purported key rotation without the required predecessor continuity and authorization;
- a payload whose exact constitutional content identity is not deterministically bound; or
- an authority-bearing object containing unknown fields.

Because activation is presently false, even an otherwise valid ordinary signature from the intended main node cannot by itself satisfy the future constitutional signature contract.

## Rotation and Compromise

A later key rotation changes only the cryptographic authentication anchor, not the human Sovereign identity.

No successor key becomes constitutional merely because it replaces a file, service, node identity, machine, repository secret, or infrastructure credential. Rotation must be an explicit constitutional act under the activated rotation/recovery rule and must preserve predecessor continuity.

A suspected compromise may justify treating a key as unsafe, but compromise does not transfer sovereignty to an attacker and does not authorize an unspecified replacement key.

## Closed-Schema Interpretation

For the authentication authority governed by this guard, unknown authority-positive fields are invalid by default.

A verifier must not infer new constitutional power from an unrecognized field, extension, optional parser feature, implementation convenience, model interpretation, repository convention, or future software behavior. Authority expands only through an explicit reviewed constitutional change.

## Existing Boundaries Preserved

This guard does not itself:

- read, expose, access, copy, rotate, revoke, or generate any key;
- designate an exact live public key or fingerprint;
- activate cryptographic constitutional authentication;
- authenticate or execute a Sovereign relinquishment;
- admit, suspend, remove, slash, or mutate a validator;
- grant signer, wallet, credential, treasury, liquidity, deployment, restart, or live-network authority;
- authorize transactions, asset transfer, or funds movement; or
- override applicable law, non-harm duties, preserved rights, or external AI/provider safety rules.

## Amendment Boundary

While constitutional authority remains Sovereign-held, this guard may be amended, activated, replaced, or repealed only by the Sovereign under the applicable constitutional amendment process.

A later activation must be explicit. No software deployment, node-key replacement, repository edit, repeated practice, validator vote, AI inference, or possession of infrastructure may silently convert the inactive intended anchor into an active cryptographic constitutional credential.

*Intended anchor, explicit activation, fail closed.*
