# VOID Alignment Layer + Sovereign Emergency Control v1

**Marker:** `VOID_ALIGNMENT_LAYER_SOVEREIGN_EMERGENCY_CONTROL_V1_20260824`

**Key-role dependency:** `VOID_SOVEREIGN_KEY_ROLE_REGISTRY_V1_20260824`

**Chain:** `2050` / VOID Mainnet-0

**Status:** Source implementation and deterministic contract only. This instrument does not wire AL into live block/transaction/state mutation, does not activate the Sovereign Primary USB at runtime, does not pause or resume any node, and does not mutate Chain-2050.

## Purpose

VOID should not depend on a human, model, validator, or operator noticing that a mutation is wrong after the fact. The Alignment Layer (AL) is the fail-closed mutation admission and post-application invariant framework that makes required checks explicit, complete, deterministic, and independently auditable.

The intended flow is:

`proposed mutation -> authentication/authorization -> AL pre-accept checks -> mutation -> AL post-apply checks -> durable commit`

A failed pre-accept check rejects, quarantines, or enters safe mode according to fixed policy. A failed critical post-apply check requires safe mode because an impossible or untrusted derived state may already have been observed.

"Attack the mutation" means reject, isolate, quarantine, or freeze invalid state transitions. It does not mean attacking external computers, services, people, or networks.

## Source Modules

- `src/security/void_alignment_layer_v1.ts`
- `src/security/void_sovereign_emergency_control_v1.ts`

Neither source module is imported by the live node in this lane. Runtime integration is a later separately reviewed gate.

## Alignment Layer Evaluation Contract

Every AL evaluation request is a closed object bound to:

- marker and version;
- Chain-2050;
- phase (`pre_accept` or `post_apply`);
- mutation class;
- exact mutation SHA-256;
- exact actor-identity SHA-256; and
- the complete required check-result set for that phase and mutation class.

Check-result objects contain only:

- exact check ID;
- boolean pass/fail; and
- evidence SHA-256.

The caller cannot choose a failure severity. Severity is owned by the reviewed AL profile. Unknown checks, duplicate checks, missing required checks, unknown fields, wrong chain, malformed hashes, or malformed envelopes fail closed.

### Mutation classes

V1 defines six classes:

1. `ordinary_state`
2. `governance`
3. `economic`
4. `validator`
5. `work_credit`
6. `emergency_control`

Every pre-accept class includes policy-integrity, chain-binding, closed-schema, authority, actor-security-boundary, replay, and transition checks. Specialized classes add their own role/conservation/validator/WC/emergency checks.

Every post-apply class includes policy-integrity, state-root, and invariant-recheck checks plus a specialized derived-state check. Post-apply failures require safe mode.

### Dispositions

AL returns exactly one disposition:

- `allow`
- `reject`
- `quarantine`
- `safe_mode`

Severity precedence is fixed:

`safe_mode > quarantine > reject > allow`

The actor-security tripwire can therefore quarantine a mutation/actor without allowing the requester to downgrade that response. AL policy-integrity failure requires safe mode.

The AL decision itself is content-addressed by a deterministic SHA-256 over the exact request identity and canonically ordered required check results.

## Safe Mode Policy

V1 safe mode freezes mutation authority:

- block sealing: disabled
- block import/canonical advancement: disabled
- transaction admission: disabled
- governance mutation: disabled
- validator mutation: disabled
- economic settlement: disabled
- Work Credit mutation: disabled
- treasury mutation: disabled
- runtime activation: disabled

The following remain available where their underlying implementation is safe:

- read-only health
- read-only diagnostics
- evidence export

Automatic resume is forbidden. A safe-mode incident requires explicit Sovereign resume after diagnosis under the emergency-control contract.

## Sovereign Emergency Control

The emergency-control certificate is deliberately independent of ordinary on-chain governance so a canonical-state failure cannot make the circuit breaker unusable.

The intended high-assurance signer is the Sovereign Primary governance-attestation key recorded by the merged key-role registry:

`23e2d92ebeb1d4b025eeb2a76f65b7f8ff6e6cc091f542e202569c9d5abbbd30`

The existing main node key remains the ordinary Sovereign login/authentication key. It does not satisfy this high-assurance emergency signature requirement.

### Certificate binding

An emergency certificate is a closed object bound to:

- marker/version/domain;
- Chain-2050;
- action: `PAUSE` or `RESUME`;
- canonical uint64 sequence;
- canonical issue and expiry timestamps;
- observed head number and observed head hash;
- bounded reason code;
- evidence SHA-256;
- predecessor certificate SHA-256;
- exact pause certificate being resumed, when applicable;
- signer role;
- signer public-key DER SHA-256; and
- detached canonical Ed25519 signature.

