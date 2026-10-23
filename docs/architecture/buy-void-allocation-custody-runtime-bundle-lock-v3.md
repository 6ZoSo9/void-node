# Buy VOID allocation-custody runtime bundle acceptance lock V3

Marker: `VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_LOCK_V3`.

Status: **source/CI acceptance of one exact V3 package-free runtime bundle candidate only**.

## Exact hosted candidate

Candidate source head: `b4d1354bc511c4c16138abac693f9c52bd93dc5d`.

Hosted run `39903798415` completed successfully on Node 22, 24 and 26. The official compare job `120253410543` required the three candidate JSON outputs to be byte-identical.

Artifacts:
- Node 22: `12480121859`
- Node 24: `12479744635`
- Node 26: `12480630330`

Exact candidate:
- bytes: `12379`
- SHA-256: `0d1be868aab98debdf0785c59cf45954ae68b2e1ebd0687ee56206b10b02ac67`
- Git blob SHA-1: `3474174b68995eacd1c516bc9bc5190ff04757b6`
- candidate ID: `voidbuycustodybundle3_dae3764e1f1b660235d17ad933e32ed0d4f67d8fc4cd322286d34c5d9f0dbe32`

The candidate closes the known FIFO-reader set: the cross-UID claim reader plus both custody observer readers are bound to their reviewed nonblocking source generations.

## Acceptance boundary

The acceptance proof pins the exact V3 candidate tool, proof, document and workflow blobs; recompiles the exact source tree; rebuilds the V3 candidate; runs the hardened V3 verifier; and requires the rebuilt candidate bytes to match the hosted byte count, SHA-256, Git blob and candidate ID.

Only this fact advances:

```text
candidate_accepted=true
```

These remain false:

```text
immutable_root_install=false
install_target_selected=false
node_binary_identity_verified=false
request_root_selected=false
shared_directory_selected=false
service_unit_installed=false
service_started=false
service_restarted=false
runtime_integration=false
reserve_method_enabled=false
recover_method_enabled=false
payment_acceptance=false
public_presale_activation=false
production_gate_ready=false
funds_movement=false
```

This lock does **not** create an install archive, replace the legacy `/opt` tree, alter user/group membership, install or start a service, access credentials or wallets, accept a payment, deliver VOID, activate the presale, or move funds. Those require separate reviewed successors and live host evidence.

PROTECT THE CORE.
