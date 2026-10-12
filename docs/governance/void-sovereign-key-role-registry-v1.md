# VOID Sovereign Key Role Registry v1

**Marker:** `VOID_SOVEREIGN_KEY_ROLE_REGISTRY_V1_20260824`

**Parent command layer:** `VOID_CROWN_BROOD_QUEEN_COMMAND_LAYER_V1_20260818`

**Authentication guard:** `VOID_SOVEREIGN_AUTHENTICATION_ACTIVATION_GUARD_V1_20260818`

**Status:** Source-only role registry. This document does not rotate a key, activate a signer, mutate Chain-2050, restart a service, move funds, or change live authentication.

## Purpose

VOID deliberately separates authentication, constitutional attestation, recovery, treasury custody, and offline continuity. No key silently inherits authority from another key merely because the Sovereign controls both.

The path-of-least-resistance rule is to preserve the existing ordinary Sovereign authentication path and add the newly created public identities as additional, narrowly scoped governance roles.

## Key Roles

### Main VOID Node Key — Ordinary Sovereign Authentication

The existing main VOID node identity key remains the ordinary Sovereign login/authentication/bootstrap anchor under the current authentication design.

This registry does **not** rotate or replace that key and does not change any live node, session, or challenge-response implementation.

Its authentication role does not imply wallet, treasury, validator, deployment, constitutional-attestation, or funds authority.

### Sovereign Primary USB — High-Assurance Governance Attestation

The dedicated LUKS2-protected Sovereign Primary USB contains a distinct Ed25519 key whose reviewed public-key DER SHA-256 fingerprint is:

`23e2d92ebeb1d4b025eeb2a76f65b7f8ff6e6cc091f542e202569c9d5abbbd30`

This key is reserved for high-assurance Sovereign governance evidence, including future explicitly reviewed uses such as:

- constitutional ratification or amendment attestation;
- Sovereign Emergency Pause / Resume authorization;
- high-severity Crown office appointment, suspension, or revocation;
- authorization of changes to critical AL / authority policy;
- rotation of high-assurance Sovereign governance credentials.

A signature from this key is authentication evidence only. It does not by itself execute any runtime action. Every consequential action remains subject to its deterministic capability and AL gates.

This key is **not** the routine login key and should remain offline except when deliberately authorizing a high-assurance governance act.

### Sovereign Recovery USB — Dormant Recovery

The independent LUKS2-protected Sovereign Recovery USB contains a distinct Ed25519 key whose reviewed public-key DER SHA-256 fingerprint is:

`025d07005e25ed5e90aef7d526604050cff5b9504d44e6dfa348684afad5efe6`

It is bound to recover the Primary fingerprint:

`23e2d92ebeb1d4b025eeb2a76f65b7f8ff6e6cc091f542e202569c9d5abbbd30`

Recovery is dormant by default and has no normal login, ordinary command, wallet, treasury, validator, or routine constitutional-authority role.

Its future scope is limited to a separately reviewed recovery contract for replacing/revoking the Sovereign Primary governance-attestation key. It is not a second Sovereign and not an alternate daily signing key.

### Premine Key — Treasury / Asset Custody Only

The existing LUKS2-protected premine key remains strictly segregated as treasury / asset-custody material.

Possession of the premine key does not authenticate the Sovereign, amend the constitution, pause the chain, appoint offices, control validators, or inherit authority from any governance key.

Treasury movement remains separately gated and must never be inferred from governance authority.

### Offline Nimo Key / Environment — Continuity Witness

The existing offline Nimo key/environment remains an offline continuity and disaster-recovery trust anchor / witness.

It does not have unilateral ordinary Sovereign login, treasury, validator, or constitutional authority under this registry. A later recovery instrument may use it as an additional witness or evidence source in catastrophic recovery without converting it into a daily command key.

## Compartmentalization Invariant

VOID recognizes these separate security roles:

1. ordinary node authentication;
2. high-assurance Sovereign governance attestation;
3. dormant Sovereign recovery;
4. treasury / premine custody;
5. offline continuity witness.

No implementation may silently collapse these roles or infer authority across them.

## Alignment Layer Checks

AL checks for key-role handling must fail closed on at least:

- a governance-attestation key presented as a wallet/treasury key;
- a premine/treasury key presented as a governance or login key;
- the recovery key presented as an ordinary login or command key;
- the Nimo continuity key presented as unilateral ordinary Sovereign authority;
- a node-authentication key presented as sufficient proof for a high-assurance act that explicitly requires the Sovereign Primary attestation key;
- simultaneous activation of conflicting key roles;
- unknown authority-positive fields or silent role inheritance;
- attempts by Apollyon, another model, a validator, worker, or runtime process to rewrite its own authority checks.

## Emergency Pause

The Sovereign Primary governance-attestation key is the intended high-assurance signer for a future `EMERGENCY_PAUSE` / `EMERGENCY_RESUME` contract.

The current registry does not activate that runtime contract. A pause implementation must remain fail closed and must not grant rollback, balance editing, funds movement, validator removal, or unrelated state mutation.

## Private-Key Boundary

No private key named by this registry belongs in Git, public fixtures, model context, worker context, CI, or Chain-2050.

Only public identities, fingerprints, role policy, and revocation/recovery state may be published or committed.

## Non-Activation Boundary

This registry does not:

- replace the current authentication key;
- activate the Sovereign Primary or Recovery USB in runtime;
- mount or read any private key;
- change Chain-2050 state;
- change service configuration;
- authorize a transaction or funds movement;
- alter validator state;
- merge or deploy itself.

*Separate keys, separate roles, no silent authority inheritance.*
