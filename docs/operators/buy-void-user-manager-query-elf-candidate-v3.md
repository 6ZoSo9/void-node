# Buy VOID user-manager query ELF candidate v3

Marker: `VOID_BUY_VOID_USER_MANAGER_QUERY_ELF_CANDIDATE_V3`.

Status: **reproducible binary candidate only; unaccepted and uninstalled**.

## Exact source generation

This candidate is stacked on #3091 exact source head:

`a734613ee3786ded067e491dfa8e533a2fee3e89`

and pins:

- private-peer guard Git blob `d8b30ac499c3bb8a5d223dbc6be687dd175be611`;
- static preexec Git blob `f0fbfaae97df3294097a281100f06ada2ef157ff`;
- kernel-capability query Git blob `a493a557305d5193d2b1d38b6070a8e826c1d43a`.

The accepted V2 candidate/lock remain immutable historical evidence and are not repinned.

## Derivation

Three independent Ubuntu 24.04 jobs:

- compile the preexec statically with no PIE/build ID;
- compile the dynamic query with fixed flags and `-ldl`;
- strip both binaries;
- require the preexec to have no dynamic interpreter;
- execute the V3 query self-test;
- require the kernel capability parser/binding markers introduced by #3091;
- exercise the exact stripped installed-shape pair against an LD_PRELOAD adversary;
- require byte-identical binaries and candidate metadata across all three jobs.

The V3 query contract requires systemd NoNewPrivileges, zero non-bounding process capability sets, exact kernel CapBnd ↔ authenticated systemd CapabilityBoundingSet equality, and a final capability-state reread.

## Promotion boundary

This lane may establish only a reproducible V3 binary candidate:

- `candidate_accepted=false`;
- `install_authorized=false`;
- `complete_host_evidence_collector=false`;
- `payment_acceptance=false`;
- `public_presale_activation=false`;
- `funds_movement=false`.

A separate acceptance lock must consume the exact cross-job bytes before any protected installer or live query successor can use this generation.

No host/service/systemd/filesystem mutation, credentials, keys, wallet/signers, payment, transaction, presale/WC activation or funds movement occurs.
