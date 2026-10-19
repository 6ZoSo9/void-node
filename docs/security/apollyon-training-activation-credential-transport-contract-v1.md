# Apollyon activation credential transport contract v1

Marker: `VOID_APOLLYON_TRAINING_ACTIVATION_CREDENTIAL_TRANSPORT_CONTRACT_V1`

Status: **source/test/CI only**. No protected capability issuance, bearer-secret delivery, installed service alteration, training start, or protected consumption.

## Purpose

Accepted #3480 removes all reviewed Apollyon training-service activation paths. Accepted #3525 defines an *unissued* capability candidate bound to the existing #3333 authorization-wide training-start slot. This child freezes what a **future** protected per-invocation bearer-delivery channel must prove before an activation system may be considered.

This is not a claim that the currently installed Xiphos systemd unit has any credential transport. It is not permission to add `LoadCredential`, `SetCredential`, `ImportCredential`, `systemctl start`, or equivalent commands.

## Exact source parent

- #3525 branch head: `d6670d8dd6185d034c9b07ef3a29390add63ee21`
- #3525 capability source blob: `bcb47a4b105b89a459a4ea876b03f057450371c5`
- parent proof blob: `ff4abd9e709f9b1e9b8df533c619be4724409941`
- parent security document blob: `e061865a9cf4c4f7a0aa3eea424dd7d581844809`
- selected fixed candidate credential name: `apollyon-training-activation-v1`
- bearer secret required length: exactly 32 bytes

Parent #3525 is rebound to repaired #3480 source and keeps issuance, systemd credential runtime, capability possession, training-start consumption, and training false/unproven. Its own active/revoked Proxy preflight normalization is part of the pinned parent bytes. This child cannot promote any of those flags.

## One public transport candidate

The candidate is an exact flat 38-key primitive-only material shape, plus a content-addressed `transport_candidate_id`. It records the #3525 capability ID, SHA-256 of the secret, existing #3333 training-start slot ID, and exact parent source-head/blob pair. All actual secret bytes remain absent.

The additional `qualifyApollyonActivationTransportAgainstCapabilityV1()`
API validates the supplied public #3525 capability candidate with the exact
parent source validator and requires equality of capability ID, secret SHA-256,
#3333 start-slot ID and fixed credential name. Hosted proof constructs a real
#3525 public candidate and then mutates each corresponding transport field,
recomputes the transport's valid content address, and requires cross-record HOLD.
This is **public candidate consistency only**, not a protected-origin or
bearer-possession check: the capability candidate itself is still unissued.

A field identifying a valid-looking capability is not a protected-origin proof. This gate explicitly records `activation_capability_external_validation_performed=false`, `protected_authorization_slot_origin_proven=false`, and `protected_capability_issuance_performed=false`. Even an exactly content-addressed transport candidate is **not** an authorization token.

Expected positive *requirements*:

- root-owned protected credential source must be introduced under separate review;
- a per-invocation, one-use bearer channel must be implemented and bound to the correct service generation;
- exact 32-byte secret, fixed credential name, and future capability ID/hash comparison;
- source/access permissions, path identity, absence of symlink/ACL bypass, and runtime lifetime checked at use;
- future proof that the producer and consumer bind the same kernel-backed private source and exactly one startup generation;
- the #3333 training-start slot remains the **only** consumption namespace.

Mandatory false/non-authority facts:

- `host_credential_runtime_proven=false`
- `credential_possession_proven=false`
- `exact_invocation_generation_bound=false`
- `activation_capability_external_validation_performed=false`
- `protected_authorization_slot_origin_proven=false`
- `protected_capability_issuance_performed=false`
- `raw_secret_in_public_receipt_authorized=false`
- `shared_credential_reuse_authorized=false`
- `capability_replay_authorized=false`
- `direct_systemd_start_authorized=false`
- `training_start_consumption_performed=false`
- `training_execution_authorized=false`
- `service_action=false`
- `funds_movement=false`

The candidate is deliberately **not** an implementation of secret acquisition. It contains no filesystem, network, subprocess, service, or credential API.

## Candidate transport selection

A future **systemd LoadCredential-style** per-service credential is only a transport candidate. Runtime qualification must establish the actual installed systemd version and merged effective unit (`FragmentPath`, drop-ins, daemon-reload state, `ExecStart`, all relevant credential directives, and reverse lifecycle dependencies), as well as credential ownership, source path, propagation, lifetime, and clean restart/timeout behavior.

No secret should travel through environment variables, command-line arguments, public JSON/receipt fields, Git history, stdout/stderr, world-readable files, or machine-global reusable credentials. A future design must treat credential paths, ownership, and unprivileged service visibility as adversarial host facts, not as guaranteed by a source string.

Future checks must bind the delivered secret hash and one-time-capability ID to the exact boot-ID, PID/start ticks, systemd InvocationID, source/pre-entry generation, protected claim/store/authorization lineage, and the same #3333 consumption slot. A direct/manual systemd start that creates a PID cannot by itself establish capability ownership, and a restarted generation may not reuse the credential to bypass #3333 consumption.

The external #3526 protected authorization-slot origin contract and its protected reader/reread implementation remain separate prerequisites. Their read-only candidate is **not** a credential issuer.

## Untrusted input protections

Both builder and qualifier reject unknown keys (including non-enumerable and symbol keys), accessor descriptors, nested/boxed values, and non-primitive fields **before** cloning/canonicalization. Proxy inputs are rejected using Node `util.types.isProxy` before any reflectable traps run. The own-key count is checked before key sorting, and only a new validated primitive snapshot is hashed.

The qualified candidate is frozen. Its content address is SHA-256 of canonical sorted-key JSON of **candidate material** (excluding `transport_candidate_id`). The ID does not attest protected origin or cryptographic possession.

## Hosted proof

The focused proof must pin and revalidate the exact current #3525 contract/proof/document blobs and exercise:

- deterministic content address;
- tampered ID and foreign parent head/blob rejection;
- exact #3525 public-candidate validation and four-field cross-binding;
- rejection of re-addressed secret digest, capability ID, and #3333 slot drift;
- fixed credential name and exact bearer length;
- no raw secret key or public secret bytes;
- hidden/symbol/unknown key rejection;
- getter trap not invoked;
- Proxy traps not invoked;
- nested/boxed input rejection;
- oversized own-key set rejection before `sort`;
- direct/manual start, replay, issuance, possession, consumption, training and funds remain false.

The resulting artifact is a **candidate policy only**. It does not establish Xiphos transport readiness.

## Next gate and authority

Next gate: `apollyon_training_activation_credential_transport_host_qualification_v1`, but only after accepted #3526 protected-origin implementation and a separately reviewed protected issuer exist. That future gate must still fail closed before service activation if any producer/consumer runtime fact is unproven.

No host install/read/write, protected-store mutation, capability issuance, systemd/service action, trainer release/training, credential/private-key/wallet access, signing, transaction or funds movement is authorized by this PR.

PROTECT THE CORE.
