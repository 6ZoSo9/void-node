# Apollyon training activation capability contract v1

Marker: `VOID_APOLLYON_TRAINING_ACTIVATION_CAPABILITY_CONTRACT_V1`

Status: **source/test/CI contract only; no training-service activation, installation, protected consumption store, release, or training execution**.

## Purpose

Accepted #3480 leaves the supported Apollyon generation with no reviewed
training-service activator. That retirement is intentional: a userspace caller
cannot prove it created a systemd service generation merely because its own
`systemctl start` returned success. A direct or otherwise non-review-aware start
can win the interval between a dormancy observation and the reviewed caller's
start.

This gate defines the authority object a future activation implementation must
consume. It does **not** restore any activation path.

Authority is derived from possession and protected one-time consumption of an
exact activation capability, not from the identity or timing of the caller that
asks PID 1 to start the unit.

## Exact parent and reviewed dependencies

Parent #3480:

`1fd4b17a7c2f9e3811f52ecf01f4087c1182dcae`

The contract pins:

- durable claim-store contract blob:
  `bd5572a99ffe0f2cfa43b7d680bbd5077771c6bc`;
- retired V2 qualifier blob:
  `5f67bb3ddcc7f130db4b90ad73f5450b109dbea4`;
- retired fixed-launcher source blob:
  `352bd36f2b07091140b990de4170f708eb11fee6`;
- training unit blob:
  `62fbabe1cf7ae0d940f5d96e19b06282f841267b`;
- training pre-entry source blob:
  `9503d19c8bc0b4f073ba117f6a547d339b7623d0`;
- installed pre-entry SHA-256:
  `6e2885ceddf83bc9bf4636768ce6f046ab357268b0959cfa71bcbb766909cb47`;
- installed entrypoint bytes: `17384`;
- installed entrypoint SHA-256:
  `7a1ec91b612998824e37aa0f8522a94d7ceffe9f4f21e0702fe0a0d5ca5bdd9a`.

## Capability

The future issuer generates a fresh 32-byte random secret. The raw secret is
**not** part of the content-addressed receipt. The receipt contains only
`activation_secret_sha256`.

The capability binds:

- exact authorization ID;
- exact custody generation ID;
- exact durable claim-record ID and SHA-256;
- exact store contract, policy, and generation;
- exact terminal receipt ID;
- exact reviewed unit/pre-entry/entrypoint identities;
- one fixed credential name:
  `apollyon-training-activation-v1`;
- `direct_systemd_start_without_capability_authorized=false`;
- `systemd_caller_identity_authoritative=false`;
- `capability_replay_authorized=false`;
- `raw_capability_export_authorized=false`;
- `training_start_consumption_required=true`;
- `training_execution_authorized=false`.

The capability ID is the SHA-256 content address of the canonical capability
material:

`apollyon_training_activation_capability_v1:<64 lowercase hex>`.

A raw capability is bearer-sensitive material. Logging, returning, or embedding
the raw 32-byte secret in a public receipt is forbidden.

## Candidate transport: systemd credentials

A future implementation may use systemd's per-service credential mechanism as
the transport from protected root custody into the non-root service generation.

This gate records only:

`systemd_credential_transport_selected_as_candidate=true`

and deliberately records:

`systemd_credential_runtime_proven=false`.

No `LoadCredential=` or related unit change is made here. No claim is made that
the currently installed Xiphos systemd version, unit, pre-entry, mount namespace,
credential path, ownership, lifetime, zeroization, or restart behavior satisfies
this contract.

Those properties require a separate source gate and then a separate live Xiphos
qualification.

## One-time consumption

A structurally valid capability is still not sufficient to authorize training.
The future protected consumption boundary must atomically consume it exactly
once and bind that consumption to the exact service process generation.

The consumption receipt binds:

- activation capability ID;
- activation secret SHA-256;
- durable claim record ID;
- store generation ID;
- boot-ID SHA-256;
- exact systemd invocation ID;
- exact training PID;
- exact process start-time ticks;
- exact observed pre-entry SHA-256;
- `activation_generation_bound=true`;
- `consumed_once=true`;
- `replay_authorized=false`;
- `protected_consumption_store_required=true`;
- `caller_supplied_consumption_receipt_sufficient=false`;
- `training_start_consumption_performed=true`;
- `training_start_admission=true`.

The consumption ID is separately content-addressed:

`apollyon_training_activation_consumption_v1:<64 lowercase hex>`.

The future protected store—not a caller-supplied JSON object—must prove that the
same capability cannot be consumed for a second service generation.

## Direct/manual systemd starts

The identity of the systemd caller is deliberately non-authoritative.

A direct/manual start that lacks a valid capability cannot satisfy this contract.
A direct/manual start that happens while a capability exists also does not gain
authority from being first. Only a service generation that proves possession of
the exact secret **and** obtains the protected one-time consumption bound to its
InvocationID/PID/start-ticks/pre-entry generation can proceed to the next gate.

This makes ownership a property of the consumed capability and process
generation rather than a race over which caller reached `systemctl start`
first.

## Deliberate stop before release

Even successful one-time consumption keeps:

- `training_release_authorized=false`;
- `training_execution_authorized=false`.

The next source gate is:

`apollyon_training_start_release_v1`.

A later release gate must independently bind the accepted consumption receipt to
the trainer/releaser boundary. This contract does not write a release frame,
resume a trainer, execute training, or mutate model/candidate weights.

## Hosted proof

Hosted proof is required to demonstrate:

- exact dependency blobs;
- deterministic content addressing;
- exact schema / no unknown keys;
- 32-byte secret hashing;
- raw-secret absence from receipts;
- tampered content-address rejection;
- direct-start authority remains false;
- systemd caller identity remains non-authoritative;
- capability replay rejection;
- protected one-time-consumption requirement;
- generation binding to InvocationID/PID/start ticks/pre-entry identity;
- wrong capability/secret/claim/store/process identities reject;
- caller-supplied consumption is insufficient;
- release and training remain unauthorized;
- production source contains no filesystem, network, child-process, systemctl,
  service-action, signing, wallet, transaction, or funds implementation.

## Authority

This gate performs no:

- Xiphos read or write;
- filesystem mutation;
- service/systemd action;
- activation capability issuance;
- protected consumption-store write;
- durable claim publication;
- trainer release;
- training/model/candidate-weight execution;
- credential/private-key/signing/wallet action;
- transaction or funds action.

PROTECT THE CORE.