The canonical signing payload uses a fixed ordered JSON vector. The signature field is excluded from the signed payload and included in the final certificate content address.

Certificates expire and may have at most a 15-minute validity interval. V1 intentionally keeps this window short because emergency commands are high-assurance, operator-present actions rather than persistent bearer credentials.

### Sequence and replay

The first accepted emergency certificate uses sequence `0`. Each later certificate must be exactly previous sequence + 1 and must bind the exact predecessor certificate SHA-256.

A replay, skipped sequence, stale predecessor, malformed sequence, wrong domain, wrong chain, wrong key, wrong signature, or unknown field fails closed.

### Pause state machine

Initial state is `running` with no predecessor.

A valid `PAUSE`:

- is accepted only from `running`;
- requires a pause reason (`AL_CRITICAL_FAILURE`, `CANONICAL_SAFETY_INCIDENT`, `AUTHORITY_COMPROMISE`, or `SOVEREIGN_DIRECTIVE`);
- requires the resume-reference field to be zero;
- records the exact pause certificate hash; and
- enters `paused`.

A valid `RESUME`:

- is accepted only from `paused`;
- requires `RECOVERY_COMPLETE` or `SOVEREIGN_DIRECTIVE`;
- must reference the exact active pause certificate hash;
- advances the sequence/predecessor chain; and
- returns to `running`.

A pause cannot itself roll back blocks, edit balances, move treasury assets, remove validators, expose keys, or perform any unrelated mutation. Resume is a separate signed act.

## AL-Triggered Safe Mode

A node does not need a Sovereign signature to fail closed locally when a critical AL invariant fails. The AL decision can require local safe mode immediately.

The Sovereign certificate is the high-assurance network/operator control path for explicit pause/resume. Future network propagation and runtime integration must preserve the distinction:

- AL critical failure may automatically stop local mutation;
- an authenticated Sovereign pause may explicitly stop mutation even when ordinary governance is impaired;
- neither path permits automatic recovery;
- resume requires diagnosis plus a separately authenticated Sovereign act.

## Key Separation

This contract preserves the merged key-role registry:

- main node key: ordinary Sovereign login/authentication
- Sovereign Primary USB: high-assurance governance attestation and intended emergency signer
- Sovereign Recovery USB: dormant Primary recovery/rotation only
- premine key: treasury custody only
- offline Nimo: continuity/disaster-recovery witness

No role silently inherits another role's authority.

## Evidence and Incident Relationship

This contract formalizes the existing Mainnet-0 incident posture rather than replacing it. The existing bad-block policy already distinguishes local rejection, canonical-risk escalation, and emergency response. AL provides deterministic machine admission; the emergency-control state machine provides a cryptographic circuit breaker.

Evidence hashes should point to append-only/content-addressed incident evidence when such a durable evidence layer is available. V1 does not claim to implement that persistence layer.

## Adversarial Proof Requirements

Focused proof must demonstrate at least:

- all-required-check success;
- order-independent deterministic decision hashing;
- missing/duplicate/unknown check rejection;
- actor-security quarantine;
- AL-policy-integrity safe mode;
- post-apply invariant safe mode;
- mutation freeze/read-only safe-mode policy;
- Ed25519 detached-signature verification with an ephemeral test key;
- wrong signature and wrong fingerprint rejection;
- exact production Sovereign Primary fingerprint binding;
- pause -> replay rejection -> resume sequence;
- wrong predecessor/resume reference rejection;
- expired/overlong certificate rejection;
- unknown certificate field rejection; and
- production admission rejection for a non-Sovereign test key.

The focused proof must not mount a USB key, read a private Sovereign key, or produce a real production pause signature.

## Activation Boundary

This lane does **not**:

- import AL into block sealing, block import, transaction admission, validator mutation, WC mutation, economic settlement, or governance runtime;
- create a listener or service;
- mount or read the Sovereign Primary or Recovery USB;
- alter ordinary node-key authentication;
- emit a production emergency certificate;
- pause or resume a live node;
- mutate Chain-2050;
- access a wallet/signer/treasury key;
- construct or broadcast a transaction; or
- move funds.

A later runtime-integration lane must identify the exact mutation chokepoints, make AL mandatory rather than advisory, persist monotonic emergency-control state safely, and prove that no alternate mutation path bypasses the gate.

*Detect automatically. Reject before commit. Freeze on impossible state. Resume only by explicit authority.*
